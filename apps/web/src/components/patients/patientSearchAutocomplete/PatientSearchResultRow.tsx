import type { Patient } from "@dental/shared";
import { AlertOctagon, Calendar, CreditCard, Phone, Sparkles, User } from "lucide-react";
import React from "react";
import type { PatientSearchResultItem } from "../patientSearchFuzzy";
import type { SomaticBadgeInfo } from "./types";

interface PatientSearchResultRowProps {
	readonly item: PatientSearchResultItem;
	readonly isSelected: boolean;
	readonly somaticBadge: SomaticBadgeInfo | null;
	readonly onSelect: (patient: Patient) => void;
	readonly onMouseEnter: () => void;
}

export function PatientSearchResultRow({
	item, isSelected, somaticBadge, onSelect, onMouseEnter,
}: PatientSearchResultRowProps) {
	const p = item.patient;
	const balance = Number(p.balanceRub ?? (p as any).balance ?? 0);

	return (
		<div
			data-testid={`patient-search-autocomplete-item-${p.id}`}
			onClick={() => onSelect(p)}
			onMouseEnter={onMouseEnter}
			className={`p-2 rounded-lg flex items-center justify-between gap-2.5 cursor-pointer transition-colors ${
				isSelected ? "bg-[var(--teal)]/15 text-[var(--ink)]" : "hover:bg-[var(--paper-soft)]"
			}`}
		>
			<div className="flex items-center gap-2 min-w-0 flex-1">
				<div className="w-6 h-6 rounded-md bg-[var(--teal)]/10 text-[var(--teal)] flex items-center justify-center shrink-0">
					<User size={13} />
				</div>
				<div className="min-w-0 flex-1 flex flex-col gap-0.5">
					<div className="flex items-center gap-1.5 flex-wrap min-w-0">
						<span className="font-bold text-xs truncate">
							{item.fullNameHighlights.map((part, pIdx) =>
								part.isMatch ? (
									<mark key={pIdx} className="bg-[var(--teal)]/25 text-[var(--teal-dark,var(--teal))] font-black rounded-xs px-0.5">
										{part.text}
									</mark>
								) : (<span key={pIdx}>{part.text}</span>),
							)}
						</span>
						{item.isFuzzy && (
							<span
								className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 inline-flex items-center gap-0.5 shrink-0"
								title={`Нечеткое совпадение: ${item.suggestedName || p.fullName}`}
								data-testid="patient-search-fuzzy-badge"
							>
								<Sparkles size={9} className="text-amber-500 shrink-0" />
								<span>Опечатка?</span>
							</span>
						)}
						{somaticBadge && (
							<span
								className={`px-1.5 py-0.2 rounded text-[10px] font-extrabold inline-flex items-center gap-0.5 shrink-0 ${
									somaticBadge.isCritical
										? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30"
										: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30"
								}`}
								title={`Клинический стоп-фактор: ${somaticBadge.label}`}
							>
								<AlertOctagon size={10} className="shrink-0" />
								<span className="truncate max-w-[110px]">{somaticBadge.label}</span>
							</span>
						)}
					</div>

					<div className="flex items-center gap-2 text-[11px] text-[var(--muted)]">
						{p.phone && (
							<span className="inline-flex items-center gap-1 font-mono font-medium">
								<Phone size={10} className="shrink-0 text-[var(--teal)]" />
								<span>
									{item.phoneHighlights.map((part, pIdx) =>
										part.isMatch ? (
											<mark key={pIdx} className="bg-[var(--teal)]/25 text-[var(--teal-dark,var(--teal))] font-bold rounded-xs px-0.5">
												{part.text}
											</mark>
										) : (<span key={pIdx}>{part.text}</span>),
									)}
								</span>
							</span>
						)}
						{p.birthDate && (
							<span className="inline-flex items-center gap-1 shrink-0">
								<Calendar size={10} className="shrink-0" />
								<span>{p.birthDate}</span>
							</span>
						)}
						{((p as any).cardNumber || item.cardHighlights) && (
							<span className="inline-flex items-center gap-1 shrink-0 font-mono text-[10px]">
								<CreditCard size={10} className="shrink-0 text-[var(--muted)]" />
								<span>
									{item.cardHighlights
										? item.cardHighlights.map((part, pIdx) =>
											part.isMatch ? (
												<mark key={pIdx} className="bg-[var(--teal)]/25 text-[var(--teal-dark,var(--teal))] font-bold rounded-xs px-0.5">{part.text}</mark>
											) : (<span key={pIdx}>{part.text}</span>),
										)
										: `№${(p as any).cardNumber}`}
								</span>
							</span>
						)}
					</div>
				</div>
			</div>

			{balance !== 0 && (
				<span
					className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 border ${
						balance > 0
							? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
							: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30"
					}`}
					title={balance > 0 ? "Депозит" : "Долг"}
				>
					{balance > 0 ? `Депозит: +${balance.toLocaleString("ru-RU")} ₽` : `Долг: ${Math.abs(balance).toLocaleString("ru-RU")} ₽`}
				</span>
			)}
		</div>
	);
}
