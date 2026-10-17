/**
 * DENTE Dental CRM — Leads Kanban Secondary More Menu (...)
 * Analytics, Churn & CRM Leak Detector
 * Mandate 8b (<= 120 lines)
 */

import React, { useEffect, useRef, useState } from "react";
import { BarChart3, MoreHorizontal, RotateCcw } from "lucide-react";

interface LeadsKanbanMoreMenuProps {
	onOpenAnalytics: () => void;
	onOpenLeakDetector: () => void;
}

export const LeadsKanbanMoreMenu: React.FC<LeadsKanbanMoreMenuProps> = ({
	onOpenAnalytics,
	onOpenLeakDetector,
}) => {
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const menuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
				setIsMenuOpen(false);
			}
		};
		if (isMenuOpen) document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [isMenuOpen]);

	return (
		<div className="leads-more-menu-container relative inline-flex" ref={menuRef}>
			<button
				className="leads-more-menu-btn h-9 w-9 min-h-[36px] min-w-[36px] rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-all flex items-center justify-center cursor-pointer"
				onClick={() => setIsMenuOpen((prev) => !prev)}
				type="button"
				aria-label="Дополнительные функции воронки"
				data-testid="btn-leads-more-menu"
				title="Дополнительные функции воронки"
			>
				<MoreHorizontal size={16} />
			</button>

			{isMenuOpen && (
				<div
					className="leads-more-menu-dropdown absolute right-0 top-[calc(100%+4px)] z-50 min-w-[210px] bg-[var(--paper-strong)] border border-[var(--line)] rounded-xl shadow-lg p-1.5 flex flex-col gap-1"
					role="menu"
				>
					<button
						className="leads-more-menu-item flex items-center gap-2.5 w-full h-8 px-2.5 rounded-lg border-none bg-transparent hover:bg-[var(--paper-soft)] text-[var(--ink)] text-xs font-medium text-left cursor-pointer transition-colors"
						onClick={() => {
							setIsMenuOpen(false);
							onOpenAnalytics();
						}}
						type="button"
						role="menuitem"
						data-testid="btn-open-analytics"
					>
						<BarChart3 size={15} className="text-[var(--primary)] shrink-0" />
						<span>Аналитика воронки</span>
					</button>

					<button
						className="leads-more-menu-item flex items-center gap-2.5 w-full h-8 px-2.5 rounded-lg border-none bg-transparent hover:bg-[var(--paper-soft)] text-[var(--ink)] text-xs font-medium text-left cursor-pointer transition-colors"
						onClick={() => {
							setIsMenuOpen(false);
							onOpenLeakDetector();
						}}
						type="button"
						role="menuitem"
						data-testid="btn-open-leak-detector"
					>
						<RotateCcw size={15} className="text-[var(--primary)] shrink-0" />
						<span>Детектор оттока (&gt;210 дней)</span>
					</button>
				</div>
			)}
		</div>
	);
};
