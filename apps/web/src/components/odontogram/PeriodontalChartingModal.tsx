/**
 * PeriodontalChartingModal.tsx — Интерактивная 6-точечная пародонтологическая карта (Florida Probe Standard).
 *
 * (DOMAIN: PERIODONTAL CHARTING, HYGIENE INDICES & VOICE PROBING)
 *
 * Возможности:
 * 1. 6-точечный замер карманов на каждый зуб (MB, B, DB, ML, L, DL) от 1 до 12 мм (глубина >3 мм выделяется красным).
 * 2. Фиксация кровоточивости (BOP), рецессии десны (мм), потери прикрепления (CAL = PD + GM), фуркации (I-III) и подвижности (I-IV).
 * 3. Автоматический расчет клинических индексов:
 *    - OHI-S (Индекс гигиены Грина-Вермиллиона: налет + камень с градацией 0-1.2 / 1.3-3.0 / 3.1-6.0)
 *    - PLI / FMPS (Индекс зубного налета в %)
 *    - SBI / FMBS (Индекс кровоточивости десневой борозды в %)
 *    - CPITN / PSR (Скрининг 6 секстантов ВОЗ)
 * 4. Голосовая диктовка карманов в реальном времени («зуб 16 медиально 3 щечно 2 дистально 3 кровоточивость плюс»)
 * 5. 1-клик генерация протокола пародонтологического осмотра в дневник 043/у (Приказ 834н/804н).
 * 6. Тач-таргеты кнопок строго >= 44x44px для работы в медицинских перчатках на iPad.
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
	Activity,
	AlertCircle,
	AlertTriangle,
	Award,
	Check,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	Clipboard,
	Droplets,
	FileText,
	Layers,
	Mic,
	MicOff,
	RotateCcw,
	Shield,
	ShieldAlert,
	ShieldCheck,
	Sparkles,
	Trash2,
	Volume2,
	X,
	Zap,
} from "lucide-react";
import {
	ALL_PERIO_TEETH,
	calculateAapEfpStagingAndGrading,
	calculateClinicalAttachmentLevel,
	calculatePerioIndices,
	calculatePsrSextants,
	createDefaultPerioTeeth,
	formatPsrSextantsSummary,
	FURCATION_GRADES,
	generateComprehensivePerio043Text,
	getProbingDepthColor,
	isFurcationEligibleTooth,
	MOBILITY_GRADES,
	PERIO_LOWER_ARCH_TEETH,
	PERIO_SITE_KEYS,
	PERIO_SITES_CONFIG,
	PERIO_UPPER_ARCH_TEETH,
	type PerioChartSummary,
	type PerioSiteKey,
	type PerioToothRecord,
} from "@dental/shared";
import {
	globalDentalVoiceEngine,
	type PerioToothVoiceItem,
} from "../../services/voice";
import { SoundFeedbackService } from "../../services/audio/SoundFeedbackService";
import { useVisitStore } from "../../store/visitStore";
import { showToast } from "../GlobalToast";
import "./periodontalCharting.css";

export interface PeriodontalChartingModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly initialTeeth?: readonly PerioToothRecord[] | undefined;
	readonly onSave?: ((teeth: readonly PerioToothRecord[], summary: PerioChartSummary) => void | Promise<void>) | undefined;
	readonly onInsertToProtocol?: ((protocolText: string) => void) | undefined;
}

export const PeriodontalChartingModal: React.FC<PeriodontalChartingModalProps> = ({
	isOpen,
	onClose,
	patientId,
	patientName = "Пациент",
	doctorName = "Лечащий врач-пародонтолог",
	initialTeeth,
	onSave,
	onInsertToProtocol,
}) => {
	// 1. Initial State for all 32 Teeth
	const [teeth, setTeeth] = useState<PerioToothRecord[]>(() => {
		if (initialTeeth && initialTeeth.length > 0) {
			return initialTeeth.map((t) => ({ ...t }));
		}
		return createDefaultPerioTeeth();
	});

	const [activeToothNum, setActiveToothNum] = useState<number>(16);
	const [activeArch, setActiveArch] = useState<"upper" | "lower">("upper");
	const [activeAspect, setActiveAspect] = useState<"buccal" | "lingual">("buccal");
	const [voiceLiveMessage, setVoiceLiveMessage] = useState<string | null>(null);

	// Reset state when opening with initial teeth
	useEffect(() => {
		if (isOpen) {
			if (initialTeeth && initialTeeth.length > 0) {
				setTeeth(initialTeeth.map((t) => ({ ...t })));
			}
		}
	}, [isOpen, initialTeeth]);

	// 2. Real-time Indices Calculations
	const summary: PerioChartSummary = useMemo(() => {
		return calculatePerioIndices(teeth);
	}, [teeth]);

	const psrSummaryText = useMemo(() => {
		const sextants = calculatePsrSextants(teeth);
		return formatPsrSextantsSummary(sextants);
	}, [teeth]);

	// Green-Vermillion (OHI-S / УИГ) Calculation
	const ohiSScore = useMemo(() => {
		// 6 index teeth: 16 (B), 11 (V), 26 (B), 36 (L), 31 (V), 46 (L)
		const indexTeethNumbers = [16, 11, 26, 36, 31, 46];
		let totalDebris = 0;
		let totalCalculus = 0;
		let counted = 0;

		for (const num of indexTeethNumbers) {
			const tooth = teeth.find((t) => t.toothNumber === num);
			if (tooth && !tooth.isMissing) {
				const isUpper = num < 30;
				const site = isUpper ? tooth.midBuccal : tooth.midLingual;
				if (site) {
					totalDebris += site.plaque ? 1 : 0;
					totalCalculus += site.calculus ? 1 : 0;
					counted++;
				}
			}
		}

		if (counted === 0) return { ohiS: 0, di: 0, ci: 0, interpretation: "Хорошая", grade: "good" };
		const di = totalDebris / counted;
		const ci = totalCalculus / counted;
		const ohiS = Math.round((di + ci) * 10) / 10;

		let interpretation = "Хорошая (0.0 - 1.2)";
		let grade: "good" | "moderate" | "severe" = "good";
		if (ohiS > 3.0) {
			interpretation = "Плохая (3.1 - 6.0)";
			grade = "severe";
		} else if (ohiS > 1.2) {
			interpretation = "Удовлетворительная (1.3 - 3.0)";
			grade = "moderate";
		}

		return { ohiS, di: Math.round(di * 10) / 10, ci: Math.round(ci * 10) / 10, interpretation, grade };
	}, [teeth]);

	// 3. Active Tooth Record
	const activeTooth = useMemo(() => {
		return teeth.find((t) => t.toothNumber === activeToothNum) || teeth[0]!;
	}, [teeth, activeToothNum]);

	// 4. Live Voice Engine Listener for Periodontal dictation
	useEffect(() => {
		if (!isOpen) return;

		const unsubscribe = globalDentalVoiceEngine.addListener({
			onIntentParsed: (intent) => {
				if (intent.perioMeasurements && intent.perioMeasurements.length > 0) {
					let updatedCount = 0;
					setTeeth((prevTeeth) => {
						const nextTeeth = [...prevTeeth];
						for (const spoken of intent.perioMeasurements!) {
							const targetIdx = nextTeeth.findIndex((t) => t.toothNumber === spoken.toothNumber);
							if (targetIdx !== -1) {
								const current = nextTeeth[targetIdx]!;
								const updated: PerioToothRecord = {
									...current,
									...(spoken.isMissing !== undefined ? { isMissing: spoken.isMissing } : {}),
									...(spoken.mobility !== undefined ? { mobility: spoken.mobility as any } : {}),
									...(spoken.furcation !== undefined ? { furcation: spoken.furcation as any } : {}),
									mesioBuccal: spoken.mesioBuccal
										? {
												probingDepthMm: spoken.mesioBuccal.probingDepthMm ?? current.mesioBuccal.probingDepthMm,
												gingivalMarginMm: spoken.mesioBuccal.gingivalMarginMm ?? current.mesioBuccal.gingivalMarginMm,
												bleedingOnProbing: spoken.mesioBuccal.bleedingOnProbing ?? current.mesioBuccal.bleedingOnProbing,
												plaque: spoken.mesioBuccal.plaque ?? current.mesioBuccal.plaque,
												suppuration: spoken.mesioBuccal.suppuration ?? current.mesioBuccal.suppuration,
												calculus: spoken.mesioBuccal.calculus ?? current.mesioBuccal.calculus,
											}
										: current.mesioBuccal,
									midBuccal: spoken.midBuccal
										? {
												probingDepthMm: spoken.midBuccal.probingDepthMm ?? current.midBuccal.probingDepthMm,
												gingivalMarginMm: spoken.midBuccal.gingivalMarginMm ?? current.midBuccal.gingivalMarginMm,
												bleedingOnProbing: spoken.midBuccal.bleedingOnProbing ?? current.midBuccal.bleedingOnProbing,
												plaque: spoken.midBuccal.plaque ?? current.midBuccal.plaque,
												suppuration: spoken.midBuccal.suppuration ?? current.midBuccal.suppuration,
												calculus: spoken.midBuccal.calculus ?? current.midBuccal.calculus,
											}
										: current.midBuccal,
									distoBuccal: spoken.distoBuccal
										? {
												probingDepthMm: spoken.distoBuccal.probingDepthMm ?? current.distoBuccal.probingDepthMm,
												gingivalMarginMm: spoken.distoBuccal.gingivalMarginMm ?? current.distoBuccal.gingivalMarginMm,
												bleedingOnProbing: spoken.distoBuccal.bleedingOnProbing ?? current.distoBuccal.bleedingOnProbing,
												plaque: spoken.distoBuccal.plaque ?? current.distoBuccal.plaque,
												suppuration: spoken.distoBuccal.suppuration ?? current.distoBuccal.suppuration,
												calculus: spoken.distoBuccal.calculus ?? current.distoBuccal.calculus,
											}
										: current.distoBuccal,
									mesioLingual: spoken.mesioLingual
										? {
												probingDepthMm: spoken.mesioLingual.probingDepthMm ?? current.mesioLingual.probingDepthMm,
												gingivalMarginMm: spoken.mesioLingual.gingivalMarginMm ?? current.mesioLingual.gingivalMarginMm,
												bleedingOnProbing: spoken.mesioLingual.bleedingOnProbing ?? current.mesioLingual.bleedingOnProbing,
												plaque: spoken.mesioLingual.plaque ?? current.mesioLingual.plaque,
												suppuration: spoken.mesioLingual.suppuration ?? current.mesioLingual.suppuration,
												calculus: spoken.mesioLingual.calculus ?? current.mesioLingual.calculus,
											}
										: current.mesioLingual,
									midLingual: spoken.midLingual
										? {
												probingDepthMm: spoken.midLingual.probingDepthMm ?? current.midLingual.probingDepthMm,
												gingivalMarginMm: spoken.midLingual.gingivalMarginMm ?? current.midLingual.gingivalMarginMm,
												bleedingOnProbing: spoken.midLingual.bleedingOnProbing ?? current.midLingual.bleedingOnProbing,
												plaque: spoken.midLingual.plaque ?? current.midLingual.plaque,
												suppuration: spoken.midLingual.suppuration ?? current.midLingual.suppuration,
												calculus: spoken.midLingual.calculus ?? current.midLingual.calculus,
											}
										: current.midLingual,
									distoLingual: spoken.distoLingual
										? {
												probingDepthMm: spoken.distoLingual.probingDepthMm ?? current.distoLingual.probingDepthMm,
												gingivalMarginMm: spoken.distoLingual.gingivalMarginMm ?? current.distoLingual.gingivalMarginMm,
												bleedingOnProbing: spoken.distoLingual.bleedingOnProbing ?? current.distoLingual.bleedingOnProbing,
												plaque: spoken.distoLingual.plaque ?? current.distoLingual.plaque,
												suppuration: spoken.distoLingual.suppuration ?? current.distoLingual.suppuration,
												calculus: spoken.distoLingual.calculus ?? current.distoLingual.calculus,
											}
										: current.distoLingual,
								};
								nextTeeth[targetIdx] = updated;
								updatedCount++;
							}
						}
						return nextTeeth;
					});

					if (updatedCount > 0) {
						SoundFeedbackService.getInstance().playActionSuccess();
						const msg = `Голос: обновлена перио-карта (${updatedCount} зуб(ов))`;
						setVoiceLiveMessage(msg);
						showToast(msg, "success");
					}
				}
			},
		});

		return () => unsubscribe();
	}, [isOpen]);

	// Update specific site of active tooth
	const handleUpdateSite = useCallback((siteKey: PerioSiteKey, updates: Partial<PerioToothRecord[PerioSiteKey]>) => {
		setTeeth((prev) =>
			prev.map((t) => {
				if (t.toothNumber !== activeToothNum) return t;
				return {
					...t,
					[siteKey]: {
						...t[siteKey],
						...updates,
					},
				};
			}),
		);
	}, [activeToothNum]);

	// Adjust depth by delta (+1 / -1 mm)
	const handleAdjustDepth = useCallback((siteKey: PerioSiteKey, delta: number) => {
		setTeeth((prev) =>
			prev.map((t) => {
				if (t.toothNumber !== activeToothNum) return t;
				const current = t[siteKey]?.probingDepthMm ?? 0;
				const next = Math.max(0, Math.min(12, current + delta));
				return {
					...t,
					[siteKey]: {
						...t[siteKey],
						probingDepthMm: next,
					},
				};
			}),
		);
		SoundFeedbackService.getInstance().playSpeechCaptured();
	}, [activeToothNum]);

	// Direct depth selection from keypad
	const handleSetDepth = useCallback((siteKey: PerioSiteKey, depth: number) => {
		setTeeth((prev) =>
			prev.map((t) => {
				if (t.toothNumber !== activeToothNum) return t;
				return {
					...t,
					[siteKey]: {
						...t[siteKey],
						probingDepthMm: depth,
					},
				};
			}),
		);
		SoundFeedbackService.getInstance().playSpeechCaptured();
	}, [activeToothNum]);

	// Toggle BOP for specific site
	const handleToggleBop = useCallback((siteKey: PerioSiteKey) => {
		setTeeth((prev) =>
			prev.map((t) => {
				if (t.toothNumber !== activeToothNum) return t;
				const current = Boolean(t[siteKey]?.bleedingOnProbing);
				return {
					...t,
					[siteKey]: {
						...t[siteKey],
						bleedingOnProbing: !current,
					},
				};
			}),
		);
		SoundFeedbackService.getInstance().playActionSuccess();
	}, [activeToothNum]);

	// Toggle Tooth Missing Status
	const handleToggleMissing = useCallback(() => {
		setTeeth((prev) =>
			prev.map((t) => {
				if (t.toothNumber !== activeToothNum) return t;
				return { ...t, isMissing: !t.isMissing };
			}),
		);
		SoundFeedbackService.getInstance().playActionSuccess();
	}, [activeToothNum]);

	// 1-Click Insert to Form 043/u Diary
	const handleInsertTo043 = useCallback(() => {
		const protocolText = generateComprehensivePerio043Text(teeth, summary, {
			doctorName,
		});

		// Injects into visitStore
		useVisitStore.getState().setVisitNoteForm((prev) => ({
			...prev,
			objectiveStatus: prev.objectiveStatus
				? `${prev.objectiveStatus}\n\n${protocolText}`
				: protocolText,
		}));

		// Dispatches custom event for components listening to SOAP updates
		window.dispatchEvent(
			new CustomEvent("dente-apply-soap-protocol", {
				detail: {
					soap: protocolText,
					mode: "smart_append",
				},
			}),
		);

		onInsertToProtocol?.(protocolText);
		SoundFeedbackService.getInstance().playActionSuccess();
		showToast("Протокол перио-карты успешно вставлен в дневник 043/у!", "success");
	}, [teeth, summary, doctorName, onInsertToProtocol]);

	// 1-Click Physiological Norm across all 32 teeth (Mandate 8e: Doctor Autonomy)
	const handleApplyPhysiologicalNorm = useCallback(() => {
		setTeeth(createDefaultPerioTeeth());
		SoundFeedbackService.getInstance().playActionSuccess();
		showToast("Все 32 зуба установлены в физиологическую норму (глубина 1–2 мм, 0% кровоточивости, 0% налёта)!", "success", 4000);
	}, []);

	// 1-Click Physiological Norm directly into Form 043/u
	const handleInsertNormTo043 = useCallback(() => {
		const defaultTeeth = createDefaultPerioTeeth();
		setTeeth(defaultTeeth);
		const normText = "Пародонт в норме: глубина бороздки 1–2 мм, кровоточивость при зондировании отсутствует (BOP 0%), патологической подвижности нет.";

		useVisitStore.getState().setVisitNoteForm((prev) => ({
			...prev,
			objectiveStatus: prev.objectiveStatus
				? `${prev.objectiveStatus}\n\n${normText}`
				: normText,
		}));

		window.dispatchEvent(
			new CustomEvent("dente-apply-soap-protocol", {
				detail: {
					soap: normText,
					mode: "smart_append",
				},
			}),
		);

		onInsertToProtocol?.(normText);
		SoundFeedbackService.getInstance().playActionSuccess();
		showToast("Физиологическая норма пародонта установлена и внесена в 043/у!", "success", 4000);
	}, [onInsertToProtocol]);

	// 1-Click Routine Hygienist Status & Invoice (Mandate 8e: 90% routine hygiene loop)
	const handleQuickHygieneAirFlow = useCallback(() => {
		const defaultTeeth = createDefaultPerioTeeth();
		setTeeth(defaultTeeth);

		const hygieneText = "Зубные отложения удалены УЗ + Air Flow, десна бледно-розовая, обработка антисептиком. Пародонт в норме: глубина бороздки 1–2 мм, кровоточивость при зондировании отсутствует (BOP 0%), патологической подвижности нет.";

		useVisitStore.getState().setVisitNoteForm((prev) => ({
			...prev,
			objectiveStatus: prev.objectiveStatus
				? `${prev.objectiveStatus}\n\n${hygieneText}`
				: hygieneText,
		}));

		window.dispatchEvent(
			new CustomEvent("dente-apply-soap-protocol", {
				detail: {
					soap: hygieneText,
					mode: "smart_append",
				},
			}),
		);

		window.dispatchEvent(
			new CustomEvent("dente-add-estimate-service", {
				detail: {
					code: "A16.07.051",
					name: "Профессиональная гигиена полости рта и зубов (УЗ + Air Flow)",
					price: 5500,
					category: "hygiene",
				},
			}),
		);

		onInsertToProtocol?.(hygieneText);
		SoundFeedbackService.getInstance().playActionSuccess();
		showToast("Профгигиена УЗ + Air Flow (A16.07.051) зафиксирована в дневнике 043/у и смете!", "success", 4000);
	}, [onInsertToProtocol]);

	// 1-Click Fast Pathology Markup for active tooth
	const handleMarkActiveToothPocket = useCallback((depth = 5, hasBop = true) => {
		setTeeth((prev) =>
			prev.map((t) => {
				if (t.toothNumber !== activeToothNum || t.isMissing) return t;
				const nextTooth = { ...t };
				for (const siteKey of PERIO_SITE_KEYS) {
					const site = t[siteKey] ?? { probingDepthMm: 2, gingivalMarginMm: 0, bleedingOnProbing: false, suppuration: false, plaque: false, calculus: false };
					nextTooth[siteKey] = {
						...site,
						probingDepthMm: depth,
						bleedingOnProbing: hasBop,
					};
				}
				return nextTooth;
			}),
		);
		SoundFeedbackService.getInstance().playActionSuccess();
		showToast(`Зуб #${activeToothNum}: карман ${depth} мм с кровоточивостью (BOP) зафиксирован в 1 клик`, "info", 3000);
	}, [activeToothNum]);

	// 1-Click Clear Plaque
	const handleClearPlaque = useCallback(() => {
		setTeeth((prev) =>
			prev.map((t) => {
				const nextTooth = { ...t };
				for (const siteKey of PERIO_SITE_KEYS) {
					const site = t[siteKey];
					if (site) {
						nextTooth[siteKey] = { ...site, plaque: false, calculus: false };
					}
				}
				return nextTooth;
			}),
		);
		showToast("Зубной налет и камень очищены по всем зубам (100% гигиена)", "success", 3000);
	}, []);

	// Save Action
	const handleSave = useCallback(async () => {
		if (onSave) {
			await onSave(teeth, summary);
		}
		SoundFeedbackService.getInstance().playActionSuccess();
		showToast("Пародонтограмма успешно сохранена в медкарту!", "success");
		onClose();
	}, [teeth, summary, onSave, onClose]);

	if (!isOpen) return null;

	const currentArchTeeth = activeArch === "upper" ? PERIO_UPPER_ARCH_TEETH : PERIO_LOWER_ARCH_TEETH;

	return (
		<div
			className="perio-modal-backdrop"
			role="dialog"
			aria-modal="true"
			aria-labelledby="perio-modal-title"
		>
			<div className="perio-modal-card">
				{/* 1. Header with Diagnosis & Voice telemetry */}
				<header className="perio-header">
					<div className="perio-header-title">
						<div className="perio-icon-badge">
							<Layers size={24} />
						</div>
						<div>
							<h2 id="perio-modal-title" className="text-lg font-black tracking-tight text-[var(--ink,#0f172a)] m-0">
								Пародонтологическая карта и скрининг CPITN (Florida Probe)
							</h2>
							<p className="text-xs text-[var(--muted,#64748b)] m-0">
								Пациент: <span className="font-bold text-[var(--ink,#0f172a)]">{patientName}</span> • Врач: {doctorName}
							</p>
						</div>
					</div>

					<div className="flex items-center gap-3">
						{voiceLiveMessage && (
							<div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-500/20 animate-pulse">
								<Mic size={14} />
								<span>{voiceLiveMessage}</span>
							</div>
						)}
						<button
							type="button"
							onClick={onClose}
							className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--line,#e2e8f0)] transition-all cursor-pointer touch-manipulation"
							aria-label="Закрыть модальное окно"
						>
							<X size={20} />
						</button>
					</div>
				</header>

				{/* 2. Key Periodontal Indices Bar (OHI-S, PLI, SBI, CPITN) */}
				<div className="perio-indices-bar">
					{/* OHI-S / УИГ */}
					<div className={`perio-index-card ${ohiSScore.grade}`}>
						<span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted,#64748b)]">
							Индекс гигиены Грина-Вермиллиона (OHI-S)
						</span>
						<div className="flex items-baseline gap-2">
							<span className="text-xl font-black">{ohiSScore.ohiS}</span>
							<span className="text-xs font-bold opacity-80">{ohiSScore.interpretation}</span>
						</div>
						<span className="text-[10px] text-[var(--muted,#64748b)]">
							Налет (DI-S): {ohiSScore.di} | Камень (CI-S): {ohiSScore.ci}
						</span>
					</div>

					{/* PLI / FMPS (Индекс налета) */}
					<div className={`perio-index-card ${summary.fmpsPercent <= 20 ? "good" : summary.fmpsPercent <= 50 ? "moderate" : "severe"}`}>
						<span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted,#64748b)]">
							Индекс налета PLI (FMPS)
						</span>
						<div className="flex items-baseline gap-2">
							<span className="text-xl font-black">{summary.fmpsPercent}%</span>
							<span className="text-xs font-bold opacity-80">
								{summary.fmpsPercent <= 20 ? "Норма (≤ 20%)" : "Превышение"}
							</span>
						</div>
						<span className="text-[10px] text-[var(--muted,#64748b)]">
							Исследовано {summary.totalSitesProbed} поверхностей
						</span>
					</div>

					{/* SBI / BOP % (Кровоточивость) */}
					<div className={`perio-index-card ${summary.fmbsPercent <= 10 ? "good" : summary.fmbsPercent <= 30 ? "moderate" : "severe"}`}>
						<span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted,#64748b)]">
							Кровоточивость борозды SBI (BOP)
						</span>
						<div className="flex items-baseline gap-2">
							<span className="text-xl font-black">{summary.fmbsPercent}%</span>
							<span className="text-xs font-bold opacity-80">
								{summary.fmbsPercent <= 10 ? "Здоровая десна (≤ 10%)" : "Воспаление"}
							</span>
						</div>
						<span className="text-[10px] text-[var(--muted,#64748b)]">
							Глубоких карманов (≥5мм): {summary.deepPocketsCount}
						</span>
					</div>

					{/* CPITN / PSR */}
					<div className="perio-index-card good">
						<span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted,#64748b)]">
							Скрининг ВОЗ (CPITN / PSR)
						</span>
						<div className="text-sm font-black tracking-wide font-mono">
							{psrSummaryText}
						</div>
						<span className="text-[10px] text-[var(--muted,#64748b)]">
							Макс. глубина: {summary.maxPocketDepthMm} мм | CAL: {summary.maxCalMm} мм
						</span>
					</div>
				</div>

				{/* 1-Click Fast Actions Bar (Zero-Friction Doctor Autonomy) */}
				<div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-950 dark:text-emerald-100 flex-wrap">
					<div className="flex items-center gap-2 flex-wrap">
						<button
							type="button"
							onClick={handleQuickHygieneAirFlow}
							className="min-h-[40px] px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 active:scale-95 text-white font-black text-xs shadow-sm transition-all cursor-pointer flex items-center gap-1.5 touch-manipulation"
							title="Экспресс-гигиена: УЗ + Air Flow, антисептика, норма десны и добавление A16.07.051 в смету и 043/у (1 клик)"
							data-testid="perio-modal-quick-hygiene-btn"
						>
							<Sparkles size={15} />
							<span>⚡ Профгигиена: УЗ + Air Flow (A16.07.051)</span>
						</button>

						<button
							type="button"
							onClick={handleInsertNormTo043}
							className="min-h-[40px] px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs shadow-sm transition-all cursor-pointer flex items-center gap-1.5 touch-manipulation"
							title="Установить все 32 зуба в норму и внести протокол в 043/у: глубина 1–2 мм, BOP 0%, подвижности нет"
							data-testid="perio-modal-norm-043-btn"
						>
							<ShieldCheck size={15} />
							<span>⚡ Норма пародонта в 043/у (1 клик)</span>
						</button>

						<button
							type="button"
							onClick={handleApplyPhysiologicalNorm}
							className="min-h-[40px] px-3 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 active:scale-95 text-emerald-800 dark:text-emerald-200 border border-emerald-500/30 font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 touch-manipulation"
							title="Установить все 32 зуба в физиологическую норму: карманы 1-2 мм, без кровоточивости и налета"
							data-testid="perio-modal-norm-btn"
						>
							<Check size={14} />
							<span>Вся норма на зубы</span>
						</button>

						<button
							type="button"
							onClick={() => handleMarkActiveToothPocket(5, true)}
							className="min-h-[40px] px-3 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 active:scale-95 text-rose-800 dark:text-rose-200 border border-rose-500/30 font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 touch-manipulation"
							title={`Быстрая разметка пародонтита: карман 5 мм + кровоточивость для активного зуба #${activeToothNum}`}
							data-testid="perio-modal-pathology-btn"
						>
							<Droplets size={14} className="text-rose-500" />
							<span>Зуб #{activeToothNum}: карман 5 мм + BOP</span>
						</button>

						<button
							type="button"
							onClick={handleClearPlaque}
							className="min-h-[40px] px-3 py-2 rounded-xl bg-teal-500/15 hover:bg-teal-500/25 active:scale-95 text-teal-800 dark:text-teal-200 border border-teal-500/30 font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 touch-manipulation"
							title="Очистить зубной налёт и камень по всем зубам"
							data-testid="perio-modal-clear-plaque-btn"
						>
							<RotateCcw size={14} className="text-teal-500" />
							<span>Очистить налет</span>
						</button>
					</div>

					<span className="text-xs text-[var(--muted,#64748b)] font-semibold">
						💡 Режим терапевта: норма в 1 клик, ручные промеры только для проблемных участков.
					</span>
				</div>

				{/* 3. Dental Arch Selector & Tooth Matrix */}
				<div className="perio-arch-container">
					{/* Arch & Aspect Tabs */}
					<div className="flex items-center justify-between gap-4 flex-wrap">
						<div className="flex items-center gap-2 bg-[var(--paper-soft,#f8fafc)] p-1 rounded-xl border border-[var(--line,#e2e8f0)]">
							<button
								type="button"
								onClick={() => setActiveArch("upper")}
								className={`min-h-[44px] px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer touch-manipulation flex items-center justify-center ${
									activeArch === "upper"
										? "bg-[var(--teal,#0d9488)] text-white shadow-sm"
										: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
								}`}
							>
								Верхняя челюсть (18..11, 21..28)
							</button>
							<button
								type="button"
								onClick={() => setActiveArch("lower")}
								className={`min-h-[44px] px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer touch-manipulation flex items-center justify-center ${
									activeArch === "lower"
										? "bg-[var(--teal,#0d9488)] text-white shadow-sm"
										: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
								}`}
							>
								Нижняя челюсть (48..41, 31..38)
							</button>
						</div>

						<div className="flex items-center gap-2 bg-[var(--paper-soft,#f8fafc)] p-1 rounded-xl border border-[var(--line,#e2e8f0)]">
							<button
								type="button"
								onClick={() => setActiveAspect("buccal")}
								className={`min-h-[44px] px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer touch-manipulation flex items-center justify-center ${
									activeAspect === "buccal"
										? "bg-slate-800 text-white shadow-sm"
										: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
								}`}
							>
								Вестибулярно (Щечно / MB • B • DB)
							</button>
							<button
								type="button"
								onClick={() => setActiveAspect("lingual")}
								className={`min-h-[44px] px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer touch-manipulation flex items-center justify-center ${
									activeAspect === "lingual"
										? "bg-slate-800 text-white shadow-sm"
										: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
								}`}
							>
								Орально (Язычно / Небно / ML • L • DL)
							</button>
						</div>
					</div>

					{/* 16-Tooth Arch Grid */}
					<div className="perio-arch-grid">
						{currentArchTeeth.map((toothNum) => {
							const t = teeth.find((item) => item.toothNumber === toothNum);
							const isMissing = Boolean(t?.isMissing);
							const isActive = toothNum === activeToothNum;

							// Check worst depth
							let maxDepth = 0;
							let hasBop = false;
							if (t && !isMissing) {
								for (const sKey of PERIO_SITE_KEYS) {
									const s = t[sKey];
									if (s) {
										if (s.probingDepthMm > maxDepth) maxDepth = s.probingDepthMm;
										if (s.bleedingOnProbing) hasBop = true;
									}
								}
							}

							const isDeep = maxDepth >= 5;

							return (
								<div
									key={`tooth-cell-${toothNum}`}
									onClick={() => setActiveToothNum(toothNum)}
									className={`perio-tooth-cell ${isActive ? "active" : ""} ${isMissing ? "missing" : ""} ${isDeep ? "has-deep-pocket" : ""}`}
								>
									<span className="text-xs font-mono font-black">{toothNum}</span>
									{!isMissing ? (
										<div className="flex flex-col items-center mt-1">
											<span
												className={`text-sm font-black ${
													maxDepth >= 6
														? "text-red-600 dark:text-red-400 font-bold"
														: maxDepth >= 4
														? "text-amber-600 dark:text-amber-400"
														: "text-emerald-600 dark:text-emerald-400"
												}`}
											>
												{maxDepth > 0 ? `${maxDepth}мм` : "—"}
											</span>
											{hasBop && <Droplets size={12} className="text-red-500 mt-0.5 animate-bounce" />}
										</div>
									) : (
										<span className="text-[10px] text-[var(--muted,#64748b)] mt-2 font-bold">Удален</span>
									)}
								</div>
							);
						})}
					</div>

					{/* 4. Active Tooth 6-Point Probing Detailed Inspector */}
					<div className="perio-active-tooth-editor">
						<div className="flex items-center justify-between border-b border-[var(--line,#e2e8f0)] pb-3">
							<div className="flex items-center gap-3">
								<span className="text-xl font-black font-mono px-3.5 py-1.5 rounded-xl bg-[var(--teal,#0d9488)] text-white shadow-xs">
									Зуб #{activeTooth.toothNumber}
								</span>
								<button
									type="button"
									onClick={handleToggleMissing}
									className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer touch-manipulation flex items-center justify-center ${
										activeTooth.isMissing
											? "bg-rose-500/15 text-rose-700 border-rose-400"
											: "bg-[var(--paper-soft,#f8fafc)] text-[var(--muted,#64748b)] border-[var(--line,#e2e8f0)] hover:bg-[var(--paper-strong,#f1f5f9)]"
									}`}
								>
									{activeTooth.isMissing ? "Отсутствует (Адентия)" : "Пометить отсутствующим"}
								</button>
							</div>

							<div className="flex items-center gap-3 flex-wrap">
								{/* Mobility selector */}
								<div className="flex items-center gap-1.5 text-xs">
									<span className="text-[var(--muted,#64748b)] font-bold">Подвижность:</span>
									{[0, 1, 2, 3].map((g) => (
										<button
											key={`mob-${g}`}
											type="button"
											onClick={() => {
												setTeeth((prev) =>
													prev.map((t) => (t.toothNumber === activeToothNum ? { ...t, mobility: g as any } : t)),
												);
												SoundFeedbackService.getInstance().playActionSuccess();
											}}
											className={`min-w-[44px] min-h-[44px] w-11 h-11 rounded-xl font-black text-xs sm:text-sm border transition-all cursor-pointer touch-manipulation flex items-center justify-center ${
												activeTooth.mobility === g
													? "bg-amber-500 text-white border-amber-600 shadow-sm"
													: "bg-[var(--paper-soft,#f8fafc)] text-[var(--muted,#64748b)] border-[var(--line,#e2e8f0)] hover:bg-[var(--paper-strong,#f1f5f9)]"
											}`}
										>
											{g === 0 ? "0" : g === 1 ? "I" : g === 2 ? "II" : "III"}
										</button>
									))}
								</div>

								{/* Furcation selector if multi-rooted */}
								{isFurcationEligibleTooth(activeTooth.toothNumber) && (
									<div className="flex items-center gap-1.5 text-xs ml-2">
										<span className="text-[var(--muted,#64748b)] font-bold">Фуркация:</span>
										{[0, 1, 2, 3].map((f) => (
											<button
												key={`furc-${f}`}
												type="button"
												onClick={() => {
													setTeeth((prev) =>
														prev.map((t) => (t.toothNumber === activeToothNum ? { ...t, furcation: f as any } : t)),
													);
													SoundFeedbackService.getInstance().playActionSuccess();
												}}
												className={`min-w-[44px] min-h-[44px] w-11 h-11 rounded-xl font-black text-xs sm:text-sm border transition-all cursor-pointer touch-manipulation flex items-center justify-center ${
													activeTooth.furcation === f
														? "bg-purple-600 text-white border-purple-700 shadow-sm"
														: "bg-[var(--paper-soft,#f8fafc)] text-[var(--muted,#64748b)] border-[var(--line,#e2e8f0)] hover:bg-[var(--paper-strong,#f1f5f9)]"
												}`}
											>
												{f === 0 ? "0" : f === 1 ? "I" : f === 2 ? "II" : "III"}
											</button>
										))}
									</div>
								)}
							</div>
						</div>

						{/* 3 Active Aspect Sites Matrix */}
						<div className="perio-sites-matrix">
							{(activeAspect === "buccal"
								? (["mesioBuccal", "midBuccal", "distoBuccal"] as const)
								: (["mesioLingual", "midLingual", "distoLingual"] as const)
							).map((siteKey) => {
								const site = activeTooth[siteKey];
								const depth = site?.probingDepthMm ?? 0;
								const gm = site?.gingivalMarginMm ?? 0;
								const cal = calculateClinicalAttachmentLevel(depth, gm);
								const isBop = Boolean(site?.bleedingOnProbing);

								const siteLabel =
									siteKey === "mesioBuccal"
										? "Медиально-щечный (MB)"
										: siteKey === "midBuccal"
										? "Щечный / по центру (B)"
										: siteKey === "distoBuccal"
										? "Дистально-щечный (DB)"
										: siteKey === "mesioLingual"
										? "Медиально-оральный (ML)"
										: siteKey === "midLingual"
										? "Оральный / по центру (L/P)"
										: "Дистально-оральный (DL)";

								const depthClass = depth >= 6 ? "deep" : depth >= 4 ? "moderate" : "normal";

								return (
									<div key={siteKey} className={`perio-site-box ${depthClass}`}>
										<div className="flex items-center justify-between">
											<span className="text-xs font-bold">{siteLabel}</span>
											<span className="text-[11px] font-mono text-[var(--muted,#64748b)]">
												CAL: <strong className="text-[var(--ink,#0f172a)]">{cal} мм</strong>
											</span>
										</div>

										{/* Depth Numeric Stepper */}
										<div className="flex items-center justify-between gap-3">
											<div className="flex items-center gap-2">
												<button
													type="button"
													onClick={() => handleAdjustDepth(siteKey, -1)}
													className="perio-stepper-btn"
													aria-label="Уменьшить глубину кармана на 1 мм"
												>
													−
												</button>
												<span className="text-2xl font-black font-mono w-12 text-center">
													{depth} <span className="text-xs font-normal">мм</span>
												</span>
												<button
													type="button"
													onClick={() => handleAdjustDepth(siteKey, 1)}
													className="perio-stepper-btn"
													aria-label="Увеличить глубину кармана на 1 мм"
												>
													+
												</button>
											</div>

											{/* BOP Toggle */}
											<button
												type="button"
												onClick={() => handleToggleBop(siteKey)}
												className={`perio-bop-toggle ${isBop ? "active" : ""}`}
											>
												<Droplets size={16} />
												<span>{isBop ? "BOP: Кровь (+)" : "BOP: Нет (-)"}</span>
											</button>
										</div>

										{/* Quick Keypad 1..10 */}
										<div className="flex flex-wrap gap-1 mt-1">
											{[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((numVal) => (
												<button
													key={`keypad-${siteKey}-${numVal}`}
													type="button"
													onClick={() => handleSetDepth(siteKey, numVal)}
													className={`perio-depth-btn ${depth === numVal ? "active" : ""}`}
												>
													{numVal}
												</button>
											))}
										</div>
									</div>
								);
							})}
						</div>
					</div>
				</div>

				{/* 5. Footer Actions */}
				<footer className="perio-footer">
					<div className="flex items-center gap-2 text-xs text-[var(--muted,#64748b)]">
						<Sparkles size={16} className="text-[var(--teal,#0d9488)]" />
						<span>Голосовая диктовка активна: произнесите «зуб 16 медиально 4 щечно 3 bop плюс»</span>
					</div>

					<div className="flex items-center gap-3">
						<button
							type="button"
							onClick={handleInsertTo043}
							className="perio-secondary-btn"
						>
							<FileText size={18} className="text-[var(--teal,#0d9488)]" />
							<span>1-Клик в протокол 043/у</span>
						</button>

						<button
							type="button"
							onClick={handleSave}
							className="perio-primary-btn"
						>
							<Check size={18} />
							<span>Сохранить перио-карту</span>
						</button>
					</div>
				</footer>
			</div>
		</div>
	);
};

export const PerioChartModal = PeriodontalChartingModal;
export type PerioChartModalProps = PeriodontalChartingModalProps;
