/**
 * DENTE Dental CRM — Direct Warranty Launcher (Standalone Deep Link Host)
 * Mandate 8b (Sweet Spot <= 100 lines), Mandate 8e (Doctor Autonomy), Mandate 8aq (Mounting in live UI).
 */

import React, { useState, useEffect } from "react";
import { WarrantyPassportModal } from "./WarrantyPassportModal";
import { clearUrlTokens } from "../appLayout/modalsContainerModules/standalone/deepLinkUrl";
import { usePatientStore } from "../../store/patientStore";
import { useAppStore } from "../../store/appStore";

export function DirectWarrantyLauncher(): React.ReactElement | null {
	const [isOpen, setIsOpen] = useState(true);
	const activePatient = usePatientStore((s) => s.activePatient);
	const currentStaffUser = useAppStore((s) => s.currentStaffUser);
	const activeDoctor = useAppStore((s) => s.activeDoctor);

	const handleClose = () => {
		setIsOpen(false);
		clearUrlTokens(["warranty-passport", "warranty_passport", "warranty-studio", "warranty"]);
	};

	useEffect(() => {
		const handleOpen = () => setIsOpen(true);
		window.addEventListener("dente:open-warranty-passport", handleOpen);
		window.addEventListener("dente-open-warranty-passport", handleOpen);
		return () => {
			window.removeEventListener("dente:open-warranty-passport", handleOpen);
			window.removeEventListener("dente-open-warranty-passport", handleOpen);
		};
	}, []);

	if (!isOpen) return null;

	const patient = activePatient ? {
		id: activePatient.id,
		fullName: activePatient.fullName,
		cardNumber: activePatient.cardNumber || "МК-8492",
		phone: activePatient.phone || undefined,
		birthDate: activePatient.birthDate || undefined,
		snils: activePatient.snils || undefined,
	} : {
		id: "01a00000-0000-0000-0000-000000000001",
		fullName: "Ковалев Дмитрий Сергеевич",
		cardNumber: "МК-8492",
		phone: "+7 (912) 345-67-89",
		birthDate: "1985-06-12",
	};

	const doctorId = currentStaffUser?.id || activeDoctor?.id || "doc-1";
	const doctorName = currentStaffUser?.fullName || activeDoctor?.fullName || "Д-р Соколов А. В.";

	return (
		<div data-testid="warranty-standalone-workspace" className="w-screen h-screen">
			<WarrantyPassportModal
				isOpen={true}
				onClose={handleClose}
				patient={patient}
				doctorId={doctorId}
				doctorName={doctorName}
				clinicName="ООО «ДЕНТЕ СТОМАТОЛОГИЯ»"
			/>
		</div>
	);
}
