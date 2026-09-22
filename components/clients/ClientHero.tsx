"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { SiteHeader } from "@/components/SiteHeader";
import { CalendarIcon, ChartIcon, DocumentIcon, PersonIcon, ShieldIcon } from "@/components/QcmIcons";

const securityItems = [
  { title: "BVI FSC", copy: "Регулируемая\nюрисдикция", Icon: ShieldIcon },
  { title: "Since 2020", copy: "Опыт и стабильность\nво времени", Icon: CalendarIcon },
  { title: "Managed Accounts", copy: "Удалённое управление счётом\nбез доступа к деньгам", Icon: ChartIcon },
  { title: "Client-owned assets", copy: "Средства и ценные бумаги\nна личном счёте клиента", Icon: PersonIcon },
] as const;

const documents = {
  registration: {
    title: "Certificate of Incorporation",
    description: "Свидетельство о регистрации — документ, подтверждающий существование корпорации.",
    url: "https://www.bvifsc.vg/certificate-validation?%3FqrCode=17BABB292F",
    image: "/license/registration.png",
    imageAlt: "Свидетельство о регистрации Quantum Cross Management",
  },
  license: {
    title: "Approved Investment Manager Certificate",
    description: "Сертификат подтверждает, что QCM является утверждённым инвестиционным менеджером и находится под регулированием Комиссии Британских Виргинских Островов.",
    url: "https://www.bvifsc.vg/regulated-entities/quantum-cross-management-corp",
    image: "/license/license.png",
    imageAlt: "Сертификат Approved Investment Manager Quantum Cross Management",
  },
} as const;

type DocumentKey = keyof typeof documents;

function DocumentModal({ documentKey, onClose }: { documentKey: DocumentKey; onClose: () => void }) {
  const certificate = documents[documentKey];

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return createPortal(
    <div className="document-modal" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="document-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="document-modal-title">
        <button className="document-modal__close" type="button" onClick={onClose} aria-label="Закрыть окно">×</button>
        <div className="document-modal__copy">
          <p className="eyebrow">Документы QCM</p>
          <h2 id="document-modal-title">{certificate.title}</h2>
          <p>{certificate.description}</p>
          <a href={certificate.url} target="_blank" rel="noreferrer">Проверить на сайте BVI FSC <span>↗</span></a>
        </div>
        <Image className="document-modal__image" src={certificate.image} alt={certificate.imageAlt} width={documentKey === "registration" ? 1081 : 678} height={documentKey === "registration" ? 823 : 875} sizes="(max-width: 760px) 100vw, 52vw" />
      </section>
    </div>
    , document.body,
  );
}

export function ClientHero() {
  const [activeDocument, setActiveDocument] = useState<DocumentKey | null>(null);

  return (
    <section className="client-hero">
      <Image className="client-hero__image" src="/images/winter-scenery.jpg" alt="Зимний горный пейзаж" fill priority sizes="100vw" />
      <SiteHeader />
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
      {activeDocument && <DocumentModal documentKey={activeDocument} onClose={() => setActiveDocument(null)} />}
    </section>
  );
}
