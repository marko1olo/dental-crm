/**
 * UserProfileMenuItems — Пункты меню профиля (Мандат 8b, <= 120 строк).
 */

import React from "react";
import { Activity, ClipboardCheck, Lock, Moon, QrCode, Shield } from "lucide-react";
import { togglePatientPrivacyShield } from "../../../lib/chairsideErgonomics";
import { workspaceTopbarLabels } from "../../../workspaceUiLabels";
import { toggleTheme } from "./themeToggleHelper";
import type { StaffRole } from "@dental/shared";

export interface UserProfileMenuItemsProps {
	selectedWorkspaceRole: StaffRole;
	onOpenDoctorShiftCockpit?: (() => void) | undefined;
	onOpenLanQr?: (() => void) | undefined;
	onReopenOnboarding?: (() => void) | undefined;
	onLockSession?: (() => void) | undefined;
	showAdministrationTopActions?: boolean | undefined;
	onClose: () => void;
}

export function UserProfileMenuItems({
	selectedWorkspaceRole,
	onOpenDoctorShiftCockpit,
	onOpenLanQr,
	onReopenOnboarding,
	onLockSession,
	showAdministrationTopActions,
	onClose,
}: UserProfileMenuItemsProps) {
	return (
		<div
			className="absolute right-0 top-full mt-1.5 w-52 rounded-xl bg-[var(--paper)] border border-[var(--line)] shadow-xl p-1.5 flex flex-col gap-1 z-50 animate-in fade-in slide-in-from-top-1 duration-150"
			role="menu"
		>
			{selectedWorkspaceRole === "doctor" && onOpenDoctorShiftCockpit && (
				<button
					className="secondary-button compact-top-button w-full text-left justify-start"
					type="button"
					data-testid="topbar-doctor-cockpit-btn"
					onClick={() => {
						onClose();
						onOpenDoctorShiftCockpit();
					}}
				>
					<Activity className="w-3.5 h-3.5 text-[var(--teal,#0d9488)] shrink-0" aria-hidden="true" />
					{workspaceTopbarLabels.doctorCockpit.label}
				</button>
			)}
			<button
				className="secondary-button compact-top-button w-full text-left justify-start"
				type="button"
				id="topbar-patient-privacy-btn"
				onClick={() => {
					onClose();
					togglePatientPrivacyShield();
				}}
			>
				<Shield className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
				{workspaceTopbarLabels.patientScreen.label}
			</button>
			{onOpenLanQr && (
				<button
					className="secondary-button compact-top-button w-full text-left justify-start"
					type="button"
					id="topbar-lan-qr-connect-btn"
					onClick={() => {
						onClose();
						onOpenLanQr();
					}}
				>
					<QrCode className="w-3.5 h-3.5 text-[var(--teal,#0d9488)] shrink-0" aria-hidden="true" />
					{workspaceTopbarLabels.lanQr.label}
				</button>
			)}
			<button
				className="secondary-button compact-top-button w-full text-left justify-start"
				type="button"
				onClick={() => {
					onClose();
					toggleTheme();
				}}
			>
				<Moon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
				{workspaceTopbarLabels.theme.label}
			</button>
			{showAdministrationTopActions && onReopenOnboarding && (
				<button
					className="secondary-button compact-top-button w-full text-left justify-start"
					type="button"
					onClick={() => {
						onClose();
						onReopenOnboarding();
					}}
				>
					<ClipboardCheck aria-hidden="true" /> {workspaceTopbarLabels.setup.label}
				</button>
			)}
			{onLockSession && (
				<button
					className="secondary-button compact-top-button w-full text-left justify-start"
					type="button"
					onClick={() => {
						onClose();
						onLockSession();
					}}
				>
					<Lock aria-hidden="true" /> {workspaceTopbarLabels.lock.label}
				</button>
			)}
		</div>
	);
}
