import type { SterilizerEquipmentStatus } from "@dental/shared";
import {
	Archive,
	CheckCircle2,
	Plus,
	RefreshCw,
	Search,
	Wrench,
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
				<div style={{ position: "relative", minWidth: "200px", maxWidth: "340px", flex: "1 1 auto" }}>
					<Search
						size={14}
						style={{
							position: "absolute",
							left: "0.6rem",
							top: "50%",
							transform: "translateY(-50%)",
							color: "var(--muted, #94a3b8)",
						}}
					/>
					<input
						type="text"
						placeholder="Поиск по марке, названию, серийному №..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="sanpin-input"
						style={{ paddingLeft: "1.9rem", height: "34px", fontSize: "0.8rem", width: "100%", borderRadius: "6px" }}
					/>
				</div>

				<div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
					<button
						type="button"
						onClick={() => setStatusFilter("all")}
						className="sanpin-btn touch-manipulation"
						style={{
							minHeight: "32px",
							padding: "0.2rem 0.55rem",
							fontSize: "0.775rem",
							fontWeight: statusFilter === "all" ? 700 : 500,
							background: statusFilter === "all" ? "var(--teal)" : "transparent",
							color: statusFilter === "all" ? "var(--on-teal, #ffffff)" : "var(--ink, #0f172a)",
							border: "1px solid var(--line, #e2e8f0)",
							borderRadius: "6px",
							cursor: "pointer",
						}}
					>
						Все ({stats.total})
					</button>

					<button
						type="button"
						onClick={() => setStatusFilter("active")}
						className="sanpin-btn touch-manipulation"
						style={{
							minHeight: "32px",
							padding: "0.2rem 0.55rem",
							fontSize: "0.775rem",
							fontWeight: statusFilter === "active" ? 700 : 500,
							background: statusFilter === "active" ? "var(--ok-fg)" : "transparent",
							color: statusFilter === "active" ? "var(--on-teal, #ffffff)" : "var(--ink, #0f172a)",
							border: "1px solid var(--line, #e2e8f0)",
							borderRadius: "6px",
							cursor: "pointer",
						}}
					>
						<CheckCircle2 size={13} style={{ display: "inline-block", verticalAlign: "middle", marginRight: "0.25rem" }} />
						В работе ({stats.active})
					</button>

					<button
						type="button"
						onClick={() => setStatusFilter("in_maintenance")}
						className="sanpin-btn touch-manipulation"
						style={{
							minHeight: "32px",
							padding: "0.2rem 0.55rem",
							fontSize: "0.775rem",
							fontWeight: statusFilter === "in_maintenance" ? 700 : 500,
							background: statusFilter === "in_maintenance" ? "var(--warn-fg)" : "transparent",
							color: statusFilter === "in_maintenance" ? "var(--on-teal, #ffffff)" : "var(--ink, #0f172a)",
							border: "1px solid var(--line, #e2e8f0)",
							borderRadius: "6px",
							cursor: "pointer",
						}}
					>
						<Wrench size={13} style={{ display: "inline-block", verticalAlign: "middle", marginRight: "0.25rem" }} />
						На ТО ({stats.inMaint})
					</button>

					{stats.decom > 0 && (
						<button
							type="button"
							onClick={() => setStatusFilter("decommissioned")}
							className="sanpin-btn touch-manipulation"
							style={{
								minHeight: "32px",
								padding: "0.2rem 0.55rem",
								fontSize: "0.775rem",
								fontWeight: statusFilter === "decommissioned" ? 700 : 500,
								background: statusFilter === "decommissioned" ? "var(--bad-fg)" : "transparent",
								color: statusFilter === "decommissioned" ? "var(--on-teal, #ffffff)" : "var(--ink, #0f172a)",
								border: "1px solid var(--line, #e2e8f0)",
								borderRadius: "6px",
								cursor: "pointer",
							}}
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
