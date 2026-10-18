import React from "react";

export interface ToolbarTermSelectorProps {
	readonly installmentMonths: 3 | 6 | 12 | 24;
	readonly onInstallmentMonthsChange: (months: 3 | 6 | 12 | 24) => void;
}

const MONTH_OPTIONS: readonly (3 | 6 | 12 | 24)[] = [3, 6, 12, 24];

export const ToolbarTermSelector: React.FC<ToolbarTermSelectorProps> = ({
	installmentMonths,
	onInstallmentMonthsChange,
}) => {
	return (
		<div
			className="tp-segmented-bar shrink-0"
			role="group"
			aria-label="Срок рассрочки"
		>
			{MONTH_OPTIONS.map((m) => (
				<button
					key={m}
					type="button"
					onClick={() => onInstallmentMonthsChange(m)}
					className={`treatment-3tier-term-btn ${installmentMonths === m ? "active" : ""}`}
					title={`${m} месяцев рассрочки`}
				>
					{m}м
				</button>
			))}
		</div>
	);
};
