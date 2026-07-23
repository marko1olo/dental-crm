import React, { useEffect, useState } from "react";

interface CrmTaskTypeItem {
	id: string;
	organizationId: string;
	typeCode: string;
	typeLabel: string;
	colorHex: string;
	requiresPatientBinding: boolean;
	defaultSlaHours: number;
	createdAt: string;
}

export const CustomCrmTaskTypesWidget: React.FC = () => {
	const [taskTypes, setTaskTypes] = useState<CrmTaskTypeItem[]>([]);
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		fetch("/api/crm/custom-task-types", {
			headers: { "x-organization-id": "00000000-0000-0000-0000-000000000001" },
		})
			.then((res) => res.json())
			.then((data) => {
				setTaskTypes(Array.isArray(data) ? data : []);
				setLoading(false);
			})
			.catch((err) => {
				console.error("[CustomCrmTaskTypesWidget fetch error]:", err);
				setLoading(false);
			});
	}, []);

	return (
		<div
			data-testid="custom-crm-task-types-widget"
			className="p-4 bg-slate-900 border border-amber-500/30 rounded-xl text-slate-100 shadow-xl my-4"
		>
			<div className="flex items-center justify-between mb-3 border-b border-slate-700/60 pb-2">
				<div className="flex items-center space-x-2">
					<span className="text-xl">🏷️</span>
					<h3 className="font-semibold text-amber-400">
						Конструктор Пользовательских Типов Задач CRM (без привязки к визиту)
					</h3>
				</div>
				<span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/40">
					CRM Custom Task Catalog
				</span>
			</div>

			{loading ? (
				<div className="text-slate-400 text-sm py-4">Загрузка типов задач CRM...</div>
			) : (
				<div className="space-y-3">
					{taskTypes.map((item) => (
						<div
							key={item.id}
							className="p-3 bg-slate-800/70 border border-slate-700/50 rounded-lg flex items-center justify-between"
						>
							<div className="flex items-center space-x-3">
								<span
									className="w-3 h-3 rounded-full inline-block"
									style={{ backgroundColor: item.colorHex }}
								></span>
								<div>
									<div className="text-sm font-bold text-slate-200">{item.typeLabel}</div>
									<div className="text-xs text-slate-400 font-mono mt-0.5">Код: {item.typeCode}</div>
								</div>
							</div>
							<div className="flex items-center space-x-2 text-xs">
								<span className="bg-amber-950 text-amber-300 px-2 py-0.5 rounded border border-amber-800 font-mono">
									SLA: {item.defaultSlaHours}ч
								</span>
								{item.requiresPatientBinding && (
									<span className="bg-slate-950 text-slate-300 px-2 py-0.5 rounded border border-slate-800">
										Привязка к пациенту
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
