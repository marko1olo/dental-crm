import type { Dashboard, Patient } from "@dental/shared";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Search } from "lucide-react";
import { usePatientStore } from "../../store/patientStore";

type PatientInsight = Dashboard["patientInsights"][number];

export type PatientsSidebarProps = {
	filteredPatients: Patient[];
	patientInsightById: Map<string, PatientInsight>;
	selectedPatient: Patient | null | undefined;
	patientInsightRiskLabels: Record<PatientInsight["riskLevel"], string>;
	money: (amountRub: number) => string;
};

export function PatientsSidebar({
	filteredPatients,
	patientInsightById,
	selectedPatient,
	patientInsightRiskLabels,
	money,
}: PatientsSidebarProps) {
	const { setSelectedPatientId } = usePatientStore();

	return (
		<aside className="patients-sidebar-column">
			<div className="patient-list">
				<AnimatePresence mode="popLayout">
					{filteredPatients.map((patient) => {
						const insight = patientInsightById.get(patient.id);
						const patientIsSelected = selectedPatient?.id === patient.id;
						return (
							<motion.article
								layout
								initial={{ opacity: 0, y: 10 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, scale: 0.95 }}
								transition={{ type: "spring", stiffness: 300, damping: 25 }}
								className={`patient-row ${insight ? `risk-${insight.riskLevel}` : ""} ${patientIsSelected ? "selected" : ""}`}
								key={patient.id}
							>
								<div>
									<h3>{patient.fullName}</h3>
									<p>{patient.phone ?? "телефон не указан"}</p>
									{insight ? (
										<div className="patient-row-meta">
											<span>{patientInsightRiskLabels[insight.riskLevel]}</span>
											<strong className="patient-next-action">
												{insight.nextBestAction}
											</strong>
											{insight.balanceDueRub ? (
												<span>{money(insight.balanceDueRub)}</span>
											) : null}
										</div>
									) : null}
								</div>
								<button
									aria-label={`Открыть карточку пациента: ${patient.fullName}`}
									aria-pressed={patientIsSelected}
									className="round-link"
									type="button"
									title={`Открыть карточку пациента: ${patient.fullName}`}
									onClick={() => setSelectedPatientId(patient.id)}
								>
									<ArrowRight aria-hidden="true" />
								</button>
							</motion.article>
						);
					})}
				</AnimatePresence>
				{filteredPatients.length === 0 ? (
					<article className="patient-empty-state">
						<Search aria-hidden="true" />
						<div>
							<strong>Пациент не найден</strong>
							<p>
								Проверьте ФИО или телефон. Если это новый пациент, заполните
								строку выше и нажмите «Создать».
							</p>
						</div>
					</article>
				) : null}
			</div>
		</aside>
	);
}
