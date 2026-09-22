import type { Metadata } from "next";
import { CapitalSolutions } from "@/components/clients/CapitalSolutions";
import { ClientHero } from "@/components/clients/ClientHero";
import { ManagedAccountStructure } from "@/components/clients/ManagedAccountStructure";
import { RiskReturnSection } from "@/components/clients/RiskReturnSection";

export const metadata: Metadata = {
  title: "Решения для клиентов | Quantum Cross Management",
  description: "Индивидуальное управление капиталом для частных и корпоративных клиентов.",
};

export default function ClientsPage() {
  return (
    <main className="clients-page">
      <ClientHero />
      <CapitalSolutions />
      <RiskReturnSection />
      <ManagedAccountStructure />
    </main>
  );
}
