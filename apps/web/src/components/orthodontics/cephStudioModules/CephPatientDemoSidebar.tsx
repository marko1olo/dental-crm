import React from "react";
import { Smile } from "lucide-react";
import type { CephalometricAnalysisResult } from "../cephalometricMath";

export interface CephPatientDemoSidebarProps {
	readonly theme: "light" | "dark";
	readonly analysis: CephalometricAnalysisResult;
	readonly onInsertToChart: () => void;
}

export const CephPatientDemoSidebar: React.FC<CephPatientDemoSidebarProps> = ({
	theme,
	analysis,
	onInsertToChart,
}) => {
	const isLight = theme === "light";
	return (
		<div className={`flex-1 flex flex-col overflow-y-auto p-5 space-y-4 ${isLight ? "bg-slate-50 text-slate-800" : "bg-slate-900 text-slate-200"}`}>
			<div className="p-4 rounded-2xl bg-gradient-to-br from-purple-900/40 to-slate-800/80 border border-purple-500/30">
				<div className="flex items-center gap-2 mb-2">
					<Smile className="text-purple-400" size={20} />
					<h2 className="text-sm font-bold text-white uppercase tracking-wider m-0">
						Эстетический анализ профиля
					</h2>
				</div>
				<p className="text-xs text-purple-200 leading-relaxed m-0">
					Наглядная визуализация положения челюстей, губ и зубов для согласования плана ортодонтического лечения.
				</p>
			</div>

			<div className="p-4 rounded-xl bg-slate-800/90 border border-slate-700 space-y-2.5">
				<div className="flex items-center justify-between">
					<span className="text-xs font-bold text-slate-200 uppercase tracking-wide">
						Эстетическая линия Риккетса (E-Line)
					</span>
					<span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950 border border-purple-800 text-purple-300 font-bold">
						Профиль лица
					</span>
				</div>
				<p className="text-xs text-slate-300 leading-relaxed m-0">
					Прямая линия, соединяющая кончик носа (Pn) и наиболее выступающую точку подбородка (PogS).
				</p>
				<div className="p-3 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] space-y-2">
					<div className="flex items-center justify-between text-xs">
						<span className="text-slate-400">Верхняя губа:</span>
						<span className="font-bold text-emerald-400">Норма -4 мм (гармоничное смыкание)</span>
					</div>
					<div className="flex items-center justify-between text-xs">
						<span className="text-slate-400">Нижняя губа:</span>
						<span className="font-bold text-emerald-400">Норма -2 мм (правильная поддержка)</span>
					</div>
				</div>
				<div className="text-[11px] text-teal-300 font-medium">
					✓ Профиль пропорционален, выраженного западания или выпячивания губ не наблюдается.
				</div>
			</div>

			<div className="p-4 rounded-xl bg-slate-800/90 border border-slate-700 space-y-2.5">
				<div className="flex items-center justify-between">
					<span className="text-xs font-bold text-slate-200 uppercase tracking-wide">
						Соотношение челюстей
					</span>
					<span
						className={`text-[10px] px-2 py-0.5 rounded font-bold ${
							analysis.diagnosis.skeletalClass === "Class I"
								? "bg-emerald-950 border border-emerald-800 text-emerald-300"
								: analysis.diagnosis.skeletalClass === "Class II"
									? "bg-amber-950 border border-amber-800 text-amber-300"
									: "bg-indigo-950 border border-indigo-800 text-indigo-300"
						}`}
					>
						{analysis.diagnosis.skeletalClassRu}
					</span>
				</div>
				<div className="p-3 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)]">
					<p className="text-xs text-slate-200 leading-relaxed m-0">
						{analysis.diagnosis.skeletalClass === "Class I"
							? "Челюсти расположены в правильном нейтральном соотношении. Основная задача — ровное выравнивание зубного ряда и закрытие промежутков."
							: analysis.diagnosis.skeletalClass === "Class II"
								? "Верхняя челюсть расположена слегка впереди относительно нижней (дистальное смещение). Требуется мягкая коррекция прикуса на брекетах или элайнерах."
								: "Нижняя челюсть выступает вперед (мезиальное соотношение). Требуется удержание наклона нижних резцов."}
					</p>
				</div>
			</div>

			<div className="p-4 rounded-xl bg-slate-800/90 border border-slate-700 space-y-2">
				<span className="text-xs font-bold text-slate-200 uppercase tracking-wide">
					Наклон передних зубов и улыбка
				</span>
				<div className="p-3 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] space-y-1.5 text-xs">
					<div className="flex items-center justify-between">
						<span className="text-slate-400">Верхние резцы:</span>
						<span className="font-semibold text-slate-200">{analysis.diagnosis.upperIncisorInclinationRu}</span>
					</div>
					<div className="flex items-center justify-between">
						<span className="text-slate-400">Нижние резцы:</span>
						<span className="font-semibold text-slate-200">{analysis.diagnosis.lowerIncisorInclinationRu}</span>
					</div>
				</div>
				<p className="text-[11px] text-slate-400 m-0">
					Аппаратура настраивается с учетом естественного наклона корней для предотвращения потери костной ткани.
				</p>
			</div>

			<div className="mt-auto p-3 rounded-xl bg-teal-950/60 border border-teal-800/80 flex items-center justify-between gap-3">
				<div className="text-xs text-teal-200">План согласован? Перенесите результаты в карточку:</div>
				<button
					type="button"
					onClick={onInsertToChart}
					className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shrink-0 transition-colors cursor-pointer"
				>
					В карту
				</button>
			</div>
		</div>
	);
};
