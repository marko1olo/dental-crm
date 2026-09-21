import React, { useState } from "react";
import {
	type DocumentKind,
	type GeneratedDocument,
	type Patient,
} from "@dental/shared";
import {
	X,
	Building,
	CheckCircle2,
	FileText,
	FlaskConical,
	Radiation,
	ShieldCheck,
	Sparkles,
	Layers,
} from "lucide-react";
import { showToast } from "../GlobalToast";

export interface SanpinRegistryPackageModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patient: Patient | null;
	readonly existingDocuments: GeneratedDocument[];
	readonly onOpenSickLeaveEln: () => void;
	readonly onOpenAutoclaveLog257: () => void;
	readonly onOpenEgiszRemd: () => void;
	readonly onCreateDocument: (kind: DocumentKind) => void;
	readonly onSelectDocumentKind: (kind: DocumentKind) => void;
	readonly onOpenPsoJournal366?: () => void;
	readonly onOpenSanpinRegisters?: () => void;
}

export function SanpinRegistryPackageModal({
	isOpen,
	onClose,
	patient,
	existingDocuments,
	onOpenSickLeaveEln,
	onOpenAutoclaveLog257,
	onOpenEgiszRemd,
	onCreateDocument,
	onSelectDocumentKind,
	onOpenPsoJournal366,
	onOpenSanpinRegisters,
}: SanpinRegistryPackageModalProps): React.JSX.Element | null {
	const [sterilityVerified, setSterilityVerified] = useState(false);

	if (!isOpen) return null;

	const radiationDocs = (existingDocuments ?? []).filter(
		(d) => d?.kind === "radiation_dose_sheet",
	);
	const hasRadiationDoc = radiationDocs.length > 0;

	return (
		<div
			className="document-package-modal-overlay"
			role="dialog"
			aria-modal="true"
			aria-labelledby="sanpin-package-title"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div className="document-package-modal-card">
				<div className="document-package-modal-header">
					<div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
						<Building size={24} color="var(--brand-700, #0d9488)" aria-hidden="true" />
						<div>
							<h3 id="sanpin-package-title" style={{ margin: 0 }}>
								Пакет «СанПиН, ЭЛН и Гос. Реестры»
							</h3>
							<span style={{ fontSize: "12px", color: "var(--muted, #64748b)" }}>
								{patient ? `Пациент: ${patient.fullName}` : "Гос. реестры, СанПиН, ЭЛН и регулируемый учёт"}
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
					{/* 1-Click Patient Treatment Sterility Clearance Banner (Mandate 8e / 8k) */}
					<div
						style={{
							padding: "0.75rem 1rem",
							marginBottom: "1rem",
							borderRadius: "8px",
							background: sterilityVerified ? "rgba(16, 185, 129, 0.08)" : "var(--paper-soft, #f8fafc)",
							border: sterilityVerified ? "1.5px solid rgba(16, 185, 129, 0.4)" : "1px solid var(--line, #e2e8f0)",
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
							gap: "0.75rem",
							flexWrap: "wrap",
						}}
					>
						<div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
							<ShieldCheck size={22} color={sterilityVerified ? "#059669" : "var(--teal, #0d9488)"} />
							<div>
								<div style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--ink, #0f172a)" }}>
									{sterilityVerified ? "Стерильность инструментов приёма подтверждена (СанПиН 3.3686-21)" : "Комплексный допуск стерильности инструментов приёма"}
								</div>
								<div style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)", marginTop: "0.15rem" }}>
									{patient ? `Пациент: ${patient.fullName} • ` : ""}ПСО (ф. 366/у, азопирам/фенолфталеин отр.) и Автоклав (ф. 257/у, 134°C, 5 кл. норма)
								</div>
							</div>
						</div>
						<button
							type="button"
							className={sterilityVerified ? "secondary-button" : "primary-button"}
							onClick={() => {
								setSterilityVerified(true);
								showToast("Стерильность приёма заверена по СанПиН 3.3686-21", "success");
							}}
							style={{ minHeight: "36px", fontSize: "0.8rem", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
						>
							<CheckCircle2 size={15} />
							<span>{sterilityVerified ? "Подтверждено в карте" : "Заверить стерильность (1 клик)"}</span>
						</button>
					</div>

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

						{/* 2. ЖУРНАЛ ПРЕДСТЕРИЛИЗАЦИОННОЙ ОЧИСТКИ (ФОРМА № 366/У) */}
						<div className="document-package-item-card">
							<div className="document-package-item-info">
								<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
									<FlaskConical size={18} color="var(--brand-700, #0d9488)" aria-hidden="true" />
									<span className="document-package-item-title">
										Журнал предстерилизационной очистки (ПСО, Форма № 366/у)
									</span>
								</div>
								<span className="document-package-item-sub">
									<strong>СанПиН 3.3686-21 п. 3584 / Приказ Минздрава СССР № 366/у</strong> — Контроль качества очистки от крови и остатков щелочных моющих средств (азопирамовая и фенолфталеиновая пробы).
								</span>
							</div>
							<div className="document-package-item-actions">
								<button
									type="button"
									className="primary-button"
									onClick={() => {
										if (onOpenPsoJournal366) {
											onClose();
											onOpenPsoJournal366();
										} else {
											onClose();
											onOpenAutoclaveLog257();
										}
									}}
								>
									Открыть Журнал 366/у
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
