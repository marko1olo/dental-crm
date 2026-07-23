import React, { useEffect, useState } from "react";
import { auth } from "../../AppHelpers";
import { Stethoscope, CheckCircle2 } from "lucide-react";

interface EgiszDiagnosisItem {
	id: string;
	organizationId: string;
	patientName: string;
	mainDiagnosisMkb: string;
	mainDiagnosisName: string;
	accompanyingDiagnosesMkb: string;
	cdaValidationStatus: string;
	createdAt: string;
}

export const EgiszMultipleDiagnosesWidget: React.FC = () => {
	const [diagnoses, setDiagnoses] = useState<EgiszDiagnosisItem[]>([]);
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		fetch("/api/egisz/multiple-diagnoses", {
			headers: auth.denteClinicalReadHeaders(),
		})
			.then((res) => res.json())
			.then((data) => {
				setDiagnoses(Array.isArray(data) ? data : []);
				setLoading(false);
			})
			.catch((err) => {
				console.error("[EgiszMultipleDiagnosesWidget fetch error]:", err);
				setLoading(false);
			});
	}, []);

	return (
		<div
			data-testid="egisz-multiple-diagnoses-widget"
			className="p-4 rounded-xl border my-4 shadow-sm"
			style={{ background: "var(--paper)", color: "var(--ink)", borderColor: "var(--line)" }}
		>
			<div className="flex items-center justify-between mb-3 pb-2 border-b" style={{ borderColor: "var(--line)" }}>
				<div className="flex items-center space-x-2">
					<Stethoscope className="w-5 h-5 text-indigo-500" />
					<h3 className="font-semibold text-indigo-600 dark:text-indigo-400">
						Множественные диагнозы ЕГИСЗ (МКБ-10 / СЭМД)
					</h3>
				</div>
				<span className="text-xs px-2 py-0.5 rounded border bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800">
					Валидация СЭМД CDA R2
				</span>
			</div>

			{loading ? (
				<div className="text-sm py-4" style={{ color: "var(--muted)" }}>
					Загрузка диагнозов ЕГИСЗ...
				</div>
			) : diagnoses.length === 0 ? (
				<div className="text-sm py-3 text-center" style={{ color: "var(--muted)" }}>
					Записи сопутствующих диагнозов отсутствуют.
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
					{diagnoses.map((diag) => (
						<div
							key={diag.id}
							className="p-3 rounded-lg border space-y-2"
							style={{ background: "var(--glass-panel)", borderColor: "var(--line)" }}
						>
							<div className="flex justify-between items-start">
								<span className="text-xs font-bold px-2 py-0.5 rounded border bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800">
									МКБ {diag.mainDiagnosisMkb}
								</span>
								<span className="text-xs px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
									{diag.cdaValidationStatus}
								</span>
							</div>
							<h4 className="text-sm font-medium leading-snug">{diag.mainDiagnosisName}</h4>
							{diag.accompanyingDiagnosesMkb && (
								<p className="text-xs" style={{ color: "var(--muted)" }}>
									Сопутствующие: <strong>{diag.accompanyingDiagnosesMkb}</strong>
								</p>
							)}
						</div>
					))}
				</div>
			)}
		</div>
	);
};
