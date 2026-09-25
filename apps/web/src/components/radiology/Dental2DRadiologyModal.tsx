/**
 * DENTE CRM — 2D Radiology Viewer Modal Wrapper
 * Clean portal-based modal wrapper with Esc key listener and smooth display.
 */

import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import {
	Dental2DRadiologyViewer,
	type Dental2DRadiologyViewerProps,
} from "./Dental2DRadiologyViewer";

export interface Dental2DRadiologyModalProps
	extends Omit<Dental2DRadiologyViewerProps, "onClose"> {
	readonly isOpen: boolean;
	readonly onClose: () => void;
}

export const Dental2DRadiologyModal: React.FC<Dental2DRadiologyModalProps> = ({
	isOpen,
	onClose,
	...viewerProps
}) => {
	// Esc key listener to close modal
	useEffect(() => {
		if (!isOpen) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				onClose();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose]);

	if (!isOpen) return null;

	const modalContent = (
		<div
			className="dental-2d-radiology-modal-overlay"
			style={{
				position: "fixed",
				inset: 0,
				zIndex: 9999,
				backgroundColor: "rgba(0, 0, 0, 0.88)",
				backdropFilter: "blur(6px)",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				padding: "10px",
			}}
		>
			<div
				className="dental-2d-radiology-modal-container"
				style={{
					width: "100%",
					maxWidth: "1400px",
					height: "94vh",
					maxHeight: "960px",
					backgroundColor: "var(--paper-strong, #0f172a)",
					border: "1px solid var(--line, #334155)",
					borderRadius: "12px",
					overflow: "hidden",
					boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.8)",
					display: "flex",
					flexDirection: "column",
				}}
			>
				<Dental2DRadiologyViewer {...viewerProps} onClose={onClose} />
			</div>
		</div>
	);

	if (typeof document !== "undefined") {
		return createPortal(modalContent, document.body);
	}
	return modalContent;
};
