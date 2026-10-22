import { X } from "lucide-react";
import React from "react";
import type { OutpatientProtocolTemplate } from "@dental/shared";

export interface SoapTemplatesPreviewModalProps {
	readonly previewProtocol: OutpatientProtocolTemplate | null;
	readonly onClose: () => void;
	readonly onApplyProtocol: (protocol: OutpatientProtocolTemplate, mode: "replace" | "append") => void;
}

export const SoapTemplatesPreviewModal: React.FC<SoapTemplatesPreviewModalProps> = ({
	previewProtocol,
	onClose,
	onApplyProtocol,
}) => {
	if (!previewProtocol) return null;

	return (
		<div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
			<div className="bg-[var(--paper)] text-[var(--ink)] rounded-2xl max-w-xl w-full p-5 border border-[var(--line)] shadow-2xl max-h-[85dvh] sm:max-h-[85vh] flex flex-col">
				<div className="flex items-center justify-between border-b border-[var(--line)] pb-3 mb-3">
					<div className="flex items-center gap-2 min-w-0">
						<span className="text-xs font-bold px-2 py-0.5 rounded bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-200 shrink-0">
							{previewProtocol.mkbCode}
						</span>
						<span className="text-sm font-bold text-[var(--ink)] truncate">
							{previewProtocol.name}
						</span>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="min-h-[44px] min-w-[44px] p-2 rounded-xl text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors flex items-center justify-center cursor-pointer shrink-0"
						aria-label="Закрыть предпросмотр протокола"
					>
						<X className="w-5 h-5" />
					</button>
				</div>
				<div className="overflow-y-auto space-y-2.5 text-xs text-[var(--ink)] pr-1 flex-1">
					<div><strong>Жалобы:</strong> {previewProtocol.complaint}</div>
					<div><strong>Анамнез:</strong> {previewProtocol.anamnesis}</div>
					<div><strong>Объективный статус:</strong> {previewProtocol.objectiveStatus}</div>
					<div><strong>Диагноз:</strong> {previewProtocol.diagnosis}</div>
					<div><strong>Протокол лечения:</strong> {previewProtocol.treatmentProtocol}</div>
					<div><strong>Рекомендации:</strong> {previewProtocol.recommendations}</div>
				</div>
				<div className="flex justify-end gap-2.5 mt-4 pt-3 border-t border-[var(--line)]">
					<button
						type="button"
						onClick={onClose}
						className="min-h-[44px] px-4 py-2 text-xs font-semibold rounded-xl bg-[var(--paper-soft)] text-[var(--ink)] hover:bg-[var(--paper-strong)] border border-[var(--line)] transition-colors cursor-pointer"
					>
						Закрыть
					</button>
					<button
						type="button"
						onClick={() => onApplyProtocol(previewProtocol, "replace")}
						className="min-h-[44px] px-4 py-2 text-xs font-bold rounded-xl bg-teal-600 hover:bg-teal-700 text-white shadow-sm transition-all cursor-pointer"
					>
						Вставить в дневник
					</button>
				</div>
			</div>
		</div>
	);
};
