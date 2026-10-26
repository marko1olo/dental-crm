import { AtolKkt10Emulator, ShtrihMKktEmulator } from "../../../../services/hardware/hardwareEmulators.js";
import type { TestReceiptResult } from "./kktTypes.js";

export async function printEmulatorReceipt(protocol: "atol" | "shtrih", cashier: string): Promise<{ result: TestReceiptResult | null; error?: string }> {
	await new Promise((r) => setTimeout(r, 300));
	if (protocol === "atol") {
		const emulator = new AtolKkt10Emulator();
		const res = emulator.printFiscalReceipt({
			type: "sell",
			taxationType: "usn_income",
			operator: { name: cashier },
			items: [{ name: "Тестовая медицинская услуга (Первичный осмотр)", price: 10.0, quantity: 1, amount: 10.0, tax: { type: "vat_none" } }],
			total: 10.0,
			payments: [{ type: "cash", sum: 10.0 }],
		});
		if (res.success && res.fiscalDocumentNumber) {
			return {
				result: {
					docNum: String(res.fiscalDocumentNumber),
					fpd: String(res.fiscalSign || "084729103"),
					qrString: res.qrCode || `t=${new Date().toISOString()}&s=10.00&fn=9960440302145896&i=${res.fiscalDocumentNumber}&fp=${res.fiscalSign}&n=1`,
					totalRub: 10.0,
					timestamp: new Date().toLocaleTimeString("ru-RU"),
				},
			};
		}
		return { result: null, error: res.errorDescription };
	}
	const shtrih = new ShtrihMKktEmulator();
	const res = shtrih.printReceipt({
		operatorName: cashier,
		operationType: 1,
		totalKopecks: 1000,
		items: [{ name: "Тестовая медицинская услуга (Первичный осмотр)", priceKopecks: 1000, quantity: 1, vatRate: 6, paymentMethod: 4, paymentSubject: 4 }],
		cashKopecks: 1000,
	});
	if (res.success && res.fiscalDocNum) {
		return {
			result: {
				docNum: res.fiscalDocNum,
				fpd: res.fiscalSign || "192837465",
				qrString: res.qrString || "",
				totalRub: 10.0,
				timestamp: new Date().toLocaleTimeString("ru-RU"),
			},
		};
	}
	return { result: null, error: res.error };
}
