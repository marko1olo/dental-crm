import React, { useRef } from "react";
import { UploadCloud } from "lucide-react";
import { isDemoShowcaseMode } from "../../../lib/demoMode.js";
import { SAMPLE_TRG_CEPHALOGRAM_URL } from "./types";

interface CephDropzoneProps {
	isDragOver: boolean;
	onFileProcess: (file: File) => void;
	onLoadDemoSample?: ((url: string) => void) | undefined;
}

export const CephDropzone: React.FC<CephDropzoneProps> = ({
	isDragOver,
	onFileProcess,
	onLoadDemoSample,
}) => {
	const fileInputRef = useRef<HTMLInputElement>(null);

	return (
		<div
			data-testid="ceph-dropzone"
			className={`w-full max-w-xl mx-3 sm:mx-4 mt-10 sm:mt-12 p-5 sm:p-8 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center text-center select-none shadow-2xl ${
				isDragOver
					? "border-teal-400 bg-teal-950/80 scale-[1.01]"
					: "border-slate-700 hover:border-teal-500 bg-slate-900 text-slate-100"
			}`}
			style={{
				backgroundColor: isDragOver ? "rgba(4, 47, 46, 0.85)" : "var(--paper-panel, #0f172a)",
				borderColor: isDragOver ? "var(--teal, #2dd4bf)" : "var(--line, #334155)",
				color: "var(--ink, #f8fafc)",
			}}
		>
			<input
				ref={fileInputRef}
				type="file"
				accept="image/*,.dcm"
				className="hidden"
				onChange={(e) => {
					const file = e.target.files?.[0];
					if (file) {
						onFileProcess(file);
					}
				}}
			/>
			<div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-teal-400 mb-3 sm:mb-4 shadow-lg shrink-0">
				<UploadCloud size={30} />
			</div>
			<h3 className="text-sm sm:text-lg font-black text-white m-0 mb-1.5" style={{ color: "var(--ink, #ffffff)" }}>
				Боковая телерентгенограмма черепа (ТРГ)
			</h3>
			<p className="text-xs sm:text-sm text-slate-200 font-medium max-w-md mb-2 leading-relaxed" style={{ color: "var(--muted, #e2e8f0)" }}>
				Для проведения цефалометрического анализа требуется реальный рентгеновский снимок пациента.
			</p>
			<p className="text-[11px] sm:text-xs text-slate-300 mb-4 sm:mb-5 font-mono font-medium" style={{ color: "var(--muted, #cbd5e1)" }}>
				Область загрузки снимка: перетащите ТРГ / DICOM / JPG / PNG
			</p>

			<div className="flex flex-col sm:flex-row items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
				<button
					type="button"
					onClick={() => fileInputRef.current?.click()}
					data-testid="choose-ceph-file-btn"
					className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs sm:text-sm font-bold shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
				>
					<UploadCloud size={16} />
					<span>Выбрать снимок ТРГ</span>
				</button>
				{isDemoShowcaseMode() && (
					<button
						type="button"
						data-testid="load-demo-ceph-sample-btn"
						onClick={() => onLoadDemoSample?.(SAMPLE_TRG_CEPHALOGRAM_URL)}
						className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs sm:text-sm font-bold shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
						title="Витринный демонстрационный снимок (только в демо-режиме)"
					>
						<span>Загрузить тестовый образец ТРГ (Демо)</span>
					</button>
				)}
			</div>

			<div className="flex items-center gap-2 mt-4 sm:mt-5 text-[11px] text-slate-400 font-medium flex-wrap justify-center">
				<span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">DICOM</span>
				<span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">JPG</span>
				<span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">PNG</span>
				<span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">WebP</span>
			</div>
		</div>
	);
};
