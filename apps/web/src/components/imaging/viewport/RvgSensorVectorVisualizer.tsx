/**
 * RvgSensorVectorVisualizer.tsx — Векторный визуализатор и дропзона отсутствующего снимка RVG
 * Mandate 8b: строго <= 120 строк.
 */

import React from "react";
import { UploadCloud } from "lucide-react";
import type { ImagingStudy } from "../types";

export interface RvgSensorVectorVisualizerProps {
	study?: ImagingStudy | null | undefined;
	loading?: boolean;
	hasFile?: boolean;
	viewerStyle?: React.CSSProperties;
	kindLabels?: Record<string, string>;
	onAttachFile?: () => void;
}

const RVG_KIND_LABELS: Record<string, string> = {
	periapical: "Прицельный снимок RVG",
	bitewing: "Интерпроксимальный снимок",
	opg: "Панорамный снимок (ОПТГ)",
	ceph: "Телерентгенограмма (ТРГ)",
	cbct: "КЛКТ 3D томограмма",
	photo: "Фотопротокол",
	other: "Рентген-снимок",
};

export function RvgSensorVectorVisualizer({
	study, hasFile, viewerStyle, kindLabels, onAttachFile,
}: RvgSensorVectorVisualizerProps) {
	const toothCode = study?.toothCode;
	const toothLabel = toothCode ? `Зуб #${toothCode}` : (study?.region || null);
	const kindName = study
		? RVG_KIND_LABELS[study.kind] || kindLabels?.[study.kind] || "Прицельный снимок RVG"
		: "Прицельный снимок RVG";

	const studyMeta = study as Record<string, unknown> | undefined;
	const resolution = studyMeta?.resolutionLpMm ? `Разрешение: ${studyMeta.resolutionLpMm} lp/mm` : null;
	const exposure = studyMeta?.kvp && studyMeta?.exposureSeconds ? `${studyMeta.kvp} kV · ${studyMeta.exposureSeconds} s` : null;
	const dose = studyMeta?.doseUsv ? `${studyMeta.doseUsv} µSv` : null;
	const hasAcquisitionMetadata = Boolean(resolution || exposure || dose);

	return (
		<div
			className="rvg-sensor-visualizer rvg-clean-previewer w-full h-full flex flex-col items-center justify-center p-4 sm:p-6 select-none"
			style={{ ...viewerStyle, minHeight: "240px", backgroundColor: "#090d16", color: "#f8fafc" }}
		>
			<div
				className="w-full max-w-md p-5 sm:p-6 rounded-xl border border-dashed flex flex-col items-center text-center gap-3 transition-colors shadow-xs"
				style={{ borderColor: "#334155", background: "#0c1322" }}
			>
				<div className="w-12 h-12 rounded-xl flex items-center justify-center bg-teal-500/10 text-teal-500 border border-teal-500/20 shadow-inner">
					<UploadCloud className="w-6 h-6" />
				</div>
				<div className="flex flex-col gap-1">
					<div className="flex items-center justify-center gap-2">
						<h3 className="text-sm font-bold text-[var(--ink,#f8fafc)]">{kindName}</h3>
						{toothLabel && (
							<span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
								{toothLabel}
							</span>
						)}
					</div>
					<p className="text-xs text-[var(--muted,#94a3b8)]">
						{hasFile ? "Исследование готово к разбору" : "Файл визиографа или DICOM еще не прикреплен к карточке"}
					</p>
				</div>

				{hasAcquisitionMetadata && (
					<div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-[11px] font-mono text-[var(--muted,#94a3b8)]">
						{resolution && <span className="px-2 py-0.5 rounded bg-[var(--paper,#1e293b)] border border-[var(--line,#334155)]">{resolution}</span>}
						{exposure && <span className="px-2 py-0.5 rounded bg-[var(--paper,#1e293b)] border border-[var(--line,#334155)]">{exposure}</span>}
						{dose && <span className="px-2 py-0.5 rounded bg-[var(--paper,#1e293b)] border border-[var(--line,#334155)]" title="Дозовая нагрузка">{dose}</span>}
					</div>
				)}

				{onAttachFile && (
					<button
						type="button"
						className="primary-button mt-1.5 text-xs py-1.5 px-4 inline-flex items-center gap-1.5 font-semibold cursor-pointer shadow-xs"
						onClick={onAttachFile}
						title="Прикрепить файл снимка к исследованию"
					>
						<UploadCloud size={14} />
						<span>Загрузить снимок</span>
					</button>
				)}
			</div>
		</div>
	);
}
