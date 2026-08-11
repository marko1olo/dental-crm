import { useMemo } from "react";
import type { Dashboard, StaffRole } from "@dental/shared";
import type { AppView } from "../../utils/routeUtils";

export interface RoleAccessLogicProps {
  dashboard: Dashboard | null;
  selectedWorkspaceRole: StaffRole;
  currentView: AppView;
}

export function useRoleAccessLogic({
  dashboard,
  selectedWorkspaceRole,
  currentView,
}: RoleAccessLogicProps) {
  const activeRolePolicy =
    dashboard?.clinicSettings?.roleAccessPolicies?.find(
      (policy) => policy.role === selectedWorkspaceRole,
    ) ??
    dashboard?.clinicSettings?.roleAccessPolicies?.find(
      (policy) => policy.role === "doctor",
    ) ??
    dashboard?.clinicSettings?.roleAccessPolicies?.[0];

  const activeQueueRole: StaffRole =
    selectedWorkspaceRole === "owner" ? "manager" : selectedWorkspaceRole;

  const activeRoleQueue =
    dashboard?.shiftIntelligence?.roleQueues?.find(
      (queue) => queue.role === activeQueueRole,
    ) ?? dashboard?.shiftIntelligence?.roleQueues?.[0];

  const activeRoleWritableSections = activeRolePolicy?.canWrite ?? [];
  const activeRoleRestrictedSections = activeRolePolicy?.restricted ?? [];

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

  const roleRecommendedActions = (dashboard?.recommendedActions ?? []).filter(
    (action) =>
      action.role === selectedWorkspaceRole ||
      (selectedWorkspaceRole === "owner" &&
        (action.role === "manager" ||
          uncoveredStaffRoles.includes(action.role))),
  );

  const visibleRecommendedActions = (
    roleRecommendedActions.length
      ? roleRecommendedActions
      : (dashboard?.recommendedActions ?? [])
  ).slice(0, 4);

  const roleScheduleSuggestions = (dashboard?.scheduleSuggestions ?? []).filter(
    (suggestion) =>
      suggestion.ownerRole === selectedWorkspaceRole ||
      (selectedWorkspaceRole === "owner" && suggestion.ownerRole === "manager"),
  );

  const visibleScheduleSuggestions = (
    roleScheduleSuggestions.length
      ? roleScheduleSuggestions
      : (dashboard?.scheduleSuggestions ?? [])
  ).slice(0, 3);

  const showAdministrationTopActions =
    currentView === "settings" ||
    selectedWorkspaceRole === "administrator" ||
    selectedWorkspaceRole === "manager" ||
    selectedWorkspaceRole === "owner";

  const showDoctorVisitShortcut =
    selectedWorkspaceRole === "doctor" && currentView !== "visit";

  return {
    activeRolePolicy,
    activeQueueRole,
    activeRoleQueue,
    activeRoleWritableSections,
    activeRoleRestrictedSections,
    uncoveredStaffRoles,
    roleRecommendedActions,
    visibleRecommendedActions,
    roleScheduleSuggestions,
    visibleScheduleSuggestions,
    showAdministrationTopActions,
    showDoctorVisitShortcut,
  };
}
