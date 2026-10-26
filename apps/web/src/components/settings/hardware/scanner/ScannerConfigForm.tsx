import React from "react";

interface Props {
	scannerMode: "usb_hid_keyboard" | "usb_com_serial";
	comPort: string;
	gs1Separator: "ascii29" | "tilde" | "auto";
	autoDispenseCarpules: boolean;
	onScannerModeChange: (mode: "usb_hid_keyboard" | "usb_com_serial") => void;
	onComPortChange: (port: string) => void;
	onGs1SeparatorChange: (sep: "ascii29" | "tilde" | "auto") => void;
	onAutoDispenseChange: (enabled: boolean) => void;
}

export const ScannerConfigForm: React.FC<Props> = ({
	scannerMode,
	comPort,
	gs1Separator,
	autoDispenseCarpules,
	onScannerModeChange,
	onComPortChange,
	onGs1SeparatorChange,
	onAutoDispenseChange,
}) => {
	return (
		<div
			style={{
				display: "grid",
				gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
				gap: "12px",
			}}
		>
			<div className="hw-field-group">
				<label className="hw-field-label">
					<span>Режим подключения сканера</span>
				</label>
				<select
					className="hw-field-select"
					value={scannerMode}
					onChange={(e) => onScannerModeChange(e.target.value as any)}
				>
					<option value="usb_hid_keyboard">USB HID (Эмуляция клавиатуры / Fast Burst)</option>
					<option value="usb_com_serial">Virtual COM-порт (CDC ACM / Прямой порт)</option>
				</select>
			</div>

			{scannerMode === "usb_com_serial" ? (
				<div className="hw-field-group">
					<label className="hw-field-label">
						<span>COM-порт сканера</span>
					</label>
					<input
						type="text"
						className="hw-field-input"
						value={comPort}
						onChange={(e) => onComPortChange(e.target.value)}
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
						onChange={(e) => onGs1SeparatorChange(e.target.value as any)}
					>
						<option value="ascii29">ASCII 29 (GS / 0x1D Стандарт GS1)</option>
						<option value="tilde">Тильда (~) в потоке данных</option>
						<option value="auto">Авто-определение формата</option>
					</select>
				</div>
			)}

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
						onChange={(e) => onAutoDispenseChange(e.target.checked)}
						style={{ accentColor: "var(--primary)" }}
					/>
					<span>Мгновенное списание карпул у кресла при сканировании</span>
				</label>
			</div>
		</div>
	);
};
