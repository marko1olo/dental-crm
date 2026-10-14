import React from "react";
import type { AppModalsContainerProps } from "./types";
import {
	type StandaloneLaunchersProps,
	type LabCreateOrderContext,
} from "./modalsContainerModules/modalsContainerTypes";
import { renderStandaloneLaunchers } from "./modalsContainerModules/StandaloneLaunchers";
import { ClinicalModalsSubcontainer } from "./modalsContainerModules/ClinicalModalsSubcontainer";
import { AdministrativeModalsSubcontainer } from "./modalsContainerModules/AdministrativeModalsSubcontainer";
import { ImplantPassportModal } from "../implants/ImplantPassportModal";

export type { StandaloneLaunchersProps };
export { renderStandaloneLaunchers };

export function AppModalsContainer({
	isCbctTunerOpen,
	setIsCbctTunerOpen,
	isCbctDirectModalOpen,
	setIsCbctDirectModalOpen,
	isConsentDirectModalOpen,
	setIsConsentDirectModalOpen,
	isCephDirectModalOpen: _isCephDirectModalOpen,
	setIsCephDirectModalOpen: _setIsCephDirectModalOpen,
	isEgiszRemdModalOpen,
	setIsEgiszRemdModalOpen,
	isSmartSlotRecoveryDemoOpen: _isSmartSlotRecoveryDemoOpen,
	setIsSmartSlotRecoveryDemoOpen: _setIsSmartSlotRecoveryDemoOpen,
	isPrivacyShieldActive: _isPrivacyShieldActive,
	setIsPrivacyShieldActive: _setIsPrivacyShieldActive,
	isSessionLocked,
	setIsSessionLocked,
	activeStaffUser,
	setActiveStaffUser,
	handleClinicLogout,
	handleFullStaffLock,
}: AppModalsContainerProps) {
	const [isGlobalVisiographOpen, setIsGlobalVisiographOpen] = React.useState(
		() =>
			typeof window !== "undefined" &&
			((window.location.search || "").includes("visiograph") ||
				(window.location.hash || "").includes("visiograph")),
	);
	const [isGlobalImagingExportOpen, setIsGlobalImagingExportOpen] = React.useState(
		() =>
			typeof window !== "undefined" &&
			((window.location.search || "").includes("imaging-export") ||
				(window.location.hash || "").includes("imaging-export")),
	);
	const [isGlobalLabCreateOrderOpen, setIsGlobalLabCreateOrderOpen] = React.useState(
		() =>
			typeof window !== "undefined" &&
			((window.location.search || "").includes("lab-create") ||
				(window.location.hash || "").includes("lab-create")),
	);
	const [labCreateOrderContext, setLabCreateOrderContext] =
		React.useState<LabCreateOrderContext | null>(null);
	const [isImplantPassportOpen, setIsImplantPassportOpen] = React.useState(
		() =>
			typeof window !== "undefined" &&
			((window.location.search || "").includes("implant_passport") ||
				(window.location.hash || "").includes("implant_passport") ||
				(window.location.search || "").includes("passport=demo")),
	);

	React.useEffect(() => {
		const onOpenVisiograph = () => {
			setIsGlobalImagingExportOpen(false);
			setIsGlobalLabCreateOrderOpen(false);
			setIsGlobalVisiographOpen(true);
		};
		const onOpenImagingExport = () => {
			setIsGlobalVisiographOpen(false);
			setIsGlobalLabCreateOrderOpen(false);
			setIsGlobalImagingExportOpen(true);
		};
		const onOpenLabCreate = (e: Event) => {
			const detail = (e as CustomEvent)?.detail;
			setIsGlobalVisiographOpen(false);
			setIsGlobalImagingExportOpen(false);
			setLabCreateOrderContext(detail || null);
			setIsGlobalLabCreateOrderOpen(true);
		};
		const onOpenImplantPassport = () => {
			setIsImplantPassportOpen(true);
		};
		window.addEventListener("dente-open-visiograph-comparison", onOpenVisiograph);
		window.addEventListener("dente-open-imaging-export", onOpenImagingExport);
		window.addEventListener("dente-open-create-lab-order", onOpenLabCreate);
		window.addEventListener("dente-open-implant-passport", onOpenImplantPassport);
		return () => {
			window.removeEventListener("dente-open-visiograph-comparison", onOpenVisiograph);
			window.removeEventListener("dente-open-imaging-export", onOpenImagingExport);
			window.removeEventListener("dente-open-create-lab-order", onOpenLabCreate);
			window.removeEventListener("dente-open-implant-passport", onOpenImplantPassport);
		};
	}, []);

	return (
		<>
			{renderStandaloneLaunchers({
				isCbctTunerOpen,
				setIsCbctTunerOpen,
				isCbctDirectModalOpen,
				setIsCbctDirectModalOpen,
				isConsentDirectModalOpen,
				setIsConsentDirectModalOpen,
				isCephDirectModalOpen: _isCephDirectModalOpen,
				setIsCephDirectModalOpen: _setIsCephDirectModalOpen,
				isEgiszRemdModalOpen,
				setIsEgiszRemdModalOpen,
				isSmartSlotRecoveryDemoOpen: _isSmartSlotRecoveryDemoOpen,
				setIsSmartSlotRecoveryDemoOpen: _setIsSmartSlotRecoveryDemoOpen,
			})}
			<ClinicalModalsSubcontainer
				isGlobalVisiographOpen={isGlobalVisiographOpen}
				setIsGlobalVisiographOpen={setIsGlobalVisiographOpen}
				isGlobalImagingExportOpen={isGlobalImagingExportOpen}
				setIsGlobalImagingExportOpen={setIsGlobalImagingExportOpen}
				isCbctTunerOpen={isCbctTunerOpen}
				setIsCbctTunerOpen={setIsCbctTunerOpen}
				isCbctDirectModalOpen={isCbctDirectModalOpen}
				setIsCbctDirectModalOpen={setIsCbctDirectModalOpen}
				isConsentDirectModalOpen={isConsentDirectModalOpen}
				setIsConsentDirectModalOpen={setIsConsentDirectModalOpen}
				isEgiszRemdModalOpen={isEgiszRemdModalOpen}
				setIsEgiszRemdModalOpen={setIsEgiszRemdModalOpen}
				activeStaffUser={activeStaffUser}
			/>
			<AdministrativeModalsSubcontainer
				isGlobalLabCreateOrderOpen={isGlobalLabCreateOrderOpen}
				setIsGlobalLabCreateOrderOpen={setIsGlobalLabCreateOrderOpen}
				labCreateOrderContext={labCreateOrderContext}
				isSessionLocked={isSessionLocked}
				setIsSessionLocked={setIsSessionLocked}
				activeStaffUser={activeStaffUser}
				setActiveStaffUser={setActiveStaffUser}
				handleClinicLogout={handleClinicLogout}
				handleFullStaffLock={handleFullStaffLock}
			/>
		</>
	);
}
