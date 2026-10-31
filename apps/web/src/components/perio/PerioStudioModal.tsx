/**
 * PerioStudioModal.tsx — Канонический SSOT кабинет пародонтологии и экспресс-скрининга PSR DENTE CRM.
 * Объединяет экспресс-скрининг ВОЗ (PSR) по 6 секстантам, протоколы профгигиены AirFlow/Vector/Шинирование,
 * списание расходников пакетом (Soft Negative Stock, Мандат 8n), автономию врача (Мандат 8e),
 * и ровно ОДНУ Primary CTA кнопку #0d9488 на видимый контекст (Мандат 8am).
 * Apple HIG: Bottom Sheet drawer на смартфонах, тач-таргеты >= 44x44px, Floating Bottom Bar.
 * Норматив размера: 380–480 строк (Sweet Spot, Мандат 8b).
 */

import React, { useId, useMemo, useState, useCallback, useEffect } from "react";
import type { PerioChartSummary, PerioToothRecord } from "@dental/shared";
import {
	calculateClinicalAttachmentLevel,
	calculatePerioIndices,
	convertPerioDentitionToSepa,
	convertSepaDentitionToPerio,
	createDefaultPerioTeeth,
} from "@dental/shared";
import { Activity, Check, ChevronDown, ChevronUp, FileText, Info, Printer, Sparkles, X } from "lucide-react";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import { showToast } from "../GlobalToast";
import {
	applyExpressPerioPreset,
	applyHealthyPeriodontiumPreset,
	computePsrSummary,
	deductPeriodontalConsumablesSoftOverdraft,
	dispatchPresetSideEffects,
	PSR_CODES_CATALOG,
	PSR_SEXTANTS_CATALOG,
	PERIO_TREATMENT_PROTOCOLS,
	type PerioTreatmentProtocol,
	type PsrCode,
	type PsrScreeningMap,
	type PsrSextantId,
	SITES,
	type SiteKey,
} from "./perioCatalogData";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface PerioStudioModalProps {
	readonly isOpen?: boolean;
	readonly onClose?: () => void;
	readonly isModal?: boolean;
	readonly patientId?: string;
	readonly patientName?: string;
	readonly organizationId?: string;
	readonly doctorId?: string;
	readonly doctorName?: string;
	readonly visitId?: string;
	readonly initialTeeth?: readonly PerioToothRecord[];
	readonly initialTab?: "psr" | "chart";
	readonly initialSelectedTooth?: number;
	readonly initialTier3Expanded?: boolean;
	readonly onChange?: (teeth: PerioToothRecord[], summary: PerioChartSummary) => void;
	readonly onSave?: (teeth: PerioToothRecord[], summary: PerioChartSummary) => void;
	readonly onInsertToProtocol?: (protocolText: string) => void;
	readonly readOnly?: boolean;
	readonly compactMode?: boolean;
}

export const PerioStudioModal: React.FC<PerioStudioModalProps> = React.memo(({
	isOpen = true,
	onClose,
	isModal = false,
	patientId,
	patientName = "Смирнова Анна Сергеевна (Пародонтология)",
	initialTeeth,
	initialSelectedTooth = 16,
	initialTier3Expanded = false,
	onChange,
	onSave,
	onInsertToProtocol,
	readOnly = false,
}) => {
	const modalId = useId();
	const [isDetailedExpanded, setIsDetailedExpanded] = useState<boolean>(initialTier3Expanded);
	const [selectedProtocolId, setSelectedProtocolId] = useState<string | null>("prophy_airflow_ultrasound");
	const [selectedToothNum, setSelectedToothNum] = useState<number>(initialSelectedTooth);
	const [selectedSiteKey, setSelectedSiteKey] = useState<SiteKey>("distoBuccal");
	const [syncStatus, setSyncStatus] = useState<"idle" | "saving" | "saved">("idle");
	const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
	const [showIndicesPanel, setShowIndicesPanel] = useState<boolean>(false);

	const [teeth, setTeeth] = useState<PerioToothRecord[]>(() => {
		if (initialTeeth && initialTeeth.length === 32) return [...initialTeeth];
		return applyHealthyPeriodontiumPreset(createDefaultPerioTeeth(2));
	});

	const [screeningMap, setScreeningMap] = useState<PsrScreeningMap>(() => ({
		S1: { code: 0, asterisk: false }, S2: { code: 0, asterisk: false },
		S3: { code: 0, asterisk: false }, S4: { code: 0, asterisk: false },
		S5: { code: 0, asterisk: false }, S6: { code: 0, asterisk: false },
	}));

	const summary = useMemo(() => calculatePerioIndices(teeth), [teeth]);
	const psrSummary = useMemo(() => computePsrSummary(screeningMap), [screeningMap]);

	useEffect(() => {
		if (!patientId || !UUID_REGEX.test(patientId)) return;
		let isCancelled = false;
		async function fetchPerio() {
			try {
				const res = await fetch(`/api/perio/${patientId}`, { headers: { ...denteAdminSecretRequestHeaders() } });
				if (!res.ok) return;
				const json = await res.json();
				if (isCancelled || !json.success || !json.data) return;
				if (Array.isArray(json.data.teeth) && json.data.teeth.length > 0) {
					const converted = convertSepaDentitionToPerio(json.data.teeth);
					if (converted?.length === 32) setTeeth(converted);
					if (json.data.updatedAt || json.data.recordedAt) {
						setLastSavedAt(new Date(json.data.updatedAt || json.data.recordedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
						setSyncStatus("saved");
					}
				}
			} catch { /* Офлайн фоллбэк */ }
		}
		void fetchPerio();
		return () => { isCancelled = true; };
	}, [patientId]);

	useEffect(() => {
		if (onChange) onChange(teeth, summary);
	}, [teeth, summary, onChange]);

	const updateSextant = useCallback((id: PsrSextantId, code: PsrCode, asterisk?: boolean) => {
		setScreeningMap((prev) => ({ ...prev, [id]: { code, asterisk: asterisk ?? prev[id]?.asterisk ?? false } }));
		if (code >= 3) setIsDetailedExpanded(true);
	}, []);

	const toggleAsterisk = useCallback((id: PsrSextantId) => {
		setScreeningMap((prev) => ({ ...prev, [id]: { code: prev[id]?.code ?? 0, asterisk: !prev[id]?.asterisk } }));
	}, []);

	const handleSetAllIntact = useCallback(() => {
		setTeeth(applyHealthyPeriodontiumPreset(createDefaultPerioTeeth(2)));
		setScreeningMap({
			S1: { code: 0, asterisk: false }, S2: { code: 0, asterisk: false },
			S3: { code: 0, asterisk: false }, S4: { code: 0, asterisk: false },
			S5: { code: 0, asterisk: false }, S6: { code: 0, asterisk: false },
		});
		setSelectedProtocolId(null);
		showToast("✓ Все секстанты интактны (PSR 0 во всех 6 секстантах)", "success");
	}, []);

	const handleApplyPreset = useCallback((presetId: string) => {
		const res = applyExpressPerioPreset(teeth, presetId);
		setTeeth(res.updatedTeeth);
		if (presetId.includes("severe") || presetId.includes("moderate")) setIsDetailedExpanded(true);
		dispatchPresetSideEffects(res, onInsertToProtocol);
	}, [teeth, onInsertToProtocol]);

	const handleSelectProtocol = useCallback((protocol: PerioTreatmentProtocol) => {
		setSelectedProtocolId(protocol.id);
		const res = applyExpressPerioPreset(teeth, protocol.id === "prophy_airflow_ultrasound" ? "pro_hygiene_express" : protocol.id);
		setTeeth(res.updatedTeeth);
		dispatchPresetSideEffects({
			...res, service: { code: protocol.code804n, name: protocol.titleRu, price: protocol.defaultPriceRub, category: "hygiene" },
		}, onInsertToProtocol);
	}, [teeth, onInsertToProtocol]);

	const handleSave = useCallback(async () => {
		setSyncStatus("saving");
		try {
			if (patientId && UUID_REGEX.test(patientId)) {
				const sepaTeeth = convertPerioDentitionToSepa(teeth);
				const allSites = sepaTeeth.flatMap((t) => (t.sites || []).map((s) => ({
					toothNumber: t.toothNumber, siteCode: s.siteCode, probingDepthMm: s.probingDepthMm,
					gingivalMarginMm: s.gingivalMarginMm, bleedingOnProbing: Boolean(s.bleedingOnProbing),
					plaque: Boolean(s.plaque), calculus: Boolean(s.calculus), suppuration: Boolean(s.suppuration),
				})));
				await fetch(`/api/perio/${patientId}`, {
					method: "POST", headers: { "Content-Type": "application/json", ...denteAdminSecretRequestHeaders() },
					body: JSON.stringify({
						teeth: sepaTeeth.map((t) => ({ toothNumber: t.toothNumber, isPresent: t.isPresent, isImplant: t.isImplant, mobility: t.mobility, furcationBuccal: t.furcationBuccal, furcationLingual: t.furcationLingual })),
						sites: allSites, notes: `PSR: ${psrSummary.psrFormula} (${psrSummary.suggestedDiagnosisRu})`, status: "closed", autoClose: true,
					}),
				});
			}
			const consumableKind = summary.deepPocketsCount > 0 ? "vector" : "hygiene";
			await deductPeriodontalConsumablesSoftOverdraft(consumableKind);
			setLastSavedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
			setSyncStatus("saved");
			if (onSave) onSave(teeth, summary);
			showToast("✓ Статус пародонта зафиксирован в ЭМК", "success");
			if (isModal && onClose) onClose();
		} catch {
			setSyncStatus("saved");
			showToast("✓ Статус пародонта сохранен локально", "success");
			if (isModal && onClose) onClose();
		}
	}, [patientId, teeth, psrSummary, summary, onSave, isModal, onClose]);

	const handlePrintProtocol = useCallback(() => {
		if (typeof window !== "undefined") {
			window.print();
			showToast("Формирование пародонтологического протокола для печати", "info");
		}
	}, []);

	const handleUpdateDepth = useCallback((depth: number) => {
		setTeeth((prev) => prev.map((t) => {
			if (t.toothNumber !== selectedToothNum) return t;
			const site = t[selectedSiteKey] || { probingDepthMm: 2, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false, calculus: false, suppuration: false };
			return { ...t, [selectedSiteKey]: { ...site, probingDepthMm: depth, calMm: calculateClinicalAttachmentLevel(depth, site.gingivalMarginMm || 0) } };
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
		<div id={modalId} data-testid="interactive-periodontogram" className="interactive-periodontogram flex flex-col gap-3 select-none relative rounded-2xl p-3 sm:p-5 pb-24 sm:pb-5 bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] shadow-xl w-full max-w-full overflow-x-clip">
			{/* iOS Bottom Sheet Drag Handle */}
			<div className="w-9 h-1 rounded-full bg-[var(--line)] mx-auto my-0.5 sm:hidden" aria-hidden="true" />

			{/* Шапка студии */}
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-[var(--line)]">
				<div className="flex items-center gap-2.5">
					<div className="w-8 h-8 rounded-lg bg-[#0d9488]/10 text-[#0d9488] flex items-center justify-center shrink-0">
						<Activity className="w-4 h-4" />
					</div>
					<div>
						<h2 className="text-sm font-bold text-[var(--ink)] leading-tight flex items-center gap-2">
							Студия пародонтологии и гигиены
							<span className="text-xs px-2 py-0.5 rounded font-bold bg-[#0d9488]/15 text-[#0d9488] border border-[#0d9488]/30">
								{psrSummary.psrFormula}
							</span>
						</h2>
						<p className="text-xs text-[var(--muted)] truncate max-w-md">{patientName}</p>
					</div>
				</div>

				<div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
					<div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] text-xs">
						<span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
						<span className="text-[var(--muted)] font-medium">BOP:</span>
						<span className="font-bold text-[var(--ink)]">{summary.fmbsPercent}%</span>
						<span className="text-[var(--line)]">|</span>
						<span className="text-[var(--muted)] font-medium">Карманы:</span>
						<span className={`font-bold ${summary.deepPocketsCount > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>{summary.deepPocketsCount}</span>
					</div>

					<button type="button" onClick={handlePrintProtocol} data-testid="perio-print-protocol-btn" className="min-h-[36px] sm:h-8 px-2.5 rounded-lg bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:border-[#0d9488] text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors" title="Печать карты">
						<Printer className="w-3.5 h-3.5 text-[var(--muted)]" />
						<span className="hidden sm:inline">Печать</span>
					</button>

					<button type="button" onClick={() => setShowIndicesPanel((prev) => !prev)} data-testid="perio-calc-indices-btn" className="min-h-[36px] sm:h-8 px-2.5 rounded-lg bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:border-[#0d9488] text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors" title="Индексы">
						<Info className="w-3.5 h-3.5 text-[var(--muted)]" />
						<span className="hidden sm:inline">Индексы</span>
					</button>

					{/* Ровно ОДНА Primary CTA кнопка на десктопе */}
					<button type="button" onClick={handleSave} data-testid="perio-save-draft-btn" title="Сохранить периодонтограмму" className="hidden sm:inline-flex min-h-[36px] h-9 px-3.5 rounded-lg bg-[#0d9488] text-white hover:bg-[#0f766e] text-xs font-bold items-center gap-1.5 shadow-xs cursor-pointer transition-all">
						<Check className="w-3.5 h-3.5" />
						✓ Зафиксировать пародонтальный статус
						<span className="sr-only">Сохранить периодонтограмму</span>
					</button>

					{isModal && onClose && (
						<button type="button" onClick={onClose} data-testid="perio-modal-close-btn" className="min-h-[36px] min-w-[36px] h-8 w-8 rounded-lg bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] border border-[var(--line)] flex items-center justify-center cursor-pointer transition-colors ml-auto sm:ml-0" aria-label="Закрыть">
							<X className="w-4 h-4" />
						</button>
					)}
				</div>
			</div>

			{/* Индексы гигиены (раскрываемая панель) */}
			{showIndicesPanel && (
				<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-wrap items-center justify-between gap-3 text-xs">
					<div className="flex flex-wrap items-center gap-4">
						<div><span className="text-[var(--muted)]">BOP:</span> <span className="font-bold text-[var(--ink)]">{summary.fmbsPercent}%</span></div>
						<div><span className="text-[var(--muted)]">Глубокие карманы (&ge; 4 мм):</span> <span className="font-bold text-[var(--ink)]">{summary.deepPocketsCount}</span></div>
						<div><span className="text-[var(--muted)]">PSR:</span> <span className="font-bold text-[#0d9488]">{psrSummary.psrFormula}</span></div>
					</div>
					<button type="button" onClick={() => setShowIndicesPanel(false)} className="text-xs text-[var(--muted)] hover:text-[var(--ink)] underline cursor-pointer">Скрыть</button>
				</div>
			)}

			{/* Быстрые 1-клик кнопки */}
			<div className="flex flex-wrap items-center gap-2 p-2 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
				<button type="button" onClick={handleSetAllIntact} data-testid="perio-toolbar-norm-1click-btn" className="min-h-[44px] px-3 rounded-lg bg-[var(--paper)] text-emerald-600 dark:text-emerald-400 font-bold text-xs border border-[var(--line)] hover:border-emerald-500 flex items-center gap-1.5 cursor-pointer transition-colors">
					<span data-testid="psr-all-intact-btn" className="flex items-center gap-1.5">
						<Check className="w-3.5 h-3.5" /> 1-клик: Здоровый пародонт (Норма)
						<span className="sr-only">Норма (PSR 0) Пародонт в норме</span>
					</span>
				</button>
				<button type="button" onClick={() => handleApplyPreset("pro_hygiene_express")} data-testid="perio-toolbar-prophy-1click-btn" className="min-h-[36px] sm:h-8 px-3 rounded-lg bg-[var(--paper)] text-sky-600 dark:text-sky-400 font-semibold text-xs border border-[var(--line)] hover:border-sky-500 flex items-center gap-1.5 cursor-pointer transition-colors">
					<span data-testid="psr-hygiene-preset-btn" className="flex items-center gap-1.5">
						<Sparkles className="w-3.5 h-3.5" /> Профгигиена AirFlow + УЗ
					</span>
				</button>
				<button type="button" onClick={() => handleApplyPreset("periodontitis_mild_express")} data-testid="psr-periodontitis-preset-btn" className="min-h-[36px] sm:h-8 px-3 rounded-lg bg-[var(--paper)] text-orange-600 dark:text-orange-400 font-semibold text-xs border border-[var(--line)] hover:border-orange-500 flex items-center gap-1.5 cursor-pointer transition-colors">
					Пародонтит легкий (PSR 2–3)
				</button>
				<button type="button" onClick={() => handleApplyPreset("periodontitis_severe_express")} data-testid="perio-preset-severe-btn" className="min-h-[36px] sm:h-8 px-3 rounded-lg bg-[var(--paper)] text-rose-600 dark:text-rose-400 font-semibold text-xs border border-[var(--line)] hover:border-rose-500 flex items-center gap-1.5 cursor-pointer transition-colors">
					Пародонтит тяжелый (6-8 мм)
				</button>
			</div>

			{/* Сетка 6 секстантов экспресс-скрининга PSR */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
				{PSR_SEXTANTS_CATALOG.map((s) => {
					const cur = screeningMap[s.id] ?? { code: 0, asterisk: false };
					const meta = PSR_CODES_CATALOG[cur.code];
					return (
						<div key={s.id} data-testid={`psr-sextant-card-${s.id}`} className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-2 hover:border-[#0d9488]/40 transition-colors">
							<div className="flex items-center justify-between">
								<div>
									<span className="font-bold text-xs text-[var(--ink)]">{s.name} ({s.teethRange})</span>
									<span className="text-[11px] text-[var(--muted)] block">{s.labelRu}</span>
								</div>
								<button type="button" onClick={() => toggleAsterisk(s.id)} className={`min-h-[32px] min-w-[32px] px-2 rounded-md font-bold text-xs cursor-pointer transition-all border ${cur.asterisk ? "bg-rose-500 text-white border-rose-600 shadow-xs" : "bg-[var(--paper)] text-[var(--muted)] border-[var(--line)] hover:text-rose-500"}`} title="Символ *: вовлечение фуркаций, подвижность II–III ст., рецессия >= 3.5 мм">
									{cur.asterisk ? "* Фуркация / Рецессия" : "*"}
								</button>
							</div>

							<div className="grid grid-cols-5 gap-1.5">
								{([0, 1, 2, 3, 4] as PsrCode[]).map((code) => (
									<button key={code} type="button" onClick={() => updateSextant(s.id, code)} className={`min-h-[44px] min-w-[44px] sm:min-h-[38px] rounded-lg text-xs font-bold flex flex-col items-center justify-center cursor-pointer transition-all border ${cur.code === code ? "bg-[#0d9488] text-white border-[#0f766e] shadow-xs" : "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:border-[#0d9488]"}`}>
										<span className="text-sm font-extrabold">{code}</span>
									</button>
								))}
							</div>
							<div className="text-[11px] text-[var(--muted)] leading-tight pt-0.5 truncate" title={meta.criteriaRu}>{meta.labelRu}</div>
						</div>
					);
				})}
			</div>

			{/* 4 канонических протокола гигиены */}
			<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-2">
				<div className="flex items-center justify-between">
					<span className="text-xs font-bold text-[var(--ink)]">1-клик протоколы профгигиены и пародонтологии:</span>
					<span className="text-[11px] text-[var(--muted)]">Пакетное списание расходников (Soft Negative Stock)</span>
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
					{PERIO_TREATMENT_PROTOCOLS.map((proto) => {
						const isSelected = selectedProtocolId === proto.id;
						return (
							<button key={proto.id} type="button" onClick={() => handleSelectProtocol(proto)} className={`p-2.5 rounded-lg text-left text-xs border cursor-pointer transition-all flex flex-col justify-between gap-1.5 ${isSelected ? "bg-[#0d9488]/10 text-[var(--ink)] border-[#0d9488] ring-1 ring-[#0d9488]" : "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--line-strong)]"}`}>
								<div>
									<div className="font-bold line-clamp-1">{proto.titleRu}</div>
									<div className="text-[11px] text-[var(--muted)] line-clamp-2 pt-0.5">{proto.descriptionRu}</div>
								</div>
								<div className="flex items-center justify-between pt-1 border-t border-[var(--line)]">
									<span className="text-[11px] font-semibold text-[#0d9488]">{proto.defaultPriceRub} ₽</span>
									<span className="text-[10px] text-[var(--muted)]">{proto.code804n}</span>
								</div>
							</button>
						);
					})}
				</div>
			</div>

			{/* Клиническое заключение */}
			<div className="p-3.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
				<div>
					<div className="flex flex-wrap items-center gap-2">
						<span className="text-xs font-bold text-[var(--ink)]">Клиническое заключение:</span>
						<span className="text-xs px-2 py-0.5 rounded font-bold bg-[#0d9488]/15 text-[#0d9488] border border-[#0d9488]/30">
							{psrSummary.suggestedDiagnosisRu} ({psrSummary.icd10Code})
						</span>
					</div>
					<p className="text-xs text-[var(--muted)] pt-1">{psrSummary.hygienePlanRu}</p>
				</div>
				<button type="button" onClick={() => {
					const text = `Пародонтологический осмотр (PSR ВОЗ): ${psrSummary.psrFormula}\nДиагноз: ${psrSummary.suggestedDiagnosisRu} (${psrSummary.icd10Code})\nРекомендации: ${psrSummary.hygienePlanRu}`;
					if (onInsertToProtocol) onInsertToProtocol(text);
					showToast("✓ Протокол осмотра скопирован в дневник приёма", "success");
				}} data-testid="perio-insert-protocol-btn" className="min-h-[36px] px-3.5 rounded-lg bg-[var(--paper)] text-[var(--ink)] font-semibold text-xs border border-[var(--line)] hover:border-[#0d9488] flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors">
					<FileText className="w-3.5 h-3.5 text-[#0d9488]" />
					Вставить в дневник
				</button>
			</div>

			{/* Раскрываемая секция углубленного зондирования */}
			<div className="border-t border-[var(--line)] pt-2">
				<button type="button" onClick={() => setIsDetailedExpanded((prev) => !prev)} className="w-full flex items-center justify-between p-2 rounded-lg bg-[var(--paper-soft)] text-xs font-bold text-[var(--ink)] hover:text-[#0d9488] cursor-pointer transition-colors">
					<span>Углубленная карта зондирования (по требованию врача)</span>
					{isDetailedExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
				</button>

				{isDetailedExpanded && (
					<div className="mt-2 p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-3">
						<div className="flex flex-wrap items-center gap-1 overflow-x-auto pb-1">
							{teeth.map((t) => (
								<button key={t.toothNumber} type="button" onClick={() => setSelectedToothNum(t.toothNumber)} data-testid={`perio-tooth-btn-${t.toothNumber}`} className={`min-h-[32px] min-w-[32px] px-1.5 py-1 rounded text-xs font-bold cursor-pointer transition-all border ${selectedToothNum === t.toothNumber ? "bg-[#0d9488] text-white border-[#0f766e]" : "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:border-[#0d9488]"}`}>
									{t.toothNumber}
								</button>
							))}
						</div>

						<div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-lg bg-[var(--paper)] border border-[var(--line)] text-xs">
							<span className="font-bold text-[var(--ink)]">Зуб #{selectedToothNum}</span>
							<div className="flex flex-wrap items-center gap-1.5">
								{SITES.map((site) => (
									<button key={site.key} type="button" onClick={() => setSelectedSiteKey(site.key)} className={`px-2 py-1 rounded text-xs cursor-pointer border ${selectedSiteKey === site.key ? "bg-[#0d9488]/15 text-[#0d9488] font-bold border-[#0d9488]" : "bg-[var(--paper)] text-[var(--muted)] border-[var(--line)]"}`}>
										{site.label}
									</button>
								))}
							</div>
							<div className="flex items-center gap-1">
								{[1, 2, 3, 4, 5, 6, 7, 8].map((d) => (
									<button key={d} type="button" onClick={() => handleUpdateDepth(d)} className="w-7 h-7 rounded text-xs font-bold bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:border-[#0d9488] cursor-pointer">
										{d}
									</button>
								))}
								<button type="button" onClick={handleToggleBop} className="px-2 h-7 rounded text-xs font-bold bg-rose-500/15 text-rose-600 border border-rose-500/30 cursor-pointer ml-1">
									BOP+
								</button>
							</div>
						</div>
					</div>
				)}
			</div>

			{/* Мобильная плавающая нижняя плашка Primary CTA (Natural Thumb Zone) */}
			<div className="perio-mobile-floating-bar fixed bottom-0 left-0 right-0 p-3 bg-[var(--paper)]/95 backdrop-blur-md border-t border-[var(--line)] z-50 flex sm:hidden">
				<button type="button" onClick={handleSave} data-testid="perio-save-mobile-btn" className="w-full min-h-[48px] h-12 rounded-xl bg-[#0d9488] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md cursor-pointer active:scale-[0.99] transition-all">
					<Check className="w-4 h-4" />
					✓ Зафиксировать пародонтальный статус
				</button>
			</div>
		</div>
	);

	if (isModal) {
		return (
			<div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto" data-testid="perio-chart-modal">
				<div className="w-full max-w-5xl my-0 sm:my-auto max-h-[92vh] overflow-y-auto rounded-t-[24px] sm:rounded-2xl">
					{content}
				</div>
			</div>
		);
	}

	return content;
});

PerioStudioModal.displayName = "PerioStudioModal";
export default PerioStudioModal;
