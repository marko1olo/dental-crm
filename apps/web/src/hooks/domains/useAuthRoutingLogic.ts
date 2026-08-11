import { useMemo, useEffect } from "react";
import type { StaffRole } from "@dental/shared";
import { type AppView, getFallbackAppView, getFilteredAppViews } from "../../utils/routeUtils";
import { viewFromHash, settingsTabFromHash } from "../../AppHelpers";
import { useAuthLogic } from "./useAuthLogic";

import type { useAppStore } from "../../store/appStore";

interface AuthRoutingLogicProps {
	selectedWorkspaceRole: StaffRole;
	requestedWorkspaceView: AppView;
	setCurrentView: (v: AppView) => void;
	setSettingsTab: (t: string) => void;
	setError: (e: Error | null) => void;
	loadDashboard: (silent?: boolean) => Promise<void>;
	telegramSettingsModule: any;
	authRef: React.MutableRefObject<any>;
}

export function useAuthRoutingLogic({
	selectedWorkspaceRole,
	requestedWorkspaceView,
	setCurrentView,
	setSettingsTab,
	setError,
	loadDashboard,
	telegramSettingsModule,
	authRef
}: AuthRoutingLogicProps) {

	const allowedWorkspaceViews = useMemo(
		() => getFilteredAppViews(selectedWorkspaceRole),
		[selectedWorkspaceRole],
	);
	const currentView: AppView = allowedWorkspaceViews.includes(
		requestedWorkspaceView,
	)
		? requestedWorkspaceView
		: getFallbackAppView(selectedWorkspaceRole);

	const auth = useAuthLogic({
		setError,
		loadDashboard,
		loadTelegramControlPlane: (options) =>
			telegramSettingsModule.loadTelegramControlPlane(options),
	});
	authRef.current = auth;

	useEffect(() => {
		const syncView = () => {
			const nextView = viewFromHash();
			setCurrentView(nextView);
			if (nextView === "settings") {
				setSettingsTab(settingsTabFromHash());
			}
		};
		syncView();
		window.addEventListener("hashchange", syncView);
		return () => window.removeEventListener("hashchange", syncView);
	}, [setSettingsTab, setCurrentView]);

	useEffect(() => {
		if (requestedWorkspaceView === currentView) return;
		setCurrentView(currentView);
		window.location.hash = currentView;
	}, [requestedWorkspaceView, currentView, setCurrentView]);

	return {
		allowedWorkspaceViews,
		currentView,
		auth
	};
}
