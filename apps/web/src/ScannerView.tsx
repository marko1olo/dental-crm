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
			style={{
				padding: "24px",
				maxWidth: "800px",
				margin: "0 auto",
				marginTop: "24px",
			}}
			initial={{ opacity: 0, y: 15 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.4 }}
		>
			<div
				className="scanner-header"
				style={{
					display: "flex",
					alignItems: "center",
					gap: "16px",
					marginBottom: "32px",
				}}
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
				style={{
					background: "var(--paper)",
					padding: "32px",
					borderRadius: "16px",
					boxShadow: "0 4px 24px rgba(0,0,0,0.05)",
					position: "relative",
					overflow: "hidden",
					marginBottom: "32px",
					border: "1px solid var(--line)",
				}}
			>
				{/* Animated Laser */}
				<div className={`scanner-laser ${isScanning ? "active" : ""}`} />

				<form
					onSubmit={handleScan}
					className="scanner-form"
					style={{
						display: "flex",
						flexDirection: "column",
						gap: "20px",
						alignItems: "center",
						position: "relative",
						zIndex: 2,
					}}
				>
					<p
						className="scanner-hint"
						style={{
							color: "var(--muted)",
							textAlign: "center",
							fontSize: "1rem",
							maxWidth: "400px",
							margin: 0,
						}}
					>
						Наведите сканер на штрих-код лотка с инструментами или введите
						вручную.
					</p>

					<div
						style={{
							display: "flex",
							gap: "16px",
							width: "100%",
							maxWidth: "400px",
						}}
					>
						<select
							value={autoclaveId}
							onChange={(e) => setAutoclaveId(e.target.value)}
							style={{
								padding: "12px",
								fontSize: "1rem",
								borderRadius: "8px",
								border: "2px solid var(--line)",
								flex: 1,
								background: "var(--paper-soft)",
								color: "var(--ink)",
							}}
						>
							<option value="ОСНОВНОЙ">Основной автоклав</option>
							<option value="РЕЗЕРВНЫЙ">Резервный автоклав</option>
							<option value="MELAtronic 23">MELAtronic 23</option>
						</select>

						<select
							value={status}
							onChange={(e) => setStatus(e.target.value as "passed" | "failed")}
							style={{
								padding: "12px",
								fontSize: "1rem",
								borderRadius: "8px",
								border: "2px solid var(--line)",
								flex: 1,
								background: "var(--paper-soft)",
								color: "var(--ink)",
							}}
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
						style={{
							padding: "16px 24px",
							fontSize: "1.25rem",
							borderRadius: "12px",
							border: "2px solid var(--line)",
							width: "100%",
							maxWidth: "400px",
							textAlign: "center",
							background: "var(--paper-soft)",
							color: "var(--ink)",
							fontFamily: "monospace",
						}}
					/>
					<button
						type="submit"
						disabled={isScanning || !barcode.trim()}
						className="scanner-btn"
						style={{
							padding: "14px 40px",
							background: "var(--teal)",
							color: "white",
							border: "none",
							borderRadius: "12px",
							fontSize: "1.1rem",
							fontWeight: 600,
							cursor: isScanning || !barcode.trim() ? "not-allowed" : "pointer",
							opacity: isScanning || !barcode.trim() ? 0.6 : 1,
						}}
					>
						{isScanning ? "Сканирование..." : "Привязать лоток"}
					</button>
				</form>
			</div>

			<div
				className="scanner-log-section"
				style={{
					background: "var(--paper)",
					borderRadius: "16px",
					padding: "24px",
					boxShadow: "0 4px 24px rgba(0,0,0,0.05)",
					border: "1px solid var(--line)",
				}}
			>
				<h3
					className="scanner-log-title"
					style={{
						margin: "0 0 20px 0",
						display: "flex",
						alignItems: "center",
						gap: "12px",
						fontSize: "1.25rem",
						color: "var(--ink)",
					}}
				>
					<Activity size={20} color="var(--teal)" /> Журнал стерилизации
				</h3>

				{logs.length > 0 ? (
					<div
						className="scanner-grid"
						style={{ display: "flex", flexDirection: "column", gap: "12px" }}
					>
						<div
							className="scanner-grid-header"
							style={{
								display: "grid",
								gridTemplateColumns: "1fr 1fr 120px 140px",
								gap: "16px",
								padding: "0 16px 12px",
								borderBottom: "2px solid var(--line)",
								color: "var(--muted)",
								fontWeight: 600,
								fontSize: "0.9rem",
							}}
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
								style={{
									display: "grid",
									gridTemplateColumns: "1fr 1fr 120px 140px",
									gap: "16px",
									padding: "16px",
									background: "var(--paper-soft)",
									borderRadius: "12px",
									alignItems: "center",
									border: "1px solid transparent",
								}}
							>
								<div
									className="log-barcode"
									style={{
										fontWeight: 600,
										fontSize: "1.05rem",
										color: "var(--ink)",
										fontFamily: "monospace",
									}}
								>
									{log.barcode}
								</div>
								<div
									className="log-autoclave"
									style={{
										color: "var(--muted)",
										display: "flex",
										alignItems: "center",
										gap: "8px",
									}}
								>
									<Box size={16} /> {log.autoclaveId || "ОСНОВНОЙ"}
								</div>
								<div>
									{log.status === "passed" ? (
										<span
											className="badge-success"
											style={{
												display: "inline-flex",
												alignItems: "center",
												gap: "6px",
												color: "var(--teal)",
												background: "rgba(16, 185, 129, 0.1)",
												padding: "6px 12px",
												borderRadius: "20px",
												fontSize: "0.85rem",
												fontWeight: 700,
											}}
										>
											<CheckCircle2 size={16} /> Успешно
										</span>
									) : (
										<span
											className="badge-error"
											style={{
												display: "inline-flex",
												alignItems: "center",
												gap: "6px",
												color: "var(--tomato)",
												background: "rgba(239, 68, 68, 0.1)",
												padding: "6px 12px",
												borderRadius: "20px",
												fontSize: "0.85rem",
												fontWeight: 700,
											}}
										>
											<XCircle size={16} /> Брак
										</span>
									)}
								</div>
								<div
									className="log-time"
									style={{
										color: "var(--muted)",
										fontSize: "0.9rem",
										textAlign: "right",
									}}
								>
									{new Date(log.timestamp).toLocaleString("ru-RU")}
								</div>
							</div>
						))}
					</div>
				) : (
					<div
						className="scanner-empty"
						style={{
							textAlign: "center",
							padding: "40px 20px",
							color: "var(--muted)",
							background: "var(--paper-soft)",
							borderRadius: "12px",
							border: "1px dashed var(--line)",
						}}
					>
						<p>Журнал пуст. Начните сканирование.</p>
					</div>
				)}
			</div>
		</motion.div>
	);
}
