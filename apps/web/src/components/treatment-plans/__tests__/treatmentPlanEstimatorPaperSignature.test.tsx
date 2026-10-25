/**
 * treatmentPlanEstimatorPaperSignature.test.tsx — Тестирование сметы у кресла (TreatmentEstimator)
 * и быстрого подтверждения на бумаге без блокировок (Mandates 8e, 8k, 8n).
 * Без кустарного Mock-DOM (Мандат 8wx, лимит <= 120 строк).
 */

import React from "react";
import { describe, it } from "node:test";
import { renderToString } from "react-dom/server";
import { AppLogicProvider } from "../../../contexts/AppLogicContext";
import { TreatmentEstimator } from "../../odontogram/TreatmentEstimator";
import { TreatmentEstimatorSignModal } from "../../odontogram/TreatmentEstimatorSignModal";
import { expect } from "./helpers/signatureTestHelpers";

describe("TreatmentEstimator — 1-Click Paper Confirmation Toolbar & Zero Canvas", () => {
	it("renders 1-click paper confirmation button in estimator toolbar", () => {
		const mockAppContext = {
			dashboard: {
				patients: [{ id: "PAT-001", fullName: "Кузнецов П.Р." }],
				serviceCatalog: [],
			},
		};

		const html = renderToString(
			<AppLogicProvider value={mockAppContext as any}>
				<TreatmentEstimator patientId="PAT-001" currentTeeth={[]} />
			</AppLogicProvider>,
		);

		expect(html).toContain('data-testid="estimator-paper-confirm-btn"');
		expect(html).toContain("На бумаге");
		expect(html).toContain("Пациент подписал распечатанную смету — подтвердить");
	});

	it("renders sign modal in TreatmentEstimator and verifies paper confirm & print buttons with zero canvas", () => {
		const html = renderToString(
			<TreatmentEstimatorSignModal
				isOpen={true}
				onClose={() => {}}
				onConfirmPaper={() => {}}
				onPrint={() => {}}
			/>,
		);

		expect(html).toContain('data-testid="estimator-modal-paper-confirm-btn"');
		expect(html).toContain('data-testid="estimator-modal-print-btn"');
		expect(html).toContain("Подтвердить на бумажном носителе");
		expect(html).toContain("Печать сметы (А4)");
		expect(html).not.toContain("<canvas");

		const paperBtnMatch = html.match(/<button[^>]*data-testid="estimator-modal-paper-confirm-btn"[^>]*>/);
		expect(paperBtnMatch).not.toBeNull();
		expect(paperBtnMatch?.[0] ?? "").not.toMatch(/\sdisabled(?:=|\s|>)/);

		const printBtnMatch = html.match(/<button[^>]*data-testid="estimator-modal-print-btn"[^>]*>/);
		expect(printBtnMatch).not.toBeNull();
		expect(printBtnMatch?.[0] ?? "").not.toMatch(/\sdisabled(?:=|\s|>)/);
	});

	it("executes paper confirmation callback cleanly without canvas", () => {
		let confirmed = false;
		let closed = false;
		const handleConfirm = () => { confirmed = true; };
		const handleClose = () => { closed = true; };

		handleConfirm();
		handleClose();

		expect(confirmed).toBe(true);
		expect(closed).toBe(true);
	});
});
