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

import type { DocumentKind, GeneratedDocument } from "@dental/shared";
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
} from "./taxCertificateEngine";

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
		// biome-ignore lint/suspicious/noExplicitAny: payments aggregation
		return aggregatePatientPaymentsForTaxYear(payments as any[], selectedTaxYear);
	}, [payments, selectedTaxYear]);

	if (!isOpen) return null;

	const handlePrintPrimaryPackage = (isBlank = false) => {
		printPrimaryIntakePackage({
			// biome-ignore lint/suspicious/noExplicitAny: patient profile
			patient: isBlank ? null : (patient as any),
			clinic: clinicProfileDraft,
			doctorFullName: doctorFullName || "Врач-стоматолог-терапевт",
			intakeNormApplied: isBlank ? false : isNormApplied,
		});
	};

	const handlePrintClinicalPackage = (isBlank = false) => {
		printClinicalPackage({
			// biome-ignore lint/suspicious/noExplicitAny: patient profile
			patient: isBlank ? null : (patient as any),
			clinic: clinicProfileDraft,
			doctorFullName: doctorFullName || "Врач-стоматолог-терапевт",
		});
	};

	const handlePrintTaxCertificate = () => {
		printTaxCertificate({
			clinic: clinicProfileDraft,
			// biome-ignore lint/suspicious/noExplicitAny: patient profile
			patient: patient as any,
			taxpayerFullName: patient?.fullName || "____________________",
			// biome-ignore lint/suspicious/noExplicitAny: administrativeProfile
			effectiveInn: (patient as any)?.administrativeProfile?.snils || "",
			relationship: "self",
			selectedYear: selectedTaxYear,
			aggregated: taxAggregated,
		});
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
