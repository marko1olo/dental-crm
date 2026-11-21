/**
 * PerioStudioModal.tsx — Канонический SSOT кабинет пародонтологии и экспресс-скрининга PSR DENTE CRM.
 * Объединяет экспресс-скрининг ВОЗ (PSR) по 6 секстантам, протоколы профгигиены AirFlow/Кюретаж/Шинирование,
 * списание расходников пакетом (Soft Negative Stock, Мандат 8n), автономию врача (Мандат 8e),
 * и ровно ОДНУ Primary CTA кнопку (var(--primary)) на видимый контекст (Мандат 8am).
 * Разблокированный клавиатурный ввод 1..9, 10..15 мм, Пробел (BOP), стрелки и Tab.
 * Норматив размера: < 500 строк (Sweet Spot 200–460 строк, Мандат 8b).
 */

import React, { useId, useMemo, useState, useCallback, useEffect, useRef } from "react";
import type { PerioChartSummary, PerioToothRecord } from "@dental/shared";
import {
	ALL_PERIO_TEETH, calculateClinicalAttachmentLevel, calculatePerioIndices,
	convertPerioDentitionToSepa, convertSepaDentitionToPerio, formatKopecksToRub,
	generateComprehensivePerioProtocolText, generateFullMouthProbingSequence,
	generateUuidV7,
} from "@dental/shared";
import { Activity, Check, FileText, Info, Printer, X } from "lucide-react";
import { showToast } from "../GlobalToast";
import { useVisitStore } from "../../store/visitStore";
import { getDenteAuthHeaders } from "../../lib/denteRequestHeaders";
import {
	applyExpressPerioPreset, applyHealthyPeriodontiumPreset, applyUpperJawNormPreset, applyLowerJawNormPreset,
	applyZeroBopPreset, applyZeroCalculusAndPlaquePreset, computePsrSummary, deductPeriodontalConsumablesSoftOverdraft,
	dispatchPresetSideEffects, generatePerioProtocolText, normalizePerioDentition, PSR_CODES_CATALOG, PSR_SEXTANTS_CATALOG,
	PERIO_TREATMENT_PROTOCOLS, type PerioTreatmentProtocol, type PsrCode, type PsrScreeningMap, type PsrSextantId, SITES, type SiteKey,
} from "./perioCatalogData";
import { PerioPresetActions } from "./PerioPresetActions";
import { PerioDetailedProbeSection } from "./PerioDetailedProbeSection";
import "./perioChart.css";

export interface PerioStudioModalProps {
	readonly isOpen?: boolean | undefined; readonly onClose?: (() => void) | undefined; readonly isModal?: boolean | undefined;
	readonly patientId?: string | undefined; readonly patientName?: string | undefined; readonly organizationId?: string | undefined;
	readonly doctorId?: string | undefined; readonly doctorName?: string | undefined; readonly visitId?: string | undefined;
	readonly initialTeeth?: readonly PerioToothRecord[] | undefined; readonly initialTab?: "psr" | "chart" | undefined; readonly initialSelectedTooth?: number | undefined; readonly initialTier3Expanded?: boolean | undefined;
	readonly onChange?: ((teeth: PerioToothRecord[], summary: PerioChartSummary) => void) | undefined; readonly onSave?: ((teeth: PerioToothRecord[], summary: PerioChartSummary) => void) | undefined; readonly onInsertToProtocol?: ((protocolText: string) => void) | undefined; readonly readOnly?: boolean | undefined; readonly compactMode?: boolean | undefined;
}

export const PerioStudioModal: React.FC<PerioStudioModalProps> = React.memo(({
	isOpen = true, onClose, isModal = false, patientId, patientName = "Пациент приёма", doctorName = "Лечащий врач", visitId,
	initialTeeth, initialSelectedTooth = 16, initialTier3Expanded = false, onChange, onSave, onInsertToProtocol,
}) => {
	const modalId = useId();
	const [isDetailedExpanded, setIsDetailedExpanded] = useState<boolean>(initialTier3Expanded);
	const [selectedProtocolId, setSelectedProtocolId] = useState<string | null>("prophy_airflow_ultrasound");
	const [selectedToothNum, setSelectedToothNum] = useState<number>(initialSelectedTooth);
	const [selectedSiteKey, setSelectedSiteKey] = useState<SiteKey>("distoBuccal");
	const [syncStatus, setSyncStatus] = useState<"idle" | "saving" | "saved">("idle");
	const [showIndicesPanel, setShowIndicesPanel] = useState<boolean>(false);
	const twoDigitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const pendingOneRef = useRef<boolean>(false);

	const [teeth, setTeeth] = useState<PerioToothRecord[]>(() => normalizePerioDentition(initialTeeth));
	const [screeningMap, setScreeningMap] = useState<PsrScreeningMap>(() => ({ S1: { code: 0, asterisk: false }, S2: { code: 0, asterisk: false }, S3: { code: 0, asterisk: false }, S4: { code: 0, asterisk: false }, S5: { code: 0, asterisk: false }, S6: { code: 0, asterisk: false } }));
	const summary = useMemo(() => calculatePerioIndices(teeth), [teeth]);
	const psrSummary = useMemo(() => computePsrSummary(screeningMap), [screeningMap]);
	const probingSequence = useMemo(() => generateFullMouthProbingSequence(teeth), [teeth]);

	const handleClose = useCallback(() => {
		if (twoDigitTimerRef.current) clearTimeout(twoDigitTimerRef.current);
		pendingOneRef.current = false;
		if (onClose) onClose();
	}, [onClose]);

	useEffect(() => {
		const cleanPatientId = patientId?.trim();
		if (!cleanPatientId) return;
		const safePatientId = cleanPatientId;
		let isCancelled = false;
		try {
			const cached = localStorage.getItem(`dente_perio_cache_${safePatientId}`);
			if (cached) {
				const parsed = JSON.parse(cached);
				if (Array.isArray(parsed.teeth) && parsed.teeth.length > 0) setTeeth(normalizePerioDentition(parsed.teeth));
				if (parsed.screeningMap && typeof parsed.screeningMap === "object") setScreeningMap(parsed.screeningMap);
			}
		} catch (err) { console.warn("[PerioStudio] Failed to read from local cache:", err); }

		async function fetchPerio() {
			try {
				const res = await fetch(`/api/periodontogram/${encodeURIComponent(safePatientId)}`, {
					headers: getDenteAuthHeaders(),
				});
				if (!res.ok) { console.warn("[PerioStudio] Server responded with error status:", res.status); return; }
				const json = await res.json();
				if (isCancelled || !json.success || !json.data) return;
				if (Array.isArray(json.data.teeth) && json.data.teeth.length > 0) {
					const converted = convertSepaDentitionToPerio(json.data.teeth);
					if (converted && converted.length > 0) setTeeth(normalizePerioDentition(converted));
				}
				if (json.data.indices?.psrData && typeof json.data.indices.psrData === "object") {
					const rawPsr = json.data.indices.psrData as Record<string, unknown>;
					const validMap: Partial<PsrScreeningMap> = {};
					const validSextants: PsrSextantId[] = ["S1", "S2", "S3", "S4", "S5", "S6"];
					for (const sId of validSextants) {
						const item = rawPsr[sId];
						if (item && typeof item === "object") {
							const rec = item as Record<string, unknown>;
							const code = Number(rec.code ?? 0) as PsrCode;
							const asterisk = Boolean(rec.asterisk);
							if ([0, 1, 2, 3, 4].includes(code)) {
								validMap[sId] = { code, asterisk };
							}
						}
					}
					if (Object.keys(validMap).length === 6) {
						setScreeningMap(validMap as PsrScreeningMap);
					}
				}
			} catch (err) {
				console.warn("[PerioStudio] Failed to load periodontogram:", err);
				showToast("Сетевой сбой при загрузке пародонтограммы. Используются локальные данные.", "warning", 4000, {
					label: "Повторить", onAction: () => { void fetchPerio(); },
				});
			}
		}
		void fetchPerio();
		return () => { isCancelled = true; };
	}, [patientId]);

	useEffect(() => { if (onChange) onChange(teeth, summary); }, [teeth, summary, onChange]);
	const updateSextant = useCallback((id: PsrSextantId, code: PsrCode, asterisk?: boolean) => {
		setScreeningMap((prev) => ({ ...prev, [id]: { code, asterisk: asterisk ?? prev[id]?.asterisk ?? false } }));
		if (code >= 3) setIsDetailedExpanded(true);
	}, []);
	const toggleAsterisk = useCallback((id: PsrSextantId) => {
		setScreeningMap((prev) => ({ ...prev, [id]: { code: prev[id]?.code ?? 0, asterisk: !prev[id]?.asterisk } }));
	}, []);
	const handleSetAllIntact = useCallback(() => {
		setTeeth(normalizePerioDentition(null));
		setScreeningMap({ S1: { code: 0, asterisk: false }, S2: { code: 0, asterisk: false }, S3: { code: 0, asterisk: false }, S4: { code: 0, asterisk: false }, S5: { code: 0, asterisk: false }, S6: { code: 0, asterisk: false } });
		setSelectedProtocolId(null);
		showToast("✓ Все секстанты интактны (PSR 0 во всех 6 секстантах)", "success");
	}, []);
	const handleApplyUpperJawNorm = useCallback(() => { setTeeth((p) => applyUpperJawNormPreset(p)); showToast("✓ ВЧ (18–28): норма 1–2 мм", "success"); }, []);
	const handleApplyLowerJawNorm = useCallback(() => { setTeeth((p) => applyLowerJawNormPreset(p)); showToast("✓ НЧ (48–38): норма 1–2 мм", "success"); }, []);
	const handleApplyZeroBop = useCallback(() => { setTeeth((p) => applyZeroBopPreset(p)); showToast("✓ Все десны без кровоточивости (BOP 0%)", "success"); }, []);
	const handleApplyZeroCalculus = useCallback(() => { setTeeth((p) => applyZeroCalculusAndPlaquePreset(p)); showToast("✓ Налёт и камень сброшены (0%)", "success"); }, []);
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
		dispatchPresetSideEffects({ ...res, service: { code: protocol.serviceCode, serviceCode: protocol.serviceCode, name: protocol.titleRu, priceKopecks: protocol.priceKopecks, category: "Пародонтология" } }, onInsertToProtocol);
	}, [teeth, onInsertToProtocol]);

	const dispatchPerioSoapSync = useCallback((currentTeeth: readonly PerioToothRecord[]) => {
		const text = generateComprehensivePerioProtocolText(currentTeeth, summary, {
			doctorName,
			customNotes: `PSR: ${psrSummary.psrFormula} (${psrSummary.suggestedDiagnosisRu})`,
		});
		if (onInsertToProtocol) onInsertToProtocol(text);
		try {
			useVisitStore.getState().setVisitNoteForm((prev) => {
				const existing = prev.objectiveStatus?.trim() || "";
				return { ...prev, objectiveStatus: existing ? `${existing}\n\n${text}` : text };
			});
		} catch { /* safe */ }
		if (typeof window !== "undefined") {
			window.dispatchEvent(new CustomEvent("dente-apply-soap-protocol", { detail: { statusLocalis: text, objectiveStatus: text, mode: "smart_append" } }));
		}
	}, [onInsertToProtocol, summary, doctorName, psrSummary]);

	const handleSave = useCallback(async () => {
		if (syncStatus === "saving") return;
		setSyncStatus("saving");
		const emitSnapshot = () => {
			if (typeof window !== "undefined") {
				window.dispatchEvent(new CustomEvent("dente:perio-snapshot-saved", {
					detail: { patientId, visitId, summary, psrSummary, teeth, screeningMap },
				}));
			}
		};
		try {
			if (patientId?.trim()) {
				const sepaTeeth = convertPerioDentitionToSepa(teeth);
				const allSites = sepaTeeth.flatMap((t) => (t.sites || []).map((s) => ({
					toothNumber: t.toothNumber, siteCode: s.siteCode, probingDepthMm: s.probingDepthMm,
					gingivalMarginMm: s.gingivalMarginMm, bleedingOnProbing: Boolean(s.bleedingOnProbing),
					plaque: Boolean(s.plaque), calculus: Boolean(s.calculus), suppuration: Boolean(s.suppuration),
				})));
				const res = await fetch(`/api/periodontogram/${encodeURIComponent(patientId)}`, {
					method: "POST",
					headers: getDenteAuthHeaders({
						"Content-Type": "application/json",
						"Idempotency-Key": generateUuidV7(),
					}),
					body: JSON.stringify({
						teeth: sepaTeeth.map((t) => ({ toothNumber: t.toothNumber, isPresent: t.isPresent, isImplant: t.isImplant, mobility: t.mobility, furcationBuccal: t.furcationBuccal, furcationLingual: t.furcationLingual })),
						sites: allSites, notes: `PSR: ${psrSummary.psrFormula} (${psrSummary.suggestedDiagnosisRu})`,
						visitId: visitId || undefined, status: "closed", autoClose: true, indices: { psrData: screeningMap, psrSummary },
					}),
				});
				if (!res.ok) throw new Error(`Ошибка сервера ${res.status}`);
				try { localStorage.setItem(`dente_perio_cache_${patientId}`, JSON.stringify({ teeth, screeningMap, savedAt: new Date().toISOString() })); } catch (e) { console.warn("[PerioStudio] Failed to write cache:", e); }
			}
			await deductPeriodontalConsumablesSoftOverdraft(summary.deepPocketsCount > 0 ? "vector" : "hygiene", visitId);
			setSyncStatus("saved");
			dispatchPerioSoapSync(teeth);
			emitSnapshot();
			if (onSave) onSave(teeth, summary);
			showToast("✓ Пародонтограмма сохранена в ЭМК", "success");
			if (isModal) handleClose();
		} catch (err) {
			console.error("[PerioStudio] Save failed:", err);
			if (patientId?.trim()) {
				try { localStorage.setItem(`dente_perio_cache_${patientId}`, JSON.stringify({ teeth, screeningMap, savedAt: new Date().toISOString() })); } catch (e) { console.warn("[PerioStudio] Failed to write fallback cache:", e); }
			}
			setSyncStatus("saved");
			dispatchPerioSoapSync(teeth);
			emitSnapshot();
			showToast("Сетевой сбой при сохранении на сервере. Данные сохранены в локальный кэш (офлайн)", "warning", 5000, { label: "Повторить", onAction: () => { void handleSave(); } });
			if (onSave) onSave(teeth, summary);
			if (isModal) handleClose();
		}
	}, [syncStatus, patientId, teeth, psrSummary, screeningMap, summary, dispatchPerioSoapSync, onSave, isModal, handleClose, visitId]);

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

		// Анатомический обход дуги Florida Probe: непрерывный проход по всей челюсти
		if (probingSequence.length > 0) {
			const currIdx = probingSequence.findIndex((s) => s.toothNumber === selectedToothNum && s.siteKey === selectedSiteKey);
			if (currIdx >= 0 && currIdx < probingSequence.length - 1) {
				const nextStep = probingSequence[currIdx + 1];
				if (nextStep) { setSelectedToothNum(nextStep.toothNumber); setSelectedSiteKey(nextStep.siteKey as SiteKey); }
			} else if (currIdx === probingSequence.length - 1) {
				const firstStep = probingSequence[0];
				if (firstStep) { setSelectedToothNum(firstStep.toothNumber); setSelectedSiteKey(firstStep.siteKey as SiteKey); }
				showToast("✓ Полный анатомический цикл зондирования завершён", "success");
			}
		}
	}, [selectedToothNum, selectedSiteKey, probingSequence]);

	const handleToggleBop = useCallback(() => {
		setTeeth((prev) => prev.map((t) => t.toothNumber !== selectedToothNum ? t : { ...t, [selectedSiteKey]: { ...(t[selectedSiteKey] || { probingDepthMm: 2, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false, calculus: false, suppuration: false }), bleedingOnProbing: !t[selectedSiteKey]?.bleedingOnProbing } }));
	}, [selectedToothNum, selectedSiteKey]);

	const handleTogglePlaque = useCallback(() => {
		setTeeth((prev) => prev.map((t) => t.toothNumber !== selectedToothNum ? t : { ...t, [selectedSiteKey]: { ...(t[selectedSiteKey] || { probingDepthMm: 2, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false, calculus: false, suppuration: false }), plaque: !t[selectedSiteKey]?.plaque } }));
	}, [selectedToothNum, selectedSiteKey]);

	const handleUpdateMobility = useCallback((mobility: 0 | 1 | 2 | 3) => {
		setTeeth((prev) => prev.map((t) => (t.toothNumber === selectedToothNum ? { ...t, mobility } : t)));
	}, [selectedToothNum]);

	const handleNavigateSite = useCallback((direction: "next" | "prev") => {
		if (probingSequence.length === 0) return;
		const currIdx = probingSequence.findIndex((s) => s.toothNumber === selectedToothNum && s.siteKey === selectedSiteKey);
		const targetIdx = direction === "next" ? (currIdx >= 0 && currIdx < probingSequence.length - 1 ? currIdx + 1 : 0) : (currIdx > 0 ? currIdx - 1 : probingSequence.length - 1);
		const step = probingSequence[targetIdx];
		if (step) { setSelectedToothNum(step.toothNumber); setSelectedSiteKey(step.siteKey as SiteKey); }
	}, [selectedToothNum, selectedSiteKey, probingSequence]);

	const handleNavigateTooth = useCallback((direction: "next" | "prev") => {
		const perioTeeth = ALL_PERIO_TEETH as readonly number[];
		const tIdx = perioTeeth.indexOf(selectedToothNum);
		const target = direction === "next" ? (tIdx >= 0 && tIdx < perioTeeth.length - 1 ? perioTeeth[tIdx + 1] : perioTeeth[0]) : (tIdx > 0 ? perioTeeth[tIdx - 1] : perioTeeth[perioTeeth.length - 1]);
		if (target !== undefined) setSelectedToothNum(target);
	}, [selectedToothNum]);

	const handleToggleJawAspect = useCallback(() => {
		const aspectMap: Record<SiteKey, SiteKey> = { distoBuccal: "distoLingual", midBuccal: "midLingual", mesioBuccal: "mesioLingual", distoLingual: "distoBuccal", midLingual: "midBuccal", mesioLingual: "mesioBuccal" };
		setSelectedSiteKey((cur) => aspectMap[cur] || cur);
	}, []);

	// Разблокированный клавиатурный ввод 1..9, 10..15 мм, Пробел (BOP), стрелки, Tab
	useEffect(() => {
		if (!isOpen) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			const tag = (e.target as HTMLElement)?.tagName;
			if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

			if (pendingOneRef.current && e.key >= "0" && e.key <= "5") {
				e.preventDefault();
				if (twoDigitTimerRef.current) clearTimeout(twoDigitTimerRef.current);
				pendingOneRef.current = false;
				handleUpdateDepth(10 + Number(e.key));
				return;
			}
			if (twoDigitTimerRef.current) clearTimeout(twoDigitTimerRef.current);
			pendingOneRef.current = false;
			if (e.key === "1") {
				e.preventDefault();
				pendingOneRef.current = true;
				twoDigitTimerRef.current = setTimeout(() => { pendingOneRef.current = false; handleUpdateDepth(1); }, 650);
				return;
			}
			if (e.key >= "2" && e.key <= "9") { e.preventDefault(); handleUpdateDepth(Number(e.key)); }
			else if (e.code === "Space" || e.key === " ") { e.preventDefault(); handleToggleBop(); }
			else if (e.key === "Tab") { e.preventDefault(); handleNavigateSite(e.shiftKey ? "prev" : "next"); }
			else if (e.key === "ArrowRight") { e.preventDefault(); handleNavigateTooth("next"); }
			else if (e.key === "ArrowLeft") { e.preventDefault(); handleNavigateTooth("prev"); }
			else if (e.key === "ArrowUp" || e.key === "ArrowDown") { e.preventDefault(); handleToggleJawAspect(); }
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
			if (twoDigitTimerRef.current) clearTimeout(twoDigitTimerRef.current);
		};
	}, [isOpen, handleUpdateDepth, handleToggleBop, handleNavigateSite, handleNavigateTooth, handleToggleJawAspect]);

	if (!isOpen) return null;

	const content = (
		<div id={modalId} data-testid="interactive-periodontogram" className="interactive-periodontogram flex flex-col gap-2 select-none relative rounded-t-[24px] sm:rounded-2xl p-3 sm:p-3.5 pb-28 sm:pb-3 bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] shadow-xl w-full max-w-full overflow-x-clip">
			<div className="w-9 h-1 rounded-full bg-[var(--line)] mx-auto my-0.5 sm:hidden print:hidden" aria-hidden="true" />
			{/* Шапка студии */}
			<div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-2 border-b border-[var(--line)] perio-header-row">
				<div className="flex items-center gap-2.5 min-w-0">
					<div className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center shrink-0">
						<Activity className="w-4 h-4" />
					</div>
					<div className="min-w-0">
						<h2 className="text-sm font-bold text-[var(--ink)] leading-tight flex flex-wrap items-center gap-1.5">
							Студия пародонтологии и гигиены
							<span className="text-[11px] px-2 py-0.5 rounded font-bold bg-[var(--primary)]/15 text-[var(--primary)] border border-[var(--primary)]/30 whitespace-nowrap shrink-0">{psrSummary.psrFormula}</span>
						</h2>
						<p className="text-xs text-[var(--muted)] truncate max-w-xs sm:max-w-sm">{patientName}</p>
					</div>
				</div>

				<div className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 shrink-0 perio-toolbar-actions">
					<div className="flex items-center gap-1.5 px-2.5 py-1 min-h-[36px] rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-xs whitespace-nowrap shrink-0 perio-indices-badge">
						<span className="w-2 h-2 rounded-full bg-[var(--success,#10b981)] shrink-0" />
						<span className="text-[var(--muted)] font-medium">BOP:</span>
						<span className="font-bold text-[var(--ink)]">{summary.fmbsPercent}%</span>
						<span className="text-[var(--line)]">|</span>
						<span className="text-[var(--muted)] font-medium">Карманы:</span>
						<span className={`font-bold ${summary.deepPocketsCount > 0 ? "text-[var(--danger,#e11d48)]" : "text-[var(--success,#10b981)]"}`}>{summary.deepPocketsCount}</span>
					</div>
					<button type="button" onClick={handlePrintProtocol} data-testid="perio-print-protocol-btn" className="min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-0 sm:h-9 px-2.5 rounded-xl bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:border-[var(--primary)] text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors" title="Печать карты">
						<Printer className="w-4 h-4 shrink-0" />
						<span className="hidden sm:inline">Печать</span>
					</button>
					<button type="button" onClick={() => setShowIndicesPanel((prev) => !prev)} data-testid="perio-calc-indices-btn" className="min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-0 sm:h-9 px-2.5 rounded-xl bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:border-[var(--primary)] text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors" title="Индексы">
						<Info className="w-4 h-4 shrink-0" />
						<span className="hidden sm:inline">Индексы</span>
					</button>
					<div className="hidden sm:inline-flex shrink-0 perio-desktop-primary-cta">
						<button type="button" onClick={handleSave} aria-busy={syncStatus === "saving"} data-testid="perio-save-draft-btn" title="Сохранить пародонтограмму" className="min-h-[36px] h-9 px-3 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap shadow-xs cursor-pointer transition-all perio-primary-cta-btn">
							<Check className="w-4 h-4 shrink-0" />
							{syncStatus === "saving" ? "Сохранение..." : "Сохранить пародонтограмму"}
							<span className="sr-only">Сохранить периодонтограмму</span>
						</button>
					</div>
					{isModal && onClose && (
						<button type="button" onClick={handleClose} data-testid="perio-modal-close-btn" className="min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] sm:h-9 sm:w-9 rounded-xl bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] border border-[var(--line)] flex items-center justify-center shrink-0 cursor-pointer transition-colors ml-auto sm:ml-0 perio-close-btn" aria-label="Закрыть">
							<X className="w-4 h-4" />
						</button>
					)}
				</div>
			</div>

			{showIndicesPanel && (
				<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-wrap items-center justify-between gap-3 text-xs">
					<div className="flex flex-wrap items-center gap-4">
						<div><span className="text-[var(--muted)]">BOP:</span> <span className="font-bold text-[var(--ink)]">{summary.fmbsPercent}%</span></div>
						<div><span className="text-[var(--muted)]">Глубокие карманы (&ge; 4 мм):</span> <span className="font-bold text-[var(--ink)]">{summary.deepPocketsCount}</span></div>
						<div><span className="text-[var(--muted)]">PSR:</span> <span className="font-bold text-[var(--primary)]">{psrSummary.psrFormula}</span></div>
					</div>
					<button type="button" onClick={() => setShowIndicesPanel(false)} className="min-h-[44px] sm:min-h-[36px] px-2 text-xs text-[var(--muted)] hover:text-[var(--ink)] underline cursor-pointer">Скрыть</button>
				</div>
			)}

			{/* Клинические пресеты и макро-выбор челюстей */}
			<div className="perio-presets-container">
				<PerioPresetActions
					onSetAllIntact={handleSetAllIntact} onApplyPreset={handleApplyPreset}
					onApplyUpperJawNorm={handleApplyUpperJawNorm} onApplyLowerJawNorm={handleApplyLowerJawNorm}
					onApplyZeroBop={handleApplyZeroBop} onApplyZeroCalculus={handleApplyZeroCalculus}
				/>
			</div>

			{/* Сетка 6 секстантов экспресс-скрининга PSR */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 perio-psr-grid">
				{PSR_SEXTANTS_CATALOG.map((s) => {
					const cur = screeningMap[s.id] ?? { code: 0, asterisk: false };
					const meta = PSR_CODES_CATALOG[cur.code];
					return (
						<div key={s.id} data-testid={`psr-sextant-card-${s.id}`} className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-2 hover:border-[var(--primary)]/40 transition-colors">
							<div className="flex items-center justify-between gap-2">
								<div>
									<span className="font-bold text-xs text-[var(--ink)]">{s.name} ({s.teethRange})</span>
									<span className="text-[11px] text-[var(--muted)] block">{s.labelRu}</span>
								</div>
								<button type="button" onClick={() => toggleAsterisk(s.id)} className={`touch-manipulation min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] px-2 rounded-md font-bold text-xs cursor-pointer transition-all border shrink-0 ${cur.asterisk ? "bg-[var(--danger,#e11d48)] text-white border-[var(--danger,#e11d48)] shadow-xs" : "bg-[var(--paper)] text-[var(--muted)] border-[var(--line)] hover:text-[var(--danger,#e11d48)]"}`} title="Символ *: вовлечение фуркаций, подвижность II–III ст., рецессия >= 3.5 мм">
									{cur.asterisk ? "* Фуркация / Рецессия" : "*"}
								</button>
							</div>
							<div className="grid grid-cols-5 gap-2 sm:gap-1.5">
								{([0, 1, 2, 3, 4] as PsrCode[]).map((code) => (
									<button key={code} type="button" onClick={() => updateSextant(s.id, code)} aria-pressed={cur.code === code} className={`min-h-[44px] min-w-[44px] sm:min-h-[38px] rounded-xl text-xs font-bold flex flex-col items-center justify-center cursor-pointer transition-all border ${cur.code === code ? "bg-[var(--primary)]/15 text-[var(--primary)] border-[var(--primary)] ring-1 ring-[var(--primary)]" : "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--primary)]"}`}>
										<span className="text-sm font-extrabold">{code}</span>
									</button>
								))}
							</div>
							<div className="text-[11px] text-[var(--muted)] leading-tight pt-0.5" title={meta.criteriaRu}>{meta.labelRu}</div>
						</div>
					);
				})}
			</div>

			{/* 4 канонических протокола гигиены */}
			<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-2 perio-protocols-panel">
				<div className="flex items-center justify-between">
					<span className="text-xs font-bold text-[var(--ink)]">Клинические комплексы:</span>
					<span className="text-[11px] text-[var(--muted)]">Пакетное списание расходников</span>
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
					{PERIO_TREATMENT_PROTOCOLS.map((proto) => {
						const isSelected = selectedProtocolId === proto.id;
						return (
							<button key={proto.id} type="button" onClick={() => handleSelectProtocol(proto)} className={`min-h-[44px] p-2.5 rounded-xl text-left text-xs border cursor-pointer transition-all flex flex-col justify-between gap-1.5 items-stretch w-full ${isSelected ? "bg-[var(--primary)]/10 text-[var(--ink)] border-[var(--primary)] ring-1 ring-[var(--primary)]" : "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--line-strong)]"}`}>
								<div className="w-full">
									<div className="font-bold text-xs leading-tight min-h-[30px] break-words">{proto.titleRu}</div>
									<div className="text-[11px] text-[var(--muted)] pt-0.5 break-words">{proto.descriptionRu}</div>
								</div>
								<div className="w-full flex items-center justify-between gap-2 pt-1.5 border-t border-[var(--line)]">
									<span className="text-[11px] font-semibold text-[var(--primary)] shrink-0">{formatKopecksToRub(proto.priceKopecks)}</span>
									<span className="text-[10px] text-[var(--muted)] font-medium text-right truncate">Клинический протокол</span>
								</div>
							</button>
						);
					})}
				</div>
			</div>

			{/* Клиническое заключение */}
			<div className="p-3.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 perio-conclusion-panel">
				<div>
					<div className="flex flex-wrap items-center gap-2">
						<span className="text-xs font-bold text-[var(--ink)]">Клиническое заключение:</span>
						<span className="text-xs px-2 py-0.5 rounded font-bold bg-[var(--primary)]/15 text-[var(--primary)] border border-[var(--primary)]/30">
							{psrSummary.suggestedDiagnosisRu} ({psrSummary.icd10Code})
						</span>
					</div>
					<p className="text-xs text-[var(--muted)] pt-1">{psrSummary.hygienePlanRu}</p>
				</div>
				<button type="button" onClick={() => {
					const text = generateComprehensivePerioProtocolText(teeth, summary, {
						doctorName,
						customNotes: `PSR: ${psrSummary.psrFormula} (${psrSummary.suggestedDiagnosisRu})\nРекомендации: ${psrSummary.hygienePlanRu}`,
					});
					if (onInsertToProtocol) {
						onInsertToProtocol(text);
						showToast("✓ Протокол осмотра скопирован в дневник приёма", "success");
					} else if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
						void navigator.clipboard.writeText(text).then(() => showToast("✓ Протокол осмотра скопирован в буфер обмена", "success")).catch(() => showToast("Не удалось скопировать в буфер обмена", "error"));
					} else {
						showToast("✓ Протокол осмотра сформирован", "info");
					}
				}} data-testid="perio-insert-protocol-btn" className="min-h-[44px] sm:min-h-[36px] px-3.5 rounded-xl bg-[var(--paper)] text-[var(--ink)] font-semibold text-xs border border-[var(--line)] hover:border-[var(--primary)] flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors perio-insert-btn">
					<FileText className="w-4 h-4" />
					Вставить в дневник
				</button>
			</div>

			{/* Анатомическая карта челюстей и углубленное зондирование */}
			<div className="perio-detailed-wrapper">
				<PerioDetailedProbeSection
					isDetailedExpanded={isDetailedExpanded}
					onToggleDetailedExpanded={() => setIsDetailedExpanded((prev) => !prev)}
					teeth={teeth} selectedToothNum={selectedToothNum} onSelectToothNum={setSelectedToothNum}
					selectedSiteKey={selectedSiteKey} onSelectSiteKey={setSelectedSiteKey}
					onUpdateMobility={handleUpdateMobility} onUpdateDepth={handleUpdateDepth}
					onToggleBop={handleToggleBop} onTogglePlaque={handleTogglePlaque}
				/>
			</div>

			{/* Печатный футер A4 с подписью врача */}
			<div className="hidden print:flex flex-col gap-4 pt-6 mt-4 border-t-2 border-black text-xs text-black perio-print-footer">
				<div className="flex justify-between items-center">
					<span>Дата обследования: {new Date().toLocaleDateString("ru-RU")}</span><span>Пациент: {patientName}</span>
				</div>
				<div className="flex justify-between items-center pt-4">
					<span>Врач-стоматолог: ____________________ / ____________________</span><span>Подпись: ____________________ (М.П.)</span>
				</div>
			</div>

			{/* Мобильная плавающая нижняя плашка Primary CTA (Natural Thumb Zone) */}
			<div className="perio-mobile-floating-bar fixed bottom-0 left-0 right-0 p-3 pb-safe bg-[var(--paper-strong)] border-t border-[var(--line)] z-[110] flex sm:hidden">
				<button type="button" onClick={handleSave} aria-busy={syncStatus === "saving"} data-testid="perio-save-mobile-btn" className="w-full min-h-[48px] h-12 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md cursor-pointer active:scale-[0.99] transition-all perio-primary-cta-btn">
					<Check className="w-4 h-4" />{syncStatus === "saving" ? "Сохранение..." : "Сохранить пародонтограмму"}
				</button>
			</div>
		</div>
	);

	if (isModal) {
		return (
			<div className="fixed inset-0 z-[10060] pointer-events-auto flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto perio-modal-overlay" style={{ backgroundColor: "rgba(15, 23, 42, 0.65)" }} data-testid="perio-chart-modal" role="dialog" aria-modal="true">
				<div className="w-full max-w-7xl my-0 sm:my-auto max-h-[94vh] overflow-y-auto rounded-t-[24px] sm:rounded-2xl perio-modal-content">{content}</div>
			</div>
		);
	}
	return content;
});

PerioStudioModal.displayName = "PerioStudioModal";
export default PerioStudioModal;
