import React from "react";
import { FileArchive, FolderOpen, X } from "lucide-react";

export interface CbctDicomFlyoutProps {
	readonly onFolderUploadClick: () => void;
	readonly onZipUploadClick: () => void;
	readonly onClose: () => void;
}

export const CbctDicomFlyout: React.FC<CbctDicomFlyoutProps> = ({
	onFolderUploadClick,
	onZipUploadClick,
	onClose,
}) => {
	return (
		<div
			role="dialog"
			aria-label="Загрузка файлов DICOM"
			data-testid="cbct-dicom-flyout"
			className="absolute left-full ml-2 bottom-0 z-50 w-60 bg-zinc-950 border border-zinc-800 shadow-2xl rounded-xl p-3 text-zinc-100 max-sm:max-h-[calc(100vh-120px)] max-sm:overflow-y-auto"
		>
			<div className="flex items-center justify-between pb-2 border-b border-zinc-800 mb-2">
				<span className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
					<FolderOpen className="w-4 h-4 text-cyan-400" />
					Загрузить КТ / DICOM
				</span>
				<button
					type="button"
					onClick={onClose}
					className="w-7 h-7 min-w-[28px] min-h-[28px] [@media(pointer:coarse)]:w-11 [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-w-[44px] [@media(pointer:coarse)]:min-h-[44px] flex items-center justify-center rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
					aria-label="Закрыть меню"
				>
					<X className="w-4 h-4" />
				</button>
			</div>

			<div className="space-y-1.5">
				<button
					type="button"
					onClick={onFolderUploadClick}
					className="w-full px-3 py-2 [@media(pointer:coarse)]:py-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-100 border border-zinc-800 text-xs font-semibold flex items-center gap-2.5 transition-colors shadow-xs cursor-pointer"
					data-testid="cbct-dicom-folder-opt"
				>
					<FolderOpen className="w-4 h-4 text-cyan-400 shrink-0" />
					<div className="flex flex-col text-left min-w-0">
						<span className="font-bold truncate text-zinc-100">Папка DICOM</span>
						<span className="text-[10px] text-zinc-400 truncate">
							Серия срезов .dcm
						</span>
					</div>
				</button>

				<button
					type="button"
					onClick={onZipUploadClick}
					className="w-full px-3 py-2 [@media(pointer:coarse)]:py-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-100 border border-zinc-800 text-xs font-semibold flex items-center gap-2.5 transition-colors shadow-xs cursor-pointer"
					data-testid="cbct-dicom-zip-opt"
				>
					<FileArchive className="w-4 h-4 text-amber-400 shrink-0" />
					<div className="flex flex-col text-left min-w-0">
						<span className="font-bold truncate text-zinc-100">ZIP-архив КТ</span>
						<span className="text-[10px] text-zinc-400 truncate">
							Архив исследования .zip
						</span>
					</div>
				</button>
			</div>
		</div>
	);
};
