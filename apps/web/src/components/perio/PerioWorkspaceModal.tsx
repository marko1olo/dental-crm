/**
 * PerioWorkspaceModal.tsx — Канонический модальный фасад пародонтологии DENTE CRM.
 * Делегирует в каноническую студию PerioStudioModal (Мандаты 8e, 8am: < 50 строк).
 */

import React from "react";
import { PerioStudioModal, type PerioStudioModalProps } from "./PerioStudioModal";

export type PerioWorkspaceModalProps = PerioStudioModalProps;

export const PerioWorkspaceModal: React.FC<PerioWorkspaceModalProps> = React.memo((props) => {
	return <PerioStudioModal {...props} />;
});

PerioWorkspaceModal.displayName = "PerioWorkspaceModal";
export default PerioWorkspaceModal;
