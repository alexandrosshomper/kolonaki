import type { ReactNode } from "react";

import FooterSection from "@/components/footer";
import { HeroHeader } from "@/components/hero-header";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-background text-foreground">
      <HeroHeader />
      <main className="flex-1">{children}</main>
      <FooterSection />
    </div>
  );
}
