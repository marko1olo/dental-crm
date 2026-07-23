import React, { useEffect, useState } from "react";
import { auth } from "../../AppHelpers";

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
			className="p-4 rounded-xl border my-4 shadow-sm"
			style={{ background: "var(--paper, #ffffff)", color: "var(--ink, #0f172a)", borderColor: "var(--line, #e2e8f0)" }}
		>
			<div className="flex items-center justify-between mb-3 pb-2 border-b" style={{ borderColor: "var(--line, #e2e8f0)" }}>
				<div className="flex items-center space-x-2">
					<span className="text-xl">📊</span>
					<h3 className="font-semibold text-amber-600 dark:text-amber-400">
						Управление Этапами Планов Лечения & Авто-Архивация (100% Готовность)
					</h3>
				</div>
				<span className="text-xs px-2 py-0.5 rounded border bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800">
					Drag-and-Drop Stages
				</span>
			</div>

			{loading ? (
				<div className="text-sm py-4" style={{ color: "var(--muted, #64748b)" }}>
					Загрузка этапов планов лечения...
				</div>
			) : stages.length === 0 ? (
				<div className="text-sm py-3 text-center" style={{ color: "var(--muted, #64748b)" }}>
					Нет этапов планов лечения.
				</div>
			) : (
				<div className="space-y-3">
					{stages.map((stg) => (
						<div
							key={stg.id}
							className="p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2"
							style={{ background: "var(--surface-50, #f8fafc)", borderColor: "var(--line, #e2e8f0)" }}
						>
							<div>
								<div className="flex items-center space-x-2">
									<span className="text-xs font-bold px-2 py-0.5 rounded border bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800">
										#{stg.stageOrder}
									</span>
									<span className="text-sm font-semibold">{stg.stageName}</span>
								</div>
								<div className="text-xs mt-1" style={{ color: "var(--muted, #64748b)" }}>
									Пациент: <span style={{ color: "var(--ink, #0f172a)" }}>{stg.patientName}</span> | План: {stg.planTitle}
								</div>
							</div>
							<div className="flex items-center space-x-3">
								<div className="text-xs font-bold text-amber-600 dark:text-amber-300">
									{stg.completionPercentage}% завершено
								</div>
								{stg.autoArchived && (
									<span className="text-xs px-2 py-0.5 rounded border bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">
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
