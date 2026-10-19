import { Camera, CheckCircle2, Trash2 } from "lucide-react";
import { ToothShadeGuide } from "../../icons/DentalIcons";

interface DentalLabPhotoReferenceProps {
	readonly selectedShade: string;
	readonly shadePhotoUrl?: string | null | undefined;
	readonly onShadePhotoChange?: ((url: string | null) => void) | undefined;
}

export function DentalLabPhotoReference({
	selectedShade,
	shadePhotoUrl,
	onShadePhotoChange,
}: DentalLabPhotoReferenceProps) {
	return (
		<div
			className="pt-2 border-t border-slate-200 dark:border-slate-700/80 space-y-2"
			data-testid="shade-picker-photo-section"
		>
			<div className="flex items-center justify-between flex-wrap gap-2">
				<div className="flex items-center gap-1.5">
					<Camera
						size={14}
						className="text-teal-600 dark:text-teal-400 shrink-0"
					/>
					<span className="text-xs font-bold text-slate-800 dark:text-slate-200">
						Фотография расцветки с зубом:
					</span>
				</div>
				{shadePhotoUrl && (
					<span className="text-[11px] font-bold text-teal-600 dark:text-teal-400 inline-flex items-center gap-1">
						<CheckCircle2 size={12} />
						<span>Фото эталона прикреплено</span>
					</span>
				)}
			</div>

			{shadePhotoUrl ? (
				<div className="flex items-center gap-3 p-2 rounded-lg bg-[var(--paper,#ffffff)] border border-[var(--line,#cbd5e1)] text-[var(--ink,#0f172a)]">
					<div className="w-14 h-14 rounded-md overflow-hidden border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] shrink-0 flex items-center justify-center relative">
						<img
							src={shadePhotoUrl}
							alt="Эталон VITA"
							className="w-full h-full object-cover z-10"
							onError={(e) => {
								(e.currentTarget as HTMLElement).style.display = "none";
							}}
						/>
						<ToothShadeGuide
							size={22}
							className="text-teal-600/60 absolute pointer-events-none"
						/>
					</div>
					<div className="flex-1 min-w-0">
						<div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
							{shadePhotoUrl.split("/").pop()}
						</div>
						<div className="text-[10px] text-slate-500 dark:text-slate-400">
							Эталон: VITA {selectedShade}
						</div>
						{onShadePhotoChange && (
							<button
								type="button"
								onClick={() => onShadePhotoChange(null)}
								className="text-[11px] font-bold text-rose-600 hover:text-rose-700 inline-flex items-center gap-1 mt-1 cursor-pointer"
								data-testid="remove-shade-picker-photo-btn"
							>
								<Trash2 size={11} />
								<span>Удалить</span>
							</button>
						)}
					</div>
				</div>
			) : (
				<div className="flex items-center justify-between gap-2 p-2 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-white/40 dark:bg-slate-900/30">
					<span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
						Снимок расцветки VITA {selectedShade} у зуба
					</span>
					<div className="flex items-center gap-1.5 shrink-0">
						<label className="min-h-[36px] px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-1 shadow-2xs transition cursor-pointer">
							<Camera size={12} />
							<span>Фото</span>
							<input
								type="file"
								accept="image/jpeg,image/png,image/webp"
								className="hidden"
								data-testid="shade-picker-file-input"
								onChange={(e) => {
									const file = e.target.files?.[0];
									if (!file) return;
									const reader = new FileReader();
									reader.onload = (ev) => {
										if (typeof ev.target?.result === "string") {
											onShadePhotoChange?.(ev.target.result);
										}
									};
									reader.readAsDataURL(file);
								}}
							/>
						</label>
						{onShadePhotoChange && (
							<button
								type="button"
								onClick={() =>
									onShadePhotoChange(
										`photos/vita_${selectedShade.toLowerCase()}_shade_reference.jpg`,
									)
								}
								className="min-h-[36px] px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
								data-testid="shade-picker-sample-photo-btn"
							>
								Образец
							</button>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
