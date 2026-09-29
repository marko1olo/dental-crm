import React, { useState } from "react";
import {
	Activity,
	AlertCircle,
	CheckCircle2,
	FileText,
	Power,
	Printer,
	RefreshCw,
	RotateCcw,
	ShieldAlert,
	Zap,
} from "lucide-react";
import { KktLanPrinterService } from "../../../services/hardware/kktLanPrinter.js";
import { AtolKkt10Emulator, ShtrihMKktEmulator } from "../../../services/hardware/hardwareEmulators.js";
import { showToast } from "../../GlobalToast.js";
import type { KktDeviceHealthStatus, CircuitBreakerTelemetry } from "../../../services/hardware/hardwareTypes.js";

interface TestReceiptResult {
	docNum: string;
	fpd: string;
	qrString: string;
	totalRub: number;
	timestamp: string;
}

export function HardwareKktSection() {
	const currentCfg = KktLanPrinterService.getConfig();

	const [protocol, setProtocol] = useState<"atol" | "shtrih">(currentCfg.protocol);
	const [host, setHost] = useState(currentCfg.host);
	const [port, setPort] = useState(currentCfg.port);
	const [cashier, setCashier] = useState(currentCfg.cashierFullName);
	const [isEmulatorMode, setIsEmulatorMode] = useState(true);
	const [connectionType, setConnectionType] = useState<"lan" | "com">("lan");
	const [comPortName, setComPortName] = useState("COM3");
	const [baudRate, setBaudRate] = useState("115200");

	const [healthStatus, setHealthStatus] = useState<KktDeviceHealthStatus | null>(null);
	const [isChecking, setIsChecking] = useState(false);
	const [isPrinting, setIsPrinting] = useState(false);
	const [circuitTelemetry, setCircuitTelemetry] = useState<CircuitBreakerTelemetry>(() =>
		KktLanPrinterService.getCircuitBreakerTelemetry(),
	);
	const [lastReceipt, setLastReceipt] = useState<TestReceiptResult | null>(null);

	const handleSaveConfig = () => {
		KktLanPrinterService.setConfig({
			protocol,
			host,
			port: Number(port),
			cashierFullName: cashier,
		});
		showToast("Настройки ККТ сохранены", "success");
	};

	const handleCheckHealth = async () => {
		setIsChecking(true);
		try {
			if (isEmulatorMode) {
				// Pure in-memory emulator check (zero external roundtrip delay)
				await new Promise((r) => setTimeout(r, 200));
				const emuStatus: KktDeviceHealthStatus = {
					online: true,
					paperOk: true,
					coverClosed: true,
					fnPresent: true,
					fnFiscalized: true,
					latencyMs: 3,
					modelName: protocol === "atol" ? "АТОЛ 27Ф (Программный эмулятор 54-ФЗ)" : "ШТРИХ-М-01Ф (Программный эмулятор)",
					fnSerial: "9960440302145896",
					kktSerialNumber: "0010670000012345",
					shiftNumber: 142,
					checkedAt: new Date().toISOString(),
				};
				setHealthStatus(emuStatus);
				setCircuitTelemetry(KktLanPrinterService.getCircuitBreakerTelemetry());
				showToast(`Эмулятор ККТ готов к работе (${emuStatus.modelName})`, "success");
				return;
			}

			const res = await KktLanPrinterService.checkDeviceHealth({
				host,
				port: Number(port),
				protocol,
			});
			setHealthStatus(res);
			setCircuitTelemetry(KktLanPrinterService.getCircuitBreakerTelemetry());
			if (res.online) {
				showToast(`Связь с ККТ установлена (${res.latencyMs} мс)`, "success");
			} else {
				showToast(`ККТ недоступна: ${res.error || "Таймаут сокета"}`, "error");
			}
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
				await new Promise((r) => setTimeout(r, 300));
				if (protocol === "atol") {
					const emulator = new AtolKkt10Emulator();
					const result = emulator.printFiscalReceipt({
						type: "sell",
						taxationType: "usn_income",
						operator: { name: cashier },
						items: [
							{
								name: "Тестовая медицинская услуга (Первичный осмотр)",
								price: 10.0,
								quantity: 1,
								amount: 10.0,
								tax: { type: "vat_none" },
							},
						],
						total: 10.0,
						payments: [{ type: "cash", sum: 10.0 }],
					});

					if (result.success && result.fiscalDocumentNumber) {
						const rec: TestReceiptResult = {
							docNum: String(result.fiscalDocumentNumber),
							fpd: String(result.fiscalSign || "084729103"),
							qrString: result.qrCode || `t=${new Date().toISOString()}&s=10.00&fn=9960440302145896&i=${result.fiscalDocumentNumber}&fp=${result.fiscalSign}&n=1`,
							totalRub: 10.0,
							timestamp: new Date().toLocaleTimeString("ru-RU"),
						};
						setLastReceipt(rec);
						showToast(`Тестовый чек №${rec.docNum} успешно сформирован в эмуляторе (ФПД: ${rec.fpd})`, "success");
					} else {
						showToast(`Ошибка печати эмулятора: ${result.errorDescription}`, "error");
					}
				} else {
					const shtrih = new ShtrihMKktEmulator();
					const result = shtrih.printReceipt({
						operatorName: cashier,
						operationType: 1,
						totalKopecks: 1000,
						items: [
							{
								name: "Тестовая медицинская услуга (Первичный осмотр)",
								priceKopecks: 1000,
								quantity: 1,
								vatRate: 6,
								paymentMethod: 4,
								paymentSubject: 4,
							},
						],
						cashKopecks: 1000,
					});
					if (result.success && result.fiscalDocNum) {
						const rec: TestReceiptResult = {
							docNum: result.fiscalDocNum,
							fpd: result.fiscalSign || "192837465",
							qrString: result.qrString || "",
							totalRub: 10.0,
							timestamp: new Date().toLocaleTimeString("ru-RU"),
						};
						setLastReceipt(rec);
						showToast(`Тестовый чек ШТРИХ-М №${rec.docNum} напечатан (ФПД: ${rec.fpd})`, "success");
					} else {
						showToast(`Ошибка печати ШТРИХ-М: ${result.error}`, "error");
					}
				}
				return;
			}

			// Real Hardware Printing
			const printRes = await KktLanPrinterService.printReceipt({
				operationType: "income",
				cashierFullName: cashier,
				items: [
					{
						name: "Тестовая услуга DENTE CRM",
						priceRub: 10.0,
						quantity: 1,
						amountRub: 10.0,
					},
				],
				totalRub: 10.0,
				cashRub: 10.0,
			});

			if (printRes.success) {
				const rec: TestReceiptResult = {
					docNum: printRes.fiscalDocNum || "00001",
					fpd: printRes.fiscalSign || "123456789",
					qrString: printRes.qrString || "",
					totalRub: 10.0,
					timestamp: new Date().toLocaleTimeString("ru-RU"),
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

	return (
		<div className="hw-kkt-section" data-testid="hardware-kkt-section" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
			{/* Top Description & Mode Switcher */}
			<div
				style={{
					display: "flex",
					flexWrap: "wrap",
					alignItems: "center",
					justifyContent: "space-between",
					gap: "12px",
					padding: "12px 14px",
					background: "var(--paper-soft)",
					border: "1px solid var(--line)",
					borderRadius: "8px",
				}}
			>
				<div>
					<div style={{ fontWeight: 600, fontSize: "13px", color: "var(--ink)" }}>
						Фискальные регистраторы и онлайн-кассы
					</div>
					<div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>
						Прямой LAN / COM-порт протокол АТОЛ и ШТРИХ-М без посредников и задержек облака.
					</div>
				</div>

				{/* Solo Doctor & Small Clinic Friendly: Emulator Mode Toggle (Mandate 8s) */}
				<label
					style={{
						display: "inline-flex",
						alignItems: "center",
						gap: "8px",
						padding: "6px 10px",
						background: isEmulatorMode ? "rgba(16, 185, 129, 0.1)" : "var(--paper)",
						border: `1px solid ${isEmulatorMode ? "rgba(16, 185, 129, 0.3)" : "var(--line)"}`,
						borderRadius: "6px",
						cursor: "pointer",
						fontSize: "12px",
						fontWeight: 500,
						color: isEmulatorMode ? "var(--success, green)" : "var(--ink)",
					}}
					title="В режиме эмулятора чеки рассчитываются по 54-ФЗ с генерацией QR-кода ФНС без расхода фискального накопителя"
				>
					<input
						type="checkbox"
						checked={isEmulatorMode}
						onChange={(e) => setIsEmulatorMode(e.target.checked)}
						style={{ accentColor: "var(--success, green)" }}
					/>
					<span>Режим эмулятора кассы (без расхода ФН)</span>
				</label>
			</div>

			{/* Form Configuration Grid */}
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
					gap: "12px",
				}}
			>
				{/* Protocol */}
				<div className="hw-field-group">
					<label className="hw-field-label">
						<span>Протокол ККТ</span>
					</label>
					<select
						className="hw-field-select"
						value={protocol}
						onChange={(e) => {
							const proto = e.target.value as "atol" | "shtrih";
							setProtocol(proto);
							setPort(proto === "atol" ? 16732 : 5555);
						}}
					>
						<option value="atol">АТОЛ (Драйвер ККТ 10 / TCP порт 16732)</option>
						<option value="shtrih">ШТРИХ-М (Протокол ФР / TCP порт 5555)</option>
					</select>
				</div>

				{/* Interface Type */}
				<div className="hw-field-group">
					<label className="hw-field-label">
						<span>Тип подключения</span>
					</label>
					<select
						className="hw-field-select"
						value={connectionType}
						onChange={(e) => setConnectionType(e.target.value as "lan" | "com")}
					>
						<option value="lan">Сетевой LAN / Wi-Fi (TCP сокет)</option>
						<option value="com">Последовательный COM-порт (RS-232 / USB Virtual COM)</option>
					</select>
				</div>

				{/* Host or COM Port */}
				{connectionType === "lan" ? (
					<>
						<div className="hw-field-group">
							<label className="hw-field-label">
								<span>IP-адрес в подсети клиники</span>
							</label>
							<input
								type="text"
								className="hw-field-input"
								value={host}
								onChange={(e) => setHost(e.target.value)}
								placeholder="192.168.1.150"
							/>
						</div>

						<div className="hw-field-group">
							<label className="hw-field-label">
								<span>TCP порт сокета</span>
							</label>
							<input
								type="number"
								className="hw-field-input"
								value={port}
								onChange={(e) => setPort(Number(e.target.value))}
								placeholder={protocol === "atol" ? "16732" : "5555"}
							/>
						</div>
					</>
				) : (
					<>
						<div className="hw-field-group">
							<label className="hw-field-label">
								<span>Имя COM-порта</span>
							</label>
							<input
								type="text"
								className="hw-field-input"
								value={comPortName}
								onChange={(e) => setComPortName(e.target.value)}
								placeholder="COM3"
							/>
						</div>

						<div className="hw-field-group">
							<label className="hw-field-label">
								<span>Скорость (Baud Rate)</span>
							</label>
							<select
								className="hw-field-select"
								value={baudRate}
								onChange={(e) => setBaudRate(e.target.value)}
							>
								<option value="115200">115200 бод (Стандарт USB-COM)</option>
								<option value="57600">57600 бод</option>
								<option value="19200">19200 бод</option>
								<option value="9600">9600 бод (RS-232 классический)</option>
							</select>
						</div>
					</>
				)}

				{/* Default Cashier Full Name */}
				<div className="hw-field-group">
					<label className="hw-field-label">
						<span>ФИО кассира по умолчанию (тег 1021)</span>
					</label>
					<input
						type="text"
						className="hw-field-input"
						value={cashier}
						onChange={(e) => setCashier(e.target.value)}
						placeholder="Иванова А. С."
					/>
				</div>
			</div>

			{/* Telemetry and Action Buttons */}
			<div
				style={{
					display: "flex",
					flexWrap: "wrap",
					alignItems: "center",
					justifyContent: "space-between",
					gap: "10px",
					padding: "12px",
					background: "var(--paper-soft)",
					border: "1px solid var(--line)",
					borderRadius: "8px",
				}}
			>
				<div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px" }}>
					<button
						type="button"
						className="hw-btn-compact primary"
						onClick={handleCheckHealth}
						data-testid="kkt-btn-check-health"
					>
						<RefreshCw size={13} className={isChecking ? "animate-spin" : ""} />
						<span>Проверить связь с ККТ</span>
					</button>

					<button
						type="button"
						className="hw-btn-compact"
						onClick={handlePrintTestReceipt}
						data-testid="kkt-btn-print-test"
					>
						<Printer size={13} className={isPrinting ? "animate-spin" : ""} />
						<span>Печать тестового чека (10.00 руб.)</span>
					</button>

					<button
						type="button"
						className="hw-btn-compact"
						onClick={handleSaveConfig}
					>
						Сохранить параметры
					</button>

					{circuitTelemetry.state === "OPEN" && (
						<button
							type="button"
							className="hw-btn-compact"
							style={{ color: "var(--amber, orange)", borderColor: "rgba(245, 158, 11, 0.4)" }}
							onClick={handleResetCircuitBreaker}
							title="Сбросить защиту от сбоев после восстановления связи"
						>
							<RotateCcw size={13} />
							<span>Сброс Circuit Breaker (OPEN)</span>
						</button>
					)}
				</div>

				{/* Circuit Breaker Status Pill */}
				<div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px" }}>
					<span style={{ color: "var(--muted)" }}>Circuit Breaker:</span>
					<span
						style={{
							padding: "2px 6px",
							borderRadius: "4px",
							fontWeight: 600,
							background:
								circuitTelemetry.state === "CLOSED"
									? "rgba(16, 185, 129, 0.1)"
									: "rgba(239, 68, 68, 0.1)",
							color: circuitTelemetry.state === "CLOSED" ? "var(--success, green)" : "var(--danger, red)",
						}}
					>
						{circuitTelemetry.state}
					</span>
				</div>
			</div>

			{/* Health Status Telemetry Card if available */}
			{healthStatus && (
				<div
					data-testid="kkt-health-status-card"
					style={{
						display: "grid",
						gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
						gap: "10px",
						padding: "12px",
						background: "var(--paper)",
						border: "1px solid var(--line)",
						borderRadius: "8px",
						fontSize: "12px",
					}}
				>
					<div>
						<span style={{ color: "var(--muted)" }}>Модель:</span>
						<div style={{ fontWeight: 600, color: "var(--ink)" }}>{healthStatus.modelName}</div>
					</div>
					<div>
						<span style={{ color: "var(--muted)" }}>Бумага в принтере:</span>
						<div style={{ fontWeight: 600, color: healthStatus.paperOk ? "var(--success, green)" : "var(--danger, red)" }}>
							{healthStatus.paperOk ? "В норме (рулон OK)" : "Закончилась бумага"}
						</div>
					</div>
					<div>
						<span style={{ color: "var(--muted)" }}>ФН и фискализация:</span>
						<div style={{ fontWeight: 600, color: healthStatus.fnFiscalized ? "var(--success, green)" : "var(--amber, orange)" }}>
							{healthStatus.fnFiscalized ? `ФН активен (${healthStatus.fnSerial})` : "Не фискализирован"}
						</div>
					</div>
					<div>
						<span style={{ color: "var(--muted)" }}>Отклик сокета:</span>
						<div style={{ fontWeight: 600, color: "var(--ink)" }}>{healthStatus.latencyMs} мс</div>
					</div>
				</div>
			)}

			{/* Test Receipt Feedback Card */}
			{lastReceipt && (
				<div
					data-testid="kkt-last-receipt-card"
					style={{
						display: "flex",
						flexDirection: "column",
						gap: "6px",
						padding: "12px",
						background: "var(--paper-soft)",
						border: "1px solid rgba(16, 185, 129, 0.3)",
						borderRadius: "8px",
						fontSize: "12px",
					}}
				>
					<div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--success, green)", fontWeight: 600 }}>
						<CheckCircle2 size={14} />
						<span>Тестовый фискальный чек успешно сформирован ({lastReceipt.timestamp})</span>
					</div>
					<div style={{ display: "flex", flexWrap: "wrap", gap: "16px", color: "var(--ink)" }}>
						<span>Номер ФД: <strong>{lastReceipt.docNum}</strong></span>
						<span>ФПД (фискальный признак): <strong>{lastReceipt.fpd}</strong></span>
						<span>Сумма: <strong>{lastReceipt.totalRub.toFixed(2)} ₽</strong></span>
					</div>
					<div style={{ fontSize: "11px", color: "var(--muted)", wordBreak: "break-all" }}>
						Строка QR-кода ФНС: <code>{lastReceipt.qrString}</code>
					</div>
				</div>
			)}
		</div>
	);
}
