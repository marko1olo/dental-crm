import { useCallback, useEffect, useRef, useState } from "react";
import { auth } from "../../../AppConstants";
import { showToast } from "../../GlobalToast";
import type { CalendarFeedData } from "./DoctorCalendarSyncLinks";

export function useDoctorCalendarSync(
	isOpen: boolean,
	selectedDoctorId: string,
) {
	const [feedData, setFeedData] = useState<CalendarFeedData | null>(null);
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [isRotating, setIsRotating] = useState<boolean>(false);
	const [copiedKey, setCopiedKey] = useState<"feed" | "webcal" | null>(null);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		return () => {
			if (copyTimerRef.current) {
				clearTimeout(copyTimerRef.current);
				copyTimerRef.current = null;
			}
		};
	}, []);

	const fetchFeedUrl = useCallback(async (doctorId: string) => {
		if (!doctorId) return;
		setIsLoading(true);
		setErrorMessage(null);
		try {
			const res = await fetch(
				`/api/schedule/ical/doctor/${encodeURIComponent(doctorId)}/feed-url`,
				{
					headers: auth.denteClinicalReadHeaders(),
				},
			);
			if (!res.ok) {
				const errData = await res.json().catch(() => ({}));
				throw new Error(errData.message || `Ошибка сервера (${res.status})`);
			}
			const data = (await res.json()) as CalendarFeedData;
			setFeedData(data);
		} catch (err: unknown) {
			setErrorMessage(
				err instanceof Error
					? err.message
					: "Не удалось загрузить ссылку расписания",
			);
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		if (isOpen && selectedDoctorId) {
			void fetchFeedUrl(selectedDoctorId);
		}
	}, [isOpen, selectedDoctorId, fetchFeedUrl]);

	const handleCopy = async (text: string, key: "feed" | "webcal") => {
		try {
			await navigator.clipboard.writeText(text);
			setCopiedKey(key);
			showToast("Ссылка скопирована в буфер обмена", "success");
			if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
			copyTimerRef.current = setTimeout(() => {
				setCopiedKey(null);
				copyTimerRef.current = null;
			}, 2500);
		} catch {
			showToast("Ошибка копирования в буфер обмена", "error");
		}
	};

	const handleRotateToken = async () => {
		if (!selectedDoctorId) return;
		setIsRotating(true);
		setErrorMessage(null);
		try {
			const res = await fetch(
				`/api/schedule/ical/doctor/${encodeURIComponent(selectedDoctorId)}/rotate`,
				{
					method: "POST",
					headers: auth.denteClinicalMutationHeaders(),
				},
			);
			if (!res.ok) {
				const errData = await res.json().catch(() => ({}));
				throw new Error(errData.message || "Не удалось отозвать токен");
			}
			const data = (await res.json()) as CalendarFeedData;
			setFeedData(data);
			showToast(
				"Токен обновлен. Новая ссылка готова к подключению.",
				"success",
			);
		} catch (err: unknown) {
			const msg =
				err instanceof Error ? err.message : "Ошибка при ротации токена";
			setErrorMessage(msg);
			showToast(msg, "error");
		} finally {
			setIsRotating(false);
		}
	};

	return {
		feedData,
		isLoading,
		isRotating,
		copiedKey,
		errorMessage,
		handleCopy,
		handleRotateToken,
	};
}
