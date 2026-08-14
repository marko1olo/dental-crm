import { enqueueMessage } from "./communications/dispatcher.js";

/**
 * Триггер контроля самочувствия и пост-операционных инструкций после лечения.
 * Ставит сервисное сообщение в очередь с автоматическим каскадом доставки.
 */
export async function triggerPostOpCare(
	orgId: string,
	patientId: string,
	itemTitle: string,
) {
	const dedupeKey = `postop:${orgId}:${patientId}:${Date.now().toString(36)}`;
	const body = `Контроль самочувствия Dente: вы прошли процедуру «${itemTitle}». Пожалуйста, соблюдайте рекомендации врача. При возникновении острой боли или кровотечения немедленно свяжитесь с клиникой.`;

	return await enqueueMessage({
		organizationId: orgId,
		patientId,
		channel: "sms",
		intent: "post_visit_instruction",
		scope: "service",
		body,
		dedupeKey,
	});
}
