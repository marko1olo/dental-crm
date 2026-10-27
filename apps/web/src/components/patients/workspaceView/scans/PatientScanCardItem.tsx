import { Eye } from "lucide-react";
import React from "react";

export interface PatientScanCardItemProps {
	study: any;
	onSelect: (study: any, isCbct: boolean, thumbSrc: string) => void;
}

export const PatientScanCardItem: React.FC<PatientScanCardItemProps> = ({ study, onSelect }) => {
	const isCbct = study.kind === "cbct" || study.modality === "cbct_3d";
	const thumbSrc = study.previewUrl || study.viewerUrl || "/radiology/sample_rvg_tooth16.jpg";

	const badgeText =
		study.kind === "cbct"
			? "3D КЛКТ"
			: study.kind === "opg"
				? "ОПТГ"
				: study.kind === "cephalometric" || study.kind === "trg"
					? "ТРГ"
					: "RVG";

	return (
		<div
			className="group relative rounded-xl overflow-hidden border border-[var(--line)] bg-[#030712] cursor-pointer shrink-0 shadow-xs hover:border-[var(--teal)] transition-all"
			style={{
				width: "200px",
				height: "200px",
				minWidth: "200px",
				minHeight: "200px",
				maxWidth: "200px",
				maxHeight: "200px",
				aspectRatio: "1 / 1",
			}}
			data-testid={`patient-scan-card-${study.id}`}
			onClick={() => onSelect(study, isCbct, thumbSrc)}
			title={isCbct ? "Открыть в 3D КЛКТ Студии" : "Открыть в DICOM / RVG просмотрщике"}
		>
			<img
				src={thumbSrc}
				alt={study.title || "Рентген-снимок"}
				loading="lazy"
				decoding="async"
				className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
				style={{ width: "100%", height: "100%", objectFit: "cover" }}
			/>
			<div className="absolute top-2 left-2 flex flex-col gap-1 items-start pointer-events-none">
				<span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-black/75 text-[var(--teal,#0d9488)] border border-[var(--teal,#0d9488)]/40 shadow-xs backdrop-blur-xs">
					{badgeText}
				</span>
				{study.toothCode && (
					<span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-black/75 text-white border border-white/20 shadow-xs">
						#{study.toothCode}
					</span>
				)}
			</div>
			<div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex items-center justify-between text-white text-[10px]">
				<span className="truncate max-w-[110px] opacity-90">
					{study.capturedAt ? new Date(study.capturedAt).toLocaleDateString("ru-RU") : "Архив"}
					{study.effectiveDoseMicrosv ? ` · ${study.effectiveDoseMicrosv} мкЗв` : ""}
				</span>
				<span className="text-[var(--teal,#0d9488)] font-semibold flex items-center gap-0.5 group-hover:underline">
					<Eye size={12} />
					<span>Открыть</span>
				</span>
			</div>
		</div>
	);
};
