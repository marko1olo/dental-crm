import React, { useEffect, useState } from "react";
import "./DoctorPayoutDashboard.css";
import { denteAdminSecretRequestHeaders } from "../AppHelpers.js";

interface Payout {
	id: string;
	doctorName: string;
	revenue: number;
	materialCost: number;
	commissionRate: number;
	netPayout: number;
	date: string;
}

export function DoctorPayoutDashboard() {
	const [payouts, setPayouts] = useState<Payout[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		setIsLoading(true);
		fetch("/api/billing/payouts", { headers: denteAdminSecretRequestHeaders() })
			.then((res) => {
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				return res.json();
			})
			.then((data) => {
				if (Array.isArray(data.payouts)) {
					const mapped: Payout[] = data.payouts.map((item: any) => ({
						id: item.id,
						doctorName: item.doctorName ?? "Врач",
						revenue: Number(item.revenue ?? 0),
						materialCost: Number(item.materialCost ?? 0),
						commissionRate: Number(item.commissionRate ?? 0),
						netPayout: Number(item.netPayout ?? 0),
						date: item.date ?? new Date().toISOString().split("T")[0],
					}));
					setPayouts(mapped);
				} else {
					setPayouts([]);
				}
			})
			.catch((e) => {
				setError(e.message);
			})
			.finally(() => setIsLoading(false));
	}, []);

	const fmt = (n: number) =>
		n.toLocaleString("ru-RU", { maximumFractionDigits: 2 });

	if (isLoading)
		return (
			<div className="payout-dashboard">
				<p style={{ padding: 20, color: "var(--muted)" }}>Загрузка выплат врачам...</p>
			</div>
		);
	if (error)
		return (
			<div className="payout-dashboard">
				<p style={{ padding: 20, color: "var(--danger, #ef4444)" }}>
					Ошибка загрузки выплат: {error}
				</p>
			</div>
		);

	return (
		<div className="payout-dashboard p-4 rounded-xl border my-4 shadow-sm" style={{ background: "var(--paper)", color: "var(--ink)", borderColor: "var(--line)" }}>
			<header className="payout-header mb-3 pb-2 border-b" style={{ borderColor: "var(--line)" }}>
				<h2 className="text-lg font-bold text-sky-600 dark:text-sky-400">Выплаты врачам и расчет заработной платы</h2>
			</header>
			<div className="payout-table-wrapper overflow-x-auto">
				<table className="payout-table w-full text-xs">
					<thead>
						<tr className="border-b text-left" style={{ borderColor: "var(--line)", color: "var(--muted)" }}>
							<th className="p-2">Дата</th>
							<th className="p-2">ФИО Врача</th>
							<th className="p-2">Выручка</th>
							<th className="p-2">Материалы</th>
							<th className="p-2">Ставка (%)</th>
							<th className="p-2">К выплате</th>
						</tr>
					</thead>
					<tbody>
						{payouts.length === 0 ? (
							<tr>
								<td colSpan={6} className="p-4 text-center" style={{ color: "var(--muted)" }}>
									Записи выплат врачам за выбранный период отсутствуют.
								</td>
							</tr>
						) : (
							payouts.map((p) => (
								<tr key={p.id} className="border-b" style={{ borderColor: "var(--line)" }}>
									<td className="p-2 font-mono">{p.date}</td>
									<td className="p-2 font-bold">{p.doctorName}</td>
									<td className="p-2 font-mono">{fmt(p.revenue)} ₽</td>
									<td className="p-2 font-mono">{fmt(p.materialCost)} ₽</td>
									<td className="p-2 font-mono">{p.commissionRate}%</td>
									<td className="p-2 font-mono font-bold text-emerald-600 dark:text-emerald-400">{fmt(p.netPayout)} ₽</td>
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
}
