import React from "react";
import type {
	DmsBillableItem,
	DmsSplitLineResult,
	PatientPaymentMethod,
} from "@dental/shared";

export interface DmsSplitBillingTabProps {
	readonly availableInsurers: ReadonlyArray<{ id: string; shortNameRu: string }>;
	readonly selectedInsurerId: string;
	readonly onSelectInsurerId: (id: string) => void;
	readonly letterRemainingLimitRub: number | null;
	readonly franchisePercent: number;
	readonly onSelectFranchisePercent: (pct: number) => void;
	readonly effectiveBillItems: readonly DmsBillableItem[];
	readonly lineItems: readonly DmsSplitLineResult[];
	readonly totalDmsCoveredRub: number;
	readonly totalPatientCoPayRub: number;
	readonly paymentMethod: PatientPaymentMethod;
	readonly onSelectPaymentMethod: (method: PatientPaymentMethod) => void;
	readonly mixedCashRubInput: string;
	readonly onChangeMixedCashRubInput: (val: string) => void;
	readonly mixedCardRub: number;
	readonly patientDueRub: number;
	readonly selectedInsurerTitle: string;
	readonly formatDisplayRub: (rub: number) => string;
}

export const DmsSplitBillingTab: React.FC<DmsSplitBillingTabProps> = ({
	availableInsurers,
	selectedInsurerId,
	onSelectInsurerId,
	letterRemainingLimitRub,
	franchisePercent,
	onSelectFranchisePercent,
	effectiveBillItems,
	lineItems,
	totalDmsCoveredRub,
	totalPatientCoPayRub,
	paymentMethod,
	onSelectPaymentMethod,
	mixedCashRubInput,
	onChangeMixedCashRubInput,
	mixedCardRub,
	patientDueRub,
	selectedInsurerTitle,
	formatDisplayRub,
}) => {
	return (
		<>
			{/* Top Insurers Bar */}
			<div className="dms-chips-bar">
				<span className="dms-chips-label">Страховые компании:</span>
				{availableInsurers.map((ins) => (
					<button
						key={ins.id}
						type="button"
						onClick={() => onSelectInsurerId(ins.id)}
						className={`dms-chip-btn ${selectedInsurerId === ins.id ? "dms-chip-btn-active" : ""}`}
					>
						{ins.shortNameRu}
					</button>
				))}
			</div>

			{/* Franchise and Letter Limit bar */}
			<div className="dms-limit-franchise-bar">
				<div>
					<div className="dms-limit-title">Остаток гарантийного письма</div>
					<div className="dms-limit-value">
						{letterRemainingLimitRub !== null
							? formatDisplayRub(letterRemainingLimitRub)
							: "Не ограничен"}
					</div>
				</div>
				<div className="dms-franchise-controls">
					<span className="dms-franchise-label">Франшиза полиса:</span>
					{[0, 10, 20, 30, 50].map((pct) => (
						<button
							key={pct}
							type="button"
							onClick={() => onSelectFranchisePercent(pct)}
							className={`dms-franchise-btn ${franchisePercent === pct ? "dms-franchise-btn-active" : ""}`}
						>
							{pct}%
						</button>
					))}
				</div>
			</div>

			{effectiveBillItems.length === 0 && (
				<div
					data-testid="dms-empty-bill-items"
					style={{
						padding: "10px 14px",
						borderRadius: "10px",
						background: "var(--paper-soft, #f8fafc)",
						color: "var(--muted, #64748b)",
						fontSize: "13px",
						textAlign: "center",
					}}
				>
					Нет позиций для распределения счёта
				</div>
			)}

			{/* Bill Items Breakdown Table */}
			<div className="dms-table-container">
				<table className="dms-table">
					<thead>
						<tr>
							<th>Услуга</th>
							<th style={{ width: "60px" }}>Зуб</th>
							<th style={{ width: "70px" }}>Кол-во</th>
							<th style={{ textAlign: "right", width: "100px" }}>Всего</th>
							<th
								style={{
									textAlign: "right",
									width: "110px",
									color: "var(--dms-teal)",
								}}
							>
								Страховая
							</th>
							<th
								style={{
									textAlign: "right",
									width: "110px",
									color: "var(--dms-amber-ink)",
								}}
							>
								Пациент
							</th>
						</tr>
					</thead>
					<tbody>
						{lineItems.length === 0 ? (
							<tr>
								<td
									colSpan={6}
									style={{
										padding: "20px",
										textAlign: "center",
										color: "var(--muted, #64748b)",
									}}
								>
									Нет услуг в счёте текущего визита
								</td>
							</tr>
						) : (
							lineItems.map((item) => (
								<tr key={item.serviceId}>
									<td>
										<div
											style={{
												fontWeight: 600,
												color: "var(--ink, #0f172a)",
											}}
										>
											{item.serviceName}
										</div>
										<div
											style={{
												fontSize: "11px",
												color: "var(--muted, #64748b)",
											}}
										>
											{item.splitReason}
										</div>
									</td>
									<td style={{ color: "var(--muted, #64748b)" }}>
										{item.toothNumber || "—"}
									</td>
									<td>{item.quantity}</td>
									<td style={{ textAlign: "right", fontWeight: 600 }}>
										{formatDisplayRub(item.totalPriceRub)}
									</td>
									<td className="dms-col-dms">
										{formatDisplayRub(item.dmsCoveredRub)}
									</td>
									<td className="dms-col-patient">
										{formatDisplayRub(item.patientCoPayRub)}
									</td>
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>

			{/* Summary Totals & Payment Method (Sentence Case) */}
			<div className="dms-summary-grid">
				<div className="dms-summary-card dms-summary-card-dms">
					<div className="dms-summary-title-dms">Покрывается страховкой</div>
					<div className="dms-summary-amount-dms">
						{formatDisplayRub(totalDmsCoveredRub)}
					</div>
					<div
						style={{
							fontSize: "11px",
							color: "var(--muted, #64748b)",
							marginTop: "4px",
						}}
					>
						Безналичное перечисление от {selectedInsurerTitle}
					</div>
				</div>

				<div className="dms-summary-card dms-summary-card-patient">
					<div className="dms-summary-title-patient">Доплата пациента на кассе</div>
					<div className="dms-summary-amount-patient">
						{formatDisplayRub(totalPatientCoPayRub)}
					</div>
					<div className="dms-payment-method-selector">
						{(["card", "cash", "mixed"] as const).map((m) => (
							<button
								key={m}
								type="button"
								onClick={() => onSelectPaymentMethod(m)}
								className={`dms-payment-btn ${paymentMethod === m ? "dms-payment-btn-active" : ""}`}
							>
								{m === "card"
									? "Карта"
									: m === "cash"
										? "Наличные"
										: "Смешанная"}
							</button>
						))}
					</div>
					{paymentMethod === "mixed" && (
						<div className="dms-mixed-input-row">
							<span>Наличными (₽):</span>
							<input
								type="number"
								min={0}
								max={patientDueRub}
								value={mixedCashRubInput}
								onChange={(e) => onChangeMixedCashRubInput(e.target.value)}
								className="dms-mixed-input"
							/>
							<span style={{ color: "var(--muted, #64748b)" }}>
								Картой: {formatDisplayRub(mixedCardRub)}
							</span>
						</div>
					)}
				</div>
			</div>
		</>
	);
};

DmsSplitBillingTab.displayName = "DmsSplitBillingTab";
