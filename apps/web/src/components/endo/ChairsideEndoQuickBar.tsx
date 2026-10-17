import React, { useState, useMemo, useCallback } from "react";
import {
	Check,
	CheckCheck,
	ChevronDown,
	FileText,
	Maximize2,
	Plus,
	RotateCcw,
	ShieldCheck,
	Sparkles,
	Trash2,
	Zap,
} from "lucide-react";
import type { EndoCanalData } from "@dental/shared";
import { showToast } from "../GlobalToast";
import { useVisitStore } from "../../store/visitStore";
import { getToothAnatomicalNameRu } from "../../lib/clinicalProtocols043";
import { getDefaultCanalsForTooth } from "./endoCanalConstants";

export interface ChairsideEndoQuickBarProps {
	readonly activeTooth?: number | undefined;
	readonly toothState?: string | undefined;
	readonly patientId?: string | undefined;
	readonly isLocked?: boolean | undefined;
	readonly onInsertToDiary?: ((soapText: string, canals: EndoCanalData[]) => void) | undefined;
	readonly onOpenFullModal?: (() => void) | undefined;
	readonly className?: string | undefined;
}

export interface QuickCanalState {
	id: string;
	name: string;
	workingLengthMm: number;
	masterApicalFile: string;
	taper: string;
	obturationType: "gutta_sealer" | "temp_caoh2";
	sealer: string;
	isObliterated?: boolean;
}

const QUICK_LENGTH_CHIPS = [19, 20, 21, 21.5, 22] as const;

const QUICK_MAF_OPTIONS = [
	{ label: "25/.04", maf: "#25", taper: ".04", colorBg: "bg-rose-500", textBg: "text-white" },
	{ label: "30/.04", maf: "#30", taper: ".04", colorBg: "bg-blue-500", textBg: "text-white" },
	{ label: "25/.06", maf: "#25", taper: ".06", colorBg: "bg-rose-600", textBg: "text-white" },
	{ label: "20/.04", maf: "#20", taper: ".04", colorBg: "bg-amber-400", textBg: "text-slate-900" },
] as const;

/**
 * Определение анатомических каналов по First Principles для компактного бара у кресла:
 * В/Ч моляры (16, 17, 18, 26, 27, 28): MB, DB, P
 * Н/Ч моляры (36, 37, 38, 46, 47, 48): M, D (или MB, ML, D)
 * В/Ч премоляры (14, 24): B, P
 * Остальные: Основной (Main)
 */
export function getChairsideDefaultCanals(toothNumber: number): QuickCanalState[] {
	const isUpperMolar =
		(toothNumber >= 16 && toothNumber <= 18) || (toothNumber >= 26 && toothNumber <= 28);
	const isLowerMolar =
		(toothNumber >= 36 && toothNumber <= 38) || (toothNumber >= 46 && toothNumber <= 48);
	const isUpperPremolar = toothNumber === 14 || toothNumber === 24;

	if (isUpperMolar) {
		return [
			{
				id: `c-mb-${Date.now()}-1`,
				name: "MB",
				workingLengthMm: 21.5,
				masterApicalFile: "#25",
				taper: ".04",
				obturationType: "gutta_sealer",
				sealer: "AH Plus",
			},
			{
				id: `c-db-${Date.now()}-2`,
				name: "DB",
				workingLengthMm: 20.0,
				masterApicalFile: "#25",
				taper: ".04",
				obturationType: "gutta_sealer",
				sealer: "AH Plus",
			},
			{
				id: `c-p-${Date.now()}-3`,
				name: "P",
				workingLengthMm: 22.0,
				masterApicalFile: "#30",
				taper: ".04",
				obturationType: "gutta_sealer",
				sealer: "AH Plus",
			},
		];
	}

	if (isLowerMolar) {
		return [
			{
				id: `c-m-${Date.now()}-1`,
				name: "M",
				workingLengthMm: 21.0,
				masterApicalFile: "#25",
				taper: ".04",
				obturationType: "gutta_sealer",
				sealer: "AH Plus",
			},
			{
				id: `c-d-${Date.now()}-2`,
				name: "D",
				workingLengthMm: 21.5,
				masterApicalFile: "#30",
				taper: ".04",
				obturationType: "gutta_sealer",
				sealer: "AH Plus",
			},
		];
	}

	if (isUpperPremolar) {
		return [
			{
				id: `c-b-${Date.now()}-1`,
				name: "B",
				workingLengthMm: 21.5,
				masterApicalFile: "#25",
				taper: ".04",
				obturationType: "gutta_sealer",
				sealer: "AH Plus",
			},
			{
				id: `c-p-${Date.now()}-2`,
				name: "P",
				workingLengthMm: 21.5,
				masterApicalFile: "#25",
				taper: ".04",
				obturationType: "gutta_sealer",
				sealer: "AH Plus",
			},
		];
	}

	// По умолчанию 1 канал (резцы, клыки, нижние премоляры)
	return [
		{
			id: `c-main-${Date.now()}-1`,
			name: "Основной",
			workingLengthMm: 22.0,
			masterApicalFile: "#30",
			taper: ".04",
			obturationType: "gutta_sealer",
			sealer: "AH Plus",
		},
	];
}

export function ChairsideEndoQuickBar({
	activeTooth: propActiveTooth,
	toothState,
	patientId,
	isLocked = false,
	onInsertToDiary,
	onOpenFullModal,
	className = "",
}: ChairsideEndoQuickBarProps) {
	const storeActiveTooth = useVisitStore((s) => s.activeToothNumber);
	const effectiveTooth = propActiveTooth || storeActiveTooth || 16;
	const [activeTooth, setActiveTooth] = useState<number>(effectiveTooth);

	React.useEffect(() => {
		if (propActiveTooth && propActiveTooth > 0) {
			setActiveTooth(propActiveTooth);
		} else if (storeActiveTooth && storeActiveTooth > 0) {
			setActiveTooth(storeActiveTooth);
		}
	}, [propActiveTooth, storeActiveTooth]);

	const [canals, setCanals] = useState<QuickCanalState[]>(() =>
		getChairsideDefaultCanals(effectiveTooth),
	);

	// Пересчитываем каналы при переключении зуба
	React.useEffect(() => {
		setCanals(getChairsideDefaultCanals(activeTooth));
	}, [activeTooth]);

	const toothAnatomicalName = useMemo(() => {
		return getToothAnatomicalNameRu(activeTooth);
	}, [activeTooth]);

	// Обновление параметров конкретного канала
	const handleUpdateCanal = useCallback(
		(id: string, updates: Partial<QuickCanalState>) => {
			setCanals((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
		},
		[],
	);

	// Корректировка длины шагом 0.5 мм (в диапазоне 0..40 мм)
	const handleAdjustLength = useCallback((id: string, delta: number) => {
		setCanals((prev) =>
			prev.map((c) => {
				if (c.id !== id) return c;
				const next = Math.max(0, Math.min(40, Math.round((c.workingLengthMm + delta) * 2) / 2));
				return { ...c, workingLengthMm: next, isObliterated: false };
			}),
		);
	}, []);

	// Переключение облитерации (Мандат 8e: Doctor Autonomy)
	const handleToggleObliterated = useCallback((id: string) => {
		setCanals((prev) =>
			prev.map((c) => {
				if (c.id !== id) return c;
				const nextObliterated = !c.isObliterated;
				return {
					...c,
					isObliterated: nextObliterated,
					workingLengthMm: nextObliterated ? 0 : (c.workingLengthMm || 21.0),
				};
			}),
		);
	}, []);

	// Добавление канала (например MB2)
	const handleAddCanal = useCallback(() => {
		const existingNames = new Set(canals.map((c) => c.name.toUpperCase()));
		let newName = "Канал";
		if (!existingNames.has("MB2") && canals.some((c) => c.name.toUpperCase().includes("MB"))) {
			newName = "MB2";
		} else if (!existingNames.has("ML") && canals.some((c) => c.name.toUpperCase() === "M")) {
			newName = "ML";
		} else {
			newName = `K${canals.length + 1}`;
		}

		setCanals((prev) => [
			...prev,
			{
				id: `c-added-${Date.now()}`,
				name: newName,
				workingLengthMm: 20.5,
				masterApicalFile: "#25",
				taper: ".04",
				obturationType: "gutta_sealer",
				sealer: "AH Plus",
			},
		]);
	}, [canals]);

	// Удаление канала
	const handleRemoveCanal = useCallback((id: string) => {
		setCanals((prev) => (prev.length > 1 ? prev.filter((c) => c.id !== id) : prev));
	}, []);

	// 1-Click Экспресс-пресеты
	const handleApplyPulpitis1VisitPreset = useCallback(() => {
		setCanals((prev) =>
			prev.map((c) => ({
				...c,
				workingLengthMm: 21.5,
				masterApicalFile: "#25",
				taper: ".04",
				obturationType: "gutta_sealer",
				sealer: "AH Plus",
			})),
		);
		showToast("Применён экспресс-пресет: Пульпит в 1 визит (21.5 мм · 25/.04 · AH Plus)", "success");
	}, []);

	const handleApplyCaOh2Preset = useCallback(() => {
		setCanals((prev) =>
			prev.map((c) => ({
				...c,
				obturationType: "temp_caoh2",
				sealer: "Каласепт (Ca(OH)2)",
			})),
		);
		showToast("Применён экспресс-пресет: Временная обтурация Ca(OH)2 на 14 дней", "info");
	}, []);

	const handleApplyAnatomicalNorm = useCallback(() => {
		setCanals(getChairsideDefaultCanals(activeTooth));
		showToast(`Каналы зуба #${activeTooth} сброшены к анатомической норме`, "info");
	}, [activeTooth]);

	// Генерация лаконичного SOAP протокола эндодонтии
	const generateSoapEndoProtocol = useCallback((): string => {
		const isTemp = canals.every((c) => c.obturationType === "temp_caoh2");
		const canalsReport = canals
			.map((c) => {
				if (c.isObliterated) {
					return `• Канал ${c.name}: ОБЛИТЕРИРОВАН / не найден (устье склерозировано)`;
				}
				const obt =
					c.obturationType === "temp_caoh2"
						? `временная паста ${c.sealer || "Ca(OH)2"}`
						: `гуттаперча + силер (${c.sealer || "AH Plus"})`;
				return `• Канал ${c.name}: WL = ${c.workingLengthMm.toFixed(1)} мм (Apex 0.0), MAF = ${c.masterApicalFile}/${c.taper}, обтурация: ${obt}`;
			})
			.join("\n");

		const diagnosisRu = toothState || (isTemp ? "Периодонтит / Пульпит" : "Пульпит");

		return [
			`[ПРОТОКОЛ ЭНДОДОНТИИ: ЗУБ #${activeTooth} (${toothAnatomicalName})]`,
			`S: Жалобы на боли от температурных раздражителей и дискомфорт при накусывании.`,
			`O: Проведена анестезия, изоляция операционного поля. Препарирование кариозной полости, раскрытие полости зуба #${activeTooth}.`,
			`Корневые каналы:`,
			canalsReport,
			`Ирригация: 3% раствор гипохлорита натрия (NaOCl) и 17% EDTA с ультразвуковой активацией.`,
			`A: ${diagnosisRu} зуба #${activeTooth}.`,
			isTemp
				? `P: Каналы высушены бумажными штифтами, временно обтурированы пастой гидроксида кальция. Поставлена герметичная временная пломба. Назначен повторный приём.`
				: `P: Каналы высушены, проведена постоянная обтурация до физиологического верхушечного отверстия. Контрольная визиография: каналы гомогенно обтурированы до апекса. Герметичная реставрация.`,
		].join("\n");
	}, [activeTooth, toothAnatomicalName, canals, toothState]);

	// Мгновенная интеграция с Дневником визита (Мандат 8e: Doctor Autonomy)
	const handleTransferToDiary = useCallback(() => {
		const soapProtocol = generateSoapEndoProtocol();

		// 1. Обновление формы дневника через useVisitStore
		try {
			useVisitStore.getState().setVisitNoteForm((prev) => {
				const existingObj = prev.objectiveStatus?.trim() || "";
				const existingPlan = prev.treatmentPlan?.trim() || "";
				const newObjective = existingObj
					? `${existingObj}\n\n${soapProtocol}`
					: soapProtocol;
				const planSummary = `Эндодонтическое лечение зуба #${activeTooth} (${canals.map((c) => c.name).join(", ")})`;
				const newPlan =
					existingPlan && !existingPlan.includes(planSummary)
						? `${existingPlan}\n${planSummary}`
						: existingPlan || planSummary;

				return {
					...prev,
					objectiveStatus: newObjective,
					treatmentPlan: newPlan,
				};
			});
		} catch {
			// safe fallback
		}

		// 2. Диспатч системного события для внешних подписчиков дневника
		try {
			window.dispatchEvent(
				new CustomEvent("dente-apply-soap-protocol", {
					detail: {
						soap: {
							treatmentDescription: soapProtocol,
						},
						mode: "smart_append",
					},
				}),
			);
		} catch {
			// safe fallback
		}

		// 3. Вызов коллбека родителя
		const sharedCanals: EndoCanalData[] = canals.map((c) => ({
			id: c.id,
			canalName: c.name,
			referencePoint: "Бугор",
			workingLengthMm: c.isObliterated ? 0 : c.workingLengthMm,
			masterApicalFile: c.masterApicalFile,
			taper: c.taper,
			isObliterated: Boolean(c.isObliterated),
			obturationTechnique:
				c.obturationType === "temp_caoh2"
					? "Временная обтурация Ca(OH)2"
					: "Латеральная компакция",
			sealer: c.sealer,
		}));

		if (onInsertToDiary) {
			onInsertToDiary(soapProtocol, sharedCanals);
		}

		showToast(
			`Протокол эндодонтии зуба #${activeTooth} перенесён в дневник визита!`,
			"success",
			3000,
		);
	}, [activeTooth, canals, generateSoapEndoProtocol, onInsertToDiary]);

	return (
		<div
			className={`border border-[var(--line,#e2e8f0)] dark:border-slate-800 rounded-2xl bg-[var(--paper,#ffffff)] dark:bg-slate-900/90 shadow-xs overflow-hidden ${className}`}
			data-testid="chairside-endo-quickbar"
		>
			{/* Верхняя компактная плашка: Зуб, диагноз, экспресс-пресеты */}
			<div className="flex flex-wrap items-center justify-between gap-2 p-2.5 sm:p-3 border-b border-[var(--line,#e2e8f0)] dark:border-slate-800 bg-[var(--surface,#f8fafc)] dark:bg-slate-800/60">
				<div className="flex items-center gap-2 min-w-0">
					<div className="w-8 h-8 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0">
						<Zap size={16} />
					</div>
					<div className="min-w-0">
						<div className="flex items-center gap-1.5 flex-wrap">
							<span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-rose-700 dark:text-rose-300">
								Протокол эндодонтии
							</span>
							<span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-500/30">
								Зуб #{activeTooth}
							</span>
							{toothState && (
								<span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-500/30 truncate max-w-[140px]">
									{toothState}
								</span>
							)}
						</div>
						<div className="text-xs font-bold text-[var(--ink,#0f172a)] dark:text-white truncate">
							{toothAnatomicalName}
						</div>
					</div>
				</div>

				{/* 1-Click Пресеты в шапке бара */}
				<div className="flex items-center gap-1.5 flex-wrap">
					<button
						type="button"
						onClick={handleApplyPulpitis1VisitPreset}
						data-testid="btn-quick-pulpitis-1visit"
						className="primary-button min-h-[32px] h-8 px-2.5 text-xs font-bold rounded-lg bg-[var(--teal,#0d9488)] hover:brightness-110 text-white flex items-center gap-1 transition-all cursor-pointer shadow-2xs active:scale-98"
						title="Пульпит в 1 визит (21.5 мм · 25/.04 · AH Plus)"
					>
						<Check size={13} />
						<span className="hidden sm:inline">Пульпит 1 визит</span>
						<span className="sm:hidden">Пульпит</span>
					</button>

					<button
						type="button"
						onClick={handleApplyCaOh2Preset}
						data-testid="btn-quick-caoh2"
						className="secondary-button min-h-[32px] h-8 px-2 text-xs font-bold rounded-lg bg-amber-600 hover:bg-amber-500 text-white flex items-center gap-1 transition-all cursor-pointer shadow-2xs active:scale-98"
						title="Временная повязка гидроксида кальция Ca(OH)2"
					>
						<ShieldCheck size={13} />
						<span className="hidden sm:inline">Временная Ca(OH)2</span>
						<span className="sm:hidden">Ca(OH)2</span>
					</button>

					<button
						type="button"
						onClick={handleApplyAnatomicalNorm}
						data-testid="btn-quick-norm"
						className="secondary-button min-h-[32px] h-8 px-2 text-xs font-bold rounded-lg bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-slate-200 border border-[var(--line,#cbd5e1)] dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1 transition-all cursor-pointer"
						title="Сброс каналов к анатомической норме"
					>
						<RotateCcw size={12} />
						<span className="hidden sm:inline">Норма</span>
					</button>

					{onOpenFullModal && (
						<button
							type="button"
							onClick={onOpenFullModal}
							data-testid="btn-open-full-endo-modal"
							className="secondary-button min-h-[32px] h-8 px-2 text-xs font-bold rounded-lg bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] dark:hover:text-white border border-[var(--line,#cbd5e1)] dark:border-slate-700 flex items-center gap-1 transition-all cursor-pointer"
							title="Открыть полный журнал каналов с визиографией и печатью карты"
						>
							<Maximize2 size={12} />
							<span className="hidden md:inline">Полный журнал</span>
						</button>
					)}
				</div>
			</div>

			{/* Список каналов зуба: ввод в 1 клик для каждого канала */}
			<div className="p-2.5 sm:p-3 divide-y divide-[var(--line,#e2e8f0)] dark:divide-slate-800/80 space-y-2.5">
				{canals.map((c, index) => (
					<div
						key={c.id}
						className={`pt-2.5 first:pt-0 flex flex-col md:flex-row md:items-center justify-between gap-2.5 ${
							index > 0 ? "pt-2.5" : ""
						}`}
						data-testid={`endo-canal-row-${c.name}`}
					>
						{/* Имя канала и апекс-статус */}
						<div className="flex items-center gap-2 shrink-0 min-w-[120px]">
							<span className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20 font-black text-xs font-mono flex items-center justify-center shrink-0">
								{c.name}
							</span>
							<div className="flex flex-col">
								<div className="flex items-center gap-1.5">
									<span className="text-xs font-bold text-[var(--ink,#0f172a)] dark:text-white leading-tight">
										Канал {c.name}
									</span>
									{/* 1-Click Облитерация канала у кресла */}
									<button
										type="button"
										onClick={() => handleToggleObliterated(c.id)}
										data-testid={`chip-obliterated-${c.name}`}
										className={`secondary-button px-1.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
											c.isObliterated
												? "bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/50"
												: "text-[var(--muted,#64748b)] hover:text-amber-700 dark:hover:text-amber-300 border border-transparent"
										}`}
										title="Отметить канал как облитерированный / склерозированный"
									>
										{c.isObliterated ? "⚠️ Облитерирован" : "Облитерация?"}
									</button>
								</div>
								<span className={`text-[10px] font-mono font-bold flex items-center gap-0.5 ${c.isObliterated ? "text-amber-600 dark:text-amber-400" : "text-[var(--teal,#0d9488)]"}`}>
									<CheckCheck size={11} />
									{c.isObliterated ? "Облитерирован (0 мм)" : `Apex 0.0 (${c.workingLengthMm.toFixed(1)} мм)`}
								</span>
							</div>
						</div>

						{/* Параметр 1: Длина по апекслокатору (WL) в 1 клик */}
						<div className="flex items-center gap-1.5 flex-wrap">
							<span className="text-[11px] font-bold text-[var(--muted,#64748b)] hidden lg:inline">
								Длина:
							</span>
							{c.isObliterated ? (
								<div className="flex items-center gap-1.5 py-0.5">
									<span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-500/40">
										0 мм (Склероз)
									</span>
									<button
										type="button"
										onClick={() => handleToggleObliterated(c.id)}
										className="secondary-button text-[10px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline cursor-pointer"
									>
										Снять
									</button>
								</div>
							) : (
								<>
									<div className="flex items-center gap-1 bg-[var(--surface,#f1f5f9)] dark:bg-slate-800/80 p-0.5 rounded-lg border border-[var(--line,#e2e8f0)] dark:border-slate-700">
										<button
											type="button"
											onClick={() => handleAdjustLength(c.id, -0.5)}
											className="secondary-button icon-button w-6 h-6 rounded text-xs font-bold bg-[var(--paper,#ffffff)] dark:bg-slate-700 text-[var(--ink,#0f172a)] dark:text-white hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors flex items-center justify-center cursor-pointer"
											title="-0.5 мм"
										>
											-
										</button>
										<span className="px-1.5 text-xs font-mono font-black text-rose-600 dark:text-rose-400 min-w-[38px] text-center">
											{c.workingLengthMm.toFixed(1)}
										</span>
										<button
											type="button"
											onClick={() => handleAdjustLength(c.id, 0.5)}
											className="secondary-button icon-button w-6 h-6 rounded text-xs font-bold bg-[var(--paper,#ffffff)] dark:bg-slate-700 text-[var(--ink,#0f172a)] dark:text-white hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors flex items-center justify-center cursor-pointer"
											title="+0.5 мм"
										>
											+
										</button>
									</div>

									{/* Чипы быстрого выбора длины: 19, 20, 21, 21.5, 22 мм */}
									<div className="flex items-center gap-1">
										{QUICK_LENGTH_CHIPS.map((len) => {
											const isSel = c.workingLengthMm === len;
											return (
												<button
													key={len}
													type="button"
													onClick={() => handleUpdateCanal(c.id, { workingLengthMm: len, isObliterated: false })}
													data-testid={`chip-length-${c.name}-${len}`}
													className={`secondary-button min-h-[28px] h-7 px-2 text-xs font-mono font-bold rounded-lg border transition-all cursor-pointer active:scale-95 ${
														isSel
															? "bg-rose-600 text-white border-rose-600 shadow-2xs"
															: "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 shadow-2xs"
													}`}
													title={`Установить длину ${len} мм`}
												>
													{len}
												</button>
											);
										})}
									</div>
								</>
							)}
						</div>

						{/* Параметр 2: Мастер-файл (MAF: 25/.04, 30/.04, 25/.06, 20/.04) */}
						<div className="flex items-center gap-1.5 flex-wrap">
							<span className="text-[11px] font-bold text-[var(--muted,#64748b)] hidden lg:inline">
								MAF:
							</span>
							<div className="flex items-center gap-1">
								{QUICK_MAF_OPTIONS.map((opt) => {
									const isSel =
										c.masterApicalFile === opt.maf && c.taper === opt.taper;
									return (
										<button
											key={opt.label}
											type="button"
											onClick={() =>
												handleUpdateCanal(c.id, {
													masterApicalFile: opt.maf,
													taper: opt.taper,
												})
											}
											data-testid={`chip-maf-${c.name}-${opt.label.replace(/[^a-z0-9]/gi, "")}`}
											className={`secondary-button min-h-[28px] h-7 px-2 text-xs font-mono font-bold rounded-lg border transition-all cursor-pointer flex items-center gap-1 active:scale-95 ${
												isSel
													? "bg-[var(--teal,#0d9488)] text-white border-[var(--teal,#0d9488)] shadow-2xs"
													: "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 shadow-2xs"
											}`}
											title={`Мастер-файл ${opt.label}`}
										>
											<span className={`w-2 h-2 rounded-full ${opt.colorBg}`} />
											<span>{opt.label}</span>
										</button>
									);
								})}
							</div>
						</div>

						{/* Параметр 3: Тип обтурации (Гуттаперча + силер vs Ca(OH)2) */}
						<div className="flex items-center gap-1.5 shrink-0">
							<div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-300 dark:border-slate-700">
								<button
									type="button"
									onClick={() =>
										handleUpdateCanal(c.id, {
											obturationType: "gutta_sealer",
											sealer: "AH Plus",
										})
									}
									data-testid={`chip-obturation-gutta-${c.name}`}
									className={`secondary-button min-h-[26px] h-6 px-2 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
										c.obturationType === "gutta_sealer"
											? "bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs border border-emerald-500/40"
											: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
									}`}
								>
									<span className="hidden sm:inline">Гуттаперча + AH Plus</span>
									<span className="sm:hidden">Гуттаперча</span>
								</button>
								<button
									type="button"
									onClick={() =>
										handleUpdateCanal(c.id, {
											obturationType: "temp_caoh2",
											sealer: "Каласепт (Ca(OH)2)",
										})
									}
									data-testid={`chip-obturation-caoh2-${c.name}`}
									className={`secondary-button min-h-[26px] h-6 px-2 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
										c.obturationType === "temp_caoh2"
											? "bg-white dark:bg-slate-700 text-amber-700 dark:text-amber-300 shadow-xs border border-amber-500/40"
											: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
									}`}
								>
									Ca(OH)2
								</button>
							</div>

							{canals.length > 1 && (
								<button
									type="button"
									onClick={() => handleRemoveCanal(c.id)}
									className="icon-button secondary-button w-7 h-7 rounded-lg text-[var(--muted,#64748b)] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center transition-colors cursor-pointer shrink-0"
									title="Удалить канал"
								>
									<Trash2 size={13} />
								</button>
							)}
						</div>
					</div>
				))}
			</div>

			{/* Нижняя панель действий: Добавить канал + Primary CTA «✓ Перенести в дневник» */}
			<div className="p-2.5 sm:p-3 border-t border-[var(--line,#e2e8f0)] dark:border-slate-800 bg-[var(--surface,#f8fafc)] dark:bg-slate-800/40 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={handleAddCanal}
						data-testid="btn-add-quick-canal"
						className="secondary-button min-h-[36px] sm:min-h-[38px] h-9 px-3 text-xs font-bold rounded-xl bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-slate-200 border border-[var(--line,#cbd5e1)] dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
					>
						<Plus size={14} className="text-rose-600 dark:text-rose-400" />
						<span>Добавить канал</span>
					</button>

					<span className="text-[11px] text-[var(--muted,#64748b)] font-medium hidden md:inline">
						Ирригация: 3% NaOCl + 17% EDTA с УЗ-активацией
					</span>
				</div>

				{/* Primary CTA: «Перенести в дневник» (Мандат 8e: Doctor Autonomy, никогда не disabled) */}
				<button
					type="button"
					onClick={handleTransferToDiary}
					data-testid="btn-endo-transfer-to-diary"
					className="primary-button min-h-[44px] h-10 px-4 sm:px-5 rounded-xl text-xs sm:text-sm font-black bg-rose-600 hover:bg-rose-500 active:scale-98 text-white flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer touch-manipulation"
					title="Перенести протокол эндодонтии в дневник визита"
				>
					<Check size={16} />
					<span>Перенести в дневник</span>
				</button>
			</div>
		</div>
	);
}
