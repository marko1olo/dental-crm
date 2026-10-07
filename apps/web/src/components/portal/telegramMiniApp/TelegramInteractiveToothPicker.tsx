/**
 * TELEGRAM INTERACTIVE TOOTH PICKER (FDI 32 + 20)
 * Компонент интерактивной зубной формулы для Telegram WebApp Mini App (Pocket Clinic).
 *
 * Особенности (Apple HIG & Clinical Ergonomics):
 * - Полная поддержка международной нотации FDI:
 *   * Постоянный прикус: 32 зуба (Q1: 18-11, Q2: 21-28, Q4: 48-41, Q3: 31-38)
 *   * Молочный прикус: 20 зубов (Q5: 55-51, Q6: 61-65, Q8: 85-81, Q7: 71-75)
 * - Сенсорные области кнопок зубов >= 44x44px (Мандат 8ze: Anti-Desktop-Squeeze)
 * - Переключатель видов: «По квадрантам» (крупные тач-карточки 56px) и «Общая дуга»
 * - Нативная шторка жалоб (Bottom Sheet Drawer):
 *   * ⚡ Острая пульсирующая боль
 *   * 🦷 Скол зуба / выпала пломба
 *   * 🕳️ Застревает пища / кариес
 *   * ❄️ Реагирует на холодное/горячее
 *   * 👑 Хочу коронку / имплант
 * - Визуальные маркеры жалоб на зубах с цветовой дифференциацией
 * - Тактильный виброотклик Haptic Feedback
 */

import React, { memo, useCallback, useMemo, useState } from "react";
import {
	Activity,
	AlertCircle,
	ArrowRight,
	Check,
	ChevronDown,
	Crown,
	Flame,
	HeartPulse,
	HelpCircle,
	Info,
	Sparkles,
	Trash2,
	X,
	Zap,
} from "lucide-react";

export type ToothComplaintType =
	| "acute_throbbing"
	| "fracture_filling"
	| "food_impaction_caries"
	| "temperature_sensitivity"
	| "crown_implant";

export interface ToothComplaint {
	readonly toothNumber: number;
	readonly complaintType: ToothComplaintType;
	readonly symptomLabel: string;
	readonly painLevel: number; // 1-5
	readonly notes?: string | undefined;
	readonly cito: boolean;
}

export interface TelegramInteractiveToothPickerProps {
	readonly selectedComplaints: readonly ToothComplaint[];
	readonly onSaveComplaint: (complaint: ToothComplaint) => void;
	readonly onRemoveComplaint: (toothNumber: number) => void;
	readonly onProceedToBooking?: () => void;
}

// 5 утвержденных клинических симптомов жалобы по зубу
export const TOOTH_COMPLAINT_CATALOG: Array<{
	id: ToothComplaintType;
	label: string;
	shortLabel: string;
	description: string;
	cito: boolean;
	icon: React.ComponentType<{ size?: number; className?: string }>;
	colorClass: string;
	badgeClass: string;
}> = [
	{
		id: "acute_throbbing",
		label: "Острая пульсирующая боль",
		shortLabel: "Острая боль",
		description: "Пульсирует, усиливается ночью, невозможно накусить",
		cito: true,
		icon: Zap,
		colorClass: "text-red-400 bg-red-950/40 border-red-500/40",
		badgeClass: "tg-tooth-badge-acute",
	},
	{
		id: "fracture_filling",
		label: "Скол зуба / выпала пломба",
		shortLabel: "Скол / пломба",
		description: "Острый край травмирует язык, откололась стенка",
		cito: false,
		icon: Sparkles,
		colorClass: "text-amber-400 bg-amber-950/40 border-amber-500/40",
		badgeClass: "tg-tooth-badge-fracture",
	},
	{
		id: "food_impaction_caries",
		label: "Застревает пища / кариес",
		shortLabel: "Кариес / пища",
		description: "Потемнение эмали, неприятный запах, застревают волокна",
		cito: false,
		icon: AlertCircle,
		colorClass: "text-orange-400 bg-orange-950/40 border-orange-500/40",
		badgeClass: "tg-tooth-badge-caries",
	},
	{
		id: "temperature_sensitivity",
		label: "Реагирует на холодное / горячее",
		shortLabel: "Чувствительность",
		description: "Резкая кратковременная боль от холодного или сладкого",
		cito: false,
		icon: Activity,
		colorClass: "text-cyan-400 bg-cyan-950/40 border-cyan-500/40",
		badgeClass: "tg-tooth-badge-temp",
	},
	{
		id: "crown_implant",
		label: "Хочу коронку / имплант",
		shortLabel: "Коронка / имплант",
		description: "Зуб разрушен более чем на 50% либо уже отсутствует",
		cito: false,
		icon: Crown,
		colorClass: "text-purple-400 bg-purple-950/40 border-purple-500/40",
		badgeClass: "tg-tooth-badge-crown",
	},
];

// FDI Нотация зубов
// Постоянный прикус (32 зуба)
const ADULT_Q1 = [18, 17, 16, 15, 14, 13, 12, 11]; // Верхний правый
const ADULT_Q2 = [21, 22, 23, 24, 25, 26, 27, 28]; // Верхний левый
const ADULT_Q4 = [48, 47, 46, 45, 44, 43, 42, 41]; // Нижний правый
const ADULT_Q3 = [31, 32, 33, 34, 35, 36, 37, 38]; // Нижний левый

// Временный / молочный прикус (20 зубов)
const PEDIATRIC_Q5 = [55, 54, 53, 52, 51]; // Верхний правый молочный
const PEDIATRIC_Q6 = [61, 62, 63, 64, 65]; // Верхний левый молочный
const PEDIATRIC_Q8 = [85, 84, 83, 82, 81]; // Нижний правый молочный
const PEDIATRIC_Q7 = [71, 72, 73, 74, 75]; // Нижний левый молочный

/**
 * Русские анатомические названия зубов по стандарту СтАР
 */
export function getToothAnatomicalTitle(toothNum: number): {
	name: string;
	group: "incisor" | "canine" | "premolar" | "molar";
	archName: string;
} {
	const isPediatric = toothNum >= 51 && toothNum <= 85;
	const isUpper = (toothNum >= 11 && toothNum <= 28) || (toothNum >= 51 && toothNum <= 65);
	const arch = isUpper ? "Верхняя челюсть" : "Нижняя челюсть";

	const lastDigit = toothNum % 10;
	if (lastDigit === 1) {
		return {
			name: `${isPediatric ? "Молочный ц" : "Ц"}ентральный резец`,
			group: "incisor",
			archName: arch,
		};
	}
	if (lastDigit === 2) {
		return {
			name: `${isPediatric ? "Молочный б" : "Б"}оковой резец`,
			group: "incisor",
			archName: arch,
		};
	}
	if (lastDigit === 3) {
		return {
			name: `${isPediatric ? "Молочный к" : "К"}лык`,
			group: "canine",
			archName: arch,
		};
	}
	if (lastDigit === 4) {
		return {
			name: isPediatric ? "Первый молочный моляр" : "Первый премоляр",
			group: isPediatric ? "molar" : "premolar",
			archName: arch,
		};
	}
	if (lastDigit === 5) {
		return {
			name: isPediatric ? "Второй молочный моляр" : "Второй премоляр",
			group: isPediatric ? "molar" : "premolar",
			archName: arch,
		};
	}
	if (lastDigit === 6) {
		return {
			name: "Первый моляр («шестёрка»)",
			group: "molar",
			archName: arch,
		};
	}
	if (lastDigit === 7) {
		return {
			name: "Второй моляр («семёрка»)",
			group: "molar",
			archName: arch,
		};
	}
	if (lastDigit === 8) {
		return {
			name: "Третий моляр («зуб мудрости»)",
			group: "molar",
			archName: arch,
		};
	}

	return {
		name: `Зуб #${toothNum}`,
		group: "incisor",
		archName: arch,
	};
}

export const TelegramInteractiveToothPicker: React.FC<TelegramInteractiveToothPickerProps> = memo(({
	selectedComplaints,
	onSaveComplaint,
	onRemoveComplaint,
	onProceedToBooking,
}) => {
	// Состояние прикуса: взрослый (32) или детский (20)
	const [dentitionMode, setDentitionMode] = useState<"adult" | "pediatric">("adult");

	// Режим отображения: квадранты (крупные тач-кнопки 56px) или общая дуга
	const [viewMode, setViewMode] = useState<"quadrants" | "arch">("quadrants");

	// Активный квадрант для режима "По квадрантам"
	const [activeQuadrant, setActiveQuadrant] = useState<number>(1);

	// Текущий зуб, открытый в шторке выбора жалобы
	const [sheetTooth, setSheetTooth] = useState<number | null>(null);

	// Поля формы внутри шторки
	const [activeComplaintType, setActiveComplaintType] = useState<ToothComplaintType>("acute_throbbing");
	const [painLevel, setPainLevel] = useState<number>(3);
	const [notes, setNotes] = useState<string>("");

	// Тактильный виброотклик Telegram WebApp
	const triggerHaptic = useCallback((style: "light" | "medium" | "heavy" = "light") => {
		try {
			window.Telegram?.WebApp?.HapticFeedback?.impactOccurred?.(style);
		} catch {
			// Игнорируем в браузере без Telegram
		}
	}, []);

	// Поиск существующей жалобы по номеру зуба
	const findComplaint = useCallback(
		(toothNum: number) => {
			return selectedComplaints.find((c) => c.toothNumber === toothNum);
		},
		[selectedComplaints],
	);

	// Открытие шторки для зуба
	const handleOpenToothSheet = useCallback(
		(toothNum: number) => {
			triggerHaptic("medium");
			const existing = findComplaint(toothNum);
			if (existing) {
				setActiveComplaintType(existing.complaintType);
				setPainLevel(existing.painLevel);
				setNotes(existing.notes || "");
			} else {
				setActiveComplaintType("acute_throbbing");
				setPainLevel(3);
				setNotes("");
			}
			setSheetTooth(toothNum);
		},
		[findComplaint, triggerHaptic],
	);

	// Закрытие шторки
	const handleCloseSheet = useCallback(() => {
		triggerHaptic("light");
		setSheetTooth(null);
	}, [triggerHaptic]);

	// Сохранение жалобы из шторки
	const handleConfirmComplaint = useCallback(() => {
		if (!sheetTooth) return;
		triggerHaptic("heavy");

		const catalogItem = TOOTH_COMPLAINT_CATALOG.find((c) => c.id === activeComplaintType);
		const trimmedNotes = notes.trim();
		const complaint: ToothComplaint = {
			toothNumber: sheetTooth,
			complaintType: activeComplaintType,
			symptomLabel: catalogItem?.label || "Боль в зубе",
			painLevel,
			...(trimmedNotes ? { notes: trimmedNotes } : {}),
			cito: catalogItem?.cito || painLevel >= 4,
		};

		onSaveComplaint(complaint);
		setSheetTooth(null);
	}, [activeComplaintType, notes, onSaveComplaint, painLevel, sheetTooth, triggerHaptic]);

	// Удаление жалобы на текущий зуб
	const handleDeleteComplaint = useCallback(() => {
		if (!sheetTooth) return;
		triggerHaptic("light");
		onRemoveComplaint(sheetTooth);
		setSheetTooth(null);
	}, [onRemoveComplaint, sheetTooth, triggerHaptic]);

	// Текущие зубы для квадрантов
	const currentQuadrantTeeth = useMemo(() => {
		if (dentitionMode === "adult") {
			if (activeQuadrant === 1) return { title: "Верхний правый (18–11)", teeth: ADULT_Q1 };
			if (activeQuadrant === 2) return { title: "Верхний левый (21–28)", teeth: ADULT_Q2 };
			if (activeQuadrant === 3) return { title: "Нижний левый (31–38)", teeth: ADULT_Q3 };
			return { title: "Нижний правый (48–41)", teeth: ADULT_Q4 };
		}
		// Pediatric
		if (activeQuadrant === 1) return { title: "Верхний правый молочный (55–51)", teeth: PEDIATRIC_Q5 };
		if (activeQuadrant === 2) return { title: "Верхний левый молочный (61–65)", teeth: PEDIATRIC_Q6 };
		if (activeQuadrant === 3) return { title: "Нижний левый молочный (71–75)", teeth: PEDIATRIC_Q7 };
		return { title: "Нижний правый молочный (85–81)", teeth: PEDIATRIC_Q8 };
	}, [activeQuadrant, dentitionMode]);

	// Рендер кнопки одного зуба
	const renderToothButton = (toothNum: number) => {
		const complaint = findComplaint(toothNum);
		const isSheetOpen = sheetTooth === toothNum;
		const catalogItem = complaint
			? TOOTH_COMPLAINT_CATALOG.find((c) => c.id === complaint.complaintType)
			: null;

		return (
			<button
				key={toothNum}
				type="button"
				className={`tg-tooth-cell ${complaint ? "has-complaint" : ""} ${
					isSheetOpen ? "is-active" : ""
				} ${catalogItem?.badgeClass || ""}`}
				onClick={() => handleOpenToothSheet(toothNum)}
				aria-label={`Зуб ${toothNum}${complaint ? `, жалоба: ${complaint.symptomLabel}` : ""}`}
			>
				<span className="tg-tooth-num">{toothNum}</span>
				{complaint && (
					<span className="tg-tooth-indicator">
						{complaint.complaintType === "acute_throbbing" && "⚡"}
						{complaint.complaintType === "fracture_filling" && "🦷"}
						{complaint.complaintType === "food_impaction_caries" && "🕳️"}
						{complaint.complaintType === "temperature_sensitivity" && "❄️"}
						{complaint.complaintType === "crown_implant" && "👑"}
					</span>
				)}
			</button>
		);
	};

	return (
		<div className="tg-tooth-picker-container">
			{/* Верхняя плашка выбора типа прикуса: Взрослый / Детский */}
			<div className="tg-dentition-toggle">
				<button
					type="button"
					className={`tg-toggle-chip ${dentitionMode === "adult" ? "active" : ""}`}
					onClick={() => {
						setDentitionMode("adult");
						triggerHaptic("light");
					}}
				>
					<span>Взрослый прикус (32 зуба)</span>
				</button>
				<button
					type="button"
					className={`tg-toggle-chip ${dentitionMode === "pediatric" ? "active" : ""}`}
					onClick={() => {
						setDentitionMode("pediatric");
						triggerHaptic("light");
					}}
				>
					<span>Молочные зубы (20 зубов)</span>
				</button>
			</div>

			{/* Переключатель вида: Квадранты (крупный тач) / Вся дуга */}
			<div className="flex items-center justify-between px-1 py-1">
				<span className="text-xs font-semibold text-[var(--tg-text)]">
					{dentitionMode === "adult" ? "Формула постоянных зубов (FDI)" : "Формула молочных зубов (FDI)"}
				</span>
				<div className="flex bg-[var(--tg-card-inner)] p-0.5 rounded-lg border border-[var(--tg-border)] text-[11px]">
					<button
						type="button"
						className={`px-2.5 py-1 rounded-md transition-all font-medium ${
							viewMode === "quadrants"
								? "bg-[var(--tg-accent)] text-white font-bold shadow-sm"
								: "text-[var(--tg-text-muted)] hover:text-[var(--tg-text)]"
						}`}
						onClick={() => {
							setViewMode("quadrants");
							triggerHaptic("light");
						}}
					>
						По квадрантам
					</button>
					<button
						type="button"
						className={`px-2.5 py-1 rounded-md transition-all font-medium ${
							viewMode === "arch"
								? "bg-[var(--tg-accent)] text-white font-bold shadow-sm"
								: "text-[var(--tg-text-muted)] hover:text-[var(--tg-text)]"
						}`}
						onClick={() => {
							setViewMode("arch");
							triggerHaptic("light");
						}}
					>
						Вся дуга
					</button>
				</div>
			</div>

			{/* РЕЖИМ 1: ПО КВАДРАНТАМ (Apple HIG крупная сенсорная эргономика 56px) */}
			{viewMode === "quadrants" ? (
				<div className="tg-quadrant-card">
					{/* Стрип переключения 4 квадрантов */}
					<div className="grid grid-cols-4 gap-1.5 mb-3">
						{[
							{ id: 1, label: dentitionMode === "adult" ? "1 Вверх Пр" : "5 Вверх Пр", sub: "18-11" },
							{ id: 2, label: dentitionMode === "adult" ? "2 Вверх Лв" : "6 Вверх Лв", sub: "21-28" },
							{ id: 3, label: dentitionMode === "adult" ? "3 Низ Лв" : "7 Низ Лв", sub: "31-38" },
							{ id: 4, label: dentitionMode === "adult" ? "4 Низ Пр" : "8 Низ Пр", sub: "48-41" },
						].map((q) => (
							<button
								key={q.id}
								type="button"
								className={`tg-quadrant-tab ${activeQuadrant === q.id ? "active" : ""}`}
								onClick={() => {
									setActiveQuadrant(q.id);
									triggerHaptic("light");
								}}
							>
								<span className="text-[11px] font-bold">{q.label}</span>
							</button>
						))}
					</div>

					<div className="text-center text-xs text-[var(--tg-text-muted)] mb-2">
						{currentQuadrantTeeth.title} • <span className="text-[var(--tg-accent)]">Нажмите на зуб для выбора симптома</span>
					</div>

					{/* Сетка зубов выбранного квадранта (крупные тач-кнопки) */}
					<div className="grid grid-cols-4 gap-2 py-1">
						{currentQuadrantTeeth.teeth.map((toothNum) => renderToothButton(toothNum))}
					</div>
				</div>
			) : (
				/* РЕЖИМ 2: ВСЯ ДУГА (Классический обзор верхней и нижней челюсти) */
				<div className="tg-arch-card">
					{/* Верхняя челюсть */}
					<div className="mb-3">
						<div className="text-[10px] uppercase font-bold text-[var(--tg-text-muted)] tracking-wider text-center mb-1.5">
							Верхняя челюсть
						</div>
						<div className="flex gap-1 justify-center overflow-x-auto py-1 scrollbar-none">
							{dentitionMode === "adult" ? (
								<>
									<div className="flex gap-1">
										{ADULT_Q1.map((t) => renderToothButton(t))}
									</div>
									<div className="w-[1px] bg-[var(--tg-border)] mx-1 flex-shrink-0" />
									<div className="flex gap-1">
										{ADULT_Q2.map((t) => renderToothButton(t))}
									</div>
								</>
							) : (
								<>
									<div className="flex gap-1">
										{PEDIATRIC_Q5.map((t) => renderToothButton(t))}
									</div>
									<div className="w-[1px] bg-[var(--tg-border)] mx-1 flex-shrink-0" />
									<div className="flex gap-1">
										{PEDIATRIC_Q6.map((t) => renderToothButton(t))}
									</div>
								</>
							)}
						</div>
					</div>

					{/* Нижняя челюсть */}
					<div>
						<div className="text-[10px] uppercase font-bold text-[var(--tg-text-muted)] tracking-wider text-center mb-1.5">
							Нижняя челюсть
						</div>
						<div className="flex gap-1 justify-center overflow-x-auto py-1 scrollbar-none">
							{dentitionMode === "adult" ? (
								<>
									<div className="flex gap-1">
										{ADULT_Q4.map((t) => renderToothButton(t))}
									</div>
									<div className="w-[1px] bg-slate-700/80 mx-1 flex-shrink-0" />
									<div className="flex gap-1">
										{ADULT_Q3.map((t) => renderToothButton(t))}
									</div>
								</>
							) : (
								<>
									<div className="flex gap-1">
										{PEDIATRIC_Q8.map((t) => renderToothButton(t))}
									</div>
									<div className="w-[1px] bg-slate-700/80 mx-1 flex-shrink-0" />
									<div className="flex gap-1">
										{PEDIATRIC_Q7.map((t) => renderToothButton(t))}
									</div>
								</>
							)}
						</div>
					</div>
				</div>
			)}

			{/* Сводная плашка отмеченных жалоб */}
			{selectedComplaints.length > 0 && (
				<div className="tg-complaints-summary">
					<div className="flex items-center justify-between mb-2">
						<div className="text-xs font-bold text-[var(--tg-text)] flex items-center gap-1.5">
							<Flame size={14} className="text-red-500" />
							<span>Отмеченные зубы ({selectedComplaints.length}):</span>
						</div>
						<span className="text-[11px] text-[var(--tg-accent)] font-semibold">Готово к передаче врачу</span>
					</div>

					<div className="space-y-1.5">
						{selectedComplaints.map((c) => {
							const catalogItem = TOOTH_COMPLAINT_CATALOG.find((item) => item.id === c.complaintType);
							const toothInfo = getToothAnatomicalTitle(c.toothNumber);
							return (
								<div
									key={c.toothNumber}
									className="flex items-center justify-between p-2 rounded-xl bg-[var(--tg-card-inner)] border border-[var(--tg-border)] text-xs"
								>
									<div className="flex items-center gap-2 min-w-0">
										<div className="w-7 h-7 rounded-lg bg-[var(--tg-accent)]/20 text-[var(--tg-accent)] font-bold flex items-center justify-center text-xs flex-shrink-0 border border-[var(--tg-accent)]/30">
											{c.toothNumber}
										</div>
										<div className="min-w-0">
											<div className="font-semibold text-[var(--tg-text)] truncate flex items-center gap-1">
												<span>Зуб {c.toothNumber}</span>
												<span className="text-[10px] text-[var(--tg-text-muted)]">({toothInfo.name})</span>
											</div>
											<div className="text-[11px] text-[var(--tg-accent)] font-medium flex items-center gap-1">
												<span>{catalogItem?.label}</span>
												{c.cito && (
													<span className="text-[9px] bg-red-500/20 text-red-600 dark:text-red-300 px-1 py-0.2 rounded font-bold border border-red-500/30">
														⚡ Срочно
													</span>
												)}
											</div>
										</div>
									</div>

									<button
										type="button"
										className="p-1.5 text-[var(--tg-text-muted)] hover:text-red-500 transition-colors ml-2 flex-shrink-0"
										onClick={() => onRemoveComplaint(c.toothNumber)}
										title="Удалить жалобу"
									>
										<Trash2 size={14} />
									</button>
								</div>
							);
						})}
					</div>

					{onProceedToBooking && (
						<button
							type="button"
							className="tg-cta-button mt-3"
							onClick={() => {
								triggerHaptic("medium");
								onProceedToBooking();
							}}
						>
							<span>Записаться к врачу с жалобами на зубы</span>
							<ArrowRight size={16} />
						</button>
					)}
				</div>
			)}

			{/* НАТИВНАЯ ИНТЕРАКТИВНАЯ ШТОРКА (BOTTOM SHEET DRAWER) */}
			{sheetTooth !== null && (
				<div className="tg-sheet-backdrop" onClick={handleCloseSheet}>
					<div
						className="tg-bottom-sheet"
						onClick={(e) => e.stopPropagation()}
						role="dialog"
						aria-modal="true"
					>
						{/* Drag handle */}
						<div className="tg-sheet-handle" />

						{/* Шапка шторки */}
						<div className="tg-sheet-header">
							<div className="flex items-center gap-2.5">
								<div className="w-10 h-10 rounded-xl bg-[var(--tg-accent)]/20 text-[var(--tg-accent)] font-extrabold flex items-center justify-center text-base border border-[var(--tg-accent)]/40">
									{sheetTooth}
								</div>
								<div>
									<div className="text-base font-bold text-[var(--tg-text)]">
										Зуб #{sheetTooth}
									</div>
									<div className="text-xs text-[var(--tg-text-muted)]">
										{getToothAnatomicalTitle(sheetTooth).name} • {getToothAnatomicalTitle(sheetTooth).archName}
									</div>
								</div>
							</div>

							<button
								type="button"
								className="p-2 rounded-full text-[var(--tg-text-muted)] hover:text-[var(--tg-text)] hover:bg-[var(--tg-card-inner)] transition-all"
								onClick={handleCloseSheet}
							>
								<X size={18} />
							</button>
						</div>

						{/* Тело шторки */}
						<div className="tg-sheet-body">
							<div className="text-xs font-bold text-[var(--tg-text)] mb-2 uppercase tracking-wider">
								Что вас беспокоит в этом зубе?
							</div>

							{/* Список 5 симптомов */}
							<div className="space-y-2">
								{TOOTH_COMPLAINT_CATALOG.map((item) => {
									const isSelected = activeComplaintType === item.id;
									const Icon = item.icon;
									return (
										<button
											key={item.id}
											type="button"
											className={`tg-symptom-card ${isSelected ? "selected" : ""}`}
											onClick={() => {
												setActiveComplaintType(item.id);
												triggerHaptic("light");
											}}
										>
											<div className="flex items-start gap-2.5 min-w-0">
												<div
													className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
														isSelected ? "bg-[var(--tg-accent)] text-white" : "bg-[var(--tg-border)] text-[var(--tg-text)]"
													}`}
												>
													<Icon size={16} />
												</div>
												<div className="text-left min-w-0">
													<div className="text-xs font-bold text-[var(--tg-text)] flex items-center gap-1.5">
														<span>{item.label}</span>
														{item.cito && (
															<span className="text-[9px] bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/40 px-1 py-0.2 rounded font-extrabold">
																⚡ Срочно!
															</span>
														)}
													</div>
													<div className="text-[11px] text-[var(--tg-text-muted)] leading-tight mt-0.5">
														{item.description}
													</div>
												</div>
											</div>

											{isSelected && (
												<div className="w-5 h-5 rounded-full bg-[var(--tg-accent)] text-white flex items-center justify-center flex-shrink-0">
													<Check size={13} strokeWidth={3} />
												</div>
											)}
										</button>
									);
								})}
							</div>

							{/* Шкала интенсивности боли (1-5) */}
							<div className="mt-4 pt-3 border-t border-[var(--tg-border)]">
								<div className="flex items-center justify-between text-xs text-[var(--tg-text)] mb-2">
									<span className="font-semibold flex items-center gap-1">
										<HeartPulse size={14} className="text-red-500" />
										<span>Интенсивность боли:</span>
									</span>
									<span className="font-bold text-[var(--tg-accent)]">
										{painLevel === 1 && "1 — Лёгкий дискомфорт"}
										{painLevel === 2 && "2 — Терпимая боль"}
										{painLevel === 3 && "3 — Умеренная боль"}
										{painLevel === 4 && "4 — Сильная боль (Срочно)"}
										{painLevel === 5 && "5 — Нестерпимая острая боль!"}
									</span>
								</div>

								<div className="flex gap-1.5">
									{[1, 2, 3, 4, 5].map((lvl) => (
										<button
											key={lvl}
											type="button"
											className={`flex-1 py-2 rounded-xl text-xs font-extrabold border transition-all ${
												painLevel >= lvl
													? lvl >= 4
														? "bg-red-600 text-white border-red-400 shadow-md"
														: "bg-[var(--tg-accent)] text-white border-teal-400 shadow-sm"
													: "bg-[var(--tg-card-inner)] border-[var(--tg-border)] text-[var(--tg-text-muted)]"
											}`}
											onClick={() => {
												setPainLevel(lvl);
												triggerHaptic(lvl >= 4 ? "heavy" : "light");
											}}
										>
											{lvl}
										</button>
									))}
								</div>
							</div>

							{/* Поле заметки */}
							<div className="mt-3">
								<label className="text-[11px] font-semibold text-[var(--tg-text-muted)] mb-1 block">
									Дополнительный комментарий врачу (необязательно):
								</label>
								<input
									type="text"
									placeholder="Например: болит уже 3 дня, реагирует на горячий чай"
									value={notes}
									onChange={(e) => setNotes(e.target.value)}
									className="w-full bg-[var(--tg-card-inner)] border border-[var(--tg-border)] rounded-xl px-3 py-2 text-xs text-[var(--tg-text)] placeholder:text-[var(--tg-text-muted)] focus:outline-none focus:border-[var(--tg-accent)]"
								/>
							</div>

							{/* Кнопки подтверждения в нижней трети */}
							<div className="mt-4 pt-2 space-y-2">
								<button
									type="button"
									className="tg-cta-button"
									onClick={handleConfirmComplaint}
								>
									<Check size={16} />
									<span>Сохранить жалобу на зуб #{sheetTooth}</span>
								</button>

								{findComplaint(sheetTooth) && (
									<button
										type="button"
										className="w-full py-2.5 px-4 rounded-xl bg-[var(--tg-card-inner)] hover:bg-red-500/10 text-red-500 font-semibold text-xs flex items-center justify-center gap-1.5 border border-[var(--tg-border)] transition-all"
										onClick={handleDeleteComplaint}
									>
										<Trash2 size={14} />
										<span>Удалить жалобу с этого зуба</span>
									</button>
								)}
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
});

TelegramInteractiveToothPicker.displayName = "TelegramInteractiveToothPicker";
