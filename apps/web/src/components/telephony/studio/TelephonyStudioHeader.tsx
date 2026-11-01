/**
 * apps/web/src/components/telephony/studio/TelephonyStudioHeader.tsx
 *
 * DENTE Dental CRM — Telephony Studio Header.
 * Mandates: 8am (Single 1-line Header), Apple HIG (Drag Handle, Touch Targets >= 44x44px).
 */

import React from "react";
import { Phone, X } from "lucide-react";

export interface TelephonyStudioHeaderProps {
	activeLineId?: string | number | null;
	activeMobileTab: "journal" | "dialer";
	onTabChange: (tab: "journal" | "dialer") => void;
	onClose: () => void;
}

export const TelephonyStudioHeader: React.FC<TelephonyStudioHeaderProps> = ({
	activeLineId,
	activeMobileTab,
	onTabChange,
	onClose,
}) => {
	return (
		<>
			{/* Mobile Drag Handle (Apple HIG, Mandate 8am) */}
			<div className="sm:hidden flex justify-center pt-2 pb-1">
				<div className="dnt-telephony-mobile-drag-handle" />
			</div>

			{/* Header (1-line, Mandate 8am) */}
			<div className="dnt-telephony-header">
				<div className="flex items-center gap-2.5 min-w-0">
					<div className="w-8 h-8 rounded-lg bg-[var(--teal,#0d9488)]/15 text-[var(--teal,#0d9488)] flex items-center justify-center font-bold shrink-0">
						<Phone className="w-4 h-4" />
					</div>
					<div className="min-w-0">
						<h2 className="dnt-telephony-header-title truncate">
							<span className="sm:hidden">Звонки</span>
							<span className="hidden sm:inline">Телефония и журнал звонков</span>
						</h2>
						<div className="dnt-telephony-header-status truncate">
							<span className="dnt-telephony-status-dot" />
							<span className="sm:hidden">Онлайн</span>
							<span className="hidden sm:inline">
								{`Линия ${activeLineId || "1"}: онлайн (SIP АТС подключена)`}
							</span>
						</div>
					</div>
				</div>

				<div className="flex items-center gap-2 shrink-0">
					{/* Mobile Tab Switcher */}
					<div className="flex sm:hidden bg-[var(--paper-secondary,#f1f5f9)] p-0.5 rounded-lg border border-[var(--line)]">
						<button
							type="button"
							onClick={() => onTabChange("journal")}
							className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
								activeMobileTab === "journal"
									? "bg-[var(--paper-strong)] text-[var(--ink)] shadow-xs border border-[var(--line)]"
									: "bg-transparent text-[var(--ink-secondary)] hover:text-[var(--ink)]"
							}`}
						>
							Журнал
						</button>
						<button
							type="button"
							onClick={() => onTabChange("dialer")}
							className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
								activeMobileTab === "dialer"
									? "bg-[var(--paper-strong)] text-[var(--ink)] shadow-xs border border-[var(--line)]"
									: "bg-transparent text-[var(--ink-secondary)] hover:text-[var(--ink)]"
							}`}
						>
							Набор
						</button>
					</div>

					<button
						type="button"
						onClick={onClose}
						data-testid="telephony-studio-close-btn"
						aria-label="Закрыть"
						className="w-9 h-9 flex items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--paper-strong)] text-[var(--ink-secondary)] hover:bg-[var(--paper-secondary)] transition-colors cursor-pointer"
					>
						<X className="w-4 h-4" />
					</button>
				</div>
			</div>
		</>
	);
};

export default TelephonyStudioHeader;
