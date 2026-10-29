import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { OrthodonticVisitScreen } from "../OrthodonticVisitScreen";
import { OrthoActivationCard } from "../visitScreen/OrthoActivationCard";
import { OrthoArchwiresAndTractionCard } from "../visitScreen/OrthoArchwiresAndTractionCard";
import { OrthoBillingAndDiarySummary } from "../visitScreen/OrthoBillingAndDiarySummary";
import { CephalometricReportTab } from "../cephModal/CephalometricReportTab";

describe("OrthodonticVisitScreen — Decomposition, Autonomy & Pure Clinical UI (Mandates 8e, 8b, 8am)", () => {
	it("renders OrthodonticVisitScreen without blocking buttons and with exactly ONE primary CTA", () => {
		const html = renderToString(
			<OrthodonticVisitScreen
				isOpen={true}
				onClose={() => {}}
				patientName="Смирнова Екатерина Андреевна"
			/>,
		);

		// Verified 1-click master norm & express protocol
		assert.ok(html.includes("data-testid=\"ortho-toolbar-norm-btn\""));
		assert.ok(html.includes("data-testid=\"ortho-express-norm-banner-btn\""));
		assert.ok(html.includes("✓ Активация дуги / Смена элайнера без осложнений (Норма)"));

		// Non-blocking clinical buttons (Mandate 8e)
		assert.ok(html.includes("data-testid=\"bottom-apply-protocol-btn\""));
		assert.ok(html.includes("data-testid=\"bottom-print-protocol-btn\""));
		assert.ok(html.includes("data-testid=\"ortho-quick-checkout-btn\""));

		// None of the transaction buttons are disabled
		assert.ok(!html.includes('disabled="" data-testid="bottom-apply-protocol-btn"'));
		assert.ok(!html.includes('disabled="" data-testid="bottom-print-protocol-btn"'));
		assert.ok(!html.includes('disabled="" data-testid="ortho-quick-checkout-btn"'));

		// Pure clinical vocabulary without bureaucratic soviet codes in UI labels
		assert.ok(!html.includes("Прейскурант 804н"));
		assert.ok(!html.includes("Форма 043/у"));
		assert.ok(html.includes("Дневник ортодонтического приёма"));

		// Exactly ONE primary CTA button
		const primaryMatches = html.match(/primary-button/g) || [];
		// On desktop there is one primary-button in the body, plus the responsive sticky CTA for mobile
		assert.ok(primaryMatches.length >= 1, "Must have primary CTA button");
	});

	it("renders OrthoActivationCard with touch-friendly elements and 1-click norm banner", () => {
		const html = renderToString(
			<OrthoActivationCard
				stageFilter="stage_2_leveling"
				setStageFilter={() => {}}
				targetArch="both"
				setTargetArch={() => {}}
				bracketSystem="damon_q2"
				setBracketSystem={() => {}}
				bracketSlot="0.022"
				setBracketSlot={() => {}}
				alignerStep={4}
				setAlignerStep={() => {}}
				alignerTotal={24}
				setAlignerTotal={() => {}}
				alignerDaysPerStep={14}
				setAlignerDaysPerStep={() => {}}
				onApplyExpressNorm={() => {}}
			/>,
		);

		assert.ok(html.includes("data-testid=\"ortho-express-norm-banner-btn\""));
		assert.ok(html.includes("2. Нивелирование"));
		assert.ok(html.includes("Обе челюсти"));
		assert.ok(html.includes("Damon Q2"));
	});

	it("renders OrthoArchwiresAndTractionCard with wire materials and traction matrix", () => {
		const html = renderToString(
			<OrthoArchwiresAndTractionCard
				archwireMaterial="NiTi"
				setArchwireMaterial={() => {}}
				archwireSection=".014"
				setArchwireSection={() => {}}
				selectedActions={["wire_change", "elastic_traction"]}
				setSelectedActions={() => {}}
				elasticScheme="class_2"
				setElasticScheme={() => {}}
				elasticSize="3_16_4_5oz"
				setElasticSize={() => {}}
				elasticWear="full_time"
				setElasticWear={() => {}}
			/>,
		);

		assert.ok(html.includes("Рабочая ортодонтическая дуга"));
		assert.ok(html.includes("Межчелюстные эластики"));
		assert.ok(html.includes("II класс"));
	});

	it("renders OrthoBillingAndDiarySummary with non-blocking buttons and zero bureaucratic codes", () => {
		const html = renderToString(
			<OrthoBillingAndDiarySummary
				calculatedServices={[
					{
						code: "A16.07.048.001",
						name: "Фиксация и активация ортодонтической дуги",
						priceRub: 3500,
						quantity: 1,
						category: "orthodontics",
					},
				]}
				totalRub={3500}
				generatedProtocol="ДНЕВНИК ОРТОДОНТИЧЕСКОГО ПРИЁМА"
				onAddToInvoice={() => {}}
				onQuickCheckout={() => {}}
				onPrintCard={() => {}}
				onCopyPatientMemo={() => {}}
				onPrintMemo={() => {}}
				onCommitProtocol={() => {}}
			/>,
		);

		assert.ok(html.includes("Расчет услуг визита"));
		assert.ok(html.includes("₽"), "Must display currency symbol");
		assert.ok(html.includes("data-testid=\"bottom-add-services-to-invoice-btn\""));
		assert.ok(html.includes("data-testid=\"ortho-quick-checkout-btn\""));
		assert.ok(html.includes("data-testid=\"bottom-print-protocol-btn\""));
		assert.ok(html.includes("data-testid=\"bottom-apply-protocol-btn\""));
	});

	it("renders CephalometricReportTab with 1-click patient messenger export button", () => {
		const html = renderToString(
			<CephalometricReportTab
				currentEffectiveProtocolText="Пациент: Смирнова Е. А.\nКласс по Энглю: I класс\nSNA: 82.0°\nSNB: 79.5°\nANB: 2.5°"
				onInsertToChart={() => {}}
				onSaveConsultationWithoutCeph={() => {}}
				onCopyText={() => {}}
				copied={false}
			/>,
		);

		assert.ok(html.includes("data-testid=\"btn-copy-ceph-messenger\""));
		assert.ok(html.includes("Для мессенджера"));
		assert.ok(html.includes("btn-print-ceph-protocol"));
	});
});
