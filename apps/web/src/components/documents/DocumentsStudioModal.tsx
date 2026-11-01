/**
 * apps/web/src/components/documents/DocumentsStudioModal.tsx
 *
 * Единая каноническая студия документов, согласий (ИДС) и справок DENTE CRM (SSOT).
 * Объединяет клинические документы и согласия в неразрывный монолит (Мандаты 8e, 8n, 8am).
 * Ровно 1 Primary CTA кнопка #0d9488 (Мандат 8am), ZERO disabled кнопок (Мандат 8e).
 * Apple HIG: Bottom Sheet на тач-экранах, тактильный хэндл 36x5px, тач-таргеты >= 44x44px.
 * Целевой размер: 420–460 строк (Sweet Spot).
 */

import React, { useState, useMemo, useCallback, useRef } from "react";
import {
	Building2,
	CheckCircle2,
	ClipboardList,
	Download,
	FileCheck,
	FileText,
	PenTool,
	Printer,
	Send,
	ShieldCheck,
	Sparkles,
	User,
	X,
	Zap,
} from "lucide-react";
import {
	CANONICAL_CLINIC_PACKAGES,
	DEFAULT_CLINIC_REQUISITES,
	type ConsentSubKind,
	type DocumentLegalContext,
	type DocumentPackageKey,
	type DocumentServiceItem,
	type PatientRequisites,
	formatKopecksToRubles,
	generateActTemplate,
	generateCardExtractTemplate,
	generateContractTemplate,
	generateInformedConsentTemplate,
	generateIntakePackageTemplate,
	generateTaxCertificateTemplate,
	sumKopecks,
} from "./documentsCatalogData";
import "./documentsStudio.css";

export type DocumentTemplateKey =
	| DocumentPackageKey
	| "contract"
	| "act"
	| "consent";

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
	readonly onSigned?: (payload: {
		packageKey: DocumentPackageKey;
		signedAt: string;
		isDigital: boolean;
	}) => void;
}

const DEFAULT_SAMPLE_SERVICES: readonly DocumentServiceItem[] = [
	{
		id: "srv-01",
		title: "Приём (осмотр, консультация) врача-стоматолога первичный",
		code: "B01.065.001",
		quantity: 1,
		priceKopecks: 150000,
		amountKopecks: 150000,
	},
	{
		id: "srv-02",
		title: "Восстановление зуба 4.6 пломбой световой полимеризации",
		code: "A16.07.002.010",
		quantity: 1,
		priceKopecks: 550000,
		amountKopecks: 550000,
	},
	{
		id: "srv-03",
		title: "Проводниковая анестезия (Артикаин с эпинефрином)",
		code: "B01.003.004.004",
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
	initialTemplate = "intake",
	onSigned,
}) => {
	// Приведение initialTemplate к каноническому DocumentPackageKey
	const resolvedInitialPackage = useMemo<DocumentPackageKey>(() => {
		if (initialTemplate === "contract") return "intake";
		if (initialTemplate === "act") return "card_extract";
		if (initialTemplate === "consent") return "informed_consent";
		return (initialTemplate as DocumentPackageKey) || "intake";
	}, [initialTemplate]);

	const [activePackage, setActivePackage] = useState<DocumentPackageKey>(resolvedInitialPackage);
	const [activeConsentSubKind, setActiveConsentSubKind] = useState<ConsentSubKind>("therapy");
	const [isSignPadOpen, setIsSignPadOpen] = useState<boolean>(false);
	const [hasSigned, setHasSigned] = useState<boolean>(false);
	const [toastNotice, setToastNotice] = useState<string | null>(null);

	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const isDrawingRef = useRef<boolean>(false);

	const patient: PatientRequisites = useMemo(() => ({
		fullName: patientContext?.fullName || "Смирнов Алексей Петрович",
		birthDate: patientContext?.birthDate || "12.04.1988",
		passport: patientContext?.passport || "45 12 654321 выдан ОВД г. Москвы",
		address: patientContext?.address || "г. Москва, ул. Тверская, д. 14, кв. 8",
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
		anamnesisRu: "Жалобы на кратковременные боли от температурных раздражителей. Аллергоанамнез чист.",
		epicrisisRu: "Кариозная полость санирована, анатомия восстановлена. Гарантия клиники: 12 месяцев.",
		consentSubKind: activeConsentSubKind,
	}), [patient, doctorFullName, currentDate, totalAmountKopecks, activeConsentSubKind]);

	// Генерация текста текущего документа в зависимости от выбранного пакета
	const renderedDocumentText = useMemo(() => {
		switch (activePackage) {
			case "intake":
				return generateIntakePackageTemplate(legalContext);
			case "informed_consent":
				return generateInformedConsentTemplate(legalContext, activeConsentSubKind);
			case "tax_certificate":
				return generateTaxCertificateTemplate(legalContext);
			case "card_extract":
				return generateCardExtractTemplate(legalContext);
			default:
				return generateIntakePackageTemplate(legalContext);
		}
	}, [activePackage, legalContext, activeConsentSubKind]);

	const showToast = useCallback((msg: string) => {
		setToastNotice(msg);
		setTimeout(() => setToastNotice(null), 3200);
	}, []);

	// Быстрые действия
	const handlePrint = useCallback(() => {
		window.print();
		showToast("Отправлено на печать (А4)");
	}, [showToast]);

	const handleDownloadTxt = useCallback(() => {
		const blob = new Blob([renderedDocumentText], { type: "text/plain;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `${activePackage}_${patient.fullName.replace(/\s+/g, "_")}.txt`;
		a.click();
		URL.revokeObjectURL(url);
		showToast("Документ экспортирован в файл");
	}, [renderedDocumentText, activePackage, patient.fullName, showToast]);

	const handleSendMessenger = useCallback(() => {
		const text = encodeURIComponent(`Здравствуйте, ${patient.fullName}! Ваш пакет документов клиники «ДЕНТЕ»: готов к ознакомлению.`);
		const phoneClean = patient.phone.replace(/\D/g, "");
		const url = `https://wa.me/${phoneClean}?text=${text}`;
		window.open(url, "_blank");
		showToast("Ссылка сформирована для WhatsApp");
	}, [patient.fullName, patient.phone, showToast]);

	// Рисование на Canvas
	const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		isDrawingRef.current = true;
		const rect = canvas.getBoundingClientRect();
		const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
		const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
		ctx.beginPath();
		ctx.moveTo(clientX - rect.left, clientY - rect.top);
	};

	const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
		if (!isDrawingRef.current) return;
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		const rect = canvas.getBoundingClientRect();
		const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
		const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
		ctx.lineWidth = 2.5;
		ctx.lineCap = "round";
		ctx.strokeStyle = "#0d9488";
		ctx.lineTo(clientX - rect.left, clientY - rect.top);
		ctx.stroke();
	};

	const stopDrawing = () => {
		isDrawingRef.current = false;
	};

	const clearCanvas = () => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		setHasSigned(false);
	};

	// Главное действие (Primary CTA): Печать и подписание в 1 клик
	const handlePrimarySignAndPrint = useCallback(() => {
		setHasSigned(true);
		const nowStr = new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
		onSigned?.({
			packageKey: activePackage,
			signedAt: nowStr,
			isDigital: isSignPadOpen,
		});
		window.print();
		showToast("✓ Пакет утвержден, подписан и отправлен на печать");
	}, [activePackage, isSignPadOpen, onSigned, showToast]);

	if (!isOpen) return null;

	return (
		<div
			className="dente-docs-studio-backdrop"
			onClick={onClose}
			data-testid="documents-studio-modal-backdrop"
		>
			<div
				className="dente-docs-studio-container"
				onClick={(e) => e.stopPropagation()}
				data-testid="documents-studio-modal"
				role="dialog"
				aria-modal="true"
				aria-labelledby="dente-docs-studio-title"
			>
				{/* Apple HIG Drag Handle для мобильных (36x5px) */}
				<div className="dente-mobile-drag-handle" aria-hidden="true" />

				{/* Каноническая шапка: 1 строка <= 52px */}
				<header className="dente-docs-studio-header">
					<div className="dente-docs-header-branding">
						<div className="dente-docs-header-icon">
							<ShieldCheck size={18} />
						</div>
						<h2 id="dente-docs-studio-title" className="dente-docs-header-title">
							<span className="hidden sm:inline">Студия документов и печати</span>
							<span className="sm:hidden font-semibold">Документы</span>
						</h2>
						<span className="dente-docs-header-badge hidden md:inline-flex">
							<CheckCircle2 size={13} />
							{patient.fullName}
						</span>
					</div>

					<div className="dente-docs-header-actions">
						<button
							type="button"
							onClick={handleDownloadTxt}
							className="dente-btn-secondary hidden md:inline-flex"
							title="Экспорт текста документа"
						>
							<Download size={15} />
							<span>Экспорт</span>
						</button>

						<button
							type="button"
							onClick={handleSendMessenger}
							className="dente-btn-secondary hidden md:inline-flex"
							title="Отправить пациенту в WhatsApp/SMS"
						>
							<Send size={14} />
							<span>В мессенджер</span>
						</button>

						{/* РОVНО ОДНА PRIMARY CTA КНОПКА #0d9488 — МАНДАТ 8am & 8e */}
						<button
							type="button"
							onClick={handlePrimarySignAndPrint}
							className="dente-btn-primary-cta"
							data-testid="primary-batch-print-cta"
						>
							<Printer size={16} />
							<span className="hidden sm:inline">✓ Распечатать пакет приёма и подписать</span>
							<span className="sm:hidden">✓ Распечатать и подписать</span>
						</button>

						<button
							type="button"
							onClick={onClose}
							className="dente-btn-close"
							aria-label="Закрыть"
						>
							<X size={18} />
						</button>
					</div>
				</header>

				{/* Рабочее пространство: Пакеты слева, Лист А4 справа */}
				<div className="dente-docs-studio-body">
					{/* Боковая панель выбора пакета */}
					<aside className="dente-docs-studio-sidebar">
						<div>
							<div className="dente-docs-section-label">Канонические пакеты приёма</div>
							<div className="dente-docs-package-list">
								{CANONICAL_CLINIC_PACKAGES.map((pkg) => {
									const isActive = activePackage === pkg.id;
									return (
										<div
											key={pkg.id}
											onClick={() => setActivePackage(pkg.id)}
											className={`dente-docs-package-card ${isActive ? "is-active" : ""}`}
											role="button"
											tabIndex={0}
											onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setActivePackage(pkg.id); }}
										>
											<div className="dente-docs-package-header">
												<span className="dente-docs-package-title">{pkg.titleRu}</span>
												<span className="dente-docs-package-badge">{pkg.badgeRu}</span>
											</div>
											<p className="dente-docs-package-desc">{pkg.descriptionRu}</p>

											{/* Подкатегории для согласий */}
											{pkg.id === "informed_consent" && isActive && (
												<div className="dente-docs-subkind-chips">
													{(["therapy", "surgery", "implant", "orthopedics", "anesthesia"] as ConsentSubKind[]).map((sub) => {
														const subLabels: Record<ConsentSubKind, string> = {
															therapy: "Терапия",
															surgery: "Хирургия",
															implant: "Имплантация",
															orthopedics: "Ортопедия",
															anesthesia: "Анестезия",
														};
														return (
															<button
																key={sub}
																type="button"
																onClick={(e) => { e.stopPropagation(); setActiveConsentSubKind(sub); }}
																className={`dente-subkind-chip ${activeConsentSubKind === sub ? "is-active" : ""}`}
															>
																{subLabels[sub]}
															</button>
														);
													})}
												</div>
											)}
										</div>
									);
								})}
							</div>
						</div>

						{/* Интерактивная подпись пальцем/стилусом на Canvas */}
						<div className="dente-signature-pad-box">
							<div className="flex items-center justify-between">
								<span className="text-xs font-semibold text-[var(--ink,#0f172a)] flex items-center gap-1.5">
									<PenTool size={14} className="text-[var(--teal,#0d9488)]" />
									Подпись на экране (Canvas)
								</span>
								<button
									type="button"
									onClick={() => setIsSignPadOpen(!isSignPadOpen)}
									className="text-xs text-[var(--teal,#0d9488)] hover:underline font-medium cursor-pointer"
								>
									{isSignPadOpen ? "Скрыть" : "Открыть холст"}
								</button>
							</div>

							{isSignPadOpen && (
								<div>
									<canvas
										ref={canvasRef}
										width={320}
										height={90}
										className="dente-signature-canvas"
										onMouseDown={startDrawing}
										onMouseMove={draw}
										onMouseUp={stopDrawing}
										onMouseLeave={stopDrawing}
										onTouchStart={startDrawing}
										onTouchMove={draw}
										onTouchEnd={stopDrawing}
									/>
									<div className="flex justify-between items-center mt-2">
										<button
											type="button"
											onClick={clearCanvas}
											className="text-[11px] text-[var(--ink-muted,#64748b)] hover:text-red-500 cursor-pointer"
										>
											Очистить роспись
										</button>
										<span className="text-[11px] text-emerald-600 font-medium">
											{hasSigned ? "✓ Подписано" : "Ожидает росписи"}
										</span>
									</div>
								</div>
							)}
						</div>

						{/* Реквизиты и статус врача */}
						<div className="text-xs text-[var(--ink-muted,#64748b)] space-y-1.5 pt-2 border-t border-[var(--line,#e2e8f0)]">
							<div className="font-semibold text-[var(--ink,#0f172a)] flex items-center gap-1.5">
								<Building2 size={13} className="text-[var(--teal,#0d9488)]" />
								{DEFAULT_CLINIC_REQUISITES.name}
							</div>
							<div>Лицензия: {DEFAULT_CLINIC_REQUISITES.license}</div>
							<div className="flex items-center gap-1.5 pt-1">
								<User size={13} />
								<span>Врач: {doctorFullName}</span>
							</div>
							{toastNotice && (
								<div className="text-xs text-teal-700 bg-teal-50 dark:bg-teal-950/40 p-2 rounded-lg font-medium animate-pulse">
									{toastNotice}
								</div>
							)}
						</div>
					</aside>

					{/* Правая зона: Предпросмотр листа формата А4 */}
					<main className="dente-docs-preview-area">
						<div
							className="dente-a4-paper-sheet print-paper-sheet"
							data-paper-sheet
							data-testid="dente-a4-paper-sheet"
						>
							{/* Шапка бланка А4 */}
							<div className="dente-a4-sheet-header">
								<div>
									<div className="dente-a4-clinic-name">
										{DEFAULT_CLINIC_REQUISITES.name}
									</div>
									<div className="dente-a4-clinic-sub">
										{DEFAULT_CLINIC_REQUISITES.address} · Тел: {DEFAULT_CLINIC_REQUISITES.phone}
									</div>
									<div className="dente-a4-clinic-sub">
										Лицензия: {DEFAULT_CLINIC_REQUISITES.license}
									</div>
								</div>
								<div className="dente-a4-date-badge">
									<div>Дата: {currentDate}</div>
									<div className="text-teal-700 font-medium mt-1">
										Сумма: {formatKopecksToRubles(totalAmountKopecks)}
									</div>
								</div>
							</div>

							{/* Содержимое бланка */}
							<div className="dente-a4-text-body">
								{renderedDocumentText}
							</div>

							{/* Подвал с подписями сторон */}
							<div className="dente-a4-sheet-footer">
								<div>
									<div className="font-semibold text-slate-800">Исполнитель:</div>
									<div className="text-slate-600">{doctorFullName}</div>
									<div className="mt-4 text-slate-400">Подпись: ______________________ М.П.</div>
								</div>

								<div className="text-right">
									<div className="font-semibold text-slate-800">Пациент:</div>
									<div className="text-slate-600">{patient.fullName}</div>
									<div className="mt-4 text-slate-400">
										{hasSigned ? "Подписано электронной подписью [OK]" : "Подпись: ______________________"}
									</div>
								</div>
							</div>
						</div>
					</main>
				</div>
			</div>
		</div>
	);
};

export default DocumentsStudioModal;
