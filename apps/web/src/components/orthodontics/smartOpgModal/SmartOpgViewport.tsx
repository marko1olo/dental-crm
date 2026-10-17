import React from "react";
import { Activity } from "lucide-react";
import type { OpgAiInferenceResponse } from "../opgAiInferenceService";

interface SmartOpgViewportProps {
	isLoading: boolean;
	activeImage: string;
	zoom: number;
	analysis?: OpgAiInferenceResponse["analysis"] | undefined;
	selectedTooth: number | null;
	onSelectTooth: (fdi: number) => void;
	showFdiLabels: boolean;
	showPathologies: boolean;
	isPatientMode: boolean;
}

export const SmartOpgViewport: React.FC<SmartOpgViewportProps> = ({
	isLoading,
	activeImage,
	zoom,
	analysis,
	selectedTooth,
	onSelectTooth,
	showFdiLabels,
	showPathologies,
	isPatientMode,
}) => {
	if (isLoading) {
		return (
			<div className="flex-1 relative flex items-center justify-center p-4 overflow-auto">
				<div className="flex flex-col items-center gap-3 text-slate-400 animate-pulse">
					<Activity className="w-8 h-8 text-sky-400 animate-spin" />
					<p className="text-sm font-medium">Анализ панорамы нейросетью...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="flex-1 relative flex items-center justify-center p-4 overflow-auto">
			<div className="relative transition-transform duration-150 ease-out select-none" style={{ transform: `scale(${zoom})` }}>
				<img
					src={activeImage}
					alt="Панорамный снимок ОПТГ"
					className="max-w-[950px] max-h-[600px] w-auto h-auto object-contain rounded-lg border border-slate-800/80 shadow-2xl pointer-events-none"
				/>

				{analysis && (
					<div
						className="absolute top-0 bottom-0 w-px bg-amber-500/50 pointer-events-none border-r border-dashed border-amber-500/80"
						style={{ left: `${(analysis.midlineX / 1024) * 100}%` }}
					/>
				)}

				{analysis && (
					<div className="absolute inset-0">
						{Object.values(analysis.teeth).map((slot) => {
							const t = slot.toothDetection;
							if (!t) return null;

							const isSelected = selectedTooth === slot.fdi;
							const hasImpacted = slot.status === "Retained";
							const hasPerio = slot.status === "Periodontitis";

							const borderColor = (showPathologies && hasImpacted)
								? "border-rose-500"
								: (showPathologies && hasPerio)
									? "border-amber-500"
									: "border-sky-500/40";

							const bgColor = (showPathologies && hasImpacted)
								? "bg-rose-500/20"
								: (showPathologies && hasPerio)
									? "bg-amber-500/20"
									: "bg-sky-500/5";

							return (
								<div
									key={slot.fdi}
									onClick={() => onSelectTooth(slot.fdi)}
									style={{
										left: `${(t.x1 / 1024) * 100}%`,
										top: `${(t.y1 / 574) * 100}%`,
										width: `${(t.width / 1024) * 100}%`,
										height: `${(t.height / 574) * 100}%`,
									}}
									className={`absolute cursor-pointer border rounded transition-all ${borderColor} ${bgColor} ${
										isSelected ? "ring-2 ring-white ring-offset-1 ring-offset-slate-900" : ""
									}`}
								>
									{showFdiLabels && (
										<span className="absolute -top-3 left-0 px-1 py-0.2 rounded text-[10px] font-bold whitespace-nowrap leading-none select-none bg-slate-900/90 text-sky-400 border border-sky-500/40">
											{slot.fdi}
										</span>
									)}

									{isPatientMode && hasImpacted && (
										<div className="absolute inset-0 flex items-center justify-center bg-rose-600/30 rounded backdrop-blur-[1px]">
											<span className="text-[11px] font-extrabold text-white bg-rose-600 px-1.5 py-0.5 rounded shadow-sm">
												УДАЛИТЬ 8-КУ
											</span>
										</div>
									)}
								</div>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
};
