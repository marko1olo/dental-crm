/**
 * @dental/web/components/orthodontics/DirectOrthodonticsLauncher.tsx
 * DENTE Dental CRM — Автономный лаунчер ортодонтической студии (Мандаты 8b 70–90 строк, 8aq).
 * Deep Link Mount: #ortho, #orthodontics, #ortho-studio, ?ortho=1, ?orthodontics=1.
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { OrthodonticsStudioModal } from "./OrthodonticsStudioModal";
import { usePatientStore } from "../../store/patientStore";
import { useAppStore } from "../../store/appStore";

let isGlobalOrthoModalMounted = false;

function checkIsOrthoActive(): boolean {
	if (typeof window === "undefined") return false;
	const h = window.location.hash.toLowerCase();
	const s = window.location.search.toLowerCase();
	const p = new URLSearchParams(s);
	if (h.includes("orthoped") || p.get("orthopedics") === "1") return false;
	return h === "#ortho" || h.includes("orthodont") || h.includes("ortho-") || p.get("ortho") === "1" || p.get("orthodontics") === "1";
}

export const DirectOrthodonticsLauncher: React.FC = () => {
	const [isActive, setIsActive] = useState<boolean>(checkIsOrthoActive);
	const [isOpen, setIsOpen] = useState<boolean>(true);
	const instanceClaimedRef = useRef(false);

	useEffect(() => {
		const handleLocationChange = () => {
			const active = checkIsOrthoActive();
			setIsActive(active);
			if (active) setIsOpen(true);
		};
		const handleOpenEvent = () => { setIsActive(true); setIsOpen(true); };

		window.addEventListener("hashchange", handleLocationChange);
		window.addEventListener("popstate", handleLocationChange);
		window.addEventListener("dente:open-orthodontics", handleOpenEvent);
		window.addEventListener("dente:open-ortho-studio", handleOpenEvent);

		return () => {
			window.removeEventListener("hashchange", handleLocationChange);
			window.removeEventListener("popstate", handleLocationChange);
			window.removeEventListener("dente:open-orthodontics", handleOpenEvent);
			window.removeEventListener("dente:open-ortho-studio", handleOpenEvent);
			if (instanceClaimedRef.current) {
				isGlobalOrthoModalMounted = false;
				instanceClaimedRef.current = false;
			}
		};
	}, []);

	const handleClose = useCallback(() => {
		setIsOpen(false);
		setIsActive(false);
		if (instanceClaimedRef.current) {
			isGlobalOrthoModalMounted = false;
			instanceClaimedRef.current = false;
		}
		if (typeof window !== "undefined") {
			const cleanHash = window.location.hash.replace(/#(orthodontics|ortho-protocol|ortho-studio|ortho)/gi, "");
			const url = new URL(window.location.href);
			url.searchParams.delete("ortho");
			url.searchParams.delete("orthodontics");
			window.history.replaceState({}, "", url.pathname + (url.search ? url.search : "") + cleanHash);
		}
	}, []);

	if (!isActive || !isOpen) return null;
	if (isGlobalOrthoModalMounted && !instanceClaimedRef.current) return null;

	isGlobalOrthoModalMounted = true;
	instanceClaimedRef.current = true;

	const storePatientId = usePatientStore((s) => s.selectedPatientId);
	const storePatientCore = usePatientStore((s) => s.patientCoreDraft);
	const dashboard = useAppStore((s) => s.dashboard);
	const storeActiveDoctorName = useAppStore((s) => s.activeDoctorName);

	const queryPatientId = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("patientId") : null;
	const activePatientId = queryPatientId || storePatientId || dashboard?.activeVisit?.patientId || "pat-ortho-studio";

	const resolvedPatientName = useMemo(() => {
		if (storePatientCore?.fullName?.trim()) return storePatientCore.fullName.trim();
		return "Пациент ортодонтического приёма";
	}, [storePatientCore?.fullName]);

	const resolvedDoctorName = useMemo(() => {
		if (storeActiveDoctorName?.trim()) return storeActiveDoctorName.trim();
		const staff = dashboard?.clinicSettings?.staff ?? [];
		const found = staff.find((d) => d.role === "doctor" || d.specialties?.includes("orthodontics"));
		if (found?.fullName?.trim()) return found.fullName.trim();
		return "Врач-ортодонт";
	}, [storeActiveDoctorName, dashboard?.clinicSettings?.staff]);

	return (
		<OrthodonticsStudioModal
			isOpen={isOpen}
			onClose={handleClose}
			patientId={activePatientId}
			patientName={resolvedPatientName}
			doctorName={resolvedDoctorName}
		/>
	);
};

DirectOrthodonticsLauncher.displayName = "DirectOrthodonticsLauncher";
export default DirectOrthodonticsLauncher;
