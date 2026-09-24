import type React from "react";
import { Heart, Printer, Send, X } from "lucide-react";
import type { PatientCareMemo } from "../patientCareInstructionsEngine";

export interface CareMemoSheetProps {
	readonly isOpen: boolean;
	readonly mode: "qr" | "print";
	readonly onClose: () => void;
	readonly careMemo: PatientCareMemo | null;
	readonly onSendWhatsApp: () => void;
	readonly onPrint: () => void;
}

export const CareMemoSheet: React.FC<CareMemoSheetProps> = ({
	isOpen,
	mode,
	onClose,
	careMemo,
	onSendWhatsApp,
	onPrint,
}) => {
	if (!isOpen || !careMemo) return null;

	if (mode === "print") {
		return (
			<div
				className="pc-sheet-overlay"
				data-testid="care-memo-print-preview-modal"
				onClick={onClose}
				role="dialog"
				aria-modal="true"
				aria-label="Предпросмотр печатного листа памятки"
			>
				<div
					className="pc-sheet-window"
					onClick={(e) => e.stopPropagation()}
					style={{ maxWidth: "800px", maxHeight: "90vh" }}
				>
					{/* Top Drag Handle */}
					<div className="pc-sheet-handle-bar">
						<div className="pc-sheet-handle" />
					</div>

					<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
						<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
							<Printer size={20} style={{ color: "var(--pc-primary)" }} />
							<h3 style={{ margin: 0, fontSize: "1.0625rem", fontWeight: 800, color: "var(--pc-text-main)" }}>
								Предпросмотр памятки (Формат А4)
							</h3>
						</div>
						<div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
							<button
								type="button"
								className="pc-btn-primary"
								onClick={onPrint}
								style={{ padding: "8px 16px", fontSize: "0.8125rem", fontWeight: 800, minHeight: "44px" }}
								data-testid="btn-print-from-preview"
							>
								<Printer size={14} />
								<span>Распечатать</span>
							</button>
							<button
								type="button"
								className="pc-close-btn"
								onClick={onClose}
								aria-label="Закрыть"
							>
								<X size={18} />
							</button>
						</div>
					</div>

					<div style={{ flex: 1, overflowY: "auto", padding: "16px", background: "#f8fafc", borderRadius: "12px" }}>
						<div
							className="pc-a4-preview-container"
							style={{
								background: "#ffffff",
								maxWidth: "700px",
								margin: "0 auto",
								padding: "24px",
								boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
								borderRadius: "8px",
								color: "#0f172a",
							}}
							dangerouslySetInnerHTML={{ __html: careMemo.printHtml }}
						/>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div
			className="pc-sheet-overlay"
			data-testid="care-memo-qr-modal"
			onClick={onClose}
			role="dialog"
			aria-modal="true"
			aria-label="Электронная памятка на смартфоне"
		>
			<div
				className="pc-sheet-window"
				onClick={(e) => e.stopPropagation()}
				style={{ textAlign: "center" }}
			>
				{/* Top Drag Handle */}
				<div className="pc-sheet-handle-bar">
					<div className="pc-sheet-handle" />
				</div>

				<div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
					<div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--pc-teal, #0d9488)", fontWeight: 800, fontSize: "0.875rem" }}>
						<Heart size={18} />
						<span>ПАМЯТКА НА СМАРТФОНЕ</span>
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

				<div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
					<h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 900, color: "var(--pc-text-main)" }}>
						{careMemo.patientName}
					</h3>
					<div style={{ fontSize: "0.875rem", color: "var(--pc-text-muted)", fontWeight: 600 }}>
						Рекомендации после лечения зуба №{careMemo.toothFdi}
					</div>
				</div>

				<div
					style={{
						background: "#ffffff",
						padding: "16px",
						borderRadius: "16px",
						border: "3px solid #0f172a",
						boxShadow: "0 8px 24px rgba(0, 0, 0, 0.12)",
						display: "flex",
						justifyContent: "center",
						alignItems: "center",
						margin: "0 auto",
						maxWidth: "240px",
					}}
					dangerouslySetInnerHTML={{
						__html: careMemo.qrCodeSvg,
					}}
				/>

				<p style={{ margin: 0, fontSize: "0.8125rem", color: "var(--pc-text-muted)", lineHeight: 1.4 }}>
					Отсканируйте QR-код камерой смартфона, чтобы открыть электронную памятку и сохранить контакты клиники.
				</p>

				<div style={{ width: "100%", display: "flex", gap: "8px", marginTop: "8px" }}>
					<button
						type="button"
						onClick={onSendWhatsApp}
						style={{
							flex: 1,
							minHeight: "44px",
							backgroundColor: "#25d366",
							color: "#ffffff",
							border: "none",
							borderRadius: "12px",
							fontSize: "0.9375rem",
							fontWeight: 800,
							cursor: "pointer",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							gap: "6px",
							boxShadow: "0 4px 14px rgba(37, 211, 102, 0.3)",
							touchAction: "manipulation",
						}}
					>
						<Send size={16} />
						<span>WhatsApp</span>
					</button>
					<button
						type="button"
						onClick={onClose}
						className="pc-btn-primary"
						style={{
							flex: 1,
							minHeight: "44px",
							fontSize: "0.9375rem",
							fontWeight: 800,
						}}
					>
						Готово
					</button>
				</div>
			</div>
		</div>
	);
};
