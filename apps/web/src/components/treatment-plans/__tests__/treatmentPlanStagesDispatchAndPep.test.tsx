import React from "react";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { renderToString } from "react-dom/server";
import { TreatmentPlanPresenterStagesTab } from "../TreatmentPlanPresenterStagesTab";
import { TreatmentPlanSignatureModal } from "../TreatmentPlanSignatureModal";
import { RoadmapStageCard } from "../roadmap/RoadmapStageCard";
import type { TreatmentPlanTier, TreatmentPlanStage } from "../types";
import type { RoadmapStageData } from "../roadmap/types";

describe("Treatment Plan Stages Transfer & PEP Signature (Mandates 8e, 8k, 8n)", () => {
	const sampleStage: TreatmentPlanStage = {
		id: "stage-1",
		stageNumber: 1,
		title: "Профессиональная гигиена и санация полости рта",
		clinicalGoal: "Устранение наддесневых и поддесневых зубных отложений",
		estimatedWeeks: 1,
		estimatedVisits: 1,
		totalRub: 6500,
		items: [
			{
				id: "item-1",
				code804n: "A16.07.051",
				name: "Профессиональная гигиена полости рта и ультразвуковое удаление зубных отложений",
				toothNumber: undefined,
				quantity: 1,
				unitPriceRub: 6500,
				priceRub: 6500,
			},
		],
	};

	const sampleTier: TreatmentPlanTier = {
		tierId: "standard",
		title: "Комплексный стандартный план",
		subtitle: "Оптимальный протокол",
		badge: "Стандарт",
		badgeClass: "badge-teal",
		borderClass: "border-teal",
		isRecommended: true,
		totalRub: 6500,
		totalKopecks: 650000 as any,
		durationWeeks: 1,
		durationVisits: 1,
		warrantyYears: 2,
		materialsHeadline: "Премиальные материалы",
		materialsList: ["EMS AirFlow Prophylaxis"],
		keyAdvantages: ["Безболезненно", "Эффективно"],
		stages: [sampleStage],
		itemsCount: 1,
		ndflRefundRub: 845,
		priceWithNdflRefundRub: 5655,
		monthlyInstallment12Rub: 541,
		installments: {} as any,
		ndflDetails: {} as any,
	};

	const sampleRoadmapStage: RoadmapStageData = {
		stageNumber: 1,
		stageKind: "therapy",
		titleRu: "Терапевтический этап",
		subtitleRu: "Лечение кариеса",
		patientGoalRu: "Остановить разрушение эмали",
		status: "planned",
		procedures: [
			{
				id: "proc-1",
				code804n: "A16.07.002",
				titleRu: "Пломбирование зуба",
				priceRub: 4500,
				isCompleted: false,
			},
		],
	};

	it("renders 1-click stage transfer buttons to visit and invoice in TreatmentPlanPresenterStagesTab", () => {
		const html = renderToString(
			<TreatmentPlanPresenterStagesTab
				selectedTier={sampleTier}
				selectedTierId="standard"
				allTiers={[sampleTier]}
				onSelectTier={() => {}}
				showMicroConsumables={false}
				onUpdateItemPrice={() => {}}
			/>,
		);

		assert.ok(html.includes('data-testid="stage-send-to-visit-btn-1"'), "Must contain send to visit button");
		assert.ok(html.includes("В приём"), "Must have text 'В приём'");
		assert.ok(html.includes('data-testid="stage-send-to-invoice-btn-1"'), "Must contain send to invoice button");
		assert.ok(html.includes("В счёт"), "Must have text 'В счёт'");
	});

	it("renders 1-click stage transfer buttons to visit and invoice in RoadmapStageCard", () => {
		const html = renderToString(
			<RoadmapStageCard
				stage={sampleRoadmapStage}
				isExpanded={true}
				onToggle={() => {}}
				effectivePatientName="Петров Иван Васильевич"
			/>,
		);

		assert.ok(html.includes('data-testid="roadmap-send-to-visit-1"'), "Must contain roadmap send to visit button");
		assert.ok(html.includes('data-testid="roadmap-send-to-invoice-1"'), "Must contain roadmap send to invoice button");
	});

	it("renders 3 signing methods (SMS PEP 63-FZ, QR code, Paper) in TreatmentPlanSignatureModal", () => {
		const html = renderToString(
			<TreatmentPlanSignatureModal
				isOpen={true}
				tier={sampleTier}
				patientName="Петров Иван Васильевич"
				patientId="PAT-2026-0042"
				initialSignMethod="sms"
				onClose={() => {}}
				onSignedSuccess={() => {}}
			/>,
		);

		assert.ok(html.includes('data-testid="signature-method-sms"'), "Must contain SMS PEP tab");
		assert.ok(html.includes('data-testid="signature-method-qr"'), "Must contain QR tab");
		assert.ok(html.includes('data-testid="signature-method-paper"'), "Must contain Paper tab");
		assert.ok(html.includes('data-testid="request-sms-btn"'), "Must contain request SMS button");
		assert.ok(html.includes("Простая электронная подпись (ПЭП) по СМС"), "Must have PEP title");
	});

	it("renders dynamic QR code and instructions when initialSignMethod is qr", () => {
		const html = renderToString(
			<TreatmentPlanSignatureModal
				isOpen={true}
				tier={sampleTier}
				patientName="Петров Иван Васильевич"
				patientId="PAT-2026-0042"
				initialSignMethod="qr"
				onClose={() => {}}
				onSignedSuccess={() => {}}
			/>,
		);

		assert.ok(html.includes('data-testid="qr-code-svg-container"'), "Must contain QR SVG container");
		assert.ok(html.includes("<svg"), "Must render actual SVG QR code");
		assert.ok(html.includes("Сканирование QR-кода пациентом"), "Must have QR instructions");
	});
});
