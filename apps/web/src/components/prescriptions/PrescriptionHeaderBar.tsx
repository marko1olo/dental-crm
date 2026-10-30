/**
 * PrescriptionHeaderBar.tsx — Accessible Header for Prescription Workspace
 * Mandate 8x (Zero decree numbers), Mandate 8e (Doctor Autonomy).
 * Sweet Spot 70–120 lines (Mandate 8b).
 */

import React from "react";
import { FileText, X } from "lucide-react";

export interface PrescriptionHeaderBarProps {
	readonly patientName: string;
	readonly patientCard: string;
	readonly doctorName: string;
	readonly diagnosisIcd10?: string | undefined;
	readonly patientAllergiesText?: string | undefined;
	readonly formType: "standard" | "special";
	readonly onFormTypeChange: (type: "standard" | "special") => void;
	readonly onClose: () => void;
}

export const PrescriptionHeaderBar: React.FC<PrescriptionHeaderBarProps> = ({
	patientName,
	patientCard,
	doctorName,
	diagnosisIcd10,
	patientAllergiesText,
	formType,
	onFormTypeChange,
	onClose,
}) => {
	return (
		<header className="px-4 sm:px-5 py-3 sm:py-3.5 bg-[var(--paper-strong)] border-b border-[var(--line)] flex items-center justify-between gap-3 shrink-0">
			<div className="flex items-center gap-3 min-w-0">
				<div className="w-9 h-9 rounded-xl bg-teal-500/10 text-[var(--teal,#0d9488)] border border-teal-500/20 flex items-center justify-center shrink-0">
					<FileText className="w-5 h-5" />
				</div>
				<div className="min-w-0">
					<div className="flex items-center gap-2">
						<h2 className="text-sm sm:text-base font-bold text-[var(--ink)] truncate">
							Рецептурный бланк
						</h2>
						<span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--muted)] shrink-0">
							{patientCard}
						</span>
					</div>
					<div className="text-xs text-[var(--muted)] leading-tight mt-0.5">
						<span className="inline-block truncate max-w-full">
							Пациент: <strong className="text-[var(--ink)]">{patientName}</strong>
							<span className="hidden sm:inline">
								{" "}
								· Врач: {doctorName}
								{diagnosisIcd10 ? ` · ${diagnosisIcd10}` : ""}
							</span>
						</span>
						{patientAllergiesText ? (
							<span className="text-amber-700 dark:text-amber-300 font-semibold block sm:inline sm:ml-2">
								⚠️ Аллергия: {patientAllergiesText}
							</span>
						) : null}
					</div>
				</div>
			</div>

			<div className="flex items-center gap-2 shrink-0 ml-auto">
				<div className="hidden sm:flex items-center p-0.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] text-xs">
					<button
						type="button"
						onClick={() => onFormTypeChange("standard")}
						className={`px-2.5 sm:px-3 py-1.5 rounded-md font-medium border-0 cursor-pointer transition-colors ${
							formType === "standard"
								? "bg-[var(--paper)] text-[var(--ink)] shadow-xs font-semibold"
								: "bg-transparent text-[var(--muted)] hover:text-[var(--ink)]"
						}`}
					>
						Рецептурный бланк
					</button>
					<button
						type="button"
						onClick={() => onFormTypeChange("special")}
						className={`px-2.5 sm:px-3 py-1.5 rounded-md font-medium border-0 cursor-pointer transition-colors ${
							formType === "special"
								? "bg-[var(--paper)] text-rose-700 dark:text-rose-300 shadow-xs font-semibold"
								: "bg-transparent text-[var(--muted)] hover:text-[var(--ink)]"
						}`}
						title="Специальный рецептурный бланк (учётный)"
					>
						Специальный рецептурный бланк (учётный)
					</button>
				</div>
				<button
					type="button"
					onClick={onClose}
					className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl hover:bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] border-0 transition-colors cursor-pointer"
					aria-label="Закрыть"
				>
					<X className="w-5 h-5" />
				</button>
			</div>
		</header>
	);
};

PrescriptionHeaderBar.displayName = "PrescriptionHeaderBar";
