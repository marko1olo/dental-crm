import { AlertCircle, Check, CheckCircle2, ShieldCheck } from "lucide-react";
import React from "react";

interface CabinetSanpinNormBannerProps {
	allItemsReady: boolean;
	onQuickFillAllReady: () => void;
}

export function CabinetSanpinNormBanner({ allItemsReady, onQuickFillAllReady }: CabinetSanpinNormBannerProps) {
	return (
		<div
			style={{
				display: "flex",
				alignItems: "flex-start",
				justifyContent: "space-between",
				gap: "1rem",
				flexWrap: "wrap",
				marginBottom: "0.85rem",
			}}
		>
			<div>
				<div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
					<h3
						style={{
							fontSize: "1rem",
							fontWeight: 800,
							margin: 0,
							color: "var(--ink, #0f172a)",
							display: "flex",
							alignItems: "center",
							gap: "0.45rem",
						}}
					>
						<ShieldCheck size={20} color="var(--teal, #0d9488)" />
						<span>Автоматический санитарный контроль готовности кабинета</span>
					</h3>
					<span
						style={{
							padding: "0.15rem 0.55rem",
							borderRadius: "0.375rem",
							fontSize: "0.72rem",
							fontWeight: 800,
							background: allItemsReady ? "rgba(13, 148, 136, 0.12)" : "rgba(245, 158, 11, 0.12)",
							color: allItemsReady ? "var(--teal, #0d9488)" : "var(--warn-fg, #b45309)",
							display: "inline-flex",
							alignItems: "center",
							gap: "0.25rem",
						}}
					>
						{allItemsReady ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
						<span>{allItemsReady ? "Норма по умолчанию" : "Имеются исключения"}</span>
					</span>
				</div>
				<p
					style={{
						margin: "0.25rem 0 0",
						fontSize: "0.8rem",
						color: "var(--muted, #64748b)",
						lineHeight: 1.45,
					}}
				>
					Фоновый расчет нормативов без симуляции ручного труда. Журналы дезинфекции и стерилизации формируются автоматически.
				</p>
			</div>

			<button
				type="button"
				onClick={onQuickFillAllReady}
				className="sanpin-btn sanpin-btn-secondary"
				style={{
					minHeight: "40px",
					padding: "0.4rem 0.95rem",
					fontSize: "0.85rem",
					fontWeight: 800,
					cursor: "pointer",
					display: "inline-flex",
					alignItems: "center",
					gap: "0.4rem",
					borderRadius: "0.5rem",
					background: "rgba(13, 148, 136, 0.1)",
					color: "var(--teal, #0d9488)",
					border: "1px solid rgba(13, 148, 136, 0.3)",
					boxShadow: "0 1px 2px rgba(13, 148, 136, 0.08)",
				}}
				title="Подтвердить соблюдение нормативов СанПиН для текущего кабинета в 1 клик"
			>
				<Check size={16} /> <span>Норма в 1 клик</span>
			</button>
		</div>
	);
}
