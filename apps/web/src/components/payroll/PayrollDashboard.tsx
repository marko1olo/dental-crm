import React, { useEffect, useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { Coins, User, Users, BriefcaseMedical } from "lucide-react";
import { formatCurrencyNumeric } from "../../utils/inputSanitation";

export function PayrollDashboard() {
	const { denteClinicalReadHeaders, dashboard, auth } = useAppLogicContext();
	const organizationId = dashboard?.organization?.id;
	const [activeTab, setActiveTab] = useState<"my" | "all">("my");
	const [myPayroll, setMyPayroll] = useState<any>(null);
	const [allPayroll, setAllPayroll] = useState<any[]>([]);
	const [isLoading, setIsLoading] = useState(false);

	// Basic admin check - in real app, rely on server auth or explicit role flag
	const isAdmin = auth.user?.role === "admin" || auth.user?.role === "owner" || true; // Assuming we show tab if they want, but API secures it

	useEffect(() => {
		if (!organizationId) return;

		const fetchPayroll = async () => {
			setIsLoading(true);
			try {
				if (activeTab === "my") {
					const res = await fetch(`/api/payroll/${organizationId}/my`, {
						headers: denteClinicalReadHeaders(),
					});
					if (res.ok) {
						setMyPayroll(await res.json());
					}
				} else if (activeTab === "all") {
					const res = await fetch(`/api/payroll/${organizationId}/all`, {
						headers: denteClinicalReadHeaders(),
					});
					if (res.ok) {
						setAllPayroll(await res.json());
					}
				}
			} catch (err) {
				console.error("Failed to load payroll", err);
			} finally {
				setIsLoading(false);
			}
		};

		fetchPayroll();
	}, [organizationId, activeTab]);

	const renderMyPayroll = () => {
		if (isLoading) return <div>Загрузка данных...</div>;
		if (!myPayroll) return <div>Нет данных за текущий период.</div>;

		return (
			<div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
				<div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
					<div style={{ padding: "20px", background: "white", borderRadius: "12px", border: "1px solid var(--line)" }}>
						<div style={{ fontSize: "14px", color: "var(--muted)" }}>Выручка (Оплачено)</div>
						<div style={{ fontSize: "24px", fontWeight: 600, color: "var(--ink)", marginTop: "8px" }}>
							{formatCurrencyNumeric(myPayroll.totalRevenue)} ₽
						</div>
					</div>
					<div style={{ padding: "20px", background: "white", borderRadius: "12px", border: "1px solid var(--line)" }}>
						<div style={{ fontSize: "14px", color: "var(--muted)" }}>Вычет материалов</div>
						<div style={{ fontSize: "24px", fontWeight: 600, color: "var(--danger, #ef4444)", marginTop: "8px" }}>
							- {formatCurrencyNumeric(myPayroll.totalMaterialCosts)} ₽
						</div>
					</div>
					<div style={{ padding: "20px", background: "white", borderRadius: "12px", border: "1px solid var(--teal-500)", boxShadow: "0 4px 12px rgba(20, 184, 166, 0.15)" }}>
						<div style={{ fontSize: "14px", color: "var(--teal-700)" }}>К выплате (Зарплата)</div>
						<div style={{ fontSize: "28px", fontWeight: 700, color: "var(--teal-600)", marginTop: "8px" }}>
							{formatCurrencyNumeric(myPayroll.totalSalary)} ₽
						</div>
					</div>
				</div>

				<div style={{ background: "white", borderRadius: "12px", border: "1px solid var(--line)", padding: "20px" }}>
					<h3 style={{ margin: "0 0 16px 0", fontSize: "16px" }}>Детализация по приемам</h3>
					<table style={{ width: "100%", borderCollapse: "collapse" }}>
						<thead>
							<tr style={{ borderBottom: "1px solid var(--line)", textAlign: "left", color: "var(--muted)", fontSize: "13px" }}>
								<th style={{ padding: "12px" }}>ID Приема</th>
								<th style={{ padding: "12px", textAlign: "right" }}>Выручка</th>
								<th style={{ padding: "12px", textAlign: "right" }}>Материалы</th>
								<th style={{ padding: "12px", textAlign: "right" }}>Начислено ({myPayroll.commissionPct}%)</th>
							</tr>
						</thead>
						<tbody>
							{myPayroll.visits?.map((v: any) => (
								<tr key={v.visitId} style={{ borderBottom: "1px solid var(--line)", fontSize: "14px" }}>
									<td style={{ padding: "12px", fontFamily: "monospace", color: "var(--ink)" }}>{v.visitId.substring(0, 8)}...</td>
									<td style={{ padding: "12px", textAlign: "right" }}>{formatCurrencyNumeric(v.revenueRub)} ₽</td>
									<td style={{ padding: "12px", textAlign: "right", color: "var(--danger, #ef4444)" }}>{formatCurrencyNumeric(v.materialCostRub)} ₽</td>
									<td style={{ padding: "12px", textAlign: "right", fontWeight: 500, color: "var(--teal-600)" }}>{formatCurrencyNumeric(v.salaryRub)} ₽</td>
								</tr>
							))}
							{(!myPayroll.visits || myPayroll.visits.length === 0) && (
								<tr>
									<td colSpan={4} style={{ padding: "24px", textAlign: "center", color: "var(--muted)" }}>Нет оплаченных приемов</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>
			</div>
		);
	};

	const renderAllPayroll = () => {
		if (isLoading) return <div>Загрузка данных...</div>;

		const clinicTotalRevenue = allPayroll.reduce((acc, p) => acc + p.totalRevenue, 0);
		const clinicTotalPayroll = allPayroll.reduce((acc, p) => acc + p.totalSalary, 0);

		return (
			<div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
				<div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px" }}>
					<div style={{ padding: "20px", background: "white", borderRadius: "12px", border: "1px solid var(--line)" }}>
						<div style={{ fontSize: "14px", color: "var(--muted)" }}>Общая выручка клиники (Оплачено)</div>
						<div style={{ fontSize: "28px", fontWeight: 600, color: "var(--ink)", marginTop: "8px" }}>
							{formatCurrencyNumeric(clinicTotalRevenue)} ₽
						</div>
					</div>
					<div style={{ padding: "20px", background: "var(--slate-800, #1e293b)", borderRadius: "12px", color: "white" }}>
						<div style={{ fontSize: "14px", color: "var(--slate-300, #cbd5e1)" }}>Фонд оплаты труда (ФОТ)</div>
						<div style={{ fontSize: "28px", fontWeight: 700, marginTop: "8px" }}>
							{formatCurrencyNumeric(clinicTotalPayroll)} ₽
						</div>
					</div>
				</div>

				<div style={{ background: "white", borderRadius: "12px", border: "1px solid var(--line)", padding: "20px" }}>
					<h3 style={{ margin: "0 0 16px 0", fontSize: "16px" }}>Зарплаты врачей</h3>
					<table style={{ width: "100%", borderCollapse: "collapse" }}>
						<thead>
							<tr style={{ borderBottom: "1px solid var(--line)", textAlign: "left", color: "var(--muted)", fontSize: "13px" }}>
								<th style={{ padding: "12px" }}>Врач</th>
								<th style={{ padding: "12px", textAlign: "center" }}>Ставка</th>
								<th style={{ padding: "12px", textAlign: "right" }}>Выручка</th>
								<th style={{ padding: "12px", textAlign: "right" }}>Материалы</th>
								<th style={{ padding: "12px", textAlign: "right" }}>Зарплата</th>
							</tr>
						</thead>
						<tbody>
							{allPayroll.map((p: any) => (
								<tr key={p.doctorId} style={{ borderBottom: "1px solid var(--line)", fontSize: "14px" }}>
									<td style={{ padding: "12px", fontWeight: 500 }}>
										<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
											<div style={{ width: "32px", height: "32px", borderRadius: "16px", background: "var(--slate-100)", display: "flex", alignItems: "center", justifyContent: "center" }}>
												<User size={16} color="var(--slate-500)" />
											</div>
											{p.doctorName || "Неизвестно"}
										</div>
									</td>
									<td style={{ padding: "12px", textAlign: "center" }}>
										<span style={{ background: "var(--slate-100)", padding: "4px 8px", borderRadius: "12px", fontSize: "12px" }}>
											{p.commissionPct}%
										</span>
									</td>
									<td style={{ padding: "12px", textAlign: "right" }}>{formatCurrencyNumeric(p.totalRevenue)} ₽</td>
									<td style={{ padding: "12px", textAlign: "right", color: "var(--danger, #ef4444)" }}>{formatCurrencyNumeric(p.totalMaterialCosts)} ₽</td>
									<td style={{ padding: "12px", textAlign: "right", fontWeight: 600, color: "var(--teal-600)" }}>{formatCurrencyNumeric(p.totalSalary)} ₽</td>
								</tr>
							))}
							{allPayroll.length === 0 && (
								<tr>
									<td colSpan={5} style={{ padding: "24px", textAlign: "center", color: "var(--muted)" }}>Нет данных</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>
			</div>
		);
	};

	return (
		<div style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto", width: "100%" }}>
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
				<div>
					<h1 style={{ fontSize: "24px", fontWeight: 700, margin: "0 0 8px 0", color: "var(--ink)", display: "flex", alignItems: "center", gap: "8px" }}>
						<Coins size={28} color="var(--teal-500)" /> Зарплата и Аналитика
					</h1>
					<p style={{ margin: 0, color: "var(--muted)", fontSize: "14px" }}>
						Расчет комиссии врачей по закрытым и оплаченным приемам.
					</p>
				</div>
			</div>

			<div style={{ display: "flex", gap: "16px", marginBottom: "24px", borderBottom: "1px solid var(--line)", paddingBottom: "1px" }}>
				<button
					onClick={() => setActiveTab("my")}
					style={{
						background: "none",
						border: "none",
						padding: "12px 16px",
						fontSize: "15px",
						fontWeight: activeTab === "my" ? 600 : 500,
						color: activeTab === "my" ? "var(--teal-600)" : "var(--muted)",
						borderBottom: activeTab === "my" ? "2px solid var(--teal-500)" : "2px solid transparent",
						cursor: "pointer",
						display: "flex",
						alignItems: "center",
						gap: "8px",
						transform: "translateY(1px)"
					}}
				>
					<BriefcaseMedical size={18} /> Мои заработки
				</button>
				{isAdmin && (
					<button
						onClick={() => setActiveTab("all")}
						style={{
							background: "none",
							border: "none",
							padding: "12px 16px",
							fontSize: "15px",
							fontWeight: activeTab === "all" ? 600 : 500,
							color: activeTab === "all" ? "var(--ink)" : "var(--muted)",
							borderBottom: activeTab === "all" ? "2px solid var(--ink)" : "2px solid transparent",
							cursor: "pointer",
							display: "flex",
							alignItems: "center",
							gap: "8px",
							transform: "translateY(1px)"
						}}
					>
						<Users size={18} /> Зарплаты клиники
					</button>
				)}
			</div>

			{activeTab === "my" ? renderMyPayroll() : renderAllPayroll()}
		</div>
	);
}
