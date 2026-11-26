/**
 * DENTE Dental CRM — Right Island: Primary CTA, Silent Statuses & User Profile Pill (Layer 4)
 * 
 * Mandate 8d (Apple HIG / Studio Clinical Standard), Mandate 8e (Solo Doctor Autonomy),
 * Mandate 8n (1-3 Chairs Sovereignty).
 */

import React, { useEffect, useRef, useState } from "react";
import { formatKopecksToRub } from "@dental/shared";
import {
	Activity,
	AlertOctagon,
	ChevronDown,
	ClipboardCheck,
	Lock,
	Moon,
	PhoneCall,
	Plus,
	QrCode,
	Shield,
	Sparkles,
	TrendingUp,
	User,
	UserCheck,
} from "lucide-react";
import { NotificationBell } from "../../components/notifications/NotificationBell";
import { useDoctorTodayEarnings } from "../../hooks/useDoctorTodayEarnings";
import { togglePatientPrivacyShield } from "../../lib/chairsideErgonomics";
import { workspaceTopbarLabels } from "../../workspaceUiLabels";
import type { WorkspaceTopBarActionsProps } from "./workspaceTopBarTypes";
import { useTelephonyStore } from "../../store/telephonyStore";
import { TelephonyHeaderCapsule } from "../../components/telephony/headerCapsule";
import { ChairsideQuickSwitchModal } from "../../components/auth/ChairsideQuickSwitchModal";

function toggleTheme(): void {
	if (typeof document === "undefined") return;
	const isDark =
		document.documentElement.classList.contains("dark") ||
		document.documentElement.getAttribute("data-theme") === "dark";
	const next = isDark ? "light" : "dark";
	document.documentElement.setAttribute("data-theme", next);
	document.body.setAttribute("data-theme", next);
	if (next === "dark") {
		document.documentElement.classList.add("dark");
		document.documentElement.classList.remove("light");
		document.body.classList.add("dark");
		document.body.classList.remove("light");
	} else {
		document.documentElement.classList.remove("dark");
		document.documentElement.classList.add("light");
		document.body.classList.remove("dark");
		document.body.classList.add("light");
	}
	try {
		localStorage.setItem("dente_theme", next);
	} catch {
		// Ignore storage write failure in restricted iframe/incognito
	}
}

export function WorkspaceTopBarActions({
	effectiveView,
	onGoToSchedule,
	onGoToDictation,
	onViewIntent,
	showDoctorVisitShortcut,
	selectedWorkspaceRole,
	onOpenDoctorShiftCockpit,
	showAdministrationTopActions,
	onReopenOnboarding,
	onOpenLanQr,
	onLockSession,
}: WorkspaceTopBarActionsProps) {
	const [isProfileOpen, setIsProfileOpen] = useState(false);
	const [isQuickSwitchOpen, setIsQuickSwitchOpen] = useState(false);
	const profileRef = useRef<HTMLDivElement | null>(null);
	const activeCall = useTelephonyStore((s) => s.activeCall);
	const { summary: doctorTodaySummary } = useDoctorTodayEarnings(
		selectedWorkspaceRole === "doctor",
	);

	useEffect(() => {
		if (!isProfileOpen) return;
		const handleClickOutside = (e: MouseEvent) => {
			if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
				setIsProfileOpen(false);
			}
		};
		window.addEventListener("mousedown", handleClickOutside);
		return () => window.removeEventListener("mousedown", handleClickOutside);
	}, [isProfileOpen]);

	return (
		<div className="top-actions">
			{/* 1. Единственный Primary CTA всей клиники — «+ Запись» (на мобилках иконка 44x44px, скрыта на экране расписания по Мандату 8am) */}
			<button
				className="primary-button min-h-[44px] min-w-[44px] px-2.5 sm:px-3 flex items-center justify-center gap-1.5"
				style={effectiveView === "schedule" ? { display: "none" } : undefined}
				data-hidden={effectiveView === "schedule" ? "true" : undefined}
				type="button"
				id="topbar-booking-action-btn"
				data-tour="schedule-booking"
				title={workspaceTopbarLabels.book.title}
				onPointerEnter={() => onViewIntent?.("schedule", "hover")}
				onPointerLeave={() => onViewIntent?.("schedule", "cancel")}
				onFocus={() => onViewIntent?.("schedule", "hover")}
				onBlur={() => onViewIntent?.("schedule", "cancel")}
				onTouchStart={() => onViewIntent?.("schedule", "hover")}
				onClick={onGoToSchedule}
			>
				<Plus className="w-4 h-4 shrink-0" aria-hidden="true" />
				<span className="hidden sm:inline">{workspaceTopbarLabels.book.label}</span>
			</button>

			{/* 2. Быстрый переход в дневник приёма для врача у кресла (на мобилке есть в таб-баре) */}
			{showDoctorVisitShortcut ? (
				<button
					className="secondary-button compact-top-button hidden md:inline-flex min-h-[44px] items-center gap-1.5"
					type="button"
					id="topbar-doctor-visit-btn"
					data-tour="visit-diary"
					title={workspaceTopbarLabels.visit.title}
					onPointerEnter={() => onViewIntent?.("visit", "hover")}
					onPointerLeave={() => onViewIntent?.("visit", "cancel")}
					onFocus={() => onViewIntent?.("visit", "hover")}
					onBlur={() => onViewIntent?.("visit", "cancel")}
					onTouchStart={() => onViewIntent?.("visit", "hover")}
					onClick={onGoToDictation}
				>
					<ClipboardCheck aria-hidden="true" />{" "}
					<span>{workspaceTopbarLabels.visit.label}</span>
				</button>
			) : null}

			{/* 2.5. Вызов клинического ассистента у кресла */}
			<button
				className="secondary-button compact-top-button hidden sm:inline-flex min-h-[44px] items-center gap-1.5"
				type="button"
				id="topbar-ai-agent-btn"
				data-testid="topbar-ai-agent-btn"
				title={workspaceTopbarLabels.copilot.title}
				onClick={() => {
					if (typeof window !== "undefined") {
						if (window.__denteCopilot) {
							window.__denteCopilot.toggle();
						} else {
							window.dispatchEvent(new CustomEvent("dente:toggle-copilot"));
						}
						window.dispatchEvent(new CustomEvent("dente:open-agent-cockpit"));
					}
				}}
			>
				<Sparkles className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" aria-hidden="true" />
				<span className="hidden md:inline">{workspaceTopbarLabels.copilot.label}</span>
			</button>

			{/* 2.55. SOS Экстренная помощь у кресла (Ctrl+Alt+E) */}
			<button
				className="secondary-button compact-top-button hidden sm:inline-flex min-h-[44px] items-center gap-1.5 text-[var(--bad-fg)] border-[var(--bad-fg)]/40 hover:bg-[var(--bad-bg)] hover:border-[var(--bad-fg)] transition-colors cursor-pointer"
				type="button"
				id="topbar-emergency-rescue-btn"
				data-testid="topbar-emergency-rescue-btn"
				title="Экстренная помощь у кресла (Ctrl+Alt+E)"
				onClick={() => {
					window.dispatchEvent(new CustomEvent("dente:open-emergency-rescue"));
				}}
			>
				<AlertOctagon className="w-3.5 h-3.5 text-[var(--bad-fg)] shrink-0" aria-hidden="true" />
				<span className="hidden md:inline font-bold">{workspaceTopbarLabels.emergency.label}</span>
			</button>

			{/* 2.58. Живой счётчик дневного заработка врача */}
			{selectedWorkspaceRole === "doctor" ? (
				<button
					className="secondary-button compact-top-button hidden sm:inline-flex h-9 px-3.5 rounded-lg text-sm font-medium items-center gap-2 shrink-0 font-mono tracking-tight tabular-nums cursor-pointer"
					type="button"
					id="topbar-doctor-today-earnings-btn"
					data-testid="topbar-doctor-today-earnings-btn"
					title={workspaceTopbarLabels.todayEarnings.title}
					onClick={() => {
						onOpenDoctorShiftCockpit?.();
					}}
				>
					<TrendingUp className="w-4 h-4 text-[var(--primary)] shrink-0" aria-hidden="true" />
					<span>
						{workspaceTopbarLabels.todayEarnings.formatLabel(
							formatKopecksToRub(doctorTodaySummary?.earnedTodayKopecks ?? 0),
						)}
					</span>
				</button>
			) : null}

			{/* 2.6. Единая Ambient Header Capsule телефонии и софтфона (Zero Floating Blobs) */}
			{/* topbar-chairside-telephony-btn min-h-[32px] h-8 */}
			<TelephonyHeaderCapsule id="topbar-chairside-telephony-btn" className="h-8 min-h-[32px]" />

			{/* 3. Тихий статус уведомлений */}
			<NotificationBell />

			{/* 4. Меню Профиля (User Profile Pill): на мобилке сенсорная иконка 44x44px */}
			<div className="relative inline-block" ref={profileRef}>
				<button
					className="secondary-button compact-top-button min-h-[44px] min-w-[44px] px-2.5 sm:px-3 flex items-center justify-center gap-1.5"
					type="button"
					id="topbar-profile-btn"
					data-testid="topbar-profile-btn"
					title={workspaceTopbarLabels.profile.title}
					onClick={() => setIsProfileOpen((v) => !v)}
					aria-expanded={isProfileOpen}
				>
					<User className="w-4 h-4 text-[var(--teal)] shrink-0" aria-hidden="true" />
					<span className="hidden md:inline">{workspaceTopbarLabels.profile.label}</span>
					<ChevronDown className="w-3 h-3 opacity-60 hidden md:inline" aria-hidden="true" />
				</button>

				{isProfileOpen && (
					<div
						className="absolute right-0 top-full mt-1.5 w-52 rounded-xl bg-[var(--paper)] border border-[var(--line)] shadow-xl p-1.5 flex flex-col gap-1 z-50 animate-in fade-in slide-in-from-top-1 duration-150"
						role="menu"
					>
						{selectedWorkspaceRole === "doctor" ? (
							<button
								className="secondary-button compact-top-button w-full text-left justify-start"
								type="button"
								data-testid="topbar-doctor-cockpit-btn"
								title={workspaceTopbarLabels.doctorCockpit.title}
								onClick={() => {
									setIsProfileOpen(false);
									onOpenDoctorShiftCockpit?.();
								}}
							>
								<Activity className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" aria-hidden="true" />
								{workspaceTopbarLabels.doctorCockpit.label}
							</button>
						) : null}

						<button
							className="secondary-button compact-top-button w-full text-left justify-start"
							type="button"
							id="topbar-patient-privacy-btn"
							data-testid="topbar-patient-privacy-btn"
							title={workspaceTopbarLabels.patientScreen.title}
							onClick={() => {
								setIsProfileOpen(false);
								togglePatientPrivacyShield();
							}}
						>
							<Shield className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
							{workspaceTopbarLabels.patientScreen.label}
						</button>

						<button
							className="secondary-button compact-top-button w-full text-left justify-start"
							type="button"
							id="topbar-lan-qr-connect-btn"
							data-testid="topbar-lan-qr-connect-btn"
							title={workspaceTopbarLabels.lanQr.title}
							onClick={() => {
								setIsProfileOpen(false);
								onOpenLanQr();
							}}
						>
							<QrCode className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" aria-hidden="true" />
							{workspaceTopbarLabels.lanQr.label}
						</button>

						<button
							className="secondary-button compact-top-button w-full text-left justify-start"
							type="button"
							title={workspaceTopbarLabels.theme.title}
							onClick={() => {
								setIsProfileOpen(false);
								toggleTheme();
							}}
						>
							<Moon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
							{workspaceTopbarLabels.theme.label}
						</button>

						{showAdministrationTopActions ? (
							<button
								className="secondary-button compact-top-button w-full text-left justify-start"
								type="button"
								title={workspaceTopbarLabels.setup.title}
								onClick={() => {
									setIsProfileOpen(false);
									onReopenOnboarding?.();
								}}
							>
								<ClipboardCheck aria-hidden="true" />{" "}
								{workspaceTopbarLabels.setup.label}
							</button>
						) : null}

						<button
							className="secondary-button compact-top-button w-full text-left justify-start"
							type="button"
							id="topbar-switch-role-btn"
							data-testid="topbar-switch-role-btn"
							title={workspaceTopbarLabels.switchRole.title}
							onClick={() => {
								setIsProfileOpen(false);
								setIsQuickSwitchOpen(true);
							}}
						>
							<UserCheck className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" aria-hidden="true" />
							{workspaceTopbarLabels.switchRole.label}
						</button>

						{onLockSession ? (
							<button
								className="secondary-button compact-top-button w-full text-left justify-start"
								type="button"
								title={workspaceTopbarLabels.lock.title}
								onClick={() => {
									setIsProfileOpen(false);
									onLockSession();
								}}
							>
								<Lock aria-hidden="true" /> {workspaceTopbarLabels.lock.label}
							</button>
						) : null}
					</div>
				)}
			</div>

			{/* Модальное окно быстрой смены врача по PIN */}
			<ChairsideQuickSwitchModal
				isOpen={isQuickSwitchOpen}
				onClose={() => setIsQuickSwitchOpen(false)}
			/>
		</div>
	);
}
