import React from "react";
import { AlertTriangle } from "lucide-react";

interface ArchiveConfirmModalProps {
	isBlacklisted: boolean;
	patientName: string | null;
	archiveReason: string;
	setArchiveReason: (r: string) => void;
	modalIsBlacklisted: boolean;
	setModalIsBlacklisted: (b: boolean) => void;
	blacklistReason: string;
	setBlacklistReason: (r: string) => void;
	isApplying: boolean;
	onConfirm: () => void;
	onCancel: () => void;
}

export const ArchiveConfirmModal: React.FC<ArchiveConfirmModalProps> = ({
	isBlacklisted,
	patientName,
	archiveReason,
	setArchiveReason,
	modalIsBlacklisted,
	setModalIsBlacklisted,
	blacklistReason,
	setBlacklistReason,
	isApplying,
	onConfirm,
	onCancel,
}) => {
	return (
		<div className="mt-3 p-3 rounded-lg border bg-rose-50 border-rose-200 dark:bg-slate-800 dark:border-rose-800 space-y-2">
			<div className="flex items-center space-x-2 text-rose-800 dark:text-rose-300 font-bold text-xs">
				<AlertTriangle className="w-4 h-4" />
				<span>{!isBlacklisted ? "Архивация пациента" : "Подтверждение действия"}</span>
			</div>
			<p className="text-xs text-rose-700 dark:text-rose-300">
				{!isBlacklisted
					? `Вы собираетесь отправить в архив: ${patientName ?? "выбранного пациента"}.`
					: `Снять блокировку записи с пациента: ${patientName ?? "выбранный пациент"}?`}
			</p>

			{!isBlacklisted && (
				<div className="space-y-3 mt-2">
					<div>
						<label htmlFor="patient-archive-reason" className="block text-xs font-semibold text-[var(--ink)] mb-1">
							Причина архивации *
						</label>
						<input
							id="patient-archive-reason"
							type="text"
							className="w-full text-xs p-2 rounded border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
							value={archiveReason}
							onChange={(e) => setArchiveReason(e.target.value)}
							placeholder="Например: Переезд, дубль..."
						/>
					</div>
					<label className="flex items-center space-x-2 cursor-pointer">
						<input
							type="checkbox"
							className="rounded border-[var(--line)]"
							checked={modalIsBlacklisted}
							onChange={(e) => setModalIsBlacklisted(e.target.checked)}
						/>
						<span className="text-xs font-semibold text-rose-700 dark:text-rose-300">
							Добавить в Черный Список (запрет записи)
						</span>
					</label>
					{modalIsBlacklisted && (
						<div>
							<label htmlFor="patient-blacklist-reason" className="block text-xs font-semibold text-[var(--ink)] mb-1">
								Причина занесения в ЧС
							</label>
							<textarea
								id="patient-blacklist-reason"
								className="w-full text-xs p-2 rounded border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
								value={blacklistReason}
								onChange={(e) => setBlacklistReason(e.target.value)}
								placeholder="Например: Агрессивное поведение, долг..."
								rows={2}
							/>
						</div>
					)}
				</div>
			)}
			<div className="flex space-x-2 pt-2">
				<button
					type="button"
					onClick={onConfirm}
					disabled={isApplying}
					title="Подтвердить действие"
					className="flex-1 min-h-[44px] sm:min-h-[32px] px-4 py-2.5 rounded-xl bg-[var(--bad-fg)] hover:opacity-90 text-white text-xs font-bold transition-all disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center"
				>
					{isApplying ? "Применяем…" : "Подтвердить"}
				</button>
				<button
					type="button"
					onClick={onCancel}
					title="Отмена действия"
					className="flex-1 min-h-[44px] sm:min-h-[32px] px-4 py-2.5 rounded-xl bg-[var(--paper-soft)] hover:bg-[var(--line)] text-[var(--ink)] border border-[var(--line)] text-xs font-semibold transition-colors inline-flex items-center justify-center"
				>
					Отмена
				</button>
			</div>
		</div>
	);
};
