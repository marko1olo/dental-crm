/**
 * DirectPerioLauncher.tsx — Автономный лаунчер кабинета пародонтологии и экспресс-скрининга PSR
 * Смонтирован в AppShell.tsx и StandaloneLaunchers.tsx, слушает #perio, #psr, #periodontics, ?perio=1.
 * Норматив размера: 60–100 строк (Мандаты 8b, 8aq).
 */

import React, { useEffect, useState, useCallback } from "react";
import { usePatientStore } from "../../store/patientStore";
import { PerioStudioModal } from "./PerioStudioModal";

function checkIsPerioActive(): boolean {
	if (typeof window === "undefined") return false;
	const s = window.location.search || "";
	const h = window.location.hash || "";
	return (
		s.includes("perio") ||
		s.includes("psr") ||
		s.includes("periodontics") ||
		h.includes("perio") ||
		h.includes("psr") ||
		h.includes("periodontics")
	);
}

function readPatientParamFromUrl(paramName: "patientId" | "patientName"): string | undefined {
	if (typeof window === "undefined") return undefined;
	const value = new URLSearchParams(window.location.search || "").get(paramName)?.trim();
	return value || undefined;
}

export interface DirectPerioPatientInput {
	readonly propPatientId?: string | undefined;
	readonly propPatientName?: string | undefined;
	readonly eventPatientId?: string | undefined;
	readonly eventPatientName?: string | undefined;
	readonly storePatientId?: string | null | undefined;
	readonly storePatientName?: string | null | undefined;
	readonly urlPatientId?: string | undefined;
	readonly urlPatientName?: string | undefined;
}

export function resolveDirectPerioPatientContext(input: DirectPerioPatientInput): {
	patientId: string | undefined;
	patientName: string;
} {
	const patientId =
		input.propPatientId?.trim() ||
		input.eventPatientId?.trim() ||
		input.storePatientId?.trim() ||
		input.urlPatientId?.trim() ||
		undefined;

	const patientName =
		input.propPatientName?.trim() ||
		input.eventPatientName?.trim() ||
		input.storePatientName?.trim() ||
		input.urlPatientName?.trim() ||
		"Пациент приёма";

	return { patientId, patientName };
}

export interface DirectPerioLauncherProps {
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
}

export const DirectPerioLauncher: React.FC<DirectPerioLauncherProps> = ({
	patientId: propPatientId,
	patientName: propPatientName,
}) => {
	const activePatientId = usePatientStore((s) => s.selectedPatientId);
	const activePatientName = usePatientStore((s) => s.patientCoreDraft.fullName);

	const [isOpen, setIsOpen] = useState<boolean>(() => checkIsPerioActive());
	const [eventPatientId, setEventPatientId] = useState<string | undefined>(undefined);
	const [eventPatientName, setEventPatientName] = useState<string | undefined>(undefined);

	useEffect(() => {
		const handleOpen = (e?: Event) => {
			if (e && "detail" in e) {
				const customEvt = e as CustomEvent<{ patientId?: unknown; patientName?: unknown }>;
				const detail = customEvt.detail;
				setEventPatientId(detail?.patientId ? String(detail.patientId) : undefined);
				setEventPatientName(detail?.patientName ? String(detail.patientName) : undefined);
			}
			setIsOpen(true);
		};

		window.addEventListener("dente:open-perio", handleOpen);
		window.addEventListener("dente:open-psr", handleOpen);
		window.addEventListener("dente:open-perio-modal", handleOpen);
		window.addEventListener("dente-open-perio-modal", handleOpen);

		const handleState = () => {
			if (checkIsPerioActive()) {
				setIsOpen(true);
			}
		};
		window.addEventListener("hashchange", handleState);
		window.addEventListener("popstate", handleState);

		return () => {
			window.removeEventListener("dente:open-perio", handleOpen);
			window.removeEventListener("dente:open-psr", handleOpen);
			window.removeEventListener("dente:open-perio-modal", handleOpen);
			window.removeEventListener("dente-open-perio-modal", handleOpen);
			window.removeEventListener("hashchange", handleState);
			window.removeEventListener("popstate", handleState);
		};
	}, []);

	const handleClose = useCallback(() => {
		setIsOpen(false);
		setEventPatientId(undefined);
		setEventPatientName(undefined);
		if (typeof window !== "undefined" && checkIsPerioActive()) {
			history.replaceState(null, "", window.location.pathname);
		}
	}, []);

	if (!isOpen) return null;

	const { patientId: resolvedPatientId, patientName: resolvedPatientName } = resolveDirectPerioPatientContext({
		propPatientId,
		propPatientName,
		eventPatientId,
		eventPatientName,
		storePatientId: activePatientId,
		storePatientName: activePatientName,
		urlPatientId: readPatientParamFromUrl("patientId"),
		urlPatientName: readPatientParamFromUrl("patientName"),
	});

	return (
		<PerioStudioModal
			isOpen={isOpen}
			isModal={true}
			onClose={handleClose}
			patientId={resolvedPatientId}
			patientName={resolvedPatientName}
		/>
	);
};

export default DirectPerioLauncher;
