/**
 * DENTE Dental CRM — Leads Mobile Top Header & Search Bar
 * Mandate 8b (<= 120 lines)
 */

import { Search, X } from "lucide-react";
import React from "react";
import { LeadsMobileMenuDropdown } from "./LeadsMobileMenuDropdown";

interface LeadsMobileTopBarProps {
	isSearchOpen: boolean;
	setIsSearchOpen: React.Dispatch<React.SetStateAction<boolean>>;
	searchQuery: string;
	setSearchQuery: (q: string) => void;
	onOpenAnalytics?: (() => void) | undefined;
	onOpenLeakDetector?: (() => void) | undefined;
}

export const LeadsMobileTopBar: React.FC<LeadsMobileTopBarProps> = ({
	isSearchOpen,
	setIsSearchOpen,
	searchQuery,
	setSearchQuery,
	onOpenAnalytics,
	onOpenLeakDetector,
}) => {
	return (
		<>
			<div className="leads-mobile-header">
				<div className="leads-mobile-header-left">
					<h2
						className="leads-mobile-title"
						title="Воронка обращений и звонков"
					>
						Обращения
					</h2>
					<div
						className="leads-mobile-telemetry"
						title="Сквозная телеметрия обращений и телефонии активна"
					>
						<span className="leads-mobile-telemetry-dot" />
						<span>CRM Live</span>
					</div>
				</div>

				<div className="leads-mobile-header-actions">
					<button
						type="button"
						onClick={() => setIsSearchOpen((prev) => !prev)}
						className="leads-mobile-icon-btn"
						aria-label={isSearchOpen ? "Скрыть поиск" : "Открыть поиск"}
						data-testid="mobile-leads-search-toggle"
					>
						<Search size={18} />
					</button>

					<LeadsMobileMenuDropdown
						onOpenAnalytics={onOpenAnalytics}
						onOpenLeakDetector={onOpenLeakDetector}
					/>
				</div>
			</div>

			{isSearchOpen && (
				<div className="leads-mobile-search-bar">
					<div className="dente-search-wrap leads-mobile-search-input-wrap">
						<Search size={16} className="dente-search-icon" />
						<input
							type="text"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder="Поиск по имени, телефону или жалобе..."
							className="dente-search-input leads-mobile-search-input"
							data-testid="mobile-leads-search-input"
						/>
						{searchQuery && (
							<button
								type="button"
								onClick={() => setSearchQuery("")}
								className="dente-search-clear"
								aria-label="Очистить поиск"
							>
								<X size={15} />
							</button>
						)}
					</div>
				</div>
			)}
		</>
	);
};
