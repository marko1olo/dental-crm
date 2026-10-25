import { useEffect, useState } from "react";
import { showToast } from "../../GlobalToast.js";
import { actionFailureToast } from "../../../lib/panelStateText.js";
import {
	type LabOrderData,
	labOrderLoadFailureText,
	statusSaveFailureText,
	NETWORK_FAILURE_TEXT,
} from "../guestLabPortalHelpers.js";

export function useGuestLabPortalState(token: string) {
	const [order, setOrder] = useState<LabOrderData | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [isUpdating, setIsUpdating] = useState(false);
	const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
	const [showCourierWaybill, setShowCourierWaybill] = useState(false);

	useEffect(() => {
		let cancelled = false;
		setIsLoading(true);
		setError(null);
		void (async () => {
			try {
				const res = await fetch(`/api/portal/lab-order/${encodeURIComponent(token)}`);
				if (!res.ok) throw new Error(labOrderLoadFailureText(res.status));
				const data = (await res.json()) as LabOrderData;
				if (!cancelled) setOrder(data);
			} catch (e) {
				showToast(actionFailureToast("Ошибка выполнения операции", (e as { status?: number })?.status ?? null), "error");
				if (!cancelled) setError(e instanceof Error ? e.message : NETWORK_FAILURE_TEXT);
			} finally {
				if (!cancelled) setIsLoading(false);
			}
		})();
		return () => { cancelled = true; };
	}, [token]);

	const updateStatus = async (newStatus: string, comments?: string) => {
		if (!token || !order) return;
		try {
			setIsUpdating(true);
			const res = await fetch(`/api/portal/lab-order/${encodeURIComponent(token)}/status`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ status: newStatus, ...(comments ? { labComments: comments } : {}) }),
			});
			if (!res.ok) throw new Error(statusSaveFailureText(res.status));
			const data = (await res.json()) as { success?: boolean; status?: string };
			if (!data.success || typeof data.status !== "string") {
				throw new Error("Клиника не подтвердила смену статуса. Обновите страницу и повторите попытку.");
			}
			setOrder({ ...order, status: data.status });
			if (newStatus === "shipped") {
				setShowCourierWaybill(true);
				showToast("Статус заказа: отправлен курьером в клинику. Накладная готова к печати", "success");
			} else if (newStatus === "in_progress") {
				showToast("Заказ взят в работу зуботехнической лабораторией", "success");
			} else if (newStatus === "refitting") {
				showToast("Заказ переведён в статус «На переделке / доработке»", "info");
			} else {
				showToast("Статус заказа сохранён, врач увидит его в расписании клиники", "success");
			}
		} catch (e) {
			showToast(e instanceof Error ? e.message : statusSaveFailureText(0), "error");
		} finally {
			setIsUpdating(false);
		}
	};

	const uploadPhoto = async (file: File) => {
		if (!file || !token || !order) return;
		if (!file.type.startsWith("image/")) {
			showToast("Пожалуйста, выберите файл изображения (JPG, PNG, WebP).", "error");
			return;
		}
		if (file.size > 15 * 1024 * 1024) {
			showToast("Размер снимка превышает 15 МБ.", "error");
			return;
		}
		setIsUploadingPhoto(true);
		try {
			const dataUrl = await new Promise<string>((resolve, reject) => {
				const reader = new FileReader();
				reader.onload = () => resolve(reader.result as string);
				reader.onerror = reject;
				reader.readAsDataURL(file);
			});
			const res = await fetch(`/api/portal/lab-order/${encodeURIComponent(token)}/photo`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ attachedImageUrl: dataUrl }),
			});
			if (!res.ok) throw new Error("Не удалось загрузить фото работы в клинику.");
			setOrder({ ...order, attachedImageUrl: dataUrl });
			showToast("Фотография работы успешно передана врачу в клинику!", "success");
		} catch (err: any) {
			showToast(err.message || "Ошибка загрузки фотографии", "error");
		} finally {
			setIsUploadingPhoto(false);
		}
	};

	return {
		order,
		isLoading,
		error,
		isUpdating,
		isUploadingPhoto,
		showCourierWaybill,
		setShowCourierWaybill,
		updateStatus,
		uploadPhoto,
	};
}
