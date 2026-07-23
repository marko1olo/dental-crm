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
			className="p-4 rounded-xl border my-4 shadow-sm"
			style={{ background: "var(--paper, #ffffff)", color: "var(--ink, #0f172a)", borderColor: "var(--line, #e2e8f0)" }}
		>
			<div className="flex items-center justify-between mb-3 pb-2 border-b" style={{ borderColor: "var(--line, #e2e8f0)" }}>
				<div className="flex items-center space-x-2">
					<span className="text-xl">📋</span>
					<h3 className="font-semibold text-blue-600 dark:text-blue-400">
						Пользовательские Типы Задач CRM для Администраторов
					</h3>
				</div>
				<span className="text-xs px-2 py-0.5 rounded border bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
					CRM Task Configurator
				</span>
			</div>

			{loading ? (
				<div className="text-sm py-4" style={{ color: "var(--muted, #64748b)" }}>
					Загрузка типов задач CRM...
				</div>
			) : taskTypes.length === 0 ? (
				<div className="text-sm py-3 text-center" style={{ color: "var(--muted, #64748b)" }}>
					Типы задач CRM не заданы.
				</div>
			) : (
				<div className="space-y-3">
					{taskTypes.map((item) => (
						<div
							key={item.id}
							className="p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2"
							style={{ background: "var(--surface-50, #f8fafc)", borderColor: "var(--line, #e2e8f0)" }}
						>
							<div>
								<div className="flex items-center space-x-2">
									<span
										className="w-3 h-3 rounded-full inline-block"
										style={{ backgroundColor: item.colorHex }}
									/>
									<span className="text-sm font-bold">{item.typeLabel}</span>
									<span className="text-xs font-mono text-slate-500">({item.typeCode})</span>
								</div>
								<div className="text-xs mt-1" style={{ color: "var(--muted, #64748b)" }}>
									SLA на выполнение: <strong style={{ color: "var(--ink, #0f172a)" }}>{item.defaultSlaHours} часов</strong> · {item.requiresPatientBinding ? "Привязка к пациенту обязательна" : "Общая задача"}
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
