import React from "react";
import {
	type DentalLabOrderRecord,
	DENTAL_LAB_CONSTRUCTIONS,
	DENTAL_LAB_STATUSES,
	detectLabDeadlineAlert,
	formatFdiTeethDisplay,
	getNextLabStatus,
} from "./dentalLabOrderEngine";
import { TrackerCardHeader } from "./trackerCardModules/TrackerCardHeader";
import { TrackerCardBody } from "./trackerCardModules/TrackerCardBody";
import { TrackerCardActions } from "./trackerCardModules/TrackerCardActions";

export interface DentalLabTrackerCardProps {
	readonly order: DentalLabOrderRecord;
	readonly openActionMenuId: string | null;
	readonly setOpenActionMenuId: React.Dispatch<React.SetStateAction<string | null>>;
	readonly handleOpenReadyInClinicPrompt: (order: DentalLabOrderRecord) => void;
	readonly handleAdvanceStatus: (orderId: string) => void;
	readonly handleOpenEditOrder: (order: DentalLabOrderRecord) => void;
	readonly handleWarrantyRework: (orderId: string) => void;
}

export const DentalLabTrackerCard: React.FC<DentalLabTrackerCardProps> = ({
	order,
	openActionMenuId,
	setOpenActionMenuId,
	handleOpenReadyInClinicPrompt,
	handleAdvanceStatus,
	handleOpenEditOrder,
	handleWarrantyRework,
}) => {
	const stDef = DENTAL_LAB_STATUSES[order.status];
	const construction = DENTAL_LAB_CONSTRUCTIONS[order.constructionType];
	const nextStatus = getNextLabStatus(order.status);
	const alert = detectLabDeadlineAlert({
		status: order.status,
		deadlineDate: order.deadlineDate,
		scheduledVisitDate: order.scheduledVisitDate,
		patientName: order.patientName,
		toothNotation: formatFdiTeethDisplay(order.teethFdi),
	});

	return (
		<div className="bg-[var(--paper,#ffffff)] border border-[var(--line,#cbd5e1)] hover:border-teal-500/50 rounded-xl p-3 shadow-2xs transition-all flex flex-col justify-between gap-2.5 relative group">
			<TrackerCardHeader order={order} stDef={stDef} />
			<TrackerCardBody order={order} construction={construction} />
			<TrackerCardActions
				order={order}
				alert={alert}
				nextStatus={nextStatus}
				openActionMenuId={openActionMenuId}
				setOpenActionMenuId={setOpenActionMenuId}
				handleOpenReadyInClinicPrompt={handleOpenReadyInClinicPrompt}
				handleAdvanceStatus={handleAdvanceStatus}
				handleOpenEditOrder={handleOpenEditOrder}
				handleWarrantyRework={handleWarrantyRework}
			/>
		</div>
	);
};
