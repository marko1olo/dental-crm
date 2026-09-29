import React, { useState } from "react";
import {
	Activity,
	Barcode,
	CheckCircle2,
	CornerDownLeft,
	HelpCircle,
	QrCode,
	RefreshCw,
	Scan,
	ShieldCheck,
	Tag,
	Zap,
} from "lucide-react";
import { classifyBarcodeScan, type DecodedScanResult } from "@dental/shared/hardware";
import { showToast } from "../../GlobalToast.js";

const CLINICAL_SAMPLES = [
	{
		label: "Артикаин (Честный ЗНАК МДЛП)",
		code: "0104601234567893215ABC1234567890\u001d91EE06\u001d92xyz123456",
		desc: "Карпульная анестезия 1:100000",
	},
	{
		label: "Стерилизационная упаковка",
		code: "SANPIN:CSO-2026-09-27-AUTOCLAVE-1",
		desc: "Партия стерилизации автоклава",
	},
	{
		label: "Раствор натрия хлорида (EAN-13)",
		code: "4601234567890",
		desc: "Медицинский расходный материал",
	},
	{
		label: "Талон пациента (QR)",
		code: "DENTE:PATIENT:p-2045",
		desc: "Маршрутный лист / карта пациента",
	},
];

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

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") {
			e.preventDefault();
			handleExecuteScan(inputCode);
		}
	};

	return (
		<div className="hw-scanner-section" data-testid="hardware-scanner-section" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
			{/* Header info */}
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
						2D Сканеры DataMatrix и штрихкодов («Честный ЗНАК» / МДЛП)
					</div>
					<div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>
						Распознавание маркированных упаковок, карпул анестезии, имплантатов и крафт-пакетов стерилизации.
					</div>
				</div>

				<div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px" }}>
					<span className="hw-counter-pill ready" title="Сканер готов к работе">
						<CheckCircle2 size={12} className="text-emerald-600 shrink-0" />
						<span>Сканер готов</span>
					</span>
				</div>
			</div>

			{/* Configuration Options */}
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
					gap: "12px",
				}}
			>
				{/* Connection mode */}
				<div className="hw-field-group">
					<label className="hw-field-label">
						<span>Режим подключения сканера</span>
					</label>
					<select
						className="hw-field-select"
						value={scannerMode}
						onChange={(e) => setScannerMode(e.target.value as any)}
					>
						<option value="usb_hid_keyboard">USB HID (Эмуляция клавиатуры / Fast Burst)</option>
						<option value="usb_com_serial">Virtual COM-порт (CDC ACM / Прямой порт)</option>
					</select>
				</div>

				{/* COM Port name if in Serial mode */}
				{scannerMode === "usb_com_serial" ? (
					<div className="hw-field-group">
						<label className="hw-field-label">
							<span>COM-порт сканера</span>
						</label>
						<input
							type="text"
							className="hw-field-input"
							value={comPort}
							onChange={(e) => setComPort(e.target.value)}
							placeholder="COM5"
						/>
					</div>
				) : (
					<div className="hw-field-group">
						<label className="hw-field-label">
							<span>Разделитель GS1 (FNC1)</span>
						</label>
						<select
							className="hw-field-select"
							value={gs1Separator}
							onChange={(e) => setGs1Separator(e.target.value as any)}
						>
							<option value="ascii29">ASCII 29 (GS / 0x1D Стандарт GS1)</option>
							<option value="tilde">Тильда (~) в потоке данных</option>
							<option value="auto">Авто-определение формата</option>
						</select>
					</div>
				)}

				{/* Auto-writeoff toggle */}
				<div className="hw-field-group" style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
					<label
						style={{
							display: "flex",
							alignItems: "center",
							gap: "8px",
							fontSize: "12px",
							cursor: "pointer",
							padding: "8px 0",
						}}
					>
						<input
							type="checkbox"
							checked={autoDispenseCarpules}
							onChange={(e) => setAutoDispenseCarpules(e.target.checked)}
							style={{ accentColor: "var(--primary)" }}
						/>
						<span>Мгновенное списание карпул у кресла при сканировании</span>
					</label>
				</div>
			</div>

			{/* Test Arena: Interactive input & quick sample buttons */}
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					gap: "10px",
					padding: "12px",
					background: "var(--paper)",
					border: "1px solid var(--line)",
					borderRadius: "8px",
				}}
			>
				<label style={{ fontSize: "12px", fontWeight: 600, color: "var(--ink)" }}>
					Тестирование сканера: сканируйте устройство или выберите клинический образец
				</label>

				<div style={{ display: "flex", gap: "8px" }}>
					<div style={{ position: "relative", flex: 1 }}>
						<input
							type="text"
							className="hw-field-input"
							value={inputCode}
							onChange={(e) => setInputCode(e.target.value)}
							onKeyDown={handleKeyDown}
							placeholder="Сканируйте штрихкод или DataMatrix сканером..."
							style={{ paddingRight: "36px" }}
							data-testid="scanner-test-input"
						/>
						<Scan
							size={16}
							style={{
								position: "absolute",
								right: "10px",
								top: "50%",
								transform: "translateY(-50%)",
								color: "var(--muted)",
							}}
						/>
					</div>

					<button
						type="button"
						className="hw-btn-compact primary"
						onClick={() => handleExecuteScan(inputCode)}
						data-testid="scanner-btn-test"
					>
						<CornerDownLeft size={13} />
						<span>Проверить код</span>
					</button>
				</div>

				{/* Quick Clinical Samples */}
				<div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px", marginTop: "4px" }}>
					<span style={{ fontSize: "11px", color: "var(--muted)" }}>Быстрые сэмплы:</span>
					{CLINICAL_SAMPLES.map((sample) => (
						<button
							key={sample.label}
							type="button"
							className="hw-btn-compact"
							style={{ fontSize: "11px", height: "24px", padding: "0 8px" }}
							onClick={() => {
								setInputCode(sample.code);
								handleExecuteScan(sample.code);
							}}
							title={sample.desc}
						>
							<Tag size={11} />
							<span>{sample.label}</span>
						</button>
					))}
				</div>
			</div>

			{/* Scan Result Card */}
			{scanResult && (
				<div
					data-testid="scanner-result-card"
					style={{
						display: "flex",
						flexDirection: "column",
						gap: "8px",
						padding: "12px",
						background: "var(--paper-soft)",
						border: "1px solid rgba(16, 185, 129, 0.3)",
						borderRadius: "8px",
						fontSize: "12px",
					}}
				>
					<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
						<div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--success, green)", fontWeight: 600 }}>
							<CheckCircle2 size={14} />
							<span>Код успешно классифицирован ({scanResult.barcodeType.toUpperCase()})</span>
						</div>
						<span style={{ fontSize: "11px", color: "var(--muted)" }}>
							Источник: {scanResult.scanSource}
						</span>
					</div>

					{scanResult.parsedGs1 && (
						<div
							style={{
								display: "grid",
								gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
								gap: "8px",
								padding: "8px",
								background: "var(--paper)",
								border: "1px solid var(--line)",
								borderRadius: "6px",
							}}
						>
							<div>
								<span style={{ color: "var(--muted)", fontSize: "11px" }}>GTIN товара:</span>
								<div style={{ fontWeight: 600 }}>{scanResult.parsedGs1.gtin || "—"}</div>
							</div>
							<div>
								<span style={{ color: "var(--muted)", fontSize: "11px" }}>Серийный номер (SN):</span>
								<div style={{ fontWeight: 600 }}>{scanResult.parsedGs1.serialNumber || "—"}</div>
							</div>
							<div>
								<span style={{ color: "var(--muted)", fontSize: "11px" }}>Криптохвост:</span>
								<div style={{ fontWeight: 600 }}>{scanResult.parsedGs1.cryptoKey || scanResult.parsedGs1.cryptoSignature ? "Присутствует" : "—"}</div>
							</div>
							<div>
								<span style={{ color: "var(--muted)", fontSize: "11px" }}>Статус Честный ЗНАК:</span>
								<div style={{ fontWeight: 600, color: "var(--success, green)" }}>
									{scanResult.parsedGs1.isValid ? "Валидный КИЗ (МДЛП)" : "Внутренний штрихкод"}
								</div>
							</div>
						</div>
					)}

					{scanResult.kraftPackageId && (
						<div style={{ padding: "8px", background: "var(--paper)", border: "1px solid var(--line)", borderRadius: "6px" }}>
							<span style={{ color: "var(--muted)", fontSize: "11px" }}>Идентификатор упаковки стерилизации:</span>
							<div style={{ fontWeight: 600, color: "var(--success, green)" }}>{scanResult.kraftPackageId}</div>
						</div>
					)}

					{scanResult.patientId && (
						<div style={{ padding: "8px", background: "var(--paper)", border: "1px solid var(--line)", borderRadius: "6px" }}>
							<span style={{ color: "var(--muted)", fontSize: "11px" }}>ID пациента в CRM:</span>
							<div style={{ fontWeight: 600, color: "var(--primary)" }}>{scanResult.patientId}</div>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
