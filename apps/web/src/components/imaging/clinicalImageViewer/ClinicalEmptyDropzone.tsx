import React from "react";
import { UploadCloud } from "lucide-react";

export interface ClinicalEmptyDropzoneProps {
	readonly imageLoadError: boolean;
	readonly containerRef: React.RefObject<HTMLDivElement | null>;
}

export const ClinicalEmptyDropzone: React.FC<ClinicalEmptyDropzoneProps> = ({
	imageLoadError,
	containerRef,
}) => {
	return (
		<div
			className="clinical-image-container flex flex-col items-center justify-center p-8 text-center rounded-xl border border-dashed border-[var(--line)] bg-[var(--paper-soft)] text-[var(--muted)] min-h-[400px] h-[480px] max-h-[calc(100vh-280px)] flex-1 w-full"
			ref={containerRef as any}
			data-testid="clinical-image-placeholder"
		>
			<UploadCloud size={40} className="mb-2 text-[var(--teal,#0d9488)] opacity-75" />
			<strong className="text-sm font-bold text-[var(--ink)] mb-1">
				{imageLoadError ? "Снимок недоступен или повреждён" : "Снимок не выбран или ожидает загрузки"}
			</strong>
			<p className="text-xs text-[var(--muted)] max-w-sm m-0">
				{imageLoadError
					? "Не удалось отобразить графический файл. Выберите другой снимок из списка или загрузите новый."
					: "Выберите файл DICOM или снимок визиографа из списка или перетащите файл в рабочую область"}
			</p>
		</div>
	);
};
