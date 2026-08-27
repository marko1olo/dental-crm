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
	Building,
	FileText,
	HeartPulse,
	Radiation,
	Sparkles,
	Layers,
	ShieldAlert,
} from "lucide-react";

export interface HospitalSanpinPackageModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patient: Patient | null;
	readonly existingDocuments: GeneratedDocument[];
	readonly onOpenSickLeaveEln: () => void;
	readonly onOpenAutoclaveLog257: () => void;
	readonly onOpenEgiszRemd: () => void;
	readonly onCreateDocument: (kind: DocumentKind) => void;
	readonly onSelectDocumentKind: (kind: DocumentKind) => void;
}

export function HospitalSanpinPackageModal({
	isOpen,
	onClose,
	patient,
	existingDocuments,
	onOpenSickLeaveEln,
	onOpenAutoclaveLog257,
	onOpenEgiszRemd,
	onCreateDocument,
	onSelectDocumentKind,
}: HospitalSanpinPackageModalProps): React.JSX.Element | null {
	if (!isOpen) return null;

	const radiationDocs = existingDocuments.filter(
		(d) => d.kind === "radiation_dose_sheet",
	);
	const hasRadiationDoc = radiationDocs.length > 0;

	return (
		<div
			className="document-package-modal-overlay"
			role="dialog"
			aria-modal="true"
			aria-labelledby="hospital-package-title"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div className="document-package-modal-card">
				<div className="document-package-modal-header">
					<div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
						<Building size={24} color="var(--brand-700, #0d9488)" aria-hidden="true" />
						<div>
							<h3 id="hospital-package-title" style={{ margin: 0 }}>
								Пакет «Стационар, СанПиН и Гос. Реестры»
							</h3>
							<span style={{ fontSize: "12px", color: "var(--muted, #64748b)" }}>
								{patient ? `Пациент: ${patient.fullName}` : "Гос. реестры, СанПиН и взаимодействие со стационарами"}
							</span>
						</div>
					</div>
					<button
						type="button"
						className="document-package-close-btn"
						onClick={onClose}
						aria-label="Закрыть модальное окно"
					>
						<X size={20} aria-hidden="true" />
					</button>
				</div>

				<div className="document-package-modal-body">
					<div className="document-package-items-list">
						{/* 1. БОЛЬНИЧНЫЙ ЛИСТ ЭЛН 1089н */}
						<div className="document-package-item-card">
							<div className="document-package-item-info">
								<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
									<FileText size={18} color="var(--brand-700, #0d9488)" aria-hidden="true" />
									<span className="document-package-item-title">
										Электронный листок нетрудоспособности (ЭЛН 1089н)
									</span>
								</div>
								<span className="document-package-item-sub">
									<strong>Приказ Минздрава России от 23.11.2021 № 1089н</strong> — Оформление временной нетрудоспособности при острых одонтогенных воспалениях, операциях и травмах ЧЛО.
								</span>
							</div>
							<div className="document-package-item-actions">
								<button
									type="button"
									className="primary-button"
									onClick={() => {
										onClose();
										onOpenSickLeaveEln();
									}}
								>
									Открыть студию ЭЛН
								</button>
							</div>
						</div>

						{/* 3. ЛИСТ ДОЗОВЫХ НАГРУЗОК САНПИН 2.6.1 */}
						<div className="document-package-item-card">
							<div className="document-package-item-info">
								<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
									<Radiation size={18} color="var(--warn-fg, #f59e0b)" aria-hidden="true" />
									<span className="document-package-item-title">
										Лист учёта дозовых нагрузок (СанПиН 2.6.1.1192-03)
									</span>
								</div>
								<span className="document-package-item-sub">
									<strong>СанПиН 2.6.1.1192-03 / МУ 2.6.1.2944-11</strong> — Обязательный лист вкладыш в медицинскую карту для суммарного радиационного контроля (мЗв).
								</span>
							</div>
							<div className="document-package-item-actions">
								{hasRadiationDoc ? (
									<button
										type="button"
										className="secondary-button"
										onClick={() => {
											onSelectDocumentKind("radiation_dose_sheet");
											onClose();
										}}
									>
										Просмотреть ({radiationDocs.length})
									</button>
								) : (
									<button
										type="button"
										className="primary-button"
										onClick={() => {
											onSelectDocumentKind("radiation_dose_sheet");
											onCreateDocument("radiation_dose_sheet");
											onClose();
										}}
									>
										Сформировать
									</button>
								)}
							</div>
						</div>

						{/* 4. ЖУРНАЛ СТЕРИЛИЗАЦИИ 257/У */}
						<div className="document-package-item-card">
							<div className="document-package-item-info">
								<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
									<Sparkles size={18} color="var(--brand-700, #0d9488)" aria-hidden="true" />
									<span className="document-package-item-title">
										Журнал контроля работы стерилизаторов (Форма № 257/у)
									</span>
								</div>
								<span className="document-package-item-sub">
									<strong>СанПиН 3.3686-21, Приказ Минздрава СССР № 257/у</strong> — Реестр циклов автоклавирования, термохимических индикаторов (1-5 класс), вакуум-тестов и биотестов.
								</span>
							</div>
							<div className="document-package-item-actions">
								<button
									type="button"
									className="primary-button"
									onClick={() => {
										onClose();
										onOpenAutoclaveLog257();
									}}
								>
									Открыть Журнал 257/у
								</button>
							</div>
						</div>

						{/* 5. ЕГИСЗ РЭМД СЭМД */}
						<div className="document-package-item-card">
							<div className="document-package-item-info">
								<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
									<Layers size={18} color="var(--brand-700, #0d9488)" aria-hidden="true" />
									<span className="document-package-item-title">
										Выгрузка СЭМД в ЕГИСЗ (РЭМД HL7 CDA R2)
									</span>
								</div>
								<span className="document-package-item-sub">
									<strong>Постановление Правительства РФ № 140 / № 852</strong> — Государственный реестр электронных медицинских документов для Госуслуг (ЕПГУ).
								</span>
							</div>
							<div className="document-package-item-actions">
								<button
									type="button"
									className="secondary-button"
									onClick={() => {
										onClose();
										onOpenEgiszRemd();
									}}
								>
									РЭМД Студия
								</button>
							</div>
						</div>
					</div>
				</div>

				<div className="document-package-modal-footer">
					<div style={{ fontSize: "12px", color: "var(--muted, #64748b)" }}>
						Стандарты Росздравнадзора, Минздрава РФ и Роспотребнадзора (СанПиН)
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
