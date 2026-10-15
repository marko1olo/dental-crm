import React, { useState, type ReactElement } from "react";
import { createPortal } from "react-dom";
import { type DocumentKind, type GeneratedDocument, type Patient } from "@dental/shared";
import {
	X,
	CheckCircle2,
	Clock,
	PlusCircle,
	FileText,
	ShieldCheck,
	Zap,
	Printer,
	Sparkles,
	MoreHorizontal,
	FileSignature,
} from "lucide-react";
import { formatShortDate } from "../../AppHelpers";
import { DentalMirrorProbe } from "../icons/DentalIcons";
import { printPrimaryIntakePackage } from "./primaryIntakePackagePrintEngine";
import { DigitalSignatureTabletModal } from "./DigitalSignatureTabletModal";
import { useDocumentStore } from "../../store/documentStore";
import { showToast } from "../GlobalToast";
import "./documentNavigation.css";

export interface PrimaryIntakePackageModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patient: Patient | null;
	readonly existingDocuments: GeneratedDocument[];
	readonly onCreateDocument: (kind: DocumentKind) => void;
	readonly onOpenDocument: (documentId: string) => void;
	readonly onSelectDocumentKind: (kind: DocumentKind) => void;
	readonly onOpenAutoclaveLog257?: () => void;
	readonly doctorFullName?: string | null | undefined;
	readonly clinicProfileDraft?: any | undefined;
}

interface StatutoryIntakeItem {
	kind: DocumentKind;
	title: string;
	statutoryRef: string;
	description: string;
	required: boolean;
}

const INTAKE_STATUTORY_ITEMS: readonly StatutoryIntakeItem[] = [
	{
		kind: "paid_medical_services_contract",
		title: "Договор на медицинские услуги",
		statutoryRef: "Постановление Правительства РФ от 11.05.2023 № 736",
		description: "Обязательный договор с пациентом/заказчиком до начала любых платных медицинских манипуляций.",
		required: true,
	},
	{
		kind: "informed_consent",
		title: "Информированное согласие на осмотр и диагностику (ИДС)",
		statutoryRef: "Федеральный закон № 323-ФЗ ст. 20, Приказ Минздрава № 1051н",
		description: "Согласие на первичный осмотр, сбор анамнеза, инструментальное обследование и местную анестезию.",
		required: true,
	},
	{
		kind: "personal_data_processing_consent",
		title: "Согласие на обработку персональных данных",
		statutoryRef: "Федеральный закон № 152-ФЗ ст. 6, 9, 10 (специальные категории: здоровье)",
		description: "Правовое основание для ведения электронной медицинской карты и связи с пациентом.",
		required: true,
	},
	{
		kind: "patient_intake_questionnaire",
		title: "Анкета первичного пациента о состоянии здоровья",
		statutoryRef: "Клинические рекомендации СтАР / СанПиН",
		description: "Сбор аллергоанамнеза, соматических патологий, непереносимости анестетиков и постоянных медикаментов.",
		required: true,
	},
];

const CONSENT_1051N_INTERVENTION_TYPES = [
	{ id: "comprehensive_1051n", label: "Осмотр и диагностика (1051н)" },
	{ id: "therapy_endo", label: "Терапия и эндодонтия" },
	{ id: "anesthesia", label: "Местная анестезия" },
	{ id: "surgery", label: "Хирургия и удаление" },
	{ id: "prosthetics", label: "Ортопедия" },
] as const;

export function PrimaryIntakePackageModal({
	isOpen,
	onClose,
	patient,
	existingDocuments,
	onCreateDocument,
	onOpenDocument,
	onSelectDocumentKind,
	onOpenAutoclaveLog257,
	doctorFullName,
	clinicProfileDraft,
}: PrimaryIntakePackageModalProps): ReactElement | null {
	if (!isOpen) return null;

	const [isNormApplied, setIsNormApplied] = useState(false);
	const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
	const [isSignatureTabletOpen, setIsSignatureTabletOpen] = useState(false);
	const [isSignedPep, setIsSignedPep] = useState(false);
	const [selectedInterventions, setSelectedInterventions] = useState<string[]>([
		"comprehensive_1051n",
		"therapy_endo",
		"anesthesia",
	]);

	const toggleIntervention = (id: string) => {
		setSelectedInterventions((prev) =>
			prev.includes(id)
				? prev.length > 1
					? prev.filter((x) => x !== id)
					: prev
				: [...prev, id],
		);
	};

	const handleConfirmSignatureFromTablet = async () => {
		for (const kind of missingKinds) {
			onCreateDocument(kind);
		}
		setIsNormApplied(true);
		setIsSignedPep(true);
		setIsSignatureTabletOpen(false);
		showToast(
			"Экспресс-пакет первичного визита утвержден и подписан ПЭП (63-ФЗ)",
			"success",
			4500,
		);
	};

	const documentsByKind = new Map<DocumentKind, GeneratedDocument[]>();
	for (const doc of existingDocuments ?? []) {
		const list = documentsByKind.get(doc.kind) ?? [];
		list.push(doc);
		documentsByKind.set(doc.kind, list);
	}

	const missingKinds = INTAKE_STATUTORY_ITEMS.filter(
		(item) => !documentsByKind.has(item.kind),
	).map((item) => item.kind);

	const handleBatchCreate = () => {
		for (const kind of missingKinds) {
			onCreateDocument(kind);
		}
	};

	const handleFillSomaticNorm = () => {
		const store = useDocumentStore.getState();
		if (!store.intakeChiefComplaint.trim()) {
			store.setIntakeChiefComplaint("Плановый осмотр и консультация (жалоб нет)");
		}
		store.setIntakeAllergyStatus("Аллергии и нежелательные реакции со слов пациента не отмечены.");
		store.setIntakeCurrentMedications("Постоянные препараты со слов пациента не принимает.");
		store.setIntakeChronicConditions("Хронические заболевания со слов пациента отрицает.");
		store.setIntakeAnticoagulants("Антикоагулянты и дезагреганты со слов пациента не принимает.");
		store.setIntakeInfectiousRiskNotes("Инфекционные риски (гепатиты B/C, ВИЧ, туберкулез) не заявлены.");
		store.setIntakeCardioEndocrineNotes("Сердечно-сосудистые и эндокринные патологии со слов пациента отрицает.");
		store.setIntakePregnancyStatus("not_applicable");
		store.setIntakeAccuracyConfirmed(true);
		setIsNormApplied(true);

		if (!documentsByKind.has("patient_intake_questionnaire")) {
			onCreateDocument("patient_intake_questionnaire");
		}
		showToast("Анкета здоровья заполнена нормой: соматически здоров, противопоказаний нет", "success", 3500);
	};

	const clinicPrintPayload = clinicProfileDraft
		? {
				clinicName: clinicProfileDraft.clinicName || "Стоматологическая клиника",
				legalName: clinicProfileDraft.legalName || clinicProfileDraft.clinicName || "",
				fullName: clinicProfileDraft.legalName || clinicProfileDraft.clinicName || "",
				shortName: clinicProfileDraft.clinicName || "",
				inn: clinicProfileDraft.inn || "",
				kpp: clinicProfileDraft.kpp || "",
				ogrn: clinicProfileDraft.ogrn || "",
				licenseNumber: clinicProfileDraft.licenseNumber || "",
				licenseDate: clinicProfileDraft.licenseDate || "",
				address: clinicProfileDraft.address || "",
				actualAddress: clinicProfileDraft.address || "",
				phone: clinicProfileDraft.phone || "",
				directorTitle: clinicProfileDraft.directorTitle || "Руководитель",
				directorFullName: clinicProfileDraft.directorFullName || "",
				city: clinicProfileDraft.city || "",
				website: clinicProfileDraft.website || "",
			}
		: {
				clinicName: "Стоматологическая клиника",
				legalName: "",
				fullName: "",
				shortName: "",
				inn: "",
				kpp: "",
				ogrn: "",
				licenseNumber: "",
				licenseDate: "",
				address: "",
				actualAddress: "",
				phone: "",
				directorTitle: "Руководитель",
				directorFullName: "",
				city: "",
				website: "",
			};

	const handleBatchPrint = () => {
		const store = useDocumentStore.getState();
		const adminProfile = (patient as any)?.administrativeProfile;
		const repFullName =
			adminProfile?.legalRepresentativeFullName || store.minorRepresentativeFullName;
		const representative = repFullName
			? {
					fullName: repFullName,
					relationship:
						adminProfile?.legalRepresentativeRelationship ||
						store.minorRepresentativeRelationship ||
						"Законный представитель",
					phone:
						adminProfile?.legalRepresentativePhone ||
						store.minorRepresentativePhone ||
						patient?.phone,
					passport:
						adminProfile?.legalRepresentativeIdentityDocument ||
						store.minorRepresentativeIdentityDocument,
					basisDocument:
						adminProfile?.legalRepresentativeBasisDocument ||
						store.minorRepresentativeAuthorityDocument,
				}
			: null;

		printPrimaryIntakePackage({
			patient: patient
				? {
						fullName: patient.fullName,
						birthDate: patient.birthDate,
						phone: patient.phone,
						snils: (patient as any)?.administrativeProfile?.snils || (patient as any)?.snils,
						registrationAddress: (patient as any)?.administrativeProfile?.registrationAddress || (patient as any)?.address,
						address: (patient as any)?.administrativeProfile?.registrationAddress || (patient as any)?.address,
						passportSeries: (patient as any)?.administrativeProfile?.passportSeries,
						passportNumber: (patient as any)?.administrativeProfile?.passportNumber,
						passportIssuedBy: (patient as any)?.administrativeProfile?.passportIssuedBy,
						passportIssuedDate: (patient as any)?.administrativeProfile?.passportIssuedDate,
						passportDepartmentCode: (patient as any)?.administrativeProfile?.passportDepartmentCode,
						gender: (patient as any)?.gender,
						cardNumber: (patient as any)?.cardNumber,
					}
				: null,
			representative,
			clinic: clinicPrintPayload,
			doctorFullName: doctorFullName || null,
			intakeNormApplied: isNormApplied || Boolean(store.intakeAccuracyConfirmed),
			questionnaireAnswers: {
				complaint: store.intakeChiefComplaint,
				allergies: store.intakeAllergyStatus,
				medications: store.intakeCurrentMedications,
				chronic: store.intakeChronicConditions,
				anticoagulants: store.intakeAnticoagulants,
				infections: store.intakeInfectiousRiskNotes,
				cardioEndocrine: store.intakeCardioEndocrineNotes,
				pregnancy: store.intakePregnancyStatus,
			},
		});
		showToast("Первичный пакет документов (Договор, Согласие ИДС, Персональные данные, Анкета здоровья) отправлен на печать", "success", 4000);
	};

	const handlePrintBlankPackage = () => {
		printPrimaryIntakePackage({
			patient: null,
			representative: null,
			clinic: clinicPrintPayload,
			doctorFullName: doctorFullName || null,
			intakeNormApplied: false,
		});
		showToast("Чистый первичный пакет («________») отправлен на печать", "info", 4000);
	};

	const activeInterventionLabels = CONSENT_1051N_INTERVENTION_TYPES.filter((t) =>
		selectedInterventions.includes(t.id),
	)
		.map((t) => t.label)
		.join(", ");

	// Закон Анти-Матрёшки (Мандат 8c/8d): глубина модалки строго 1
	if (isSignatureTabletOpen) {
		return (
			<DigitalSignatureTabletModal
				isOpen={isSignatureTabletOpen}
				onClose={() => setIsSignatureTabletOpen(false)}
				documentsPackageTitle={`Экспресс-пакет первичного визита (Договор 736, ИДС 1051н: ${activeInterventionLabels})`}
				patient={patient}
				doctorFullName={doctorFullName ?? null}
				clinicName={clinicProfileDraft?.clinicName || "Стоматологическая клиника"}
				onConfirmSignature={handleConfirmSignatureFromTablet}
				onPrintArchiveA4={handleBatchPrint}
			/>
		);
	}

	const modalNode = (
		<div
			className="document-package-modal-overlay"
			role="dialog"
			aria-modal="true"
			aria-labelledby="intake-package-modal-title"
			data-testid="modal-primary-intake-package"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div className="document-package-modal-content">
				<div className="document-package-modal-header">
					<h3 className="document-package-modal-title" id="intake-package-modal-title">
						<DentalMirrorProbe size={18} className="text-teal-600 dark:text-teal-400" aria-hidden="true" />
						<span>Экспресс-пакет первичного пациента (Договор 736 + ИДС 1051н)</span>
					</h3>
					<button
						type="button"
						className="secondary-button"
						onClick={onClose}
						aria-label="Закрыть модальное окно"
					>
						<X size={18} aria-hidden="true" />
					</button>
				</div>

				<div className="document-package-modal-body">
					{patient ? (
						<div className="document-package-patient-card">
							<div>
								<strong>{patient.fullName}</strong>
								<div style={{ fontSize: "12px", color: "var(--muted, #64748b)" }}>
									{patient.birthDate ? `Дата рождения: ${formatShortDate(patient.birthDate)} · ` : ""}
									{patient.phone ? `Тел: ${patient.phone}` : "Телефон не указан"}
								</div>
							</div>
							<div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
								<button
									type="button"
									className="secondary-button"
									data-testid="fill-somatic-norm-header-btn"
									onClick={handleFillSomaticNorm}
									style={{
										fontSize: "12.5px",
										minHeight: "36px",
										display: "inline-flex",
										alignItems: "center",
										gap: "6px",
										background: isNormApplied ? "var(--success-surface, rgba(16, 185, 129, 0.1))" : "var(--teal-surface, rgba(13, 148, 136, 0.08))",
										borderColor: isNormApplied ? "var(--success-fg, #10b981)" : "var(--teal, #0d9488)",
										color: isNormApplied ? "var(--success-fg, #10b981)" : "var(--teal, #0d9488)",
										fontWeight: 600,
									}}
									title="Заполнить все 10 пунктов соматической анкеты физиологической нормой: аллергий нет, анестетики переносит, гемостаз в норме"
								>
									<Sparkles size={14} aria-hidden="true" />
									<span>{isNormApplied ? "Анкета: соматически здоров (норма)" : "Заполнить анкету: Соматически здоров / норма"}</span>
								</button>
								<span className="document-patient-badge">
									<ShieldCheck size={14} aria-hidden="true" />
									{missingKinds.length === 0 || isSignedPep ? "Пакет полностью укомплектован" : `Не хватает ${missingKinds.length} из 4 документов`}
								</span>
							</div>
						</div>
					) : (
						<div className="empty-state-banner">
							Пациент не выбран. Выберите пациента в картотеке для автоматической привязки реквизитов.
						</div>
					)}

					{/* Профиль вмешательства ИДС 1051н в 1 клик */}
					<div
						style={{
							padding: "8px 12px",
							borderRadius: "8px",
							background: "var(--paper-soft, #f8fafc)",
							border: "1px solid var(--line, #e2e8f0)",
						}}
						data-testid="consent-1051n-intervention-selector"
					>
						<div style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted, #64748b)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.03em" }}>
							Объем вмешательств по ИДС (Приказ Минздрава № 1051н) — выбор в 1 клик:
						</div>
						<div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
							{CONSENT_1051N_INTERVENTION_TYPES.map((typeItem) => {
								const isActive = selectedInterventions.includes(typeItem.id);
								return (
									<button
										key={typeItem.id}
										type="button"
										onClick={() => toggleIntervention(typeItem.id)}
										data-testid={`chip-1051n-${typeItem.id}`}
										style={{
											minHeight: "28px",
											height: "28px",
											padding: "0 10px",
											borderRadius: "6px",
											fontSize: "11.5px",
											fontWeight: 600,
											cursor: "pointer",
											display: "inline-flex",
											alignItems: "center",
											gap: "5px",
											border: isActive ? "1px solid var(--teal, #0d9488)" : "1px solid var(--line, #e2e8f0)",
											background: isActive ? "var(--teal, #0d9488)" : "var(--paper, #ffffff)",
											color: isActive ? "#ffffff" : "var(--ink, #0f172a)",
											transition: "all 0.15s ease",
										}}
									>
										{isActive && <CheckCircle2 size={12} aria-hidden="true" />}
										<span>{typeItem.label}</span>
									</button>
								);
							})}
						</div>
					</div>

					<div className="document-package-checklist">
						{INTAKE_STATUTORY_ITEMS.map((item) => {
							const existingList = documentsByKind.get(item.kind) ?? [];
							const latestDoc = existingList[0];
							const isIssued = latestDoc?.status === "issued" || isSignedPep;
							const isDraft = latestDoc?.status === "draft" && !isSignedPep;
							const isQuestionnaire = item.kind === "patient_intake_questionnaire";
							const isConsent1051n = item.kind === "informed_consent";

							return (
								<div className="document-package-item-card" key={item.kind}>
									<div className="document-package-item-info">
										<div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
											{isIssued ? (
												<CheckCircle2 size={18} color="var(--success-fg, #10b981)" aria-hidden="true" />
											) : isDraft ? (
												<Clock size={18} color="var(--warn-fg, #f59e0b)" aria-hidden="true" />
											) : (
												<PlusCircle size={18} color="var(--muted, #94a3b8)" aria-hidden="true" />
											)}
											<span className="document-package-item-title">{item.title}</span>
											{isIssued ? (
												<>
													<span
														style={{
															fontSize: "11px",
															fontWeight: 700,
															padding: "2px 8px",
															borderRadius: "6px",
															background: "rgba(13, 148, 136, 0.12)",
															color: "var(--teal, #0d9488)",
															border: "1px solid rgba(13, 148, 136, 0.25)",
														}}
														data-testid={`intake-badge-pep-${item.kind}`}
													>
														Подписано ПЭП
													</span>
													<span
														style={{
															fontSize: "11px",
															fontWeight: 700,
															padding: "2px 8px",
															borderRadius: "6px",
															background: "rgba(99, 102, 241, 0.12)",
															color: "#6366f1",
															border: "1px solid rgba(99, 102, 241, 0.25)",
														}}
														data-testid={`intake-badge-archive-${item.kind}`}
													>
														Архив
													</span>
												</>
											) : (
												<span
													style={{
														fontSize: "11px",
														fontWeight: 700,
														padding: "2px 8px",
														borderRadius: "6px",
														background: "rgba(245, 158, 11, 0.12)",
														color: "#d97706",
														border: "1px solid rgba(245, 158, 11, 0.25)",
													}}
													data-testid={`intake-badge-requires-sign-${item.kind}`}
												>
													Требуется подпись
												</span>
											)}
										</div>
										<span className="document-package-item-sub">
											<strong>{item.statutoryRef}</strong> —{" "}
											{isConsent1051n
												? `Согласие на виды вмешательств: ${activeInterventionLabels}.`
												: item.description}
										</span>
									</div>

									<div className="document-package-item-actions">
										{isQuestionnaire && (
											<button
												type="button"
												className="secondary-button"
												data-testid="questionnaire-row-norm-btn"
												onClick={handleFillSomaticNorm}
												style={{
													fontSize: "12px",
													minHeight: "32px",
													display: "inline-flex",
													alignItems: "center",
													gap: "5px",
													color: "var(--teal, #0d9488)",
													fontWeight: 600,
												}}
												title="Заполнить анкету соматической нормой"
											>
												<Sparkles size={13} aria-hidden="true" />
												<span>{isNormApplied ? "Норма" : "Заполнить нормой"}</span>
											</button>
										)}

										{latestDoc ? (
											<>
												<button
													type="button"
													className="secondary-button"
													onClick={() => onOpenDocument(latestDoc.id)}
												>
													Открыть
												</button>
												<button
													type="button"
													className="text-button"
													onClick={() => {
														onSelectDocumentKind(item.kind);
														onClose();
													}}
												>
													{isDraft ? "Редактировать черновик" : "Параметры"}
												</button>
											</>
										) : (
											<button
												type="button"
												className="primary-button"
												onClick={() => {
													onSelectDocumentKind(item.kind);
													onCreateDocument(item.kind);
												}}
											>
												<Zap size={14} aria-hidden="true" />
												Создать
											</button>
										)}
									</div>
								</div>
							);
						})}
					</div>
				</div>

				<div className="document-package-modal-footer">
					<div style={{ display: "flex", gap: "8px", flexWrap: "nowrap", alignItems: "center" }}>
						{missingKinds.length > 0 ? (
							<button
								type="button"
								className="secondary-button"
								onClick={handleBatchCreate}
								style={{
									height: "34px",
									minHeight: "34px",
									padding: "0 12px",
									borderRadius: "8px",
									display: "inline-flex",
									alignItems: "center",
									gap: "6px",
									fontSize: "12.5px",
									fontWeight: 600,
									whiteSpace: "nowrap",
								}}
								title="Сформировать недостающие документы первичного пакета в базе данных"
							>
								<Zap size={14} aria-hidden="true" />
								<span>Сформировать в базе ({missingKinds.length})</span>
							</button>
						) : (
							<span className="inline-flex items-center gap-1.5" style={{ fontSize: "12.5px", color: "var(--success-fg, #10b981)", fontWeight: 600 }}>
								<CheckCircle2 size={14} aria-hidden="true" />
								Все 4 документа созданы в базе
							</span>
						)}

						<button
							type="button"
							className="primary-button"
							data-testid="print-primary-intake-package-btn"
							onClick={handleBatchPrint}
							style={{
								height: "34px",
								minHeight: "34px",
								background: "var(--teal, #0d9488)",
								color: "#ffffff",
								fontSize: "12.5px",
								fontWeight: 700,
								display: "inline-flex",
								alignItems: "center",
								gap: "6px",
								padding: "0 14px",
								borderRadius: "8px",
								cursor: "pointer",
								border: "none",
								whiteSpace: "nowrap",
							}}
							title="Печать всего комплекта (Договор + Согласие ИДС + Персональные данные + Анкета здоровья) под ручную подпись"
						>
							<Printer size={15} aria-hidden="true" />
							<span>Распечатать весь пакет (4 бланка)</span>
						</button>

						<button
							type="button"
							className="secondary-button"
							data-testid="sign-primary-intake-package-btn"
							onClick={() => setIsSignatureTabletOpen(true)}
							style={{
								height: "34px",
								minHeight: "34px",
								display: "inline-flex",
								alignItems: "center",
								gap: "6px",
								fontSize: "12.5px",
								fontWeight: 600,
								border: "1px solid var(--teal, #0d9488)",
								color: "var(--teal, #0d9488)",
								background: "var(--teal-surface, rgba(13, 148, 136, 0.08))",
								padding: "0 12px",
								borderRadius: "8px",
								cursor: "pointer",
								whiteSpace: "nowrap",
							}}
							title="Подписание первичного пакета пациентом на экране (Digital Signature Canvas) или через СМС (ПЭП 63-ФЗ)"
						>
							<FileSignature size={15} aria-hidden="true" />
							<span>Подписать на планшете (ПЭП)</span>
						</button>
					</div>

					{/* Вторичные действия вынесены в компактное меню ... по Закону Миллера (Мандат 8d) */}
					<div className="relative inline-flex items-center">
						<button
							type="button"
							className="secondary-button"
							onClick={() => setIsMoreMenuOpen((v) => !v)}
							title="Дополнительные действия (анкета соматики, чистые бланки, закрыть)"
							aria-label="Дополнительные действия"
							data-testid="primary-intake-more-btn"
							style={{ minHeight: "36px", padding: "0 10px", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
						>
							<MoreHorizontal size={18} aria-hidden="true" />
						</button>

						{isMoreMenuOpen && (
							<div
								className="fixed inset-0 z-30 cursor-default"
								onClick={() => setIsMoreMenuOpen(false)}
								aria-hidden="true"
							/>
						)}

						<div
							className={`absolute right-0 bottom-full mb-2 w-72 rounded-xl border border-[var(--line)] bg-[var(--paper)] shadow-2xl z-40 py-1.5 ${
								isMoreMenuOpen ? "block" : "hidden"
							}`}
							style={{ background: "var(--paper, #ffffff)", border: "1px solid var(--line, #e2e8f0)" }}
							data-testid="primary-intake-more-menu"
						>
							<button
								type="button"
								className="secondary-button w-full"
								data-testid="footer-fill-somatic-norm-btn"
								onClick={() => {
									setIsMoreMenuOpen(false);
									handleFillSomaticNorm();
								}}
								style={{
									width: "100%",
									border: "none",
									background: "transparent",
									display: "flex",
									alignItems: "center",
									justifyContent: "flex-start",
									gap: "8px",
									padding: "8px 12px",
									fontSize: "13px",
									fontWeight: 600,
									color: "var(--ink, #0f172a)",
									cursor: "pointer",
									minHeight: "36px",
								}}
								title="Заполнить анкету здоровья нормой (аллергий нет, противопоказаний нет)"
							>
								<Sparkles size={15} className="text-teal-600 dark:text-teal-400 shrink-0" aria-hidden="true" />
								<span>{isNormApplied ? "Анкета в норме" : "Анкета: заполнить нормой"}</span>
							</button>
							<button
								type="button"
								className="secondary-button w-full"
								data-testid="print-blank-intake-package-btn"
								onClick={() => {
									setIsMoreMenuOpen(false);
									handlePrintBlankPackage();
								}}
								style={{
									width: "100%",
									border: "none",
									background: "transparent",
									display: "flex",
									alignItems: "center",
									justifyContent: "flex-start",
									gap: "8px",
									padding: "8px 12px",
									fontSize: "13px",
									fontWeight: 600,
									color: "var(--ink, #0f172a)",
									cursor: "pointer",
									minHeight: "36px",
								}}
								title="Печать чистых бланков всего пакета со строками «________» для ручного заполнения"
							>
								<FileText size={15} className="text-[var(--muted)] shrink-0" aria-hidden="true" />
								<span>Печать чистых бланков пакета («________»)</span>
							</button>
							{onOpenAutoclaveLog257 && (
								<button
									type="button"
									className="secondary-button w-full"
									data-testid="primary-intake-open-autoclave-log-btn"
									onClick={() => {
										setIsMoreMenuOpen(false);
										onOpenAutoclaveLog257();
									}}
									style={{
										width: "100%",
										border: "none",
										background: "transparent",
										display: "flex",
										alignItems: "center",
										justifyContent: "flex-start",
										gap: "8px",
										padding: "8px 12px",
										fontSize: "13px",
										fontWeight: 600,
										color: "var(--teal, #0d9488)",
										cursor: "pointer",
										minHeight: "36px",
									}}
									title="Журнал контроля стерилизации и автоклавирования для проверок"
								>
									<ShieldCheck size={15} className="text-teal-600 dark:text-teal-400 shrink-0" aria-hidden="true" />
									<span>Журнал стерилизации и автоклавирования</span>
								</button>
							)}
							<div style={{ height: "1px", background: "var(--line, #e2e8f0)", margin: "4px 0" }} />
							<button
								type="button"
								className="secondary-button w-full"
								onClick={() => {
									setIsMoreMenuOpen(false);
									onClose();
								}}
								style={{
									width: "100%",
									border: "none",
									background: "transparent",
									display: "flex",
									alignItems: "center",
									justifyContent: "flex-start",
									gap: "8px",
									padding: "8px 12px",
									fontSize: "13px",
									fontWeight: 600,
									color: "var(--muted, #64748b)",
									cursor: "pointer",
									minHeight: "36px",
								}}
							>
								<X size={15} className="shrink-0" aria-hidden="true" />
								<span>Закрыть окно</span>
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
	return typeof document !== "undefined" && document.body ? createPortal(modalNode, document.body) : modalNode;
}
