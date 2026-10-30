/**
 * IntakeRepresentativeSection.tsx
 *
 * Секция сведений о пациенте, законном представителе и соматической норме в 1 клик.
 *
 * Инварианты Мандата 8e & 8n:
 * - Автономия врача: кнопки никогда не блокируются из-за пустых паспортов или СНИЛС.
 * - При отсутствии паспортных данных печатаются аккуратные прочерки (________) для ручного заполнения.
 * - Фиксация физиологической нормы в 1 клик («✓ Соматически здоров / Интактные зубы»).
 * - Поддержка законного представителя для несовершеннолетних пациентов.
 */

import type { Patient } from "@dental/shared";
import { CheckCircle2, ShieldAlert, User, Users } from "lucide-react";
import React from "react";
import type { ClinicalPackageTab } from "./types";

export interface IntakeRepresentativeSectionProps {
	readonly patient: Patient | null;
	readonly isNormApplied: boolean;
	readonly onToggleNorm: () => void;
	readonly activeTab: ClinicalPackageTab;
}

export function IntakeRepresentativeSection({
	patient,
	isNormApplied,
	onToggleNorm,
	activeTab,
}: IntakeRepresentativeSectionProps): React.JSX.Element {
	// biome-ignore lint/suspicious/noExplicitAny: admin profile
	const adminProfile = (patient as any)?.administrativeProfile;
	const repFullName = adminProfile?.legalRepresentativeFullName?.trim();
	const repRelationship = adminProfile?.legalRepresentativeRelationship?.trim() || "Законный представитель";
	const repPhone = adminProfile?.legalRepresentativePhone?.trim();

	return (
		<div className="space-y-2.5">
			{/* Patient & Somatic Norm Bar */}
			<div className="p-3 sm:p-3.5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex items-center justify-between gap-3 flex-wrap">
				<div className="flex items-center gap-2.5 min-w-0">
					<div className="w-8 h-8 rounded-lg bg-[var(--teal,#0d9488)]/10 text-[var(--teal,#0d9488)] flex items-center justify-center shrink-0">
						<User size={16} />
					</div>
					<div className="text-xs text-[var(--ink,#0f172a)] flex flex-wrap gap-1.5 items-center">
						<span className="font-bold text-sm sm:text-xs">
							{patient?.fullName || "Пациент для оформления"}
						</span>
						{patient?.birthDate && (
							<span className="text-[var(--muted,#64748b)]">· {patient.birthDate}</span>
						)}
						{patient?.phone && (
							<span className="text-[var(--muted,#64748b)]">· {patient.phone}</span>
						)}
					</div>
				</div>

				{/* Mandate 8e: 1-click Somatic Norm Button (Touch target >= 44px) */}
				{activeTab === "primary" && (
					<button
						type="button"
						onClick={onToggleNorm}
						className={`secondary-button min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border transition cursor-pointer shrink-0 ${
							isNormApplied
								? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
								: "border-[var(--line,#e2e8f0)] text-[var(--ink,#0f172a)] bg-[var(--paper,#ffffff)] hover:border-[var(--teal,#0d9488)]"
						}`}
						title="Установить соматическую норму: соматически здоров, интактные зубы (Мандат 8e)"
						data-testid="btn-toggle-somatic-norm-1click"
					>
						<CheckCircle2
							size={16}
							className={isNormApplied ? "text-emerald-600" : "text-[var(--muted,#64748b)]"}
						/>
						<span>{isNormApplied ? "Соматическая норма активна" : "Заполнить соматическую норму"}</span>
					</button>
				)}
			</div>

			{/* Representative Information if present */}
			{repFullName ? (
				<div className="p-3 rounded-xl border border-sky-500/20 bg-sky-500/5 text-xs text-[var(--ink,#0f172a)] flex items-center justify-between gap-2 flex-wrap">
					<div className="flex items-center gap-2">
						<Users size={16} className="text-sky-600 shrink-0" />
						<span>
							<strong>Законный представитель:</strong> {repFullName} ({repRelationship})
							{repPhone ? ` · тел. ${repPhone}` : ""}
						</span>
					</div>
					<span className="text-[11px] text-sky-700 dark:text-sky-300 font-medium">
						Автоподстановка в согласие и договор
					</span>
				</div>
			) : null}

			{/* Doctor Autonomy & Reception Pen Notice */}
			<div className="px-3 py-1.5 rounded-lg bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] text-[11px] text-[var(--muted,#64748b)] flex items-center gap-2">
				<ShieldAlert size={14} className="text-[var(--teal,#0d9488)] shrink-0" />
				<span>
					Автономия врача: печать доступна без блокировок. Незаполненные паспортные реквизиты
					выводятся строками «___________» для ручного заполнения на стойке администратора.
				</span>
			</div>
		</div>
	);
}
