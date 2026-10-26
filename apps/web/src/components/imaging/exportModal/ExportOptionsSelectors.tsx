/**
 * ExportOptionsSelectors.tsx — Выбор формата (JPG, PNG, DICOM) и слоев разметки (Мандат 8b <= 120 строк).
 */

import React from "react";
import type { ImagingExportOptions } from "../types";

interface ExportOptionsSelectorsProps {
	options: ImagingExportOptions;
	onOptionsChange: React.Dispatch<React.SetStateAction<ImagingExportOptions>>;
}

export const ExportOptionsSelectors: React.FC<ExportOptionsSelectorsProps> = ({
	options,
	onOptionsChange,
}) => {
	return (
		<>
			<div className="flex flex-col gap-1.5 text-xs">
				<label className="font-semibold text-[var(--ink,#f8fafc)]">Формат файла:</label>
				<div className="grid grid-cols-3 gap-2">
					{(["jpg", "png", "dicom"] as const).map((fmt) => (
						<button
							key={fmt}
							type="button"
							onClick={() => onOptionsChange((prev) => ({ ...prev, format: fmt }))}
							data-testid={`export-format-${fmt}`}
							className={`min-h-[44px] py-2 px-3 rounded-lg border text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center ${
								options.format === fmt
									? "border-[var(--teal,#0d9488)] bg-teal-500/15 text-teal-700 dark:text-teal-300 shadow-xs"
									: "border-[var(--line,#334155)] bg-[var(--paper-soft,#1e293b)] text-[var(--muted,#94a3b8)] hover:border-[var(--line-strong,#475569)]"
							}`}
						>
							{fmt === "dicom" ? "DICOM (.dcm)" : fmt}
						</button>
					))}
				</div>
			</div>

			<div className="flex flex-col gap-2 pt-1 text-xs">
				<label className="flex items-center gap-2 cursor-pointer min-h-[36px] select-none">
					<input
						type="checkbox"
						checked={options.withMeasurements}
						onChange={(e) => onOptionsChange((prev) => ({ ...prev, withMeasurements: e.target.checked }))}
						data-testid="checkbox-export-measurements"
						className="w-4 h-4 rounded accent-[var(--teal,#0d9488)] cursor-pointer"
					/>
					<span>Включить калиброванные замеры расстояний и углов</span>
				</label>
				<label className="flex items-center gap-2 cursor-pointer min-h-[36px] select-none">
					<input
						type="checkbox"
						checked={options.withAnnotations}
						onChange={(e) => onOptionsChange((prev) => ({ ...prev, withAnnotations: e.target.checked }))}
						data-testid="checkbox-export-annotations"
						className="w-4 h-4 rounded accent-[var(--teal,#0d9488)] cursor-pointer"
					/>
					<span>Включить юридический штамп и патологии</span>
				</label>
			</div>
		</>
	);
};
