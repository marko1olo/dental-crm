import React from "react";
import { Check, FileText } from "lucide-react";

interface SmartOpgFooterProps {
	isApplied: boolean;
	onApply: () => void;
	onSwitchToDetails?: () => void;
	variant?: "desktop" | "mobile";
}

export const SmartOpgFooter: React.FC<SmartOpgFooterProps> = ({
	isApplied,
	onApply,
	onSwitchToDetails,
	variant = "desktop",
}) => {
	if (variant === "mobile") {
		return (
			<div className="lg:hidden absolute bottom-3 left-3 right-3 z-30 flex items-center gap-2 bg-[var(--paper-strong)]/90 backdrop-blur-md p-2 rounded-2xl border border-[var(--line)] shadow-xl">
				<button
					type="button"
					onClick={onApply}
					data-testid="btn-apply-opg-odontogram-mobile"
					className="primary-button flex-1 min-h-[48px] py-2.5 px-4 !rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md active:scale-98 cursor-pointer"
				>
					<Check className="w-4 h-4" />
					<span>{isApplied ? "Внесено в формулу!" : "Принять в зубную формулу"}</span>
				</button>
				{onSwitchToDetails && (
					<button
						type="button"
						onClick={onSwitchToDetails}
						data-testid="mobile-btn-switch-to-details"
						className="secondary-button min-h-[48px] px-3.5 !rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
						title="Перейти к заключению"
					>
						<FileText className="w-4 h-4 text-[var(--primary)]" />
						<span>Отчет</span>
					</button>
				)}
			</div>
		);
	}

	return (
		<footer className="p-3 sm:p-4 bg-[var(--paper-soft)] border-t border-[var(--line)] flex flex-col gap-1.5 sm:gap-2 shrink-0 z-10">
			<button
				type="button"
				onClick={onApply}
				data-testid="btn-apply-opg-odontogram"
				className={`primary-button w-full min-h-[48px] py-3 px-4 !rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg cursor-pointer active:scale-98 ${
					isApplied ? "!bg-emerald-600 !text-white" : ""
				}`}
			>
				<Check className="w-4 h-4" />
				<span>{isApplied ? "Внесено в зубную формулу!" : "Принять в зубную формулу"}</span>
			</button>

			<p className="text-[11px] text-center text-[var(--muted)] font-medium">
				Данные переносятся в медицинскую карту с возможностью ручной правки.
			</p>
		</footer>
	);
};
