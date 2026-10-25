import React from "react";
import { ReceiptText, X } from "lucide-react";

interface MobilePriceDrawerHeaderProps {
	isNew: boolean;
	code: string;
	onClose: () => void;
}

export const MobilePriceDrawerHeader: React.FC<MobilePriceDrawerHeaderProps> = ({
	isNew,
	code,
	onClose,
}) => {
	return (
		<>
			<div
				className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing shrink-0"
				onClick={onClose}
			>
				<div className="w-9 h-1.5 rounded-full bg-[var(--line-strong,rgba(150,150,150,0.4))]" />
			</div>

			<div className="flex items-center justify-between px-5 py-2.5 border-b border-[var(--line-subtle)] shrink-0">
				<div className="flex items-center gap-2.5 min-w-0 pr-2">
					<div className="w-8 h-8 rounded-lg bg-[var(--teal-soft)] text-[var(--teal)] flex items-center justify-center shrink-0">
						<ReceiptText size={17} />
					</div>
					<div className="min-w-0">
						<h3
							id="mobile-price-drawer-title"
							className="text-[17px] font-semibold text-[var(--ink)] tracking-tight truncate leading-tight"
						>
							{isNew ? "Новая услуга" : "Параметры услуги"}
						</h3>
						{code && (
							<span className="text-[11px] font-mono text-[var(--muted)]">
								Код услуги: {code}
							</span>
						)}
					</div>
				</div>
				<button
					type="button"
					onClick={onClose}
					className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-full flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] active:bg-[var(--paper-soft)] transition-colors cursor-pointer"
					aria-label="Закрыть"
					data-testid="btn-close-price-drawer"
				>
					<X size={20} />
				</button>
			</div>
		</>
	);
};
