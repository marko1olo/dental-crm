/**
 * TopBarUserProfile — Профиль пользователя, роль и системные действия (Мандат 8b, <= 120 строк).
 */

import React, { useEffect, useRef, useState } from "react";
import { ChevronDown, User } from "lucide-react";
import { workspaceTopbarLabels } from "../../../workspaceUiLabels";
import { UserProfileMenuItems } from "./UserProfileMenuItems";
import type { StaffRole } from "@dental/shared";

export interface TopBarUserProfileProps {
	selectedWorkspaceRole: StaffRole;
	onOpenDoctorShiftCockpit?: () => void;
	onOpenLanQr?: () => void;
	onReopenOnboarding?: () => void;
	onLockSession?: () => void;
	showAdministrationTopActions?: boolean;
}

export function TopBarUserProfile({
	selectedWorkspaceRole,
	onOpenDoctorShiftCockpit,
	onOpenLanQr,
	onReopenOnboarding,
	onLockSession,
	showAdministrationTopActions,
}: TopBarUserProfileProps) {
	const [isOpen, setIsOpen] = useState(false);
	const menuRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		if (!isOpen) return;
		const handleClickOutside = (e: MouseEvent) => {
			if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
				setIsOpen(false);
			}
		};
		window.addEventListener("mousedown", handleClickOutside);
		return () => window.removeEventListener("mousedown", handleClickOutside);
	}, [isOpen]);

	return (
		<div className="relative inline-block" ref={menuRef}>
			<button
				className="secondary-button compact-top-button min-h-[44px] min-w-[44px] px-2.5 sm:px-3 flex items-center justify-center gap-1.5"
				type="button"
				id="topbar-profile-btn"
				data-testid="topbar-profile-btn"
				title={workspaceTopbarLabels.profile.title}
				onClick={() => setIsOpen((v) => !v)}
				aria-expanded={isOpen}
			>
				<User className="w-4 h-4 text-[var(--teal,#0d9488)] shrink-0" aria-hidden="true" />
				<span className="hidden md:inline">{workspaceTopbarLabels.profile.label}</span>
				<ChevronDown className="w-3 h-3 opacity-60 hidden md:inline" aria-hidden="true" />
			</button>

			{isOpen && (
				<UserProfileMenuItems
					selectedWorkspaceRole={selectedWorkspaceRole}
					onOpenDoctorShiftCockpit={onOpenDoctorShiftCockpit}
					onOpenLanQr={onOpenLanQr}
					onReopenOnboarding={onReopenOnboarding}
					onLockSession={onLockSession}
					showAdministrationTopActions={showAdministrationTopActions}
					onClose={() => setIsOpen(false)}
				/>
			)}
		</div>
	);
}
