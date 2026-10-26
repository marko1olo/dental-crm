/**
 * RadiologyArchiveTable.tsx — Табличный список исследований с действиями (Мандат 8b).
 */

import React from "react";
import type { ImagingStudy } from "@dental/shared";
import { RadiologyStudyRow } from "../RadiologyStudyRow";

export interface RadiologyArchiveTableProps {
	readonly studies: ImagingStudy[];
	readonly isLoading: boolean;
	readonly onOpenStudio?: ((study: ImagingStudy) => void) | undefined;
	readonly onOpenViewer?: ((study: ImagingStudy) => void) | undefined;
	readonly onOpenSensorViewer?: ((study: ImagingStudy) => void) | undefined;
	readonly onOpenBindControl: (study: ImagingStudy) => void;
	readonly onUploadNew?: (() => void) | undefined;
	readonly onOpenDirectRvgCapture?: (() => void) | undefined;
}

export const RadiologyArchiveTable: React.FC<RadiologyArchiveTableProps> = ({
	studies,
	isLoading,
	onOpenStudio,
	onOpenViewer,
	onOpenSensorViewer,
	onOpenBindControl,
	onUploadNew,
	onOpenDirectRvgCapture,
}) => {
	if (isLoading) {
		return (
			<div className="flex-1 flex items-center justify-center text-xs text-[var(--text-muted)]">
				Загрузка радиологического архива...
			</div>
		);
	}

	if (studies.length === 0) {
		return (
			<div
				className="flex-1 flex flex-col items-center justify-center p-8 text-center text-xs text-[var(--text-muted)] gap-2"
				data-testid="archive-empty-state"
			>
				<h3 className="text-sm font-semibold text-[var(--ink)]">Снимков пока нет</h3>
				<p className="text-xs text-[var(--muted)]">
					Снимков пока нет. Загрузите DICOM или подключите датчик визиографа
				</p>
				<div className="flex gap-2 mt-2">
					<button
						type="button"
						data-testid="btn-empty-upload-new"
						className="btn-primary px-3 py-1.5 text-xs rounded-md"
						onClick={onUploadNew}
					>
						Загрузить снимок / КТ
					</button>
					<button
						type="button"
						data-testid="btn-empty-scan-disk"
						className="btn-secondary px-3 py-1.5 text-xs rounded-md"
						onClick={onOpenDirectRvgCapture}
					>
						Поиск на диске
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="flex-1 overflow-y-auto">
			<div className="divide-y divide-[var(--line)]">
				{studies.map((study) => (
					<RadiologyStudyRow
						key={study.id}
						study={study}
						onOpenStudio={onOpenStudio}
						onOpenViewer={onOpenViewer}
						onOpenSensorViewer={onOpenSensorViewer}
						onControlBinding={onOpenBindControl}
					/>
				))}
			</div>
		</div>
	);
};
