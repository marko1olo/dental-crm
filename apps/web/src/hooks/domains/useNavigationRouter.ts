import type { StaffRole } from "@dental/shared";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	settingsTabFromHash,
	viewFromHash,
} from "../../AppHelpers";
import { showToast } from "../../components/GlobalToast";
import { actionFailureToast } from "../../lib/panelStateText";
import {
	type AppView,
	getFallbackAppView,
	getFilteredAppViews,
} from "../../utils/routeUtils";

export interface NavigationRouterOptions {
	selectedWorkspaceRole: StaffRole;
	requestedWorkspaceView: AppView;
	setCurrentView: (view: AppView | ((prev: AppView) => AppView)) => void;
	settingsTab: string;
	setSettingsTab: (tab: string | ((prev: string) => string)) => void;
	setError: (error: string | null) => void;
	auth: {
		denteClinicalMutationHeaders: (
			extra?: Record<string, string>,
			adminSecretOverride?: string,
		) => Record<string, string>;
	};
	setSelectedPatientId: (id: string | null) => void;
	loadDashboard: () => Promise<void>;
	scrollToVisitArea?: (selector: string) => void;
}

export function useNavigationRouter({
	selectedWorkspaceRole,
	requestedWorkspaceView,
	setCurrentView,
	settingsTab,
	setSettingsTab,
	setError,
	auth,
	setSelectedPatientId,
	loadDashboard,
	scrollToVisitArea,
}: NavigationRouterOptions) {
	const activeSettingsTabButtonRef = useRef<HTMLButtonElement | null>(null);
	const [isQuickConsultLoading, setIsQuickConsultLoading] = useState(false);

	const allowedWorkspaceViews = useMemo(
		() => getFilteredAppViews(selectedWorkspaceRole),
		[selectedWorkspaceRole],
	);

	const currentView: AppView = allowedWorkspaceViews.includes(
		requestedWorkspaceView,
	)
		? requestedWorkspaceView
		: getFallbackAppView(selectedWorkspaceRole);

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

	const handleQuickConsult = useCallback(async () => {
		if (isQuickConsultLoading) return;
		setIsQuickConsultLoading(true);
		try {
			const response = await fetch("/api/visits/quick", {
				method: "POST",
				headers: auth.denteClinicalMutationHeaders({
					"Content-Type": "application/json",
				}),
			});
			if (!response.ok) {
				const msg = await response.text().catch((err) => {
					showToast(
						actionFailureToast(
							"Не удалось прочитать ошибку",
							(err as { status?: number })?.status ?? null,
						),
						"error",
					);
					return "Ошибка";
				});
				setError(`Быстрый приём: ${msg}`);
				return;
			}
			const { patientId } = (await response.json()) as {
				patientId: string;
				appointmentId: string;
			};
			setSelectedPatientId(patientId);
			await loadDashboard();
			window.location.hash = "visit";
		} catch (err: unknown) {
			const message =
				err instanceof Error ? err.message : "Ошибка сети";
			setError(`Быстрый приём: ${message}`);
		} finally {
			setIsQuickConsultLoading(false);
		}
	}, [
		auth,
		isQuickConsultLoading,
		loadDashboard,
		setError,
		setSelectedPatientId,
	]);

	const goToVisitDictation = useCallback(() => {
		window.location.hash = "visit";
		const openDictation = () => {
			if (scrollToVisitArea) {
				scrollToVisitArea(".dictation-box");
			} else {
				const el = document.querySelector(".dictation-box");
				el?.scrollIntoView({ behavior: "smooth", block: "start" });
			}
			document
				.querySelector<HTMLTextAreaElement>(".dictation-box textarea")
				?.focus({ preventScroll: true });
		};
		window.setTimeout(openDictation, 0);
		window.setTimeout(openDictation, 120);
	}, [scrollToVisitArea]);

	const navigateTo = useCallback(
		(view: AppView, tab?: string) => {
			setCurrentView(view);
			if (tab && view === "settings") {
				setSettingsTab(tab);
				window.location.hash = `settings/${tab}`;
			} else {
				window.location.hash = view;
			}
		},
		[setCurrentView, setSettingsTab],
	);

	return {
		allowedWorkspaceViews,
		currentView,
		settingsTab,
		setSettingsTab,
		activeSettingsTabButtonRef,
		isQuickConsultLoading,
		handleQuickConsult,
		goToVisitDictation,
		navigateTo,
	};
}
