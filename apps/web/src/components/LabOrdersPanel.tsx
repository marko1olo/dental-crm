import type React from "react";
import { useCallback, useEffect, useState } from "react";
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

export interface LabItem {
	id: string;
	toothFdi: number;
	restorationType: string;
	material: string;
	shadeSystem: string;
	shadeFinal: string;
	shadeStump: string | null;
	cementGapMicrons: number;
	priceRub: number | null;
}

interface LabOrdersPanelProps {
	patientId?: string;
}

const VITA_CLASSICAL_SHADES = [
	"A1", "A2", "A3", "A3.5", "A4",
	"B1", "B2", "B3", "B4",
	"C1", "C2", "C3", "C4",
	"D2", "D3", "D4",
];

const STUMP_SHADES = [
	"ND1", "ND2", "ND3", "ND4", "ND5", "ND6", "ND7", "ND8", "ND9",
];

const RESTORATION_TYPES = [
	{ value: "crown_monolithic", label: "Коронка монолитная (Full Zirconia)" },
	{ value: "crown_layered_cutback", label: "Коронка с редукцией (Cut-back)" },
	{ value: "emax_press_cad", label: "Коронка / Вкладка E.max CAD" },
	{ value: "veneer_laminate", label: "Винир керамический" },
	{ value: "inlay_onlay", label: "Вкладка Inlay / Onlay / Overlay" },
	{ value: "custom_abutment_tibase", label: "Индивидуальный абатмент Ti-Base" },
	{ value: "surgical_guide", label: "Хирургический навигационный шаблон" },
	{ value: "pmma_provisional", label: "Временная коронка PMMA" },
	{ value: "occlusal_splint", label: "Окклюзионная сплинт-шина / каппа" },
];

const MATERIALS = [
	{ value: "zirconia_multilayer_gradient", label: "Диоксид циркония Multi-Layer 3D Pro" },
	{ value: "zirconia_high_translucent", label: "Диоксид циркония HT / ST (Высокая прочность)" },
	{ value: "emax_lithium_disilicate", label: "Дисиликат лития IPS e.max CAD" },
	{ value: "pmma_milled", label: "CAD/CAM PMMA медицинский полимер" },
	{ value: "titanium_grade_5", label: "Титан Grade 5 (Ti-6Al-4V ELI)" },
	{ value: "cocr_milled", label: "Кобальт-хром фрезерованный (CoCr)" },
	{ value: "resin_3d_print", label: "Биосовместимый 3D фотополимер" },
];

export function LabOrdersPanel({ patientId }: LabOrdersPanelProps) {
	const [orders, setOrders] = useState<LabOrder[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const [showForm, setShowForm] = useState(false);
	const [formPatientId, setFormPatientId] = useState(patientId || "");
	const [selectedTeeth, setSelectedTeeth] = useState<number[]>([]);
	const [restorationType, setRestorationType] = useState("crown_monolithic");
	const [material, setMaterial] = useState("zirconia_multilayer_gradient");
	const [colorVita, setColorVita] = useState("A2");
	const [stumpShade, setStumpShade] = useState<string>("");
	const [cementGap, setCementGap] = useState(30);
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

	const toggleTooth = (tooth: number) => {
		setSelectedTeeth((prev) =>
			prev.includes(tooth) ? prev.filter((t) => t !== tooth) : [...prev, tooth].sort((a, b) => a - b),
		);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!formPatientId) {
			showToast("ID пациента обязателен", "error");
			return;
		}

		setSubmitting(true);
		try {
			const toothFdiStr = selectedTeeth.length > 0 ? selectedTeeth.join(", ") : null;
			const fullNotes = [
				clinicalNotes,
				stumpShade ? `Культя: ${stumpShade}` : null,
				`Зазор под цемент: ${cementGap} мкм`,
			]
				.filter(Boolean)
				.join(" | ");

			const res = await fetch("/api/clinical/lab-orders", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...denteAdminSecretRequestHeaders(),
				},
				body: JSON.stringify({
					patientId: formPatientId,
					toothFdi: toothFdiStr,
					material,
					colorVita,
					dueDate: dueDate || null,
					clinicalNotes: fullNotes || null,
					priceRub: priceRub ? parseFloat(priceRub) : null,
				}),
			});

			if (!res.ok) {
				const errorData = await res.json().catch(() => ({}));
				throw new Error(errorData.message || "Не удалось создать наряд в ЗТЛ");
			}

			const createdOrder = await res.json();

			// If items were selected, add itemized records
			if (selectedTeeth.length > 0 && createdOrder?.id) {
				for (const tooth of selectedTeeth) {
					await fetch(`/api/clinical/lab-orders/${createdOrder.id}/items`, {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							...denteAdminSecretRequestHeaders(),
						},
						body: JSON.stringify({
							toothFdi: tooth,
							restorationType,
							material,
							shadeFinal: colorVita,
							shadeStump: stumpShade || null,
							cementGapMicrons: cementGap,
						}),
					}).catch(() => {});
				}
			}

			showToast("Наряд в лабораторию успешно оформлен", "success");
			setShowForm(false);
			setFormPatientId(patientId || "");
			setSelectedTeeth([]);
			setDueDate("");
			setClinicalNotes("");
			setPriceRub("");
			await fetchOrders();
		} catch (err: any) {
			showToast(err.message || "Ошибка создания наряда в ЗТЛ", "error");
		} finally {
			setSubmitting(false);
		}
	};

	const getStatusLabel = (status: string) => {
		const mapping: Record<string, string> = {
			draft: "Черновик",
			sent: "Отправлен в ЗТЛ",
			in_progress: "В моделировании CAD/CAM",
			shipped: "Передан курьеру",
			received: "Поступил в клинику",
			fitting: "Клиническая примерка",
			refitting: "Переделка / коррекция",
			completed: "Сдан / Зафиксирован",
			cancelled: "Аннулирован",
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
					marginBottom: "16px",
				}}
			>
				<div>
					<h3 style={{ margin: 0, color: "#f4f4f5", fontSize: "1.1rem" }}>
						🦷 Зуботехническая лаборатория (CAD/CAM ЗТЛ)
					</h3>
					<small style={{ color: "#71717a" }}>
						Оформление нарядов, выбор реставраций, шкалы VITA, культей ND1-ND9 и трекинг статусов
					</small>
				</div>
				<button
					type="button"
					onClick={() => setShowForm(!showForm)}
					style={{
						padding: "8px 16px",
						background: showForm ? "rgba(239, 68, 68, 0.15)" : "rgba(59, 130, 246, 0.2)",
						color: showForm ? "#fca5a5" : "#93c5fd",
						border: `1px solid ${showForm ? "rgba(239, 68, 68, 0.3)" : "rgba(59, 130, 246, 0.3)"}`,
						borderRadius: "6px",
						cursor: "pointer",
						fontWeight: 500,
					}}
				>
					{showForm ? "✕ Отмена" : "+ Новый наряд в ЗТЛ"}
				</button>
			</div>

			{showForm && (
				<form
					onSubmit={handleSubmit}
					className="lab-order-form"
					style={{
						display: "flex",
						flexDirection: "column",
						gap: "12px",
						background: "rgba(24, 24, 27, 0.8)",
						padding: "18px",
						borderRadius: "8px",
						border: "1px solid rgba(63, 63, 70, 0.5)",
						marginBottom: "20px",
					}}
				>
					<h4 style={{ margin: 0, color: "#e4e4e7" }}>Параметры ортопедической работы</h4>

					{!patientId && (
						<div>
							<label style={{ display: "block", fontSize: "12px", color: "#a1a1aa", marginBottom: "4px" }}>
								ID Пациента
							</label>
							<input
								type="text"
								placeholder="UUID Пациента"
								value={formPatientId}
								onChange={(e) => setFormPatientId(e.target.value)}
								required
								style={{
									width: "100%",
									padding: "8px",
									borderRadius: "4px",
									border: "1px solid #52525b",
									background: "#27272a",
									color: "#fff",
								}}
							/>
						</div>
					)}

					{/* Зубная формула быстрый выбор */}
					<div>
						<label style={{ display: "block", fontSize: "12px", color: "#a1a1aa", marginBottom: "4px" }}>
							Зубы по FDI (выбрано: {selectedTeeth.length > 0 ? selectedTeeth.join(", ") : "не выбрано"})
						</label>
						<div style={{ display: "flex", flexWrap: "wrap", gap: "4px", background: "#18181b", padding: "8px", borderRadius: "6px" }}>
							{[18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28].map((t) => (
								<button
									key={t}
									type="button"
									onClick={() => toggleTooth(t)}
									style={{
										padding: "4px 8px",
										fontSize: "12px",
										borderRadius: "4px",
										background: selectedTeeth.includes(t) ? "#3b82f6" : "#27272a",
										color: selectedTeeth.includes(t) ? "#fff" : "#a1a1aa",
										border: "1px solid #3f3f46",
										cursor: "pointer",
									}}
								>
									{t}
								</button>
							))}
						</div>
						<div style={{ display: "flex", flexWrap: "wrap", gap: "4px", background: "#18181b", padding: "8px", borderRadius: "6px", marginTop: "4px" }}>
							{[48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38].map((t) => (
								<button
									key={t}
									type="button"
									onClick={() => toggleTooth(t)}
									style={{
										padding: "4px 8px",
										fontSize: "12px",
										borderRadius: "4px",
										background: selectedTeeth.includes(t) ? "#3b82f6" : "#27272a",
										color: selectedTeeth.includes(t) ? "#fff" : "#a1a1aa",
										border: "1px solid #3f3f46",
										cursor: "pointer",
									}}
								>
									{t}
								</button>
							))}
						</div>
					</div>

					<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
						<div>
							<label style={{ display: "block", fontSize: "12px", color: "#a1a1aa", marginBottom: "4px" }}>
								Тип конструкции
							</label>
							<select
								value={restorationType}
								onChange={(e) => setRestorationType(e.target.value)}
								style={{
									width: "100%",
									padding: "8px",
									borderRadius: "4px",
									border: "1px solid #52525b",
									background: "#27272a",
									color: "#fff",
								}}
							>
								{RESTORATION_TYPES.map((rt) => (
									<option key={rt.value} value={rt.value}>
										{rt.label}
									</option>
								))}
							</select>
						</div>

						<div>
							<label style={{ display: "block", fontSize: "12px", color: "#a1a1aa", marginBottom: "4px" }}>
								Материал
							</label>
							<select
								value={material}
								onChange={(e) => setMaterial(e.target.value)}
								style={{
									width: "100%",
									padding: "8px",
									borderRadius: "4px",
									border: "1px solid #52525b",
									background: "#27272a",
									color: "#fff",
								}}
							>
								{MATERIALS.map((m) => (
									<option key={m.value} value={m.value}>
										{m.label}
									</option>
								))}
							</select>
						</div>
					</div>

					<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
						<div>
							<label style={{ display: "block", fontSize: "12px", color: "#a1a1aa", marginBottom: "4px" }}>
								Цвет реставрации (VITA)
							</label>
							<select
								value={colorVita}
								onChange={(e) => setColorVita(e.target.value)}
								style={{
									width: "100%",
									padding: "8px",
									borderRadius: "4px",
									border: "1px solid #52525b",
									background: "#27272a",
									color: "#fff",
								}}
							>
								{VITA_CLASSICAL_SHADES.map((s) => (
									<option key={s} value={s}>
										VITA {s}
									</option>
								))}
							</select>
						</div>

						<div>
							<label style={{ display: "block", fontSize: "12px", color: "#a1a1aa", marginBottom: "4px" }}>
								Цвет культи (IPS Natural Die)
							</label>
							<select
								value={stumpShade}
								onChange={(e) => setStumpShade(e.target.value)}
								style={{
									width: "100%",
									padding: "8px",
									borderRadius: "4px",
									border: "1px solid #52525b",
									background: "#27272a",
									color: "#fff",
								}}
							>
								<option value="">Не указан (обычная)</option>
								{STUMP_SHADES.map((nd) => (
									<option key={nd} value={nd}>
										{nd} {nd === "ND1" ? "(Bleach)" : nd === "ND9" ? "(Металл/Литой)" : ""}
									</option>
								))}
							</select>
						</div>

						<div>
							<label style={{ display: "block", fontSize: "12px", color: "#a1a1aa", marginBottom: "4px" }}>
								Цементный зазор (мкм)
							</label>
							<input
								type="number"
								min="10"
								max="100"
								value={cementGap}
								onChange={(e) => setCementGap(Number(e.target.value))}
								style={{
									width: "100%",
									padding: "8px",
									borderRadius: "4px",
									border: "1px solid #52525b",
									background: "#27272a",
									color: "#fff",
								}}
							/>
						</div>
					</div>

					<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
						<div>
							<label style={{ display: "block", fontSize: "12px", color: "#a1a1aa", marginBottom: "4px" }}>
								Срок сдачи работы
							</label>
							<input
								type="date"
								value={dueDate}
								onChange={(e) => setDueDate(e.target.value)}
								style={{
									width: "100%",
									padding: "8px",
									borderRadius: "4px",
									border: "1px solid #52525b",
									background: "#27272a",
									color: "#fff",
								}}
							/>
						</div>

						<div>
							<label style={{ display: "block", fontSize: "12px", color: "#a1a1aa", marginBottom: "4px" }}>
								Стоимость ЗТЛ (₽)
							</label>
							<input
								type="number"
								step="0.01"
								placeholder="0.00"
								value={priceRub}
								onChange={(e) => setPriceRub(e.target.value)}
								style={{
									width: "100%",
									padding: "8px",
									borderRadius: "4px",
									border: "1px solid #52525b",
									background: "#27272a",
									color: "#fff",
								}}
							/>
						</div>
					</div>

					<div>
						<label style={{ display: "block", fontSize: "12px", color: "#a1a1aa", marginBottom: "4px" }}>
							Клинические заметки технику
						</label>
						<textarea
							placeholder="Анатомические ориентиры, контакты, мамелоны, прозрачность режущего края..."
							value={clinicalNotes}
							onChange={(e) => setClinicalNotes(e.target.value)}
							style={{
								width: "100%",
								padding: "8px",
								borderRadius: "4px",
								border: "1px solid #52525b",
								background: "#27272a",
								color: "#fff",
								minHeight: "60px",
							}}
						/>
					</div>

					<button
						type="submit"
						disabled={submitting}
						style={{
							padding: "10px",
							borderRadius: "4px",
							background: "#2563eb",
							color: "#fff",
							border: "none",
							cursor: "pointer",
							fontWeight: "bold",
							opacity: submitting ? 0.7 : 1,
							marginTop: "8px",
						}}
					>
						{submitting ? "Оформление наряда..." : "🚀 Отправить заказ в лабораторию"}
					</button>
				</form>
			)}

			{error && <div className="lab-order-warning">{error}</div>}

			{loading ? (
				<div style={{ color: "#a1a1aa", textAlign: "center", padding: "20px" }}>
					Загрузка заказов...
				</div>
			) : orders.length === 0 ? (
				<div className="lab-orders-empty" style={{ textAlign: "center", padding: "30px", color: "#71717a" }}>
					Нет оформленных нарядов в зуботехническую лабораторию
				</div>
			) : (
				<div className="lab-orders-list" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
					{orders.map((order) => (
						<div
							key={order.id}
							className="lab-order-card"
							style={{
								display: "flex",
								justifyContent: "space-between",
								alignItems: "center",
								padding: "14px 18px",
								background: "rgba(24, 24, 27, 0.6)",
								border: "1px solid rgba(63, 63, 70, 0.4)",
								borderRadius: "8px",
							}}
						>
							<div className="lab-order-main" style={{ display: "flex", alignItems: "center", gap: "14px" }}>
								{order.toothFdi && (
									<div
										className="fdi-badge"
										style={{
											background: "rgba(59, 130, 246, 0.2)",
											color: "#93c5fd",
											padding: "4px 8px",
											borderRadius: "4px",
											fontWeight: "bold",
											fontSize: "13px",
										}}
									>
										Зуб {order.toothFdi}
									</div>
								)}
								<div className="order-details">
									<strong style={{ color: "#f4f4f5", display: "block" }}>{order.patientName}</strong>
									<div style={{ display: "flex", gap: "12px", color: "#a1a1aa", fontSize: "12px", marginTop: "2px" }}>
										{order.material && <span>{order.material}</span>}
										{order.colorVita && <span>Цвет: VITA {order.colorVita}</span>}
									</div>
								</div>
							</div>
							<div className="lab-order-meta" style={{ display: "flex", alignItems: "center", gap: "16px" }}>
								<span
									className={`status-badge ${order.status}`}
									style={{
										padding: "4px 10px",
										borderRadius: "12px",
										fontSize: "12px",
										background: "rgba(16, 185, 129, 0.15)",
										color: "#6ee7b7",
										border: "1px solid rgba(16, 185, 129, 0.3)",
									}}
								>
									{getStatusLabel(order.status)}
								</span>
								{order.dueDate && (
									<span className="delivery-date" style={{ color: "#a1a1aa", fontSize: "12px" }}>
										Срок: {new Date(order.dueDate).toLocaleDateString()}
									</span>
								)}
								{order.priceRub != null && (
									<span className="cost" style={{ color: "#f4f4f5", fontWeight: "bold", fontSize: "14px" }}>
										{order.priceRub.toLocaleString("ru-RU")} ₽
									</span>
								)}
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
