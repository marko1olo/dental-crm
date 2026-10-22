import type { SterilizerEquipmentStatus } from "@dental/shared";
import { Archive, CheckCircle2, Wrench } from "lucide-react";
import React from "react";

export interface SterilizerFleetSegmentedFilterProps {
	readonly statusFilter: "all" | SterilizerEquipmentStatus;
	readonly setStatusFilter: (s: "all" | SterilizerEquipmentStatus) => void;
	readonly stats: {
		readonly total: number;
		readonly active: number;
		readonly inMaint: number;
		readonly decom: number;
	};
}

export function SterilizerFleetSegmentedFilter({
	statusFilter,
	setStatusFilter,
	stats,
}: SterilizerFleetSegmentedFilterProps) {
	return (
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
	);
}
