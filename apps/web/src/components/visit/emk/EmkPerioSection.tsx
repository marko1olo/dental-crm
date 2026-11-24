import React, { useState, useMemo, useCallback, useEffect } from "react";
import { Activity, BarChart2, ChevronDown, ChevronUp } from "lucide-react";
import type { EmkSectionProps } from "./EmkTypes";
import { clientLogger } from "../../../services/logging/clientLogger";
import { EmkPerioSummary } from "./EmkPerioSummary";
import { EmkPerioMeasurements } from "./EmkPerioMeasurements";

export interface EmkPerioSectionProps extends EmkSectionProps {
	readonly onOpenPerioModal?: (() => void) | undefined;
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
}

/**
 * EmkPerioSection — Пародонтологический скрининг, экспресс-индексы гигиены (OHI-S)
 * и авто-формирование плана лечения (кюретаж A16.07.011 + профгигиена A16.07.051).
 *
 * Декомпозирован по Мандатам 8b и 8e на:
 * - EmkPerioSummary.tsx (1-клик норма, OHI-S в 3 клика, профгигиена) <= 300 строк
 * - EmkPerioMeasurements.tsx (скрининг патологии, карманы, BOP, кюретаж) <= 300 строк
 *
 * Мандаты:
 * - Мандат 8e (Автономия врача): физиологическая норма в 1 клик по умолчанию
 * - Чистый язык: никакой сырой «Формы 043/у» в UI, только «Пародонтологический скрининг»
 * - Эргономика: кнопки в стиле UI_STANDARDS, тач-таргеты >= 44px
 * - Мандат 8b: строго <= 300 строк
 * - Мандат 8d/8zq (Реактивная гидратация и SSOT): двухсторонняя синхронизация со студией пародонтограммы
 */
function extractPerioTeethStats(teeth?: unknown[]): { maxDepth: number; anyBop: boolean } {
	let maxDepth = 2;
	let anyBop = false;
	if (!Array.isArray(teeth)) return { maxDepth, anyBop };

	const siteKeys = [
		"distoBuccal", "midBuccal", "mesioBuccal", "distoLingual", "midLingual", "mesioLingual",
		"distobuccal", "midbuccal", "mesiobuccal", "distolingual", "midlingual", "mesiolingual",
	];

	for (const t of teeth) {
		if (!t || typeof t !== "object") continue;
		const rec = t as Record<string, unknown>;

		for (const key of siteKeys) {
			const s = rec[key] as Record<string, unknown> | undefined;
			if (s && typeof s === "object") {
				const depth = Number(s.probingDepthMm ?? s.probing_depth_mm ?? 0);
				if (depth > maxDepth) maxDepth = depth;
				if (s.bleedingOnProbing ?? s.bleeding_on_probing) anyBop = true;
			}
		}

		if (Array.isArray(rec.sites)) {
			for (const site of rec.sites) {
				if (!site || typeof site !== "object") continue;
				const s = site as Record<string, unknown>;
				const depth = Number(s.probingDepthMm ?? s.probing_depth_mm ?? 0);
				if (depth > maxDepth) maxDepth = depth;
				if (s.bleedingOnProbing ?? s.bleeding_on_probing) anyBop = true;
			}
		}
	}
	return { maxDepth, anyBop };
}

export function EmkPerioSection({
	visitNoteForm, updateVisitNoteField, isLocked = false, activeTooth = 16,
	onOpenPerioModal, patientId, patientName,
}: EmkPerioSectionProps) {
	const [isExpanded, setIsExpanded] = useState<boolean>(true);
	const [perioStatus, setPerioStatus] = useState<
		"healthy" | "gingivitis" | "periodontitis_mild" | "periodontitis_moderate" | "periodontitis_severe" | "custom"
	>("healthy");
	const [hygieneLevel, setHygieneLevel] = useState<"good" | "fair" | "poor" | null>(null);

	const defaultActiveTooth = useMemo(() => {
		const parsed = Number(activeTooth);
		return Number.isNaN(parsed) || parsed <= 0 ? 16 : parsed;
	}, [activeTooth]);

	const [selectedTeeth, setSelectedTeeth] = useState<number[]>([defaultActiveTooth]);
	const [pocketDepthMm, setPocketDepthMm] = useState<number>(4);
	const [hasBop, setHasBop] = useState<boolean>(true);
	const [mobilityLevel, setMobilityLevel] = useState<0 | 1 | 2 | 3>(0);

	const effectivePatientId = patientId?.trim() || (typeof visitNoteForm?.patientId === "string" ? visitNoteForm.patientId.trim() : "");
	const effectivePatientName = patientName?.trim() || (typeof (visitNoteForm as Record<string, unknown> | null)?.patientName === "string" ? String((visitNoteForm as Record<string, unknown>).patientName).trim() : "");
	const effectiveVisitId = typeof visitNoteForm?.visitId === "string" && visitNoteForm.visitId.trim() ? visitNoteForm.visitId.trim() : undefined;

	// Загрузка последнего среза пародонта для пациента (SSOT)
	useEffect(() => {
		if (!effectivePatientId) return;
		let isMounted = true;
		async function loadLatestSnapshot() {
			try {
				const token = typeof localStorage !== "undefined" ? localStorage.getItem("dente_token") : null;
				const res = await fetch(`/api/periodontogram/${encodeURIComponent(effectivePatientId)}`, {
					headers: { Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
				});
				if (res.ok) {
					const body = await res.json();
					const data = body?.data ?? body;
					if (isMounted && data) {
						const ind = (data.indices as Record<string, unknown> | undefined) || {};
						const sum = (data.summary as Record<string, unknown> | undefined) || {};
						const deepPockets = Number(ind.deep_pockets_count ?? ind.deepPocketsCount ?? sum.deepPocketsCount ?? 0);
						const bopVal = Number(ind.bop_pct ?? ind.bopPercent ?? sum.bleedingSitesCount ?? 0);
						const { maxDepth, anyBop } = extractPerioTeethStats(data.teeth);
						setPocketDepthMm(maxDepth);
						setHasBop(anyBop);
						if (deepPockets > 0 || maxDepth >= 5) setPerioStatus("periodontitis_moderate");
						else if (maxDepth >= 4) setPerioStatus("periodontitis_mild");
						else if (bopVal > 0 || anyBop) setPerioStatus("gingivitis");
						else setPerioStatus("healthy");
					}
				}
			} catch {
				try {
					const cached = localStorage.getItem(`dente_perio_cache_${effectivePatientId}`);
					if (cached && isMounted) {
						const parsed = JSON.parse(cached);
						const { maxDepth, anyBop } = extractPerioTeethStats(parsed.teeth);
						setPocketDepthMm(maxDepth);
						setHasBop(anyBop);
						if (maxDepth >= 5) setPerioStatus("periodontitis_moderate");
						else if (maxDepth >= 4) setPerioStatus("periodontitis_mild");
						else if (anyBop) setPerioStatus("gingivitis");
						else setPerioStatus("healthy");
					}
				} catch (cacheErr) {
					clientLogger.warn("Failed to read periodontal snapshot cache fallback", cacheErr, { module: "EmkPerioSection" });
				}
			}
		}
		void loadLatestSnapshot();
		return () => { isMounted = false; };
	}, [effectivePatientId]);

	// Слушатель сохранения в подробной модалке (PerioStudioModal)
	useEffect(() => {
		if (typeof window === "undefined") return;
		const handleSnapshotSaved = (e: Event) => {
			const ce = e as CustomEvent<{
				patientId?: string;
				summary?: { bleedingSitesCount?: number; deepPocketsCount?: number };
				teeth?: unknown[];
			}>;
			if (!ce.detail) return;
			const { patientId: savedPatientId, summary, teeth } = ce.detail;
			if (savedPatientId && effectivePatientId && savedPatientId !== effectivePatientId) return;
			const { maxDepth, anyBop } = extractPerioTeethStats(teeth);
			const deepPockets = Number(summary?.deepPocketsCount ?? 0);
			const bopVal = Number(summary?.bleedingSitesCount ?? 0);
			if (deepPockets > 0 || maxDepth >= 5) setPerioStatus("periodontitis_moderate");
			else if (maxDepth >= 4) setPerioStatus("periodontitis_mild");
			else if (bopVal > 0 || anyBop) setPerioStatus("gingivitis");
			else setPerioStatus("healthy");
			if (teeth && teeth.length > 0) {
				setPocketDepthMm(maxDepth);
				setHasBop(anyBop);
			}
		};
		window.addEventListener("dente:perio-snapshot-saved", handleSnapshotSaved);
		return () => { window.removeEventListener("dente:perio-snapshot-saved", handleSnapshotSaved); };
	}, [effectivePatientId]);

	// Слушатель применения скрининга из EmkPerioMeasurements
	useEffect(() => {
		if (typeof window === "undefined") return;
		const handleMeasurementsApplied = (e: Event) => {
			const ce = e as CustomEvent<{
				affectedRecords?: Array<{ toothNumber: number; depthMm: number; bop: boolean }>;
				pocketDepthMm?: number;
				hasBop?: boolean;
			}>;
			if (!ce.detail) return;
			const { affectedRecords, pocketDepthMm: depth, hasBop: bop } = ce.detail;
			if (depth !== undefined) setPocketDepthMm(depth);
			if (bop !== undefined) setHasBop(bop);
			if (effectivePatientId) {
				try {
					localStorage.setItem(`dente_perio_draft_v2_${effectivePatientId}`, JSON.stringify({
						patientId: effectivePatientId, visitId: effectiveVisitId, updatedAt: new Date().toISOString(),
						affectedRecords, pocketDepthMm: depth, hasBop: bop,
					}));
				} catch (storageErr) {
					clientLogger.warn("Failed to persist periodontal screening to localStorage", storageErr, { module: "EmkPerioSection" });
				}
			}
		};
		window.addEventListener("dente:perio-measurements-applied", handleMeasurementsApplied);
		return () => { window.removeEventListener("dente:perio-measurements-applied", handleMeasurementsApplied); };
	}, [effectivePatientId, effectiveVisitId]);

	const handleOpenModal = useCallback(() => {
		if (onOpenPerioModal) {
			onOpenPerioModal();
		} else if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("dente:open-perio-modal", {
					detail: {
						patientId: effectivePatientId,
						patientName: effectivePatientName,
						visitId: effectiveVisitId,
						activeTooth: defaultActiveTooth,
					},
				}),
			);
		}
	}, [onOpenPerioModal, effectivePatientId, effectivePatientName, effectiveVisitId, defaultActiveTooth]);

	return (
		<div
			className="w-full min-w-0 bg-[var(--paper)] border border-[var(--line)] rounded-xl p-3 sm:p-4 shadow-2xs my-2 transition-all"
			data-testid="emk-perio-section"
		>
			{/* Верхняя строка тулбара */}
			<div className="flex items-center justify-between pb-2 mb-3 border-b border-[var(--line)]">
				<div className="flex items-center gap-2 min-w-0">
					<div className="w-7 h-7 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center shrink-0">
						<Activity size={16} />
					</div>
					<div>
						<h4 className="text-xs sm:text-sm font-bold text-[var(--ink)] m-0 leading-tight">
							Пародонтологический скрининг и гигиена полости рта
						</h4>
						<p className="text-[11px] text-[var(--muted)] m-0 hidden sm:block">
							физиологическая норма, индексы OHI-S и скрининг пародонтита
						</p>
					</div>
				</div>

				<div className="flex items-center gap-1.5 shrink-0">
					<button
						type="button"
						onClick={handleOpenModal}
						className="secondary-button min-h-[32px] px-2.5 py-1 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--paper-strong)] text-[12px] font-semibold text-[var(--ink)] flex items-center gap-1.5 cursor-pointer transition-colors"
						title="Открыть подробную пародонтограмму (6 точек на зуб)"
						data-testid="emk-perio-open-chart-btn"
					>
						<BarChart2 size={13} className="text-[var(--primary)] shrink-0" />
						<span className="hidden sm:inline">Подробная карта</span>
					</button>

					<button
						type="button"
						onClick={() => setIsExpanded((prev) => !prev)}
						className="min-h-[32px] w-8 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] flex items-center justify-center cursor-pointer transition-colors"
						title={isExpanded ? "Свернуть блок" : "Развернуть блок"}
						aria-label="Свернуть/развернуть пародонтологический блок"
					>
						{isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
					</button>
				</div>
			</div>

			{isExpanded && (
				<div className="space-y-3.5 animate-in fade-in duration-150">
					{/* РАЗДЕЛ 1: Сводка, норма в 1 клик, гигиена OHI-S */}
					<EmkPerioSummary
						visitNoteForm={visitNoteForm} updateVisitNoteField={updateVisitNoteField}
						isLocked={isLocked} activeTooth={activeTooth} perioStatus={perioStatus}
						setPerioStatus={setPerioStatus} hygieneLevel={hygieneLevel} setHygieneLevel={setHygieneLevel}
						setHasBop={setHasBop} setMobilityLevel={setMobilityLevel}
					/>

					{/* РАЗДЕЛ 2: Скрининг патологии и авто-план лечения */}
					<EmkPerioMeasurements
						visitNoteForm={visitNoteForm} updateVisitNoteField={updateVisitNoteField}
						isLocked={isLocked} activeTooth={activeTooth} selectedTeeth={selectedTeeth}
						setSelectedTeeth={setSelectedTeeth} pocketDepthMm={pocketDepthMm}
						setPocketDepthMm={setPocketDepthMm} hasBop={hasBop} setHasBop={setHasBop}
						mobilityLevel={mobilityLevel} setMobilityLevel={setMobilityLevel} setPerioStatus={setPerioStatus}
					/>
				</div>
			)}
		</div>
	);
}

export { EmkPerioSummary } from "./EmkPerioSummary";
export { EmkPerioMeasurements } from "./EmkPerioMeasurements";
export default EmkPerioSection;

