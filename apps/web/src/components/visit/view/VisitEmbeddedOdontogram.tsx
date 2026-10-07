import React, { useState, useMemo, useCallback } from "react";
import {
	PRIMARY_TO_PERMANENT_SUCCESSOR_MAP,
	PERMANENT_TO_PRIMARY_PREDECESSOR_MAP,
} from "@dental/shared";
import { DenteToothSvgDefs } from "../../odontogram/chart/DenteToothSvgDefs";
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
		color: "#0d9488",
		dotColor: "#10b981",
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

		const mappedUpper = baseUpper.map((c) => customReplacements[c] ?? c);
		const mappedLower = baseLower.map((c) => customReplacements[c] ?? c);

		return { upperRow: mappedUpper, lowerRow: mappedLower };
	}, [effectiveDentition, toothRows, customReplacements]);

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

	// Scale factor: full arch fits 16 teeth across 1440x900 viewport comfortably
	const toothScale = activeQuadrant !== null ? 0.92 : 0.74;

	return (
		<section
			className="tooth-map select-none"
			aria-label="Зубная формула"
			data-tour="odontogram-formula"
			data-testid="odontogram-formula"
		>
			{/* Shared SVG Shaders & Gradients for realistic enamel and pathology shaders */}
			<DenteToothSvgDefs />

			{/* Шапка зубной формулы с лаконичной терминологией и переключателем прикуса (Apple HIG Segmented Bar) */}
			<div className="tooth-map-head flex flex-wrap items-center justify-between gap-3 mb-2">
				<div>
					<h3 className="text-sm font-bold text-[var(--odontogram-ink,#0f172a)] m-0">
						Зубная формула приёма
					</h3>
					<p className="text-xs text-[var(--odontogram-ink-muted,#64748b)] m-0">
						Анатомический статус зубов и состояние зубного ряда текущего приёма
					</p>
				</div>

				{/* Сегментированный переключатель прикуса: Постоянные зубы | Сменный прикус | Молочные зубы (Apple HIG) */}
				<div
					className="dentition-mode-selector"
					role="radiogroup"
					aria-label="Тип прикуса"
				>
					<button
						type="button"
						className={effectiveDentition === "adult" ? "active" : ""}
						onClick={() => handleDentitionChange("adult")}
						title="Постоянные зубы: 32 зуба (нотация FDI 11–48)"
					>
						Постоянные зубы
					</button>
					<button
						type="button"
						className={effectiveDentition === "mixed" ? "active" : ""}
						onClick={() => handleDentitionChange("mixed")}
						title="Сменный прикус: одновременное сосуществование молочных (51–85) и постоянных зубов (11–48)"
					>
						Сменный прикус
					</button>
					<button
						type="button"
						className={effectiveDentition === "pediatric" ? "active" : ""}
						onClick={() => handleDentitionChange("pediatric")}
						title="Молочные зубы: 20 зубов (нотация FDI 51–85)"
					>
						Молочные зубы
					</button>
				</div>
			</div>

			{/* Аккуратная полоса клинического статуса и штампов в единой гамме */}
			<div className="tooth-map-selected flex flex-wrap items-center justify-between gap-2 p-2 mb-2 bg-[var(--paper-strong,#ffffff)] dark:bg-[var(--paper-strong,#1e293b)] border border-[var(--line,#e2e8f0)] dark:border-[var(--line,#334155)] rounded-lg">
				<div className="flex items-center gap-2 shrink-0">
					<span className="text-xs font-semibold text-[var(--muted,#64748b)] whitespace-nowrap shrink-0">
						Клинический статус:
					</span>
					<span className="text-xs text-[var(--muted,#64748b)] hidden sm:inline">
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
								className={`px-2.5 py-1 text-xs rounded-full transition-all border flex items-center gap-1.5 min-h-[30px] cursor-pointer ${
									isActive
										? "active bg-teal-600/10 dark:bg-teal-500/20 border-teal-600 dark:border-teal-400 text-teal-800 dark:text-teal-200 font-bold shadow-xs ring-1 ring-teal-500/30"
										: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-soft)] font-medium"
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
					className={`quadrant-nav-btn shrink-0 min-h-[32px] px-3 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
						activeQuadrant === null
							? "active bg-teal-600 text-white border-teal-600 shadow-xs font-bold"
							: "bg-[var(--paper,#ffffff)] dark:bg-[var(--paper-soft,#1e293b)] border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
					}`}
					onClick={() => setActiveQuadrant(null)}
					title="Обе челюсти целиком"
				>
					Все секторы
				</button>
				<button
					type="button"
					className={`quadrant-nav-btn shrink-0 min-h-[32px] px-3 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
						activeQuadrant === 1
							? "active bg-teal-600 text-white border-teal-600 shadow-xs font-bold"
							: "bg-[var(--paper,#ffffff)] dark:bg-[var(--paper-soft,#1e293b)] border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
					}`}
					onClick={() => setActiveQuadrant(1)}
					title="Первый сектор: верх справа (11–18, 51–55)"
				>
					Верх справа
				</button>
				<button
					type="button"
					className={`quadrant-nav-btn shrink-0 min-h-[32px] px-3 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
						activeQuadrant === 2
							? "active bg-teal-600 text-white border-teal-600 shadow-xs font-bold"
							: "bg-[var(--paper,#ffffff)] dark:bg-[var(--paper-soft,#1e293b)] border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
					}`}
					onClick={() => setActiveQuadrant(2)}
					title="Второй сектор: верх слева (21–28, 61–65)"
				>
					Верх слева
				</button>
				<button
					type="button"
					className={`quadrant-nav-btn shrink-0 min-h-[32px] px-3 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
						activeQuadrant === 3
							? "active bg-teal-600 text-white border-teal-600 shadow-xs font-bold"
							: "bg-[var(--paper,#ffffff)] dark:bg-[var(--paper-soft,#1e293b)] border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
					}`}
					onClick={() => setActiveQuadrant(3)}
					title="Третий сектор: низ слева (31–38, 71–75)"
				>
					Низ слева
				</button>
				<button
					type="button"
					className={`quadrant-nav-btn shrink-0 min-h-[32px] px-3 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
						activeQuadrant === 4
							? "active bg-teal-600 text-white border-teal-600 shadow-xs font-bold"
							: "bg-[var(--paper,#ffffff)] dark:bg-[var(--paper-soft,#1e293b)] border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
					}`}
					onClick={() => setActiveQuadrant(4)}
					title="Четвёртый сектор: низ справа (41–48, 81–85)"
				>
					Низ справа
				</button>
			</nav>

			{/* Зубная схема с челюстями и квадрантами — анатомический рендеринг без мусорных плашек */}
			<div
				className={`tooth-arch-wrapper w-full max-w-full flex flex-col items-center overflow-x-auto ${activeQuadrant !== null ? "zoom-active" : ""}`}
			>
				{/* Верхняя челюсть */}
				{(activeQuadrant === null ||
					activeQuadrant === 1 ||
					activeQuadrant === 2) && (
					<div className="tooth-jaw upper-jaw flex items-end justify-center gap-0">
						{/* Правая половина верхней челюсти: Q1 / Q5 */}
						{(activeQuadrant === null || activeQuadrant === 1) && (
							<div className="tooth-half tooth-row flex items-end justify-end gap-1">
								{upperRightTeeth.map((code) => (
									<VisitOdontogramToothItem
										key={code}
										code={code}
										state={toothStateByCode[code] ?? "idle"}
										isDetected={detectedCodes.includes(code)}
										onClick={handleToothClick}
										onToggleDentition={handleToggleTooth}
										scale={toothScale}
									/>
								))}
							</div>
						)}

						{/* Центральная сагиттальная граница */}
						{activeQuadrant === null && (
							<div
								className="tooth-arch-midline-guide top-guide mx-1 self-stretch flex items-center justify-center opacity-40 select-none pointer-events-none"
								title="Сагиттальная линия"
							>
								<div className="w-[1.5px] h-full bg-teal-500/40 rounded-full" />
							</div>
						)}

						{/* Левая половина верхней челюсти: Q2 / Q6 */}
						{(activeQuadrant === null || activeQuadrant === 2) && (
							<div className="tooth-half tooth-row flex items-end justify-start gap-1">
								{upperLeftTeeth.map((code) => (
									<VisitOdontogramToothItem
										key={code}
										code={code}
										state={toothStateByCode[code] ?? "idle"}
										isDetected={detectedCodes.includes(code)}
										onClick={handleToothClick}
										onToggleDentition={handleToggleTooth}
										scale={toothScale}
									/>
								))}
							</div>
						)}
					</div>
				)}

				{/* Окклюзионная линия смыкания между челюстями */}
				{activeQuadrant === null && (
					<div className="tooth-occlusion-line w-full max-w-4xl flex items-center justify-center my-1 select-none pointer-events-none opacity-30">
						<div className="flex-1 h-px bg-[var(--line,#e2e8f0)]" />
					</div>
				)}

				{/* Нижняя челюсть */}
				{(activeQuadrant === null ||
					activeQuadrant === 3 ||
					activeQuadrant === 4) && (
					<div className="tooth-jaw lower-jaw flex items-start justify-center gap-0">
						{/* Правая половина нижней челюсти: Q4 / Q8 */}
						{(activeQuadrant === null || activeQuadrant === 4) && (
							<div className="tooth-half tooth-row flex items-start justify-end gap-1">
								{lowerRightTeeth.map((code) => (
									<VisitOdontogramToothItem
										key={code}
										code={code}
										state={toothStateByCode[code] ?? "idle"}
										isDetected={detectedCodes.includes(code)}
										onClick={handleToothClick}
										onToggleDentition={handleToggleTooth}
										scale={toothScale}
									/>
								))}
							</div>
						)}

						{/* Центральная сагиттальная граница */}
						{activeQuadrant === null && (
							<div
								className="tooth-arch-midline-guide bottom-guide mx-1 self-stretch flex items-center justify-center opacity-40 select-none pointer-events-none"
								title="Сагиттальная линия"
							>
								<div className="w-[1.5px] h-full bg-teal-500/40 rounded-full" />
							</div>
						)}

						{/* Левая половина нижней челюсти: Q3 / Q7 */}
						{(activeQuadrant === null || activeQuadrant === 3) && (
							<div className="tooth-half tooth-row flex items-start justify-start gap-1">
								{lowerLeftTeeth.map((code) => (
									<VisitOdontogramToothItem
										key={code}
										code={code}
										state={toothStateByCode[code] ?? "idle"}
										isDetected={detectedCodes.includes(code)}
										onClick={handleToothClick}
										onToggleDentition={handleToggleTooth}
										scale={toothScale}
									/>
								))}
							</div>
						)}
					</div>
				)}
			</div>
		</section>
	);
}
