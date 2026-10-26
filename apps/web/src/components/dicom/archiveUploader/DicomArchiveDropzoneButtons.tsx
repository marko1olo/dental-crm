/**
 * DicomArchiveDropzoneButtons.tsx — Кнопки выбора архива или папки КЛКТ
 * Mandate 8b: строго <= 120 строк.
 */

import React from "react";
import { Archive, Folder } from "lucide-react";

interface Props {
	loading: boolean;
	fileInputRef: React.RefObject<HTMLInputElement | null>;
	folderInputRef: React.RefObject<HTMLInputElement | null>;
}

export const DicomArchiveDropzoneButtons: React.FC<Props> = ({
	loading,
	fileInputRef,
	folderInputRef,
}) => {
	const btnStyle: React.CSSProperties = {
		background: "var(--paper, #ffffff)",
		borderColor: "var(--line, #cbd5e1)",
		color: "var(--ink, #0f172a)",
		padding: "0 12px",
		opacity: loading ? 0.7 : 1,
	};

	return (
		<div className="flex flex-wrap items-center justify-center gap-2.5 mt-2 sm:mt-3">
			<button
				type="button"
				onClick={() => { if (!loading) fileInputRef.current?.click(); }}
				className="secondary-button h-8 min-h-[32px] px-3 text-xs font-semibold rounded-lg border transition-colors inline-flex items-center gap-1.5 cursor-pointer"
				style={btnStyle}
			>
				<Archive size={14} className="text-[var(--teal,#0d9488)] shrink-0" />
				<span>Выбрать ZIP-архив / .DCM</span>
			</button>
			<button
				type="button"
				onClick={() => { if (!loading) folderInputRef.current?.click(); }}
				className="secondary-button h-8 min-h-[32px] px-3 text-xs font-semibold rounded-lg border transition-colors inline-flex items-center gap-1.5 cursor-pointer"
				style={btnStyle}
			>
				<Folder size={14} className="text-[var(--teal,#0d9488)] shrink-0" />
				<span>Выбрать папку КЛКТ</span>
			</button>
		</div>
	);
};
