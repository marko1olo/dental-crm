import React, { useEffect, useState } from "react";
import { auth } from "../../AppHelpers";
import { Layers, CheckCircle2 } from "lucide-react";

interface StageItem {
	id: string;
	organizationId: string;
	patientName: string;
	planTitle: string;
	stageOrder: number;
	stageName: string;
	completionPercentage: number;
	autoArchived: boolean;
	archivedAt: string | null;
	createdAt: string;
}

export const TreatmentPlanStagesWidget: React.FC = () => {
	const [stages, setStages] = useState<StageItem[]>([]);
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		fetch("/api/documents/treatment-plan-stages", {
			headers: auth.denteClinicalReadHeaders(),
		})
			.then((res) => res.json())
			.then((data) => {
				setStages(Array.isArray(data) ? data : []);
				setLoading(false);
			})
			.catch((err) => {
				console.error("[TreatmentPlanStagesWidget fetch error]:", err);
				setLoading(false);
			});
	}, []);

	return (
		<div
			data-testid="treatment-plan-stages-widget"
			className="p-4 rounded-xl border my-4 shadow-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
		>
			<div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200 dark:border-slate-800">
				<div className="flex items-center space-x-2">
					<Layers className="w-5 h-5 text-emerald-500" />
					<h3 className="font-semibold text-emerald-600 dark:text-emerald-400">
						Этапы выполнения плана лечения и автоархивация
					</h3>
				</div>
				<span className="text-xs px-2 py-0.5 rounded border bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800 font-medium">
					Пошаговое лечение
				</span>
			</div>

			{loading ? (
				<div className="text-sm py-4 text-slate-500 dark:text-slate-400">
					Загрузка этапов плана лечения...
				</div>
			) : stages.length === 0 ? (
				<div className="text-sm py-3 text-center text-slate-500 dark:text-slate-400">
					Этапы комплексного плана лечения отсутствуют.
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
					{stages.map((stage) => (
						<div
							key={stage.id}
							className="p-3 rounded-lg border space-y-2 bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700"
						>
							<div className="flex justify-between items-start">
								<span className="text-xs font-bold px-2 py-0.5 rounded border bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">
									Этап #{stage.stageOrder}: {stage.stageName}
								</span>
								<span className="text-xs px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 font-medium">
									{stage.completionPercentage}% завершено
								</span>
							</div>
							<h4 className="text-sm font-medium leading-snug">{stage.planTitle}</h4>
							<p className="text-xs text-slate-600 dark:text-slate-400">
								Пациент: <strong className="text-slate-900 dark:text-slate-200">{stage.patientName}</strong>
							</p>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
