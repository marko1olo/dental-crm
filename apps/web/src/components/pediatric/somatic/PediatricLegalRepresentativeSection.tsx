import React from "react";
import { UserCheck } from "lucide-react";
import type { LegalRepresentativeData, LegalRepresentativeRole } from "./pediatricSomaticTypes";

interface PediatricLegalRepresentativeSectionProps {
	readonly representative: LegalRepresentativeData;
	readonly setRepresentative: React.Dispatch<React.SetStateAction<LegalRepresentativeData>>;
	readonly patientAge?: number | null | undefined;
}

const ROLES: readonly LegalRepresentativeRole[] = ["Мать", "Отец", "Опекун", "Родитель"];

export const PediatricLegalRepresentativeSection: React.FC<PediatricLegalRepresentativeSectionProps> = ({
	representative,
	setRepresentative,
	patientAge,
}) => {
	const isMinor15Plus = patientAge !== null && patientAge !== undefined && patientAge >= 15;

	return (
		<div className="rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] p-3 space-y-2.5">
			<div className="flex items-center justify-between gap-2">
				<div className="flex items-center gap-1.5">
					<UserCheck className="h-4 w-4 text-[var(--primary)] shrink-0" />
					<span className="text-xs font-bold text-[var(--ink,#0f172a)]">
						Родитель / Законный представитель:
					</span>
				</div>
				<span className="text-[11px] font-bold text-[var(--primary)] bg-[var(--primary)]/10 px-2 py-0.5 rounded-md border border-[var(--primary)]/20">
					Родитель на приёме (норма)
				</span>
			</div>

			<div className="text-[11px] text-[var(--ink-muted,#64748b)] font-medium">
				<span>Законный представитель ребёнка</span>
				<span className="ml-1 opacity-75">(родитель / опекун)</span>
			</div>

			<div className="flex flex-wrap gap-1" data-testid="pediatric-rep-role-chips">
				{ROLES.map((r) => {
					const isSelected = representative.role === r;
					const label = r === "Мать" ? "Мама" : r === "Отец" ? "Папа" : r;
					return (
						<button
							key={r}
							type="button"
							onClick={() => setRepresentative((prev) => ({ ...prev, role: r }))}
							className={`min-h-[44px] sm:min-h-[32px] sm:h-8 px-2.5 rounded-lg text-xs font-medium transition cursor-pointer active:scale-95 ${
								isSelected
									? "bg-[var(--primary)] text-white shadow-xs"
									: "bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] border border-[var(--line,#e2e8f0)] hover:bg-[var(--paper-strong,#f1f5f9)]"
							}`}
							data-testid={`chip-rep-role-${r.toLowerCase()}`}
						>
							{label}
						</button>
					);
				})}
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
				<input
					type="text"
					value={representative.fullName}
					onChange={(e) => setRepresentative((prev) => ({ ...prev, fullName: e.target.value }))}
					placeholder="ФИО родителя (необязательно)"
					className="min-h-[44px] sm:min-h-[32px] sm:h-8 px-2.5 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-xs text-[var(--ink,#0f172a)] focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] focus:outline-hidden"
					data-testid="input-pediatric-rep-name"
				/>
				<input
					type="tel"
					value={representative.phone}
					onChange={(e) => setRepresentative((prev) => ({ ...prev, phone: e.target.value }))}
					placeholder="+7 (___) ___-__-__"
					className="min-h-[44px] sm:min-h-[32px] sm:h-8 px-2.5 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-xs text-[var(--ink,#0f172a)] focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] focus:outline-hidden font-mono"
					data-testid="input-pediatric-rep-phone"
				/>
			</div>

			<div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[var(--line,#e2e8f0)]">
				<label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[var(--ink,#0f172a)] min-h-[44px] sm:min-h-0">
					<input
						type="checkbox"
						checked={representative.consentSigned}
						onChange={(e) => setRepresentative((prev) => ({ ...prev, consentSigned: e.target.checked }))}
						className="rounded accent-[var(--primary)] w-4 h-4"
						data-testid="checkbox-pediatric-consent-signed"
					/>
					<span>Согласие на приём оформлено</span>
				</label>
				{isMinor15Plus && (
					<span className="text-[10px] font-bold text-[var(--primary)]">
						Пациент старше 15 лет (вправе подписать согласие лично)
					</span>
				)}
			</div>

			{!representative.consentSigned && (
				<div
					className="rounded-lg border border-[var(--warning-line)] bg-[var(--warning-soft)] text-[var(--warning-ink)] p-2.5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 text-xs"
					data-testid="rep-consent-warning-banner"
				>
					<span>
						{isMinor15Plus
							? "Пациент старше 15 лет вправе подписать согласие на лечение лично"
							: "Требуется согласие родителя на медицинское вмешательство"}
					</span>
					<button
						type="button"
						onClick={() => setRepresentative((prev) => ({ ...prev, consentSigned: true }))}
						className="min-h-[44px] sm:min-h-[32px] sm:h-8 px-3 bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] border border-[var(--line,#e2e8f0)] rounded-lg font-medium text-xs shrink-0 cursor-pointer active:scale-95 transition"
						data-testid="btn-one-click-sign-consent"
					>
						Подтвердить согласие
					</button>
				</div>
			)}
		</div>
	);
};

export default PediatricLegalRepresentativeSection;
