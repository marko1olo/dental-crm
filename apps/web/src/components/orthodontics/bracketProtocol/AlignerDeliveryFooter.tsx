import React from "react";
import { Plus, Zap } from "lucide-react";

interface AlignerDeliveryFooterProps {
	readonly onIssueAlignerSet: (count: number, days: number) => void;
	readonly onApplyAttachmentsProtocol: () => void;
	readonly alignerSetIssuedCount?: number | undefined;
}

export const AlignerDeliveryFooter: React.FC<AlignerDeliveryFooterProps> = ({
	onIssueAlignerSet,
	onApplyAttachmentsProtocol,
	alignerSetIssuedCount,
}) => {
	return (
		<div className="flex items-center justify-between gap-2 flex-wrap pt-1 border-t border-[var(--line)]">
			<div className="flex items-center gap-1.5 flex-wrap">
				<button
					type="button"
					onClick={() => onIssueAlignerSet(2, 14)}
					data-testid="widget-issue-set-2-aligners-btn"
					className={`min-h-[44px] min-w-[44px] px-2.5 py-1 text-xs font-bold rounded-xl border transition-all cursor-pointer flex items-center gap-1 ${
						alignerSetIssuedCount === 2
							? "bg-[var(--primary)] text-white border-[var(--primary)]"
							: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
					}`}
					title="Выдать следующий сет из 2 капп на 14 дней"
				>
					<Zap size={13} />
					<span>Сет 2 каппы (+14 дн.)</span>
				</button>

				<button
					type="button"
					onClick={() => onIssueAlignerSet(4, 28)}
					data-testid="widget-issue-set-4-aligners-btn"
					className={`min-h-[44px] min-w-[44px] px-2.5 py-1 text-xs font-bold rounded-xl border transition-all cursor-pointer flex items-center gap-1 ${
						alignerSetIssuedCount === 4
							? "bg-[var(--primary)] text-white border-[var(--primary)]"
							: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
					}`}
					title="Выдать следующий сет из 4 капп на 28 дней"
				>
					<Zap size={13} />
					<span>Сет 4 каппы (+28 дн.)</span>
				</button>
			</div>

			<button
				type="button"
				onClick={onApplyAttachmentsProtocol}
				data-testid="append-attachments-to-soap-btn"
				className="min-h-[44px] h-9 md:h-9 px-3.5 py-1.5 rounded-xl bg-[var(--primary)] hover:opacity-90 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
				title="Добавить протокол в дневник визита без стирания ранее набранного текста"
				aria-label="Внести в дневник приёма"
			>
				<Plus size={15} />
				<span>Внести в дневник</span>
			</button>
		</div>
	);
};
