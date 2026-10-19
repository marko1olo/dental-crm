import type React from "react";
import { AppointmentFooterQuickActions } from "./AppointmentFooterQuickActions";
import { AppointmentHeaderQuickActions } from "./AppointmentHeaderQuickActions";
import type { AppointmentQuickActionsMenuProps } from "./appointmentCardTypes";

export interface QuickActionsProps extends AppointmentQuickActionsMenuProps {
	variant?: "header" | "footer";
}

export const AppointmentQuickActionsMenu: React.FC<QuickActionsProps> = (
	props,
) => {
	const { variant = "header" } = props;

	if (variant === "footer") {
		return <AppointmentFooterQuickActions {...props} />;
	}

	return <AppointmentHeaderQuickActions {...props} />;
};

export { AppointmentFooterQuickActions, AppointmentHeaderQuickActions };
