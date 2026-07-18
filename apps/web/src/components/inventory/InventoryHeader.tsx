import React from "react";
import { Package, TrendingUp } from "lucide-react";

export function InventoryHeader({
	totalItems,
	lowStockCount,
	totalValue,
}: {
	totalItems: number;
	lowStockCount: number;
	totalValue: number;
}) {
	const paperBg = "var(--paper)";
	const borderColor = "var(--line)";

	return (
		<div
			style={{
				display: "flex",
				alignItems: "flex-start",
				justifyContent: "space-between",
				marginBottom: 24,
				flexWrap: "wrap",
				gap: 16,
			}}
		>
			<div>
				<h1
					style={{
						fontSize: 24,
						fontWeight: 700,
						margin: 0,
						display: "flex",
						alignItems: "center",
						gap: 12,
						color: "var(--ink)",
					}}
				>
					<Package color="var(--teal)" size={28} /> Склад материалов
				</h1>
				<p style={{ color: "var(--muted)", margin: "4px 0 0 0", fontSize: 14 }}>
					Учёт расходников, приход и списание
				</p>
			</div>
			{/* KPI CARDS */}
			<div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
				<div
					style={{
						background: paperBg,
						border: `1px solid ${borderColor}`,
						padding: "12px 20px",
						borderRadius: 12,
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						minWidth: 110,
					}}
				>
					<span
						style={{
							fontSize: 11,
							color: "var(--muted)",
							textTransform: "uppercase",
							letterSpacing: 1,
						}}
					>
						Позиций
					</span>
					<strong style={{ fontSize: 22, color: "var(--ink)" }}>
						{totalItems}
					</strong>
				</div>
				<div
					style={{
						background: paperBg,
						border: `1px solid ${borderColor}`,
						padding: "12px 20px",
						borderRadius: 12,
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						minWidth: 110,
					}}
				>
					<span
						style={{
							fontSize: 11,
							color: "var(--muted)",
							textTransform: "uppercase",
							letterSpacing: 1,
						}}
					>
						В дефиците
					</span>
					<strong
						style={{
							fontSize: 22,
							color: lowStockCount > 0 ? "var(--tomato)" : "var(--teal)",
						}}
					>
						{lowStockCount}
					</strong>
				</div>
				{totalValue > 0 && (
					<div
						style={{
							background: paperBg,
							border: `1px solid ${borderColor}`,
							padding: "12px 20px",
							borderRadius: 12,
							display: "flex",
							flexDirection: "column",
							alignItems: "center",
							minWidth: 140,
						}}
					>
						<span
							style={{
								fontSize: 11,
								color: "var(--muted)",
								textTransform: "uppercase",
								letterSpacing: 1,
							}}
						>
							Стоимость склада
						</span>
						<strong
							style={{
								fontSize: 18,
								color: "var(--teal)",
								display: "flex",
								alignItems: "center",
								gap: 4,
							}}
						>
							<TrendingUp size={14} />
							{totalValue.toLocaleString("ru-RU")} ₽
						</strong>
					</div>
				)}
			</div>
		</div>
	);
}
