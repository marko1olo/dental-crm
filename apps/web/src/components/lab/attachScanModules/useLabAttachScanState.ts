import type React from "react";
import { useEffect, useRef, useState } from "react";
import { showToast } from "../../GlobalToast";
import type { DentalLabOrderData } from "../DentalLabOrderModal";

export function useLabAttachScanState(
	isOpen: boolean,
	order: DentalLabOrderData | null,
	initialType: "stl" | "ply" | "photo",
	onSave: (url: string) => Promise<void>,
) {
	const [attachType, setAttachType] = useState<"stl" | "ply" | "photo">(
		initialType,
	);
	const [filePath, setFilePath] = useState("");
	const [fileSizeInfo, setFileSizeInfo] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const inputRef = useRef<HTMLInputElement | null>(null);

	useEffect(() => {
		if (isOpen && order) {
			setAttachType(
				order.attachedImageUrl?.toLowerCase().includes(".ply")
					? "ply"
					: order.attachedImageUrl?.toLowerCase().includes(".stl")
						? "stl"
						: initialType,
			);
			setFilePath(order.attachedImageUrl || "");
			setFileSizeInfo(null);
			const timer = setTimeout(() => inputRef.current?.focus(), 50);
			return () => clearTimeout(timer);
		}
	}, [isOpen, order, initialType]);

	const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		setFileSizeInfo(`${(file.size / (1024 * 1024)).toFixed(1)} МБ`);
		const name = file.name;
		const detectedType = name.toLowerCase().endsWith(".ply")
			? "ply"
			: name.toLowerCase().endsWith(".stl")
				? "stl"
				: "photo";
		setAttachType(detectedType);

		if (!order?.id) {
			setFilePath(`scans/${name}`);
			return;
		}

		setIsSubmitting(true);
		try {
			// 1. Запрос Presigned URL из бэкенда Fastify
			const res = await fetch(`/api/lab/orders/${order.id}/scans/upload-url`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ fileName: file.name, fileSizeBytes: file.size }),
			});
			if (!res.ok) {
				const errData = await res.json().catch(() => null);
				throw new Error(errData?.message || "Ошибка получения URL загрузки скана");
			}
			const presigned = await res.json();
			const uploadUrl: string = presigned.uploadUrl;
			const downloadUrl: string = presigned.downloadUrl || uploadUrl;
			const headers: Record<string, string> = presigned.headersToInclude || {
				"Content-Type": file.type || (detectedType === "ply" ? "model/ply" : detectedType === "stl" ? "model/stl" : "application/octet-stream"),
			};

			// 2. Честная прямая бинарная загрузка PUT (на S3 или в локальный fallback .data/lab_scans/)
			const uploadRes = await fetch(uploadUrl, {
				method: "PUT",
				headers,
				body: file,
			});
			if (!uploadRes.ok) {
				const errText = await uploadRes.text().catch(() => "");
				throw new Error(`Ошибка загрузки файла на сервер (${uploadRes.status}): ${errText || uploadRes.statusText}`);
			}

			// 3. Сохранение итогового URL скачивания для заказ-наряда
			setFilePath(downloadUrl);
			showToast("3D скан успешно загружен на сервер клиники", "success");
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : "Не удалось загрузить скан";
			showToast(message, "error");
			setFilePath(`scans/${name}`);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleSubmit = async (e?: React.FormEvent) => {
		if (e) e.preventDefault();
		if (!filePath.trim())
			return showToast(
				"Укажите путь или URL файла перед сохранением",
				"warning",
			);
		try {
			setIsSubmitting(true);
			await onSave(filePath.trim());
		} finally {
			setIsSubmitting(false);
		}
	};

	return {
		attachType,
		setAttachType,
		filePath,
		setFilePath,
		fileSizeInfo,
		isSubmitting,
		fileInputRef,
		inputRef,
		handleFileSelect,
		handleSubmit,
	};
}
