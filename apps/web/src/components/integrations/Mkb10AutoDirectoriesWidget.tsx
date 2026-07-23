import React, { useEffect, useState } from "react";

interface Mkb10Item {
	id: string;
	organizationId: string;
	mkbCode: string;
	mkbTitle: string;
	boundTemplatePackage: string;
	autoUpdated: boolean;
	lastVersionDate: string;
	createdAt: string;
}

export const Mkb10AutoDirectoriesWidget: React.FC = () => {
	const [items, setItems] = useState<Mkb10Item[]>([]);
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		fetch("/api/integrations/mkb10-auto-directories", {
			headers: { "x-organization-id": "00000000-0000-0000-0000-000000000001" },
		})
			.then((res) => res.json())
			.then((data) => {
				setItems(Array.isArray(data) ? data : []);
				setLoading(false);
			})
			.catch((err) => {
				console.error("[Mkb10AutoDirectoriesWidget fetch error]:", err);
				setLoading(false);
			});
	}, []);

	return (
		<div
			data-testid="mkb10-auto-directories-widget"
			className="p-4 bg-slate-900 border border-blue-500/30 rounded-xl text-slate-100 shadow-xl my-4"
		>
			<div className="flex items-center justify-between mb-3 border-b border-slate-700/60 pb-2">
				<div className="flex items-center space-x-2">
					<span className="text-xl">📚</span>
					<h3 className="font-semibold text-blue-400">
						Авто-обновляемый Справочник МКБ-10 и Интерактивные Связи
					</h3>
				</div>
				<span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded border border-blue-500/40">
					МКБ-10 / ВОЗ 2026
				</span>
			</div>

			{loading ? (
				<div className="text-slate-400 text-sm py-4">Загрузка справочника МКБ-10...</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
					{items.map((item) => (
						<div
							key={item.id}
							className="p-3 bg-slate-800/70 border border-slate-700/50 rounded-lg space-y-2"
						>
							<div className="flex justify-between items-center">
								<span className="text-base font-extrabold text-blue-300 bg-blue-950 px-2 py-0.5 rounded border border-blue-800">
									{item.mkbCode}
								</span>
								{item.autoUpdated && (
									<span className="text-[10px] bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded">
										Auto-Sync 2026
									</span>
								)}
							</div>
							<div className="text-xs font-medium text-slate-200">{item.mkbTitle}</div>
							<div className="text-[11px] text-slate-400 font-mono pt-1 border-t border-slate-700/40">
								Пакет: <span className="text-blue-300">{item.boundTemplatePackage}</span>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
