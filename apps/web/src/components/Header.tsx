/**
 * @file Header.tsx
 * @description Thin Facade for CRM Top Header (< 120 lines).
 * Adheres to Mandate 8b, Hick's Law (Single Row 44-48px), and 100% AST Export Parity.
 */

import React from "react";
import {
	HeaderBranding,
	HeaderGlobalSearch,
	HeaderSystemStatus,
	HeaderUserMenu,
} from "./headerModules";
import type {
	AccessibilityModeButtonProps,
	ClinicControlPillProps,
	HeaderProps,
} from "./headerModules";
import "./Header.css";
import "../styles/modules/header.css";

// 100% AST Export Parity with original monolith
export type { ClinicControlPillProps, AccessibilityModeButtonProps, HeaderProps };
export {
	AccessibilityModeButton,
	ClinicControlPill,
	HeaderBranding,
	HeaderGlobalSearch,
	HeaderSystemStatus,
	HeaderUserMenu,
} from "./headerModules";

/**
 * Top CRM Header component.
 * Single row desktop & mobile layout (36-48px) with zero visual clutter.
 */
export function Header({
	className = "",
	clinicName,
	branches,
	currentBranchId,
	onBranchChange,
	currentCabinet,
	onCabinetChange,
	user,
	onLockSession,
	onOpenShiftModal,
	onSelectPatient,
	onLogout,
}: HeaderProps) {
	return (
		<header
			className={`dnt-global-header w-full h-12 min-h-[44px] max-h-12 px-3 sm:px-4 bg-[var(--paper-strong,var(--paper,#ffffff))] border-b border-[var(--line,#e2e8f0)] flex items-center justify-between gap-3 overflow-visible shrink-0 sticky top-0 z-40 ${className}`}
			aria-label="Главная панель CRM"
			data-testid="crm-global-header"
		>
			{/* Left: Branding, Branch Switcher & Cabinet */}
			<HeaderBranding
				clinicName={clinicName}
				branches={branches}
				currentBranchId={currentBranchId}
				onBranchChange={onBranchChange}
				currentCabinet={currentCabinet}
				onCabinetChange={onCabinetChange}
			/>

			{/* Center: Global Instant Patient Search */}
			<HeaderGlobalSearch
				onSelectPatient={onSelectPatient}
				className="mx-auto hidden md:flex"
			/>

			{/* Right: Telephony/Cash/Sync Capsule + User Profile & Theme */}
			<div className="flex items-center gap-2 shrink-0">
				<HeaderSystemStatus
					onLockSession={onLockSession}
					onOpenShiftModal={onOpenShiftModal}
				/>
				<HeaderUserMenu
					user={user}
					onLockSession={onLockSession}
					onLogout={onLogout}
				/>
			</div>
		</header>
	);
}

export default Header;
