/**
 * treatmentPlanEstimatorPaperSignature.test.tsx — Тестирование сметы у кресла (TreatmentEstimator)
 * и быстрого подтверждения на бумаге без блокировок (Mandates 8e, 8k, 8n).
 */

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { describe, it } from "node:test";
import { renderToString } from "react-dom/server";
import { AppLogicProvider } from "../../../contexts/AppLogicContext";
import { TreatmentEstimator } from "../../odontogram/TreatmentEstimator";
import { clickNode, findNodeByTestId, type MockDomNode, setupMockDom } from "./helpers/mockDomHelper";
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

	it("opens sign modal in TreatmentEstimator and verifies paper confirm & print buttons with zero canvas", async () => {
		const { doc, win } = setupMockDom();
		let root: Root | null = null;
		const mockAppContext = {
			dashboard: {
				patients: [{ id: "PAT-001", fullName: "Кузнецов П.Р." }],
				serviceCatalog: [],
			},
		};

		const container = doc.createElement("div");
		doc.body.appendChild(container);

		await act(async () => {
			root = createRoot(container as unknown as HTMLElement);
			root.render(
				<AppLogicProvider value={mockAppContext as any}>
					<TreatmentEstimator patientId="PAT-001" currentTeeth={[]} />
				</AppLogicProvider>,
			);
		});

		const openSignBtn = findNodeByTestId(doc.body, "estimator-open-sign-modal-btn");
		expect(openSignBtn).not.toBeNull();
		await clickNode(openSignBtn!);

		const paperConfirmBtn = findNodeByTestId(doc.body, "estimator-modal-paper-confirm-btn");
		expect(paperConfirmBtn).not.toBeNull();

		const printBtn = findNodeByTestId(doc.body, "estimator-modal-print-btn");
		expect(printBtn).not.toBeNull();

		const hasCanvasElement = (node: MockDomNode): boolean => {
			if (node.tagName === "CANVAS") return true;
			return node.children?.some(hasCanvasElement) ?? false;
		};
		expect(hasCanvasElement(doc.body)).toBe(false);

		await clickNode(printBtn!);
		expect(win.print).toHaveBeenCalled();

		await clickNode(paperConfirmBtn!);
		const closedModalBtn = findNodeByTestId(doc.body, "estimator-modal-paper-confirm-btn");
		expect(closedModalBtn).toBeNull();

		await act(async () => { root?.unmount(); });
	});
});
