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
	ShieldCheck,
	Zap,
	Scissors,
	Printer,
} from "lucide-react";
import { formatShortDate } from "../../AppHelpers";
import { printSurgicalPackage } from "./surgicalPackagePrintEngine";

export interface SurgicalPackageModalProps {
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

export interface SurgicalItem {
	kind: DocumentKind;
	title: string;
	statutoryRef: string;
	description: string;
	required: boolean;
}

export const SURGICAL_STATUTORY_ITEMS: readonly SurgicalItem[] = [
	{
		kind: "procedure_specific_consent_packet",
		title: "ИДС на хирургическое вмешательство и дентальную имплантацию",
		statutoryRef: "ФЗ № 323-ФЗ ст. 20, Приказ Минздрава РФ № 1051н",
		description: "Согласие на операцию удаления зуба, остеотомию, синус-лифтинг, костную пластику или установку имплантатов.",
		required: true,
	},
	{
		kind: "anesthesia_consent_log",
		title: "Протокол и согласие на местную/проводниковую анестезию",
		statutoryRef: "Приказ Минздрава России № 1051н / СанПиН",
		description: "Фиксация аллергоанамнеза, типа анестетика (артикаин/мепивакаин), дозировки и отсутствия противопоказаний.",
		required: true,
	},
	{
		kind: "dental_medical_card_043u",
		title: "Хирургический протокол операции в карте (Форма № 043/у)",
		statutoryRef: "Приказ Минздрава России от 15.12.2014 № 834н",
		description: "Официальный протокол хода операции, гемостаза, наложения швов, используемых шовных и костных материалов.",
		required: true,
	},
	{
		kind: "xray_cbct_referral",
		title: "Направление на контрольную рентгенодиагностику / КЛКТ 3D",
		statutoryRef: "СанПиН 2.6.1.1192-03, Приказ Минздрава № 804н",
		description: "Контроль позиционирования имплантатов, целостности кортикальной пластинки и дна гайморовой пазухи.",
		required: true,
	},
	{
		kind: "prescription_medication_order",
		title: "Рецептурный бланк (Форма № 107-1/у: антибиотики и НПВС)",
		statutoryRef: "Приказ Минздрава России от 24.11.2021 № 1094н",
		description: "Назначение превентивной антибактериальной, противовоспалительной, обезболивающей и антигистаминной терапии.",
		required: true,
	},
	{
		kind: "post_visit_recommendations",
		title: "Памятка пациента после хирургического вмешательства",
		statutoryRef: "Закон РФ «О защите прав потребителей» № 2300-1",
		description: "Правила послеоперационного режима: холод, ванночки с антисептиком, диета, ограничение физнагрузок, гигиена.",
		required: true,
	},
];

export function SurgicalPackageModal({
	isOpen,
	onClose,
	patient,
	doctorFullName,
	existingDocuments,
	onCreateDocument,
	onOpenDocument,
	onSelectDocumentKind,
	clinicProfileDraft,
}: SurgicalPackageModalProps): React.JSX.Element | null {
	if (!isOpen) return null;

	const documentsByKind = new Map<DocumentKind, GeneratedDocument[]>();
	for (const doc of existingDocuments) {
		const list = documentsByKind.get(doc.kind) ?? [];
		list.push(doc);
		documentsByKind.set(doc.kind, list);
	}

	const missingKinds = SURGICAL_STATUTORY_ITEMS.filter(
		(item) => !documentsByKind.has(item.kind),
	).map((item) => item.kind);

	const handleBatchCreate = () => {
		for (const kind of missingKinds) {
			onCreateDocument(kind);
		}
	};

	const handleBatchPrint = () => {
		printSurgicalPackage({
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
						clinicName: clinicProfileDraft.clinicName || "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
						legalName: clinicProfileDraft.legalName || "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
						fullName: clinicProfileDraft.legalName || "Общество с ограниченной ответственностью «ДЕНТЕ СТОМАТОЛОГИЯ»",
						shortName: clinicProfileDraft.clinicName || "ООО «ДЕНТЕ»",
						inn: clinicProfileDraft.inn || "7707083893",
						kpp: clinicProfileDraft.kpp || "770101001",
						ogrn: clinicProfileDraft.ogrn || "1027700132195",
						licenseNumber: clinicProfileDraft.licenseNumber || "ЛО41-01137-77/00368421",
						address: clinicProfileDraft.address || "г. Москва, ул. Большая Стоматологическая, д. 12",
						actualAddress: clinicProfileDraft.address || "г. Москва, ул. Большая Стоматологическая, д. 12",
						phone: clinicProfileDraft.phone || "+7 (495) 777-22-11",
					}
				: null,
			doctorFullName: doctorFullName || "Хирург-стоматолог",
		});
	};

	return (
		<div
			className="document-package-modal-overlay"
			role="dialog"
			aria-modal="true"
			aria-labelledby="surgical-package-modal-title"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div className="document-package-modal-content">
				<div className="document-package-modal-header">
					<h3 className="document-package-modal-title" id="surgical-package-modal-title">
						<Scissors className="w-5 h-5 text-rose-600 inline" />
						<span>Хирургический пакет приёма и операций</span>
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
								{doctorFullName ? `Хирург: ${doctorFullName}` : "Хирург: Текущая смена"}
								{patient?.birthDate ? ` · ${formatShortDate(patient.birthDate)}` : ""}
							</div>
						</div>
						<span className="document-patient-badge">
							<ShieldCheck size={14} aria-hidden="true" />
							{missingKinds.length === 0
								? "Все 6 хирургических документов укомплектованы"
								: `Готово ${SURGICAL_STATUTORY_ITEMS.length - missingKinds.length} из ${SURGICAL_STATUTORY_ITEMS.length} документов`}
						</span>
					</div>

					<div className="document-package-checklist">
						{SURGICAL_STATUTORY_ITEMS.map((item) => {
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
							data-testid="surgical-batch-print-btn"
							style={{ backgroundColor: "var(--teal-fill, #0d9488)" }}
						>
							<Printer size={16} aria-hidden="true" />
							Печать хирургического пакета (3 бланка в 1 клик)
						</button>
						{missingKinds.length > 0 ? (
							<button
								type="button"
								className="secondary-button"
								onClick={handleBatchCreate}
								data-testid="surgical-batch-create-btn"
							>
								<Zap size={16} aria-hidden="true" />
								Сформировать в базе ({missingKinds.length})
							</button>
						) : (
							<span className="inline-flex items-center gap-1.5" style={{ fontSize: "13px", color: "var(--success-fg, #10b981)", fontWeight: 600 }}>
								<CheckCircle2 size={16} aria-hidden="true" />
								Комплект в базе сформирован
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
