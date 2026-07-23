import React, { useEffect, useState } from "react";
import { auth } from "../../AppHelpers";
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
			style={{ background: "var(--paper)", color: "var(--ink)", borderColor: "var(--line)" }}
		>
			<div className="flex items-center justify-between mb-3 pb-2 border-b" style={{ borderColor: "var(--line)" }}>
				<div className="flex items-center space-x-2">
					<FileText className="w-5 h-5 text-sky-500" />
					<h3 className="font-semibold text-sky-600 dark:text-sky-400">
						Поликлинические справочники осмотра (Форма 043/у)
					</h3>
				</div>
				<span className="text-xs px-2 py-0.5 rounded border bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800">
					Приказ 043/у Минздрава
				</span>
			</div>

			{loading ? (
				<div className="text-sm py-4" style={{ color: "var(--muted)" }}>
					Загрузка справочников осмотра...
				</div>
			) : catalogs.length === 0 ? (
				<div className="text-sm py-3 text-center" style={{ color: "var(--muted)" }}>
					Нет настраиваемых бланков осмотра.
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
					{catalogs.map((cat) => (
						<div
							key={cat.id}
							className="p-3 rounded-lg border space-y-2"
							style={{ background: "var(--glass-panel)", borderColor: "var(--line)" }}
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
							<div className="text-xs flex items-center justify-between pt-1 border-t" style={{ borderColor: "var(--line)", color: "var(--muted)" }}>
								<span>Полей протокола: <strong style={{ color: "var(--ink)" }}>{cat.customFieldCount}</strong></span>
								{cat.egiszUnified && (
									<span className="text-emerald-600 dark:text-emerald-400 text-[11px] flex items-center gap-1">
										<CheckCircle2 className="w-3 h-3 inline" /> ЕГИСЗ CDA R2
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
