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
					<UserCheck className="h-4 w-4 text-teal-600 dark:text-teal-400 shrink-0" />
					<span className="text-xs font-black uppercase text-[var(--ink,#0f172a)]">
						Родитель / Законный представитель:
					</span>
				</div>
				<span className="text-[11px] font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded border border-teal-200 dark:border-teal-800">
					Родитель на приёме (норма)
				</span>
			</div>

			<div className="text-[11px] text-[var(--muted,#64748b)] font-medium">
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
							className={`min-h-[44px] sm:min-h-[28px] h-7 px-2.5 rounded-lg text-xs font-bold transition cursor-pointer active:scale-95 ${
								isSelected
									? "bg-teal-600 text-white shadow-xs"
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
					className="min-h-[44px] sm:min-h-[32px] h-8 px-2.5 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-xs text-[var(--ink,#0f172a)] focus:border-teal-500 focus:outline-hidden"
					data-testid="input-pediatric-rep-name"
				/>
				<input
					type="tel"
					value={representative.phone}
					onChange={(e) => setRepresentative((prev) => ({ ...prev, phone: e.target.value }))}
					placeholder="+7 (___) ___-__-__"
					className="min-h-[44px] sm:min-h-[32px] h-8 px-2.5 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-xs text-[var(--ink,#0f172a)] focus:border-teal-500 focus:outline-hidden font-mono"
					data-testid="input-pediatric-rep-phone"
				/>
			</div>

			<div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[var(--line,#e2e8f0)]">
				<label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[var(--ink,#0f172a)] min-h-[44px] sm:min-h-0">
					<input
						type="checkbox"
						checked={representative.consentSigned}
						onChange={(e) => setRepresentative((prev) => ({ ...prev, consentSigned: e.target.checked }))}
						className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4"
						data-testid="checkbox-pediatric-consent-signed"
					/>
					<span>Согласие на приём оформлено</span>
				</label>
				{isMinor15Plus && (
					<span className="text-[10px] font-bold text-sky-700 dark:text-sky-300">
						Пациент старше 15 лет (вправе подписать согласие лично)
					</span>
				)}
			</div>

			{!representative.consentSigned && (
				<div
					className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/40 p-2.5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 text-xs text-amber-900 dark:text-amber-200"
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
						className="min-h-[44px] sm:min-h-[28px] px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs shrink-0 cursor-pointer active:scale-95 transition"
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
