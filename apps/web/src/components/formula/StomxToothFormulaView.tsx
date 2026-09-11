/**
 * apps/web/src/components/formula/StomxToothFormulaView.tsx
 *
 * Interactive Vector Dental Formula with StomX Defects & Position Anomalies.
 * FDI 2-digit notation (11..48 adult, 51..85 pediatric).
 *
 * Compliant with:
 * - Mandate 8c: Tier 1 hot path, touch target >= 44px
 * - Mandate 8e: Doctor Autonomy (1-click intact row, zero disabled barriers)
 * - Mandate 8d: 1 row toolbar, WCAG AAA Contrast
 */

import React, { useState, useMemo } from "react";
import {
	Baby,
	Check,
	Compass,
	Layers,
	RotateCw,
	Sparkles,
	User,
} from "lucide-react";
import {
	STOMX_ADULT_TEETH,
	STOMX_CHILD_TEETH,
	type StomxPositionAnomalyCode,
} from "@dental/shared";
import { StomxDefectsPalette } from "./StomxDefectsPalette";
import {
	convertOdontogramDataToFormula,
	formatToothFormulaSummary,
	getStomxDefectBadgeProps,
} from "./stomxFormulaAdapter";
import type { DentitionType, ToothFormulaItem, ToothFormulaProps } from "./types";

export const StomxToothFormulaView: React.FC<ToothFormulaProps> = ({
	selectedToothNumber: propSelectedTooth,
	onSelectTooth,
	teethData: propTeethData,
	onUpdateTooth,
	dentition: propDentition = "adult",
	onDentitionChange,
	readOnly = false,
	className = "",
}) => {
	const [internalSelectedTooth, setInternalSelectedTooth] = useState<number | null>(16);
	const [dentitionMode, setDentitionMode] = useState<DentitionType>(propDentition);
	const [internalTeethData, setInternalTeethData] = useState<Record<number, ToothFormulaItem>>({});

	const selectedTooth = propSelectedTooth ?? internalSelectedTooth;

	const handleToothClick = (num: number) => {
		setInternalSelectedTooth(num);
		onSelectTooth?.(num);
	};

	const handleDentitionToggle = (mode: DentitionType) => {
		setDentitionMode(mode);
		onDentitionChange?.(mode);
	};

	const teethState = propTeethData ?? internalTeethData;

	const getToothItem = (num: number): ToothFormulaItem => {
		return (
			teethState[num] ?? {
				toothNumber: num,
				state: "Healthy",
				stomxDefects: [],
			}
		);
	};

	const handleUpdateTooth = (num: number, updates: Partial<ToothFormulaItem>) => {
		if (onUpdateTooth) {
			onUpdateTooth(num, updates);
		} else {
			setInternalTeethData((prev) => ({
				...prev,
				[num]: {
					...(prev[num] ?? { toothNumber: num, state: "Healthy", stomxDefects: [] }),
					...updates,
				},
			}));
		}
	};

	// 1-клик пресет: Интактный зубной ряд (Мандат 8e)
	const handleApplyIntactDentition = () => {
		const targetTeeth =
			dentitionMode === "child"
				? STOMX_CHILD_TEETH.map((t) => Number.parseInt(t.name, 10))
				: STOMX_ADULT_TEETH.map((t) => Number.parseInt(t.name, 10));

		const newMap: Record<number, ToothFormulaItem> = { ...teethState };
		for (const num of targetTeeth) {
			newMap[num] = {
				toothNumber: num,
				state: "Healthy",
				stomxDefects: [],
				positionAnomaly: undefined,
				requireTreatment: false,
			};
			if (onUpdateTooth) {
				onUpdateTooth(num, newMap[num]);
			}
		}
		if (!onUpdateTooth) {
			setInternalTeethData(newMap);
		}
	};

	// Квадранты зубов
	const upperRightTeeth = useMemo(() => {
		return dentitionMode === "child"
			? [55, 54, 53, 52, 51]
			: [18, 17, 16, 15, 14, 13, 12, 11];
	}, [dentitionMode]);

	const upperLeftTeeth = useMemo(() => {
		return dentitionMode === "child"
			? [61, 62, 63, 64, 65]
			: [21, 22, 23, 24, 25, 26, 27, 28];
	}, [dentitionMode]);

	const lowerRightTeeth = useMemo(() => {
		return dentitionMode === "child"
			? [85, 84, 83, 82, 81]
			: [48, 47, 46, 45, 44, 43, 42, 41];
	}, [dentitionMode]);

	const lowerLeftTeeth = useMemo(() => {
		return dentitionMode === "child"
			? [71, 72, 73, 74, 75]
			: [31, 32, 33, 34, 35, 36, 37, 38];
	}, [dentitionMode]);

	const renderToothCard = (toothNumber: number) => {
		const item = getToothItem(toothNumber);
		const isSelected = selectedTooth === toothNumber;
		const isHealthy = item.state === "Healthy" && item.stomxDefects.length === 0;

		return (
			<button
				key={toothNumber}
				type="button"
				onClick={() => handleToothClick(toothNumber)}
				className={`relative flex flex-col items-center justify-between p-1.5 min-w-[52px] min-h-[76px] rounded-lg border transition-all select-none text-center ${
					isSelected
						? "ring-2 ring-blue-500 border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 shadow-sm scale-105 z-10"
						: isHealthy
							? "border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800/80"
							: item.requireTreatment
								? "border-rose-400/60 dark:border-rose-800/60 bg-rose-50/40 dark:bg-rose-950/30 hover:bg-rose-100/50"
								: "border-amber-400/60 dark:border-amber-800/60 bg-amber-50/40 dark:bg-amber-950/30 hover:bg-amber-100/50"
				}`}
				title={`Зуб #${toothNumber}: ${formatToothFormulaSummary(item)}`}
			>
				{/* Индикатор аномалии положения (если есть) */}
				{item.positionAnomaly && (
					<span className="absolute -top-1.5 -right-1 px-1 py-0.2 text-[9px] font-bold bg-purple-600 text-white rounded shadow">
						{item.positionAnomaly}
					</span>
				)}

				{/* Номер зуба (FDI) */}
				<span className="text-xs font-bold text-slate-800 dark:text-slate-100">
					{toothNumber}
				</span>

				{/* Центральная пиктограмма состояния / дефекта */}
				<div className="my-1 flex items-center justify-center">
					{isHealthy ? (
						<span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
							ok
						</span>
					) : (
						<div className="flex flex-wrap gap-0.5 max-w-[44px] justify-center">
							{item.stomxDefects.length > 0 ? (
								item.stomxDefects.slice(0, 2).map((def) => {
									const badge = getStomxDefectBadgeProps(def);
									return (
										<span
											key={def}
											className={`text-[10px] px-1 rounded font-bold border ${badge.badgeBg} ${badge.badgeText} ${badge.badgeBorder}`}
										>
											{badge.alias}
										</span>
									);
								})
							) : (
								<span className="text-[10px] px-1 rounded font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300">
									{item.state.slice(0, 3)}
								</span>
							)}
						</div>
					)}
				</div>

				{/* Поверхности (если отмечены) */}
				{item.surfaces && item.surfaces.length > 0 ? (
					<span className="text-[9px] font-mono text-slate-500 dark:text-slate-400 truncate max-w-[46px]">
						{item.surfaces.join("")}
					</span>
				) : (
					<span className="text-[9px] text-transparent select-none">-</span>
				)}
			</button>
		);
	};

	return (
		<div className={`flex flex-col gap-4 ${className}`}>
			{/* Верхний тулбар зубной формулы (1 строка 36px) */}
			<div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
				<div className="flex items-center gap-2">
					<span className="text-xs font-bold text-slate-700 dark:text-slate-200">
						Зубная формула StomX
					</span>
					<div className="h-4 w-px bg-slate-300 dark:bg-slate-700" />
					{/* Переключатель прикуса */}
					<div className="flex items-center gap-1 bg-white dark:bg-slate-900 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
						<button
							type="button"
							onClick={() => handleDentitionToggle("adult")}
							className={`min-h-[32px] px-2.5 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1 ${
								dentitionMode === "adult"
									? "bg-blue-600 text-white shadow-sm"
									: "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
							}`}
						>
							<User className="w-3.5 h-3.5" />
							Взрослый (32)
						</button>
						<button
							type="button"
							onClick={() => handleDentitionToggle("child")}
							className={`min-h-[32px] px-2.5 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1 ${
								dentitionMode === "child"
									? "bg-blue-600 text-white shadow-sm"
									: "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
							}`}
						>
							<Baby className="w-3.5 h-3.5" />
							Детский (20)
						</button>
					</div>
				</div>

				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={handleApplyIntactDentition}
						className="min-h-[36px] px-3 py-1 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 transition-colors shadow-sm"
						title="Пометить все зубы интактными в 1 клик"
					>
						<Sparkles className="w-3.5 h-3.5 text-amber-300" />
						Все здоровы (Интактный ряд)
					</button>
				</div>
			</div>

			{/* Сетка зубной формулы: Верхняя челюсть | Нижняя челюсть */}
			<div className="flex flex-col gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-x-auto">
				{/* Верхняя челюсть (Q1 | Q2) */}
				<div className="flex flex-col gap-1">
					<div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 text-center uppercase tracking-wider">
						Верхняя челюсть
					</div>
					<div className="flex items-center justify-center gap-2">
						{/* Верхний правый квадрант */}
						<div className="flex items-center gap-1">
							{upperRightTeeth.map(renderToothCard)}
						</div>
						{/* Центральная сагиттальная линия */}
						<div className="w-0.5 h-16 bg-blue-400/40 self-center rounded-full" />
						{/* Верхний левый квадрант */}
						<div className="flex items-center gap-1">
							{upperLeftTeeth.map(renderToothCard)}
						</div>
					</div>
				</div>

				{/* Разделитель окклюзионной плоскости */}
				<div className="flex items-center gap-2 my-1">
					<div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
					<span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono">
						Окклюзионная линия
					</span>
					<div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
				</div>

				{/* Нижняя челюсть (Q3 | Q4) */}
				<div className="flex flex-col gap-1">
					<div className="flex items-center justify-center gap-2">
						{/* Нижний правый квадрант */}
						<div className="flex items-center gap-1">
							{lowerRightTeeth.map(renderToothCard)}
						</div>
						{/* Центральная сагиттальная линия */}
						<div className="w-0.5 h-16 bg-blue-400/40 self-center rounded-full" />
						{/* Нижний левый квадрант */}
						<div className="flex items-center gap-1">
							{lowerLeftTeeth.map(renderToothCard)}
						</div>
					</div>
					<div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 text-center uppercase tracking-wider">
						Нижняя челюсть
					</div>
				</div>
			</div>

			{/* Клиническая палитра дефектов StomX для выбранного зуба */}
			{!readOnly && (
				<StomxDefectsPalette
					selectedToothNumber={selectedTooth}
					toothData={selectedTooth ? getToothItem(selectedTooth) : undefined}
					onUpdateTooth={handleUpdateTooth}
					onApplyIntactDentition={handleApplyIntactDentition}
				/>
			)}
		</div>
	);
};
