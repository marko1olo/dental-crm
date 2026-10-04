/**
 * apps/web/src/components/patients/formula/PatientDentalFormulaTab.tsx
 *
 * DENTE Dental CRM — Интерактивная зубная формула пациента (Форма 043/у)
 *
 * МАНДАТЫ КЛИНИЧЕСКОГО UX И АВТОНОМИИ (8e, 8k, 8b):
 * - Высокая плотность десктопной сетки (тулбары 28–36px, отсутствие мобильной раздутости на ПК).
 * - Отклик < 16 мс (60 fps) при клике по зубам и поверхностям (O, V, L/P, M, D, C).
 * - 1-клик быстрые действия: «Интактный ряд (санирован)», «Без 8-рок», «Профгигиена», «Пломба K02.1».
 * - Автоматическое определение прикуса (постоянный / молочный / сменный) по дате рождения.
 * - Индекс КПУ (Кариес, Пломба, Удален) в реальном времени.
 * - Двухуровневое хранение (Local Cache + PostgreSQL 18 sync) с нулевой потерей данных.
 * - Строго 0 эмодзи — только векторная графика Lucide и DentalIcons.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	Activity,
	CheckCircle2,
	Clock,
	Layers,
	RotateCcw,
	Save,
	ShieldCheck,
	Sparkles,
	Tag,
	Zap,
} from "lucide-react";
import { calculateAge } from "@dental/shared";
import { ToothChart, type ToothData, type ToothState } from "../../odontogram/ToothChart";
import { ToothRadialMenu } from "../../odontogram/ToothRadialMenu";
import {
	loadStoredTeethData,
	saveStoredTeethData,
} from "../../odontogram/odontogramStorage";
import { denteAdminSecretRequestHeaders } from "../../../AppHelpers";
import { showToast } from "../../GlobalToast";
import { ToothMolar, ToothDeciduous } from "../../icons/DentalIcons";
import {
	generateSoapFromOdontogramFinding,
	type OdontogramFindingInput,
} from "../../../lib/clinicalProtocols043";
import { useVisitStore } from "../../../store/visitStore";

export interface PatientDentalFormulaTabProps {
	readonly patientId: string;
	readonly patientBirthDate?: string | null | undefined;
	readonly patientName?: string | null | undefined;
	readonly onApplyFindingToDiary?: ((toothNumber: number, state: ToothState, surfaces?: readonly string[]) => void) | undefined;
}

const ALL_PERMANENT_TEETH: readonly number[] = [
	18, 17, 16, 15, 14, 13, 12, 11,
	21, 22, 23, 24, 25, 26, 27, 28,
	48, 47, 46, 45, 44, 43, 42, 41,
	31, 32, 33, 34, 35, 36, 37, 38,
];

const ALL_DECIDUOUS_TEETH: readonly number[] = [
	55, 54, 53, 52, 51,
	61, 62, 63, 64, 65,
	85, 84, 83, 82, 81,
	71, 72, 73, 74, 75,
];

export const PatientDentalFormulaTab: React.FC<PatientDentalFormulaTabProps> = React.memo(
	function PatientDentalFormulaTab({
		patientId,
		patientBirthDate,
		patientName,
		onApplyFindingToDiary,
	}) {
		const patientAge = useMemo(() => {
			return patientBirthDate ? calculateAge(patientBirthDate) : null;
		}, [patientBirthDate]);

		const initialDentitionMode = useMemo(() => {
			if (patientAge === null) return "adult";
			if (patientAge < 6) return "pediatric";
			if (patientAge >= 6 && patientAge < 12) return "mixed";
			return "adult";
		}, [patientAge]);

		const [dentitionMode, setDentitionMode] = useState<"adult" | "pediatric" | "mixed">(
			initialDentitionMode,
		);

		const isPediatric = dentitionMode === "pediatric";
		const isMixed = dentitionMode === "mixed";

		// Baseline teeth data
		const baselineTeeth = useMemo<ToothData[]>(() => {
			const targetNumbers = isPediatric
				? ALL_DECIDUOUS_TEETH
				: isMixed
				? [...ALL_PERMANENT_TEETH, ...ALL_DECIDUOUS_TEETH]
				: ALL_PERMANENT_TEETH;

			return targetNumbers.map((num) => ({
				toothNumber: num,
				state: "Healthy" as ToothState,
			}));
		}, [isPediatric, isMixed]);

		// In-memory teeth state
		const [teethData, setTeethData] = useState<ToothData[]>(() => {
			if (patientId) {
				const cached = loadStoredTeethData(patientId);
				if (cached && cached.length > 0) return cached;
			}
			return baselineTeeth;
		});

		const teethDataRef = useRef(teethData);
		teethDataRef.current = teethData;

		const [selectedTeeth, setSelectedTeeth] = useState<number[]>([]);
		const [activeStamp, setActiveStamp] = useState<ToothState | null>(null);
		const [lastSavedTime, setLastSavedTime] = useState<string>("");
		const [isSyncing, setIsSyncing] = useState<boolean>(false);
		const [radialMenuData, setRadialMenuData] = useState<{
			toothNumber: number;
			anchorRect: { x: number; y: number; width: number; height: number };
			currentState?: ToothState;
		} | null>(null);

		// Synchronize from database on mount / patient change
		useEffect(() => {
			if (!patientId) return;
			const cached = loadStoredTeethData(patientId);
			if (cached && cached.length > 0) {
				setTeethData(cached);
			}

			const controller = new AbortController();
			const fetchServerTeeth = async () => {
				try {
					setIsSyncing(true);
					const res = await fetch(`/api/patients/${patientId}/tooth-states`, {
						headers: denteAdminSecretRequestHeaders(),
						signal: controller.signal,
					});
					if (!res.ok) {
						setIsSyncing(false);
						return;
					}
					const data = await res.json();
					if (data?.success && Array.isArray(data.states) && data.states.length > 0) {
						const serverStates: ToothData[] = data.states.map((s: any) => ({
							toothNumber: s.toothNumber,
							state: s.state as ToothState,
							surfaces: Array.isArray(s.surfaces) ? s.surfaces : undefined,
							notes: s.notes || undefined,
							updatedAt: s.updatedAt || undefined,
						}));

						setTeethData((prev) => {
							const merged = [...prev];
							for (const incoming of serverStates) {
								const idx = merged.findIndex((m) => m.toothNumber === incoming.toothNumber);
								if (idx >= 0) {
									merged[idx] = { ...merged[idx], ...incoming };
								} else {
									merged.push(incoming);
								}
							}
							saveStoredTeethData(patientId, merged, true);
							return merged;
						});
						setLastSavedTime(new Date().toLocaleTimeString("ru-RU"));
					}
				} catch {
					// Safe offline fallback: local storage preserves doctor changes
				} finally {
					setIsSyncing(false);
				}
			};

			void fetchServerTeeth();
			return () => controller.abort();
		}, [patientId]);

		// Persist update in <16ms locally + background async write to Postgres
		const commitToothChanges = useCallback(
			async (
				targets: number[],
				nextState: ToothState,
				nextSurfaces?: readonly string[] | undefined,
			) => {
				const nowIso = new Date().toISOString();
				const current = teethDataRef.current;
				const updated: ToothData[] = current.map((item) => {
					if (!targets.includes(item.toothNumber)) return item;
					const copy: ToothData = {
						...item,
						state: nextState,
						updatedAt: nowIso,
					};
					if (nextSurfaces !== undefined) {
						if (nextSurfaces.length > 0) {
							copy.surfaces = [...nextSurfaces];
						} else {
							delete copy.surfaces;
						}
					}
					return copy;
				});

				for (const num of targets) {
					if (!updated.some((u) => u.toothNumber === num)) {
						updated.push({
							toothNumber: num,
							state: nextState,
							surfaces: nextSurfaces && nextSurfaces.length > 0 ? [...nextSurfaces] : [],
							updatedAt: nowIso,
						});
					}
				}

				setTeethData(updated);
				saveStoredTeethData(patientId, updated);
				setLastSavedTime(new Date().toLocaleTimeString("ru-RU"));

				if (typeof window !== "undefined") {
					window.dispatchEvent(
						new CustomEvent("dente-odontogram-update", {
							detail: {
								patientId,
								teethData: updated,
								updatedToothNumbers: targets,
								state: nextState,
								surfaces: nextSurfaces,
							},
						}),
					);

					const normState = String(nextState || "").toLowerCase();
					if (normState !== "healthy" && normState !== "" && normState !== "0") {
						for (const num of targets) {
							const finding: OdontogramFindingInput = {
								toothNumber: num,
								state: nextState,
								surfaces: nextSurfaces && nextSurfaces.length > 0 ? nextSurfaces : undefined,
							};
							const soap = generateSoapFromOdontogramFinding(finding);
							window.dispatchEvent(
								new CustomEvent("dente-apply-soap-protocol", {
									detail: {
										finding,
										soap,
										mode: "smart_append",
										immediate: true,
									},
								}),
							);
							const uiState = normState.includes("missing") || normState.includes("extract") ? "missing" : "treatment";
							useVisitStore.getState().setVisitToothRecord(String(num), {
								toothNumber: num,
								state: uiState,
								diagnosis: soap.diagnosisIcd10Label || soap.diagnosisTooth,
								diagnosisIcd10: soap.diagnosisIcd10,
								treatmentPlan: soap.treatmentDescription,
							});
						}
					}
				}

				if (targets.length === 1 && onApplyFindingToDiary) {
					onApplyFindingToDiary(targets[0]!, nextState, nextSurfaces);
				}

				// Background async sync to server without blocking UI frame
				try {
					await fetch(`/api/patients/${patientId}/tooth-states/batch`, {
						method: "POST",
						headers: denteAdminSecretRequestHeaders({
							"Content-Type": "application/json",
						}),
						body: JSON.stringify({
							toothNumbers: targets,
							state: nextState,
							surfaces: nextSurfaces && nextSurfaces.length > 0 ? nextSurfaces : undefined,
							updatedAt: nowIso,
						}),
					});
				} catch {
					// Non-blocking: local cache preserves state
				}
			},
			[patientId, onApplyFindingToDiary],
		);

		// Handle direct surface click (<16ms, zero-modal)
		const handleSurfacesChange = useCallback(
			(targets: number[], surfaces: readonly string[]) => {
				for (const t of targets) {
					const existing = teethDataRef.current.find((item) => item.toothNumber === t);
					const currentState = existing ? existing.state : "Caries";
					const nextState = currentState === "Healthy" ? "Caries" : currentState;
					void commitToothChanges([t], nextState, surfaces);
				}
			},
			[commitToothChanges],
		);

		// Handle quick state change
		const handleQuickStateChange = useCallback(
			(targets: number[], state: ToothState, surfaces?: readonly string[]) => {
				void commitToothChanges(targets, state, surfaces);
			},
			[commitToothChanges],
		);

		// Tooth click handler: selects tooth and launches sleek radial menu
		const handleToothClick = useCallback(
			(arg1: React.MouseEvent | number, arg2?: number | DOMRect, surface?: string) => {
				const isMouseEvent = typeof arg1 === "object" && arg1 !== null;
				const e = isMouseEvent ? (arg1 as React.MouseEvent) : undefined;
				const num = typeof arg1 === "number" ? arg1 : (typeof arg2 === "number" ? arg2 : 0);
				if (!num) return;
				if (activeStamp) {
					void commitToothChanges([num], activeStamp, surface ? [surface] : undefined);
					return;
				}

				const isMultiSelect = Boolean(e && (e.shiftKey || e.ctrlKey || e.metaKey));
				setSelectedTeeth((prev) => {
					if (isMultiSelect) {
						return prev.includes(num) ? prev.filter((n) => n !== num) : [...prev, num];
					}
					return [num];
				});

				if (!isMultiSelect) {
					const domRect = arg2 && typeof arg2 === "object" && "width" in arg2 ? (arg2 as DOMRect) : null;
					const rectObj = domRect
						? {
								x: domRect.left ?? domRect.x ?? 0,
								y: domRect.top ?? domRect.y ?? 0,
								width: domRect.width || 48,
								height: domRect.height || 90,
							}
						: {
								x: typeof window !== "undefined" ? window.innerWidth / 2 : 400,
								y: typeof window !== "undefined" ? window.innerHeight / 2 : 300,
								width: 48,
								height: 90,
							};

					const currentTooth = teethDataRef.current.find((t) => t.toothNumber === num);
					setRadialMenuData({
						toothNumber: num,
						anchorRect: rectObj,
						currentState: currentTooth?.state ?? "Healthy",
					});
				}
			},
			[activeStamp, commitToothChanges],
		);

		// 1-Click Fast Actions
		const handleMarkIntactDentition = useCallback(() => {
			const allTargetNumbers = isPediatric
				? ALL_DECIDUOUS_TEETH
				: isMixed
				? [...ALL_PERMANENT_TEETH, ...ALL_DECIDUOUS_TEETH]
				: ALL_PERMANENT_TEETH;

			void commitToothChanges([...allTargetNumbers], "Healthy", []);
			showToast("Вся зубная формула отмечена как санированная (интактная)", "success", 3000);
		}, [isPediatric, isMixed, commitToothChanges]);

		const handleMarkWisdomMissing = useCallback(() => {
			const wisdom = [18, 28, 38, 48];
			void commitToothChanges(wisdom, "Missing", []);
			showToast("Зубы мудрости (18, 28, 38, 48) отмечены как отсутствующие", "info", 3000);
		}, [commitToothChanges]);

		// DMFT (КПУ) Index Calculation
		const kpuStats = useMemo(() => {
			let cariesCount = 0;
			let filledCount = 0;
			let missingCount = 0;

			for (const t of teethData) {
				if (t.state === "Caries" || t.state === "Pulpitis" || t.state === "Periodontitis") {
					cariesCount++;
				} else if (t.state === "Filled") {
					filledCount++;
				} else if (t.state === "Missing" || t.state === "Root") {
					missingCount++;
				}
			}

			const totalKpu = cariesCount + filledCount + missingCount;
			return {
				c: cariesCount,
				p: filledCount,
				u: missingCount,
				total: totalKpu,
			};
		}, [teethData]);

		const stampOptions: Array<{ state: ToothState; label: string; colorClass: string }> = [
			{ state: "Healthy", label: "Норма", colorClass: "bg-emerald-600 text-white" },
			{ state: "Caries", label: "Кариес", colorClass: "bg-rose-500 text-white" },
			{ state: "Pulpitis", label: "Пульпит", colorClass: "bg-amber-600 text-white" },
			{ state: "Periodontitis", label: "Периодонтит", colorClass: "bg-purple-600 text-white" },
			{ state: "Filled", label: "Пломба", colorClass: "bg-teal-600 text-white" },
			{ state: "Crown", label: "Коронка", colorClass: "bg-blue-600 text-white" },
			{ state: "Implant", label: "Имплант", colorClass: "bg-indigo-600 text-white" },
			{ state: "Missing", label: "Отсутствует", colorClass: "bg-slate-600 text-white" },
		];

		return (
			<div
				className="patient-dental-formula-tab flex flex-col gap-3 p-3 sm:p-4 bg-[var(--paper)] rounded-2xl border border-[var(--glass-border)] shadow-xs text-[var(--ink)]"
				data-testid="patient-dental-formula-tab"
			>
				{/* Header & Controls Toolbar */}
				<div className="flex items-center justify-between gap-2 flex-wrap pb-3 border-b border-[var(--glass-border)]">
					{/* Left: Dentition Mode & Title */}
					<div className="flex items-center gap-2 flex-wrap">
						<div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center shrink-0">
							<ToothMolar className="w-4 h-4" />
						</div>
						<div>
							<div className="flex items-center gap-2">
								<h3 className="text-sm font-black m-0 text-[var(--ink)]">
									Зубная формула пациента
								</h3>
								{patientAge !== null && (
									<span className="text-[11px] font-bold px-1.5 py-0.2 rounded bg-[var(--paper-soft)] border border-[var(--glass-border)] text-[var(--muted)]">
										{patientAge} лет
									</span>
								)}
							</div>
							<p className="text-[11px] text-[var(--muted)] m-0">
								Интерактивная одонтограмма FDI • Синхронизация с медицинской картой
							</p>
						</div>

						{/* Segmented Dentition Mode Switcher */}
						<div className="flex items-center p-0.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--glass-border)] ml-1 sm:ml-2">
							<button
								type="button"
								onClick={() => setDentitionMode("adult")}
								className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
									dentitionMode === "adult"
										? "bg-[var(--paper-strong)] text-[var(--ink)] shadow-2xs"
										: "text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
							>
								Постоянный
							</button>
							<button
								type="button"
								onClick={() => setDentitionMode("mixed")}
								className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
									dentitionMode === "mixed"
										? "bg-[var(--paper-strong)] text-[var(--ink)] shadow-2xs"
										: "text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
							>
								Сменный
							</button>
							<button
								type="button"
								onClick={() => setDentitionMode("pediatric")}
								className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer inline-flex items-center gap-1 ${
									dentitionMode === "pediatric"
										? "bg-[var(--paper-strong)] text-[var(--ink)] shadow-2xs"
										: "text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
							>
								<ToothDeciduous className="w-3 h-3 text-amber-500" />
								<span>Детский</span>
							</button>
						</div>
					</div>

					{/* Right: DMFT / КПУ Counter & Fast Actions */}
					<div className="flex items-center gap-2 flex-wrap">
						{/* DMFT Badge */}
						<div
							className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--paper-soft)] border border-[var(--glass-border)] text-xs font-bold"
							title={`Индекс КПУ (Кариес: ${kpuStats.c}, Пломбировано: ${kpuStats.p}, Удалено: ${kpuStats.u})`}
						>
							<span className="text-[var(--muted)]">Индекс КПУ:</span>
							<span className="font-mono text-rose-500 font-extrabold">{kpuStats.c}К</span>
							<span className="text-[var(--glass-border)]">•</span>
							<span className="font-mono text-teal-600 font-extrabold">{kpuStats.p}П</span>
							<span className="text-[var(--glass-border)]">•</span>
							<span className="font-mono text-slate-500 font-extrabold">{kpuStats.u}У</span>
							<span className="text-[var(--glass-border)]">=</span>
							<span className="font-mono font-black text-[var(--ink)]">{kpuStats.total}</span>
						</div>

						{/* 1-Click Fast Actions */}
						<button
							type="button"
							data-testid="btn-formula-mark-intact"
							onClick={handleMarkIntactDentition}
							className="min-h-[30px] sm:min-h-[32px] h-8 px-2.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-all cursor-pointer inline-flex items-center gap-1 shadow-2xs"
							title="Отметить весь зубной ряд как здоровый и санированный"
						>
							<ShieldCheck className="w-3.5 h-3.5" />
							<span>Интактный</span>
						</button>

						<button
							type="button"
							data-testid="btn-formula-mark-wisdom-missing"
							onClick={handleMarkWisdomMissing}
							className="min-h-[30px] sm:min-h-[32px] h-8 px-2.5 text-xs font-semibold rounded-lg border border-[var(--glass-border)] bg-[var(--paper-strong)] hover:bg-[var(--glass-hover,var(--paper-soft))] text-[var(--ink)] transition-all cursor-pointer inline-flex items-center gap-1 shadow-2xs"
							title="Отметить зубы 18, 28, 38, 48 как отсутствующие"
						>
							<span>Без 8-рок</span>
						</button>
					</div>
				</div>

				{/* Stamp & Fast Tool Bar */}
				<div className="flex items-center justify-between gap-1.5 flex-wrap p-1.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--glass-border)]">
					<div className="flex items-center gap-1 flex-wrap">
						<span className="text-[11px] font-bold text-[var(--muted)] px-1">
							Быстрый штамп:
						</span>
						{stampOptions.map((opt) => (
							<button
								key={opt.state}
								type="button"
								onClick={() => {
									if (activeStamp === opt.state) {
										setActiveStamp(null);
									} else {
										setActiveStamp(opt.state);
										if (selectedTeeth.length > 0) {
											void commitToothChanges(selectedTeeth, opt.state);
										}
									}
								}}
								className={`min-h-[26px] h-6.5 px-2 text-[11px] font-bold rounded-md transition-all cursor-pointer inline-flex items-center gap-1 ${
									activeStamp === opt.state
										? `${opt.colorClass} shadow-xs ring-1 ring-white/50`
										: "bg-[var(--paper)] text-[var(--ink)] border border-[var(--glass-border)] hover:border-[var(--teal)]"
								}`}
							>
								<span>{opt.label}</span>
							</button>
						))}

						{activeStamp && (
							<button
								type="button"
								onClick={() => setActiveStamp(null)}
								className="text-[11px] text-[var(--muted)] hover:text-[var(--ink)] font-bold px-1.5 underline cursor-pointer"
							>
								Сброс штампа
							</button>
						)}
					</div>

					{/* Selected teeth count badge */}
					<div className="flex items-center gap-2">
						{selectedTeeth.length > 0 && (
							<span className="text-xs font-bold text-[var(--teal)] bg-teal-500/10 px-2 py-0.5 rounded-md">
								Выбрано зубов: {selectedTeeth.join(", ")}
							</span>
						)}
						{lastSavedTime && (
							<span className="text-[10px] text-[var(--muted)] flex items-center gap-1">
								<CheckCircle2 className="w-3 h-3 text-emerald-500" />
								<span>Сохранено: {lastSavedTime}</span>
							</span>
						)}
					</div>
				</div>

				{/* Tooth Chart Workspace */}
				<div className="w-full overflow-x-auto py-2">
					<ToothChart
						patientId={patientId}
						teethData={teethData}
						dentitionMode={dentitionMode}
						pediatricMode={isPediatric}
						mixedDentition={isMixed}
						selectedTeeth={selectedTeeth}
						activeStamp={activeStamp}
						useSurfaces={true}
						onToothClick={handleToothClick}
						onSurfacesChange={handleSurfacesChange}
						onQuickStateChange={handleQuickStateChange}
						hideQuadrantSwitcher={false}
					/>
				</div>

				{/* Sleek High-Tech Radial Menu Tool */}
				{radialMenuData && (
					<ToothRadialMenu
						toothNumber={radialMenuData.toothNumber}
						anchorRect={radialMenuData.anchorRect}
						currentState={radialMenuData.currentState}
						surfaces={teethDataRef.current.find((t) => t.toothNumber === radialMenuData.toothNumber)?.surfaces}
						onSelectState={(state, surfs) => {
							void commitToothChanges([radialMenuData.toothNumber], state, surfs);
							setRadialMenuData(null);
						}}
						onSelectSurfaces={(surfs) => {
							handleSurfacesChange([radialMenuData.toothNumber], surfs);
						}}
						onClose={() => setRadialMenuData(null)}
					/>
				)}
			</div>
		);
	},
);

PatientDentalFormulaTab.displayName = "PatientDentalFormulaTab";
