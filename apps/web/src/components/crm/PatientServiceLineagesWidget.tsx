import React, { useEffect, useState } from "react";
import { GitCommit, ArrowRight, CheckCircle2, Clock } from "lucide-react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";

interface LineageItem {
	id: string;
	organizationId: string;
	patientName: string;
	leadSource: string;
	rescheduleCount: number;
	waitlistEntryId?: string;
	finalVisitId?: string;
	lifecycleStage: string;
	createdAt: string;
}

export const PatientServiceLineagesWidget: React.FC<{ patientId?: string }> = ({ patientId }) => {
	const { auth } = useAppLogicContext();
	const [items, setItems] = useState<LineageItem[]>([]);
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		const url = patientId
			? `/api/crm/patient-service-lineages?patientId=${encodeURIComponent(patientId)}`
			: "/api/crm/patient-service-lineages";

		fetch(url, {
			headers: auth ? auth.denteClinicalReadHeaders() : { "x-organization-id": "00000000-0000-0000-0000-000000000001" },
		})
			.then((res) => res.json())
			.then((data) => {
				setItems(Array.isArray(data) ? data : []);
				setLoading(false);
			})
			.catch((err) => {
				console.error("[PatientServiceLineagesWidget fetch error]:", err);
				setLoading(false);
			});
	}, [patientId, auth]);

	return (
		<div
			data-testid="patient-service-lineages-widget"
			className="p-4 rounded-xl border my-4 shadow-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
		>
			<div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200 dark:border-slate-800">
				<div className="flex items-center space-x-2">
					<GitCommit className="w-5 h-5 text-teal-600 dark:text-teal-400" />
					<h3 className="font-semibold text-sm text-teal-700 dark:text-teal-400">
						Сквозное дерево связей обращений (Заявка → Перенос → Лист ожидания → Визит)
					</h3>
				</div>
				<span className="text-xs px-2 py-0.5 rounded border bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-950 dark:text-teal-300 dark:border-teal-800 font-medium">
					Дерево связей
				</span>
			</div>

			{loading ? (
				<div className="text-xs text-slate-500 dark:text-slate-400 py-3">Загрузка сквозного дерева связей...</div>
			) : items.length === 0 ? (
				<div className="p-4 text-center rounded-lg border border-dashed bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700">
					<Clock className="w-6 h-6 mx-auto mb-2 text-slate-400 dark:text-slate-500" />
					<div className="text-xs font-semibold text-slate-900 dark:text-slate-200">История связей обращения отсутствует</div>
					<div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
						При первых переносах или создании визита из онлайн-заявки здесь появится граф жизни обращения.
					</div>
				</div>
			) : (
				<div className="space-y-2.5">
					{items.map((item) => (
						<div
							key={item.id}
							className="p-3 rounded-lg border flex flex-col gap-2 bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700"
						>
							<div className="flex items-center justify-between">
								<span className="text-xs font-bold text-slate-900 dark:text-white">{item.patientName}</span>
								<span className="text-xs px-2 py-0.5 rounded font-medium bg-teal-100 text-teal-800 border border-teal-300 dark:bg-teal-950 dark:text-teal-300 dark:border-teal-800">
									{item.lifecycleStage}
								</span>
							</div>

							<div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 flex-wrap">
								<span>Источник: <strong className="text-slate-900 dark:text-slate-200">{item.leadSource}</strong></span>
								<ArrowRight className="w-3 h-3 text-slate-400" />
								<span>Переносов: <strong className="text-slate-900 dark:text-slate-200">{item.rescheduleCount}</strong></span>
								{item.waitlistEntryId && (
									<>
										<ArrowRight className="w-3 h-3 text-slate-400" />
										<span className="text-teal-700 dark:text-teal-400 font-medium">Лист ожидания</span>
									</>
								)}
								{item.finalVisitId && (
									<>
										<ArrowRight className="w-3 h-3 text-slate-400" />
										<span className="text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1">
											<CheckCircle2 className="w-3 h-3" /> Завершено в визит
										</span>
									</>
								)}
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};

