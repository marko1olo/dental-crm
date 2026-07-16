import { motion } from "framer-motion";
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
import { useAppLogicContext } from "./contexts/AppLogicContext";
import "./ScannerView.css";

export function ScannerView() {
	const { auth } = useAppLogicContext();
	const [barcode, setBarcode] = useState("");
	const [autoclaveId, setAutoclaveId] = useState("ОСНОВНОЙ");
	const [status, setStatus] = useState<"passed" | "failed">("passed");
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
			const res = await fetch("/api/sterilization/logs", {
				headers: auth.denteClinicalReadHeaders(),
			});
			if (res.ok) {
				const data = await res.json();
				setLogs(Array.isArray(data) ? data : []);
			}
		} catch (e) {
			console.error(e);
		}
	};

	const handleScan = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!barcode.trim()) return;

		setIsScanning(true);

		try {
			const res = await fetch("/api/sterilization/scan", {
				method: "POST",
				headers: auth.denteClinicalReadHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					barcode: barcode.trim(),
					autoclaveId,
					status,
				}),
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
	};

	return (
		<motion.div
			className="scanner-view-container glass-panel"
			
			initial={{ opacity: 0, y: 15 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.4 }}
		>
			<div
				className="scanner-header"
				
			>
				<ScanLine size={32} color="var(--teal)" />
				<h1
					className="scanner-title"
					style={{
						fontSize: "1.75rem",
						fontWeight: 700,
						margin: 0,
						color: "var(--ink)",
					}}
				>
					Сканер Стерилизации
				</h1>
			</div>

			<div
				className="scanner-card"
				
			>
				{/* Animated Laser */}
				<div className={`scanner-laser ${isScanning ? "active" : ""}`} />

				<form
					onSubmit={handleScan}
					className="scanner-form"
					
				>
					<p
						className="scanner-hint"
						
					>
						Наведите сканер на штрих-код лотка с инструментами или введите
						вручную.
					</p>

					<div
						className="scanner-select-group"
					>
						<select
							value={autoclaveId}
							onChange={(e) => setAutoclaveId(e.target.value)}
							className="scanner-select"
						>
							<option value="ОСНОВНОЙ">Основной автоклав</option>
							<option value="РЕЗЕРВНЫЙ">Резервный автоклав</option>
							<option value="MELAtronic 23">MELAtronic 23</option>
						</select>

						<select
							value={status}
							onChange={(e) => setStatus(e.target.value as "passed" | "failed")}
							className="scanner-select"
						>
							<option value="passed">Успешно</option>
							<option value="failed">Брак</option>
						</select>
					</div>

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

			<div
				className="scanner-log-section"
				
			>
				<h3
					className="scanner-log-title"
					
				>
					<Activity size={20} color="var(--teal)" /> Журнал стерилизации
				</h3>

				{logs.length > 0 ? (
					<div
						className="scanner-grid"
						
					>
						<div
							className="scanner-grid-header"
							
						>
							<div>Штрих-код</div>
							<div>Автоклав</div>
							<div>Статус</div>
							<div style={{ textAlign: "right" }}>Время</div>
						</div>
						{logs.map((log) => (
							<div
								className="scanner-log-row"
								key={log.id}
								
							>
								<div
									className="log-barcode"
									
								>
									{log.barcode}
								</div>
								<div
									className="log-autoclave"
									
								>
									<Box size={16} /> {log.autoclaveId || "ОСНОВНОЙ"}
								</div>
								<div>
									{log.status === "passed" ? (
										<span
											className="badge-success"
											
										>
											<CheckCircle2 size={16} /> Успешно
										</span>
									) : (
										<span
											className="badge-error"
											
										>
											<XCircle size={16} /> Брак
										</span>
									)}
								</div>
								<div
									className="log-time"
									
								>
									{new Date(log.timestamp).toLocaleString("ru-RU")}
								</div>
							</div>
						))}
					</div>
				) : (
					<div
						className="scanner-empty"
						
					>
						<p>Журнал пуст. Начните сканирование.</p>
					</div>
				)}
			</div>
		</motion.div>
	);
}
