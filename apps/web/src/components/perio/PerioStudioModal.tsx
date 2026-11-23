/**
 * PerioStudioModal.tsx — Канонический SSOT кабинет пародонтологии и экспресс-скрининга PSR DENTE CRM.
 * Объединяет экспресс-скрининг ВОЗ (PSR) по 6 секстантам, протоколы профгигиены AirFlow/Кюретаж/Шинирование,
 * списание расходников пакетом (Soft Negative Stock, Мандат 8n), автономию врача (Мандат 8e),
 * и ровно ОДНУ Primary CTA кнопку (var(--primary)) на видимый контекст (Мандат 8am).
 * Норматив размера: < 380 строк (Мандат 8b).
 */

import React, { useId, useMemo, useState, useCallback, useEffect } from "react";
import type { PerioChartSummary, PerioToothRecord } from "@dental/shared";
import {
	calculatePerioIndices, calculateOlearyFromPerioTeeth, deriveHygieneFromPerioTeeth,
	calculateOhiSScore, calculatePmaScore,
	convertPerioDentitionToSepa, convertSepaDentitionToPerio, formatKopecksToRub,
	generateComprehensivePerioProtocolText, generateFullMouthProbingSequence,
	generateUuidV7,
} from "@dental/shared";
import { Check } from "lucide-react";
import { showToast } from "../GlobalToast";
import { useVisitStore } from "../../store/visitStore";
import { useDraftStore } from "../../store/patientStore";
import { denteQueryClient } from "../../lib/queryClient";
import { getDenteAuthHeaders } from "../../lib/denteRequestHeaders";
import {
	applyExpressPerioPreset, applyPsrSextantCode, applyUpperJawNormPreset, applyLowerJawNormPreset,
	applyZeroBopPreset, applyZeroCalculusAndPlaquePreset, calculatePsrSextants, computePsrSummary, deductPeriodontalConsumablesSoftOverdraft,
	dispatchPresetSideEffects, normalizePerioDentition, PSR_CODES_CATALOG, PSR_SEXTANTS_CATALOG,
	PERIO_TREATMENT_PROTOCOLS, type PerioTreatmentProtocol, type PsrCode, type PsrScreeningMap, type PsrSextantId, type SiteKey,
} from "./perioCatalogData";
import { PerioPresetActions } from "./PerioPresetActions";
import { PerioStudioHeader } from "./PerioStudioHeader";
import { PerioPsrSextantsGrid } from "./PerioPsrSextantsGrid";
import { PerioProtocolsAndConclusion } from "./PerioProtocolsAndConclusion";
import { PerioDetailedProbeSection } from "./PerioDetailedProbeSection";
import { PerioIndicesPanel } from "./PerioIndicesPanel";
import { usePerioKeyboardNavigation } from "./usePerioKeyboardNavigation";
import { PerioPrintFooter } from "./PerioPrintFooter";

export interface PerioStudioModalProps {
	readonly isOpen?: boolean | undefined; readonly onClose?: (() => void) | undefined; readonly isModal?: boolean | undefined;
	readonly patientId?: string | undefined; readonly patientName?: string | undefined; readonly organizationId?: string | undefined;
	readonly doctorId?: string | undefined; readonly doctorName?: string | undefined; readonly visitId?: string | undefined;
	readonly initialTeeth?: readonly (Partial<PerioToothRecord> & { toothNumber: number })[] | readonly PerioToothRecord[] | undefined; readonly initialTab?: "psr" | "chart" | undefined; readonly initialSelectedTooth?: number | undefined; readonly initialTier3Expanded?: boolean | undefined;
	readonly onChange?: ((teeth: PerioToothRecord[], summary: PerioChartSummary) => void) | undefined; readonly onSave?: ((teeth: PerioToothRecord[], summary: PerioChartSummary) => void) | undefined; readonly onInsertToProtocol?: ((protocolText: string) => void) | undefined; readonly readOnly?: boolean | undefined; readonly compactMode?: boolean | undefined;
}

function convertPsrResultsToScreeningMap(results: Record<string, { code: 0 | 1 | 2 | 3 | 4; asterisk: boolean }>): PsrScreeningMap {
	const map: Partial<PsrScreeningMap> = {};
	for (const s of PSR_SEXTANTS_CATALOG) {
		const res = results[s.id];
		map[s.id] = {
			code: (res?.code ?? 0) as PsrCode,
			asterisk: Boolean(res?.asterisk),
		};
	}
	return map as PsrScreeningMap;
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

	const [teeth, setTeeth] = useState<PerioToothRecord[]>(() => normalizePerioDentition(initialTeeth));
	const [screeningMap, setScreeningMap] = useState<PsrScreeningMap>(() => ({ S1: { code: 0, asterisk: false }, S2: { code: 0, asterisk: false }, S3: { code: 0, asterisk: false }, S4: { code: 0, asterisk: false }, S5: { code: 0, asterisk: false }, S6: { code: 0, asterisk: false } }));
	const summary = useMemo(() => calculatePerioIndices(teeth), [teeth]);
	const psrSummary = useMemo(() => computePsrSummary(screeningMap), [screeningMap]);
	const olearySummary = useMemo(() => calculateOlearyFromPerioTeeth(teeth), [teeth]);
	const hygieneAssessments = useMemo(() => deriveHygieneFromPerioTeeth(teeth), [teeth]);
	const ohiResult = useMemo(() => calculateOhiSScore(hygieneAssessments), [hygieneAssessments]);
	const pmaResult = useMemo(() => calculatePmaScore(hygieneAssessments), [hygieneAssessments]);
	const probingSequence = useMemo(() => generateFullMouthProbingSequence(teeth), [teeth]);

	// SEV-1.2: Автоматический пересчет секстантов PSR при клавиатурном и кликовом вводе зондирования
	const setTeethWithPsrSync: React.Dispatch<React.SetStateAction<PerioToothRecord[]>> = useCallback((action) => {
		setTeeth((prev) => {
			const next = typeof action === "function" ? action(prev) : action;
			const psrResults = calculatePsrSextants(next);
			setScreeningMap(convertPsrResultsToScreeningMap(psrResults));
			return next;
		});
	}, []);

	const {
		handleUpdateDepth, handleToggleBop, handleTogglePlaque, handleToggleSuppuration,
		handleUpdateGingivalMargin, handleUpdateMobility, handleUpdateFurcation, clearTimers,
	} = usePerioKeyboardNavigation({
		isOpen, selectedToothNum, selectedSiteKey, probingSequence, teeth,
		setTeeth: setTeethWithPsrSync, setSelectedToothNum, setSelectedSiteKey,
	});

	const handleClose = useCallback(() => {
		clearTimers();
		// Zero-Leak Draft Invariant (Мандат 8d / 8zq, 8bn / SEV-4.1): полный сброс черновика к дефолту и очистка кэша
		const cleanPatientId = patientId?.trim();
		if (cleanPatientId) {
			try {
				localStorage.removeItem(`dente_perio_draft_v2_${cleanPatientId}`);
				localStorage.removeItem(`dente_perio_draft_${cleanPatientId}`);
			} catch {
				// safe
			}
		}
		try {
			useDraftStore.getState().resetDraft();
		} catch {
			// safe
		}
		setTeeth(normalizePerioDentition(initialTeeth));
		setScreeningMap({ S1: { code: 0, asterisk: false }, S2: { code: 0, asterisk: false }, S3: { code: 0, asterisk: false }, S4: { code: 0, asterisk: false }, S5: { code: 0, asterisk: false }, S6: { code: 0, asterisk: false } });
		setSelectedProtocolId("prophy_airflow_ultrasound");
		setSelectedToothNum(initialSelectedTooth);
		setSelectedSiteKey("distoBuccal");
		setSyncStatus("idle");
		setShowIndicesPanel(false);
		setIsDetailedExpanded(initialTier3Expanded);
		if (onClose) onClose();
	}, [clearTimers, patientId, initialTeeth, initialSelectedTooth, initialTier3Expanded, onClose]);

	useEffect(() => {
		if (!initialTeeth?.length) return;
		type InitialToothItem = (Partial<PerioToothRecord> & { toothNumber: number });
		const initMap = new Map<number, InitialToothItem>();
		for (const it of initialTeeth) {
			initMap.set(it.toothNumber, it);
		}
		setTeeth((prev) =>
			prev.map((t) => {
				const it = initMap.get(t.toothNumber);
				return it
					? { ...t, isMissing: it.isMissing ?? t.isMissing, isImplant: it.isImplant ?? t.isImplant }
					: t;
			}),
		);
	}, [initialTeeth]);

	// Escape key dismissal for modal mode
	useEffect(() => {
		if (!isOpen || !isModal) return;
		const handleKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); handleClose(); } };
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, isModal, handleClose]);

	// Debounced Draft Autosave (Мандат 8e / Домен 20 / SEV-4.1) — сохранение каждые 500мс в v2
	useEffect(() => {
		const cleanPatientId = patientId?.trim();
		if (!cleanPatientId) return;
		const timer = setTimeout(() => {
			try {
				localStorage.setItem(
					`dente_perio_draft_v2_${cleanPatientId}`,
					JSON.stringify({ teeth, screeningMap, selectedProtocolId, updatedAt: new Date().toISOString() }),
				);
			} catch (e) { console.warn("[PerioStudio] Failed to autosave draft to localStorage:", e); }
		}, 500);
		return () => clearTimeout(timer);
	}, [patientId, teeth, screeningMap, selectedProtocolId]);

	useEffect(() => {
		const cleanPatientId = patientId?.trim();
		if (!cleanPatientId) return;
		const safePatientId = cleanPatientId;
		let isCancelled = false;
		try {
			const draftV2 = localStorage.getItem(`dente_perio_draft_v2_${safePatientId}`);
			const draftV1 = !draftV2 ? localStorage.getItem(`dente_perio_draft_${safePatientId}`) : null;
			const draft = draftV2 || draftV1;
			if (draft) {
				const parsed = JSON.parse(draft);
				if (Array.isArray(parsed.teeth) && parsed.teeth.length > 0) setTeeth(normalizePerioDentition(parsed.teeth));
				if (parsed.screeningMap && typeof parsed.screeningMap === "object") setScreeningMap(parsed.screeningMap);
				if (parsed.selectedProtocolId) setSelectedProtocolId(parsed.selectedProtocolId);
			} else {
				const cached = localStorage.getItem(`dente_perio_cache_${safePatientId}`);
				if (cached) {
					const parsed = JSON.parse(cached);
					if (Array.isArray(parsed.teeth) && parsed.teeth.length > 0) setTeeth(normalizePerioDentition(parsed.teeth));
					if (parsed.screeningMap && typeof parsed.screeningMap === "object") setScreeningMap(parsed.screeningMap);
				}
			}
		} catch (err) { console.warn("[PerioStudio] Failed to read from local draft/cache:", err); }

		async function fetchPerio() {
			try {
				const res = await fetch(`/api/periodontogram/${encodeURIComponent(safePatientId)}`, { headers: getDenteAuthHeaders() });
				if (!res.ok) { console.warn("[PerioStudio] Server responded with error status:", res.status); return; }
				const json = await res.json();
				if (isCancelled || !json.success || !json.data) return;
				if (Array.isArray(json.data.teeth) && json.data.teeth.length > 0) {
					const converted = convertSepaDentitionToPerio(json.data.teeth);
					if (converted?.length) setTeeth(normalizePerioDentition(converted));
				}
				if (json.data.indices?.psrData && typeof json.data.indices.psrData === "object") {
					const rawPsr = json.data.indices.psrData as Record<string, unknown>;
					const validMap: Partial<PsrScreeningMap> = {};
					const validSextants: PsrSextantId[] = ["S1", "S2", "S3", "S4", "S5", "S6"];
					for (const sId of validSextants) {
						const item = rawPsr[sId] as Record<string, unknown> | undefined;
						if (item && [0, 1, 2, 3, 4].includes(Number(item.code))) validMap[sId] = { code: Number(item.code) as PsrCode, asterisk: Boolean(item.asterisk) };
					}
					if (Object.keys(validMap).length === 6) setScreeningMap(validMap as PsrScreeningMap);
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
		const targetAsterisk = asterisk ?? screeningMap[id]?.asterisk ?? false;
		setScreeningMap((prev) => ({ ...prev, [id]: { code, asterisk: targetAsterisk } }));
		setTeeth((prevTeeth) => applyPsrSextantCode(prevTeeth, id, code, targetAsterisk));
		if (code >= 3 || targetAsterisk) setIsDetailedExpanded(true);
	}, [screeningMap]);
	const toggleAsterisk = useCallback((id: PsrSextantId) => {
		const current = screeningMap[id] ?? { code: 0, asterisk: false };
		const nextAsterisk = !current.asterisk;
		setScreeningMap((prev) => ({ ...prev, [id]: { code: current.code, asterisk: nextAsterisk } }));
		setTeeth((prevTeeth) => applyPsrSextantCode(prevTeeth, id, current.code, nextAsterisk));
		if (nextAsterisk) setIsDetailedExpanded(true);
	}, [screeningMap]);
	const handleSetAllIntact = useCallback(() => {
		setTeeth(normalizePerioDentition(null));
		setScreeningMap({ S1: { code: 0, asterisk: false }, S2: { code: 0, asterisk: false }, S3: { code: 0, asterisk: false }, S4: { code: 0, asterisk: false }, S5: { code: 0, asterisk: false }, S6: { code: 0, asterisk: false } });
		setSelectedProtocolId(null);
		showToast("✓ Все секстанты интактны (PSR 0 во всех 6 секстантах)", "success");
	}, []);
	const applyPresetAndSync = useCallback((fn: (teeth: PerioToothRecord[]) => PerioToothRecord[], message: string) => {
		setTeeth((p) => {
			const updated = fn(p);
			setScreeningMap(convertPsrResultsToScreeningMap(calculatePsrSextants(updated)));
			return updated;
		});
		showToast(message, "success");
	}, []);
	const handleApplyUpperJawNorm = useCallback(() => applyPresetAndSync(applyUpperJawNormPreset, "✓ ВЧ (18–28): норма 1–2 мм"), [applyPresetAndSync]);
	const handleApplyLowerJawNorm = useCallback(() => applyPresetAndSync(applyLowerJawNormPreset, "✓ НЧ (48–38): норма 1–2 мм"), [applyPresetAndSync]);
	const handleApplyZeroBop = useCallback(() => applyPresetAndSync(applyZeroBopPreset, "✓ Все десны без кровоточивости (BOP 0%)"), [applyPresetAndSync]);
	const handleApplyZeroCalculus = useCallback(() => applyPresetAndSync(applyZeroCalculusAndPlaquePreset, "✓ Налёт и камень сброшены (0%)"), [applyPresetAndSync]);
	const handleApplyPreset = useCallback((presetId: string) => {
		const res = applyExpressPerioPreset(teeth, presetId);
		setTeeth(res.updatedTeeth);
		setScreeningMap(convertPsrResultsToScreeningMap(calculatePsrSextants(res.updatedTeeth)));
		if (presetId.includes("severe") || presetId.includes("moderate")) setIsDetailedExpanded(true);
		dispatchPresetSideEffects(res, onInsertToProtocol);
	}, [teeth, onInsertToProtocol]);
	const handleSelectProtocol = useCallback((protocol: PerioTreatmentProtocol) => {
		setSelectedProtocolId(protocol.id);
		const res = applyExpressPerioPreset(teeth, protocol.id === "prophy_airflow_ultrasound" ? "pro_hygiene_express" : protocol.id);
		setTeeth(res.updatedTeeth);
		setScreeningMap(convertPsrResultsToScreeningMap(calculatePsrSextants(res.updatedTeeth)));
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
		const syncPerioState = () => {
			if (patientId?.trim()) {
				try {
					localStorage.removeItem(`dente_perio_draft_v2_${patientId}`);
					localStorage.removeItem(`dente_perio_draft_${patientId}`);
					localStorage.setItem(`dente_perio_cache_${patientId}`, JSON.stringify({ teeth, screeningMap, savedAt: new Date().toISOString() }));
				} catch (e) { console.warn("[PerioStudio] Failed to write cache:", e); }
			}
			setSyncStatus("saved");
			dispatchPerioSoapSync(teeth);
			emitSnapshot();
			// SEV-2.3: Реактивная инвалидация кэша одонтограммы для мгновенного обновления статуса зубов без F5
			void denteQueryClient.invalidateQueries({ queryKey: ["odontogram", patientId] });
			void denteQueryClient.invalidateQueries({ queryKey: ["odontogram"] });
			if (typeof window !== "undefined") {
				window.dispatchEvent(new CustomEvent("dente-odontogram-update", { detail: { patientId, teeth } }));
			}
		};

		try {
			if (patientId?.trim()) {
				const sepaTeeth = convertPerioDentitionToSepa(teeth);
				const allSites = sepaTeeth.flatMap((t) => (t.sites || []).map((s) => ({
					toothNumber: t.toothNumber, siteCode: s.siteCode, probingDepthMm: s.probingDepthMm,
					gingivalMarginMm: s.gingivalMarginMm,
					calMm: Math.max(0, (s.probingDepthMm ?? 0) + (s.gingivalMarginMm ?? 0)),
					bleedingOnProbing: Boolean(s.bleedingOnProbing),
					plaque: Boolean(s.plaque), calculus: Boolean(s.calculus), suppuration: Boolean(s.suppuration),
				})));
				const res = await fetch(`/api/periodontogram/${encodeURIComponent(patientId)}`, {
					method: "POST",
					headers: getDenteAuthHeaders({ "Content-Type": "application/json", "Idempotency-Key": generateUuidV7() }),
					body: JSON.stringify({
						teeth: sepaTeeth.map((t) => ({ toothNumber: t.toothNumber, isPresent: t.isPresent, isImplant: t.isImplant, mobility: t.mobility, furcationBuccal: t.furcationBuccal, furcationLingual: t.furcationLingual })),
						sites: allSites, notes: `PSR: ${psrSummary.psrFormula} (${psrSummary.suggestedDiagnosisRu})`,
						visitId: visitId || undefined, status: "closed", autoClose: true, indices: { psrData: screeningMap, psrSummary },
					}),
				});
				if (!res.ok) throw new Error(`Ошибка сервера ${res.status}`);
			}
			await deductPeriodontalConsumablesSoftOverdraft(summary.deepPocketsCount > 0 ? "vector" : "hygiene", visitId);
			syncPerioState();
			if (onSave) onSave(teeth, summary);
			showToast("✓ Пародонтограмма сохранена в ЭМК", "success");
			if (isModal) handleClose();
		} catch (err) {
			console.error("[PerioStudio] Save failed:", err);
			syncPerioState();
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

	if (!isOpen) return null;

	const content = (
		<div id={modalId} data-testid="interactive-periodontogram" className="interactive-periodontogram flex flex-col gap-2 select-none relative rounded-t-[24px] sm:rounded-2xl p-3 sm:p-3.5 pb-28 sm:pb-3 bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] shadow-xl w-full max-w-full overflow-x-clip">
			<div className="w-9 h-1 rounded-full bg-[var(--line)] mx-auto my-0.5 sm:hidden print:hidden" aria-hidden="true" />
			{/* Шапка студии */}
			<PerioStudioHeader
				psrFormula={psrSummary.psrFormula}
				patientName={patientName}
				summary={summary}
				syncStatus={syncStatus}
				isModal={isModal}
				onPrintProtocol={handlePrintProtocol}
				onToggleIndices={() => setShowIndicesPanel((prev) => !prev)}
				onSave={handleSave}
				onClose={onClose ? handleClose : undefined}
			/>

			<PerioIndicesPanel
				isOpen={showIndicesPanel}
				onClose={() => setShowIndicesPanel(false)}
				olearySummary={olearySummary}
				ohiResult={ohiResult}
				pmaResult={pmaResult}
				summary={summary}
				psrFormula={psrSummary.psrFormula}
				suggestedDiagnosisRu={psrSummary.suggestedDiagnosisRu}
				icd10Code={psrSummary.icd10Code}
				onInsertDiagnosisToVisit={(icd, diag) => {
					try {
						useVisitStore.getState().setVisitNoteForm((prev) => ({ ...prev, diagnosisIcd10: icd, diagnosis: diag }));
						if (typeof window !== "undefined") {
							window.dispatchEvent(new CustomEvent("dente-apply-soap-protocol", { detail: { diagnosisIcd10: icd, diagnosis: diag, mode: "smart_append" } }));
						}
						showToast(`✓ Диагноз ${icd} (${diag}) внесён в приём`, "success");
					} catch {
						showToast(`Диагноз ${icd} зафиксирован`, "info");
					}
				}}
			/>

			{/* Клинические пресеты и макро-выбор челюстей */}
			<div className="perio-presets-container">
				<PerioPresetActions
					onSetAllIntact={handleSetAllIntact} onApplyPreset={handleApplyPreset}
					onApplyUpperJawNorm={handleApplyUpperJawNorm} onApplyLowerJawNorm={handleApplyLowerJawNorm}
					onApplyZeroBop={handleApplyZeroBop} onApplyZeroCalculus={handleApplyZeroCalculus}
				/>
			</div>

			{/* Сетка 6 секстантов экспресс-скрининга PSR */}
			<PerioPsrSextantsGrid
				screeningMap={screeningMap}
				onUpdateSextant={updateSextant}
				onToggleAsterisk={toggleAsterisk}
			/>

			{/* Клинические комплексы и заключение */}
			<PerioProtocolsAndConclusion
				selectedProtocolId={selectedProtocolId}
				onSelectProtocol={handleSelectProtocol}
				psrSummary={psrSummary}
				teeth={teeth}
				summary={summary}
				doctorName={doctorName}
				onInsertToProtocol={onInsertToProtocol}
			/>

			{/* Анатомическая карта челюстей и углубленное зондирование */}
			<div className="perio-detailed-wrapper">
				<PerioDetailedProbeSection
					isDetailedExpanded={isDetailedExpanded}
					onToggleDetailedExpanded={() => setIsDetailedExpanded((prev) => !prev)}
					teeth={teeth} selectedToothNum={selectedToothNum} onSelectToothNum={setSelectedToothNum}
					selectedSiteKey={selectedSiteKey} onSelectSiteKey={setSelectedSiteKey}
					onUpdateMobility={handleUpdateMobility} onUpdateFurcation={handleUpdateFurcation}
					onUpdateDepth={handleUpdateDepth} onUpdateGingivalMargin={handleUpdateGingivalMargin}
					onToggleBop={handleToggleBop} onTogglePlaque={handleTogglePlaque} onToggleSuppuration={handleToggleSuppuration}
				/>
			</div>

			{/* Печатный футер A4 с подписью врача */}
			<PerioPrintFooter patientName={patientName} />

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
			<div
				className="fixed inset-0 z-[10060] pointer-events-auto flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto perio-modal-overlay bg-slate-950/65 backdrop-blur-xs"
				data-testid="perio-chart-modal"
				role="dialog"
				aria-modal="true"
				onClick={(e) => {
					if (e.target === e.currentTarget) handleClose();
				}}
			>
				<div className="w-full max-w-7xl my-0 sm:my-auto max-h-[94vh] overflow-y-auto rounded-t-[24px] sm:rounded-2xl perio-modal-content">{content}</div>
			</div>
		);
	}
	return content;
});

PerioStudioModal.displayName = "PerioStudioModal";
export default PerioStudioModal;
