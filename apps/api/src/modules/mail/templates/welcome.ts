import { emailEscape, renderEmailLayout } from "./layout";

export type WelcomeEmailParams = {
  appUrl: string;
  fullName: string;
  teamName: string;
  roleLabel: string;
  subTeamName?: string;
};

export const renderWelcomeEmail = (
  params: WelcomeEmailParams,
): { subject: string; html: string; text: string } => {
  const dashboardUrl = `${params.appUrl.replace(/\/$/, "")}/dashboard`;
  const place =
    params.subTeamName !== undefined && params.subTeamName.length > 0
      ? `${emailEscape(params.teamName)} · ${emailEscape(params.subTeamName)}`
      : emailEscape(params.teamName);

  const html = renderEmailLayout({
    appUrl: params.appUrl,
    preheader: `You’re on ${params.teamName}. The floor is ready.`,
    eyebrow: "Welcome",
    title: `You’re in, ${params.fullName.split(" ")[0] ?? params.fullName}`,
    bodyHtml: `
      <p style="margin:0 0 12px;">
        Your account is set. You’re a ${emailEscape(params.roleLabel)} on
        <strong>${place}</strong>.
      </p>
      <p style="margin:0 0 12px;">
        Open the floor to see what’s waiting, pick up work, and hand files off with IDs that stay with the job.
      </p>
    `,
    cta: { label: "Open the floor", href: dashboardUrl },
  });

  const text = [
    `You're in, ${params.fullName}`,
    "",
    `You're a ${params.roleLabel} on ${params.teamName}${params.subTeamName ? ` · ${params.subTeamName}` : ""}.`,
    "",
    `Open the floor: ${dashboardUrl}`,
  ].join("\n");

  return {
    subject: `Welcome to ${params.teamName}`,
    html,
    text,
  };
};
