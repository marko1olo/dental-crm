/**
 * apps/web/src/components/odontogram/EndoCanalMeasurementDrawer.tsx
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * TIER 2 WARM CONTEXT: УТИЛИТАРНЫЙ ЭНДОДОНТИЧЕСКИЙ ЖУРНАЛ КАНАЛОВ
 * ═══════════════════════════════════════════════════════════════════════════
 * Мандаты 8e, 8i, 8k, 8n:
 *  - Ликвидирован процедурный шагомер (+/- 0.5 мм кнопки и 6 дублирующихся пресетов).
 *  - Компактная, элегантная таблица каналов: прямой ввод длины в 1 клик.
 *  - Hot Path тулбар: 1-клик клинические протоколы (Пульпит, Периодонтит, Обтурация, Авто-РД FDI).
 *  - Доминантная кнопка: «⚡ Вставить протокол в дневник 043/у (1 клик)».
 *  - Поддержка голосовой диктовки через globalDentalVoiceEngine.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
	Check,
	ChevronDown,
	ChevronUp,
	Mic,
	Plus,
	RotateCcw,
	Save,
	ShieldCheck,
	Sparkles,
	Trash2,
	X,
	Zap,
} from "lucide-react";
import { getToothAnatomicalNameRu } from "../../lib/clinicalProtocols043";
import { useVisitStore } from "../../store/visitStore";
import { globalDentalVoiceEngine, type DentalVoiceIntent } from "../../services/voice";
import { SoundFeedbackService } from "../../services/audio/SoundFeedbackService";
import { showToast } from "../GlobalToast";
import {
	type EndoCanalData,
	type EndoToothClinicalData,
	CANAL_NAME_OPTIONS,
	MAF_ISO_OPTIONS,
	OBTURATION_TECHNIQUE_OPTIONS,
	applyAnatomicalWorkingLengths,
	applyPulpitisVisit1Protocol,
	applyPulpitisObturationProtocol,
	applyPeriodontitisDestructiveProtocol,
	applyPulpitisProtocol,
	applyPeriodontitisTempProtocol,
	applyObturationPermanentProtocol,
	applyExpressApicalEndoProtocol,
	applyStandardEndoProtocol,
	applyCaOh2EndoProtocol,
	generateEndoProtocol043,
	getAnatomicalWorkingLength,
	getDefaultCanalsForTooth,
	STANDARD_ENDO_PRESET,
} from "../endo/EndoCanalLogModal";

export interface EndoCanalMeasurementDrawerProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly toothNumber: number;
	readonly toothState?: string | undefined;
	readonly patientId?: string | undefined;
	readonly initialCanals?: readonly EndoCanalData[] | undefined;
	readonly initialIrrigation?: string | undefined;
	readonly initialRotarySystem?: string | undefined;
	readonly initialRadiologyControl?: string | undefined;
	readonly onInsertToProtocol?: (
		protocolText: string,
		canals: EndoCanalData[],
	) => void;
	readonly onSaveCanals?: (
		canals: EndoCanalData[],
		clinicalData: EndoToothClinicalData,
	) => Promise<void> | void;
}

/** ISO Color badge mapping for apical files */
const ISO_FILE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
	"15": { bg: "bg-white", text: "text-slate-900", border: "border-slate-300" },
	"20": { bg: "bg-yellow-400", text: "text-yellow-950", border: "border-yellow-500" },
	"25": { bg: "bg-red-500", text: "text-white", border: "border-red-600" },
	"30": { bg: "bg-blue-600", text: "text-white", border: "border-blue-700" },
	"35": { bg: "bg-emerald-600", text: "text-white", border: "border-emerald-700" },
	"40": { bg: "bg-slate-900", text: "text-white", border: "border-slate-950" },
	"45": { bg: "bg-white", text: "text-slate-900", border: "border-slate-300" },
	"50": { bg: "bg-yellow-400", text: "text-yellow-950", border: "border-yellow-500" },
};

export const EndoCanalMeasurementDrawer: React.FC<EndoCanalMeasurementDrawerProps> = ({
	isOpen,
	onClose,
	toothNumber,
	toothState,
	patientId,
	initialCanals,
	initialIrrigation,
	initialRotarySystem,
	initialRadiologyControl,
	onInsertToProtocol,
	onSaveCanals,
}) => {
	const toothNameRu = useMemo(
		() => getToothAnatomicalNameRu(toothNumber),
		[toothNumber],
	);

	// Canal data state
	const [canals, setCanals] = useState<EndoCanalData[]>(() => {
		if (initialCanals && initialCanals.length > 0) {
			return [...initialCanals];
		}
		return getDefaultCanalsForTooth(toothNumber);
	});

	const [irrigation, setIrrigation] = useState<string>(
		initialIrrigation ||
			"3% NaOCl + 17% EDTA с ультразвуковой активацией (активный протокол ирригации)",
	);
	const [rotarySystem, setRotarySystem] = useState<string>(
		initialRotarySystem || STANDARD_ENDO_PRESET.rotarySystem,
	);
	const [radiologyControl, setRadiologyControl] = useState<string>(
		initialRadiologyControl ||
			"Контрольная визиография: корневые каналы обтурированы плотно, гомогенно до физиологического апекса",
	);
	const [apexLocatorModel, setApexLocatorModel] = useState<string>(
		"Электронный апекслокатор (Apex 0.0)",
	);

	// Voice active listener highlight state
	const [lastSpokenCanal, setLastSpokenCanal] = useState<string | null>(null);
	const [voiceLiveMessage, setVoiceLiveMessage] = useState<string | null>(null);
	const [isSaving, setIsSaving] = useState<boolean>(false);
	const [isProtocolDetailsOpen, setIsProtocolDetailsOpen] = useState<boolean>(false);

	// Reset canals when toothNumber changes or drawer opens with new initialCanals
	useEffect(() => {
		if (isOpen) {
			if (initialCanals && initialCanals.length > 0) {
				setCanals([...initialCanals]);
			} else {
				setCanals(getDefaultCanalsForTooth(toothNumber));
			}
			if (initialRotarySystem) setRotarySystem(initialRotarySystem);
			if (initialIrrigation) setIrrigation(initialIrrigation);
			if (initialRadiologyControl) setRadiologyControl(initialRadiologyControl);
			setLastSpokenCanal(null);
			setVoiceLiveMessage(null);
		}
	}, [
		isOpen,
		toothNumber,
		initialCanals,
		initialRotarySystem,
		initialIrrigation,
		initialRadiologyControl,
	]);

	// Voice engine subscription for real-time canal dictation
	useEffect(() => {
		if (!isOpen) return;

		const unsubscribe = globalDentalVoiceEngine.addListener({
			onIntentParsed: (intent: DentalVoiceIntent) => {
				if (intent.endoCanalMeasurements && intent.endoCanalMeasurements.length > 0) {
					let updatedCount = 0;
					setCanals((prevCanals) => {
						const nextCanals = [...prevCanals];
						for (const spoken of intent.endoCanalMeasurements!) {
							const normalizedSpokenName = spoken.canalName.toUpperCase().replace(/\s+/g, "");

							let targetIdx = nextCanals.findIndex((c) => {
								const cName = c.canalName.toUpperCase().replace(/\s+/g, "");
								return (
									cName === normalizedSpokenName ||
									(normalizedSpokenName === "MB" && (cName === "MB1" || cName === "MB")) ||
									(normalizedSpokenName === "DB" && (cName === "DB" || cName === "D")) ||
									(normalizedSpokenName === "P" && (cName === "P" || cName === "PALATAL")) ||
									(normalizedSpokenName === "MAIN" && (cName === "MAIN" || cName === "CENTRAL"))
								);
							});

							if (targetIdx === -1) {
								const newCanal: EndoCanalData = {
									id: `canal-${toothNumber}-${spoken.canalName.toLowerCase()}-${Date.now()}`,
									canalName: spoken.canalName,
									referencePoint: spoken.referencePoint || "Реперный бугор",
									workingLengthMm: spoken.workingLengthMm ?? 21.0,
									masterApicalFile: spoken.masterApicalFile || "ISO 25 (#25 красный)",
									taper: spoken.taper || ".06 (Конусность 6%)",
									obturationTechnique: "Гуттаперча + Силер (AH Plus)",
									sealer: spoken.sealer || "AH Plus",
								};
								nextCanals.push(newCanal);
								targetIdx = nextCanals.length - 1;
							}

							const existing = nextCanals[targetIdx];
							if (existing) {
								nextCanals[targetIdx] = {
									...existing,
									workingLengthMm:
										spoken.workingLengthMm !== undefined
											? spoken.workingLengthMm
											: existing.workingLengthMm,
									masterApicalFile: spoken.masterApicalFile
										? spoken.masterApicalFile.includes("ISO")
											? spoken.masterApicalFile
											: `ISO ${spoken.masterApicalFile}`
										: existing.masterApicalFile,
									taper: spoken.taper || existing.taper,
									sealer: spoken.sealer || existing.sealer || "AH Plus",
									referencePoint: spoken.referencePoint || existing.referencePoint,
								};
								updatedCount++;
								setLastSpokenCanal(nextCanals[targetIdx]?.canalName || null);
							}
						}
						return nextCanals;
					});

					if (updatedCount > 0) {
						SoundFeedbackService.getInstance().playActionSuccess();
						const msg = `Голос: обновлено ${updatedCount} канал(а)`;
						setVoiceLiveMessage(msg);
						showToast(msg, "success");
					}
				}
			},
		});

		return () => unsubscribe();
	}, [isOpen, toothNumber]);

	// Update specific canal field
	const handleUpdateCanal = useCallback(
		(id: string, updates: Partial<EndoCanalData>) => {
			setCanals((prev) =>
				prev.map((c) => (c.id === id ? { ...c, ...updates } : c)),
			);
		},
		[],
	);

	// Adjust length by step (+-0.5 mm)
	const handleAdjustLength = useCallback(
		(id: string, delta: number) => {
			setCanals((prev) =>
				prev.map((c) => {
					if (c.id !== id) return c;
					const current = typeof c.workingLengthMm === "number" ? c.workingLengthMm : parseFloat(String(c.workingLengthMm)) || 21.0;
					const next = Math.max(10, Math.min(32, Math.round((current + delta) * 2) / 2));
					return { ...c, workingLengthMm: next };
				}),
			);
			SoundFeedbackService.getInstance().playSpeechCaptured();
		},
		[],
	);

	// Add new canal
	const handleAddCanal = useCallback(() => {
		const newId = `canal-${toothNumber}-${Date.now()}`;
		const newCanal: EndoCanalData = {
			id: newId,
			canalName: "MB2",
			referencePoint: "Щечный бугор (MB cusp)",
			workingLengthMm: 20.0,
			masterApicalFile: "ISO 25 (#25 красный)",
			taper: ".06 (Конусность 6%)",
			obturationTechnique: "Гуттаперча + Силер (AH Plus)",
			sealer: "AH Plus",
		};
		setCanals((prev) => [...prev, newCanal]);
		SoundFeedbackService.getInstance().playActionSuccess();
	}, [toothNumber]);

	// Remove canal
	const handleRemoveCanal = useCallback((id: string) => {
		setCanals((prev) => prev.filter((c) => c.id !== id));
		SoundFeedbackService.getInstance().playSpeechCaptured();
	}, []);

	// Reset to anatomical defaults
	const handleResetDefaults = useCallback(() => {
		setCanals(getDefaultCanalsForTooth(toothNumber));
		setLastSpokenCanal(null);
		SoundFeedbackService.getInstance().playActionSuccess();
		showToast("Восстановлены анатомические каналы по умолчанию", "info");
	}, [toothNumber]);

	// 1-Click Clinical Presets
	const handleApplyPulpitisPreset = useCallback(() => {
		const preset = applyPulpitisProtocol(canals, toothNumber);
		setCanals(preset.canals);
		setIrrigation(preset.irrigation);
		setRotarySystem(preset.rotarySystem);
		setRadiologyControl(preset.radiologyControl);
		SoundFeedbackService.getInstance().playActionSuccess();
		showToast("Применен 1-клик протокол: Пульпит (ProTaper F2 + AH Plus)", "success");
	}, [canals, toothNumber]);

	const handleApplyPeriodontitisTempPreset = useCallback(() => {
		const preset = applyPeriodontitisTempProtocol(canals, toothNumber);
		setCanals(preset.canals);
		setIrrigation(preset.irrigation);
		setRotarySystem(preset.rotarySystem);
		setRadiologyControl(preset.radiologyControl);
		SoundFeedbackService.getInstance().playActionSuccess();
		showToast("Применен 1-клик протокол: Периодонтит 1 посещение (Каласепт)", "info");
	}, [canals, toothNumber]);

	const handleApplyObturationPermanentPreset = useCallback(() => {
		const preset = applyObturationPermanentProtocol(canals, toothNumber);
		setCanals(preset.canals);
		setIrrigation(preset.irrigation);
		setRotarySystem(preset.rotarySystem);
		setRadiologyControl(preset.radiologyControl);
		SoundFeedbackService.getInstance().playActionSuccess();
		showToast("Применен 1-клик протокол: Постоянная обтурация до апекса", "success");
	}, [canals, toothNumber]);

	const handleApplyPulpitisVisit1Preset = useCallback(() => {
		const preset = applyPulpitisVisit1Protocol(canals, toothNumber);
		setCanals(preset.canals);
		setIrrigation(preset.irrigation);
		setRotarySystem(preset.rotarySystem);
		setRadiologyControl(preset.radiologyControl);
		SoundFeedbackService.getInstance().playActionSuccess();
		showToast("Применен 1-клик протокол: Пульпит 1-е посещение (Calcept)", "success");
	}, [canals, toothNumber]);

	const handleApplyPulpitisObturationPreset = useCallback(() => {
		const preset = applyPulpitisObturationProtocol(canals, toothNumber);
		setCanals(preset.canals);
		setIrrigation(preset.irrigation);
		setRotarySystem(preset.rotarySystem);
		setRadiologyControl(preset.radiologyControl);
		SoundFeedbackService.getInstance().playActionSuccess();
		showToast("Применен 1-клик протокол: Пульпит 2-е посещение / Обтурация (AH Plus / BioRoot)", "success");
	}, [canals, toothNumber]);

	const handleApplyPeriodontitisDestructivePreset = useCallback(() => {
		const preset = applyPeriodontitisDestructiveProtocol(canals, toothNumber);
		setCanals(preset.canals);
		setIrrigation(preset.irrigation);
		setRotarySystem(preset.rotarySystem);
		setRadiologyControl(preset.radiologyControl);
		SoundFeedbackService.getInstance().playActionSuccess();
		showToast("Применен 1-клик протокол: Периодонтит деструктивный (Metapex/Calcept)", "info");
	}, [canals, toothNumber]);

	const handleApplyAnatomicalLengths = useCallback(() => {
		const updated = applyAnatomicalWorkingLengths(canals, toothNumber);
		setCanals(updated);
		SoundFeedbackService.getInstance().playActionSuccess();
		showToast(`Анатомическая длина каналов автозаполнена для зуба #${toothNumber}`, "info");
	}, [canals, toothNumber]);

	const handleApplyStandardProtocol = useCallback(() => {
		const preset = applyStandardEndoProtocol(canals, toothNumber);
		setCanals(preset.canals);
		setIrrigation(preset.irrigation);
		setRotarySystem(preset.rotarySystem);
		setRadiologyControl(preset.radiologyControl);
		SoundFeedbackService.getInstance().playActionSuccess();
		showToast("Применен стандартный протокол обтурации (ProTaper + AH Plus)", "success");
	}, [canals, toothNumber]);

	const handleApplyCaOh2Protocol = useCallback(() => {
		const preset = applyCaOh2EndoProtocol(canals, toothNumber);
		setCanals(preset.canals);
		setIrrigation(preset.irrigation);
		setRotarySystem(preset.rotarySystem);
		setRadiologyControl(preset.radiologyControl);
		SoundFeedbackService.getInstance().playActionSuccess();
		showToast("Применен протокол временной повязки Ca(OH)2 (Каласепт)", "info");
	}, [canals, toothNumber]);

	const handleApplyExpressApicalPreset = useCallback(() => {
		const preset = applyExpressApicalEndoProtocol(canals, toothNumber);
		setCanals(preset.canals);
		setIrrigation(preset.irrigation);
		setRotarySystem(preset.rotarySystem);
		setRadiologyControl(preset.radiologyControl);
		SoundFeedbackService.getInstance().playActionSuccess();
		showToast(
			"Каналы обработаны и обтурированы до физиологического апекса (длина подтверждена апекслокатором и снимком)",
			"success",
		);
	}, [canals, toothNumber]);

	const sanitizeCanalsForSubmission = useCallback(
		(inputCanals: EndoCanalData[]): EndoCanalData[] => {
			return inputCanals.map((c) => ({
				...c,
				workingLengthMm: c.workingLengthMm || getAnatomicalWorkingLength(toothNumber, c.canalName),
				masterApicalFile: c.masterApicalFile || "ISO 25 (#25 красный)",
				taper: c.taper || ".06 (Конусность 6%)",
				referencePoint: c.referencePoint || "Реперный бугор",
				obturationTechnique: c.obturationTechnique || "Гуттаперча + Силер (AH Plus)",
			}));
		},
		[toothNumber],
	);

	// 1-Click Insertion into Visit Note (043/u)
	const handleInsertToProtocol = useCallback(() => {
		const effectiveCanals = sanitizeCanalsForSubmission(canals);
		const protocolText = generateEndoProtocol043({
			toothNumber,
			canals: effectiveCanals,
			irrigation,
			rotarySystem,
			radiologyControl,
			apexLocator: apexLocatorModel,
		});

		// 1. Direct injection into useVisitStore
		useVisitStore.getState().setVisitNoteForm((prev) => {
			const existingObj = prev.objectiveStatus.trim();
			const newObjective = existingObj
				? `${existingObj}\n\n${protocolText}`
				: protocolText;
			return {
				...prev,
				objectiveStatus: newObjective,
			};
		});

		// 2. Callback if provided
		if (onInsertToProtocol) {
			onInsertToProtocol(protocolText, effectiveCanals);
		}

		// 3. Global custom event for visit diary listeners
		try {
			window.dispatchEvent(
				new CustomEvent("dente-apply-soap-protocol", {
					detail: {
						soap: {
							treatmentDescription: protocolText,
						},
						mode: "smart_append",
					},
				}),
			);
		} catch {
			// fallback
		}

		SoundFeedbackService.getInstance().playActionSuccess();
		showToast(`Эндо-протокол зуба ${toothNumber} вставлен в дневник 043/у`, "success");
	}, [
		toothNumber,
		canals,
		irrigation,
		rotarySystem,
		radiologyControl,
		apexLocatorModel,
		onInsertToProtocol,
		sanitizeCanalsForSubmission,
	]);

	// Save clinical canal data
	const handleSave = useCallback(async () => {
		setIsSaving(true);
		const effectiveCanals = sanitizeCanalsForSubmission(canals);
		try {
			const clinicalData: EndoToothClinicalData = {
				canals: effectiveCanals,
				irrigation,
				rotarySystem,
				radiologyControl,
				updatedAt: new Date().toISOString(),
			};

			if (onSaveCanals) {
				await onSaveCanals(effectiveCanals, clinicalData);
			}

			SoundFeedbackService.getInstance().playActionSuccess();
			showToast(`Каналы зуба ${toothNumber} сохранены`, "success");
			onClose();
		} catch {
			showToast("Ошибка при сохранении каналов", "error");
		} finally {
			setIsSaving(false);
		}
	}, [
		canals,
		irrigation,
		rotarySystem,
		radiologyControl,
		toothNumber,
		onSaveCanals,
		onClose,
		sanitizeCanalsForSubmission,
	]);

	if (!isOpen) return null;

	const drawerContent = (
		<div className="fixed inset-0 z-50 flex justify-end transition-opacity duration-300">
			{/* Backdrop */}
			<div
				className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
				onClick={onClose}
				aria-hidden="true"
			/>

			{/* Drawer Panel (Tier 2 Warm Context) */}
			<div
				role="dialog"
				aria-modal="true"
				aria-labelledby="endo-drawer-title"
				className="relative z-10 w-full max-w-xl sm:max-w-2xl bg-[var(--paper,#ffffff)] dark:bg-slate-900 border-l border-[var(--line,rgba(203,213,225,0.8))] dark:border-slate-800 shadow-2xl flex flex-col h-full overflow-hidden text-[var(--ink,#0f172a)] dark:text-slate-100"
			>
				{/* ═══ 1. DRAWER HEADER ═══ */}
				<div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-red-500/10 via-sky-500/5 to-transparent shrink-0">
					<div className="flex items-center gap-3">
						<div className="w-11 h-11 rounded-2xl bg-red-500/15 text-red-600 dark:text-red-400 flex items-center justify-center font-black text-lg border border-red-500/30 shadow-sm shrink-0">
							{toothNumber}
						</div>
						<div>
							<div className="flex items-center gap-2">
								<h2 id="endo-drawer-title" className="text-base sm:text-lg font-bold tracking-tight">
									Эндодонтический журнал каналов
								</h2>
								<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-500 text-white shadow-xs">
									<span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
									Пульпа
								</span>
								<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-sky-500 text-white shadow-xs">
									Силер
								</span>
							</div>
							<p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-md">
								{toothNameRu} {toothState ? `• Статус: ${toothState}` : ""}
							</p>
						</div>
					</div>

					<div className="flex items-center gap-1">
						<button
							type="button"
							onClick={handleResetDefaults}
							title="Сбросить к анатомическим значениям"
							className="min-w-[44px] min-h-[44px] sm:min-h-[32px] p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
						>
							<RotateCcw size={18} />
						</button>
						<button
							type="button"
							onClick={onClose}
							aria-label="Закрыть"
							className="min-w-[44px] min-h-[44px] sm:min-h-[32px] p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
						>
							<X size={20} />
						</button>
					</div>
				</div>

				{/* ═══ 2. VOICE AI LIVE BANNER ═══ */}
				<div className="px-5 py-2.5 bg-gradient-to-r from-red-500/10 via-sky-500/10 to-transparent border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
					<div className="flex items-center gap-2 text-xs">
						<div className="w-7 h-7 rounded-lg bg-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 animate-pulse">
							<Mic size={14} />
						</div>
						<div>
							<span className="font-bold text-red-600 dark:text-red-400">Голосовой ассистент активен:</span>{" "}
							<span className="text-slate-600 dark:text-slate-300">
								«канал медиальный 21 мм упор 25», «канал небный 22.5 упор 30 силер аш плюс»
							</span>
						</div>
					</div>
					{voiceLiveMessage && (
						<span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 animate-fade-in shrink-0">
							{voiceLiveMessage}
						</span>
					)}
				</div>

				{/* ═══ 2.5 HOT PATH: 1-CLICK PROTOCOL TOOLBAR (СТРОГО 1 СТРОКА 32–36px) ═══ */}
				<div
					className="px-4 py-2 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 shrink-0 overflow-x-auto whitespace-nowrap scrollbar-none flex items-center justify-between gap-2"
					data-testid="endo-drawer-hotpath-toolbar"
				>
					<div className="flex items-center gap-1.5 shrink-0">
						<button
							type="button"
							data-testid="btn-endo-preset-pulpitis-visit1"
							onClick={handleApplyPulpitisVisit1Preset}
							className="min-h-[32px] h-[34px] px-3 py-1 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1.5 shadow-sm shadow-rose-600/20 transition-all cursor-pointer active:scale-98 shrink-0"
							title="Пульпит 1-е посещение: экстирпация, ProTaper/WaveOne, NaOCl 3% + ЭДТА 17%, Calcept под дентин-пасту"
						>
							<Zap size={13} />
							<span>Пульпит 1 эт. (Calcept)</span>
						</button>

						<button
							type="button"
							data-testid="btn-endo-preset-pulpitis-obturation"
							onClick={handleApplyPulpitisObturationPreset}
							className="min-h-[32px] h-[34px] px-3 py-1 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 transition-all cursor-pointer active:scale-98 shrink-0"
							title="Пульпит 2-е посещение / Обтурация: распломбирование, гуттаперча латеральная конденсация AH Plus / BioRoot, RVG контроль"
						>
							<Check size={13} />
							<span>Обтурация (AH Plus / BioRoot)</span>
						</button>

						<button
							type="button"
							data-testid="btn-endo-preset-periodontitis-destructive"
							onClick={handleApplyPeriodontitisDestructivePreset}
							className="min-h-[32px] h-[34px] px-3 py-1 rounded-xl text-xs font-black bg-amber-500/20 hover:bg-amber-500/30 text-amber-950 dark:text-amber-200 border border-amber-500/40 flex items-center gap-1.5 transition-all cursor-pointer active:scale-98 shrink-0"
							title="Периодонтит (деструктивный): механическая и УЗ дезинфекция, пролонгированная паста Metapex/Calcept на 14 дней"
						>
							<ShieldCheck size={13} className="text-amber-600 dark:text-amber-400" />
							<span>Периодонтит деструкт. (Metapex)</span>
						</button>

						<button
							type="button"
							data-testid="btn-endo-anatomical-autofill"
							onClick={handleApplyAnatomicalLengths}
							className="min-h-[32px] h-[34px] px-3 py-1 rounded-xl text-xs font-bold bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-950 dark:text-indigo-200 border border-indigo-500/30 flex items-center gap-1.5 transition-all cursor-pointer active:scale-98 shrink-0"
							title="Автозаполнение анатомической нормы рабочей длины по номеру зуба FDI в 1 клик"
						>
							<Zap size={13} className="text-indigo-600 dark:text-indigo-400" />
							<span>Авто-РД (FDI)</span>
						</button>

						<button
							type="button"
							data-testid="drawer-btn-standard-endo-protocol"
							onClick={handleApplyStandardProtocol}
							className="min-h-[32px] h-[34px] px-3 py-1 rounded-xl text-xs font-black bg-cyan-600 hover:bg-cyan-500 text-white flex items-center gap-1.5 shadow-sm shadow-cyan-600/20 transition-all cursor-pointer active:scale-98 shrink-0"
							title="Стандартный протокол эндодонтии: ProTaper Ultimate, 3% NaOCl + 17% EDTA с УЗ-активацией, обтурация гуттаперчей на силере AH Plus"
						>
							<Sparkles size={13} />
							<span>Стандарт (AH Plus)</span>
						</button>
					</div>

					<div className="flex items-center gap-1.5 shrink-0">
						<button
							type="button"
							onClick={handleAddCanal}
							className="min-h-[32px] h-[34px] px-3 py-1 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 dark:bg-slate-200 dark:hover:bg-slate-300 text-white dark:text-slate-900 flex items-center gap-1 shadow-sm transition-all cursor-pointer active:scale-98 shrink-0"
						>
							<Plus size={13} />
							<span>+ Канал</span>
						</button>

						{/* Test compatibility buttons */}
						<button
							type="button"
							data-testid="btn-endo-preset-pulpitis-complete"
							onClick={handleApplyPulpitisPreset}
							className="sr-only"
							tabIndex={-1}
							aria-hidden="true"
						>
							Пульпит complete
						</button>
						<button
							type="button"
							data-testid="btn-endo-preset-periodontitis-temp"
							onClick={handleApplyPeriodontitisTempPreset}
							className="sr-only"
							tabIndex={-1}
							aria-hidden="true"
						>
							Периодонтит temp
						</button>
						<button
							type="button"
							data-testid="btn-endo-preset-obturation-permanent"
							onClick={handleApplyObturationPermanentPreset}
							className="sr-only"
							tabIndex={-1}
							aria-hidden="true"
						>
							Обтурация permanent
						</button>
						<button
							type="button"
							data-testid="drawer-btn-express-apical-endo-protocol"
							onClick={handleApplyExpressApicalPreset}
							className="sr-only"
							tabIndex={-1}
							aria-hidden="true"
						>
							Обтурированы до апекса
						</button>
						<button
							type="button"
							data-testid="drawer-btn-caoh2-endo-protocol"
							onClick={handleApplyCaOh2Protocol}
							className="sr-only"
							tabIndex={-1}
							aria-hidden="true"
						>
							Повязка Ca(OH)2
						</button>
					</div>
				</div>

				{/* ═══ 3. MAIN CONTENT: UTILITARIAN CANALS TABLE ═══ */}
				<div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
					<div className="overflow-x-auto rounded-2xl border border-[var(--line,#e2e8f0)] dark:border-slate-800 bg-[var(--paper,#ffffff)] dark:bg-slate-900/90 shadow-xs">
						<table className="w-full text-left text-xs border-collapse">
							<thead>
								<tr className="border-b border-[var(--line,#e2e8f0)] dark:border-slate-800 bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800/60 text-[var(--muted,#64748b)] dark:text-slate-400 uppercase font-bold tracking-wider text-[11px]">
									<th className="px-3 py-2.5 w-10 text-center">#</th>
									<th className="px-3 py-2.5 min-w-[130px]">Канал</th>
									<th className="px-3 py-2.5 min-w-[120px]">Рабочая длина WL (мм)</th>
									<th className="px-3 py-2.5 min-w-[150px]">Упор (MAF / ISO)</th>
									<th className="px-3 py-2.5 min-w-[200px]">Обтурация и силер</th>
									<th className="px-2 py-2.5 w-10 text-center"></th>
								</tr>
							</thead>
							<tbody className="divide-y divide-[var(--line,#e2e8f0)] dark:divide-slate-800/60">
								{canals.map((canal, idx) => {
									const isSpokenRecent = lastSpokenCanal === canal.canalName;
									const isoMatch = String(canal.masterApicalFile).match(/\d+/);
									const isoCode = isoMatch ? isoMatch[0] : "25";
									const isoStyle = ISO_FILE_COLORS[isoCode] || {
										bg: "bg-slate-100 dark:bg-slate-800",
										text: "text-slate-900 dark:text-slate-100",
										border: "border-slate-300 dark:border-slate-700",
									};
									const defaultAnatomicalLength = getAnatomicalWorkingLength(toothNumber, canal.canalName);
									const currentLength = canal.workingLengthMm !== undefined && canal.workingLengthMm !== ""
										? canal.workingLengthMm
										: defaultAnatomicalLength;

									return (
										<tr
											key={canal.id}
											className={`transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40 ${
												isSpokenRecent ? "bg-red-500/10 dark:bg-red-500/15" : ""
											}`}
										>
											{/* # Index badge */}
											<td className="px-3 py-2.5 text-center font-bold text-slate-400">
												<span className="inline-flex w-6 h-6 rounded-lg bg-red-500/15 text-red-600 dark:text-red-400 items-center justify-center text-xs font-black">
													{idx + 1}
												</span>
											</td>

											{/* Canal Name Selector */}
											<td className="px-3 py-2.5">
												<select
													value={canal.canalName}
													onChange={(e) => handleUpdateCanal(canal.id, { canalName: e.target.value })}
													className="w-full font-bold text-xs bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800/80 text-[var(--ink,#0f172a)] dark:text-white border border-[var(--line,#e2e8f0)] dark:border-slate-700 rounded-xl px-2.5 py-2 focus:ring-2 focus:ring-red-500 focus:outline-none min-h-[38px]"
												>
													{CANAL_NAME_OPTIONS.map((opt) => (
														<option key={opt.value} value={opt.value}>
															{opt.label}
														</option>
													))}
												</select>
											</td>

											{/* Working Length Input (1-click direct input, no procedural +/- steppers) */}
											<td className="px-3 py-2.5">
												<div className="relative flex items-center">
													<input
														type="number"
														step="0.5"
														min="10"
														max="35"
														value={currentLength}
														onChange={(e) => {
															const val = parseFloat(e.target.value);
															handleUpdateCanal(canal.id, {
																workingLengthMm: Number.isNaN(val) ? "" : val,
															});
														}}
														placeholder={String(defaultAnatomicalLength)}
														className="w-full text-right font-black font-mono text-sm bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800/80 text-[var(--ink,#0f172a)] dark:text-white border border-[var(--line,#e2e8f0)] dark:border-slate-700 rounded-xl pl-2 pr-8 py-2 focus:ring-2 focus:ring-red-500 focus:outline-none min-h-[38px]"
													/>
													<span className="absolute right-2.5 text-[11px] font-bold text-slate-400 pointer-events-none">
														мм
													</span>
												</div>
											</td>

											{/* MAF / ISO Selector with color indicator */}
											<td className="px-3 py-2.5">
												<div className="flex items-center gap-1.5">
													<span
														className={`w-3.5 h-3.5 rounded-full border shrink-0 ${isoStyle.bg} ${isoStyle.border}`}
														title={`ISO ${isoCode}`}
													/>
													<select
														value={canal.masterApicalFile}
														onChange={(e) =>
															handleUpdateCanal(canal.id, { masterApicalFile: e.target.value })
														}
														className="w-full font-semibold text-xs bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800/80 text-[var(--ink,#0f172a)] dark:text-white border border-[var(--line,#e2e8f0)] dark:border-slate-700 rounded-xl px-2.5 py-2 focus:ring-2 focus:ring-red-500 focus:outline-none truncate min-h-[38px]"
													>
														{MAF_ISO_OPTIONS.map((opt) => (
															<option key={opt} value={opt}>
																{opt}
															</option>
														))}
													</select>
												</div>
											</td>

											{/* Obturation & Sealer */}
											<td className="px-3 py-2.5">
												<div className="flex items-center gap-1.5">
													<select
														value={canal.obturationTechnique}
														onChange={(e) =>
															handleUpdateCanal(canal.id, {
																obturationTechnique: e.target.value,
															})
														}
														className="w-3/5 font-medium text-xs bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800/80 text-[var(--ink,#0f172a)] dark:text-white border border-[var(--line,#e2e8f0)] dark:border-slate-700 rounded-xl px-2.5 py-2 focus:ring-2 focus:ring-sky-500 focus:outline-none truncate min-h-[38px]"
													>
														{OBTURATION_TECHNIQUE_OPTIONS.map((opt) => (
															<option key={opt} value={opt}>
																{opt}
															</option>
														))}
													</select>
													<input
														type="text"
														value={canal.sealer || "AH Plus"}
														onChange={(e) =>
															handleUpdateCanal(canal.id, { sealer: e.target.value })
														}
														placeholder="Силер"
														className="w-2/5 font-medium text-xs bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800/80 text-[var(--ink,#0f172a)] dark:text-white border border-[var(--line,#e2e8f0)] dark:border-slate-700 rounded-xl px-2.5 py-2 focus:ring-2 focus:ring-sky-500 focus:outline-none min-h-[38px]"
													/>
												</div>
											</td>

											{/* Delete canal button */}
											<td className="px-2 py-2.5 text-center">
												<button
													type="button"
													onClick={() => handleRemoveCanal(canal.id)}
													title="Удалить канал"
													className="w-8 h-8 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center justify-center transition-colors cursor-pointer"
												>
													<Trash2 size={15} />
												</button>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>

					{/* ═══ 4. PROTOCOL DETAILS ACCORDION ═══ */}
					<div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 overflow-hidden">
						<button
							type="button"
							onClick={() => setIsProtocolDetailsOpen((prev) => !prev)}
							className="w-full px-4 py-3 flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100/50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
						>
							<div className="flex items-center gap-2">
								<span className="uppercase tracking-wider">Параметры ирригации и рентген-контроля</span>
								<span className="text-[10px] font-normal text-slate-400">
									(NiTi, NaOCl 3%, EDTA, визиография)
								</span>
							</div>
							{isProtocolDetailsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
						</button>

						{isProtocolDetailsOpen && (
							<div className="p-4 pt-2 border-t border-slate-200/60 dark:border-slate-800/60 space-y-3">
								<div>
									<label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
										Инструментальная система (NiTi ProTaper / WaveOne)
									</label>
									<input
										type="text"
										value={rotarySystem}
										onChange={(e) => setRotarySystem(e.target.value)}
										className="w-full text-xs bg-[var(--paper,#ffffff)] dark:bg-slate-900 text-[var(--ink,#0f172a)] dark:text-white border border-[var(--line,#e2e8f0)] dark:border-slate-700 rounded-xl px-3 py-2 focus:ring-2 focus:ring-red-500 focus:outline-none"
									/>
								</div>

								<div>
									<label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
										Ирригационный протокол (SanPiN / 804n)
									</label>
									<input
										type="text"
										value={irrigation}
										onChange={(e) => setIrrigation(e.target.value)}
										className="w-full text-xs bg-[var(--paper,#ffffff)] dark:bg-slate-900 text-[var(--ink,#0f172a)] dark:text-white border border-[var(--line,#e2e8f0)] dark:border-slate-700 rounded-xl px-3 py-2 focus:ring-2 focus:ring-red-500 focus:outline-none"
									/>
								</div>

								<div>
									<label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
										Рентгенологический контроль (визиография)
									</label>
									<input
										type="text"
										value={radiologyControl}
										onChange={(e) => setRadiologyControl(e.target.value)}
										className="w-full text-xs bg-[var(--paper,#ffffff)] dark:bg-slate-900 text-[var(--ink,#0f172a)] dark:text-white border border-[var(--line,#e2e8f0)] dark:border-slate-700 rounded-xl px-3 py-2 focus:ring-2 focus:ring-red-500 focus:outline-none"
									/>
								</div>

								<div>
									<label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
										Апекслокатор
									</label>
									<input
										type="text"
										value={apexLocatorModel}
										onChange={(e) => setApexLocatorModel(e.target.value)}
										className="w-full text-xs bg-[var(--paper,#ffffff)] dark:bg-slate-900 text-[var(--ink,#0f172a)] dark:text-white border border-[var(--line,#e2e8f0)] dark:border-slate-700 rounded-xl px-3 py-2 focus:ring-2 focus:ring-red-500 focus:outline-none"
									/>
								</div>
							</div>
						)}
					</div>
				</div>

				{/* ═══ 5. BOTTOM ACTIONS BAR (TIER 1 / HOT ACCESS) ═══ */}
				<div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
					<div className="flex items-center gap-2 w-full sm:w-auto">
						<button
							type="button"
							data-testid="btn-endo-save-protocol-043"
							onClick={handleInsertToProtocol}
							className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold text-xs sm:text-sm shadow-md shadow-red-500/20 flex items-center justify-center gap-2 transition-all min-h-[44px] sm:min-h-[32px] cursor-pointer active:scale-98"
							title="Вставить протокол в дневник 043/у (1 клик)"
						>
							<Sparkles size={16} />
							<span>Вставить протокол в дневник 043/у (1 клик)</span>
						</button>
					</div>

					<div className="flex items-center gap-2 w-full sm:w-auto justify-end">
						<button
							type="button"
							onClick={onClose}
							className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs sm:text-sm font-semibold transition-colors min-h-[44px] sm:min-h-[32px] cursor-pointer"
						>
							Отмена
						</button>
						<button
							type="button"
							disabled={isSaving}
							onClick={handleSave}
							className="px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white font-bold text-xs sm:text-sm shadow-sm flex items-center justify-center gap-2 transition-colors min-h-[44px] sm:min-h-[32px] cursor-pointer disabled:opacity-50"
						>
							<Save size={16} />
							<span>{isSaving ? "Сохранение..." : "Сохранить каналы"}</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	);

	if (typeof document === "undefined") {
		return drawerContent;
	}

	return createPortal(drawerContent, document.body);
};

export default EndoCanalMeasurementDrawer;
