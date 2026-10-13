/**
 * ProcedureDeductionWasteActCard.tsx — Блок актирования утилизации и обеззараживания
 * медицинских отходов Класса Б (эпидемиологически опасные) по СанПиН 2.1.3684-21
 * и СанПиН 3.3686-21 без эмодзи.
 */

import { CheckSquare, FileText, Shield, Square } from "lucide-react";
import React from "react";
import type { ClassBWasteActData } from "./procedureDeductionTypes.js";

export interface ProcedureDeductionWasteActCardProps {
	readonly wasteAct: ClassBWasteActData;
	readonly onChangeWasteAct: (next: ClassBWasteActData) => void;
	readonly disabled?: boolean;
}

export const ProcedureDeductionWasteActCard: React.FC<
	ProcedureDeductionWasteActCardProps
> = ({ wasteAct, onChangeWasteAct, disabled = false }) => {
	const toggleEnabled = () => {
		if (disabled) return;
		onChangeWasteAct({
			...wasteAct,
			enabled: !wasteAct.enabled,
		});
	};

	return (
		<div
			className="inventory-waste-act-card"
			data-testid="procedure-waste-act-card"
			style={{
				margin: "8px 20px",
				padding: "10px 14px",
				borderRadius: "10px",
				border: "1px solid var(--line)",
				background: wasteAct.enabled
					? "var(--paper-soft, rgba(13, 148, 136, 0.04))"
					: "var(--paper-card, var(--paper))",
				transition: "border-color 0.2s ease, background 0.2s ease",
			}}
		>
			<div
				className="flex items-center justify-between gap-3 cursor-pointer select-none"
				onClick={toggleEnabled}
				role="button"
				tabIndex={0}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") {
						e.preventDefault();
						toggleEnabled();
					}
				}}
				aria-pressed={wasteAct.enabled}
			>
				<div className="flex items-center gap-2.5 min-w-0">
					<div
						className="shrink-0 text-teal-600 dark:text-teal-400"
						style={{ display: "flex", alignItems: "center" }}
					>
						{wasteAct.enabled ? (
							<CheckSquare size={17} />
						) : (
							<Square size={17} className="text-[var(--muted)]" />
						)}
					</div>
					<div className="min-w-0">
						<div
							className="text-xs font-semibold text-[var(--ink)] truncate"
							style={{ display: "flex", alignItems: "center", gap: "6px" }}
						>
							<Shield size={13} className="shrink-0 text-teal-600 dark:text-teal-400" />
							<span>Актирование медотходов Класса Б (СанПиН 2.1.3684-21)</span>
						</div>
						<div className="text-[11px] text-[var(--muted)] truncate">
							Обеззараживание и утилизация использованных СИЗ, игл и аспирационных наконечников
						</div>
					</div>
				</div>

				<div className="shrink-0 flex items-center gap-2">
					<span
						className="text-[10px] font-bold px-2 py-0.5 rounded-full"
						style={{
							background: wasteAct.enabled
								? "var(--teal-soft, rgba(13, 148, 136, 0.15))"
								: "var(--line-subtle, rgba(0, 0, 0, 0.05))",
							color: wasteAct.enabled
								? "var(--teal-dark, #0f766e)"
								: "var(--muted)",
							border: "1px solid var(--line)",
						}}
					>
						{wasteAct.enabled ? "Включено в акт" : "Без акта"}
					</span>
				</div>
			</div>

			{wasteAct.enabled && (
				<div
					className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 pt-3 border-t border-[var(--line-subtle)] text-xs"
					data-testid="waste-act-details-grid"
				>
					<div>
						<label className="block text-[11px] font-medium text-[var(--muted)] mb-1">
							Масса отходов (г)
						</label>
						<input
							type="number"
							min="10"
							step="10"
							value={wasteAct.wasteWeightGrams}
							disabled={disabled}
							onChange={(e) => {
								const val = Number(e.target.value);
								onChangeWasteAct({
									...wasteAct,
									wasteWeightGrams: Number.isFinite(val) && val > 0 ? val : 10,
								});
							}}
							className="w-full px-2 py-1 text-xs rounded border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:border-teal-500"
							data-testid="input-waste-weight"
						/>
					</div>

					<div>
						<label className="block text-[11px] font-medium text-[var(--muted)] mb-1">
							Тип тарного накопителя
						</label>
						<select
							value={wasteAct.containerType}
							disabled={disabled}
							onChange={(e) =>
								onChangeWasteAct({
									...wasteAct,
									containerType: e.target.value as "yellow_bag" | "puncture_resistant_container",
								})
							}
							className="w-full px-2 py-1 text-xs rounded border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:border-teal-500"
							data-testid="select-waste-container"
						>
							<option value="yellow_bag">Желтый пакет (мягкие СИЗ, валики)</option>
							<option value="puncture_resistant_container">
								Непрокалываемый контейнер (карпулы, иглы)
							</option>
						</select>
					</div>

					<div>
						<label className="block text-[11px] font-medium text-[var(--muted)] mb-1">
							Метод обеззараживания
						</label>
						<select
							value={wasteAct.decontaminationMethod}
							disabled={disabled}
							onChange={(e) =>
								onChangeWasteAct({
									...wasteAct,
									decontaminationMethod: e.target.value as "chemical" | "physical_autoclave",
								})
							}
							className="w-full px-2 py-1 text-xs rounded border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:border-teal-500"
							data-testid="select-waste-method"
						>
							<option value="chemical">Химическая дезинфекция (раствор)</option>
							<option value="physical_autoclave">Автоклавирование (пар 134°C)</option>
						</select>
					</div>
				</div>
			)}
		</div>
	);
};
