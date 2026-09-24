"use client";

import { useState, type FormEvent } from "react";

type ContactMethod = "Telegram" | "WhatsApp" | "Email";

export function ContactPageForm() {
  const [method, setMethod] = useState<ContactMethod>("Telegram");
  const [message, setMessage] = useState("");
  const [mailPrepared, setMailPrepared] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const contact = String(form.get("contact") ?? "").trim();
    if (!name || !contact || !message.trim()) return;

    const body = [
      `Имя: ${name}`,
      `Предпочитаемый способ связи: ${method}`,
      `Контакт: ${contact}`,
      "",
      `Сообщение: ${message.trim()}`,
    ].join("\n");

    setMailPrepared(true);
    window.location.href = `mailto:cio@qcross.org?subject=${encodeURIComponent("Сообщение с сайта QCM")}&body=${encodeURIComponent(body)}`;
  }

  return (
    <form className="contact-page__form" onSubmit={handleSubmit}>
      <div className="contact-page__form-top">
        <div className="contact-page__field">
          <label htmlFor="contact-page-name">Имя</label>
          <input id="contact-page-name" name="name" type="text" autoComplete="name" placeholder="Иван Иванов" maxLength={120} required />
        </div>
        <div className="contact-page__field">
          <label htmlFor="contact-page-method">Способ связи</label>
          <div className="contact-page__select-wrap">
            <span aria-hidden="true">{method === "Telegram" ? "➤" : method === "WhatsApp" ? "✆" : "✉"}</span>
            <select id="contact-page-method" name="method" value={method} onChange={(event) => setMethod(event.target.value as ContactMethod)}>
              <option value="Telegram">Telegram</option>
              <option value="WhatsApp">WhatsApp</option>
              <option value="Email">Email</option>
            </select>
          </div>
        </div>
      </div>
      <div className="contact-page__field">
        <label htmlFor="contact-page-detail">Контакт (Telegram / Email / Телефон)</label>
        <input
          id="contact-page-detail"
          name="contact"
          type={method === "Email" ? "email" : "text"}
          inputMode={method === "WhatsApp" ? "tel" : undefined}
          autoComplete={method === "Email" ? "email" : method === "WhatsApp" ? "tel" : "off"}
          placeholder={method === "Email" ? "name@example.com" : method === "WhatsApp" ? "+7 707 517 29 82" : "@username или email или телефон"}
          maxLength={150}
          required
        />
      </div>
      <div className="contact-page__field">
        <label htmlFor="contact-page-message">Сообщение</label>
        <textarea id="contact-page-message" name="message" placeholder="Расскажите о вашей задаче или задайте вопрос..." maxLength={500} value={message} onChange={(event) => setMessage(event.target.value)} required />
        <span className="contact-page__count">{message.length} / 500</span>
      </div>
      <button className="contact-page__submit" type="submit">Отправить сообщение <span aria-hidden="true">→</span></button>
      {mailPrepared && <p className="contact-page__mail-note" role="status">Письмо подготовлено в почтовом приложении. Подтвердите отправку там.</p>}
    </form>
  );
}
