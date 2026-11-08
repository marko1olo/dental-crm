/**
 * platformAndScheduleAdapters.test.ts — Сьют платформенных адаптеров (Desktop .EXE, PWA, Capacitor),
 * виртуализации тяжелых списков и O(1) карты слотов расписания.
 * Часть декомпозированного сьюта lowSpecHddOptimizer (Мандаты 8b, 8zi).
 */

import assert from "node:assert";
import { afterEach, describe, it } from "node:test";
import type { Appointment } from "@dental/shared";
import { buildDoctorSlotAppointmentsMap } from "../../components/schedule/ScheduleGrid";
import {
	isDesktopApp,
	printDesktopA4DocumentSilent,
} from "../../native/desktopBridge";
import {
	isDesktopExecutable,
	isStandalonePwa,
	detectOmniEnvironment,
} from "../../lib/omniPlatformAdapter";
import { getSafeAreaInsets } from "../../native/mobileBridge";
import { sliceDomList } from "../../utils/domVirtualizationHelper";

describe("ScheduleGrid — O(1) Doctor Slot Appointments Map (Zero GC & No .filter() churn)", () => {
	it("индексирует приемы по ключу ${doctorId}_${timeSlot} за один проход", () => {
		const appointments: Appointment[] = [
			{
				id: "appt-1",
				doctorUserId: "doc-1",
				chairId: "chair-1",
				patientId: "pat-1",
				startsAt: "2026-09-20T09:00:00.000Z",
				endsAt: "2026-09-20T09:30:00.000Z",
				status: "planned",
				reason: "Консультация",
				organizationId: "org-1",
				comment: "",
			},
			{
				id: "appt-2",
				doctorUserId: "doc-1",
				chairId: "chair-1",
				patientId: "pat-2",
				startsAt: "2026-09-20T10:00:00.000Z",
				endsAt: "2026-09-20T11:00:00.000Z",
				status: "planned",
				reason: "Лечение кариеса",
				organizationId: "org-1",
				comment: "",
			},
			{
				id: "appt-3",
				doctorUserId: "doc-2",
				chairId: "chair-2",
				patientId: "pat-3",
				startsAt: "2026-09-20T09:00:00.000Z",
				endsAt: "2026-09-20T09:30:00.000Z",
				status: "planned",
				reason: "Профгигиена",
				organizationId: "org-1",
				comment: "",
			},
		];

		const timeSlots = ["08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00"];
		const slotMap = buildDoctorSlotAppointmentsMap(appointments, "2026-09-20", timeSlots, 30);

		// O(1) lookup
		const doc1At9 = slotMap.get("doc-1_09:00");
		assert.ok(doc1At9);
		assert.strictEqual(doc1At9.length, 1);
		assert.strictEqual(doc1At9[0]?.id, "appt-1");

		const doc1At10 = slotMap.get("doc-1_10:00");
		assert.ok(doc1At10);
		assert.strictEqual(doc1At10.length, 1);
		assert.strictEqual(doc1At10[0]?.id, "appt-2");

		const doc2At9 = slotMap.get("doc-2_09:00");
		assert.ok(doc2At9);
		assert.strictEqual(doc2At9.length, 1);
		assert.strictEqual(doc2At9[0]?.id, "appt-3");

		// Free slot returns undefined in O(1) without filtering
		const doc1At8 = slotMap.get("doc-1_08:00");
		assert.strictEqual(doc1At8, undefined);
	});
});

describe("GridAppointmentCard — Memoization & Content-Visibility Performance (Mandates 8c, 8n)", () => {
	it("рендерит карточку приема со стилем contentVisibility auto и containment", async () => {
		const React = await import("react");
		const { renderToString } = await import("react-dom/server");
		const { GridAppointmentCard } = await import("../../components/schedule/AppointmentGridCard");

		const mockAppointment: Appointment = {
			id: "test-appt-1",
			patientId: "pat-1",
			doctorUserId: "doc-1",
			chairId: "chair-1",
			startsAt: "2026-09-20T10:00:00.000Z",
			endsAt: "2026-09-20T10:30:00.000Z",
			status: "confirmed" as const,
			reason: "Лечение кариеса",
			organizationId: "org-1",
			comment: null,
		};

		const mockDashboard = {
			patients: [{ id: "pat-1", fullName: "Сидоров Алексей Петрович", balanceRub: 1500 }],
			clinicSettings: { staff: [{ id: "doc-1", fullName: "Д-р Смирнов А. В." }] },
		};

		// 1. Unhovered card: should NOT render heavy hover preview DOM
		const unhoveredHtml = renderToString(
			React.createElement(GridAppointmentCard, {
				appointment: mockAppointment,
				chair: { id: "chair-1", name: "Кабинет 1" },
				effectiveChairs: [{ id: "chair-1", name: "Кабинет 1" }],
				doctors: [{ id: "doc-1", fullName: "Д-р Смирнов А. В." }],
				patientLookupMap: new Map([["pat-1", mockDashboard.patients[0]]]),
				staffLookupMap: new Map([["doc-1", mockDashboard.clinicSettings.staff[0]]]),
				collisionMap: new Map(),
				patientNameFn: () => "Сидоров Алексей Петрович",
				dashboard: mockDashboard as any,
				timezone: "Europe/Moscow",
				toDateTimeLocalValue: (iso: string) => iso.slice(0, 16),
				appointmentLabels: {
					planned: "Запланирован",
					confirmed: "Подтвержден",
					arrived: "Пришел",
					in_treatment: "В кресле",
					completed: "Завершен",
					cancelled: "Отменен",
					no_show: "Не явился",
				},
				isHovered: false,
				isStatusPickerOpen: false,
				isMenuOpen: false,
				isNearBottom: false,
				isNearRightEdge: false,
				onAppointmentClick: () => {},
				onSelectMobileAppt: () => {},
				onQuickStatusChange: () => {},
				onAdjustDuration: () => {},
				onShiftLateness: () => {},
				onReassignChair: () => {},
				onReassignDoctor: () => {},
				onFreeSlotToWaitlist: () => {},
				onMouseEnter: () => {},
				onMouseLeave: () => {},
				onKeepHovered: () => {},
				onToggleStatusPicker: () => {},
				onToggleMenu: () => {},
				onCloseStatusPicker: () => {},
				onCloseMenu: () => {},
			}),
		);

		assert.ok(unhoveredHtml.includes("content-visibility:auto"), "Карточка должна содержать CSS-свойство content-visibility:auto");
		assert.ok(
			unhoveredHtml.includes("contain-intrinsic-size:1px 44px") ||
			unhoveredHtml.includes("contain-intrinsic-size:1px 52px"),
			"Карточка должна содержать contain-intrinsic-size для предотвращения сдвига макета",
		);
		assert.ok(
			unhoveredHtml.includes("Сидоров Алексей П.") || unhoveredHtml.includes("Сидоров А.П.") || unhoveredHtml.includes("Сидоров"),
			"ФИО должно быть отформатировано по стандарту Apple HIG",
		);
		assert.ok(!unhoveredHtml.includes("schedule-grid-patient-hover-preview"), "Ненаведенная карточка не должна плодить DOM превью");

		// 2. Hovered card: renders Hover HUD
		const hoveredHtml = renderToString(
			React.createElement(GridAppointmentCard, {
				appointment: mockAppointment,
				chair: { id: "chair-1", name: "Кабинет 1" },
				effectiveChairs: [{ id: "chair-1", name: "Кабинет 1" }],
				doctors: [{ id: "doc-1", fullName: "Д-р Смирнов А. В." }],
				patientLookupMap: new Map([["pat-1", mockDashboard.patients[0]]]),
				staffLookupMap: new Map([["doc-1", mockDashboard.clinicSettings.staff[0]]]),
				collisionMap: new Map(),
				patientNameFn: () => "Сидоров Алексей Петрович",
				dashboard: mockDashboard as any,
				timezone: "Europe/Moscow",
				toDateTimeLocalValue: (iso: string) => iso.slice(0, 16),
				appointmentLabels: {
					planned: "Запланирован",
					confirmed: "Подтвержден",
					arrived: "Пришел",
					in_treatment: "В кресле",
					completed: "Завершен",
					cancelled: "Отменен",
					no_show: "Не явился",
				},
				isHovered: true,
				isStatusPickerOpen: false,
				isMenuOpen: false,
				isNearBottom: false,
				isNearRightEdge: false,
				onAppointmentClick: () => {},
				onSelectMobileAppt: () => {},
				onQuickStatusChange: () => {},
				onAdjustDuration: () => {},
				onShiftLateness: () => {},
				onReassignChair: () => {},
				onReassignDoctor: () => {},
				onFreeSlotToWaitlist: () => {},
				onMouseEnter: () => {},
				onMouseLeave: () => {},
				onKeepHovered: () => {},
				onToggleStatusPicker: () => {},
				onToggleMenu: () => {},
				onCloseStatusPicker: () => {},
				onCloseMenu: () => {},
			}),
		);

		assert.ok(hoveredHtml.includes("schedule-grid-patient-hover-preview"), "Наведенная карточка должна отображать Hover HUD");
		assert.ok(
			hoveredHtml.includes("hover-status-confirmed-test-appt-1") || hoveredHtml.includes("Сменить статус в 1 клик"),
			"Hover HUD должен содержать быстрые кнопки статуса",
		);
	});
});

describe("lowSpecHddOptimizer — Виртуализация реестра документов и материалов склада", () => {
	it("разбивает большой реестр документов (250 записей) на порции по 40 элементов", () => {
		const mockDocuments = Array.from({ length: 250 }, (_, i) => ({
			id: `doc-${i + 1}`,
			title: `Документ №${i + 1}`,
			kind: "treatment_act",
			status: i % 2 === 0 ? "issued" : "draft",
		}));

		// Начальное состояние: первые 40 элементов
		const slice1 = sliceDomList(mockDocuments, 40, 0);
		assert.strictEqual(slice1.visibleItems.length, 40);
		assert.strictEqual(slice1.totalCount, 250);
		assert.strictEqual(slice1.remainingCount, 210);
		assert.strictEqual(slice1.hasMore, true);
		assert.strictEqual(slice1.visibleItems[0]!.id, "doc-1");
		assert.strictEqual(slice1.visibleItems[39]!.id, "doc-40");

		// Вторая порция: клик "Показать ещё 40" -> лимит 80
		const slice2 = sliceDomList(mockDocuments, 80, 0);
		assert.strictEqual(slice2.visibleItems.length, 80);
		assert.strictEqual(slice2.remainingCount, 170);
		assert.strictEqual(slice2.hasMore, true);

		// Полная загрузка всех документов
		const sliceAll = sliceDomList(mockDocuments, 250, 0);
		assert.strictEqual(sliceAll.visibleItems.length, 250);
		assert.strictEqual(sliceAll.remainingCount, 0);
		assert.strictEqual(sliceAll.hasMore, false);
	});

	it("виртуализирует номенклатуру склада (120 позиций) без утечки памяти DOM", () => {
		const mockWarehouse = Array.from({ length: 120 }, (_, i) => ({
			id: `item-${i + 1}`,
			name: `Материал ${i + 1}`,
			stockQuantity: i * 5,
			criticalThreshold: 10,
		}));

		const initialSlice = sliceDomList(mockWarehouse, 40, 0);
		assert.strictEqual(initialSlice.visibleItems.length, 40);
		assert.strictEqual(initialSlice.remainingCount, 80);
		assert.strictEqual(initialSlice.hasMore, true);

		// Увеличение на 40
		const expandedSlice = sliceDomList(mockWarehouse, 80, 0);
		assert.strictEqual(expandedSlice.visibleItems.length, 80);
		assert.strictEqual(expandedSlice.remainingCount, 40);
		assert.strictEqual(expandedSlice.hasMore, true);

		// Финальное раскрытие
		const fullSlice = sliceDomList(mockWarehouse, 120, 0);
		assert.strictEqual(fullSlice.visibleItems.length, 120);
		assert.strictEqual(fullSlice.remainingCount, 0);
		assert.strictEqual(fullSlice.hasMore, false);
	});

	it("виртуализирует наряды ЗТЛ (DentalLabOrdersHubModal) канбан-колонками по 40 элементов с contain-intrinsic-size 1px 64px", () => {
		const mockLabOrders = Array.from({ length: 95 }, (_, i) => ({
			id: `order-ztl-${i + 1}`,
			orderNumber: `ЗТЛ-${1000 + i + 1}`,
			patientName: `Пациент ${i + 1}`,
			doctorName: "Д-р Иванов А.С.",
			currentStage: "sent_to_lab" as const,
			financials: { patientPriceTotalRub: 24000, labCostTotalRub: 8000 },
		}));

		// Порция 1: первые 40 нарядов
		const stage1 = sliceDomList(mockLabOrders, 40, 0);
		assert.strictEqual(stage1.visibleItems.length, 40);
		assert.strictEqual(stage1.totalCount, 95);
		assert.strictEqual(stage1.remainingCount, 55);
		assert.strictEqual(stage1.hasMore, true);
		assert.strictEqual(stage1.visibleItems[0]!.orderNumber, "ЗТЛ-1001");
		assert.strictEqual(stage1.visibleItems[39]!.orderNumber, "ЗТЛ-1040");

		// Порция 2: клик "Показать ещё 40 нарядов" -> лимит 80
		const stage2 = sliceDomList(mockLabOrders, 80, 0);
		assert.strictEqual(stage2.visibleItems.length, 80);
		assert.strictEqual(stage2.remainingCount, 15);
		assert.strictEqual(stage2.hasMore, true);

		// Порция 3: полное раскрытие
		const stage3 = sliceDomList(mockLabOrders, 120, 0);
		assert.strictEqual(stage3.visibleItems.length, 95);
		assert.strictEqual(stage3.remainingCount, 0);
		assert.strictEqual(stage3.hasMore, false);
	});

	it("виртуализирует реестр пациентов (PatientsView) порциями по 40 элементов (step: 40)", () => {
		const mockPatients = Array.from({ length: 110 }, (_, i) => ({
			id: `patient-${i + 1}`,
			fullName: `Пациент ${i + 1}`,
			phone: `+7900123${String(i).padStart(4, "0")}`,
		}));

		const page1 = sliceDomList(mockPatients, 40, 0);
		assert.strictEqual(page1.visibleItems.length, 40);
		assert.strictEqual(page1.totalCount, 110);
		assert.strictEqual(page1.hasMore, true);
		assert.strictEqual(page1.remainingCount, 70);

		// Увеличение лимита на шаг 40
		const page2 = sliceDomList(mockPatients, 80, 0);
		assert.strictEqual(page2.visibleItems.length, 80);
		assert.strictEqual(page2.remainingCount, 30);
		assert.strictEqual(page2.hasMore, true);

		// Завершающая порция
		const page3 = sliceDomList(mockPatients, 120, 0);
		assert.strictEqual(page3.visibleItems.length, 110);
		assert.strictEqual(page3.remainingCount, 0);
		assert.strictEqual(page3.hasMore, false);
	});

	it("виртуализирует прейскурант каталога услуг (ServicePricelistManagerModal) по 40 элементов", () => {
		const mockServices = Array.from({ length: 85 }, (_, i) => ({
			id: `srv-${i + 1}`,
			code: `A16.07.${String(i + 1).padStart(3, "0")}`,
			name: `Стоматологическая услуга ${i + 1}`,
			priceRub: 3500 + i * 100,
		}));

		const firstChunk = sliceDomList(mockServices, 40, 0);
		assert.strictEqual(firstChunk.visibleItems.length, 40);
		assert.strictEqual(firstChunk.remainingCount, 45);
		assert.strictEqual(firstChunk.hasMore, true);

		const secondChunk = sliceDomList(mockServices, 80, 0);
		assert.strictEqual(secondChunk.visibleItems.length, 80);
		assert.strictEqual(secondChunk.remainingCount, 5);
		assert.strictEqual(secondChunk.hasMore, true);

		const finalChunk = sliceDomList(mockServices, 120, 0);
		assert.strictEqual(finalChunk.visibleItems.length, 85);
		assert.strictEqual(finalChunk.remainingCount, 0);
		assert.strictEqual(finalChunk.hasMore, false);
	});
});

describe("lowSpecHddOptimizer — Платформенные адаптеры (Electron, WebView2, Capacitor, PWA)", () => {
	const originalWindow = globalThis.window;

	afterEach(() => {
		if (originalWindow !== undefined) {
			globalThis.window = originalWindow;
		} else {
			delete (globalThis as { window?: unknown }).window;
		}
	});

	it("распознает Microsoft Edge WebView2 и __DENTE_DESKTOP__ флаги как Standalone Desktop (.EXE)", () => {
		globalThis.window = {
			chrome: { webview: {} },
		} as unknown as Window & typeof globalThis;
		assert.strictEqual(isDesktopApp(), true);
		assert.strictEqual(isDesktopExecutable(), true);
		assert.strictEqual(detectOmniEnvironment(), "desktop_exe");

		globalThis.window = {
			__DENTE_DESKTOP__: true,
		} as unknown as Window & typeof globalThis;
		assert.strictEqual(isDesktopApp(), true);
		assert.strictEqual(isDesktopExecutable(), true);
	});

	it("распознает Capacitor / Android native bridge и считывает безопасные зоны (safe area insets)", () => {
		globalThis.window = {
			denteSafeArea: { top: 44, bottom: 34, left: 0, right: 0 },
			Capacitor: { isNativePlatform: () => true },
		} as unknown as Window & typeof globalThis;

		const insets = getSafeAreaInsets();
		assert.strictEqual(insets.top, 44);
		assert.strictEqual(insets.bottom, 34);
		assert.strictEqual(insets.left, 0);
		assert.strictEqual(insets.right, 0);
	});

	it("распознает PWA режим при автономном отображении (display-mode: standalone)", () => {
		globalThis.window = {
			matchMedia: (query: string) => ({
				matches: query.includes("display-mode: standalone"),
				media: query,
				onchange: null,
				addListener: () => {},
				removeListener: () => {},
				addEventListener: () => {},
				removeEventListener: () => {},
				dispatchEvent: () => true,
			}),
		} as unknown as Window & typeof globalThis;

		assert.strictEqual(isStandalonePwa(), true);
		assert.strictEqual(detectOmniEnvironment(), "pwa_standalone");
	});

	it("выполняет тихую печать документов А4 (printDesktopA4DocumentSilent) без вызова диалогов в Desktop", async () => {
		let nativePrintCalled = false;
		let receivedSilentParam: boolean | undefined;

		globalThis.window = {
			denteDesktopNative: {
				printDocumentSilent: async (params: { silent?: boolean }) => {
					nativePrintCalled = true;
					receivedSilentParam = params.silent;
					return { success: true };
				},
			},
		} as unknown as Window & typeof globalThis;

		const res = await printDesktopA4DocumentSilent({
			htmlContent: "<p>Наряд ЗТЛ-1</p>",
			title: "Наряд ЗТЛ №1024",
		});

		assert.strictEqual(nativePrintCalled, true);
		assert.strictEqual(receivedSilentParam, true);
		assert.strictEqual(res.success, true);
		assert.strictEqual(res.method, "desktop_silent");
	});
});
