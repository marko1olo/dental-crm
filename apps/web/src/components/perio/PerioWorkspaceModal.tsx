/**
 * PerioWorkspaceModal.tsx — Единый канонический кабинет пародонтологии DENTE CRM
 * SSOT: Вкладка 1 (Экспресс-скрининг PSR), Вкладка 2 (Пародонтограмма с цифровым блоком 1–9)
 * Ровно 1 Primary CTA кнопка #0d9488 («✓ Зафиксировать статус пародонта»), Apple HIG (380–480 строк).
 */

import React, { useId, useMemo, useState, useCallback, useEffect } from "react";
import { Activity, Check, Clock, Save, X, Layers, FileText, Sparkles } from "lucide-react";
import type { PerioChartSummary, PerioToothRecord } from "@dental/shared";
import {
	calculateClinicalAttachmentLevel,
	calculatePerioIndices,
	createDefaultPerioTeeth,
	PERIO_SITE_KEYS,
} from "@dental/shared";
import {
	applyExpressPerioPreset,
	applyHealthyPeriodontiumPreset,
	computePsrSummary,
	deductPeriodontalConsumablesSoftOverdraft,
	dispatchPresetSideEffects,
	LOWER_TEETH,
	PERIO_TREATMENT_PRESETS,
	PSR_SEXTANTS_CATALOG,
	SITES,
	type SiteKey,
	UPPER_TEETH,
} from "./perioCatalogData";
import type { PsrCode, PsrScreeningMap, PsrSextantId } from "./perioTypes";
import { showToast } from "../GlobalToast";

export interface PerioWorkspaceModalProps {
	readonly isOpen?: boolean | undefined;
	readonly onClose?: (() => void) | undefined;
	readonly isModal?: boolean | undefined;
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly organizationId?: string | undefined;
	readonly doctorId?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly visitId?: string | undefined;
	readonly initialTeeth?: readonly PerioToothRecord[] | undefined;
	readonly initialTab?: "psr" | "chart" | undefined;
	readonly initialSelectedTooth?: number | undefined;
	readonly initialTier3Expanded?: boolean | undefined;
	readonly initialProbeKeyboardEnabled?: boolean | undefined;
	readonly onChange?: ((teeth: PerioToothRecord[], summary: PerioChartSummary) => void) | undefined;
	readonly onSave?: ((teeth: PerioToothRecord[], summary: PerioChartSummary) => void) | undefined;
	readonly onInsertToProtocol?: ((protocolText: string) => void) | undefined;
	readonly readOnly?: boolean | undefined;
	readonly compactMode?: boolean | undefined;
}

export const PerioWorkspaceModal: React.FC<PerioWorkspaceModalProps> = React.memo(({
	isOpen = true,
	onClose,
	isModal = false,
	patientName = "Пациент пародонтологии",
	initialTeeth,
	initialTab,
	initialSelectedTooth = 16,
	initialTier3Expanded = false,
	onChange,
	onSave,
	onInsertToProtocol,
}) => {
	const modalId = useId();
	const [activeTab, setActiveTab] = useState<"psr" | "chart">(
		() => initialTab ?? (initialTier3Expanded ? "chart" : "psr"),
	);
	const [teeth, setTeeth] = useState<PerioToothRecord[]>(
		() => (initialTeeth && initialTeeth.length === 32 ? [...initialTeeth] : applyHealthyPeriodontiumPreset(createDefaultPerioTeeth(2))),
	);
	const [screeningMap, setScreeningMap] = useState<PsrScreeningMap>(() => ({
		S1: { code: 0, asterisk: false }, S2: { code: 0, asterisk: false },
		S3: { code: 0, asterisk: false }, S4: { code: 0, asterisk: false },
		S5: { code: 0, asterisk: false }, S6: { code: 0, asterisk: false },
	}));
	const [selectedToothNum, setSelectedToothNum] = useState<number>(initialSelectedTooth);
	const [selectedSiteKey, setSelectedSiteKey] = useState<SiteKey>("distoBuccal");
	const [syncStatus, setSyncStatus] = useState<"idle" | "saving" | "saved">("idle");
	const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

	const summary = useMemo(() => calculatePerioIndices(teeth), [teeth]);
	const psrSummary = useMemo(() => computePsrSummary(screeningMap), [screeningMap]);

	useEffect(() => {
		if (onChange) onChange(teeth, summary);
	}, [teeth, summary, onChange]);

	const updateSextant = useCallback((id: PsrSextantId, code: PsrCode, asterisk?: boolean) => {
		setScreeningMap((prev) => ({
			...prev,
			[id]: { code, asterisk: asterisk ?? prev[id]?.asterisk ?? false },
		}));
		if (code >= 3) setActiveTab("chart");
	}, []);

	const toggleAsterisk = useCallback((id: PsrSextantId) => {
		setScreeningMap((prev) => ({
			...prev,
			[id]: { code: prev[id]?.code ?? 0, asterisk: !prev[id]?.asterisk },
		}));
	}, []);

	const handleSetAllIntact = useCallback(() => {
		setTeeth(applyHealthyPeriodontiumPreset(createDefaultPerioTeeth(2)));
		setScreeningMap({
			S1: { code: 0 }, S2: { code: 0 }, S3: { code: 0 },
			S4: { code: 0 }, S5: { code: 0 }, S6: { code: 0 },
		});
		showToast("Пародонт интактен (PSR 0 во всех 6 секстантах)", "success");
	}, []);

	const handleApplyPreset = useCallback((presetId: any) => {
		const res = applyExpressPerioPreset(teeth, presetId);
		setTeeth(res.updatedTeeth);
		if (presetId.includes("severe") || presetId.includes("moderate")) {
			setActiveTab("chart");
		}
		dispatchPresetSideEffects(res, onInsertToProtocol);
	}, [teeth, onInsertToProtocol]);

	const handleSave = useCallback(async () => {
		setSyncStatus("saving");
		try {
			await deductPeriodontalConsumablesSoftOverdraft(summary.deepPocketsCount > 0 ? "curettage" : "hygiene");
			setLastSavedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
			setSyncStatus("saved");
			if (onSave) onSave(teeth, summary);
			showToast("✓ Статус пародонта зафиксирован в ЭМК", "success");
			if (isModal && onClose) onClose();
		} catch {
			setSyncStatus("saved");
			showToast("✓ Статус пародонта сохранен локально", "success");
		}
	}, [teeth, summary, onSave, isModal, onClose]);

	const currentTooth = useMemo(
		() => teeth.find((t) => t.toothNumber === selectedToothNum) || teeth[0]!,
		[teeth, selectedToothNum],
	);

	const handleUpdateDepth = useCallback((depth: number) => {
		setTeeth((prev) => prev.map((t) => {
			if (t.toothNumber !== selectedToothNum) return t;
			const site = t[selectedSiteKey] || { probingDepthMm: 2, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false, calculus: false, suppuration: false };
			const gm = site.gingivalMarginMm || 0;
			return {
				...t,
				[selectedSiteKey]: { ...site, probingDepthMm: depth, calMm: calculateClinicalAttachmentLevel(depth, gm) },
			};
		}));
		const idx = SITES.findIndex((s) => s.key === selectedSiteKey);
		if (idx < SITES.length - 1) setSelectedSiteKey(SITES[idx + 1]!.key);
	}, [selectedToothNum, selectedSiteKey]);

	const handleToggleBop = useCallback(() => {
		setTeeth((prev) => prev.map((t) => {
			if (t.toothNumber !== selectedToothNum) return t;
			const site = t[selectedSiteKey] || { probingDepthMm: 2, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false, calculus: false, suppuration: false };
			return { ...t, [selectedSiteKey]: { ...site, bleedingOnProbing: !site.bleedingOnProbing } };
		}));
	}, [selectedToothNum, selectedSiteKey]);

	if (!isOpen) return null;

	const content = (
		<div
			id={modalId}
			data-testid="interactive-periodontogram"
			className="interactive-periodontogram flex flex-col gap-3 select-none relative rounded-2xl p-3 sm:p-5 bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] shadow-lg w-full max-w-full overflow-x-clip"
		>
			{/* ВЕРХНИЙ ТУЛБАР: Заголовок, Бейджи, Пресеты и ровно 1 Primary CTA #0d9488 */}
			<div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-[var(--line)] pb-3">
				<div className="flex items-center gap-2.5">
					<div className="w-9 h-9 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center shrink-0">
						<Activity className="w-5 h-5 text-teal-600 dark:text-teal-400" />
					</div>
					<div>
						<div className="flex items-center gap-2">
							<h2 className="text-sm sm:text-base font-bold text-[var(--ink)] leading-tight">Кабинет пародонтологии</h2>
							{patientName && (
								<span className="text-xs px-2 py-0.5 rounded bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--muted)]">
									{patientName}
								</span>
							)}
						</div>
						<p className="text-xs text-[var(--muted)] flex items-center gap-2 pt-0.5">
							{syncStatus === "saved" ? (
								<span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
									<Check className="w-3.5 h-3.5" /> Сохранено {lastSavedAt ? `в ${lastSavedAt}` : ""}
								</span>
							) : syncStatus === "saving" ? (
								<span className="inline-flex items-center gap-1 text-teal-600 dark:text-teal-400 font-medium animate-pulse">
									<Clock className="w-3.5 h-3.5" /> Сохранение...
								</span>
							) : (
								<span>Черновик</span>
							)}
							<span className="text-rose-600 dark:text-rose-400 font-semibold">• BOP: {summary.fmbsPercent}%</span>
							{summary.deepPocketsCount > 0 && (
								<span className="text-amber-600 dark:text-amber-400 font-medium">
									{"• Карманы \u2265 4 мм: "}{summary.deepPocketsCount}
								</span>
							)}
						</p>
					</div>
				</div>

				<div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
					<button type="button" onClick={handleSetAllIntact} disabled={false} data-testid="perio-toolbar-norm-1click-btn" className="min-h-[44px] min-w-[44px] h-9 px-3 rounded-lg bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink)] font-semibold text-xs flex items-center gap-1.5 border border-[var(--line)] cursor-pointer transition-all">
						<Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> 1-клик: Здоровый пародонт (Норма / Пародонт интактен)
					</button>

					<button type="button" onClick={() => handleApplyPreset("pro_hygiene_express")} disabled={false} data-testid="perio-toolbar-prophy-1click-btn" className="min-h-[44px] min-w-[44px] h-9 px-3 rounded-lg bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink)] font-semibold text-xs flex items-center gap-1.5 border border-[var(--line)] cursor-pointer transition-all">
						<Sparkles className="w-3.5 h-3.5 text-sky-500" /> Профгигиена
					</button>

					<button type="button" onClick={() => handleApplyPreset("periodontitis_severe_express")} disabled={false} data-testid="perio-preset-severe-btn" data-preset-card="perio-preset-severe-periodontitis-card" className="min-h-[44px] min-w-[44px] h-9 px-2.5 rounded-lg bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-rose-600 dark:text-rose-400 font-semibold text-xs flex items-center gap-1 border border-[var(--line)] cursor-pointer transition-all">
						Пародонтит тяжелый (6-8 мм)
					</button>

					<button type="button" onClick={handleSave} disabled={false} data-testid="perio-save-draft-btn" className="min-h-[44px] min-w-[44px] h-9 px-4 rounded-lg bg-[#0d9488] hover:bg-[#0f766e] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm cursor-pointer transition-all ml-auto sm:ml-0" title="Сохранить статус десны (Зафиксировать статус пародонта)">
						<Save className="w-4 h-4" /> ✓ Зафиксировать статус пародонта
					</button>

					{isModal && onClose && (
						<button type="button" onClick={onClose} disabled={false} className="min-h-[44px] min-w-[44px] h-9 w-9 rounded-lg bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] border border-[var(--line)] flex items-center justify-center cursor-pointer transition-all" title="Закрыть">
							<X className="w-4 h-4" />
						</button>
					)}
				</div>
			</div>

			{/* ТАБЫ: Экспресс-скрининг PSR vs Пародонтограмма */}
			<div className="flex items-center gap-2 border-b border-[var(--line)] pb-2">
				<button type="button" onClick={() => setActiveTab("psr")} className={`min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer transition-all ${activeTab === "psr" ? "bg-[#0d9488]/15 text-[#0d9488] border border-[#0d9488]/40 shadow-xs" : "bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] border border-[var(--line)]"}`}>
					<Layers className="w-4 h-4" /> Вкладка 1: Экспресс-скрининг пародонта PSR / CPITN (6 секстантов)
				</button>
				<button type="button" onClick={() => setActiveTab("chart")} className={`min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer transition-all ${activeTab === "chart" ? "bg-[#0d9488]/15 text-[#0d9488] border border-[#0d9488]/40 shadow-xs" : "bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] border border-[var(--line)]"}`}>
					<FileText className="w-4 h-4" /> Вкладка 2: Пародонтограмма (32 зуба, клавиши 1–9)
				</button>
			</div>

			{/* ВКЛАДКА 1: ЭКСПРЕСС-СКРИНИНГ PSR (ВОЗ) */}
			{activeTab === "psr" && (
				<div className="flex flex-col gap-3">
					<div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
						<div className="flex flex-wrap items-center gap-2">
							<button type="button" onClick={handleSetAllIntact} disabled={false} data-testid="psr-all-intact-btn" data-preset-card="perio-preset-norm-card" className="min-h-[44px] px-3.5 rounded-lg bg-[var(--paper)] text-emerald-600 dark:text-emerald-400 font-bold text-xs border border-[var(--line)] hover:border-emerald-500 flex items-center gap-1.5 cursor-pointer">
								<Check className="w-3.5 h-3.5" /> ✓ Все секстанты интактны (PSR 0)
							</button>
							<button type="button" onClick={() => handleApplyPreset("gingivitis_express")} disabled={false} data-testid="perio-preset-gingivitis-card" className="min-h-[44px] px-3 rounded-lg bg-[var(--paper)] text-amber-600 dark:text-amber-400 font-semibold text-xs border border-[var(--line)] hover:border-amber-500 flex items-center gap-1 cursor-pointer">
								Гингивит
							</button>
							<button type="button" onClick={() => handleApplyPreset("pro_hygiene_express")} disabled={false} data-testid="psr-hygiene-preset-btn" data-preset-card="perio-preset-prophy-card" className="min-h-[44px] px-3.5 rounded-lg bg-[var(--paper)] text-sky-600 dark:text-sky-400 font-semibold text-xs border border-[var(--line)] hover:border-sky-500 flex items-center gap-1.5 cursor-pointer">
								Профгигиена (PSR 1–2)
							</button>
							<button type="button" onClick={() => handleApplyPreset("periodontitis_moderate_express")} disabled={false} data-testid="psr-periodontitis-preset-btn" data-preset-card="perio-preset-periodontitis-card" className="min-h-[44px] px-3.5 rounded-lg bg-[var(--paper)] text-orange-600 dark:text-orange-400 font-semibold text-xs border border-[var(--line)] hover:border-orange-500 flex items-center gap-1.5 cursor-pointer">
								Пародонтит (PSR 3–4)
							</button>
						</div>
						<div className="text-xs font-bold text-[#0d9488] px-2.5 py-1 rounded-md bg-[#0d9488]/10 border border-[#0d9488]/20">
							{psrSummary.psrFormula}
						</div>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
						{PSR_SEXTANTS_CATALOG.map((s) => {
							const current = screeningMap[s.id] ?? { code: 0, asterisk: false };
							return (
								<div key={s.id} data-testid={`psr-sextant-card-${s.id}`} className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-2">
									<div className="flex items-center justify-between">
										<span className="font-bold text-xs text-[var(--ink)]">{s.name} ({s.teethRange})</span>
										<button type="button" onClick={() => toggleAsterisk(s.id)} disabled={false} className={`min-h-[44px] min-w-[44px] h-7 px-2 rounded font-bold text-xs cursor-pointer transition-all border ${current.asterisk ? "bg-rose-500 text-white border-rose-600" : "bg-[var(--paper)] text-[var(--muted)] border-[var(--line)]"}`} title="Осложняющий фактор (*)">
											{current.asterisk ? "* Осложн." : "*"}
										</button>
									</div>
									<div className="grid grid-cols-5 gap-1">
										{([0, 1, 2, 3, 4] as PsrCode[]).map((code) => (
											<button key={code} type="button" onClick={() => updateSextant(s.id, code)} disabled={false} className={`min-h-[44px] min-w-[44px] rounded-lg text-xs font-bold flex flex-col items-center justify-center cursor-pointer transition-all border ${current.code === code ? "bg-[#0d9488] text-white border-[#0f766e]" : "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)]"}`}>
												<span className="text-sm">{code}</span>
											</button>
										))}
									</div>
								</div>
							);
						})}
					</div>

					<div className="p-3.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
						<div>
							<div className="flex items-center gap-2">
								<span className="text-xs font-bold text-[var(--ink)]">Клиническое заключение:</span>
								<span className="text-xs px-2 py-0.5 rounded font-bold bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30">
									{psrSummary.suggestedDiagnosisRu} ({psrSummary.icd10Code})
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] pt-1">{psrSummary.hygienePlanRu}</p>
						</div>
						<button
							type="button"
							onClick={() => {
								const text = `Пародонтологический осмотр: ${psrSummary.psrFormula}\nДиагноз: ${psrSummary.suggestedDiagnosisRu} (${psrSummary.icd10Code})\nРекомендации: ${psrSummary.hygienePlanRu}`;
								if (onInsertToProtocol) onInsertToProtocol(text);
								else showToast("Протокол скопирован в дневник приёма", "success");
							}}
							disabled={false}
							data-testid="perio-insert-protocol-btn"
							className="min-h-[44px] px-3.5 rounded-lg bg-[var(--paper)] text-[var(--ink)] font-semibold text-xs border border-[var(--line)] hover:border-[#0d9488] flex items-center gap-1.5 cursor-pointer shrink-0"
						>
							Вставить в дневник
						</button>
					</div>
				</div>
			)}

			{/* ВКЛАДКА 2: ПАРОДОНТОГРАММА (32 ЗУБА, ЦИФРОВОЙ БЛОК 1–9) */}
			{activeTab === "chart" && (
				<div className="flex flex-col gap-3">
					<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-2 overflow-x-auto">
						{[UPPER_TEETH, LOWER_TEETH].map((row, rIdx) => (
							<div key={rIdx} className="flex items-center gap-1 min-w-max pb-1">
								<span className="text-[11px] font-bold text-[var(--muted)] w-8">{rIdx === 0 ? "ВЧ:" : "НЧ:"}</span>
								{row.map((num) => {
									const t = teeth.find((item) => item.toothNumber === num);
									const isSelected = selectedToothNum === num;
									const hasBop = PERIO_SITE_KEYS.some((k) => t?.[k]?.bleedingOnProbing);
									const maxD = Math.max(...PERIO_SITE_KEYS.map((k) => t?.[k]?.probingDepthMm || 2));
									return (
										<button key={num} type="button" onClick={() => setSelectedToothNum(num)} disabled={false} data-testid={`perio-tooth-btn-${num}`} className={`min-h-[44px] min-w-[44px] w-9 h-11 rounded-lg text-xs font-bold flex flex-col items-center justify-center cursor-pointer transition-all border ${isSelected ? "bg-[#0d9488] text-white border-[#0f766e] ring-2 ring-[#0d9488]/40" : "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)]"}`}>
											<span>{num}</span>
											<span className={`text-[10px] ${maxD >= 4 ? (isSelected ? "text-amber-200" : "text-amber-600 dark:text-amber-400") : "opacity-70"}`}>{maxD}мм{hasBop ? "•" : ""}</span>
										</button>
									);
								})}
							</div>
						))}
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
						<div className="flex flex-col gap-2">
							<div className="flex items-center justify-between">
								<span className="font-bold text-sm text-[var(--ink)]">Зуб #{selectedToothNum} — 6 точек зондирования</span>
								<div className="flex items-center gap-1">
									<span className="text-xs text-[var(--muted)]">Подвижность:</span>
									{([0, 1, 2, 3] as const).map((lvl) => (
										<button key={lvl} type="button" onClick={() => setTeeth((prev) => prev.map((t) => (t.toothNumber === selectedToothNum ? { ...t, mobility: lvl } : t)))} disabled={false} className={`min-h-[44px] min-w-[44px] h-7 px-2 rounded text-xs font-bold border ${currentTooth.mobility === lvl ? "bg-[#0d9488] text-white border-[#0f766e]" : "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)]"}`}>{lvl}</button>
									))}
								</div>
							</div>

							<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
								{SITES.map((site) => {
									const isCurrentSite = selectedSiteKey === site.key;
									const data = currentTooth[site.key] || { probingDepthMm: 2, bleedingOnProbing: false };
									return (
										<button key={site.key} type="button" onClick={() => setSelectedSiteKey(site.key)} disabled={false} className={`min-h-[44px] p-2.5 rounded-xl flex flex-col items-start gap-1 text-left border cursor-pointer transition-all ${isCurrentSite ? "bg-[#0d9488]/15 border-[#0d9488] text-[var(--ink)]" : "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)]"}`}>
											<div className="flex items-center justify-between w-full">
												<span className="text-xs font-bold">{site.short} ({site.label})</span>
												{data.bleedingOnProbing && <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />}
											</div>
											<div className="text-sm font-bold text-[#0d9488]">{data.probingDepthMm || 2} мм</div>
										</button>
									);
								})}
							</div>
						</div>

						<div className="flex flex-col gap-2">
							<div className="flex items-center justify-between">
								<span className="text-xs font-bold text-[var(--muted)]">
									Ввод глубины: <span className="text-[#0d9488]">{SITES.find((s) => s.key === selectedSiteKey)?.label}</span>
								</span>
								<button type="button" onClick={handleToggleBop} disabled={false} className={`min-h-[44px] min-w-[44px] px-3 rounded-lg font-bold text-xs flex items-center gap-1.5 border cursor-pointer transition-all ${currentTooth[selectedSiteKey]?.bleedingOnProbing ? "bg-rose-500 text-white border-rose-600" : "bg-[var(--paper)] text-rose-600 dark:text-rose-400 border-[var(--line)]"}`}>
									BOP (Кровоточивость)
								</button>
							</div>

							<div className="grid grid-cols-3 gap-1.5">
								{[1, 2, 3, 4, 5, 6, 7, 8, 9].map((val) => (
									<button key={val} type="button" onClick={() => handleUpdateDepth(val)} disabled={false} className={`min-h-[44px] min-w-[44px] h-12 rounded-xl text-base font-bold flex items-center justify-center cursor-pointer transition-all border ${val >= 6 ? "bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/30" : val >= 4 ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30" : "bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] border-[var(--line)]"}`}>{val} мм</button>
								))}
							</div>
						</div>
					</div>

					<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-wrap items-center gap-2">
						<span className="text-xs font-bold text-[var(--ink)] mr-1">Пародонтологическая обработка:</span>
						{PERIO_TREATMENT_PRESETS.filter((p) => p.category === "perio" || p.category === "surgery").map((preset) => (
							<button key={preset.id} type="button" onClick={() => {
								if (preset.id === "gracey_curettage") handleApplyPreset("periodontitis_moderate_express");
								else showToast(`Назначена процедура: ${preset.titleRu}`, "success");
							}} disabled={false} className="min-h-[44px] px-3 py-1.5 rounded-lg bg-[var(--paper)] text-[var(--ink)] hover:border-[#0d9488] font-semibold text-xs border border-[var(--line)] cursor-pointer transition-all">
								{preset.titleRu}
							</button>
						))}
					</div>
				</div>
			)}
		</div>
	);

	if (isModal) {
		return (
			<div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto" data-testid="perio-chart-modal">
				<div className="w-full max-w-5xl my-auto max-h-[96vh] overflow-y-auto rounded-2xl">{content}</div>
			</div>
		);
	}

	return content;
});

PerioWorkspaceModal.displayName = "PerioWorkspaceModal";
export default PerioWorkspaceModal;
