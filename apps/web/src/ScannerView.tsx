import { PackageCheck, QrCode, ShieldCheck } from "lucide-react";
import React, { useState } from "react";
import { SanpinRegistersView } from "./components/sanpin/SanpinRegistersView";
import { AutoclaveLog257Modal } from "./components/sanpin/autoclaveLog/AutoclaveLog257Modal";
import { SanpinJournalsModal } from "./components/sanpin/journals/SanpinJournalsModal";
import { KraftPackageBarcodeModal } from "./components/sanpin/kraft/KraftPackageBarcodeModal";

export function ScannerView() {
	const [isKraftModalOpen, setIsKraftModalOpen] = useState(false);
	const [isAutoclaveLogOpen, setIsAutoclaveLogOpen] = useState(false);

	return (
		<div
			className="scanner-view-wrapper"
			style={{
				display: "flex",
				flexDirection: "column",
				gap: "1rem",
				width: "100%",
			}}
		>
			{/* Top Bar for Sterilization Packaging & 2D Barcode Studio Trigger */}
			<div
				className="scanner-packaging-bar"
				style={{
					display: "flex",
					flexWrap: "wrap",
					alignItems: "center",
					justifyContent: "space-between",
					gap: "0.75rem",
					padding: "0.85rem 1.25rem",
					borderRadius: "12px",
					border: "1px solid var(--line, #e2e8f0)",
					background: "var(--paper, #ffffff)",
					boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
				}}
			>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: "0.75rem",
						minWidth: 0,
					}}
				>
					<div
						style={{
							width: "40px",
							height: "40px",
							borderRadius: "10px",
							background: "rgba(13, 148, 136, 0.12)",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							color: "var(--teal, #0d9488)",
							flexShrink: 0,
						}}
					>
						<PackageCheck size={22} />
					</div>
					<div>
						<div
							style={{
								fontWeight: 700,
								fontSize: "0.95rem",
								color: "var(--ink, #0f172a)",
							}}
						>
							Студия упаковки и 2D DataMatrix штрихкодирования
						</div>
						<div
							style={{
								fontSize: "0.8rem",
								color: "var(--muted, #64748b)",
							}}
						>
							Маркировка и расчет сроков годности крафт-пакетов по СанПиН 3.3686-21
						</div>
					</div>
				</div>

				<div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
					<button
						type="button"
						onClick={() => setIsAutoclaveLogOpen(true)}
						className="sanpin-btn sanpin-btn-secondary"
						style={{
							minHeight: "44px",
							padding: "0.5rem 1.25rem",
							fontSize: "0.9rem",
							fontWeight: 700,
							display: "inline-flex",
							alignItems: "center",
							gap: "0.5rem",
							background: "var(--paper-subtle, #f8fafc)",
							color: "var(--ink, #0f172a)",
							border: "1px solid var(--line, #cbd5e1)",
							borderRadius: "8px",
							cursor: "pointer",
						}}
						title="Журнал стерилизаторов (Форма № 257/у)"
						data-testid="open-autoclave-log-257-btn"
					>
						<ShieldCheck size={18} />
						Журнал стерилизаторов (Форма № 257/у)
					</button>

					<button
						type="button"
						onClick={() => setIsKraftModalOpen(true)}
						className="sanpin-btn sanpin-btn-primary"
						style={{
							minHeight: "44px",
							padding: "0.5rem 1.25rem",
							fontSize: "0.9rem",
							fontWeight: 700,
							display: "inline-flex",
							alignItems: "center",
							gap: "0.5rem",
							background: "var(--teal, #0d9488)",
							color: "#ffffff",
							border: "none",
							borderRadius: "8px",
							cursor: "pointer",
						}}
						title="Маркировка крафт-пакетов (СанПиН 3.3686-21 / DataMatrix 2D)"
						data-testid="open-kraft-barcode-modal-btn"
					>
						<QrCode size={18} />
						Маркировка крафт-пакетов (СанПиН 3.3686-21 / DataMatrix 2D)
					</button>
				</div>
			</div>

			{/* Main SanPiN Registers & Logs View */}
			<SanpinRegistersView />

			{/* SanPiN Kraft Package Barcode & Expiry Studio Modal */}
			<KraftPackageBarcodeModal
				isOpen={isKraftModalOpen}
				onClose={() => setIsKraftModalOpen(false)}
			/>

			{/* SanPiN Statutory Form 257/U Autoclave Log Modal */}
			<AutoclaveLog257Modal
				isOpen={isAutoclaveLogOpen}
				onClose={() => setIsAutoclaveLogOpen(false)}
			/>
		</div>
	);
}

export { SanpinRegistersView, SanpinJournalsModal, KraftPackageBarcodeModal, AutoclaveLog257Modal };
export default ScannerView;
