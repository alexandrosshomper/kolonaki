"use client";

import { useEffect, useRef, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";
import { getAvatarColor, getInitials } from "@/lib/avatar";

type OnboardingAvatarPickerProps = {
  uid: string;
  initialAvatarPath: string | null;
  fullName: string;
  seed: string;
  className?: string;
};

export function OnboardingAvatarPicker({
  uid,
  initialAvatarPath,
  fullName,
  seed,
  className,
}: OnboardingAvatarPickerProps) {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarPath, setAvatarPath] = useState<string | null>(initialAvatarPath);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!avatarPath) {
      setPreviewUrl(null);
      return;
    }

    let revoked = false;
    let objectUrl: string | null = null;

    (async () => {
      const { data, error: downloadError } = await supabase.storage
        .from("avatars")
        .download(avatarPath);

      if (downloadError || !data) {
        if (!revoked) setPreviewUrl(null);
        return;
      }

      objectUrl = URL.createObjectURL(data);
      if (!revoked) {
        setPreviewUrl(objectUrl);
      } else {
        URL.revokeObjectURL(objectUrl);
      }
    })();

    return () => {
      revoked = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [avatarPath, supabase]);

  const initials = getInitials(fullName);
  const { bg, fg } = getAvatarColor(seed);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploading(true);

    try {
      const fileExt = file.name.includes(".")
        ? file.name.split(".").pop()
        : "png";
      const filePath = `${uid}-${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      setAvatarPath(filePath);
    } catch (uploadError) {
      console.error("Avatar upload failed:", uploadError);
      setError("Couldn't upload your photo. Please try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <Avatar className="size-24">
        {previewUrl ? <AvatarImage src={previewUrl} alt="Profile photo" /> : null}
        <AvatarFallback
          className="text-xl font-semibold"
          style={{ backgroundColor: bg, color: fg }}
        >
          {initials}
        </AvatarFallback>
      </Avatar>
      <input type="hidden" name="avatar_url" value={avatarPath ?? ""} />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        id="onboarding-avatar-upload"
        onChange={handleFileChange}
        disabled={uploading}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={uploading}
        onClick={() => fileInputRef.current?.click()}
      >
        {uploading
          ? "Uploading…"
          : avatarPath
          ? "Change photo"
          : "Upload photo"}
      </Button>
      {error ? (
        <p
          aria-live="polite"
          role="alert"
          className="text-destructive text-xs text-center"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
