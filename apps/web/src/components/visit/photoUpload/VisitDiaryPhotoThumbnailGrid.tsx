import {
	CheckSquare,
	Download,
	Printer,
	RefreshCw,
	Search,
	Square,
	Trash2,
	X,
} from "lucide-react";
import { useState } from "react";
import { AUTHED_API_FILE_FAILURE } from "../../../lib/authedApiFile";
import { requestFailureCause } from "../../../lib/panelStateText";
import type {
	Attachment,
	AttachmentsLoadState,
} from "./useVisitDiaryPhotoUploadState";

export interface VisitDiaryPhotoThumbnailGridProps {
	attachments: readonly Attachment[];
	photoObjectUrls: Record<string, string>;
	unreadablePhotoIds: readonly string[];
	loadState: AttachmentsLoadState;
	selectedPrintIds: ReadonlySet<string>;
	isLocked: boolean;
	diaryId: string | null;
	zoomPhoto: { id: string; url: string; name: string } | null;
	onZoomChange: (
		photo: { id: string; url: string; name: string } | null,
	) => void;
	onTogglePrint: (id: string) => void;
	onDeletePhoto: (id: string) => void;
	onReload: () => void;
}

export function VisitDiaryPhotoThumbnailGrid({
	attachments,
	photoObjectUrls,
	unreadablePhotoIds,
	loadState,
	selectedPrintIds,
	isLocked,
	diaryId,
	zoomPhoto,
	onZoomChange,
	onTogglePrint,
	onDeletePhoto,
	onReload,
}: VisitDiaryPhotoThumbnailGridProps) {
	const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

	if (attachments.length > 0) {
		return (
			<div className="space-y-3">
				<div className="flex gap-3 overflow-x-auto pb-2 pt-1 touch-pan-x">
					{attachments.map((att) => {
						const objectUrl = photoObjectUrls[att.id];
						const isSelectedForPrint = selectedPrintIds.has(att.id);
						const isConfirmingDelete = confirmDeleteId === att.id;

						if (!objectUrl) {
							const failed = unreadablePhotoIds.includes(att.id);
							return (
								<div
									key={att.id}
									title={failed ? AUTHED_API_FILE_FAILURE : att.name}
									className="h-24 w-24 shrink-0 rounded-xl border border-dashed border-[var(--line-strong)] bg-[var(--paper-soft)] text-[11px] leading-tight text-[var(--muted)] flex flex-col items-center justify-center text-center p-2"
								>
									<span>{failed ? "Снимок не открылся" : "Загрузка…"}</span>
								</div>
							);
						}

						return (
							<div
								key={att.id}
								className="relative group shrink-0 rounded-xl border border-[var(--line)] bg-[var(--paper)] shadow-xs overflow-hidden flex flex-col w-28"
							>
								<div className="relative h-24 w-28 bg-[var(--paper-soft)] overflow-hidden">
									<img
										src={objectUrl}
										alt={att.name}
										loading="lazy"
										decoding="async"
										className="h-full w-full object-cover transition-transform group-hover:scale-105"
									/>

									<button
										type="button"
										onClick={() =>
											onZoomChange({
												id: att.id,
												url: objectUrl,
												name: att.name,
											})
										}
										className="cursor-pointer absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
										title="Увеличить снимок на весь экран"
									>
										<Search className="w-5 h-5 drop-shadow-md" />
									</button>

									{!isLocked && (
										<div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
											{isConfirmingDelete ? (
												<div className="flex items-center gap-1 bg-black/80 rounded-md p-1 shadow-md">
													<button
														type="button"
														onClick={() => {
															onDeletePhoto(att.id);
															setConfirmDeleteId(null);
														}}
														className="cursor-pointer text-[10px] bg-[var(--bad-fg)] hover:opacity-90 text-white px-1.5 py-0.5 rounded"
														title="Подтвердить удаление"
													>
														Да
													</button>
													<button
														type="button"
														onClick={() => setConfirmDeleteId(null)}
														className="cursor-pointer text-[10px] bg-[var(--paper-strong)] text-[var(--ink)] px-1.5 py-0.5 rounded"
														title="Отмена"
													>
														Нет
													</button>
												</div>
											) : (
												<button
													type="button"
													onClick={() => setConfirmDeleteId(att.id)}
													className="cursor-pointer p-1.5 rounded-md bg-black/60 hover:bg-[var(--bad-fg)] text-white transition-colors"
													title="Удалить фото из дневника (с защитой от случайного клика)"
												>
													<Trash2 className="w-3.5 h-3.5" />
												</button>
											)}
										</div>
									)}
								</div>

								{/* Бейдж и переключатель "В карту приёма" с тач-таргетом */}
								<div className="p-1.5 bg-[var(--paper)] border-t border-[var(--line)]">
									<button
										type="button"
										onClick={() => onTogglePrint(att.id)}
										className={`cursor-pointer w-full text-[11px] py-1 px-1 rounded flex items-center justify-between gap-1 transition-colors min-h-[32px] ${
											isSelectedForPrint
												? "bg-[var(--paper-strong)] text-[var(--ink)] font-medium"
												: "text-[var(--muted)] hover:bg-[var(--paper-soft)]"
										}`}
										title="Включать ли данный снимок в печать медицинской карты приёма"
									>
										<span className="truncate flex items-center gap-1">
											<Printer className="w-3 h-3 text-[var(--accent)] shrink-0" />
											<span className="truncate">В карту приёма</span>
										</span>
										{isSelectedForPrint ? (
											<CheckSquare className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
										) : (
											<Square className="w-3.5 h-3.5 text-[var(--muted)] shrink-0" />
										)}
									</button>
								</div>
							</div>
						);
					})}
				</div>

				{/* Lightbox / Полноэкранный зум снимка */}
				{zoomPhoto && (
					<div
						role="dialog"
						aria-modal="true"
						aria-label={zoomPhoto.name}
						className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 animate-in fade-in duration-150"
					>
						<button
							type="button"
							className="absolute inset-0 w-full h-full cursor-default bg-transparent border-0 p-0 m-0"
							onClick={() => onZoomChange(null)}
							aria-label="Закрыть полноэкранный просмотр"
						/>
						<div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center bg-[var(--paper)] rounded-2xl p-3 shadow-2xl border border-[var(--line)] z-10">
							<div className="w-full flex items-center justify-between pb-2 mb-2 border-b border-[var(--line)]">
								<span className="text-sm font-medium text-[var(--ink)] truncate max-w-md">
									{zoomPhoto.name}
								</span>
								<div className="flex items-center gap-2">
									<a
										href={zoomPhoto.url}
										download={zoomPhoto.name}
										className="cursor-pointer min-h-[36px] px-3 py-1.5 rounded-lg bg-[var(--paper-soft)] hover:bg-[var(--paper-strong)] text-xs text-[var(--ink)] flex items-center gap-1.5 transition-colors border border-[var(--line)]"
										title="Скачать снимок на рабочий стол"
									>
										<Download className="w-3.5 h-3.5" />
										<span>Скачать</span>
									</a>
									<button
										type="button"
										onClick={() => onZoomChange(null)}
										className="cursor-pointer p-2 rounded-lg hover:bg-[var(--paper-strong)] text-[var(--muted)] hover:text-[var(--ink)] transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
										title="Закрыть просмотр"
									>
										<X className="w-5 h-5" />
									</button>
								</div>
							</div>
							<div className="overflow-auto max-h-[75vh] flex items-center justify-center">
								<img
									src={zoomPhoto.url}
									alt={zoomPhoto.name}
									className="max-h-[75vh] max-w-full object-contain rounded-lg"
								/>
							</div>
						</div>
					</div>
				)}
			</div>
		);
	}

	if (loadState.phase === "loading") {
		return (
			<div className="w-full bg-[var(--paper-soft)] border border-[var(--line)] border-dashed rounded-xl p-4 text-sm text-[var(--muted)] text-center flex items-center justify-center gap-2">
				<RefreshCw className="w-4 h-4 animate-spin text-[var(--muted)]" />
				<span>Загрузка снимков…</span>
			</div>
		);
	}

	if (loadState.phase === "failed") {
		return (
			<div className="w-full bg-[var(--paper-soft)] border border-[var(--bad-fg)] border-dashed rounded-xl p-4 text-sm text-[var(--ink)] text-center space-y-2">
				<p>
					Список снимков не прочитан
					{loadState.status != null
						? ` (${requestFailureCause(loadState.status)})`
						: ""}
					. Не считайте, что снимков нет — они могли остаться на сервере.
				</p>
				<button
					type="button"
					onClick={onReload}
					className="cursor-pointer text-xs px-3 py-2 min-h-[44px] rounded-lg bg-[var(--paper-strong)] hover:bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] inline-flex items-center gap-1.5 active:scale-[0.98]"
				>
					<RefreshCw className="w-3.5 h-3.5" />
					<span>Повторить</span>
				</button>
			</div>
		);
	}

	return (
		<div className="w-full bg-[var(--paper-soft)] border border-[var(--line)] border-dashed rounded-xl p-4 text-sm text-[var(--muted)] text-center">
			{diaryId
				? isLocked
					? "Нет прикрепленных фото."
					: "Нажмите «Прикрепить фото», чтобы добавить снимки лечения."
				: "Сначала сохраните дневник, чтобы прикрепить фото."}
		</div>
	);
}
