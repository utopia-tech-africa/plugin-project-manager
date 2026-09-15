import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Resend } from "resend";

import type { EnvironmentVariables } from "../../config/environment";
import { type InviteEmailParams, renderInviteEmail } from "./templates/invite";
import {
  type InviteAcceptedEmailParams,
  renderInviteAcceptedEmail,
} from "./templates/invite-accepted";
import {
  renderWelcomeEmail,
  type WelcomeEmailParams,
} from "./templates/welcome";
import {
  renderWorkNoticeEmail,
  type WorkNoticeEmailParams,
} from "./templates/work-notice";

type SendResult = { sent: boolean };

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly resend: Resend | null;

  public constructor(
    @Inject(ConfigService)
    private readonly configService: ConfigService<EnvironmentVariables, true>,
  ) {
    const apiKey = this.configService.get("RESEND_API_KEY", { infer: true });
    this.resend = apiKey.length > 0 ? new Resend(apiKey) : null;
  }

  public get appUrl(): string {
    return this.configService
      .get("APP_PUBLIC_URL", { infer: true })
      .replace(/\/$/, "");
  }

  public async sendInvite(
    to: string,
    params: Omit<InviteEmailParams, "appUrl">,
  ): Promise<SendResult> {
    const rendered = renderInviteEmail({ ...params, appUrl: this.appUrl });
    return this.dispatch({
      to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
  }

  public async sendWelcome(
    to: string,
    params: Omit<WelcomeEmailParams, "appUrl">,
  ): Promise<SendResult> {
    const rendered = renderWelcomeEmail({ ...params, appUrl: this.appUrl });
    return this.dispatch({
      to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
  }

  public async sendInviteAccepted(
    to: string,
    params: Omit<InviteAcceptedEmailParams, "appUrl">,
  ): Promise<SendResult> {
    const rendered = renderInviteAcceptedEmail({
      ...params,
      appUrl: this.appUrl,
    });
    return this.dispatch({
      to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
  }

  public async sendWorkNotice(
    to: string,
    params: Omit<WorkNoticeEmailParams, "appUrl">,
  ): Promise<SendResult> {
    const rendered = renderWorkNoticeEmail({ ...params, appUrl: this.appUrl });
    return this.dispatch({
      to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
  }

  private async dispatch(params: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<SendResult> {
    const from = this.configService.get("MAIL_FROM", { infer: true });

    if (this.resend === null) {
      this.logger.warn(
        `Mail skipped (RESEND_API_KEY unset): "${params.subject}" → ${params.to}`,
      );
      return { sent: false };
    }

    try {
      const result = await this.resend.emails.send({
        from,
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
      });
      if (result.error !== null && result.error !== undefined) {
        this.logger.error(
          `Resend failed for ${params.to}: ${result.error.message}`,
        );
        return { sent: false };
      }
      return { sent: true };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`Resend threw for ${params.to}: ${message}`);
      return { sent: false };
    }
  }
}
