import { useCallback } from "react";
import type { Dashboard } from "@dental/shared";
import type { QuickAddChairData } from "../QuickAddChairModal";
import type { ScheduleChair } from "../ScheduleFilterStrip";
import type { ShiftPresetType } from "../scheduleShiftHelpers";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";

interface Params {
	chairs: ScheduleChair[];
	dashboard?: Dashboard | undefined;
	onAddChair?: ((chairData: QuickAddChairData) => Promise<void> | void) | undefined;
	assignShift: (chair: ScheduleChair, preset: ShiftPresetType, targetDocId?: string) => any;
	onAssignChairDoctor?: ((chairId: string, assignment: any) => void) | undefined;
}

export function useChairEntityOperations({
	chairs, dashboard, onAddChair, assignShift, onAssignChairDoctor,
}: Params) {
	const saveChair = useCallback(
		async (data: QuickAddChairData) => {
			if (onAddChair) {
				await onAddChair(data);
				return;
			}
			const isUpdate = Boolean(data.id);
			const targetId = data.id || `chair-local-${Date.now()}`;
			const targetRoom = data.roomNumber || data.room || `Кабинет ${chairs.length + 1}`;
			const savedChair: any = {
				id: targetId, name: data.name, room: targetRoom, roomNumber: targetRoom,
				specialization: data.specialization || "therapist", color: data.color || "#0d9488",
				active: data.isActive !== false, isActive: data.isActive !== false,
				defaultDoctorId: data.defaultDoctorId || null,
				...(data.branchId ? { branchId: data.branchId } : {}),
			};
			if (dashboard?.clinicSettings) {
				if (!dashboard.clinicSettings.chairs) dashboard.clinicSettings.chairs = [];
				if (isUpdate) {
					dashboard.clinicSettings.chairs = dashboard.clinicSettings.chairs.map((c: any) => (c.id === data.id ? { ...c, ...savedChair } : c));
				} else {
					dashboard.clinicSettings.chairs = [...dashboard.clinicSettings.chairs, savedChair];
				}
			}
			if (typeof window !== "undefined" && typeof fetch === "function") {
				const endpoint = isUpdate ? `/api/settings/chairs/${encodeURIComponent(data.id!)}` : "/api/settings/chairs";
				const method = isUpdate ? "PUT" : "POST";
				try {
					await fetch(endpoint, {
						method,
						headers: { ...denteAdminSecretRequestHeaders(), "Content-Type": "application/json" },
						body: JSON.stringify({
							name: data.name, room: targetRoom, specialization: data.specialization || "therapist",
							color: data.color || "#0d9488", active: data.isActive !== false, defaultDoctorId: data.defaultDoctorId || null,
							...(data.branchId ? { branchId: data.branchId } : {}),
						}),
					});
				} catch {}
			}
			if (data.defaultDoctorId && onAssignChairDoctor) {
				assignShift(savedChair, "full", data.defaultDoctorId);
			}
		},
		[onAddChair, dashboard?.clinicSettings, chairs.length, onAssignChairDoctor, assignShift],
	);

	const duplicateChair = useCallback((chair: ScheduleChair): QuickAddChairData => ({
		name: `${chair.name} (копия)`,
		room: (chair as any).room || (chair as any).roomNumber || "",
		roomNumber: (chair as any).roomNumber || (chair as any).room || "",
		specialization: (chair as any).specialization || "therapist",
		color: (chair as any).color || "#0d9488",
		isActive: (chair as any).active ?? (chair as any).isActive ?? true,
		defaultDoctorId: (chair as any).defaultDoctorId || null,
		branchId: (chair as any).branchId,
	}), []);

	return { saveChair, duplicateChair };
}
