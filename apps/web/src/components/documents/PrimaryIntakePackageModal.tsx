import type React from "react";
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
} from "lucide-react";
import { formatShortDate } from "../../AppHelpers";

export interface PrimaryIntakePackageModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patient: Patient | null;
	readonly existingDocuments: GeneratedDocument[];
	readonly onCreateDocument: (kind: DocumentKind) => void;
	readonly onOpenDocument: (documentId: string) => void;
	readonly onSelectDocumentKind: (kind: DocumentKind) => void;
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
}: PrimaryIntakePackageModalProps): React.JSX.Element | null {
	if (!isOpen) return null;

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
							<span className="document-patient-badge">
								<ShieldCheck size={14} aria-hidden="true" />
								{missingKinds.length === 0 ? "Пакет полностью укомплектован" : `Не хватает ${missingKinds.length} из 4 документов`}
							</span>
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
					<div>
						{missingKinds.length > 0 ? (
							<button
								type="button"
								className="primary-button"
								onClick={handleBatchCreate}
							>
								<Zap size={16} aria-hidden="true" />
								Сформировать недостающие ({missingKinds.length}) в 1 клик
							</button>
						) : (
							<span className="inline-flex items-center gap-1.5" style={{ fontSize: "13px", color: "var(--success-fg, #10b981)", fontWeight: 600 }}>
								<CheckCircle2 size={16} aria-hidden="true" />
								Все 4 документа первичного приёма созданы
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
