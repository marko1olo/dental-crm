import React, { useState } from "react";
import { classifyBarcodeScan, type DecodedScanResult } from "@dental/shared/hardware";
import { showToast } from "../../GlobalToast.js";
import { ScannerHeader } from "./scanner/ScannerHeader.js";
import { ScannerConfigForm } from "./scanner/ScannerConfigForm.js";
import { ScannerTestArena } from "./scanner/ScannerTestArena.js";
import { ScannerResultCard } from "./scanner/ScannerResultCard.js";

export function HardwareScannerSection() {
	const [scannerMode, setScannerMode] = useState<"usb_hid_keyboard" | "usb_com_serial">("usb_hid_keyboard");
	const [comPort, setComPort] = useState("COM5");
	const [gs1Separator, setGs1Separator] = useState<"ascii29" | "tilde" | "auto">("ascii29");
	const [autoDispenseCarpules, setAutoDispenseCarpules] = useState(true);

	const [inputCode, setInputCode] = useState("");
	const [scanResult, setScanResult] = useState<DecodedScanResult | null>(null);

	const handleExecuteScan = (codeToScan: string) => {
		const trimmed = codeToScan.trim();
		if (!trimmed) {
			showToast("Введите или отсканируйте код", "info");
			return;
		}

		const result = classifyBarcodeScan(trimmed, scannerMode);
		setScanResult(result);

		if (result.barcodeType === "gs1_datamatrix") {
			showToast("Код Честный ЗНАК (МДЛП) успешно распознан и валидирован", "success");
		} else if (result.barcodeType === "sanpin_kraft") {
			showToast(`Крафт-пакет стерилизации «${result.kraftPackageId}» распознан`, "success");
		} else if (result.barcodeType === "qr_patient") {
			showToast(`Карта пациента «${result.patientId}» идентифицирована`, "info");
		} else {
			showToast(`Штрихкод (${result.barcodeType}) успешно считан`, "success");
		}
	};

	return (
		<div className="hw-scanner-section" data-testid="hardware-scanner-section" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
			<ScannerHeader />
			<ScannerConfigForm
				scannerMode={scannerMode}
				comPort={comPort}
				gs1Separator={gs1Separator}
				autoDispenseCarpules={autoDispenseCarpules}
				onScannerModeChange={setScannerMode}
				onComPortChange={setComPort}
				onGs1SeparatorChange={setGs1Separator}
				onAutoDispenseChange={setAutoDispenseCarpules}
			/>
			<ScannerTestArena
				inputCode={inputCode}
				onInputCodeChange={setInputCode}
				onExecuteScan={handleExecuteScan}
			/>
			<ScannerResultCard scanResult={scanResult} />
		</div>
	);
}
