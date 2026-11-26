/**
 * @file ClinicControlCenterPopover.tsx
 * @description macOS HIG popover & native mobile Bottom Sheet via Portal (Mandate 8b <= 120 lines, Apple HIG).
 */

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Activity, X } from "lucide-react";
import { useOptionalAppLogicContext } from "../../../contexts/AppLogicContext.js";
import { StatusBlockCashboxShift } from "./StatusBlockCashboxShift.js";
import { StatusBlockTelephony } from "./StatusBlockTelephony.js";
import { StatusBlockOfflineSync } from "./StatusBlockOfflineSync.js";
import { StatusBlockQuickActions } from "./StatusBlockQuickActions.js";
import type { ClinicControlCenterPopoverProps } from "./headerStatusTypes.js";

export function ClinicControlCenterPopover({
	isOpen,
	status,
	onClose,
	onLockSession,
	onOpenShiftModal,
	isSidebar = false,
	popoverRef,
}: ClinicControlCenterPopoverProps) {
	const [isMobile, setIsMobile] = useState(() => (typeof window !== "undefined" ? window.innerWidth <= 768 : false));
	const ctx = useOptionalAppLogicContext();
	const dashboard = ctx?.dashboard;

	useEffect(() => {
		if (typeof window === "undefined") return;
		const handleResize = () => setIsMobile(window.innerWidth <= 768);
		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, []);

	if (!isOpen) return null;

	const desktopPositionClass = isSidebar
		? "fixed bottom-16 left-4 z-[9999] w-[360px] max-w-[calc(100vw-32px)] max-h-[calc(100vh-96px)] overflow-y-auto rounded-2xl bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink)] border border-[var(--line-strong,var(--line))] p-4 shadow-2xl overflow-x-clip"
		: "fixed top-14 right-4 z-[9999] w-[372px] max-w-[calc(100vw-32px)] max-h-[calc(100vh-80px)] overflow-y-auto rounded-2xl bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink)] border border-[var(--line-strong,var(--line))] p-4 shadow-2xl overflow-x-clip";

	const content = (
		<section
			ref={popoverRef}
			className={isMobile ? "dnt-cc-mobile-sheet fixed bottom-0 left-0 right-0 z-[9999] rounded-t-[24px] bg-[var(--paper-strong,var(--paper,#ffffff))] max-h-[85vh] overflow-y-auto p-4 border-t border-[var(--line)] shadow-2xl overflow-x-clip" : desktopPositionClass}
			aria-label="Центр управления клиникой"
		>
			{isMobile && (
				<div className="flex justify-center pb-2">
					<div className="w-9 h-1.25 rounded-full bg-[var(--line-strong,var(--line,#cbd5e1))]" />
				</div>
			)}

			{/* Popover Header */}
			<div className="flex items-center justify-between pb-3 mb-3 border-b border-[var(--line,#e2e8f0)]">
				<div className="flex items-center gap-2 min-w-0">
					<div className="w-8 h-8 rounded-xl bg-[var(--teal-surface)] border border-[var(--teal-soft)] flex items-center justify-center text-[var(--teal)] shrink-0">
						<Activity size={16} />
					</div>
					<div className="min-w-0">
						<h3 className="text-xs font-semibold tracking-tight text-[var(--ink,#0f172a)] truncate">
							Пульт клиники
						</h3>
						<p className="text-[10px] text-[var(--muted,#475569)] truncate">
							{dashboard?.clinicName || "Клиника DENTE"} · {ctx?.selectedWorkspaceRole ? String(ctx.selectedWorkspaceRole) : "Администратор"}
						</p>
					</div>
				</div>
				<button
					type="button"
					onClick={onClose}
					className="min-h-[44px] min-w-[44px] p-2 rounded-lg text-[var(--muted,#475569)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,rgba(0,0,0,0.05))] transition-colors inline-flex items-center justify-center cursor-pointer"
					aria-label="Закрыть пульт"
				>
					<X size={16} />
				</button>
			</div>

			<StatusBlockCashboxShift status={status} onClose={onClose} onOpenShiftModal={onOpenShiftModal} />
			<StatusBlockTelephony status={status} onClose={onClose} />
			<StatusBlockOfflineSync status={status} onClose={onClose} />
			<StatusBlockQuickActions onClose={onClose} onLockSession={onLockSession} />
		</section>
	);

	if (typeof document !== "undefined") {
		return createPortal(
			<>
				{isMobile && (
					<div
						className="fixed inset-0 bg-black/40 backdrop-blur-xs z-[9998] transition-opacity"
						onClick={onClose}
						aria-hidden="true"
					/>
				)}
				{content}
			</>,
			document.body,
		);
	}

	return content;
}
