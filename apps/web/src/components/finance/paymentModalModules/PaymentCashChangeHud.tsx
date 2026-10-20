import React from "react";
import { AlertCircle, CheckCircle2, Coins } from "lucide-react";

export interface PaymentCashChangeHudProps {
	readonly cashChange: {
		readonly changeRub: number;
		readonly isExact: boolean;
		readonly shortageRub: number;
	};
}

export const PaymentCashChangeHud: React.FC<PaymentCashChangeHudProps> = ({ cashChange }) => {
	if (cashChange.changeRub > 0) {
		return (
			<div className="change-display-hud has-change" data-testid="cash-change-display">
				<span className="font-bold flex items-center gap-1.5 truncate">
					<Coins size={15} className="shrink-0" />
					<span>Сдача пациенту:</span>
				</span>
				<span className="font-mono text-base font-black shrink-0 ml-2" data-testid="cash-change-amount">
					{cashChange.changeRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
				</span>
			</div>
		);
	}

	if (cashChange.isExact) {
		return (
			<div className="change-display-hud is-exact" data-testid="cash-exact-display">
				<span className="flex items-center gap-1.5">
					<CheckCircle2 size={15} className="shrink-0" />
					<span>Внесено ровно, без сдачи</span>
				</span>
			</div>
		);
	}

	if (cashChange.shortageRub > 0) {
		return (
			<div className="change-display-hud has-shortage" data-testid="cash-shortage-display">
				<span className="flex items-center gap-1.5 truncate">
					<AlertCircle size={15} className="shrink-0" />
					<span>Недостает до полной суммы:</span>
				</span>
				<span className="font-mono font-bold shrink-0 ml-2">
					{cashChange.shortageRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
				</span>
			</div>
		);
	}

	return null;
};
