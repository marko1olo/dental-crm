import React, { useEffect, useState } from "react";

interface TemplateItem {
	id: string;
	organizationId: string;
	templateName: string;
	channelType: string;
	bodyText: string;
	dynamicTags: string;
	isDefault: boolean;
	createdAt: string;
}

export const MessageTemplateCatalogsWidget: React.FC = () => {
	const [templates, setTemplates] = useState<TemplateItem[]>([]);
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		fetch("/api/communications/message-template-catalogs", {
			headers: { "x-organization-id": "00000000-0000-0000-0000-000000000001" },
		})
			.then((res) => res.json())
			.then((data) => {
				setTemplates(Array.isArray(data) ? data : []);
				setLoading(false);
			})
			.catch((err) => {
				console.error("[MessageTemplateCatalogsWidget fetch error]:", err);
				setLoading(false);
			});
	}, []);

	return (
		<div
			data-testid="message-template-catalogs-widget"
			className="p-4 bg-slate-900 border border-fuchsia-500/30 rounded-xl text-slate-100 shadow-xl my-4"
		>
			<div className="flex items-center justify-between mb-3 border-b border-slate-700/60 pb-2">
				<div className="flex items-center space-x-2">
					<span className="text-xl">📝</span>
					<h3 className="font-semibold text-fuchsia-400">
						Справочник Шаблонов Сообщений с Динамическими Тегами и Эмодзи
					</h3>
				</div>
				<span className="text-xs bg-fuchsia-500/20 text-fuchsia-300 px-2 py-0.5 rounded border border-fuchsia-500/40">
					Template Directory
				</span>
			</div>

			{loading ? (
				<div className="text-slate-400 text-sm py-4">Загрузка шаблонов сообщений...</div>
			) : (
				<div className="space-y-3">
					{templates.map((item) => (
						<div
							key={item.id}
							className="p-3 bg-slate-800/70 border border-slate-700/50 rounded-lg flex flex-col gap-2"
						>
							<div className="flex items-center justify-between">
								<div className="text-sm font-bold text-slate-200">{item.templateName}</div>
								<span className="text-xs bg-fuchsia-950 text-fuchsia-300 px-2 py-0.5 rounded border border-fuchsia-800 font-mono">
									{item.channelType}
								</span>
							</div>
							<div className="text-xs text-slate-300 bg-slate-900/80 p-2 rounded border border-slate-700/60 font-mono">
								"{item.bodyText}"
							</div>
							<div className="text-xs text-slate-400">
								Теги: <span className="text-fuchsia-300 font-mono">{item.dynamicTags}</span>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
