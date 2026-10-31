/**
 * InsuranceWorkspaceModal.tsx — Canonical facade re-exporting DmsStudioModal.
 * Mandates: 8b (Sweet spot <= 50 lines facade), 8e, 8am.
 */

import React from "react";
import { DmsStudioModal, type DmsStudioModalProps } from "./DmsStudioModal.js";

export type InsuranceWorkspaceModalProps = DmsStudioModalProps;

export const InsuranceWorkspaceModal: React.FC<InsuranceWorkspaceModalProps> = (props) => {
	return <DmsStudioModal {...props} />;
};

InsuranceWorkspaceModal.displayName = "InsuranceWorkspaceModal";
export default InsuranceWorkspaceModal;
