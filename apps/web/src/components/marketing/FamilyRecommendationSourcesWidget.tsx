import React, { useEffect, useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";

interface FamilySourceItem {
	id: string;
	organizationId: string;
	familyGroupName: string;
	newMemberName: string;
	referrerMemberName: string;
	assignedMarketingSource: string;
	createdAt: string;
}

export const FamilyRecommendationSourcesWidget: React.FC = () => {
	const appLogic = (useAppLogicContext() || {}) as any;
	const authContext = appLogic?.auth;
	const [items, setItems] = useState<FamilySourceItem[]>([]);
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		const headers = authContext
			? authContext.denteClinicalReadHeaders()
			: { "x-organization-id": "00000000-0000-0000-0000-000000000001" };
		fetch("/api/marketing/family-recommendation-sources", { headers })
			.then((res) => res.json())
			.then((data) => {
				setItems(Array.isArray(data) ? data : []);
				setLoading(false);
			})
			.catch((err) => {
				console.error("[FamilyRecommendationSourcesWidget fetch error]:", err);
				setLoading(false);
			});
	}, []);

	return (
		<div
			data-testid="family-recommendation-sources-widget"
			className="p-4 rounded-xl shadow-sm border my-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
		>
			<div className="flex items-center justify-between mb-3 border-b border-slate-200 dark:border-slate-800 pb-2" title="Автоматическое назначение источника маркетинга при добавлении родственников по реферальной программе">
				<div className="flex items-center space-x-2">
					<span className="text-xl">👨‍👩‍👧‍👦</span>
					<h3 className="font-semibold text-fuchsia-700 dark:text-fuchsia-400">
						Автоматический маркетинговый источник «Рекомендация Семьи»
					</h3>
				</div>
				<span className="text-xs bg-fuchsia-100 text-fuchsia-800 border border-fuchsia-300 dark:bg-fuchsia-950 dark:text-fuchsia-300 dark:border-fuchsia-800 px-2 py-0.5 rounded font-medium">
					Семейная рефералка
				</span>
			</div>

			{loading ? (
				<div className="text-slate-500 dark:text-slate-400 text-sm py-4">Загрузка источников семейных связей...</div>
			) : items.length === 0 ? (
				<div className="text-slate-500 dark:text-slate-400 text-sm py-3 text-center">
					Записи семейных рекомендаций отсутствуют
				</div>
			) : (
				<div className="space-y-3">
					{items.map((item) => (
						<div
							key={item.id}
							className="p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2"
						>
							<div>
								<div className="text-sm font-bold text-slate-900 dark:text-white">
									Группа: <span className="text-fuchsia-700 dark:text-fuchsia-300 font-semibold">{item.familyGroupName}</span>
								</div>
								<div className="text-xs text-slate-600 dark:text-slate-300 mt-1">
									Новый член: {item.newMemberName} (по рекомендации: {item.referrerMemberName})
								</div>
							</div>
							<div className="flex items-center space-x-2 text-xs">
								<span className="bg-fuchsia-100 text-fuchsia-800 border border-fuchsia-300 dark:bg-fuchsia-950 dark:text-fuchsia-300 dark:border-fuchsia-800 px-2.5 py-1 rounded font-mono">
									✓ {item.assignedMarketingSource}
								</span>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};

