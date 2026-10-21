import React from "react";
import { Coins } from "lucide-react";

export interface PatientLoyaltySectionProps {
	readonly patientBalanceRub: number;
	readonly bonusPointsToUseRub: number;
	readonly setBonusPointsToUseRub: (rub: number) => void;
}

export const PatientLoyaltySection: React.FC<PatientLoyaltySectionProps> = ({
	patientBalanceRub,
	bonusPointsToUseRub,
	setBonusPointsToUseRub,
}) => {
	return (
		<div className="space-y-2 pt-2 border-t border-[var(--line,var(--border,#cbd5e1))]">
			<div className="flex items-center justify-between text-xs">
				<span className="font-bold text-[var(--muted,#64748b)] flex items-center gap-1.5">
					<Coins size={15} className="text-amber-500" />
					Доступный баланс / бонусы:
				</span>
				<strong className="font-mono text-[var(--ink,#0f172a)]">
					{patientBalanceRub.toLocaleString("ru-RU")} ₽
				</strong>
			</div>

			{patientBalanceRub > 0 ? (
				<div className="flex items-center gap-2 pt-1">
					<input
						type="number"
						min={0}
						max={patientBalanceRub}
						value={bonusPointsToUseRub || ""}
						onChange={(e) => {
							const val = Math.max(0, Math.min(patientBalanceRub, Number(e.target.value) || 0));
							setBonusPointsToUseRub(val);
						}}
						placeholder="Списать ₽"
						className="w-32 h-8 px-2 text-xs font-mono font-bold rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] focus:ring-1 focus:ring-[var(--teal)]"
					/>
					<span className="text-xs text-[var(--muted)]">₽ к списанию</span>
					{bonusPointsToUseRub > 0 && (
						<button
							type="button"
							onClick={() => setBonusPointsToUseRub(0)}
							className="text-xs font-bold text-rose-500 hover:underline cursor-pointer ml-auto"
						>
							Сбросить
						</button>
					)}
				</div>
			) : (
				<p className="text-xs text-[var(--muted,#64748b)] m-0">
					У пациента пока нет накопленных бонусов или депозита.
				</p>
			)}
		</div>
	);
};
