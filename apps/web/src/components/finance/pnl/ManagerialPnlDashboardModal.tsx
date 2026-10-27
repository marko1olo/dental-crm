import type React from "react";
import {
	ManagerialPnlModalAssembler,
	type ManagerialPnlDashboardModalProps,
} from "./dashboardModules";
import "./ManagerialPnlDashboardModal.css";

export type { ManagerialPnlDashboardModalProps };

export const ManagerialPnlDashboardModal: React.FC<ManagerialPnlDashboardModalProps> = (
	props,
) => <ManagerialPnlModalAssembler {...props} />;
