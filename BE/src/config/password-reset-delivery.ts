import { CONFIG_ERROR_MESSAGES } from '../constants/messages.js';
import { z } from 'zod';

// Validate email delivery settings separately from general environment loading.
export function passwordResetDeliveryConfig(
  source: NodeJS.ProcessEnv = process.env
) {
  const mode =
    source.PASSWORD_RESET_DELIVERY ??
    (source.NODE_ENV === "development" || !source.NODE_ENV
      ? "development-file"
      : "resend");
  if (mode === "development-file") {
    if ((source.NODE_ENV ?? "development") !== "development")
      throw new Error(
        CONFIG_ERROR_MESSAGES.DEVELOPMENT_DELIVERY_ONLY
      );
    return { mode } as const;
  }
  if (mode !== "resend")
    throw new Error(
      CONFIG_ERROR_MESSAGES.INVALID_DELIVERY_MODE
    );
  const apiKey = source.RESEND_API_KEY;
  if (
    !apiKey ||
    !/^re_[A-Za-z0-9_-]+$/.test(apiKey) ||
    /placeholder|replace|example/i.test(apiKey)
  ) {
    throw new Error(
      CONFIG_ERROR_MESSAGES.INVALID_RESEND_KEY
    );
  }
  const from = source.PASSWORD_RESET_FROM;
  // Resend's shared sender is for local testing, not production delivery.
  const isDevelopmentSender =
    (source.NODE_ENV ?? "development") === "development" &&
    from?.toLowerCase() === "onboarding@resend.dev";
  if (
    !from ||
    !z.email().safeParse(from).success ||
    (!isDevelopmentSender && /@(resend\.dev|example\.(com|org|net|invalid))$/i.test(from))
  ) {
    throw new Error(
      CONFIG_ERROR_MESSAGES.INVALID_RESET_SENDER
    );
  }
  return { mode, apiKey, from } as const;
}

