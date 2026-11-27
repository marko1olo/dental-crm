/**
 * ImagingExportModal.tsx — Модальное окно экспорта и передачи снимков (Мандат 8b <= 120 строк).
 */

import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { Download, X } from "lucide-react";
import {
	type ImagingExportModalProps,
	useImagingExport,
	ExportComplianceBanner,
	ExportContextCard,
	ExportOptionsSelectors,
	ExportActionButtons,
} from "./exportModal";

export type { ImagingExportModalProps };

export function ImagingExportModal(props: ImagingExportModalProps) {
	const { isOpen, onClose, toothCode, doctorName = "Лечащий врач", rulers, angles, lesions } = props;
	const {
		options, setOptions, isAnonymized, setIsAnonymized, isSaving, effectiveStudy,
		patientName, cardNum, handleDownload, handleSendTelegram, handlePrint,
	} = useImagingExport(props);

	useEffect(() => {
		if (!isOpen) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				e.stopPropagation();
				onClose();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose]);

	if (!isOpen || typeof document === "undefined") return null;

	const modalContent = (
		<div
			className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 select-none"
			style={{ backgroundColor: "rgba(15, 23, 42, 0.65)", backdropFilter: "blur(4px)" }}
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div
				className="w-full max-w-lg rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-4 sm:p-5 text-[var(--ink)] shadow-2xl flex flex-col gap-3.5 max-h-[92vh] overflow-y-auto"
				role="dialog"
				aria-modal="true"
				aria-labelledby="imaging-export-modal-title"
				data-testid="imaging-export-modal"
			>
				<div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
					<div className="flex items-center gap-2">
						<div className="w-8 h-8 rounded-lg bg-[var(--primary)]/15 border border-[var(--primary)]/30 flex items-center justify-center text-[var(--primary)] shrink-0">
							<Download className="w-4 h-4" />
						</div>
						<div>
							<h3 id="imaging-export-modal-title" className="text-sm sm:text-base font-bold m-0 leading-tight">
								Экспорт и передача снимков
							</h3>
							<p className="text-[11px] text-[var(--ink-muted)] m-0 leading-tight">
								Юридическая фиксация, экспорт на накопитель, в архив, печать или Telegram
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors cursor-pointer"
						aria-label="Закрыть"
						data-testid="btn-close-imaging-export"
					>
						<X size={18} />
					</button>
				</div>

				<ExportComplianceBanner isAnonymized={isAnonymized} onToggleAnonymized={(val) => { setIsAnonymized(val); setOptions((p) => ({ ...p, withPatientData: !val })); }} />
				<ExportContextCard effectiveStudy={effectiveStudy} toothCode={toothCode} patientName={patientName} cardNum={cardNum} doctorName={doctorName} rulers={rulers} angles={angles} lesions={lesions} />
				<ExportOptionsSelectors options={options} onOptionsChange={setOptions} />
				<ExportActionButtons isSaving={isSaving} onPrint={handlePrint} onSendTelegram={handleSendTelegram} onDownload={handleDownload} />
			</div>
		</div>
	);

	return createPortal(modalContent, document.body);
}
