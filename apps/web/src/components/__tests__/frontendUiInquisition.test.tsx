/**
 * apps/web/src/components/__tests__/frontendUiInquisition.test.tsx
 *
 * Реальная поведенческая UI-инквизиция поверх настоящего рендера React-компонентов
 * (`renderToStaticMarkup`, БЕЗ source-grep по исходникам и БЕЗ моков тестируемого SUT!).
 *
 * Ловит системный фронтенд-брак прямо в отрендеренном DOM:
 *  - >1 залитой Primary CTA в тулбаре/модалке
 *  - Primary-забор внутри строк таблицы <tbody> <tr>
 *  - Запрещённый неон #2dd4bf / bg-[var(--teal)] / градиенты / #1e293b / slate-800
 *  - Коллизии SVG <id="..."> и битые url(#...) в многодуговой одонтограмме Wheeler
 *  - Заблокированные (disabled) критические кнопки (Мандат 8e)
 *  - Утечки дев-жаргона, канцелярщины (043/у, 54-ФЗ), & вместо «и», ASCII '->' в кнопках
 *  - Дубли номеров нарядов/документов между разными строками таблицы
 */

import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LabOrdersFilterBar } from "../lab/ordersView/LabOrdersFilterBar";
import { LabOrderCardsGrid } from "../lab/ordersView/LabOrderCardsGrid";
import { LabOrdersSegmentedNav } from "../lab/ordersView/LabOrdersSegmentedNav";
import { LabOrdersTable } from "../lab/ordersView/LabOrdersTable";
import type { DentalLabOrderData } from "../lab/labMath";
import { WheelerToothArch } from "../odontogram/WheelerToothArch";

function collectTagMatches(html: string, tagName: string): Array<{ attrs: string; innerHtml: string; text: string }> {
	const results: Array<{ attrs: string; innerHtml: string; text: string }> = [];
	const re = new RegExp(`<${tagName}\\b([^>]*)>([\\s\\S]*?)<\\/${tagName}>`, "gi");
	let m: RegExpExecArray | null;
	while ((m = re.exec(html)) !== null) {
		const attrs = m[1] || "";
		const innerHtml = m[2] || "";
		const text = innerHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
		results.push({ attrs, innerHtml, text });
	}
	return results;
}

function getClassAttr(attrs: string): string {
	const m = attrs.match(/\bclass="([^"]*)"/i);
	return m ? m[1] : "";
}

function isPrimaryClass(cls: string): boolean {
	return (
		cls.includes("bg-[var(--primary)]") ||
		cls.includes("primary-button") ||
		cls.includes("dente-btn-primary") ||
		(/\bbg-\[var\(--teal\b/.test(cls) && !cls.includes("var(--teal)/"))
	);
}

function assertCleanRenderedUiHtml(html: string, contextName: string, opts: { maxPrimaryCtas?: number } = {}) {
	const maxPrimary = opts.maxPrimaryCtas ?? 1;
	const visibleText = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

	assert.equal(
		/(?:043\/у|804н|54-ФЗ|257\/у)/i.test(visibleText),
		false,
		`[${contextName}] В отрендеренном UI утекли канцелярские номера приказов! HTML text: ${visibleText.slice(0, 200)}`,
	);
	assert.equal(
		/(?:в\s*1\s*клик|1-клик|\bindexeddb\b|копеечн(?:ая|ой|ую|ые)?\s+точност)/i.test(visibleText),
		false,
		`[${contextName}] В отрендеренном UI утечка дев-сленга («1 клик» / indexeddb / копеечная точность)!`,
	);
	assert.equal(
		/[А-Яа-яЁё]+\s+&\s+[А-Яа-яЁё]+/.test(visibleText),
		false,
		`[${contextName}] В русском UI торчит англицизм '&' вместо «и»!`,
	);
	const allClasses = [...html.matchAll(/\bclass="([^"]*)"/gi)].map((m) => m[1] || "");
	for (const cls of allClasses) {
		const isTinyHairlineDivider = /\bw-\[[12]px\]|\bh-\[[12]px\]/.test(cls);
		const badCls = cls.match(
			/(?:dark:)?(?:bg-\[#(?:1e293b|334155|0f172a|2dd4bf)\]|bg-slate-(?:800|900)|border-slate-800|bg-teal-(?:300|400))/,
		);
		if (badCls) {
			assert.fail(
				`[${contextName}] Синяя/неоновая поверхность "${badCls[0]}" в классе "${cls}"! Запрещены #1e293b/slate-800/#2dd4bf в DENTE — переведи на var(--paper) / var(--primary).`,
			);
		}
		if (!isTinyHairlineDivider && /\bbg-gradient-to-/.test(cls)) {
			assert.fail(
				`[${contextName}] Запрещённый градиент "${cls}" на UI-элементе! Используй чистые поверхности var(--paper)/var(--primary) без градиентного мусора.`,
			);
		}
		if (/\buppercase\b/.test(cls) && !/\bprint:/.test(cls)) {
			assert.fail(
				`[${contextName}] Найден класс КАПСЛОКА "uppercase" (${cls})! По стандарту DENTE весь UI пишется строго в Sentence case.`,
			);
		}
	}

	const buttons = collectTagMatches(html, "button");
	let primaryCount = 0;
	for (const btn of buttons) {
		const cls = getClassAttr(btn.attrs);
		if (/\bbg-\[var\(--teal\b/.test(cls) && !cls.includes("var(--teal)/")) {
			assert.fail(`[${contextName}] Кнопка «${btn.text}» использует bg-[var(--teal)] (кислотный неон #2dd4bf в Dark Mode)! Требуется bg-[var(--primary)] text-white.`);
		}
		if (isPrimaryClass(cls)) {
			primaryCount++;
		}
		if (/\bdisabled\b/.test(btn.attrs) && /^(?:Сохранить|Печать|Оплатить|Создать|Записать|Новый наряд)/i.test(btn.text)) {
			assert.fail(`[${contextName}] Критическая кнопка «${btn.text}» заблокирована атрибутом disabled (нарушение Мандата 8e)!`);
		}
		if (/(?:^|\s)(?:->|=>)(?:\s|$)|\s>\s/.test(btn.text)) {
			assert.fail(`[${contextName}] Кнопка «${btn.text}» содержит ASCII-стрелку '>' / '->' вместо иконки Lucide!`);
		}
	}

	assert.ok(
		primaryCount <= maxPrimary,
		`[${contextName}] Забор Primary CTA: отрендерено ${primaryCount} залитых Primary-кнопок (максимум ${maxPrimary})!`,
	);
}

const SAMPLE_LAB_ORDERS: readonly DentalLabOrderData[] = [
	{
		id: "ord-inquisition-1",
		orderNumber: "ЗТЛ-2026-0101",
		patientId: "pat-1",
		patientName: "Иванов Сергей Петрович",
		doctorName: "Д-р Орлов А. В.",
		toothFdi: "36",
		constructionType: "Коронка диоксид циркония",
		material: "Цирконий",
		colorVita: "A2",
		status: "sent_to_lab",
		priceKopecks: 1850000,
	},
	{
		id: "ord-inquisition-2",
		orderNumber: "ЗТЛ-2026-0102",
		patientId: "pat-2",
		patientName: "Смирнова Анна Игоревна",
		doctorName: "Д-р Орлов А. В.",
		toothFdi: "14",
		constructionType: "Вкладка керамическая",
		material: "Керамика",
		colorVita: "A1",
		status: "ready_in_clinic",
		priceKopecks: 1200000,
	},
	{
		id: "ord-inquisition-3",
		orderNumber: "ЗТЛ-2026-0103",
		patientId: "pat-3",
		patientName: "Козлов Дмитрий Олегович",
		doctorName: "Д-р Орлов А. В.",
		toothFdi: "46",
		constructionType: "Винир",
		material: "Пресс-керамика",
		colorVita: "B1",
		status: "try_in",
		priceKopecks: 2200000,
	},
];

test("LabOrdersFilterBar + LabOrdersSegmentedNav render cleanly with <= 1 Primary CTA and 0 neon/slate violations", () => {
	const barHtml = renderToStaticMarkup(
		React.createElement(LabOrdersFilterBar, {
			metrics: { total: 3, inProgress: 1, tryIn: 1, ready: 1, completed: 0, overdue: 0 },
			searchQuery: "",
			onSearchChange: () => {},
			doctorFilter: "all",
			onDoctorFilterChange: () => {},
			doctorsList: ["Д-р Орлов А. В."],
			onOpenPriceMatrix: () => {},
			onOpenHubModal: () => {},
			onRefresh: () => {},
			isLoading: false,
			onOpenNewOrder: () => {},
		}),
	);
	const navHtml = renderToStaticMarkup(
		React.createElement(LabOrdersSegmentedNav, {
			canonicalFilters: [
				{ id: "all", label: "Все", shortLabel: "Все", statuses: [] },
				{ id: "in_work", label: "В работе", shortLabel: "В работе", statuses: ["sent_to_lab"] },
				{ id: "ready", label: "Готовы", shortLabel: "Готовы", statuses: ["ready_in_clinic"] },
			],
			statusFilter: "all",
			onStatusFilterChange: () => {},
			stageCounts: { all: 3, in_work: 1, ready: 1 },
			viewMode: "table",
			onViewModeChange: () => {},
		}),
	);

	const combined = `${barHtml}\n${navHtml}`;
	assertCleanRenderedUiHtml(combined, "LabOrdersHeader+SegmentedNav", { maxPrimaryCtas: 1 });
	assert.ok(barHtml.includes("Новый наряд в лабораторию"), "Primary CTA должна рендериться в хедере");
});

test("LabOrdersTable renders unique order codes and ZERO Primary CTA fences inside tbody rows", () => {
	const noop = () => {};
	const tableHtml = renderToStaticMarkup(
		React.createElement(LabOrdersTable, {
			orders: SAMPLE_LAB_ORDERS,
			openMenuOrderId: null,
			setOpenMenuOrderId: noop,
			onSelectTimelineOrder: noop,
			onOpenReadyInClinicPrompt: noop,
			onOpenPrintOrder: noop,
			onOpenTracking: noop,
			onView3DScan: noop,
			onPayFromCashbox: noop,
			onMarkInstalled: noop,
			onAttach3DScan: noop,
			onAttachBitePhoto: noop,
			onTechnicianComment: noop,
			onRepeatFitting: noop,
			onReclamation: noop,
			onOpenEditOrder: noop,
			copyPortalLink: noop,
			getStatusBadge: (status) => React.createElement("span", null, status || "draft"),
		}),
	);

	assertCleanRenderedUiHtml(tableHtml, "LabOrdersTable", { maxPrimaryCtas: 0 });

	const tbodyMatch = tableHtml.match(/<tbody\b[^>]*>([\s\S]*?)<\/tbody>/i);
	assert.ok(tbodyMatch, "LabOrdersTable должен рендерить <tbody>");
	const tbodyButtons = collectTagMatches(tbodyMatch[1], "button");
	assert.ok(tbodyButtons.length > 0, "В строках таблицы должны рендериться кнопки действий");
	for (const btn of tbodyButtons) {
		const cls = getClassAttr(btn.attrs);
		assert.equal(
			isPrimaryClass(cls),
			false,
			`Забор Primary-кнопок в <tbody>! Кнопка «${btn.text}» носит Primary-класс (${cls}) вместо Secondary/Ghost!`,
		);
	}

	const trs = collectTagMatches(tbodyMatch[1], "tr");
	assert.equal(trs.length, SAMPLE_LAB_ORDERS.length);
	const seenCodes = new Set<string>();
	for (const tr of trs) {
		const m = tr.text.match(/ЗТЛ-\d{4}-\d{4}/);
		assert.ok(m, `Строка таблицы потеряла код наряда: ${tr.text}`);
		assert.equal(seenCodes.has(m[0]), false, `Дубликат кода наряда ${m[0]} в соседних строках таблицы!`);
		seenCodes.add(m[0]);
	}
});

test("Dual-mounted WheelerToothArch (adult + mixed) isolates every SVG #id via useId without collisions", () => {
	const html = renderToStaticMarkup(
		React.createElement(
			"div",
			null,
			React.createElement(WheelerToothArch, {
				patientId: "pat-adult",
				dentitionMode: "adult",
				mode: "interactive",
				showWisdomTeeth: true,
			}),
			React.createElement(WheelerToothArch, {
				patientId: "pat-mixed",
				dentitionMode: "mixed",
				isMixed: true,
				mode: "history",
			}),
		),
	);

	assertCleanRenderedUiHtml(html, "DualWheelerToothArch", { maxPrimaryCtas: 1 });

	const ids: string[] = [];
	const idRe = /\bid="([^"]+)"/g;
	let m: RegExpExecArray | null;
	while ((m = idRe.exec(html)) !== null) {
		ids.push(m[1]);
	}
	assert.ok(ids.length > 10, `Ожидались SVG defs/id элементы в WheelerToothArch, найдено только ${ids.length}`);

	const counts = new Map<string, number>();
	for (const id of ids) {
		counts.set(id, (counts.get(id) || 0) + 1);
	}
	const dupes = [...counts.entries()].filter(([, c]) => c > 1).map(([id, c]) => `${id} x${c}`);
	assert.deepEqual(
		dupes,
		[],
		`Коллизия SVG #id при двойном рендере одонтограммы Wheeler! Поломка градиентов/clipPath: ${dupes.join(", ")}`,
	);

	const idSet = new Set(ids);
	const urlRe = /url\(#([^)]+)\)/g;
	const brokenUrls = new Set<string>();
	while ((m = urlRe.exec(html)) !== null) {
		if (!idSet.has(m[1])) {
			brokenUrls.add(m[1]);
		}
	}
	assert.deepEqual(
		[...brokenUrls],
		[],
		`Битые ссылки url(#...) без соответствующего SVG id (сломанный префикс useId): ${[...brokenUrls].join(", ")}`,
	);
});

test("LabOrderCardsGrid renders cards cleanly with unique codes, ZERO Primary CTA fences and 0 slate/neon classes", () => {
	const noop = () => {};
	const cardsHtml = renderToStaticMarkup(
		React.createElement(LabOrderCardsGrid, {
			orders: SAMPLE_LAB_ORDERS,
			openMenuOrderId: null,
			setOpenMenuOrderId: noop,
			handleOpenPrintOrder: noop,
			handleOpenTracking: noop,
			handleAttach3DScan: noop,
			handleAttachBitePhoto: noop,
			handleTechnicianComment: noop,
			handleRepeatFitting: noop,
			handleReclamation: noop,
			handleOpenEditOrder: noop,
			copyPortalLink: noop,
			getStatusBadge: (status) => React.createElement("span", null, status || "draft"),
			handleOpenReadyInClinicPrompt: noop,
			handlePayFromCashbox: noop,
			handleMarkInstalled: noop,
			handleView3DScan: noop,
		}),
	);

	assertCleanRenderedUiHtml(cardsHtml, "LabOrderCardsGrid", { maxPrimaryCtas: 0 });
	for (const order of SAMPLE_LAB_ORDERS) {
		assert.ok(cardsHtml.includes(String(order.patientName)), `Карточка потеряла пациента ${order.patientName}`);
		assert.ok(cardsHtml.includes(String(order.toothFdi)), `Карточка потеряла зуб ${order.toothFdi}`);
	}
});
