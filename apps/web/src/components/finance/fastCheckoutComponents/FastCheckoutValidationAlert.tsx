import React from "react";
import { AlertCircle, Zap } from "lucide-react";

export interface FastCheckoutValidationAlertProps {
	readonly validation: {
		readonly isValid: boolean;
		readonly errorMessageRu?: string | undefined;
		readonly errorMessage?: string | undefined;
	};
	readonly activeMethodTitle: string;
	readonly onFixValidationError: () => void;
}

export const FastCheckoutValidationAlert: React.FC<FastCheckoutValidationAlertProps> = ({
	validation,
	activeMethodTitle,
	onFixValidationError,
}) => {
	if (validation.isValid) return null;

	return (
		<div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between flex-wrap gap-2">
			<div className="flex items-center gap-2">
				<AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
				<span>
					<strong>Ошибка оплаты:</strong> {validation.errorMessageRu || validation.errorMessage}
				</span>
			</div>
			<button
				type="button"
				onClick={onFixValidationError}
				className="px-3.5 py-1.5 min-h-[44px] rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm flex items-center gap-1 cursor-pointer transition-all shadow-xs"
				title="Сбросить суммы и применить выбранный способ на весь чек"
			>
				<Zap size={13} /> Применить на весь чек ({activeMethodTitle})
			</button>
		</div>
	);
};
