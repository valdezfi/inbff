/**
 * Email sending via Mailgun.
 *
 * Required env vars:
 *   MAILGUN_API_KEY    — your Mailgun private API key  (key-...)
 *   MAILGUN_DOMAIN     — the sending domain you verified in Mailgun (e.g. mg.yourdomain.com)
 *   MAILGUN_FROM       — the From address, e.g. "Referly <no-reply@mg.yourdomain.com>"
 *
 * When MAILGUN_API_KEY is NOT set (local dev) the function logs the email
 * to the console instead of sending it, so you can still develop without
 * Mailgun credentials.
 */

import * as MailgunModule from "mailgun.js";
import * as FormDataModule from "form-data";

// Turbopack/ESM interop: the default export may live at .default or at the module root
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MailgunCtor: new (f: unknown) => { client: (...args: unknown[]) => unknown } =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ((MailgunModule as any).default ?? MailgunModule) as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const FormDataCtor = ((FormDataModule as any).default ?? FormDataModule) as typeof FormDataModule.default;

function getClient() {
  const apiKey = process.env.MAILGUN_API_KEY;
  if (!apiKey) return null;
  const mg = new MailgunCtor(FormDataCtor);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (mg as any).client({ username: "api", key: apiKey }) as {
    messages: { create: (domain: string, opts: Record<string, unknown>) => Promise<unknown> };
  };
}

interface SendOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export async function sendEmail(opts: SendOptions): Promise<void> {
  const client = getClient();
  const domain = process.env.MAILGUN_DOMAIN ?? "";
  const from =
    process.env.MAILGUN_FROM ?? `Referly <no-reply@${domain || "example.com"}>`;

  if (!client || !domain) {
    // Dev fallback — print to console so you can still click the link
    console.log("\n📧 [Email not sent — MAILGUN_API_KEY not set]");
    console.log(`   To:      ${opts.to}`);
    console.log(`   Subject: ${opts.subject}`);
    // Extract the verification URL from the HTML for easy dev access
    const match = opts.html.match(/href="([^"]+verify[^"]+)"/);
    if (match) console.log(`   Link:    ${match[1]}`);
    console.log("");
    return;
  }

  await client.messages.create(domain, {
    from,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
  });
}

// ─── Email templates ──────────────────────────────────────────────────────────

export function verificationEmailHtml(name: string, verifyUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Verify your Referly account</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px 16px; color: #111827; }
    .container { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    .header { background: #0A0A0B; padding: 32px 40px; }
    .logo { display: flex; align-items: center; gap: 8px; }
    .logo-dot { width: 8px; height: 8px; border-radius: 50%; background: #3B82F6; display: inline-block; }
    .logo-text { color: #ffffff; font-size: 16px; font-weight: 600; letter-spacing: -0.02em; }
    .body { padding: 40px; }
    h1 { font-size: 22px; font-weight: 600; color: #111827; margin-bottom: 8px; }
    p { font-size: 15px; color: #6b7280; line-height: 1.6; margin-bottom: 16px; }
    .btn { display: inline-block; background: #2563eb; color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-size: 15px; font-weight: 600; margin: 8px 0 24px; }
    .divider { border: none; border-top: 1px solid #e5e7eb; margin: 24px 0; }
    .small { font-size: 13px; color: #9ca3af; }
    .link { color: #2563eb; word-break: break-all; }
    .footer { padding: 24px 40px; background: #f9fafb; border-top: 1px solid #e5e7eb; }
    .footer p { font-size: 12px; color: #9ca3af; margin: 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">
        <span class="logo-dot"></span>
        <span class="logo-text">Referly</span>
      </div>
    </div>
    <div class="body">
      <h1>Verify your email address</h1>
      <p>Hi ${escapeHtml(name)},</p>
      <p>Thanks for signing up for Referly. Click the button below to verify your email address and activate your account.</p>
      <a href="${verifyUrl}" class="btn">Verify email address</a>
      <p>This link expires in <strong>24 hours</strong>. If you didn't create a Referly account, you can safely ignore this email.</p>
      <hr class="divider" />
      <p class="small">If the button doesn't work, copy and paste this URL into your browser:</p>
      <p class="small"><a href="${verifyUrl}" class="link">${verifyUrl}</a></p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Referly. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
}

export function verificationEmailText(name: string, verifyUrl: string): string {
  return `Hi ${name},

Thanks for signing up for Referly. Verify your email address by visiting the link below:

${verifyUrl}

This link expires in 24 hours. If you didn't create a Referly account, you can safely ignore this email.

© ${new Date().getFullYear()} Referly`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
