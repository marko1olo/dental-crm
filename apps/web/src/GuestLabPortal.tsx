import {
	AlignLeft,
	Beaker,
	CheckCircle2,
	Clock,
	Image as ImageIcon,
	PackageCheck,
	RefreshCcw,
	User,
} from "lucide-react";
import { useEffect, useState } from "react";
import { showToast } from "./components/GlobalToast";
import "./GuestLabPortal.css";

interface LabOrderData {
	id: string;
	patientFullName: string | null;
	toothFdi: string | null;
	material: string | null;
	colorVita: string | null;
	status: string;
	clinicalNotes: string | null;
	attachedImageUrl: string | null;
	createdAt: string;
}

export function GuestLabPortal() {
	const [token, setToken] = useState<string>("");
	const [order, setOrder] = useState<LabOrderData | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [isUpdating, setIsUpdating] = useState(false);

	useEffect(() => {
		const hash = window.location.hash;
		const parts = hash.split("/lab-order/");
		if (parts.length > 1 && parts[1]) {
			const extractedToken = parts[1] as string;
			setToken(extractedToken);

			fetch(`/api/portal/lab-order/${extractedToken}`)
				.then((res) => {
					if (!res.ok) throw new Error("Заказ не найден или доступ запрещен");
					return res.json();
				})
				.then((data) => {
					setOrder(data);
				})
				.catch((e) => {
					setError(e.message);
				})
				.finally(() => {
					setIsLoading(false);
				});
		} else {
			setError("Токен не предоставлен");
			setIsLoading(false);
		}
	}, []);

	const updateStatus = async (newStatus: string) => {
		if (!token || !order) return;
		try {
			setIsUpdating(true);
			const res = await fetch(`/api/portal/lab-order/${token}/status`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ status: newStatus }),
			});

			if (!res.ok) throw new Error("Ошибка при обновлении статуса");

			const data = await res.json();
			if (data.success) {
				setOrder({ ...order, status: data.status });
				showToast("Статус успешно обновлен", "success");
			}
		} catch (e: any) {
			showToast(e.message, "error");
		} finally {
			setIsUpdating(false);
		}
	};

	if (isLoading) {
		return (
			<div className="guest-portal-container" style={{ justifyContent: "center" }}>
				<RefreshCcw className="guest-portal-spinner" size={32} />
			</div>
		);
	}

	if (error || !order) {
		return (
			<div className="guest-portal-container" style={{ justifyContent: "center" }}>
				<div className="guest-portal-card">
					<div className="guest-portal-icon-wrapper">
						<Beaker size={32} />
					</div>
					<h2 className="guest-portal-title">Ошибка доступа</h2>
					<p className="guest-portal-subtitle">{error}</p>
				</div>
			</div>
		);
	}

	const getStatusIcon = (status: string) => {
		switch (status) {
			case "in_progress":
				return <Clock size={20} />;
			case "refitting":
				return <RefreshCcw size={20} />;
			case "shipped":
				return <PackageCheck size={20} />;
			case "completed":
				return <CheckCircle2 size={20} />;
			default:
				return <Clock size={20} />;
		}
	};

	const statusLabel =
		{
			draft: "Черновик",
			sent: "Отправлен",
			in_progress: "В работе",
			shipped: "Работа готова, отправлена в клинику",
			received: "Получен клиникой",
			refitting: "На переделке",
			completed: "Завершен",
		}[order.status] || order.status;

	return (
		<div className="guest-portal-container">
			<div className="guest-portal-card">
				<div className="guest-portal-icon-wrapper" style={{ background: "var(--primary-bg)", color: "var(--primary)", borderColor: "transparent" }}>
					<Beaker size={32} />
				</div>
				<h1 className="guest-portal-title">Портал Зуботехнической Лаборатории</h1>
				<p className="guest-portal-subtitle">Безопасный доступ к деталям заказа</p>

				<div style={{ background: "var(--bg-default)", borderRadius: "12px", padding: "20px", marginBottom: "24px" }}>
					<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: "1px solid var(--line)", paddingBottom: "16px" }}>
						<div style={{ textAlign: "left" }}>
							<p style={{ fontSize: "12px", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: "4px" }}>
								Заказ № {(order.id ?? "").substring(0, 8).toUpperCase()}
							</p>
							<h2 style={{ fontSize: "20px", fontWeight: "600", display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
								<User size={20} />
								{order.patientFullName || "Пациент не указан"}
							</h2>
						</div>
						<div className={`guest-portal-status-badge ${order.status}`}>
							{getStatusIcon(order.status)}
							{statusLabel}
						</div>
					</div>

					<div className="guest-portal-grid">
						<div>
							<h3 className="guest-portal-field-label" style={{ marginBottom: "12px" }}>
								<CheckCircle2 size={16} /> Технические параметры
							</h3>
							<div className="guest-portal-field" style={{ background: "var(--paper)", padding: "16px", borderRadius: "8px", border: "1px solid var(--line)" }}>
								<div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
									<span className="guest-portal-field-label">Зуб (FDI)</span>
									<span className="guest-portal-field-value">{order.toothFdi || "—"}</span>
								</div>
								<div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
									<span className="guest-portal-field-label">Материал</span>
									<span className="guest-portal-field-value">{order.material || "—"}</span>
								</div>
								<div style={{ display: "flex", justifyContent: "space-between" }}>
									<span className="guest-portal-field-label">Цвет (Vita)</span>
									<span className="guest-portal-field-value">{order.colorVita || "—"}</span>
								</div>
							</div>
						</div>
						<div>
							<h3 className="guest-portal-field-label" style={{ marginBottom: "12px" }}>
								<AlignLeft size={16} /> Клинические заметки
							</h3>
							<div style={{ background: "#fef9c3", padding: "16px", borderRadius: "8px", color: "#854d0e", minHeight: "100px", border: "1px solid #fef08a" }}>
								{order.clinicalNotes ? (
									<p style={{ margin: 0, fontSize: "14px", whiteSpace: "pre-wrap" }}>{order.clinicalNotes}</p>
								) : (
									<p style={{ margin: 0, fontSize: "14px", fontStyle: "italic", opacity: 0.8 }}>Врач не оставил комментариев.</p>
								)}
							</div>
						</div>
					</div>

					<div style={{ textAlign: "left", marginBottom: "32px" }}>
						<h3 className="guest-portal-field-label" style={{ marginBottom: "12px" }}>
							<ImageIcon size={16} /> Приложенные снимки
						</h3>
						{order.attachedImageUrl ? (
							<img src={order.attachedImageUrl} alt="Клинический снимок" className="guest-portal-image" />
						) : (
							<div style={{ padding: "40px", border: "1px dashed var(--line)", borderRadius: "12px", textAlign: "center", color: "var(--text-secondary)" }}>
								<ImageIcon size={32} style={{ margin: "0 auto 8px", opacity: 0.5 }} />
								Нет приложенных снимков
							</div>
						)}
					</div>

					<div className="guest-portal-actions">
						<h3 style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "8px", textAlign: "left" }}>Управление статусом заказа</h3>
						<div style={{ display: "flex", gap: "12px" }}>
							<button
								onClick={() => updateStatus("in_progress")}
								disabled={isUpdating || order.status === "in_progress"}
								className={`secondary-button ${order.status === "in_progress" ? "active" : ""}`}
								style={{ flex: 1, padding: "12px" }}
							>
								Взять в работу
							</button>
							<button
								onClick={() => updateStatus("shipped")}
								disabled={isUpdating || order.status === "shipped"}
								className={`secondary-button ${order.status === "shipped" ? "active" : ""}`}
								style={{ flex: 1, padding: "12px" }}
							>
								Работа готова
							</button>
							<button
								onClick={() => updateStatus("refitting")}
								disabled={isUpdating || order.status === "refitting"}
								className={`secondary-button ${order.status === "refitting" ? "active" : ""}`}
								style={{ flex: 1, padding: "12px" }}
							>
								На переделке
							</button>
						</div>
						<p style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "8px" }}>
							* Изменение статуса автоматически уведомит врача в расписании клиники.
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
