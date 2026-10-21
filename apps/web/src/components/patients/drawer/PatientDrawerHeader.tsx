/**
 * apps/web/src/components/patients/drawer/PatientDrawerHeader.tsx
 * Header for patient slide-over drawer with anti-truncation name wrapping.
 * Mandate 8b: strictly <= 120 lines.
 */

import { Phone, User, X } from "lucide-react";
import React from "react";
import type { PatientGeneralInfo } from "../tabs/PatientGeneralInfoTab";

export interface PatientDrawerHeaderProps {
	readonly patient: PatientGeneralInfo;
	readonly onClose: () => void;
}

export const PatientDrawerHeader: React.FC<PatientDrawerHeaderProps> =
	React.memo(function PatientDrawerHeader({ patient, onClose }) {
		const fullName = patient.fullName || "Пациент без ФИО";
		const phone = patient.phone || "Телефон не указан";
		const birthDate = patient.birthDate || "";

		return (
			<div className="px-5 py-4 border-b border-[var(--glass-border)] bg-[var(--paper-strong)] flex items-start justify-between gap-3 shrink-0">
				<div className="flex items-start gap-3 min-w-0 flex-1">
					<div className="w-10 h-10 rounded-xl bg-[var(--teal,var(--brand-primary))] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
						<User className="w-5 h-5" />
					</div>
					<div className="min-w-0 flex-1">
						<h2
							id="patient-drawer-title"
							data-testid="patient-drawer-name"
							className="text-base font-bold text-[var(--ink)] m-0 break-words leading-tight"
						>
							{fullName}
						</h2>
						<div className="flex items-center gap-2 mt-1 text-xs text-[var(--muted)] flex-wrap">
							{patient.phone && (
								<span className="inline-flex items-center gap-1 font-mono">
									<Phone className="w-3 h-3 text-[var(--teal)]" />
									{phone}
								</span>
							)}
							{birthDate && <span>• {birthDate}</span>}
							{patient.medicalCardNumber && (
								<span>• Карта №{patient.medicalCardNumber}</span>
							)}
						</div>
					</div>
				</div>

				<button
					type="button"
					data-testid="patient-drawer-close-btn"
					onClick={onClose}
					className="min-h-[44px] sm:min-h-[36px] h-9 w-9 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] flex items-center justify-center transition-colors cursor-pointer shrink-0 shadow-2xs"
					aria-label="Закрыть шторку"
				>
					<X className="w-4 h-4" />
				</button>
			</div>
		);
	});
