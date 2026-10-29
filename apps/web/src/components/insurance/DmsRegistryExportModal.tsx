/**
 * DmsRegistryExportModal.tsx — Facade for Registry Export in Insurance Workspace.
 * Mandate 8b: <= 50 lines.
 */

import React from "react";
import { InsuranceWorkspaceModal } from "./InsuranceWorkspaceModal.js";

export interface DmsRegistryExportModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientId?: string;
	readonly patientName?: string;
	readonly records?: readonly any[];
}

export function DmsRegistryExportModal(props: DmsRegistryExportModalProps) {
	return (
		<InsuranceWorkspaceModal
			isOpen={props.isOpen}
			onClose={props.onClose}
			patient={props.patientName ? { id: props.patientId || "pat-1", fullName: props.patientName } : undefined}
			initialTab="registry"
		/>
	);
}

export default DmsRegistryExportModal;
