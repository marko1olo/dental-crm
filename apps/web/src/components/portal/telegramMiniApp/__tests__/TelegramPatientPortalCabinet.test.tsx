import "../../../../../testCssStub.mjs";
import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import React, { createElement } from "react";
globalThis.React = React;
import { renderToStaticMarkup } from "react-dom/server";

import {
	TelegramPatientPortalCabinet,
} from "../TelegramPatientPortalCabinet";

import {
	CabinetImagingTab,
	CabinetTaxSheet,
	CabinetTreatmentPlansTab,
	DEMO_IMAGING_SCANS,
	submitTelegramAppointmentConfirmation,
	triggerBlobDownload,
} from "../cabinet";

import {
	setRuntimeDemoMode,
} from "../../../../utils/demoModeEngine.js";

describe("TelegramPatientPortalCabinet Decomposed Architecture Test Suite", () => {
	beforeEach(() => {
		setRuntimeDemoMode(null);
	});

	afterEach(() => {
		setRuntimeDemoMode(null);
	});

	it("1. Regression: CabinetImagingTab isolates SVG gradient IDs via useId() and triggers Blob download with URL cleanup", () => {
		const firstScan = DEMO_IMAGING_SCANS[0];
		const secondScan = DEMO_IMAGING_SCANS[1];
		assert.ok(firstScan && secondScan);
		const combinedHtml = renderToStaticMarkup(
			createElement(
				"div",
				null,
				createElement(CabinetImagingTab, {
					imagingList: DEMO_IMAGING_SCANS,
					selectedScanId: firstScan.id,
					onSelectScanId: () => {},
					zoomLevel: 1,
					onZoomChange: () => {},
					isInverted: false,
					onToggleInvert: () => {},
					showDoctorNotes: true,
					onToggleDoctorNotes: () => {},
					onShare: () => {},
				}),
				createElement(CabinetImagingTab, {
					imagingList: DEMO_IMAGING_SCANS,
					selectedScanId: secondScan.id,
					onSelectScanId: () => {},
					zoomLevel: 1,
					onZoomChange: () => {},
					isInverted: false,
					onToggleInvert: () => {},
					showDoctorNotes: true,
					onToggleDoctorNotes: () => {},
					onShare: () => {},
				}),
			),
		);

		const idMatches = [...combinedHtml.matchAll(/id="([^"]*-boneGlow)"/g)].map((m) => m[1]);
		assert.equal(idMatches.length, 2, "Both imaging viewers must render scoped boneGlow gradient IDs");
		assert.notEqual(idMatches[0], idMatches[1], "Multiple CabinetImagingTab instances must never share identical SVG gradient IDs");
		assert.ok(combinedHtml.includes(`url(#${idMatches[0]})`), "Fill attribute must reference scoped gradient ID");
		assert.ok(combinedHtml.includes(`url(#${idMatches[1]})`), "Second fill attribute must reference distinct scoped gradient ID");

		// Test triggerBlobDownload cleanup cleanly
		const origDoc = Object.getOwnPropertyDescriptor(globalThis, "document");
		const origCreateObj = URL.createObjectURL;
		const origRevokeObj = URL.revokeObjectURL;
		let clicked = false;
		let revokedUrl = "";
		try {
			const fakeEl = { href: "", download: "", click: () => { clicked = true; } };
			Object.defineProperty(globalThis, "document", {
				value: {
					createElement: () => fakeEl,
					body: { appendChild: () => {}, removeChild: () => {} },
				},
				writable: true,
				configurable: true,
			});
			URL.createObjectURL = () => "blob:dente-test-scan";
			URL.revokeObjectURL = (url: string) => { revokedUrl = url; };
			triggerBlobDownload(new Blob(["scan"], { type: "image/png" }), "scan_16.png");
			assert.equal(clicked, true);
			assert.equal(fakeEl.download, "scan_16.png");
			assert.equal(revokedUrl, "blob:dente-test-scan");
		} finally {
			if (origDoc) {
				Object.defineProperty(globalThis, "document", origDoc);
			} else {
				Reflect.deleteProperty(globalThis, "document");
			}
			URL.createObjectURL = origCreateObj;
			URL.revokeObjectURL = origRevokeObj;
		}
	});

	it("1b. Regression: submitTelegramAppointmentConfirmation forwards auth headers + initData and surfaces 401 failure", async () => {
		let capturedHeaders = new Headers();
		let capturedBody: unknown = null;

		const res = await submitTelegramAppointmentConfirmation({
			organizationId: "org-1",
			parentPatientId: "pat-1",
			appointmentId: "appt-1",
			sessionToken: "portal-jwt-abc",
			initData: "query_id=1&hash=xyz",
			fetchFn: async (_url, init) => {
				capturedHeaders = new Headers(init?.headers);
				capturedBody = JSON.parse(String(init?.body ?? "{}"));
				return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
			},
		});

		assert.equal(capturedHeaders.get("Authorization"), "Bearer portal-jwt-abc");
		assert.equal(capturedHeaders.get("x-telegram-init-data"), "query_id=1&hash=xyz");
		assert.ok(capturedHeaders.get("Idempotency-Key"));
		assert.deepEqual(capturedBody, {
			organizationId: "org-1",
			parentPatientId: "pat-1",
			appointmentId: "appt-1",
			initData: "query_id=1&hash=xyz",
		});
		assert.equal(res.ok, false);
		assert.equal(res.status, 401);
	});

	it("1c. Regression: CabinetTaxSheet renders dynamic years and zero hardcoded demo INN", () => {
		const curYear = new Date().getFullYear();
		const sheetHtml = renderToStaticMarkup(
			createElement(CabinetTaxSheet, {
				isOpen: true,
				onClose: () => {},
				taxYear: curYear,
				onTaxYearChange: () => {},
				taxpayerFullName: "Пациент",
				onTaxpayerFullNameChange: () => {},
				taxpayerInn: "",
				onTaxpayerInnChange: () => {},
				serviceCode: "1",
				onServiceCodeChange: () => {},
				calculatedDeduction: 0,
				taxNotice: null,
				onGenerateTaxPdf: () => {},
			}),
		);
		assert.ok(sheetHtml.includes(String(curYear)));
		assert.ok(sheetHtml.includes(String(curYear - 1)));
		assert.ok(sheetHtml.includes(String(curYear - 2)));
		assert.equal(sheetHtml.includes("7701234567"), false);
	});

	it("2. Renders appointments tab by default with header and bottom navigation", () => {
		setRuntimeDemoMode(true);
		const html = renderToStaticMarkup(
			createElement(TelegramPatientPortalCabinet, {
				patientId: "patient-1",
			}),
		);

		// Header
		assert.ok(html.includes("DENTE Pocket Clinic"));
		assert.ok(html.includes("Кабинет пациента"));
		assert.ok(html.includes((2750).toLocaleString("ru-RU")));

		// Appointments list
		assert.ok(html.includes("Предстоящие"));
		assert.ok(html.includes("Прошедшие"));
		assert.ok(html.includes("Д-р Смирнов"));
		assert.ok(html.includes("+ Записаться"));

		// Bottom Nav
		assert.ok(html.includes("Зубы"));
		assert.ok(html.includes("Записи"));
		assert.ok(html.includes("Снимки"));
		assert.ok(html.includes("Налог 13%"));
		assert.ok(html.includes("Финансы"));
	});

	it("3. Renders teeth complaints tab when initialTab='teeth'", () => {
		setRuntimeDemoMode(true);
		const html = renderToStaticMarkup(
			createElement(TelegramPatientPortalCabinet, {
				initialTab: "teeth",
			}),
		);

		assert.ok(html.includes("Зубная формула и жалобы"));
		assert.ok(html.includes("Нажмите на зуб для фиксации симптомов"));
	});

	it("4. Renders imaging tab with radiology viewer and scan carousel when initialTab='imaging'", () => {
		setRuntimeDemoMode(true);
		const html = renderToStaticMarkup(
			createElement(TelegramPatientPortalCabinet, {
				initialTab: "imaging",
			}),
		);

		assert.ok(html.includes("Цифровая диагностика") && html.includes("КТ"));
		assert.ok(html.includes("RVG снимок #16"));
		assert.ok(html.includes("3D КЛКТ сегмента #36"));
		assert.ok(html.includes("Инв."));
		assert.ok(html.includes("1x"));
		assert.ok(html.includes("Скачать снимок (DICOM/PNG)"));
	});

	it("5. Renders tax deduction tab and tax sheet drawer when initialTab='tax' and initialTaxSheetOpen=true", () => {
		setRuntimeDemoMode(true);
		const html = renderToStaticMarkup(
			createElement(TelegramPatientPortalCabinet, {
				initialTab: "tax",
				initialTaxSheetOpen: true,
			}),
		);

		// Tax Tab
		assert.ok(html.includes("Налоговый вычет 13% (НДФЛ)"));
		assert.ok(html.includes("Официальная справка"));
		assert.ok(html.includes("Оформить справку для налоговой"));

		// Tax Sheet Drawer
		assert.ok(html.includes("tg-tax-sheet"));
		assert.ok(html.includes("Налоговый период (год оплаты):"));
		assert.ok(html.includes("ФИО налогоплательщика:"));
		assert.ok(html.includes("ИНН (12 цифр):"));
		assert.ok(html.includes("Код медицинской услуги:"));
		assert.ok(html.includes("Сформировать справку для налогового вычета"));
	});

	it("6. Renders finance tab with bonus balances, referral card and operation history", () => {
		setRuntimeDemoMode(true);
		const html = renderToStaticMarkup(
			createElement(TelegramPatientPortalCabinet, {
				initialTab: "finance",
			}),
		);

		assert.ok(html.includes("Финансы и бонусы"));
		assert.ok(html.includes("Бонусный счет DENTE"));
		assert.ok(html.includes("1 бонус = 1 рубль"));
		assert.ok(html.includes("Депозит клиники (аванс):"));
		assert.ok(html.includes((15000).toLocaleString("ru-RU")));
		assert.ok(html.includes("Подари другу 1 000 ₽"));
		assert.ok(html.includes("История начислений и операций:"));
	});

	it("7. Isolated TreatmentPlansTab renders empty state and active stages cleanly", () => {
		const emptyHtml = renderToStaticMarkup(
			createElement(CabinetTreatmentPlansTab, { plans: [] }),
		);
		assert.ok(emptyHtml.includes("Нет активных планов лечения"));

		const plansHtml = renderToStaticMarkup(
			createElement(CabinetTreatmentPlansTab, {
				plans: [
					{
						id: "plan-1",
						title: "Тотальная имплантация верхней челюсти",
						totalCostRub: 240000,
						paidCostRub: 120000,
						status: "approved",
						stages: [
							{ id: "s1", title: "3D КТ и хирургический шаблон", costRub: 35000, status: "completed" },
							{ id: "s2", title: "Установка 4 имплантатов", costRub: 160000, status: "in_progress" },
							{ id: "s3", title: "Временный несъемный мост", costRub: 45000, status: "pending" },
						],
					},
				],
			}),
		);
		assert.ok(plansHtml.includes("Тотальная имплантация верхней челюсти"));
		assert.ok(plansHtml.includes("Выполнено: 50%"));
		assert.ok(plansHtml.includes((120000).toLocaleString("ru-RU")));
		assert.ok(plansHtml.includes("Согласован"));
	});

	it("8. Honest production mode (setRuntimeDemoMode(false)) renders without synthetic demo mock fixtures", () => {
		setRuntimeDemoMode(false);
		const html = renderToStaticMarkup(
			createElement(TelegramPatientPortalCabinet, {
				patientId: "real-prod-patient-123",
				organizationId: "org-real-456",
			}),
		);

		// Header reflects real 0-state or patient state
		assert.ok(html.includes("DENTE Pocket Clinic"));
		assert.ok(html.includes("Кабинет пациента"));

		// Must NOT render hardcoded demo patient name or demo doctor from DEMO_APPOINTMENTS
		assert.ok(!html.includes("Иванов Александр Сергеевич"));

		// Honest Empty State for appointments when unhydrated
		assert.ok(html.includes("Нет запланированных визитов"));
		assert.ok(html.includes("Выберите удобное время для консультации или чистки"));
		assert.ok(html.includes("+ Записаться"));
	});

	it("9. Honest production mode for tax deduction tab has no hardcoded demo values when setRuntimeDemoMode(false)", () => {
		setRuntimeDemoMode(false);
		const html = renderToStaticMarkup(
			createElement(TelegramPatientPortalCabinet, {
				patientId: "real-prod-patient-123",
				initialTab: "tax",
				initialTaxSheetOpen: true,
			}),
		);

		// Tax Tab
		assert.ok(html.includes("Налоговый вычет 13% (НДФЛ)"));
		assert.ok(html.includes("Оформить справку для налоговой"));

		// Must NOT have hardcoded demo INN in production
		assert.ok(!html.includes("772481928301"));
		assert.ok(!html.includes("Иванов Александр Сергеевич"));
	});
});
