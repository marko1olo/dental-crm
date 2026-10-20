/**
 * apps/web/src/components/settings/insuranceModules/InsuranceGuaranteeLettersList.tsx
 *
 * List of active patient guarantee letters (ГП) attached to clinic DMS insurance contracts.
 * Governed by Mandates 8b, 8d (zero cartoon emojis), 8e (doctor autonomy).
 */

import { FileCheck2 } from "lucide-react";
import type React from "react";
import type { GuaranteeLetterSummary } from "./insuranceContractsTypes";

interface InsuranceGuaranteeLettersListProps {
	letters: GuaranteeLetterSummary[];
}

export const InsuranceGuaranteeLettersList: React.FC<InsuranceGuaranteeLettersListProps> = ({
	letters,
}) => {
	if (letters.length === 0) return null;

	return (
		<div
			className="rounded-xl p-4 border"
			style={{
				borderColor: "var(--line)",
				background: "var(--surface)",
				color: "var(--ink)",
			}}
			data-testid="insurance-guarantee-letters-list"
		>
			<div className="flex items-center justify-between gap-2 flex-wrap mb-3">
				<div>
					<h3
						className="m-0 text-sm font-bold flex items-center gap-2"
						style={{ color: "var(--ink)" }}
					>
						<FileCheck2 size={16} className="text-emerald-500 shrink-0" />
						<span>Действующие гарантийные письма пациентов ({letters.length})</span>
					</h3>
					<p className="m-0 mt-0.5 text-xs" style={{ color: "var(--muted)" }}>
						Связаны с картами пациентов, конструктором смет и разделением чеков в кассе
					</p>
				</div>
			</div>
			<div
				className="divide-y border-t"
				style={{ borderColor: "var(--line)" }}
			>
				{letters.map((letter) => {
					const remainingRub = Math.max(
						0,
						letter.maxCoverageRub - letter.usedAmountRub,
					);
					return (
						<div
							key={letter.id}
							className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
							style={{ borderColor: "var(--line)" }}
							data-testid={`guarantee-letter-row-${letter.id}`}
						>
							<div className="min-w-0">
								<div className="font-semibold" style={{ color: "var(--ink)" }}>
									{letter.patientFullName} ·{" "}
									<span className="text-emerald-600 dark:text-emerald-400">
										{letter.insurerName}
									</span>
								</div>
								<div
									className="text-[11px] mt-0.5 flex items-center gap-2 flex-wrap"
									style={{ color: "var(--muted)" }}
								>
									<span>ГП: {letter.letterNumber}</span>
									<span>·</span>
									<span>Полис: {letter.policyNumber}</span>
									<span>·</span>
									<span>Действует до: {letter.validUntil}</span>
									{letter.curatorFullName && (
										<>
											<span>·</span>
											<span>Куратор: {letter.curatorFullName}</span>
										</>
									)}
								</div>
							</div>
							<div className="flex items-center gap-2 shrink-0 flex-wrap">
								{letter.franchisePct > 0 && (
									<span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
										Франшиза {letter.franchisePct}%
									</span>
								)}
								<span
									className="px-2.5 py-1 rounded-md text-[11px] font-semibold border"
									style={{
										background: "var(--paper-soft)",
										borderColor: "var(--line)",
										color: "var(--ink)",
									}}
								>
									Остаток: {remainingRub.toLocaleString("ru-RU")} ₽ из{" "}
									{letter.maxCoverageRub.toLocaleString("ru-RU")} ₽
								</span>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
};
