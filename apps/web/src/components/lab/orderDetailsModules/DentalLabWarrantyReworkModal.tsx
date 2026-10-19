import { RotateCcw, X } from "lucide-react";
import type React from "react";
import { useState } from "react";
import type { DentalLabWorkflowOrder } from "../dentalLabWorkflowEngine";
import { DentalLabWarrantyReworkFields } from "./DentalLabWarrantyReworkFields";

export interface DentalLabWarrantyReworkModalProps {
	readonly order: DentalLabWorkflowOrder | null;
	readonly onClose: () => void;
	readonly onSubmit: (order: DentalLabWorkflowOrder, reason: string) => void;
}

export function DentalLabWarrantyReworkModal({
	order,
	onClose,
	onSubmit,
}: DentalLabWarrantyReworkModalProps) {
	const [reason, setReason] = useState<string>("Скол керамической облицовки");

	if (!order) return null;

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		onSubmit(order, reason || "Гарантийная рекламация");
	};

	return (
		<div className="ztl-detail-overlay">
			<div className="ztl-detail-card" style={{ maxWidth: "480px" }}>
				<header
					className="ztl-detail-header"
					style={{ borderBottom: "2px solid var(--bad-fg, #e11d48)" }}
				>
					<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
						<RotateCcw size={18} color="var(--bad-fg, #e11d48)" />
						<h3
							style={{
								margin: 0,
								fontSize: "14px",
								fontWeight: 700,
								color: "var(--bad-fg, #e11d48)",
							}}
						>
							Гарантийная рекламация наряда № {order.orderNumber}
						</h3>
					</div>
					<button type="button" className="ztl-btn-icon" onClick={onClose}>
						<X size={16} />
					</button>
				</header>

				<form onSubmit={handleSubmit}>
					<div className="ztl-detail-body">
						<p
							style={{
								margin: "0 0 12px 0",
								fontSize: "12px",
								color: "var(--muted, #64748b)",
							}}
						>
							Работа для пациента <strong>{order.patientName}</strong> будет
							переведена в статус «Гарантийная переделка» с сохранением ссылки
							на наряд № {order.orderNumber}.
						</p>
						<DentalLabWarrantyReworkFields
							reason={reason}
							setReason={setReason}
						/>
					</div>

					<footer className="ztl-detail-footer">
						<button
							type="button"
							className="ztl-btn-secondary"
							onClick={onClose}
						>
							Отмена
						</button>
						<button
							type="submit"
							className="ztl-btn-primary"
							style={{
								background: "var(--bad-fg, #e11d48)",
								borderColor: "var(--bad-border, #be123c)",
								color: "var(--paper-strong, #ffffff)",
							}}
						>
							<RotateCcw size={14} />
							<span>Отправить на рекламацию</span>
						</button>
					</footer>
				</form>
			</div>
		</div>
	);
}
