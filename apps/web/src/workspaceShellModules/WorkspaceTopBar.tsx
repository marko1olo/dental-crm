/**
 * DENTE Dental CRM — Workspace TopBar Master Facade (Layer 5)
 * 
 * Mandate 8s (SSOT Componentization), Mandate 8d (Apple HIG 3-Island Shell Standard),
 * Mandate 8e & 8n (Solo Doctor Autonomy & Zero Dead-Ends).
 */

import React, { Suspense, useEffect, useState } from "react";
import { LanQrConnectionModal } from "../components/network/LanQrConnectionModal";
import {
	IncomingCallPopup,
	resolveTelephonyWsUrl,
} from "../components/telephony/IncomingCallPopup";
import { useWebsocket } from "../hooks/useWebsocket";
import { staffRoleChoices } from "../lib/clinicCapabilities";
import { useAppStore } from "../store/appStore";
import { useSettingsStore } from "../store/settingsStore";
import { useTelephonyStore } from "../store/telephonyStore";
import { useUiSurfaceStore } from "../store/uiSurfaceStore";
import {
	formatDisplayClinicName,
	PerspectiveSwitcher,
	WorkspaceTopBarActions,
	WorkspaceTopBarCommandHub,
	WorkspaceTopBarStatusAndSearch,
	type WorkspaceTopbarProps,
} from "./topBarModules";

export {
	formatDisplayClinicName,
	IncomingCallPopup,
	PerspectiveSwitcher,
	resolveTelephonyWsUrl,
};

export function WorkspaceTopbar({
	clinicName,
	onGoToDictation,
	onGoToSchedule,
	onReopenOnboarding,
	onRoleChange,
	onViewIntent,
	roleFocusOrder,
	selectedWorkspaceRole,
	showAdministrationTopActions,
	showDoctorVisitShortcut,
	staffRoleLabels,
	todayIso,
	onLockSession,
	onOpenDoctorShiftCockpit,
	onOpenCbctDemo,
	currentView: propCurrentView,
}: WorkspaceTopbarProps) {
	const validDate = (() => {
		if (todayIso && !Number.isNaN(Date.parse(`${todayIso}T12:00:00`))) {
			return new Date(`${todayIso}T12:00:00`);
		}
		return new Date();
	})();
	const formattedDate = new Intl.DateTimeFormat("ru-RU", {
		day: "numeric",
		month: "long",
		year: "numeric",
		weekday: "long",
	}).format(validDate);

	const clinicMode = useSettingsStore((s) => s.clinicMode);
	const availableRoles = staffRoleChoices(
		roleFocusOrder,
		clinicMode,
		selectedWorkspaceRole,
	);
	const activeCall = useTelephonyStore((s) => s.activeCall);
	const isCallDrawerOpen = useTelephonyStore((s) => s.isCallDrawerOpen);
	const agentState = useTelephonyStore((s) => s.agentState);
	const triggerIncomingCall = useTelephonyStore((s) => s.triggerIncomingCall);
	const setWsConnected = useTelephonyStore((s) => s.setWsConnected);
	const storeCurrentView = useAppStore((s) => s.currentView);
	const effectiveView = propCurrentView ?? storeCurrentView;
	const isFullScreenStudioActive = useUiSurfaceStore(
		(s) => s.isFullScreenStudioActive,
	);

	const [isLanQrOpen, setIsLanQrOpen] = useState(false);

	useEffect(() => {
		const handleOpen = () => setIsLanQrOpen(true);
		window.addEventListener("dente:open-lan-qr", handleOpen);
		return () => window.removeEventListener("dente:open-lan-qr", handleOpen);
	}, []);

	const isDoctorMode =
		selectedWorkspaceRole === "doctor" || effectiveView === "visit";
	const isDndActive = agentState === "dnd";
	const isIncomingCall = Boolean(
		(activeCall || isCallDrawerOpen) &&
			!isDndActive &&
			!isFullScreenStudioActive,
	);

	const telephonyWsUrl = !isDoctorMode ? resolveTelephonyWsUrl() : "";
	const { lastMessage, isConnected } = useWebsocket(telephonyWsUrl);

	useEffect(() => {
		setWsConnected(isConnected);
	}, [isConnected, setWsConnected]);

	useEffect(() => {
		if (
			!isDoctorMode &&
			lastMessage?.type === "TELEPHONY_INCOMING_CALL" &&
			lastMessage.payload
		) {
			const p = lastMessage.payload;
			triggerIncomingCall({
				phone: p.phone || "",
				patientId: p.patientId || null,
				patientName: p.patientName || "Неизвестный номер",
				callId: p.callId,
				provider: p.provider || "mango",
				timestamp: p.timestamp || new Date().toISOString(),
				status: "ringing",
				recordingUrl: p.recordingUrl,
				callStartedAt: Date.now(),
			});
		}
	}, [lastMessage, triggerIncomingCall, isDoctorMode]);

	return (
		<header className="topbar h-11 min-h-[44px] max-h-[44px] px-2 sm:px-4 flex items-center justify-between gap-3 overflow-visible border-b border-[var(--line)] bg-[var(--glass-bg)] backdrop-blur-md sticky top-0 z-25">
			{/* ОСТРОВ 1: Левый остров — Клинический контекст, Бренд и Кабинет */}
			<WorkspaceTopBarStatusAndSearch
				clinicName={clinicName}
				formattedDate={formattedDate}
				selectedWorkspaceRole={selectedWorkspaceRole}
				staffRoleLabels={staffRoleLabels}
				availableRoles={availableRoles}
				onRoleChange={onRoleChange}
			/>

			{/* ОСТРОВ 2: Центральный остров — Единый Spotlight Command Hub (Ctrl+K) */}
			<WorkspaceTopBarCommandHub />

			{/* ОСТРОВ 3: Правый остров — 1 Primary CTA «+ Запись», Статусы и Меню Профиля */}
			<WorkspaceTopBarActions
				effectiveView={effectiveView}
				onGoToSchedule={onGoToSchedule}
				onGoToDictation={onGoToDictation}
				onViewIntent={onViewIntent}
				showDoctorVisitShortcut={showDoctorVisitShortcut}
				selectedWorkspaceRole={selectedWorkspaceRole}
				onOpenDoctorShiftCockpit={onOpenDoctorShiftCockpit}
				onOpenCbctDemo={onOpenCbctDemo}
				showAdministrationTopActions={showAdministrationTopActions}
				onReopenOnboarding={onReopenOnboarding}
				onOpenLanQr={() => setIsLanQrOpen(true)}
				onLockSession={onLockSession}
			/>

			{/* Модальное окно подключения смартфона / ассистента */}
			<LanQrConnectionModal
				isOpen={isLanQrOpen}
				onClose={() => setIsLanQrOpen(false)}
				initialRole={selectedWorkspaceRole === "assistant" ? "assistant" : "doctor"}
			/>

			{/* Всплывающий звонок (в режиме врача деликатно сворачивается в капсулу) */}
			{!isFullScreenStudioActive && isIncomingCall ? (
				<Suspense fallback={null}>
					<IncomingCallPopup />
				</Suspense>
			) : null}
		</header>
	);
}

export const WorkspaceTopBar = WorkspaceTopbar;
