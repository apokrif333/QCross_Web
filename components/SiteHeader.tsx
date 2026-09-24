"use client";

import Link from "next/link";
import { useState } from "react";
import { QcmDocumentModal, type DocumentKey } from "@/components/QcmDocumentModal";

const navItems = [
  ["О компании", "/about"],
  ["Решения для клиентов", "/clients"],
  ["Партнёрам", "/partners"],
  ["Контакты", "/contact"],
] as const;

const insightItems = [
  ["Мировая карта недвижимости", "/insights/world-map"],
  ["QCM Tax 270", "https://taxes.qcross.org"],
] as const;

type SiteHeaderProps = {
  activePath?: "/about" | "/clients" | "/partners" | "/insights/world-map" | "/contact";
};

export function SiteHeader({ activePath = "/clients" }: SiteHeaderProps) {
  const [activeDocument, setActiveDocument] = useState<DocumentKey | null>(null);
  const [isInsightsOpen, setIsInsightsOpen] = useState(false);

  return (
    <>
      <header className="site-header">
        <Link className="site-wordmark" href="/" aria-label="Quantum Cross Management — главная">
          <span>Quantum Cross</span>
          <small>Management</small>
        </Link>
        <nav className="site-nav" aria-label="Основная навигация">
          {navItems.map(([label, href]) => href.startsWith("/")
            ? <Link className={href === activePath ? "is-active" : ""} key={label} href={href}>{label}</Link>
            : <a key={label} href={href}>{label}</a>)}
          <div
            className={`site-nav__dropdown${isInsightsOpen ? " is-open" : ""}`}
            onMouseLeave={() => setIsInsightsOpen(false)}
          >
            <button
              className={activePath === "/insights/world-map" ? "is-active" : ""}
              type="button"
              aria-expanded={isInsightsOpen}
              aria-haspopup="true"
              onClick={() => setIsInsightsOpen((isOpen) => !isOpen)}
            >
              Инсайты
            </button>
            <div className="site-nav__dropdown-menu">
              {insightItems.map(([label, href]) => href.startsWith("/")
                ? <Link className={href === activePath ? "is-active" : ""} key={href} href={href}>{label}</Link>
                : <a key={href} href={href}>{label}</a>)}
            </div>
          </div>
        </nav>
        <div className="site-meta">
          <button className="site-meta__link" type="button" onClick={() => setActiveDocument("license")} aria-label="Лицензия / BVI FSC">BVI FSC</button>
          <button className="site-meta__link" type="button" onClick={() => setActiveDocument("registration")} aria-label="Регистрация компании">Since 2020</button>
        </div>
        <a className="mobile-nav-label" href={activePath === "/partners" ? "#long-term" : activePath === "/about" ? "#founder" : activePath === "/insights/world-map" ? "#world-map-content" : activePath === "/contact" ? "#message" : "#capital"}>Меню</a>
      </header>
      {activeDocument && <QcmDocumentModal documentKey={activeDocument} onClose={() => setActiveDocument(null)} />}
    </>
  );
}
