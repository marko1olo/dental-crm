import React from "react";
import { Activity, FileText } from "lucide-react";
import { exportAlveolarRidgeToEmr, type EdentulousToothFdi, type AlveolarRidgeMeasurement } from "../../../../alveolarRidgeMorphometry.js";

export interface ImplantRidgeMorphometryCardProps {
	readonly ridgeWidths: {
		w2: number; w4: number; w6: number; h: number; isAdequate: boolean; isDetected: boolean;
	};
	readonly selectedDiameterMm: number;
	readonly selectedLengthMm: number;
	readonly edentulousTooth: EdentulousToothFdi;
	readonly setEdentulousTooth: (tooth: EdentulousToothFdi) => void;
	readonly activeCrossSection?: { nearestToothFdi?: string | null } | null | undefined;
	readonly isEditing043: boolean;
	readonly setIsEditing043: React.Dispatch<React.SetStateAction<boolean>>;
	readonly edited043Text: string;
	readonly setEdited043Text: (text: string) => void;
	readonly edentulousData: AlveolarRidgeMeasurement;
	readonly resolvedPatient: string;
	readonly handleExportToEmr?: (() => void) | undefined;
}

export const ImplantRidgeMorphometryCard: React.FC<ImplantRidgeMorphometryCardProps> = ({
	ridgeWidths, selectedDiameterMm, selectedLengthMm, edentulousTooth, setEdentulousTooth,
	activeCrossSection, isEditing043, setIsEditing043, edited043Text, setEdited043Text,
	edentulousData, resolvedPatient, handleExportToEmr,
}) => {
	const handleExport043 = () => {
		exportAlveolarRidgeToEmr(edentulousData, resolvedPatient, handleExportToEmr);
		if (isEditing043 && edited043Text) {
			try {
				window.dispatchEvent(new CustomEvent("dente-apply-soap-protocol", {
					detail: { soap: { statusLocalis: edited043Text, treatmentDescription: "", diagnosisIcd10: "K08.1", diagnosisTooth: String(edentulousTooth) }, immediate: true, mode: "smart_append" },
				}));
			} catch {}
		}
	};

	return (
		<div className="p-2.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-2" data-testid="cbct-alveolar-ridge-automation">
			<div className="flex items-center justify-between text-xs">
				<span className="font-bold text-[var(--ink)] flex items-center gap-1.5">
					<Activity className="w-3.5 h-3.5 text-[var(--primary)]" />
					<span>Морфометрия гребня (W2 / W4 / W6 / H):</span>
					{!ridgeWidths.isDetected && <span className="text-[10px] text-[var(--ink-muted)] font-normal ml-0.5 font-mono">(модель)</span>}
				</span>
				<div className="flex items-center gap-1">
					<button type="button" onClick={() => setEdentulousTooth(26)} className={`px-2 py-0.5 rounded-md text-xs font-bold border transition-colors cursor-pointer ${edentulousTooth === 26 ? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-xs" : "bg-[var(--paper)] text-[var(--ink-muted)] border-[var(--line)] hover:text-[var(--ink)]"}`} data-testid="cbct-ridge-tooth-26-btn">#26</button>
					<button type="button" onClick={() => setEdentulousTooth(27)} className={`px-2 py-0.5 rounded-md text-xs font-bold border transition-colors cursor-pointer ${edentulousTooth === 27 ? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-xs" : "bg-[var(--paper)] text-[var(--ink-muted)] border-[var(--line)] hover:text-[var(--ink)]"}`} data-testid="cbct-ridge-tooth-27-btn">#27</button>
					{activeCrossSection?.nearestToothFdi && activeCrossSection.nearestToothFdi !== "26" && activeCrossSection.nearestToothFdi !== "27" && (
						<button
							type="button"
							onClick={() => {
								const fdiStr = activeCrossSection.nearestToothFdi;
								if (fdiStr) {
									const num = Number.parseInt(fdiStr, 10);
									if (!Number.isNaN(num)) setEdentulousTooth(num);
								}
							}}
							className={`px-2 py-0.5 rounded-md text-xs font-mono font-bold border transition-colors cursor-pointer ${edentulousTooth === Number.parseInt(activeCrossSection.nearestToothFdi, 10) ? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-xs" : "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--paper-soft)]"}`}
							data-testid="cbct-ridge-current-tooth-btn"
						>
							#{activeCrossSection.nearestToothFdi}
						</button>
					)}
				</div>
			</div>

			<div className="grid grid-cols-4 gap-1 text-xs font-mono text-center" data-testid="cbct-ridge-measurements-badge">
				<div className="p-1 rounded bg-[var(--paper)] border border-[var(--line)]" title="Доступная высота"><span className="text-[10px] text-[var(--ink-muted)] block">H (высота)</span><span className="font-bold text-[var(--ink)]">{ridgeWidths.h.toFixed(1)} мм</span></div>
				<div className="p-1 rounded bg-[var(--paper)] border border-[var(--line)]" title="Ширина -2мм"><span className="text-[10px] text-[var(--ink-muted)] block">W2 (-2мм)</span><span className="font-bold text-[var(--ink)]">{ridgeWidths.w2.toFixed(1)} мм</span></div>
				<div className="p-1 rounded bg-[var(--paper)] border border-[var(--line)]" title="Ширина -4мм" data-testid="cbct-ridge-width-w4"><span className="text-[10px] text-[var(--ink-muted)] block">W4 (-4мм)</span><span className="font-bold text-[var(--ink)]">{ridgeWidths.w4.toFixed(1)} мм</span></div>
				<div className="p-1 rounded bg-[var(--paper)] border border-[var(--line)]" title="Базальная ширина -6мм"><span className="text-[10px] text-[var(--ink-muted)] block">W6 (-6мм)</span><span className="font-bold text-[var(--ink)]">{ridgeWidths.w6.toFixed(1)} мм</span></div>
			</div>

			<div className="text-xs text-[var(--ink-muted)] flex items-center justify-between pt-0.5">
				<span className="truncate">
					{ridgeWidths.w2 < selectedDiameterMm + 3.0 ? (
						<span className="text-[var(--warning)] font-bold">Дефицит ширины W2 (+{(selectedDiameterMm + 3.0 - ridgeWidths.w2).toFixed(1)} мм НКР)</span>
					) : ridgeWidths.h < selectedLengthMm + 2.0 ? (
						<span className="text-[var(--danger)] font-bold">Дефицит высоты H (синус-лифтинг)</span>
					) : (
						<span className="text-[var(--success)] font-bold">Параметры гребня достаточны</span>
					)}
				</span>
				<div className="flex items-center gap-1">
					<button type="button" onClick={() => setIsEditing043((prev) => !prev)} className={`px-2 py-0.5 rounded text-xs font-semibold border transition-colors cursor-pointer ${isEditing043 ? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-xs" : "bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] border-[var(--line)]"}`} data-testid="cbct-ridge-edit-043-toggle-btn">{isEditing043 ? "Свернуть" : "Текст протокола"}</button>
					<button type="button" onClick={handleExport043} className="px-2.5 py-0.5 rounded bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)] text-xs font-semibold flex items-center gap-1 shrink-0 transition-colors cursor-pointer" data-testid="cbct-ridge-export-043-btn"><FileText className="w-3.5 h-3.5 text-[var(--primary)]" /><span>В медкарту</span></button>
				</div>
			</div>

			{isEditing043 && (
				<div className="flex flex-col gap-1.5 pt-1.5 border-t border-[var(--line)]">
					<div className="flex items-center justify-between text-xs text-[var(--ink-muted)]"><span>Редактирование протокола ({resolvedPatient}):</span><span className="text-[var(--ink-muted)] font-mono">{edited043Text.length} симв.</span></div>
					<textarea value={edited043Text} onChange={(e) => setEdited043Text(e.target.value)} rows={3} className="w-full rounded-lg bg-[var(--paper)] p-2 text-xs font-mono text-[var(--ink)] border border-[var(--line)] focus:border-[var(--primary)] focus:outline-none resize-none leading-relaxed" placeholder="Текст клинического протокола для медкарты..." data-testid="cbct-ridge-043-textarea" />
				</div>
			)}
		</div>
	);
};
