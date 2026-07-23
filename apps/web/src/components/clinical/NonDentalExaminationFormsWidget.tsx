import React, { useEffect, useState } from "react";

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
			headers: { "x-organization-id": "00000000-0000-0000-0000-000000000001" },
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
			className="p-4 bg-slate-900 border border-indigo-500/30 rounded-xl text-slate-100 shadow-xl my-4"
		>
			<div className="flex items-center justify-between mb-3 border-b border-slate-700/60 pb-2">
				<div className="flex items-center space-x-2">
					<span className="text-xl">👂</span>
					<h3 className="font-semibold text-indigo-400">
						Случаи Обслуживания Без Выбора Зубов (ЛОР / Косметология)
					</h3>
				</div>
				<span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/40">
					Формы без одонтограммы ЕГИСЗ
				</span>
			</div>

			{loading ? (
				<div className="text-slate-400 text-sm py-4">Загрузка бланков приема...</div>
			) : (
				<div className="space-y-3">
					{forms.map((item) => (
						<div
							key={item.id}
							className="p-3 bg-slate-800/70 border border-slate-700/50 rounded-lg space-y-2"
						>
							<div className="flex justify-between items-center">
								<span className="text-sm font-bold text-slate-200">{item.patientName}</span>
								<span className="text-xs font-mono uppercase bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded border border-indigo-800">
									{item.specialtyType}
								</span>
							</div>
							<div className="text-xs text-slate-300 font-medium">{item.formName}</div>
							<div className="text-xs text-slate-400">
								Жалобы: <span className="text-slate-200">{item.complaints}</span> | Диагноз: <strong className="text-indigo-300">{item.diagnosisMkb}</strong>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
