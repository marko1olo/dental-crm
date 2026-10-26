import React, { useState } from "react";
import { KktLanPrinterService } from "../../../services/hardware/kktLanPrinter.js";
import { KktHeaderAndMode } from "./kkt/KktHeaderAndMode.js";
import { KktConfigForm } from "./kkt/KktConfigForm.js";
import { KktActionToolbar } from "./kkt/KktActionToolbar.js";
import { KktHealthCard } from "./kkt/KktHealthCard.js";
import { KktReceiptFeedbackCard } from "./kkt/KktReceiptFeedbackCard.js";
import { useKktActions } from "./kkt/useKktActions.js";

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

	const actions = useKktActions({
		protocol,
		host,
		port,
		cashier,
		isEmulatorMode,
	});

	return (
		<div className="hw-kkt-section" data-testid="hardware-kkt-section" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
			<KktHeaderAndMode isEmulatorMode={isEmulatorMode} onEmulatorModeChange={setIsEmulatorMode} />
			<KktConfigForm
				protocol={protocol}
				connectionType={connectionType}
				host={host}
				port={port}
				comPortName={comPortName}
				baudRate={baudRate}
				cashier={cashier}
				onProtocolChange={(p) => {
					setProtocol(p);
					setPort(p === "atol" ? 16732 : 5555);
				}}
				onConnectionTypeChange={setConnectionType}
				onHostChange={setHost}
				onPortChange={setPort}
				onComPortNameChange={setComPortName}
				onBaudRateChange={setBaudRate}
				onCashierChange={setCashier}
			/>
			<KktActionToolbar
				isChecking={actions.isChecking}
				isPrinting={actions.isPrinting}
				circuitTelemetry={actions.circuitTelemetry}
				onCheckHealth={actions.handleCheckHealth}
				onPrintTestReceipt={actions.handlePrintTestReceipt}
				onSaveConfig={actions.handleSaveConfig}
				onResetCircuitBreaker={actions.handleResetCircuitBreaker}
			/>
			<KktHealthCard healthStatus={actions.healthStatus} />
			<KktReceiptFeedbackCard lastReceipt={actions.lastReceipt} />
		</div>
	);
}
