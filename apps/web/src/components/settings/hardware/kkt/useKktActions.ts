import { useState } from "react";
import { KktLanPrinterService } from "../../../../services/hardware/kktLanPrinter.js";
import { showToast } from "../../../GlobalToast.js";
import type { KktDeviceHealthStatus, CircuitBreakerTelemetry } from "../../../../services/hardware/hardwareTypes.js";
import type { TestReceiptResult } from "./kktTypes.js";
import { printEmulatorReceipt } from "./kktEmulatorService.js";

interface KktOptions {
	protocol: "atol" | "shtrih";
	host: string;
	port: number;
	cashier: string;
	isEmulatorMode: boolean;
}

export function useKktActions({ protocol, host, port, cashier, isEmulatorMode }: KktOptions) {
	const [healthStatus, setHealthStatus] = useState<KktDeviceHealthStatus | null>(null);
	const [isChecking, setIsChecking] = useState(false);
	const [isPrinting, setIsPrinting] = useState(false);
	const [circuitTelemetry, setCircuitTelemetry] = useState<CircuitBreakerTelemetry>(() =>
		KktLanPrinterService.getCircuitBreakerTelemetry(),
	);
	const [lastReceipt, setLastReceipt] = useState<TestReceiptResult | null>(null);

	const handleSaveConfig = () => {
		KktLanPrinterService.setConfig({ protocol, host, port: Number(port), cashierFullName: cashier });
		showToast("Настройки ККТ сохранены", "success");
	};

	const handleCheckHealth = async () => {
		setIsChecking(true);
		try {
			if (isEmulatorMode) {
				await new Promise((r) => setTimeout(r, 200));
				const emuStatus: KktDeviceHealthStatus = {
					online: true, paperOk: true, coverClosed: true, fnPresent: true, fnFiscalized: true, latencyMs: 3,
					modelName: protocol === "atol" ? "АТОЛ 27Ф (Программный эмулятор)" : "ШТРИХ-М-01Ф (Программный эмулятор)",
					fnSerial: "9960440302145896", kktSerialNumber: "0010670000012345", shiftNumber: 142, checkedAt: new Date().toISOString(),
				};
				setHealthStatus(emuStatus);
				setCircuitTelemetry(KktLanPrinterService.getCircuitBreakerTelemetry());
				showToast(`Эмулятор ККТ готов к работе (${emuStatus.modelName})`, "success");
				return;
			}
			const res = await KktLanPrinterService.checkDeviceHealth({ host, port: Number(port), protocol });
			setHealthStatus(res);
			setCircuitTelemetry(KktLanPrinterService.getCircuitBreakerTelemetry());
			showToast(res.online ? `Связь с ККТ установлена (${res.latencyMs} мс)` : `ККТ недоступна: ${res.error || "Таймаут сокета"}`, res.online ? "success" : "error");
		} catch (err) {
			showToast(`Ошибка проверки ККТ: ${err instanceof Error ? err.message : String(err)}`, "error");
		} finally {
			setIsChecking(false);
		}
	};

	const handlePrintTestReceipt = async () => {
		setIsPrinting(true);
		try {
			if (isEmulatorMode) {
				const emu = await printEmulatorReceipt(protocol, cashier);
				if (emu.result) {
					setLastReceipt(emu.result);
					showToast(`Тестовый чек ${protocol.toUpperCase()} №${emu.result.docNum} сформирован (ФПД: ${emu.result.fpd})`, "success");
				} else {
					showToast(`Ошибка печати эмулятора: ${emu.error}`, "error");
				}
				return;
			}
			const printRes = await KktLanPrinterService.printReceipt({
				operationType: "income", cashierFullName: cashier,
				items: [{ name: "Тестовая услуга DENTE CRM", priceRub: 10.0, quantity: 1, amountRub: 10.0 }],
				totalRub: 10.0, cashRub: 10.0,
			});
			if (printRes.success) {
				const rec: TestReceiptResult = {
					docNum: printRes.fiscalDocNum || "00001", fpd: printRes.fiscalSign || "123456789",
					qrString: printRes.qrString || "", totalRub: 10.0, timestamp: new Date().toLocaleTimeString("ru-RU"),
				};
				setLastReceipt(rec);
				showToast(`Фискальный чек №${rec.docNum} успешно напечатан на ККТ`, "success");
			} else {
				showToast(`Сбой печати на ККТ: ${printRes.error || "Аппарат оффлайн"}`, "error");
			}
		} catch (err) {
			showToast(`Исключение при печати: ${err instanceof Error ? err.message : String(err)}`, "error");
		} finally {
			setIsPrinting(false);
			setCircuitTelemetry(KktLanPrinterService.getCircuitBreakerTelemetry());
		}
	};

	const handleResetCircuitBreaker = () => {
		KktLanPrinterService.resetCircuitBreaker();
		setCircuitTelemetry(KktLanPrinterService.getCircuitBreakerTelemetry());
		showToast("Circuit Breaker ККТ сброшен (статус CLOSED)", "info");
	};

	return {
		healthStatus, isChecking, isPrinting, circuitTelemetry, lastReceipt,
		handleSaveConfig, handleCheckHealth, handlePrintTestReceipt, handleResetCircuitBreaker,
	};
}
