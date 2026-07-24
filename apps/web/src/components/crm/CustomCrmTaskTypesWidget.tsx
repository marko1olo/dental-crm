import React, { useEffect, useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { Tag, CheckCircle2 } from "lucide-react";

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
	const appLogic = useAppLogicContext();
	const auth = appLogic?.auth;
	const [taskTypes, setTaskTypes] = useState<TaskTypeItem[]>([]);
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		fetch("/api/crm/custom-crm-task-types", {
			headers: auth ? auth.denteClinicalReadHeaders() : { "x-organization-id": "00000000-0000-0000-0000-000000000001" },
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
	}, [auth]);

	return (
		<div
			data-testid="custom-crm-task-types-widget"
			className="p-4 rounded-xl border my-4 shadow-sm"
			style={{ background: "var(--paper)", color: "var(--ink)", borderColor: "var(--line)" }}
		>
			<div className="flex items-center justify-between mb-3 pb-2 border-b" style={{ borderColor: "var(--line)" }}>
				<div className="flex items-center space-x-2">
					<Tag className="w-5 h-5 text-indigo-500" />
					<h3 className="font-semibold text-indigo-600 dark:text-indigo-400">
						Кастомные типы задач CRM (Звонки, Напоминания, Запись на осмотр)
					</h3>
				</div>
				<span className="text-xs px-2 py-0.5 rounded border bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800">
					Конструктор задач
				</span>
			</div>

			{loading ? (
				<div className="text-sm py-4" style={{ color: "var(--muted)" }}>
					Загрузка типов задач...
				</div>
			) : taskTypes.length === 0 ? (
				<div className="text-sm py-3 text-center" style={{ color: "var(--muted)" }}>
					Кастомные типы задач CRM отсутствуют.
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
					{taskTypes.map((item) => (
						<div
							key={item.id}
							className="p-3 rounded-lg border flex flex-col justify-between gap-1"
							style={{ background: "var(--glass-panel)", borderColor: "var(--line)" }}
						>
							<div className="flex items-center justify-between">
								<span className="font-bold text-sm" style={{ color: item.colorHex || "var(--ink)" }}>{item.typeLabel}</span>
								<span className="text-xs font-mono text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1">
									<CheckCircle2 className="w-3 h-3" /> {item.typeCode}
								</span>
							</div>
							<div className="text-xs" style={{ color: "var(--muted)" }}>
								SLA: <span style={{ color: "var(--ink)" }}>{item.defaultSlaHours}ч</span> · Привязка к пациенту: {item.requiresPatientBinding ? "Да" : "Нет"}
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
