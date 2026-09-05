type Cta = {
  label: string;
  href: string;
};

type EmailTemplateInput = {
  title: string;
  preheader: string;
  customerName: string;
  intro: string;
  details?: Array<{ label: string; value: string }>;
  mainHtml?: string;
  cta?: Cta;
  secondaryHtml?: string;
};

const BRAND = "Nomade";
const CONTACT_EMAIL =
  process.env.CONTACT_EMAIL ||
  process.env.NOREPLY_EMAIL ||
  "contact@nomade-artisan.fr";
const SHOP_URL =
  process.env.NEXT_PUBLIC_BASE_URL || "https://scolta.nomade-artisan.fr";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function formatEuro(amount: number): string {
  return `${amount.toFixed(2)} EUR`;
}

export function renderEmailTemplate({
  title,
  preheader,
  customerName,
  intro,
  details = [],
  mainHtml = "",
  cta,
  secondaryHtml = "",
}: EmailTemplateInput): string {
  const detailsRows = details
    .map(
      (d) => `
        <tr>
          <td style="padding:8px 0;color:#6b7280;font-size:13px;">${escapeHtml(d.label)}</td>
          <td style="padding:8px 0;color:#111827;font-size:13px;text-align:right;font-weight:600;">${escapeHtml(d.value)}</td>
        </tr>
      `
    )
    .join("");

  const ctaBlock = cta
    ? `
      <div style="text-align:center;margin:24px 0;">
        <a href="${escapeHtml(cta.href)}" style="display:inline-block;background:#111827;color:#ffffff;padding:12px 22px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;">
          ${escapeHtml(cta.label)}
        </a>
      </div>
    `
    : "";

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${escapeHtml(title)}</title>
      </head>
      <body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#111827;">
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
        <table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px;background:#f3f4f6;">
          <tr>
            <td align="center">
              <table width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb;">
                <tr>
                  <td style="padding:28px 28px 20px;background:#ffffff;border-bottom:1px solid #e5e7eb;">
                    <p style="margin:0 0 8px;font-size:11px;letter-spacing:1.4px;text-transform:uppercase;color:#6b7280;">${escapeHtml(BRAND)}</p>
                    <h1 style="margin:0;font-size:24px;line-height:1.3;color:#111827;">${escapeHtml(title)}</h1>
                  </td>
                </tr>

                <tr>
                  <td style="padding:28px;">
                    <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#111827;">Bonjour <strong>${escapeHtml(customerName)}</strong>,</p>
                    <p style="margin:0 0 18px;font-size:14px;line-height:1.7;color:#374151;">${escapeHtml(intro)}</p>

                    ${
                      details.length > 0
                        ? `<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:14px 16px;margin:0 0 20px;"><table width="100%" cellpadding="0" cellspacing="0">${detailsRows}</table></div>`
                        : ""
                    }

                    ${mainHtml}
                    ${ctaBlock}
                    ${secondaryHtml}
                  </td>
                </tr>

                <tr>
                  <td style="padding:18px 28px;background:#111827;">
                    <p style="margin:0 0 8px;color:#ffffff;font-size:13px;">Besoin d'aide ?</p>
                    <p style="margin:0;color:#d1d5db;font-size:12px;line-height:1.6;">
                      Contact : <a href="mailto:${escapeHtml(CONTACT_EMAIL)}" style="color:#ffffff;text-decoration:none;">${escapeHtml(CONTACT_EMAIL)}</a><br />
                      Boutique : <a href="${escapeHtml(SHOP_URL)}" style="color:#ffffff;text-decoration:none;">${escapeHtml(SHOP_URL)}</a>
                    </p>
                    <p style="margin:10px 0 0;color:#9ca3af;font-size:11px;">© ${new Date().getFullYear()} ${escapeHtml(BRAND)}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

export function renderEmailText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<li>/gi, "- ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
