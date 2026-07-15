import React, { useEffect, useState } from "react";
import "./FinancialDashboard.css";
import { denteAdminSecretRequestHeaders } from "../AppHelpers.js";
import { useBillingStore } from "../stores/useBillingStore.js";
import { DoctorPayoutDashboard } from "./DoctorPayoutDashboard.js";
import { InvoiceSplitPaymentModal } from "./InvoiceSplitPaymentModal.js";
import { ThermalReceiptSimulator } from "./ThermalReceiptSimulator.js";

export interface FinancialMetrics {
	averageInvoice: number;
	conversionRate: number; // percentage
	revenueByDepartment: {
		therapy: number;
		orthopedics: number;
		surgery: number;
	};
	totalRevenue: number;
	totalLabCosts: number;
	totalDebts: number;
}

export function FinancialDashboard({ metrics }: { metrics: FinancialMetrics }) {
	const margin = metrics.totalRevenue - metrics.totalLabCosts;
	const marginPercentage =
		metrics.totalRevenue > 0
			? ((margin / metrics.totalRevenue) * 100).toFixed(1)
			: "0.0";

	const [showModal, setShowModal] = useState(false);
	const [invoices, setInvoices] = useState<any[]>([]);
	const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

	const { receiptBuffer, setReceiptBuffer, purgeState } = useBillingStore();

	// OOM safety cleanup
	useEffect(() => {
		return () => {
			purgeState();
		};
	}, [purgeState]);

	useEffect(() => {
		fetch("/api/billing/payouts", { headers: denteAdminSecretRequestHeaders() })
			.then((r) => (r.ok ? r.json() : { payouts: [] }))
			.then((d) => {
				setInvoices(
					Array.isArray(d.payouts)
						? d.payouts.filter((i: any) => i.status !== "paid")
						: [],
				);
			})
			.catch(() => setInvoices([]));
	}, []);

	const handlePaymentSuccess = (splits: any[]) => {
		setShowModal(false);
		// Show real receipt
		setReceiptBuffer({
			clinicName: "DENTE Premium Clinic",
			doctorName: "Кассовый аппарат",
			items: [
				{
					name: "Медицинские услуги",
					tooth: "",
					price: selectedInvoice?.totalAmountRub || 15000,
				},
			],
			splits,
			total: Number(selectedInvoice?.totalAmountRub || 15000),
			date: new Date().toLocaleString("ru-RU"),
		});
		setSelectedInvoice(null);
	};

	const handlePayClick = (inv: any) => {
		setSelectedInvoice(inv);
		setShowModal(true);
	};

	return (
		<div className="financial-dashboard" aria-label="Financial Dashboard">
			<header
				className="financial-header"
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
				}}
			>
				<h2>Финансовый Дашборд</h2>
			</header>

			<div className="metrics-grid">
				<article className="metric-card">
					<h3>Средний чек</h3>
					<p className="metric-value">
						{metrics.averageInvoice.toLocaleString("ru-RU")} ₽
					</p>
				</article>

				<article className="metric-card">
					<h3>Конверсия</h3>
					<p className="metric-value">{metrics.conversionRate.toFixed(1)}%</p>
				</article>

				<article className="metric-card highlight">
					<h3>Чистая прибыль</h3>
					<p className="metric-value">{margin.toLocaleString("ru-RU")} ₽</p>
				</article>

				<article className="metric-card danger">
					<h3>Дебиторская задолженность</h3>
					<p className="metric-value">
						{metrics.totalDebts.toLocaleString("ru-RU")} ₽
					</p>
				</article>
			</div>

			<div style={{ marginTop: "30px", marginBottom: "20px" }}>
				<h3>Неоплаченные счета</h3>
				{invoices.length === 0 ? (
					<p style={{ color: "#888" }}>Нет неоплаченных счетов.</p>
				) : (
					<div style={{ display: "flex", gap: "15px", flexWrap: "wrap" }}>
						{invoices.map((inv) => (
							<div
								key={inv.id}
								style={{
									background: "var(--bg-card)",
									padding: "15px",
									borderRadius: "8px",
									border: "1px solid var(--border)",
								}}
							>
								<p>
									<strong>Пациент:</strong> {inv.patientName || "Неизвестно"}
								</p>
								<p>
									<strong>Сумма:</strong> {inv.totalAmountRub} ₽
								</p>
								<button
									style={{
										marginTop: "10px",
										padding: "8px 16px",
										background: "var(--accent)",
										color: "#fff",
										border: "none",
										borderRadius: "4px",
										cursor: "pointer",
									}}
									onClick={() => handlePayClick(inv)}
								>
									Оплатить
								</button>
							</div>
						))}
					</div>
				)}
			</div>

			<DoctorPayoutDashboard />

			{showModal && selectedInvoice && (
				<InvoiceSplitPaymentModal
					invoiceId={selectedInvoice.id}
					patientId={selectedInvoice.patientId}
					totalAmount={Number(selectedInvoice.totalAmountRub)}
					onClose={() => setShowModal(false)}
					onSuccess={handlePaymentSuccess}
				/>
			)}

			{receiptBuffer && (
				<ThermalReceiptSimulator
					receiptData={receiptBuffer}
					onClose={() => setReceiptBuffer(null)}
				/>
			)}
		</div>
	);
}
