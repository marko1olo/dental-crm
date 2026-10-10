import React from "react";
import { preloadWorkspaceView } from "../../workspacePreload";
import { getFilteredAppViews, WorkspaceSidebar, type AppView } from "../../workspaceShell";
import { MobileTabBar, type MobileTabBarProps } from "../layout/MobileTabBar";
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
				currentView={currentView as AppView}
				onViewIntent={preloadWorkspaceView}
				role={selectedWorkspaceRole}
				collapsed={sidebarCollapsed}
				onToggleCollapsed={toggleSidebarCollapsed}
				onLockSession={handleLockSession}
			/>
		</>
	);
}

export function AppMobileTabBar(props: MobileTabBarProps) {
	return <MobileTabBar {...props} />;
}

