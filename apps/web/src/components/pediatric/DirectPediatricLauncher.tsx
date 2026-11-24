/**
 * @dental/web/components/pediatric/DirectPediatricLauncher.tsx
 * Standalone Direct Mount for Pediatric Dentistry Studio SSOT (Mandates 8b 60-100 lines, 8e, 8aq)
 * Listens for #pediatric, #children, ?pediatric=1 and dente:open-pediatric events.
 */

import React, { useEffect, useState, useCallback } from "react";
import { PediatricMixedDentitionModal } from "../odontogram/PediatricMixedDentitionModal";
import { PediatricBraveryDiplomaModal } from "./PediatricBraveryDiplomaModal";

interface DiplomaLauncherDetails {
	readonly patientName?: string | undefined;
	readonly patientId?: string | undefined;
	readonly patientAgeYears?: number | undefined;
	readonly doctorName?: string | undefined;
	readonly clinicName?: string | undefined;
}

interface PediatricLauncherDetails {
	readonly patientName?: string | undefined;
	readonly patientId?: string | undefined;
	readonly patientPhone?: string | undefined;
	readonly patientAgeYears?: number | undefined;
	readonly doctorName?: string | undefined;
	readonly clinicName?: string | undefined;
}

export const DirectPediatricLauncher: React.FC = () => {
	const [isOpen, setIsOpen] = useState<boolean>(() => {
		if (typeof window === "undefined") return false;
		const s = window.location.search || "";
		const h = window.location.hash || "";
		if (s.includes("diploma") || h.includes("diploma") || h.includes("bravery")) {
			return false;
		}
		return (
			s.includes("pediatric") ||
			h.includes("pediatric") ||
			h.includes("children") ||
			s.includes("children")
		);
	});

	const [isDiplomaOpen, setIsDiplomaOpen] = useState<boolean>(() => {
		if (typeof window === "undefined") return false;
		const s = window.location.search || "";
		const h = window.location.hash || "";
		return (
			s.includes("diploma") ||
			h.includes("diploma") ||
			h.includes("bravery")
		);
	});

	const [pediatricDetails, setPediatricDetails] = useState<PediatricLauncherDetails>(() => {
		if (typeof window === "undefined") return {};
		const p = new URLSearchParams(window.location.search);
		return {
			patientName: p.get("patientName") || p.get("name") || undefined,
			patientId: p.get("patientId") || p.get("id") || undefined,
			patientPhone: p.get("patientPhone") || p.get("phone") || undefined,
			patientAgeYears: p.get("age") ? Number(p.get("age")) : undefined,
			doctorName: p.get("doctorName") || p.get("doctor") || undefined,
			clinicName: p.get("clinicName") || undefined,
		};
	});

	const [diplomaDetails, setDiplomaDetails] = useState<DiplomaLauncherDetails>(() => {
		if (typeof window === "undefined") return {};
		const p = new URLSearchParams(window.location.search);
		return {
			patientName: p.get("patientName") || p.get("name") || undefined,
			patientId: p.get("patientId") || p.get("id") || undefined,
			patientAgeYears: p.get("age") ? Number(p.get("age")) : undefined,
			doctorName: p.get("doctorName") || p.get("doctor") || undefined,
			clinicName: p.get("clinicName") || undefined,
		};
	});

	useEffect(() => {
		const handleOpen = (e?: Event) => {
			const detail = (e as CustomEvent<PediatricLauncherDetails> | undefined)?.detail;
			if (detail && typeof detail === "object") {
				setPediatricDetails((prev) => ({
					patientName: detail.patientName ?? prev.patientName,
					patientId: detail.patientId ?? prev.patientId,
					patientPhone: detail.patientPhone ?? prev.patientPhone,
					patientAgeYears: detail.patientAgeYears ?? prev.patientAgeYears,
					doctorName: detail.doctorName ?? prev.doctorName,
					clinicName: detail.clinicName ?? prev.clinicName,
				}));
			}
			setIsOpen(true);
		};
		const handleOpenDiploma = (e?: Event) => {
			const detail = (e as CustomEvent<DiplomaLauncherDetails> | undefined)?.detail;
			if (detail && typeof detail === "object") {
				setDiplomaDetails((prev) => ({
					patientName: detail.patientName ?? prev.patientName,
					patientId: detail.patientId ?? prev.patientId,
					patientAgeYears: detail.patientAgeYears ?? prev.patientAgeYears,
					doctorName: detail.doctorName ?? prev.doctorName,
					clinicName: detail.clinicName ?? prev.clinicName,
				}));
			}
			setIsDiplomaOpen(true);
		};
		window.addEventListener("dente-open-pediatric", handleOpen);
		window.addEventListener("dente:open-pediatric", handleOpen);
		window.addEventListener("dente-open-bravery-diploma", handleOpenDiploma);
		window.addEventListener("dente:open-bravery-diploma", handleOpenDiploma);

		const handleHash = () => {
			const h = window.location.hash || "";
			const s = window.location.search || "";
			const isDiploma = h.includes("diploma") || h.includes("bravery") || s.includes("diploma");
			if (isDiploma) {
				const p = new URLSearchParams(window.location.search);
				setDiplomaDetails((prev) => ({
					patientName: p.get("patientName") || p.get("name") || prev.patientName,
					patientId: p.get("patientId") || p.get("id") || prev.patientId,
					patientAgeYears: p.get("age") ? Number(p.get("age")) : prev.patientAgeYears,
					doctorName: p.get("doctorName") || p.get("doctor") || prev.doctorName,
					clinicName: p.get("clinicName") || prev.clinicName,
				}));
				setIsDiplomaOpen(true);
				setIsOpen(false);
			} else if (
				h.includes("pediatric") ||
				h.includes("children") ||
				s.includes("pediatric") ||
				s.includes("children")
			) {
				const p = new URLSearchParams(window.location.search);
				setPediatricDetails((prev) => ({
					patientName: p.get("patientName") || p.get("name") || prev.patientName,
					patientId: p.get("patientId") || p.get("id") || prev.patientId,
					patientPhone: p.get("patientPhone") || p.get("phone") || prev.patientPhone,
					patientAgeYears: p.get("age") ? Number(p.get("age")) : prev.patientAgeYears,
					doctorName: p.get("doctorName") || p.get("doctor") || prev.doctorName,
					clinicName: p.get("clinicName") || prev.clinicName,
				}));
				setIsOpen(true);
			}
		};

		window.addEventListener("hashchange", handleHash);
		return () => {
			window.removeEventListener("dente-open-pediatric", handleOpen);
			window.removeEventListener("dente:open-pediatric", handleOpen);
			window.removeEventListener("dente-open-bravery-diploma", handleOpenDiploma);
			window.removeEventListener("dente:open-bravery-diploma", handleOpenDiploma);
			window.removeEventListener("hashchange", handleHash);
		};
	}, []);

	const handleClose = useCallback(() => {
		setIsOpen(false);
		if (typeof window !== "undefined") {
			const url = new URL(window.location.href);
			url.searchParams.delete("pediatric");
			url.searchParams.delete("children");
			const cleanHash = window.location.hash.replace(/#(pediatric-studio|pediatric|children)/g, "");
			window.history.replaceState({}, "", url.pathname + (url.search ? url.search : "") + cleanHash);
		}
	}, []);

	const handleCloseDiploma = useCallback(() => {
		setIsDiplomaOpen(false);
		if (typeof window !== "undefined") {
			const url = new URL(window.location.href);
			url.searchParams.delete("diploma");
			url.searchParams.delete("bravery");
			const cleanHash = window.location.hash.replace(/#(pediatric-diploma|bravery-diploma|diploma)/g, "");
			window.history.replaceState({}, "", url.pathname + (url.search ? url.search : "") + cleanHash);
		}
	}, []);

	return (
		<>
			<PediatricMixedDentitionModal
				key={pediatricDetails.patientId || pediatricDetails.patientName || "pediatric-dentition-modal"}
				isOpen={isOpen}
				onClose={handleClose}
				initialAge={pediatricDetails.patientAgeYears ?? 6.5}
				patientId={pediatricDetails.patientId}
				patientName={pediatricDetails.patientName}
				patientPhone={pediatricDetails.patientPhone}
				doctorName={pediatricDetails.doctorName}
				clinicName={pediatricDetails.clinicName}
			/>
			<PediatricBraveryDiplomaModal
				key={diplomaDetails.patientId || diplomaDetails.patientName || "pediatric-direct-diploma"}
				isOpen={isDiplomaOpen}
				onClose={handleCloseDiploma}
				patientId={diplomaDetails.patientId || undefined}
				patientName={diplomaDetails.patientName || "Юный пациент"}
				patientAgeYears={diplomaDetails.patientAgeYears ?? 6}
				doctorName={diplomaDetails.doctorName || "Детский врач-стоматолог"}
				clinicName={diplomaDetails.clinicName || "Детское отделение DENTE"}
			/>
		</>
	);
};

DirectPediatricLauncher.displayName = "DirectPediatricLauncher";
export default DirectPediatricLauncher;
