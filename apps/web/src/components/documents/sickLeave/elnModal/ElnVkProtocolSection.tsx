import React from "react";
import { UserCheck } from "lucide-react";
import type { ElnVkProtocolSectionProps } from "./types";

export function ElnVkProtocolSection({
	formState,
	setFormState,
	handleToggleVk,
}: ElnVkProtocolSectionProps) {
	return (
		<div className="sick-leave-body">
			<div className="p-3.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
				<div className="flex items-center justify-between flex-wrap gap-2">
					<div>
						<h4 className="m-0 text-sm font-bold text-[var(--ink)] flex items-center gap-1.5">
							<UserCheck className="w-4 h-4 text-[var(--teal)]" />
							<span>Заседание врачебной комиссии (ВК) — освобождение от работы</span>
						</h4>
						<p className="m-0 mt-1 text-xs text-[var(--muted)]">
							В частной стоматологии 1–3 кресла освобождение оформляется лечащим врачом без созыва стационарной комиссии.
						</p>
					</div>
					<button
						type="button"
						className={`inline-flex items-center gap-1.5 min-h-[36px] px-3 text-xs font-bold rounded-lg border transition-colors cursor-pointer ${
							formState.isVkRequired
								? "border-[var(--teal)] bg-[var(--teal)] text-white shadow-2xs"
								: "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:border-[var(--teal)]"
						}`}
						onClick={() => handleToggleVk(!formState.isVkRequired)}
					>
						{formState.isVkRequired ? "✓ Согласование ВК активно" : "Активировать отметку ВК (>15 дн.)"}
					</button>
				</div>
				{formState.isVkRequired && (
					<div className="mt-2.5 p-2 px-3 rounded-lg bg-teal-500/10 border border-teal-500/30 text-xs text-[var(--ink)]">
						Отметка врачебной комиссии сформирована автоматически: единоличное решение лечащего врача согласовано с главным врачом клиники согласно клиническим стандартам.
					</div>
				)}
			</div>
		</div>
	);
}
