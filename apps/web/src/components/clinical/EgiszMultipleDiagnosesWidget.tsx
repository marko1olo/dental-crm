import React, { useEffect, useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
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
	const appLogic = useAppLogicContext();
	const auth = appLogic?.auth;
	const [diagnoses, setDiagnoses] = useState<EgiszDiagnosisItem[]>([]);
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		fetch("/api/egisz/multiple-diagnoses", {
			headers: auth ? auth.denteClinicalReadHeaders() : { "x-organization-id": "00000000-0000-0000-0000-000000000001" },
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
	}, [auth]);

	return (
		<div
			data-testid="egisz-multiple-diagnoses-widget"
			className="p-4 rounded-xl border my-4 shadow-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
		>
			<div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200 dark:border-slate-800">
				<div className="flex items-center space-x-2">
					<Stethoscope className="w-5 h-5 text-emerald-500" />
					<h3 className="font-semibold text-emerald-600 dark:text-emerald-400">
						ЕГИСЗ МКБ-10: Множественные и сопутствующие диагнозы
					</h3>
				</div>
				<span className="text-xs px-2 py-0.5 rounded border bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800 font-medium">
					СЭМД CDA
				</span>
			</div>

			{loading ? (
				<div className="text-sm py-4 text-slate-500 dark:text-slate-400">
					Загрузка реестра диагнозов МКБ-10...
				</div>
			) : diagnoses.length === 0 ? (
				<div className="text-sm py-3 text-center text-slate-500 dark:text-slate-400">
					Сопутствующие диагнозы МКБ-10 не зафиксированы.
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
					{diagnoses.map((item) => (
						<div
							key={item.id}
							className="p-3 rounded-lg border flex flex-col justify-between gap-1 bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700"
						>
							<div className="flex items-center justify-between">
								<span className="font-bold text-sm text-slate-900 dark:text-white">{item.patientName}</span>
								<span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
									<CheckCircle2 className="w-3 h-3" /> {item.mainDiagnosisMkb}
								</span>
							</div>
							<div className="text-xs text-slate-600 dark:text-slate-400">
								Основной: <span className="font-semibold text-slate-900 dark:text-slate-200">{item.mainDiagnosisName}</span> · Сопутствующие: {item.accompanyingDiagnosesMkb}
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
