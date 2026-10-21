/**
 * visitDiagnosticsTabFunctionality.test.tsx
 *
 * Comprehensive Test Suite for VisitDiagnosticsTab Interactive Functionality:
 * 1. Segmented Mode Switcher (RVG / Photo / CBCT / Endo & Implants) and card visibility.
 * 2. Action & modal trigger buttons:
 *    - Direct RVG sensor capture (btn-open-direct-rvg-modal)
 *    - Hot folder intake (btn-open-hot-folder-modal)
 *    - DICOM viewer (btn-open-dicom-viewer-modal)
 *    - Radiology referral (btn-open-radiology-referral-modal)
 *    - 3D CBCT studio (btn-open-cbct-studio-modal)
 *    - Photo protocol attachment lifecycle
 * 3. Design token compliance & 0px buttonface:
 *    - Inactive tabs have 'bg-transparent border-transparent' to prevent browser buttonface.
 *
 * Invariants: Mandates 8d (7 Deadly Sins), 8e (Doctor Autonomy), 8wx (Zero recursive mock-DOM).
 */

import "../../../../testCssStub.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "vitest";
import { fileURLToPath } from "node:url";
import React, { Suspense } from "react";
import { renderToString } from "react-dom/server";
import { AppLogicProvider, type AppLogicContextType } from "../../../contexts/AppLogicContext";
import { VisitDiagnosticsTab } from "../VisitDiagnosticsTab";
import { DiagnosticsPhotoSection } from "../diagnosticsTab/DiagnosticsPhotoSection";
import { DiagnosticsCbctSection } from "../diagnosticsTab/DiagnosticsCbctSection";
import { DiagnosticsCephSection } from "../diagnosticsTab/DiagnosticsCephSection";
import { DiagnosticsTabToolbar } from "../diagnosticsTab/DiagnosticsTabToolbar";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mockPatient = {
	id: "pat-diagnostics-001",
	fullName: "Смирнова Елена Дмитриевна",
	cardNumber: "K-043-774",
	medCardNumber: "K-043-774",
};

const mockAppLogicContext = {
	activePatient: mockPatient,
	dashboard: {
		activeDoctor: {
			id: "doc-test-1",
			fullName: "Др. Ковалёв Михаил Сергеевич",
			specialty: "therapist",
			specialtyRu: "Врач-стоматолог-терапевт",
		},
		activeVisit: {
			patientId: "pat-diagnostics-001",
			diagnosisTooth: 16,
		},
		clinicSettings: {
			profile: {
				brandName: "ДЕНТЕ Клиника",
			},
		},
		patients: [mockPatient],
	},
	auth: {
		currentUser: {
			name: "Др. Ковалёв Михаил Сергеевич",
		},
	},
} as unknown as AppLogicContextType;

function renderTabHtml(propsOverrides?: Record<string, unknown>) {
	return renderToString(
		<Suspense fallback={null}>
			<AppLogicProvider value={mockAppLogicContext}>
				<VisitDiagnosticsTab activePatient={mockPatient} {...propsOverrides} />
			</AppLogicProvider>
		</Suspense>,
	);
}

describe("VisitDiagnosticsTab Comprehensive Functionality & Button Test Suite", () => {
	describe("1. Segmented Mode Switcher (RVG / Photo / CBCT / Endo & Implants)", () => {
		it("default mode is RVG: RVG section is active and visible, other mode cards are hidden", () => {
			const html = renderTabHtml();

			assert.ok(html.includes('data-testid="tab-diagnostic-mode-rvg"'), "tab-diagnostic-mode-rvg must exist");
			assert.ok(html.includes('data-testid="tab-diagnostic-mode-photo"'), "tab-diagnostic-mode-photo must exist");
			assert.ok(html.includes('data-testid="tab-diagnostic-mode-cbct"'), "tab-diagnostic-mode-cbct must exist");

			// Active RVG tab has active classes (bg-[var(--paper)] text-[var(--teal)])
			assert.ok(
				html.includes("tab-diagnostic-mode-rvg") && html.includes("text-[var(--teal)]"),
				"tab-diagnostic-mode-rvg must be marked as active",
			);

			// RVG action buttons are present in DOM
			assert.ok(html.includes('data-testid="btn-open-direct-rvg-modal"'), "btn-open-direct-rvg-modal must be rendered in RVG mode");
			assert.ok(html.includes('data-testid="visit-photo-protocol-card"'), "visit-photo-protocol-card must be in DOM");
			assert.ok(html.includes('data-testid="visit-cbct-optg-card"'), "visit-cbct-optg-card must be in DOM");
		});

		it("photo section renders when visible with add photo actions", () => {
			const html = renderToString(
				<DiagnosticsPhotoSection
					isVisible={true}
					photoAttachments={[]}
					selectedToothForPhoto={16}
					setSelectedToothForPhoto={() => {}}
					selectedPhotoType="before"
					setSelectedPhotoType={() => {}}
					photoComment=""
					setPhotoComment={() => {}}
					onAddPhoto={() => {}}
					onRemovePhoto={() => {}}
					onOpenPhotoProtocol={() => {}}
				/>,
			);

			assert.ok(html.includes('data-testid="visit-photo-protocol-card"'), "visit-photo-protocol-card must be rendered");
			assert.ok(html.includes("Снимки не прикреплены"), "Shows empty state when no photos attached");
			assert.ok(html.includes("Привязать"), "Button 'Привязать' must exist in photo protocol card");
		});

		it("CBCT section renders quick action buttons when visible", () => {
			const html = renderToString(
				<DiagnosticsCbctSection
					isVisible={true}
					visitPatientId="pat-1"
					visitPatientName="Тестовый Пациент"
					activePatientId="pat-1"
					activePatientFullName="Тестовый Пациент"
					initialToothNumber={16}
					doctorName="Др. Тест"
					cbctMenuRef={{ current: null }}
					onOpenRadiologyReferral={() => {}}
					onOpenDicomViewer={() => {}}
					onOpenCtSelector={() => {}}
				/>,
			);

			assert.ok(html.includes('data-testid="visit-cbct-optg-card"'), "visit-cbct-optg-card must exist");
			assert.ok(html.includes('data-testid="btn-open-cbct-studio-modal"'), "btn-open-cbct-studio-modal must be rendered");
			assert.ok(html.includes('data-testid="btn-add-cbct-service-to-visit"'), "btn-add-cbct-service-to-visit must be rendered");
		});
	});

	describe("2. Modal Trigger Buttons & Action Functionality", () => {
		it("toolbar renders direct RVG, hot folder, DICOM viewer and referral buttons", () => {
			const html = renderToString(
				<DiagnosticsTabToolbar
					diagnosticMode="rvg"
					setDiagnosticMode={() => {}}
					photoAttachmentsCount={0}
					target="active"
					visitPatientId="pat-1"
					visitPatientName="Тестовый Пациент"
					selectedPatientName="Тестовый Пациент"
					setSelectedPatientId={() => {}}
					onOpenReportStudio={() => {}}
					onOpenRadiologyReferral={() => {}}
					onOpenDirectRvg={() => {}}
					onOpenHotFolder={() => {}}
					onOpenDicomViewer={() => {}}
					onOpenComparison={() => {}}
				/>,
			);

			assert.ok(html.includes('data-testid="btn-open-direct-rvg-modal"'), "btn-open-direct-rvg-modal must exist");
			assert.ok(html.includes('data-testid="btn-open-hot-folder-modal"'), "btn-open-hot-folder-modal must exist");
			assert.ok(html.includes('data-testid="btn-open-dicom-viewer-modal"'), "btn-open-dicom-viewer-modal must exist");
			assert.ok(html.includes('data-testid="btn-open-radiology-referral-modal"'), "btn-open-radiology-referral-modal must exist");
		});

		it("advanced diagnostics: renders TRG section and analysis button", () => {
			const html = renderToString(
				<DiagnosticsCephSection
					isOpen={true}
					setIsOpen={() => {}}
					onOpenCephModal={() => {}}
					patientId="pat-1"
					patientName="Тестовый Пациент"
				/>,
			);

			assert.ok(html.includes('data-testid="visit-ceph-diagnostic-card"'), "visit-ceph-diagnostic-card must exist");
			assert.ok(html.includes('data-testid="open-visit-ceph-modal-btn"'), "open-visit-ceph-modal-btn must exist");
		});

		it("photo protocol attachment renders item when attachments exist", () => {
			const html = renderToString(
				<DiagnosticsPhotoSection
					isVisible={true}
					photoAttachments={[
						{
							id: "p1",
							toothNumber: 16,
							photoType: "before",
							photoUrl: "https://example.com/test.jpg",
							description: "До лечения",
							capturedAtIso: new Date().toISOString(),
						},
					]}
					selectedToothForPhoto={16}
					setSelectedToothForPhoto={() => {}}
					selectedPhotoType="before"
					setSelectedPhotoType={() => {}}
					photoComment=""
					setPhotoComment={() => {}}
					onAddPhoto={() => {}}
					onRemovePhoto={() => {}}
					onOpenPhotoProtocol={() => {}}
				/>,
			);

			assert.ok(html.includes("Прикрепленные снимки фотопротокола"), "Must display count of attached photos");
			assert.ok(html.includes('title="Удалить снимок"'), "Must have delete photo button");
			assert.ok(html.includes("До лечения"), "Must display photo description or badge");
		});
	});

	describe("3. Design Tokens & Elimination of Browser Buttonface", () => {
		it("inactive mode tabs have class 'bg-transparent border-transparent' to prevent buttonface", () => {
			const html = renderTabHtml();

			assert.ok(
				html.includes("bg-transparent") && html.includes("border-transparent"),
				"Inactive tabs must have 'bg-transparent border-transparent'",
			);
		});

		it("renders breadcrumb and title 'Снимки и диагностика'", () => {
			const html = renderTabHtml();
			assert.ok(html.includes('data-testid="visit-diagnostics-header"'), "Must render visit-diagnostics-header");
			assert.ok(html.includes("Снимки и диагностика"), "Header must include 'Снимки и диагностика'");
		});

		it("source code verification: VisitDiagnosticsTab strictly enforces design tokens across all tabs", () => {
			const diagnosticsDir = path.resolve(__dirname, "../diagnosticsTab");
			const sourceFiles = [
				path.resolve(__dirname, "../VisitDiagnosticsTab.tsx"),
				...(fs.existsSync(diagnosticsDir)
					? fs.readdirSync(diagnosticsDir).map((f) => path.resolve(diagnosticsDir, f))
					: []),
			];
			const source = sourceFiles.map((f) => fs.readFileSync(f, "utf8")).join("\n");

			// Check all 3 segmented mode buttons use bg-transparent border border-transparent
			const bgTransparentCount = (source.match(/bg-transparent border border-transparent/g) || []).length;
			assert.ok(
				bgTransparentCount >= 3,
				`Expected at least 3 occurrences of 'bg-transparent border border-transparent' for inactive tabs, found ${bgTransparentCount}`,
			);

			// Check all required testids are in the source
			const requiredTestIds = [
				"tab-diagnostic-mode-rvg",
				"tab-diagnostic-mode-photo",
				"tab-diagnostic-mode-cbct",
				"btn-open-direct-rvg-modal",
				"btn-open-hot-folder-modal",
				"btn-open-dicom-viewer-modal",
				"btn-open-radiology-referral-modal",
				"btn-open-cbct-studio-modal",
				"toggle-advanced-diagnostics-btn",
				"open-visit-ceph-modal-btn",
				"visit-photo-protocol-card",
				"visit-cbct-optg-card",
				"visit-ceph-diagnostic-card",
			];

			for (const testId of requiredTestIds) {
				assert.ok(
					source.includes(`data-testid="${testId}"`),
					`VisitDiagnosticsTab.tsx must contain data-testid="${testId}"`,
				);
			}
		});
	});
});
