/**
 * apps/web/src/components/documents/DocumentsStudioModal.tsx
 *
 * Каноническая студия документов, договоров и справок DENTE Dental CRM (SSOT).
 * Мандаты 8e (Автономия врача), 8n (Соло-практика), 8am (1 Primary CTA #0d9488),
 * 8b (Sweet Spot 380–480 строк), Apple HIG (Bottom Sheet на таче, 0px horizontal drift).
 */

import React, { useState, useMemo, useCallback } from "react";
import {
	Building2,
	CheckCircle2,
	ClipboardList,
	Clock,
	Download,
	FileCheck,
	FileText,
	Printer,
	Receipt,
	ShieldCheck,
	Sparkles,
	User,
	X,
	Zap,
} from "lucide-react";
import {
	DEFAULT_CLINIC_REQUISITES,
	type DocumentLegalContext,
	type DocumentServiceItem,
	type PatientRequisites,
	formatKopecksToRubles,
	generateActTemplate,
	generateCardExtractTemplate,
	generateContractTemplate,
	generateTaxCertificateTemplate,
	sumKopecks,
} from "./documentsCatalogData";
import "./documents.css";

export type DocumentTemplateKey = "contract" | "act" | "tax_certificate" | "card_extract";

export interface DocumentsStudioModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientContext?: {
		readonly id?: string;
		readonly fullName?: string;
		readonly birthDate?: string;
		readonly passport?: string;
		readonly phone?: string;
		readonly address?: string;
		readonly inn?: string;
	};
	readonly doctorFullName?: string;
	readonly initialTemplate?: DocumentTemplateKey;
}

const DEFAULT_SAMPLE_SERVICES: readonly DocumentServiceItem[] = [
	{
		id: "srv-01",
		title: "Приём (осмотр, консультация) врача-стоматолога первичный",
		code804n: "B01.065.001",
		quantity: 1,
		priceKopecks: 150000,
		amountKopecks: 150000,
	},
	{
		id: "srv-02",
		title: "Восстановление зуба 4.6 пломбой световой полимеризации",
		code804n: "A16.07.002.010",
		quantity: 1,
		priceKopecks: 550000,
		amountKopecks: 550000,
	},
	{
		id: "srv-03",
		title: "Проводниковая анестезия (Артикаин с эпинефрином)",
		code804n: "B01.003.004.004",
		quantity: 1,
		priceKopecks: 80000,
		amountKopecks: 80000,
	},
];

export const DocumentsStudioModal: React.FC<DocumentsStudioModalProps> = ({
	isOpen,
	onClose,
	patientContext,
	doctorFullName = "Смирнова Елена Сергеевна",
	initialTemplate = "contract",
}) => {
	const [activeTemplate, setActiveTemplate] = useState<DocumentTemplateKey>(initialTemplate);
	const [isBatchMode, setIsBatchMode] = useState<boolean>(false);
	const [batchSelection, setBatchSelection] = useState<Record<DocumentTemplateKey, boolean>>({
		contract: true,
		act: true,
		tax_certificate: false,
		card_extract: false,
	});

	const patient: PatientRequisites = useMemo(() => ({
		fullName: patientContext?.fullName || "Иванов Иван Иванович",
		birthDate: patientContext?.birthDate || "15.04.1985",
		passport: patientContext?.passport || "45 10 123456 выдан ОВД г. Москвы 10.05.2005",
		address: patientContext?.address || "г. Москва, ул. Ленина, д. 25, кв. 14",
		phone: patientContext?.phone || "+7 (916) 123-45-67",
		...(patientContext?.inn ? { inn: patientContext.inn } : {}),
	}), [patientContext]);

	const currentDate = useMemo(() => {
		const now = new Date();
		return now.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
	}, []);

	const totalAmountKopecks = useMemo(() => sumKopecks(DEFAULT_SAMPLE_SERVICES), []);

	const legalContext: DocumentLegalContext = useMemo(() => ({
		clinic: DEFAULT_CLINIC_REQUISITES,
		patient,
		doctor: {
			fullName: doctorFullName,
			specialty: "Врач-стоматолог терапевт",
		},
		documentNumber: "КЛ-2026/894",
		documentDate: currentDate,
		taxYear: new Date().getFullYear(),
		services: DEFAULT_SAMPLE_SERVICES,
		totalAmountKopecks,
		diagnosisRu: "К02.1 Кариес дентина зуба 4.6. Интактный зубной ряд.",
		anamnesisRu: "Жалобы на кратковременные боли от сладкого и холодного в области зуба 4.6.",
		epicrisisRu: "Кариозная полость санирована, анатомия жевательной поверхности восстановлена.",
	}), [patient, doctorFullName, currentDate, totalAmountKopecks]);

	const renderedDocumentText = useMemo(() => {
		switch (activeTemplate) {
			case "contract":
				return generateContractTemplate(legalContext);
			case "act":
				return generateActTemplate(legalContext);
			case "tax_certificate":
				return generateTaxCertificateTemplate(legalContext);
			case "card_extract":
				return generateCardExtractTemplate(legalContext);
			default:
				return generateContractTemplate(legalContext);
		}
	}, [activeTemplate, legalContext]);

	const handlePrint = useCallback(() => {
		window.print();
	}, []);

	const handleDownloadTxt = useCallback(() => {
		const blob = new Blob([renderedDocumentText], { type: "text/plain;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `${activeTemplate}_${patient.fullName.replace(/\s+/g, "_")}.txt`;
		a.click();
		URL.revokeObjectURL(url);
	}, [renderedDocumentText, activeTemplate, patient.fullName]);

	if (!isOpen) return null;

	return (
		<div
			className="dente-documents-modal-backdrop"
			onClick={onClose}
			data-testid="documents-studio-modal-backdrop"
		>
			<div
				className="dente-documents-modal-container"
				onClick={(e) => e.stopPropagation()}
				data-testid="documents-studio-modal"
			>
				{/* Apple HIG Drag Handle для мобильных */}
				<div className="dente-mobile-drag-handle sm:hidden" />

				{/* Каноническая шапка: 1 строка <= 52px */}
				<header className="dente-documents-header">
					<div className="dente-documents-header-title">
						<FileText className="w-5 h-5 text-[var(--teal,#0d9488)] flex-shrink-0" />
						<span className="hidden sm:inline">Студия документов и печати</span>
						<span className="sm:hidden font-semibold text-sm">Документы</span>
						<span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--teal-soft,#ccfbf1)] text-[var(--teal-dark,#0f766e)]">
							<CheckCircle2 className="w-3.5 h-3.5" />
							{patient.fullName}
						</span>
					</div>

					<div className="dente-documents-header-actions">
						<button
							type="button"
							onClick={handleDownloadTxt}
							className="dente-btn-secondary"
							title="Скачать текст документа"
						>
							<Download className="w-4 h-4 text-[var(--ink-muted)]" />
							<span className="hidden md:inline">Экспорт</span>
						</button>

						{/* РОVНО ОДНА PRIMARY CTA КНОПКА #0d9488 */}
						<button
							type="button"
							onClick={handlePrint}
							className="dente-btn-primary-cta"
							data-testid="primary-batch-print-cta"
						>
							<Printer className="w-4 h-4" />
							<span className="hidden sm:inline">Распечатать пакет приёма</span>
							<span className="sm:hidden">Печать</span>
						</button>

						<button
							type="button"
							onClick={onClose}
							className="p-1.5 text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] rounded-lg transition-colors"
							aria-label="Закрыть"
						>
							<X className="w-5 h-5" />
						</button>
					</div>
				</header>

				{/* Рабочее пространство: Реестр слева, A4 лист справа */}
				<main className="dente-documents-body">
					{/* Боковая панель шаблонов и реестра */}
					<aside className="dente-documents-sidebar p-3 sm:p-4 space-y-4">
						<div>
							<div className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-muted)] mb-2 px-1">
								Канонические шаблоны
							</div>
							<div className="space-y-1">
								<button
									type="button"
									onClick={() => { setActiveTemplate("contract"); setIsBatchMode(false); }}
									className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-sm font-medium transition-all ${
										activeTemplate === "contract" && !isBatchMode
											? "bg-[var(--teal-soft,#ccfbf1)] text-[var(--teal-dark,#0f766e)] border border-[var(--teal,#0d9488)]/30 font-semibold"
											: "text-[var(--ink)] hover:bg-[var(--paper-soft)] border border-transparent"
									}`}
								>
									<span className="flex items-center gap-2">
										<FileText className="w-4 h-4 text-[var(--teal,#0d9488)]" />
										Договор на лечение
									</span>
									<span className="text-xs text-[var(--ink-muted)]">РФ 736</span>
								</button>

								<button
									type="button"
									onClick={() => { setActiveTemplate("act"); setIsBatchMode(false); }}
									className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-sm font-medium transition-all ${
										activeTemplate === "act" && !isBatchMode
											? "bg-[var(--teal-soft,#ccfbf1)] text-[var(--teal-dark,#0f766e)] border border-[var(--teal,#0d9488)]/30 font-semibold"
											: "text-[var(--ink)] hover:bg-[var(--paper-soft)] border border-transparent"
									}`}
								>
									<span className="flex items-center gap-2">
										<FileCheck className="w-4 h-4 text-[var(--teal,#0d9488)]" />
										Акт выполненных услуг
									</span>
									<span className="text-xs font-semibold text-[var(--teal-dark,#0f766e)]">
										{formatKopecksToRubles(totalAmountKopecks)}
									</span>
								</button>

								<button
									type="button"
									onClick={() => { setActiveTemplate("tax_certificate"); setIsBatchMode(false); }}
									className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-sm font-medium transition-all ${
										activeTemplate === "tax_certificate" && !isBatchMode
											? "bg-[var(--teal-soft,#ccfbf1)] text-[var(--teal-dark,#0f766e)] border border-[var(--teal,#0d9488)]/30 font-semibold"
											: "text-[var(--ink)] hover:bg-[var(--paper-soft)] border border-transparent"
									}`}
								>
									<span className="flex items-center gap-2">
										<Zap className="w-4 h-4 text-[var(--teal,#0d9488)]" />
										Справка для налоговой (ФНС)
									</span>
									<span className="text-xs text-[var(--ink-muted)]">13% НДФЛ</span>
								</button>

								<button
									type="button"
									onClick={() => { setActiveTemplate("card_extract"); setIsBatchMode(false); }}
									className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-sm font-medium transition-all ${
										activeTemplate === "card_extract" && !isBatchMode
											? "bg-[var(--teal-soft,#ccfbf1)] text-[var(--teal-dark,#0f766e)] border border-[var(--teal,#0d9488)]/30 font-semibold"
											: "text-[var(--ink)] hover:bg-[var(--paper-soft)] border border-transparent"
									}`}
								>
									<span className="flex items-center gap-2">
										<ClipboardList className="w-4 h-4 text-[var(--teal,#0d9488)]" />
										Выписка из медицинской карты
									</span>
									<span className="text-xs text-[var(--ink-muted)]">Карта</span>
								</button>
							</div>
						</div>

						{/* Пакетная печать визита */}
						<div className="pt-2 border-t border-[var(--line)]">
							<div className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-muted)] mb-2 px-1">
								Пакет приёма врача
							</div>
							<div className="p-3 bg-[var(--paper-soft)] rounded-xl border border-[var(--line)] space-y-2 text-xs">
								<label className="flex items-center gap-2 cursor-pointer">
									<input
										type="checkbox"
										checked={batchSelection.contract}
										onChange={(e) => setBatchSelection(p => ({ ...p, contract: e.target.checked }))}
										className="rounded text-[var(--teal,#0d9488)] focus:ring-0"
									/>
									<span>Договор на медуслуги</span>
								</label>
								<label className="flex items-center gap-2 cursor-pointer">
									<input
										type="checkbox"
										checked={batchSelection.act}
										onChange={(e) => setBatchSelection(p => ({ ...p, act: e.target.checked }))}
										className="rounded text-[var(--teal,#0d9488)] focus:ring-0"
									/>
									<span>Акт выполненных работ</span>
								</label>
								<label className="flex items-center gap-2 cursor-pointer">
									<input
										type="checkbox"
										checked={batchSelection.tax_certificate}
										onChange={(e) => setBatchSelection(p => ({ ...p, tax_certificate: e.target.checked }))}
										className="rounded text-[var(--teal,#0d9488)] focus:ring-0"
									/>
									<span>Справка ФНС (13% НДФЛ)</span>
								</label>
								<label className="flex items-center gap-2 cursor-pointer">
									<input
										type="checkbox"
										checked={batchSelection.card_extract}
										onChange={(e) => setBatchSelection(p => ({ ...p, card_extract: e.target.checked }))}
										className="rounded text-[var(--teal,#0d9488)] focus:ring-0"
									/>
									<span>Выписка из карты приёма</span>
								</label>
							</div>
						</div>

						{/* Реквизиты клиники и врача */}
						<div className="text-xs text-[var(--ink-muted)] space-y-1 pt-2 border-t border-[var(--line)]">
							<div className="font-medium text-[var(--ink)] flex items-center gap-1.5">
								<Building2 className="w-3.5 h-3.5 text-[var(--teal,#0d9488)]" />
								{DEFAULT_CLINIC_REQUISITES.name}
							</div>
							<div>ИНН {DEFAULT_CLINIC_REQUISITES.inn} · ОГРН {DEFAULT_CLINIC_REQUISITES.ogrn}</div>
							<div className="flex items-center gap-1.5 pt-1">
								<User className="w-3.5 h-3.5 text-[var(--ink-muted)]" />
								<span>Врач: {doctorFullName}</span>
							</div>
						</div>
					</aside>

					{/* Правая зона: Превью листа формата A4 */}
					<section className="dente-documents-preview-area">
						<div className="dente-a4-paper print-paper-sheet" data-paper-sheet data-testid="dente-a4-paper-sheet">
							{/* Шапка бланка */}
							<div className="dente-a4-header flex items-start justify-between">
								<div>
									<div className="dente-a4-clinic-title text-sm font-bold uppercase tracking-wider text-slate-900">
										{DEFAULT_CLINIC_REQUISITES.name}
									</div>
									<div className="dente-a4-header-sub text-xs text-slate-600 mt-1">
										{DEFAULT_CLINIC_REQUISITES.address} · Тел: {DEFAULT_CLINIC_REQUISITES.phone}
									</div>
									<div className="dente-a4-header-sub text-xs text-slate-500">
										Лицензия: {DEFAULT_CLINIC_REQUISITES.license}
									</div>
								</div>
								<div className="text-right">
									<div className="dente-a4-header-date text-xs font-semibold text-slate-800">
										Дата: {currentDate}
									</div>
									<div className="dente-a4-header-sum text-xs text-teal-800 font-semibold mt-0.5">
										Сумма: {formatKopecksToRubles(totalAmountKopecks)}
									</div>
								</div>
							</div>

							{/* Тело документа */}
							<div className="flex-1 whitespace-pre-wrap font-mono text-[10.5pt] leading-relaxed text-slate-900">
								{renderedDocumentText}
							</div>

							{/* Подвал и подписи сторон */}
							<div className="dente-a4-footer flex items-end justify-between pt-4 border-t border-slate-300">
								<div>
									<div className="font-semibold text-slate-700">Исполнитель:</div>
									<div className="text-xs text-slate-500">{doctorFullName}</div>
									<div className="mt-3 text-xs text-slate-400">Подпись: ______________________ М.П.</div>
								</div>

								<div className="text-right">
									<div className="font-semibold text-slate-700">Пациент:</div>
									<div className="text-xs text-slate-500">{patient.fullName}</div>
									<div className="mt-3 text-xs text-slate-400">Подпись: ______________________</div>
								</div>
							</div>
						</div>
					</section>
				</main>
			</div>
		</div>
	);
};

export default DocumentsStudioModal;
