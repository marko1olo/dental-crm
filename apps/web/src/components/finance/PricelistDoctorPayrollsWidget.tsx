import React, { useEffect, useState } from "react";
import { auth } from "../../AppHelpers";

interface PricelistPayrollItem {
	id: string;
	organizationId: string;
	serviceCode: string;
	serviceName: string;
	priceRub: string;
	doctorPayrollPercent: string;
	doctorPayrollRub: string;
	clinicMarginRub: string;
	createdAt: string;
}

export const PricelistDoctorPayrollsWidget: React.FC = () => {
	const [payrolls, setPayrolls] = useState<PricelistPayrollItem[]>([]);
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		fetch("/api/finance/pricelist-doctor-payrolls", {
			headers: auth.denteClinicalReadHeaders(),
		})
			.then((res) => res.json())
			.then((data) => {
				setPayrolls(Array.isArray(data) ? data : []);
				setLoading(false);
			})
			.catch((err) => {
				console.error("[PricelistDoctorPayrollsWidget fetch error]:", err);
				setLoading(false);
			});
	}, []);

	return (
		<div
			data-testid="pricelist-doctor-payrolls-widget"
			className="p-4 rounded-xl border my-4 shadow-sm"
			style={{ background: "var(--paper, #ffffff)", color: "var(--ink, #0f172a)", borderColor: "var(--line, #e2e8f0)" }}
		>
			<div className="flex items-center justify-between mb-3 pb-2 border-b" style={{ borderColor: "var(--line, #e2e8f0)" }}>
				<div className="flex items-center space-x-2">
					<span className="text-xl">📊</span>
					<h3 className="font-semibold text-emerald-600 dark:text-emerald-400">
						Отображение Суммы Начислений Врачам в Прайс-листе
					</h3>
				</div>
				<span className="text-xs px-2 py-0.5 rounded border bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">
					Doctor Payroll Margin
				</span>
			</div>

			{loading ? (
				<div className="text-sm py-4" style={{ color: "var(--muted, #64748b)" }}>
					Загрузка расчета заработной платы прайс-листа...
				</div>
			) : payrolls.length === 0 ? (
				<div className="text-sm py-3 text-center" style={{ color: "var(--muted, #64748b)" }}>
					Расчеты начислений врачам пусты.
				</div>
			) : (
				<div className="space-y-3">
					{payrolls.map((item) => (
						<div
							key={item.id}
							className="p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2"
							style={{ background: "var(--surface-50, #f8fafc)", borderColor: "var(--line, #e2e8f0)" }}
						>
							<div>
								<div className="flex items-center space-x-2">
									<span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded border bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700">
										{item.serviceCode}
									</span>
									<span className="text-sm font-bold">{item.serviceName}</span>
								</div>
								<div className="text-xs mt-1" style={{ color: "var(--muted, #64748b)" }}>
									Цена: <strong style={{ color: "var(--ink, #0f172a)" }}>{Number(item.priceRub).toLocaleString("ru-RU")} ₽</strong> · Ставка: {item.doctorPayrollPercent}% · Начисление: <span className="text-emerald-600 dark:text-emerald-300 font-bold">{Number(item.doctorPayrollRub).toLocaleString("ru-RU")} ₽</span>
								</div>
							</div>
							<div className="flex items-center space-x-2 text-xs">
								<span className="px-2 py-0.5 rounded border font-bold bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">
									Маржа клиники: {Number(item.clinicMarginRub).toLocaleString("ru-RU")} ₽
								</span>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
