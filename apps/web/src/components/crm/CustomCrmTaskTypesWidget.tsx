import React, { useEffect, useState } from "react";
import { auth } from "../../AppHelpers";

interface TaskTypeItem {
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
	const [taskTypes, setTaskTypes] = useState<TaskTypeItem[]>([]);
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		fetch("/api/crm/custom-crm-task-types", {
			headers: auth.denteClinicalReadHeaders(),
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
			className="p-4 rounded-xl border my-4 shadow-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-800"
		>
			<div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200 dark:border-slate-800">
				<div className="flex items-center space-x-2">
					<span className="text-xl">📋</span>
					<h3 className="font-semibold text-blue-600 dark:text-blue-400">
						Пользовательские типы задач CRM и стандарты SLA
					</h3>
				</div>
				<span className="text-xs px-2 py-0.5 rounded border bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
					CRM Task Configurator
				</span>
			</div>

			{loading ? (
				<div className="text-sm py-4 text-slate-500 dark:text-slate-400">
					Загрузка типов задач CRM...
				</div>
			) : taskTypes.length === 0 ? (
				<div className="text-sm py-3 text-center text-slate-500 dark:text-slate-400">
					Типы задач CRM пока не настроены. Используются системные пресеты.
				</div>
			) : (
				<div className="space-y-3">
					{taskTypes.map((item) => (
						<div
							key={item.id}
							className="p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700"
						>
							<div>
								<div className="flex items-center space-x-2">
									<span
										className="w-3 h-3 rounded-full inline-block"
										style={{ backgroundColor: item.colorHex || "#3b82f6" }}
									/>
									<span className="text-sm font-bold text-slate-900 dark:text-white">{item.typeLabel}</span>
									<span className="text-xs font-mono text-slate-500 dark:text-slate-400">({item.typeCode})</span>
								</div>
								<div className="text-xs mt-1 text-slate-600 dark:text-slate-300">
									SLA на выполнение:{" "}
									<strong className="text-slate-900 dark:text-white">
										{item.defaultSlaHours} ч.
									</strong>{" "}
									•{" "}
									{item.requiresPatientBinding
										? "Привязка к пациенту обязательна"
										: "Свободная привязка"}
								</div>
							</div>
							<div className="flex items-center space-x-2 text-xs">
								<span className="px-2 py-0.5 rounded border font-bold bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
									SLA: {item.defaultSlaHours}ч
								</span>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
