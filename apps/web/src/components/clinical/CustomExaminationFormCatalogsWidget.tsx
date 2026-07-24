import React, { useEffect, useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { FileText, CheckCircle2 } from "lucide-react";

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
	const appLogic = useAppLogicContext();
	const auth = appLogic?.auth;
	const [catalogs, setCatalogs] = useState<FormCatalogItem[]>([]);
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		fetch("/api/clinical/custom-examination-form-catalogs", {
			headers: auth ? auth.denteClinicalReadHeaders() : { "x-organization-id": "00000000-0000-0000-0000-000000000001" },
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
	}, [auth]);

	return (
		<div
			data-testid="custom-examination-form-catalogs-widget"
			className="p-4 rounded-xl border my-4 shadow-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
		>
			<div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200 dark:border-slate-800">
				<div className="flex items-center space-x-2">
					<FileText className="w-5 h-5 text-sky-500" />
					<h3 className="font-semibold text-sky-600 dark:text-sky-400">
						Конструктор пользовательских форм осмотра врача
					</h3>
				</div>
				<span className="text-xs px-2 py-0.5 rounded border bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800 font-medium">
					Каталог бланков
				</span>
			</div>

			{loading ? (
				<div className="text-sm py-4 text-slate-500 dark:text-slate-400">
					Загрузка шаблонов форм...
				</div>
			) : catalogs.length === 0 ? (
				<div className="text-sm py-3 text-center text-slate-500 dark:text-slate-400">
					Пользовательские шаблоны форм осмотра отсутствуют.
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
					{catalogs.map((item) => (
						<div
							key={item.id}
							className="p-3 rounded-lg border flex flex-col justify-between gap-1 bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700"
						>
							<div className="flex items-center justify-between">
								<span className="font-bold text-sm text-slate-900 dark:text-white">{item.formTitle}</span>
								<span className="text-xs font-mono text-sky-600 dark:text-sky-400 font-semibold flex items-center gap-1">
									<CheckCircle2 className="w-3 h-3" /> {item.formCode}
								</span>
							</div>
							<div className="text-xs text-slate-600 dark:text-slate-400">
								Кастомных полей: <span className="font-semibold text-slate-900 dark:text-slate-200">{item.customFieldCount}</span> · ЕГИСЗ унификация: {item.egiszUnified ? "Да" : "Нет"}
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
