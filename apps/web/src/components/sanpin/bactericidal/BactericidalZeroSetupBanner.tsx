import React from "react";
import { Sparkles } from "lucide-react";

interface BactericidalZeroSetupBannerProps {
	submitting: boolean;
	onProvisionCanonicalEquipment: () => void;
}

export function BactericidalZeroSetupBanner({
	submitting,
	onProvisionCanonicalEquipment,
}: BactericidalZeroSetupBannerProps) {
	return (
		<div
			className="sanpin-zero-setup-banner"
			style={{
				background: "linear-gradient(135deg, rgba(13, 148, 136, 0.08) 0%, rgba(2, 132, 199, 0.06) 100%)",
				border: "2px dashed var(--teal, #0d9488)",
				borderRadius: "0.85rem",
				padding: "1.1rem 1.25rem",
				marginTop: "0.75rem",
				marginBottom: "0.75rem",
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				gap: "1.25rem",
				flexWrap: "wrap",
			}}
			data-testid="bactericidal-zero-setup-banner"
		>
			<div style={{ flex: "1 1 320px" }}>
				<div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
					<span
						style={{
							padding: "0.2rem 0.5rem",
							borderRadius: "0.4rem",
							background: "var(--teal, #0d9488)",
							color: "#ffffff",
							fontSize: "0.75rem",
							fontWeight: 800,
							textTransform: "uppercase",
							letterSpacing: "0.05em",
						}}
					>
						Чистый воздух • Zero-Setup
					</span>
					<span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--ink)" }}>
						Быстрый старт для соло-врача и малых клиник
					</span>
				</div>
				<div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--ink)", marginBottom: "0.2rem" }}>
					Парк бактерицидных установок пуст
				</div>
				<p style={{ margin: 0, fontSize: "0.82rem", color: "var(--muted)" }}>
					Подключите стандартный закрытый рециркулятор Дезар-4 (ОРУБн-3-3-«КРОНТ», V=45 м³) для Кабинета №1 по типовому паспорту без ручного ввода счетчиков.
				</p>
			</div>
			<button
				type="button"
				onClick={onProvisionCanonicalEquipment}
				aria-busy={submitting}
				className="sanpin-btn touch-manipulation"
				style={{
					minHeight: "44px",
					padding: "0.55rem 1.15rem",
					fontSize: "0.875rem",
					fontWeight: 800,
					cursor: "pointer",
					whiteSpace: "nowrap",
					display: "inline-flex",
					alignItems: "center",
					gap: "0.45rem",
					borderRadius: "8px",
					background: "var(--teal, #0d9488)",
					opacity: submitting ? 0.7 : 1,
					color: "#ffffff",
					border: "none",
					boxShadow: "0 2px 8px rgba(13, 148, 136, 0.3)",
				}}
				data-testid="bactericidal-zero-setup-provision-btn"
				title="Подключить типовой рециркулятор: Дезар-4 (ОРУБн-3-3-«КРОНТ») для Кабинета терапевтической стоматологии №1 (V=45 м³, 8000 ч ресурс ламп)"
			>
				<Sparkles size={17} />
				<span>Подключить типовой рециркулятор (Дезар-4, Кабинет №1)</span>
			</button>
		</div>
	);
}
