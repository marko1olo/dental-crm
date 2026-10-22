import type { SterilizerEquipment } from "@dental/shared";
import React from "react";
import { SterilizerEquipmentModal } from "./SterilizerEquipmentModal";
import { SterilizerFleetToolbar } from "./SterilizerFleetToolbar";
import { SterilizerFleetOnboarding } from "./SterilizerFleetOnboarding";
import { SterilizerDecommissionModal } from "./SterilizerDecommissionModal";
import { SterilizerFleetWarningBanner } from "./SterilizerFleetWarningBanner";
import { SterilizerFleetCardsGrid } from "./SterilizerFleetCardsGrid";
import { useSterilizerFleetState } from "./useSterilizerFleetState";

export { SterilizerFleetToolbar } from "./SterilizerFleetToolbar";
export { SterilizerFleetOnboarding } from "./SterilizerFleetOnboarding";
export { SterilizerFleetCard } from "./SterilizerFleetCard";
export { SterilizerDecommissionModal } from "./SterilizerDecommissionModal";

export interface SterilizerFleetManagerProps {
	readonly onEquipmentsChange?: (equipments: SterilizerEquipment[]) => void;
	readonly compactMode?: boolean;
}

export function SterilizerFleetManager({
	onEquipmentsChange,
	compactMode = false,
}: SterilizerFleetManagerProps) {
	const state = useSterilizerFleetState(onEquipmentsChange);
	const todayStr = new Date().toISOString().slice(0, 10);
	const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

	return (
		<div className="sanpin-fleet-container" style={{ display: "flex", flexDirection: "column", gap: "0.75rem", width: "100%" }}>
			<SterilizerFleetToolbar
				searchQuery={state.searchQuery}
				setSearchQuery={state.setSearchQuery}
				statusFilter={state.statusFilter}
				setStatusFilter={state.setStatusFilter}
				stats={state.stats}
				onAddNew={() => {
					state.setEditingItem(null);
					state.setIsModalOpen(true);
				}}
				onRefresh={state.fetchEquipments}
				loading={state.loading}
			/>

			<SterilizerFleetWarningBanner expiredVerificationCount={state.stats.expiredVerification} />

			{!state.loading && state.equipments.length === 0 && (
				<SterilizerFleetOnboarding
					onQuickAddPreset={state.handleQuickAddPreset}
					onAddNew={() => {
						state.setEditingItem(null);
						state.setIsModalOpen(true);
					}}
				/>
			)}

			{!state.loading && state.equipments.length > 0 && (
				<SterilizerFleetCardsGrid
					equipments={state.filteredEquipments}
					todayStr={todayStr}
					in30Days={in30Days}
					onEdit={(it) => {
						state.setEditingItem(it);
						state.setIsModalOpen(true);
					}}
					onToggleMaintenance={state.handleToggleMaintenance}
					onDecommission={state.handleDecommission}
					onDelete={state.handleDelete}
				/>
			)}

			<SterilizerEquipmentModal
				isOpen={state.isModalOpen}
				onClose={() => {
					state.setIsModalOpen(false);
					state.setEditingItem(null);
				}}
				onSuccess={state.fetchEquipments}
				editingEquipment={state.editingItem}
			/>

			<SterilizerDecommissionModal
				target={state.decommissionTarget}
				reason={state.decommissionReason}
				setReason={state.setDecommissionReason}
				submitting={state.decommissionSubmitting}
				onConfirm={() => void state.handleConfirmDecommission()}
				onCancel={() => state.setDecommissionTarget(null)}
			/>
		</div>
	);
}
