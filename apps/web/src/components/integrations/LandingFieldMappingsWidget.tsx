import React, { useEffect, useState } from "react";
import { auth } from "../../AppHelpers";

interface MappingItem {
	id: string;
	organizationId: string;
	landingPageTitle: string;
	webhookUrlSnippet: string;
	mappedFieldsCount: number;
	lastSubmissionAt: string;
	createdAt: string;
}

export const LandingFieldMappingsWidget: React.FC = () => {
	const [mappings, setMappings] = useState<MappingItem[]>([]);
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		fetch("/api/integrations/landing-field-mappings", {
			headers: auth.denteClinicalReadHeaders(),
		})
			.then((res) => res.json())
			.then((data) => {
				setMappings(Array.isArray(data) ? data : []);
				setLoading(false);
			})
			.catch((err) => {
				console.error("[LandingFieldMappingsWidget fetch error]:", err);
				setLoading(false);
			});
	}, []);

	return (
		<div
			data-testid="landing-field-mappings-widget"
			className="p-4 rounded-xl border my-4 shadow-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-800"
		>
			<div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200 dark:border-slate-800">
				<div className="flex items-center space-x-2">
					<span className="text-xl">🌐</span>
					<h3 className="font-semibold text-emerald-600 dark:text-emerald-400">
						Маппинг Полей Лендингов и Лид-Форм (Flexbe / Tilda / VK / Custom)
					</h3>
				</div>
				<span className="text-xs px-2 py-0.5 rounded border bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">
					Landing Webhook Mapper
				</span>
			</div>

			{loading ? (
				<div className="text-sm py-4 text-slate-500 dark:text-slate-400">
					Загрузка маппингов лендингов...
				</div>
			) : mappings.length === 0 ? (
				<div className="text-sm py-3 text-center text-slate-500 dark:text-slate-400">
					Сопоставления полей лендингов не настроены.
				</div>
			) : (
				<div className="space-y-3">
					{mappings.map((item) => (
						<div
							key={item.id}
							className="p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700"
						>
							<div>
								<div className="flex items-center space-x-2">
									<span className="text-sm font-bold text-slate-900 dark:text-white">{item.landingPageTitle}</span>
									<span className="text-xs font-mono text-emerald-600 dark:text-emerald-300 font-semibold">
										({item.mappedFieldsCount} полей)
									</span>
								</div>
								<div className="text-xs mt-1 text-slate-600 dark:text-slate-300">
									Webhook: <code className="text-slate-700 dark:text-slate-300 font-mono">{item.webhookUrlSnippet}</code>
								</div>
							</div>
							<div className="flex items-center space-x-2 text-xs">
								<span className="px-2 py-0.5 rounded border font-bold bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">
									✓ Активен
								</span>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
