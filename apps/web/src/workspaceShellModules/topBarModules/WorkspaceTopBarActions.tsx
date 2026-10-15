/**
 * DENTE Dental CRM — Right Island: Primary CTA, Silent Statuses & User Profile Pill (Layer 4)
 * 
 * Mandate 8d (Apple HIG / Studio Clinical Standard), Mandate 8e (Solo Doctor Autonomy),
 * Mandate 8n (1-3 Chairs Sovereignty).
 */

import React, { useEffect, useRef, useState } from "react";
import {
	Activity,
	ChevronDown,
	ClipboardCheck,
	Lock,
	Moon,
	Plus,
	QrCode,
	Shield,
	Sparkles,
	User,
} from "lucide-react";
import { NotificationBell } from "../../components/notifications/NotificationBell";
import { togglePatientPrivacyShield } from "../../lib/chairsideErgonomics";
import { workspaceTopbarLabels } from "../../workspaceUiLabels";
import type { WorkspaceTopBarActionsProps } from "./workspaceTopBarTypes";

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
	const profileRef = useRef<HTMLDivElement | null>(null);

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
			{/* 1. Единственный Primary CTA всей клиники — «+ Запись» (на мобилках иконка 44x44px) */}
			<button
				className="primary-button min-h-[44px] min-w-[44px] px-2.5 sm:px-3 flex items-center justify-center gap-1.5"
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
					window.dispatchEvent(new CustomEvent("dente:open-agent-cockpit"));
				}}
			>
				<Sparkles className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" aria-hidden="true" />
				<span className="hidden md:inline">{workspaceTopbarLabels.copilot.label}</span>
			</button>

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
		</div>
	);
}
