import React, { useEffect, useState } from "react";

interface RebookingItem {
	id: string;
	organizationId: string;
	patientName: string;
	rebookedBy: string;
	timeDeltaMinutes: number;
	creditedRole: string;
	appointmentDate: string;
	createdAt: string;
}

export const RebookingConversionRulesWidget: React.FC = () => {
	const [rules, setRules] = useState<RebookingItem[]>([]);
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		fetch("/api/hr/rebooking-conversion-rules", {
			headers: { "x-organization-id": "00000000-0000-0000-0000-000000000001" },
		})
			.then((res) => res.json())
			.then((data) => {
				setRules(Array.isArray(data) ? data : []);
				setLoading(false);
			})
			.catch((err) => {
				console.error("[RebookingConversionRulesWidget fetch error]:", err);
				setLoading(false);
			});
	}, []);

	return (
		<div
			data-testid="rebooking-conversion-rules-widget"
			className="p-4 bg-slate-900 border border-emerald-500/30 rounded-xl text-slate-100 shadow-xl my-4"
		>
			<div className="flex items-center justify-between mb-3 border-b border-slate-700/60 pb-2">
				<div className="flex items-center space-x-2">
					<span className="text-xl">⚖️</span>
					<h3 className="font-semibold text-emerald-400">
						Справедливое Распределение Конверсии Повторной Записи (Порог 15 Минут)
					</h3>
				</div>
				<span className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/40">
					Врач vs Администратор KPI
				</span>
			</div>

			{loading ? (
				<div className="text-slate-400 text-sm py-4">Загрузка правил зачисления конверсии...</div>
			) : (
				<div className="space-y-3">
					{rules.map((rule) => (
						<div
							key={rule.id}
							className="p-3 bg-slate-800/70 border border-slate-700/50 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2"
						>
							<div>
								<div className="text-sm font-bold text-slate-200">{rule.patientName}</div>
								<div className="text-xs text-slate-400 mt-0.5">
									Создано через <strong className="text-slate-200">{rule.timeDeltaMinutes} мин</strong> приёма | Дата визита: {rule.appointmentDate}
								</div>
							</div>
							<div className="flex items-center space-x-2">
								<span className="text-xs bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800 font-bold">
									Конверсия: {rule.creditedRole.toUpperCase()}
								</span>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
