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
			className="p-4 rounded-xl border my-4 shadow-sm"
			style={{ background: "var(--paper)", color: "var(--ink)", borderColor: "var(--line)" }}
		>
			<div className="flex items-center justify-between mb-3 pb-2 border-b" style={{ borderColor: "var(--line)" }}>
				<div className="flex items-center space-x-2">
					<ClipboardList className="w-5 h-5 text-indigo-500" />
					<h3 className="font-semibold text-indigo-600 dark:text-indigo-400">
						Нестоматологические формы приёма (ЛОР, ЧЛХ, Офтальмология)
					</h3>
				</div>
				<span className="text-xs px-2 py-0.5 rounded border bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800">
					Смежные специальности
				</span>
			</div>

			{loading ? (
				<div className="text-sm py-4" style={{ color: "var(--muted)" }}>
					Загрузка смежных протоколов осмотра...
				</div>
			) : forms.length === 0 ? (
				<div className="text-sm py-3 text-center" style={{ color: "var(--muted)" }}>
					Сохранённые нестоматологические протоколы отсутствуют.
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
					{forms.map((item) => (
						<div
							key={item.id}
							className="p-3 rounded-lg border flex flex-col justify-between gap-1"
							style={{ background: "var(--glass-panel)", borderColor: "var(--line)" }}
						>
							<div className="flex items-center justify-between">
								<span className="font-bold text-sm">{item.patientName}</span>
								<span className="text-xs font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
									{item.specialtyType}
								</span>
							</div>
							<div className="text-xs" style={{ color: "var(--muted)" }}>
								Форма: <span style={{ color: "var(--ink)" }}>{item.formName}</span> ({item.diagnosisMkb})
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
