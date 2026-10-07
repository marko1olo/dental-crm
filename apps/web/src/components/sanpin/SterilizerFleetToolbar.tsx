import type { SterilizerEquipmentStatus } from "@dental/shared";
import {
	Archive,
	CheckCircle2,
	Plus,
	RefreshCw,
	Search,
	Wrench,
	X,
} from "lucide-react";
import React from "react";

export interface SterilizerFleetToolbarProps {
	readonly searchQuery: string;
	readonly setSearchQuery: (q: string) => void;
	readonly statusFilter: "all" | SterilizerEquipmentStatus;
	readonly setStatusFilter: (s: "all" | SterilizerEquipmentStatus) => void;
	readonly stats: {
		readonly total: number;
		readonly active: number;
		readonly inMaint: number;
		readonly decom: number;
	};
	readonly onAddNew: () => void;
	readonly onRefresh: () => void;
	readonly loading: boolean;
}

export function SterilizerFleetToolbar({
	searchQuery,
	setSearchQuery,
	statusFilter,
	setStatusFilter,
	stats,
	onAddNew,
	onRefresh,
	loading,
}: SterilizerFleetToolbarProps) {
	return (
		<div
			className="sanpin-fleet-toolbar"
			style={{
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				gap: "0.5rem",
				flexWrap: "wrap",
				padding: "0.5rem 0.75rem",
				background: "var(--paper-soft, #f8fafc)",
				border: "1px solid var(--line, #e2e8f0)",
				borderRadius: "8px",
			}}
		>
			{/* Search & Filter */}
			<div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", flex: "1 1 auto" }}>
				<div className="dente-search-wrap" style={{ minWidth: "200px", maxWidth: "340px", flex: "1 1 auto" }}>
					<Search size={14} className="dente-search-icon" />
					<input
						type="text"
						placeholder="Поиск по марке, названию, серийному №..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="dente-search-input !h-8"
					/>
					{searchQuery && (
						<button
							type="button"
							className="dente-search-clear"
							onClick={() => setSearchQuery("")}
							aria-label="Очистить поиск"
						>
							<X size={12} />
						</button>
					)}
				</div>

				<div className="dente-segmented-bar" role="tablist">
					<button
						type="button"
						role="tab"
						aria-selected={statusFilter === "all"}
						onClick={() => setStatusFilter("all")}
						className={`dente-segmented-item ${statusFilter === "all" ? "active" : ""}`}
					>
						Все ({stats.total})
					</button>

					<button
						type="button"
						role="tab"
						aria-selected={statusFilter === "active"}
						onClick={() => setStatusFilter("active")}
						className={`dente-segmented-item ${statusFilter === "active" ? "active" : ""}`}
					>
						<CheckCircle2 size={13} style={{ display: "inline-block", verticalAlign: "middle", marginRight: "0.25rem" }} />
						В работе ({stats.active})
					</button>

					<button
						type="button"
						role="tab"
						aria-selected={statusFilter === "in_maintenance"}
						onClick={() => setStatusFilter("in_maintenance")}
						className={`dente-segmented-item ${statusFilter === "in_maintenance" ? "active" : ""}`}
					>
						<Wrench size={13} style={{ display: "inline-block", verticalAlign: "middle", marginRight: "0.25rem" }} />
						На ТО ({stats.inMaint})
					</button>

					{stats.decom > 0 && (
						<button
							type="button"
							role="tab"
							aria-selected={statusFilter === "decommissioned"}
							onClick={() => setStatusFilter("decommissioned")}
							className={`dente-segmented-item ${statusFilter === "decommissioned" ? "active" : ""}`}
						>
							<Archive size={13} style={{ display: "inline-block", verticalAlign: "middle", marginRight: "0.25rem" }} />
							Списанные ({stats.decom})
						</button>
					)}
				</div>
			</div>

			{/* Primary Action Button */}
			<div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexShrink: 0 }}>
				<button
					type="button"
					onClick={onAddNew}
					className="sanpin-btn sanpin-btn-primary touch-manipulation"
					style={{
						minHeight: "34px",
						padding: "0.3rem 0.85rem",
						fontSize: "0.8rem",
						fontWeight: 700,
						background: "var(--teal)",
						color: "var(--on-teal, #ffffff)",
						border: "none",
						borderRadius: "6px",
						cursor: "pointer",
						display: "inline-flex",
						alignItems: "center",
						gap: "0.3rem",
					}}
					data-testid="add-sterilizer-btn"
				>
					<Plus size={15} />
					<span>Добавить аппарат в парк</span>
				</button>

				<button
					type="button"
					onClick={onRefresh}
					className="sanpin-btn sanpin-btn-secondary touch-manipulation"
					style={{
						minHeight: "34px",
						width: "34px",
						padding: 0,
						borderRadius: "6px",
						display: "inline-flex",
						alignItems: "center",
						justifyContent: "center",
					}}
					title="Обновить реестр оборудования"
				>
					<RefreshCw size={14} className={loading ? "animate-spin" : ""} />
				</button>
			</div>
		</div>
	);
}
