/**
 * patientTreatmentPlanDrawer.test.tsx
 *
 * Инструментальные тесты интеграции конструктора планов лечения в карточку пациента:
 * 1. Ликвидация бага с редиректом в #documents при открытии плана из PatientWorkspaceView
 * 2. Монтирование PatientTreatmentPlanDrawerModal при isOpen=true
 * 3. Наличие кнопки «Конструктор планов» в табе планов лечения
 * 4. Apple HIG эргономика: закрытие по Esc, кнопка закрытия 44x44px, blur backdrop
 * 5. Чистый человеческий язык без птичьих шифров и лозунгов
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToString } from "react-dom/server";
import { PatientTreatmentPlanDrawerModal } from "../workspace/PatientTreatmentPlanDrawerModal";
import { PatientWorkspaceView } from "../PatientWorkspaceView";
import { AppLogicProvider } from "../../../contexts/AppLogicContext";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const mockAppContext = {
	dashboard: {
		patients: [
			{
				id: "pat-100",
				fullName: "Иванова Мария Сергеевна",
			},
		],
		treatmentPlanItems: [
			{
				id: "plan-item-1",
				planId: "plan-root-999",
				patientId: "pat-100",
				snapshotServiceName: "Профессиональная гигиена полости рта",
				unitPriceRub: 5500,
				status: "planned",
				toothCode: null,
			},
		],
		serviceCatalog: [],
		appointments: [],
	},
	setSelectedPatientId: () => {},
} as any;

describe("PatientTreatmentPlanDrawerModal & PatientWorkspaceView Integration", () => {
	const workspaceFilePath = path.resolve(__dirname, "../PatientWorkspaceView.tsx");
	const drawerFilePath = path.resolve(__dirname, "../workspace/PatientTreatmentPlanDrawerModal.tsx");

	it("1. PatientWorkspaceView eliminates #documents redirect bug and uses modal state", () => {
		const workspaceCode = fs.readFileSync(workspaceFilePath, "utf8");

		// Гарантируем, что клик по плану лечения больше не выбрасывает в #documents
		assert.ok(
			!workspaceCode.includes('handleOpenPlanCallback = useCallback(\n\t\t\t\t(planId: string) => {\n\t\t\t\t\tif (onOpenPlan) {\n\t\t\t\t\t\tonOpenPlan(planId);\n\t\t\t\t\t} else {\n\t\t\t\t\t\twindow.location.hash = "#documents";'),
			"Must eliminate window.location.hash = '#documents' in handleOpenPlanCallback",
		);

		assert.ok(
			workspaceCode.includes("setSelectedPlanIdForModal(planId)"),
			"handleOpenPlanCallback must set selectedPlanIdForModal",
		);
		assert.ok(
			workspaceCode.includes("setIsPlanModalOpen(true)"),
			"handleOpenPlanCallback must open plan modal",
		);
		assert.ok(
			workspaceCode.includes("PatientTreatmentPlanDrawerModal"),
			"PatientWorkspaceView must mount PatientTreatmentPlanDrawerModal",
		);
	});

	it("2. PatientWorkspaceView renders 'Конструктор планов' CTA button in plans tab", () => {
		const html = renderToString(
			<AppLogicProvider value={mockAppContext}>
				<PatientWorkspaceView
					patientId="pat-100"
					patientName="Иванова Мария Сергеевна"
					dashboard={mockAppContext.dashboard}
					initialTab="plans"
				/>
			</AppLogicProvider>,
		);

		assert.ok(
			html.includes('data-testid="btn-create-treatment-plan"'),
			"Must render 'btn-create-treatment-plan' CTA button",
		);
		assert.ok(
			html.includes("Конструктор планов"),
			"Must display 'Конструктор планов' button text",
		);
	});

	it("3. PatientTreatmentPlanDrawerModal renders nothing when isOpen=false", () => {
		const html = renderToString(
			<AppLogicProvider value={mockAppContext}>
				<PatientTreatmentPlanDrawerModal
					isOpen={false}
					onClose={() => {}}
					patientId="pat-100"
					activePatient={{ fullName: "Иванова Мария Сергеевна" }}
				/>
			</AppLogicProvider>,
		);

		assert.strictEqual(html, "", "Modal must return null when closed");
	});

	it("4. PatientTreatmentPlanDrawerModal renders full modal shell with patient name and close button when isOpen=true", () => {
		const html = renderToString(
			<AppLogicProvider value={mockAppContext}>
				<PatientTreatmentPlanDrawerModal
					isOpen={true}
					onClose={() => {}}
					patientId="pat-100"
					activePatient={{ fullName: "Иванова Мария Сергеевна" }}
					initialPlanId={null}
				/>
			</AppLogicProvider>,
		);

		assert.ok(
			html.includes('data-testid="patient-treatment-plan-drawer-modal"'),
			"Must render modal dialog container",
		);
		assert.ok(
			html.includes("Конструктор планов лечения"),
			"Must display title 'Конструктор планов лечения'",
		);
		assert.ok(
			html.includes("Иванова Мария Сергеевна"),
			"Must display active patient full name",
		);
		assert.ok(
			html.includes('data-testid="btn-close-plan-modal"'),
			"Must render Apple HIG close button with >=44px touch target",
		);
		assert.ok(
			html.includes('data-testid="treatment-plan-module"'),
			"Must mount TreatmentPlanModule inside modal",
		);
	});

	it("5. PatientTreatmentPlanDrawerModal shows 'Редактирование плана лечения' when initialPlanId is provided", () => {
		const html = renderToString(
			<AppLogicProvider value={mockAppContext}>
				<PatientTreatmentPlanDrawerModal
					isOpen={true}
					onClose={() => {}}
					patientId="pat-100"
					activePatient={{ fullName: "Иванова Мария Сергеевна" }}
					initialPlanId="plan-existing-42"
				/>
			</AppLogicProvider>,
		);

		assert.ok(
			html.includes("Редактирование плана лечения"),
			"Must show editing title when planId is provided",
		);
		assert.ok(
			html.includes("Текущий план"),
			"Must indicate current existing plan badge",
		);
	});

	it("6. Drawer component source code strictly adheres to Mandate 8b (lines <= 600) and Apple HIG", () => {
		const drawerCode = fs.readFileSync(drawerFilePath, "utf8");
		const lines = drawerCode.split("\n");

		assert.ok(
			lines.length <= 600,
			`PatientTreatmentPlanDrawerModal must be <= 600 lines per Mandate 8b, got ${lines.length}`,
		);
		assert.ok(
			drawerCode.includes("Escape"),
			"Must support Escape key event handler",
		);
		assert.ok(
			drawerCode.includes("backdrop-blur"),
			"Must have backdrop-blur per Apple HIG",
		);
		assert.ok(
			drawerCode.includes("min-w-[44px]") && drawerCode.includes("min-h-[44px]"),
			"Close button must comply with touch target size >= 44x44px",
		);
	});

	it("7. Natural Russian language verification (Zero Bird Language)", () => {
		const drawerCode = fs.readFileSync(drawerFilePath, "utf8");

		// Никаких лозунгов и шифров в UI
		assert.ok(!drawerCode.includes("Мандат 8e"), "Must not contain 'Мандат 8e' slogan in UI");
		assert.ok(!drawerCode.includes("043/у"), "Must not contain '043/у' cipher in UI");
		assert.ok(!drawerCode.includes("804н"), "Must not contain '804н' cipher in UI");
		assert.ok(!drawerCode.includes("0 блокировок"), "Must not contain '0 блокировок' slogan in UI");
	});
});
