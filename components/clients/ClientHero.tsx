"use client";

import Image from "next/image";
import { useState } from "react";
import { QcmDocumentModal, type DocumentKey } from "@/components/QcmDocumentModal";
import { SiteHeader } from "@/components/SiteHeader";
import { CalendarIcon, ChartIcon, DocumentIcon, PersonIcon, ShieldIcon } from "@/components/QcmIcons";

const securityItems = [
  { title: "BVI FSC", copy: "Регулируемая\nюрисдикция", Icon: ShieldIcon },
  { title: "Since 2020", copy: "Опыт и стабильность\nво времени", Icon: CalendarIcon },
  { title: "Managed Accounts", copy: "QCM не получает\nдоступа к выводу средств", Icon: ChartIcon },
  { title: "Client-owned assets", copy: "Средства и ценные бумаги\nна личном счёте клиента", Icon: PersonIcon },
] as const;

export function ClientHero() {
  const [activeDocument, setActiveDocument] = useState<DocumentKey | null>(null);

  return (
    <section className="client-hero">
      <Image className="client-hero__image" src="/images/winter-scenery.jpg" alt="Зимний горный пейзаж" fill priority sizes="100vw" />
      <SiteHeader activePath="/clients" />
      <div className="client-hero__content">
        <p className="eyebrow client-hero__eyebrow">Решения для клиентов</p>
        <h1 className="client-hero__title">Вы доверяете нам<br />инвестиционные решения,<br /><em>а не деньги.</em></h1>
        <p className="client-hero__lead">Индивидуальное управление капиталом для частных<br />и корпоративных клиентов от $50,000.</p>
        <div className="security-heading">Как устроена безопасность</div>
        <div className="security-grid">
          {securityItems.map(({ title, copy, Icon }) => (
            <div className="security-item" key={title}>
              <Icon />
              <strong>{title}</strong>
              <span>{copy.split("\n").map((line) => <span key={line}>{line}<br /></span>)}</span>
            </div>
          ))}
        </div>
        <div className="security-links">
          <button type="button" onClick={() => setActiveDocument("registration")}><DocumentIcon />Регистрация компании <span>→</span></button>
          <button type="button" onClick={() => setActiveDocument("license")}><DocumentIcon />Лицензия / BVI FSC <span>→</span></button>
        </div>
      </div>
      <a className="client-hero__transition" href="#capital">
        <span>Решения для капитала</span>
        <span aria-hidden="true">→</span>
      </a>
      {activeDocument && <QcmDocumentModal documentKey={activeDocument} onClose={() => setActiveDocument(null)} />}
    </section>
  );
}
