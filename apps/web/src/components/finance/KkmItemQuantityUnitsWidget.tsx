import React, { useEffect, useState } from "react";
import { auth } from "../../AppHelpers";

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
			style={{ background: "var(--paper, #ffffff)", color: "var(--ink, #0f172a)", borderColor: "var(--line, #e2e8f0)" }}
		>
			<div className="flex items-center justify-between mb-3 pb-2 border-b" style={{ borderColor: "var(--line, #e2e8f0)" }}>
				<div className="flex items-center space-x-2">
					<span className="text-xl">📊</span>
					<h3 className="font-semibold text-emerald-600 dark:text-emerald-400">
						Автоматическое Указание Меры Количества в ККМ (шт, услуга, процедура)
					</h3>
				</div>
				<span className="text-xs px-2 py-0.5 rounded border bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">
					OFD Unit Standard
				</span>
			</div>

			{loading ? (
				<div className="text-sm py-4" style={{ color: "var(--muted, #64748b)" }}>
					Загрузка единиц измерения ККМ...
				</div>
			) : units.length === 0 ? (
				<div className="text-sm py-3 text-center" style={{ color: "var(--muted, #64748b)" }}>
					Единицы измерения ККМ не заданы.
				</div>
			) : (
				<div className="space-y-3">
					{units.map((item) => (
						<div
							key={item.id}
							className="p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2"
							style={{ background: "var(--surface-50, #f8fafc)", borderColor: "var(--line, #e2e8f0)" }}
						>
							<div>
								<div className="text-sm font-bold">{item.serviceTitle}</div>
								<div className="text-xs mt-1" style={{ color: "var(--muted, #64748b)" }}>
									Мера количества: <span className="font-bold text-emerald-600 dark:text-emerald-300">{item.unitType}</span> (Код ОФД: {item.unitCodeOfd})
								</div>
							</div>
							<div className="flex items-center space-x-2 text-xs">
								<span className="px-2 py-0.5 rounded border font-mono bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">
									{item.fractionalQuantityAllowed ? "Дробные разрешены" : "Только целые"}
								</span>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
