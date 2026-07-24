import React, { useEffect, useState } from "react";

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
	const [items, setItems] = useState<FamilySourceItem[]>([]);
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		fetch("/api/marketing/family-recommendation-sources", {
			headers: { "x-organization-id": "00000000-0000-0000-0000-000000000001" },
		})
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
			className="p-4 bg-slate-900 border border-fuchsia-500/30 rounded-xl text-slate-100 shadow-xl my-4"
		>
			<div className="flex items-center justify-between mb-3 border-b border-slate-700/60 pb-2">
				<div className="flex items-center space-x-2">
					<span className="text-xl">👨‍👩‍👧‍👦</span>
					<h3 className="font-semibold text-fuchsia-400">
						Автоматический Маркетинговый Источник «Рекомендация Семьи»
					</h3>
				</div>
				<span className="text-xs bg-fuchsia-500/20 text-fuchsia-300 px-2 py-0.5 rounded border border-fuchsia-500/40">
					Family Referral AI
				</span>
			</div>

			{loading ? (
				<div className="text-slate-400 text-sm py-4">Загрузка источников семейных связей...</div>
			) : (
				<div className="space-y-3">
					{items.map((item) => (
						<div
							key={item.id}
							className="p-3 bg-slate-800/70 border border-slate-700/50 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2"
						>
							<div>
								<div className="text-sm font-bold text-slate-200">
									Группа: <span className="text-fuchsia-300 font-semibold">{item.familyGroupName}</span>
								</div>
								<div className="text-xs text-slate-300 mt-1">
									Новый член: {item.newMemberName} (по рекомендации: {item.referrerMemberName})
								</div>
							</div>
							<div className="flex items-center space-x-2 text-xs">
								<span className="bg-fuchsia-950 text-fuchsia-300 px-2.5 py-1 rounded border border-fuchsia-800 font-mono">
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
