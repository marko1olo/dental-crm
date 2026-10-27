/**
 * @file ClinicControlPill.tsx
 * @description Orchestrator for clinic status capsule & popover (Mandate 8b <= 120 lines).
 */

import React, { useEffect, useRef, useState } from "react";
import { ClinicControlPillView } from "./ClinicControlPillView.js";
import { ClinicControlCenterPopover } from "./ClinicControlCenterPopover.js";
import { useClinicSystemStatus } from "./useClinicSystemStatus.js";
import type { ClinicControlPillProps } from "./headerStatusTypes.js";
import "../../../styles/modules/header.css";
import "../../Header.css";

export function ClinicControlPill({
	className = "",
	onLockSession,
	onOpenShiftModal,
}: ClinicControlPillProps) {
	const [isOpen, setIsOpen] = useState(false);
	const wrapperRef = useRef<HTMLDivElement | null>(null);
	const status = useClinicSystemStatus();

	useEffect(() => {
		if (!isOpen) return;
		const handleClickOutside = (e: MouseEvent) => {
			if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
				setIsOpen(false);
			}
		};
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") setIsOpen(false);
		};
		document.addEventListener("mousedown", handleClickOutside);
		document.addEventListener("keydown", handleKeyDown);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [isOpen]);

	return (
		<div
			ref={wrapperRef}
			className={`dnt-clinic-control-wrapper ${className}`}
			data-testid="clinic-control-center-wrapper"
		>
			<ClinicControlPillView
				isOpen={isOpen}
				status={status}
				onToggleOpen={() => setIsOpen((prev) => !prev)}
			/>
			<ClinicControlCenterPopover
				isOpen={isOpen}
				status={status}
				onClose={() => setIsOpen(false)}
				onLockSession={onLockSession}
				onOpenShiftModal={onOpenShiftModal}
			/>
		</div>
	);
}

export function HeaderSystemStatus(props: ClinicControlPillProps) {
	return <ClinicControlPill {...props} />;
}
