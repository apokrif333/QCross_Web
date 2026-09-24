"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";

type ContactMethod = "Telegram" | "WhatsApp" | "Email";
type ContactDrawerTriggerProps = {
  variant: "client" | "partner";
};

const emailAddress = "cio@qcross.org";

function TelegramIcon() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m20.9 3.5-3.1 15.4c-.2 1-1 1.2-1.8.7l-4.5-3.3-2.2 2.1c-.2.3-.4.5-.9.5l.3-4.7 8.6-7.8c.4-.4-.1-.6-.6-.3L6.1 12.8l-4.4-1.4c-1-.3-1-1 .2-1.5L19 3.3c.8-.3 1.5.2 1.9.2Z" fill="currentColor"/></svg>;
}

function WhatsAppIcon() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20.1 11.7a8.1 8.1 0 0 1-12 7.1L3.5 20l1.2-4.4a8.1 8.1 0 1 1 15.4-3.9Z" stroke="currentColor" strokeWidth="1.6"/><path d="M8.2 7.9c-.3-.7-.6-.7-.9-.7h-.7c-.3 0-.7.2-.9.5-.3.4-1 1-.9 2.4.1 1.4 1.1 2.7 1.3 2.9.2.2 2.2 3.6 5.5 4.8 2.8 1 3.3.7 3.9.7.6-.1 1.9-.8 2.2-1.5.3-.7.3-1.2.2-1.3-.1-.1-.6-.3-1.2-.6l-1.8-.8c-.3-.1-.5-.2-.7.2-.2.3-.8 1-1 1.2-.2.2-.4.3-.7.1-.4-.2-1.5-.6-2.8-1.8-1-1-1.7-2.1-1.9-2.4-.2-.3 0-.5.2-.7l.5-.5c.2-.2.3-.4.4-.6.1-.2 0-.4 0-.6l-.7-1.5Z" fill="currentColor"/></svg>;
}

function EmailIcon() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="2.5" y="5" width="19" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><path d="m3 6 9 7 9-7" stroke="currentColor" strokeWidth="1.5"/></svg>;
}

function ExternalArrow() {
  return <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M11 3h6v6M17 3l-8 8M15.5 11v5.5H3.5v-12H9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

export function ContactDrawerTrigger({ variant }: ContactDrawerTriggerProps) {
  const [phase, setPhase] = useState<"closed" | "opening" | "open" | "closing">("closed");
  const [contactMethod, setContactMethod] = useState<ContactMethod>("Telegram");
  const [message, setMessage] = useState("");
  const [mailPrepared, setMailPrepared] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const isMounted = phase !== "closed";

  useEffect(() => {
    if (phase !== "opening") return;
    const frame = requestAnimationFrame(() => setPhase("open"));
    return () => cancelAnimationFrame(frame);
  }, [phase]);

  useEffect(() => {
    if (phase !== "closing") return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timeout = window.setTimeout(() => setPhase("closed"), reducedMotion ? 0 : 360);
    return () => window.clearTimeout(timeout);
  }, [phase]);

  useEffect(() => {
    if (!isMounted) return;

    const previousOverflow = document.body.style.overflow;
    const trigger = triggerRef.current;
    document.body.style.overflow = "hidden";
    drawerRef.current?.querySelector<HTMLButtonElement>(".contact-drawer__close")?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setPhase("closing");
        return;
      }

      if (event.key !== "Tab" || !drawerRef.current) return;
      const focusable = Array.from(drawerRef.current.querySelectorAll<HTMLElement>(
        "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])",
      ));
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      trigger?.focus();
    };
  }, [isMounted]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const contact = String(form.get("contact") ?? "").trim();
    if (!name || !contact) return;

    const subject = variant === "partner" ? "Партнёрский запрос с сайта QCM" : "Запрос клиента с сайта QCM";
    const body = [
      `Имя: ${name}`,
      `Предпочитаемый способ связи: ${contactMethod}`,
      `Контакт: ${contact}`,
      "",
      `Сообщение: ${message.trim() || "Не указано"}`,
    ].join("\n");

    setMailPrepared(true);
    window.location.href = `mailto:${emailAddress}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  const isPartner = variant === "partner";

  return (
    <>
      <button
        className={isPartner ? "partner-cta contact-drawer-trigger" : "editorial-link contact-drawer-trigger"}
        type="button"
        ref={triggerRef}
        onClick={() => { setMailPrepared(false); setPhase("opening"); }}
      >
        <span>{isPartner ? "Стать партнёром QCM" : "Связаться с QCM"}</span>
        <span aria-hidden="true">→</span>
      </button>

      {isMounted && createPortal(
        <div className={`contact-drawer__overlay${phase === "open" ? " contact-drawer__overlay--visible" : ""}`} onMouseDown={(event) => {
          if (event.target === event.currentTarget) setPhase("closing");
        }}>
          <aside className="contact-drawer" ref={drawerRef} role="dialog" aria-modal="true" aria-labelledby="contact-drawer-title">
            <button className="contact-drawer__close" type="button" onClick={() => setPhase("closing")} aria-label="Закрыть окно">×</button>
            <p className="contact-drawer__eyebrow">Связаться с QCM</p>
            <h2 id="contact-drawer-title">Обсудить вашу<br />финансовую задачу</h2>
            <p className="contact-drawer__intro">Расскажите, какую задачу вы хотите решить. Мы свяжемся с вами и предложим оптимальное решение.</p>

            <form className="contact-drawer__form" onSubmit={handleSubmit}>
              <label htmlFor="contact-name">Ваше имя</label>
              <input id="contact-name" name="name" type="text" autoComplete="name" placeholder="Иван Иванов" maxLength={120} required />

              <label htmlFor="contact-method">Способ связи</label>
              <select id="contact-method" name="method" value={contactMethod} onChange={(event) => setContactMethod(event.target.value as ContactMethod)}>
                <option value="Telegram">Telegram</option>
                <option value="WhatsApp">WhatsApp</option>
                <option value="Email">Email</option>
              </select>

              <label htmlFor="contact-detail">Контакт (Telegram / Email / Телефон)</label>
              <input
                id="contact-detail"
                name="contact"
                type={contactMethod === "Email" ? "email" : "text"}
                inputMode={contactMethod === "WhatsApp" ? "tel" : undefined}
                autoComplete={contactMethod === "Email" ? "email" : contactMethod === "WhatsApp" ? "tel" : "off"}
                placeholder={contactMethod === "Email" ? "name@example.com" : contactMethod === "WhatsApp" ? "+7 700 123 45 67" : "@username или email или телефон"}
                maxLength={150}
                required
              />

              <label htmlFor="contact-message">Сообщение (необязательно)</label>
              <textarea id="contact-message" name="message" placeholder="Коротко опишите вашу задачу..." maxLength={500} value={message} onChange={(event) => setMessage(event.target.value)} />
              <span className="contact-drawer__count">{message.length} / 500</span>

              <button className="contact-drawer__submit" type="submit">Отправить сообщение <span aria-hidden="true">→</span></button>
              {mailPrepared && <p className="contact-drawer__mail-note" role="status">Письмо подготовлено в почтовом приложении. Подтвердите отправку там.</p>}
            </form>

            <div className="contact-drawer__divider"><span>или свяжитесь напрямую</span></div>
            <div className="contact-drawer__links">
              <a href="https://t.me/qcrossorg" target="_blank" rel="noreferrer">
                <span className="contact-drawer__channel-icon contact-drawer__channel-icon--telegram"><TelegramIcon /></span>
                <span><strong>Telegram</strong><small>@qcrossorg</small></span>
                <ExternalArrow />
              </a>
              <a href="https://wa.me/77075172982" target="_blank" rel="noreferrer">
                <span className="contact-drawer__channel-icon contact-drawer__channel-icon--whatsapp"><WhatsAppIcon /></span>
                <span><strong>WhatsApp</strong><small>+7 707 517 29 82</small></span>
                <ExternalArrow />
              </a>
              <a href={`mailto:${emailAddress}`}>
                <span className="contact-drawer__channel-icon contact-drawer__channel-icon--email"><EmailIcon /></span>
                <span><strong>Email</strong><small>{emailAddress}</small></span>
                <ExternalArrow />
              </a>
            </div>
          </aside>
        </div>,
        document.body,
      )}
    </>
  );
}
