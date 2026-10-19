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

	const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		setFileSizeInfo(`${(file.size / (1024 * 1024)).toFixed(1)} МБ`);
		const name = file.name;
		setAttachType(
			name.toLowerCase().endsWith(".ply")
				? "ply"
				: name.toLowerCase().endsWith(".stl")
					? "stl"
					: "photo",
		);
		setFilePath(`scans/${name}`);
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
