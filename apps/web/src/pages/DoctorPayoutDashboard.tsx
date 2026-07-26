import React, { useEffect, useState } from "react";
import "./DoctorPayoutDashboard.css";
import { denteAdminSecretRequestHeaders } from "../AppHelpers.js";
import { EmptyState } from "../components/EmptyState.js";

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
			<div className="payout-dashboard p-6 text-center text-[var(--muted)] text-sm">
				Загрузка выплат врачам...
			</div>
		);
	if (error)
		return (
			<div className="payout-dashboard p-6 text-center text-[var(--danger,#e11d48)] text-sm font-semibold">
				Ошибка загрузки выплат: {error}
			</div>
		);

	return (
		<div className="payout-dashboard p-4 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] my-4 shadow-sm">
			<header className="payout-header mb-3 pb-2 border-b border-[var(--line)]">
				<h2 className="text-lg font-bold text-[var(--brand-600,#0e7490)]">Выплаты врачам и расчет заработной платы</h2>
			</header>
			<div className="payout-table-wrapper overflow-x-auto">
				<table className="payout-table w-full text-xs">
					<thead>
						<tr className="border-b border-[var(--line)] text-left text-[var(--muted)]">
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
								<td colSpan={6} className="p-4">
									<EmptyState 
										title="Записи отсутствуют" 
										description="Записи выплат врачам за выбранный период отсутствуют." 
										className="py-4"
									/>
								</td>
							</tr>
						) : (
							payouts.map((p) => (
								<tr key={p.id} className="border-b border-[var(--line)] hover:bg-[var(--paper-soft,#f8fafc)] transition-colors">
									<td className="p-2 font-mono">{p.date}</td>
									<td className="p-2 font-bold">{p.doctorName}</td>
									<td className="p-2 font-mono">{fmt(p.revenue)} ₽</td>
									<td className="p-2 font-mono">{fmt(p.materialCost)} ₽</td>
									<td className="p-2 font-mono">{p.commissionRate}%</td>
									<td className="p-2 font-mono font-bold text-[var(--emerald-600,#059669)]">{fmt(p.netPayout)} ₽</td>
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
}
