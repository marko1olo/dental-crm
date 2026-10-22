import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import { showToast } from "../../GlobalToast";
import type { QuickAddChairData } from "./types";

export async function submitChairData(params: {
	isEditMode: boolean;
	finalName: string;
	payload: QuickAddChairData;
	initialData?: QuickAddChairData | null | undefined;
	onUpdateChair?: ((chairData: QuickAddChairData) => Promise<void> | void) | undefined;
	onAddChair?: ((chairData: QuickAddChairData) => Promise<void> | void) | undefined;
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

export async function duplicateChairData(params: {
	baseName: string;
	roomNumber: string;
	defaultRoomName: string;
	selectedSpecialty: string;
	selectedColor: string;
	isActive: boolean;
	defaultDoctorId: string;
	branchId?: string | undefined;
	onAddChair?: ((chairData: QuickAddChairData) => Promise<void> | void) | undefined;
	onClose: () => void;
}) {
	const {
		baseName, roomNumber, defaultRoomName, selectedSpecialty,
		selectedColor, isActive, defaultDoctorId, branchId, onAddChair, onClose,
	} = params;
	const duplicatedName = `${baseName} (копия)`;
	const finalRoom = roomNumber.trim() || defaultRoomName;
	const payload: QuickAddChairData = {
		name: duplicatedName,
		room: finalRoom,
		specialization: selectedSpecialty,
		color: selectedColor,
		isActive,
		defaultDoctorId: defaultDoctorId.trim() || null,
		...(branchId ? { branchId } : {}),
	};
	try {
		if (onAddChair) {
			await Promise.resolve(onAddChair(payload));
		} else {
			await fetch("/api/settings/chairs", {
				method: "POST",
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
