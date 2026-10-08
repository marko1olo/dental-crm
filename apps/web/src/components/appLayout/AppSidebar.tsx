import React from "react";
import { preloadWorkspaceView } from "../../workspacePreload";
import { getFilteredAppViews, WorkspaceSidebar } from "../../workspaceShell";
import { MobileTabBar } from "../layout/MobileTabBar";
import type { AppSidebarProps } from "./types";

export function AppSidebar(props: AppSidebarProps) {
	const {
		currentView,
		selectedWorkspaceRole,
		sidebarCollapsed,
		toggleSidebarCollapsed,
		handleLockSession,
	} = props;

	return (
		<>
			<a className="skip-link" href="#workspace-content">
				Перейти к рабочей области
			</a>
			<WorkspaceSidebar
				currentView={currentView}
				onViewIntent={preloadWorkspaceView}
				role={selectedWorkspaceRole}
				collapsed={sidebarCollapsed}
				onToggleCollapsed={toggleSidebarCollapsed}
				onLockSession={handleLockSession}
			/>
		</>
	);
}

export function AppMobileTabBar(props: {
	currentView: string;
	selectedWorkspaceRole: any;
	setCurrentView: (view: string) => void;
}) {
	const { currentView, selectedWorkspaceRole, setCurrentView } = props;

	return (
		<MobileTabBar
			currentView={currentView}
			onSelectView={(view) => {
				setCurrentView(view);
				if (typeof window !== "undefined") {
					window.location.hash = view;
				}
			}}
			onViewIntent={preloadWorkspaceView}
			allowedViews={getFilteredAppViews(selectedWorkspaceRole)}
		/>
	);
}
