import React, { useEffect, useState } from "react";
import { auth } from "../../AppHelpers";
import { ShoppingCart } from "lucide-react";

interface KkmUnitItem {
	id: string;
	organizationId: string;
	serviceTitle: string;
	unitType: string;
	unitCodeOfd: string;
	fractionalQuantityAllowed: boolean;
	createdAt: string;
}

export const KkmItemQuantityUnitsWidget: React.FC = () => {
	const [units, setUnits] = useState<KkmUnitItem[]>([]);
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		fetch("/api/finance/kkm-item-quantity-units", {
			headers: auth.denteClinicalReadHeaders(),
		})
			.then((res) => res.json())
			.then((data) => {
				setUnits(Array.isArray(data) ? data : []);
				setLoading(false);
			})
			.catch((err) => {
				console.error("[KkmItemQuantityUnitsWidget fetch error]:", err);
				setLoading(false);
			});
	}, []);

	return (
		<div
			data-testid="kkm-item-quantity-units-widget"
			className="p-4 rounded-xl border my-4 shadow-sm"
			style={{ background: "var(--paper)", color: "var(--ink)", borderColor: "var(--line)" }}
		>
			<div className="flex items-center justify-between mb-3 pb-2 border-b" style={{ borderColor: "var(--line)" }}>
				<div className="flex items-center space-x-2">
					<ShoppingCart className="w-5 h-5 text-indigo-500" />
					<h3 className="font-semibold text-indigo-600 dark:text-indigo-400">
						Единицы измерения позиций ККТ / Дробное количество (54-ФЗ / ФФД 1.2)
					</h3>
				</div>
				<span className="text-xs px-2 py-0.5 rounded border bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800">
					ФФД 1.2 Формат чеков
				</span>
			</div>

			{loading ? (
				<div className="text-sm py-4" style={{ color: "var(--muted)" }}>
					Загрузка единиц измерения ККТ...
				</div>
			) : units.length === 0 ? (
				<div className="text-sm py-3 text-center" style={{ color: "var(--muted)" }}>
					Настройки единиц измерения позиций ККМ отсутствуют.
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
					{units.map((item) => (
						<div
							key={item.id}
							className="p-3 rounded-lg border space-y-2"
							style={{ background: "var(--glass-panel)", borderColor: "var(--line)" }}
						>
							<div className="flex justify-between items-start">
								<span className="text-xs font-bold px-2 py-0.5 rounded border bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800">
									{item.unitType} (Код ОФД: {item.unitCodeOfd})
								</span>
								{item.fractionalQuantityAllowed && (
									<span className="text-xs px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
										Дробное Qty
									</span>
								)}
							</div>
							<h4 className="text-sm font-medium leading-snug">{item.serviceTitle}</h4>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
