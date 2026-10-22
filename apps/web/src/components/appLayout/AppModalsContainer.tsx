import React from "react";
import type { AppModalsContainerProps } from "./types";
import {
	type StandaloneLaunchersProps,
	type LabCreateOrderContext,
	type LoyaltyModalContext,
} from "./modalsContainerModules/modalsContainerTypes";
import { renderStandaloneLaunchers } from "./modalsContainerModules/StandaloneLaunchers";
import { ClinicalModalsSubcontainer } from "./modalsContainerModules/ClinicalModalsSubcontainer";
import { AdministrativeModalsSubcontainer } from "./modalsContainerModules/AdministrativeModalsSubcontainer";
import { ImplantPassportModal } from "../implants/ImplantPassportModal";
import { useUiSurfaceStore } from "../../store/uiSurfaceStore";
import { lazyWithRetry } from "../../lib/lazyWithRetry";

const EgiszCertificatesHubModal = lazyWithRetry(() =>
	import("../egisz/EgiszCertificatesHubModal").then((module) => ({
		default: module.EgiszCertificatesHubModal,
	})),
);

const RapidLaunchWizard = lazyWithRetry(() =>
	import("../onboarding/RapidLaunchWizard").then((module) => ({
		default: module.RapidLaunchWizard,
	})),
);

const EmergencyRescueModal = lazyWithRetry(() =>
	import("../emergency/EmergencyRescueModal").then((module) => ({
		default: module.EmergencyRescueModal,
	})),
);

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
	const [isGlobalLoyaltyOpen, setIsGlobalLoyaltyOpen] = React.useState(
		() =>
			typeof window !== "undefined" &&
			((window.location.search || "").includes("loyalty") ||
				(window.location.hash || "").includes("loyalty")),
	);
	const [loyaltyModalContext, setLoyaltyModalContext] =
		React.useState<LoyaltyModalContext | null>(null);

	const [isEgiszCertificatesOpen, setIsEgiszCertificatesOpen] = React.useState(
		() =>
			typeof window !== "undefined" &&
			((window.location.search || "").includes("certificates") ||
				(window.location.hash || "").includes("certificates") ||
				(window.location.search || "").includes("egisz-certificates")),
	);
	const [egiszCertificatesSection, setEgiszCertificatesSection] = React.useState<"queue" | "tax_deduction" | "extracts">(() => {
		if (typeof window === "undefined") return "queue";
		const s = window.location.search || "";
		const h = window.location.hash || "";
		if (s.includes("tax_deduction") || h.includes("tax_deduction")) return "tax_deduction";
		if (s.includes("extracts") || h.includes("extracts")) return "extracts";
		return "queue";
	});

	const [isGlobalOnboardingOpen, setIsGlobalOnboardingOpen] = React.useState(
		() =>
			typeof window !== "undefined" &&
			((window.location.search || "").includes("onboarding") ||
				(window.location.hash || "").includes("onboarding")),
	);

	const [isEmergencyRescueOpen, setIsEmergencyRescueOpen] = React.useState(
		() =>
			typeof window !== "undefined" &&
			((window.location.search || "").includes("emergency") ||
				(window.location.hash || "").includes("emergency")),
	);

	const primaryModal = useUiSurfaceStore((s) => s.primaryModal);
	const isLoyaltyFromStore = primaryModal?.id === "loyalty";
	const isEffectiveLoyaltyOpen = Boolean(isGlobalLoyaltyOpen || isLoyaltyFromStore);
	const effectiveLoyaltyContext =
		(isLoyaltyFromStore ? (primaryModal?.payload as LoyaltyModalContext) : null) ||
		loyaltyModalContext;

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
		const onOpenLoyalty = (e: Event) => {
			const detail = (e as CustomEvent)?.detail;
			setLoyaltyModalContext(detail || null);
			setIsGlobalLoyaltyOpen(true);
		};
		const onOpenEgiszCertificates = (e: Event) => {
			const detail = (e as CustomEvent)?.detail;
			if (detail?.section) {
				setEgiszCertificatesSection(detail.section);
			}
			setIsEgiszCertificatesOpen(true);
		};
		const onOpenOnboarding = () => {
			setIsGlobalOnboardingOpen(true);
		};
		const onOpenEmergencyRescue = () => {
			setIsEmergencyRescueOpen(true);
		};
		const onHashChange = () => {
			if (
				(window.location.hash || "").includes("onboarding") ||
				(window.location.search || "").includes("onboarding")
			) {
				setIsGlobalOnboardingOpen(true);
			}
			if (
				(window.location.hash || "").includes("emergency") ||
				(window.location.search || "").includes("emergency")
			) {
				setIsEmergencyRescueOpen(true);
			}
		};
		window.addEventListener("dente-open-visiograph-comparison", onOpenVisiograph);
		window.addEventListener("dente-open-imaging-export", onOpenImagingExport);
		window.addEventListener("dente-open-create-lab-order", onOpenLabCreate);
		window.addEventListener("dente-open-implant-passport", onOpenImplantPassport);
		window.addEventListener("dente-open-loyalty", onOpenLoyalty);
		window.addEventListener("dente-open-egisz-certificates", onOpenEgiszCertificates);
		window.addEventListener("dente:open-egisz-certificates", onOpenEgiszCertificates);
		window.addEventListener("dente-open-rapid-onboarding", onOpenOnboarding);
		window.addEventListener("dente:open-emergency-rescue", onOpenEmergencyRescue);
		window.addEventListener("hashchange", onHashChange);

		return () => {
			window.removeEventListener("dente-open-visiograph-comparison", onOpenVisiograph);
			window.removeEventListener("dente-open-imaging-export", onOpenImagingExport);
			window.removeEventListener("dente-open-create-lab-order", onOpenLabCreate);
			window.removeEventListener("dente-open-implant-passport", onOpenImplantPassport);
			window.removeEventListener("dente-open-loyalty", onOpenLoyalty);
			window.removeEventListener("dente-open-egisz-certificates", onOpenEgiszCertificates);
			window.removeEventListener("dente:open-egisz-certificates", onOpenEgiszCertificates);
			window.removeEventListener("dente-open-rapid-onboarding", onOpenOnboarding);
			window.removeEventListener("dente:open-emergency-rescue", onOpenEmergencyRescue);
			window.removeEventListener("hashchange", onHashChange);
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
				isGlobalLoyaltyOpen={isEffectiveLoyaltyOpen}
				setIsGlobalLoyaltyOpen={(open) => {
					setIsGlobalLoyaltyOpen(open);
					if (!open) {
						useUiSurfaceStore.getState().closePrimaryModal("loyalty");
					}
				}}
				loyaltyModalContext={effectiveLoyaltyContext}
				isSessionLocked={isSessionLocked}
				setIsSessionLocked={setIsSessionLocked}
				activeStaffUser={activeStaffUser}
				setActiveStaffUser={setActiveStaffUser}
				handleClinicLogout={handleClinicLogout}
				handleFullStaffLock={handleFullStaffLock}
			/>
			{isEgiszCertificatesOpen && (
				<React.Suspense fallback={null}>
					<EgiszCertificatesHubModal
						isOpen={true}
						initialSection={egiszCertificatesSection}
						onClose={() => {
							setIsEgiszCertificatesOpen(false);
							const url = new URL(window.location.href);
							url.searchParams.delete("certificates");
							url.searchParams.delete("egisz-certificates");
							window.history.replaceState(
								{},
								"",
								url.pathname +
									(url.search ? url.search : "") +
									(url.hash && !url.hash.includes("certificates") ? url.hash : ""),
							);
						}}
					/>
				</React.Suspense>
			)}
			{isGlobalOnboardingOpen && (
				<React.Suspense fallback={null}>
					<RapidLaunchWizard
						isModal={true}
						onClose={() => {
							setIsGlobalOnboardingOpen(false);
							if (typeof window !== "undefined" && window.location.hash.includes("onboarding")) {
								window.history.replaceState(
									{},
									"",
									window.location.pathname + window.location.search,
								);
							}
						}}
						onFinished={() => {
							setIsGlobalOnboardingOpen(false);
							if (typeof window !== "undefined" && window.location.hash.includes("onboarding")) {
								window.history.replaceState(
									{},
									"",
									window.location.pathname + window.location.search,
								);
							}
						}}
						onSkipped={() => {
							setIsGlobalOnboardingOpen(false);
							if (typeof window !== "undefined" && window.location.hash.includes("onboarding")) {
								window.history.replaceState(
									{},
									"",
									window.location.pathname + window.location.search,
								);
							}
						}}
					/>
				</React.Suspense>
			)}
			{isEmergencyRescueOpen && (
				<React.Suspense fallback={null}>
					<EmergencyRescueModal
						isOpen={true}
						onClose={() => {
							setIsEmergencyRescueOpen(false);
							if (typeof window !== "undefined" && ((window.location.hash || "").includes("emergency") || (window.location.search || "").includes("emergency"))) {
								const url = new URL(window.location.href);
								url.searchParams.delete("emergency");
								window.history.replaceState(
									{},
									"",
									url.pathname + (url.search ? url.search : "") + (url.hash && !url.hash.includes("emergency") ? url.hash : ""),
								);
							}
						}}
					/>
				</React.Suspense>
			)}
		</>
	);
}
