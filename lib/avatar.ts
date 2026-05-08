const PALETTE: ReadonlyArray<{ bg: string; fg: string }> = [
  { bg: "#FEE2E2", fg: "#991B1B" },
  { bg: "#FFEDD5", fg: "#9A3412" },
  { bg: "#FEF3C7", fg: "#92400E" },
  { bg: "#DCFCE7", fg: "#166534" },
  { bg: "#CFFAFE", fg: "#155E75" },
  { bg: "#DBEAFE", fg: "#1E40AF" },
  { bg: "#E0E7FF", fg: "#3730A3" },
  { bg: "#EDE9FE", fg: "#5B21B6" },
  { bg: "#FCE7F3", fg: "#9D174D" },
  { bg: "#F1F5F9", fg: "#334155" },
];

export function getInitials(fullName: string | null | undefined): string {
  const trimmed = (fullName ?? "").trim();
  if (!trimmed) return "?";

  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";

  if (parts.length === 1) {
    const single = parts[0];
    return single.length >= 2
      ? single.slice(0, 2).toUpperCase()
      : single[0].toUpperCase();
  }

  const first = parts[0][0] ?? "";
  const last = parts[parts.length - 1][0] ?? "";
  return `${first}${last}`.toUpperCase();
}

export function getAvatarColor(seed: string): { bg: string; fg: string } {
  const value = seed ?? "";
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const index = Math.abs(hash) % PALETTE.length;
  return PALETTE[index];
}
