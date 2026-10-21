import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import { showToast } from "../../GlobalToast";
import type { QuickAddChairData } from "./types";

export async function submitChairData(params: {
	isEditMode: boolean;
	finalName: string;
	payload: QuickAddChairData;
	initialData?: QuickAddChairData | null;
	onUpdateChair?: (chairData: QuickAddChairData) => Promise<void> | void;
	onAddChair?: (chairData: QuickAddChairData) => Promise<void> | void;
	onClose: () => void;
}) {
	const { isEditMode, finalName, payload, initialData, onUpdateChair, onAddChair, onClose } = params;
	try {
		if (isEditMode && onUpdateChair) {
			await Promise.resolve(onUpdateChair(payload));
			showToast(`Кресло «${finalName}» успешно обновлено`, "success", 3000);
		} else if (onAddChair) {
			await Promise.resolve(onAddChair(payload));
		} else {
			const endpoint = isEditMode && initialData?.id
				? `/api/settings/chairs/${initialData.id}`
				: "/api/settings/chairs";
			await fetch(endpoint, {
				method: isEditMode ? "PUT" : "POST",
				headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
				body: JSON.stringify({
					name: payload.name,
					room: payload.room,
					specialization: payload.specialization,
					color: payload.color,
					active: payload.isActive,
					defaultDoctorId: payload.defaultDoctorId,
				}),
			}).catch(() => {});
		}
	} finally {
		onClose();
	}
}
