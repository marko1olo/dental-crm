/**
 * DENTE Dental CRM — Direct Warranty Launcher (Standalone Deep Link Host)
 * Mandate 8b (Sweet Spot <= 100 lines), Mandate 8e (Doctor Autonomy), Mandate 8aq (Mounting in live UI), Mandate 8k (Empty State).
 */

import React, { useState, useEffect } from "react";
import { ShieldCheck, Users, X } from "lucide-react";
import { WarrantyPassportModal } from "./WarrantyPassportModal";
import { clearUrlTokens } from "../appLayout/modalsContainerModules/standalone/deepLinkUrl";
import { usePatientStore } from "../../store/patientStore";
import { useAppStore } from "../../store/appStore";
import { isDemoShowcaseMode } from "../../lib/demoMode";

export function DirectWarrantyLauncher(): React.ReactElement | null {
	const [isOpen, setIsOpen] = useState<boolean>(() => {
		if (typeof window === "undefined") return false;
		const s = window.location.search || "";
		const h = window.location.hash || "";
		return (
			s.includes("warranty-passport") ||
			s.includes("warranty_passport") ||
			s.includes("warranty-studio") ||
			s.includes("warranty=true") ||
			h.includes("warranty-passport")
		);
	});
	const storePatientId = usePatientStore((s) => s.selectedPatientId);
	const storePatientCore = usePatientStore((s) => s.patientCoreDraft);
	const storeActiveDoctorName = useAppStore((s) => s.activeDoctorName);

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

	const isDemo = isDemoShowcaseMode();
	const hasActivePatient = Boolean(storePatientId && storePatientId.trim());

	if (!hasActivePatient && !isDemo) {
		return (
			<div data-testid="warranty-standalone-workspace" className="fixed inset-0 z-[10050] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
				<div
					data-testid="warranty-empty-state"
					className="flex flex-col items-center justify-center p-6 sm:p-8 text-center gap-4 bg-[var(--paper)] rounded-2xl border border-[var(--line)] max-w-md w-full shadow-2xl text-[var(--ink)] animate-in fade-in duration-150"
				>
					<div className="w-14 h-14 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center border border-teal-500/20">
						<ShieldCheck className="w-7 h-7" />
					</div>
					<div className="space-y-1.5">
						<h3 className="text-sm sm:text-base font-bold text-[var(--ink)] m-0">
							Выберите пациента для оформления гарантии
						</h3>
						<p className="text-xs text-[var(--muted)] m-0 leading-relaxed">
							Гарантийный паспорт и акты переделки (ст. 29 ЗоЗПП) привязываются к медицинской карте конкретного пациента.
						</p>
					</div>
					<div className="flex items-center gap-2 pt-2 w-full justify-center">
						<button
							type="button"
							onClick={() => {
								useAppStore.getState().setCurrentView("patients");
								if (typeof window !== "undefined") window.location.hash = "patients";
								handleClose();
							}}
							className="h-9 px-4 text-xs font-bold rounded-lg bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-dark,#0f766e)] text-white shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
						>
							<Users className="w-4 h-4 shrink-0" />
							<span>Перейти к пациентам</span>
						</button>
						<button
							type="button"
							onClick={handleClose}
							className="h-9 px-3.5 text-xs font-semibold rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] cursor-pointer"
						>
							Закрыть
						</button>
					</div>
				</div>
			</div>
		);
	}

	const patient = hasActivePatient
		? {
				id: storePatientId as string,
				fullName: storePatientCore?.fullName || "Пациент клиники",
				cardNumber: (storePatientCore as Record<string, unknown>)?.cardNumber as string | undefined,
				phone: storePatientCore?.phone || undefined,
				birthDate: storePatientCore?.birthDate || undefined,
			}
		: {
				id: "01a00000-0000-0000-0000-000000000001",
				fullName: "Ковалев Дмитрий Сергеевич",
				cardNumber: "МК-8492",
				phone: "+7 (912) 345-67-89",
				birthDate: "1985-06-12",
			};

	const sessionDoctorId = typeof window !== "undefined" ? sessionStorage.getItem("dente_staff_id") : null;
	const doctorId = sessionDoctorId || (isDemo ? "doc-1" : undefined);
	const doctorName = storeActiveDoctorName || (isDemo ? "Д-р Соколов А. В." : undefined);

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
