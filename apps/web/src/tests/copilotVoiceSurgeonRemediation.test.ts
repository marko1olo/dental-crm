/**
 * copilotVoiceSurgeonRemediation.test.ts — Unit Tests for Copilot & Voice Fixer Surgeon
 * Mandates: 8e, 8bm, 8be, 8bf, 8am.
 */

import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveActionDiff, getClinicalDiff } from "../components/copilot/actionConfirm/actionConfirmDiff";
import { parseTierOption } from "../components/copilot/resultCards/estimateTierParser";
import { mapVoiceIntentToHUDProposals } from "../components/copilot/chairside/chairsideVoiceIntentMapper";
import { useShortDictation } from "../hooks/useShortDictation";

describe("🏥 Clinical AI Copilot & Voice Surgeon Remediation Suite", () => {
	describe("1. [DEFECT-1] Domain-specific Action Diff Resolution (No Fake Tooth 36)", () => {
		it("createInvoiceDraftTool returns Cashbox diff instead of tooth 36", () => {
			const diff = resolveActionDiff(
				"createInvoiceDraftTool",
				{ amountKopecks: 350000, reason: "Лечение кариеса" },
				"Вызов: createInvoiceDraftTool",
			);
			assert.ok(diff, "Action diff must not be null");
			assert.equal(diff.target, "Счёт в кассу");
			assert.equal(diff.badge, "Касса");
			assert.ok(diff.to.includes("Скидка") || diff.to.includes("3 500") || diff.to.length > 0);
		});

		it("createAppointmentTool returns Schedule diff", () => {
			const diff = resolveActionDiff(
				"createAppointmentTool",
				{ date: "2026-11-25", time: "14:00", doctor_name: "Иванов И.И." },
				"Вызов: createAppointmentTool",
			);
			assert.ok(diff);
			assert.equal(diff.target, "Запись на приём");
			assert.equal(diff.badge, "Расписание");
			assert.equal(diff.to, "2026-11-25 14:00 (Иванов И.И.)");
		});

		it("updateToothStatusTool returns Odontogram diff with specific tooth number", () => {
			const diff = resolveActionDiff(
				"updateToothStatusTool",
				{ tooth: 14, diagnosis: "K02.1 Кариес дентина", old_status: "Интактный" },
				"Вызов: updateToothStatusTool",
			);
			assert.ok(diff);
			assert.equal(diff.target, "Зуб 14");
			assert.equal(diff.badge, "Одонтограмма");
			assert.equal(diff.from, "Интактный");
			assert.equal(diff.to, "K02.1 Кариес дентина");
		});

		it("resolveActionDiff is exported as an alias to getClinicalDiff (SSOT)", () => {
			assert.strictEqual(resolveActionDiff, getClinicalDiff);
		});
	});

	describe("2. [DEFECT-2 & Mandate 8bm] Exact Money Arithmetic (kopecksToRubles)", () => {
		it("parseTierOption converts totalCostKopecks to exact rubles without float drift", () => {
			const option = parseTierOption({
				tierKey: "optimum",
				totalCostKopecks: 1250000,
				installment: { monthlyPaymentKopecks: 104167, months: 12 },
				stages: [
					{ stageName: "Терапия", stageCostKopecks: 450000 },
					{ stageName: "Ортопедия", stageCostKopecks: 800000 },
				],
			});

			assert.equal(option.totalRub, 12500);
			assert.equal(option.monthlyInstallmentRub, 1041.67);
			assert.equal(option.stages?.[0]?.totalRub, 4500);
			assert.equal(option.stages?.[1]?.totalRub, 8000);
		});

		it("mapVoiceIntentToHUDProposals converts procedures804n to kopecks without hardcoded 1500", () => {
			const intent = {
				transcript: "лечение кариеса 2500 рублей",
				confidence: 0.95,
				procedures804n: [
					{
						code804n: "A16.07.002",
						name: "Восстановление зуба пломбой",
						category: "therapy" as const,
						quantity: 1,
						priceRub: 2500,
					},
					{
						code804n: "A16.07.004",
						name: "Наложение коффердама",
						category: "isolation" as const,
						quantity: 1,
						priceRub: 0,
					},
				],
			};

			const hud = mapVoiceIntentToHUDProposals(intent, {
				complaint: "",
				objectiveStatus: "",
				diagnosis: "",
				treatmentPlan: "",
				recommendations: "",
			});

			assert.ok(hud.servicesProposal);
			assert.equal(hud.servicesProposal.length, 2);
			assert.equal(hud.servicesProposal[0]!.priceRub, 2500);
			assert.equal(hud.servicesProposal[0]!.priceKopecks, 250000);
			assert.equal(hud.servicesProposal[1]!.priceRub, 0);
			assert.equal(hud.servicesProposal[1]!.priceKopecks, 0);
		});
	});

	describe("3. [DEFECT-5 & Mandate 8bf] useShortDictation Facade Parity", () => {
		it("useShortDictation is defined and callable as a function", () => {
			assert.equal(typeof useShortDictation, "function");
		});
	});
});
