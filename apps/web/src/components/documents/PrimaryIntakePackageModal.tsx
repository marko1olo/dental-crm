import React, { useState, type ReactElement } from "react";
import {
	type DocumentKind,
	type GeneratedDocument,
	type Patient,
} from "@dental/shared";
import {
	X,
	CheckCircle2,
	Clock,
	PlusCircle,
	FileText,
	UserCheck,
	ShieldCheck,
	FileCode,
	Zap,
	Printer,
	Sparkles,
} from "lucide-react";
import { formatShortDate } from "../../AppHelpers";
import { printPrimaryIntakePackage } from "./primaryIntakePackagePrintEngine";
import { useDocumentStore } from "../../store/documentStore";
import { showToast } from "../GlobalToast";

export interface PrimaryIntakePackageModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patient: Patient | null;
	readonly existingDocuments: GeneratedDocument[];
	readonly onCreateDocument: (kind: DocumentKind) => void;
	readonly onOpenDocument: (documentId: string) => void;
	readonly onSelectDocumentKind: (kind: DocumentKind) => void;
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
		title: "Договор на оказание платных медицинских услуг",
		statutoryRef: "Постановление Правительства РФ от 11.05.2023 № 736",
		description: "Обязательный договор с пациентом/заказчиком до начала любых платных медицинских манипуляций.",
		required: true,
	},
	{
		kind: "informed_consent",
		title: "Информированное добровольное согласие (ИДС)",
		statutoryRef: "Федеральный закон № 323-ФЗ ст. 20, Приказ Минздрава № 1051н",
		description: "Согласие на первичный осмотр, сбор анамнеза, инструментальное обследование и местную анестезию.",
		required: true,
	},
	{
		kind: "personal_data_processing_consent",
		title: "Согласие на обработку персональных данных (ОПД)",
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

export function PrimaryIntakePackageModal({
	isOpen,
	onClose,
	patient,
	existingDocuments,
	onCreateDocument,
	onOpenDocument,
	onSelectDocumentKind,
	doctorFullName,
	clinicProfileDraft,
}: PrimaryIntakePackageModalProps): ReactElement | null {
	if (!isOpen) return null;

	const [isNormApplied, setIsNormApplied] = useState(false);

	const documentsByKind = new Map<DocumentKind, GeneratedDocument[]>();
	for (const doc of existingDocuments) {
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
		showToast("Анкета здоровья заполнена нормой: соматически здоров, противопоказаний нет (1 клик)", "success", 3500);
	};

	const handleBatchPrint = () => {
		const store = useDocumentStore.getState();
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
					}
				: null,
			clinic: clinicProfileDraft ? {
				clinicName: clinicProfileDraft.clinicName || "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
				legalName: clinicProfileDraft.legalName || "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
				fullName: clinicProfileDraft.legalName || "Общество с ограниченной ответственностью «ДЕНТЕ СТОМАТОЛОГИЯ»",
				shortName: clinicProfileDraft.clinicName || "ООО «ДЕНТЕ»",
				inn: clinicProfileDraft.inn || "7707083893",
				kpp: clinicProfileDraft.kpp || "770101001",
				ogrn: clinicProfileDraft.ogrn || "1027700132195",
				licenseNumber: clinicProfileDraft.licenseNumber || "ЛО41-01137-77/00368421",
				licenseDate: clinicProfileDraft.licenseDate || "12.10.2021",
				address: clinicProfileDraft.address || "г. Москва, ул. Большая Стоматологическая, д. 12",
				actualAddress: clinicProfileDraft.address || "г. Москва, ул. Большая Стоматологическая, д. 12",
				phone: clinicProfileDraft.phone || "+7 (495) 777-22-11",
				directorTitle: clinicProfileDraft.directorTitle || "Генеральный директор",
				directorFullName: clinicProfileDraft.directorFullName || "Барабаш С.В.",
			} : {
				clinicName: "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
				legalName: "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
				fullName: "Общество с ограниченной ответственностью «ДЕНТЕ СТОМАТОЛОГИЯ»",
				shortName: "ООО «ДЕНТЕ»",
				inn: "7707083893",
				kpp: "770101001",
				ogrn: "1027700132195",
				licenseNumber: "ЛО41-01137-77/00368421",
				licenseDate: "12.10.2021",
				address: "г. Москва, ул. Большая Стоматологическая, д. 12",
				actualAddress: "г. Москва, ул. Большая Стоматологическая, д. 12",
				phone: "+7 (495) 777-22-11",
				directorTitle: "Генеральный директор",
				directorFullName: "Барабаш С.В.",
			},
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
		showToast("Первичный пакет (4 бланка: Договор 736, ИДС 1051н, ОПД 152-ФЗ, Анкета здоровья) отправлен на печать", "success", 4000);
	};

	return (
		<div
			className="document-package-modal-overlay"
			role="dialog"
			aria-modal="true"
			aria-labelledby="intake-package-modal-title"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div className="document-package-modal-content">
				<div className="document-package-modal-header">
					<h3 className="document-package-modal-title" id="intake-package-modal-title">
						<FileText size={18} className="text-teal-600 dark:text-teal-400" aria-hidden="true" />
						<span>Экспресс-пакет первичного пациента</span>
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
									title="Заполнить все 10 пунктов соматической анкеты нормой в 1 клик: аллергий нет, анестетики переносит, гемостаз в норме"
								>
									<Sparkles size={14} aria-hidden="true" />
									<span>{isNormApplied ? "✓ Анкета: соматически здоров (норма)" : "⚡ Заполнить анкету: Соматически здоров / норма (1 клик)"}</span>
								</button>
								<span className="document-patient-badge">
									<ShieldCheck size={14} aria-hidden="true" />
									{missingKinds.length === 0 ? "Пакет полностью укомплектован" : `Не хватает ${missingKinds.length} из 4 документов`}
								</span>
							</div>
						</div>
					) : (
						<div className="empty-state-banner">
							Пациент не выбран. Выберите пациента в картотеке для автоматической привязки реквизитов.
						</div>
					)}

					<div className="document-package-checklist">
						{INTAKE_STATUTORY_ITEMS.map((item) => {
							const existingList = documentsByKind.get(item.kind) ?? [];
							const latestDoc = existingList[0];
							const isIssued = latestDoc?.status === "issued";
							const isDraft = latestDoc?.status === "draft";
							const isQuestionnaire = item.kind === "patient_intake_questionnaire";

							return (
								<div className="document-package-item-card" key={item.kind}>
									<div className="document-package-item-info">
										<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
											{isIssued ? (
												<CheckCircle2 size={18} color="var(--success-fg, #10b981)" aria-hidden="true" />
											) : isDraft ? (
												<Clock size={18} color="var(--warn-fg, #f59e0b)" aria-hidden="true" />
											) : (
												<PlusCircle size={18} color="var(--muted, #94a3b8)" aria-hidden="true" />
											)}
											<span className="document-package-item-title">{item.title}</span>
										</div>
										<span className="document-package-item-sub">
											<strong>{item.statutoryRef}</strong> — {item.description}
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
												<span>{isNormApplied ? "✓ Норма" : "⚡ Норма (1 клик)"}</span>
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
					<div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
						<button
							type="button"
							className="primary-button"
							data-testid="print-primary-intake-package-btn"
							onClick={handleBatchPrint}
							style={{
								minHeight: "44px",
								background: "var(--teal, #0d9488)",
								color: "#ffffff",
								fontWeight: 700,
								display: "inline-flex",
								alignItems: "center",
								gap: "8px",
								padding: "0.5rem 1.1rem",
								borderRadius: "8px",
								cursor: "pointer",
								border: "none",
							}}
							title="1-Клик печать всего комплекта (Договор №736 + ИДС №1051н + ОПД №152-ФЗ + Анкета соматики) с подчеркиваниями под ручную подпись"
						>
							<Printer size={18} aria-hidden="true" />
							<span>🖨️ Распечатать весь пакет первичного приёма (4 бланка)</span>
						</button>

						<button
							type="button"
							className="secondary-button"
							data-testid="footer-fill-somatic-norm-btn"
							onClick={handleFillSomaticNorm}
							style={{
								minHeight: "44px",
								display: "inline-flex",
								alignItems: "center",
								gap: "6px",
								fontWeight: 600,
							}}
							title="Заполнить анкету здоровья нормой (аллергий нет, противопоказаний нет)"
						>
							<Sparkles size={16} aria-hidden="true" />
							<span>{isNormApplied ? "✓ Анкета в норме" : "⚡ Анкета: норма (1 клик)"}</span>
						</button>

						{missingKinds.length > 0 ? (
							<button
								type="button"
								className="secondary-button"
								onClick={handleBatchCreate}
								style={{ minHeight: "44px" }}
							>
								<Zap size={16} aria-hidden="true" />
								Сформировать в базе ({missingKinds.length})
							</button>
						) : (
							<span className="inline-flex items-center gap-1.5" style={{ fontSize: "13px", color: "var(--success-fg, #10b981)", fontWeight: 600 }}>
								<CheckCircle2 size={16} aria-hidden="true" />
								Все 4 документа созданы в базе
							</span>
						)}
					</div>
					<button
						type="button"
						className="secondary-button"
						onClick={onClose}
					>
						Закрыть
					</button>
				</div>
			</div>
		</div>
	);
}
