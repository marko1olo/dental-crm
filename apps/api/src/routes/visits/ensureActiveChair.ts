import { and, eq } from "drizzle-orm";
import { db as database } from "../../db/client.js";
import { chairs, clinics } from "../../db/schema.js";

export async function findOrCreateActiveChair(orgId: string) {
	const activeChairs = await database
		.select()
		.from(chairs)
		.where(and(eq(chairs.organizationId, orgId), eq(chairs.isActive, true)))
		.orderBy(chairs.id);

	if (activeChairs[0]) return activeChairs[0];

	// Zero Dead-Ends (Мандат 8n): если в клинике ещё нет заведённых кресел,
	// автоматически инициализируем клинику и «Кресло 1»
	const clinicRows = await database
		.select({ id: clinics.id })
		.from(clinics)
		.where(eq(clinics.organizationId, orgId))
		.limit(1);
	let clinicId = clinicRows[0]?.id;
	if (!clinicId) {
		const [createdClinic] = await database
			.insert(clinics)
			.values({
				organizationId: orgId,
				name: "Основная клиника",
				address: "Кабинет врача",
			})
			.returning({ id: clinics.id });
		clinicId = createdClinic?.id;
	}
	if (clinicId) {
		const [createdChair] = await database
			.insert(chairs)
			.values({
				organizationId: orgId,
				clinicId,
				name: "Кресло 1",
				isActive: true,
			})
			.returning();
		return createdChair;
	}
	return undefined;
}
