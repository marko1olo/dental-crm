import { db } from "../db/client.js";
import { outgoingNotifications } from "../db/schema.js";
import { eq, and, lte } from "drizzle-orm";

export async function scheduleNotification(input: {
  organizationId: string;
  patientId: string;
  type: string;
  payload: any;
  scheduledAt?: Date;
}) {
  await db.insert(outgoingNotifications).values({
    organizationId: input.organizationId,
    patientId: input.patientId,
    type: input.type,
    payload: input.payload,
    scheduledAt: input.scheduledAt ?? new Date(),
    status: 'pending'
  });
}

// Neon styling for console
const colors = {
  reset: "\x1b[0m",
  neonGreen: "\x1b[38;2;57;255;20px\x1b[1m",
  neonBlue: "\x1b[38;2;0;255;255px\x1b[1m",
  gray: "\x1b[90m"
};

export async function processNotificationQueue() {
  try {
    const pending = await db
      .select()
      .from(outgoingNotifications)
      .where(
        and(
          eq(outgoingNotifications.status, 'pending'),
          lte(outgoingNotifications.scheduledAt, new Date())
        )
      )
      .limit(10);

    for (const notif of pending) {
      // Mock sending logic
      const messageText = (notif.payload as Record<string, unknown>)?.text || JSON.stringify(notif.payload);
      
      console.log(`\n${colors.gray}--- [OUTGOING MESSAGE GATEWAY] ---${colors.reset}`);
      console.log(`${colors.neonBlue}TO PATIENT:${colors.reset} ${notif.patientId}`);
      console.log(`${colors.neonGreen}TYPE:${colors.reset} ${notif.type}`);
      console.log(`${colors.neonGreen}MESSAGE:${colors.reset} ${messageText}`);
      console.log(`${colors.gray}----------------------------------${colors.reset}\n`);

      await db
        .update(outgoingNotifications)
        .set({ status: 'sent', sentAt: new Date() })
        .where(eq(outgoingNotifications.id, notif.id));
    }
  } catch (e) {
    console.error("Failed to process notification queue:", e);
  }
}

// In a real env, you would run setInterval(() => processNotificationQueue(), 60000)
// Exporting start worker
export function startNotificationWorker() {
  setInterval(() => {
    processNotificationQueue().catch(console.error);
  }, 10000); // 10s for fast demo feedback
}
