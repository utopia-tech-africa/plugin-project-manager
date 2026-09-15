import { brandColors, emailEscape, renderEmailLayout } from "./layout";

export type WorkNoticeEmailParams = {
  appUrl: string;
  kind: "waiting" | "sent_back" | "closed";
  title: string;
  body: string;
  projectId: string;
  projectPublicId: string;
};

const kindMeta = (
  kind: WorkNoticeEmailParams["kind"],
): { eyebrow: string; color: string; cta: string } => {
  if (kind === "sent_back") {
    return {
      eyebrow: "Sent back",
      color: brandColors.oxide,
      cta: "Open the job",
    };
  }
  if (kind === "closed") {
    return {
      eyebrow: "Closed",
      color: brandColors.muted,
      cta: "View history",
    };
  }
  return {
    eyebrow: "Waiting",
    color: brandColors.waiting,
    cta: "Open the job",
  };
};

export const renderWorkNoticeEmail = (
  params: WorkNoticeEmailParams,
): { subject: string; html: string; text: string } => {
  const meta = kindMeta(params.kind);
  const href =
    params.kind === "closed"
      ? `${params.appUrl.replace(/\/$/, "")}/history`
      : `${params.appUrl.replace(/\/$/, "")}/work/${params.projectId}`;

  const html = renderEmailLayout({
    appUrl: params.appUrl,
    preheader: params.body,
    eyebrow: meta.eyebrow,
    title: params.title,
    bodyHtml: `
      <p style="margin:0 0 8px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;letter-spacing:0.08em;color:${meta.color};">
        ${emailEscape(params.projectPublicId)}
      </p>
      <p style="margin:0 0 12px;">
        ${emailEscape(params.body)}
      </p>
    `,
    cta: { label: meta.cta, href },
  });

  const text = [
    params.title,
    params.projectPublicId,
    "",
    params.body,
    "",
    `${meta.cta}: ${href}`,
  ].join("\n");

  return {
    subject: params.title,
    html,
    text,
  };
};
