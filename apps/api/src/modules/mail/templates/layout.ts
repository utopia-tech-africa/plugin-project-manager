const BRAND = {
  magenta: "#FF1283",
  ink: "#11151C",
  ticket: "#FFF8EE",
  floor: "#C9D0D8",
  muted: "#5A6573",
  cobalt: "#2550E8",
  oxide: "#C23A22",
  waiting: "#E8A317",
  white: "#FFFFFF",
} as const;

export type EmailLayoutParams = {
  appUrl: string;
  preheader: string;
  title: string;
  eyebrow?: string;
  bodyHtml: string;
  cta?: { label: string; href: string };
  footerNote?: string;
};

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

export const emailEscape = escapeHtml;

export const renderEmailLayout = (params: EmailLayoutParams): string => {
  const logoUrl = `${params.appUrl.replace(/\/$/, "")}/logo.png`;
  const eyebrow =
    params.eyebrow !== undefined && params.eyebrow.length > 0
      ? `<p style="margin:0 0 8px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:${BRAND.muted};">${escapeHtml(params.eyebrow)}</p>`
      : "";
  const cta =
    params.cta !== undefined
      ? `<tr>
          <td style="padding:28px 0 8px;">
            <a href="${escapeHtml(params.cta.href)}" style="display:inline-block;background:${BRAND.magenta};color:${BRAND.white};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;line-height:1;text-decoration:none;padding:14px 22px;border-radius:6px;">
              ${escapeHtml(params.cta.label)}
            </a>
          </td>
        </tr>`
      : "";
  const footerNote =
    params.footerNote !== undefined && params.footerNote.length > 0
      ? `<p style="margin:16px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.5;color:${BRAND.muted};">${escapeHtml(params.footerNote)}</p>`
      : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <title>${escapeHtml(params.title)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.floor};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
    ${escapeHtml(params.preheader)}
  </div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${BRAND.floor};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;">
          <tr>
            <td style="padding:0 0 20px;">
              <img src="${escapeHtml(logoUrl)}" alt="Plugin" width="120" height="44" style="display:block;border:0;outline:none;height:auto;max-width:120px;" />
            </td>
          </tr>
          <tr>
            <td style="background:${BRAND.ticket};border-radius:2px 14px 14px 2px;box-shadow:0 10px 28px rgba(17,21,28,0.10);padding:32px 28px 28px 36px;">
              ${eyebrow}
              <h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.15;letter-spacing:-0.03em;color:${BRAND.ink};font-weight:700;">
                ${escapeHtml(params.title)}
              </h1>
              <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:${BRAND.ink};">
                ${params.bodyHtml}
              </div>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                ${cta}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 4px 0;">
              <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.5;color:${BRAND.muted};">
                Plugin Project Manager · Work moves through teams. IDs stay with the files.
              </p>
              ${footerNote}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

export const brandColors = BRAND;
