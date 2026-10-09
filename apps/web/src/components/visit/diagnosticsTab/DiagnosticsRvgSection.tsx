import { Camera, FolderInput, Image as ImageIcon, Scan } from "lucide-react";
import React from "react";
import { VisiographAnalyzer } from "../imaging/VisiographAnalyzer";

export interface DiagnosticsRvgSectionProps {
	isVisible: boolean;
	initialToothNumber: number;
	target: string;
	visitPatientName: string | null;
	selectedPatientName: string | null;
	activePatientId?: string;
	activeVisitId?: string;
	onInsertToProtocol?: (text: string) => void;
	onOpenDirectRvg: () => void;
	onOpenHotFolder: () => void;
	onOpenDicomViewer: () => void;
	onOpenRadiologyReferral: () => void;
}

export function DiagnosticsRvgSection({
	isVisible,
	initialToothNumber,
	target,
	visitPatientName,
	selectedPatientName,
	activePatientId,
	activeVisitId,
	onInsertToProtocol,
	onOpenDirectRvg,
	onOpenHotFolder,
	onOpenDicomViewer,
	onOpenRadiologyReferral,
}: DiagnosticsRvgSectionProps) {
	return (
		<div className={isVisible ? "flex flex-col gap-3" : "hidden"}>
			<div className="flex items-center justify-between gap-3 flex-wrap p-2.5 sm:p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line-subtle)] shadow-2xs">
				<div className="flex items-center gap-2.5 flex-wrap">
					<span className="diag-badge">
						<Scan size={14} />
						<span>Зуб {initialToothNumber || 16}</span>
					</span>
					{target === "visit-patient" ||
					(target === "no-visit" && (visitPatientName || selectedPatientName)) ? (
						<span
							className="text-xs text-[var(--muted)] flex items-center gap-1.5"
							data-testid="visit-imaging-target-ok"
						>
							<span className="w-1.5 h-1.5 rounded-full bg-[var(--teal)] shrink-0 inline-block" />
							<span>
								Карта: <strong className="text-[var(--ink)]">{visitPatientName || selectedPatientName}</strong>
							</span>
						</span>
					) : null}
				</div>

				<div className="flex items-center gap-2 flex-wrap">
					<button
						type="button"
						onClick={onOpenDirectRvg}
						data-testid="btn-open-direct-rvg-modal"
						className="diag-btn-teal"
						title="Прямой захват снимка с датчика визиографа"
					>
						<Camera size={14} />
						<span>+ Захват с визиографа</span>
					</button>
					<button
						type="button"
						onClick={onOpenHotFolder}
						data-testid="btn-open-hot-folder-modal"
						className="diag-btn"
						title="Папка автозахвата снимков: автоматический импорт из каталога визиографа"
					>
						<FolderInput size={14} className="text-[var(--teal)]" />
						<span>Папка автозахвата</span>
					</button>
					<button
						type="button"
						onClick={onOpenDicomViewer}
						data-testid="btn-open-dicom-viewer-modal"
						className="diag-btn"
						title="Открыть DICOM / ОПТГ панораму"
					>
						<ImageIcon size={14} className="text-[var(--teal)]" />
						<span>DICOM / ОПТГ</span>
					</button>
				</div>
			</div>

			{/* Модуль визиографа и рентген-анализа ИИ */}
			<VisiographAnalyzer
				patientId={activePatientId}
				visitId={activeVisitId}
				toothCode={initialToothNumber ? String(initialToothNumber) : undefined}
				onInsertToProtocol={onInsertToProtocol}
				onConnectRvg={onOpenDirectRvg}
				onReferToRadiology={onOpenRadiologyReferral}
				onUploadDicom={onOpenDicomViewer}
			/>
		</div>
	);
}
