import React, { useEffect, useState } from "react";

interface TaxCalcItem {
	id: string;
	organizationId: string;
	patientName: string;
	taxCode: string;
	totalEligibleRub: string;
	hasAnomalyWarning: boolean;
	createdAt: string;
}

export const NdflTaxCalculatorsWidget: React.FC = () => {
	const [items, setItems] = useState<TaxCalcItem[]>([]);
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		fetch("/api/documents/ndfl-tax-calculators", {
			headers: { "x-organization-id": "00000000-0000-0000-0000-000000000001" },
		})
			.then((res) => res.json())
			.then((data) => {
				setItems(Array.isArray(data) ? data : []);
				setLoading(false);
			})
			.catch((err) => {
				console.error("[NdflTaxCalculatorsWidget fetch error]:", err);
				setLoading(false);
			});
	}, []);

	return (
		<div
			data-testid="ndfl-tax-calculators-widget"
			className="p-4 bg-slate-900 border border-amber-500/30 rounded-xl text-slate-100 shadow-xl my-4"
		>
			<div className="flex items-center justify-between mb-3 border-b border-slate-700/60 pb-2">
				<div className="flex items-center space-x-2">
					<span className="text-xl">🧾</span>
					<h3 className="font-semibold text-amber-400">
						Авто-Калькулятор Справки НДФЛ с Блокировкой при Аномалиях (Код 1 vs Код 2)
					</h3>
				</div>
				<span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/40">
					NDFL Calculator
				</span>
			</div>

			{loading ? (
				<div className="text-slate-400 text-sm py-4">Загрузка авторасчета НДФЛ...</div>
			) : (
				<div className="space-y-3">
					{items.map((item) => (
						<div
							key={item.id}
							className="p-3 bg-slate-800/70 border border-slate-700/50 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2"
						>
							<div>
								<div className="text-sm font-bold text-slate-200">{item.patientName}</div>
								<div className="text-xs text-slate-400 mt-1">
									Категория вычета: <span className="text-amber-300 font-semibold">{item.taxCode}</span>
								</div>
							</div>
							<div className="flex items-center space-x-3 text-xs">
								<div className="bg-amber-950 text-amber-300 px-2.5 py-1 rounded border border-amber-800 font-bold">
									Сумма к вычету: {Number(item.totalEligibleRub).toLocaleString()} ₽
								</div>
								{item.hasAnomalyWarning && (
									<span className="bg-rose-950 text-rose-300 px-2 py-1 rounded border border-rose-800 font-bold">
										⚠️ Аномалия обнаружена
									</span>
								)}
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
