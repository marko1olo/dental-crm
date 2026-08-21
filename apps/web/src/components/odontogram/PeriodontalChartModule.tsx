import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
	calculateClinicalAttachmentLevel,
	calculatePerioIndices,
	calculatePsrSextants,
	type PerioChartSummary,
	type PerioToothRecord,
} from "@dental/shared";
import {
	Activity,
	AlertOctagon,
	AlertTriangle,
	ArrowDownUp,
	Check,
	CheckCircle2,
	Copy,
	Droplet,
	FileText,
	Grid,
	Info,
	Layers,
	ListOrdered,
	Plus,
	RotateCcw,
	Save,
	ShieldAlert,
	Sparkles,
	Tablet,
	Zap,
} from "lucide-react";
import { denteAdminSecretRequestHeaders } from "../../AppHelpers";
import { actionFailureToast } from "../../lib/panelStateText";
import { logger } from "../../utils/logger";
import { showToast } from "../GlobalToast";
import {
	derivePeriodontalDiagnosis,
	formatPsrSextantsSummary,
	generatePerio043DiaryText,
} from "./perio043Protocol";
import { PerioFullMouthGrid } from "./PerioFullMouthGrid";
import { PerioKeypad } from "./PerioKeypad";
import { PerioToothDetailCard } from "./PerioToothDetailCard";
import {
	ALL_PERIO_TEETH,
	generateFullMouthProbingSequence,
	PERIO_LOWER_ARCH_TEETH,
	PERIO_UPPER_ARCH_TEETH,
	type PerioSiteKey,
	type ProbingStep,
} from "./perioTypes";

export interface PeriodontalChartModuleProps {
	patientId: string;
	visitId?: string | null;
	doctorId?: string | null;
	onInsertToProtocol?: ((protocolText: string) => void) | undefined;
}

function createDefaultTooth(toothNumber: number): PerioToothRecord {
	return {
		toothNumber,
		isMissing: false,
		isImplant: false,
		mobility: 0,
		furcation: 0,
		distoBuccal: { probingDepthMm: 2, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false, suppuration: false, calculus: false },
		midBuccal: { probingDepthMm: 2, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false, suppuration: false, calculus: false },
		mesioBuccal: { probingDepthMm: 2, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false, suppuration: false, calculus: false },
		distoLingual: { probingDepthMm: 2, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false, suppuration: false, calculus: false },
		midLingual: { probingDepthMm: 2, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false, suppuration: false, calculus: false },
		mesioLingual: { probingDepthMm: 2, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false, suppuration: false, calculus: false },
	};
}

export function PeriodontalChartModule({
	patientId,
	visitId,
	doctorId,
	onInsertToProtocol,
}: PeriodontalChartModuleProps) {
	const [teeth, setTeeth] = useState<PerioToothRecord[]>(() =>
		ALL_PERIO_TEETH.map(createDefaultTooth),
	);
	const [activeToothNumber, setActiveToothNumber] = useState<number>(11);
	const [activeSiteKey, setActiveSiteKey] = useState<PerioSiteKey>("midBuccal");
	const [activeArch, setActiveArch] = useState<"upper" | "lower">("upper");
	const [viewMode, setViewMode] = useState<"detail" | "grid">("detail");
	const [autoAdvance, setAutoAdvance] = useState<boolean>(true);
	const [loading, setLoading] = useState<boolean>(true);
	const [saving, setSaving] = useState<boolean>(false);
	const [copiedProtocol, setCopiedProtocol] = useState<boolean>(false);
	const [show043Preview, setShow043Preview] = useState<boolean>(true);
	const [chartNotes, setChartNotes] = useState<string>("");
	const [summary, setSummary] = useState<PerioChartSummary>(() =>
		calculatePerioIndices(ALL_PERIO_TEETH.map(createDefaultTooth)),
	);

	// Recompute clinical indices whenever teeth measurements mutate
	useEffect(() => {
		const newSummary = calculatePerioIndices(teeth);
		setSummary(newSummary);
	}, [teeth]);

	// Load existing periodontal chart for the patient
	useEffect(() => {
		let isMounted = true;
		async function loadChart() {
			try {
				setLoading(true);
				const headers = denteAdminSecretRequestHeaders();
				const res = await fetch(`/api/perio/patients/${patientId}/charts`, {
					credentials: "include",
					headers,
				});
				if (res.ok) {
					const body = await res.json();
					if (isMounted && Array.isArray(body.charts) && body.charts.length > 0) {
						const latest = body.charts[0];
						const loadedTeeth = Array.isArray(latest.teethData)
							? latest.teethData
							: Array.isArray(latest.teethData?.teeth)
								? latest.teethData.teeth
								: null;
						if (loadedTeeth && loadedTeeth.length > 0) {
							// Merge loaded teeth with default full arch to ensure all 32 teeth exist
							const loadedMap = new Map<number, PerioToothRecord>();
							for (const t of loadedTeeth) {
								if (t?.toothNumber) loadedMap.set(t.toothNumber, t);
							}
							const completeTeeth = ALL_PERIO_TEETH.map((num) =>
								loadedMap.get(num) ?? createDefaultTooth(num),
							);
							setTeeth(completeTeeth);
							if (latest.notes) setChartNotes(latest.notes);
						}
					}
				}
			} catch (err) {
				logger.error("[perio] Ошибка загрузки пародонтологической карты:", err);
			} finally {
				if (isMounted) setLoading(false);
			}
		}
		loadChart();
		return () => {
			isMounted = false;
		};
	}, [patientId]);

	const updateToothField = useCallback(
		(toothNumber: number, updater: (t: PerioToothRecord) => PerioToothRecord) => {
			setTeeth((prev) =>
				prev.map((t) => (t.toothNumber === toothNumber ? updater({ ...t }) : t)),
			);
		},
		[],
	);

	// Probing Sequence Generator
	const probingSequence = useMemo(() => generateFullMouthProbingSequence(teeth), [teeth]);

	const currentStepIndex = useMemo(() => {
		return probingSequence.findIndex(
			(s) => s.toothNumber === activeToothNumber && s.siteKey === activeSiteKey,
		);
	}, [probingSequence, activeToothNumber, activeSiteKey]);

	const stepTo = useCallback((index: number) => {
		if (index >= 0 && index < probingSequence.length) {
			const target = probingSequence[index];
			if (target) {
				setActiveToothNumber(target.toothNumber);
				setActiveSiteKey(target.siteKey);
				setActiveArch(target.arch);
			}
		}
	}, [probingSequence]);

	const handleNextSite = useCallback(() => {
		if (currentStepIndex < probingSequence.length - 1) {
			stepTo(currentStepIndex + 1);
		} else {
			// Wrap around to start or show completion toast
			showToast("Зондирование всех участков полости рта завершено", "info");
			stepTo(0);
		}
	}, [currentStepIndex, probingSequence.length, stepTo]);

	const handlePrevSite = useCallback(() => {
		if (currentStepIndex > 0) {
			stepTo(currentStepIndex - 1);
		}
	}, [currentStepIndex, stepTo]);

	const handleNextTooth = useCallback(() => {
		const teethList: readonly number[] = activeArch === "upper" ? PERIO_UPPER_ARCH_TEETH : PERIO_LOWER_ARCH_TEETH;
		const curIdx = teethList.indexOf(activeToothNumber);
		if (curIdx >= 0 && curIdx < teethList.length - 1) {
			const nextNum = teethList[curIdx + 1];
			if (typeof nextNum === "number") {
				setActiveToothNumber(nextNum);
			}
		}
	}, [activeArch, activeToothNumber]);

	const handlePrevTooth = useCallback(() => {
		const teethList: readonly number[] = activeArch === "upper" ? PERIO_UPPER_ARCH_TEETH : PERIO_LOWER_ARCH_TEETH;
		const curIdx = teethList.indexOf(activeToothNumber);
		if (curIdx > 0) {
			const prevNum = teethList[curIdx - 1];
			if (typeof prevNum === "number") {
				setActiveToothNumber(prevNum);
			}
		}
	}, [activeArch, activeToothNumber]);

	const handleDepthSelect = useCallback((depth: number) => {
		updateToothField(activeToothNumber, (t) => ({
			...t,
			[activeSiteKey]: {
				...t[activeSiteKey],
				probingDepthMm: depth,
			},
		}));

		if (autoAdvance) {
			handleNextSite();
		}
	}, [activeToothNumber, activeSiteKey, autoAdvance, handleNextSite, updateToothField]);

	const handleGingivalMarginChange = useCallback((gm: number) => {
		updateToothField(activeToothNumber, (t) => ({
			...t,
			[activeSiteKey]: {
				...t[activeSiteKey],
				gingivalMarginMm: gm,
			},
		}));
	}, [activeToothNumber, activeSiteKey, updateToothField]);

	const handleToggleBop = useCallback(() => {
		updateToothField(activeToothNumber, (t) => ({
			...t,
			[activeSiteKey]: {
				...t[activeSiteKey],
				bleedingOnProbing: !t[activeSiteKey].bleedingOnProbing,
			},
		}));
	}, [activeToothNumber, activeSiteKey, updateToothField]);

	const handleToggleSuppuration = useCallback(() => {
		updateToothField(activeToothNumber, (t) => ({
			...t,
			[activeSiteKey]: {
				...t[activeSiteKey],
				suppuration: !t[activeSiteKey].suppuration,
			},
		}));
	}, [activeToothNumber, activeSiteKey, updateToothField]);

	const handleTogglePlaque = useCallback(() => {
		updateToothField(activeToothNumber, (t) => ({
			...t,
			[activeSiteKey]: {
				...t[activeSiteKey],
				plaque: !t[activeSiteKey].plaque,
			},
		}));
	}, [activeToothNumber, activeSiteKey, updateToothField]);

	const handleToggleCalculus = useCallback(() => {
		updateToothField(activeToothNumber, (t) => ({
			...t,
			[activeSiteKey]: {
				...t[activeSiteKey],
				calculus: !t[activeSiteKey].calculus,
			},
		}));
	}, [activeToothNumber, activeSiteKey, updateToothField]);

	const handleSaveChart = async () => {
		try {
			setSaving(true);
			const payload = {
				visitId: visitId || null,
				doctorId: doctorId || null,
				chartDate: new Date().toISOString(),
				teeth,
				notes: chartNotes || null,
			};

			const headers = {
				...denteAdminSecretRequestHeaders(),
				"Content-Type": "application/json",
			};

			const res = await fetch(`/api/perio/patients/${patientId}/charts`, {
				method: "POST",
				headers,
				credentials: "include",
				body: JSON.stringify(payload),
			});

			if (res.ok) {
				const riskLabels: Record<string, string> = {
					low: "НИЗКИЙ",
					moderate: "СРЕДНИЙ",
					high: "ВЫСОКИЙ",
				};
				showToast(
					`Пародонтологическая карта сохранена (FMBS: ${summary.fmbsPercent}%, FMPS: ${summary.fmpsPercent}%, Риск: ${riskLabels[summary.riskCategory] || summary.riskCategory})`,
					"success",
				);
			} else {
				const errJson = (await res.json().catch(() => ({}))) as {
					message?: string;
				};
				showToast(
					errJson.message ||
						"Не удалось сохранить пародонтологическую карту: проверьте соединение.",
					"error",
				);
			}
		} catch (err) {
			logger.error("[perio] Ошибка сохранения пародонтологической карты:", err);
			showToast(
				actionFailureToast(
					"Ошибка отправки пародонтологической карты",
					(err as { status?: number })?.status ?? null,
				),
				"error",
			);
		} finally {
			setSaving(false);
		}
	};

	const currentTooth: PerioToothRecord =
		teeth.find((t) => t.toothNumber === activeToothNumber) ?? teeth[0] ?? createDefaultTooth(11);
	const currentSite = currentTooth[activeSiteKey];
	const currentCal = calculateClinicalAttachmentLevel(
		currentSite.probingDepthMm,
		currentSite.gingivalMarginMm,
	);

	const psr = calculatePsrSextants(teeth);
	const psrSummary = formatPsrSextantsSummary(psr);
	const diagnosis = derivePeriodontalDiagnosis(teeth, summary);
	const protocol043Text = generatePerio043DiaryText(teeth, summary, { customNotes: chartNotes });

	const handleCopyProtocol = async () => {
		try {
			await navigator.clipboard.writeText(protocol043Text);
			setCopiedProtocol(true);
			showToast("Протокол пародонтологического обследования 043/у скопирован в буфер обмена!", "success");
			setTimeout(() => setCopiedProtocol(false), 2500);
		} catch (err) {
			logger.error("[perio] Ошибка копирования в буфер обмена:", err);
			showToast("Не удалось скопировать протокол в буфер обмена", "error");
		}
	};

	const handleInsertProtocol = () => {
		if (onInsertToProtocol) {
			onInsertToProtocol(protocol043Text);
			showToast("Протокол пародонтологического обследования успешно вставлен в карту 043/у!", "success");
		}
	};

	const upperTeeth = teeth.filter((t) => t.toothNumber < 30 || (t.toothNumber >= 51 && t.toothNumber <= 65));
	const lowerTeeth = teeth.filter((t) => t.toothNumber >= 30 && t.toothNumber <= 48);

	return (
		<div className="perio-chart-module bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm space-y-4">
			{/* Top Header Banner */}
			<div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
				<div>
					<h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
						<Layers className="w-5 h-5 text-teal-600 dark:text-teal-400" />
						<span>Пародонтологическая карта (Florida Probe / 6-Point Charting)</span>
					</h3>
					<p className="text-xs text-slate-500 dark:text-slate-400">
						6-точечное зондирование десневых карманов (MB, B, DB, ML, L, DL), фуркации I–IV, подвижность и CAL
					</p>
				</div>

				<div className="flex items-center gap-2">
					{/* View Switcher: Detail Keypad vs Full Matrix Grid */}
					<div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 p-0.5">
						<button
							type="button"
							onClick={() => setViewMode("detail")}
							className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
								viewMode === "detail"
									? "bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-xs"
									: "text-slate-600 dark:text-slate-400 hover:text-slate-900"
							}`}
						>
							<Tablet className="w-3.5 h-3.5" />
							<span>Планшет / Зонд</span>
						</button>
						<button
							type="button"
							onClick={() => setViewMode("grid")}
							className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
								viewMode === "grid"
									? "bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-xs"
									: "text-slate-600 dark:text-slate-400 hover:text-slate-900"
							}`}
						>
							<Grid className="w-3.5 h-3.5" />
							<span>Вся сетка</span>
						</button>
					</div>

					<button
						type="button"
						onClick={handleSaveChart}
						disabled={saving || loading}
						className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-sm transition-colors cursor-pointer active:scale-95"
					>
						<Save className="w-4 h-4" />
						<span>{saving ? "Сохранение..." : "Сохранить карту"}</span>
					</button>
				</div>
			</div>

			{/* Clinical Diagnostic Indices Bar */}
			<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
				<div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700/50 text-center">
					<span className="text-[11px] text-slate-500 dark:text-slate-400 block">FMBS (Кровоточивость)</span>
					<span
						className={`text-base font-black ${
							summary.fmbsPercent <= 10
								? "text-emerald-600 dark:text-emerald-400"
								: summary.fmbsPercent <= 25
									? "text-amber-600 dark:text-amber-400"
									: "text-rose-600 dark:text-rose-400"
						}`}
					>
						{summary.fmbsPercent}%
					</span>
				</div>

				<div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700/50 text-center">
					<span className="text-[11px] text-slate-500 dark:text-slate-400 block">FMPS (Налёт/Бляшка)</span>
					<span
						className={`text-base font-black ${
							summary.fmpsPercent <= 20
								? "text-emerald-600 dark:text-emerald-400"
								: "text-amber-600 dark:text-amber-400"
						}`}
					>
						{summary.fmpsPercent}%
					</span>
				</div>

				<div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700/50 text-center">
					<span className="text-[11px] text-slate-500 dark:text-slate-400 block">Карманы (≥5 мм)</span>
					<span
						className={`text-base font-black ${
							summary.deepPocketsCount > 0
								? "text-rose-600 dark:text-rose-400"
								: "text-slate-700 dark:text-slate-300"
						}`}
					>
						{summary.deepPocketsCount}
					</span>
				</div>

				<div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700/50 text-center">
					<span className="text-[11px] text-slate-500 dark:text-slate-400 block">Макс. глубина PD</span>
					<span className="text-base font-black text-slate-800 dark:text-slate-200">
						{summary.maxPocketDepthMm} мм
					</span>
				</div>

				<div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700/50 text-center">
					<span className="text-[11px] text-slate-500 dark:text-slate-400 block">Макс. потеря CAL</span>
					<span className="text-base font-black text-teal-700 dark:text-teal-400">
						{summary.maxCalMm} мм
					</span>
				</div>

				<div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700/50 text-center">
					<span className="text-[11px] text-slate-500 dark:text-slate-400 block">Риск (AAP/EFP)</span>
					<span
						className={`text-xs font-bold px-2 py-0.5 rounded-full inline-block mt-0.5 uppercase ${
							summary.riskCategory === "low"
								? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-300/40"
								: summary.riskCategory === "moderate"
									? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-300/40"
									: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-300/40"
						}`}
					>
						{summary.riskCategory === "low"
							? "Низкий"
							: summary.riskCategory === "moderate"
								? "Средний"
								: "Высокий"}
					</span>
				</div>
			</div>

			{/* Suppuration Alert Banner if Active Phase Detected */}
			{summary.sitesWithSuppurationCount > 0 && (
				<div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center justify-between gap-3 text-xs text-rose-800 dark:text-rose-200">
					<div className="flex items-center gap-2">
						<Droplet className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
						<div>
							<strong>Внимание: активная фаза пародонтита (гноетечение)!</strong>
							<p className="text-[11px] opacity-85">
								Обнаружено {summary.sitesWithSuppurationCount} участков с гнойным экссудатом (Suppuration). Показан антибактериальный кюретаж и медикаментозная обработка.
							</p>
						</div>
					</div>
					<span className="px-2 py-1 bg-rose-600 text-white rounded font-bold text-[10px] shrink-0 uppercase">
						SUP: {summary.sitesWithSuppurationCount}
					</span>
				</div>
			)}

			{/* PSR / CPITN Sextants Widget */}
			<div className="bg-slate-50/70 dark:bg-slate-800/40 p-3 rounded-lg border border-slate-200 dark:border-slate-700/60">
				<div className="flex items-center justify-between mb-2">
					<span className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
						<Info className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
						Скрининг пародонта PSR / CPITN по секстантам (ВОЗ)
					</span>
				</div>
				<div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
					{(["S1", "S2", "S3", "S4", "S5", "S6"] as const).map((sKey) => {
						const sextant = psr[sKey];
						const labels: Record<string, string> = {
							S1: "S1 (17-14)",
							S2: "S2 (13-23)",
							S3: "S3 (24-27)",
							S4: "S4 (37-34)",
							S5: "S5 (33-43)",
							S6: "S6 (44-47)",
						};
						return (
							<div
								key={sKey}
								className="bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800 text-center"
							>
								<div className="text-[10px] text-slate-500 dark:text-slate-400">{labels[sKey]}</div>
								<div className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center justify-center gap-1">
									{sextant ? `Код ${sextant.code}` : "—"}
									{sextant?.asterisk && (
										<span className="text-rose-500 font-black text-base leading-none" title="Патологическая подвижность / поражение фуркации">*</span>
									)}
								</div>
							</div>
						);
					})}
				</div>
			</div>

			{/* Arch Selector Tabs (Upper / Lower Arch) */}
			<div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
				<button
					type="button"
					onClick={() => {
						setActiveArch("upper");
						if (activeToothNumber > 30) setActiveToothNumber(11);
					}}
					className={`min-h-[44px] px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-2 ${
						activeArch === "upper"
							? "bg-teal-600 text-white shadow-xs"
							: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
					}`}
				>
					<span>🦷 Верхняя челюсть (18–28)</span>
				</button>
				<button
					type="button"
					onClick={() => {
						setActiveArch("lower");
						if (activeToothNumber < 30) setActiveToothNumber(41);
					}}
					className={`min-h-[44px] px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-2 ${
						activeArch === "lower"
							? "bg-teal-600 text-white shadow-xs"
							: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
					}`}
				>
					<span>🦷 Нижняя челюсть (48–38)</span>
				</button>
			</div>

			{/* Tooth Selector Carousel (Touch Target >= 48px) */}
			<div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
				{(activeArch === "upper" ? upperTeeth : lowerTeeth).map((t) => {
					const hasBop =
						t.distoBuccal.bleedingOnProbing ||
						t.midBuccal.bleedingOnProbing ||
						t.mesioBuccal.bleedingOnProbing ||
						t.distoLingual.bleedingOnProbing ||
						t.midLingual.bleedingOnProbing ||
						t.mesioLingual.bleedingOnProbing;
					const maxPd = Math.max(
						t.distoBuccal.probingDepthMm,
						t.midBuccal.probingDepthMm,
						t.mesioBuccal.probingDepthMm,
						t.distoLingual.probingDepthMm,
						t.midLingual.probingDepthMm,
						t.mesioLingual.probingDepthMm,
					);
					const isDeep = maxPd >= 5;

					return (
						<button
							key={t.toothNumber}
							type="button"
							onClick={() => setActiveToothNumber(t.toothNumber)}
							className={`relative flex-shrink-0 min-w-[48px] min-h-[56px] py-1.5 px-2 rounded-xl border text-center transition-all cursor-pointer select-none ${
								t.toothNumber === activeToothNumber
									? "border-teal-500 ring-2 ring-teal-500/40 bg-teal-500/15 shadow-sm"
									: t.isMissing
										? "border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/40 opacity-40"
										: "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300"
							}`}
						>
							<div className="text-xs font-black text-slate-800 dark:text-slate-200 font-mono">
								{t.toothNumber}
							</div>
							<div
								className={`text-[10px] font-bold ${
									isDeep ? "text-rose-600 dark:text-rose-400" : "text-slate-500 dark:text-slate-400"
								}`}
							>
								{t.isMissing ? "—" : `${maxPd}мм`}
							</div>
							{hasBop && (
								<span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
							)}
						</button>
					);
				})}
			</div>

			{/* Main Workspace: Tablet Detail Probing Mode vs Full Matrix View */}
			{viewMode === "detail" ? (
				<div className="space-y-4">
					{/* Active Tooth Detail Card */}
					<PerioToothDetailCard
						tooth={currentTooth}
						activeSiteKey={activeSiteKey}
						onSiteSelect={setActiveSiteKey}
						onUpdateTooth={(updater) => updateToothField(currentTooth.toothNumber, updater)}
					/>

					{/* Tablet Quick Probing Keypad */}
					<PerioKeypad
						activeToothNumber={currentTooth.toothNumber}
						activeSiteKey={activeSiteKey}
						probingDepthMm={currentSite.probingDepthMm}
						gingivalMarginMm={currentSite.gingivalMarginMm}
						calMm={currentCal}
						bleedingOnProbing={currentSite.bleedingOnProbing}
						suppuration={currentSite.suppuration}
						plaque={currentSite.plaque}
						calculus={currentSite.calculus}
						autoAdvance={autoAdvance}
						onAutoAdvanceToggle={() => setAutoAdvance((prev) => !prev)}
						onDepthSelect={handleDepthSelect}
						onGingivalMarginChange={handleGingivalMarginChange}
						onToggleBop={handleToggleBop}
						onToggleSuppuration={handleToggleSuppuration}
						onTogglePlaque={handleTogglePlaque}
						onToggleCalculus={handleToggleCalculus}
						onPrevSite={handlePrevSite}
						onNextSite={handleNextSite}
						onPrevTooth={handlePrevTooth}
						onNextTooth={handleNextTooth}
					/>
				</div>
			) : (
				<div className="space-y-3">
					<PerioFullMouthGrid
						teeth={teeth}
						activeArch={activeArch}
						activeToothNumber={activeToothNumber}
						activeSiteKey={activeSiteKey}
						onSelectToothAndSite={(num, site) => {
							setActiveToothNumber(num);
							setActiveSiteKey(site);
						}}
					/>
				</div>
			)}

			{/* Clinical Notes & Diagnostic Summary */}
			<div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
				<label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
					Клиническое заключение и план пародонтологического лечения:
				</label>
				<textarea
					rows={2}
					value={chartNotes}
					onChange={(e) => setChartNotes(e.target.value)}
					placeholder="Например: Генерализованный пародонтит III ст., стадия B. Показан SRP (Scaling & Root Planing), вектор-терапия, повторный ре-осмотр через 6 недель."
					className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-teal-500 outline-none"
				/>
			</div>

			{/* Form 043/u Clinical Protocol Card (Приказ МЗ РФ №834н) */}
			<div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/70 rounded-xl space-y-3">
				<div className="flex flex-wrap items-center justify-between gap-2">
					<div className="flex items-center gap-2">
						<FileText className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0" />
						<div>
							<h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
								<span>Протокол для Дневника Формы 043/у (Приказ МЗ РФ №834н)</span>
								<span className="px-2 py-0.5 rounded text-[10px] font-black bg-teal-600/15 text-teal-700 dark:text-teal-300 border border-teal-500/30">
									{diagnosis.icd10Code}
								</span>
							</h4>
							<p className="text-[11px] text-slate-500 dark:text-slate-400">
								Автоматический расчёт индексов PSR, BOP, CAL и формулировка диагноза по МКБ-10 / AAP 2018
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={handleCopyProtocol}
							className="min-h-[44px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors shadow-2xs cursor-pointer active:scale-95"
							title="Скопировать протокол в буфер обмена для вставки в карту 043/у"
						>
							{copiedProtocol ? (
								<>
									<Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
									<span className="text-emerald-700 dark:text-emerald-300">Скопировано!</span>
								</>
							) : (
								<>
									<Copy className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
									<span>Скопировать в дневник 043/у</span>
								</>
							)}
						</button>

						{onInsertToProtocol && (
							<button
								type="button"
								onClick={handleInsertProtocol}
								className="min-h-[44px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white transition-colors shadow-2xs cursor-pointer active:scale-95"
								title="Вставить протокол напрямую в активный дневник приёма"
							>
								<CheckCircle2 className="w-3.5 h-3.5" />
								<span>Вставить в дневник приёма</span>
							</button>
						)}
					</div>
				</div>

				{/* Live Protocol Textarea Preview */}
				<div className="relative">
					<textarea
						readOnly
						rows={7}
						value={protocol043Text}
						className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-xs font-mono text-slate-800 dark:text-slate-200 leading-relaxed resize-y focus:outline-none select-all"
						aria-label="Текст клинического протокола пародонтологического обследования для формы 043/у"
					/>
				</div>
			</div>
		</div>
	);
}
