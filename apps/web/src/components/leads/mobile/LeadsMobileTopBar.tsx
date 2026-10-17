/**
 * DENTE Dental CRM — Leads Mobile Top Header & Search Bar
 * Mandate 8b (<= 120 lines)
 */

import React, { useRef, useState, useEffect } from "react";
import { BarChart3, MoreVertical, RotateCcw, Search, X } from "lucide-react";

interface LeadsMobileTopBarProps {
	isSearchOpen: boolean;
	setIsSearchOpen: React.Dispatch<React.SetStateAction<boolean>>;
	searchQuery: string;
	setSearchQuery: (q: string) => void;
	onOpenAnalytics?: (() => void) | undefined;
	onOpenLeakDetector?: (() => void) | undefined;
}

export const LeadsMobileTopBar: React.FC<LeadsMobileTopBarProps> = ({
	isSearchOpen, setIsSearchOpen, searchQuery, setSearchQuery, onOpenAnalytics, onOpenLeakDetector,
}) => {
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
	const mobileMenuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
				setIsMobileMenuOpen(false);
			}
		};
		if (isMobileMenuOpen) document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [isMobileMenuOpen]);

	return (
		<>
			<div className="leads-mobile-header">
				<div className="leads-mobile-header-left">
					<h2 className="leads-mobile-title" title="Воронка обращений и звонков">Обращения</h2>
					<div className="leads-mobile-telemetry" title="Сквозная телеметрия обращений и телефонии активна">
						<span className="leads-mobile-telemetry-dot" />
						<span>CRM Live</span>
					</div>
				</div>

				<div className="leads-mobile-header-actions">
					<button
						type="button" onClick={() => setIsSearchOpen((prev) => !prev)} className="leads-mobile-icon-btn"
						aria-label={isSearchOpen ? "Скрыть поиск" : "Открыть поиск"} data-testid="mobile-leads-search-toggle"
					>
						<Search size={18} />
					</button>

					{(onOpenAnalytics || onOpenLeakDetector) && (
						<div className="relative inline-flex" ref={mobileMenuRef}>
							<button
								type="button" onClick={() => setIsMobileMenuOpen((prev) => !prev)} className="leads-mobile-icon-btn"
								aria-label="Дополнительные функции воронки" data-testid="mobile-leads-more-btn" title="Дополнительные функции"
							>
								<MoreVertical size={18} />
							</button>

							{isMobileMenuOpen && (
								<div className="leads-mobile-menu-dropdown" role="menu">
									{onOpenAnalytics && (
										<button
											type="button" className="leads-mobile-menu-item"
											onClick={() => { setIsMobileMenuOpen(false); onOpenAnalytics(); }}
											data-testid="mobile-open-analytics-btn"
										>
											<BarChart3 size={16} className="text-[var(--teal)] shrink-0" />
											<span>Аналитика воронки</span>
										</button>
									)}
									{onOpenLeakDetector && (
										<button
											type="button" className="leads-mobile-menu-item"
											onClick={() => { setIsMobileMenuOpen(false); onOpenLeakDetector(); }}
											data-testid="mobile-open-leak-detector-btn"
										>
											<RotateCcw size={16} className="text-[var(--teal)] shrink-0" />
											<span>Детектор оттока (&gt;210 дней)</span>
										</button>
									)}
								</div>
							)}
						</div>
					)}
				</div>
			</div>

			{isSearchOpen && (
				<div className="leads-mobile-search-bar">
					<div className="dente-search-wrap leads-mobile-search-input-wrap">
						<Search size={16} className="dente-search-icon" />
						<input
							type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
							placeholder="Поиск по имени, телефону или жалобе..." className="dente-search-input leads-mobile-search-input"
							autoFocus data-testid="mobile-leads-search-input"
						/>
						{searchQuery && (
							<button type="button" onClick={() => setSearchQuery("")} className="dente-search-clear" aria-label="Очистить поиск">
								<X size={15} />
							</button>
						)}
					</div>
				</div>
			)}
		</>
	);
};
