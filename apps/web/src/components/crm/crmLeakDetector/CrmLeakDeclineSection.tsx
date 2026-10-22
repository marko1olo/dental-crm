import type React from "react";
import { X } from "lucide-react";
import { type CrmDeclineReason, type CrmLeakLeadItem, DECLINE_REASON_LABELS_RU } from "@dental/shared";

interface Props {
	lead: CrmLeakLeadItem;
	reason: CrmDeclineReason;
	onReasonChange: (reason: CrmDeclineReason) => void;
	comment: string;
	onCommentChange: (comment: string) => void;
	onSave: () => void;
	onClose: () => void;
}

export const CrmLeakDeclineSection: React.FC<Props> = ({
	lead,
	reason,
	onReasonChange,
	comment,
	onCommentChange,
	onSave,
	onClose,
}) => {
	return (
		<div className="p-4 bg-[var(--paper-soft)] border-b border-[var(--line)]">
			<div className="flex items-center justify-between mb-2">
				<h4 className="m-0 text-sm font-bold text-red-600 flex items-center gap-2">
					<X size={15} />
					<span>Причина отказа: {lead.patientFullName}</span>
				</h4>
				<button type="button" className="icon-button" onClick={onClose}>
					<X size={14} />
				</button>
			</div>
			<div className="space-y-3">
				<div>
					<label className="text-xs font-semibold text-[var(--muted)] block mb-1">
						Причина отказа:
					</label>
					<select
						className="cld-filter-select w-full"
						value={reason}
						onChange={(e) => onReasonChange(e.target.value as any)}
					>
						{Object.entries(DECLINE_REASON_LABELS_RU).map(([code, label]) => (
							<option key={code} value={code}>
								{label}
							</option>
						))}
					</select>
				</div>
				<div>
					<label className="text-xs font-semibold text-[var(--muted)] block mb-1">
						Комментарий:
					</label>
					<textarea
						rows={2}
						className="w-full p-2 border border-[var(--line)] rounded-lg text-xs bg-[var(--paper)] text-[var(--ink)]"
						placeholder="Пояснение пациента..."
						value={comment}
						onChange={(e) => onCommentChange(e.target.value)}
					/>
				</div>
				<div className="flex justify-end gap-2 pt-2">
					<button type="button" className="secondary-button" onClick={onClose}>
						Отмена
					</button>
					<button
						type="button"
						className="primary-button !bg-red-600 !border-red-600 text-white"
						onClick={onSave}
					>
						Зафиксировать отказ
					</button>
				</div>
			</div>
		</div>
	);
};
