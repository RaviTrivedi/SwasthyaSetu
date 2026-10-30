import {
  API_ERROR_MESSAGES,
  INTERNAL_ERROR_MESSAGES,
} from "../constants/messages.js";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { passwordResetDeliveryConfig } from "../config/password-reset-delivery.js";
import { Resend } from "resend";
import { browserConfig } from "../config/session.js";
import { HttpError } from "../errors/http-error.js";

export function requireResetDelivery(): void {
  try {
    passwordResetDeliveryConfig();
  } catch {
    throw new HttpError(503, API_ERROR_MESSAGES.RESET_DELIVERY_UNAVAILABLE);
  }
}

export function createPasswordResetDelivery(
  createClient = (apiKey: string) => new Resend(apiKey),
  config = passwordResetDeliveryConfig,
  frontendOrigin = () => browserConfig().frontendOrigin
) {
  return async (input: {
    email: string;
    token: string;
    expiresAt: Date;
  }): Promise<void> => {
    const settings = config();
    const link = new URL("/password-reset", frontendOrigin());
    link.hash = new URLSearchParams({ token: input.token }).toString();
    if (settings.mode === "development-file") {
      const directory = new URL(
        "../../.local/password-reset/",
        import.meta.url
      );
      await mkdir(directory, { recursive: true, mode: 0o700 });
      await writeFile(
        fileURLToPath(new URL(`${randomUUID()}.json`, directory)),
        JSON.stringify(
          {
            delivery: "development-file-only; no email sent",
            email: input.email,
            link: link.toString(),
            expiresAt: input.expiresAt.toISOString(),
          },
          null,
          2
        ),
        { mode: 0o600, flag: "wx" }
      );
      return;
    }
    const escapeHtml = (value: string) =>
      value.replace(
        /[&<>"']/g,
        (character) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
          }[character]!)
      );
    try {
      const { data, error } = await createClient(settings.apiKey).emails.send({
        from: `SwasthyaSetu <${settings.from}>`,
        to: [input.email],
        subject: "Reset your SwasthyaSetu password",
        text: `SwasthyaSetu\n\nUse this link to reset your password:\n${link.toString()}\n\nThis single-use link expires in 30 minutes. If you did not request a reset, ignore this email.`,
        html: `<div style="font-family:Arial,sans-serif;color:#183e35;max-width:560px;margin:auto;padding:24px"><h1>SwasthyaSetu</h1><h2>Reset your password</h2><p>Use the link below to choose a new password.</p><p><a href="${escapeHtml(
          link.toString()
        )}" style="color:#087f65">Reset password</a></p><p>This single-use link expires in 30 minutes.</p><p>If you did not request a reset, ignore this email.</p></div>`,
      });
      if (error || !data?.id)
        throw new Error(INTERNAL_ERROR_MESSAGES.DELIVERY_FAILED);
    } catch {
      // Never propagate provider errors, which can include request content.
      throw new Error(INTERNAL_ERROR_MESSAGES.RESET_DELIVERY_FAILED);
    }
  };
}

export const deliverPasswordReset = createPasswordResetDelivery();
