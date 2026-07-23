import React, { useEffect, useState } from "react";
import { auth } from "../../AppHelpers";

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
			headers: auth.denteClinicalReadHeaders(),
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
			className="p-4 rounded-xl border my-4 shadow-sm"
			style={{ background: "var(--paper, #ffffff)", color: "var(--ink, #0f172a)", borderColor: "var(--line, #e2e8f0)" }}
		>
			<div className="flex items-center justify-between mb-3 pb-2 border-b" style={{ borderColor: "var(--line, #e2e8f0)" }}>
				<div className="flex items-center space-x-2">
					<span className="text-xl">📋</span>
					<h3 className="font-semibold text-sky-600 dark:text-sky-400">
						Пользовательские Справочники Бланков Осмотра (Форма 043/у)
					</h3>
				</div>
				<span className="text-xs px-2 py-0.5 rounded border bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800">
					Минздрав 043/у Унификация
				</span>
			</div>

			{loading ? (
				<div className="text-sm py-4" style={{ color: "var(--muted, #64748b)" }}>
					Загрузка справочников бланков...
				</div>
			) : catalogs.length === 0 ? (
				<div className="text-sm py-3 text-center" style={{ color: "var(--muted, #64748b)" }}>
					Нет настраиваемых бланков осмотра.
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
					{catalogs.map((cat) => (
						<div
							key={cat.id}
							className="p-3 rounded-lg border space-y-2"
							style={{ background: "var(--surface-50, #f8fafc)", borderColor: "var(--line, #e2e8f0)" }}
						>
							<div className="flex justify-between items-start">
								<span className="text-xs font-bold px-2 py-0.5 rounded border bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800">
									{cat.formCode}
								</span>
								<span className="text-xs px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
									{cat.status}
								</span>
							</div>
							<h4 className="text-sm font-medium leading-snug">{cat.formTitle}</h4>
							<div className="text-xs flex items-center justify-between pt-1 border-t" style={{ borderColor: "var(--line, #e2e8f0)", color: "var(--muted, #64748b)" }}>
								<span>Кастомных полей: <strong style={{ color: "var(--ink, #0f172a)" }}>{cat.customFieldCount}</strong></span>
								{cat.egiszUnified && (
									<span className="text-emerald-600 dark:text-emerald-400 text-[11px] flex items-center gap-1">
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
