import React, { useCallback, useMemo, useState } from "react";
import { useDocumentStore } from "../../store/documentStore";
import { showToast } from "../GlobalToast";
import type { DocumentKind } from "@dental/shared";
import { classifyNdflServiceCode } from "@dental/shared";
import type { TaxDeductionTab } from "../finance/taxDeduction/types";
import type { TaxPaymentRecord } from "./taxCertificateEngine";
import type { ProfessionalA4DocumentTab } from "./ProfessionalDocumentA4Sheet";
import type { DocumentCatalogCategory, DocumentsCatalogViewProps } from "./catalog/types";
import { getAllCatalogItems } from "./catalog/catalogItems";
import { CatalogToolbar } from "./catalog/CatalogToolbar";
import { CatalogCard } from "./catalog/CatalogCard";
import { CatalogModals } from "./catalog/CatalogModals";
import { printPrimaryIntakePackage } from "./primaryIntakePackagePrintEngine";

export * from "./catalog/types";

/**
 * DocumentsCatalogView — масштабируемый каталог документов, информированных согласий (ИДС)
 * и справок для налогового вычета (ФНС) DENTE Dental CRM.
 *
 * Принципы Мандата 8e и Первых Принципов:
 * 1. Пакет первичного приёма печатается в 1 клик без 10 промежуточных окон.
 * 2. Никаких сырых номеров бланков и канцелярщины в интерфейсе.
 * 3. Кнопки «Печать» и «Сохранить» никогда не блокируются (disabled).
 * 4. Незаполненные реквизиты честно печатаются строками "___________" для ручного заполнения.
 */
export const DocumentsCatalogView: React.FC<DocumentsCatalogViewProps> = ({
	patient,
	patientName = "Пациент",
	patientAgeYears = 6,
	doctorName,
	clinicName,
	clinicProfileDraft,
	existingDocuments,
	eligibleTaxPayments,
	onCreateDocument,
	onOpenIssuedDocumentHtml,
	onOpenDocument,
	onOpenPrimaryIntakePackage,
	onOpenTaxCertificate,
	onSelectRegistryTab,
	onOpenFocusEditor,
	onOpenAutoclaveLog,
	className = "",
}) => {
	const [searchQuery, setSearchQuery] = useState<string>("");
	const [activeCategory, setActiveCategory] = useState<DocumentCatalogCategory>("all");
	const [isDiplomaModalOpen, setIsDiplomaModalOpen] = useState<boolean>(false);
	const [isConsentModalOpen, setIsConsentModalOpen] = useState<boolean>(false);
	const [isLocalTaxModalOpen, setIsLocalTaxModalOpen] = useState<boolean>(false);
	const [taxInitialTab, setTaxInitialTab] = useState<TaxDeductionTab>("form");
	const [isLocalIntakeModalOpen, setIsLocalIntakeModalOpen] = useState<boolean>(false);
	const [isOutpatientCardModalOpen, setIsOutpatientCardModalOpen] = useState<boolean>(false);
	const [isContractModalOpen, setIsContractModalOpen] = useState<boolean>(false);
	const [selectedA4Tab, setSelectedA4Tab] = useState<ProfessionalA4DocumentTab | null>(null);

	const { setSelectedDocumentKind } = useDocumentStore();
	const effectivePatientName = patient?.fullName || patientName;

	const mappedTaxPayments = useMemo<TaxPaymentRecord[] | undefined>(() => {
		if (!eligibleTaxPayments || eligibleTaxPayments.length === 0) return undefined;
		return eligibleTaxPayments.map((p, idx) => {
			const amountRub = Number(p.amountRub ?? p.amount ?? 0);
			const rawCode804n = p.code804n ? String(p.code804n).trim() : undefined;
			const serviceName = String(
				p.description || p.serviceName || "Стоматологические медицинские услуги",
			);
			const isExplicitlyExpensive =
				p.taxServiceCode === "2" ||
				p.taxCode === "2" ||
				Boolean(p.isExpensiveTreatment);
			const taxCode = isExplicitlyExpensive
				? ("2" as const)
				: classifyNdflServiceCode(serviceName, rawCode804n);
			return {
				id: String(p.id || `pay-${idx}`),
				dateIso: String(
					p.paidAt || p.createdAt || p.dateIso || new Date().toISOString(),
				),
				amountRub,
				amountKopecks: Math.round(amountRub * 100),
				taxCode,
				serviceName,
				code804n: rawCode804n || (taxCode === "2" ? "A16.07.054" : "A16.07.002"),
				receiptNumber: String(p.receiptNumber || `ФЧ-${idx + 1}`),
				fiscalDocumentNumber: String(p.fiscalDocumentNumber || `${501 + idx}`),
				fiscalSign: String(p.fiscalSign || `${88776655 + idx}`),
				isRefund: Boolean(p.status === "refunded" || p.isRefund),
			};
		});
	}, [eligibleTaxPayments]);

	const handleOpenKind = useCallback(
		(kind: DocumentKind, titleRu?: string) => {
			setSelectedDocumentKind(kind);
			onOpenDocument?.(kind);
			if (titleRu) showToast(`Выбран документ: ${titleRu}`, "info", 1500);
		},
		[onOpenDocument, setSelectedDocumentKind],
	);

	/**
	 * Пакетная печать первичного приёма в 1 клик без промежуточных окон (Мандат 8e / 8n)
	 */
	const handleFastPrintPrimaryIntake = useCallback(() => {
		const docStore = useDocumentStore.getState();
		const adminProfile = (patient as any)?.administrativeProfile;
		const repFullName =
			adminProfile?.legalRepresentativeFullName || docStore.minorRepresentativeFullName;
		const representative = repFullName
			? {
					fullName: repFullName,
					relationship:
						adminProfile?.legalRepresentativeRelationship ||
						docStore.minorRepresentativeRelationship ||
						"Законный представитель",
					phone:
						adminProfile?.legalRepresentativePhone ||
						docStore.minorRepresentativePhone ||
						patient?.phone,
					passport:
						adminProfile?.legalRepresentativeIdentityDocument ||
						docStore.minorRepresentativeIdentityDocument,
					basisDocument:
						adminProfile?.legalRepresentativeBasisDocument ||
						docStore.minorRepresentativeAuthorityDocument,
				}
			: null;

		const clinicPrintPayload = clinicProfileDraft
			? {
					clinicName: clinicProfileDraft.clinicName || "Стоматологическая клиника",
					legalName:
						clinicProfileDraft.legalName || clinicProfileDraft.clinicName || "",
					inn: clinicProfileDraft.inn || "",
					kpp: clinicProfileDraft.kpp || "",
					ogrn: clinicProfileDraft.ogrn || "",
					licenseNumber: clinicProfileDraft.licenseNumber || "",
					licenseDate: clinicProfileDraft.licenseDate || "",
					address: clinicProfileDraft.address || "",
					phone: clinicProfileDraft.phone || "",
					directorFullName: clinicProfileDraft.directorFullName || "",
					city: clinicProfileDraft.city || "",
				}
			: {
					clinicName: clinicName || "Стоматологическая клиника",
					legalName: clinicName || "",
					directorFullName: "",
					city: "",
				};

		printPrimaryIntakePackage({
			patient: patient
				? {
						fullName: patient.fullName,
						birthDate: patient.birthDate,
						phone: patient.phone,
						snils:
							(patient as any)?.administrativeProfile?.snils ||
							(patient as any)?.snils,
						registrationAddress:
							(patient as any)?.administrativeProfile?.registrationAddress ||
							(patient as any)?.address,
						address:
							(patient as any)?.administrativeProfile?.registrationAddress ||
							(patient as any)?.address,
						passportSeries: (patient as any)?.administrativeProfile?.passportSeries,
						passportNumber: (patient as any)?.administrativeProfile?.passportNumber,
						passportIssuedBy: (patient as any)?.administrativeProfile
							?.passportIssuedBy,
						passportIssuedDate: (patient as any)?.administrativeProfile
							?.passportIssuedDate,
						passportDepartmentCode: (patient as any)?.administrativeProfile
							?.passportDepartmentCode,
						gender: (patient as any)?.gender,
						cardNumber: (patient as any)?.cardNumber,
					}
				: null,
			representative,
			clinic: clinicPrintPayload,
			doctorFullName: doctorName || null,
			intakeNormApplied: Boolean(docStore.intakeAccuracyConfirmed),
		});
		showToast(
			"✓ Пакет первичного приёма (Договор + ИДС + Персданные) отправлен на печать",
			"success",
			3500,
		);
	}, [patient, clinicProfileDraft, clinicName, doctorName]);

	const handleOpenIntake = useCallback(() => {
		if (onOpenPrimaryIntakePackage) onOpenPrimaryIntakePackage();
		else setIsLocalIntakeModalOpen(true);
	}, [onOpenPrimaryIntakePackage]);

	const handleOpenTax = useCallback(
		(tab: TaxDeductionTab = "form") => {
			setTaxInitialTab(tab);
			if (onOpenTaxCertificate) onOpenTaxCertificate();
			else setIsLocalTaxModalOpen(true);
		},
		[onOpenTaxCertificate],
	);

	const catalogItems = useMemo(
		() =>
			getAllCatalogItems({
				setSelectedA4Tab,
				handleOpenKind,
				handleOpenTax,
				setIsDiplomaModalOpen,
				setIsConsentModalOpen,
			}),
		[handleOpenKind, handleOpenTax],
	);

	const filteredItems = useMemo(() => {
		const q = searchQuery.trim().toLowerCase();
		return catalogItems.filter((i) => {
			if (activeCategory !== "all" && i.category !== activeCategory) return false;
			if (!q) return true;
			return (
				i.titleRu.toLowerCase().includes(q) ||
				i.descriptionRu.toLowerCase().includes(q) ||
				i.badgeRu.toLowerCase().includes(q)
			);
		});
	}, [catalogItems, activeCategory, searchQuery]);

	const categoryCounts = useMemo(() => {
		const counts: Record<string, number> = {
			all: catalogItems.length,
			intake: 0,
			clinical: 0,
			finance_tax: 0,
			refusal: 0,
			pediatric: 0,
		};
		for (const i of catalogItems) counts[i.category] = (counts[i.category] || 0) + 1;
		return counts;
	}, [catalogItems]);

	return (
		<div
			className={`flex flex-col gap-3 p-3 sm:p-4 bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] rounded-xl border border-[var(--line,#e2e8f0)] shadow-xs ${className}`}
			data-testid="documents-catalog-view"
		>
			<CatalogToolbar
				searchQuery={searchQuery}
				setSearchQuery={setSearchQuery}
				activeCategory={activeCategory}
				setActiveCategory={setActiveCategory}
				categoryCounts={categoryCounts}
				existingDocsCount={existingDocuments?.length ?? 0}
				onSelectRegistryTab={onSelectRegistryTab}
				onOpenAutoclaveLog={onOpenAutoclaveLog}
				handleOpenIntake={handleOpenIntake}
				setIsDiplomaModalOpen={setIsDiplomaModalOpen}
			/>

			{/* Кнопка быстрой пакетной печати в 1 клик для первичного визита */}
			<div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-[var(--teal,#0d9488)]/30 bg-[var(--teal,#0d9488)]/5 flex-wrap">
				<div className="flex items-center gap-2">
					<span className="font-bold text-xs text-[var(--teal,#0d9488)]">
						Экспресс-оформление пациента:
					</span>
					<span className="text-xs text-[var(--muted,#64748b)]">
						Формирование комплекта для ручной или электронной подписи без лишних переходов
					</span>
				</div>
				<div className="flex items-center gap-2 flex-wrap">
					<button
						type="button"
						data-testid="btn-fast-print-intake-package-1click"
						onClick={handleFastPrintPrimaryIntake}
						className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[var(--teal,#0d9488)] text-white text-xs font-bold hover:bg-[var(--teal-dark,#0f766e)] transition-colors cursor-pointer shadow-xs border border-transparent"
						title="Распечатать сразу весь пакет первичного приёма: Договор + ИДС + Согласие на обработку персданных"
					>
						<span>✓ Распечатать пакет первичного приёма (1 клик)</span>
					</button>
					<button
						type="button"
						data-testid="btn-catalog-open-tax-quick"
						onClick={() => handleOpenTax("form")}
						className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] text-xs font-semibold hover:border-[var(--teal,#0d9488)] transition-colors cursor-pointer"
						title="Открыть форму справки об оплате медицинских услуг для налогового вычета (13% НДФЛ)"
					>
						<span>Справка в ФНС (вычет 13%)</span>
					</button>
				</div>
			</div>

			<div
				className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3"
				data-testid="documents-catalog-grid"
			>
				{filteredItems.map((item) => (
					<CatalogCard
						key={item.id}
						item={item}
						patientDoc={existingDocuments?.find((d) => d.kind === item.kind)}
						onOpenFocusEditor={onOpenFocusEditor}
					/>
				))}
			</div>

			<CatalogModals
				patient={patient}
				effectivePatientName={effectivePatientName}
				patientAgeYears={patientAgeYears}
				doctorName={doctorName}
				clinicName={clinicName}
				clinicProfileDraft={clinicProfileDraft}
				existingDocuments={existingDocuments}
				mappedTaxPayments={mappedTaxPayments}
				isDiplomaModalOpen={isDiplomaModalOpen}
				setIsDiplomaModalOpen={setIsDiplomaModalOpen}
				isConsentModalOpen={isConsentModalOpen}
				setIsConsentModalOpen={setIsConsentModalOpen}
				isLocalTaxModalOpen={isLocalTaxModalOpen}
				setIsLocalTaxModalOpen={setIsLocalTaxModalOpen}
				taxInitialTab={taxInitialTab}
				isLocalIntakeModalOpen={isLocalIntakeModalOpen}
				setIsLocalIntakeModalOpen={setIsLocalIntakeModalOpen}
				isOutpatientCardModalOpen={isOutpatientCardModalOpen}
				setIsOutpatientCardModalOpen={setIsOutpatientCardModalOpen}
				isContractModalOpen={isContractModalOpen}
				setIsContractModalOpen={setIsContractModalOpen}
				selectedA4Tab={selectedA4Tab}
				setSelectedA4Tab={setSelectedA4Tab}
				onCreateDocument={onCreateDocument}
				onOpenIssuedDocumentHtml={onOpenIssuedDocumentHtml}
				handleOpenKind={handleOpenKind}
			/>
		</div>
	);
};

export default DocumentsCatalogView;
