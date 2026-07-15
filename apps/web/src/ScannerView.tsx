import {
	Activity,
	Box,
	Calendar,
	CheckCircle2,
	ScanLine,
	XCircle,
} from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { showToast } from "./components/GlobalToast";
import "./ScannerView.css";

export function ScannerView() {
	const [barcode, setBarcode] = useState("");
	const [isScanning, setIsScanning] = useState(false);
	const [logs, setLogs] = useState<any[]>([]);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		// Auto-focus input for physical barcode scanners
		if (inputRef.current) inputRef.current.focus();
		loadLogs();
	}, []);

	const loadLogs = async () => {
		try {
			const res = await fetch("/api/sterilization");
			if (res.ok) {
				setLogs(await res.json());
			}
		} catch (e) {
			console.error(e);
		}
	};

	const handleScan = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!barcode.trim()) return;

		setIsScanning(true);

		// Simulate scan delay for visual effect
		setTimeout(async () => {
			try {
				const res = await fetch("/api/sterilization/scan", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ barcode }),
				});

				if (!res.ok) throw new Error("Scan rejected");

				showToast("Успешное сканирование лотка", "success");
				setBarcode("");
				loadLogs();
			} catch (err) {
				showToast("Ошибка валидации лотка", "error");
			} finally {
				setIsScanning(false);
				if (inputRef.current) inputRef.current.focus();
			}
		}, 800);
	};

	return (
		<div className="scanner-view-container">
			<div className="scanner-header">
				<ScanLine size={32} color="var(--brand-600)" />
				<h1 className="scanner-title">Сканер Стерилизации</h1>
			</div>

			<div className="scanner-card">
				{/* Animated Laser */}
				<div className={`scanner-laser ${isScanning ? "active" : ""}`} />

				<form onSubmit={handleScan} className="scanner-form">
					<p className="scanner-hint">
						Наведите сканер на штрих-код лотка с инструментами или введите
						вручную.
					</p>
					<input
						ref={inputRef}
						type="text"
						value={barcode}
						onChange={(e) => setBarcode(e.target.value)}
						placeholder="Штрих-код (например, TRAY-1049)"
						className="scanner-input"
					/>
					<button
						type="submit"
						disabled={isScanning || !barcode.trim()}
						className="scanner-btn"
					>
						{isScanning ? "Сканирование..." : "Привязать лоток"}
					</button>
				</form>
			</div>

			<div className="scanner-log-section">
				<h3 className="scanner-log-title">
					<Activity size={20} /> Журнал стерилизации
				</h3>

				{logs.length > 0 ? (
					<div className="scanner-grid">
						<div className="scanner-grid-header">
							<div>Штрих-код</div>
							<div>Автоклав</div>
							<div>Статус</div>
							<div style={{ textAlign: "right" }}>Время</div>
						</div>
						{logs.map((log) => (
							<div className="scanner-log-row" key={log.id}>
								<div className="log-barcode">{log.barcode}</div>
								<div className="log-autoclave">
									<Box size={16} /> {log.autoclaveId}
								</div>
								<div>
									{log.status === "passed" ? (
										<span className="badge-success">
											<CheckCircle2 size={16} /> Успешно
										</span>
									) : (
										<span className="badge-error">
											<XCircle size={16} /> Брак
										</span>
									)}
								</div>
								<div className="log-time">
									{new Date(log.timestamp).toLocaleString("ru-RU")}
								</div>
							</div>
						))}
					</div>
				) : (
					<div className="scanner-empty">
						<p>Журнал пуст. Начните сканирование.</p>
					</div>
				)}
			</div>
		</div>
	);
}
