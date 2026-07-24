import React, { useEffect, useState } from "react";

interface FormCatalogItem {
	id: string;
	organizationId: string;
	formCode: string;
	formTitle: string;
	customFieldCount: number;
	egiszUnified: boolean;
	status: string;
	createdAt: string;
}

export const CustomExaminationFormCatalogsWidget: React.FC = () => {
	const [catalogs, setCatalogs] = useState<FormCatalogItem[]>([]);
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		fetch("/api/clinical/custom-examination-form-catalogs", {
			headers: { "x-organization-id": "00000000-0000-0000-0000-000000000001" },
		})
			.then((res) => res.json())
			.then((data) => {
				setCatalogs(Array.isArray(data) ? data : []);
				setLoading(false);
			})
			.catch((err) => {
				console.error("[CustomExaminationFormCatalogsWidget fetch error]:", err);
				setLoading(false);
			});
	}, []);

	return (
		<div
			data-testid="custom-examination-form-catalogs-widget"
			className="p-4 bg-slate-900 border border-sky-500/30 rounded-xl text-slate-100 shadow-xl my-4"
		>
			<div className="flex items-center justify-between mb-3 border-b border-slate-700/60 pb-2">
				<div className="flex items-center space-x-2">
					<span className="text-xl">📋</span>
					<h3 className="font-semibold text-sky-400">
						Пользовательские Справочники Бланков Осмотра (Форма 043/у)
					</h3>
				</div>
				<span className="text-xs bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded border border-sky-500/40">
					Минздрав 043/у Унификация
				</span>
			</div>

			{loading ? (
				<div className="text-slate-400 text-sm py-4">Загрузка справочников бланков...</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
					{catalogs.map((cat) => (
						<div
							key={cat.id}
							className="p-3 bg-slate-800/70 border border-slate-700/50 rounded-lg space-y-2"
						>
							<div className="flex justify-between items-start">
								<span className="text-xs font-bold text-sky-300 bg-sky-950 px-2 py-0.5 rounded border border-sky-800">
									{cat.formCode}
								</span>
								<span className="text-xs text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded">
									{cat.status}
								</span>
							</div>
							<h4 className="text-sm font-medium text-slate-200 leading-snug">{cat.formTitle}</h4>
							<div className="text-xs text-slate-400 flex items-center justify-between pt-1 border-t border-slate-700/40">
								<span>Кастомных полей: <strong className="text-slate-200">{cat.customFieldCount}</strong></span>
								{cat.egiszUnified && (
									<span className="text-emerald-400 text-[11px] flex items-center gap-1">
										✓ ЕГИСЗ CDA R2
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
