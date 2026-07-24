import React, { useEffect, useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";

interface MergeQueueItem {
	id: string;
	organizationId: string;
	primaryPatientName: string;
	duplicatePatientName: string;
	matchConfidencePercent: number;
	mergeStatus: string;
	createdAt: string;
}

export const PatientDuplicateMergeQueuesWidget: React.FC = () => {
	const { auth } = useAppLogicContext();
	const [queues, setQueues] = useState<MergeQueueItem[]>([]);
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		fetch("/api/crm/patient-duplicate-merge-queues", {
			headers: auth ? auth.denteClinicalReadHeaders() : { "x-organization-id": "00000000-0000-0000-0000-000000000001" },
		})
			.then((res) => res.json())
			.then((data) => {
				setQueues(Array.isArray(data) ? data : []);
				setLoading(false);
			})
			.catch((err) => {
				console.error("[PatientDuplicateMergeQueuesWidget fetch error]:", err);
				setLoading(false);
			});
	}, [auth]);

	return (
		<div
			data-testid="patient-duplicate-merge-queues-widget"
			className="p-4 bg-white dark:bg-slate-900 border border-cyan-500/30 rounded-xl text-slate-900 dark:text-slate-100 shadow-sm my-4"
		>
			<div className="flex items-center justify-between mb-3 border-b border-slate-200 dark:border-slate-700/60 pb-2">
				<div className="flex items-center space-x-2">
					<span className="text-xl">👥</span>
					<h3 className="font-semibold text-cyan-700 dark:text-cyan-400">
						Очередь массового объединения дубликатов карточек
					</h3>
				</div>
				<span className="text-xs bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 px-2 py-0.5 rounded border border-cyan-300 dark:border-cyan-500/40 font-medium">
					Фоновый склейщик
				</span>
			</div>

			{loading ? (
				<div className="text-slate-500 dark:text-slate-400 text-sm py-4">Загрузка очереди объединения...</div>
			) : queues.length === 0 ? (
				<div className="text-slate-500 dark:text-slate-400 text-sm py-3 text-center">
					Дубликаты карточек пациентов не обнаружены
				</div>
			) : (
				<div className="space-y-3">
					{queues.map((item) => (
						<div
							key={item.id}
							className="p-3 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/50 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2"
						>
							<div>
								<div className="text-sm font-bold text-slate-800 dark:text-slate-200">
									Основная: {item.primaryPatientName}
								</div>
								<div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
									Дубликат: <span className="text-cyan-600 dark:text-cyan-300 font-semibold">{item.duplicatePatientName}</span> · Совпадение: <span className="font-bold text-emerald-600 dark:text-emerald-400">{item.matchConfidencePercent}%</span>
								</div>
							</div>
							<div className="flex items-center space-x-2 text-xs">
								<span className="bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 px-2.5 py-1 rounded border border-cyan-300 dark:border-cyan-800 font-mono">
									⏳ В очереди склейки
								</span>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};

