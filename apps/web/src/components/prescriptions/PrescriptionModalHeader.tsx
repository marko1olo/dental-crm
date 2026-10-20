/**
 * PrescriptionModalHeader.tsx — Top Bar for Medical Prescriptions Cockpit
 * Human clinical language per Mandate 8x & 8y, touch targets >= 44px on mobile.
 */

import { Pill, ShieldCheck, X } from "lucide-react";
import type React from "react";
import type { PrescriptionFormType } from "./PrescriptionPrintModal";

export interface PrescriptionModalHeaderProps {
	readonly patientName: string;
	readonly patientCard: string;
	readonly diagnosisIcd10?: string | null | undefined;
	readonly resolvedPatientAllergies?: string | readonly string[] | undefined;
	readonly isUkepSigned: boolean;
	readonly activeForm: PrescriptionFormType;
	readonly onSelectForm: (form: PrescriptionFormType) => void;
	readonly onClose: () => void;
}

export const PrescriptionModalHeader: React.FC<
	PrescriptionModalHeaderProps
> = ({
	patientName,
	patientCard,
	diagnosisIcd10,
	resolvedPatientAllergies,
	isUkepSigned,
	activeForm,
	onSelectForm,
	onClose,
}) => {
	const allergiesText = Array.isArray(resolvedPatientAllergies)
		? resolvedPatientAllergies.join(", ")
		: resolvedPatientAllergies;

	return (
		<div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-[var(--line)] bg-[var(--paper-soft)] shrink-0">
			<div className="flex items-center gap-3 min-w-0">
				<div className="flex items-center justify-center w-11 h-11 rounded-xl bg-[var(--teal-surface)] border border-[var(--teal-subtle,var(--line))] text-[var(--teal)] shrink-0 shadow-sm">
					<Pill className="w-6 h-6" />
				</div>
				<div className="min-w-0">
					<div className="flex items-center gap-2 flex-wrap">
						<h2 className="text-base sm:text-lg font-bold text-[var(--ink)]">
							Рецептурный модуль
						</h2>
						<span
							className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[var(--teal-surface)] text-[var(--teal)] border border-[var(--teal-subtle,var(--line))]"
							data-statutory="Приказ № 1094н"
						>
							Рецептурный бланк на лекарства
						</span>
						{isUkepSigned && (
							<span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
								<ShieldCheck className="w-3.5 h-3.5" /> УКЭП активна
							</span>
						)}
					</div>
					<p className="text-xs text-[var(--muted)] whitespace-normal break-words mt-0.5">
						<span>{patientName}</span> · <span>Карта: {patientCard}</span> ·{" "}
						<span>Диагноз: {diagnosisIcd10 || "K02.1"}</span>
						{allergiesText && (
							<span className="ml-1 text-amber-700 dark:text-amber-300 font-semibold">
								· ⚠️ Аллергия: {allergiesText}
							</span>
						)}
					</p>
				</div>
			</div>
			<div className="flex items-center gap-2">
				<div className="hidden md:flex p-1 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] shrink-0 gap-1 text-xs">
					<button
						type="button"
						onClick={() => onSelectForm("107-1u")}
						data-form="107-1u"
						data-form-standard="№ 107-1/у"
						className={`h-7 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
							activeForm === "107-1u"
								? "bg-[var(--teal-surface)] text-[var(--teal)] border border-[var(--teal-subtle,var(--line))] font-bold shadow-xs"
								: "text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)]"
						}`}
						title="Обычный рецептурный бланк"
					>
						Обычный рецепт
					</button>
					<button
						type="button"
						onClick={() => onSelectForm("148-1u-88")}
						data-form="148-1u-88"
						data-form-standard="№ 148-1/у-88"
						className={`h-7 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
							activeForm === "148-1u-88"
								? "bg-[var(--teal-surface)] text-[var(--teal)] border border-[var(--teal-subtle,var(--line))] font-bold shadow-xs"
								: "text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)]"
						}`}
						title="Льготный / Учетный рецепт строгого учета"
					>
						Льготный / Учетный рецепт
					</button>
				</div>
				<button
					type="button"
					onClick={onClose}
					title="Закрыть"
					className="icon-button flex items-center justify-center w-9 h-9 min-h-[44px] sm:min-h-[36px] rounded-xl text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line)] transition-all cursor-pointer"
				>
					<X className="w-5 h-5" />
				</button>
			</div>
		</div>
	);
};
