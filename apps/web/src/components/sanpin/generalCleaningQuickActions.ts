import type { CreateGeneralCleaningLogDto } from "@dental/shared";
import { readDenteClinicToken, readDenteStaffToken } from "../../lib/safeLocalStorage.js";
import { showToast } from "../GlobalToast.js";

export async function executeAutopilotMonthCleaning(
	onSuccess: () => Promise<void>,
	setLoading: (val: boolean) => void,
): Promise<void> {
	try {
		setLoading(true);
		const clinicToken = readDenteClinicToken();
		const staffToken = readDenteStaffToken();
		const res = await fetch("/api/registers/cleaning/autopilot-month", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...(clinicToken ? { Authorization: `Bearer ${clinicToken}` } : {}),
				...(staffToken ? { "X-Staff-Token": staffToken } : {}),
			},
			body: JSON.stringify({}),
		});
		if (res.ok) {
			const data = await res.json().catch(() => ({}));
			showToast(`График генеральных уборок на месяц успешно заполнен (${data.count || 20} уборок, интервал 7 дней)`, "success");
			await onSuccess();
		} else {
			const err = await res.json().catch(() => ({}));
			showToast(err.message || "Ошибка при генерации графика", "error");
		}
	} catch (err) {
		showToast("Сетевая ошибка при генерации графика", "error");
	} finally {
		setLoading(false);
	}
}

export async function executeQuickRecordNormCleaning(
	onSuccess: () => Promise<void>,
	setSubmitting: (val: boolean) => void,
): Promise<void> {
	try {
		setSubmitting(true);
		const clinicToken = readDenteClinicToken();
		const staffToken = readDenteStaffToken();
		const payload: CreateGeneralCleaningLogDto = {
			cleaningType: "general",
			scheduledDate: new Date().toISOString().slice(0, 10),
			actualDateTime: new Date().toISOString(),
			roomName: "Операционная / Хирургический кабинет №1",
			treatedAreaM2: 32.5,
			disinfectantName: "Аламинол 5%",
			activeIngredient: "Алкилдиметилбензиламмоний хлорид + Глутаровый альдегид",
			solutionConcentrationPercent: 5.0,
			applicationMethod: "wiping",
			exposureTimeMinutes: 60,
			uvIrradiationMinutes: 120,
			ventilationMinutes: 15,
			status: "completed",
			notes: "Уборка по графику выполнена: Дезсредство Аламинол 5%, экспозиция 60 мин, УФ 120 мин, проветривание 15 мин. Поверхности чистые.",
		};

		const res = await fetch("/api/registers/cleaning", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...(clinicToken ? { Authorization: `Bearer ${clinicToken}` } : {}),
				...(staffToken ? { "X-Staff-Token": staffToken } : {}),
			},
			body: JSON.stringify(payload),
		});

		if (res.ok) {
			showToast("Уборка по норме успешно зафиксирована (Аламинол 5%, 60 мин, УФ 120 мин)", "success");
			await onSuccess();
		} else {
			const err = await res.json().catch(() => ({}));
			showToast(err.message || "Ошибка при фиксации уборки", "error");
		}
	} catch (err) {
		showToast("Сетевая ошибка при фиксации уборки", "error");
	} finally {
		setSubmitting(false);
	}
}

export async function verifyCleaningLogRecord(id: string, onSuccess: () => void): Promise<void> {
	try {
		const clinicToken = readDenteClinicToken();
		const staffToken = readDenteStaffToken();
		const res = await fetch(`/api/registers/cleaning/${id}/verify`, {
			method: "PUT",
			headers: {
				...(clinicToken ? { Authorization: `Bearer ${clinicToken}` } : {}),
				...(staffToken ? { "X-Staff-Token": staffToken } : {}),
			},
		});
		if (res.ok) {
			showToast("Качество уборки заверено ответственным лицом", "success");
			onSuccess();
		}
	} catch (err) {
		showToast("Ошибка при подтверждении", "error");
	}
}
