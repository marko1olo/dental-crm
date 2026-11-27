import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { navigateToStudio } from "../lib/clinicEventBus";
import { useAppStore } from "../store/appStore";
import { clientLogger } from "../services/logging/clientLogger";
import { PatientCardModal } from "../components/patients/PatientCardModal";
import { PatientCardModalFooter } from "../components/patients/patientCardModalModules/PatientCardModalFooter";
import { PatientCardSomaticAlert } from "../components/patients/patientCardModalModules/PatientCardSomaticAlert";
import { MedicalRecordStudioModal } from "../components/emr/MedicalRecordStudioModal";
import { ClinicalProtocolsCatalogModal } from "../components/visit/clinicalCatalog/ClinicalProtocolsCatalogModal";
import {
	captureCompressedCanvasDataUrl,
	captureSliceFromDOMOrRef,
} from "../components/radiology/mpr/exports/cbctCanvasCapture";

const noopCreationForm = {
	newPatientName: "",
	setNewPatientName: () => {},
	newPatientPhone: "",
	setNewPatientPhone: () => {},
	newPatientBirthDate: "",
	setNewPatientBirthDate: () => {},
	isNewPatientChild: false,
	setIsNewPatientChild: () => {},
	patientCoreDraft: {},
	updateField: () => {},
	duplicateCandidates: [],
	isPatientCreating: false,
	handleCreate: async () => null,
	handleCreateAndBook: async () => null,
	handleCreateAndOpenVisit: async () => null,
	handlePrintBlankContract: () => {},
} as unknown as React.ComponentProps<typeof PatientCardModalFooter>["creationForm"];

describe("Wave 6: PatientCardModal Flat Stack, EMR Drawer & cbctCanvasCapture (Part 6Г Behavioral/DOM)", () => {
	it("1. PatientCardModal renders single unified footer without floating savebar or Matryoshka opacity-0 overlay", () => {
		const html = renderToStaticMarkup(
			<PatientCardModal
				isOpen={true}
				onClose={() => {}}
				mode="view"
				patient={{
					id: "pat-wave6-1",
					fullName: "Соколов Алексей Дмитриевич",
					phone: "+7 (916) 555-01-02",
					birthDate: "1988-05-14",
					balanceKopecks: 245000,
				}}
			/>,
		);

		assert.ok(html.includes('data-testid="patient-card-modal"'));
		assert.ok(html.includes('data-testid="patient-card-modal-footer"'));
		assert.ok(html.includes('data-testid="patient-card-save-status"'));
		assert.strictEqual(html.match(/data-testid="btn-save-patient-card"/g)?.length, 1);
		assert.ok(!html.includes("patient-card-floating-save-bar"));
		assert.ok(!html.includes("opacity-0"));
		assert.ok(!html.includes("z-[10050]"));
	});

	it("2. PatientCardModalFooter reflects dirty/saving/error states and places Отмена/Закрыть strictly left of Primary CTA", () => {
		const cleanHtml = renderToStaticMarkup(
			<PatientCardModalFooter
				isCreateMode={false}
				creationForm={noopCreationForm}
				isDirty={false}
				saveState="idle"
				onClose={() => {}}
				onSave={() => {}}
			/>,
		);
		assert.ok(cleanHtml.includes("Закрыть"));
		assert.ok(!cleanHtml.includes(">Отмена<"));
		assert.ok(cleanHtml.indexOf("Закрыть") < cleanHtml.indexOf('data-testid="btn-save-patient-card"'));

		const dirtyHtml = renderToStaticMarkup(
			<PatientCardModalFooter
				isCreateMode={false}
				creationForm={noopCreationForm}
				isDirty={true}
				saveState="saving"
				onClose={() => {}}
				onSave={() => {}}
			/>,
		);
		assert.ok(dirtyHtml.includes(">Отмена<"));
		assert.ok(dirtyHtml.includes("Сохранение..."));
		assert.ok(dirtyHtml.indexOf(">Отмена<") < dirtyHtml.indexOf('data-testid="btn-save-patient-card"'));
	});

	it("3. PatientCardSomaticAlert uses semantic CSS tokens without rose/amber hardcoded classes", () => {
		const html = renderToStaticMarkup(
			<PatientCardSomaticAlert
				safetyEvaluation={{
					hasCriticalStopFlags: true,
					hasAlerts: true,
					activeFlags: [
						{
							id: "allergy_lidocaine",
							titleRu: "Аллергия на лидокаин",
							shortBadge: "Лидокаин",
							description: "Анафилаксия в анамнезе",
							severity: "critical",
						},
					],
				} as unknown as React.ComponentProps<typeof PatientCardSomaticAlert>["safetyEvaluation"]}
				onOpenAnamnesis={() => {}}
			/>,
		);

		assert.ok(html.includes("var(--danger-soft)"));
		assert.ok(html.includes("var(--danger-ink)"));
		assert.ok(!html.includes("bg-rose-"));
		assert.ok(!html.includes("bg-amber-"));
	});

	it("4. useAppStore.studioBackStack and navigateToStudio perform flat back-stack transitions cleanly", () => {
		const store = useAppStore.getState();
		store.clearStudioBackStack();

		store.pushStudioBackStack({ kind: "patient_card", patientId: "p-10", mode: "view", initialTab: "finance" });
		store.pushStudioBackStack({ kind: "patient_card", patientId: "p-10", mode: "view", initialTab: "finance" });
		assert.strictEqual(useAppStore.getState().studioBackStack.length, 1);

		const popped = useAppStore.getState().popStudioBackStack();
		assert.deepEqual(popped, { kind: "patient_card", patientId: "p-10", mode: "view", initialTab: "finance" });
		assert.strictEqual(useAppStore.getState().studioBackStack.length, 0);

		const prevWindow = (globalThis as { window?: unknown }).window;
		const captured: Array<{ type: string; detail: unknown }> = [];
		const mockWindow = {
			dispatchEvent(evt: CustomEvent) {
				captured.push({ type: evt.type, detail: evt.detail });
				return true;
			},
		};
		(globalThis as { window: unknown }).window = mockWindow;
		try {
			navigateToStudio(
				{ kind: "consents", patientId: "p-10", docId: "tax_deduction:family" },
				{ kind: "patient_card", patientId: "p-10", mode: "view", initialTab: "finance" },
			);
		} finally {
			if (prevWindow === undefined) {
				delete (globalThis as { window?: unknown }).window;
			} else {
				(globalThis as { window: unknown }).window = prevWindow;
			}
		}

		assert.strictEqual(captured.length, 1);
		assert.strictEqual(captured[0]?.type, "dente:bus:studio:open");
		const detail = captured[0]?.detail as {
			studio: { kind: string; docId?: string };
			pushBackStack?: { kind: string; initialTab?: string };
		};
		assert.strictEqual(detail.studio.kind, "consents");
		assert.strictEqual(detail.studio.docId, "tax_deduction:family");
		assert.strictEqual(detail.pushBackStack?.kind, "patient_card");
	});

	it("5. MedicalRecordStudioModal puts completeness badge + back button in header and ClinicalProtocolsCatalogModal uses 380px drawer", () => {
		const emrHtml = renderToStaticMarkup(
			<MedicalRecordStudioModal
				isOpen={true}
				onClose={() => {}}
				onBack={() => {}}
				backLabel="К карточке"
				patientId="pat-emr-1"
				initialTab="overview"
			/>,
		);

		assert.ok(emrHtml.includes('data-testid="badge-emr-completeness"'));
		assert.ok(emrHtml.includes('data-testid="btn-emr-back-to-card"'));
		assert.ok(emrHtml.includes("К карточке"));
		assert.ok(!emrHtml.includes("emr-studio-completeness"));

		const drawerHtml = renderToStaticMarkup(
			<ClinicalProtocolsCatalogModal
				embedded={true}
				isOpen={true}
				onClose={() => {}}
				activeTooth={36}
				onApplyPatch={() => {}}
			/>,
		);
		assert.ok(drawerHtml.includes('data-testid="clinical-protocols-catalog-drawer"'));
		assert.ok(drawerHtml.includes("md:w-[380px]"));
		assert.ok(drawerHtml.includes('data-testid="btn-catalog-back-to-protocol"'));
		assert.ok(!drawerHtml.includes("max-md:fixed"));
		assert.ok(!drawerHtml.includes("md:w-[440px]"));
		assert.ok(!drawerHtml.includes("primary-button"));
	});

	it("6. cbctCanvasCapture logs structured warnings on WebP/JPEG/DOM failures and falls back to PNG", () => {
		const logsBefore = clientLogger.getLogs().length;
		const throwingCanvas = {
			toDataURL(mime?: string) {
				if (mime === "image/webp" || mime === "image/jpeg") {
					throw new Error(`Unsupported ${mime}`);
				}
				return "data:image/png;base64,iVBORw0KGgo=";
			},
		} as unknown as HTMLCanvasElement;

		const url = captureCompressedCanvasDataUrl(throwingCanvas);
		assert.strictEqual(url, "data:image/png;base64,iVBORw0KGgo=");

		const sliceResult = captureSliceFromDOMOrRef({
			current: {
				toDataURL() {
					throw new Error("Tainted canvas");
				},
			} as unknown as HTMLCanvasElement,
		});
		assert.strictEqual(sliceResult, null);

		const newWarnLogs = clientLogger
			.getLogs()
			.slice(logsBefore)
			.filter((entry) => entry.level === "WARN" && entry.message.includes("CBCT canvas capture"));
		assert.ok(newWarnLogs.length >= 3, `Expected >= 3 CBCT warnings logged, got ${newWarnLogs.length}`);
	});
});
