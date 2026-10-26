/**
 * useImagingStageDrop.ts — Хук перетаскивания и загрузки снимков в пустую область
 * Mandate 8b: строго <= 120 строк.
 */

import { useState } from "react";
import { uploadImagingScanFile } from "../imagingUploadService.js";
import { showToast } from "../../GlobalToast.js";

interface Options {
	activePatient?: any;
	activeAppointment?: any;
	onStudyUploaded?: ((study: any) => void) | undefined;
}

export function useImagingStageDrop({ activePatient, activeAppointment, onStudyUploaded }: Options) {
	const [isDragging, setIsDragging] = useState(false);
	const [isUploading, setIsUploading] = useState(false);
	const [uploadStatus, setUploadStatus] = useState<string | null>(null);

	const handleDrop = async (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(false);

		const files = Array.from(e.dataTransfer.files);
		if (files.length === 0) return;

		if (!activePatient?.id) {
			showToast("Выберите пациента перед загрузкой снимка", "warning");
			return;
		}

		setIsUploading(true);
		setUploadStatus(`Загрузка снимков (${files.length})...`);

		try {
			for (const file of files) {
				setUploadStatus(`Загрузка «${file.name}»...`);
				const res = await uploadImagingScanFile(file, {
					patientId: activePatient.id,
					visitId: activeAppointment?.id,
				});
				if (res.success && res.study && onStudyUploaded) {
					onStudyUploaded(res.study);
				}
			}
		} finally {
			setIsUploading(false);
			setUploadStatus(null);
		}
	};

	return { isDragging, setIsDragging, isUploading, uploadStatus, handleDrop };
}
