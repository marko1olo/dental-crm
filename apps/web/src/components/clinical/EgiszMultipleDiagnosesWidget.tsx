import React, { useEffect, useState } from "react";

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
			headers: { "x-organization-id": "00000000-0000-0000-0000-000000000001" },
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
			className="p-4 bg-slate-900 border border-teal-500/30 rounded-xl text-slate-100 shadow-xl my-4"
		>
			<div className="flex items-center justify-between mb-3 border-b border-slate-700/60 pb-2">
				<div className="flex items-center space-x-2">
					<span className="text-xl">🩺</span>
					<h3 className="font-semibold text-teal-400">
						Передача в ЕГИСЗ Нескольких Диагнозов (Основной + Сопутствующие)
					</h3>
				</div>
				<span className="text-xs bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded border border-teal-500/40">
					CDA R2 СЭМД
				</span>
			</div>

			{loading ? (
				<div className="text-slate-400 text-sm py-4">Загрузка диагнозов ЕГИСЗ...</div>
			) : (
				<div className="space-y-3">
					{diagnoses.map((diag) => (
						<div
							key={diag.id}
							className="p-3 bg-slate-800/70 border border-slate-700/50 rounded-lg space-y-2"
						>
							<div className="flex justify-between items-center">
								<span className="text-sm font-bold text-slate-200">{diag.patientName}</span>
								<span className="text-xs bg-teal-950 text-teal-300 px-2 py-0.5 rounded border border-teal-800 font-mono">
									{diag.cdaValidationStatus}
								</span>
							</div>
							<div className="text-xs space-y-1">
								<div>
									<span className="text-slate-400">Основной диагноз: </span>
									<span className="font-bold text-teal-300">{diag.mainDiagnosisMkb}</span> — {diag.mainDiagnosisName}
								</div>
								<div>
									<span className="text-slate-400">Сопутствующие: </span>
									<span className="text-slate-300 font-medium">{diag.accompanyingDiagnosesMkb}</span>
								</div>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
