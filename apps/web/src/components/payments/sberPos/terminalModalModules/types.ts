import type {
	SberPosOperationType,
	SberPosTerminalConfig,
	SberPosTransactionResponse,
} from "@dental/shared";

export interface SberPosTerminalModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly totalBillKop?: number | undefined;
	readonly patientName?: string | undefined;
	readonly patientPhone?: string | undefined;
	readonly orderId?: string | undefined;
	readonly initialOperation?: SberPosOperationType | undefined;
	readonly onTransactionSuccess?:
		| ((response: SberPosTransactionResponse) => void)
		| undefined;
	readonly onSelectAlternativeMethod?:
		| ((method: "sbp" | "cash" | "deposit") => void)
		| undefined;
	readonly terminalConfig?: SberPosTerminalConfig | undefined;
	readonly forceUnconfigured?: boolean | undefined;
}
