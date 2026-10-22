import type { SterilizationLogRecord } from "@dental/shared";
import { Award, CheckCircle2, MoreHorizontal, Printer } from "lucide-react";
import React from "react";

export interface AutoclaveMobileCardActionButtonsProps {
	readonly log: SterilizationLogRecord;
	readonly isStamped: boolean;
	readonly onPrintSinglePouch: (log: SterilizationLogRecord) => void;
	readonly onStampVerification: (logId: string) => void;
	readonly onSelectLogForSheet: (log: SterilizationLogRecord) => void;
}

export function AutoclaveMobileCardActionButtons({
	log,
	isStamped,
	onPrintSinglePouch,
	onStampVerification,
	onSelectLogForSheet,
}: AutoclaveMobileCardActionButtonsProps) {
	return (
		<div className="sanpin-mobile-card-actions">
			<button
				type="button"
				onClick={() => onPrintSinglePouch(log)}
				className="sanpin-mobile-card-btn sanpin-mobile-card-btn--teal touch-manipulation"
				style={{ fontSize: "0.7rem", padding: "0 0.45rem", gap: "0.25rem" }}
				title="Печать 1 термоэтикетки со штрихкодом (58x40 мм)"
				data-testid={`mobile-print-label-btn-${log.id}`}
			>
				<Printer size={14} className="shrink-0" />
				<span>Печать наклейки</span>
			</button>

			{isStamped ? (
				<span
					className="sanpin-mobile-card-btn sanpin-mobile-card-btn--stamped"
					style={{ fontSize: "0.7rem", padding: "0 0.45rem", gap: "0.25rem" }}
					title="Смена и цикл заверены цифровым штампом ЭЦП"
				>
					<CheckCircle2 size={14} className="shrink-0" />
					<span>Заверено ЭЦП</span>
				</span>
			) : (
				<button
					type="button"
					onClick={() => onStampVerification(log.id)}
					className="sanpin-mobile-card-btn sanpin-mobile-card-btn--teal touch-manipulation"
					style={{ fontSize: "0.7rem", padding: "0 0.45rem", gap: "0.25rem" }}
					title="Поставить цифровую заверку/штамп медсестры"
					data-testid={`mobile-stamp-ecp-btn-${log.id}`}
				>
					<Award size={14} className="shrink-0" />
					<span>Заверить (ЭЦП)</span>
				</button>
			)}

			<button
				type="button"
				onClick={() => onSelectLogForSheet(log)}
				className="sanpin-mobile-card-btn--more touch-manipulation"
				aria-label="Все опции цикла"
				data-testid={`mobile-cycle-more-btn-${log.id}`}
			>
				<MoreHorizontal size={18} />
			</button>
		</div>
	);
}
