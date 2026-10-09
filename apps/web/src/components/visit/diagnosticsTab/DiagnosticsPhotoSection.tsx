import { Camera, Plus } from "lucide-react";
import React from "react";
import type { ClinicalPhotoAttachment } from "../../lib/clinicalProtocols043";
import { DiagnosticsPhotoCard } from "./DiagnosticsStudyCard";
import type { PhotoStageType } from "./types";

export interface DiagnosticsPhotoSectionProps {
	isVisible: boolean;
	photoAttachments: ClinicalPhotoAttachment[];
	selectedToothForPhoto: number;
	setSelectedToothForPhoto: (tooth: number) => void;
	selectedPhotoType: PhotoStageType;
	setSelectedPhotoType: (type: PhotoStageType) => void;
	photoComment: string;
	setPhotoComment: (comment: string) => void;
	onAddPhoto: () => void;
	onRemovePhoto: (id: string) => void;
	onOpenPhotoProtocol: () => void;
}

export function DiagnosticsPhotoSection({
	isVisible,
	photoAttachments,
	selectedToothForPhoto,
	setSelectedToothForPhoto,
	selectedPhotoType,
	setSelectedPhotoType,
	photoComment,
	setPhotoComment,
	onAddPhoto,
	onRemovePhoto,
	onOpenPhotoProtocol,
}: DiagnosticsPhotoSectionProps) {
	return (
		<div className={isVisible ? "flex flex-col gap-3" : "hidden"}>
			<div
				data-testid="visit-photo-protocol-card"
				className="p-3.5 sm:p-4 rounded-xl bg-[var(--paper-soft)] border border-[var(--line-subtle)] hover:border-[var(--teal)]/40 flex flex-col gap-3 shadow-2xs transition-all"
			>
				<div className="flex items-center justify-between gap-3 flex-wrap">
					<div className="flex items-center gap-3">
						<div className="w-9 h-9 rounded-lg bg-[var(--paper)] border border-[var(--line-subtle)] text-[var(--teal)] flex items-center justify-center shrink-0 shadow-2xs">
							<Camera size={18} />
						</div>
						<div>
							<div className="flex items-center gap-2 flex-wrap">
								<strong className="text-xs sm:text-sm font-bold text-[var(--ink)]">
									Дентальный фотопротокол («До / После»)
								</strong>
								<span className="text-[10px] font-semibold text-[var(--muted)] bg-[var(--paper)] px-1.5 py-0.5 rounded border border-[var(--line-subtle)]">
									Фотоприложения
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] m-0 mt-0.5 leading-snug">
								Клиническая макросъемка, контроль препарирования, привязка к зубной формуле (11–48) и ведомость приложений к медицинской карте
							</p>
						</div>
					</div>

					<div className="flex items-center gap-1.5 shrink-0">
						<button
							type="button"
							onClick={onOpenPhotoProtocol}
							data-testid="open-visit-photo-protocol-modal-btn"
							className="diag-btn-teal"
							title="Сетка фотопротокола (12 слотов)"
						>
							<Camera size={14} />
							<span>Сетка протокола (12 слотов)</span>
						</button>
					</div>
				</div>

				{/* Quick-Attach Form */}
				<div className="pt-2.5 border-t border-[var(--line-subtle)] flex flex-wrap items-center gap-2">
					<div className="flex items-center gap-1.5 text-xs text-[var(--muted)] font-medium">
						<span>Зуб:</span>
						<select
							id="photo-tooth-select"
							value={selectedToothForPhoto}
							onChange={(e) => setSelectedToothForPhoto(Number(e.target.value))}
							className="h-8 text-xs font-semibold rounded-lg border border-[var(--line-subtle)] bg-[var(--paper)] text-[var(--ink)] px-2 focus:outline-none focus:border-[var(--teal)] cursor-pointer"
						>
							<option value={0}>Общий вид</option>
							{[18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28, 48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38].map((t) => (
								<option key={t} value={t}>
									Зуб {t}
								</option>
							))}
						</select>
					</div>

					<div className="flex items-center gap-1.5 text-xs text-[var(--muted)] font-medium">
						<span>Этап:</span>
						<select
							id="photo-stage-select"
							value={selectedPhotoType}
							onChange={(e) => setSelectedPhotoType(e.target.value as PhotoStageType)}
							className="h-8 text-xs font-semibold rounded-lg border border-[var(--line-subtle)] bg-[var(--paper)] text-[var(--ink)] px-2 focus:outline-none focus:border-[var(--teal)] cursor-pointer"
						>
							<option value="before">До лечения</option>
							<option value="process">В процессе (коффердам/преп)</option>
							<option value="after">После лечения (контроль)</option>
							<option value="intraoral_macro">Внутриротовой макро</option>
							<option value="face_portrait">Портрет лица</option>
						</select>
					</div>

					<div className="flex-1 min-w-[200px]">
						<input
							id="photo-comment-input"
							type="text"
							placeholder="Клинический комментарий (цвет, анатомическая моделировка)..."
							value={photoComment}
							onChange={(e) => setPhotoComment(e.target.value)}
							className="w-full h-8 px-2.5 text-xs font-medium rounded-lg border border-[var(--line-subtle)] bg-[var(--paper)] text-[var(--ink)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--teal)]"
						/>
					</div>

					<button
						type="button"
						onClick={onAddPhoto}
						className="diag-btn-teal"
					>
						<Plus size={14} />
						<span>Привязать</span>
					</button>
				</div>

				{/* List of Attached Photos or Quiet State */}
				{photoAttachments.length > 0 ? (
					<div className="pt-2 border-t border-[var(--line-subtle)] space-y-2">
						<div className="text-[11px] font-bold text-[var(--muted)]">
							Прикрепленные снимки фотопротокола ({photoAttachments.length}):
						</div>
						<div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2.5 pt-1">
							{photoAttachments.map((photo) => (
								<DiagnosticsPhotoCard
									key={photo.id}
									photo={photo}
									variant="attached-list"
									onOpenProtocol={onOpenPhotoProtocol}
									onRemovePhoto={onRemovePhoto}
								/>
							))}
						</div>
					</div>
				) : (
					<div className="pt-2 border-t border-[var(--line-subtle)] text-[11px] text-[var(--muted)] flex items-center justify-between">
						<span>Снимки не прикреплены. Заполните форму выше для быстрой привязки к зубу или откройте сетку на 12 слотов.</span>
					</div>
				)}
			</div>
		</div>
	);
}
