import "../config/env.js";
import { disconnectDatabase } from "../config/database.js";
import { ADMIN_PROVISION_MESSAGES } from "../config/admin-provision.js";
import { provisionAdmin } from "../services/admin/provision.service.js";

try {
  await provisionAdmin(process.env);
  console.log(ADMIN_PROVISION_MESSAGES.success);
} catch (error) {
  const safeMessages: readonly string[] = Object.values(
    ADMIN_PROVISION_MESSAGES
  );
  console.error(
    error instanceof Error && safeMessages.includes(error.message)
      ? error.message
      : ADMIN_PROVISION_MESSAGES.failed
  );
  process.exitCode = 1;
} finally {
  delete process.env.ADMIN_PASSWORD;
  await disconnectDatabase().catch(() => {
    process.exitCode = 1;
  });
}
