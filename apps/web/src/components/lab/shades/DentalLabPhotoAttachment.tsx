import { Camera, CheckCircle2, Trash2 } from "lucide-react";
import React from "react";

export interface DentalLabPhotoAttachmentProps {
	readonly currentShade: string;
	readonly attachedImageUrl?: string | null | undefined;
	readonly setAttachedImageUrl?: ((url: string | null) => void) | undefined;
}

export const DentalLabPhotoAttachment: React.FC<
	DentalLabPhotoAttachmentProps
> = ({ currentShade, attachedImageUrl, setAttachedImageUrl }) => {
	return (
		<div className="space-y-2 p-3.5 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] shadow-2xs">
			<div className="flex items-center justify-between gap-2">
				<div className="flex items-center gap-2">
					<Camera size={15} className="text-teal-600 dark:text-teal-400" />
					<span className="text-xs font-bold text-[var(--ink,#0f172a)]">
						Фоторегистрация эталона цвета (с расцветкой VITA у зуба / культи)
					</span>
				</div>
				{attachedImageUrl && (
					<span className="text-[11px] font-bold text-teal-600 dark:text-teal-400 inline-flex items-center gap-1">
						<CheckCircle2 size={13} />
						<span>Фото прикреплено</span>
					</span>
				)}
			</div>

			{attachedImageUrl ? (
				<div className="flex items-center gap-3 p-2 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] shadow-2xs">
					<div className="w-12 h-12 rounded-lg overflow-hidden border border-[var(--line,#cbd5e1)] bg-slate-100 shrink-0">
						<img
							src={attachedImageUrl}
							alt="Фото эталона VITA"
							className="w-full h-full object-cover"
						/>
					</div>
					<div className="flex-1 min-w-0">
						<div className="text-xs font-bold text-[var(--ink,#0f172a)] truncate">
							{attachedImageUrl.split("/").pop()}
						</div>
						<div className="text-[10px] text-[var(--muted,#64748b)]">
							Ориентир цвета: VITA {currentShade}
						</div>
						{setAttachedImageUrl && (
							<button
								type="button"
								onClick={() => setAttachedImageUrl(null)}
								className="text-[11px] font-bold text-rose-600 hover:text-rose-700 inline-flex items-center gap-1 mt-1 cursor-pointer"
								data-testid="remove-shade-selector-photo-btn"
							>
								<Trash2 size={12} />
								<span>Удалить снимок</span>
							</button>
						)}
					</div>
				</div>
			) : (
				<div className="flex items-center justify-between gap-2 p-2.5 rounded-lg border border-dashed border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)]">
					<span className="text-[11px] text-[var(--muted,#64748b)] truncate">
						Прикрепите фото расцветки VITA {currentShade} в полости рта у
						соседнего зуба
					</span>
					<div className="flex items-center gap-2 shrink-0">
						<label className="min-h-[36px] px-3 py-1.5 rounded-lg border border-teal-600 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition cursor-pointer">
							<Camera size={13} />
							<span>Загрузить фото</span>
							<input
								type="file"
								accept="image/jpeg,image/png,image/webp"
								className="hidden"
								data-testid="shade-selector-file-input"
								onChange={(e) => {
									const file = e.target.files?.[0];
									if (!file) return;
									const reader = new FileReader();
									reader.onload = (ev) =>
										typeof ev.target?.result === "string" &&
										setAttachedImageUrl?.(ev.target.result);
									reader.readAsDataURL(file);
								}}
							/>
						</label>
						{setAttachedImageUrl && (
							<button
								type="button"
								onClick={() =>
									setAttachedImageUrl(
										`photos/vita_${currentShade.toLowerCase()}_clinical_guide.jpg`,
									)
								}
								className="min-h-[36px] px-2.5 py-1.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:border-[var(--teal)] text-xs font-bold shadow-2xs transition cursor-pointer"
								data-testid="shade-selector-sample-photo-btn"
							>
								Образец
							</button>
						)}
					</div>
				</div>
			)}
		</div>
	);
};
