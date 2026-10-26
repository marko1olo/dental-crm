/**
 * ImagingHeader.tsx — Верхняя панель управления рентгенодиагностикой и КТ
 * Mandate 8b: строго <= 120 строк.
 */

import React, { useEffect, useRef, useState } from "react";
import { ImagingHeaderPatientBadge } from "./header/ImagingHeaderPatientBadge";
import { ImagingHeaderFilterTabs } from "./header/ImagingHeaderFilterTabs";
import { ImagingHeaderActions } from "./header/ImagingHeaderActions";

export interface ImagingHeaderProps {
	activePatient?: any;
	activeAppointment?: any;
	activeImagingStudies?: any[];
	selectedImagingViewerPlan?: any;
	isBrowserImagingFolderPicking?: boolean;
	isCapturingCameraPhoto?: boolean;
	onPickFolder: () => void;
	onPickFiles: () => void;
	onCaptureCamera: () => void;
	onOpenCbctStudio: () => void;
	onOpenPanoramic: () => void;
	onOpenRadiologyModule: () => void;
	onOpenRvgCapture?: () => void;
	onOpenCtSelector?: () => void;
	onOpenPopoutStudio?: () => void;
	onOpenExport?: () => void;
	onOpenComparison?: () => void;
	imagingKindFilter?: string;
	setImagingKindFilter?: (filter: string) => void;
	imagingKindOptions?: string[];
	imagingKindLabels?: Record<string, string>;
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
