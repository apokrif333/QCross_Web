export const runtime = "nodejs";

const MAX_BODY_BYTES = 8192;
const EMAIL_PATTERN = /^[^\s@,;<>()[\]]+@[^\s@,;<>()[\]]+\.[^\s@,;<>()[\]]+$/;
const METHODS = new Set(["Telegram", "WhatsApp", "Email"]);

type ContactMessage = {
  name: string;
  method: "Telegram" | "WhatsApp" | "Email";
  contact: string;
  message: string;
};

function validField(value: unknown, maxLength: number): value is string {
  return typeof value === "string" && value.length <= maxLength && value.trim().length > 0;
}

function parseContact(value: unknown): ContactMessage | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  if (
    !validField(body.name, 120) ||
    !validField(body.contact, 150) ||
    !validField(body.message, 500) ||
    /[\r\n\x00-\x1f\x7f]/.test(body.name) ||
    /[\r\n\x00-\x1f\x7f]/.test(body.contact) ||
    !METHODS.has(body.method as string)
  ) return null;

  return {
    name: body.name.trim(),
    method: body.method as ContactMessage["method"],
    contact: body.contact.trim(),
    message: body.message.trim(),
  };
}

async function readLimitedBody(request: Request): Promise<string | null> {
  if (!request.body) return null;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
}

export async function POST(request: Request) {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return Response.json({ ok: false }, { status: 400 });
  }

  const rawBody = await readLimitedBody(request);
  if (rawBody === null) return Response.json({ ok: false }, { status: 400 });

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }

  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return Response.json({ ok: false }, { status: 400 });
  }
  const website = (body as Record<string, unknown>).website;
  if (website !== undefined && typeof website !== "string") {
    return Response.json({ ok: false }, { status: 400 });
  }
  if (website?.trim()) return Response.json({ ok: true });

  const contactMessage = parseContact(body);
  if (!contactMessage) return Response.json({ ok: false }, { status: 400 });

  const token = process.env.ZEPTOMAIL_API_TOKEN?.trim();
  const toEmail = process.env.CONTACT_TO_EMAIL?.trim();
  const fromEmail = process.env.CONTACT_FROM_EMAIL?.trim();
  if (!token || !toEmail || !fromEmail) {
    console.error("Contact email configuration is missing: ZEPTOMAIL_API_TOKEN, CONTACT_TO_EMAIL, or CONTACT_FROM_EMAIL.");
    return Response.json({ ok: false }, { status: 500 });
  }

  const { name, method, contact, message } = contactMessage;
  const sentAt = new Date().toISOString();
  const textbody = [
    "Новое сообщение с сайта Quantum Cross Management",
    "",
    `Имя: ${name}`,
    `Предпочитаемый способ связи: ${method}`,
    `Контакт: ${contact}`,
    "",
    "Сообщение:",
    message,
    "",
    "Страница: /contact",
    `Время отправки: ${sentAt}`,
  ].join("\n");

  const payload = {
    from: { address: fromEmail, name: "QCM Website" },
    to: [{ email_address: { address: toEmail } }],
    subject: `Новое сообщение с сайта QCM — ${name}`,
    textbody,
    ...(method === "Email" && EMAIL_PATTERN.test(contact)
      ? { reply_to: [{ address: contact }] }
      : {}),
  };

  try {
    const response = await fetch("https://cpaas.zoho.com/v1.1/email", {
      method: "POST",
      headers: {
        Authorization: `Zoho-enczapikey ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    if (!response.ok) {
      console.error(`ZeptoMail contact send failed with HTTP ${response.status}.`);
      return Response.json({ ok: false }, { status: 502 });
    }
    return Response.json({ ok: true });
  } catch {
    console.error("ZeptoMail contact send failed due to a network error.");
    return Response.json({ ok: false }, { status: 502 });
  }
}
