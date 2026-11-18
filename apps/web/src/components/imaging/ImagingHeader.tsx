/**
 * ImagingHeader.tsx — Верхняя панель управления рентгенодиагностикой и КТ
 * Mandate 8b: строго <= 120 строк.
 */

import React, { useEffect, useRef, useState } from "react";
import { ImagingHeaderPatientBadge } from "./header/ImagingHeaderPatientBadge";
import { ImagingHeaderFilterTabs } from "./header/ImagingHeaderFilterTabs";
import { ImagingHeaderActions } from "./header/ImagingHeaderActions";

import type { ImagingStudy } from "./types";

export interface ImagingHeaderProps {
	activePatient?: { id?: string | number | undefined; fullName?: string | undefined; name?: string | undefined; cardNumber?: string | undefined; medicalCardNumber?: string | undefined; [key: string]: unknown } | null | undefined;
	activeAppointment?: { id?: string | number | undefined; doctorName?: string | null | undefined; patientName?: string | undefined; date?: string | undefined; [key: string]: unknown } | null | undefined;
	activeImagingStudies?: ImagingStudy[] | undefined;
	selectedImagingViewerPlan?: unknown;
	isBrowserImagingFolderPicking?: boolean | undefined;
	isCapturingCameraPhoto?: boolean | undefined;
	onPickFolder: () => void;
	onPickFiles: () => void;
	onCaptureCamera: () => void;
	onOpenCbctStudio: () => void;
	onOpenPanoramic: () => void;
	onOpenRadiologyModule: () => void;
	onOpenRvgCapture?: (() => void) | undefined;
	onOpenCtSelector?: (() => void) | undefined;
	onOpenPopoutStudio?: (() => void) | undefined;
	onOpenExport?: (() => void) | undefined;
	onOpenComparison?: (() => void) | undefined;
	imagingKindFilter?: string | undefined;
	setImagingKindFilter?: ((filter: string) => void) | undefined;
	imagingKindOptions?: Array<{ value: string; label: string; [key: string]: unknown }> | string[] | undefined;
	imagingKindLabels?: Record<string, string> | undefined;
}

export function ImagingHeader(props: ImagingHeaderProps) {
	const { activePatient, activeImagingStudies, imagingKindFilter, setImagingKindFilter } = props;
	const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
	const moreMenuRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		if (!isMoreMenuOpen) return;
		const handleOutsideClick = (e: MouseEvent) => {
			if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
				setIsMoreMenuOpen(false);
			}
		};
		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === "Escape") setIsMoreMenuOpen(false);
		};
		window.addEventListener("mousedown", handleOutsideClick);
		window.addEventListener("keydown", handleEscape);
		return () => {
			window.removeEventListener("mousedown", handleOutsideClick);
			window.removeEventListener("keydown", handleEscape);
		};
	}, [isMoreMenuOpen]);

	const studiesCount = activeImagingStudies?.length ?? 0;
	const patientName = activePatient?.fullName ?? activePatient?.name ?? null;

	return (
		<header
			className="imaging-unified-toolbar flex items-center justify-between gap-2 h-12 min-h-[48px] max-h-[52px] px-3 py-1.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] shadow-xs select-none w-full max-w-[100vw] overflow-x-clip"
			data-testid="imaging-unified-toolbar"
			aria-label="Панель управления снимками"
		>
			<ImagingHeaderPatientBadge patientName={patientName} studiesCount={studiesCount} />
			{setImagingKindFilter && (
				<ImagingHeaderFilterTabs imagingKindFilter={imagingKindFilter} setImagingKindFilter={setImagingKindFilter} />
			)}
			<ImagingHeaderActions {...props} isMoreMenuOpen={isMoreMenuOpen} setIsMoreMenuOpen={setIsMoreMenuOpen} moreMenuRef={moreMenuRef} />
		</header>
	);
}
