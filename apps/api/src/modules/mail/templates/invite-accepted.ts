import { emailEscape, renderEmailLayout } from "./layout";

export type InviteAcceptedEmailParams = {
  appUrl: string;
  inviterName: string;
  memberName: string;
  memberEmail: string;
  teamName: string;
};

export const renderInviteAcceptedEmail = (
  params: InviteAcceptedEmailParams,
): { subject: string; html: string; text: string } => {
  const settingsUrl = `${params.appUrl.replace(/\/$/, "")}/settings`;
  const html = renderEmailLayout({
    appUrl: params.appUrl,
    preheader: `${params.memberName} joined ${params.teamName}.`,
    eyebrow: "Invite accepted",
    title: `${params.memberName} joined`,
    bodyHtml: `
      <p style="margin:0 0 12px;">
        Hi ${emailEscape(params.inviterName.split(" ")[0] ?? params.inviterName)},
      </p>
      <p style="margin:0 0 12px;">
        <strong>${emailEscape(params.memberName)}</strong>
        (${emailEscape(params.memberEmail)}) accepted your invite and is now on
        <strong>${emailEscape(params.teamName)}</strong>.
      </p>
    `,
    cta: { label: "View team settings", href: settingsUrl },
  });

  const text = [
    `${params.memberName} joined ${params.teamName}`,
    "",
    `${params.memberName} (${params.memberEmail}) accepted your invite.`,
    "",
    `View team settings: ${settingsUrl}`,
  ].join("\n");

  return {
    subject: `${params.memberName} joined ${params.teamName}`,
    html,
    text,
  };
};
