import React, { useEffect, useState } from "react";
import { auth } from "../../AppHelpers";

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
	const [forms, setForms] = useState<NonDentalFormItem[]>([]);
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		fetch("/api/clinical/non-dental-examination-forms", {
			headers: auth.denteClinicalReadHeaders(),
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
	}, []);

	return (
		<div
			data-testid="non-dental-examination-forms-widget"
			className="p-4 rounded-xl border my-4 shadow-sm"
			style={{ background: "var(--paper, #ffffff)", color: "var(--ink, #0f172a)", borderColor: "var(--line, #e2e8f0)" }}
		>
			<div className="flex items-center justify-between mb-3 pb-2 border-b" style={{ borderColor: "var(--line, #e2e8f0)" }}>
				<div className="flex items-center space-x-2">
					<span className="text-xl">👂</span>
					<h3 className="font-semibold text-indigo-600 dark:text-indigo-400">
						Случаи Обслуживания Без Выбора Зубов (ЛОР / Косметология)
					</h3>
				</div>
				<span className="text-xs px-2 py-0.5 rounded border bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800">
					Формы без одонтограммы ЕГИСЗ
				</span>
			</div>

			{loading ? (
				<div className="text-sm py-4" style={{ color: "var(--muted, #64748b)" }}>
					Загрузка бланков приема...
				</div>
			) : forms.length === 0 ? (
				<div className="text-sm py-3 text-center" style={{ color: "var(--muted, #64748b)" }}>
					Нет не-стоматологических бланков осмотра.
				</div>
			) : (
				<div className="space-y-3">
					{forms.map((item) => (
						<div
							key={item.id}
							className="p-3 rounded-lg border space-y-2"
							style={{ background: "var(--surface-50, #f8fafc)", borderColor: "var(--line, #e2e8f0)" }}
						>
							<div className="flex justify-between items-center">
								<span className="text-sm font-bold">{item.patientName}</span>
								<span className="text-xs font-mono uppercase px-2 py-0.5 rounded border bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800">
									{item.specialtyType}
								</span>
							</div>
							<div className="text-xs font-medium">{item.formName}</div>
							<div className="text-xs" style={{ color: "var(--muted, #64748b)" }}>
								Жалобы: <span style={{ color: "var(--ink, #0f172a)" }}>{item.complaints}</span> | Диагноз: <strong className="text-indigo-600 dark:text-indigo-300">{item.diagnosisMkb}</strong>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
