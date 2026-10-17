import React from "react";
import { Percent } from "lucide-react";
import type { TreatmentPlanTier } from "../types";

export interface PresenterDiscountModeHeaderProps {
	readonly selectedTier: TreatmentPlanTier;
	readonly doctorDiscountMode: "percent" | "fixed";
	readonly setDoctorDiscountMode?: ((mode: "percent" | "fixed") => void) | undefined;
	readonly doctorDiscountTargetStage: number;
	readonly setDoctorDiscountTargetStage?: ((stageNum: number) => void) | undefined;
}

export const PresenterDiscountModeHeader: React.FC<PresenterDiscountModeHeaderProps> = ({
	selectedTier,
	doctorDiscountMode,
	setDoctorDiscountMode,
	doctorDiscountTargetStage,
	setDoctorDiscountTargetStage,
}) => (
	<div className="flex items-center justify-between gap-2 flex-wrap">
		<div className="flex items-center gap-2 flex-wrap">
			<div className="inline-flex items-center gap-1 font-bold text-[var(--tp-primary)] mr-1">
				<Percent size={13} className="text-emerald-600 dark:text-emerald-400" />
				<span>Скидка врача:</span>
			</div>

			<div className="inline-flex rounded-lg border border-[var(--tp-border)] bg-[var(--tp-bg)] p-0.5">
				<button
					type="button"
					onClick={() => setDoctorDiscountMode?.("percent")}
					className={`px-2.5 py-1 text-[12px] font-bold rounded-md transition-colors cursor-pointer ${
						doctorDiscountMode === "percent" ? "bg-[var(--tp-primary)] text-white shadow-2xs" : "text-[var(--tp-text-muted)] hover:text-[var(--tp-text-main)]"
					}`}
					data-testid="discount-mode-percent-btn"
				>
					% Процент
				</button>
				<button
					type="button"
					onClick={() => setDoctorDiscountMode?.("fixed")}
					className={`px-2.5 py-1 text-[12px] font-bold rounded-md transition-colors cursor-pointer ${
						doctorDiscountMode === "fixed" ? "bg-emerald-600 text-white shadow-2xs" : "text-[var(--tp-text-muted)] hover:text-[var(--tp-text-main)]"
					}`}
					data-testid="discount-mode-fixed-btn"
				>
					₽ Рубли
				</button>
			</div>

			<div className="flex items-center gap-1 ml-1">
				<span className="text-[11px] text-[var(--tp-text-muted)] font-medium">Область:</span>
				<select
					value={doctorDiscountTargetStage}
					onChange={(e) => setDoctorDiscountTargetStage?.(Number(e.target.value))}
					className="px-2 py-1 text-[12px] font-medium rounded-lg border border-[var(--tp-border)] bg-[var(--tp-bg)] text-[var(--tp-text-main)] outline-none"
					data-testid="discount-target-stage-select"
				>
					<option value={0}>Весь план лечения</option>
					{selectedTier.stages.map((st) => (
						<option key={st.stageNumber} value={st.stageNumber}>
							Этап {st.stageNumber}: {st.title.slice(0, 24)}...
						</option>
					))}
				</select>
			</div>
		</div>

		<div className="text-[11px] text-[var(--tp-text-muted)] hidden lg:block">
			Мандат 8e: Свобода скидок врача до 100% без пароля администратора
		</div>
	</div>
);
