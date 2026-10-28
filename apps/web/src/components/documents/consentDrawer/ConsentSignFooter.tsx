import React from "react";
import { Check, Printer, X } from "lucide-react";
import type { ConsentKindOption } from "./types";

export interface ConsentSignFooterProps {
	selectedKind: ConsentKindOption;
	onConfirm: () => void;
	onPrintBlank?: ((kind: ConsentKindOption) => void) | undefined;
	onClose: () => void;
}

export const ConsentSignFooter: React.FC<ConsentSignFooterProps> = ({
	selectedKind,
	onConfirm,
	onPrintBlank,
	onClose,
}) => {
	return (
		<div className="flex items-center justify-between gap-3 pt-3 border-t border-[var(--line)] flex-wrap">
			<div className="flex items-center gap-2">
				{onPrintBlank && (
					<button
						type="button"
						className="h-10 min-h-[40px] px-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs font-semibold hover:border-[var(--teal,#0d9488)] transition-colors inline-flex items-center gap-1.5 cursor-pointer"
						onClick={() => onPrintBlank(selectedKind)}
					>
						<Printer size={15} className="text-[var(--teal,#0d9488)]" />
						<span>Печать бланка</span>
					</button>
				)}
				<button
					type="button"
					className="h-10 min-h-[40px] px-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] text-xs hover:text-[var(--ink)] transition-colors inline-flex items-center gap-1 cursor-pointer"
					onClick={onClose}
				>
					<X size={15} />
					<span>Отмена</span>
				</button>
			</div>

			<button
				type="button"
				className="primary-button h-10 min-h-[40px] px-5 rounded-xl bg-[var(--teal,#0d9488)] hover:bg-[#0f766e] text-white text-xs font-bold transition-colors inline-flex items-center gap-2 cursor-pointer shadow-sm"
				onClick={onConfirm}
			>
				<Check size={16} />
				<span>Подтвердить подпись</span>
			</button>
		</div>
	);
};
