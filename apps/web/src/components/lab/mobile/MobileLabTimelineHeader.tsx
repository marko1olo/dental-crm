import React from "react";
import { FlaskConical, Layers, RefreshCw, Search, X } from "lucide-react";

export interface MobileLabTimelineHeaderProps {
	readonly searchQuery: string;
	readonly setSearchQuery: (q: string) => void;
	readonly statusFilter: string;
	readonly setStatusFilter: (s: string) => void;
	readonly filterTabs: readonly { id: string; label: string; count: number }[];
	readonly isLoading: boolean;
	readonly onRefresh: () => void;
	readonly onOpenTrackerModal: () => void;
}

export function MobileLabTimelineHeader(props: MobileLabTimelineHeaderProps): React.JSX.Element {
	const {
		searchQuery, setSearchQuery, statusFilter, setStatusFilter,
		filterTabs, isLoading, onRefresh, onOpenTrackerModal,
	} = props;

	return (
		<>
			<header className="mobile-lab-top-bar">
				<div className="mobile-lab-brand">
					<div className="mobile-lab-brand-icon">
						<FlaskConical size={18} className="text-[var(--primary)]" />
					</div>
					<div className="mobile-lab-brand-title">Наряды в лабораторию</div>
				</div>
				<div className="mobile-lab-top-actions">
					<button
						type="button"
						onClick={onRefresh}
						className="mobile-lab-icon-btn"
						aria-label="Обновить наряды"
						title="Обновить наряды"
					>
						<RefreshCw size={18} className={isLoading ? "animate-spin text-[var(--primary)]" : "text-[var(--ink-muted)]"} />
					</button>
					<button
						type="button"
						onClick={onOpenTrackerModal}
						className="mobile-lab-icon-btn"
						aria-label="Трекер этапов"
						title="Трекер этапов лаборатории"
						data-testid="mobile-lab-open-tracker-btn"
					>
						<Layers size={18} className="text-[var(--ink-muted)]" />
					</button>
				</div>
			</header>

			<div className="mobile-lab-search-container">
				<div className="mobile-lab-search-box">
					<Search size={16} className="mobile-lab-search-icon" />
					<input
						type="text"
						placeholder="Поиск по наряду, пациенту..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="mobile-lab-search-input"
						data-testid="mobile-lab-search-input"
					/>
					{searchQuery && (
						<button
							type="button"
							onClick={() => setSearchQuery("")}
							className="mobile-lab-search-clear"
							aria-label="Очистить поиск"
						>
							<X size={16} />
						</button>
					)}
				</div>
			</div>

			<div className="mobile-lab-chips-scroller" role="tablist" aria-label="Фильтры статусов лаборатории">
				{filterTabs.map((tab) => {
					const isActive = statusFilter === tab.id;
					return (
						<button
							key={tab.id}
							type="button"
							role="tab"
							aria-selected={isActive}
							onClick={() => setStatusFilter(tab.id)}
							className={`mobile-lab-chip ${isActive ? "is-active" : ""}`}
							data-testid={`mobile-lab-filter-chip-${tab.id}`}
						>
							<span>{tab.label}</span>
							<span className="mobile-lab-chip-count">{tab.count}</span>
						</button>
					);
				})}
			</div>
		</>
	);
}
