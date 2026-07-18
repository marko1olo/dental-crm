import React, { useState } from "react";
import { CreditCard, Banknote, Receipt, CheckCircle, X } from "lucide-react";
import { showToast } from "../GlobalToast";

interface VisitPaymentOverlayProps {
	onClose: () => void;
	totalAmount: number;
	patientName: string;
	hasInstallments: boolean;
}

export const VisitPaymentOverlay: React.FC<VisitPaymentOverlayProps> = ({ onClose, totalAmount, patientName, hasInstallments }) => {
	const [method, setMethod] = useState<"card" | "cash" | "installment">("card");
	const [isProcessing, setIsProcessing] = useState(false);
	const [isSuccess, setIsSuccess] = useState(false);

	const handlePay = () => {
		setIsProcessing(true);
		// Mock processing
		setTimeout(() => {
			setIsProcessing(false);
			setIsSuccess(true);
			showToast("Оплата успешно принята!", "success");
			setTimeout(() => {
				onClose();
			}, 2000);
		}, 1500);
	};

	if (isSuccess) {
		return (
			<div className="payment-overlay-backdrop" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
				<div style={{ background: "var(--surface)", padding: "32px", borderRadius: "16px", textAlign: "center", width: "400px" }}>
					<CheckCircle size={48} color="var(--brand-500)" style={{ margin: "0 auto 16px" }} />
					<h2 style={{ margin: "0 0 8px 0" }}>Оплата прошла успешно</h2>
					<p style={{ color: "var(--muted)", margin: "0 0 24px 0" }}>Чек отправлен на почту пациента.</p>
					<button className="primary-button" onClick={onClose} style={{ width: "100%" }}>Закрыть</button>
				</div>
			</div>
		);
	}

	return (
		<div className="payment-overlay-backdrop" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
			<div style={{ background: "var(--surface)", padding: "32px", borderRadius: "16px", width: "500px", maxWidth: "90vw", position: "relative" }}>
				<button 
					onClick={onClose}
					style={{ position: "absolute", top: "16px", right: "16px", background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}
				>
					<X size={24} />
				</button>
				
				<h2 style={{ margin: "0 0 4px 0", fontSize: "20px" }}>Прием оплаты</h2>
				<p style={{ margin: "0 0 24px 0", color: "var(--muted)", fontSize: "14px" }}>Пациент: {patientName}</p>
				
				<div style={{ background: "var(--paper-soft)", padding: "20px", borderRadius: "12px", marginBottom: "24px", textAlign: "center" }}>
					<div style={{ fontSize: "13px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>К оплате</div>
					<div style={{ fontSize: "36px", fontWeight: 700, color: "var(--text)" }}>{totalAmount.toLocaleString("ru-RU")} ₽</div>
				</div>

				<h3 style={{ fontSize: "14px", marginBottom: "12px" }}>Способ оплаты</h3>
				<div style={{ display: "grid", gridTemplateColumns: hasInstallments ? "1fr 1fr 1fr" : "1fr 1fr", gap: "12px", marginBottom: "32px" }}>
					<button 
						className={`secondary-button ${method === "card" ? "active" : ""}`}
						onClick={() => setMethod("card")}
						style={{ flexDirection: "column", gap: "8px", height: "80px", border: method === "card" ? "2px solid var(--brand-500)" : "1px solid var(--line)", background: method === "card" ? "var(--brand-50)" : "transparent" }}
					>
						<CreditCard size={24} color={method === "card" ? "var(--brand-600)" : "var(--muted)"} />
						<span style={{ color: method === "card" ? "var(--brand-700)" : "inherit" }}>Карта</span>
					</button>
					<button 
						className={`secondary-button ${method === "cash" ? "active" : ""}`}
						onClick={() => setMethod("cash")}
						style={{ flexDirection: "column", gap: "8px", height: "80px", border: method === "cash" ? "2px solid var(--brand-500)" : "1px solid var(--line)", background: method === "cash" ? "var(--brand-50)" : "transparent" }}
					>
						<Banknote size={24} color={method === "cash" ? "var(--brand-600)" : "var(--muted)"} />
						<span style={{ color: method === "cash" ? "var(--brand-700)" : "inherit" }}>Наличные</span>
					</button>
					{hasInstallments && (
						<button 
							className={`secondary-button ${method === "installment" ? "active" : ""}`}
							onClick={() => setMethod("installment")}
							style={{ flexDirection: "column", gap: "8px", height: "80px", border: method === "installment" ? "2px solid var(--brand-500)" : "1px solid var(--line)", background: method === "installment" ? "var(--brand-50)" : "transparent" }}
						>
							<Receipt size={24} color={method === "installment" ? "var(--brand-600)" : "var(--muted)"} />
							<span style={{ color: method === "installment" ? "var(--brand-700)" : "inherit" }}>Рассрочка</span>
						</button>
					)}
				</div>

				<button 
					className="primary-button" 
					onClick={handlePay} 
					disabled={isProcessing}
					style={{ width: "100%", padding: "16px", fontSize: "16px", fontWeight: "bold" }}
				>
					{isProcessing ? "Обработка..." : `Подтвердить оплату (${totalAmount.toLocaleString("ru-RU")} ₽)`}
				</button>
			</div>
		</div>
	);
};
