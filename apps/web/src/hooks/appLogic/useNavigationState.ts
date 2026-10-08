import { useCallback, useMemo, useRef, useState } from "react";
import type { Dashboard, StaffRole } from "@dental/shared";
import { useAppStore } from "../../store/appStore";
import { useNavigationRouter } from "../domains/useNavigationRouter";
import type { AppView } from "../../utils/routeUtils";
import type { NavigationStateSlice } from "./types";

interface UseNavigationStateProps {
	dashboard?: Dashboard | null;
}

export function useNavigationState(props?: UseNavigationStateProps): NavigationStateSlice {
	const dashboard = props?.dashboard ?? null;
	const {
		currentView: requestedWorkspaceView,
		setCurrentView,
		settingsTab,
		setSettingsTab,
		selectedWorkspaceRole,
		setSelectedWorkspaceRole,
	} = useAppStore();

	const currentView = requestedWorkspaceView as AppView;

	const navigationRouter = useNavigationRouter({
		selectedWorkspaceRole,
		requestedWorkspaceView,
		setCurrentView,
		settingsTab,
		setSettingsTab,
	});
	const activeSettingsTabButtonRef = useRef<HTMLButtonElement | null>(null);

	const activeRolePolicy = useMemo(() => {
		return (
			dashboard?.clinicSettings?.roleAccessPolicies?.find(
				(policy) => policy.role === selectedWorkspaceRole,
			) ??
			dashboard?.clinicSettings?.roleAccessPolicies?.find(
				(policy) => policy.role === "doctor",
			) ??
			dashboard?.clinicSettings?.roleAccessPolicies?.[0]
		);
	}, [dashboard?.clinicSettings?.roleAccessPolicies, selectedWorkspaceRole]);

	const activeQueueRole: StaffRole =
		selectedWorkspaceRole === "owner" ? "manager" : selectedWorkspaceRole;

	const activeRoleQueue = useMemo(() => {
		return (
			dashboard?.shiftIntelligence?.roleQueues?.find(
				(queue) => queue.role === activeQueueRole,
			) ?? dashboard?.shiftIntelligence?.roleQueues?.[0]
		);
	}, [dashboard?.shiftIntelligence?.roleQueues, activeQueueRole]);

	const activeRoleWritableSections = useMemo(
		() => activeRolePolicy?.canWrite ?? [],
		[activeRolePolicy],
	);

	const activeRoleRestrictedSections = useMemo(
		() => activeRolePolicy?.restricted ?? [],
		[activeRolePolicy],
	);

	/**
	 * Роли, которые в клинике никто не занимает. Владелец соло-практики сам себе
	 * и врач, и администратор: если такие дела спрятать «не по его роли», он их
	 * не увидит вообще — сделать их некому. Поэтому владелец получает дела всех
	 * незанятых ролей вдобавок к своим.
	 */
	const uncoveredStaffRoles = useMemo(() => {
		const covered = new Set(
			(dashboard?.clinicSettings?.staff ?? [])
				.filter((member) => member.active && member.role !== "owner")
				.map((member) => member.role as string),
		);
		return (
			["doctor", "administrator", "assistant", "manager"] as const
		).filter((role) => !covered.has(role)) as string[];
	}, [dashboard?.clinicSettings?.staff]);

	const roleRecommendedActions = useMemo(() => {
		return (dashboard?.recommendedActions ?? []).filter(
			(action) =>
				action.role === selectedWorkspaceRole ||
				(selectedWorkspaceRole === "owner" &&
					(action.role === "manager" ||
						uncoveredStaffRoles.includes(action.role))),
		);
	}, [dashboard?.recommendedActions, selectedWorkspaceRole, uncoveredStaffRoles]);

	const visibleRecommendedActions = useMemo(() => {
		return (
			roleRecommendedActions.length
				? roleRecommendedActions
				: (dashboard?.recommendedActions ?? [])
		).slice(0, 4);
	}, [roleRecommendedActions, dashboard?.recommendedActions]);

	const roleScheduleSuggestions = useMemo(() => {
		return (dashboard?.scheduleSuggestions ?? []).filter(
			(suggestion) =>
				suggestion.ownerRole === selectedWorkspaceRole ||
				(selectedWorkspaceRole === "owner" && suggestion.ownerRole === "manager"),
		);
	}, [dashboard?.scheduleSuggestions, selectedWorkspaceRole]);

	const visibleScheduleSuggestions = useMemo(() => {
		return (
			roleScheduleSuggestions.length
				? roleScheduleSuggestions
				: (dashboard?.scheduleSuggestions ?? [])
		).slice(0, 3);
	}, [roleScheduleSuggestions, dashboard?.scheduleSuggestions]);

	const showAdministrationTopActions =
		currentView === "settings" ||
		selectedWorkspaceRole === "administrator" ||
		selectedWorkspaceRole === "manager" ||
		selectedWorkspaceRole === "owner";

	const showDoctorVisitShortcut =
		selectedWorkspaceRole === "doctor" && currentView !== "visit";

	const [isDoctorShiftCockpitOpen, setIsDoctorShiftCockpitOpen] = useState(false);

	const openDoctorShiftCockpit = useCallback(() => {
		setIsDoctorShiftCockpitOpen(true);
	}, []);

	const closeDoctorShiftCockpit = useCallback(() => {
		setIsDoctorShiftCockpitOpen(false);
	}, []);

	const toggleDoctorShiftCockpit = useCallback(() => {
		setIsDoctorShiftCockpitOpen((prev) => !prev);
	}, []);

	return {
		currentView,
		setCurrentView,
		settingsTab,
		setSettingsTab,
		selectedWorkspaceRole,
		setSelectedWorkspaceRole,
		activeSettingsTabButtonRef,
		showAdministrationTopActions,
		showDoctorVisitShortcut,
		isDoctorShiftCockpitOpen,
		openDoctorShiftCockpit,
		closeDoctorShiftCockpit,
		toggleDoctorShiftCockpit,
		activeRolePolicy,
		activeRoleQueue,
		activeRoleWritableSections,
		activeRoleRestrictedSections,
		uncoveredStaffRoles,
		roleRecommendedActions,
		visibleRecommendedActions,
		roleScheduleSuggestions,
		visibleScheduleSuggestions,
		navigationRouter,
	};
}
