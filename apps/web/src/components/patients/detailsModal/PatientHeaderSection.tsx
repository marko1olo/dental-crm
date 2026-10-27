import { Printer, ShieldCheck, User, X } from "lucide-react";
import React from "react";
import type { PatientGeneralInfo } from "../tabs/PatientGeneralInfoTab";

export interface PatientHeaderSectionProps {
	readonly patientData: PatientGeneralInfo;
	readonly onApplyNorm: () => void;
	readonly onPrint: () => void;
	readonly onClose: () => void;
}

export const PatientHeaderSection: React.FC<PatientHeaderSectionProps> = ({
	patientData,
	onApplyNorm,
	onPrint,
	onClose,
}) => {
	return (
		<div className="flex flex-col border-b border-[var(--glass-border)] bg-[var(--paper-strong)] shrink-0 print:hidden">
			{/* Apple Mobile HIG Tactile Drag Handle for Bottom Sheet */}
			<div className="sm:hidden flex justify-center pt-2.5 pb-1 cursor-grab active:cursor-grabbing">
				<div className="w-9 h-1 rounded-full bg-[var(--line-strong,rgba(150,150,150,0.4))]" />
			</div>

			<div className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-2.5 gap-2 sm:gap-3">
				<div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
					<div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[var(--teal,var(--brand-primary))] text-white flex items-center justify-center shrink-0 shadow-xs">
						<User className="w-5 h-5" />
					</div>
					<div className="min-w-0 flex-1">
						<h2
							id="patient-details-modal-title"
							data-testid="patient-details-title"
							className="text-sm sm:text-base font-bold text-[var(--ink)] m-0 leading-snug"
						>
							{patientData.fullName || "Новый пациент"}
						</h2>
						<p className="text-xs text-[var(--muted)] m-0 leading-tight">
							{patientData.phone ? `Тел: ${patientData.phone}` : "Медицинская карта"}
							{patientData.birthDate ? ` • ${patientData.birthDate}` : ""}
							{patientData.medicalCardNumber ? ` • Карта №${patientData.medicalCardNumber}` : ""}
						</p>
					</div>
				</div>

				<div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
					{/* 1-Клик норма: на мобильном сенсорный тач >= 44x44px */}
					<button
						type="button"
						data-testid="btn-somatic-healthy-norm"
						onClick={onApplyNorm}
						className="min-h-[44px] min-w-[44px] sm:min-w-0 sm:min-h-[32px] h-8 px-2 sm:px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors shrink-0 active:scale-98"
						title="Зафиксировать физиологическую норму: соматически здоров"
					>
						<ShieldCheck className="w-4 h-4 shrink-0" />
						<span className="hidden sm:inline">Здоров (Норма)</span>
					</button>

					{/* Печать: скрыта на узких экранах, доступна на десктопе */}
					<button
						type="button"
						onClick={onPrint}
						className="hidden sm:inline-flex min-h-[32px] h-8 px-3 border border-[var(--glass-border)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] text-xs font-semibold rounded-lg items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
						title="Печать медицинской карты"
					>
						<Printer className="w-4 h-4 shrink-0" />
						<span>Печать</span>
					</button>

					<button
						type="button"
						data-testid="patient-details-close-btn"
						onClick={onClose}
						className="min-h-[44px] min-w-[44px] sm:min-w-0 sm:min-h-[32px] h-8 w-8 rounded-lg border border-[var(--glass-border)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] flex items-center justify-center transition-colors cursor-pointer shrink-0 shadow-2xs"
						aria-label="Закрыть окно"
					>
						<X className="w-4 h-4" />
					</button>
				</div>
			</div>
		</div>
	);
};
