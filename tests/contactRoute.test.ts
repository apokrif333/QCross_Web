import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../app/api/contact/route";

const validBody = {
  name: " Ирина ",
  method: "Email",
  contact: " irina@example.com ",
  message: " Здравствуйте! ",
};

function request(body: unknown, contentType = "application/json") {
  return new Request("https://qcross.org/api/contact", {
    method: "POST",
    headers: { "Content-Type": contentType },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("contact API", () => {
  beforeEach(() => {
    vi.stubEnv("ZEPTOMAIL_API_TOKEN", "test-token");
    vi.stubEnv("CONTACT_TO_EMAIL", "cio@qcross.org");
    vi.stubEnv("CONTACT_FROM_EMAIL", "website@qcross.org");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("sends trimmed content to configured addresses and adds a valid email reply-to", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(request({
      ...validBody,
      to: "attacker@example.com",
      from: "attacker@example.com",
    }));

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.zeptomail.com/v1.1/email");
    expect(options.headers).toMatchObject({ Authorization: "Zoho-enczapikey test-token" });
    const payload = JSON.parse(options.body as string);
    expect(payload.from).toEqual({ address: "website@qcross.org", name: "QCM Website" });
    expect(payload.to).toEqual([{ email_address: { address: "cio@qcross.org" } }]);
    expect(payload.reply_to).toEqual([{ address: "irina@example.com" }]);
    expect(payload.subject).toBe("Новое сообщение с сайта QCM — Ирина");
    expect(payload.textbody).toContain("Сообщение:\nЗдравствуйте!");
    expect(payload.textbody).toContain("Страница: /contact");
  });

  it("silently accepts a filled honeypot without sending", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const response = await POST(request({ ...validBody, website: "spam" }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("omits reply-to for a contact that is not a valid email address", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const response = await POST(request({ ...validBody, contact: "not-an-email" }));
    expect(response.status).toBe(200);
    const payload = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(payload).not.toHaveProperty("reply_to");
  });

  it.each([
    "{broken",
    { ...validBody, name: "" },
    { ...validBody, name: "x".repeat(121) },
    { ...validBody, contact: "x".repeat(151) },
    { ...validBody, message: "x".repeat(501) },
    { ...validBody, method: "Signal" },
    { ...validBody, name: "Injected\nBcc: attacker@example.com" },
    { ...validBody, website: 123 },
  ])("rejects malformed or invalid submissions", async (body) => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const response = await POST(request(body));
    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects an oversized request body", async () => {
    const response = await POST(request("x".repeat(8193)));
    expect(response.status).toBe(400);
  });

  it("fails without required configuration and does not send", async () => {
    vi.stubEnv("ZEPTOMAIL_API_TOKEN", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await POST(request(validBody));
    expect(response.status).toBe(500);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns a generic failure when ZeptoMail rejects the message", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("provider details", { status: 401 })));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await POST(request(validBody));
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ ok: false });
  });
});
