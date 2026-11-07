/**
 * DirectPhotoProtocolLauncher.tsx — Автономный лаунчер клинического фотопротокола и мобильного QR-моста (Мандаты 8b, 8aq, PHO-01).
 * Монтируется в корневой AppShell, слушает хэши #photo-qr, #photo-protocol, #photo и события dente:open-photo.
 */

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { ClinicalPhotoProtocolModal } from "./ClinicalPhotoProtocolModal";
import { ChairsidePhotoQrBridgeModal } from "./ChairsidePhotoQrBridgeModal";
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
			s.includes("photo=1")
		);
	};

	const [isOpen, setIsOpen] = useState<boolean>(checkUrlMatches);
	const [isQrMode, setIsQrMode] = useState<boolean>(() => {
		if (typeof window === "undefined") return false;
		const h = window.location.hash || "";
		const s = window.location.search || "";
		return h.includes("photo-qr") || s.includes("photo-qr");
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
				fullName: urlPatientName || storeActivePatient?.fullName || "Морозова Елена Дмитриевна",
			};
		}

		if (storeActivePatient) {
			return {
				id: storeActivePatient.id,
				fullName: storeActivePatient.fullName,
			};
		}

		return {
			id: "01a00000-0000-0000-0000-000000000001",
			fullName: "Морозова Елена Дмитриевна",
		};
	}, [storeActivePatient]);

	const handleOpenEvent = useCallback((e: Event) => {
		const detail = (e as CustomEvent<{ qrOnly?: boolean }>).detail;
		setIsQrMode(Boolean(detail?.qrOnly));
		setIsOpen(true);
	}, []);

	useEffect(() => {
		window.addEventListener("dente:open-photo-protocol", handleOpenEvent);
		window.addEventListener("dente:open-photo-qr", handleOpenEvent);

		const handleHash = () => {
			if (checkUrlMatches()) {
				const h = window.location.hash || "";
				const s = window.location.search || "";
				setIsQrMode(h.includes("photo-qr") || s.includes("photo-qr"));
				setIsOpen(true);
			}
		};

		window.addEventListener("hashchange", handleHash);
		window.addEventListener("popstate", handleHash);
		return () => {
			window.removeEventListener("dente:open-photo-protocol", handleOpenEvent);
			window.removeEventListener("dente:open-photo-qr", handleOpenEvent);
			window.removeEventListener("hashchange", handleHash);
			window.removeEventListener("popstate", handleHash);
		};
	}, [handleOpenEvent]);

	const handleClose = () => {
		setIsOpen(false);
		if (typeof window !== "undefined") {
			const url = new URL(window.location.href);
			url.searchParams.delete("photo-qr");
			url.searchParams.delete("photo-protocol");
			url.searchParams.delete("photo");
			const cleanHash = window.location.hash.replace(/#photo-qr|#photo-protocol|#photo/g, "");
			window.history.replaceState({}, "", url.pathname + (url.search || "") + cleanHash);
		}
	};

	if (!isOpen) return null;

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
