import type { Metadata } from "next";
import Image from "next/image";
import { SiteHeader } from "@/components/SiteHeader";
import { ContactPageForm } from "@/components/contact/ContactPageForm";

export const metadata: Metadata = {
  title: "Контакты | Quantum Cross Management",
  description: "Свяжитесь с Quantum Cross Management по вопросам управления капиталом и сотрудничества.",
};

const channels = [
  {
    title: "Telegram",
    detail: "@qcrossorg",
    description: "Быстрый способ связаться с нашей командой.",
    href: "https://t.me/qcrossorg",
    icon: "telegram",
  },
  {
    title: "WhatsApp",
    detail: "+7 707 517 29 82",
    description: "Удобно для сообщений и звонков.",
    href: "https://wa.me/77075172982",
    icon: "whatsapp",
  },
  {
    title: "Email",
    detail: "cio@qcross.org",
    description: "Для детальных запросов и документов.",
    href: "mailto:cio@qcross.org",
    icon: "email",
  },
] as const;

function ChannelIcon({ kind }: { kind: (typeof channels)[number]["icon"] }) {
  if (kind === "telegram") return <svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="m5 15 21-8-4 19-7-5-4 4 .5-6.5L23 10l-13 9-5-2c-1-.4-1-1.5 0-2Z" fill="currentColor" /></svg>;
  if (kind === "whatsapp") return <svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M26.5 15.7A10.5 10.5 0 0 1 11 25l-6 1.5L6.6 21A10.5 10.5 0 1 1 26.5 15.7Z" stroke="currentColor" strokeWidth="2" /><path d="M11 10.6c-.5-.7-1-.7-1.4 0-.7 1-1.3 2-.6 3.7 1.5 3.6 5 6.5 8.8 7.3 1.7.3 3.2-.6 3.6-1.6.2-.6 0-.8-.4-1l-2.6-1.2c-.4-.2-.6-.1-.9.3l-.8 1c-.3.3-.5.4-1 .2-1.8-.9-3.3-2.3-4.2-4.1-.3-.4-.2-.6 0-.9l.7-.8c.2-.3.2-.5.1-.8l-1.1-2.5Z" fill="currentColor" /></svg>;
  return <svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><rect x="4" y="7" width="24" height="18" rx="1" stroke="currentColor" strokeWidth="2" /><path d="m5 9 11 9L27 9" stroke="currentColor" strokeWidth="2" /></svg>;
}

export default function ContactPage() {
  return (
    <main className="contact-page">
      <section className="contact-page__hero" aria-labelledby="contact-title">
        <Image src="/images/qcm-contact-peak.jpg" alt="Заснеженная гора на закате" fill priority sizes="100vw" />
        <SiteHeader activePath="/contact" />
        <div className="contact-page__hero-content">
          <p className="eyebrow">Контакты</p>
          <h1 id="contact-title">Свяжитесь с нами</h1>
          <p>Мы всегда открыты к обсуждению ваших задач,<br />идей и возможностей сотрудничества.</p>
        </div>
      </section>

      <div className="contact-page__body">
        <section className="contact-page__channels" aria-label="Способы связи">
          {channels.map((channel) => (
            <a className="contact-page__channel" key={channel.title} href={channel.href} target={channel.icon === "email" ? undefined : "_blank"} rel={channel.icon === "email" ? undefined : "noreferrer"}>
              <span className={`contact-page__channel-icon contact-page__channel-icon--${channel.icon}`}><ChannelIcon kind={channel.icon} /></span>
              <strong>{channel.title}</strong>
              <span className="contact-page__channel-detail">{channel.detail}</span>
              <span className="contact-page__channel-description">{channel.description}</span>
              <span className="contact-page__channel-arrow" aria-hidden="true">→</span>
            </a>
          ))}
        </section>

        <section className="contact-page__message" id="message" aria-labelledby="contact-message-title">
          <div className="contact-page__message-intro">
            <h2 id="contact-message-title">Сообщение</h2>
            <p>Оставьте сообщение, и мы свяжемся с вами<br />в ближайшее время.</p>
          </div>
          <ContactPageForm />
        </section>

        <section className="contact-page__legal" aria-labelledby="contact-legal-title">
          <h2 id="contact-legal-title">Юридическая информация</h2>
          <div className="contact-page__legal-columns">
            <div>
              <strong>Компания</strong>
              <p>Quantum Cross Management Corp.<br />BVI Business Company<br />Registration Number: 2038391<br />Incorporated in the British Virgin Islands</p>
            </div>
            <div>
              <strong>Регулирование</strong>
              <p>Registered with the Financial Services Commission (FSC)<br />of the British Virgin Islands<br />Approved Investment Manager<br />Certificate No. IBR/AIM/20/0356</p>
            </div>
          </div>
        </section>
      </div>
      <div className="contact-page__mountains" aria-hidden="true" />
    </main>
  );
}
