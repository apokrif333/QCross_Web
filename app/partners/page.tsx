import type { Metadata } from "next";
import { PartnerHero } from "@/components/partners/PartnerHero";
import { PartnerLongTerm } from "@/components/partners/PartnerLongTerm";

export const metadata: Metadata = {
  title: "Партнёрам | Quantum Cross Management",
  description: "Партнёрство с QCM для расширения инвестиционных, налоговых и финансовых возможностей клиентов.",
};

export default function PartnersPage() {
  return (
    <main className="partners-page">
      <PartnerHero />
      <PartnerLongTerm />
    </main>
  );
}
