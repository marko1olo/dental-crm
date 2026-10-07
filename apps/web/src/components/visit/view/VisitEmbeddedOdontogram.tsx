import React, { useState, useMemo, useCallback } from "react";
import {
	PRIMARY_TO_PERMANENT_SUCCESSOR_MAP,
	PERMANENT_TO_PRIMARY_PREDECESSOR_MAP,
} from "@dental/shared";
import { VisitOdontogramToothItem } from "./VisitOdontogramToothItem";

export type DentitionMode = "adult" | "mixed" | "pediatric";

export interface VisitEmbeddedOdontogramProps {
	activeQuadrant: number | null;
	setActiveQuadrant: (q: number | null) => void;
	activeStamp: string;
	setActiveStamp: (stamp: string) => void;
	activeStampRef: React.MutableRefObject<string>;
	toothRows: string[][];
	toothStateByCode: Record<string, string>;
	draft?: { quality?: { detectedToothCodes?: string[] } } | null;
	handleToothClick: (code: string, state: string) => void;
	dentitionMode?: DentitionMode;
	onDentitionModeChange?: (mode: DentitionMode) => void;
	onToggleToothDentition?: (code: string) => void;
}

export interface PathologyStampItem {
	id: string;
	label: string;
	color: string;
	dotColor: string;
	description: string;
}

export const PATHOLOGY_STAMPS: readonly PathologyStampItem[] = [
	{
		id: "idle",
		label: "Осмотр",
		color: "var(--ink)",
		dotColor: "#94a3b8",
		description: "Клиническая карточка зуба и статус обследования",
	},
	{
		id: "caries",
		label: "Кариес",
		color: "#ea580c",
		dotColor: "#ea580c",
		description: "Кариес дентина (K02.1)",
	},
	{
		id: "pulpitis",
		label: "Пульпит",
		color: "#ef4444",
		dotColor: "#ef4444",
		description: "Пульпит зуба (K04.0)",
	},
	{
		id: "treatment",
		label: "Периодонтит",
		color: "#dc2626",
		dotColor: "#dc2626",
		description: "Периодонтит и эндодонтическое лечение (K04.5)",
	},
	{
		id: "done",
		label: "Пломба",
		color: "#16a34a",
		dotColor: "#16a34a",
		description: "Пломбирование зуба композитом (A16.07.002)",
	},
	{
		id: "crown",
		label: "Коронка",
		color: "#ca8a04",
		dotColor: "#ca8a04",
		description: "Искусственная коронка (A16.07.004)",
	},
	{
		id: "missing",
		label: "Удален",
		color: "#64748b",
		dotColor: "#ef4444",
		description: "Отсутствующий зуб (удален ранее, K08.1)",
	},
	{
		id: "watch",
		label: "Наблюдение",
		color: "#d97706",
		dotColor: "#d97706",
		description: "Клиническое наблюдение (сомнительный прогноз)",
	},
] as const;

const ADULT_UPPER_ROW = [
	"18", "17", "16", "15", "14", "13", "12", "11",
	"21", "22", "23", "24", "25", "26", "27", "28",
];
const ADULT_LOWER_ROW = [
	"48", "47", "46", "45", "44", "43", "42", "41",
	"31", "32", "33", "34", "35", "36", "37", "38",
];

const MIXED_UPPER_ROW = [
	"16", "55", "54", "53", "52", "51",
	"61", "62", "63", "64", "65", "26",
];
const MIXED_LOWER_ROW = [
	"46", "85", "84", "83", "82", "81",
	"71", "72", "73", "74", "75", "36",
];

const PEDIATRIC_UPPER_ROW = [
	"55", "54", "53", "52", "51",
	"61", "62", "63", "64", "65",
];
const PEDIATRIC_LOWER_ROW = [
	"85", "84", "83", "82", "81",
	"71", "72", "73", "74", "75",
];

function isUpperRightTooth(code: string): boolean {
	const q = Math.floor(Number(code) / 10);
	return q === 1 || q === 5;
}
function isUpperLeftTooth(code: string): boolean {
	const q = Math.floor(Number(code) / 10);
	return q === 2 || q === 6;
}
function isLowerRightTooth(code: string): boolean {
	const q = Math.floor(Number(code) / 10);
	return q === 4 || q === 8;
}
function isLowerLeftTooth(code: string): boolean {
	const q = Math.floor(Number(code) / 10);
	return q === 3 || q === 7;
}

export function VisitEmbeddedOdontogram({
	activeQuadrant,
	setActiveQuadrant,
	activeStamp,
	setActiveStamp,
	activeStampRef,
	toothRows,
	toothStateByCode,
	draft,
	handleToothClick,
	dentitionMode: externalDentitionMode,
	onDentitionModeChange,
	onToggleToothDentition,
}: VisitEmbeddedOdontogramProps) {
	const detectedCodes = draft?.quality?.detectedToothCodes || [];

	const [localDentitionMode, setLocalDentitionMode] = useState<DentitionMode>(() => {
		if (externalDentitionMode) return externalDentitionMode;
		// Determine initial mode from passed tooth rows if any
		const allCodes = (toothRows || []).flat();
		const hasPediatric = allCodes.some((c) => {
			const n = Number(c);
			return n >= 51 && n <= 85;
		});
		const hasAdult = allCodes.some((c) => {
			const n = Number(c);
			return n >= 11 && n <= 48;
		});
		if (hasPediatric && hasAdult) return "mixed";
		if (hasPediatric) return "pediatric";
		return "adult";
	});

	const effectiveDentition = externalDentitionMode ?? localDentitionMode;

	const handleDentitionChange = useCallback(
		(newMode: DentitionMode) => {
			setLocalDentitionMode(newMode);
			if (onDentitionModeChange) {
				onDentitionModeChange(newMode);
			}
		},
		[onDentitionModeChange],
	);

	// Custom tooth replacements to allow granular toggling between primary and permanent teeth in mixed dentition
	const [customReplacements, setCustomReplacements] = useState<Record<string, string>>({});

	const handleToggleTooth = useCallback(
		(code: string) => {
			const num = Number(code);
			let nextCode = code;
			if (num >= 51 && num <= 85) {
				const succ = PRIMARY_TO_PERMANENT_SUCCESSOR_MAP[num];
				if (succ) nextCode = String(succ);
			} else if (num >= 11 && num <= 48) {
				const pred = PERMANENT_TO_PRIMARY_PREDECESSOR_MAP[num];
				if (pred) nextCode = String(pred);
			}

			if (nextCode !== code) {
				setCustomReplacements((prev) => ({
					...prev,
					[code]: nextCode,
					[nextCode]: nextCode,
				}));
				if (onToggleToothDentition) {
					onToggleToothDentition(code);
				}
			}
		},
		[onToggleToothDentition],
	);

	// Compute active tooth rows based on dentition mode
	const { upperRow, lowerRow } = useMemo(() => {
		let baseUpper: string[];
		let baseLower: string[];

		switch (effectiveDentition) {
			case "pediatric":
				baseUpper = [...PEDIATRIC_UPPER_ROW];
				baseLower = [...PEDIATRIC_LOWER_ROW];
				break;
			case "mixed":
				baseUpper = [...MIXED_UPPER_ROW];
				baseLower = [...MIXED_LOWER_ROW];
				break;
			case "adult":
			default:
				baseUpper = toothRows?.[0]?.length ? [...toothRows[0]] : [...ADULT_UPPER_ROW];
				baseLower = toothRows?.[1]?.length ? [...toothRows[1]] : [...ADULT_LOWER_ROW];
				break;
		}

		// Apply individual tooth toggles if present
		const mappedUpper = baseUpper.map((c) => customReplacements[c] ?? c);
		const mappedLower = baseLower.map((c) => customReplacements[c] ?? c);

		return { upperRow: mappedUpper, lowerRow: mappedLower };
	}, [effectiveDentition, toothRows, customReplacements]);

	// Split quadrants strictly by FDI quadrant numbering, preventing root geometry and array distortions
	const upperRightTeeth = useMemo(() => {
		const filtered = upperRow.filter(isUpperRightTooth);
		return filtered.length > 0 ? filtered : upperRow.slice(0, Math.ceil(upperRow.length / 2));
	}, [upperRow]);

	const upperLeftTeeth = useMemo(() => {
		const filtered = upperRow.filter(isUpperLeftTooth);
		return filtered.length > 0 ? filtered : upperRow.slice(Math.ceil(upperRow.length / 2));
	}, [upperRow]);

	const lowerRightTeeth = useMemo(() => {
		const filtered = lowerRow.filter(isLowerRightTooth);
		return filtered.length > 0 ? filtered : lowerRow.slice(0, Math.ceil(lowerRow.length / 2));
	}, [lowerRow]);

	const lowerLeftTeeth = useMemo(() => {
		const filtered = lowerRow.filter(isLowerLeftTooth);
		return filtered.length > 0 ? filtered : lowerRow.slice(Math.ceil(lowerRow.length / 2));
	}, [lowerRow]);

	return (
		<section
			className="tooth-map"
			aria-label="Зубная формула"
			data-tour="odontogram-formula"
			data-testid="odontogram-formula"
		>
			{/* Шапка зубной формулы с человеческой терминологией и переключателем прикуса (Мандаты 8c, 8z) */}
			<div className="tooth-map-head flex flex-wrap items-center justify-between gap-3 mb-2">
				<div>
					<h3 className="text-base font-bold text-[var(--odontogram-ink,#0f172a)] m-0">
						Зубная формула приёма
					</h3>
					<p className="text-xs text-[var(--odontogram-ink-muted,#64748b)] m-0">
						Отметки зубов и состояние зубного ряда текущего приёма.
					</p>
				</div>

				{/* Сегментированный переключатель прикуса: Постоянные / Сменный / Молочные */}
				<div
					className="dentition-mode-selector flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold"
					role="radiogroup"
					aria-label="Тип прикуса"
				>
					<button
						type="button"
						className={`px-3 py-1.5 rounded-md transition-all ${
							effectiveDentition === "adult"
								? "bg-teal-600 text-white shadow-sm font-bold"
								: "text-slate-600 dark:text-slate-300 hover:text-slate-900"
						}`}
						onClick={() => handleDentitionChange("adult")}
						title="Постоянные зубы: 32 зуба (нотация FDI 11–48)"
					>
						Постоянные зубы
					</button>
					<button
						type="button"
						className={`px-3 py-1.5 rounded-md transition-all ${
							effectiveDentition === "mixed"
								? "bg-teal-600 text-white shadow-sm font-bold"
								: "text-slate-600 dark:text-slate-300 hover:text-slate-900"
						}`}
						onClick={() => handleDentitionChange("mixed")}
						title="Сменный прикус: одновременное сосуществование молочных (51–85) и постоянных зубов (11–48)"
					>
						Сменный прикус
					</button>
					<button
						type="button"
						className={`px-3 py-1.5 rounded-md transition-all ${
							effectiveDentition === "pediatric"
								? "bg-teal-600 text-white shadow-sm font-bold"
								: "text-slate-600 dark:text-slate-300 hover:text-slate-900"
						}`}
						onClick={() => handleDentitionChange("pediatric")}
						title="Молочные зубы: 20 зубов (нотация FDI 51–85)"
					>
						Молочные зубы
					</button>
				</div>
			</div>

			{/* Панель выбора клинического статуса (Мандат 8c, 8e): Кариес, Пульпит, Пломба, Коронка, Удален, Наблюдение */}
			<div className="tooth-map-selected flex flex-wrap items-center justify-between gap-2 p-2 mb-3 bg-[var(--paper-strong,#ffffff)] border border-[var(--line,#e2e8f0)] rounded-lg">
				<div className="flex items-center gap-2 shrink-0">
					<strong className="text-xs uppercase tracking-wider text-teal-800 dark:text-teal-400 font-bold whitespace-nowrap shrink-0">
						Клинический статус:
					</strong>
					<span className="text-xs text-slate-500 dark:text-slate-400">
						{PATHOLOGY_STAMPS.find((s) => s.id === activeStamp)?.description ||
							"Выберите клинический статус для нанесения на формулу"}
					</span>
				</div>

				<div className="flex flex-wrap items-center gap-1.5" role="toolbar" aria-label="Быстрые штампы патологий">
					{PATHOLOGY_STAMPS.map((stamp) => {
						const isActive = activeStamp === stamp.id;
						return (
							<button
								key={stamp.id}
								type="button"
								className={`px-2.5 py-1 text-xs font-bold rounded-full transition-all border flex items-center gap-1.5 min-h-[32px] ${
									isActive
										? "active bg-teal-600 border-teal-600 text-white shadow-sm ring-2 ring-teal-500/30"
										: "bg-[var(--paper,#f8fafc)] border-[var(--line,#e2e8f0)] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
								}`}
								onClick={() => {
									setActiveStamp(stamp.id);
									activeStampRef.current = stamp.id;
								}}
								title={stamp.description}
							>
								<span
									className="w-2 h-2 rounded-full shrink-0"
									style={{ backgroundColor: stamp.dotColor }}
									aria-hidden="true"
								/>
								<span>{stamp.label}</span>
							</button>
						);
					})}
				</div>
			</div>

			{/* Навигация по секторам / квадрантам челюсти */}
			<nav
				className="quadrant-nav flex items-center gap-1.5 overflow-x-auto pb-1 mb-2"
				aria-label="Секторы челюсти"
			>
				<button
					type="button"
					className={`quadrant-nav-btn shrink-0 min-h-[34px] px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
						activeQuadrant === null
							? "active bg-teal-600 text-white border-teal-600 shadow-sm"
							: "bg-[var(--paper,#ffffff)] border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
					}`}
					onClick={() => setActiveQuadrant(null)}
					title="Обе челюсти целиком"
				>
					Все секторы
				</button>
				<button
					type="button"
					className={`quadrant-nav-btn shrink-0 min-h-[34px] px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
						activeQuadrant === 1
							? "active bg-teal-600 text-white border-teal-600 shadow-sm"
							: "bg-[var(--paper,#ffffff)] border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
					}`}
					onClick={() => setActiveQuadrant(1)}
					title="Первый сектор: верх справа (11–18, 51–55)"
				>
					Верх справа
				</button>
				<button
					type="button"
					className={`quadrant-nav-btn shrink-0 min-h-[34px] px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
						activeQuadrant === 2
							? "active bg-teal-600 text-white border-teal-600 shadow-sm"
							: "bg-[var(--paper,#ffffff)] border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
					}`}
					onClick={() => setActiveQuadrant(2)}
					title="Второй сектор: верх слева (21–28, 61–65)"
				>
					Верх слева
				</button>
				<button
					type="button"
					className={`quadrant-nav-btn shrink-0 min-h-[34px] px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
						activeQuadrant === 3
							? "active bg-teal-600 text-white border-teal-600 shadow-sm"
							: "bg-[var(--paper,#ffffff)] border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
					}`}
					onClick={() => setActiveQuadrant(3)}
					title="Третий сектор: низ слева (31–38, 71–75)"
				>
					Низ слева
				</button>
				<button
					type="button"
					className={`quadrant-nav-btn shrink-0 min-h-[34px] px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
						activeQuadrant === 4
							? "active bg-teal-600 text-white border-teal-600 shadow-sm"
							: "bg-[var(--paper,#ffffff)] border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
					}`}
					onClick={() => setActiveQuadrant(4)}
					title="Четвёртый сектор: низ справа (41–48, 81–85)"
				>
					Низ справа
				</button>
			</nav>

			{/* Зубная схема с челюстями и квадрантами */}
			<div
				className={`tooth-arch-wrapper ${activeQuadrant !== null ? "zoom-active" : ""}`}
			>
				{activeQuadrant === null && (
					<div className="tooth-quadrant-labels upper-labels flex justify-between px-2 text-[11px] font-semibold text-slate-400">
						<span
							className="quadrant-label"
							title="Первый сектор: верх справа (11–18, 51–55)"
						>
							верх справа
						</span>
						<span
							className="quadrant-label"
							title="Второй сектор: верх слева (21–28, 61–65)"
						>
							верх слева
						</span>
					</div>
				)}

				{/* Верхняя челюсть */}
				{(activeQuadrant === null ||
					activeQuadrant === 1 ||
					activeQuadrant === 2) && (
					<div className="tooth-jaw upper-jaw">
						{/* Правая половина верхней челюсти: Q1 / Q5 */}
						{(activeQuadrant === null || activeQuadrant === 1) && (
							<div className="tooth-half tooth-row">
								{upperRightTeeth.map((code) => (
									<VisitOdontogramToothItem
										key={code}
										code={code}
										state={toothStateByCode[code] ?? "idle"}
										isDetected={detectedCodes.includes(code)}
										onClick={handleToothClick}
										onToggleDentition={handleToggleTooth}
									/>
								))}
							</div>
						)}

						{/* Левая половина верхней челюсти: Q2 / Q6 */}
						{(activeQuadrant === null || activeQuadrant === 2) && (
							<div className="tooth-half tooth-row">
								{upperLeftTeeth.map((code) => (
									<VisitOdontogramToothItem
										key={code}
										code={code}
										state={toothStateByCode[code] ?? "idle"}
										isDetected={detectedCodes.includes(code)}
										onClick={handleToothClick}
										onToggleDentition={handleToggleTooth}
									/>
								))}
							</div>
						)}
					</div>
				)}

				{/* Нижняя челюсть */}
				{(activeQuadrant === null ||
					activeQuadrant === 3 ||
					activeQuadrant === 4) && (
					<div className="tooth-jaw lower-jaw">
						{/* Правая половина нижней челюсти: Q4 / Q8 */}
						{(activeQuadrant === null || activeQuadrant === 4) && (
							<div className="tooth-half tooth-row">
								{lowerRightTeeth.map((code) => (
									<VisitOdontogramToothItem
										key={code}
										code={code}
										state={toothStateByCode[code] ?? "idle"}
										isDetected={detectedCodes.includes(code)}
										onClick={handleToothClick}
										onToggleDentition={handleToggleTooth}
									/>
								))}
							</div>
						)}

						{/* Левая половина нижней челюсти: Q3 / Q7 */}
						{(activeQuadrant === null || activeQuadrant === 3) && (
							<div className="tooth-half tooth-row">
								{lowerLeftTeeth.map((code) => (
									<VisitOdontogramToothItem
										key={code}
										code={code}
										state={toothStateByCode[code] ?? "idle"}
										isDetected={detectedCodes.includes(code)}
										onClick={handleToothClick}
										onToggleDentition={handleToggleTooth}
									/>
								))}
							</div>
						)}
					</div>
				)}

				{activeQuadrant === null && (
					<div className="tooth-quadrant-labels lower-labels flex justify-between px-2 text-[11px] font-semibold text-slate-400">
						<span
							className="quadrant-label"
							title="Четвёртый сектор: низ справа (41–48, 81–85)"
						>
							низ справа
						</span>
						<span
							className="quadrant-label"
							title="Третий сектор: низ слева (31–38, 71–75)"
						>
							низ слева
						</span>
					</div>
				)}
			</div>
		</section>
	);
}
