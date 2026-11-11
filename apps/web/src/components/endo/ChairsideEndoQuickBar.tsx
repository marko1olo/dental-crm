/**
 * DENTE Dental CRM — Chairside Endodontic QuickBar SSOT
 * apps/web/src/components/endo/ChairsideEndoQuickBar.tsx
 *
 * Монолитная компактная экспресс-полоса эндодонтии у кресла врача (Мандаты 8e, 8n, 8am).
 * Ровно 1 Primary CTA кнопка #0d9488, 1-клик анатомические нормы, списание материалов в бэке.
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { ChevronDown, ExternalLink, Plus, SlidersHorizontal, Trash2, Check } from "lucide-react";
import type { EndoCanalData } from "@dental/shared";
import { getToothAnatomicalNameRu } from "../../lib/clinicalProtocols";
import { showToast } from "../GlobalToast";
import { useVisitStore } from "../../store/visitStore";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import {
	calculateEndoBillingAndMaterialsEstimate, getChairsideDefaultCanals, getAnatomicalWorkingLength,
	type EndoStageStamp, type QuickCanalState,
} from "./endodonticsCatalogData";
export { getChairsideDefaultCanals, type QuickCanalState, type EndoStageStamp };

export interface ChairsideEndoQuickBarProps {
	readonly activeTooth?: number | undefined; readonly toothState?: string | undefined; readonly patientId?: string | undefined;
	readonly isLocked?: boolean | undefined; readonly onInsertToDiary?: ((soapText: string, canals: EndoCanalData[]) => void) | undefined;
	readonly onOpenFullModal?: (() => void) | undefined; readonly className?: string | undefined;
}

export const QUICK_LENGTH_CHIPS = [19, 20, 21, 21.5, 22] as const;
export const QUICK_MAF_OPTIONS = [
	{ label: "25/.04", maf: "#25", taper: ".04", system: "ProTaper / NiTi" },
	{ label: "30/.04", maf: "#30", taper: ".04", system: "ProTaper / NiTi" },
	{ label: "25/.06", maf: "#25", taper: ".06", system: "ProTaper / NiTi" },
	{ label: "20/.04", maf: "#20", taper: ".04", system: "ProTaper / NiTi" },
] as const;

/** Генерация чистого SOAP-протокола эндодонтии без сырого канцелярита (Мандат 8x) */
export function generateSoapEndoProtocol({
	activeTooth, toothNumber, toothAnatomicalName = "Моляр", currentCanals = [], toothState,
}: {
	activeTooth?: number; toothNumber?: number; toothAnatomicalName?: string; currentCanals?: QuickCanalState[]; toothState?: string | undefined;
}): string {
	const toothNum = activeTooth ?? toothNumber ?? 46;
	const canals = Array.isArray(currentCanals) && currentCanals.length > 0 ? currentCanals : [
		{ name: "Дистальный", workingLengthMm: getAnatomicalWorkingLength(toothNum, "Дистальный"), masterApicalFile: "25", taper: "06", obturationType: "gutta_percha_ah_plus", sealer: "AH Plus", isObliterated: false },
		{ name: "Медиальный", workingLengthMm: getAnatomicalWorkingLength(toothNum, "Медиальный"), masterApicalFile: "25", taper: "04", obturationType: "gutta_percha_ah_plus", sealer: "AH Plus", isObliterated: false },
	];
	const isTemp = canals.every((c) => c.obturationType === "temp_caoh2");
	const isBio = canals.some((c) => c.obturationType === "bioceramic");
	const isPeriodontitis = Boolean(isBio || isTemp || (toothState && /периодонтит|periodontitis|k04\.5|k04\.4|k04\.6|гранулем|кист/i.test(toothState)));

	const canalsReport = canals.map((c) => {
		if (c.isObliterated) return `• Канал ${c.name}: ОБЛИТЕРИРОВАН / склерозирован (устье склерозировано, 0 мм)`;
		const obt = c.obturationType === "temp_caoh2"
			? `временная паста гидроксида кальция ${c.sealer || "Ca(OH)2 (Каласепт/Метапекс)"}`
			: c.obturationType === "bioceramic"
				? `постоянная обтурация гуттаперчей + биокерамика (${c.sealer || "BioRoot"})`
				: `обтурация гуттаперчей с ${c.sealer || "AH Plus"} методом латеральной компакции`;
		const len = c.workingLengthMm > 0 ? c.workingLengthMm.toFixed(1) : getAnatomicalWorkingLength(toothNum, c.name).toFixed(1);
		const apexStr = c.apexLocatorReading ? c.apexLocatorReading : "0.0 Apex";
		return `• Канал ${c.name}: пройден, WL = ${len} мм (Apex: ${apexStr}), MAF = ${c.masterApicalFile}/${c.taper}, ${obt}`;
	}).join("\n");

	const canalNamesRu = canals.map((c) => c.name).join(", ");
	const defaultDiagnosis = isPeriodontitis ? "Хронический апикальный периодонтит (K04.5)" : "Острый очаговый пульпит (K04.0)";
	const diagnosisRu = toothState || defaultDiagnosis;

	if (isTemp) {
		return `[ПРОТОКОЛ ЭНДОДОНТИИ: ЗУБ #${toothNum} (${toothAnatomicalName}) — ПЕРИОДОНТИТ 1-Й ВИЗИТ]\nS: Жалобы на боли при накусывании и чувство распирания в области зуба #${toothNum}.\nO: Проведена анестезия, изоляция операционного поля коффердамом. Раскрытие полости зуба #${toothNum}, эвакуация распада пульпы.\nМехобработка корневых каналов (${canalNamesRu}) машинной системой NiTi:\n${canalsReport}\nИрригация: медикаментозная обработка раствором 3% NaOCl с УЗ-активацией и 17% EDTA, высушивание бумажными штифтами.\nA: ${diagnosisRu} зуба #${toothNum}.\nP: Проведена временная обтурация корневых каналов лечебной пастой гидроксида кальция Ca(OH)2 (Каласепт/Метапекс). Наложена герметичная повязка. Назначен 2-й визит через 10–14 дней.`;
	}
	if (isPeriodontitis) {
		const sealerName = canals[0]?.sealer || (isBio ? "BioRoot" : "AH Plus");
		const obturationMethodRu = isBio
			? `гуттаперча + биокерамический силер (${sealerName})`
			: `гуттаперча с эпоксидным силером ${sealerName} методом латеральной компакции`;
		return `[ПРОТОКОЛ ЭНДОДОНТИИ: ЗУБ #${toothNum} (${toothAnatomicalName}) — ПЕРИОДОНТИТ 2-Й ВИЗИТ (ПОСТОЯННАЯ ОБТУРАЦИЯ)]\nS: Жалоб нет, герметичная повязка сохранена, перкуссия безболезненна.\nO: Изоляция операционного поля коффердамом. Удаление временной повязки и эвакуация лечебной пасты Ca(OH)2 из каналов.\nИнструментальная калибровка каналов (${canalNamesRu}):\n${canalsReport}\nИрригация: 3% раствор NaOCl с УЗ-активацией, 17% EDTA, окончательное высушивание бумажными штифтами.\nA: ${diagnosisRu} зуба #${toothNum}.\nP: Постоянная обтурация корневых каналов: ${obturationMethodRu} до физиологического апекса. Рентген-контроль (визиография): каналы гомогенно обтурированы до апекса. Поставлена герметичная реставрация.`;
	}
	return `[ПРОТОКОЛ ЭНДОДОНТИИ: ЗУБ #${toothNum} (${toothAnatomicalName}) — ПУЛЬПИТ В 1 ВИЗИТ]\nS: Жалобы на острые температурные и самопроизвольные боли в зубе #${toothNum}.\nO: Проведена анестезия, изоляция операционного поля коффердамом. Раскрытие полости зуба #${toothNum}, экстирпация пульпы.\nМехобработка машинной системой NiTi (ProTaper/WaveOne до F2):\n${canalsReport}\nМедикаментозная обработка: 3% раствор NaOCl с УЗ-активацией и 17% EDTA. Высушивание бумажными штифтами.\nA: ${diagnosisRu} зуба #${toothNum}.\nP: Обтурация гуттаперчей с AH Plus методом латеральной компакции до физиологического апекса. Рентген-контроль (визиография): каналы обтурированы до верхушки, гомогенно. Поставлена герметичная повязка/реставрация.`;
}

/** Сохранение параметров каналов в Fastify API и списание расходников (Мандаты 8e, 8n) */
export function executeChairsideTransferToDiary({
	activeTooth, toothAnatomicalName, toothState, canals, patientId, onInsertToDiary,
}: {
	activeTooth: number; toothAnatomicalName: string; toothState?: string | undefined;
	canals: QuickCanalState[]; patientId?: string | undefined;
	onInsertToDiary?: ((soapText: string, canals: EndoCanalData[]) => void) | undefined;
}): void {
	const isTemp = canals.every((c) => c.obturationType === "temp_caoh2");
	const isBio = canals.some((c) => c.obturationType === "bioceramic");
	const stageStamp: EndoStageStamp = isTemp ? "TEMP_CAOH2" : "COMPLETED";
	const soapProtocol = generateSoapEndoProtocol({ activeTooth, toothAnatomicalName, currentCanals: canals, toothState });

	try {
		useVisitStore.getState().setVisitNoteForm((prev) => ({
			...prev,
			objectiveStatus: prev.objectiveStatus?.trim() ? `${prev.objectiveStatus.trim()}\n\n${soapProtocol}` : soapProtocol,
			treatmentPlan: prev.treatmentPlan?.trim() ? `${prev.treatmentPlan.trim()}\nЭндо зуба #${activeTooth}` : `Эндо зуба #${activeTooth}`,
		}));
	} catch { /* safe */ }

	const sharedCanals: EndoCanalData[] = canals.map((c) => ({
		id: c.id, canalName: c.name, referencePoint: "Бугор",
		workingLengthMm: c.isObliterated ? 0 : (c.workingLengthMm || getAnatomicalWorkingLength(activeTooth, c.name)),
		masterApicalFile: c.masterApicalFile || "#25", taper: c.taper || ".04", isObliterated: Boolean(c.isObliterated),
		apexLocatorReading: c.apexLocatorReading || "0.0 (Apex)", masterFile: c.masterFile || c.masterApicalFile || "#25",
		masterCone: c.masterCone || "Гуттаперча 0.04",
		obturationTechnique: c.obturationType === "temp_caoh2" ? "Временная обтурация Ca(OH)2" : c.obturationType === "bioceramic" ? "Биокерамика (гуттаперча + биокерамический силер)" : "Латеральная компакция",
		sealer: c.sealer || (c.obturationType === "temp_caoh2" ? "Каласепт (Ca(OH)2)" : c.obturationType === "bioceramic" ? "Биокерамика (BioRoot)" : "AH Plus"),
	}));

	const allApex00 = canals.every((c) => !c.apexLocatorReading || c.apexLocatorReading.includes("0.0"));
	const dynamicApexLocator = allApex00 ? "0.0 Apex" : canals.map((c) => `${c.name}: ${c.apexLocatorReading || "0.0 Apex"}`).join("; ");

	try {
		const billing = calculateEndoBillingAndMaterialsEstimate({
			toothNumber: activeTooth, canals: sharedCanals, stageStamp,
			obturationTechnique: isTemp ? "Временная обтурация Ca(OH)2" : isBio ? "Биокерамика (гуттаперча + биокерамический силер)" : "Гуттаперча + Силер (AH Plus)",
			sealer: canals[0]?.sealer || "AH Plus",
		});

		if (typeof window !== "undefined" && billing.services804n.length > 0) {
			window.dispatchEvent(new CustomEvent("dente-add-services-to-invoice", {
				detail: {
					toothNumber: activeTooth, teethNumbers: [activeTooth],
					services: billing.services804n.map((s) => ({
						code: s.code804n, code804n: s.code804n, name: s.title, nameRu: s.title,
						price: s.priceRub, priceRub: s.priceRub, quantity: s.quantity || 1,
						toothNumber: activeTooth, category: "Эндодонтия",
					})),
				},
			}));

			for (const mat of billing.materials) {
				fetch("/api/inventory/soft-overdraft-deduct", {
					method: "POST", headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
					body: JSON.stringify({ itemId: mat.itemId, itemName: mat.itemName, quantity: mat.quantity, reason: `Эндодонтический протокол зуба #${activeTooth}` }),
				}).catch(() => {});
			}
		}
	} catch { /* soft */ }
	if (patientId) {
		fetch(`/api/patients/${patientId}/tooth-states/${activeTooth}/endo`, {
			method: "POST", headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
			body: JSON.stringify({ toothNumber: activeTooth, canals: sharedCanals, irrigation: "3% NaOCl + 17% EDTA с УЗ-активацией", rotarySystem: "Машинная обработка NiTi", radiologyControl: "Контрольная радиовизиография: каналы гомогенно обтурированы до апекса.", apexLocator: dynamicApexLocator, stageStamp, notes: "" }),
		}).catch(() => {});
	}

	if (onInsertToDiary) onInsertToDiary(soapProtocol, sharedCanals);
	showToast(`Протокол эндодонтии зуба #${activeTooth} перенесён в дневник!`, "success", 3000);
}

export function ChairsideEndoQuickBar(props: ChairsideEndoQuickBarProps) {
	const activeTooth = props.activeTooth || 16;
	const toothAnatomicalName = useMemo(() => getToothAnatomicalNameRu(activeTooth), [activeTooth]);
	const [canals, setCanals] = useState<QuickCanalState[]>(() => getChairsideDefaultCanals(activeTooth));
	const [explicitProtocolType, setExplicitProtocolType] = useState<"pulpitis" | "periodontitis_ahplus" | "periodontitis_bio" | "temp_caoh2" | null>(null);

	useEffect(() => {
		setCanals(getChairsideDefaultCanals(activeTooth));
		setExplicitProtocolType(null);
	}, [activeTooth]);

	const updateCanal = useCallback((id: string, patch: Partial<QuickCanalState>) => {
		setCanals((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
	}, []);

	const adjustLength = useCallback((id: string, delta: number) => {
		setCanals((prev) => prev.map((c) => {
			if (c.id !== id) return c;
			const curLen = c.workingLengthMm || getAnatomicalWorkingLength(activeTooth, c.name);
			const next = Math.max(10, Math.min(35, Math.round((curLen + delta) * 2) / 2));
			return { ...c, workingLengthMm: next, isObliterated: false };
		}));
	}, [activeTooth]);

	const applyPulpitis1Visit = useCallback(() => {
		setExplicitProtocolType("pulpitis");
		setCanals((prev) => prev.map((c) => ({ ...c, obturationType: "gutta_sealer", sealer: "AH Plus", masterApicalFile: "#25", taper: ".04", isObliterated: false })));
		showToast("Применён протокол: Пульпит в 1 визит (AH Plus)", "info", 2000);
	}, []);
	const applyPeriodontitisAhPlus = useCallback(() => {
		setExplicitProtocolType("periodontitis_ahplus");
		setCanals((prev) => prev.map((c) => ({ ...c, obturationType: "gutta_sealer", sealer: "AH Plus", masterApicalFile: "#25", taper: ".04", isObliterated: false })));
		showToast("Применён протокол: Периодонтит 2 эт. (AH Plus)", "info", 2000);
	}, []);
	const applyPeriodontitisBio = useCallback(() => {
		setExplicitProtocolType("periodontitis_bio");
		setCanals((prev) => prev.map((c) => ({ ...c, obturationType: "bioceramic", sealer: "BioRoot", masterApicalFile: "#30", taper: ".04", isObliterated: false })));
		showToast("Применён протокол: Периодонтит (Биокерамика)", "info", 2000);
	}, []);
	const applyCaOh2 = useCallback(() => {
		setExplicitProtocolType("temp_caoh2");
		setCanals((prev) => prev.map((c) => ({ ...c, obturationType: "temp_caoh2", sealer: "Каласепт (Ca(OH)2)", masterApicalFile: "#25", taper: ".04", isObliterated: false })));
		showToast("Применён протокол: Временное вложение Ca(OH)2", "info", 2000);
	}, []);

	const applyNorm = useCallback(() => {
		setExplicitProtocolType(null);
		setCanals(getChairsideDefaultCanals(activeTooth));
		showToast("Восстановлена анатомическая норма каналов", "info", 2000);
	}, [activeTooth]);

	const addCanal = useCallback(() => {
		const nextIdx = canals.length + 1;
		const isUpper = (activeTooth >= 11 && activeTooth <= 28) || (activeTooth >= 51 && activeTooth <= 65);
		const existingNames = new Set(canals.map((c) => c.name));
		let suggestedName = `К${nextIdx}`;
		if (isUpper) {
			if (!existingNames.has("MB2")) suggestedName = "MB2";
			else if (!existingNames.has("DB2")) suggestedName = "DB2";
		} else {
			if (!existingNames.has("DL")) suggestedName = "DL";
			else if (!existingNames.has("DB")) suggestedName = "DB";
			else if (!existingNames.has("MM")) suggestedName = "MM";
			else if (!existingNames.has("Radix")) suggestedName = "Radix";
		}
		setCanals((prev) => [...prev, { id: `c-add-${Date.now()}-${nextIdx}`, name: suggestedName, workingLengthMm: getAnatomicalWorkingLength(activeTooth, suggestedName), masterApicalFile: "#25", taper: ".04", obturationType: "gutta_sealer", sealer: "AH Plus" }]);
	}, [activeTooth, canals]);

	const removeCanal = useCallback((id: string) => {
		if (canals.length <= 1) return;
		setCanals((prev) => prev.filter((c) => c.id !== id));
	}, [canals.length]);

	return (
		<div className={`border border-[var(--line,#e2e8f0)] dark:border-slate-800 rounded-2xl bg-[var(--paper,#ffffff)] dark:bg-slate-900/90 shadow-xs overflow-hidden ${props.className || ""}`} data-testid="chairside-endo-quickbar">
			<div className="flex flex-wrap items-center justify-between gap-2.5 p-3 sm:p-3.5 bg-[var(--surface,#f8fafc)] dark:bg-slate-900/80 border-b border-[var(--line,#e2e8f0)] dark:border-slate-800">
				<div className="flex items-center gap-2.5 min-w-0">
					<div className="w-8 h-8 rounded-xl bg-[var(--teal,#0d9488)]/15 text-[var(--teal,#0d9488)] font-bold text-xs flex items-center justify-center shrink-0">#{activeTooth}</div>
					<div className="min-w-0">
						<div className="flex items-center gap-1.5 flex-wrap">
							<span className="text-xs sm:text-sm font-bold text-[var(--ink,#0f172a)] dark:text-white truncate">Зуб #{activeTooth}: {toothAnatomicalName}</span>
							{props.toothState && <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 truncate">{props.toothState}</span>}
						</div>
						<p className="text-[11px] text-[var(--muted,#64748b)] hidden sm:block truncate">Протокол эндодонтии у кресла (автономия врача, физиологическая норма)</p>
					</div>
				</div>
				<div className="flex items-center gap-1.5 flex-wrap">
					<button type="button" onClick={applyPulpitis1Visit} className="btn-quick-pulpitis-1visit min-h-[36px] h-8 px-2.5 rounded-lg text-[11px] font-semibold bg-[var(--paper-strong,#ffffff)] dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-[var(--line,#cbd5e1)] dark:border-slate-700 transition-colors cursor-pointer">Пульпит (1 визит)</button>
					<button type="button" onClick={applyPeriodontitisAhPlus} className="btn-quick-periodontitis-ahplus min-h-[36px] h-8 px-2.5 rounded-lg text-[11px] font-semibold bg-[var(--paper-strong,#ffffff)] dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-[var(--line,#cbd5e1)] dark:border-slate-700 transition-colors cursor-pointer" data-testid="btn-quick-periodontitis-ahplus">Периодонтит (AH Plus)</button>
					<button type="button" onClick={applyPeriodontitisBio} className="btn-quick-periodontitis-bio min-h-[36px] h-8 px-2.5 rounded-lg text-[11px] font-semibold bg-[var(--paper-strong,#ffffff)] dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-[var(--line,#cbd5e1)] dark:border-slate-700 transition-colors cursor-pointer">Периодонтит (Био)</button>
					<button type="button" onClick={applyCaOh2} className="btn-quick-caoh2 min-h-[36px] h-8 px-2.5 rounded-lg text-[11px] font-semibold bg-[var(--paper-strong,#ffffff)] dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-[var(--line,#cbd5e1)] dark:border-slate-700 transition-colors cursor-pointer">Ca(OH)2</button>
					<button type="button" onClick={applyNorm} className="btn-quick-norm min-h-[36px] h-8 px-2.5 rounded-lg text-[11px] font-semibold bg-[var(--paper-strong,#ffffff)] dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-[var(--line,#cbd5e1)] dark:border-slate-700 transition-colors cursor-pointer" title="Восстановить анатомическую норму">Норма</button>
					{props.onOpenFullModal && (
						<button type="button" onClick={props.onOpenFullModal} className="min-h-[36px] h-8 px-2 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white border border-[var(--line,#cbd5e1)] dark:border-slate-700 flex items-center gap-1 text-[11px] cursor-pointer" title="Развернуть полный журнал каналов">
							<ExternalLink size={13} /><span className="hidden md:inline">Журнал</span>
						</button>
					)}
				</div>
			</div>

			<details className="group border-t border-[var(--line,#e2e8f0)] dark:border-slate-800" open data-testid="endo-canals-accordion">
				<summary className="flex items-center justify-between p-2.5 sm:p-3 cursor-pointer select-none bg-[var(--surface,#f8fafc)] dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors list-none">
					<div className="flex items-center gap-2 min-w-0">
						<SlidersHorizontal size={14} className="text-[var(--teal,#0d9488)] shrink-0" />
						<span className="text-xs font-bold text-[var(--ink,#0f172a)] dark:text-white truncate">Детализация каналов (для эндодонтиста)</span>
						<span className="text-[11px] font-medium text-[var(--muted,#64748b)] hidden sm:inline">({canals.length} {canals.map((c) => c.name).join(", ")})</span>
					</div>
					<ChevronDown size={14} className="text-[var(--muted,#64748b)] transition-transform duration-200 group-open:rotate-180 shrink-0" />
				</summary>

				<div className="p-2.5 sm:p-3 border-t border-[var(--line,#e2e8f0)] dark:border-slate-800/80 divide-y divide-[var(--line,#e2e8f0)] dark:divide-slate-800/80 space-y-2.5">
					{canals.map((c) => (
						<div key={c.id} className="pt-2 first:pt-0 space-y-2">
							<div className="flex items-center justify-between gap-2 flex-wrap">
								<div className="flex items-center gap-1.5 flex-wrap">
									<span className="font-bold text-xs text-[var(--ink,#0f172a)] dark:text-white">Канал {c.name}</span>
									<span className="text-[11px] font-semibold text-[var(--teal,#0d9488)]">{c.isObliterated ? "ОБЛИТЕРИРОВАН" : `${c.workingLengthMm.toFixed(1)} мм`}</span>
									<div className="flex items-center gap-1">
										<span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold" title="Apex 0.0">Apex 0.0</span>
										{(["-0.5", "0.0", "+0.5"] as const).map((ap) => (
											<button key={ap} type="button" onClick={() => updateCanal(c.id, { apexLocatorReading: `${ap} Apex` })} className={`px-1.5 py-0.5 rounded text-[10px] font-mono border transition-all cursor-pointer ${(c.apexLocatorReading || "0.0 Apex").startsWith(ap) ? "bg-emerald-600 text-white border-emerald-600 font-bold" : "bg-[var(--surface,#f8fafc)] dark:bg-slate-800 text-slate-500 border-[var(--line,#cbd5e1)] dark:border-slate-700 hover:bg-slate-100"}`}>{ap}</button>
										))}
									</div>
								</div>
								<div className="flex items-center gap-1.5">
									<label className="flex items-center gap-1 text-[11px] text-[var(--muted,#64748b)] cursor-pointer">
										<input type="checkbox" checked={Boolean(c.isObliterated)} onChange={(e) => updateCanal(c.id, { isObliterated: e.target.checked, workingLengthMm: e.target.checked ? 0 : getAnatomicalWorkingLength(activeTooth, c.name) })} className="rounded text-[var(--teal,#0d9488)]" />
										<span>Склероз</span>
									</label>
									{canals.length > 1 && (
										<button type="button" onClick={() => removeCanal(c.id)} className="w-7 h-7 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center justify-center cursor-pointer" title="Удалить канал">
											<Trash2 size={13} />
										</button>
									)}
								</div>
							</div>

							<div className="flex items-center gap-1.5 flex-wrap">
								<span className="text-[11px] text-[var(--muted,#64748b)] font-medium">Длина:</span>
								<div className="flex items-center gap-1">
									<button type="button" onClick={() => adjustLength(c.id, -0.5)} className="w-6 h-6 rounded border border-[var(--line,#cbd5e1)] dark:border-slate-700 text-xs font-bold flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">-</button>
									<button type="button" onClick={() => adjustLength(c.id, 0.5)} className="w-6 h-6 rounded border border-[var(--line,#cbd5e1)] dark:border-slate-700 text-xs font-bold flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">+</button>
								</div>
								{QUICK_LENGTH_CHIPS.map((len) => (
									<button key={len} type="button" onClick={() => updateCanal(c.id, { workingLengthMm: len, isObliterated: false })} className={`chip-length-${c.name}-${len} ${c.name === "MB1" ? `chip-length-MB-${len}` : ""} px-2 py-0.5 rounded-md text-[11px] font-semibold border transition-all cursor-pointer ${c.workingLengthMm === len && !c.isObliterated ? "bg-[var(--teal,#0d9488)] text-white border-[var(--teal,#0d9488)]" : "bg-[var(--paper-strong,#ffffff)] dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-[var(--line,#cbd5e1)] dark:border-slate-700 hover:bg-slate-50"}`}>
										{len}
									</button>
								))}
							</div>

							<div className="flex items-center gap-2 flex-wrap text-[11px]">
								<div className="flex items-center gap-1 flex-wrap">
									<span className="text-[var(--muted,#64748b)] font-medium">MAF:</span>
									{QUICK_MAF_OPTIONS.map((opt) => {
										const cleanKey = `${opt.maf.replace("#", "")}${opt.taper.replace(".", "")}`;
										const isSelected = c.masterApicalFile === opt.maf && c.taper === opt.taper;
										return (
											<button key={opt.label} type="button" onClick={() => updateCanal(c.id, { masterApicalFile: opt.maf, taper: opt.taper })} className={`chip-maf-${c.name}-${cleanKey} ${c.name === "MB1" ? `chip-maf-MB-${cleanKey}` : ""} px-2 py-0.5 rounded-md font-semibold border transition-all cursor-pointer ${isSelected ? "bg-[var(--teal,#0d9488)] text-white border-[var(--teal,#0d9488)]" : "bg-[var(--paper-strong,#ffffff)] dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-[var(--line,#cbd5e1)] dark:border-slate-700 hover:bg-slate-50"}`}>
												{opt.label}
											</button>
										);
									})}
								</div>
								<div className="flex items-center gap-1 flex-wrap">
									<span className="text-[var(--muted,#64748b)] font-medium">Силер:</span>
									<button type="button" onClick={() => updateCanal(c.id, { obturationType: "gutta_sealer", sealer: "AH Plus" })} className={`chip-obturation-gutta-${c.name} ${c.name === "MB1" ? `chip-obturation-gutta-MB` : ""} px-2 py-0.5 rounded-md font-semibold border transition-all cursor-pointer ${c.obturationType === "gutta_sealer" ? "bg-[var(--teal,#0d9488)] text-white border-[var(--teal,#0d9488)]" : "bg-[var(--paper-strong,#ffffff)] dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-[var(--line,#cbd5e1)] dark:border-slate-700"}`}>AH Plus</button>
									<button type="button" onClick={() => updateCanal(c.id, { obturationType: "bioceramic", sealer: "BioRoot" })} className={`chip-obturation-bio-${c.name} ${c.name === "MB1" ? `chip-obturation-bio-MB` : ""} px-2 py-0.5 rounded-md font-semibold border transition-all cursor-pointer ${c.obturationType === "bioceramic" ? "bg-[var(--teal,#0d9488)] text-white border-[var(--teal,#0d9488)]" : "bg-[var(--paper-strong,#ffffff)] dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-[var(--line,#cbd5e1)] dark:border-slate-700"}`}>Биокерамика</button>
									<button type="button" onClick={() => updateCanal(c.id, { obturationType: "temp_caoh2", sealer: "Каласепт (Ca(OH)2)" })} className={`chip-obturation-caoh2-${c.name} ${c.name === "MB1" ? `chip-obturation-caoh2-MB` : ""} px-2 py-0.5 rounded-md font-semibold border transition-all cursor-pointer ${c.obturationType === "temp_caoh2" ? "bg-[var(--teal,#0d9488)] text-white border-[var(--teal,#0d9488)]" : "bg-[var(--paper-strong,#ffffff)] dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-[var(--line,#cbd5e1)] dark:border-slate-700"}`}>Ca(OH)2</button>
								</div>
							</div>
						</div>
					))}
				</div>
			</details>

			<div className="flex items-center justify-between gap-2 p-2.5 sm:p-3 border-t border-[var(--line,#e2e8f0)] dark:border-slate-800 bg-[var(--surface,#f8fafc)] dark:bg-slate-900/90">
				<button type="button" onClick={addCanal} className="min-h-[44px] sm:min-h-[36px] h-10 sm:h-9 px-3 rounded-xl text-xs font-semibold bg-[var(--paper-strong,#ffffff)] dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-[var(--line,#cbd5e1)] dark:border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer">
					<Plus size={14} className="text-[var(--teal,#0d9488)]" />
					<span>Добавить канал</span>
				</button>
				<button
					type="button"
					onClick={() => {
						const effToothState = props.toothState || (explicitProtocolType === "periodontitis_ahplus" || explicitProtocolType === "periodontitis_bio" || explicitProtocolType === "temp_caoh2" ? "Хронический апикальный периодонтит (K04.5)" : undefined);
						executeChairsideTransferToDiary({ activeTooth, toothAnatomicalName, toothState: effToothState, canals, patientId: props.patientId, onInsertToDiary: props.onInsertToDiary });
					}}
					className="btn-endo-transfer-to-diary min-h-[44px] sm:min-h-[36px] h-10 sm:h-9 px-4 sm:px-5 rounded-xl text-xs sm:text-sm font-bold bg-[var(--teal,#0d9488)] hover:bg-[#0f766e] active:scale-98 text-white flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
					title="Перенести протокол эндодонтии в карту приёма и начислить услуги"
				>
					<Check size={16} />
					<span>Перенести в дневник</span>
				</button>
			</div>
		</div>
	);
}

export default ChairsideEndoQuickBar;
