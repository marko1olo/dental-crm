/**
 * DENTE Dental CRM — Column Focus Batch Doctor Assignment
 * Mandate 8b (<= 120 lines)
 */

import React from "react";
import type { BookableDoctor } from "../leadsKanbanBooking";

interface ColumnFocusBatchDoctorAssignProps {
	staff: BookableDoctor[];
	batchTargetDoctorId: string;
	onBatchTargetDoctorIdChange: (id: string) => void;
	onBatchAssign: () => void;
	isProcessingBatch: boolean;
}

export const ColumnFocusBatchDoctorAssign: React.FC<ColumnFocusBatchDoctorAssignProps> = ({
	staff,
	batchTargetDoctorId,
	onBatchTargetDoctorIdChange,
	onBatchAssign,
	isProcessingBatch,
}) => {
	if (staff.length === 0) return null;

	return (
		<div className="flex items-center gap-1.5">
			<select
				value={batchTargetDoctorId}
				onChange={(e) => onBatchTargetDoctorIdChange(e.target.value)}
				disabled={isProcessingBatch}
				className="expanded-focus-bulk-select"
			>
				<option value="">Назначить врача...</option>
				{staff.map((doc) => (
					<option key={doc.id} value={doc.id}>
						{doc.fullName || doc.name}
					</option>
				))}
			</select>
			{batchTargetDoctorId && (
				<button
					type="button"
					onClick={onBatchAssign}
					disabled={isProcessingBatch}
					className="expanded-focus-bulk-confirm-btn"
				>
					Применить
				</button>
			)}
		</div>
	);
};
