import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAppLogicContext } from "./contexts/AppLogicContext";
import { AppLoadingState } from "./AppBootState";
import { Banknote, ReceiptText, Users, Percent, Stethoscope, Search } from "lucide-react";

type Payout = {
	id: string;
	visitId: string;
	doctorId: string | null;
	doctorName: string;
	revenue: number;
	materialCost: number;
	commissionRate: number;
	netPayout: number;
	date: string;
};

type DoctorSummary = {
	doctorId: string | null;
	doctorName: string;
	totalRevenue: number;
	totalMaterialCost: number;
	totalNetPayout: number;
	commissionRate: number;
	payoutCount: number;
};

export function PayrollView() {
	const [payouts, setPayouts] = useState<Payout[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState("");
	const { auth } = useAppLogicContext();
	const organizationId = auth.currentOrganizationId();

	useEffect(() => {
		if (organizationId) {
			fetchPayouts();
		}
	}, [organizationId]);

	const fetchPayouts = async () => {
		try {
			setIsLoading(true);
			const res = await fetch("/api/billing/payouts", {
				headers: auth.denteClinicalReadHeaders(),
			});
			if (res.ok) {
				const data = await res.json();
				setPayouts(data.payouts || []);
			} else {
				console.error("Failed to fetch payouts");
			}
		} catch (e) {
			console.error("Error fetching payouts:", e);
		} finally {
			setIsLoading(false);
		}
	};

	if (isLoading) {
		return <AppLoadingState message="Сбор финансовых данных" />;
	}

	// Calculate overall totals
	const totalRevenue = payouts.reduce((sum, p) => sum + p.revenue, 0);
	const totalMaterialCost = payouts.reduce((sum, p) => sum + p.materialCost, 0);
	const totalPayroll = payouts.reduce((sum, p) => sum + p.netPayout, 0);

	// Group by doctor
	const groupedByDoctor = payouts.reduce((acc, p) => {
		const key = p.doctorId || "unknown";
		if (!acc[key]) {
			acc[key] = {
				doctorId: p.doctorId,
				doctorName: p.doctorName,
				totalRevenue: 0,
				totalMaterialCost: 0,
				totalNetPayout: 0,
				commissionRate: p.commissionRate,
				payoutCount: 0,
			};
		}
		acc[key].totalRevenue += p.revenue;
		acc[key].totalMaterialCost += p.materialCost;
		acc[key].totalNetPayout += p.netPayout;
		acc[key].payoutCount += 1;
		return acc;
	}, {} as Record<string, DoctorSummary>);

	const doctorsList = Object.values(groupedByDoctor).filter(d => 
		d.doctorName.toLowerCase().includes(searchQuery.toLowerCase())
	);

	return (
		<motion.div
			className="panel glass-panel"
			initial={{ opacity: 0, y: 15 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.4 }}
		>
			<div className="panel-heading">
				<div>
					<h2>Зарплаты и комиссии</h2>
					<p className="finance-scope-label">Расчет заработной платы врачей</p>
				</div>
			</div>

			<div className="finance-summary-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "2rem" }}>
				<div className="finance-metric-card" style={{ background: "rgba(255,255,255,0.03)", padding: "1.25rem", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.05)" }}>
					<div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--foreground-muted)", marginBottom: "0.5rem" }}>
						<Banknote size={16} />
						<span style={{ fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Общая выручка</span>
					</div>
					<div style={{ fontSize: "1.75rem", fontWeight: 600, color: "var(--color-primary-text)" }}>
						{totalRevenue.toLocaleString("ru-RU")} ₽
					</div>
				</div>

				<div className="finance-metric-card" style={{ background: "rgba(255,255,255,0.03)", padding: "1.25rem", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.05)" }}>
					<div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--foreground-muted)", marginBottom: "0.5rem" }}>
						<ReceiptText size={16} />
						<span style={{ fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Себестоимость</span>
					</div>
					<div style={{ fontSize: "1.75rem", fontWeight: 600, color: "var(--color-danger)" }}>
						-{totalMaterialCost.toLocaleString("ru-RU")} ₽
					</div>
				</div>

				<div className="finance-metric-card" style={{ background: "rgba(255,255,255,0.03)", padding: "1.25rem", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.05)" }}>
					<div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--foreground-muted)", marginBottom: "0.5rem" }}>
						<Users size={16} />
						<span style={{ fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Фонд оплаты труда</span>
					</div>
					<div style={{ fontSize: "1.75rem", fontWeight: 600, color: "var(--color-success)" }}>
						{totalPayroll.toLocaleString("ru-RU")} ₽
					</div>
				</div>
			</div>

			<div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
				<Search size={18} color="var(--foreground-muted)" />
				<input 
					type="text" 
					className="input-field" 
					placeholder="Поиск по имени врача..." 
					value={searchQuery}
					onChange={e => setSearchQuery(e.target.value)}
					style={{ maxWidth: "300px" }}
				/>
			</div>

			<div className="custom-table-container">
				<table className="custom-table">
					<thead>
						<tr>
							<th>Врач</th>
							<th style={{ textAlign: "right" }}>Приемов</th>
							<th style={{ textAlign: "right" }}>Выручка</th>
							<th style={{ textAlign: "right" }}>Фактические материалы</th>
							<th style={{ textAlign: "center" }}>Ставка</th>
							<th style={{ textAlign: "right" }}>К выплате</th>
						</tr>
					</thead>
					<tbody>
						{doctorsList.length === 0 ? (
							<tr>
								<td colSpan={6} style={{ textAlign: "center", padding: "2rem", color: "var(--foreground-muted)" }}>
									Данных для расчета не найдено
								</td>
							</tr>
						) : (
							doctorsList.map(doctor => (
								<tr key={doctor.doctorId || "unknown"}>
									<td>
										<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
											<Stethoscope size={16} color="var(--color-primary)" />
											<span style={{ fontWeight: 500 }}>{doctor.doctorName}</span>
										</div>
									</td>
									<td style={{ textAlign: "right", color: "var(--foreground-muted)" }}>
										{doctor.payoutCount}
									</td>
									<td style={{ textAlign: "right", fontWeight: 500 }}>
										{doctor.totalRevenue.toLocaleString("ru-RU")} ₽
									</td>
									<td style={{ textAlign: "right", color: "var(--color-danger)" }}>
										-{doctor.totalMaterialCost.toLocaleString("ru-RU")} ₽
									</td>
									<td style={{ textAlign: "center" }}>
										<div style={{ 
											display: "inline-flex", 
											alignItems: "center", 
											gap: "0.25rem", 
											background: "rgba(var(--color-primary-rgb), 0.1)", 
											color: "var(--color-primary)",
											padding: "0.25rem 0.5rem",
											borderRadius: "4px",
											fontSize: "0.85rem",
											fontWeight: 600
										}}>
											{doctor.commissionRate}%
										</div>
									</td>
									<td style={{ textAlign: "right", fontWeight: 700, color: "var(--color-success)", fontSize: "1.1rem" }}>
										{doctor.totalNetPayout.toLocaleString("ru-RU")} ₽
									</td>
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>
			
			<div style={{ marginTop: "1.5rem", padding: "1rem", background: "rgba(0,0,0,0.2)", borderRadius: "8px", fontSize: "0.85rem", color: "var(--foreground-muted)", lineHeight: 1.5 }}>
				<strong>Справка по расчетам:</strong><br />
				Заработная плата рассчитывается от чистой выручки после вычета себестоимости материалов. <br />
				Формула: <code>(Выручка - Материалы) × Процент комиссии</code>. <br />
				Базовая стоимость материалов (по умолчанию 15%) автоматически вычитается до начисления комиссии врачу, защищая маржинальность клиники.
			</div>
		</motion.div>
	);
}
