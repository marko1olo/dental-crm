import React, { useState } from "react";
import type { TreatmentPlanTier } from "../types";
import { PresenterDiscountModeHeader } from "./PresenterDiscountModeHeader";

export interface PresenterDoctorDiscountPanelProps {
	readonly isActive: boolean;
	readonly selectedTier: TreatmentPlanTier;
	readonly doctorDiscountMode: "percent" | "fixed";
	readonly setDoctorDiscountMode?: ((mode: "percent" | "fixed") => void) | undefined;
	readonly doctorDiscountTargetStage: number;
	readonly setDoctorDiscountTargetStage?: ((stageNum: number) => void) | undefined;
	readonly doctorDiscountPercent: number;
	readonly onApplyDoctorDiscount: (pct: number, stageNum?: number) => void;
	readonly doctorDiscountRub: number;
	readonly onApplyDoctorFixedDiscount?: ((rub: number, stageNum?: number) => void) | undefined;
}

const PERCENT_PRESETS = [0, 5, 10, 15, 20, 50, 100];
const RUB_PRESETS = [0, 5000, 10000, 15000, 25000, 50000];

export const PresenterDoctorDiscountPanel: React.FC<PresenterDoctorDiscountPanelProps> = ({
	isActive, selectedTier, doctorDiscountMode, setDoctorDiscountMode,
	doctorDiscountTargetStage, setDoctorDiscountTargetStage,
	doctorDiscountPercent, onApplyDoctorDiscount, doctorDiscountRub,
	onApplyDoctorFixedDiscount,
}) => {
	const [customRubInput, setCustomRubInput] = useState<string>(doctorDiscountRub > 0 ? String(doctorDiscountRub) : "");

	return (
		<div className={`flex flex-col gap-2.5 px-4 sm:px-6 py-2.5 bg-[var(--tp-surface-soft)] border-b border-[var(--tp-border)] no-print text-xs ${isActive ? "" : "hidden"}`}>
			<PresenterDiscountModeHeader
				selectedTier={selectedTier}
				doctorDiscountMode={doctorDiscountMode}
				setDoctorDiscountMode={setDoctorDiscountMode}
				doctorDiscountTargetStage={doctorDiscountTargetStage}
				setDoctorDiscountTargetStage={setDoctorDiscountTargetStage}
			/>

			<div className="flex items-center gap-1.5 flex-wrap">
				{doctorDiscountMode === "percent" ? (
					<>
						{PERCENT_PRESETS.map((pct) => (
							<button
								key={pct}
								type="button"
								onClick={() => onApplyDoctorDiscount(pct, doctorDiscountTargetStage)}
								className={`min-h-[32px] sm:min-h-[28px] sm:h-7 px-2.5 rounded-lg font-mono font-medium text-[12px] cursor-pointer transition-all ${
									doctorDiscountPercent === pct
										? "bg-emerald-600 text-white shadow-xs"
										: pct === 100
											? "bg-[var(--tp-surface)] text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/15 border border-emerald-500/30"
											: "bg-[var(--tp-surface)] text-[var(--tp-text-muted)] hover:text-[var(--tp-text-main)] border border-[var(--tp-border)]"
								}`}
								data-testid={`presenter-discount-btn-${pct}`}
							>
								{pct === 100 ? "100% (Гарантия)" : `${pct}%`}
							</button>
						))}
						{doctorDiscountPercent === 100 && (
							<span className="text-[12px] font-semibold text-emerald-600 dark:text-emerald-400 ml-1">
								0 ₽ (Гарантийная переделка / Персонал)
							</span>
						)}
						<div className="inline-flex items-center gap-1 ml-1" title="Свободная скидка врача (0-100%)">
							<input
								type="number"
								min="0"
								max="100"
								value={doctorDiscountPercent}
								onChange={(e) => onApplyDoctorDiscount(Math.max(0, Math.min(100, Number(e.target.value) || 0)), doctorDiscountTargetStage)}
								className="w-14 min-h-[32px] sm:min-h-[28px] sm:h-7 px-1.5 text-[12px] font-mono font-bold rounded-lg border border-[var(--tp-border)] bg-[var(--tp-surface)] text-[var(--tp-text-main)] text-center focus:outline-none focus:ring-1 focus:ring-[var(--tp-primary)]"
								placeholder="%"
								data-testid="presenter-custom-discount-input"
							/>
							<span className="text-[12px] text-[var(--tp-text-muted)] font-bold">%</span>
						</div>
					</>
				) : (
					<>
						{RUB_PRESETS.map((rub) => (
							<button
								key={rub}
								type="button"
								onClick={() => {
									setCustomRubInput(rub > 0 ? String(rub) : "");
									onApplyDoctorFixedDiscount?.(rub, doctorDiscountTargetStage);
								}}
								className={`min-h-[32px] sm:min-h-[28px] sm:h-7 px-2.5 rounded-lg font-mono font-medium text-[12px] cursor-pointer transition-all ${
									doctorDiscountRub === rub
										? "bg-emerald-600 text-white shadow-xs"
										: "bg-[var(--tp-surface)] text-[var(--tp-text-muted)] hover:text-[var(--tp-text-main)] border border-[var(--tp-border)]"
								}`}
								data-testid={`presenter-discount-rub-btn-${rub}`}
							>
								{rub === 0 ? "0 ₽" : `${rub.toLocaleString("ru-RU")} ₽`}
							</button>
						))}
						<div className="inline-flex items-center gap-1 ml-1" title="Фиксированная скидка в рублях">
							<input
								type="number"
								min="0"
								value={customRubInput}
								onChange={(e) => {
									setCustomRubInput(e.target.value);
									onApplyDoctorFixedDiscount?.(Math.max(0, Number(e.target.value) || 0), doctorDiscountTargetStage);
								}}
								className="w-24 min-h-[32px] sm:min-h-[28px] sm:h-7 px-2 text-[12px] font-mono font-bold rounded-lg border border-[var(--tp-border)] bg-[var(--tp-surface)] text-[var(--tp-text-main)] text-center focus:outline-none focus:ring-1 focus:ring-[var(--tp-primary)]"
								placeholder="Сумма ₽"
								data-testid="presenter-custom-discount-rub-input"
							/>
							<span className="text-[12px] text-[var(--tp-text-muted)] font-bold">₽</span>
						</div>
					</>
				)}
			</div>
		</div>
	);
};
