/**
 * usePerioStudioState.ts — Канонический хук состояния кабинета пародонтологии DENTE CRM.
 * Инкапсулирует:
 * - 6-точечное зондирование, подвижность и фуркации
 * - Экспресс-скрининг PSR ВОЗ по 6 секстантам
 * - Клинические индексы (O'Leary, OHI-S, PMA, КПИ)
 * - Автосейв черновиков с дебаунсом 600мс в dente_perio_draft_v2_${patientId}
 * - Очистку черновиков (Zero-Leak Draft Invariant, Мандат 8zq / DEF-PERIO-05)
 * - Синхронизацию с Fastify бэкендом и Soft Negative Stock списаниями
 * Норматив размера: <= 500 строк (Мандат 8b).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import type { PerioChartSummary, PerioToothRecord } from "@dental/shared";
import {
	calculateOlearyFromPerioTeeth, calculateOhiSScore, calculatePerioIndices, calculatePmaScore,
	convertPerioDentitionToSepa, convertSepaDentitionToPerio, deriveHygieneFromPerioTeeth,
	generateComprehensivePerioProtocolText, generateFullMouthProbingSequence, generateUuidV7,
} from "@dental/shared";
import { showToast } from "../GlobalToast";
import { useVisitStore } from "../../store/visitStore";
import { useDraftStore } from "../../store/patientStore";
import { denteQueryClient } from "../../lib/queryClient";
import { getDenteAuthHeaders } from "../../lib/denteRequestHeaders";
import {
	safeLocalStorageGetItem, safeLocalStorageRemoveItem, safeLocalStorageSetItem,
} from "../../lib/safeLocalStorage";
import {
	applyExpressPerioPreset, applyLowerJawNormPreset, applyPsrSextantCode, applyUpperJawNormPreset,
	applyZeroBopPreset, applyZeroCalculusAndPlaquePreset, calculatePsrSextants, computePsrSummary,
	deductPeriodontalConsumablesSoftOverdraft, dispatchPresetSideEffects, normalizePerioDentition,
	PSR_SEXTANTS_CATALOG, type PerioTreatmentProtocol, type PsrCode, type PsrScreeningMap, type PsrSextantId, type SiteKey,
} from "./perioCatalogData";
import { usePerioKeyboardNavigation } from "./usePerioKeyboardNavigation";

export interface UsePerioStudioStateProps {
	readonly isOpen?: boolean | undefined;
	readonly onClose?: (() => void) | undefined;
	readonly isModal?: boolean | undefined;
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly organizationId?: string | undefined;
	readonly doctorId?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly visitId?: string | undefined;
	readonly initialTeeth?: readonly (Partial<PerioToothRecord> & { toothNumber: number })[] | readonly PerioToothRecord[] | undefined;
	readonly initialTab?: "psr" | "chart" | undefined;
	readonly initialSelectedTooth?: number | undefined;
	readonly initialTier3Expanded?: boolean | undefined;
	readonly onChange?: ((teeth: PerioToothRecord[], summary: PerioChartSummary) => void) | undefined;
	readonly onSave?: ((teeth: PerioToothRecord[], summary: PerioChartSummary) => void) | undefined;
	readonly onInsertToProtocol?: ((protocolText: string) => void) | undefined;
	readonly readOnly?: boolean | undefined;
	readonly compactMode?: boolean | undefined;
}

export function convertPsrResultsToScreeningMap(
	results: Record<string, { code: 0 | 1 | 2 | 3 | 4; asterisk: boolean }>,
): PsrScreeningMap {
	const map: Partial<PsrScreeningMap> = {};
	for (const s of PSR_SEXTANTS_CATALOG) {
		const res = results[s.id];
		map[s.id] = { code: (res?.code ?? 0) as PsrCode, asterisk: Boolean(res?.asterisk) };
	}
	return map as PsrScreeningMap;
}

const DEFAULT_SEXTANTS_MAP: PsrScreeningMap = {
	S1: { code: 0, asterisk: false }, S2: { code: 0, asterisk: false }, S3: { code: 0, asterisk: false },
	S4: { code: 0, asterisk: false }, S5: { code: 0, asterisk: false }, S6: { code: 0, asterisk: false },
};

export function usePerioStudioState({
	isOpen = true,
	onClose,
	isModal = false,
	patientId,
	doctorName = "Лечащий врач",
	visitId,
	initialTeeth,
	initialSelectedTooth = 16,
	initialTier3Expanded = false,
	onChange,
	onSave,
	onInsertToProtocol,
}: UsePerioStudioStateProps) {
	const [isDetailedExpanded, setIsDetailedExpanded] = useState<boolean>(initialTier3Expanded);
	const [selectedProtocolId, setSelectedProtocolId] = useState<string | null>("prophy_airflow_ultrasound");
	const [selectedToothNum, setSelectedToothNum] = useState<number>(initialSelectedTooth);
	const [selectedSiteKey, setSelectedSiteKey] = useState<SiteKey>("distoBuccal");
	const [syncStatus, setSyncStatus] = useState<"idle" | "saving" | "saved">("idle");
	const [showIndicesPanel, setShowIndicesPanel] = useState<boolean>(false);

	const [teeth, setTeeth] = useState<PerioToothRecord[]>(() => normalizePerioDentition(initialTeeth));
	const [screeningMap, setScreeningMap] = useState<PsrScreeningMap>(() => ({ ...DEFAULT_SEXTANTS_MAP }));

	const summary = useMemo(() => calculatePerioIndices(teeth), [teeth]);
	const psrSummary = useMemo(() => computePsrSummary(screeningMap), [screeningMap]);
	const olearySummary = useMemo(() => calculateOlearyFromPerioTeeth(teeth), [teeth]);
	const hygieneAssessments = useMemo(() => deriveHygieneFromPerioTeeth(teeth), [teeth]);
	const ohiResult = useMemo(() => calculateOhiSScore(hygieneAssessments), [hygieneAssessments]);
	const pmaResult = useMemo(() => calculatePmaScore(hygieneAssessments), [hygieneAssessments]);
	const probingSequence = useMemo(() => generateFullMouthProbingSequence(teeth), [teeth]);

	// Автоматический пересчет секстантов PSR при зондировании
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

	// Zero-Leak Draft Invariant (Мандат 8d / 8zq, 8bn / DEF-PERIO-05): полный сброс черновика к дефолту и очистка кэша
	const handleClose = useCallback(() => {
		clearTimers();
		const cleanPatientId = patientId?.trim();
		if (cleanPatientId) {
			safeLocalStorageRemoveItem(`dente_perio_draft_v2_${cleanPatientId}`);
			safeLocalStorageRemoveItem(`dente_perio_draft_${cleanPatientId}`);
		}
		try {
			useDraftStore.getState().resetDraft();
		} catch { /* safe */ }
		setTeeth(normalizePerioDentition(initialTeeth));
		setScreeningMap({ ...DEFAULT_SEXTANTS_MAP });
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
		type InitialToothItem = Partial<PerioToothRecord> & { toothNumber: number };
		const initMap = new Map<number, InitialToothItem>();
		for (const it of initialTeeth) {
			initMap.set(it.toothNumber, it);
		}
		setTeeth((prev) =>
			prev.map((t) => {
				const it = initMap.get(t.toothNumber);
				return it ? { ...t, isMissing: it.isMissing ?? t.isMissing, isImplant: it.isImplant ?? t.isImplant } : t;
			}),
		);
	}, [initialTeeth]);

	// Escape key dismissal for modal mode
	useEffect(() => {
		if (!isOpen || !isModal) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") { e.stopPropagation(); handleClose(); }
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, isModal, handleClose]);

	// Debounced Draft Autosave (Мандат 8e / DEF-PERIO-03) — сохранение с дебаунсом 600мс в v2
	useEffect(() => {
		const cleanPatientId = patientId?.trim();
		if (!cleanPatientId) return;
		const timer = setTimeout(() => {
			safeLocalStorageSetItem(
				`dente_perio_draft_v2_${cleanPatientId}`,
				JSON.stringify({ teeth, screeningMap, selectedProtocolId, updatedAt: new Date().toISOString() }),
			);
		}, 600);
		return () => clearTimeout(timer);
	}, [patientId, teeth, screeningMap, selectedProtocolId]);

	// Восстановление черновика из localStorage и синхронизация с Fastify бэкендом
	useEffect(() => {
		const cleanPatientId = patientId?.trim();
		if (!cleanPatientId) return;
		const safePatientId = cleanPatientId;
		let isCancelled = false;
		try {
			const draftV2 = safeLocalStorageGetItem(`dente_perio_draft_v2_${safePatientId}`);
			const draftV1 = !draftV2 ? safeLocalStorageGetItem(`dente_perio_draft_${safePatientId}`) : null;
			const draft = draftV2 || draftV1;
			if (draft) {
				const parsed = JSON.parse(draft);
				if (Array.isArray(parsed.teeth) && parsed.teeth.length > 0) setTeeth(normalizePerioDentition(parsed.teeth));
				if (parsed.screeningMap && typeof parsed.screeningMap === "object") setScreeningMap(parsed.screeningMap);
				if (parsed.selectedProtocolId) setSelectedProtocolId(parsed.selectedProtocolId);
			} else {
				const cached = safeLocalStorageGetItem(`dente_perio_cache_${safePatientId}`);
				if (cached) {
					const parsed = JSON.parse(cached);
					if (Array.isArray(parsed.teeth) && parsed.teeth.length > 0) setTeeth(normalizePerioDentition(parsed.teeth));
					if (parsed.screeningMap && typeof parsed.screeningMap === "object") setScreeningMap(parsed.screeningMap);
				}
			}
		} catch (err) {
			console.warn("[PerioStudio] Failed to read from local draft/cache:", err);
		}

		async function fetchPerio() {
			try {
				const res = await fetch(`/api/periodontogram/${encodeURIComponent(safePatientId)}`, {
					headers: getDenteAuthHeaders(),
				});
				if (!res.ok) {
					console.warn("[PerioStudio] Server responded with error status:", res.status);
					return;
				}
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
						if (item && [0, 1, 2, 3, 4].includes(Number(item.code))) {
							validMap[sId] = { code: Number(item.code) as PsrCode, asterisk: Boolean(item.asterisk) };
						}
					}
					if (Object.keys(validMap).length === 6) setScreeningMap(validMap as PsrScreeningMap);
				}
			} catch (err) {
				console.warn("[PerioStudio] Failed to load periodontogram:", err);
				showToast("Сетевой сбой при загрузке пародонтограммы. Используются локальные данные.", "warning", 4000, {
					label: "Повторить",
					onAction: () => { void fetchPerio(); },
				});
			}
		}
		void fetchPerio();
		return () => { isCancelled = true; };
	}, [patientId]);

	useEffect(() => {
		if (onChange) onChange(teeth, summary);
	}, [teeth, summary, onChange]);

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
		setScreeningMap({ ...DEFAULT_SEXTANTS_MAP });
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

	const handleApplyUpperJawNorm = useCallback(
		() => applyPresetAndSync(applyUpperJawNormPreset, "✓ ВЧ (18–28): норма 1–2 мм"),
		[applyPresetAndSync],
	);

	const handleApplyLowerJawNorm = useCallback(
		() => applyPresetAndSync(applyLowerJawNormPreset, "✓ НЧ (48–38): норма 1–2 мм"),
		[applyPresetAndSync],
	);

	const handleApplyZeroBop = useCallback(
		() => applyPresetAndSync(applyZeroBopPreset, "✓ Все десны без кровоточивости (BOP 0%)"),
		[applyPresetAndSync],
	);

	const handleApplyZeroCalculus = useCallback(
		() => applyPresetAndSync(applyZeroCalculusAndPlaquePreset, "✓ Налёт и камень сброшены (0%)"),
		[applyPresetAndSync],
	);

	const handleApplyPreset = useCallback((presetId: string) => {
		const res = applyExpressPerioPreset(teeth, presetId);
		setTeeth(res.updatedTeeth);
		setScreeningMap(convertPsrResultsToScreeningMap(calculatePsrSextants(res.updatedTeeth)));
		if (presetId.includes("severe") || presetId.includes("moderate")) setIsDetailedExpanded(true);
		dispatchPresetSideEffects(res, onInsertToProtocol);
	}, [teeth, onInsertToProtocol]);

	const handleSelectProtocol = useCallback((protocol: PerioTreatmentProtocol) => {
		setSelectedProtocolId(protocol.id);
		const res = applyExpressPerioPreset(
			teeth,
			protocol.id === "prophy_airflow_ultrasound" ? "pro_hygiene_express" : protocol.id,
		);
		setTeeth(res.updatedTeeth);
		setScreeningMap(convertPsrResultsToScreeningMap(calculatePsrSextants(res.updatedTeeth)));
		dispatchPresetSideEffects(
			{
				...res,
				service: {
					code: protocol.serviceCode,
					serviceCode: protocol.serviceCode,
					name: protocol.titleRu,
					priceKopecks: protocol.priceKopecks,
					category: "Пародонтология",
				},
			},
			onInsertToProtocol,
		);
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
			window.dispatchEvent(
				new CustomEvent("dente-apply-soap-protocol", {
					detail: { statusLocalis: text, objectiveStatus: text, mode: "smart_append" },
				}),
			);
		}
	}, [onInsertToProtocol, summary, doctorName, psrSummary]);

	const handleSave = useCallback(async () => {
		if (syncStatus === "saving") return;
		setSyncStatus("saving");

		const emitSnapshot = () => {
			if (typeof window !== "undefined") {
				window.dispatchEvent(
					new CustomEvent("dente:perio-snapshot-saved", {
						detail: { patientId, visitId, summary, psrSummary, teeth, screeningMap },
					}),
				);
			}
		};

		const syncPerioState = () => {
			const cleanPatientId = patientId?.trim();
			if (cleanPatientId) {
				safeLocalStorageRemoveItem(`dente_perio_draft_v2_${cleanPatientId}`);
				safeLocalStorageRemoveItem(`dente_perio_draft_${cleanPatientId}`);
				safeLocalStorageSetItem(
					`dente_perio_cache_${cleanPatientId}`,
					JSON.stringify({ teeth, screeningMap, savedAt: new Date().toISOString() }),
				);
			}
			setSyncStatus("saved");
			dispatchPerioSoapSync(teeth);
			emitSnapshot();
			void denteQueryClient.invalidateQueries({ queryKey: ["odontogram", patientId] });
			void denteQueryClient.invalidateQueries({ queryKey: ["odontogram"] });
			if (typeof window !== "undefined") {
				window.dispatchEvent(new CustomEvent("dente-odontogram-update", { detail: { patientId, teeth } }));
			}
		};

		try {
			const cleanPatientId = patientId?.trim();
			if (cleanPatientId) {
				const sepaTeeth = convertPerioDentitionToSepa(teeth);
				const allSites = sepaTeeth.flatMap((t) =>
					(t.sites || []).map((s) => ({
						toothNumber: t.toothNumber,
						siteCode: s.siteCode,
						probingDepthMm: s.probingDepthMm,
						gingivalMarginMm: s.gingivalMarginMm,
						calMm: Math.max(0, (s.probingDepthMm ?? 0) + (s.gingivalMarginMm ?? 0)),
						bleedingOnProbing: Boolean(s.bleedingOnProbing),
						plaque: Boolean(s.plaque),
						calculus: Boolean(s.calculus),
						suppuration: Boolean(s.suppuration),
					})),
				);
				const res = await fetch(`/api/periodontogram/${encodeURIComponent(cleanPatientId)}`, {
					method: "POST",
					headers: getDenteAuthHeaders({
						"Content-Type": "application/json",
						"Idempotency-Key": generateUuidV7(),
					}),
					body: JSON.stringify({
						teeth: sepaTeeth.map((t) => ({
							toothNumber: t.toothNumber,
							isPresent: t.isPresent,
							isImplant: t.isImplant,
							mobility: t.mobility,
							furcationBuccal: t.furcationBuccal,
							furcationLingual: t.furcationLingual,
						})),
						sites: allSites,
						notes: `PSR: ${psrSummary.psrFormula} (${psrSummary.suggestedDiagnosisRu})`,
						visitId: visitId || undefined,
						status: "closed",
						autoClose: true,
						indices: { psrData: screeningMap, psrSummary },
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
			showToast("Сетевой сбой при сохранении на сервере. Данные сохранены в локальный кэш (офлайн)", "warning", 5000, {
				label: "Повторить",
				onAction: () => { void handleSave(); },
			});
			if (onSave) onSave(teeth, summary);
			if (isModal) handleClose();
		}
	}, [
		syncStatus, patientId, teeth, psrSummary, screeningMap, summary,
		dispatchPerioSoapSync, onSave, isModal, handleClose, visitId,
	]);

	const handlePrintProtocol = useCallback(() => {
		if (typeof window !== "undefined") {
			window.print();
			showToast("Формирование пародонтологического протокола для печати", "info");
		}
	}, []);

	return {
		teeth, setTeeth, screeningMap, summary, psrSummary, olearySummary,
		hygieneAssessments, ohiResult, pmaResult, probingSequence,
		isDetailedExpanded, setIsDetailedExpanded,
		selectedProtocolId, setSelectedProtocolId,
		selectedToothNum, setSelectedToothNum,
		selectedSiteKey, setSelectedSiteKey,
		syncStatus, showIndicesPanel, setShowIndicesPanel,
		handleUpdateDepth, handleToggleBop, handleTogglePlaque, handleToggleSuppuration,
		handleUpdateGingivalMargin, handleUpdateMobility, handleUpdateFurcation, clearTimers,
		updateSextant, toggleAsterisk, handleSetAllIntact,
		handleApplyUpperJawNorm, handleApplyLowerJawNorm, handleApplyZeroBop, handleApplyZeroCalculus,
		handleApplyPreset, handleSelectProtocol,
		handleSave, handleClose, handlePrintProtocol,
	};
}
