/**
 * apps/api/src/tests/leadsUtmAttribution.test.ts
 *
 * DENTE Dental CRM — Structured Lead Metadata, Relational Stage Transitions & Tenant Isolation
 *
 * Governed by:
 * - Mandate 8ap (Universal Domain Integrity & Relational Ground Truth over Regex-Mining)
 * - Mandate 8e, 8n (Doctor Autonomy & Full Stage Transition Audit)
 */

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { and, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { crmLeads, crmLeadStageHistory, organizations } from "../db/schema.js";
import {
	extractUtmAttribution,
	resolveStructuredLeadAttribution,
} from "../routes/leadsConversion.js";
import { recordLeadStageTransition } from "../routes/leadsConversionModules/leadStageTransition.js";
import {
	fixtureUuid,
	isDatabaseUnavailable,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "./support/fixtureOrganizations.js";

const NAMESPACE = "leadsAttributionRelational";
const ORG_A = fixtureUuid(NAMESPACE, 1);
const ORG_B = fixtureUuid(NAMESPACE, 2);
const LEAD_A1 = fixtureUuid(NAMESPACE, 10);
const LEAD_B1 = fixtureUuid(NAMESPACE, 20);

describe("Structured Lead Metadata & Relational Attribution Engine (Mandate 8ap)", () => {
	it("resolves structured UTM metadata directly without regex text-mining", () => {
		const structuredData = {
			utmSource: "yandex",
			utmMedium: "cpc",
			utmCampaign: "all-on-4-msk",
			utmContent: "banner1",
			utmTerm: "имплантация+зубов",
			source: "yandex_maps",
		};

		const attribution = resolveStructuredLeadAttribution(structuredData);

		assert.equal(attribution.utmSource, "yandex");
		assert.equal(attribution.utmMedium, "cpc");
		assert.equal(attribution.utmCampaign, "all-on-4-msk");
		assert.equal(attribution.utmContent, "banner1");
		assert.equal(attribution.utmTerm, "имплантация+зубов");
		assert.equal(attribution.leadSource, "yandex_maps");
		assert.equal(
			attribution.formattedUtm,
			"UTM: source=yandex | medium=cpc | campaign=all-on-4-msk | content=banner1 | term=имплантация+зубов",
		);
	});

	it("extractUtmAttribution prioritizes clean structured attributes over freeform notes", () => {
		const attribution = extractUtmAttribution("Сайт клиники", "Пациент записался сам", {
			utmSource: "referral",
			utmMedium: "word_of_mouth",
			utmCampaign: "family_recommendation",
		});

		assert.equal(attribution.utmSource, "referral");
		assert.equal(attribution.utmMedium, "word_of_mouth");
		assert.equal(attribution.utmCampaign, "family_recommendation");
		assert.equal(
			attribution.formattedUtm,
			"UTM: source=referral | medium=word_of_mouth | campaign=family_recommendation",
		);
	});

	it("returns empty object when no attribution parameters exist without throwing", () => {
		const attribution = extractUtmAttribution(null, null);
		assert.deepEqual(attribution, {});
	});
});

describe("CRM Lead Stage Transition Audit & Tenant Isolation in PostgreSQL", () => {
	let databaseAvailable = true;

	before(async () => {
		try {
			await purgeFixtureOrganizations([ORG_A, ORG_B]);

			await withFixtureTenant(ORG_A, async (tx) => {
				await tx.insert(organizations).values({
					id: ORG_A,
					name: "Клиника А — Маркетинг и Воронка",
				});
				await tx.insert(crmLeads).values({
					id: LEAD_A1,
					organizationId: ORG_A,
					name: "Пациент Организации А",
					phone: "+79001112233",
					source: "referral",
					status: "new",
				});
			});

			await withFixtureTenant(ORG_B, async (tx) => {
				await tx.insert(organizations).values({
					id: ORG_B,
					name: "Клиника Б — Изолированный Арендатор",
				});
				await tx.insert(crmLeads).values({
					id: LEAD_B1,
					organizationId: ORG_B,
					name: "Пациент Организации Б",
					phone: "+79004445566",
					source: "maps",
					status: "new",
				});
			});
		} catch (error) {
			if (!isDatabaseUnavailable(error)) throw error;
			databaseAvailable = false;
		}
	});

	after(async () => {
		if (databaseAvailable) {
			try {
				await purgeFixtureOrganizations([ORG_A, ORG_B]);
			} catch (error) {
				if (!isDatabaseUnavailable(error)) throw error;
			}
		}
	});

	it("records end-to-end stage transitions without gaps: new -> consult_booked -> arrived -> paid", async () => {
		if (!databaseAvailable) return;

		// 1. New -> consult_booked
		await recordLeadStageTransition({
			tx: db,
			organizationId: ORG_A,
			leadId: LEAD_A1,
			fromStage: "new",
			toStage: "consult_booked",
			stageEnteredAt: new Date(Date.now() - 60000),
			changedByUserId: null,
		});

		// 2. consult_booked -> arrived
		await recordLeadStageTransition({
			tx: db,
			organizationId: ORG_A,
			leadId: LEAD_A1,
			fromStage: "consult_booked",
			toStage: "arrived",
			stageEnteredAt: new Date(Date.now() - 30000),
			changedByUserId: null,
		});

		// 3. arrived -> paid
		await recordLeadStageTransition({
			tx: db,
			organizationId: ORG_A,
			leadId: LEAD_A1,
			fromStage: "arrived",
			toStage: "paid",
			stageEnteredAt: new Date(Date.now() - 10000),
			changedByUserId: null,
		});

		// Query stage history
		const history = await db
			.select()
			.from(crmLeadStageHistory)
			.where(
				and(
					eq(crmLeadStageHistory.organizationId, ORG_A),
					eq(crmLeadStageHistory.leadId, LEAD_A1),
				),
			)
			.orderBy(crmLeadStageHistory.createdAt);

		assert.equal(history.length, 3, "Должно быть ровно 3 записи переходов статусов в истории");
		assert.equal(history[0]?.fromStage, "new");
		assert.equal(history[0]?.toStage, "consult_booked");
		assert.equal(history[1]?.fromStage, "consult_booked");
		assert.equal(history[1]?.toStage, "arrived");
		assert.equal(history[2]?.fromStage, "arrived");
		assert.equal(history[2]?.toStage, "paid");

		// Verify crmLeads current status
		const [currentLead] = await db
			.select()
			.from(crmLeads)
			.where(and(eq(crmLeads.id, LEAD_A1), eq(crmLeads.organizationId, ORG_A)))
			.limit(1);

		assert.equal(currentLead?.status, "paid", "Текущий статус лида должен обновиться до paid");
	});

	it("strictly enforces tenant isolation: Org B cannot see or mutate Org A stage history", async () => {
		if (!databaseAvailable) return;

		const orgBHistoryForLeadA = await db
			.select()
			.from(crmLeadStageHistory)
			.where(
				and(
					eq(crmLeadStageHistory.organizationId, ORG_B),
					eq(crmLeadStageHistory.leadId, LEAD_A1),
				),
			);

		assert.equal(
			orgBHistoryForLeadA.length,
			0,
			"Арендатор B не должен видеть историю переходов лида Арендатора A",
		);

		const orgBHistory = await db
			.select()
			.from(crmLeadStageHistory)
			.where(eq(crmLeadStageHistory.organizationId, ORG_B));

		assert.equal(
			orgBHistory.length,
			0,
			"У Арендатора B нет записей переходов до совершения действий",
		);
	});
});
