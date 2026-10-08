import React from "react";
import { Check, X, Zap } from "lucide-react";
import { generateQrCodeSvg } from "@dental/shared";
import { showToast } from "../../GlobalToast";
import { appendClinicalText } from "../emk";
import { InformedConsentModal } from "../consents/InformedConsentModal";
import { Form043PrintModal } from "../emr/Form043PrintModal";
import { EmrProtocolGeneratorModal } from "../emr/protocolGenerator/EmrProtocolGeneratorModal";
import { EmkPrintableForm043 } from "../emk/EmkPrintableForm043";
import { ClinicalProtocolsCatalogModal } from "../clinicalCatalog";
import type { VisitEmkModalsProps } from "./types";

export function VisitEmkModals({
	isSbpQrModalOpen,
	setIsSbpQrModalOpen,
	completionResult,
	activePatient,
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

	const sbpPayloadUrl =
		completionResult?.sbpQrPayload ||
		`https://qr.nspk.ru/AD1000${receiptNumber}?type=02&bank=100000000004&sum=${Math.round(totalNetRub * 100)}&cur=RUB&crc=8128`;
	const sbpQrSvg = React.useMemo(() => {
		return generateQrCodeSvg(sbpPayloadUrl, { size: 200 });
	}, [sbpPayloadUrl]);

	return (
		<>
			{/* Окно оплаты по СБП QR (Мандаты 8d, 8e) */}
			{isSbpQrModalOpen && completionResult && (
				<div
					className="fixed inset-0 z-[99999] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-150"
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
								dangerouslySetInnerHTML={{ __html: sbpQrSvg }}
							/>
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
									showToast("Оплата по СБП успешно подтверждена!", "success", 4000);
									setIsSbpQrModalOpen(false);
								}}
								className="flex-1 min-h-[48px] px-4 py-2.5 rounded-xl text-sm font-extrabold bg-[var(--ok-fg)] hover:opacity-90 text-white transition-all cursor-pointer flex items-center justify-center gap-1.5"
								data-testid="btn-confirm-sbp-paid"
							>
								<Check size={16} className="shrink-0" />
								<span>Подтвердить оплату</span>
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

			{/* Клинические протоколы СтАР / МКБ-10 (Мандаты 8e, 8n) */}
			<EmrProtocolGeneratorModal
				isOpen={isStarProtocolsOpen}
				onClose={() => setIsStarProtocolsOpen(false)}
				patientFullName={activePatient?.fullName}
				patientBirthDate={activePatient?.birthDate}
				medicalCardNumber={activePatient?.medicalCardNumber || activePatient?.cardNumber || activePatient?.id}
				doctorFullName={dashboard?.activeDoctor?.fullName || "Лечащий врач"}
				doctorSpecialty={dashboard?.activeDoctor?.specialty || "Стоматолог-терапевт"}
				initialToothNumber={Number(dashboard?.activeVisit?.diagnosisTooth) || undefined}
				initialIcd10Code={visitNoteForm?.diagnosis ? String(visitNoteForm.diagnosis).split(" ")[0] : undefined}
				initialSpecialty={
					dashboard?.activeVisit?.specialty === "surgery"
						? "surgery"
						: dashboard?.activeVisit?.specialty === "orthopedics"
							? "orthopedics"
							: dashboard?.activeVisit?.specialty === "periodontics"
								? "periodontics"
								: dashboard?.activeVisit?.specialty === "pediatric"
									? "pediatric"
									: "therapy"
				}
				onApplyDiary={(newDiary) => {
					if (newDiary.subjectiveComplaints) {
						updateVisitNoteField(
							"complaint",
							appendClinicalText(visitNoteForm?.complaint || "", newDiary.subjectiveComplaints, "\n"),
						);
					}
					if (newDiary.objectiveStatusLocalis) {
						updateVisitNoteField(
							"objectiveStatus",
							appendClinicalText(visitNoteForm?.objectiveStatus || "", newDiary.objectiveStatusLocalis, "\n"),
						);
					}
					if (newDiary.assessmentDiagnosisText || newDiary.assessmentIcd10Code) {
						const diagText = newDiary.assessmentDiagnosisText
							? `${newDiary.assessmentIcd10Code ? newDiary.assessmentIcd10Code + " " : ""}${newDiary.assessmentDiagnosisText}${newDiary.toothNumber ? ` (зуб ${newDiary.toothNumber})` : ""}`
							: (newDiary.assessmentIcd10Code || "");
						updateVisitNoteField("diagnosis", diagText);
					}
					if (newDiary.procedureProtocol) {
						updateVisitNoteField(
							"treatmentPlan",
							appendClinicalText(visitNoteForm?.treatmentPlan || "", newDiary.procedureProtocol, "\n"),
						);
					}
					if (newDiary.homeCareRecommendations) {
						updateVisitNoteField(
							"recommendations",
							appendClinicalText(visitNoteForm?.recommendations || "", newDiary.homeCareRecommendations, "\n"),
						);
					}
					setIsStarProtocolsOpen(false);
					showToast("Клинический протокол СтАР применён к приёму", "success", 3000);
				}}
				onApplyBatchDiaries={(diaries) => {
					if (!diaries || diaries.length === 0) return;
					for (const d of diaries) {
						if (d.subjectiveComplaints) {
							updateVisitNoteField(
								"complaint",
								appendClinicalText(visitNoteForm?.complaint || "", d.subjectiveComplaints, "\n"),
							);
						}
						if (d.objectiveStatusLocalis) {
							updateVisitNoteField(
								"objectiveStatus",
								appendClinicalText(visitNoteForm?.objectiveStatus || "", d.objectiveStatusLocalis, "\n"),
							);
						}
						if (d.assessmentDiagnosisText || d.assessmentIcd10Code) {
							const diagText = d.assessmentDiagnosisText
								? `${d.assessmentIcd10Code ? d.assessmentIcd10Code + " " : ""}${d.assessmentDiagnosisText}${d.toothNumber ? ` (зуб ${d.toothNumber})` : ""}`
								: (d.assessmentIcd10Code || "");
							updateVisitNoteField("diagnosis", diagText);
						}
						if (d.procedureProtocol) {
							updateVisitNoteField(
								"treatmentPlan",
								appendClinicalText(visitNoteForm?.treatmentPlan || "", d.procedureProtocol, "\n"),
							);
						}
						if (d.homeCareRecommendations) {
							updateVisitNoteField(
								"recommendations",
								appendClinicalText(visitNoteForm?.recommendations || "", d.homeCareRecommendations, "\n"),
							);
						}
					}
					setIsStarProtocolsOpen(false);
					showToast(`Применено клинических протоколов: ${diaries.length}`, "success", 3000);
				}}
			/>

			{/* Полный промышленный каталог клинических протоколов (1 142 шаблона) */}
			<ClinicalProtocolsCatalogModal
				isOpen={isSoapTemplatesModalOpen}
				onClose={() => setIsSoapTemplatesModalOpen(false)}
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
				isOpen={isConsentModalOpen}
				onClose={() => setIsConsentModalOpen(false)}
				patient={
					activePatient
						? {
								fullName: activePatient.fullName,
								birthDate: activePatient.birthDate,
								passport: activePatient.passport,
								phone: activePatient.phone,
								snils: activePatient.snils,
								address: activePatient.address,
								cardNumber:
									activePatient.medicalCardNumber ||
									activePatient.cardNumber ||
									activePatient.id,
							}
						: undefined
				}
				doctorName={dashboard?.activeDoctor?.fullName || "Лечащий врач"}
				doctorSpecialty={dashboard?.activeDoctor?.specialty || "Стоматолог-терапевт"}
				diagnosisIcd={
					visitNoteForm?.diagnosis ? String(visitNoteForm.diagnosis).split(" ")[0] : undefined
				}
				toothNumbers={
					dashboard?.activeVisit?.diagnosisTooth
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
			<Form043PrintModal
				isOpen={isPrintModalOpen}
				onClose={() => setIsPrintModalOpen(false)}
				initialData={{
					patient: activePatient,
					diary: visitNoteForm,
				} as any}
				isLocked={isSignedVisit}
				status={isSignedVisit ? "signed" : "draft"}
			/>

			{/* Печатная форма медицинской карты */}
			<EmkPrintableForm043
				patient={activePatient}
				visitNoteForm={visitNoteForm}
				isSignedVisit={isSignedVisit}
			/>
		</>
	);
}
