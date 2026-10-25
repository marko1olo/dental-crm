import React from "react";
import { ArrowRight } from "lucide-react";
import type { WaitingLoungeQueueItem } from "./loungeTypes";
import { BillboardStatusSelector } from "./BillboardStatusSelector";
import "./loungeCabinetRow.css";

export interface BillboardCabinetRowProps {
	readonly item: WaitingLoungeQueueItem;
}

export const BillboardCabinetRow: React.FC<BillboardCabinetRowProps> = ({ item }) => {
	const isCalling = item.status === "calling";

	return (
		<div
			className={`lounge-cabinet-item ${isCalling ? "lounge-cabinet-item--calling" : ""}`.trim()}
			data-testid={`lounge-row-${item.id}`}
		>
			<div className="lounge-cabinet-meta">
				<span className="lounge-cabinet-number">{item.cabinetNumber}</span>
				{item.cabinetName && (
					<span className="lounge-cabinet-spec">{item.cabinetName}</span>
				)}
			</div>

			<div className="lounge-doctor-meta">
				<span className="lounge-doctor-name">{item.doctorName}</span>
				{item.doctorRole && (
					<span className="lounge-doctor-role">{item.doctorRole}</span>
				)}
			</div>

			<div className="lounge-flow-arrow" aria-hidden="true">
				<ArrowRight size={20} />
			</div>

			<div className="lounge-patient-meta">
				<span className="lounge-patient-label">Пациент</span>
				<span className="lounge-patient-name">{item.patientName}</span>
			</div>

			<div className="lounge-status-wrap">
				<BillboardStatusSelector
					status={item.status}
					scheduledTime={item.scheduledTime}
				/>
			</div>
		</div>
	);
};
