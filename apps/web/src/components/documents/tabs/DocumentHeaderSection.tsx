import React from "react";
import type { Patient, StaffMember, GeneratedDocument, DocumentKind } from "@dental/shared";
import type { ClinicProfileDraft } from "../../../AppHelpers";
import { CheckCircle2, Clock, FileText, Printer, Shield, Zap } from "lucide-react";
import { formatShortDate } from "../../../AppHelpers";
import { printBlankMedicalContract } from "../../patients/blankContractPrint";
import { DocumentQuickRoleScenarios } from "../DocumentQuickRoleScenarios";

export interface DocumentHeaderSectionProps {
	activePatient?: Patient | null;
	activeDoctor?: StaffMember | null;
	clinicProfileDraft?: ClinicProfileDraft;
	typedActiveDocuments: GeneratedDocument[];
	patientIssuedDocsCount: number;
	patientDraftDocsCount: number;
	activeUsableDocuments?: GeneratedDocument[];
	latestDocumentOpenGuidanceId: string;
	handleOpenLatestDocument: () => void;
	setIsAutoclaveLogOpen: (open: boolean) => void;
	handleDirectPrintPrimaryIntake: () => void;
	setIsPrimaryIntakeOpen: (open: boolean) => void;
	setIsSurgicalPackageOpen: (open: boolean) => void;
	setIsClinicalVisitOpen: (open: boolean) => void;
	setIsTaxAccountingOpen: (open: boolean) => void;
	setIsSanpinRegistryOpen: (open: boolean) => void;
	onSelectDocumentKind?: (kind: DocumentKind) => void;
}

export const DocumentHeaderSection: React.FC<DocumentHeaderSectionProps> = React.memo(
	function DocumentHeaderSection(props) {
		const {
			activePatient,
			activeDoctor,
			clinicProfileDraft,
			typedActiveDocuments,
			patientIssuedDocsCount,
			patientDraftDocsCount,
			activeUsableDocuments,
			latestDocumentOpenGuidanceId,
			handleOpenLatestDocument,
			setIsAutoclaveLogOpen,
			handleDirectPrintPrimaryIntake,
			setIsPrimaryIntakeOpen,
			setIsSurgicalPackageOpen,
			setIsClinicalVisitOpen,
			setIsTaxAccountingOpen,
			setIsSanpinRegistryOpen,
			onSelectDocumentKind,
		} = props;

		return (
			<>
				<style>{`
					.documents-panel .panel-heading button,
					.documents-panel .document-actions .doc-link,
					.documents-panel .document-actions button {
						min-height: 36px;
					}
					@media (pointer: coarse), (max-width: 768px) {
						.documents-panel .panel-heading button,
						.documents-panel .document-actions .doc-link,
						.documents-panel .document-actions button,
						.documents-panel .doc-dropdown-item {
							min-height: 44px;
						}
					}
				`}</style>
				<div className="panel-heading">
					<h2>Документы и Реестр</h2>
					<div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
						<button
							className="text-button min-h-[44px] sm:min-h-[36px]"
							type="button"
							data-testid="btn-open-latest-document"
							aria-describedby={
								!activeUsableDocuments?.[0]
									? latestDocumentOpenGuidanceId
									: undefined
							}
							title={
								!activeUsableDocuments?.[0]
									? "Открыть первый созданный документ пациента (или подсказка при отсутствии)"
									: "Открыть последний созданный или выданный документ пациента"
							}
							onClick={handleOpenLatestDocument}
						>
							Открыть последний
						</button>
						<button
							className="secondary-button text-xs py-1 px-2.5 flex items-center gap-1.5 documents-open-autoclave-log-257-btn"
							type="button"
							onClick={() => setIsAutoclaveLogOpen(true)}
							title="Открыть нормативный журнал контроля стерилизации (Форма 257/у СанПиН)"
						>
							<Shield size={14} className="text-teal-600 dark:text-teal-400" aria-hidden="true" />
							Журнал 257/у
						</button>
					</div>
				</div>

				{/* 1. ПАЦИЕНТСКИЙ БАННЕР */}
				<div className="document-patient-banner">
					<div className="document-patient-info">
						<span className="document-patient-name">
							{activePatient ? activePatient.fullName : "Все пациенты клиники"}
						</span>
						{activePatient?.birthDate && (
							<span className="document-patient-badge">
								Д/Р: {formatShortDate(activePatient.birthDate)}
							</span>
						)}
						{activePatient?.phone && (
							<span className="document-patient-badge">
								Тел: {activePatient.phone}
							</span>
						)}
					</div>
					<div className="document-patient-stats">
						<span className="document-stat-pill issued" title="Выданные и подписанные документы">
							<CheckCircle2 size={13} className="inline mr-1 text-emerald-500" aria-hidden="true" />
							Выдано: {patientIssuedDocsCount}
						</span>
						<span className="document-stat-pill draft" title="Черновики в работе">
							<Clock size={13} className="inline mr-1 text-amber-500" aria-hidden="true" />
							Черновиков: {patientDraftDocsCount}
						</span>
						<span className="document-stat-pill" title="Всего документов">
							Всего: {typedActiveDocuments.length}
						</span>
					</div>
				</div>

				{/* 1.1 АКЦЕНТНЫЙ БЛОК: ПЕРВИЧНЫЙ ПРИЁМ (0-CLICK GUIDANCE ДЛЯ АДМИНИСТРАТОРА) */}
				<div className="document-primary-intake-banner" data-testid="document-primary-intake-banner">
					<div className="document-primary-intake-heading">
						<div className="document-primary-intake-badge-title">
							<span className="document-primary-intake-pill">
								1. Первичный приём (Договор + ИДС 1051н + Согласие 152-ФЗ)
							</span>
							<span className="document-primary-intake-hint">
								Оформление нового пациента в 1 клик со строками «________» для ручной подписи
							</span>
						</div>
					</div>

					<div className="document-primary-intake-btn-group">
						<button
							type="button"
							className="primary-button document-intake-quick-print-btn"
							onClick={handleDirectPrintPrimaryIntake}
							data-testid="btn-quick-print-primary-intake-package"
							title="Сформировать и напечатать полный пакет первичного приёма (Договор + общий ИДС 1051н + согласие на обработку ПД 152-ФЗ + Анкета здоровья) со строками «________» для быстрой ручной подписи на стойке регистрации (без 403-ошибок)"
						>
							<Printer size={15} aria-hidden="true" />
							<span className="font-bold">Печать пакета в 1 клик</span>
						</button>
						<button
							type="button"
							className="secondary-button document-intake-blank-contract-btn"
							onClick={() => {
								void printBlankMedicalContract(
									activePatient
										? {
												id: activePatient.id,
												fullName: activePatient.fullName,
												phone: activePatient.phone,
												birthDate: activePatient.birthDate,
												administrativeProfile: (activePatient as any)?.administrativeProfile,
											}
										: null,
									{
										doctorName: activeDoctor?.fullName || "",
										clinicName: clinicProfileDraft?.clinicName || clinicProfileDraft?.legalName,
										clinicAddress: clinicProfileDraft?.address,
										clinicInn: clinicProfileDraft?.inn,
										clinicOgrn: clinicProfileDraft?.ogrn,
									},
								);
							}}
							data-testid="btn-documents-print-blank-contract"
							title="Распечатать чистый бланк договора для ручного заполнения пациентом до приёма (без 403-ошибок)"
						>
							<FileText size={15} aria-hidden="true" />
							<span>Пустой бланк договора (под ручное заполнение)</span>
						</button>
						<button
							type="button"
							className="secondary-button document-intake-open-modal-btn"
							onClick={() => setIsPrimaryIntakeOpen(true)}
							data-testid="scenario-primary-intake-btn"
							title="Открыть модальное окно пакетного формирования и предварительного просмотра"
						>
							<span>Состав пакета (4 док.)</span>
						</button>
					</div>
				</div>

				{/* 2. БЫСТРЫЕ РОЛЕВЫЕ СЦЕНАРИИ В 1 КЛИК */}
				<details className="document-scenarios-accordion group" data-testid="document-scenarios-accordion" open>
					<summary className="document-scenarios-summary">
						<div className="flex items-center gap-2">
							<Zap size={14} className="text-teal-600 dark:text-teal-400 shrink-0" aria-hidden="true" />
							<span className="font-bold text-xs text-[var(--ink)]">
								Быстрые сценарии и пакеты (понятные подсказки для регистратуры)
							</span>
						</div>
						<span className="document-scenarios-summary-badge">
							6 сценариев
						</span>
					</summary>
					<div className="document-scenarios-accordion-content">
						<DocumentQuickRoleScenarios
							onOpenPrimaryIntake={() => setIsPrimaryIntakeOpen(true)}
							onPrintPrimaryIntake={handleDirectPrintPrimaryIntake}
							onOpenSurgicalPackage={() => setIsSurgicalPackageOpen(true)}
							onOpenClinicalVisit={() => setIsClinicalVisitOpen(true)}
							onOpenTaxAccounting={() => setIsTaxAccountingOpen(true)}
							onOpenSanpinRegistry={() => setIsSanpinRegistryOpen(true)}
							onSelectCompletedAct={() => onSelectDocumentKind?.("completed_works_act")}
							onSelectAttendanceCert={() => onSelectDocumentKind?.("visit_attendance_certificate")}
						/>
					</div>
				</details>
			</>
		);
	},
);

DocumentHeaderSection.displayName = "DocumentHeaderSection";
