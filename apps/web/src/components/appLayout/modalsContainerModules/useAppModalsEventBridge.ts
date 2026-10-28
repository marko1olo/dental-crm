/**
 * useAppModalsEventBridge — Хук управления состоянием и шиной событий глобальных модалок (Мандат 8b, <= 120 строк).
 */

import React, { useEffect, useState } from "react";
import type { LabCreateOrderContext, LoyaltyModalContext } from "./modalsContainerTypes";

export function useAppModalsEventBridge() {
	const [isGlobalVisiographOpen, setIsGlobalVisiographOpen] = useState(false);
	const [isGlobalImagingExportOpen, setIsGlobalImagingExportOpen] = useState(false);
	const [isGlobalLabCreateOrderOpen, setIsGlobalLabCreateOrderOpen] = useState(false);
	const [labCreateOrderContext, setLabCreateOrderContext] = useState<LabCreateOrderContext | null>(null);
	const [isGlobalLoyaltyOpen, setIsGlobalLoyaltyOpen] = useState(false);
	const [loyaltyModalContext, setLoyaltyModalContext] = useState<LoyaltyModalContext | null>(null);
	const [isEgiszCertificatesOpen, setIsEgiszCertificatesOpen] = useState(false);
	const [egiszCertificatesSection, setEgiszCertificatesSection] = useState<"queue" | "tax_deduction" | "extracts">("queue");
	const [isGlobalOnboardingOpen, setIsGlobalOnboardingOpen] = useState(false);
	const [isEmergencyRescueOpen, setIsEmergencyRescueOpen] = useState(false);

	useEffect(() => {
		try {
			const searchParams = new URLSearchParams(window.location.search);
			if (searchParams.get("certificates") === "1" || searchParams.get("egisz-certificates") === "1") {
				const section = searchParams.get("section");
				if (section === "tax_deduction" || section === "extracts" || section === "queue") {
					setEgiszCertificatesSection(section);
				}
				setIsEgiszCertificatesOpen(true);
			}
			if (searchParams.get("onboarding") === "1" || searchParams.get("rapid-onboarding") === "1") {
				setIsGlobalOnboardingOpen(true);
			}
			if (searchParams.get("emergency") === "1" || searchParams.get("antishock") === "1") {
				setIsEmergencyRescueOpen(true);
			}
		} catch {
			// ignore SSR
		}

		const onOpenVisiograph = () => setIsGlobalVisiographOpen(true);
		const onOpenImagingExport = () => setIsGlobalImagingExportOpen(true);
		const onOpenLabCreate = (e: Event) => {
			setLabCreateOrderContext((e as CustomEvent)?.detail || null);
			setIsGlobalLabCreateOrderOpen(true);
		};
		const onOpenLoyalty = (e: Event) => {
			setLoyaltyModalContext((e as CustomEvent)?.detail || null);
			setIsGlobalLoyaltyOpen(true);
		};
		const onOpenEgisz = (e: Event) => {
			const detail = (e as CustomEvent)?.detail;
			if (detail?.section) setEgiszCertificatesSection(detail.section);
			setIsEgiszCertificatesOpen(true);
		};
		const onOpenOnboarding = () => setIsGlobalOnboardingOpen(true);
		const onOpenEmergency = () => setIsEmergencyRescueOpen(true);

		window.addEventListener("dente-open-visiograph-comparison", onOpenVisiograph);
		window.addEventListener("dente-open-imaging-export", onOpenImagingExport);
		window.addEventListener("dente-open-create-lab-order", onOpenLabCreate);
		window.addEventListener("dente-open-loyalty", onOpenLoyalty);
		window.addEventListener("dente-open-egisz-certificates", onOpenEgisz);
		window.addEventListener("dente:open-egisz-certificates", onOpenEgisz);
		window.addEventListener("dente-open-rapid-onboarding", onOpenOnboarding);
		window.addEventListener("dente:open-emergency-rescue", onOpenEmergency);

		return () => {
			window.removeEventListener("dente-open-visiograph-comparison", onOpenVisiograph);
			window.removeEventListener("dente-open-imaging-export", onOpenImagingExport);
			window.removeEventListener("dente-open-create-lab-order", onOpenLabCreate);
			window.removeEventListener("dente-open-loyalty", onOpenLoyalty);
			window.removeEventListener("dente-open-egisz-certificates", onOpenEgisz);
			window.removeEventListener("dente:open-egisz-certificates", onOpenEgisz);
			window.removeEventListener("dente-open-rapid-onboarding", onOpenOnboarding);
			window.removeEventListener("dente:open-emergency-rescue", onOpenEmergency);
		};
	}, []);

	return {
		isGlobalVisiographOpen,
		setIsGlobalVisiographOpen,
		isGlobalImagingExportOpen,
		setIsGlobalImagingExportOpen,
		isGlobalLabCreateOrderOpen,
		setIsGlobalLabCreateOrderOpen,
		labCreateOrderContext,
		isGlobalLoyaltyOpen,
		setIsGlobalLoyaltyOpen,
		loyaltyModalContext,
		isEgiszCertificatesOpen,
		setIsEgiszCertificatesOpen,
		egiszCertificatesSection,
		isGlobalOnboardingOpen,
		setIsGlobalOnboardingOpen,
		isEmergencyRescueOpen,
		setIsEmergencyRescueOpen,
	};
}
