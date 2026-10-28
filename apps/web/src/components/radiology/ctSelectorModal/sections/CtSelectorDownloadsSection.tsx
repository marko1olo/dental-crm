import React from "react";
import { ChevronRight, FileArchive, FolderDown, FolderSearch, RefreshCw } from "lucide-react";
import type { CtDownloadItem } from "./types";

export interface CtSelectorDownloadsSectionProps {
	readonly downloads: CtDownloadItem[];
	readonly isScanningDownloads: boolean;
	readonly refreshDownloads: () => void;
	readonly launchStudy: (study: any, studyId?: string, filePath?: string) => void;
}

export const CtSelectorDownloadsSection: React.FC<CtSelectorDownloadsSectionProps> = ({
	downloads,
	isScanningDownloads,
	refreshDownloads,
	launchStudy,
}) => {
	return (
		<section
			className="flex flex-col gap-2.5 p-3.5 sm:p-4 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)]"
			data-testid="ct-selector-downloads-section"
		>
			<div className="flex items-center justify-between gap-3 flex-wrap">
				<div className="flex items-center gap-2">
					<FolderDown className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
					<h3 className="text-xs font-bold text-[var(--ink)] m-0 uppercase tracking-wider">
						Свежие КТ из папки «Загрузки»
					</h3>
					<span className="text-[11px] text-[var(--muted)]">
						({downloads.length})
					</span>
				</div>

				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={refreshDownloads}
						disabled={isScanningDownloads}
						className="inline-flex items-center gap-1.5 h-8 px-2.5 text-xs font-semibold rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] transition-colors cursor-pointer disabled:opacity-50"
						data-testid="btn-refresh-downloads"
						title="Повторно проверить папку Загрузки на наличие новых архивов КТ"
					>
						<RefreshCw
							size={12}
							className={isScanningDownloads ? "animate-spin" : ""}
						/>
						<span>{isScanningDownloads ? "Сканирование..." : "Обновить Загрузки"}</span>
					</button>
				</div>
			</div>

			{/* Список найденных КТ из Загрузок или честное пустое состояние */}
			{downloads.length > 0 ? (
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
					{downloads.map((item) => (
						<div
							key={item.id}
							className="p-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] flex items-center justify-between gap-3 hover:border-teal-500/40 transition-all shadow-xs"
							data-testid={`ct-download-item-${item.id}`}
						>
							<div className="flex items-center gap-2.5 min-w-0">
								<div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-600 border border-teal-500/20 flex items-center justify-center shrink-0">
									<FileArchive size={16} />
								</div>
								<div className="min-w-0">
									<strong className="block text-xs font-bold text-[var(--ink)] truncate">
										{item.patientName || item.fileName}
									</strong>
									<div className="flex items-center gap-2 text-[11px] text-[var(--muted)]">
										<span>
											{item.fileSizeBytes
												? `${(item.fileSizeBytes / (1024 * 1024)).toFixed(0)} МБ`
												: "Архив КТ"}
										</span>
										<span>·</span>
										<span>
											{item.detectedAtIso
												? new Date(item.detectedAtIso).toLocaleTimeString("ru-RU", {
														hour: "2-digit",
														minute: "2-digit",
													})
												: "Сегодня"}
										</span>
										<span className="px-1 py-0.2 rounded text-[10px] font-bold bg-cyan-500/15 text-cyan-700 dark:text-cyan-300">
											3D КТ
										</span>
									</div>
								</div>
							</div>

							<button
								type="button"
								onClick={() => launchStudy(item, undefined, item.filePath)}
								className="h-8 px-3 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer active:scale-95 transition-all"
								data-testid="btn-open-quick-ct"
								title="Открыть это исследование в выбранном режиме"
							>
								<ChevronRight size={14} />
								<span>Открыть</span>
							</button>
						</div>
					))}
				</div>
			) : (
				<div
					className="p-4 rounded-xl border border-dashed border-[var(--line)] bg-[var(--paper)] text-center flex flex-col items-center justify-center gap-1.5 text-xs text-[var(--muted)]"
					data-testid="downloads-empty-state"
				>
					<FolderSearch size={20} className="text-[var(--muted)] opacity-60" />
					<span className="font-semibold text-[var(--ink)]">
						В папке «Загрузки» нет свежих КТ
					</span>
					<span className="text-[11px] text-[var(--muted)] max-w-md">
						Скачанные архивы от Пикассо или других диагностических центров появятся здесь
						автоматически. Вы также можете перетащить архив или папку ниже.
					</span>
				</div>
			)}
		</section>
	);
};
