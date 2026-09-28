"use client";

import { useRef, useState, type FormEvent } from "react";

type ContactMethod = "Telegram" | "WhatsApp" | "Email";
type SubmissionState = "idle" | "submitting" | "success" | "error";

export function ContactPageForm() {
  const [method, setMethod] = useState<ContactMethod>("Telegram");
  const [message, setMessage] = useState("");
  const [submissionState, setSubmissionState] = useState<SubmissionState>("idle");
  const submitting = useRef(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const name = String(form.get("name") ?? "").trim();
    const contact = String(form.get("contact") ?? "").trim();
    const trimmedMessage = message.trim();
    if (!name || !contact || !trimmedMessage) return;

    submitting.current = true;
    setSubmissionState("submitting");
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          method,
          contact,
          message: trimmedMessage,
          website: String(form.get("website") ?? ""),
        }),
      });
      if (!response.ok) throw new Error("Contact send failed");
      formElement.reset();
      setMethod("Telegram");
      setMessage("");
      setSubmissionState("success");
    } catch {
      setSubmissionState("error");
    } finally {
      submitting.current = false;
    }
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
      <div aria-hidden="true" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clipPath: "inset(50%)", whiteSpace: "nowrap" }}>
        <input name="website" type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      </div>
      <button className="contact-page__submit" type="submit" disabled={submissionState === "submitting"}>
        {submissionState === "submitting" ? "Отправляем…" : "Отправить сообщение"} <span aria-hidden="true">→</span>
      </button>
      {submissionState === "success" && <p className="contact-page__mail-note" role="status">Спасибо. Сообщение отправлено — мы свяжемся с вами в ближайшее время.</p>}
      {submissionState === "error" && <p className="contact-page__mail-note" role="alert">Не удалось отправить сообщение. Попробуйте ещё раз или свяжитесь с нами напрямую.</p>}
    </form>
  );
}
