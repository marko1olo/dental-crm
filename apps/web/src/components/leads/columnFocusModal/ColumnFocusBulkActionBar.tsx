/**
 * DENTE Dental CRM — Column Focus Bulk Operations Bar
 * Mandate 8b (<= 120 lines)
 */

import { ArrowRight, Download, X } from "lucide-react";
import type React from "react";
import type { LeadStatus } from "../../../store/leadsStore";
import type { BookableDoctor } from "../leadsKanbanBooking";

interface ColumnFocusBulkActionBarProps {
	selectedLeadIds: Set<string>;
	totalDisplayLeads: number;
	onToggleSelectAll: () => void;
	nextStageInfo?: { status: LeadStatus; label: string } | null | undefined;
	isProcessingBatch: boolean;
	onBatchAdvance: () => void;
	onBatchMoveToStage: (status: LeadStatus) => void;
	staff: BookableDoctor[];
	batchTargetDoctorId: string;
	onBatchTargetDoctorIdChange: (id: string) => void;
	onBatchAssign: () => void;
	onExportCsv: (onlySelected?: boolean) => void;
	onClearSelection: () => void;
}

export const ColumnFocusBulkActionBar: React.FC<
	ColumnFocusBulkActionBarProps
> = ({
	selectedLeadIds,
	totalDisplayLeads,
	onToggleSelectAll,
	nextStageInfo,
	isProcessingBatch,
	onBatchAdvance,
	onBatchMoveToStage,
	staff,
	batchTargetDoctorId,
	onBatchTargetDoctorIdChange,
	onBatchAssign,
	onExportCsv,
	onClearSelection,
}) => {
	if (selectedLeadIds.size === 0) return null;

	return (
		<div className="expanded-focus-bulk-bar" data-testid="focus-bulk-bar">
			<div className="flex items-center gap-2">
				<span className="expanded-focus-bulk-count">
					Выбрано: <strong>{selectedLeadIds.size}</strong> из{" "}
					{totalDisplayLeads}
				</span>
				<button
					type="button"
					onClick={onToggleSelectAll}
					className="expanded-focus-bulk-link"
				>
					{selectedLeadIds.size === totalDisplayLeads
						? "Снять выбор"
						: "Выбрать все"}
				</button>
			</div>

			<div className="expanded-focus-bulk-actions">
				{nextStageInfo && (
					<button
						type="button"
						disabled={isProcessingBatch}
						onClick={onBatchAdvance}
						className="expanded-focus-bulk-primary-btn"
						data-testid="focus-batch-advance-btn"
					>
						<span>
							{nextStageInfo.label} ({selectedLeadIds.size})
						</span>
						<ArrowRight size={13} />
					</button>
				)}

				<select
					onChange={(e) => {
						if (e.target.value) {
							onBatchMoveToStage(e.target.value as LeadStatus);
							e.target.value = "";
						}
					}}
					defaultValue=""
					disabled={isProcessingBatch}
					className="expanded-focus-bulk-select"
				>
					<option value="" disabled>
						Перенести пачку в этап...
					</option>
					<option value="new">1. Новые</option>
					<option value="contacted">2. Квалифицированные</option>
					<option value="consult_booked">3. Консультация</option>
					<option value="showed_up">4. Дошли</option>
					<option value="no_answer">Недозвон</option>
					<option value="trash">Отказ</option>
				</select>

				{staff.length > 0 && (
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
				)}

				<button
					type="button"
					onClick={() => onExportCsv(true)}
					className="expanded-focus-bulk-secondary-btn"
					title="Экспорт выбранных лидов в CSV"
				>
					<Download size={12} />
					<span>Экспорт ({selectedLeadIds.size})</span>
				</button>

				<button
					type="button"
					onClick={onClearSelection}
					className="expanded-focus-bulk-cancel-btn"
					title="Снять выделение"
				>
					<X size={13} />
				</button>
			</div>
		</div>
	);
};
