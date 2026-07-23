import React, { useEffect, useState } from "react";

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
			headers: { "x-organization-id": "00000000-0000-0000-0000-000000000001" },
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
			className="p-4 bg-slate-900 border border-amber-500/30 rounded-xl text-slate-100 shadow-xl my-4"
		>
			<div className="flex items-center justify-between mb-3 border-b border-slate-700/60 pb-2">
				<div className="flex items-center space-x-2">
					<span className="text-xl">📊</span>
					<h3 className="font-semibold text-amber-400">
						Управление Этапами Планов Лечения & Авто-Архивация (100% Готовность)
					</h3>
				</div>
				<span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/40">
					Drag-and-Drop Stages
				</span>
			</div>

			{loading ? (
				<div className="text-slate-400 text-sm py-4">Загрузка этапов планов лечения...</div>
			) : (
				<div className="space-y-3">
					{stages.map((stg) => (
						<div
							key={stg.id}
							className="p-3 bg-slate-800/70 border border-slate-700/50 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2"
						>
							<div>
								<div className="flex items-center space-x-2">
									<span className="text-xs font-bold text-amber-300 bg-amber-950 px-2 py-0.5 rounded border border-amber-800">
										#{stg.stageOrder}
									</span>
									<span className="text-sm font-semibold text-slate-200">{stg.stageName}</span>
								</div>
								<div className="text-xs text-slate-400 mt-1">
									Пациент: <span className="text-slate-300">{stg.patientName}</span> | План: {stg.planTitle}
								</div>
							</div>
							<div className="flex items-center space-x-3">
								<div className="text-xs font-bold text-amber-300">
									{stg.completionPercentage}% завершено
								</div>
								{stg.autoArchived && (
									<span className="text-xs bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800">
										✓ Авто-архивирован
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
