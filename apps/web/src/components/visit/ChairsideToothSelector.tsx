import React from "react";
import { ChevronDown, ChevronUp, Layers, Target, X } from "lucide-react";
import { FDI_LOWER_TEETH, FDI_UPPER_TEETH } from "./completedServicesPlan";
import { useVisitStore, type ToothState } from "../../store/visitStore";

function getToothBadgeColor(state: ToothState | undefined): string | null {
	switch (state) {
		case "done":
			return "#16a34a"; // Зеленый: вылечен / пломба
		case "crown":
			return "#ca8a04"; // Золотистый: коронка
		case "treatment":
		case "pulpitis":
			return "#ef4444"; // Красный: лечение / пульпит
		case "caries":
			return "#ea580c"; // Оранжевый: кариес
		case "watch":
			return "#d97706"; // Янтарный: наблюдение
		case "missing":
			return "#64748b"; // Серый: удален
		case "planned":
			return "#0284c7"; // Голубой: запланирован
		default:
			return null;
	}
}

export interface ChairsideToothSelectorProps {
	selectedTooth: string | null;
	onSelectTooth: (tooth: string | null) => void;
	isToothGridOpen: boolean;
	onToggleToothGrid: () => void;
}

export const ChairsideToothSelector: React.FC<ChairsideToothSelectorProps> = ({
	selectedTooth,
	onSelectTooth,
	isToothGridOpen,
	onToggleToothGrid,
}) => {
	const toothStateByCode = useVisitStore((state) => state.visitToothStateByCode);
	const [isMultiSelect, setIsMultiSelect] = React.useState<boolean>(() => {
		return Boolean(selectedTooth && selectedTooth.includes(","));
	});

	// Парсинг выбранных зубов в массив строк
	const selectedTeethList = React.useMemo(() => {
		if (!selectedTooth) return [];
		return selectedTooth
			.split(",")
			.map((t) => t.trim())
			.filter(Boolean);
	}, [selectedTooth]);

	// Выбор / переключение одного зуба
	const handleToothClick = (t: string | number) => {
		const str = String(t);
		if (isMultiSelect) {
			let next: string[];
			if (selectedTeethList.includes(str)) {
				next = selectedTeethList.filter((x) => x !== str);
			} else {
				next = [...selectedTeethList, str].sort((a, b) => Number(a) - Number(b));
			}
			const result = next.length > 0 ? next.join(", ") : null;
			onSelectTooth(result);
			if (next.length === 1) {
				const n = Number(next[0]);
				if (n) useVisitStore.getState().setActiveToothNumber(n);
			} else if (next.length === 0) {
				useVisitStore.getState().setActiveToothNumber(null);
			}
		} else {
			if (selectedTooth === str) {
				// 1-клик сброс при повторном клике на выбранный зуб
				onSelectTooth(null);
				useVisitStore.getState().setActiveToothNumber(null);
			} else {
				onSelectTooth(str);
				const n = Number(str);
				if (n) useVisitStore.getState().setActiveToothNumber(n);
			}
		}
	};

	// Выбор клинической группы зубов
	const handleSelectGroup = (teeth: readonly number[]) => {
		const groupStr = teeth.join(", ");
		onSelectTooth(groupStr);
		if (teeth.length === 1 && teeth[0] !== undefined) {
			useVisitStore.getState().setActiveToothNumber(teeth[0]);
		}
	};

	// Полный сброс в состояние «Без зуба»
	const handleClear = () => {
		onSelectTooth(null);
		useVisitStore.getState().setActiveToothNumber(null);
	};

	const firstSelectedTooth = selectedTeethList[0];

	return (
		<div className="mb-3 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
			<div className="flex flex-wrap items-center justify-between gap-2 mb-2">
				<div className="flex items-center gap-2 flex-wrap">
					<span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
						<Target className="w-3.5 h-3.5 text-indigo-500" />
						Привязка к зубу:
					</span>
					{selectedTeethList.length > 0 ? (
						<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200 border border-indigo-300 dark:border-indigo-700">
							{selectedTeethList.length === 1 && firstSelectedTooth !== undefined ? (
								<>
									<span>Зуб {firstSelectedTooth}</span>
									{getToothBadgeColor(toothStateByCode[firstSelectedTooth]) && (
										<span
											className="w-2 h-2 rounded-full shrink-0"
											style={{
												backgroundColor: getToothBadgeColor(
													toothStateByCode[firstSelectedTooth],
												)!,
											}}
											title={`Клинический статус: ${toothStateByCode[firstSelectedTooth]}`}
										/>
									)}
								</>
							) : (
								<span>Зубы: {selectedTeethList.join(", ")} ({selectedTeethList.length})</span>
							)}
							<button
								type="button"
								onClick={handleClear}
								className="hover:text-indigo-950 dark:hover:text-white p-0.5 rounded-full focus:outline-none cursor-pointer min-w-[20px] min-h-[20px] inline-flex items-center justify-center"
								title="Сбросить (Без зуба)"
								aria-label="Сбросить привязку к зубу"
							>
								<X className="w-3.5 h-3.5" />
							</button>
						</span>
					) : (
						<span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
							Без зуба (общая услуга)
						</span>
					)}
				</div>

				<div className="flex items-center gap-2 flex-wrap">
					<button
						type="button"
						onClick={() => setIsMultiSelect(!isMultiSelect)}
						className={`text-xs min-h-[44px] py-1.5 px-3 rounded-md font-medium flex items-center gap-1.5 transition-colors cursor-pointer border ${
							isMultiSelect
								? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
								: "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
						}`}
						title={
							isMultiSelect
								? "Режим множественного выбора зубов активен"
								: "Включить выбор нескольких зубов или группы"
						}
					>
						<Layers className="w-3.5 h-3.5" />
						<span>{isMultiSelect ? "Группа (вкл.)" : "Выбор группы"}</span>
					</button>

					<button
						type="button"
						onClick={onToggleToothGrid}
						className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium flex items-center gap-1 min-h-[44px] py-1.5 px-3 rounded hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors cursor-pointer border border-transparent hover:border-indigo-200"
					>
						{isToothGridOpen ? (
							<>
								Скрыть формулу <ChevronUp className="w-3.5 h-3.5" />
							</>
						) : (
							<>
								Все 32 зуба (11–48) <ChevronDown className="w-3.5 h-3.5" />
							</>
						)}
					</button>
				</div>
			</div>

			{/* Быстрые группы зубов при активном мульти-выборе */}
			{isMultiSelect && (
				<div className="mb-2.5 p-2 rounded-md bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/40 flex flex-wrap items-center gap-1.5 text-xs">
					<span className="text-[11px] font-semibold text-indigo-900 dark:text-indigo-300 mr-1">
						Быстрые группы:
					</span>
					<button
						type="button"
						onClick={() => handleSelectGroup([13, 12, 11, 21, 22, 23])}
						className="min-h-[44px] px-3 py-1.5 rounded-md bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 cursor-pointer text-xs font-medium"
					>
						Фронт в/ч (13–23)
					</button>
					<button
						type="button"
						onClick={() => handleSelectGroup([43, 42, 41, 31, 32, 33])}
						className="min-h-[44px] px-3 py-1.5 rounded-md bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 cursor-pointer text-xs font-medium"
					>
						Фронт н/ч (33–43)
					</button>
					<button
						type="button"
						onClick={() => handleSelectGroup(FDI_UPPER_TEETH)}
						className="min-h-[44px] px-3 py-1.5 rounded-md bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 cursor-pointer text-xs font-medium"
					>
						Вся в/ч (18–28)
					</button>
					<button
						type="button"
						onClick={() => handleSelectGroup(FDI_LOWER_TEETH)}
						className="min-h-[44px] px-3 py-1.5 rounded-md bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 cursor-pointer text-xs font-medium"
					>
						Вся н/ч (48–38)
					</button>
					{selectedTeethList.length > 0 && (
						<button
							type="button"
							onClick={handleClear}
							className="min-h-[44px] px-3 py-1.5 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/40 cursor-pointer text-xs font-medium ml-auto"
						>
							Сбросить
						</button>
					)}
				</div>
			)}

			{/* 1-tap quick tooth chips */}
			<div className="flex flex-wrap items-center gap-1.5">
				<button
					type="button"
					onClick={handleClear}
					className={`min-h-[44px] px-3 py-1.5 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
						selectedTeethList.length === 0
							? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
							: "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
					}`}
				>
					Без зуба
				</button>
				{[11, 16, 21, 26, 31, 36, 41, 46].map((t) => {
					const active = selectedTeethList.includes(String(t));
					const state = toothStateByCode[String(t)];
					const badgeColor = getToothBadgeColor(state);
					return (
						<button
							key={t}
							type="button"
							onClick={() => handleToothClick(t)}
							className={`min-w-[44px] min-h-[44px] px-2 py-1.5 rounded-md text-xs font-mono font-semibold border transition-all cursor-pointer inline-flex items-center justify-center gap-1 ${
								active
									? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
									: "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
							}`}
							title={state ? `Зуб ${t} (${state})` : `Зуб ${t}`}
						>
							<span>{t}</span>
							{badgeColor && (
								<span
									className="w-1.5 h-1.5 rounded-full shrink-0"
									style={{ backgroundColor: badgeColor }}
								/>
							)}
						</button>
					);
				})}
			</div>

			{/* Разворачиваемая зубная формула FDI */}
			{isToothGridOpen && (
				<div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-700/80 space-y-2">
					<div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
						Верхняя челюсть (18–11, 21–28):
					</div>
					<div className="flex flex-wrap gap-1">
						{FDI_UPPER_TEETH.map((t) => {
							const active = selectedTeethList.includes(String(t));
							const state = toothStateByCode[String(t)];
							const badgeColor = getToothBadgeColor(state);
							return (
								<button
									key={t}
									type="button"
									onClick={() => handleToothClick(t)}
									className={`min-w-[44px] min-h-[44px] p-1 rounded text-xs font-mono font-bold border transition-all cursor-pointer inline-flex flex-col items-center justify-center gap-0.5 ${
										active
											? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
											: "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
									}`}
									title={state ? `Зуб ${t} (${state})` : `Зуб ${t}`}
								>
									<span>{t}</span>
									{badgeColor && (
										<span
											className="w-1.5 h-1.5 rounded-full shrink-0"
											style={{ backgroundColor: badgeColor }}
										/>
									)}
								</button>
							);
						})}
					</div>
					<div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium pt-1">
						Нижняя челюсть (48–41, 31–38):
					</div>
					<div className="flex flex-wrap gap-1">
						{FDI_LOWER_TEETH.map((t) => {
							const active = selectedTeethList.includes(String(t));
							const state = toothStateByCode[String(t)];
							const badgeColor = getToothBadgeColor(state);
							return (
								<button
									key={t}
									type="button"
									onClick={() => handleToothClick(t)}
									className={`min-w-[44px] min-h-[44px] p-1 rounded text-xs font-mono font-bold border transition-all cursor-pointer inline-flex flex-col items-center justify-center gap-0.5 ${
										active
											? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
											: "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
									}`}
									title={state ? `Зуб ${t} (${state})` : `Зуб ${t}`}
								>
									<span>{t}</span>
									{badgeColor && (
										<span
											className="w-1.5 h-1.5 rounded-full shrink-0"
											style={{ backgroundColor: badgeColor }}
										/>
									)}
								</button>
							);
						})}
					</div>
				</div>
			)}
		</div>
	);
};
