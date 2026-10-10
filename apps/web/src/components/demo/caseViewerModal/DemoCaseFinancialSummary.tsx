/**
 * @file DemoCaseFinancialSummary.tsx
 * @description Смета клинического кейса: расчет по номенклатуре приказа 804н, материалы, экономия пациента.
 * Layer 4: Презентационный компонент финансовых расчетов (МАНДАТ 8y, МАНДАТ 8n).
 */

import React, { useState } from "react";
import {
	CreditCard,
	FileText,
	QrCode,
	ShieldCheck,
	Tag,
	TrendingDown,
} from "lucide-react";
import type { DemoFinancialItem } from "./types.js";
import { showToast } from "../../GlobalToast.js";

export interface DemoCaseFinancialSummaryProps {
	readonly items: DemoFinancialItem[];
	readonly totalGrossRub: number;
	readonly totalDiscountRub: number;
	readonly totalNetRub: number;
	readonly patientSavingsRub: number;
	readonly estimateNumber?: string;
	readonly estimateDateIso?: string;
}

export const DemoCaseFinancialSummary: React.FC<DemoCaseFinancialSummaryProps> = ({
	items,
	totalGrossRub,
	totalDiscountRub,
	totalNetRub,
	patientSavingsRub,
	estimateNumber = "СМ-2026/041",
	estimateDateIso = new Date().toISOString(),
}) => {
	const [paidViaSbp, setPaidViaSbp] = useState(false);

	const handlePaySbp = () => {
		setPaidViaSbp(true);
		showToast("Симуляция: Оплата через СБП 0% комиссии успешно подтверждена!", "success");
	};

	const handleInstallment = () => {
		const monthly = Math.round(totalNetRub / 12);
		showToast(`Оформлена рассрочка 0-0-12: по ${monthly.toLocaleString("ru-RU")} ₽/мес без переплат!`, "success");
	};

	return (
		<div
			data-testid="demo-financial-summary"
			style={{
				padding: "16px",
				background: "var(--paper, #f8fafc)",
				border: "1px solid var(--line, #e2e8f0)",
				borderRadius: "10px",
				display: "flex",
				flexDirection: "column",
				gap: "14px",
			}}
		>
			{/* Шапка сметы */}
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					flexWrap: "wrap",
					gap: "8px",
				}}
			>
				<div>
					<div style={{ fontWeight: 700, fontSize: "14px", color: "var(--ink, #0f172a)" }}>
						Смета плана лечения {estimateNumber} от {estimateDateIso.slice(0, 10)}
					</div>
					<div style={{ fontSize: "11px", color: "var(--muted, #64748b)", marginTop: "2px" }}>
						Расчет по Номенклатуре медицинских услуг (Приказ Минздрава РФ № 804н)
					</div>
				</div>

				<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
					<span
						style={{
							fontSize: "12px",
							color: "var(--ok-fg, #10b981)",
							fontWeight: 600,
							display: "inline-flex",
							alignItems: "center",
							gap: "4px",
						}}
					>
						<ShieldCheck size={14} /> Согласовано пациентом
					</span>
				</div>
			</div>

			{/* Таблица услуг по 804н */}
			<div
				data-testid="demo-estimate-table"
				style={{
					background: "var(--paper-strong, #ffffff)",
					border: "1px solid var(--line, #e2e8f0)",
					borderRadius: "8px",
					overflowX: "auto",
				}}
			>
				<table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
					<thead>
						<tr
							style={{
								borderBottom: "1px solid var(--line, #e2e8f0)",
								background: "var(--paper, #f8fafc)",
								textAlign: "left",
								color: "var(--muted, #64748b)",
							}}
						>
							<th style={{ padding: "8px 10px" }}>Код 804н</th>
							<th style={{ padding: "8px 10px" }}>Наименование услуги</th>
							<th style={{ padding: "8px 10px" }}>Зуб</th>
							<th style={{ padding: "8px 10px", textAlign: "center" }}>Кол-во</th>
							<th style={{ padding: "8px 10px", textAlign: "right" }}>Цена</th>
							<th style={{ padding: "8px 10px", textAlign: "right" }}>Скидка</th>
							<th style={{ padding: "8px 10px", textAlign: "right" }}>Сумма</th>
						</tr>
					</thead>
					<tbody>
						{items.map((item) => (
							<tr
								key={item.code}
								style={{
									borderBottom: "1px solid var(--line, #e2e8f0)",
								}}
							>
								<td
									style={{
										padding: "8px 10px",
										fontFamily: "monospace",
										fontSize: "11px",
										color: "var(--brand-accent, #6366f1)",
									}}
								>
									{item.code}
								</td>
								<td style={{ padding: "8px 10px", fontWeight: 500 }}>
									{item.name}
								</td>
								<td style={{ padding: "8px 10px", color: "var(--muted, #64748b)" }}>
									{item.toothNumber ? String(item.toothNumber) : "—"}
								</td>
								<td style={{ padding: "8px 10px", textAlign: "center" }}>
									{item.quantity}
								</td>
								<td style={{ padding: "8px 10px", textAlign: "right" }}>
									{item.unitPriceRub.toLocaleString("ru-RU")} ₽
								</td>
								<td
									style={{
										padding: "8px 10px",
										textAlign: "right",
										color: item.discountRub > 0 ? "var(--ok-fg, #10b981)" : "var(--muted, #64748b)",
									}}
								>
									{item.discountRub > 0 ? `-${item.discountRub.toLocaleString("ru-RU")} ₽` : "0 ₽"}
								</td>
								<td
									style={{
										padding: "8px 10px",
										textAlign: "right",
										fontWeight: 700,
										color: "var(--ink, #0f172a)",
									}}
								>
									{item.totalRub.toLocaleString("ru-RU")} ₽
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			{/* Карточки финансового баланса */}
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(3, 1fr)",
					gap: "10px",
				}}
			>
				<div
					style={{
						padding: "10px",
						borderRadius: "8px",
						background: "var(--paper-strong, #ffffff)",
						border: "1px solid var(--line, #e2e8f0)",
					}}
				>
					<div style={{ fontSize: "11px", color: "var(--muted, #64748b)" }}>
						Сумма по прейскуранту
					</div>
					<div style={{ fontSize: "15px", fontWeight: 700, marginTop: "2px" }}>
						{totalGrossRub.toLocaleString("ru-RU")} ₽
					</div>
				</div>

				<div
					style={{
						padding: "10px",
						borderRadius: "8px",
						background: "var(--paper-strong, #ffffff)",
						border: "1px solid var(--line, #e2e8f0)",
					}}
				>
					<div style={{ fontSize: "11px", color: "var(--ok-fg, #10b981)", display: "flex", alignItems: "center", gap: "4px" }}>
						<TrendingDown size={13} /> Экономия пациента
					</div>
					<div style={{ fontSize: "15px", fontWeight: 700, color: "var(--ok-fg, #10b981)", marginTop: "2px" }}>
						{(patientSavingsRub || totalDiscountRub).toLocaleString("ru-RU")} ₽
					</div>
				</div>

				<div
					style={{
						padding: "10px",
						borderRadius: "8px",
						background: "rgba(13, 148, 136, 0.08)",
						border: "1px solid var(--teal, #0d9488)",
					}}
				>
					<div style={{ fontSize: "11px", color: "var(--teal, #0d9488)", fontWeight: 600 }}>
						Итого к оплате
					</div>
					<div style={{ fontSize: "16px", fontWeight: 800, color: "var(--teal, #0d9488)", marginTop: "2px" }}>
						{totalNetRub.toLocaleString("ru-RU")} ₽
					</div>
				</div>
			</div>

			{/* Интерактивные действия сметы: СБП, Рассрочка, Чек */}
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					paddingTop: "4px",
					flexWrap: "wrap",
					gap: "8px",
				}}
			>
				<div style={{ display: "flex", gap: "8px" }}>
					<button
						type="button"
						onClick={handlePaySbp}
						disabled={paidViaSbp}
						style={{
							padding: "6px 12px",
							borderRadius: "6px",
							fontSize: "12px",
							fontWeight: 600,
							border: "none",
							background: paidViaSbp ? "var(--ok-fg, #10b981)" : "var(--teal, #0d9488)",
							color: "#ffffff",
							cursor: "pointer",
							display: "inline-flex",
							alignItems: "center",
							gap: "6px",
							transition: "background 0.15s ease",
						}}
					>
						<QrCode size={14} />
						{paidViaSbp ? "Оплачено по СБП ✓" : "Симулировать оплату через СБП"}
					</button>

					<button
						type="button"
						onClick={handleInstallment}
						style={{
							padding: "6px 12px",
							borderRadius: "6px",
							fontSize: "12px",
							fontWeight: 600,
							border: "1px solid var(--line, #e2e8f0)",
							background: "var(--paper-strong, #ffffff)",
							color: "var(--ink, #0f172a)",
							cursor: "pointer",
							display: "inline-flex",
							alignItems: "center",
							gap: "6px",
						}}
					>
						<CreditCard size={14} />
						Рассрочка 0-0-12
					</button>
				</div>

				<div style={{ fontSize: "11px", color: "var(--muted, #64748b)" }}>
					Соответствие 54-ФЗ и фискализация чека в 1 клик
				</div>
			</div>
		</div>
	);
};
