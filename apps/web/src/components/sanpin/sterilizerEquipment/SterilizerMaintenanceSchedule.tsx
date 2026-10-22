import React from "react";
import { SterilizerMaintenanceDatesGrid } from "./SterilizerMaintenanceDatesGrid.js";
import { SterilizerQuickStatusActions } from "./SterilizerQuickStatusActions.js";
import { SterilizerRegulatedChecklistCard } from "./SterilizerRegulatedChecklistCard.js";
import type { SterilizerFormData } from "./types.js";

export interface SterilizerMaintenanceScheduleProps {
	readonly formData: SterilizerFormData;
	readonly onFieldChange: <K extends keyof SterilizerFormData>(field: K, value: SterilizerFormData[K]) => void;
	readonly isEditing: boolean;
	readonly submitting: boolean;
	readonly onQuickMaintenance: () => void;
	readonly onQuickReturnToService: () => void;
	readonly onQuickDecommission: (reason?: string) => void;
	readonly decommissionReason: string;
	readonly setDecommissionReason: (r: string) => void;
	readonly showDecommissionConfirm: boolean;
	readonly setShowDecommissionConfirm: (show: boolean) => void;
}

export function SterilizerMaintenanceSchedule({
	formData,
	onFieldChange,
	isEditing,
	submitting,
	onQuickMaintenance,
	onQuickReturnToService,
	onQuickDecommission,
	decommissionReason,
	setDecommissionReason,
	showDecommissionConfirm,
	setShowDecommissionConfirm,
}: SterilizerMaintenanceScheduleProps) {
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
			<SterilizerMaintenanceDatesGrid
				formData={formData}
				onFieldChange={onFieldChange}
			/>

			<SterilizerRegulatedChecklistCard />

			{isEditing && (
				<SterilizerQuickStatusActions
					status={formData.status}
					submitting={submitting}
					onQuickMaintenance={onQuickMaintenance}
					onQuickReturnToService={onQuickReturnToService}
					onQuickDecommission={onQuickDecommission}
					decommissionReason={decommissionReason}
					setDecommissionReason={setDecommissionReason}
					showDecommissionConfirm={showDecommissionConfirm}
					setShowDecommissionConfirm={setShowDecommissionConfirm}
				/>
			)}
		</div>
	);
}
