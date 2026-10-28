import React, { useState } from "react";
import { showToast } from "../../GlobalToast";

export interface DentalLabOrderScansTabProps {
	readonly attachedImageUrl: string;
	readonly setAttachedImageUrl: (url: string) => void;
}

/**
 * Вкладка 3D-сканов и файлов челюсти (STL / PLY / OBJ) и клинических фото (Мандат 8b: <= 90 строк).
 */
export function DentalLabOrderScansTab({
	attachedImageUrl,
	setAttachedImageUrl,
}: DentalLabOrderScansTabProps): React.JSX.Element {
	const [customScanPath, setCustomScanPath] = useState(attachedImageUrl || "");

	return (
		<div className="space-y-4" data-testid="lab-order-scans-tab">
			<div className="p-4 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] space-y-3">
				<h3 className="text-xs font-bold text-[var(--ink,#0f172a)] m-0">
					3D-скан челюсти (STL / PLY / OBJ) и прикрепление клинических фото
				</h3>
				<p className="text-xs text-[var(--muted,#64748b)] m-0">
					Укажите путь к интраоральному скану, сетевую папку томографа или прикрепите файл.
				</p>
				<div className="flex flex-wrap gap-2">
					<button
						type="button"
						onClick={() => {
							setCustomScanPath("/models/mandible_scan_16.stl");
							setAttachedImageUrl("/models/mandible_scan_16.stl");
						}}
						className="px-2.5 py-1 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-semibold hover:border-[#0d9488] cursor-pointer"
					>
						Нижняя челюсть (STL)
					</button>
					<button
						type="button"
						onClick={() => {
							setCustomScanPath("/models/maxilla_scan_24.ply");
							setAttachedImageUrl("/models/maxilla_scan_24.ply");
						}}
						className="px-2.5 py-1 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-semibold hover:border-[#0d9488] cursor-pointer"
					>
						Верхняя челюсть (PLY)
					</button>
					<button
						type="button"
						onClick={() => {
							setCustomScanPath("/photos/bite_registration_16.jpg");
							setAttachedImageUrl("/photos/bite_registration_16.jpg");
						}}
						className="px-2.5 py-1 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-semibold hover:border-[#0d9488] cursor-pointer"
					>
						Фото прикуса (JPEG)
					</button>
				</div>
				<div className="space-y-1.5 pt-2">
					<label className="block text-xs font-semibold text-[var(--ink,#0f172a)]">Путь или URL файла:</label>
					<div className="flex gap-2">
						<input
							type="text"
							value={customScanPath}
							onChange={(e) => {
								setCustomScanPath(e.target.value);
								setAttachedImageUrl(e.target.value);
							}}
							placeholder="https://... или /models/scan.stl"
							className="flex-1 p-2 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs text-[var(--ink,#0f172a)]"
						/>
						<button
							type="button"
							onClick={() => showToast("Файл скана успешно прикреплен к наряду", "success")}
							className="px-3 py-2 rounded-xl border border-[#0d9488] bg-[#0d9488] text-white text-xs font-bold cursor-pointer"
						>
							Прикрепить
						</button>
					</div>
				</div>
				{attachedImageUrl && (
					<div className="p-3 rounded-lg border border-teal-500/40 bg-teal-500/10 text-xs text-teal-900 dark:text-teal-100 flex items-center justify-between">
						<span>Файл подключен: <strong>{attachedImageUrl}</strong></span>
						<button
							type="button"
							onClick={() => {
								setCustomScanPath("");
								setAttachedImageUrl("");
							}}
							className="text-xs text-rose-600 hover:underline cursor-pointer"
						>
							Удалить
						</button>
					</div>
				)}
			</div>
		</div>
	);
}
