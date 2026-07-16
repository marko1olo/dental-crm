import { eq, isNull, ilike } from "drizzle-orm";
import { db } from "../db/client.js";
import { communicationEvents, messengerInboundEvents, patients } from "../db/schema.js";
import { wsBroker } from "./websocketBroker.js";

/**
 * Processes raw inbound events from the messengerInboundEvents queue,
 * resolves patients by phone/external ID, and moves them to communicationEvents
 * so they appear in the unified Omnichannel Inbox.
 */
export async function processInboundEvents(): Promise<void> {
  const pendingEvents = await db
    .select()
    .from(messengerInboundEvents)
    .where(isNull(messengerInboundEvents.processedAt))
    .orderBy(messengerInboundEvents.createdAt);

  for (const event of pendingEvents) {
    if (!event.messageText) {
      // Mark as processed if there is no text message (e.g. status updates)
      await markAsProcessed(event.id);
      continue;
    }

    const { organizationId, channel, externalChatId, messageText } = event;
    let patientId = event.patientId;

    if (!patientId) {
      // Attempt to resolve patient
      let resolvedPatient: any = null;

      if (channel === "whatsapp") {
        const rawPhone = externalChatId.replace(/\D/g, "");
        if (rawPhone.length >= 10) {
          const phoneSuffix = rawPhone.slice(-10);
          const searchResult = await db.select()
            .from(patients)
            .where(ilike(patients.phone, `%${phoneSuffix}%`))
            .limit(1);
          resolvedPatient = searchResult[0] || null;
        }
      } else if (channel === "max") {
        const searchResult = await db.select()
          .from(patients)
          .where(ilike(patients.notes, `%MAX:${externalChatId}%`))
          .limit(1);
        resolvedPatient = searchResult[0] || null;
      }

      if (!resolvedPatient) {
        // Create new lead
        let fullName = "Unknown User";
        if (channel === "whatsapp") fullName = `WhatsApp User ${externalChatId}`;
        if (channel === "max") fullName = `MAX User ${externalChatId}`;

        const insertedPatients = await db.insert(patients).values({
          organizationId,
          fullName,
          phone: channel === "whatsapp" ? externalChatId : null,
          notes: channel === "max" ? `Лид из MAX. MAX:${externalChatId}` : `Лид из WhatsApp. WA:${externalChatId}`,
          status: "active"
        }).returning() as any;
        resolvedPatient = insertedPatients[0];
      }
      
      patientId = resolvedPatient.id;

      // Update patientId in the original event
      await db.update(messengerInboundEvents)
        .set({ patientId })
        .where(eq(messengerInboundEvents.id, event.id));
    }

    if (!patientId) {
       await markAsProcessed(event.id);
       continue;
    }

    // Insert into communicationEvents so the UI can see it
    await db.insert(communicationEvents).values({
      organizationId,
      patientId,
      channel: (channel === "max" ? "telegram" : channel) as any,
      direction: "inbound",
      status: "delivered",
      message: messageText,
    });

    // Notify the UI
    wsBroker.broadcastToOrganization(organizationId, {
      type: "INBOX_NEW_MESSAGE",
      payload: {
        channel,
        patientId,
        text: messageText
      }
    });

    await markAsProcessed(event.id);
  }
}

async function markAsProcessed(eventId: string) {
  await db.update(messengerInboundEvents)
    .set({ processedAt: new Date() })
    .where(eq(messengerInboundEvents.id, eventId));
}
