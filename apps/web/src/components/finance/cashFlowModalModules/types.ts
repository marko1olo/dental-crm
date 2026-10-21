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
	return `${value.toLocaleString("ru-RU", {
		minimumFractionDigits: value % 1 !== 0 ? 2 : 0,
		maximumFractionDigits: 2,
	})} ₽`;
}
