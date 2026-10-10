import React, { lazy, Suspense } from "react";
import { createPortal } from "react-dom";
import { Printer, Palette, X } from "lucide-react";
import { PremiumDocumentPrintSheet } from "../../documents/PremiumDocumentPrintSheet";
import type { DiaryState } from "../../useVisitDiaryLogic";
import { mergeSoapDiaryState } from "../../../lib/clinicalProtocols043";

const EgiszRemdHubModal = lazy(() =>
	import("../../egisz/EgiszRemdHubModal").then((m) => ({ default: m.EgiszRemdHubModal }))
);
const PrescriptionModal = lazy(() =>
	import("../PrescriptionModal").then((m) => ({ default: m.PrescriptionModal }))
);
const RadiologyReferralModal = lazy(() =>
	import("../../radiology/RadiologyReferralModal").then((m) => ({ default: m.RadiologyReferralModal }))
);
const VisitSummaryModal = lazy(() =>
	import("../VisitSummaryModal").then((m) => ({ default: m.VisitSummaryModal }))
);
const ClinicalDiaryTemplatesModal = lazy(() =>
	import("../../emr/templates").then((m) => ({ default: m.ClinicalDiaryTemplatesModal }))
);

export interface VisitDiaryModalsProps {
	readonly showSummaryModal: boolean;
	readonly setShowSummaryModal: (val: boolean) => void;
	readonly showPrescriptionModal: boolean;
	readonly setShowPrescriptionModal: (val: boolean) => void;
	readonly showRadiologyReferralModal: boolean;
	readonly setShowRadiologyReferralModal: (val: boolean) => void;
	readonly showEgiszModal: boolean;
	readonly setShowEgiszModal: (val: boolean) => void;
	readonly showTemplatesModal: boolean;
	readonly setShowTemplatesModal: (val: boolean) => void;
	readonly showBrandingCustomizer: boolean;
	readonly setShowBrandingCustomizer: (val: boolean) => void;
	readonly showPreview: boolean;
	readonly setShowPreview: (val: boolean) => void;
	readonly diary: DiaryState;
	readonly setDiary: React.Dispatch<React.SetStateAction<DiaryState>>;
	readonly isLocked: boolean;
	readonly isRevising: boolean;
	readonly beginRevise: () => void;
	readonly scheduleDebouncedSave: () => void;
	readonly setIcdSearch: (val: string) => void;
	readonly doSave: (showSuccessToast?: boolean) => Promise<any>;
	readonly doctorName: string;
	readonly doctorSpecialty: string;
	readonly patientFullName: string;
	readonly patientBirthDate?: string | null;
	readonly patientCardNumber?: string | null;
	readonly patientPassport?: string | null;
	readonly patientOms?: string | null;
	readonly patientSnils?: string | null;
	readonly patientPhone?: string | null;
	readonly patientAddress?: string | null;
	readonly clinicName?: string | null;
	readonly activePatient?: any;
	readonly printPatient?: any;
	readonly lockedAt?: string | null;
	readonly diaryHash?: string | null;
	readonly hasCryptoSignature?: boolean;
	readonly activeTeeth?: readonly any[];
	readonly radiologySnapshots?: readonly any[];
	readonly lastSavedAt?: Date | null;
	readonly icdEntry?: any;
	readonly revisionCount?: number;
}

export function VisitDiaryModals({
	showSummaryModal,
	setShowSummaryModal,
	showPrescriptionModal,
	setShowPrescriptionModal,
	showRadiologyReferralModal,
	setShowRadiologyReferralModal,
	showEgiszModal,
	setShowEgiszModal,
	showTemplatesModal,
	setShowTemplatesModal,
	showBrandingCustomizer,
	setShowBrandingCustomizer,
	showPreview,
	setShowPreview,
	diary,
	setDiary,
	isLocked,
	isRevising,
	beginRevise,
	scheduleDebouncedSave,
	setIcdSearch,
	doSave,
	doctorName,
	doctorSpecialty,
	patientFullName,
	patientBirthDate,
	patientCardNumber,
	patientPassport,
	patientOms,
	patientSnils,
	patientPhone,
	patientAddress,
	clinicName,
	activePatient,
	printPatient,
	lockedAt,
	diaryHash,
	hasCryptoSignature,
	activeTeeth,
	radiologySnapshots,
	lastSavedAt,
	icdEntry,
	revisionCount,
}: VisitDiaryModalsProps) {
	const PrintPreviewContent = (
		<div
			className="vde-043-print-overlay print-layer"
			data-testid="form-043-preview"
			role="dialog"
			aria-modal="true"
			aria-label="Медицинская карта стоматологического пациента"
		>
			<div className="vde-043-print-sheet print-content">
				<div className="vde-043-print-toolbar no-print flex items-center justify-between gap-2 p-3 bg-[var(--paper-soft)] border-b border-[var(--glass-border)]">
					<div className="flex items-center gap-2">
						<Printer className="w-5 h-5 text-[var(--teal)]" />
						<h3 className="text-sm font-bold m-0">
							Печатная форма медицинской карты
						</h3>
					</div>
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={() => setShowBrandingCustomizer(true)}
							className="vde-043__btn text-xs"
							title="Настроить оформление бланка, цвета и реквизиты"
						>
							<Palette className="w-4 h-4 text-amber-500" />
							<span>Настроить бланк</span>
						</button>
						<button
							type="button"
							onClick={() => window.print()}
							className="vde-043__btn vde-043__btn--primary text-xs font-bold"
							data-testid="form-043-print"
						>
							<Printer className="w-4 h-4" />
							<span>Печать (Ctrl+P)</span>
						</button>
						<button
							type="button"
							onClick={() => setShowPreview(false)}
							className="vde-043__btn vde-043__btn--ghost text-xs"
							title="Закрыть предпросмотр"
							aria-label="Закрыть окно предпросмотра"
						>
							<X className="w-4 h-4" />
						</button>
					</div>
				</div>
				<div className="p-4 sm:p-6 overflow-y-auto">
					<PremiumDocumentPrintSheet
						documentTitle="МЕДИЦИНСКАЯ КАРТА СТОМАТОЛОГИЧЕСКОГО ПАЦИЕНТА"
						documentSubtitle="Медицинская карта стоматологического пациента"
						patient={{
							fullName: patientFullName !== "—" ? patientFullName : null,
							birthDate: patientBirthDate || null,
							medicalCardNumber: patientCardNumber || null,
							passport: patientPassport || null,
							omsPolis: patientOms || null,
							snils: patientSnils || null,
							phone: patientPhone || null,
							address: patientAddress || null,
						}}
						doctorName={doctorName !== "—" ? doctorName : null}
						doctorSpecialty={doctorSpecialty || null}
						visitDate={lastSavedAt || new Date()}
						diary={diary}
						icd10Label={icdEntry ? icdEntry.label : null}
						teethData={activeTeeth as any}
						radiologySnapshots={radiologySnapshots}
						diaryHash={diaryHash}
						hasCryptoSignature={hasCryptoSignature}
						isLocked={isLocked}
						lockedAt={lockedAt}
						revisionCount={revisionCount}
					/>
				</div>
			</div>
		</div>
	);

	return (
		<>
			{/* Summary Modal */}
			{showSummaryModal && (
				<Suspense fallback={null}>
					<VisitSummaryModal
						isOpen={showSummaryModal}
						onClose={() => setShowSummaryModal(false)}
						patient={printPatient || activePatient}
						diary={diary}
						doctorName={doctorName}
						doctorSpecialty={doctorSpecialty}
						lockedAt={lockedAt ?? null}
						diaryHash={diaryHash ?? null}
						hasCryptoSignature={Boolean(hasCryptoSignature)}
						isLocked={Boolean(isLocked)}
						teethData={activeTeeth ?? []}
						radiologySnapshots={radiologySnapshots ?? []}
						onPrint={() => setShowPreview(true)}
						onOpenPrescription={() => setShowPrescriptionModal(true)}
						onOpenRadiologyReferral={() => setShowRadiologyReferralModal(true)}
						onOpenEgiszExport={() => setShowEgiszModal(true)}
						onCompleteVisit={async () => {
							await doSave(false);
							setShowSummaryModal(false);
						}}
					/>
				</Suspense>
			)}

			{/* Prescription Modal */}
			{showPrescriptionModal && (
				<Suspense fallback={null}>
					<PrescriptionModal
						isOpen={showPrescriptionModal}
						onClose={() => setShowPrescriptionModal(false)}
						patient={
							printPatient || activePatient
								? {
										fullName: patientFullName,
										birthDate: patientBirthDate ?? null,
										medicalCardNumber: patientCardNumber ?? null,
									}
								: null
						}
						diary={diary}
						doctorName={doctorName}
						doctorSpecialty={doctorSpecialty}
						clinicName={clinicName ?? null}
						onInsertToDiary={(diaryText) => {
							setDiary((prev) => ({
								...prev,
								treatmentDescription: prev.treatmentDescription
									? `${prev.treatmentDescription}\n\n${diaryText}`
									: diaryText,
							}));
							scheduleDebouncedSave();
						}}
					/>
				</Suspense>
			)}

			{/* Radiology Referral Modal */}
			{showRadiologyReferralModal && (
				<Suspense fallback={null}>
					<RadiologyReferralModal
						isOpen={showRadiologyReferralModal}
						onClose={() => setShowRadiologyReferralModal(false)}
						patient={
							printPatient || activePatient
								? {
										fullName: patientFullName,
										birthDate: patientBirthDate,
										medicalCardNumber: patientCardNumber,
									}
								: null
						}
						diary={diary}
						doctorName={doctorName}
						doctorSpecialty={doctorSpecialty}
						clinicName={clinicName}
					/>
				</Suspense>
			)}

			{/* EGISZ SEMD CDA Export Modal */}
			{showEgiszModal && (
				<Suspense fallback={null}>
					<EgiszRemdHubModal
						isOpen={showEgiszModal}
						onClose={() => setShowEgiszModal(false)}
						initialTab="xml"
					/>
				</Suspense>
			)}

			{/* 1-Click Clinical Protocols & Templates Modal */}
			{showTemplatesModal && (
				<Suspense fallback={null}>
					<ClinicalDiaryTemplatesModal
						isOpen={showTemplatesModal}
						onClose={() => setShowTemplatesModal(false)}
						initialToothNumber={diary.diagnosisTooth}
						doctorFullName={doctorName}
						doctorSpecialty={doctorSpecialty}
						patientFullName={patientFullName}
						onApplyDiary={(res) => {
							if (isLocked && !isRevising) {
								beginRevise();
							}
							const combinedAnamnesis = [
								res.subjectiveComplaints?.trim(),
								res.anamnesisMorbi?.trim(),
							]
								.filter(Boolean)
								.join("\n\n");

							const treatmentParts: string[] = [];
							if (res.procedureProtocol?.trim()) {
								treatmentParts.push(res.procedureProtocol.trim());
							}
							if (res.anesthesiaDetails?.trim()) {
								treatmentParts.push(`Анестезия: ${res.anesthesiaDetails.trim()}`);
							}
							if (res.appliedMaterials?.trim()) {
								treatmentParts.push(`Материалы: ${res.appliedMaterials.trim()}`);
							}
							if (res.homeCareRecommendations?.trim()) {
								treatmentParts.push(`Рекомендации: ${res.homeCareRecommendations.trim()}`);
							}
							if (res.order804nServices && res.order804nServices.length > 0) {
								const svcLines = res.order804nServices.map((s) => {
									const qty = s.defaultQuantity && s.defaultQuantity > 1 ? ` (x${s.defaultQuantity})` : "";
									const price =
										typeof s.priceKopecks === "number" && s.priceKopecks > 0
											? ` — ${(s.priceKopecks / 100).toLocaleString("ru-RU")} ₽`
											: "";
									return `• ${s.code} ${s.nameRu}${qty}${price}`;
								});
								treatmentParts.push(`Оказанные услуги:\n${svcLines.join("\n")}`);

								if (typeof window !== "undefined") {
									const billableItems = res.order804nServices.map((s, idx) => {
										const priceRub = typeof s.priceKopecks === "number" && s.priceKopecks > 0 ? s.priceKopecks / 100 : 0;
										const qty = s.defaultQuantity && s.defaultQuantity > 1 ? s.defaultQuantity : 1;
										const tooth = res.toothNumber ?? diary.diagnosisTooth;
										return {
											id: `protocol-${s.code}-${Date.now()}-${idx}`,
											code: s.code,
											code804n: s.code,
											title: s.nameRu,
											name: s.nameRu,
											quantity: qty,
											priceRub,
											unitPriceRub: priceRub,
											priceKopecks: s.priceKopecks ?? Math.round(priceRub * 100),
											toothNumber: tooth ? Number(tooth) || tooth : undefined,
											toothCode: tooth ? String(tooth) : undefined,
										};
									});
									window.dispatchEvent(
										new CustomEvent("dente-add-services-to-invoice", {
											detail: {
												services: billableItems,
												toothNumber: res.toothNumber ?? (diary.diagnosisTooth ? Number(diary.diagnosisTooth) || diary.diagnosisTooth : undefined),
												toothCode: res.toothNumber ? String(res.toothNumber) : diary.diagnosisTooth,
												replaceExisting: true,
												source: "clinical_diary_protocol",
											},
										}),
									);
								}
							}
							const combinedTreatment = treatmentParts.join("\n\n");

							setDiary((prev) =>
								mergeSoapDiaryState(
									prev,
									{
										anamnesis: combinedAnamnesis,
										statusLocalis: res.objectiveStatusLocalis,
										treatmentDescription: combinedTreatment,
										diagnosisIcd10: res.assessmentIcd10Code,
										diagnosisTooth: res.toothNumber ? String(res.toothNumber) : prev.diagnosisTooth,
									},
									{ strategy: "smart_append" },
								),
							);
							if (res.assessmentIcd10Code) {
								setIcdSearch(res.assessmentIcd10Code);
							}
							scheduleDebouncedSave();
						}}
						onApplySoapText={(text, icd) => {
							if (isLocked && !isRevising) {
								beginRevise();
							}
							setDiary((prev) => ({
								...prev,
								treatmentDescription: prev.treatmentDescription
									? `${prev.treatmentDescription}\n\n${text}`
									: text,
								diagnosisIcd10: prev.diagnosisIcd10 || icd,
							}));
							if (icd && !diary.diagnosisIcd10) {
								setIcdSearch(icd);
							}
							scheduleDebouncedSave();
						}}
						onApplyServices={(services) => {
							if (typeof window !== "undefined" && services && services.length > 0) {
								const billableItems = services.map((s, idx) => {
									const priceRub = typeof s.priceKopecks === "number" && s.priceKopecks > 0 ? s.priceKopecks / 100 : 0;
									const qty = s.defaultQuantity && s.defaultQuantity > 1 ? s.defaultQuantity : 1;
									const tooth = diary.diagnosisTooth;
									return {
										id: `protocol-${s.code}-${Date.now()}-${idx}`,
										code: s.code,
										code804n: s.code,
										title: s.nameRu,
										name: s.nameRu,
										quantity: qty,
										priceRub,
										unitPriceRub: priceRub,
										priceKopecks: s.priceKopecks ?? Math.round(priceRub * 100),
										toothNumber: tooth ? Number(tooth) || tooth : undefined,
										toothCode: tooth ? String(tooth) : undefined,
									};
								});
								window.dispatchEvent(
									new CustomEvent("dente-add-services-to-invoice", {
										detail: {
											services: billableItems,
											toothNumber: diary.diagnosisTooth ? Number(diary.diagnosisTooth) || diary.diagnosisTooth : undefined,
											toothCode: diary.diagnosisTooth || undefined,
											replaceExisting: true,
											source: "clinical_diary_modal_services",
										},
									}),
								);
							}
						}}
					/>
				</Suspense>
			)}



			{/* Print Preview Overlay */}
			{showPreview &&
				typeof window !== "undefined" &&
				createPortal(PrintPreviewContent, document.body)}
		</>
	);
}
