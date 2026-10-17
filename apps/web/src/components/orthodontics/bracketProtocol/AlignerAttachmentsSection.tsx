import React from "react";
import { Plus, Zap } from "lucide-react";
import { ALIGNER_ATTACHMENT_PRESETS } from "./types";
import type { OrthoBracketProtocolSectionProps } from "./types";
import { AlignerTrackerSection } from "./AlignerTrackerSection";

export const AlignerAttachmentsSection: React.FC<OrthoBracketProtocolSectionProps> = (props) => {
	const { activeAttachmentPreset, onSelectAttachmentPreset, onApplyAttachmentsProtocol, onIssueAlignerSet, alignerSetIssuedCount = 2 } = props;

	return (
		<div data-testid="aligner-attachments-express-block" className="bg-[var(--paper-soft)] p-3.5 rounded-xl border border-[var(--line)] flex flex-col gap-2.5">
			<div className="flex items-center justify-between flex-wrap gap-1">
				<span className="text-xs font-black uppercase tracking-wider text-[var(--ink)] flex items-center gap-1.5">
					<Zap size={14} className="text-[var(--primary)]" /> Аттачменты элайнеров
				</span>
				<span className="text-[11px] font-bold text-[var(--muted)]">Экспресс-фиксация & контроль</span>
			</div>

			{/* 4 пресета аттачментов */}
			<div className="grid grid-cols-1 gap-1.5">
				{ALIGNER_ATTACHMENT_PRESETS.map((preset) => {
					const isSelected = activeAttachmentPreset === preset.id;
					return (
						<button
							key={preset.id} type="button" onClick={() => onSelectAttachmentPreset(preset.id)}
							data-testid={`preset-${preset.id}-attachments`}
							className={`min-h-[44px] p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
								isSelected ? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-xs font-black" : "bg-[var(--paper)] border-[var(--line)] hover:border-[var(--line-strong,var(--primary))] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
							}`}
						>
							<div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${isSelected ? "bg-white/20 text-white" : "bg-[var(--paper-soft)] text-[var(--primary)]"}`}>
								<Zap size={13} />
							</div>
							<div className="min-w-0 flex-1">
								<div className="text-xs font-bold leading-tight">{preset.label}</div>
								<div className={`text-[10px] line-clamp-1 mt-0.5 ${isSelected ? "text-white/80" : "text-[var(--muted)]"}`}>{preset.description}</div>
							</div>
						</button>
					);
				})}
			</div>

			{/* Трекер смены капп */}
			<AlignerTrackerSection {...props} />

			{/* Быстрая выдача сетов и внесение в дневник */}
			<div className="flex items-center justify-between gap-2 flex-wrap pt-1 border-t border-[var(--line)]">
				<div className="flex items-center gap-1.5 flex-wrap">
					<button
						type="button" onClick={() => onIssueAlignerSet(2, 14)} data-testid="widget-issue-set-2-aligners-btn"
						className={`min-h-[44px] min-w-[44px] px-2.5 py-1 text-xs font-bold rounded-xl border transition-all cursor-pointer flex items-center gap-1 ${alignerSetIssuedCount === 2 ? "bg-[var(--primary)] text-white border-[var(--primary)]" : "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"}`}
						title="Выдать следующий сет из 2 капп на 14 дней"
					>
						<Zap size={13} /> <span>Сет 2 каппы (+14 дн.)</span>
					</button>

					<button
						type="button" onClick={() => onIssueAlignerSet(4, 28)} data-testid="widget-issue-set-4-aligners-btn"
						className={`min-h-[44px] min-w-[44px] px-2.5 py-1 text-xs font-bold rounded-xl border transition-all cursor-pointer flex items-center gap-1 ${alignerSetIssuedCount === 4 ? "bg-[var(--primary)] text-white border-[var(--primary)]" : "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"}`}
						title="Выдать следующий сет из 4 капп на 28 дней"
					>
						<Zap size={13} /> <span>Сет 4 каппы (+28 дн.)</span>
					</button>
				</div>

				<button
					type="button" onClick={onApplyAttachmentsProtocol} data-testid="append-attachments-to-soap-btn"
					className="min-h-[44px] h-9 md:h-9 px-3.5 py-1.5 rounded-xl bg-[var(--primary)] hover:opacity-90 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
					title="Добавить протокол в дневник визита без стирания ранее набранного текста" aria-label="Внести в дневник приёма"
				>
					<Plus size={15} /> <span>Внести в дневник</span>
				</button>
			</div>
		</div>
	);
};
