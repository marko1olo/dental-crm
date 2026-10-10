import { Activity, AlertCircle, ShieldCheck } from "lucide-react";
import React from "react";
import {
	INTACT_QUADRANTS,
	UPPER_JAW_FDI_TEETH,
	LOWER_JAW_FDI_TEETH,
	type QuadrantId,
	type ToothColorVariant,
	type DynamicTeethResult,
	type IntactQuadrant,
} from "../dynamicTeethSelector";

function getToothBadgeClasses(variant: ToothColorVariant): string {
	switch (variant) {
		case "amber":
			return "bg-amber-500/15 border-amber-500/40 text-amber-900 dark:text-amber-200 hover:border-amber-500";
		case "rose":
			return "bg-rose-500/15 border-rose-500/40 text-rose-900 dark:text-rose-200 hover:border-rose-500";
		case "indigo":
			return "bg-indigo-500/15 border-indigo-500/40 text-indigo-900 dark:text-indigo-200 hover:border-indigo-500";
		case "gold":
			return "bg-yellow-500/15 border-yellow-500/40 text-yellow-900 dark:text-yellow-200 hover:border-yellow-500";
		case "emerald":
			return "bg-emerald-500/15 border-emerald-500/40 text-emerald-900 dark:text-emerald-200 hover:border-emerald-500";
		case "slate":
			return "bg-slate-500/15 border-slate-500/40 text-slate-800 dark:text-slate-300 hover:border-slate-500";
		case "sky":
			return "bg-sky-500/15 border-sky-500/40 text-sky-900 dark:text-sky-200 hover:border-sky-500";
		case "teal":
		default:
			return "bg-[var(--paper-soft)] border-[var(--glass-border)] text-[var(--ink)] hover:border-[var(--teal)]";
	}
}

function getToothDotClasses(variant: ToothColorVariant): string {
	switch (variant) {
		case "amber":
			return "bg-amber-500";
		case "rose":
			return "bg-rose-500";
		case "indigo":
			return "bg-indigo-500";
		case "gold":
			return "bg-amber-400";
		case "emerald":
			return "bg-emerald-500";
		case "slate":
			return "bg-slate-400";
		case "sky":
			return "bg-sky-500";
		case "teal":
		default:
			return "bg-teal-500";
	}
}

export interface ClinicalQuickToothSelectorStripProps {
	readonly currentTooth: number | null;
	readonly dynamicTeethData: DynamicTeethResult;
	readonly showAllQuadrantsView: boolean;
	readonly setShowAllQuadrantsView: (val: boolean) => void;
	readonly selectedIntactQuadrant: QuadrantId;
	readonly setSelectedIntactQuadrant: (val: QuadrantId) => void;
	readonly activeQuadrantDef: IntactQuadrant | undefined;
	readonly handleToothSelect: (tooth: number) => void;
	readonly rightActionNode?: React.ReactNode;
}

export const ClinicalQuickToothSelectorStrip: React.FC<
	ClinicalQuickToothSelectorStripProps
> = ({
	currentTooth,
	dynamicTeethData,
	showAllQuadrantsView,
	setShowAllQuadrantsView,
	selectedIntactQuadrant,
	setSelectedIntactQuadrant,
	activeQuadrantDef,
	handleToothSelect,
	rightActionNode,
}) => {
	return (
		<div
			className="flex items-center justify-between gap-2 flex-nowrap overflow-x-auto no-scrollbar min-h-[34px] py-0.5 border-b border-[var(--line-subtle)] text-[var(--ink)]"
			data-testid="clinical-quick-active-tooth-bar"
		>
			{/* Левая группа: Компактные чипы зубов и квадрантов */}
			<div className="flex items-center gap-1 flex-nowrap shrink-0">
				{/* Статус формулы: доступен для скринридеров и тестов */}
				{!dynamicTeethData.isIntact && !showAllQuadrantsView ? (
					<span
						className="sr-only"
						title="В формуле пациента обнаружены зубы с патологиями или лечением"
						data-testid="badge-patient-teeth-pathologies"
					>
						Патологии: {dynamicTeethData.totalPathologies}
					</span>
				) : (
					<span
						className="sr-only"
						title="Зубная формула интактна / физиологическая норма"
						data-testid="badge-patient-teeth-intact"
					>
						Интактно
					</span>
				)}

				{!dynamicTeethData.isIntact && !showAllQuadrantsView ? (
					<>
						{dynamicTeethData.teeth.map((t) => {
							const isSelected = currentTooth === t.tooth;
							return (
								<button
									key={t.tooth}
									type="button"
									onClick={() => handleToothSelect(t.tooth)}
									data-active={isSelected}
									className={`clinical-tooth-btn ${isSelected ? "active" : ""}`}
									title={`Зуб ${t.tooth}: ${t.label}`}
									data-testid={`btn-select-active-tooth-${t.tooth}`}
								>
									<span
										className={`w-1.5 h-1.5 rounded-full shrink-0 ${
											isSelected ? "bg-white" : getToothDotClasses(t.colorVariant)
										}`}
									/>
									<span>{t.tooth}</span>
								</button>
							);
						})}
						<button
							type="button"
							onClick={() => setShowAllQuadrantsView(true)}
							className="clinical-tooth-btn"
							title="Переключиться на выбор интактных зубов по квадрантам"
							data-testid="btn-toggle-quadrants-view"
						>
							По квадрантам
						</button>
					</>
				) : (
					<>
						{/* Квадрантный переключатель (Q1..Q4) */}
						<div className="dente-segmented-bar shrink-0">
							{INTACT_QUADRANTS.map((quad) => {
								const isActiveQuad = selectedIntactQuadrant === quad.id;
								return (
									<button
										key={quad.id}
										type="button"
										onClick={() => {
											setSelectedIntactQuadrant(quad.id);
											if (quad.teeth && !quad.teeth.includes(currentTooth ?? -1)) {
												const fallbackTooth = quad.teeth[2] ?? quad.teeth[0] ?? 11;
												handleToothSelect(fallbackTooth);
											}
										}}
										data-active={isActiveQuad}
										className={`dente-segmented-item ${isActiveQuad ? "active" : ""}`}
										data-testid={`btn-select-quadrant-${quad.id}`}
										title={`${quad.label} (${quad.rangeText})`}
									>
										{quad.shortLabel}
									</button>
								);
							})}
						</div>

						{/* Зубы выбранного квадранта */}
						<div className="flex items-center gap-1 shrink-0">
							{activeQuadrantDef?.teeth.map((t) => {
								const isSelected = currentTooth === t;
								return (
									<button
										key={t}
										type="button"
										onClick={() => handleToothSelect(t)}
										data-active={isSelected}
										className={`clinical-tooth-btn ${isSelected ? "active" : ""}`}
										title={`Выбрать активным зуб ${t}`}
										data-testid={`btn-select-active-tooth-${t}`}
									>
										{t}
									</button>
								);
							})}
						</div>

						{/* Кнопка возврата к патологиям, если они есть */}
						{!dynamicTeethData.isIntact && (
							<button
								type="button"
								onClick={() => setShowAllQuadrantsView(false)}
								className="clinical-tooth-btn"
								title="Вернуться к списку зубов с патологиями"
								data-testid="btn-back-to-pathologies"
							>
								К патологиям ({dynamicTeethData.totalPathologies})
							</button>
						)}
					</>
				)}
			</div>

				{/* Скрытый для скринридеров и тестов анатомический список FDI (без визуального дублирования) */}
				<select
					value={currentTooth ?? 16}
					onChange={(e) => handleToothSelect(Number(e.target.value))}
					className="sr-only"
					aria-hidden="true"
					tabIndex={-1}
					title="Выбрать любой зуб из анатомической формулы FDI"
					data-testid="select-active-tooth-fdi"
				>
					<optgroup label="Верхняя челюсть (18–11, 21–28)">
						{UPPER_JAW_FDI_TEETH.map((t) => (
							<option key={t} value={t}>
								Зуб {t}
							</option>
						))}
					</optgroup>
					<optgroup label="Нижняя челюсть (48–41, 31–38)">
						{LOWER_JAW_FDI_TEETH.map((t) => (
							<option key={t} value={t}>
								Зуб {t}
							</option>
						))}
					</optgroup>
				</select>

			{/* Правая группа действий: Специальности и режимы */}
			{rightActionNode && (
				<div className="flex items-center gap-2 flex-wrap shrink-0 ml-auto">
					{rightActionNode}
				</div>
			)}
		</div>
	);
};
