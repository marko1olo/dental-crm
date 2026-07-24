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
	const { auth } = useAppLogicContext();
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
	}, [auth]);

	return (
		<div
			data-testid="non-dental-examination-forms-widget"
			className="p-4 rounded-xl border my-4 shadow-sm"
			style={{ background: "var(--paper)", color: "var(--ink)", borderColor: "var(--line)" }}
		>
			<div className="flex items-center justify-between mb-3 pb-2 border-b" style={{ borderColor: "var(--line)" }}>
				<div className="flex items-center space-x-2">
					<ClipboardList className="w-5 h-5 text-purple-500" />
					<h3 className="font-semibold text-purple-600 dark:text-purple-400">
						Смежные протоколы осмотра (Челюстно-лицевая хирургия / Оториноларингология)
					</h3>
				</div>
				<span className="text-xs px-2 py-0.5 rounded border bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800">
					ЧЛХ & ЛОР протоколы
				</span>
			</div>

			{loading ? (
				<div className="text-sm py-4" style={{ color: "var(--muted)" }}>
					Загрузка сопутствующих протоколов...
				</div>
			) : forms.length === 0 ? (
				<div className="text-sm py-3 text-center" style={{ color: "var(--muted)" }}>
					Протоколы смежных специалистов отсутствуют.
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
					{forms.map((item) => (
						<div
							key={item.id}
							className="p-3 rounded-lg border space-y-2"
							style={{ background: "var(--glass-panel)", borderColor: "var(--line)" }}
						>
							<div className="flex justify-between items-start">
								<span className="text-xs font-bold px-2 py-0.5 rounded border bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800">
									{item.specialtyType}
								</span>
								<span className="text-xs text-slate-500 dark:text-slate-400">
									МКБ: {item.diagnosisMkb}
								</span>
							</div>
							<h4 className="text-sm font-medium leading-snug">{item.formName}</h4>
							<p className="text-xs" style={{ color: "var(--muted)" }}>
								Пациент: <strong style={{ color: "var(--ink)" }}>{item.patientName}</strong>
							</p>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
