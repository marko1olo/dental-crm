import React, { useEffect, useState } from "react";

interface AltPlanItem {
	id: string;
	organizationId: string;
	patientName: string;
	variantName: string;
	totalCostRub: string;
	isSelectedVariant: boolean;
	autoArchived: boolean;
	createdAt: string;
}

export const AlternativeTreatmentPlansWidget: React.FC = () => {
	const [plans, setPlans] = useState<AltPlanItem[]>([]);
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		fetch("/api/documents/alternative-treatment-plans", {
			headers: { "x-organization-id": "00000000-0000-0000-0000-000000000001" },
		})
			.then((res) => res.json())
			.then((data) => {
				setPlans(Array.isArray(data) ? data : []);
				setLoading(false);
			})
			.catch((err) => {
				console.error("[AlternativeTreatmentPlansWidget fetch error]:", err);
				setLoading(false);
			});
	}, []);

	return (
		<div
			data-testid="alternative-treatment-plans-widget"
			className="p-4 bg-slate-900 border border-purple-500/30 rounded-xl text-slate-100 shadow-xl my-4"
		>
			<div className="flex items-center justify-between mb-3 border-b border-slate-700/60 pb-2">
				<div className="flex items-center space-x-2">
					<span className="text-xl">📑</span>
					<h3 className="font-semibold text-purple-400">
						Модуль Альтернативных Планов Лечения (варианты А/Б/В с авто-архивацией)
					</h3>
				</div>
				<span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded border border-purple-500/40">
					Alternative Plan Variants
				</span>
			</div>

			{loading ? (
				<div className="text-slate-400 text-sm py-4">Загрузка вариантов планов лечения...</div>
			) : (
				<div className="space-y-3">
					{plans.map((item) => (
						<div
							key={item.id}
							className="p-3 bg-slate-800/70 border border-slate-700/50 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2"
						>
							<div>
								<div className="text-sm font-bold text-slate-200">{item.variantName}</div>
								<div className="text-xs text-slate-400 mt-1">
									Пациент: <span className="text-slate-200 font-semibold">{item.patientName}</span>
								</div>
							</div>
							<div className="flex items-center space-x-3 text-xs">
								<div className="bg-purple-950 text-purple-300 px-2.5 py-1 rounded border border-purple-800 font-bold">
									Стоимость: {Number(item.totalCostRub).toLocaleString()} ₽
								</div>
								{item.isSelectedVariant ? (
									<span className="bg-emerald-950 text-emerald-300 px-2 py-1 rounded border border-emerald-800 font-bold uppercase">
										✓ Выбран пациентом
									</span>
								) : item.autoArchived ? (
									<span className="bg-slate-950 text-slate-400 px-2 py-1 rounded border border-slate-800 font-mono">
										📦 В архиве
									</span>
								) : null}
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
