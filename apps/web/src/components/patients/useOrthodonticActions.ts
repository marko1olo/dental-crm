import type React from "react";
import { actionFailureToast } from "../../lib/panelStateText";
import { logger } from "../../utils/logger";
import { showToast } from "../GlobalToast";
import { type OrthoData, serializeOrthoProgress } from "./orthodonticProgressSerialization";

type UseOrthodonticActionsProps = {
	patientId: string; patient: any; ortho: OrthoData | null; legacyOrtho: OrthoData | null;
	cleanNotes: string; saving: boolean; setSaving: (saving: boolean) => void;
	setIsEditing: (editing: boolean) => void; loadDashboard: () => Promise<void>; auth: any;
};

export function useOrthodonticActions({
	patientId, patient, ortho, legacyOrtho, cleanNotes, saving, setSaving, setIsEditing, loadDashboard, auth,
}: UseOrthodonticActionsProps) {
	const handleSave = async (e: React.FormEvent, formCurrent: number, formTotal: number, formStart: string) => {
		e.preventDefault();
		if (formCurrent < 1 || formTotal < 1 || formCurrent > formTotal) {
			showToast("Некорректные значения капп", "error");
			return;
		}
		setSaving(true);
		try {
			const updatedOrtho: OrthoData = { currentAligner: formCurrent, totalAligners: formTotal, startDate: formStart };
			const adminProfile = patient.administrativeProfile || {};
			const resAdmin = await fetch(`/api/patients/${patientId}/administrative-profile`, {
				method: "PUT",
				headers: auth.denteClinicalMutationHeaders({ "Content-Type": "application/json" }),
				body: JSON.stringify({ ...adminProfile, orthodonticProgress: serializeOrthoProgress(updatedOrtho) }),
			});
			if (!resAdmin.ok) {
				showToast(`${actionFailureToast("Отсчёт капп не сохранён", resAdmin.status)} Пока запишите этап лечения в заметку к пациенту.`, "error");
				return;
			}
			if (legacyOrtho) {
				await fetch(`/api/patients/${patientId}`, {
					method: "PUT",
					headers: auth.denteClinicalMutationHeaders({ "Content-Type": "application/json" }),
					body: JSON.stringify({ notes: cleanNotes }),
				});
			}
			showToast("Ортодонтический этап обновлен", "success");
			setIsEditing(false);
			await loadDashboard();
		} catch (err) {
			logger.error("[OrthodonticProgressWidget save]", err);
			showToast(`${actionFailureToast("Отсчёт капп не сохранён", null)} Попробуйте позже.`, "error");
		} finally {
			setSaving(false);
		}
	};

	const handleResetWidget = async () => {
		setSaving(true);
		try {
			const adminProfile = patient.administrativeProfile || {};
			const resAdmin = await fetch(`/api/patients/${patientId}/administrative-profile`, {
				method: "PUT",
				headers: auth.denteClinicalMutationHeaders({ "Content-Type": "application/json" }),
				body: JSON.stringify({ ...adminProfile, orthodonticProgress: null }),
			});
			if (!resAdmin.ok) {
				showToast(`${actionFailureToast("Отсчёт капп не убран", resAdmin.status)} Каппы остались в карточке.`, "error");
				return;
			}
			if (legacyOrtho) {
				await fetch(`/api/patients/${patientId}`, {
					method: "PUT",
					headers: auth.denteClinicalMutationHeaders({ "Content-Type": "application/json" }),
					body: JSON.stringify({ notes: cleanNotes }),
				});
			}
			showToast("Трекер ортодонтии удален", "success");
			setIsEditing(false);
			await loadDashboard();
		} catch (err) {
			logger.error("[OrthodonticProgressWidget reset]", err);
			showToast(`${actionFailureToast("Отсчёт капп не убран", null)} Каппы остались в карточке.`, "error");
		} finally {
			setSaving(false);
		}
	};

	const handleQuickIncrement = async (count: number) => {
		if (!ortho || saving) return;
		const nextCurrent = Math.min(ortho.totalAligners, ortho.currentAligner + count);
		if (nextCurrent === ortho.currentAligner) return;
		setSaving(true);
		try {
			const updatedOrtho: OrthoData = { ...ortho, currentAligner: nextCurrent };
			const adminProfile = patient.administrativeProfile || {};
			const resAdmin = await fetch(`/api/patients/${patientId}/administrative-profile`, {
				method: "PUT",
				headers: auth.denteClinicalMutationHeaders({ "Content-Type": "application/json" }),
				body: JSON.stringify({ ...adminProfile, orthodonticProgress: serializeOrthoProgress(updatedOrtho) }),
			});
			if (resAdmin.ok) {
				showToast(`Каппа №${nextCurrent} зафиксирована (+${count})`, "success");
				await loadDashboard();
			} else {
				showToast("Не удалось обновить номер каппы", "error");
			}
		} catch (err) {
			logger.error("[OrthodonticProgressWidget quickIncrement]", err);
			showToast("Ошибка сети при смене каппы", "error");
		} finally {
			setSaving(false);
		}
	};

	return { handleSave, handleResetWidget, handleQuickIncrement };
}
