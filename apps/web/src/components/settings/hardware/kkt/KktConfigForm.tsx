import React from "react";

interface Props {
	protocol: "atol" | "shtrih";
	connectionType: "lan" | "com";
	host: string;
	port: number;
	comPortName: string;
	baudRate: string;
	cashier: string;
	onProtocolChange: (proto: "atol" | "shtrih") => void;
	onConnectionTypeChange: (type: "lan" | "com") => void;
	onHostChange: (host: string) => void;
	onPortChange: (port: number) => void;
	onComPortNameChange: (name: string) => void;
	onBaudRateChange: (rate: string) => void;
	onCashierChange: (cashier: string) => void;
}

export const KktConfigForm: React.FC<Props> = ({
	protocol,
	connectionType,
	host,
	port,
	comPortName,
	baudRate,
	cashier,
	onProtocolChange,
	onConnectionTypeChange,
	onHostChange,
	onPortChange,
	onComPortNameChange,
	onBaudRateChange,
	onCashierChange,
}) => {
	return (
		<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
			<div className="hw-field-group">
				<label className="hw-field-label"><span>Протокол ККТ</span></label>
				<select className="hw-field-select" value={protocol} onChange={(e) => onProtocolChange(e.target.value as "atol" | "shtrih")}>
					<option value="atol">АТОЛ (Драйвер ККТ 10 / TCP порт 16732)</option>
					<option value="shtrih">ШТРИХ-М (Протокол ФР / TCP порт 5555)</option>
				</select>
			</div>

			<div className="hw-field-group">
				<label className="hw-field-label"><span>Тип подключения</span></label>
				<select className="hw-field-select" value={connectionType} onChange={(e) => onConnectionTypeChange(e.target.value as "lan" | "com")}>
					<option value="lan">Сетевой LAN / Wi-Fi (TCP сокет)</option>
					<option value="com">Последовательный COM-порт (RS-232 / USB Virtual COM)</option>
				</select>
			</div>

			{connectionType === "lan" ? (
				<>
					<div className="hw-field-group">
						<label className="hw-field-label"><span>IP-адрес в подсети клиники</span></label>
						<input type="text" className="hw-field-input" value={host} onChange={(e) => onHostChange(e.target.value)} placeholder="192.168.1.150" />
					</div>
					<div className="hw-field-group">
						<label className="hw-field-label"><span>TCP порт сокета</span></label>
						<input type="number" className="hw-field-input" value={port} onChange={(e) => onPortChange(Number(e.target.value))} placeholder={protocol === "atol" ? "16732" : "5555"} />
					</div>
				</>
			) : (
				<>
					<div className="hw-field-group">
						<label className="hw-field-label"><span>Имя COM-порта</span></label>
						<input type="text" className="hw-field-input" value={comPortName} onChange={(e) => onComPortNameChange(e.target.value)} placeholder="COM3" />
					</div>
					<div className="hw-field-group">
						<label className="hw-field-label"><span>Скорость (Baud Rate)</span></label>
						<select className="hw-field-select" value={baudRate} onChange={(e) => onBaudRateChange(e.target.value)}>
							<option value="115200">115200 бод (Стандарт USB-COM)</option>
							<option value="57600">57600 бод</option>
							<option value="19200">19200 бод</option>
							<option value="9600">9600 бод (RS-232 классический)</option>
						</select>
					</div>
				</>
			)}

			<div className="hw-field-group">
				<label className="hw-field-label"><span>ФИО кассира по умолчанию (тег 1021)</span></label>
				<input type="text" className="hw-field-input" value={cashier} onChange={(e) => onCashierChange(e.target.value)} placeholder="Иванова А. С." />
			</div>
		</div>
	);
};
