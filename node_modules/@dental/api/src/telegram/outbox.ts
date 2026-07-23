import { eq, and, isNull, lt, or } from "drizzle-orm";
import { db } from "../db/client.js";
import {
  communicationTasks,
  denteTelegramChatLinks,
  denteTelegramOutboxDeliveryReceipts,
  patients,
  appointments,
  visits,
  generatedDocuments
} from "../db/schema.js";
import type { DenteTelegramOutboxItem } from "@dental/shared";
import { getDenteTelegramBotSettings } from "./config.js";

function buildOutboxItemId(source: string, id: string): string {
  return `${source}:${id}`;
}

export async function buildDenteTelegramOutboxItems(organizationId: string): Promise<DenteTelegramOutboxItem[]> {
  const settings = await getDenteTelegramBotSettings(organizationId);
  const now = new Date();
  const items: DenteTelegramOutboxItem[] = [];

  if (settings.mode === "disabled") {
    return [];
  }

  // 1. Communication Tasks
  const tasks = await db
    .select()
    .from(communicationTasks)
    .where(
      and(
        eq(communicationTasks.organizationId, organizationId),
        eq(communicationTasks.channel, "telegram"),
        or(eq(communicationTasks.status, "queued"), eq(communicationTasks.status, "scheduled"))
      )
    );

  for (const task of tasks) {
    items.push({
      id: buildOutboxItemId("task", task.id),
      organizationId,
      taskId: task.id,
      patientId: task.patientId,
      appointmentId: task.appointmentId,
      subjectType: "patient",
      subjectId: task.patientId,
      chatLinkId: null, // will be resolved in prepare
      templateKind: (task.intent as string) === "review_request" ? "review_request" : ("custom_message" as any),
      deliveryStatus: "ready",
      scheduledAt: task.dueAt?.toISOString() ?? now.toISOString(),
      title: task.title,
      previewText: task.body.substring(0, 50),
      replyMarkup: null,
      photoUrl: null,
      warnings: [],
      blockedReason: null,
      source: "communication_task"
    });
  }

  // 2. Staff Daily Digest
  const activeStaffLinks = await db
    .select()
    .from(denteTelegramChatLinks)
    .where(
      and(
        eq(denteTelegramChatLinks.organizationId, organizationId),
        eq(denteTelegramChatLinks.subjectType, "staff"),
        eq(denteTelegramChatLinks.status, "active")
      )
    );

  const digestDate = now.toISOString().split("T")[0];
  for (const link of activeStaffLinks) {
    const digestId = `staff_digest:${link.subjectId}:${digestDate}`;
    
    // Check if already sent today
    const [existing] = await db
      .select()
      .from(denteTelegramOutboxDeliveryReceipts)
      .where(
        and(
          eq(denteTelegramOutboxDeliveryReceipts.outboxItemId, digestId),
          eq(denteTelegramOutboxDeliveryReceipts.status, "sent")
        )
      )
      .limit(1);

    if (!existing) {
      items.push({
        id: digestId,
        organizationId,
        taskId: null,
        patientId: null,
        appointmentId: null,
        subjectType: "staff",
        subjectId: link.subjectId,
        chatLinkId: link.id,
        templateKind: "staff_daily_digest",
        deliveryStatus: "ready",
        scheduledAt: now.toISOString(),
        title: "Сводка на сегодня",
        previewText: "Сводка на сегодня...",
        replyMarkup: null,
        photoUrl: null,
        warnings: [],
        blockedReason: null,
        source: "staff_digest"
      } as any);
    }
  }

  return items;
}
