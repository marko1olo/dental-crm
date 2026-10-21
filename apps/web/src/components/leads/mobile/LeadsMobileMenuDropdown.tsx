/**
 * DENTE Dental CRM — Leads Mobile Header More Menu Dropdown
 * Mandate 8b (<= 120 lines)
 */

import { BarChart3, MoreVertical, RotateCcw } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

interface LeadsMobileMenuDropdownProps {
	onOpenAnalytics?: (() => void) | undefined;
	onOpenLeakDetector?: (() => void) | undefined;
}

export const LeadsMobileMenuDropdown: React.FC<LeadsMobileMenuDropdownProps> = ({
	onOpenAnalytics,
	onOpenLeakDetector,
}) => {
	const [isOpen, setIsOpen] = useState(false);
	const menuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
				setIsOpen(false);
			}
		};
		if (isOpen) document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [isOpen]);

	if (!onOpenAnalytics && !onOpenLeakDetector) return null;

	return (
		<div className="relative inline-flex" ref={menuRef}>
			<button
				type="button"
				onClick={() => setIsOpen((prev) => !prev)}
				className="leads-mobile-icon-btn"
				aria-label="Дополнительные функции воронки"
				data-testid="mobile-leads-more-btn"
				title="Дополнительные функции"
			>
				<MoreVertical size={18} />
			</button>

			{isOpen && (
				<div className="leads-mobile-menu-dropdown" role="menu">
					{onOpenAnalytics && (
						<button
							type="button"
							className="leads-mobile-menu-item"
							onClick={() => {
								setIsOpen(false);
								onOpenAnalytics();
							}}
							data-testid="mobile-open-analytics-btn"
						>
							<BarChart3 size={16} className="text-[var(--teal)] shrink-0" />
							<span>Аналитика воронки</span>
						</button>
					)}
					{onOpenLeakDetector && (
						<button
							type="button"
							className="leads-mobile-menu-item"
							onClick={() => {
								setIsOpen(false);
								onOpenLeakDetector();
							}}
							data-testid="mobile-open-leak-detector-btn"
						>
							<RotateCcw size={16} className="text-[var(--teal)] shrink-0" />
							<span>Детектор оттока (&gt;210 дней)</span>
						</button>
					)}
				</div>
			)}
		</div>
	);
};
