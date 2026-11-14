export interface CashFlowModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialMode?: "cash_in" | "cash_out" | undefined;
	readonly cashInDrawerRub?: number | undefined;
	readonly onCashIn?:
		| ((
				amountRub: number,
				basis: string,
				typeAlias?: string,
		  ) => void | Promise<void>)
		| undefined;
	readonly onCashOut?:
		| ((
				amountRub: number,
				basis: string,
				recipientFio?: string,
				typeAlias?: string,
		  ) => void | Promise<void>)
		| undefined;
}

export function formatMoneyRu(value: number): string {
	const safeVal = Number.isFinite(value) ? (Object.is(value, -0) ? 0 : value) : 0;
	return `${safeVal.toLocaleString("ru-RU", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})} ₽`;
}
