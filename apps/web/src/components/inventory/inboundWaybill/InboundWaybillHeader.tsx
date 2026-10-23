import React from "react";
import { Truck, X } from "lucide-react";

interface InboundWaybillHeaderProps {
	readonly onClose: () => void;
	readonly isPosting: boolean;
}

export const InboundWaybillHeader: React.FC<InboundWaybillHeaderProps> = ({
	onClose,
	isPosting,
}) => {
	return (
		<div className="shrink-0">
			{/* Mobile drag handle */}
			<div className="sm:hidden w-10 h-1.5 rounded-full bg-[var(--line)] mx-auto mt-2 mb-1" />

			<div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-[var(--line)] flex items-center justify-between gap-3 bg-[var(--paper-soft)]">
				<div className="flex items-center gap-2.5 min-w-0">
					<div className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center shrink-0">
						<Truck size={18} />
					</div>
					<div className="min-w-0">
						<h2 id="inbound-waybill-title" className="text-sm sm:text-base font-bold text-[var(--ink)] truncate">
							Приходная накладная материалов
						</h2>
						<p className="text-xs text-[var(--muted)] truncate">
							Оприходование партий стоматологических препаратов и расходников
						</p>
					</div>
				</div>

				<button
					type="button"
					onClick={onClose}
					disabled={isPosting}
					className="w-10 h-10 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line)]/10 transition cursor-pointer"
					aria-label="Закрыть окно"
				>
					<X size={18} />
				</button>
			</div>
		</div>
	);
};
