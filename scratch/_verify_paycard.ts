/**
 * РАЗВЕДКА, ТОЛЬКО ЧТЕНИЕ. Ничего не пишет в базу.
 * Проверяет, какое число попадает в пункт "Оплата связана" карточки закрытия приёма.
 */
import { db, pool } from "../apps/api/src/db/client.js";
import * as schema from "../apps/api/src/db/schema.js";
import { getDashboardFromDb } from "../apps/api/src/db/dashboardQuery.js";
import { withHydratedDomainState } from "../apps/api/src/db/domainStateHydration.js";
import { projectVisitRow } from "../apps/api/src/db/visitsProjection.js";
import {
	aiRecognitionJobs,
	buildBillingSummary,
	buildClinicalRuleSummary,
	communicationTasks,
	documents,
	imagingStudies,
} from "../apps/api/src/sampleData.js";
import { buildVisitCloseChecklist } from "../apps/api/src/visitCloseChecklist.js";

const ORG = "d0000000-0000-4000-8000-00000000d001";

function show(label: string, value: unknown) {
	console.log(`${label} ${JSON.stringify(value)}`);
}

async function main() {
	console.log(`DENTAL_STATE_PERSISTENCE=${JSON.stringify(process.env.DENTAL_STATE_PERSISTENCE)}`);

	// ── 1. Настоящий путь главного экрана: сводка из базы ───────────────────────
	const dashboard = await getDashboardFromDb(ORG);
	const card = (dashboard as any).visitCloseChecklist;
	const payItem = card.items.find((i: any) => i.id === "payment-link");
	console.log("\n=== ЭКРАН: getDashboardFromDb -> dashboard.visitCloseChecklist ===");
	show("card.visitId          =", card.visitId);
	show("payment-link.visitId  =", payItem.visitId);
	show("payment-link.detail   =", payItem.detail);
	show("payment-link.ready    =", payItem.ready);
	show("billingSummary.totalDueRub =", (dashboard as any).billingSummary.totalDueRub);
	show("billingSummary.totalPlannedRub =", (dashboard as any).billingSummary.totalPlannedRub);
	show("billingSummary.totalPaidRub =", (dashboard as any).billingSummary.totalPaidRub);

	// ── 2. Путь подписания в базе: тот же вызов, что в db/visitsQuery.ts:234-242 ─
	console.log("\n=== ПОДПИСАНИЕ: копия вызова из db/visitsQuery.ts:234-242, по КАЖДОМУ приёму ===");
	const visitRows = await db.select().from(schema.visits);
	const sorted = visitRows
		.map((row) => projectVisitRow(row))
		.sort((a, b) => a.id.localeCompare(b.id));
	await withHydratedDomainState(ORG, (report) => {
		if (!report.organizationFound) throw new Error("клиника не найдена");
		const billing = buildBillingSummary();
		console.log(`buildBillingSummary().totalDueRub = ${billing.totalDueRub}  (один на все приёмы)`);
		for (const visit of sorted) {
			const checklist = buildVisitCloseChecklist({
				visit,
				imagingStudies,
				documents,
				aiRecognitionJobs,
				communicationTasks,
				clinical: buildClinicalRuleSummary(visit.patientId),
				billing,
			});
			const item = checklist.items.find((i) => i.id === "payment-link")!;
			console.log(`visit=${visit.id} ready=${item.ready} detail=${JSON.stringify(item.detail)}`);
		}
		return null;
	});
}

main()
	.catch((error) => {
		console.error("СБОЙ:", error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await pool.end();
	});
