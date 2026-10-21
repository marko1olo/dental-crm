import React from "react";
import { ExternalLink, Loader2, Send } from "lucide-react";
import { generateBarcodeSvg } from "../labMath";

export interface LabTrackingQrAndBarcodeProps {
	stageNote: string;
	setStageNote: (note: string) => void;
	handleAdvanceStage: () => Promise<void> | void;
	isUpdating: boolean;
	secureToken: string;
	portalUrl: string;
}

export function LabTrackingQrAndBarcode({
	stageNote,
	setStageNote,
	handleAdvanceStage,
	isUpdating,
	secureToken,
	portalUrl,
}: LabTrackingQrAndBarcodeProps): React.JSX.Element {
	return (
		<div className="space-y-4">
			{/* Technician Notes & Advance Stage Action */}
			<div className="space-y-2">
				<label className="block text-xs font-bold text-[var(--ink)]">
					Заметки зубного техника / Врача к текущему этапу
				</label>
				<div className="flex gap-2">
					<input
						type="text"
						placeholder="Напр. Каркас отфрезерован, требуется коррекция окклюзионного контакта на 16..."
						value={stageNote}
						onChange={(e) => setStageNote(e.target.value)}
						className="flex-1 h-10 px-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-xs text-[var(--ink)] focus:ring-2 focus:ring-[var(--teal)]"
					/>
					<button
						type="button"
						onClick={() => handleAdvanceStage()}
						disabled={isUpdating}
						className="min-h-[36px] h-10 px-4 rounded-xl bg-[var(--teal)] hover:opacity-90 text-white font-bold text-xs inline-flex items-center gap-2 shadow-sm disabled:opacity-50 transition-all cursor-pointer"
					>
						{isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
						Следующий этап
					</button>
				</div>
			</div>

			{/* Barcode & Technician Portal Link */}
			<div className="flex items-center justify-between pt-2 border-t border-[var(--line)]">
				<div
					className="w-48 text-[var(--ink)]"
					dangerouslySetInnerHTML={{ __html: generateBarcodeSvg(secureToken) }}
				/>
				<div className="flex items-center gap-2">
					<a
						href={portalUrl}
						target="_blank"
						rel="noreferrer"
						className="min-h-[36px] h-9 px-3.5 py-1.5 rounded-xl border border-[var(--line)] hover:bg-[var(--line)] text-xs font-bold text-[var(--ink)] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
					>
						<ExternalLink className="w-4 h-4" />
						Портал техника
					</a>
				</div>
			</div>
		</div>
	);
}
