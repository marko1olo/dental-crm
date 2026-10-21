/**
 * DENTE Dental CRM — Leads Drag and Drop and Quick Status Hook
 * Mandate 8b (<= 120 lines)
 */

import { useState } from "react";
import type { Lead } from "../../../store/leadsStore";
import { showToast } from "../../GlobalToast";
import { STAGE_DISPLAY_LABELS } from "../leadsKanbanConstants";

export function useLeadDragAndDrop(
	updateLeadStatus: (
		leadId: string,
		nextStatus: Lead["status"],
		options?: any,
	) => Promise<any>,
) {
	const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);

	const handleDragStart = (e: React.DragEvent, id: string) => {
		e.dataTransfer.setData("leadId", id);
		setDraggedLeadId(id);
	};

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
	};

	const handleDrop = (e: React.DragEvent, status: Lead["status"]) => {
		e.preventDefault();
		const id = e.dataTransfer?.getData("leadId") || draggedLeadId;
		if (id) {
			const options =
				status === "trash" ? { dropReason: "Отказ / Неактуально" } : undefined;
			void updateLeadStatus(id, status, options)
				.then(() => {
					showToast(
						`Обращение переведено в ${STAGE_DISPLAY_LABELS[status] || status}.`,
						"success",
					);
				})
				.catch((err: unknown) => {
					const text =
						err instanceof Error && err.message.trim()
							? err.message
							: "Статус обращения не изменён.";
					showToast(text, "error");
				});
		}
		setDraggedLeadId(null);
	};

	const handleQuickStatusChange = async (
		e: React.MouseEvent | React.ChangeEvent<HTMLSelectElement>,
		leadId: string,
		nextStatus: Lead["status"],
		options?: { reason?: string; dropReason?: string },
	) => {
		e.stopPropagation();
		try {
			await updateLeadStatus(leadId, nextStatus, options);
			showToast(
				`Статус изменен на ${STAGE_DISPLAY_LABELS[nextStatus] || nextStatus}`,
				"success",
			);
		} catch (err: unknown) {
			const text =
				err instanceof Error && err.message.trim()
					? err.message
					: "Статус обращения не изменён.";
			showToast(text, "error");
		}
	};

	return {
		draggedLeadId,
		handleDragStart,
		handleDragOver,
		handleDrop,
		handleQuickStatusChange,
	};
}
