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
	Stethoscope,
	ShieldCheck,
	Zap,
	Printer,
} from "lucide-react";
import { formatShortDate } from "../../AppHelpers";
import { printClinicalPackage } from "./clinicalPackagePrintEngine";

export interface ClinicalVisitPackageModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patient: Patient | null;
	readonly doctorFullName?: string | null;
	readonly existingDocuments: GeneratedDocument[];
	readonly onCreateDocument: (kind: DocumentKind) => void;
	readonly onOpenDocument: (documentId: string) => void;
	readonly onSelectDocumentKind: (kind: DocumentKind) => void;
	// biome-ignore lint/suspicious/noExplicitAny: clinic profile settings draft
	readonly clinicProfileDraft?: any;
}

interface ClinicalItem {
	kind: DocumentKind;
	title: string;
	statutoryRef: string;
	description: string;
}

const CLINICAL_STATUTORY_ITEMS: readonly ClinicalItem[] = [
	{
		kind: "dental_medical_card_043u",
		title: "Медицинская карта стоматологического больного (Форма № 043/у)",
		statutoryRef: "Приказ Минздрава России от 15.12.2014 № 834н",
		description: "Основная форма первичного и повторного учёта состояния зубочелюстной системы, формулы зубного ряда и анамнеза.",
	},
	{
		kind: "treatment_plan",
		title: "Протокол приёма и комплексный план лечения (Форма 043/у)",
		statutoryRef: "Клинические протоколы СтАР / Минздрав РФ",
		description: "Фиксация объективного статуса, протокола препарирования, пломбирования, этапов и стоимости лечения.",
	},
	{
		kind: "prescription_medication_order",
		title: "Рецептурный бланк (Форма № 107-1/у)",
		statutoryRef: "Приказ Минздрава России от 24.11.2021 № 1094н",
		description: "Официальное назначение антибактериальных, противовоспалительных, анальгетических и антигистаминных препаратов.",
	},
	{
		kind: "xray_cbct_referral",
		title: "Направление на рентгенографию / КЛКТ / ОПТГ",
		statutoryRef: "СанПиН 2.6.1.1192-03, Приказ Минздрава № 804н",
		description: "Направление на лучевую диагностику (3D томография, ортопантомограмма, прицельный снимок) с обоснованием цели.",
	},
	{
		kind: "post_visit_recommendations",
		title: "Памятка и рекомендации пациенту после приёма",
		statutoryRef: "Закон РФ «О защите прав потребителей» № 2300-1",
		description: "Инструкция по уходу за полостью рта, приёму назначенных медикаментов, ограничениям в питании и тревожным симптомам.",
	},
];

export function ClinicalVisitPackageModal({
	isOpen,
	onClose,
	patient,
	doctorFullName,
	existingDocuments,
	onCreateDocument,
	onOpenDocument,
	onSelectDocumentKind,
	clinicProfileDraft,
}: ClinicalVisitPackageModalProps): React.JSX.Element | null {
	if (!isOpen) return null;

	const documentsByKind = new Map<DocumentKind, GeneratedDocument[]>();
	for (const doc of existingDocuments) {
		const list = documentsByKind.get(doc.kind) ?? [];
		list.push(doc);
		documentsByKind.set(doc.kind, list);
	}

	const missingKinds = CLINICAL_STATUTORY_ITEMS.filter(
		(item) => !documentsByKind.has(item.kind),
	).map((item) => item.kind);

	const handleBatchCreate = () => {
		for (const kind of missingKinds) {
			onCreateDocument(kind);
		}
	};

	const handleBatchPrint = () => {
		printClinicalPackage({
			patient: patient
				? {
						fullName: patient.fullName,
						birthDate: patient.birthDate,
						phone: patient.phone,
						// biome-ignore lint/suspicious/noExplicitAny: patient profile
						snils: (patient as any)?.administrativeProfile?.snils || (patient as any)?.snils,
						// biome-ignore lint/suspicious/noExplicitAny: patient profile
						registrationAddress: (patient as any)?.administrativeProfile?.registrationAddress || (patient as any)?.address,
						// biome-ignore lint/suspicious/noExplicitAny: patient profile
						address: (patient as any)?.administrativeProfile?.registrationAddress || (patient as any)?.address,
						// biome-ignore lint/suspicious/noExplicitAny: patient profile
						passportSeries: (patient as any)?.administrativeProfile?.passportSeries,
						// biome-ignore lint/suspicious/noExplicitAny: patient profile
						passportNumber: (patient as any)?.administrativeProfile?.passportNumber,
						// biome-ignore lint/suspicious/noExplicitAny: patient profile
						passportIssuedBy: (patient as any)?.administrativeProfile?.passportIssuedBy,
						// biome-ignore lint/suspicious/noExplicitAny: patient profile
						passportIssuedDate: (patient as any)?.administrativeProfile?.passportIssuedDate,
						// biome-ignore lint/suspicious/noExplicitAny: patient profile
						passportDepartmentCode: (patient as any)?.administrativeProfile?.passportDepartmentCode,
						// biome-ignore lint/suspicious/noExplicitAny: patient profile
						gender: (patient as any)?.gender,
					}
				: null,
			clinic: clinicProfileDraft
				? {
						clinicName: clinicProfileDraft.clinicName || "Стоматологическая клиника",
						legalName: clinicProfileDraft.legalName || clinicProfileDraft.clinicName || "",
						fullName: clinicProfileDraft.legalName || clinicProfileDraft.clinicName || "",
						shortName: clinicProfileDraft.clinicName || "",
						inn: clinicProfileDraft.inn || "",
						kpp: clinicProfileDraft.kpp || "",
						ogrn: clinicProfileDraft.ogrn || "",
						licenseNumber: clinicProfileDraft.licenseNumber || "",
						address: clinicProfileDraft.address || "",
						actualAddress: clinicProfileDraft.address || "",
						phone: clinicProfileDraft.phone || "",
					}
				: null,
			doctorFullName: doctorFullName || "Врач-стоматолог-терапевт",
		});
	};

	return (
		<div
			className="document-package-modal-overlay"
			role="dialog"
			aria-modal="true"
			aria-labelledby="clinical-package-modal-title"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div className="document-package-modal-content">
				<div className="document-package-modal-header">
					<h3 className="document-package-modal-title" id="clinical-package-modal-title">
						<Stethoscope size={18} className="text-teal-600 dark:text-teal-400" aria-hidden="true" />
						<span>Клинический пакет приёма врача</span>
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
					<div className="document-package-patient-card">
						<div>
							<strong>{patient ? patient.fullName : "Пациент не выбран"}</strong>
							<div style={{ fontSize: "12px", color: "var(--muted, #64748b)" }}>
								{doctorFullName ? `Лечащий врач: ${doctorFullName}` : "Врач: Текущая смена"}
								{patient?.birthDate ? ` · ${formatShortDate(patient.birthDate)}` : ""}
							</div>
						</div>
						<span className="document-patient-badge">
							<ShieldCheck size={14} aria-hidden="true" />
							{missingKinds.length === 0 ? "Все 5 бланков оформлены" : `Готово ${5 - missingKinds.length} из 5 бланков`}
						</span>
					</div>

					<div className="document-package-checklist">
						{CLINICAL_STATUTORY_ITEMS.map((item) => {
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
					<div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
						<button
							type="button"
							className="primary-button"
							onClick={handleBatchPrint}
							data-testid="clinical-batch-print-btn"
							style={{ backgroundColor: "var(--teal-fill, #0d9488)" }}
						>
							<Printer size={16} aria-hidden="true" />
							Печать терапевтического пакета (3 бланка в 1 клик)
						</button>
						{missingKinds.length > 0 ? (
							<button
								type="button"
								className="secondary-button"
								onClick={handleBatchCreate}
								data-testid="clinical-batch-create-btn"
							>
								<Zap size={16} aria-hidden="true" />
								Сформировать в базе ({missingKinds.length})
							</button>
						) : (
							<span className="inline-flex items-center gap-1.5" style={{ fontSize: "13px", color: "var(--success-fg, #10b981)", fontWeight: 600 }}>
								<CheckCircle2 size={16} aria-hidden="true" />
								Комплект в базе оформлен
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
