import React, { useEffect, useState } from "react";

interface KkmUnitItem {
	id: string;
	organizationId: string;
	serviceCode: string;
	serviceTitle: string;
	quantityUnitCode: number;
	quantityUnitLabel: string;
	itemPaymentType: string;
	createdAt: string;
}

export const KkmItemQuantityUnitsWidget: React.FC = () => {
	const [units, setUnits] = useState<KkmUnitItem[]>([]);
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		fetch("/api/finance/kkm-item-quantity-units", {
			headers: { "x-organization-id": "00000000-0000-0000-0000-000000000001" },
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
			className="p-4 bg-slate-900 border border-cyan-500/30 rounded-xl text-slate-100 shadow-xl my-4"
		>
			<div className="flex items-center justify-between mb-3 border-b border-slate-700/60 pb-2">
				<div className="flex items-center space-x-2">
					<span className="text-xl">📊</span>
					<h3 className="font-semibold text-cyan-400">
						Автоматическая Передача Меры Количества в ККМ (54-ФЗ)
					</h3>
				</div>
				<span className="text-xs bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded border border-cyan-500/40">
					54-FZ Unit Measure
				</span>
			</div>

			{loading ? (
				<div className="text-slate-400 text-sm py-4">Загрузка мер количества ККМ...</div>
			) : (
				<div className="space-y-3">
					{units.map((item) => (
						<div
							key={item.id}
							className="p-3 bg-slate-800/70 border border-slate-700/50 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2"
						>
							<div>
								<div className="text-sm font-bold text-slate-200">{item.serviceTitle}</div>
								<div className="text-xs text-slate-400 mt-1">
									Код услуги: <span className="font-mono text-cyan-300">{item.serviceCode}</span>
								</div>
							</div>
							<div className="flex items-center space-x-2 text-xs">
								<span className="bg-cyan-950 text-cyan-300 px-2 py-1 rounded border border-cyan-800 font-mono">
									Ед. изм: {item.quantityUnitLabel} (Код {item.quantityUnitCode})
								</span>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
