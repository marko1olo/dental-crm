import assert from "node:assert/strict";
import test, { describe } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	IntraoralScan3DViewerModal,
	build3DViewerIframeSrc,
	buildScan3dPopoutUrl,
	openScan3dPopoutWindow,
} from "../IntraoralScan3DViewerModal.js";
import { is3DScanUrl } from "../../lab/LabAttachScanModal.js";
import { DentalLabOrderDetailsModal } from "../../lab/DentalLabOrderDetailsModal.js";
import type { DentalLabWorkflowOrder } from "../../lab/dentalLabWorkflowEngine.js";

describe("IntraoralScan3DViewerModal Component Specs", () => {
	test("IntraoralScan3DViewerModal is a valid React functional component", () => {
		assert.equal(typeof IntraoralScan3DViewerModal, "function");
	});

	test("build3DViewerIframeSrc returns default /viewer3d.html when no modelUrl is passed", () => {
		assert.equal(build3DViewerIframeSrc(), "/viewer3d.html");
	});

	test("build3DViewerIframeSrc correctly encodes modelUrl and format", () => {
		const src = build3DViewerIframeSrc("https://clinic.example.com/scans/arch.stl", "stl");
		assert.equal(
			src,
			"/viewer3d.html?model=https%3A%2F%2Fclinic.example.com%2Fscans%2Farch.stl&ext=stl",
		);
	});

	test("buildScan3dPopoutUrl generates standalone popout URL with clinical parameters", () => {
		const url = buildScan3dPopoutUrl({
			modelUrl: "/models/mandible_scan_16.stl",
			modelFormat: "stl",
			scanTitle: "Скан нижней челюсти",
			patientName: "Барабаш С.В.",
			toothCode: 16,
			orderId: "lab-demo-001",
		});
		assert.ok(url.startsWith("/viewer3d.html?"));
		assert.ok(url.includes("popout=1"));
		assert.ok(url.includes("model=%2Fmodels%2Fmandible_scan_16.stl"));
		assert.ok(url.includes("ext=stl"));
		assert.ok(url.includes("patient=%D0%91%D0%B0%D1%80%D0%B0%D0%B1%D0%B0%D1%88+%D0%A1.%D0%92."));
		assert.ok(url.includes("tooth=16"));
		assert.ok(url.includes("orderId=lab-demo-001"));
	});

	test("openScan3dPopoutWindow is exported and safe for SSR", () => {
		assert.equal(typeof openScan3dPopoutWindow, "function");
		// In node environment without window, returns null without crashing
		assert.equal(openScan3dPopoutWindow({ modelUrl: "/test.stl" }), null);
	});

	test("IntraoralScan3DViewerModal renders empty string when isOpen is false", () => {
		const html = renderToString(
			React.createElement(IntraoralScan3DViewerModal, {
				isOpen: false,
				onClose: () => {},
			}),
		);
		assert.equal(html, "");
	});

	test("IntraoralScan3DViewerModal renders dialog, patient badge, tooth badge, popout button and iframe when isOpen is true", () => {
		const html = renderToString(
			React.createElement(IntraoralScan3DViewerModal, {
				isOpen: true,
				onClose: () => {},
				modelUrl: "https://clinic.example.com/scans/mandible.ply",
				modelFormat: "ply",
				patientName: "Кузнецов А.В.",
				toothCode: 26,
			}),
		);
		assert.ok(html.includes('role="dialog"'));
		assert.ok(html.includes('data-testid="intraoral-scan-3d-viewer-modal"'));
		assert.ok(html.includes("Кузнецов А.В."));
		assert.ok(html.includes("Зуб № 26"));
		assert.ok(html.includes('data-testid="btn-scan3d-popout"'));
		assert.ok(html.includes("На 2-й монитор"));
		assert.ok(html.includes("viewer3d.html"));
		assert.ok(html.includes("ext=ply"));
	});

	test("is3DScanUrl accurately recognizes STL, PLY, OBJ, and 3MF extensions", () => {
		assert.equal(is3DScanUrl("/models/mandible.stl"), true);
		assert.equal(is3DScanUrl("/models/maxilla.ply"), true);
		assert.equal(is3DScanUrl("/models/implant.obj"), true);
		assert.equal(is3DScanUrl("/models/arch.3mf"), true);
		assert.equal(is3DScanUrl("https://storage.cloud.ru/scans/jaw_scan_44.stl?token=xyz"), true);
		assert.equal(is3DScanUrl("/photos/smile.jpg"), false);
		assert.equal(is3DScanUrl("/photos/bite.png"), false);
		assert.equal(is3DScanUrl(null), false);
		assert.equal(is3DScanUrl(undefined), false);
	});

	test("DentalLabOrderDetailsModal renders 3D scan button when onView3DScan is passed", () => {
		const mockOrder: DentalLabWorkflowOrder = {
			id: "order-test-1",
			orderNumber: "ZTL-9901",
			clinicName: "Клиника ДЕНТЕ",
			labName: "Лаборатория ОртоМастер",
			patientId: "pat-1",
			patientName: "Соколова В.М.",
			doctorId: "doc-1",
			doctorName: "Д-р Смирнов",
			workTypeId: "crown_zirconia",
			materialName: "Диоксид циркония Katana STML",
			selectedTeeth: [16],
			shadeSystem: "classical",
			shadeCode: "A2",
			translucency: "HT",
			surfaceTexture: "microtexture",
			currentStage: "sent_to_lab",
			stageHistory: [],
			orderDateIso: "2026-10-09",
			expectedLabDateIso: "2026-10-15",
			financials: {
				unitsCount: 1,
				pricePerUnitKopecks: 2400000,
				costPerUnitKopecks: 800000,
				patientPriceTotalKopecks: 2400000,
				labCostKopecks: 800000,
				labCostTotalKopecks: 800000,
				clinicGrossMarginKopecks: 1600000,
				grossMarginPercent: 66.7,
				doctorPercent: 20,
				doctorWageBaseKopecks: 1600000,
				doctorWageKopecks: 320000,
				clinicNetProfitKopecks: 1280000,
				patientPriceTotalRub: 24000,
				labCostTotalRub: 8000,
				clinicGrossMarginRub: 16000,
				doctorWageRub: 3200,
				clinicNetProfitRub: 12800,
				isBalanced: true,
			},
			delayAlert: {
				hasAlert: false,
				isDelayedAlert: false,
				lab_delay_alert: false,
				status: "ON_TRACK",
				severity: "OK",
				daysDifference: 6,
				expectedLabDateIso: "2026-10-15",
				alertMessageRu: "В графике",
				detailedReasonRu: "",
				recommendedActionRu: "",
			},
			isDelayedAlert: false,
			createdAtIso: "2026-10-09T00:00:00Z",
			updatedAtIso: "2026-10-09T00:00:00Z",
		};

		const html = renderToString(
			React.createElement(DentalLabOrderDetailsModal, {
				inspectingOrder: mockOrder,
				onCloseInspect: () => {},
				onPrintBlank: () => {},
				onAdvanceTechStage: () => {},
				onOpenWarrantyRework: () => {},
				onView3DScan: () => {},
				warrantyReworkOrder: null,
				onCloseWarrantyRework: () => {},
				onWarrantyReworkSubmit: () => {},
				actionPrompt: null,
				onCloseActionPrompt: () => {},
				onActionPromptSubmit: () => {},
			}),
		);

		assert.ok(html.includes('data-testid="ztl-details-view-3d-scan-btn"'));
		assert.ok(html.includes("3D-скан (STL/PLY)"));
	});
});
