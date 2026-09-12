/**
 * ═══════════════════════════════════════════════════════════════════════════
 * VISIT ENDODONTIC PROTOCOL WIDGET (CHAIRSIDE 30-SECOND WORKSPACE)
 * Fast 1-click Form 043/y Protocol Logging (Mandates 8e, 8k, 8n, 8d)
 * Zero Emojis | Touch Targets >= 44px | Full Odontogram & Visiograph Sync
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
	Activity,
	ChevronRight,
	FileText,
	Minus,
	Plus,
	RotateCcw,
	Ruler,
	ShieldCheck,
	Sliders,
	Sparkles,
	Zap,
} from "lucide-react";
import {
	type EndoCanalData,
	type EndoToothClinicalData,
	type EndoProtocolPreset,
	PRIMARY_ENDO_PRESET,
	RETREATMENT_ENDO_PRESET,
	OBTURATION_PERMANENT_PRESET,
	EXPRESS_APICAL_OBTURATION_PRESET,
	applyPrimaryEndoProtocol,
	applyRetreatmentEndoProtocol,
	applyObturationPermanentProtocol,
	applyExpressApicalEndoProtocol,
	applyAnatomicalWorkingLengths,
	getDefaultCanalsForTooth,
	generateEndoProtocol043,
	getIsoEndoColorInfo,
	QUICK_LENGTH_PRESETS,
} from "@dental/shared";
import { showToast } from "../../GlobalToast";
import { useVisitStore } from "../../../store/visitStore";
import { EndoCanalLogModal } from "../../endo/EndoCanalLogModal";

export interface VisitEndoProtocolWidgetProps {
	/** Активный номер зуба по FDI (по умолчанию 16) */
	readonly activeTooth?: number | null;
	/** Обработчик переключения зуба */
	readonly onSelectActiveTooth?: (tooth: number) => void;
	/** Обработчик прямой вставки текста протокола в дневник визита */
	readonly onApplyProtocolText?: (text: string) => void;
	/** Внешнее открытие расширенного модального окна */
	readonly onOpenFullModal?: () => void;
	/** Дополнительный CSS-класс */
	readonly className?: string;
}

export const VisitEndoProtocolWidget: React.FC<VisitEndoProtocolWidgetProps> = ({
	activeTooth = 16,
	onSelectActiveTooth,
	onApplyProtocolText,
	onOpenFullModal,
	className = "",
}) => {
	const effectiveTooth = activeTooth && activeTooth >= 11 && activeTooth <= 85 ? activeTooth : 16;

	// Состояние каналов для выбранного зуба
	const [canals, setCanals] = useState<EndoCanalData[]>(() =>
		getDefaultCanalsForTooth(effectiveTooth),
	);
	const [activePresetId, setActivePresetId] = useState<string>("primary_endo");
	const [irrigation, setIrrigation] = useState<string>(PRIMARY_ENDO_PRESET.irrigation);
	const [rotarySystem, setRotarySystem] = useState<string>(PRIMARY_ENDO_PRESET.rotarySystem);
	const [radiologyControl, setRadiologyControl] = useState<string>(PRIMARY_ENDO_PRESET.radiologyControl);
	const [isFullModalOpen, setIsFullModalOpen] = useState<boolean>(false);

	// При смене активного зуба загружаем анатомические каналы
	useEffect(() => {
		setCanals(getDefaultCanalsForTooth(effectiveTooth));
	}, [effectiveTooth]);

	// Слушатель событий от визиографа (прямая передача замеренной длины с контрольного снимка)
	useEffect(() => {
		const handleVisiographMeasurement = (e: CustomEvent<{ toothNumber: number; lengthMm: number; canalName?: string }>) => {
			if (!e.detail) return;
			const { toothNumber, lengthMm, canalName } = e.detail;
			if (toothNumber === effectiveTooth) {
				setCanals((prev) =>
					prev.map((c, idx) => {
						if (canalName && c.canalName.toLowerCase() === canalName.toLowerCase()) {
							return { ...c, workingLengthMm: lengthMm };
						}
						if (!canalName && idx === 0) {
							return { ...c, workingLengthMm: lengthMm };
						}
						return c;
					}),
				);
				showToast(
					`Визиограф: рабочая длина ${lengthMm.toFixed(1)} мм передана в зуб ${toothNumber}`,
					"success",
				);
			}
		};

		window.addEventListener("dente-endo-wl-measured" as any, handleVisiographMeasurement as EventListener);
		return () => {
			window.removeEventListener("dente-endo-wl-measured" as any, handleVisiographMeasurement as EventListener);
		};
	}, [effectiveTooth]);

	// Автозаполнение анатомической длины в 1 клик
	const handleAutofillAnatomicalNorm = useCallback(() => {
		const updated = applyAnatomicalWorkingLengths(canals, effectiveTooth);
		setCanals(updated);
		showToast(
			`Анатомическая норма длин каналов для зуба ${effectiveTooth} автозаполнена в 1 клик`,
			"success",
		);
	}, [canals, effectiveTooth]);

	// Применение быстрых протоколов (Первичное, Повторное, Постоянное, Экспресс)
	const handleApplyPreset = useCallback(
		(preset: EndoProtocolPreset) => {
			setActivePresetId(preset.id);
			setIrrigation(preset.irrigation);
			setRotarySystem(preset.rotarySystem);
			setRadiologyControl(preset.radiologyControl);

			let updatedCanals: EndoCanalData[] = [];
			switch (preset.id) {
				case "primary_endo": {
					const res = applyPrimaryEndoProtocol(canals, effectiveTooth);
					updatedCanals = res.canals;
					break;
				}
				case "retreatment_endo": {
					const res = applyRetreatmentEndoProtocol(canals, effectiveTooth);
					updatedCanals = res.canals;
					break;
				}
				case "obturation_permanent": {
					const res = applyObturationPermanentProtocol(canals, effectiveTooth);
					updatedCanals = res.canals;
					break;
				}
				case "express_apical": {
					const res = applyExpressApicalEndoProtocol(canals, effectiveTooth);
					updatedCanals = res.canals;
					break;
				}
				default:
					updatedCanals = canals.map((c) => ({
						...c,
						obturationTechnique: preset.obturationTechnique,
						sealer: preset.sealer,
						masterApicalFile: preset.masterApicalFile || c.masterApicalFile,
						taper: preset.taper || c.taper,
						notes: preset.notes,
					}));
			}

			setCanals(updatedCanals);
			showToast(`Применен 1-клик протокол: «${preset.shortLabelRu}»`, "success");
		},
		[canals, effectiveTooth],
	);

	// Быстрое изменение рабочей длины (+0.5 / -0.5 мм) с тач-таргетом >= 44px
	const handleStepLength = useCallback((canalId: string, delta: number) => {
		setCanals((prev) =>
			prev.map((c) => {
				if (c.id !== canalId) return c;
				const current = typeof c.workingLengthMm === "number" ? c.workingLengthMm : 21.0;
				const next = Math.max(10, Math.min(35, Math.round((current + delta) * 10) / 10));
				return { ...c, workingLengthMm: next };
			}),
		);
	}, []);

	// Установка длины через быстрый чип
	const handleSetQuickLength = useCallback((canalId: string, len: number) => {
		setCanals((prev) =>
			prev.map((c) => (c.id === canalId ? { ...c, workingLengthMm: len } : c)),
		);
	}, []);

	// Формирование структурированного текста для Формы 043/у
	const generatedProtocolText = useMemo(() => {
		return generateEndoProtocol043({
			toothNumber: effectiveTooth,
			rotarySystem,
			irrigation,
			radiologyControl,
			canals,
		});
	}, [effectiveTooth, rotarySystem, irrigation, radiologyControl, canals]);

	// Вставка протокола в активный дневник приема (useVisitStore) в 1 клик
	const handleInsertIntoVisitDiary = useCallback(() => {
		if (onApplyProtocolText) {
			onApplyProtocolText(generatedProtocolText);
		} else {
			try {
				useVisitStore.getState().setVisitNoteForm((prev) => {
					const existing = prev.objectiveStatus?.trim() || "";
					return {
						...prev,
						objectiveStatus: existing
							? `${existing}\n\n${generatedProtocolText}`
							: generatedProtocolText,
					};
				});
				showToast(
					`Протокол эндодонтии зуба ${effectiveTooth} успешно добавлен в Форму 043/у`,
					"success",
				);
			} catch (err) {
				console.error("Failed to update visitStore note", err);
				showToast("Протокол сформирован (скопирован в буфер)", "info");
				if (navigator.clipboard) {
					navigator.clipboard.writeText(generatedProtocolText);
				}
			}
		}
	}, [generatedProtocolText, onApplyProtocolText, effectiveTooth]);

	return (
		<section
			aria-label="Эндодонтический протокол визита"
			className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/90 ${className}`}
		>
			{/* ВЕРХНИЙ ТУЛБАР В 1 СТРОКУ (Мандат 8d: 32-36px, Хик) */}
			<div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
				<div className="flex items-center gap-2">
					<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-teal-600 dark:bg-teal-950/50 dark:text-teal-400">
						<Activity className="h-5 w-5" />
					</div>
					<div>
						<div className="flex items-center gap-2">
							<h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
								Эндодонтический протокол: Зуб {effectiveTooth}
							</h3>
							<span className="rounded bg-teal-100 px-1.5 py-0.5 text-xs font-medium text-teal-800 dark:bg-teal-900/60 dark:text-teal-300">
								{canals.length} {canals.length === 1 ? "канал" : canals.length < 5 ? "канала" : "каналов"}
							</span>
						</div>
						<p className="text-xs text-slate-500 dark:text-slate-400">
							Фиксация корневых каналов за 30 секунд без лишней бюрократии
						</p>
					</div>
				</div>

				<div className="flex items-center gap-2">
					{/* Кнопка автозаполнения нормы */}
					<button
						type="button"
						onClick={handleAutofillAnatomicalNorm}
						title="Автозаполнить анатомические длины для зуба"
						className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
					>
						<Ruler className="h-4 w-4 text-teal-600 dark:text-teal-400" />
						<span>Норма WL</span>
					</button>

					{/* Кнопка открытия расширенного модала */}
					<button
						type="button"
						onClick={() => (onOpenFullModal ? onOpenFullModal() : setIsFullModalOpen(true))}
						title="Открыть расширенный журнал каналов и инструментов"
						className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
					>
						<Sliders className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
						<span>Все опции</span>
					</button>
				</div>
			</div>

			{/* 1-КЛИК КЛИНИЧЕСКИЕ ПРОТОКОЛЫ (МАНДАТЫ 8e, 8k, 8n) */}
			<div className="mb-4">
				<div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
					1-Клик протоколы у кресла:
				</div>
				<div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
					{/* Первичное эндо */}
					<button
						type="button"
						onClick={() => handleApplyPreset(PRIMARY_ENDO_PRESET)}
						className={`flex min-h-[48px] flex-col justify-center rounded-lg border p-2.5 text-left transition ${
							activePresetId === "primary_endo"
								? "border-teal-500 bg-teal-50/80 text-teal-900 shadow-sm dark:border-teal-400 dark:bg-teal-950/40 dark:text-teal-200"
								: "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-slate-800"
						}`}
					>
						<div className="flex items-center gap-1.5 font-medium text-xs">
							<Sparkles className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
							<span>Первичное эндо</span>
						</div>
						<div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 truncate">
							ProTaper Gold + Ca(OH)2
						</div>
					</button>

					{/* Повторное эндо */}
					<button
						type="button"
						onClick={() => handleApplyPreset(RETREATMENT_ENDO_PRESET)}
						className={`flex min-h-[48px] flex-col justify-center rounded-lg border p-2.5 text-left transition ${
							activePresetId === "retreatment_endo"
								? "border-amber-500 bg-amber-50/80 text-amber-900 shadow-sm dark:border-amber-400 dark:bg-amber-950/40 dark:text-amber-200"
								: "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-slate-800"
						}`}
					>
						<div className="flex items-center gap-1.5 font-medium text-xs">
							<RotateCcw className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
							<span>Перелечивание</span>
						</div>
						<div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 truncate">
							D-RaCe + распломбировка
						</div>
					</button>

					{/* Постоянная обтурация */}
					<button
						type="button"
						onClick={() => handleApplyPreset(OBTURATION_PERMANENT_PRESET)}
						className={`flex min-h-[48px] flex-col justify-center rounded-lg border p-2.5 text-left transition ${
							activePresetId === "obturation_permanent"
								? "border-indigo-500 bg-indigo-50/80 text-indigo-900 shadow-sm dark:border-indigo-400 dark:bg-indigo-950/40 dark:text-indigo-200"
								: "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-slate-800"
						}`}
					>
						<div className="flex items-center gap-1.5 font-medium text-xs">
							<ShieldCheck className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
							<span>Обтурация каналов</span>
						</div>
						<div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 truncate">
							Компакция + AH Plus
						</div>
					</button>

					{/* Экспресс апекс */}
					<button
						type="button"
						onClick={() => handleApplyPreset(EXPRESS_APICAL_OBTURATION_PRESET)}
						className={`flex min-h-[48px] flex-col justify-center rounded-lg border p-2.5 text-left transition ${
							activePresetId === "express_apical"
								? "border-emerald-500 bg-emerald-50/80 text-emerald-900 shadow-sm dark:border-emerald-400 dark:bg-emerald-950/40 dark:text-emerald-200"
								: "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-slate-800"
						}`}
					>
						<div className="flex items-center gap-1.5 font-medium text-xs">
							<Zap className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
							<span>Экспресс до апекса</span>
						</div>
						<div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 truncate">
							Apex 0.0 + норма в 1 клик
						</div>
					</button>
				</div>
			</div>

			{/* КОМПАКТНАЯ ТАБЛИЦА КАНАЛОВ С ТАЧ-ТАРГЕТАМИ >= 44PX */}
			<div className="mb-4 space-y-2">
				<div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
					Измерения корневых каналов (WL / Репер / MAF):
				</div>

				<div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-slate-50/50 dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-800/30">
					{canals.map((c) => (
						<div
							key={c.id}
							className="flex flex-wrap items-center justify-between gap-3 p-2.5 transition hover:bg-slate-100/50 dark:hover:bg-slate-800/50"
						>
							<div className="flex items-center gap-2">
								<span className="flex h-7 w-12 items-center justify-center rounded bg-slate-200/70 font-mono text-xs font-bold text-slate-800 dark:bg-slate-700 dark:text-slate-200">
									{c.canalName}
								</span>
								<div className="text-xs text-slate-600 dark:text-slate-300">
									<div className="font-medium text-slate-800 dark:text-slate-200">
										{c.referencePoint || "Репер"}
									</div>
									<div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
										{(() => {
											const isoColor = getIsoEndoColorInfo(c.masterApicalFile);
											return isoColor ? (
												<span
													className={`inline-block h-2.5 w-2.5 rounded-full shrink-0 border ${
														isoColor.borderClass || "border-slate-300 dark:border-slate-600"
													}`}
													style={{ backgroundColor: isoColor.hex }}
													title={`${isoColor.labelRu} (${isoColor.colorRu})`}
												/>
											) : null;
										})()}
										<span>{c.masterApicalFile || "ISO 25"}</span>
										<span>•</span>
										<span>{c.taper || ".06"}</span>
									</div>
								</div>
							</div>

							{/* Степпер рабочей длины и быстрые чипы */}
							<div className="flex items-center gap-2">
								<div className="flex items-center rounded-lg border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-800">
									<button
										type="button"
										onClick={() => handleStepLength(c.id, -0.5)}
										title="Уменьшить на 0.5 мм"
										aria-label={`Уменьшить длину ${c.canalName}`}
										className="flex h-11 w-11 items-center justify-center text-slate-600 transition hover:bg-slate-100 active:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700"
									>
										<Minus className="h-4 w-4" />
									</button>
									<span className="w-14 text-center font-mono text-sm font-semibold text-slate-900 dark:text-slate-100">
										{c.workingLengthMm ? `${Number(c.workingLengthMm).toFixed(1)}` : "—"}
									</span>
									<button
										type="button"
										onClick={() => handleStepLength(c.id, 0.5)}
										title="Увеличить на 0.5 мм"
										aria-label={`Увеличить длину ${c.canalName}`}
										className="flex h-11 w-11 items-center justify-center text-slate-600 transition hover:bg-slate-100 active:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700"
									>
										<Plus className="h-4 w-4" />
									</button>
								</div>

								{/* Быстрые чипы длины */}
								<div className="hidden sm:flex items-center gap-1">
									{QUICK_LENGTH_PRESETS.slice(0, 5).map((len) => (
										<button
											key={len}
											type="button"
											onClick={() => handleSetQuickLength(c.id, len)}
											className={`min-h-[44px] min-w-[36px] rounded px-1.5 text-xs font-mono transition ${
												Number(c.workingLengthMm) === len
													? "bg-teal-600 font-bold text-white shadow-xs"
													: "bg-slate-200/70 text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
											}`}
										>
											{len}
										</button>
									))}
								</div>
							</div>
						</div>
					))}
				</div>
			</div>

			{/* КНОПКА СОХРАНЕНИЯ В ДНЕВНИК 043/у (ТАЧ-ТАРГЕТ >= 44PX, МАНДАТ 8D) */}
			<div className="flex flex-wrap items-center justify-between gap-3 pt-2">
				<div className="text-xs text-slate-500 dark:text-slate-400">
					{radiologyControl.includes("Apex 0.0")
						? "Контроль: Апекслокатор Apex 0.0 + RVG"
						: "Ирригация: 3% NaOCl + 17% EDTA с УЗ-активацией"}
				</div>

				<button
					type="button"
					onClick={handleInsertIntoVisitDiary}
					className="inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 font-medium text-sm text-white shadow-sm transition hover:bg-teal-700 active:scale-[0.98] dark:bg-teal-500 dark:hover:bg-teal-600"
				>
					<FileText className="h-4 w-4" />
					<span>Вставить протокол эндодонтии в 043/у</span>
					<ChevronRight className="h-4 w-4 opacity-70" />
				</button>
			</div>

			{/* ВСТРОЕННЫЙ МОДАЛ ДЛЯ ДЕТАЛЬНОГО РЕДАКТИРОВАНИЯ ВСЕХ ОПЦИЙ */}
			{isFullModalOpen && (
				<EndoCanalLogModal
					isOpen={isFullModalOpen}
					onClose={() => setIsFullModalOpen(false)}
					toothNumber={effectiveTooth}
					initialCanals={canals}
					onSave={(savedCanals, noteText) => {
						setCanals(savedCanals);
						setIsFullModalOpen(false);
						if (noteText && onApplyProtocolText) {
							onApplyProtocolText(noteText);
						}
					}}
				/>
			)}
		</section>
	);
};
