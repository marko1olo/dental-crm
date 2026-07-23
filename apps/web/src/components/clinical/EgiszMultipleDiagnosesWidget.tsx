import React, { useEffect, useState } from "react";
import { auth } from "../../AppHelpers";

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
			style={{ background: "var(--paper, #ffffff)", color: "var(--ink, #0f172a)", borderColor: "var(--line, #e2e8f0)" }}
		>
			<div className="flex items-center justify-between mb-3 pb-2 border-b" style={{ borderColor: "var(--line, #e2e8f0)" }}>
				<div className="flex items-center space-x-2">
					<span className="text-xl">🩺</span>
					<h3 className="font-semibold text-teal-600 dark:text-teal-400">
						Передача в ЕГИСЗ Нескольких Диагнозов (Основной + Сопутствующие)
					</h3>
				</div>
				<span className="text-xs px-2 py-0.5 rounded border bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950 dark:text-teal-300 dark:border-teal-800">
					CDA R2 СЭМД
				</span>
			</div>

			{loading ? (
				<div className="text-sm py-4" style={{ color: "var(--muted, #64748b)" }}>
					Загрузка диагнозов ЕГИСЗ...
				</div>
			) : diagnoses.length === 0 ? (
				<div className="text-sm py-3 text-center" style={{ color: "var(--muted, #64748b)" }}>
					Нет диагнозов для передачи в ЕГИСЗ.
				</div>
			) : (
				<div className="space-y-3">
					{diagnoses.map((diag) => (
						<div
							key={diag.id}
							className="p-3 rounded-lg border space-y-2"
							style={{ background: "var(--surface-50, #f8fafc)", borderColor: "var(--line, #e2e8f0)" }}
						>
							<div className="flex justify-between items-center">
								<span className="text-sm font-bold">{diag.patientName}</span>
								<span className="text-xs px-2 py-0.5 rounded border font-mono bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-950 dark:text-teal-300 dark:border-teal-800">
									{diag.cdaValidationStatus}
								</span>
							</div>
							<div className="text-xs space-y-1">
								<div>
									<span style={{ color: "var(--muted, #64748b)" }}>Основной диагноз: </span>
									<span className="font-bold text-teal-600 dark:text-teal-300">{diag.mainDiagnosisMkb}</span> — {diag.mainDiagnosisName}
								</div>
								<div>
									<span style={{ color: "var(--muted, #64748b)" }}>Сопутствующие: </span>
									<span className="font-medium">{diag.accompanyingDiagnosesMkb}</span>
								</div>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
