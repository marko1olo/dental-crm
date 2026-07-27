import React, { useEffect, useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { Tag, CheckCircle2 } from "lucide-react";
import { EmptyState } from "../EmptyState";

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
			headers: auth ? auth.denteClinicalReadHeaders() : {},
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
			className="p-4 rounded-xl border my-4 shadow-sm bg-[var(--paper)] border-[var(--line)] text-[var(--ink)]"
		>
			<div className="flex items-center justify-between mb-3 pb-2 border-b border-[var(--line)]">
				<div className="flex items-center space-x-2">
					<Tag className="w-5 h-5 text-[var(--brand-500,#0f766e)]" />
					<h3 className="font-semibold text-[var(--brand-700,#0e7490)]">
						Кастомные типы задач CRM (Звонки, Напоминания, Запись на осмотр)
					</h3>
				</div>
				<span className="text-xs px-2 py-0.5 rounded border bg-[var(--brand-soft,rgba(20,184,166,0.1))] text-[var(--brand-700,#0f766e)] border-[var(--brand-300,#99f6e4)] font-medium">
					Конструктор задач
				</span>
			</div>

			{loading ? (
				<EmptyState title="Загрузка типов задач" description="Пожалуйста, подождите..." className="py-4" />
			) : taskTypes.length === 0 ? (
				<EmptyState title="Типы задач отсутствуют" description="Кастомные типы задач CRM пока не настроены." className="py-4" />
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
					{taskTypes.map((item) => (
						<div
							key={item.id}
							className="p-3 rounded-lg border flex flex-col justify-between gap-1 bg-[var(--paper-soft,#f8fafc)] border-[var(--line)] hover:border-[var(--brand-300)] transition-colors"
						>
							<div className="flex items-center justify-between">
								<span className="font-bold text-sm text-[var(--ink)]" style={{ color: item.colorHex || undefined }}>
									{item.typeLabel}
								</span>
								<span className="text-xs font-mono text-[var(--brand-600,#0e7490)] font-semibold flex items-center gap-1">
									<CheckCircle2 className="w-3 h-3" /> {item.typeCode}
								</span>
							</div>
							<div className="text-xs text-[var(--muted,#94a3b8)]">
								SLA: <span className="font-semibold text-[var(--ink)]">{item.defaultSlaHours}ч</span> · Привязка к пациенту: {item.requiresPatientBinding ? "Да" : "Нет"}
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
