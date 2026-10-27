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

	const content = (
		<section
			className={isMobile ? "dnt-cc-mobile-sheet fixed bottom-0 left-0 right-0 z-50 rounded-t-[24px] bg-[var(--paper-strong,var(--paper,#ffffff))] max-h-[85vh] overflow-y-auto p-4 border-t border-[var(--line)] shadow-2xl overflow-x-clip" : "dnt-control-center-popover"}
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
						<h3 className="text-xs font-black uppercase tracking-wider text-[var(--ink,#0f172a)] truncate">
							Пульт Клиники
						</h3>
						<p className="text-[10px] text-[var(--muted,#475569)] truncate">
							{dashboard?.clinicName || "Клиника DENTE"} · {dashboard?.role ? String(dashboard.role) : "Администратор"}
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

	if (isMobile && typeof document !== "undefined") {
		return createPortal(
			<>
				<div
					className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 transition-opacity"
					onClick={onClose}
					aria-hidden="true"
				/>
				{content}
			</>,
			document.body,
		);
	}

	return content;
}
