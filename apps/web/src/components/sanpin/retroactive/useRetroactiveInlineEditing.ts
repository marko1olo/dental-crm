import { useState } from "react";
import { showToast } from "../../GlobalToast";
import type { RetroactiveDayRecord } from "../retroactiveSanpinEngine";

export function useRetroactiveInlineEditing({
	setGeneratedDays,
}: {
	setGeneratedDays: React.Dispatch<React.SetStateAction<RetroactiveDayRecord[]>>;
}) {
	const [editingDayId, setEditingDayId] = useState<string | null>(null);
	const [editFormData, setEditFormData] = useState<Partial<RetroactiveDayRecord>>({});
	const [pendingDeleteDayId, setPendingDeleteDayId] = useState<string | null>(null);

	const startEditing = (day: RetroactiveDayRecord) => {
		setEditingDayId(day.id);
		setEditFormData({ ...day });
	};

	const saveEditing = (dayId: string) => {
		setGeneratedDays((prev) =>
			prev.map((d) => (d.id === dayId ? ({ ...d, ...editFormData } as RetroactiveDayRecord) : d)),
		);
		setEditingDayId(null);
		setEditFormData({});
		showToast("Параметры смены успешно обновлены", "success");
	};

	const cancelEditing = () => {
		setEditingDayId(null);
		setEditFormData({});
	};

	const requestDeleteDay = (dayId: string) => {
		setPendingDeleteDayId(dayId);
	};

	const confirmDeleteDay = (dayId: string) => {
		setGeneratedDays((prev) => prev.filter((d) => d.id !== dayId));
		setPendingDeleteDayId(null);
		showToast("Смена удалена из пакета", "info");
	};

	const cancelDeleteDay = () => {
		setPendingDeleteDayId(null);
	};

	return {
		editingDayId, editFormData, setEditFormData, pendingDeleteDayId,
		startEditing, saveEditing, cancelEditing,
		requestDeleteDay, confirmDeleteDay, cancelDeleteDay, setEditingDayId,
	};
}
