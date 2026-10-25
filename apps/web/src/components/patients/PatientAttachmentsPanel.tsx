import React, { useRef, useState } from "react";
import { Camera } from "lucide-react";
import { DocumentCameraScannerModal } from "../scanner/DocumentCameraScannerModal";
import { usePatientAttachmentsLogic } from "./attachments/usePatientAttachmentsLogic";
import { PatientAttachmentsList } from "./attachments/PatientAttachmentsList";

export type PatientAttachmentsPanelProps = {
	patientId?: string | null;
	patientName?: string | null;
};

export const PatientAttachmentsPanel: React.FC<PatientAttachmentsPanelProps> = ({
	patientId,
	patientName,
}) => {
	const pid = (patientId ?? "").trim();
	const [scannerModalOpen, setScannerModalOpen] = useState(false);
	const inputRef = useRef<HTMLInputElement | null>(null);

	const {
		files,
		loading,
		uploading,
		error,
		downloadingId,
		onUpload,
		onDownload,
		reload,
	} = usePatientAttachmentsLogic(patientId);

	if (!pid) return null;
	const nameHint = (patientName ?? "").trim();

	return (
		<section
			className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-4 md:p-6 text-[var(--ink)] shadow-sm"
			data-testid="patient-attachments-panel"
			aria-label="Вложения карточки пациента"
		>
			<div className="mb-3 flex flex-wrap items-start justify-between gap-2">
				<div>
					<h3 className="text-base font-bold text-[var(--ink)] tracking-wide">
						Файлы и документы карточки
					</h3>
					<p className="text-xs text-[var(--muted)] mt-0.5">
						Паспорт, направление, договор, снимки и прочие документы
						{nameHint ? ` · ${nameHint}` : ""}. Не фото дневника приёма — те
						живут во вкладке визита.
					</p>
				</div>
				<div className="flex items-center gap-2">
					<button
						type="button"
						data-testid="patient-camera-scan-button"
						onClick={() => setScannerModalOpen(true)}
						className="inline-flex items-center gap-1.5 min-h-[44px] sm:min-h-[32px] min-w-[44px] px-3.5 py-2 text-xs font-bold rounded-xl bg-[var(--paper-soft)] hover:bg-[var(--teal-surface)] text-[var(--ink)] border border-[var(--line-strong)] transition-colors shadow-xs cursor-pointer"
					>
						<Camera className="w-4 h-4 text-[var(--teal)]" aria-hidden="true" />
						<span>Скан камерой</span>
					</button>
					<label className="cursor-pointer inline-flex items-center gap-1.5 min-h-[44px] sm:min-h-[32px] min-w-[44px] px-3.5 py-2 text-xs font-bold rounded-xl bg-[var(--teal)] hover:bg-[var(--teal-dark)] text-white border border-[var(--teal)] transition-colors shadow-sm disabled:opacity-50">
						{uploading ? "Загружаю…" : "Прикрепить файл"}
						<input
							ref={inputRef}
							type="file"
							className="hidden"
							data-testid="patient-attachments-input"
							disabled={uploading || loading}
							onChange={(ev) => void onUpload(ev)}
						/>
					</label>
				</div>
			</div>

			{error && (
				<p
					className="mb-3 text-xs font-semibold text-rose-600 dark:text-rose-300 bg-rose-500/10 border border-rose-500/25 rounded-xl px-3 py-2"
					data-testid="patient-attachments-error"
					role="alert"
				>
					{error}
				</p>
			)}

			{loading && files.length === 0 ? (
				<p className="text-xs text-[var(--muted)]" data-testid="patient-attachments-loading">
					Загрузка списка…
				</p>
			) : (
				<PatientAttachmentsList
					files={files}
					downloadingId={downloadingId}
					onDownload={onDownload}
				/>
			)}

			<DocumentCameraScannerModal
				isOpen={scannerModalOpen}
				patientId={pid}
				patientName={patientName ?? undefined}
				onClose={() => setScannerModalOpen(false)}
				onAttachmentUploaded={() => void reload()}
			/>
		</section>
	);
};

export default PatientAttachmentsPanel;
