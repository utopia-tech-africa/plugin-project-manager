import { emailEscape, renderEmailLayout } from "./layout";

export type InviteEmailParams = {
  appUrl: string;
  inviteUrl: string;
  teamName: string;
  inviterName: string;
  roleLabel: string;
  subTeamName?: string;
  expiresAt: Date;
};

export const renderInviteEmail = (
  params: InviteEmailParams,
): { subject: string; html: string; text: string } => {
  const assignment =
    params.subTeamName !== undefined && params.subTeamName.length > 0
      ? ` You’ll join <strong>${emailEscape(params.subTeamName)}</strong> as a ${emailEscape(params.roleLabel)}.`
      : ` You’ll join as a ${emailEscape(params.roleLabel)}.`;
  const expiresLabel = new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(params.expiresAt);

  const html = renderEmailLayout({
    appUrl: params.appUrl,
    preheader: `${params.inviterName} invited you to ${params.teamName} on Pluginin.`,
    eyebrow: "Team invite",
    title: `Join ${params.teamName}`,
    bodyHtml: `
      <p style="margin:0 0 12px;">
        <strong>${emailEscape(params.inviterName)}</strong> invited you to
        <strong>${emailEscape(params.teamName)}</strong> on Pluginin.${assignment}
      </p>
      <p style="margin:0 0 12px;">
        Open the link below to set your name and password. The invite stays open until
        <strong>${emailEscape(expiresLabel)}</strong>.
      </p>
    `,
    cta: { label: "Accept invite", href: params.inviteUrl },
    footerNote:
      "If you were not expecting this, you can ignore the email. The link expires on its own.",
  });

  const text = [
    `Join ${params.teamName}`,
    "",
    `${params.inviterName} invited you to ${params.teamName} on Pluginin.`,
    params.subTeamName !== undefined && params.subTeamName.length > 0
      ? `You'll join ${params.subTeamName} as a ${params.roleLabel}.`
      : `You'll join as a ${params.roleLabel}.`,
    "",
    `Accept invite: ${params.inviteUrl}`,
    `Expires: ${expiresLabel}`,
  ].join("\n");

  return {
    subject: `Join ${params.teamName} on Pluginin`,
    html,
    text,
  };
};
