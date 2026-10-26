import React from "react";
import { Activity, FileText } from "lucide-react";
import { exportZakharovRidgeTo043Emr, type ZakharovEdentulousToothFdi } from "../../../../zakharovRidgeAutomation";

export interface ImplantRidgeMorphometryCardProps {
	readonly ridgeWidths: {
		w2: number; w4: number; w6: number; h: number; isAdequate: boolean; isDetected: boolean;
	};
	readonly selectedDiameterMm: number;
	readonly selectedLengthMm: number;
	readonly edentulousTooth: ZakharovEdentulousToothFdi;
	readonly setEdentulousTooth: (tooth: ZakharovEdentulousToothFdi) => void;
	readonly activeCrossSection?: { nearestToothFdi?: string | null } | undefined;
	readonly isEditing043: boolean;
	readonly setIsEditing043: React.Dispatch<React.SetStateAction<boolean>>;
	readonly edited043Text: string;
	readonly setEdited043Text: (text: string) => void;
	readonly edentulousData: any;
	readonly resolvedPatient: string;
	readonly handleExportToEmr?: (() => void) | undefined;
}

export const ImplantRidgeMorphometryCard: React.FC<ImplantRidgeMorphometryCardProps> = ({
	ridgeWidths, selectedDiameterMm, selectedLengthMm, edentulousTooth, setEdentulousTooth,
	activeCrossSection, isEditing043, setIsEditing043, edited043Text, setEdited043Text,
	edentulousData, resolvedPatient, handleExportToEmr,
}) => {
	const handleExport043 = () => {
		exportZakharovRidgeTo043Emr(edentulousData, resolvedPatient, handleExportToEmr);
		if (isEditing043 && edited043Text) {
			try {
				window.dispatchEvent(new CustomEvent("dente-apply-soap-protocol", {
					detail: { soap: { statusLocalis: edited043Text, treatmentDescription: "", diagnosisIcd10: "K08.1", diagnosisTooth: String(edentulousTooth) }, immediate: true, mode: "smart_append" },
				}));
			} catch {}
		}
	};

	return (
		<div className="p-2 rounded-lg bg-zinc-950/80 border border-zinc-800/80 flex flex-col gap-1.5" data-testid="cbct-zakharov-ridge-automation">
			<div className="flex items-center justify-between text-xs">
				<span className="font-bold text-zinc-300 flex items-center gap-1">
					<Activity className="w-3.5 h-3.5 text-amber-400" />
					<span>Морфометрия гребня (W2 / W4 / W6 / H):</span>
					{!ridgeWidths.isDetected && <span className="text-[9px] text-zinc-500 font-normal ml-0.5 font-mono">(модель)</span>}
				</span>
				<div className="flex items-center gap-1">
					<button type="button" onClick={() => setEdentulousTooth(26)} className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${edentulousTooth === 26 ? "bg-amber-950/70 text-amber-200 border-amber-500/50" : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-zinc-200"}`} data-testid="cbct-ridge-tooth-26-btn">#26</button>
					<button type="button" onClick={() => setEdentulousTooth(27)} className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${edentulousTooth === 27 ? "bg-amber-950/70 text-amber-200 border-amber-500/50" : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-zinc-200"}`} data-testid="cbct-ridge-tooth-27-btn">#27</button>
					{activeCrossSection?.nearestToothFdi && activeCrossSection.nearestToothFdi !== "26" && activeCrossSection.nearestToothFdi !== "27" && (
						<button type="button" onClick={() => { const num = Number.parseInt(activeCrossSection.nearestToothFdi!, 10); if (!Number.isNaN(num)) setEdentulousTooth(num as any); }} className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border transition-colors cursor-pointer ${edentulousTooth === Number.parseInt(activeCrossSection.nearestToothFdi!, 10) ? "bg-amber-950/70 text-amber-200 border-amber-500/50" : "bg-zinc-800 text-cyan-300 border-cyan-500/40 hover:text-zinc-200"}`} data-testid="cbct-ridge-current-tooth-btn">#{activeCrossSection.nearestToothFdi}</button>
					)}
				</div>
			</div>

			<div className="grid grid-cols-4 gap-1 text-[11px] font-mono text-center" data-testid="cbct-ridge-measurements-badge">
				<div className="p-1 rounded bg-zinc-900 border border-zinc-800" title="Доступная высота"><span className="text-[9px] text-zinc-500 block uppercase">H (высота)</span><span className="font-bold text-amber-300">{ridgeWidths.h.toFixed(1)} мм</span></div>
				<div className="p-1 rounded bg-zinc-900 border border-zinc-800" title="Ширина -2мм"><span className="text-[9px] text-zinc-500 block uppercase">W2 (-2мм)</span><span className="font-bold text-cyan-300">{ridgeWidths.w2.toFixed(1)} мм</span></div>
				<div className="p-1 rounded bg-zinc-900 border border-zinc-800" title="Ширина -4мм" data-testid="cbct-ridge-width-w4"><span className="text-[9px] text-zinc-500 block uppercase">W4 (-4мм)</span><span className="font-bold text-emerald-300">{ridgeWidths.w4.toFixed(1)} мм</span></div>
				<div className="p-1 rounded bg-zinc-900 border border-zinc-800" title="Базальная ширина -6мм"><span className="text-[9px] text-zinc-500 block uppercase">W6 (-6мм)</span><span className="font-bold text-purple-300">{ridgeWidths.w6.toFixed(1)} мм</span></div>
			</div>

			<div className="text-[10px] text-zinc-400 flex items-center justify-between pt-0.5">
				<span className="truncate">
					{ridgeWidths.w2 < selectedDiameterMm + 3.0 ? (
						<span className="text-amber-400 font-bold">Дефицит ширины W2 (+{(selectedDiameterMm + 3.0 - ridgeWidths.w2).toFixed(1)} мм НКР)</span>
					) : ridgeWidths.h < selectedLengthMm + 2.0 ? (
						<span className="text-rose-400 font-bold">Дефицит высоты H (синус-лифтинг)</span>
					) : (
						<span className="text-emerald-400 font-bold">Параметры гребня достаточны</span>
					)}
				</span>
				<div className="flex items-center gap-1">
					<button type="button" onClick={() => setIsEditing043((prev) => !prev)} className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${isEditing043 ? "bg-cyan-950 text-cyan-300 border-cyan-500" : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700"}`} data-testid="cbct-ridge-edit-043-toggle-btn">{isEditing043 ? "Свернуть" : "Текст протокола"}</button>
					<button type="button" onClick={handleExport043} className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-amber-300 border border-amber-500/40 text-[10px] font-bold flex items-center gap-1 shrink-0 transition-colors cursor-pointer" data-testid="cbct-ridge-export-043-btn"><FileText className="w-3 h-3 text-amber-400" /><span>В медкарту</span></button>
				</div>
			</div>

			{isEditing043 && (
				<div className="flex flex-col gap-1 pt-1 border-t border-zinc-800">
					<div className="flex items-center justify-between text-[10px] text-zinc-400"><span>Редактирование протокола ({resolvedPatient}):</span><span className="text-zinc-500 font-mono">{edited043Text.length} симв.</span></div>
					<textarea value={edited043Text} onChange={(e) => setEdited043Text(e.target.value)} rows={3} className="w-full rounded bg-zinc-950 p-1.5 text-[10px] font-mono text-zinc-200 border border-zinc-700 focus:border-amber-400 focus:outline-none resize-none leading-relaxed" placeholder="Текст клинического протокола для медкарты..." data-testid="cbct-ridge-043-textarea" />
				</div>
			)}
		</div>
	);
};
