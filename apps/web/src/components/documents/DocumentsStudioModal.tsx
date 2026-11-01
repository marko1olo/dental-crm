/**
 * apps/web/src/components/documents/DocumentsStudioModal.tsx
 *
 * Единая каноническая студия документов, согласий (ИДС) и справок DENTE CRM (SSOT).
 * Объединяет клинические документы и согласия в неразрывный рабочий контур (Мандаты 8e, 8n, 8am).
 * Ровно 1 Primary CTA кнопка #0d9488 (Мандат 8am), ZERO disabled кнопок (Мандат 8e, Автономия врача).
 * Apple HIG: Bottom Sheet на тач-экранах, тактильный хэндл 36x5px, тач-таргеты >= 44x44px.
 * Целевой размер фасада: 300–350 строк (Sweet Spot Mandate 8b).
 */

import React, { useState, useMemo, useCallback, useRef } from "react";
import {
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
import {
	DocumentsStudioHeader,
	DocumentsStudioFooter,
	DocumentsPackageSelector,
	ConsentSignersRow,
} from "./studio";
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

	// Главное действие (Primary CTA): Печать и подписание в 1 клик (Мандат 8am, 8e)
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
				<DocumentsStudioHeader
					patientFullName={patient.fullName}
					onDownloadTxt={handleDownloadTxt}
					onSendMessenger={handleSendMessenger}
					onClose={onClose}
				/>

				{/* Рабочее пространство: Пакеты слева, Лист А4 справа */}
				<div className="dente-docs-studio-body">
					{/* Боковая панель выбора пакета */}
					<aside className="dente-docs-studio-sidebar">
						<DocumentsPackageSelector
							activePackage={activePackage}
							onSelectPackage={setActivePackage}
							activeConsentSubKind={activeConsentSubKind}
							onSelectConsentSubKind={setActiveConsentSubKind}
						/>

						{/* Интерактивная подпись пальцем/стилусом и реквизиты клиники */}
						<ConsentSignersRow
							isSignPadOpen={isSignPadOpen}
							onToggleSignPad={() => setIsSignPadOpen(!isSignPadOpen)}
							hasSigned={hasSigned}
							onClearCanvas={clearCanvas}
							canvasRef={canvasRef}
							onStartDrawing={startDrawing}
							onDraw={draw}
							onStopDrawing={stopDrawing}
							clinicName={DEFAULT_CLINIC_REQUISITES.name}
							clinicLicense={DEFAULT_CLINIC_REQUISITES.license}
							doctorFullName={doctorFullName}
							toastNotice={toastNotice}
						/>
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

				{/* Канонический подвал: Ровно 1 Primary CTA #0d9488 — Мандаты 8am, 8e & Apple HIG */}
				<DocumentsStudioFooter
					onPrimarySignAndPrint={handlePrimarySignAndPrint}
					onDownloadTxt={handleDownloadTxt}
					onSendMessenger={handleSendMessenger}
					hasSigned={hasSigned}
				/>
			</div>
		</div>
	);
};

export default DocumentsStudioModal;
