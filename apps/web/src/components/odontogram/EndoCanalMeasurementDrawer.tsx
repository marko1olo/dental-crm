/**
 * apps/web/src/components/odontogram/EndoCanalMeasurementDrawer.tsx
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * TIER 2 WARM CONTEXT: ЭНДОДОНТИЧЕСКИЙ ЖУРНАЛ КАНАЛОВ (WL / MAF / APEX)
 * ═══════════════════════════════════════════════════════════════════════════
 * Врач у кресла фиксирует рабочую длину каналов (MB1, MB2, DB, P, ML, D, B, L):
 *  - Измерение рабочей длины (WL) в мм (10.0..30.0 мм, шаг 0.5 мм, тач >= 44px)
 *  - Верхушечный упор (Apical Stop / MAF: ISO 15..40)
 *  - Конусность инструмента (.02, .04, .06, .08)
 *  - Анатомическая расцветка (пульпа #ef4444, силер #38bdf8, гуттаперча #f97316)
 *  - Голосовая диктовка длины («канал медиальный 21 миллиметр упор 25»)
 *  - «1 клик в протокол 043/у» -> автоматическое наполнение useVisitStore.setVisitNoteForm
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
	Activity,
	Check,
	ChevronRight,
	Copy,
	FileText,
	Mic,
	MicOff,
	Minus,
	Plus,
	RotateCcw,
	Save,
	ShieldCheck,
	Sparkles,
	Trash2,
	Waves,
	X,
	Zap,
} from "lucide-react";
import { isValidFdiToothNumber } from "@dental/shared";
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
	REFERENCE_POINT_OPTIONS,
	TAPER_OPTIONS,
	QUICK_LENGTH_PRESETS,
	STANDARD_ENDO_PRESET,
	CAOH2_ENDO_PRESET,
	applyStandardEndoProtocol,
	applyCaOh2EndoProtocol,
	formatEndoCanalsTable043,
	generateEndoProtocol043,
	getDefaultCanalsForTooth,
} from "./EndoCanalLogModal";

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

	// 1-Click Standard Protocols
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

	// 1-Click Insertion into Visit Note (043/u)
	const handleInsertToProtocol = useCallback(() => {
		const protocolText = generateEndoProtocol043({
			toothNumber,
			canals,
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
			onInsertToProtocol(protocolText, canals);
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
	]);

	// Save clinical canal data
	const handleSave = useCallback(async () => {
		setIsSaving(true);
		try {
			const clinicalData: EndoToothClinicalData = {
				canals,
				irrigation,
				rotarySystem,
				radiologyControl,
				updatedAt: new Date().toISOString(),
			};

			if (onSaveCanals) {
				await onSaveCanals(canals, clinicalData);
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
							className="min-w-[44px] min-h-[44px] p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
						>
							<RotateCcw size={18} />
						</button>
						<button
							type="button"
							onClick={onClose}
							aria-label="Закрыть"
							className="min-w-[44px] min-h-[44px] p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
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

				{/* ═══ 2.5 1-CLICK PROTOCOL TOOLBAR ═══ */}
				<div className="px-5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap shrink-0">
					<div className="flex items-center gap-1.5 flex-wrap">
						<button
							type="button"
							data-testid="drawer-btn-standard-endo-protocol"
							onClick={handleApplyStandardProtocol}
							className="min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 transition-all cursor-pointer active:scale-98"
							title="1 клик: ProTaper/WaveOne, NaOCl 3% + ЭДТА, обтурация AH Plus + гуттаперча"
						>
							<Sparkles size={14} />
							<span>Стандарт (ProTaper + AH-Plus)</span>
						</button>

						<button
							type="button"
							data-testid="drawer-btn-caoh2-endo-protocol"
							onClick={handleApplyCaOh2Protocol}
							className="min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-black bg-amber-500/15 hover:bg-amber-500/25 text-amber-900 dark:text-amber-200 border border-amber-500/30 flex items-center gap-1.5 transition-all cursor-pointer active:scale-98"
							title="1 клик: временная лечебная повязка с гидроксидом кальция Ca(OH)2"
						>
							<ShieldCheck size={14} />
							<span>Повязка Ca(OH)2</span>
						</button>

						<button
							type="button"
							onClick={handleResetDefaults}
							className="min-h-[38px] px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 flex items-center gap-1 transition-all cursor-pointer"
							title="Сброс к стандарту FDI"
						>
							<RotateCcw size={13} />
							<span>Стандарт FDI</span>
						</button>
					</div>

					<button
						type="button"
						onClick={handleAddCanal}
						className="min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1 shadow-sm transition-all cursor-pointer"
					>
						<Plus size={14} />
						<span>+ Канал</span>
					</button>
				</div>

				{/* ═══ 3. MAIN CANAL LIST (SCROLLABLE) ═══ */}
				<div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
					{canals.map((canal, idx) => {
						const isSpokenRecent = lastSpokenCanal === canal.canalName;
						const isoCode = (String(canal.masterApicalFile).match(/\d+/) || ["25"])[0];
						const isoStyle = ISO_FILE_COLORS[isoCode] || {
							bg: "bg-slate-100 dark:bg-slate-800",
							text: "text-slate-900 dark:text-slate-100",
							border: "border-slate-300 dark:border-slate-700",
						};

						return (
							<div
								key={canal.id}
								className={`rounded-2xl border p-4 transition-all duration-200 ${
									isSpokenRecent
										? "border-red-500 ring-2 ring-red-500/20 bg-red-500/5"
										: "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700"
								}`}
							>
								{/* Canal Card Header */}
								<div className="flex items-center justify-between mb-3">
									<div className="flex items-center gap-2">
										<span className="w-6 h-6 rounded-lg bg-red-500 text-white text-xs font-black flex items-center justify-center shadow-xs">
											{idx + 1}
										</span>
										<select
											value={canal.canalName}
											onChange={(e) => handleUpdateCanal(canal.id, { canalName: e.target.value })}
											className="font-bold text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 focus:ring-2 focus:ring-red-500 focus:outline-none"
										>
											{CANAL_NAME_OPTIONS.map((opt) => (
												<option key={opt.value} value={opt.value}>
													{opt.label}
												</option>
											))}
										</select>
										<span className="text-xs text-slate-400 font-mono">
											{canal.referencePoint ? canal.referencePoint.slice(0, 20) : ""}
										</span>
									</div>

									<button
										type="button"
										onClick={() => handleRemoveCanal(canal.id)}
										title="Удалить канал"
										className="min-w-[44px] min-h-[44px] text-slate-400 hover:text-red-500 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center justify-center transition-colors cursor-pointer"
									>
										<Trash2 size={16} />
									</button>
								</div>

								{/* Canal Interactive Controls Matrix */}
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
									{/* A. Рабочая длина (WL, мм) */}
									<div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-200 dark:border-slate-800 shadow-2xs">
										<label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
											Рабочая длина (WL, мм)
										</label>
										<div className="flex items-center gap-1.5">
											<button
												type="button"
												onClick={() => handleAdjustLength(canal.id, -0.5)}
												className="min-w-[44px] min-h-[44px] rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold flex items-center justify-center transition-colors cursor-pointer"
												title="-0.5 мм"
											>
												<Minus size={16} />
											</button>
											<div className="flex-1 relative">
												<input
													type="number"
													step="0.5"
													min="10"
													max="35"
													value={canal.workingLengthMm}
													placeholder="—"
													onChange={(e) =>
														handleUpdateCanal(canal.id, {
															workingLengthMm: parseFloat(e.target.value) || e.target.value,
														})
													}
													className="w-full text-center text-lg font-black bg-transparent border border-slate-200 dark:border-slate-700 rounded-xl py-2 focus:ring-2 focus:ring-red-500 focus:outline-none min-h-[44px]"
												/>
												<span className="absolute right-3 top-3 text-xs font-bold text-slate-400 pointer-events-none">
													мм
												</span>
											</div>
											<button
												type="button"
												onClick={() => handleAdjustLength(canal.id, 0.5)}
												className="min-w-[44px] min-h-[44px] rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold flex items-center justify-center transition-colors cursor-pointer"
												title="+0.5 мм"
											>
												<Plus size={16} />
											</button>
										</div>

										{/* Quick Length Chips (1-tap fast input) */}
										<div className="flex items-center gap-1 mt-2 flex-wrap">
											{QUICK_LENGTH_PRESETS.map((presetLen) => (
												<button
													key={presetLen}
													type="button"
													onClick={() => handleUpdateCanal(canal.id, { workingLengthMm: presetLen })}
													className={`min-h-[30px] px-2 py-0.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
														Number(canal.workingLengthMm) === presetLen
															? "bg-red-600 text-white shadow-xs"
															: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
													}`}
													title={`Установить ${presetLen} мм`}
												>
													{presetLen}
												</button>
											))}
										</div>
									</div>

									{/* B. Мастер-апикальный файл (MAF / ISO) */}
									<div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-200 dark:border-slate-800 shadow-2xs">
										<div className="flex items-center justify-between mb-1.5">
											<label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
												Апикальный упор (MAF)
											</label>
											<span
												className={`text-xs font-black px-2 py-0.5 rounded-md border ${isoStyle.bg} ${isoStyle.text} ${isoStyle.border}`}
											>
												ISO {isoCode}
											</span>
										</div>
										<select
											value={canal.masterApicalFile}
											onChange={(e) => handleUpdateCanal(canal.id, { masterApicalFile: e.target.value })}
											className="w-full text-sm font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 focus:ring-2 focus:ring-red-500 focus:outline-none min-h-[44px]"
										>
											{MAF_ISO_OPTIONS.map((opt) => (
												<option key={opt} value={opt}>
													{opt}
												</option>
											))}
										</select>
									</div>

									{/* C. Конусность инструмента (Taper) */}
									<div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-200 dark:border-slate-800 shadow-2xs">
										<label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
											Конусность (Taper)
										</label>
										<select
											value={canal.taper}
											onChange={(e) => handleUpdateCanal(canal.id, { taper: e.target.value })}
											className="w-full text-sm font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 focus:ring-2 focus:ring-red-500 focus:outline-none min-h-[44px]"
										>
											{TAPER_OPTIONS.map((opt) => (
												<option key={opt} value={opt}>
													{opt}
												</option>
											))}
										</select>
									</div>

									{/* D. Реперный ориентир */}
									<div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-200 dark:border-slate-800 shadow-2xs">
										<label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
											Реперный ориентир
										</label>
										<select
											value={canal.referencePoint}
											onChange={(e) => handleUpdateCanal(canal.id, { referencePoint: e.target.value })}
											className="w-full text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-2 focus:ring-2 focus:ring-red-500 focus:outline-none min-h-[44px]"
										>
											{REFERENCE_POINT_OPTIONS.map((opt) => (
												<option key={opt} value={opt}>
													{opt}
												</option>
											))}
										</select>
									</div>

									{/* E. Обтурация и силер (2 колонки) */}
									<div className="sm:col-span-2 bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-200 dark:border-slate-800 shadow-2xs">
										<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
											<div>
												<label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
													Метод обтурации
												</label>
												<select
													value={canal.obturationTechnique}
													onChange={(e) =>
														handleUpdateCanal(canal.id, {
															obturationTechnique: e.target.value,
														})
													}
													className="w-full text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-2 focus:ring-2 focus:ring-sky-500 focus:outline-none min-h-[44px]"
												>
													{OBTURATION_TECHNIQUE_OPTIONS.map((opt) => (
														<option key={opt} value={opt}>
															{opt}
														</option>
													))}
												</select>
											</div>

											<div>
												<label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
													Силер
												</label>
												<input
													type="text"
													value={canal.sealer || "AH Plus"}
													onChange={(e) =>
														handleUpdateCanal(canal.id, { sealer: e.target.value })
													}
													placeholder="AH Plus / BioRoot RCS"
													className="w-full text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 focus:ring-2 focus:ring-sky-500 focus:outline-none min-h-[44px]"
												/>
											</div>
										</div>
									</div>
								</div>
							</div>
						);
					})}

					{/* Add Canal Button */}
					<button
						type="button"
						onClick={handleAddCanal}
						className="w-full py-3 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-red-500 dark:hover:border-red-500 rounded-2xl text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 flex items-center justify-center gap-2 transition-colors min-h-[48px] cursor-pointer"
					>
						<Plus size={16} />
						<span>Добавить корневой канал (MB3 / DB2 / Radix)</span>
					</button>

					{/* ═══ 4. CLINICAL PROTOCOL EXTRA ACCORDIONS ═══ */}
					<div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 p-4 space-y-3">
						<h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
							Протокол антисептики и рентген-контроля
						</h3>

						<div>
							<label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
								Инструментальная система (NiTi ProTaper / WaveOne)
							</label>
							<input
								type="text"
								value={rotarySystem}
								onChange={(e) => setRotarySystem(e.target.value)}
								className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 focus:ring-2 focus:ring-red-500 focus:outline-none"
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
								className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 focus:ring-2 focus:ring-red-500 focus:outline-none"
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
								className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 focus:ring-2 focus:ring-red-500 focus:outline-none"
							/>
						</div>
					</div>
				</div>

				{/* ═══ 5. BOTTOM ACTIONS BAR (TIER 1 / HOT ACCESS) ═══ */}
				<div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
					<div className="flex items-center gap-2 w-full sm:w-auto">
						<button
							type="button"
							onClick={handleInsertToProtocol}
							className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold text-xs sm:text-sm shadow-md shadow-red-500/20 flex items-center justify-center gap-2 transition-all min-h-[44px] cursor-pointer"
							title="Вставить протокол эндодонтии в медицинскую карту 043/у"
						>
							<Sparkles size={16} />
							<span>1 клик в протокол 043/у</span>
						</button>
					</div>

					<div className="flex items-center gap-2 w-full sm:w-auto justify-end">
						<button
							type="button"
							onClick={onClose}
							className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs sm:text-sm font-semibold transition-colors min-h-[44px] cursor-pointer"
						>
							Отмена
						</button>
						<button
							type="button"
							disabled={isSaving}
							onClick={handleSave}
							className="px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white font-bold text-xs sm:text-sm shadow-sm flex items-center justify-center gap-2 transition-colors min-h-[44px] cursor-pointer disabled:opacity-50"
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
