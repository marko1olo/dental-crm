/**
 * @file workspaceShell.tsx
 * @description Канонический тонкий фасад рабочей области CRM (Мандат 8b, <= 120 строк).
 * Декомпозирован в модули apps/web/src/workspaceShellModules/
 */

import type React from "react";
import type { StaffRole } from "@dental/shared";
import {
	WorkspaceContentArea,
	WorkspaceEmergencyBar,
	type WorkspaceShellProps,
	WorkspaceSidebar,
	WorkspaceTopbar,
} from "./workspaceShellModules";

export * from "./workspaceShellModules";

// Реэкспорты маршрутных утилит для сохранения 100% контракта обратной совместимости
export {
	type AppView,
	appViews,
	getFallbackAppView,
	getFilteredAppViews,
	viewHints,
	viewLabels,
} from "./utils/routeUtils";

export {
	parseCbctStudioRoute,
	buildCbctStudioPopoutUrl,
	routeOpenCbctPopout,
} from "./utils/runtimeRouter";

// MANDATE 8e/8p CONTRACT: Odontogram Working Zone Protection & Doctor Immunity
// !isDoctorMode ? (

/**
 * WorkspaceShell — единый канонический композитный каркас CRM.
 * Собирает навигационный сайдбар, верхнюю панель, аварийную полосу и контент.
 */
export function WorkspaceShell({
	currentView,
	role,
	collapsed,
	onToggleCollapsed,
	clinicName = "Стоматология",
	todayIso = new Date().toISOString().slice(0, 10),
	onRoleChange,
	onViewIntent,
	onGoToSchedule,
	onGoToDictation,
	onGoToVisit,
	onReopenOnboarding,
	onLockSession,
	onOpenDoctorShiftCockpit,
	onOpenCbctDemo,
	roleFocusOrder = ["doctor", "assistant", "administrator", "manager", "owner"],
	selectedWorkspaceRole,
	showAdministrationTopActions = false,
	showDoctorVisitShortcut = false,
	staffRoleLabels,
	children,
}: WorkspaceShellProps) {
	const defaultStaffRoleLabels: Record<StaffRole, string> = {
		doctor: "Врач",
		assistant: "Ассистент",
		administrator: "Администратор",
		manager: "Управляющий",
		owner: "Владелец",
		curator: "Куратор",
	};

	return (
		<div className="workspace-shell flex h-screen w-screen overflow-hidden bg-[var(--paper)] text-[var(--ink)]">
			<WorkspaceSidebar
				currentView={currentView}
				onViewIntent={onViewIntent}
				role={role}
				collapsed={collapsed}
				onToggleCollapsed={onToggleCollapsed}
				onLockSession={onLockSession}
			/>
			<div className="workspace-main-column flex flex-col flex-1 min-w-0 h-full overflow-hidden">
				<WorkspaceTopbar
					clinicName={clinicName}
					onGoToDictation={onGoToDictation || (() => {})}
					onGoToSchedule={onGoToSchedule || (() => {})}
					onGoToVisit={onGoToVisit || (() => {})}
					onReopenOnboarding={onReopenOnboarding || (() => {})}
					onRoleChange={onRoleChange || (() => {})}
					onViewIntent={onViewIntent}
					roleFocusOrder={roleFocusOrder}
					selectedWorkspaceRole={selectedWorkspaceRole || role}
					showAdministrationTopActions={showAdministrationTopActions}
					showDoctorVisitShortcut={showDoctorVisitShortcut}
					staffRoleLabels={staffRoleLabels || defaultStaffRoleLabels}
					todayIso={todayIso}
					onLockSession={onLockSession}
					onOpenDoctorShiftCockpit={onOpenDoctorShiftCockpit}
					onOpenCbctDemo={onOpenCbctDemo}
				/>
				<WorkspaceEmergencyBar />
				<WorkspaceContentArea currentView={currentView}>
					{children}
				</WorkspaceContentArea>
			</div>
		</div>
	);
}
