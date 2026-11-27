import { generateQrCodeSvg } from "@dental/shared";
import { Check, X, Zap } from "lucide-react";
import React from "react";
import { InformedConsentModal } from "../../documents/DocumentsStudioModal";
import { MedicalRecordStudioModal } from "../../emr/MedicalRecordStudioModal";
import { showToast } from "../../GlobalToast";
import { ClinicalProtocolsCatalogModal } from "../clinicalCatalog/ClinicalProtocolsCatalogModal";
import { appendClinicalText } from "../emk";
import type { VisitEmkModalsProps } from "./types";

export function VisitEmkModals({
	isSbpQrModalOpen,
	setIsSbpQrModalOpen,
	completionResult,
	activePatient,
	activeDoctor,
	isStarProtocolsOpen,
	setIsStarProtocolsOpen,
	isSoapTemplatesModalOpen,
	setIsSoapTemplatesModalOpen,
	isConsentModalOpen,
	setIsConsentModalOpen,
	isPrintModalOpen,
	setIsPrintModalOpen,
	visitNoteForm,
	updateVisitNoteField,
	isSignedVisit,
	dashboard,
	onApplyCatalogPatch,
}: VisitEmkModalsProps) {
	const totalNetRub = completionResult?.totalNetRub ?? 0;
	const receiptNumber = completionResult?.receiptNumber ?? "00001";
	const patientName = activePatient?.fullName ?? "Пациент";
	const doctorFullName =
		activeDoctor?.fullName || dashboard?.activeDoctor?.fullName || "Лечащий врач";
	const doctorSpecialty =
		activeDoctor?.specialty || dashboard?.activeDoctor?.specialty || "Стоматолог-терапевт";

	const sbpPayloadUrl = completionResult?.sbpQrPayload || "";
	const sbpQrSvg = React.useMemo(() => {
		if (!sbpPayloadUrl) return "";
		return generateQrCodeSvg(sbpPayloadUrl, { size: 200 });
	}, [sbpPayloadUrl]);

	return (
		<>
			{/* Окно оплаты по СБП QR (Мандаты 8d, 8e) */}
			{isSbpQrModalOpen && completionResult && (
				<div
					className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-150"
					style={{ backgroundColor: "rgba(15, 23, 42, 0.65)" }}
					role="dialog"
					aria-modal="true"
					aria-labelledby="sbp-qr-modal-title"
				>
					<div className="bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4 text-center">
						<div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
							<div className="flex items-center gap-2 text-[var(--ok-fg)] font-extrabold text-sm sm:text-base">
								<Zap className="w-4 h-4" />
								<h3 id="sbp-qr-modal-title" className="m-0 text-base font-extrabold text-[var(--ink)]">
									Оплата через СБП (QR-код)
								</h3>
							</div>
							<button
								type="button"
								onClick={() => setIsSbpQrModalOpen(false)}
								className="w-8 h-8 rounded-lg hover:bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] flex items-center justify-center cursor-pointer"
								aria-label="Закрыть окно оплаты СБП"
							>
								<X size={18} />
							</button>
						</div>

						<div className="p-3 rounded-xl bg-[var(--ok-bg)] border border-[var(--ok-fg)]/30 text-xs text-[var(--ok-fg)] font-medium">
							Пациент сканирует QR-код камерой смартфона или в приложении любого банка РФ (0% комиссии)
						</div>

						<div className="flex flex-col items-center justify-center gap-2.5">
							<div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--ok-bg)] border border-[var(--ok-fg)]/30 text-xs font-bold text-[var(--ok-fg)]">
								<Zap className="w-3.5 h-3.5 shrink-0" />
								<span>СБП • НСПК ГОСТ Р 56042</span>
							</div>

							<div
								className="flex items-center justify-center p-3 bg-white rounded-2xl border-2 border-slate-200 shadow-inner w-56 h-56 mx-auto"
								data-testid="sbp-qr-svg-container"
							>
								{sbpQrSvg ? (
									<div className="w-full h-full flex items-center justify-center">
										<img
											src={`data:image/svg+xml;utf8,${encodeURIComponent(sbpQrSvg)}`}
											alt="QR-код оплаты СБП"
											className="w-full h-full object-contain"
										/>
									</div>
								) : (
									<div className="text-xs text-slate-500 font-medium p-4 flex flex-col items-center justify-center gap-1">
										<Zap className="w-6 h-6 text-teal-600 mb-1" />
										<span>QR-код формируется платёжным шлюзом</span>
										<span className="text-[10px] text-slate-400">Перейдите в кассу для чекаута</span>
									</div>
								)}
							</div>
						</div>

						<div className="space-y-1">
							<div className="text-xs text-[var(--muted)]">Сумма к оплате:</div>
							<div className="text-2xl font-black text-[var(--ok-fg)] font-mono">
								{totalNetRub.toLocaleString("ru-RU")} ₽
							</div>
							<div className="text-[11px] text-[var(--muted)]">
								{receiptNumber} • {patientName}
							</div>
						</div>

						<div className="pt-3 border-t border-[var(--line)] flex gap-2">
							<button
								type="button"
								onClick={() => {
									setIsSbpQrModalOpen(false);
									if (typeof window !== "undefined") {
										window.dispatchEvent(
											new CustomEvent("dente:open-cashbox", {
												detail: {
													mode: "checkout",
													amountRub: totalNetRub,
													patientId: activePatient?.id,
													patientName: patientName,
													patientPhone: activePatient?.phone ?? undefined,
												},
											}),
										);
									}
									showToast("Переход в кассовую студию для чекаута", "info", 3000);
								}}
								className="flex-1 min-h-[48px] px-4 py-2.5 rounded-xl text-sm font-extrabold bg-[var(--ok-fg)] hover:opacity-90 text-white transition-all cursor-pointer flex items-center justify-center gap-1.5"
								data-testid="btn-confirm-sbp-paid"
							>
								<Check size={16} className="shrink-0" />
								<span>Подтвердить оплату в кассе</span>
							</button>
							<button
								type="button"
								onClick={() => setIsSbpQrModalOpen(false)}
								className="min-h-[48px] px-4 py-2.5 rounded-xl text-sm font-bold bg-[var(--paper-soft)] hover:bg-[var(--paper-strong)] border border-[var(--line)] text-[var(--ink)] transition-colors cursor-pointer"
							>
								Закрыть
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Полный промышленный каталог клинических протоколов (1 142 шаблона) */}
			<ClinicalProtocolsCatalogModal
				key={activePatient?.id || "clinical_protocols_catalog"}
				isOpen={isSoapTemplatesModalOpen || isStarProtocolsOpen}
				onClose={() => {
					setIsSoapTemplatesModalOpen(false);
					setIsStarProtocolsOpen(false);
				}}
				activeTooth={Number(dashboard?.activeVisit?.diagnosisTooth) || 16}
				currentNoteForm={visitNoteForm}
				onApplyPatch={onApplyCatalogPatch}
				initialSpecialty={
					dashboard?.activeVisit?.specialty === "surgery"
						? "surgery"
						: dashboard?.activeVisit?.specialty === "orthopedics"
							? "orthopedics"
							: dashboard?.activeVisit?.specialty === "periodontics"
								? "periodontics"
								: dashboard?.activeVisit?.specialty === "pediatric"
									? "pediatric"
									: "all"
				}
			/>

			{/* Информированное добровольное согласие (ИДС) */}
			<InformedConsentModal
				key={activePatient?.id || "informed_consent"}
				isOpen={isConsentModalOpen}
				onClose={() => setIsConsentModalOpen(false)}
				patientId={activePatient?.id}
				visitId={dashboard?.activeVisit?.id ?? undefined}
				patient={
					activePatient
						? {
								id: activePatient.id || undefined,
								fullName: activePatient.fullName || undefined,
								birthDate: activePatient.birthDate ?? undefined,
								passport:
									typeof (activePatient as Record<string, unknown>).passport === "string"
										? ((activePatient as Record<string, unknown>).passport as string)
										: undefined,
								phone: activePatient.phone ?? undefined,
								snils:
									typeof (activePatient as Record<string, unknown>).snils === "string"
										? ((activePatient as Record<string, unknown>).snils as string)
										: undefined,
								address: activePatient.address ?? undefined,
								cardNumber:
									(typeof (activePatient as Record<string, unknown>).medicalCardNumber === "string" &&
										((activePatient as Record<string, unknown>).medicalCardNumber as string)) ||
									(typeof (activePatient as Record<string, unknown>).cardNumber === "string" &&
										((activePatient as Record<string, unknown>).cardNumber as string)) ||
									activePatient.id ||
									undefined,
							}
						: undefined
				}
				doctorName={doctorFullName}
				doctorSpecialty={doctorSpecialty}
				diagnosisIcd={
					typeof visitNoteForm?.diagnosis === "string" && visitNoteForm.diagnosis
						? visitNoteForm.diagnosis.split(" ")[0]
						: undefined
				}
				toothNumbers={
					dashboard?.activeVisit?.diagnosisTooth != null
						? String(dashboard.activeVisit.diagnosisTooth)
						: undefined
				}
				isLocked={isSignedVisit}
				isSigned={isSignedVisit}
				status={isSignedVisit ? "signed" : "draft"}
				onConsentConfirmed={(payload) => {
					showToast(
						`ИДС «${payload.intervention || payload.consentType}» подтверждено`,
						"success",
						3000,
					);
					setIsConsentModalOpen(false);
				}}
			/>

			{/* Интерактивное модальное окно медицинской карты */}
			<MedicalRecordStudioModal
				key={activePatient?.id || "empty-patient"}
				isOpen={isPrintModalOpen}
				onClose={() => setIsPrintModalOpen(false)}
				visitId={dashboard?.activeVisit?.id ?? undefined}
				patientId={activePatient?.id}
				onSave={async (updatedCard) => {
					const primaryDiary = updatedCard.visitDiaries?.[0];
					const complaint = updatedCard.anamnesis?.chiefComplaint || primaryDiary?.subjectiveComplaints;
					const anamnesis = updatedCard.anamnesis?.historyOfPresentIllness;
					const statusLocalis = primaryDiary?.objectiveStatusLocalis;
					const diagnosis = updatedCard.passport?.primaryDiagnosisText || primaryDiary?.assessmentDiagnosisText;
					const treatmentPlan = updatedCard.generalTreatmentPlan || primaryDiary?.procedureProtocol;
					const recommendations = primaryDiary?.homeCareRecommendations;

					if (typeof complaint === "string" && complaint) updateVisitNoteField("complaint", complaint);
					if (typeof anamnesis === "string" && anamnesis) updateVisitNoteField("anamnesis", anamnesis);
					if (typeof statusLocalis === "string" && statusLocalis) updateVisitNoteField("objectiveStatus", statusLocalis);
					if (typeof diagnosis === "string" && diagnosis) updateVisitNoteField("diagnosis", diagnosis);
					if (typeof treatmentPlan === "string" && treatmentPlan) updateVisitNoteField("treatmentPlan", treatmentPlan);
					if (typeof recommendations === "string" && recommendations) updateVisitNoteField("recommendations", recommendations);

					showToast("Медицинская карта приёма синхронизирована с приёмом", "success", 3000);
				}}
				initialData={{
					...(activePatient
						? {
								passport: {
									patientFullName: activePatient.fullName || "",
									patientBirthDate: activePatient.birthDate || "",
									medicalCardNumber:
										(typeof (activePatient as Record<string, unknown>).medicalCardNumber === "string" &&
											((activePatient as Record<string, unknown>).medicalCardNumber as string)) ||
										(typeof (activePatient as Record<string, unknown>).cardNumber === "string" &&
											((activePatient as Record<string, unknown>).cardNumber as string)) ||
										activePatient.id ||
										"",
									patientPhone: activePatient.phone || "",
									primaryDiagnosisText:
										typeof visitNoteForm?.diagnosis === "string"
											? visitNoteForm.diagnosis
											: "",
									primaryDiagnosisIcd10:
										typeof visitNoteForm?.diagnosis === "string" && visitNoteForm.diagnosis
											? visitNoteForm.diagnosis.split(" ")[0] ?? ""
											: "",
									attendingDoctorFullName: doctorFullName,
									attendingDoctorSpecialty: doctorSpecialty,
								},
						  }
						: {}),
					anamnesis: {
						chiefComplaint:
							typeof visitNoteForm?.complaint === "string" && visitNoteForm.complaint
								? visitNoteForm.complaint
								: typeof visitNoteForm?.complaints === "string" && visitNoteForm.complaints
									? visitNoteForm.complaints
									: "",
						historyOfPresentIllness:
							typeof visitNoteForm?.anamnesis === "string" ? visitNoteForm.anamnesis : "",
						medicalHistoryVitae: "",
						allergologicalHistory: "",
						concomitantSomaticDiseases: "",
						currentSystemicMedications: "",
						pregnancyLactationStatus: "",
						pastDentalInterventions: "",
						occupationalHazardsAndHabits: "",
					},
					generalTreatmentPlan:
						typeof visitNoteForm?.treatmentPlan === "string" && visitNoteForm.treatmentPlan
							? visitNoteForm.treatmentPlan
							: typeof visitNoteForm?.treatment === "string" && visitNoteForm.treatment
								? visitNoteForm.treatment
								: "",
					...((visitNoteForm?.complaint || visitNoteForm?.objectiveStatus || visitNoteForm?.treatmentPlan || visitNoteForm?.diagnosis)
						? {
								visitDiaries: [
									{
										id: `diary-${dashboard?.activeVisit?.id || "active"}`,
										entryDate: new Date().toISOString().split("T")[0] ?? "",
										entryTime: new Date().toTimeString().slice(0, 5),
										doctorFullName,
										doctorSpecialty,
										toothNumber: dashboard?.activeVisit?.diagnosisTooth
											? String(dashboard.activeVisit.diagnosisTooth)
											: null,
										subjectiveComplaints:
											typeof visitNoteForm?.complaint === "string" && visitNoteForm.complaint
												? visitNoteForm.complaint
												: typeof visitNoteForm?.complaints === "string" && visitNoteForm.complaints
													? visitNoteForm.complaints
													: "",
										objectiveStatusLocalis:
											typeof visitNoteForm?.objectiveStatus === "string" && visitNoteForm.objectiveStatus
												? visitNoteForm.objectiveStatus
												: typeof visitNoteForm?.objective === "string" && visitNoteForm.objective
													? visitNoteForm.objective
													: "",
										assessmentDiagnosisText:
											typeof visitNoteForm?.diagnosis === "string" ? visitNoteForm.diagnosis : "",
										assessmentIcd10Code:
											typeof visitNoteForm?.diagnosis === "string" && visitNoteForm.diagnosis
												? visitNoteForm.diagnosis.split(" ")[0] ?? ""
												: "",
										procedureProtocol:
											typeof visitNoteForm?.treatmentPlan === "string" && visitNoteForm.treatmentPlan
												? visitNoteForm.treatmentPlan
												: typeof visitNoteForm?.treatment === "string" && visitNoteForm.treatment
													? visitNoteForm.treatment
													: "",
										homeCareRecommendations:
											typeof visitNoteForm?.recommendations === "string"
												? visitNoteForm.recommendations
												: "",
									},
								],
						  }
						: {}),
				}}
				isLocked={isSignedVisit}
				status={isSignedVisit ? "signed" : "draft"}
			/>
		</>
	);
}
