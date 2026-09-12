/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TOUCH-FIRST EGISZ REMD CDA R2 OUTPATIENT CARD 043/U XML MODAL HUD
 * Canonical SSOT Facade over EgiszRemdHubModal (Mandate 8s)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React from "react";
import { EgiszRemdHubModal } from "../EgiszRemdHubModal";
import type { Egisz043uPayload } from "../egiszRemdEngine";
import "../egiszRemd.css";

export interface EgiszRemdXmlModalProps {
	isOpen?: boolean;
	onClose: () => void;
	initialPayload?: Partial<Egisz043uPayload>;
}

export const EgiszRemdXmlModal: React.FC<EgiszRemdXmlModalProps> = ({
	isOpen = true,
	onClose,
	initialPayload,
}) => {
	return (
		<EgiszRemdHubModal
			isOpen={isOpen}
			onClose={onClose}
			initialTab="xml_preview"
			initialPayload={initialPayload as any}
		/>
	);
};
