import { Check, FileText, Paperclip } from "lucide-react";
import React from "react";
import { showToast } from "../../GlobalToast.js";

export interface ConsentPaperScanUploadProps {
	paperScanFile?: File | null | undefined;
	setPaperScanFile?: ((file: File | null) => void) | undefined;
}

export const ConsentPaperScanUpload: React.FC<ConsentPaperScanUploadProps> = ({
	paperScanFile,
	setPaperScanFile,
}) => {
	return (
		<div
			className="p-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] flex flex-col gap-2"
			data-testid="paper-scan-upload-container"
		>
			<div className="flex items-center justify-between gap-2 flex-wrap">
				<div className="flex items-center gap-2">
					<FileText size={16} className="text-[var(--teal,#0d9488)] shrink-0" />
					<span className="font-semibold text-xs sm:text-sm text-[var(--ink)]">
						Скан-копия или фото бланка для электронного архива
					</span>
				</div>
				{paperScanFile ? (
					<span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
						<Check size={12} className="shrink-0" />
						<span>Файл прикреплен</span>
					</span>
				) : (
					<span className="text-[11px] text-muted bg-[var(--paper-soft)] px-2 py-0.5 rounded-full border border-[var(--line)]">
						Не прикреплен (опционально)
					</span>
				)}
			</div>

			{paperScanFile ? (
				<div className="flex items-center justify-between p-2 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)]">
					<div className="flex items-center gap-2 min-w-0">
						<FileText size={18} className="text-[var(--teal)] shrink-0" />
						<div className="flex flex-col min-w-0">
							<span className="text-xs font-semibold text-[var(--ink)] truncate" data-testid="paper-scan-filename">
								{paperScanFile.name}
							</span>
							<span className="text-[10px] text-muted">
								{Math.round(paperScanFile.size / 1024)} КБ
							</span>
						</div>
					</div>
					<button
						type="button"
						onClick={() => setPaperScanFile?.(null)}
						data-testid="btn-remove-paper-scan"
						className="text-xs text-rose-500 hover:text-rose-600 px-2 py-1 rounded cursor-pointer"
						title="Удалить прикрепленный скан"
					>
						Удалить
					</button>
				</div>
			) : (
				<label className="flex items-center justify-center gap-2 p-3 border border-dashed border-[var(--line-strong)] rounded-lg hover:border-[var(--teal)] cursor-pointer text-xs text-muted hover:text-[var(--ink)] transition-colors">
					<input
						type="file"
						data-testid="input-paper-scan-file"
						accept="image/*,application/pdf"
						className="hidden"
						onChange={(e) => {
							const f = e.target.files?.[0];
							if (f) {
								setPaperScanFile?.(f);
								showToast(`Скан «${f.name}» успешно прикреплен`, "success");
							}
						}}
					/>
					<Paperclip size={14} className="shrink-0 text-muted" />
					<span>Прикрепить скан или фото подписанного бланка (PDF, JPG, PNG)</span>
				</label>
			)}
		</div>
	);
};
