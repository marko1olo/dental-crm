/**
 * RadiologyPatientSearchModal.tsx — Тактильная матрица поиска EzDent-i в 2 клика (Снимок 19).
 *
 * Архитектурные стандарты:
 * 1. EzDent-i Снимок 19: Двухколоночная матрица пресетов аппаратов и дат.
 *    - Колонка 1 (7 режимов): Все режимы, Панорама (ОПТГ), Цефалостат (ТРГ), КТ (КЛКТ), IO-сенсор (RVG), IO-камера, Другое.
 *    - Колонка 2 (7 дат): Сегодня, Вчера, 3 дня, Прошлая неделя, Прошлый месяц, Пользователь (интервал), Все даты.
 * 2. Тактильные крупные кнопки: активная кнопка имеет фирменный темно-зеленый фон #2E8B57 (#237A4B) и четкую индикацию.
 * 3. Поиск в 2 клика: выбор режима + выбор даты моментально фильтрует список исследований / пациентов.
 * 4. Мандат 8e / 8d / 8c: Zero mocks, 0 эмодзи (строго Lucide-иконки), глубина модалок строго 1.
 */

import React, { useCallback, useEffect, useState } from "react";
import {
	Box,
	Calendar,
	Camera,
	Check,
	Compass,
	FileText,
	Filter,
	Layers,
	RotateCcw,
	Scan,
	Search,
	X,
} from "lucide-react";

export type TactileModalityMode =
	| "all"
	| "opg"
	| "ceph"
	| "cbct"
	| "periapical"
	| "camera"
	| "other";

export type TactileDatePreset =
	| "all"
	| "today"
	| "yesterday"
	| "3days"
	| "last_week"
	| "last_month"
	| "custom";

export interface RadiologyTactileFilterState {
	readonly mode: TactileModalityMode;
	readonly datePreset: TactileDatePreset;
	readonly customDateFrom?: string;
	readonly customDateTo?: string;
	readonly query?: string;
}

export const DEFAULT_TACTILE_FILTERS: RadiologyTactileFilterState = {
	mode: "all",
	datePreset: "all",
	customDateFrom: "",
	customDateTo: "",
	query: "",
};

export interface ModeButtonConfig {
	readonly id: TactileModalityMode;
	readonly label: string;
	readonly subtitle: string;
	readonly icon: React.ComponentType<{ className?: string }>;
}

export interface DateButtonConfig {
	readonly id: TactileDatePreset;
	readonly label: string;
	readonly subtitle: string;
}

export const TACTILE_MODES: readonly ModeButtonConfig[] = [
	{ id: "all", label: "Все режимы", subtitle: "Любые типы аппаратов", icon: Scan },
	{ id: "opg", label: "Панорама", subtitle: "ОПТГ панорамные", icon: Scan },
	{ id: "ceph", label: "Цефалостат", subtitle: "ТРГ телерентгенограммы", icon: Compass },
	{ id: "cbct", label: "КТ", subtitle: "КЛКТ 3D томограммы", icon: Box },
	{ id: "periapical", label: "IO-сенсор", subtitle: "Внутриротовой визиограф RVG", icon: Layers },
	{ id: "camera", label: "IO-камера", subtitle: "Внутриротовая камера", icon: Camera },
	{ id: "other", label: "Другое", subtitle: "Фотографии, TWAIN-сканы", icon: FileText },
] as const;

export const TACTILE_DATES: readonly DateButtonConfig[] = [
	{ id: "today", label: "Сегодня", subtitle: "Текущая смена" },
	{ id: "yesterday", label: "Вчера", subtitle: "Предыдущий день" },
	{ id: "3days", label: "3 дня", subtitle: "Последние 72 часа" },
	{ id: "last_week", label: "Прошлая неделя", subtitle: "За 7 дней" },
	{ id: "last_month", label: "Прошлый месяц", subtitle: "За 30 дней" },
	{ id: "custom", label: "Пользователь", subtitle: "Выбрать диапазон дат" },
	{ id: "all", label: "Все даты", subtitle: "Вся история архива" },
] as const;

export function matchesDatePreset(
	studyDateStr: string | null | undefined,
	preset: TactileDatePreset,
	customFrom?: string,
	customTo?: string,
	referenceDate: Date = new Date(),
): boolean {
	if (!studyDateStr || preset === "all") return true;

	let d: Date;
	// Case 1: Russian DD.MM.YYYY format
	const ruMatch = /^(\d{2})\.(\d{2})\.(\d{4})/.exec(studyDateStr);
	if (ruMatch) {
		const [, day, month, year] = ruMatch;
		d = new Date(Number(year), Number(month) - 1, Number(day));
	} else {
		d = new Date(studyDateStr);
	}

	if (Number.isNaN(d.getTime())) return true;

	const toMidnightMs = (date: Date) =>
		new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

	const studyDay = toMidnightMs(d);
	const today = toMidnightMs(referenceDate);
	const oneDayMs = 24 * 60 * 60 * 1000;

	switch (preset) {
		case "today":
			return studyDay === today;
		case "yesterday":
			return studyDay === today - oneDayMs;
		case "3days":
			return studyDay >= today - 2 * oneDayMs && studyDay <= today;
		case "last_week":
			return studyDay >= today - 7 * oneDayMs && studyDay <= today;
		case "last_month":
			return studyDay >= today - 30 * oneDayMs && studyDay <= today;
		case "custom": {
			if (!customFrom && !customTo) return true;
			const fromMs = customFrom ? toMidnightMs(new Date(customFrom)) : -Infinity;
			const toMs = customTo ? toMidnightMs(new Date(customTo)) + oneDayMs - 1 : Infinity;
			return studyDay >= fromMs && studyDay <= toMs;
		}
		default:
			return true;
	}
}

export function matchesTactileModality(
	kindOrModality: string | null | undefined,
	targetMode: TactileModalityMode,
): boolean {
	if (!targetMode || targetMode === "all") return true;
	const norm = (kindOrModality || "").toLowerCase();

	switch (targetMode) {
		case "opg":
			return norm.includes("opg") || norm.includes("pan") || norm.includes("панорам");
		case "ceph":
			return norm.includes("ceph") || norm.includes("trg") || norm.includes("цефало") || norm.includes("трг");
		case "cbct":
			return norm.includes("cbct") || norm.includes("ct") || norm.includes("3d") || norm.includes("кт");
		case "periapical":
			return (
				norm.includes("periapical") ||
				norm.includes("bitewing") ||
				norm.includes("rvg") ||
				norm.includes("io") ||
				norm.includes("sensor") ||
				norm.includes("сенсор") ||
				norm.includes("прицельн")
			);
		case "camera":
			return (
				norm.includes("camera") ||
				norm.includes("камер") ||
				norm.includes("video") ||
				norm.includes("intraoral")
			);
		case "other":
			return (
				norm.includes("other") ||
				norm.includes("photo") ||
				norm.includes("twain") ||
				norm.includes("фото") ||
				norm.includes("документ")
			);
		default:
			return true;
	}
}

export interface RadiologyPatientSearchModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialFilters?: Partial<RadiologyTactileFilterState> | undefined;
	readonly onApply: (filters: RadiologyTactileFilterState) => void;
	readonly onReset?: (() => void) | undefined;
	readonly totalStudiesCount?: number | undefined;
	readonly matchedCount?: number | undefined;
}

export const RadiologyPatientSearchModal: React.FC<RadiologyPatientSearchModalProps> = ({
	isOpen,
	onClose,
	initialFilters,
	onApply,
	onReset,
	totalStudiesCount,
	matchedCount,
}) => {
	const [mode, setMode] = useState<TactileModalityMode>(initialFilters?.mode || "all");
	const [datePreset, setDatePreset] = useState<TactileDatePreset>(
		initialFilters?.datePreset || "today",
	);
	const [customDateFrom, setCustomDateFrom] = useState<string>(
		initialFilters?.customDateFrom || "",
	);
	const [customDateTo, setCustomDateTo] = useState<string>(initialFilters?.customDateTo || "");
	const [searchQuery, setSearchQuery] = useState<string>(initialFilters?.query || "");

	useEffect(() => {
		if (isOpen) {
			setMode(initialFilters?.mode || "all");
			setDatePreset(initialFilters?.datePreset || "today");
			setCustomDateFrom(initialFilters?.customDateFrom || "");
			setCustomDateTo(initialFilters?.customDateTo || "");
			setSearchQuery(initialFilters?.query || "");
		}
	}, [isOpen, initialFilters]);

	const handleApply = useCallback(() => {
		onApply({
			mode,
			datePreset,
			customDateFrom,
			customDateTo,
			query: searchQuery.trim(),
		});
		onClose();
	}, [mode, datePreset, customDateFrom, customDateTo, searchQuery, onApply, onClose]);

	const handleResetFilters = useCallback(() => {
		setMode("all");
		setDatePreset("all");
		setCustomDateFrom("");
		setCustomDateTo("");
		setSearchQuery("");
		if (onReset) {
			onReset();
		}
	}, [onReset]);

	// Keyboard controls: Escape closes, Enter applies
	useEffect(() => {
		if (!isOpen) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				onClose();
			} else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
				handleApply();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose, handleApply]);

	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-xs select-none tactile-search-modal-backdrop"
			data-testid="radiology-search-modal"
			role="dialog"
			aria-modal="true"
			aria-labelledby="tactile-search-title"
			onClick={(e) => {
				if (e.target === e.currentTarget) {
					onClose();
				}
			}}
		>
			<div
				className="relative flex flex-col w-full max-w-3xl max-h-[92vh] bg-[#0c1322] border border-[#233554] rounded-2xl shadow-2xl text-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
				data-testid="tactile-search-modal-dialog"
				onClick={(e) => e.stopPropagation()}
			>
				{/* ═══════════════════════════════════════════════════════════════════
				    1. HEADER: Firm SeaGreen Title (EzDent-i #2E8B57)
				    ═══════════════════════════════════════════════════════════════════ */}
				<div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-[#1c5f3b] via-[#237A4B] to-[#2E8B57] text-white border-b border-[#2d7d52] shrink-0">
					<div className="flex items-center gap-2.5">
						<div className="flex items-center justify-center w-8 h-8 rounded-lg bg-black/25 text-white border border-white/20">
							<Search className="w-4 h-4" />
						</div>
						<div>
							<h2 id="tactile-search-title" className="text-sm font-black tracking-wide uppercase">
								ПОИСК ПАЦИЕНТА И ИССЛЕДОВАНИЙ
							</h2>
							<p className="text-[11px] text-emerald-100/90 leading-tight">
								Тактильный матричный фильтр в 2 клика (Аппарат + Период)
							</p>
						</div>
					</div>

					<button
						type="button"
						onClick={onClose}
						className="flex items-center justify-center w-8 h-8 rounded-lg text-white/80 hover:text-white hover:bg-black/20 transition-colors cursor-pointer"
						aria-label="Закрыть модальное окно поиска"
						data-testid="btn-close-tactile-search"
					>
						<X className="w-5 h-5" />
					</button>
				</div>

				{/* ═══════════════════════════════════════════════════════════════════
				    2. SEARCH INPUT BAR (Patient Name, Card, Tooth)
				    ═══════════════════════════════════════════════════════════════════ */}
				<div className="flex items-center gap-2 px-5 py-2.5 bg-[#090e1a] border-b border-[#1e2d48] shrink-0">
					<div className="relative flex-1">
						<Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
						<input
							type="text"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder="Поиск по ФИО пациента, номеру карты, телефону или зубу..."
							className="w-full h-9 pl-9 pr-8 rounded-lg text-xs bg-[#131d31] border border-[#2a3854] text-white placeholder:text-slate-400 focus:outline-none focus:border-[#2E8B57] focus:ring-1 focus:ring-[#2E8B57] transition-all"
							data-testid="tactile-search-query-input"
						/>
						{searchQuery && (
							<button
								type="button"
								onClick={() => setSearchQuery("")}
								className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs p-1"
								title="Очистить строку поиска"
							>
								✕
							</button>
						)}
					</div>
					<button
						type="button"
						onClick={handleApply}
						className="h-9 px-4 rounded-lg bg-[#2E8B57] hover:bg-[#237A4B] text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
						data-testid="btn-search-trigger"
					>
						<Search className="w-3.5 h-3.5" />
						<span>Поиск</span>
					</button>
				</div>

				{/* ═══════════════════════════════════════════════════════════════════
				    3. DUAL-COLUMN TACTILE MATRIX (Screen 19: 7 Modes x 7 Dates)
				    ═══════════════════════════════════════════════════════════════════ */}
				<div className="flex-1 p-4 sm:p-5 overflow-y-auto">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{/* ──── КОЛОНКА 1: Выберите режим (7 кнопок аппаратов) ──── */}
						<div className="flex flex-col gap-2 p-3 bg-[#080d18] border border-[#1b273d] rounded-xl">
							<div className="flex items-center justify-between pb-1.5 border-b border-[#1b273d]">
								<span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
									<Scan className="w-3.5 h-3.5 text-[#2E8B57]" />
									Выберите режим (Аппарат)
								</span>
								<span className="text-[10px] text-slate-400 font-mono">7 режимов</span>
							</div>

							<div className="flex flex-col gap-1.5 mt-1" role="radiogroup" aria-label="Режим аппарата">
								{TACTILE_MODES.map((item) => {
									const IconComp = item.icon;
									const isSelected = mode === item.id;
									return (
										<button
											key={item.id}
											type="button"
											role="radio"
											aria-checked={isSelected}
											onClick={() => setMode(item.id)}
											className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-left transition-all cursor-pointer min-h-[42px] ${
												isSelected
													? "bg-[#237A4B] text-white border-[#2E8B57] shadow-md shadow-emerald-950/40 ring-1 ring-emerald-400 font-bold"
													: "bg-[#101827] text-slate-300 border-[#1e2a3e] hover:bg-[#162236] hover:border-slate-600"
											}`}
											data-testid={`tactile-mode-${item.id}`}
										>
											<div className="flex items-center gap-2.5 min-w-0">
												<IconComp
													className={`w-4 h-4 shrink-0 ${isSelected ? "text-white" : "text-slate-400"}`}
												/>
												<div className="flex flex-col min-w-0">
													<span className="text-xs font-bold leading-tight truncate">
														{item.label}
													</span>
													<span
														className={`text-[10px] leading-tight truncate ${
															isSelected ? "text-emerald-100" : "text-slate-400"
														}`}
													>
														{item.subtitle}
													</span>
												</div>
											</div>
											{isSelected && (
												<div className="flex items-center justify-center w-5 h-5 rounded-full bg-white/20 text-white shrink-0">
													<Check className="w-3.5 h-3.5 stroke-[3]" />
												</div>
											)}
										</button>
									);
								})}
							</div>
						</div>

						{/* ──── КОЛОНКА 2: Выберите дату (7 кнопок периодов) ──── */}
						<div className="flex flex-col gap-2 p-3 bg-[#080d18] border border-[#1b273d] rounded-xl">
							<div className="flex items-center justify-between pb-1.5 border-b border-[#1b273d]">
								<span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
									<Calendar className="w-3.5 h-3.5 text-[#2E8B57]" />
									Выберите дату (Период)
								</span>
								<span className="text-[10px] text-slate-400 font-mono">7 периодов</span>
							</div>

							<div className="flex flex-col gap-1.5 mt-1" role="radiogroup" aria-label="Период дат">
								{TACTILE_DATES.map((item) => {
									const isSelected = datePreset === item.id;
									return (
										<button
											key={item.id}
											type="button"
											role="radio"
											aria-checked={isSelected}
											onClick={() => setDatePreset(item.id)}
											className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-left transition-all cursor-pointer min-h-[42px] ${
												isSelected
													? "bg-[#237A4B] text-white border-[#2E8B57] shadow-md shadow-emerald-950/40 ring-1 ring-emerald-400 font-bold"
													: "bg-[#101827] text-slate-300 border-[#1e2a3e] hover:bg-[#162236] hover:border-slate-600"
											}`}
											data-testid={`tactile-date-${item.id}`}
										>
											<div className="flex flex-col min-w-0">
												<span className="text-xs font-bold leading-tight truncate">
													{item.label}
												</span>
												<span
													className={`text-[10px] leading-tight truncate ${
														isSelected ? "text-emerald-100" : "text-slate-400"
													}`}
												>
													{item.subtitle}
												</span>
											</div>
											{isSelected && (
												<div className="flex items-center justify-center w-5 h-5 rounded-full bg-white/20 text-white shrink-0">
													<Check className="w-3.5 h-3.5 stroke-[3]" />
												</div>
											)}
										</button>
									);
								})}
							</div>

							{/* Секция выбора произвольного интервала при выборе «Пользователь» */}
							{datePreset === "custom" && (
								<div
									className="mt-2 p-2.5 rounded-lg bg-[#0e1726] border border-emerald-500/40 flex flex-col gap-2 animate-in fade-in slide-in-from-top-1 duration-150"
									data-testid="tactile-custom-date-container"
								>
									<span className="text-[10px] font-bold text-emerald-300 uppercase">
										Диапазон дат «Пользователь»:
									</span>
									<div className="grid grid-cols-2 gap-2">
										<div>
											<label className="text-[10px] text-slate-400 block mb-0.5">С даты:</label>
											<input
												type="date"
												value={customDateFrom}
												onChange={(e) => setCustomDateFrom(e.target.value)}
												className="w-full h-8 px-2 rounded bg-[#131f33] border border-[#233554] text-white text-xs focus:outline-none focus:border-[#2E8B57]"
												data-testid="input-custom-date-from"
											/>
										</div>
										<div>
											<label className="text-[10px] text-slate-400 block mb-0.5">По дату:</label>
											<input
												type="date"
												value={customDateTo}
												onChange={(e) => setCustomDateTo(e.target.value)}
												className="w-full h-8 px-2 rounded bg-[#131f33] border border-[#233554] text-white text-xs focus:outline-none focus:border-[#2E8B57]"
												data-testid="input-custom-date-to"
											/>
										</div>
									</div>
								</div>
							)}
						</div>
					</div>
				</div>

				{/* ═══════════════════════════════════════════════════════════════════
				    4. FOOTER: Status count & Action Buttons
				    ═══════════════════════════════════════════════════════════════════ */}
				<div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 bg-[#080d18] border-t border-[#1e2d48] shrink-0 text-xs">
					<div className="flex items-center gap-2 text-slate-300">
						<Filter className="w-3.5 h-3.5 text-emerald-400" />
						<span>
							Фильтр:{" "}
							<strong className="text-white">
								{TACTILE_MODES.find((m) => m.id === mode)?.label}
							</strong>{" "}
							•{" "}
							<strong className="text-white">
								{TACTILE_DATES.find((d) => d.id === datePreset)?.label}
							</strong>
						</span>
						{typeof matchedCount === "number" && (
							<span className="ml-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
								Найдено: {matchedCount}
								{typeof totalStudiesCount === "number" && ` из ${totalStudiesCount}`}
							</span>
						)}
					</div>

					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={handleResetFilters}
							className="h-8 px-3 rounded-lg border border-[#2a3854] bg-[#101827] text-slate-300 hover:text-white hover:border-slate-500 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
							data-testid="btn-reset-tactile-filters"
						>
							<RotateCcw className="w-3 h-3" />
							<span>Сброс</span>
						</button>

						<button
							type="button"
							onClick={onClose}
							className="h-8 px-3 rounded-lg border border-[#2a3854] bg-[#101827] text-slate-300 hover:text-white hover:border-slate-500 transition-colors cursor-pointer"
						>
							Отмена
						</button>

						<button
							type="button"
							onClick={handleApply}
							className="h-8 px-4 rounded-lg bg-[#2E8B57] hover:bg-[#237A4B] text-white font-bold inline-flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
							data-testid="btn-apply-tactile-search"
						>
							<Check className="w-3.5 h-3.5 stroke-[2.5]" />
							<span>Применить</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};
