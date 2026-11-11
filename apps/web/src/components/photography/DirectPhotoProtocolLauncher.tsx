/**
 * DirectPhotoProtocolLauncher.tsx — Автономный лаунчер клинического фотопротокола и мобильного QR-моста (Мандаты 8b, 8aq, PHO-01).
 * Монтируется в корневой AppShell, слушает хэши #photo-qr, #photo-protocol, #photo и события dente:open-photo.
 */

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { ClinicalPhotoProtocolModal } from "./ClinicalPhotoProtocolModal";
import { ChairsidePhotoQrBridgeModal } from "./ChairsidePhotoQrBridgeModal";
import { DsdAestheticStudioModal } from "./dsd/DsdAestheticStudioModal";
import { useAppStore } from "../../store/appStore";

export const DirectPhotoProtocolLauncher: React.FC = () => {
	const checkUrlMatches = () => {
		if (typeof window === "undefined") return false;
		const s = window.location.search || "";
		const h = window.location.hash || "";
		return (
			h.includes("photo-qr") ||
			s.includes("photo-qr") ||
			h.includes("photo-protocol") ||
			s.includes("photo-protocol") ||
			h === "#photo" ||
			s.includes("photo=1") ||
			h.includes("dsd") ||
			s.includes("dsd=1") ||
			s.includes("smile-design")
		);
	};

	const [isOpen, setIsOpen] = useState<boolean>(checkUrlMatches);
	const [isQrMode, setIsQrMode] = useState<boolean>(() => {
		if (typeof window === "undefined") return false;
		const h = window.location.hash || "";
		const s = window.location.search || "";
		return h.includes("photo-qr") || s.includes("photo-qr");
	});
	const [isDsdMode, setIsDsdMode] = useState<boolean>(() => {
		if (typeof window === "undefined") return false;
		const h = window.location.hash || "";
		const s = window.location.search || "";
		return h.includes("dsd") || s.includes("dsd=1") || s.includes("smile-design");
	});

	const storeActivePatient = useAppStore((st) => {
		const activeId = st.activePatientId;
		return (
			st.dashboard?.patients?.find((p) => p.id === activeId) ||
			(st.dashboard?.activeVisit?.patientId
				? st.dashboard?.patients?.find((p) => p.id === st.dashboard?.activeVisit?.patientId)
				: st.dashboard?.patients?.[0])
		);
	});

	const effectivePatient = useMemo(() => {
		let urlPatientId = "";
		let urlPatientName = "";
		if (typeof window !== "undefined") {
			const params = new URLSearchParams(window.location.search);
			urlPatientId = params.get("patientId") || "";
			urlPatientName = params.get("patientName") || "";
		}

		if (urlPatientId) {
			return {
				id: urlPatientId,
				fullName: urlPatientName || storeActivePatient?.fullName || "Пациент",
			};
		}

		if (storeActivePatient) {
			return {
				id: storeActivePatient.id,
				fullName: storeActivePatient.fullName,
			};
		}

		return {
			id: "",
			fullName: "Пациент",
		};
	}, [storeActivePatient]);

	const handleOpenEvent = useCallback((e: Event) => {
		const detail = (e as CustomEvent<{ qrOnly?: boolean; dsd?: boolean }>).detail;
		setIsQrMode(Boolean(detail?.qrOnly));
		setIsDsdMode(Boolean(detail?.dsd));
		setIsOpen(true);
	}, []);

	useEffect(() => {
		window.addEventListener("dente:open-photo-protocol", handleOpenEvent);
		window.addEventListener("dente:open-photo-qr", handleOpenEvent);
		window.addEventListener("dente:open-dsd", handleOpenEvent);

		const handleHash = () => {
			if (checkUrlMatches()) {
				const h = window.location.hash || "";
				const s = window.location.search || "";
				setIsQrMode(h.includes("photo-qr") || s.includes("photo-qr"));
				setIsDsdMode(h.includes("dsd") || s.includes("dsd=1") || s.includes("smile-design"));
				setIsOpen(true);
			}
		};

		window.addEventListener("hashchange", handleHash);
		window.addEventListener("popstate", handleHash);
		return () => {
			window.removeEventListener("dente:open-photo-protocol", handleOpenEvent);
			window.removeEventListener("dente:open-photo-qr", handleOpenEvent);
			window.removeEventListener("dente:open-dsd", handleOpenEvent);
			window.removeEventListener("hashchange", handleHash);
			window.removeEventListener("popstate", handleHash);
		};
	}, [handleOpenEvent]);

	const handleClose = () => {
		setIsOpen(false);
		setIsDsdMode(false);
		setIsQrMode(false);
		if (typeof window !== "undefined") {
			const url = new URL(window.location.href);
			url.searchParams.delete("photo-qr");
			url.searchParams.delete("photo-protocol");
			url.searchParams.delete("photo");
			url.searchParams.delete("dsd");
			url.searchParams.delete("smile-design");
			const cleanHash = window.location.hash.replace(/#photo-qr|#photo-protocol|#photo|#dsd|#smile-design/g, "");
			window.history.replaceState({}, "", url.pathname + (url.search || "") + cleanHash);
		}
	};

	if (!isOpen) return null;

	if (isDsdMode) {
		return (
			<DsdAestheticStudioModal
				isOpen={isOpen}
				onClose={handleClose}
				patientId={effectivePatient.id}
				patientName={effectivePatient.fullName}
			/>
		);
	}

	if (isQrMode) {
		return (
			<ChairsidePhotoQrBridgeModal
				isOpen={isOpen}
				onClose={handleClose}
				patientId={effectivePatient.id}
				patientName={effectivePatient.fullName}
			/>
		);
	}

	return (
		<ClinicalPhotoProtocolModal
			isOpen={isOpen}
			onClose={handleClose}
			patientId={effectivePatient.id}
			patientName={effectivePatient.fullName}
		/>
	);
};

export default DirectPhotoProtocolLauncher;
