import type {
	SberPosOperationType,
	SberPosTerminalConfig,
	SberPosTerminalStatus,
	SberPosTransactionResponse,
} from "@dental/shared";
import { sberbankTerminal } from "../../../../services/hardware/sberbankTerminal.js";

export interface ExecuteSberPosOptions {
	readonly config: SberPosTerminalConfig;
	readonly targetOp: SberPosOperationType;
	readonly totalBillKop: number;
	readonly orderId: string;
	readonly patientName: string;
	readonly patientPhone: string;
	readonly originalRrnInput: string;
	readonly originalAuthInput: string;
	readonly setStatus: (st: SberPosTerminalStatus) => void;
	readonly setStatusMessage: (msg: string) => void;
	readonly onTransactionSuccess?:
		| ((res: SberPosTransactionResponse) => void)
		| undefined;
}

export async function executeSberPosTransaction(
	opts: ExecuteSberPosOptions,
): Promise<SberPosTransactionResponse> {
	const {
		config,
		targetOp,
		totalBillKop,
		orderId,
		patientName,
		patientPhone,
		originalRrnInput,
		originalAuthInput,
		setStatus,
		setStatusMessage,
		onTransactionSuccess,
	} = opts;

	sberbankTerminal.setConfig({ ...config });
	const res = await sberbankTerminal.executeTransaction({
		amountKopecks: targetOp === "settlement" ? 0 : totalBillKop,
		patientId: orderId,
		patientName,
		patientPhone,
		orderId,
		operation: targetOp,
		originalRrn: originalRrnInput || undefined,
		originalAuthCode: originalAuthInput || undefined,
		autoPrintSlip: false,
		onStatusUpdate: (st, msg) => {
			setStatus(st);
			setStatusMessage(msg);
		},
	});

	if (res.success) {
		setStatus("success");
		setStatusMessage(
			"Оплата через терминал Сбербанк успешно авторизована банком!",
		);
		onTransactionSuccess?.(res);
	} else {
		setStatus(res.responseCode === "99" ? "pin_timeout" : "card_declined");
		setStatusMessage(res.responseMessageRu || "Транзакция отклонена банком");
	}

	return res;
}
