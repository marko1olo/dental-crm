/**
 * СТОРОЖ ОТВЕТА НА ПОДПИСАНИЕ КАРТЫ ПРИЁМА.
 *
 * ЧТО ЭТОТ ФАЙЛ ЛОВИТ. `acceptVisitDraftInDb` подписывает приём в базе, и ответ по
 * контракту `acceptVisitDraftResponseSchema` собирает она же. Пока она возвращала
 * `{ acceptedVisitId, newRevision }`, маршрут не мог собрать ответ НИКОГДА, и врач
 * на своём главном действии получал HTTP 500 при подписанной карте
 * (измерено: src/tests/routes/chainWeldProof.ts, шаг 9). Неполный результат из
 * слоя доступа обязан валить проверку здесь, а не доезжать до экрана врача.
 *
 * ВТОРОЕ, ЧТО ЭТОТ ФАЙЛ ЛОВИТ: карточка закрытия приёма обязана относиться к ЭТОМУ
 * приёму. Раньше её строил расчёт, читавший общее состояние процесса
 * (`activeVisit` — «последний черновик клиники»), поэтому для любого приёма
 * выходила одна и та же карточка чужого визита. Ниже два приёма двух разных
 * пациентов проверяются на то, что карточки РАЗНЫЕ и каждая указывает на свой приём.
 *
 * ЖИВАЯ БАЗА, А НЕ ЗАГЛУШКИ. Подмена `db.select` здесь ничего не доказала бы:
 * проверяется как раз то, что в базу ушла подпись, а из базы вернулась строка, по
 * которой собран ответ. Свои строки создаются перед проверками и удаляются после
 * по точным id; чужие данные клиники не читаются на запись и не меняются.
 */

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import {
	type AcceptVisitDraftInput,
	acceptVisitDraftResponseSchema,
	type VisitCloseChecklist,
} from "@dental/shared";
import { sql } from "drizzle-orm";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../tests/support/fixtureOrganizations.js";
import { db, pool } from "./client.js";
import { imagingStudies, organizations, patients, visits } from "./schema.js";
import { acceptVisitDraftInDb } from "./visitsQuery.js";

const NAMESPACE = "dbVisitsQuery";
const ORGANIZATION_ID = fixtureUuid(NAMESPACE, 1);
const FILLED_PATIENT_ID = fixtureUuid(NAMESPACE, 2);
const EMPTY_PATIENT_ID = fixtureUuid(NAMESPACE, 3);
const FILLED_VISIT_ID = fixtureUuid(NAMESPACE, 10);
const EMPTY_VISIT_ID = fixtureUuid(NAMESPACE, 11);
const IMAGING_STUDY_ID = fixtureUuid(NAMESPACE, 20);

type IdRow = { readonly id: string };

async function firstRow<T extends Record<string, unknown>>(
	query: ReturnType<typeof sql>,
): Promise<T | null> {
	const result = await db.execute(query);
	return ((result.rows as T[])[0] ?? null) as T | null;
}

/** Единая заготовка черновика: тесту важны только заполненность полей. */
function draftInput(visitId: string, filled: boolean): AcceptVisitDraftInput {
	return {
		visitId,
		draft: {
			warnings: [],
			complaint: "Боль при накусывании",
			anamnesis: filled ? "Впервые" : null,
			objectiveStatus: filled ? "Глубокая кариозная полость 36" : null,
			diagnosis: filled ? "K02.1 Кариес дентина" : null,
			treatmentPlan: filled ? "Лечение кариеса 36" : null,
		},
		doctorSummary: filled ? "Лечение кариеса 36 выполнено" : null,
		clientMutationId: null,
		baseRevision: null,
		clientSavedAt: null,
	};
}

function itemOf(checklist: VisitCloseChecklist, id: string) {
	const item = checklist.items.find((entry) => entry.id === id);
	assert.ok(item, `в карточке закрытия приёма нет пункта «${id}»`);
	return item;
}

const PATIENT_MARK = "Сторож подписания приёма (удалить)";

describe("acceptVisitDraftInDb: ответ по контракту и привязка карточки к приёму", () => {
	before(async () => {
		// Уборка следов прерванного прогона ДО посева: см. докстринг фикстуры.
		await purgeFixtureOrganizations([ORGANIZATION_ID]);

		// Весь сев — под контекстом своей клиники: в WITH CHECK тенант-таблиц стоит
		// только `organization_id = current_tenant`, без дизъюнкта обхода, поэтому
		// вставка без контекста отвергается кодом 42501.
		await withFixtureTenant(ORGANIZATION_ID, async () => {
			await db
				.insert(organizations)
				.values({
					id: ORGANIZATION_ID,
					name: "Сторож ответа acceptVisitDraftInDb",
				})
				.onConflictDoNothing();
			await db.insert(patients).values({
				id: FILLED_PATIENT_ID,
				organizationId: ORGANIZATION_ID,
				fullName: `${PATIENT_MARK} 1`,
				status: "active",
			});
			await db.insert(patients).values({
				id: EMPTY_PATIENT_ID,
				organizationId: ORGANIZATION_ID,
				fullName: `${PATIENT_MARK} 2`,
				status: "active",
			});
			await db.insert(visits).values({
				id: FILLED_VISIT_ID,
				organizationId: ORGANIZATION_ID,
				patientId: FILLED_PATIENT_ID,
				status: "draft",
				revision: 1,
			});
			await db.insert(visits).values({
				id: EMPTY_VISIT_ID,
				organizationId: ORGANIZATION_ID,
				patientId: EMPTY_PATIENT_ID,
				status: "draft",
				revision: 1,
			});
			// Непроверенный снимок ровно у ОДНОГО приёма: если карточка соберётся по
			// общему состоянию, а не по приёму, оба приёма получат один и тот же пункт.
			await db.insert(imagingStudies).values({
				id: IMAGING_STUDY_ID,
				organizationId: ORGANIZATION_ID,
				patientId: FILLED_PATIENT_ID,
				visitId: FILLED_VISIT_ID,
				kind: "periapical",
				title: "Прицельный снимок 36",
				capturedAt: new Date(),
				sourceKind: "manual_upload",
				sourceName: "Сторож подписания",
				status: "needs_review",
			});
		});
	});

	after(async () => {
		await purgeFixtureOrganizations([ORGANIZATION_ID]);
		const leftovers = await withFixtureTenant(ORGANIZATION_ID, async () =>
			firstRow<{ n: number }>(
				sql`select count(*)::int as n from patients where full_name like ${`${PATIENT_MARK}%`}`,
			),
		);
		assert.equal(leftovers?.n, 0, "сторож не убрал за собой свои строки");
		await pool.end();
	});

	it("отдаёт ПОЛНЫЙ ответ контракта: приём, карточку закрытия и квитанцию", async () => {
		const result = await withFixtureTenant(ORGANIZATION_ID, async () =>
			acceptVisitDraftInDb(ORGANIZATION_ID, draftInput(FILLED_VISIT_ID, true)),
		);

		const parsed = acceptVisitDraftResponseSchema.safeParse(result);
		assert.ok(
			parsed.success,
			"результат слоя доступа не сходится с acceptVisitDraftResponseSchema — " +
				"маршрут ответит 500 на УЖЕ подписанный приём: " +
				JSON.stringify(parsed.success ? [] : parsed.error.issues.slice(0, 6)),
		);

		assert.equal(result.visit.id, FILLED_VISIT_ID);
		assert.equal(result.visit.status, "signed");
		assert.equal(
			result.visit.revision,
			2,
			"ревизия приёма обязана вырасти на подписании",
		);
		assert.equal(result.visit.diagnosis, "K02.1 Кариес дентина");
		assert.equal(result.visit.doctorSummary, "Лечение кариеса 36 выполнено");

		// Подпись действительно в базе, а не только в ответе.
		const stored = await firstRow<{
			status: string;
			revision: number;
			diagnosis: string | null;
		}>(
			sql`select status::text as status, revision, diagnosis from visits where id = ${FILLED_VISIT_ID}`,
		);
		assert.equal(stored?.status, "signed");
		assert.equal(stored?.revision, 2);
		assert.equal(stored?.diagnosis, "K02.1 Кариес дентина");

		// Квитанция — из фактически сохранённой строки, а не выдуманная.
		assert.equal(result.saveReceipt.visitId, FILLED_VISIT_ID);
		assert.equal(result.saveReceipt.status, "accepted");
		assert.equal(result.saveReceipt.serverRevision, result.visit.revision);
		assert.equal(result.saveReceipt.savedAt, result.visit.updatedAt);
		assert.equal(result.saveReceipt.warning, null);
	});

	it("квитанция называет конфликт ревизий, а не молчит о нём", async () => {
		const input = draftInput(EMPTY_VISIT_ID, false);
		const result = await withFixtureTenant(ORGANIZATION_ID, async () =>
			acceptVisitDraftInDb(ORGANIZATION_ID, {
				...input,
				// Клиент правил приём с ревизии 0, на сервере уже была 1.
				baseRevision: 0,
				clientMutationId: "storozh-konflikt",
			}),
		);

		assert.ok(acceptVisitDraftResponseSchema.safeParse(result).success);
		assert.equal(result.saveReceipt.status, "conflict_accepted");
		assert.equal(result.saveReceipt.clientMutationId, "storozh-konflikt");
		assert.ok(
			result.saveReceipt.warning &&
				result.saveReceipt.warning.includes("ревизия 1"),
			"конфликт ревизий обязан быть назван в квитанции",
		);
	});

	it("карточка закрытия относится к ЭТОМУ приёму: два приёма — две разные карточки", async () => {
		// Приёмы подписаны предыдущими проверками; порядок в файле — часть сценария.
		const filled = await firstRow<{ status: string }>(
			sql`select status::text as status from visits where id = ${FILLED_VISIT_ID}`,
		);
		const empty = await firstRow<{ status: string }>(
			sql`select status::text as status from visits where id = ${EMPTY_VISIT_ID}`,
		);
		assert.equal(filled?.status, "signed");
		assert.equal(empty?.status, "signed");

		// Карточки собираются тем же расчётом, что и в маршруте, но для приёмов,
		// которые уже подписаны, — поэтому берём их из ответов повторно, подписав
		// два новых черновика тех же пациентов.
		const secondFilledVisit = await firstRow<IdRow>(
			sql`insert into visits (organization_id, patient_id, status, revision)
			     values (${ORGANIZATION_ID}, ${FILLED_PATIENT_ID}, 'draft', 1)
			     returning id::text as id`,
		);
		const secondEmptyVisit = await firstRow<IdRow>(
			sql`insert into visits (organization_id, patient_id, status, revision)
			     values (${ORGANIZATION_ID}, ${EMPTY_PATIENT_ID}, 'draft', 1)
			     returning id::text as id`,
		);
		assert.ok(
			secondFilledVisit && secondEmptyVisit,
			"приёмы для сравнения карточек не созданы",
		);

		// Снимок, ждущий проверки, переносим на новый приём того же пациента.
		await db.execute(
			sql`update imaging_studies set visit_id = ${secondFilledVisit.id} where id = ${IMAGING_STUDY_ID}`,
		);

		try {
			const withImaging = await withFixtureTenant(ORGANIZATION_ID, async () =>
				acceptVisitDraftInDb(
					ORGANIZATION_ID,
					draftInput(secondFilledVisit.id, true),
				),
			);
			const withoutImaging = await withFixtureTenant(
				ORGANIZATION_ID,
				async () =>
					acceptVisitDraftInDb(
						ORGANIZATION_ID,
						draftInput(secondEmptyVisit.id, false),
					),
			);

			const cardWithImaging = withImaging.visitCloseChecklist;
			const cardWithoutImaging = withoutImaging.visitCloseChecklist;

			assert.equal(cardWithImaging.visitId, secondFilledVisit.id);
			assert.equal(cardWithoutImaging.visitId, secondEmptyVisit.id);
			for (const item of cardWithImaging.items) {
				assert.equal(
					item.visitId,
					secondFilledVisit.id,
					`пункт «${item.id}» указывает на чужой приём`,
				);
			}
			for (const item of cardWithoutImaging.items) {
				assert.equal(
					item.visitId,
					secondEmptyVisit.id,
					`пункт «${item.id}» указывает на чужой приём`,
				);
			}

			// Содержательная разница, а не только идентификаторы.
			const imagingHere = itemOf(cardWithImaging, "imaging-review");
			const imagingThere = itemOf(cardWithoutImaging, "imaging-review");
			assert.equal(imagingHere.ready, false);
			assert.equal(imagingHere.blocking, true);
			assert.equal(imagingThere.ready, true);
			assert.equal(imagingThere.detail, "К приему не прикреплены снимки.");
			assert.notEqual(imagingHere.detail, imagingThere.detail);

			const noteHere = itemOf(cardWithImaging, "visit-note");
			const noteThere = itemOf(cardWithoutImaging, "visit-note");
			assert.equal(
				noteHere.ready,
				true,
				"заполненная ЭМК обязана считаться готовой",
			);
			assert.equal(
				noteThere.ready,
				false,
				"ЭМК без диагноза и плана готовой быть не может",
			);

			// Следующее действие тоже разное: у одного приёма это снимки, у другого — запись.
			assert.equal(cardWithImaging.nextAction, "Открыть снимки");
			assert.equal(cardWithoutImaging.nextAction, "Проверить запись");
			assert.notEqual(
				JSON.stringify(cardWithImaging),
				JSON.stringify(cardWithoutImaging),
				"две карточки совпали целиком — значит они собраны по общему состоянию, а не по приёму",
			);
		} finally {
			await db.execute(
				sql`update imaging_studies set visit_id = ${FILLED_VISIT_ID} where id = ${IMAGING_STUDY_ID}`,
			);
			await db.execute(
				sql`delete from visits where id = ${secondFilledVisit.id}`,
			);
			await db.execute(
				sql`delete from visits where id = ${secondEmptyVisit.id}`,
			);
		}
	});

	it("на закрытый приём отвечает доменным отказом, а не подписывает второй раз", async () => {
		await assert.rejects(
			() =>
				withFixtureTenant(ORGANIZATION_ID, async () =>
					acceptVisitDraftInDb(
						ORGANIZATION_ID,
						draftInput(FILLED_VISIT_ID, true),
					),
				),
			/Прием уже закрыт или аннулирован/,
		);
	});
});
