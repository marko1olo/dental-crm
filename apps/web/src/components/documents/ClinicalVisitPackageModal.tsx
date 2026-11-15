/**
 * ClinicalVisitPackageModal.tsx
 *
 * Канонический SSOT хаб первичной документации клиники DENTE Dental CRM.
 * Оркестратор модулей:
 * 1. Пакет документов первичного приёма (Договор, Согласие на лечение, Персональные данные, Анкета здоровья).
 * 2. Клинический пакет приёма врача (Медицинская карта приёма, План лечения, Назначение лекарств, Направление на рентген/КТ, Памятка).
 * 3. Справка для налогового вычета 13% НДФЛ (ФНС с авто-агрегацией оплат из кассы).
 *
 * Инварианты Мандата 8e, 8n, 8am, 8ap, 8b и Apple HIG:
 * - Автономия врача: кнопки печати НИКОГДА не блокируются (disabled = false).
 * - Печать договора с 0 ₽ и прочерками («___________») до приёма без ошибок.
 * - Заполнение соматической нормы в 1 клик («✓ Соматически здоров / Интактные зубы»).
 * - Ровно ОДНА Primary CTA кнопка (var(--teal)) на видимый экран.
 * - На смартфонах — нативный Bottom Sheet со скруглением rounded-t-[24px], Drag Handle 36x5px и Thumb Zone.
 * - Целевой размер оркестратора: 200–260 строк (Sweet Spot).
 */

import type { DocumentKind, GeneratedDocument, Patient } from "@dental/shared";
import React, { useMemo, useState } from "react";
import { printClinicalPackage } from "./clinicalPackagePrintEngine";
import {
	type ClinicalItem,
	type ClinicalPackageTab,
	type ClinicalVisitPackageModalProps,
	CLINICAL_STATUTORY_ITEMS,
	IntakePackageChecklist,
	IntakePackageFooter,
	IntakePackageHeader,
	IntakeRepresentativeSection,
	IntakeTaxSection,
	PRIMARY_STATUTORY_ITEMS,
} from "./intakePackage";
import { printPrimaryIntakePackage } from "./primaryIntakePackagePrintEngine";
import {
	aggregatePatientPaymentsForTaxYear,
	printTaxCertificate,
	type TaxCertificateDocumentData,
	type TaxPaymentRecord,
} from "./taxCertificateEngine";
import { isDemoShowcaseMode } from "../../lib/demoMode";

export type { ClinicalPackageTab, ClinicalItem, ClinicalVisitPackageModalProps };
export { PRIMARY_STATUTORY_ITEMS, CLINICAL_STATUTORY_ITEMS };

export function ClinicalVisitPackageModal(
	props: ClinicalVisitPackageModalProps,
): React.JSX.Element | null {
	const {
		isOpen,
		onClose,
		patient,
		doctorFullName,
		existingDocuments = [],
		onCreateDocument,
		onOpenDocument,
		onSelectDocumentKind,
		clinicProfileDraft,
		payments = [],
		initialTab = "primary",
	} = props;

	const [activeTab, setActiveTab] = useState<ClinicalPackageTab>(initialTab);
	const [isNormApplied, setIsNormApplied] = useState<boolean>(false);
	const [selectedTaxYear, setSelectedTaxYear] = useState<number>(() =>
		new Date().getFullYear(),
	);

	const documentsByKind = useMemo(() => {
		const map = new Map<DocumentKind, GeneratedDocument[]>();
		for (const doc of existingDocuments) {
			const list = map.get(doc.kind) ?? [];
			list.push(doc);
			map.set(doc.kind, list);
		}
		return map;
	}, [existingDocuments]);

	const currentPackageItems =
		activeTab === "primary" ? PRIMARY_STATUTORY_ITEMS : CLINICAL_STATUTORY_ITEMS;

	const missingKinds = useMemo(() => {
		return currentPackageItems
			.filter((item) => !documentsByKind.has(item.kind))
			.map((item) => item.kind);
	}, [currentPackageItems, documentsByKind]);

	// Агрегация кассовых чеков для справки 13% НДФЛ
	const taxAggregated = useMemo(() => {
		const paymentRecords = (payments ?? []) as readonly TaxPaymentRecord[];
		return aggregatePatientPaymentsForTaxYear(paymentRecords, selectedTaxYear);
	}, [payments, selectedTaxYear]);

	if (!isOpen) return null;

	const handlePrintPrimaryPackage = (isBlank = false) => {
		printPrimaryIntakePackage({
			patient: isBlank ? null : patient,
			clinic: clinicProfileDraft,
			doctorFullName: doctorFullName || "Врач-стоматолог-терапевт",
			intakeNormApplied: isBlank ? false : isNormApplied,
		});
	};

	const handlePrintClinicalPackage = (isBlank = false) => {
		printClinicalPackage({
			patient: isBlank ? null : patient,
			clinic: clinicProfileDraft,
			doctorFullName: doctorFullName || "Врач-стоматолог-терапевт",
		});
	};

	const handlePrintTaxCertificate = () => {
		const isDemo = isDemoShowcaseMode();
		type LegacyPatientDocFields = {
			readonly cardNumber?: string | undefined;
			readonly inn?: string | undefined;
			readonly passport?: string | undefined;
			readonly passportSeries?: string | undefined;
			readonly passportNumber?: string | undefined;
		};
		const legacyPatient = patient as (Patient & LegacyPatientDocFields) | null;
		const docNumber = `НДФЛ-${selectedTaxYear}-${legacyPatient?.cardNumber || patient?.id?.slice(0, 6) || "001"}`;
		const defaultFullName = isDemo ? "Смирнов Алексей Петрович" : "___________";
		const defaultBirthDate = isDemo ? "12.04.1988" : "___________";
		const effectiveInn =
			patient?.administrativeProfile?.taxpayerInn ||
			legacyPatient?.inn ||
			(isDemo ? "770123456789" : "");
		const identityDoc =
			patient?.administrativeProfile?.identityDocument ||
			legacyPatient?.passport ||
			"";
		const passportParts = identityDoc ? identityDoc.split(" ") : [];
		const series =
			legacyPatient?.passportSeries ||
			(passportParts.length >= 2 ? `${passportParts[0]} ${passportParts[1]}` : (isDemo ? "45 12" : "______"));
		const number =
			legacyPatient?.passportNumber ||
			(passportParts.length >= 3 ? passportParts.slice(2).join(" ") : (isDemo ? "654321" : "________"));

		const certificateData: TaxCertificateDocumentData = {
			certificateNumber: docNumber,
			issueDateIso: new Date().toISOString(),
			taxYear: selectedTaxYear,
			clinic: {
				legalName: clinicProfileDraft?.legalName || clinicProfileDraft?.clinicName || "Стоматологическая клиника",
				inn: clinicProfileDraft?.inn || (isDemo ? "7701234567" : "0000000000"),
				kpp: clinicProfileDraft?.kpp || (isDemo ? "770101001" : ""),
				ogrn: clinicProfileDraft?.ogrn || (isDemo ? "1027700132195" : "0000000000000"),
				address: clinicProfileDraft?.actualAddress || clinicProfileDraft?.address || "г. Москва",
				licenseNumber: clinicProfileDraft?.licenseNumber || (isDemo ? "ЛО-77-01-021345" : "—"),
				licenseDate: clinicProfileDraft?.licenseDate || (isDemo ? "14.02.2021" : ""),
				chiefDoctorOrDirector: clinicProfileDraft?.directorFullName || doctorFullName || "Главный врач",
			},
			taxpayer: {
				fullName: patient?.fullName || defaultFullName,
				birthDate: patient?.birthDate || defaultBirthDate,
				inn: effectiveInn,
				passportSeries: series,
				passportNumber: number,
				relationship: "patient",
			},
			patient: {
				fullName: patient?.fullName || defaultFullName,
				birthDate: patient?.birthDate || defaultBirthDate,
				inn: effectiveInn,
				passportSeries: series,
				passportNumber: number,
			},
			aggregation: taxAggregated,
		};

		printTaxCertificate(certificateData);
	};

	return (
		<div
			className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-xs p-0 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
			role="dialog"
			aria-modal="true"
			aria-labelledby="clinical-package-modal-title"
			data-testid="clinical-visit-package-modal"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div
				className="relative w-full max-w-[840px] h-[92dvh] sm:h-auto sm:max-h-[90vh] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] rounded-t-[24px] sm:rounded-2xl shadow-2xl border border-[var(--line,#e2e8f0)] flex flex-col overflow-hidden"
				style={{ maxWidth: "100vw", overflowX: "clip" }}
			>
				{/* Modal Header & Tabs */}
				<IntakePackageHeader
					patient={patient}
					activeTab={activeTab}
					onSelectTab={setActiveTab}
					onClose={onClose}
				/>

				{/* Body Content */}
				<div className="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-3.5">
					{/* Patient & Representative & Somatic Norm Section */}
					<IntakeRepresentativeSection
						patient={patient}
						isNormApplied={isNormApplied}
						onToggleNorm={() => setIsNormApplied((prev) => !prev)}
						activeTab={activeTab}
					/>

					{/* Document Checklists (Primary or Clinical) */}
					{activeTab === "primary" || activeTab === "clinical" ? (
						<IntakePackageChecklist
							items={currentPackageItems}
							documentsByKind={documentsByKind}
							missingCount={missingKinds.length}
							onOpenDocument={onOpenDocument}
							onCreateDocument={onCreateDocument}
							onSelectDocumentKind={onSelectDocumentKind}
						/>
					) : null}

					{/* Tax 13% NDFL Section */}
					{activeTab === "tax" ? (
						<IntakeTaxSection
							selectedTaxYear={selectedTaxYear}
							onSelectYear={setSelectedTaxYear}
							taxAggregated={taxAggregated}
						/>
					) : null}
				</div>

				{/* Footer with STRICT 1 Primary CTA Button (Mandates 8am & 8e & Apple HIG) */}
				<IntakePackageFooter
					activeTab={activeTab}
					onClose={onClose}
					onPrintBlank={() => handlePrintPrimaryPackage(true)}
					onPrintPrimaryPackage={() => handlePrintPrimaryPackage(false)}
					onPrintClinicalPackage={() => handlePrintClinicalPackage(false)}
					onPrintTaxCertificate={handlePrintTaxCertificate}
				/>
			</div>
		</div>
	);
}

export default ClinicalVisitPackageModal;
