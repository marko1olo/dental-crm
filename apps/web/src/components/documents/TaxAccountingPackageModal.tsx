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
	Receipt,
	Building,
	FileCode2,
	Zap,
} from "lucide-react";
import { money } from "../../AppHelpers";

export interface TaxDocumentPayerOption {
	key: string;
	inn: string;
	label: string;
	amountRub: number;
	paymentCount: number;
}

export interface TaxAccountingPackageModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patient: Patient | null;
	readonly taxYear: number;
	readonly setTaxYear: (year: number) => void;
	readonly payerOptions: TaxDocumentPayerOption[];
	readonly selectedPayerKey: string;
	readonly onSelectPayerKey: (payerKey: string) => void;
	readonly existingDocuments: GeneratedDocument[];
	readonly onCreateDocument: (kind: DocumentKind) => void;
	readonly onOpenDocument: (documentId: string) => void;
	readonly onSelectDocumentKind: (kind: DocumentKind) => void;
	readonly onOpenFnsXmlModal: () => void;
}

interface TaxItem {
	kind: DocumentKind;
	title: string;
	statutoryRef: string;
	description: string;
}

const TAX_ACCOUNTING_ITEMS: readonly TaxItem[] = [
	{
		kind: "tax_deduction_certificate",
		title: "Справка об оплате медицинских услуг для ИФНС (КНД 1151156)",
		statutoryRef: "Приказ ФНС России от 08.11.2023 № ЕД-7-11/755@",
		description: "Официальная унифицированная справка для получения социального налогового вычета 13% (НДФЛ).",
	},
	{
		kind: "completed_works_act",
		title: "Акт выполненных работ / фактически оказанных услуг",
		statutoryRef: "Постановление Правительства РФ № 736, ст. 779 ГК РФ",
		description: "Акт приема-сдачи медицинских услуг с детализацией проведенных манипуляций, гарантией и подписями сторон.",
	},
	{
		kind: "payment_receipt",
		title: "Квитанция об оплате и фискальный кассовый чек",
		statutoryRef: "Федеральный закон № 54-ФЗ «О применении ККТ»",
		description: "Финансовое подтверждение оплаты услуг с указанием фискального накопителя, ФД, ФПД и признака расчета.",
	},
];

export function TaxAccountingPackageModal({
	isOpen,
	onClose,
	patient,
	taxYear,
	setTaxYear,
	payerOptions,
	selectedPayerKey,
	onSelectPayerKey,
	existingDocuments,
	onCreateDocument,
	onOpenDocument,
	onSelectDocumentKind,
	onOpenFnsXmlModal,
}: TaxAccountingPackageModalProps): React.JSX.Element | null {
	if (!isOpen) return null;

	const documentsByKind = new Map<DocumentKind, GeneratedDocument[]>();
	for (const doc of existingDocuments) {
		const list = documentsByKind.get(doc.kind) ?? [];
		list.push(doc);
		documentsByKind.set(doc.kind, list);
	}

	const missingKinds = TAX_ACCOUNTING_ITEMS.filter(
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
			aria-labelledby="tax-package-modal-title"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div className="document-package-modal-content">
				<div className="document-package-modal-header">
					<h3 className="document-package-modal-title" id="tax-package-modal-title">
						<Building className="w-5 h-5 text-indigo-600 inline" />
						<span>Налоговый вычет и бухгалтерия</span>
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
					{/* Controls for Year and Payer */}
					<div
						style={{
							display: "grid",
							gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
							gap: "12px",
							padding: "12px 16px",
							background: "var(--surface-100, #f8fafc)",
							borderRadius: "8px",
							border: "1px solid var(--line, #e2e8f0)",
						}}
					>
						<label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "12px", fontWeight: 600 }}>
							Налоговый год
							<select
								value={taxYear}
								onChange={(e) => setTaxYear(Number(e.target.value))}
								style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid var(--line, #cbd5e1)" }}
							>
								<option value={2026}>2026 (КНД 1151156)</option>
								<option value={2025}>2025 (КНД 1151156)</option>
								<option value={2024}>2024 (КНД 1151156)</option>
								<option value={2023}>2023 (архивная справка)</option>
								<option value={2022}>2022 (архивная справка)</option>
								<option value={2021}>2021 (архивная справка)</option>
							</select>
						</label>

						{payerOptions.length > 0 ? (
							<label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "12px", fontWeight: 600 }}>
								Плательщик (ИНН / Пациент)
								<select
									value={selectedPayerKey}
									onChange={(e) => onSelectPayerKey(e.target.value)}
									style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid var(--line, #cbd5e1)" }}
								>
									{payerOptions.map((opt) => (
										<option key={opt.key} value={opt.key}>
											{opt.label} · {money(opt.amountRub)} ({opt.paymentCount} чеков)
										</option>
									))}
								</select>
							</label>
						) : (
							<div style={{ display: "flex", alignItems: "center", fontSize: "12px", color: "var(--muted, #64748b)" }}>
								Пациент: {patient?.fullName || "Не выбран"}
							</div>
						)}
					</div>

					{/* 3 Accounting Documents */}
					<div className="document-package-checklist">
						{TAX_ACCOUNTING_ITEMS.map((item) => {
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

					{/* FNS XML Studio Banner */}
					<div
						style={{
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							padding: "12px 16px",
							borderRadius: "8px",
							background: "var(--brand-100, #ccfbf1)",
							border: "1px solid var(--brand-700, #0d9488)",
							gap: "12px",
						}}
					>
						<div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
							<FileCode2 size={24} color="var(--brand-800, #115e59)" aria-hidden="true" />
							<div>
								<strong style={{ fontSize: "13px", color: "var(--brand-900, #134e4a)" }}>
									Электронная выгрузка XML для ФНС (Приказ № ЕД-7-11/755@)
								</strong>
								<div style={{ fontSize: "12px", color: "var(--brand-800, #115e59)" }}>
									Автоматическая проверка XSD-схемы, ИНН, СНИЛС и формирование файла для отправки через ТКС/ЛК
								</div>
							</div>
						</div>
						<button
							type="button"
							className="primary-button"
							onClick={() => {
								onClose();
								onOpenFnsXmlModal();
							}}
						>
							Открыть XML-студию
						</button>
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
								Все документы налогового пакета сформированы
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
