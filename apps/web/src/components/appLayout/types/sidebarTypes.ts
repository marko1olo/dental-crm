import type { StaffRole } from "@dental/shared";

export interface AppSidebarProps {
	currentView: string;
	selectedWorkspaceRole: StaffRole;
	sidebarCollapsed: boolean;
	toggleSidebarCollapsed: () => void;
	handleLockSession: () => void;
	setCurrentView: (view: string) => void;
}

export interface AppToastPortalProps {
	setCurrentView: (view: string) => void;
	setQuery: (q: string) => void;
	setScheduleDateFilter: (date: string) => void;
}
