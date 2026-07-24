import React, { useEffect, useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { ClipboardList } from "lucide-react";

interface NonDentalFormItem {
	id: string;
	organizationId: string;
	specialtyType: string;
	formName: string;
	patientName: string;
	complaints: string;
	objectiveStatus: string;
	diagnosisMkb: string;
	recommendations: string;
	createdAt: string;
}

export const NonDentalExaminationFormsWidget: React.FC = () => {
	const appLogic = useAppLogicContext();
	const auth = appLogic?.auth;
	const [forms, setForms] = useState<NonDentalFormItem[]>([]);
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		fetch("/api/clinical/non-dental-examination-forms", {
			headers: auth ? auth.denteClinicalReadHeaders() : { "x-organization-id": "00000000-0000-0000-0000-000000000001" },
		})
			.then((res) => res.json())
			.then((data) => {
				setForms(Array.isArray(data) ? data : []);
				setLoading(false);
			})
			.catch((err) => {
				console.error("[NonDentalExaminationFormsWidget fetch error]:", err);
				setLoading(false);
			});
	}, [auth]);

	return (
		<div
			data-testid="non-dental-examination-forms-widget"
			className="p-4 rounded-xl border my-4 shadow-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
		>
			<div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200 dark:border-slate-800">
				<div className="flex items-center space-x-2">
					<ClipboardList className="w-5 h-5 text-indigo-500" />
					<h3 className="font-semibold text-indigo-600 dark:text-indigo-400">
						Нестоматологические формы приёма (ЛОР, ЧЛХ, Офтальмология)
					</h3>
				</div>
				<span className="text-xs px-2 py-0.5 rounded border bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800 font-medium">
					Смежные специальности
				</span>
			</div>

			{loading ? (
				<div className="text-sm py-4 text-slate-500 dark:text-slate-400">
					Загрузка смежных протоколов осмотра...
				</div>
			) : forms.length === 0 ? (
				<div className="text-sm py-3 text-center text-slate-500 dark:text-slate-400">
					Сохранённые нестоматологические протоколы отсутствуют.
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
					{forms.map((item) => (
						<div
							key={item.id}
							className="p-3 rounded-lg border flex flex-col justify-between gap-1 bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700"
						>
							<div className="flex items-center justify-between">
								<span className="font-bold text-sm text-slate-900 dark:text-white">{item.patientName}</span>
								<span className="text-xs font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
									{item.specialtyType}
								</span>
							</div>
							<div className="text-xs text-slate-600 dark:text-slate-400">
								Форма: <span className="font-semibold text-slate-900 dark:text-slate-200">{item.formName}</span> ({item.diagnosisMkb})
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
