import React, { useEffect, useState } from "react";
import { auth } from "../../AppHelpers";
import { Calculator } from "lucide-react";

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
			style={{ background: "var(--paper)", color: "var(--ink)", borderColor: "var(--line)" }}
		>
			<div className="flex items-center justify-between mb-3 pb-2 border-b" style={{ borderColor: "var(--line)" }}>
				<div className="flex items-center space-x-2">
					<Calculator className="w-5 h-5 text-emerald-500" />
					<h3 className="font-semibold text-emerald-600 dark:text-emerald-400">
						Расчет зарплат врачей по услугам Прайс-Листа
					</h3>
				</div>
				<span className="text-xs px-2 py-0.5 rounded border bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">
					Процент & Ставки врачей
				</span>
			</div>

			{loading ? (
				<div className="text-sm py-4" style={{ color: "var(--muted)" }}>
					Загрузка расчета зарплат прайс-листа...
				</div>
			) : payrolls.length === 0 ? (
				<div className="text-sm py-3 text-center" style={{ color: "var(--muted)" }}>
					Ставки зарплат по услугам прайс-листа не назначены.
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
					{payrolls.map((item) => (
						<div
							key={item.id}
							className="p-3 rounded-lg border space-y-2"
							style={{ background: "var(--glass-panel)", borderColor: "var(--line)" }}
						>
							<div className="flex justify-between items-start">
								<span className="text-xs font-bold px-2 py-0.5 rounded border bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">
									{item.serviceCode}
								</span>
								<span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
									Врачу: {item.doctorPayrollPercent}% ({Number(item.doctorPayrollRub).toLocaleString("ru-RU")} ₽)
								</span>
							</div>
							<h4 className="text-sm font-medium leading-snug">{item.serviceName}</h4>
							<div className="text-xs flex items-center justify-between pt-1 border-t" style={{ borderColor: "var(--line)", color: "var(--muted)" }}>
								<span>Цена: <strong>{Number(item.priceRub).toLocaleString("ru-RU")} ₽</strong></span>
								<span>Маржа клиники: <strong>{Number(item.clinicMarginRub).toLocaleString("ru-RU")} ₽</strong></span>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
