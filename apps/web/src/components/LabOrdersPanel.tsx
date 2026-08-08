import type React from "react";
import { useEffect, useState, useCallback } from "react";
import { denteAdminSecretRequestHeaders } from "../lib/denteRequestHeaders";
import { showToast } from "./GlobalToast";
import "./LabOrdersPanel.css";

export interface LabOrder {
	id: string;
	patientId: string;
	patientName: string;
	doctorId: string | null;
	doctorName: string | null;
	secureToken: string;
	toothFdi: string | null;
	material: string | null;
	colorVita: string | null;
	status: string;
	dueDate: string | null;
	clinicalNotes: string | null;
	labComments: string | null;
	attachedImageUrl: string | null;
	priceRub: number | null;
	createdAt: string;
	updatedAt: string;
}

interface LabOrdersPanelProps {
	patientId?: string;
}

export function LabOrdersPanel({ patientId }: LabOrdersPanelProps) {
	const [orders, setOrders] = useState<LabOrder[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const [showForm, setShowForm] = useState(false);
	const [formPatientId, setFormPatientId] = useState(patientId || "");
	const [toothFdi, setToothFdi] = useState("");
	const [material, setMaterial] = useState("");
	const [colorVita, setColorVita] = useState("");
	const [dueDate, setDueDate] = useState("");
	const [clinicalNotes, setClinicalNotes] = useState("");
	const [priceRub, setPriceRub] = useState("");
	const [submitting, setSubmitting] = useState(false);

	const fetchOrders = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const query = patientId
				? `?patientId=${encodeURIComponent(patientId)}`
				: "";
			const res = await fetch(`/api/clinical/lab-orders${query}`, {
				headers: denteAdminSecretRequestHeaders(),
			});
			if (!res.ok) {
				throw new Error("Failed to fetch lab orders");
			}
			const data = await res.json();
			setOrders(data);
		} catch (err: any) {
			setError(err.message || "Error fetching lab orders");
		} finally {
			setLoading(false);
		}
	}, [patientId]);

	useEffect(() => {
		fetchOrders();
	}, [fetchOrders]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!formPatientId) {
			showToast("Patient ID is required", "error");
			return;
		}

		setSubmitting(true);
		try {
			const res = await fetch("/api/clinical/lab-orders", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...denteAdminSecretRequestHeaders(),
				},
				body: JSON.stringify({
					patientId: formPatientId,
					toothFdi: toothFdi || null,
					material: material || null,
					colorVita: colorVita || null,
					dueDate: dueDate || null,
					clinicalNotes: clinicalNotes || null,
					priceRub: priceRub ? parseFloat(priceRub) : null,
				}),
			});
			if (!res.ok) {
				const errorData = await res.json().catch(() => ({}));
				throw new Error(errorData.message || "Failed to create lab order");
			}
			setShowForm(false);
			setFormPatientId(patientId || "");
			setToothFdi("");
			setMaterial("");
			setColorVita("");
			setDueDate("");
			setClinicalNotes("");
			setPriceRub("");
			await fetchOrders();
		} catch (err: any) {
			showToast(err.message || "Failed to create lab order", "error");
		} finally {
			setSubmitting(false);
		}
	};

	const getStatusLabel = (status: string) => {
		const mapping: Record<string, string> = {
			draft: "Черновик",
			sent: "Отправлен (Sent)",
			in_progress: "В работе (In Design)",
			shipped: "Отправлен в клинику",
			received: "Получен (Received)",
			fitting: "Примерка (Fitting)",
			refitting: "Переделка (Quality Check)",
			completed: "Сдан (Delivered)",
		};
		return mapping[status] || status;
	};

	return (
		<div className="lab-orders-panel">
			<div
				className="lab-orders-header"
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
				}}
			>
				<h3>Заказы в лабораторию (ЗТЛ)</h3>
				<button
					type="button"
					onClick={() => setShowForm(!showForm)}
					style={{
						padding: "6px 12px",
						background: "rgba(59, 130, 246, 0.2)",
						color: "#93c5fd",
						border: "1px solid rgba(59, 130, 246, 0.3)",
						borderRadius: "6px",
						cursor: "pointer",
					}}
				>
					{showForm ? "Отмена" : "+ Новый заказ"}
				</button>
			</div>

			{showForm && (
				<form
					onSubmit={handleSubmit}
					className="lab-order-form"
					style={{
						display: "flex",
						flexDirection: "column",
						gap: "10px",
						background: "rgba(255,255,255,0.05)",
						padding: "16px",
						borderRadius: "8px",
					}}
				>
					{!patientId && (
						<input
							type="text"
							placeholder="ID Пациента"
							value={formPatientId}
							onChange={(e) => setFormPatientId(e.target.value)}
							required
							style={{
								padding: "8px",
								borderRadius: "4px",
								border: "1px solid #52525b",
								background: "#27272a",
								color: "#fff",
							}}
						/>
					)}
					<input
						type="text"
						placeholder="Зубы (FDI), напр. 11, 21"
						value={toothFdi}
						onChange={(e) => setToothFdi(e.target.value)}
						style={{
							padding: "8px",
							borderRadius: "4px",
							border: "1px solid #52525b",
							background: "#27272a",
							color: "#fff",
						}}
					/>
					<input
						type="text"
						placeholder="Материал (Диоксид циркония, E.max...)"
						value={material}
						onChange={(e) => setMaterial(e.target.value)}
						style={{
							padding: "8px",
							borderRadius: "4px",
							border: "1px solid #52525b",
							background: "#27272a",
							color: "#fff",
						}}
					/>
					<input
						type="text"
						placeholder="Цвет (Vita)"
						value={colorVita}
						onChange={(e) => setColorVita(e.target.value)}
						style={{
							padding: "8px",
							borderRadius: "4px",
							border: "1px solid #52525b",
							background: "#27272a",
							color: "#fff",
						}}
					/>
					<input
						type="date"
						placeholder="Срок сдачи"
						value={dueDate}
						onChange={(e) => setDueDate(e.target.value)}
						style={{
							padding: "8px",
							borderRadius: "4px",
							border: "1px solid #52525b",
							background: "#27272a",
							color: "#fff",
						}}
					/>
					<textarea
						placeholder="Клинические заметки"
						value={clinicalNotes}
						onChange={(e) => setClinicalNotes(e.target.value)}
						style={{
							padding: "8px",
							borderRadius: "4px",
							border: "1px solid #52525b",
							background: "#27272a",
							color: "#fff",
							minHeight: "60px",
						}}
					/>
					<input
						type="number"
						step="0.01"
						placeholder="Стоимость лаборатории (Руб)"
						value={priceRub}
						onChange={(e) => setPriceRub(e.target.value)}
						style={{
							padding: "8px",
							borderRadius: "4px",
							border: "1px solid #52525b",
							background: "#27272a",
							color: "#fff",
						}}
					/>
					<button
						type="submit"
						disabled={submitting}
						style={{
							padding: "10px",
							borderRadius: "4px",
							background: "#3b82f6",
							color: "#fff",
							border: "none",
							cursor: "pointer",
							fontWeight: "bold",
							opacity: submitting ? 0.7 : 1,
						}}
					>
						{submitting ? "Создание..." : "Создать заказ"}
					</button>
				</form>
			)}

			{error && <div className="lab-order-warning">{error}</div>}

			{loading ? (
				<div style={{ color: "#a1a1aa", textAlign: "center", padding: "20px" }}>
					Загрузка...
				</div>
			) : orders.length === 0 ? (
				<div className="lab-orders-empty">Нет заказов</div>
			) : (
				<div className="lab-orders-list">
					{orders.map((order) => (
						<div key={order.id} className="lab-order-card">
							<div className="lab-order-main">
								{order.toothFdi && (
									<div className="fdi-badge">{order.toothFdi}</div>
								)}
								<div className="order-details">
									<strong>{order.patientName}</strong>
									{order.material && <small>Материал: {order.material}</small>}
									{order.colorVita && <small>Цвет: {order.colorVita}</small>}
								</div>
							</div>
							<div className="lab-order-meta">
								<span className={`status-badge ${order.status}`}>
									{getStatusLabel(order.status)}
								</span>
								{order.dueDate && (
									<span className="delivery-date">
										К: {new Date(order.dueDate).toLocaleDateString()}
									</span>
								)}
								{order.priceRub != null && (
									<span className="cost">{order.priceRub} ₽</span>
								)}
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
