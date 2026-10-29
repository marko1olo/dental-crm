/**
 * PrescriptionPatientMemoCard.tsx — Patient Friendly Instruction Memo Card
 * Zero Latin Rp/Dtd/S — readable instructions for taking medications at home.
 */

import { FileText } from "lucide-react";
import React from "react";

export interface PrescriptionPatientMemoCardProps {
	readonly activeItems: readonly {
		readonly id: string;
		readonly tradeName: string;
		readonly signaRussian: string;
	}[];
	readonly phone: string;
}

export const PrescriptionPatientMemoCard: React.FC<
	PrescriptionPatientMemoCardProps
> = ({ activeItems, phone }) => {
	return (
		<div
			data-testid="patient-prescription-memo-card"
			className="p-4 rounded-xl border border-[var(--line)] bg-[var(--paper-strong)] text-[var(--ink)] flex flex-col gap-2.5 font-sans shadow-sm"
		>
			<div className="flex items-center justify-between border-b border-[var(--line)] pb-2">
				<span className="text-xs font-bold uppercase tracking-wider text-[var(--teal)] flex items-center gap-1.5">
					<FileText className="w-3.5 h-3.5 text-[var(--teal)]" />
					Памятка пациенту (без латыни):
				</span>
				<span className="text-xs text-[var(--muted)]">
					Для понятного приёма дома
				</span>
			</div>

			<div className="flex flex-col gap-2 text-xs">
				{activeItems.length === 0 ? (
					<div className="text-[var(--muted)] italic py-1">
						Препараты не выбраны
					</div>
				) : (
					activeItems.map((item, idx) => {
						const cleanSigna = item.signaRussian
							.replace(/^(?:D\.?\s*)?S[.:]?\s*/i, "")
							.replace(/^(?:Rp[.:]?\s*)/i, "")
							.replace(/^(?:D\.?t\.?d\.?\s*N?\s*\d*\.?\s*)/i, "")
							.trim();
						return (
							<div
								key={item.id || idx}
								className="p-2.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)]/60 flex flex-col gap-1"
							>
								<div className="font-bold text-[var(--ink)] text-xs">
									{idx + 1}. {item.tradeName}
								</div>
								<div className="text-xs text-[var(--ink)]">
									<span className="font-semibold text-teal-700 dark:text-teal-400">
										Способ применения:{" "}
									</span>
									{cleanSigna}
								</div>
							</div>
						);
					})
				)}
			</div>

			<div className="text-xs text-[var(--muted)] border-t border-[var(--line)]/60 pt-2 leading-relaxed">
				При любых признаках непереносимости или аллергии немедленно свяжитесь с
				клиникой: <strong>{phone}</strong>.
			</div>
		</div>
	);
};
