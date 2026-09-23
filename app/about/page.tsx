import type { Metadata } from "next";
import { AboutApproach } from "@/components/about/AboutApproach";
import { AboutHero } from "@/components/about/AboutHero";

export const metadata: Metadata = {
  title: "О компании | Quantum Cross Management",
  description: "История Quantum Cross Management, масштаб компании и опыт основателя.",
};

export default function AboutPage() {
  return (
    <main className="about-page">
      <AboutHero />
      <AboutApproach />
    </main>
  );
}
