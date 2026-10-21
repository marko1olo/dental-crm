/**
 * apps/web/src/components/patients/drawer/PatientDrawer.tsx
 * Canonical slide-over drawer for patient context.
 * Mandate 8b: strictly <= 120 lines.
 */
import React, { useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import {
	DEFAULT_SOMATIC_HEALTHY_NORM,
	evaluatePatientSafetyFlags,
} from "../safetyMath";
import { PatientDrawerActionButtons } from "./PatientDrawerActionButtons";
import { PatientDrawerFinanceCard } from "./PatientDrawerFinanceCard";
import { PatientDrawerFooter } from "./PatientDrawerFooter";
import { PatientDrawerHeader } from "./PatientDrawerHeader";
import { PatientDrawerSafetyCard } from "./PatientDrawerSafetyCard";
import type { PatientDrawerProps } from "./patientDrawerTypes";

export type { PatientDrawerProps } from "./patientDrawerTypes";

export const PatientDrawer: React.FC<PatientDrawerProps> = React.memo(
	function PatientDrawer(props) {
		const {
			isOpen,
			onClose,
			patient,
			safetyProfile: rawSafetyProfile,
			familyData,
			onOpenAnamnesis,
			onOpenFamilyWallet,
			onOpenFullCard,
			onNewAppointment,
			className = "",
		} = props;

		useEffect(() => {
			const handleKeyDown = (e: KeyboardEvent) => {
				if (e.key === "Escape" && isOpen) onClose();
			};
			window.addEventListener("keydown", handleKeyDown);
			return () => window.removeEventListener("keydown", handleKeyDown);
		}, [isOpen, onClose]);

		const effectiveSafety = rawSafetyProfile ?? DEFAULT_SOMATIC_HEALTHY_NORM;
		const safetyEvaluation = useMemo(
			() => evaluatePatientSafetyFlags(effectiveSafety),
			[effectiveSafety],
		);
		const isPhysiologicalNorm =
			safetyEvaluation.activeFlags.length === 0 &&
			[
				effectiveSafety.hasPenicillinAllergy,
				effectiveSafety.hasLidocaineAllergy,
				effectiveSafety.hasArticaineAllergy,
				effectiveSafety.hasLatexAllergy,
				effectiveSafety.hasIodineAllergy,
			].every((a) => !a);

		if (!isOpen || !patient) return null;

		const drawerContent = (
			<div
				className="fixed inset-0 z-[10000] overflow-hidden bg-black/50 backdrop-blur-2xs transition-opacity animate-in fade-in duration-200"
				role="dialog"
				aria-modal="true"
				aria-labelledby="patient-drawer-title"
				onClick={(e) => {
					if (e.target === e.currentTarget) onClose();
				}}
				onKeyDown={(e) => {
					if (e.key === "Escape") onClose();
				}}
				data-testid="patient-drawer-backdrop"
			>
				<div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
					<div
						data-testid="patient-drawer"
						className={`w-screen max-w-md bg-[var(--paper-strong)] border-l border-[var(--glass-border)] shadow-2xl flex flex-col overflow-hidden text-[var(--ink)] animate-in slide-in-from-right duration-300 ${className}`}
					>
						<PatientDrawerHeader patient={patient} onClose={onClose} />
						<div className="p-5 overflow-y-auto flex-1 flex flex-col gap-4">
							<PatientDrawerSafetyCard
								effectiveSafety={effectiveSafety}
								isPhysiologicalNorm={isPhysiologicalNorm}
								onOpenAnamnesis={onOpenAnamnesis}
							/>
							<PatientDrawerFinanceCard
								personalBalanceRub={Number(patient.patientBalanceRub ?? 0)}
								familyBalanceRub={
									familyData?.balance ? Number(familyData.balance) : null
								}
								familyData={familyData}
								onOpenFamilyWallet={onOpenFamilyWallet}
							/>
							<PatientDrawerActionButtons
								patientId={patient.id || ""}
								onOpenFullCard={onOpenFullCard}
								onNewAppointment={onNewAppointment}
							/>
						</div>
						<PatientDrawerFooter onClose={onClose} />
					</div>
				</div>
			</div>
		);

		return typeof document !== "undefined" && document.body
			? createPortal(drawerContent, document.body)
			: drawerContent;
	},
);

export default PatientDrawer;
