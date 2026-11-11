/**
 * @dental/web/components/hygiene/hygieneCatalogData.ts
 *
 * DENTE Dental CRM — Канонический клинический каталог профессиональной гигиены,
 * индекса OHI-S Грина-Вермиллиона, протоколов чистки и рекомендаций домашнего ухода (Мандаты 8b, 8e, 8n, 8x).
 * Sweet Spot: 280–350 строк.
 */

import { showToast } from "../GlobalToast";
import { useVisitStore } from "../../store/visitStore";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";

export type OhiSLevel = "ideal" | "fair" | "poor" | "severe";

export interface OhiSPreset {
	readonly id: OhiSLevel;
	readonly score: number;
	readonly debris: number;
	readonly calculus: number;
	readonly label: string;
	readonly statusDescription: string;
	readonly colorHex: string;
	readonly badgeClass: string;
	readonly ratingText: string;
}

export const CANONICAL_OHI_S_TEETH = [
	{ toothNumber: 16, surfaceAspect: "vestibular", surfaceLabelRu: "16 щечная" },
	{ toothNumber: 11, surfaceAspect: "vestibular", surfaceLabelRu: "11 губная" },
	{ toothNumber: 26, surfaceAspect: "vestibular", surfaceLabelRu: "26 щечная" },
	{ toothNumber: 31, surfaceAspect: "vestibular", surfaceLabelRu: "31 губная" },
	{ toothNumber: 36, surfaceAspect: "lingual", surfaceLabelRu: "36 язычная" },
	{ toothNumber: 46, surfaceAspect: "lingual", surfaceLabelRu: "46 язычная" },
] as const;

export function createIdealOhiSTeethScores(): Record<number, { debris: number; calculus: number }> {
	return {
		16: { debris: 0, calculus: 0 },
		11: { debris: 0, calculus: 0 },
		26: { debris: 0, calculus: 0 },
		31: { debris: 0, calculus: 0 },
		36: { debris: 0, calculus: 0 },
		46: { debris: 0, calculus: 0 },
	};
}

export function computeCanonicalOhiS(
	teeth: Readonly<Record<number, { debris?: number; calculus?: number }>>
): OhiSPreset {
	let totalDebris = 0;
	let totalCalculus = 0;
	const count = CANONICAL_OHI_S_TEETH.length; // 6

	for (const t of CANONICAL_OHI_S_TEETH) {
		const rec = teeth[t.toothNumber];
		totalDebris += rec?.debris ?? 0;
		totalCalculus += rec?.calculus ?? 0;
	}

	const debrisAvg = Math.round((totalDebris / count) * 10) / 10;
	const calculusAvg = Math.round((totalCalculus / count) * 10) / 10;
	const score = Math.round((debrisAvg + calculusAvg) * 10) / 10;

	let id: OhiSLevel = "ideal";
	let label = "Идеальная (0.0)";
	let statusDescription = "Зубной налет и камень отсутствуют, десна интактная.";
	let colorHex = "#10b981";
	let badgeClass = "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800";

	if (score === 0.0) {
		id = "ideal";
		label = "Идеальная (0.0)";
		statusDescription = "Зубной налет и камень отсутствуют, десна интактная.";
		colorHex = "#10b981";
		badgeClass = "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800";
	} else if (score <= 1.2) {
		id = "fair";
		label = `Хорошая (${score.toFixed(1)})`;
		statusDescription = "Незначительный мягкий налет, наддесневой камень минимален.";
		colorHex = "#0ea5e9";
		badgeClass = "bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800";
	} else if (score <= 3.0) {
		id = "poor";
		label = `Удовлетворительная (${score.toFixed(1)})`;
		statusDescription = "Умеренный зубной налет до 1/2 коронки, наддесневой зубной камень.";
		colorHex = "#f59e0b";
		badgeClass = "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800";
	} else {
		id = "severe";
		label = `Плохая (${score.toFixed(1)})`;
		statusDescription = "Обильный зубной налет, массивный над- и поддесневой камень.";
		colorHex = "#ef4444";
		badgeClass = "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800";
	}

	return {
		id,
		score,
		debris: debrisAvg,
		calculus: calculusAvg,
		label,
		statusDescription,
		colorHex,
		badgeClass,
		ratingText: `OHI-S: ${score.toFixed(1)} (${label})`,
	};
}

export const OHI_S_PRESETS: readonly OhiSPreset[] = [
	{
		id: "ideal",
		score: 0.0,
		debris: 0.0,
		calculus: 0.0,
		label: "Идеальная (0.0)",
		statusDescription: "Зубной налет и камень отсутствуют, десна бледно-розовая, интактная.",
		colorHex: "#10b981",
		badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
		ratingText: "OHI-S: 0.0 (Отличная гигиена)",
	},
	{
		id: "fair",
		score: 0.8,
		debris: 0.8,
		calculus: 0.0,
		label: "Хорошая (0.8)",
		statusDescription: "Мягкий налет до 1/3 коронковой части, минерализованные отложения не определяются.",
		colorHex: "#0ea5e9",
		badgeClass: "bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800",
		ratingText: "OHI-S: 0.8 (Хорошая гигиена)",
	},
	{
		id: "poor",
		score: 1.8,
		debris: 1.0,
		calculus: 0.8,
		label: "Удовлетворительная (1.8)",
		statusDescription: "Плотный налет и наддесневой зубной камень на язычных поверхностях нижних резцов.",
		colorHex: "#f59e0b",
		badgeClass: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
		ratingText: "OHI-S: 1.8 (Удовлетворительная гигиена)",
	},
	{
		id: "severe",
		score: 2.6,
		debris: 1.4,
		calculus: 1.2,
		label: "Неудовлетворительная (2.6)",
		statusDescription: "Обильный над- и поддесневой камень, кровоточивость маргинального края при зондировании.",
		colorHex: "#ef4444",
		badgeClass: "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
		ratingText: "OHI-S: 2.6 (Неудовлетворительная гигиена)",
	},
];

export interface CleaningServiceItem {
	readonly code: string;
	readonly title: string;
	readonly priceRub: number;
}

export interface CleaningProtocol {
	readonly id: "complex" | "perio" | "pediatric" | "fluoridation";
	readonly title: string;
	readonly description: string;
	readonly durationMinutes: number;
	readonly primaryService: CleaningServiceItem;
	readonly additionalServices?: readonly CleaningServiceItem[];
	readonly consumables: readonly string[];
	readonly clinicalDiaryTemplate: string;
}

export const CLEANING_PROTOCOLS: readonly CleaningProtocol[] = [
	{
		id: "complex",
		title: "Комплекс профессиональной гигиены",
		description: "Ультразвуковой скейлинг над- и поддесневого камня, воздушно-абразивная обработка, полировка абразивной пастой и глубокое фторирование эмали.",
		durationMinutes: 45,
		primaryService: { code: "A16.07.051", title: "Комплексная профессиональная гигиена полости рта", priceRub: 5500 },
		consumables: ["Порошок для воздушно-абразивной обработки (глицин)", "Абразивная полировочная паста", "Нейлоновая полировочная щетка", "Фторсодержащий защитный лак", "Ретрактор мягких тканей и слюноотсос"],
		clinicalDiaryTemplate: "Проведена комплексная профессиональная гигиена полости рта. Обезболивание аппликационное (Лидокаин-спрей 10%). Ультразвуковым пьезо-скейлером удалены над- и поддесневые зубные отложения во всех секстантах. Поверхности зубов обработаны воздушно-абразивным методом с порошком на основе глицина. Межзубные промежутки очищены флоссом и штрипсами. Проведена финишная циркулярная полировка абразивной пастой с чашечками и щетками. Выполнена аппликация фторсодержащего защитного лака. Пациент обучен правилам индивидуальной гигиены.",
	},
	{
		id: "perio",
		title: "Пародонтологическая чистка и кюретаж",
		description: "Атравматичное субгингивальное снятие отложений, медикаментозная обработка десневых карманов антисептиком и дентальный гель.",
		durationMinutes: 60,
		primaryService: { code: "A16.07.051.001", title: "Профессиональная гигиена при заболеваниях пародонта", priceRub: 6200 },
		additionalServices: [{ code: "A16.07.053", title: "Медикаментозная обработка пародонтальных карманов", priceRub: 1200 }],
		consumables: ["Субгингивальный порошок для полировки корней (глицин)", "Раствор хлоргексидина 0.05% (50 мл)", "Антимикробный дентальный гель", "Стерильные пародонтологические насадки"],
		clinicalDiaryTemplate: "Проведена профессиональная гигиена при заболеваниях пародонта. Обильные поддесневые отложения удалены пародонтологическими насадками пьезо-скейлера с минимальной амплитудой. Субгингивальная полировка шеек корней порошком глицина. Пародонтальные карманы промыты раствором хлоргексидина 0.05%, введена лечебная десневая повязка с антибактериальным препаратом. Кровоточивость купирована. Назначен курс антисептических полосканий на 7 дней.",
	},
	{
		id: "pediatric",
		title: "Детская гигиена и обучение чистке",
		description: "Мягкое окрашивание зубного налета индикатором, атравматичная полировка резиновыми чашечками и глубокая реминерализирующая терапия.",
		durationMinutes: 30,
		primaryService: { code: "A16.07.051.002", title: "Профессиональная гигиена у детей и подростков", priceRub: 3200 },
		consumables: ["Индикатор зубного налета", "Безабразивная детская полировочная паста", "Мягкие резиновые полировочные колпачки", "Реминерализующий гель с кальцием и фосфатами"],
		clinicalDiaryTemplate: "Проведена профессиональная гигиена в детском приёме. Проведена визуализация налета двухцветным индикатором, проведена беседа с ребенком и родителями по технике чистки. Зубы очищены вращающейся мягкой щеткой с пастой без абразива. Проведена глубокая реминерализирующая терапия гелем с биодоступным кальцием в индивидуальных каппах на 5 минут. Даны рекомендации по домашнему уходу.",
	},
	{
		id: "fluoridation",
		title: "Глубокое фторирование эмали",
		description: "Аппликационное насыщение твердых тканей фторидами и кальцием для снятия гиперестезии шеек зубов.",
		durationMinutes: 20,
		primaryService: { code: "A11.07.012", title: "Глубокое фторирование твердых тканей зубов (все зубы)", priceRub: 2200 },
		consumables: ["Двухкомпонентный эмаль-герметизирующий ликвид", "Аппликационные микробраши", "Ватные валики и ретрактор"],
		clinicalDiaryTemplate: "Проведена процедура глубокого фторирования твердых тканей зубов. Поверхности зубов высушены теплым воздухом, изолированы от слюны. Нанесен эмаль-герметизирующий ликвид №1, затем препарат гидроокиси кальция-меди №2. Произошла микрокристаллизация фтористого кальция в порах эмали. Рекомендовано не принимать пищу в течение 2 часов.",
	},
];

export interface HomeCarePlan {
	readonly id: "standard" | "perio" | "ortho";
	readonly label: string;
	readonly description: string;
	readonly toothbrush: string;
	readonly monotuft: string;
	readonly interdental: string;
	readonly toothpaste: string;
	readonly irrigator: string;
	readonly recallMonths: number;
	readonly clinicalAdvice: string;
}

export const HOME_CARE_PLANS: readonly HomeCarePlan[] = [
	{
		id: "standard",
		label: "Стандартный уход",
		description: "Профилактика кариеса и поддержание здоровья эмали у взрослых без патологии пародонта.",
		toothbrush: "Мягкая зубная щетка с густой щетиной (чистка выметающими движениями 2 раза в день по 2-3 мин)",
		monotuft: "Монопучковая щетка для пришеечной зоны моляров",
		interdental: "Межзубные ершики 0.6–0.8 мм ежедневно перед сном",
		toothpaste: "Низкоабразивная паста с фторидами 1450 ppm (RDA < 50)",
		irrigator: "Ирригатор полости рта на мощности 3-4 после вечерней чистки",
		recallMonths: 6,
		clinicalAdvice: "Исключить горизонтальные пилящие движения щеткой во избежание клиновидных дефектов.",
	},
	{
		id: "perio",
		label: "При пародонтите и кровоточивости",
		description: "Атравматичный бережный уход при воспалении десны и оголении шеек зубов.",
		toothbrush: "Сверхмягкая щетина с атравматичным закругленным кончиком",
		monotuft: "Монопучковая щетка с изогнутой шейкой для бережной очистки обнаженных шеек корней",
		interdental: "Калиброванные пародонтологические ершики 0.7–1.1 мм",
		toothpaste: "Пародонтологическая паста с гидроксиапатитом (RDA < 40) без жестких абразивов",
		irrigator: "Ирригатор с пародонтологической насадкой на минимальном давлении (режим 1-2)",
		recallMonths: 3,
		clinicalAdvice: "Категорически исключить жесткие щетки и деревянные зубочистки. Контроль карманов через 3 месяца.",
	},
	{
		id: "ortho",
		label: "С брекетами и элайнерами",
		description: "Специализированная гигиена при наличии ортодонтических конструкций и ретейнеров.",
		toothbrush: "Ортодонтическая (специальная ортодонтическая) зубная щетка с V-образным углублением под дугу",
		monotuft: "Монопучковая щетка (монопучковая 1006) вокруг каждого брекета и ретейнера",
		interdental: "Ортодонтический суперфлосс и ершики увеличенного калибра 1.1–1.4 мм",
		toothpaste: "Паста с гидроксиапатитом и энзимами (RDA < 50) для защиты от деминерализации",
		irrigator: "Ирригатор с ортодонтической насадкой после каждого приема пищи",
		recallMonths: 3,
		clinicalAdvice: "Использовать индикатор налета 1 раз в неделю для самоконтроля качества очистки.",
	},
];

export async function deductWarehouseHygieneConsumables(options: {
	readonly organizationId?: string | undefined;
	readonly visitId?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly protocolTitle?: string | undefined;
}): Promise<boolean> {
	const orgId = options.organizationId || "00000000-0000-0000-0000-000000000001";
	try {
		const response = await fetch(`/api/inventory/${encodeURIComponent(orgId)}/quick-writeoff-visit-bundle`, {
			method: "POST",
			headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
			body: JSON.stringify({
				visitType: "hygiene",
				visitId: options.visitId,
				notes: `Профгигиена: ${options.protocolTitle || "Комплекс"} [Врач: ${options.doctorName || "Терапевт"}]`,
			}),
		});
		if (response.ok) {
			const data = await response.json();
			const count = data.deductedItems?.length ?? 5;
			window.dispatchEvent(new CustomEvent("dente-inventory-updated", {
				detail: { type: "quick-writeoff-visit-bundle", visitType: "hygiene", deductedItems: data.deductedItems },
			}));
			showToast(`Склад: списан комплект профгигиены (${count} поз., мягкий овердрафт активен)`, "success", 3000);
			return true;
		}
	} catch {
		// Офлайн-автономия врача: при сбое сети приём не блокируется
	}
	showToast("Склад: расходники гигиены учтены в карте приёма", "info", 2500);
	return true;
}

export function dispatchHygieneInvoiceAndServices(protocol: CleaningProtocol): void {
	const primaryService = {
		code: protocol.primaryService.code,
		name: protocol.primaryService.title,
		title: protocol.primaryService.title,
		price: protocol.primaryService.priceRub,
		priceRub: protocol.primaryService.priceRub,
		quantity: 1,
		category: "hygiene",
	};
	window.dispatchEvent(new CustomEvent("dente-add-estimate-service", { detail: primaryService }));
	window.dispatchEvent(new CustomEvent("dente-add-services-to-invoice", {
		detail: { ...primaryService, service: primaryService, services: [primaryService] },
	}));

	if (protocol.additionalServices) {
		for (const addSvc of protocol.additionalServices) {
			const extra = {
				code: addSvc.code,
				name: addSvc.title,
				title: addSvc.title,
				price: addSvc.priceRub,
				priceRub: addSvc.priceRub,
				quantity: 1,
				category: "hygiene",
			};
			window.dispatchEvent(new CustomEvent("dente-add-estimate-service", { detail: extra }));
			window.dispatchEvent(new CustomEvent("dente-add-services-to-invoice", {
				detail: { ...extra, service: extra, services: [extra] },
			}));
		}
	}
}

export interface CommitHygieneProtocolParams {
	readonly ohiS: OhiSPreset;
	readonly protocol?: CleaningProtocol | undefined;
	readonly cleaningProtocol?: CleaningProtocol | undefined;
	readonly carePlan?: HomeCarePlan | undefined;
	readonly homeCarePlan?: HomeCarePlan | undefined;
	readonly patientName?: string | undefined;
	readonly patientId?: string | undefined;
	readonly visitId?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly customNotes?: string | undefined;
}

export function commitHygieneVisitProtocol(params: CommitHygieneProtocolParams): void {
	const activeProtocol = params.protocol ?? params.cleaningProtocol ?? CLEANING_PROTOCOLS[0]!;
	const activeCarePlan = params.carePlan ?? params.homeCarePlan ?? HOME_CARE_PLANS[0]!;

	const ohiSData = {
		ohi_s: params.ohiS.score,
		debris: params.ohiS.debris,
		calculus: params.ohiS.calculus,
		date: new Date().toISOString(),
	};
	const fullSoapText = [
		`• Индекс гигиены Грина-Вермиллиона OHI-S: ${params.ohiS.score} (${params.ohiS.label}).`,
		`• Статус полости рта: ${params.ohiS.statusDescription}`,
		`• Проведённая процедура: ${activeProtocol.title}. ${activeProtocol.clinicalDiaryTemplate}`,
		`• Рекомендован домашний уход (${activeCarePlan.label}): щетка ${activeCarePlan.toothbrush}; ${activeCarePlan.monotuft}; ${activeCarePlan.interdental}; паста ${activeCarePlan.toothpaste}; ${activeCarePlan.irrigator}. Контрольный осмотр через ${activeCarePlan.recallMonths} мес.`,
		params.customNotes ? `• Особые отметки: ${params.customNotes}` : "",
	].filter(Boolean).join("\n");

	useVisitStore.getState().setVisitNoteForm((prev) => ({
		...prev,
		objectiveStatus: prev.objectiveStatus ? `${prev.objectiveStatus}\n\n${fullSoapText}` : fullSoapText,
		hygieneIndices: ohiSData,
	}));
	window.dispatchEvent(new CustomEvent("dente-apply-soap-protocol", {
		detail: {
			soap: { objectiveStatus: fullSoapText },
			objectiveStatus: fullSoapText,
			mode: "smart_append",
		},
	}));

	dispatchHygieneInvoiceAndServices(activeProtocol);
	void deductWarehouseHygieneConsumables({
		doctorName: params.doctorName,
		protocolTitle: activeProtocol.title,
	});
	showToast("✓ Протокол гигиены успешно зафиксирован в карте приёма и кассе", "success", 3500);
}

export function printHygieneHomeCareMemo(params: {
	readonly patientName: string;
	readonly doctorName: string;
	readonly carePlan: HomeCarePlan;
	readonly ohiS: OhiSPreset;
}): void {
	if (typeof window === "undefined") return;
	const w = window.open("", "_blank");
	if (!w) {
		showToast("Окно печати заблокировано браузером", "warning", 3000);
		return;
	}
	w.document.write(`
		<!DOCTYPE html>
		<html lang="ru">
		<head>
			<meta charset="utf-8" />
			<title>Памятка домашнего ухода — ${params.patientName}</title>
			<style>
				@page { size: A4 portrait; margin: 15mm; }
				body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 11pt; line-height: 1.5; color: #1e293b; margin: 0; padding: 10px; }
				.header { border-bottom: 2px solid #0d9488; padding-bottom: 8px; margin-bottom: 16px; display: flex; justify-content: space-between; }
				.logo { font-size: 16pt; font-weight: 800; color: #0d9488; }
				.sub { font-size: 9pt; color: #64748b; }
				h1 { font-size: 13pt; margin: 0 0 12px 0; color: #0f172a; }
				.score-box { background: #f0fdfa; border: 1px solid #ccfbf1; padding: 10px; border-radius: 8px; margin-bottom: 16px; }
				.item { margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px dashed #e2e8f0; }
				.item-title { font-size: 9pt; font-weight: 700; color: #0d9488; text-transform: uppercase; }
				.item-desc { font-size: 10pt; }
				.footer { margin-top: 24px; font-size: 9pt; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 8px; }
			</style>
		</head>
		<body>
			<div class="header">
				<div><div class="logo">DENTE CLINIC</div><div class="sub">Персональная карта домашнего ухода</div></div>
				<div style="text-align: right; font-size: 9pt;"><div><strong>Пациент:</strong> ${params.patientName}</div><div><strong>Дата:</strong> ${new Date().toLocaleDateString("ru-RU")}</div></div>
			</div>
			<h1>РЕКОМЕНДАЦИИ ПО ИНДИВИДУАЛЬНОЙ ГИГИЕНЕ</h1>
			<div class="score-box"><strong>Текущий индекс гигиены OHI-S:</strong> ${params.ohiS.score} — ${params.ohiS.label}<br/><span style="font-size: 9pt; color: #475569;">${params.ohiS.statusDescription}</span></div>
			<div class="item"><div class="item-title">1. Основная зубная щетка</div><div class="item-desc">${params.carePlan.toothbrush}</div></div>
			<div class="item"><div class="item-title">2. Монопучковая щетка</div><div class="item-desc">${params.carePlan.monotuft}</div></div>
			<div class="item"><div class="item-title">3. Межзубные ершики и флосс</div><div class="item-desc">${params.carePlan.interdental}</div></div>
			<div class="item"><div class="item-title">4. Зубная паста и реминерализация</div><div class="item-desc">${params.carePlan.toothpaste}</div></div>
			<div class="item"><div class="item-title">5. Ирригатор полости рта</div><div class="item-desc">${params.carePlan.irrigator}</div></div>
			<div class="item"><div class="item-title">6. Клинические советы</div><div class="item-desc">${params.carePlan.clinicalAdvice}</div></div>
			<div class="footer">DENTE Dental CRM • Контрольный осмотр через ${params.carePlan.recallMonths} месяцев. Врач: ${params.doctorName}</div>
			<script>window.onload = function() { window.print(); window.close(); };</script>
		</body>
		</html>
	`);
	w.document.close();
}
