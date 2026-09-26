import React from "react";
import type { Patient, StaffMember, GeneratedDocument } from "@dental/shared";
import type { ClinicProfileDraft } from "../../../AppHelpers";
import { CheckCircle2, Clock, FileText, Printer, Shield, Zap } from "lucide-react";
import { formatShortDate } from "../../../AppHelpers";
import { printBlankMedicalContract } from "../../patients/blankContractPrint";
import { printPrimaryIntakePackage } from "../primaryIntakePackagePrintEngine";
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
							disabled={false}
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

				{/* 1.1 БЫСТРАЯ 1-КЛИК ПЕЧАТЬ */}
				<div className="document-intake-quick-action-bar grid grid-cols-1 sm:grid-cols-2 gap-2">
					<button
						type="button"
						className="document-intake-quick-print-btn !py-2 !px-3"
						onClick={handleDirectPrintPrimaryIntake}
						data-testid="btn-quick-print-primary-intake-package"
						title="Сформировать и напечатать полный пакет первичного приёма (Договор + общий ИДС + согласие на обработку ПД + Анкета) со строками «________» для быстрой ручной подписи на стойке регистрации (без 403-ошибок)"
					>
						<div className="flex items-center gap-2 min-w-0">
							<Printer size={16} className="text-teal-600 dark:text-teal-400 shrink-0" aria-hidden="true" />
							<span className="font-extrabold text-xs text-[var(--ink)] flex items-center gap-1.5 truncate">
								<Zap size={14} className="text-amber-500 shrink-0" aria-hidden="true" />
								Пакет первичного приёма
							</span>
						</div>
						<span className="document-intake-quick-badge !text-xs !py-0.5 shrink-0">
							Договор + ИДС + ПД
						</span>
					</button>
					<button
						type="button"
						className="document-intake-quick-print-btn !py-2 !px-3"
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
						<div className="flex items-center gap-2 min-w-0">
							<Printer size={16} className="text-teal-600 dark:text-teal-400 shrink-0" aria-hidden="true" />
							<span className="font-extrabold text-xs text-[var(--ink)] flex items-center gap-1.5 truncate">
								<FileText size={14} className="text-teal-600 dark:text-teal-400 shrink-0" aria-hidden="true" />
								<span className="sm:hidden">Бланк договора (ручной)</span>
								<span className="hidden sm:inline">Пустой бланк договора (под ручное заполнение)</span>
							</span>
						</div>
						<span className="document-intake-quick-badge !text-xs !py-0.5 shrink-0">
							Чистый бланк
						</span>
					</button>
				</div>

				{/* 2. БЫСТРЫЕ РОЛЕВЫЕ СЦЕНАРИИ В 1 КЛИК */}
				<details className="document-scenarios-accordion group" data-testid="document-scenarios-accordion">
					<summary className="document-scenarios-summary">
						<div className="flex items-center gap-2">
							<Zap size={15} className="text-teal-600 dark:text-teal-400 shrink-0" aria-hidden="true" />
							<span className="font-bold text-xs text-[var(--ink)]">
								Быстрые ролевые пакеты документов (6 пакетов)
							</span>
						</div>
						<span className="document-scenarios-summary-badge">
							Развернуть пакеты
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
						/>
					</div>
				</details>
			</>
		);
	},
);
