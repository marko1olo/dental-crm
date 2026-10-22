import type { SterilizerEquipment } from "@dental/shared";
import type React from "react";
import { SterilizerFleetCard } from "./SterilizerFleetCard";

export interface SterilizerFleetCardsGridProps {
	readonly equipments: readonly SterilizerEquipment[];
	readonly todayStr: string;
	readonly in30Days: string;
	readonly onEdit: (item: SterilizerEquipment) => void;
	readonly onToggleMaintenance: (item: SterilizerEquipment) => void;
	readonly onDecommission: (item: SterilizerEquipment) => void;
	readonly onDelete: (item: SterilizerEquipment) => void;
}

export const SterilizerFleetCardsGrid: React.FC<SterilizerFleetCardsGridProps> = ({
	equipments,
	todayStr,
	in30Days,
	onEdit,
	onToggleMaintenance,
	onDecommission,
	onDelete,
}) => {
	return (
		<div
			style={{
				display: "grid",
				gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
				gap: "0.75rem",
			}}
		>
			{equipments.map((item) => (
				<SterilizerFleetCard
					key={item.id}
					item={item}
					onEdit={onEdit}
					onToggleMaintenance={onToggleMaintenance}
					onDecommission={onDecommission}
					onDelete={onDelete}
					todayStr={todayStr}
					in30Days={in30Days}
				/>
			))}
		</div>
	);
};
