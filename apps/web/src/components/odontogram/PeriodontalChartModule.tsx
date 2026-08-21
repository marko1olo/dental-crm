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
	Check,
	CheckCircle2,
	Copy,
	Cigarette,
	Droplet,
	FileText,
	Grid,
	HeartPulse,
	Info,
	Layers,
	Radar,
	RotateCcw,
	Save,
	ShieldAlert,
	Sparkles,
	Tablet,
	User,
	Zap,
} from "lucide-react";
import { denteAdminSecretRequestHeaders } from "../../AppHelpers";
import { actionFailureToast } from "../../lib/panelStateText";
import { logger } from "../../utils/logger";
import { showToast } from "../GlobalToast";
import {
	calculateBoneLossAgeRatio,
	calculatePeriodontalRiskAssessment,
	derivePeriodontalDiagnosis,
	estimateBoneLossPercentFromTeeth,
	formatPsrSextantsSummary,
	generateComprehensivePerio043Text,
	type DiabetesStatus,
	type PraRiskLevel,
	type PraSpiderResult,
	type SmokingStatus,
} from "./periodontalMath";
import { PerioFullMouthGrid } from "./PerioFullMouthGrid";
import { PerioKeypad } from "./PerioKeypad";
import { PerioToothDetailCard } from "./PerioToothDetailCard";
import {
	ALL_PERIO_TEETH,
	generateFullMouthProbingSequence,
	PERIO_LOWER_ARCH_TEETH,
	PERIO_UPPER_ARCH_TEETH,
	type PerioSiteKey,
} from "./perioTypes";
import "./PeriodontalChartModule.css";

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
	const [viewMode, setViewMode] = useState<"detail" | "grid" | "pra">("detail");
	const [autoAdvance, setAutoAdvance] = useState<boolean>(true);
	const [loading, setLoading] = useState<boolean>(true);
	const [saving, setSaving] = useState<boolean>(false);
	const [copiedProtocol, setCopiedProtocol] = useState<boolean>(false);
	const [chartNotes, setChartNotes] = useState<string>("");

	// PRA Spider Diagram Patient Parameters
	const [patientAge, setPatientAge] = useState<number>(45);
	const [smokingStatus, setSmokingStatus] = useState<SmokingStatus>("non_smoker");
	const [diabetesStatus, setDiabetesStatus] = useState<DiabetesStatus>("none");
	const [customBoneLossPercent, setCustomBoneLossPercent] = useState<number | null>(null);

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

	// Probing Sequence Generator for Florida Probe Workflow
	const probingSequence = useMemo(() => generateFullMouthProbingSequence(teeth), [teeth]);

	const currentStepIndex = useMemo(() => {
		return probingSequence.findIndex(
			(s) => s.toothNumber === activeToothNumber && s.siteKey === activeSiteKey,
		);
	}, [probingSequence, activeToothNumber, activeSiteKey]);

	const stepTo = useCallback(
		(index: number) => {
			if (index >= 0 && index < probingSequence.length) {
				const target = probingSequence[index];
				if (target) {
					setActiveToothNumber(target.toothNumber);
					setActiveSiteKey(target.siteKey);
					setActiveArch(target.arch);
				}
			}
		},
		[probingSequence],
	);

	const handleNextSite = useCallback(() => {
		if (currentStepIndex < probingSequence.length - 1) {
			stepTo(currentStepIndex + 1);
		} else {
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
		const teethList: readonly number[] =
			activeArch === "upper" ? PERIO_UPPER_ARCH_TEETH : PERIO_LOWER_ARCH_TEETH;
		const curIdx = teethList.indexOf(activeToothNumber);
		if (curIdx >= 0 && curIdx < teethList.length - 1) {
			const nextNum = teethList[curIdx + 1];
			if (typeof nextNum === "number") {
				setActiveToothNumber(nextNum);
			}
		}
	}, [activeArch, activeToothNumber]);

	const handlePrevTooth = useCallback(() => {
		const teethList: readonly number[] =
			activeArch === "upper" ? PERIO_UPPER_ARCH_TEETH : PERIO_LOWER_ARCH_TEETH;
		const curIdx = teethList.indexOf(activeToothNumber);
		if (curIdx > 0) {
			const prevNum = teethList[curIdx - 1];
			if (typeof prevNum === "number") {
				setActiveToothNumber(prevNum);
			}
		}
	}, [activeArch, activeToothNumber]);

	const handleDepthSelect = useCallback(
		(depth: number) => {
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
		},
		[activeToothNumber, activeSiteKey, autoAdvance, handleNextSite, updateToothField],
	);

	const handleGingivalMarginChange = useCallback(
		(gm: number) => {
			updateToothField(activeToothNumber, (t) => ({
				...t,
				[activeSiteKey]: {
					...t[activeSiteKey],
					gingivalMarginMm: gm,
				},
			}));
		},
		[activeToothNumber, activeSiteKey, updateToothField],
	);

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

	// PRA Spider Diagram Computation
	const estimatedBoneLoss = useMemo(() => {
		return customBoneLossPercent ?? estimateBoneLossPercentFromTeeth(teeth, summary.maxCalMm);
	}, [customBoneLossPercent, teeth, summary.maxCalMm]);

	const blAgeRatio = useMemo(() => {
		return calculateBoneLossAgeRatio(estimatedBoneLoss, patientAge);
	}, [estimatedBoneLoss, patientAge]);

	const praResult: PraSpiderResult = useMemo(() => {
		return calculatePeriodontalRiskAssessment({
			teeth,
			summary,
			patientAgeYears: patientAge,
			radiographicBoneLossPercent: estimatedBoneLoss,
			smokingStatus,
			diabetesStatus,
		});
	}, [teeth, summary, patientAge, estimatedBoneLoss, smokingStatus, diabetesStatus]);

	const psr = useMemo(() => calculatePsrSextants(teeth), [teeth]);
	const diagnosis = useMemo(() => derivePeriodontalDiagnosis(teeth, summary), [teeth, summary]);

	const protocol043Text = useMemo(() => {
		return generateComprehensivePerio043Text(teeth, summary, {
			customNotes: chartNotes,
			praResult,
			patientAgeYears: patientAge,
			smokingStatus,
			diabetesStatus,
		});
	}, [teeth, summary, chartNotes, praResult, patientAge, smokingStatus, diabetesStatus]);

	const handleSaveChart = async () => {
		try {
			setSaving(true);
			const payload = {
				visitId: visitId || null,
				doctorId: doctorId || null,
				chartDate: new Date().toISOString(),
				teeth,
				notes: chartNotes || null,
				praRisk: praResult.overallRisk,
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
				const riskLabels: Record<PraRiskLevel, string> = {
					low: "НИЗКИЙ",
					moderate: "СРЕДНИЙ",
					high: "ВЫСОКИЙ",
				};
				showToast(
					`Пародонтологическая карта сохранена (FMBS: ${summary.fmbsPercent}%, FMPS: ${summary.fmpsPercent}%, Риск PRA: ${riskLabels[praResult.overallRisk]})`,
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

	const handleCopyProtocol = async () => {
		try {
			await navigator.clipboard.writeText(protocol043Text);
			setCopiedProtocol(true);
			showToast(
				"Протокол пародонтологического обследования 043/у скопирован в буфер обмена!",
				"success",
			);
			setTimeout(() => setCopiedProtocol(false), 2500);
		} catch (err) {
			logger.error("[perio] Ошибка копирования в буфер обмена:", err);
			showToast("Не удалось скопировать протокол в буфер обмена", "error");
		}
	};

	const handleInsertProtocol = () => {
		if (onInsertToProtocol) {
			onInsertToProtocol(protocol043Text);
			showToast(
				"Протокол пародонтологического обследования успешно вставлен в карту 043/у!",
				"success",
			);
		}
	};

	const currentTooth: PerioToothRecord =
		teeth.find((t) => t.toothNumber === activeToothNumber) ??
		teeth[0] ??
		createDefaultTooth(11);
	const currentSite = currentTooth[activeSiteKey];
	const currentCal = calculateClinicalAttachmentLevel(
		currentSite.probingDepthMm,
		currentSite.gingivalMarginMm,
	);

	const upperTeeth = teeth.filter(
		(t) => t.toothNumber < 30 || (t.toothNumber >= 51 && t.toothNumber <= 65),
	);
	const lowerTeeth = teeth.filter((t) => t.toothNumber >= 30 && t.toothNumber <= 48);

	return (
		<div className="perio-chart-module bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm space-y-4">
			{/* Top Header Banner */}
			<div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
				<div>
					<h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
						<Layers className="w-5 h-5 text-teal-600 dark:text-teal-400" />
						<span>Пародонтологическая карта (Florida Probe / 6-Point Charting & PRA)</span>
					</h3>
					<p className="text-xs font-medium text-slate-500 dark:text-slate-400">
						6-точечное зондирование десневых карманов (MB, B, DB, ML, L, DL), фуркации I–IV, подвижность и паутина рисков PRA
					</p>
				</div>

				<div className="flex items-center gap-2">
					{/* View Switcher: Detail Keypad vs Full Grid vs PRA Spider */}
					<div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 p-0.5">
						<button
							type="button"
							onClick={() => setViewMode("detail")}
							className={`min-h-[44px] px-3.5 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
								viewMode === "detail"
									? "bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-xs"
									: "text-slate-600 dark:text-slate-400 hover:text-slate-900"
							}`}
						>
							<Tablet className="w-4 h-4" />
							<span>Планшет / Зонд</span>
						</button>
						<button
							type="button"
							onClick={() => setViewMode("grid")}
							className={`min-h-[44px] px-3.5 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
								viewMode === "grid"
									? "bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-xs"
									: "text-slate-600 dark:text-slate-400 hover:text-slate-900"
							}`}
						>
							<Grid className="w-4 h-4" />
							<span>Вся сетка</span>
						</button>
						<button
							type="button"
							onClick={() => setViewMode("pra")}
							className={`min-h-[44px] px-3.5 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
								viewMode === "pra"
									? "bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-xs"
									: "text-slate-600 dark:text-slate-400 hover:text-slate-900"
							}`}
						>
							<Radar className="w-4 h-4" />
							<span>PRA Паутина</span>
						</button>
					</div>

					<button
						type="button"
						onClick={handleSaveChart}
						disabled={saving || loading}
						className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-lg text-xs font-black shadow-sm transition-colors cursor-pointer active:scale-95"
					>
						<Save className="w-4 h-4" />
						<span>{saving ? "Сохранение..." : "Сохранить карту"}</span>
					</button>
				</div>
			</div>

			{/* Clinical Diagnostic Indices Bar (No micro-fonts <= 11px! >= 13-14px bold headers) */}
			<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
				<div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60 text-center">
					<span className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">
						FMBS (Кровоточивость)
					</span>
					<span
						className={`text-xl font-black ${
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

				<div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60 text-center">
					<span className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">
						FMPS (Зубной налёт)
					</span>
					<span
						className={`text-xl font-black ${
							summary.fmpsPercent <= 20
								? "text-emerald-600 dark:text-emerald-400"
								: "text-amber-600 dark:text-amber-400"
						}`}
					>
						{summary.fmpsPercent}%
					</span>
				</div>

				<div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60 text-center">
					<span className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">
						Карманы (PPD ≥ 5мм)
					</span>
					<span
						className={`text-xl font-black ${
							summary.deepPocketsCount > 0
								? "text-rose-600 dark:text-rose-400"
								: "text-slate-800 dark:text-slate-200"
						}`}
					>
						{summary.deepPocketsCount} уч.
					</span>
				</div>

				<div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60 text-center">
					<span className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">
						Макс. глубина PD
					</span>
					<span className="text-xl font-black text-slate-900 dark:text-slate-100">
						{summary.maxPocketDepthMm} мм
					</span>
				</div>

				<div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60 text-center">
					<span className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">
						BL / Возраст (AAP)
					</span>
					<span
						className={`text-xl font-black ${
							blAgeRatio > 1.0
								? "text-rose-600 dark:text-rose-400"
								: blAgeRatio >= 0.5
									? "text-amber-600 dark:text-amber-400"
									: "text-teal-600 dark:text-teal-400"
						}`}
					>
						{blAgeRatio}
					</span>
				</div>

				<div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60 text-center">
					<span className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">
						Риск PRA (ВОЗ)
					</span>
					<span
						className={`text-xs font-black px-2.5 py-1 rounded-full inline-block mt-0.5 uppercase ${
							praResult.overallRisk === "low"
								? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-300/50"
								: praResult.overallRisk === "moderate"
									? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-300/50"
									: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-300/50"
						}`}
					>
						{praResult.overallRisk === "low"
							? "Низкий"
							: praResult.overallRisk === "moderate"
								? "Средний"
								: "Высокий"}
					</span>
				</div>
			</div>

			{/* Suppuration Alert Banner if Active Phase Detected */}
			{summary.sitesWithSuppurationCount > 0 && (
				<div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center justify-between gap-3 text-xs text-rose-800 dark:text-rose-200">
					<div className="flex items-center gap-3">
						<Droplet className="w-6 h-6 text-rose-600 dark:text-rose-400 shrink-0" />
						<div>
							<strong className="text-sm">Внимание: активная фаза пародонтита (гноетечение)!</strong>
							<p className="text-xs opacity-90 mt-0.5">
								Обнаружено {summary.sitesWithSuppurationCount} участков с гнойным экссудатом (Suppuration). Показан антибактериальный кюретаж и медикаментозная обработка.
							</p>
						</div>
					</div>
					<span className="px-3 py-1 bg-rose-600 text-white rounded-lg font-black text-xs shrink-0 uppercase shadow-xs">
						SUP: {summary.sitesWithSuppurationCount}
					</span>
				</div>
			)}

			{/* PSR / CPITN Sextants Widget */}
			<div className="bg-slate-50/80 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60">
				<div className="flex items-center justify-between mb-2">
					<span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
						<Info className="w-4 h-4 text-teal-600 dark:text-teal-400" />
						<span>Скрининг пародонта PSR / CPITN по 6 секстантам (ВОЗ)</span>
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
								className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-center"
							>
								<div className="text-xs font-semibold text-slate-500 dark:text-slate-400">{labels[sKey]}</div>
								<div className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center justify-center gap-1 mt-0.5">
									{sextant ? `Код ${sextant.code}` : "—"}
									{sextant?.asterisk && (
										<span
											className="text-rose-500 font-black text-lg leading-none"
											title="Патологическая подвижность / поражение фуркации"
										>
											*
										</span>
									)}
								</div>
							</div>
						);
					})}
				</div>
			</div>

			{/* Main Content Area based on View Mode */}
			{viewMode === "pra" ? (
				/* PRA Spider / Radar Risk Assessment Tab */
				<div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-4">
					<div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-700 pb-3">
						<div className="flex items-center gap-2">
							<Radar className="w-6 h-6 text-teal-600 dark:text-teal-400" />
							<div>
								<h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
									Диаграмма оценки пародонтального риска (PRA Spider Diagram по Lang & Tonetti / ВОЗ)
								</h4>
								<p className="text-xs text-slate-500 dark:text-slate-400">
									Анализ 6 ключевых векторов риска рецидива пародонтита и потери зубов
								</p>
							</div>
						</div>

						<span
							className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider ${
								praResult.overallRisk === "low"
									? "bg-emerald-500 text-white shadow-xs"
									: praResult.overallRisk === "moderate"
										? "bg-amber-500 text-white shadow-xs"
										: "bg-rose-600 text-white shadow-xs"
							}`}
						>
							{praResult.overallRiskLabelRu}
						</span>
					</div>

					{/* PRA Controls: Patient Age, Smoking, Diabetes, Bone Loss */}
					<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
						{/* Patient Age */}
						<div className="space-y-1">
							<label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
								<User className="w-3.5 h-3.5 text-teal-600" />
								<span>Возраст пациента:</span>
							</label>
							<input
								type="number"
								min={18}
								max={100}
								value={patientAge}
								onChange={(e) => setPatientAge(Math.max(18, Number(e.target.value) || 18))}
								className="min-h-[44px] w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 text-xs font-bold text-slate-900 dark:text-slate-100"
							/>
						</div>

						{/* Smoking Status */}
						<div className="space-y-1">
							<label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
								<Cigarette className="w-3.5 h-3.5 text-amber-500" />
								<span>Табакокурение:</span>
							</label>
							<select
								value={smokingStatus}
								onChange={(e) => setSmokingStatus(e.target.value as SmokingStatus)}
								className="min-h-[44px] w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 text-xs font-bold text-slate-900 dark:text-slate-100"
							>
								<option value="non_smoker">Не курит (Low)</option>
								<option value="light">Умеренно ≤ 10 сигарет/день (Moderate)</option>
								<option value="heavy">Тяжелое &gt; 10 сигарет/день (High)</option>
							</select>
						</div>

						{/* Diabetes Status */}
						<div className="space-y-1">
							<label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
								<HeartPulse className="w-3.5 h-3.5 text-rose-500" />
								<span>Сахарный диабет (HbA1c):</span>
							</label>
							<select
								value={diabetesStatus}
								onChange={(e) => setDiabetesStatus(e.target.value as DiabetesStatus)}
								className="min-h-[44px] w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 text-xs font-bold text-slate-900 dark:text-slate-100"
							>
								<option value="none">Нет / Норма (HbA1c &lt; 6.0%)</option>
								<option value="controlled">Компенсирован (HbA1c 6.0-7.0%)</option>
								<option value="uncontrolled">Декомпенсирован (HbA1c &gt; 7.0%)</option>
							</select>
						</div>

						{/* Bone Loss % */}
						<div className="space-y-1">
							<label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
								<Activity className="w-3.5 h-3.5 text-indigo-500" />
								<span>Костная резорбция (%):</span>
							</label>
							<input
								type="number"
								min={0}
								max={95}
								value={estimatedBoneLoss}
								onChange={(e) => setCustomBoneLossPercent(Number(e.target.value) || 0)}
								className="min-h-[44px] w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 text-xs font-bold text-slate-900 dark:text-slate-100"
							/>
						</div>
					</div>

					{/* SVG Radar Chart & Vectors Breakdown Grid */}
					<div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
						{/* Left: SVG Spider Chart */}
						<div className="md:col-span-5 flex flex-col items-center justify-center p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
							<svg viewBox="0 0 300 300" className="perio-radar-svg">
								{/* Risk Zone Concentric Hexagons */}
								{/* High Risk Outer Zone (Red) */}
								<polygon
									points="150,35 250,92 250,208 150,265 50,208 50,92"
									className="perio-radar-ring-high"
								/>
								{/* Moderate Risk Middle Zone (Amber) */}
								<polygon
									points="150,75 215,112 215,188 150,225 85,188 85,112"
									className="perio-radar-ring-moderate"
								/>
								{/* Low Risk Inner Zone (Green) */}
								<polygon
									points="150,115 180,132 180,168 150,185 120,168 120,132"
									className="perio-radar-ring-low"
								/>

								{/* 6 Axis Radial Lines */}
								<line x1="150" y1="150" x2="150" y2="35" className="perio-radar-axis-line" />
								<line x1="150" y1="150" x2="250" y2="92" className="perio-radar-axis-line" />
								<line x1="150" y1="150" x2="250" y2="208" className="perio-radar-axis-line" />
								<line x1="150" y1="150" x2="150" y2="265" className="perio-radar-axis-line" />
								<line x1="150" y1="150" x2="50" y2="208" className="perio-radar-axis-line" />
								<line x1="150" y1="150" x2="50" y2="92" className="perio-radar-axis-line" />

								{/* Patient Risk Polygon */}
								<polygon
									points={praResult.radarPolygonPoints}
									className={`perio-radar-polygon ${
										praResult.overallRisk === "high"
											? "high-risk"
											: praResult.overallRisk === "moderate"
												? "moderate-risk"
												: ""
									}`}
								/>

								{/* Point Markers on Vertices */}
								{praResult.radarPolygonCoordinates.map((c, i) => (
									<circle
										key={i}
										cx={c.x}
										cy={c.y}
										className={`perio-radar-point ${
											praResult.overallRisk === "high"
												? "high-risk"
												: praResult.overallRisk === "moderate"
													? "moderate-risk"
													: ""
										}`}
									/>
								))}

								{/* Vector Axis Labels */}
								<text x="150" y="24" textAnchor="middle" className="text-[12px] font-bold fill-slate-700 dark:fill-slate-300">
									BOP %
								</text>
								<text x="260" y="88" textAnchor="start" className="text-[12px] font-bold fill-slate-700 dark:fill-slate-300">
									PPD ≥ 5мм
								</text>
								<text x="260" y="215" textAnchor="start" className="text-[12px] font-bold fill-slate-700 dark:fill-slate-300">
									Потеря зубов
								</text>
								<text x="150" y="284" textAnchor="middle" className="text-[12px] font-bold fill-slate-700 dark:fill-slate-300">
									BL / Возраст
								</text>
								<text x="40" y="215" textAnchor="end" className="text-[12px] font-bold fill-slate-700 dark:fill-slate-300">
									Диабет
								</text>
								<text x="40" y="88" textAnchor="end" className="text-[12px] font-bold fill-slate-700 dark:fill-slate-300">
									Курение
								</text>
							</svg>

							<div className="flex items-center gap-3 text-xs font-bold mt-2">
								<span className="flex items-center gap-1 text-emerald-600">
									<span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
									Низкий
								</span>
								<span className="flex items-center gap-1 text-amber-600">
									<span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
									Средний
								</span>
								<span className="flex items-center gap-1 text-rose-600">
									<span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
									Высокий
								</span>
							</div>
						</div>

						{/* Right: Vectors Table & Breakdown */}
						<div className="md:col-span-7 space-y-2">
							{Object.entries(praResult.vectors).map(([key, v]) => (
								<div
									key={key}
									className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 shadow-2xs"
								>
									<div>
										<div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
											<span>{v.nameRu}</span>
											<span className="text-xs font-bold text-teal-700 dark:text-teal-300">
												[{v.valueDisplay}]
											</span>
										</div>
										<div className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
											{v.thresholdDescriptionRu}
										</div>
									</div>

									<span
										className={`px-3 py-1 rounded-md text-xs font-black uppercase ${
											v.riskLevel === "low"
												? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-300/40"
												: v.riskLevel === "moderate"
													? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-300/40"
													: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-300/40"
										}`}
									>
										{v.riskLevel === "low"
											? "Низкий"
											: v.riskLevel === "moderate"
												? "Средний"
												: "Высокий"}
									</span>
								</div>
							))}
						</div>
					</div>
				</div>
			) : (
				<>
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
					<div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
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
									className={`relative flex-shrink-0 min-w-[52px] min-h-[58px] py-2 px-2.5 rounded-xl border text-center transition-all cursor-pointer select-none ${
										t.toothNumber === activeToothNumber
											? "border-teal-500 ring-2 ring-teal-500/50 bg-teal-500/15 shadow-sm"
											: t.isMissing
												? "border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/40 opacity-40"
												: "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-400"
									}`}
								>
									<div className="text-sm font-black text-slate-800 dark:text-slate-200 font-mono">
										#{t.toothNumber}
									</div>
									<div
										className={`text-xs font-black ${
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

					{/* Detail Mode vs Full Matrix Mode */}
					{viewMode === "detail" ? (
						<div className="space-y-4">
							<PerioToothDetailCard
								tooth={currentTooth}
								activeSiteKey={activeSiteKey}
								onSiteSelect={setActiveSiteKey}
								onUpdateTooth={(updater) => updateToothField(currentTooth.toothNumber, updater)}
							/>

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
				</>
			)}

			{/* Clinical Notes & Diagnostic Summary */}
			<div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
				<label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
					Клиническое заключение и план пародонтологической терапии:
				</label>
				<textarea
					rows={2}
					value={chartNotes}
					onChange={(e) => setChartNotes(e.target.value)}
					placeholder="Например: Генерализованный пародонтит III ст., стадия B. Показан SRP (Scaling & Root Planing), вектор-терапия, повторный ре-осмотр через 6 недель."
					className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-medium text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-teal-500 outline-none"
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
								<span className="px-2.5 py-0.5 rounded text-xs font-black bg-teal-600/15 text-teal-700 dark:text-teal-300 border border-teal-500/30">
									{diagnosis.icd10Code}
								</span>
							</h4>
							<p className="text-xs text-slate-500 dark:text-slate-400">
								Автоматический расчёт индексов PSR, BOP, CAL, диагноз по МКБ-10 / AAP 2018 и профиль риска PRA
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={handleCopyProtocol}
							className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors shadow-2xs cursor-pointer active:scale-95"
							title="Скопировать протокол в буфер обмена для вставки в карту 043/у"
						>
							{copiedProtocol ? (
								<>
									<Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
									<span className="text-emerald-700 dark:text-emerald-300 font-black">Скопировано!</span>
								</>
							) : (
								<>
									<Copy className="w-4 h-4 text-slate-600 dark:text-slate-300" />
									<span>Скопировать в дневник 043/у</span>
								</>
							)}
						</button>

						{onInsertToProtocol && (
							<button
								type="button"
								onClick={handleInsertProtocol}
								className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black bg-teal-600 hover:bg-teal-700 text-white transition-colors shadow-2xs cursor-pointer active:scale-95"
								title="Вставить протокол напрямую в активный дневник приёма"
							>
								<CheckCircle2 className="w-4 h-4" />
								<span>Вставить в дневник приёма</span>
							</button>
						)}
					</div>
				</div>

				{/* Live Protocol Textarea Preview */}
				<div className="relative">
					<textarea
						readOnly
						rows={8}
						value={protocol043Text}
						className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 text-xs font-mono text-slate-800 dark:text-slate-200 leading-relaxed resize-y focus:outline-none select-all"
						aria-label="Текст клинического протокола пародонтологического обследования для формы 043/у"
					/>
				</div>
			</div>
		</div>
	);
}
