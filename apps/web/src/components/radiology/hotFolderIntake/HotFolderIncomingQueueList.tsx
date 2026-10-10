import React, { useRef } from "react";
import { Check, Clock, FolderSync, Scan, UploadCloud } from "lucide-react";
import { isItemFresh } from "../hotFolderTypes";
import type { HotFolderIncomingQueueListProps } from "./types";

export const HotFolderIncomingQueueList: React.FC<HotFolderIncomingQueueListProps> = ({
	items,
	activeItemId,
	onSelectItem,
	onDropFile,
	isDragOver,
	setIsDragOver,
}) => {
	const fileInputRef = useRef<HTMLInputElement>(null);

	return (
		<>
			{/* Discovered Files List with 1-click thumbnail preview */}
			<div className="hfi-files-list" data-testid="hfi-files-list">
				{items.length === 0 ? (
					<div className="p-6 text-center text-xs text-gray-400 flex flex-col items-center gap-2">
						<FolderSync className="w-8 h-8 text-teal-400/40" />
						<p className="font-semibold text-gray-300">В папке пока нет новых снимков (автозахват)</p>
						<p className="text-[11px] text-gray-500 max-w-[200px]">
							Экспортируйте снимок из программы визиографа или перетащите файл в область загрузки ниже.
						</p>
					</div>
				) : (
					items.map((item) => {
						const isSelected = item.id === activeItemId;
						const itemIsFresh = isItemFresh(item, 15);
						return (
							<button
								key={item.id}
								type="button"
								onClick={() => onSelectItem(item.id)}
								className={`hfi-file-card ${isSelected ? "active" : ""}`}
								data-testid={`hfi-file-card-${item.id}`}
							>
								<div className="hfi-file-card-top">
									<span className="hfi-file-modality-badge">
										<Scan className="w-3 h-3" />
										<span>{item.modalityLabel}</span>
									</span>
									<div className="flex items-center gap-1">
										{itemIsFresh && (
											<span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-500/20 text-amber-300 font-medium">
												Свежий
											</span>
										)}
										<span className={`hfi-file-status-badge ${item.status}`}>
											{item.status === "new"
												? "Новый"
												: item.status === "imported"
													? "Импортирован"
													: "В работе"}
										</span>
									</div>
								</div>

								<div className="flex items-start gap-2 mt-1.5">
									<div className="w-10 h-12 rounded bg-slate-950 border border-slate-700/60 overflow-hidden shrink-0 flex items-center justify-center">
										{item.imageUrl ? (
											<img
												src={item.imageUrl}
												alt={item.filename}
												className="w-full h-full object-cover"
												loading="lazy"
												decoding="async"
											/>
										) : (
											<Scan className="w-4 h-4 text-slate-500" />
										)}
									</div>
									<div className="flex-1 min-w-0">
										<p className="hfi-file-name" title={item.filename}>
											{item.filename}
										</p>
										<div className="hfi-file-meta-row">
											<span>{item.sourceLabel}</span>
											<span>{item.sizeFormatted}</span>
										</div>
										<div className="hfi-file-meta-row">
											<span className="hfi-file-teeth-tag">
												Зуб FDI: {item.detectedTeeth.join(", ")}
											</span>
											<span className="text-[10px] text-gray-400">
												<Clock className="w-2.5 h-2.5 inline mr-1" />
												{item.relativeTime}
											</span>
										</div>
									</div>
								</div>

								{item.patientMatch && (
									<div className="mt-1.5 pt-1 border-t border-slate-700/60 flex items-center justify-between text-[10px] text-emerald-400">
										<span className="truncate max-w-[170px] inline-flex items-center gap-1">
											<Check className="w-3 h-3 shrink-0" />
											<span>{item.patientMatch.patientName}</span>
										</span>
										<span className="font-mono font-bold">
											{item.patientMatch.confidence}% совпадение
										</span>
									</div>
								)}
							</button>
						);
					})
				)}
			</div>

			{/* Область загрузки снимков */}
			<div className="hfi-left-dropzone">
				<input
					ref={fileInputRef}
					type="file"
					accept=".dcm,.dicom,.jpg,.jpeg,.png,.tiff,.tif,.bmp"
					className="hidden"
					onChange={(e) => {
						const file = e.target.files?.[0];
						if (file) onDropFile(file);
					}}
				/>
				<div
					className={`hfi-dropzone-box ${isDragOver ? "dragover" : ""}`}
					data-testid="hfi-dropzone-box"
					onClick={() => fileInputRef.current?.click()}
					onDragOver={(e) => {
						e.preventDefault();
						setIsDragOver(true);
					}}
					onDragLeave={() => setIsDragOver(false)}
					onDrop={(e) => {
						e.preventDefault();
						setIsDragOver(false);
						const file = e.dataTransfer.files?.[0];
						if (file) onDropFile(file);
					}}
				>
					<UploadCloud className="w-5 h-5 text-teal-400" />
					<p className="hfi-dropzone-title">Область загрузки снимка</p>
					<p className="hfi-dropzone-sub">
						Перетащите файл снимка или нажмите для выбора (DICOM, TIFF, PNG, JPG)
					</p>
				</div>
			</div>
		</>
	);
};
