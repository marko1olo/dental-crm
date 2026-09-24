import type React from "react";
import { CheckCircle2, Info, QrCode, RefreshCw, X } from "lucide-react";
import {
	formatRubles,
	type PatientInvoiceItem,
	type SbpBankMember,
	type SbpQrPayload,
} from "../patientCabinetEngine";

export interface SbpPaymentSheetProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly sbpPayload: SbpQrPayload | null;
	readonly invoice: PatientInvoiceItem | null;
	readonly isCheckingStatus: boolean;
	readonly statusMessage: string | null;
	readonly onCheckStatus: () => void;
	readonly onOpenBankApp: (bank: SbpBankMember) => void;
}

export const SbpPaymentSheet: React.FC<SbpPaymentSheetProps> = ({
	isOpen,
	onClose,
	sbpPayload,
	invoice,
	isCheckingStatus,
	statusMessage,
	onCheckStatus,
	onOpenBankApp,
}) => {
	if (!isOpen || !sbpPayload) return null;

	return (
		<div
			className="pc-sheet-overlay"
			onClick={onClose}
			role="dialog"
			aria-modal="true"
			aria-label="Оплата через СБП"
		>
			<div
				className="pc-sheet-window"
				onClick={(e) => e.stopPropagation()}
				data-testid="sbp-payment-modal-sheet"
			>
				{/* Top Drag Handle for Mobile */}
				<div className="pc-sheet-handle-bar">
					<div className="pc-sheet-handle" />
				</div>

				<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
					<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
						<QrCode size={22} style={{ color: "var(--pc-primary)" }} />
						<strong style={{ fontSize: "1.0625rem" }}>Оплата через СБП без комиссии</strong>
					</div>
					<button
						type="button"
						className="pc-close-btn"
						onClick={onClose}
						aria-label="Закрыть"
					>
						<X size={18} />
					</button>
				</div>

				<div style={{ textAlign: "center", margin: "8px 0" }}>
					<div style={{ fontSize: "1.625rem", fontWeight: 800, color: "var(--pc-text-main)" }}>
						{formatRubles(sbpPayload.amountRub)}
					</div>
					<p style={{ fontSize: "0.8125rem", color: "var(--pc-text-muted)", margin: "4px 0 0 0" }}>
						Счет {sbpPayload.invoiceNumber} &bull; {sbpPayload.recipientLegalName}
					</p>
					{invoice && (
						<p style={{ fontSize: "0.75rem", color: "var(--pc-text-muted)", margin: "2px 0 0 0" }}>
							{invoice.titleRu}
						</p>
					)}
				</div>

				{/* Dynamic QR Code */}
				<div
					className="pc-qr-container"
					dangerouslySetInnerHTML={{ __html: sbpPayload.qrSvg }}
					data-testid="sbp-qr-svg-wrapper"
				/>

				<p style={{ fontSize: "0.75rem", color: "var(--pc-text-muted)", textAlign: "center", margin: 0 }}>
					Отсканируйте QR-код камерой смартфона или нажмите на ваш банк:
				</p>

				{/* Bank Apps Quick Buttons */}
				<div className="pc-bank-buttons-grid">
					{sbpPayload.availableBanks.map((bank) => (
						<button
							key={bank.id}
							type="button"
							className="pc-bank-btn"
							onClick={() => onOpenBankApp(bank)}
						>
							<span style={{ width: "10px", height: "10px", borderRadius: "50%", background: bank.brandColorHex }} />
							<span>{bank.nameRu}</span>
						</button>
					))}
				</div>

				{statusMessage && (
					<div
						style={{
							display: "flex",
							alignItems: "flex-start",
							gap: "8px",
							padding: "10px 12px",
							borderRadius: "8px",
							background: "var(--pc-surface)",
							border: "1px solid var(--pc-border)",
							fontSize: "0.75rem",
							color: "var(--pc-text-muted)",
							lineHeight: 1.4,
							textAlign: "left",
						}}
					>
						<Info size={16} style={{ color: "var(--pc-primary)", flexShrink: 0, marginTop: "2px" }} />
						<span>{statusMessage}</span>
					</div>
				)}

				<div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
					<button
						type="button"
						className="pc-btn-primary"
						style={{ flex: 1, minHeight: "44px" }}
						onClick={onCheckStatus}
						disabled={isCheckingStatus}
						data-testid="confirm-sbp-payment-btn"
					>
						{isCheckingStatus ? (
							<RefreshCw size={16} className="animate-spin" />
						) : (
							<CheckCircle2 size={16} />
						)}
						<span>
							{isCheckingStatus ? "Проверка статуса..." : "Я оплатил (Проверить статус)"}
						</span>
					</button>
				</div>
			</div>
		</div>
	);
};
