/**
 * @file SidebarClinicControlPillView.tsx
 * @description Dedicated compact single-row clinic status capsule for WorkspaceSidebar footer (Mandate 8b <= 100 lines).
 */

import React from "react";
import { ChevronDown, PhoneCall, ShieldCheck } from "lucide-react";
import type { ClinicControlPillViewProps } from "./headerStatusTypes.js";

export function SidebarClinicControlPillView({
	isOpen,
	status,
	onToggleOpen,
	className = "",
	collapsed = false,
}: ClinicControlPillViewProps) {
	const {
		isOnline, l2PatientSnapshotsCount, isShiftOpen, formattedShiftTime, activeCall,
	} = status;

	if (collapsed) {
		return (
			<button
				type="button"
				onClick={onToggleOpen}
				className={`sidebar-control-pill w-8 h-8 min-w-[32px] max-w-[32px] min-h-[32px] max-h-[32px] p-0 rounded-lg flex items-center justify-center border border-[var(--line)] bg-[var(--paper-soft,rgba(0,0,0,0.03))] hover:bg-[var(--line)] hover:border-[var(--teal)] transition-all cursor-pointer relative mx-auto select-none ${isOpen ? "ring-2 ring-[var(--teal)]" : ""} ${className}`}
				aria-expanded={isOpen}
				aria-label="Пульт управления клиникой"
				title={`Центр управления: ${isOnline ? "Онлайн" : "Офлайн"} • ${isShiftOpen ? "Смена открыта" : "Смена закрыта"}`}
				data-testid="clinic-control-center-trigger"
			>
				{activeCall ? (
					<PhoneCall size={14} className="text-emerald-500 animate-bounce" />
				) : (
					<ShieldCheck size={15} className={isShiftOpen ? "text-emerald-500" : "text-amber-500"} />
				)}
				<span
					className={`absolute top-1 right-1 w-1.5 h-1.5 rounded-full ${isOnline ? "bg-emerald-500" : "bg-rose-500"}`}
				/>
			</button>
		);
	}

	return (
		<button
			type="button"
			onClick={onToggleOpen}
			className={`sidebar-control-pill flex items-center justify-between w-full h-8 min-h-[32px] max-h-8 px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft,rgba(0,0,0,0.03))] hover:bg-[var(--line)] hover:border-[var(--teal)] transition-all cursor-pointer text-xs select-none ${isOpen ? "ring-2 ring-[var(--teal)]" : ""} ${className}`}
			aria-expanded={isOpen}
			aria-label="Пульт управления клиникой"
			title={`Центр управления: ${isOnline ? "Онлайн" : "Офлайн"} • ${isShiftOpen ? "Смена открыта" : "Смена закрыта"} • Mango PBX`}
			data-testid="clinic-control-center-trigger"
		>
			<div className="sidebar-pill-info flex items-center gap-2 min-w-0">
				<span
					className={`w-2 h-2 rounded-full shrink-0 ${isOnline ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`}
					title={isOnline ? "БД на связи" : "Офлайн"}
				/>
				<span className="sidebar-pill-label font-medium text-[11px] truncate text-[var(--ink)]">
					{isOnline ? "Клиника онлайн" : "Офлайн-режим"}
				</span>
			</div>
			<div className="sidebar-pill-badges flex items-center gap-1.5 shrink-0 text-[10px] text-[var(--muted)]">
				{activeCall ? (
					<PhoneCall size={12} className="text-emerald-500 animate-bounce" />
				) : (
					<ShieldCheck
						size={13}
						className={isShiftOpen ? "text-emerald-500 shrink-0" : "text-amber-500 shrink-0"}
						title={isShiftOpen ? `Касса: смена открыта (${formattedShiftTime})` : "Касса: смена закрыта"}
					/>
				)}
				<span
					className="px-1 py-0.2 rounded bg-teal-500/15 text-teal-700 dark:text-teal-300 font-bold text-[9px] border border-teal-500/20"
					title={`Офлайн-буфер L2 (${l2PatientSnapshotsCount} карт)`}
					data-testid="header-l2-offline-buffer-badge"
				>
					L2
				</span>
				<ChevronDown
					size={11}
					className={`opacity-60 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
				/>
			</div>
		</button>
	);
}
