"use client";

import Image from "next/image";
import { useEffect } from "react";
import { createPortal } from "react-dom";

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

export type DocumentKey = keyof typeof documents;

export function QcmDocumentModal({ documentKey, onClose }: { documentKey: DocumentKey; onClose: () => void }) {
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
    </div>,
    document.body,
  );
}
