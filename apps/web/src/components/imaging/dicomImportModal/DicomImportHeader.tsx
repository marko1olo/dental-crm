/**
 * DicomImportHeader.tsx — Шапка модального окна импорта DICOM (Мандат 8b <= 120 строк).
 */

import React from "react";
import { FolderSearch, RefreshCw, X } from "lucide-react";

interface DicomImportHeaderProps {
	isScanning: boolean;
	onScanNow: () => void;
	onClose: () => void;
}

export const DicomImportHeader: React.FC<DicomImportHeaderProps> = ({
	isScanning,
	onScanNow,
	onClose,
}) => {
	return (
		<div
			className="flex items-center justify-between px-6 py-4 border-b select-none"
			style={{ background: "var(--paper, #ffffff)", borderColor: "var(--line, #e2e8f0)" }}
		>
			<div className="flex items-center gap-3">
				<div
					className="p-2 rounded-xl"
					style={{ background: "var(--accent-soft, rgba(13, 148, 136, 0.12))", color: "var(--accent, #0d9488)" }}
				>
					<FolderSearch className="w-5 h-5" />
				</div>
				<div>
					<h2 className="text-base font-bold tracking-tight">Автодетект КТ и очередей томографов</h2>
					<p className="text-xs opacity-65">Мониторинг папок Vatech, Planmeca, Sidexis, KaVo с автопривязкой к карте</p>
				</div>
			</div>

			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={onScanNow}
					disabled={isScanning}
					className="inline-flex items-center gap-1.5 h-8 px-3.5 text-[13px] font-semibold rounded-lg bg-[var(--teal)] text-[var(--on-teal,#ffffff)] shadow-xs hover:opacity-95 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
					data-testid="btn-dicom-daemon-scan-now"
				>
					<RefreshCw className={`w-3.5 h-3.5 ${isScanning ? "animate-spin" : ""}`} />
					<span>{isScanning ? "Сканирование..." : "Сканировать сейчас"}</span>
				</button>
				<button
					type="button"
					onClick={onClose}
					className="h-8 w-8 flex items-center justify-center rounded-lg border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors cursor-pointer"
					aria-label="Закрыть"
				>
					<X className="w-4 h-4" />
				</button>
			</div>
		</div>
	);
};
