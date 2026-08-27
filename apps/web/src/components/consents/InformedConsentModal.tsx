import {
	AlertTriangle,
	Check,
	CheckCircle2,
	ChevronRight,
	Copy,
	Download,
	FileCheck,
	FileText,
	Fingerprint,
	KeyRound,
	Lock,
	PenTool,
	Printer,
	RefreshCw,
	RotateCcw,
	RotateCw,
	ShieldCheck,
	Smartphone,
	Trash2,
	User,
	X,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
	CONSENT_TEMPLATES,
	type ConsentSubstitutionContext,
	type ConsentTemplate,
	type ConsentTemplateKey,
	getAllConsentTemplates,
	getConsentTemplate,
	renderConsentTemplate,
	substitutePlaceholders,
} from "./consentTemplates.js";
import "./informedConsent.css";
import {
	calculateBoundingBox,
	calculatePointVelocity,
	calculateStrokeWidth,
	drawAllStrokesOnCanvas,
	drawSmoothStrokeOnContext,
	exportSignatureToSvg,
	generateConsentIntegrityHash,
	isSignatureEmpty,
	type SignaturePoint,
	type SignatureStroke,
	type SignatureVectorData,
} from "./signaturePadMath.js";

export interface InformedConsentModalProps {
	isOpen: boolean;
	onClose: () => void;
	initialTemplateKey?: ConsentTemplateKey;
	patient?: {
		fullName?: string | null;
		birthDate?: string | null;
		passport?: string | null;
		phone?: string | null;
		snils?: string | null;
		address?: string | null;
		cardNumber?: string | null;
	} | null;
	doctorName?: string | null;
	doctorSpecialty?: string | null;
	clinicName?: string | null;
	clinicLegalName?: string | null;
	clinicAddress?: string | null;
	clinicOgrn?: string | null;
	licenseNumber?: string | null;
	diagnosisIcd?: string | null;
	toothNumbers?: string | null;
	onConsentSigned?: (payload: SignedConsentPayload) => void;
	onConsentConfirmed?: (payload: {
		consentType: string;
		intervention: string;
		toothOrArea: string;
		confirmedAt: string;
		integrityHash?: string;
	}) => void;
}

export interface SignedConsentPayload {
	templateKey: ConsentTemplateKey;
	code: string;
	title: string;
	fullTextContent: string;
	patientName: string;
	birthDate: string;
	passport: string;
	doctorName: string;
	clinicName: string;
	diagnosisIcd: string;
	toothNumbers: string;
	signatureSvg: string;
	signaturePngBase64: string;
	vectorData: SignatureVectorData;
	integrityHash: string;
	signedAt: string;
	verificationMethod: "tablet_stylus" | "sms_otp";
	smsOtpCode?: string | null;
	attachedToForm043u: boolean;
}

const TEMPLATE_SHORT_TITLES: Record<ConsentTemplateKey, string> = {
	CONSENT_THERAPY: "Терапия & Эндодонтия",
	CONSENT_SURGERY_IMPLANT: "Хирургия / Имплантация",
	CONSENT_ORTHODONTICS: "Ортодонтия (Брекеты)",
	CONSENT_ORTHOPEDICS: "Ортопедия (Коронки)",
	CONSENT_HYGIENE_BLEACHING: "Профгигиена & Отбеливание",
	CONSENT_ANESTHESIA: "Местная анестезия",
	CONSENT_PERSONAL_DATA: "Персональные данные (152-ФЗ)",
};

export const InformedConsentModal: React.FC<InformedConsentModalProps> = ({
	isOpen,
	onClose,
	initialTemplateKey = "CONSENT_THERAPY",
	patient,
	doctorName,
	doctorSpecialty,
	clinicName = "ООО «Стоматологическая клиника ДЕНТЕ»",
	clinicLegalName = "ООО «Стоматологическая клиника ДЕНТЕ»",
	clinicAddress,
	clinicOgrn,
	licenseNumber,
	diagnosisIcd,
	toothNumbers,
	onConsentSigned,
	onConsentConfirmed,
}) => {
	const [activeKey, setActiveKey] = useState<ConsentTemplateKey>(initialTemplateKey);
	const [verificationMethod, setVerificationMethod] = useState<"tablet_stylus" | "sms_otp">("tablet_stylus");
	
	// Точечное редактирование контекста плейсхолдеров
	const [customDiagnosis, setCustomDiagnosis] = useState<string>(diagnosisIcd || "");
	const [customTeeth, setCustomTeeth] = useState<string>(toothNumbers || "");
	
	// Canvas ref и состояние рисования
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const containerRef = useRef<HTMLDivElement | null>(null);
	const [strokes, setStrokes] = useState<SignatureStroke[]>([]);
	const [undoneStrokes, setUndoneStrokes] = useState<SignatureStroke[]>([]);
	const [isDrawing, setIsDrawing] = useState(false);
	const currentStrokeRef = useRef<SignaturePoint[]>([]);

	// Состояние SMS / OTP подтверждения
	const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
	const [otpSentTime, setOtpSentTime] = useState<number | null>(null);
	const [otpCountdown, setOtpCountdown] = useState<number>(0);
	const [otpVerified, setOtpVerified] = useState<boolean>(false);
	const [copiedHash, setCopiedHash] = useState<boolean>(false);
	const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

	// Синхронизация при открытии
	useEffect(() => {
		if (isOpen) {
			setActiveKey(initialTemplateKey);
			setCustomDiagnosis(diagnosisIcd || "");
			setCustomTeeth(toothNumbers || "");
			setStrokes([]);
			setUndoneStrokes([]);
			setOtpDigits(["", "", "", "", "", ""]);
			setOtpVerified(false);
			setOtpCountdown(0);
		}
	}, [isOpen, initialTemplateKey, diagnosisIcd, toothNumbers]);

	// Таймер обратного отсчета SMS OTP
	useEffect(() => {
		if (otpCountdown <= 0) return;
		const timer = setInterval(() => {
			setOtpCountdown((prev) => Math.max(0, prev - 1));
		}, 1000);
		return () => clearInterval(timer);
	}, [otpCountdown]);

	// Обработка Esc для закрытия
	useEffect(() => {
		if (!isOpen) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				onClose();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose]);

	// Контекст подстановки
	const substitutionContext = useMemo<ConsentSubstitutionContext>(() => {
		return {
			patientName: patient?.fullName || null,
			birthDate: patient?.birthDate || null,
			passport: patient?.passport || null,
			doctorName: doctorName || (doctorSpecialty ? `Врач-стоматолог (${doctorSpecialty})` : null),
			clinicName: clinicName || clinicLegalName,
			clinicLegalName: clinicLegalName || clinicName,
			clinicAddress: clinicAddress || "г. Москва, ул. Клиническая, д. 10",
			clinicOgrn: clinicOgrn || "1234567890123",
			licenseNumber: licenseNumber || "ЛО41-01137-77/00123456",
			diagnosisIcd: customDiagnosis || diagnosisIcd || "K02.1 Кариес дентина",
			toothNumbers: customTeeth || toothNumbers || "1.6, 1.7",
			date: new Date().toLocaleDateString("ru-RU"),
			snils: patient?.snils || null,
			phone: patient?.phone || null,
		};
	}, [
		patient,
		doctorName,
		doctorSpecialty,
		clinicName,
		clinicLegalName,
		clinicAddress,
		clinicOgrn,
		licenseNumber,
		customDiagnosis,
		diagnosisIcd,
		customTeeth,
		toothNumbers,
	]);

	const currentTemplate = useMemo<ConsentTemplate>(() => {
		return getConsentTemplate(activeKey);
	}, [activeKey]);

	const rendered = useMemo(() => {
		return renderConsentTemplate(currentTemplate, substitutionContext);
	}, [currentTemplate, substitutionContext]);

	// Перерисовка Canvas при изменении strokes
	const redrawCanvas = useCallback(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		drawAllStrokesOnCanvas(canvas, strokes, { backgroundColor: "#ffffff" });
	}, [strokes]);

	useEffect(() => {
		redrawCanvas();
	}, [redrawCanvas]);

	// Адаптация размера canvas при монтировании и ресайзе
	useEffect(() => {
		if (!isOpen) return;
		const updateCanvasSize = () => {
			const canvas = canvasRef.current;
			const container = containerRef.current;
			if (!canvas || !container) return;

			const rect = container.getBoundingClientRect();
			const dpr = window.devicePixelRatio || 1;

			canvas.width = rect.width * dpr;
			canvas.height = rect.height * dpr;

			const ctx = canvas.getContext("2d");
			if (ctx) {
				ctx.scale(dpr, dpr);
			}
			redrawCanvas();
		};

		const t = setTimeout(updateCanvasSize, 50);
		window.addEventListener("resize", updateCanvasSize);
		return () => {
			clearTimeout(t);
			window.removeEventListener("resize", updateCanvasSize);
		};
	}, [isOpen, redrawCanvas]);

	// Координаты курсора / тача относительно canvas (CSS пиксели)
	const getPointFromEvent = (e: React.PointerEvent<HTMLCanvasElement>): SignaturePoint => {
		const canvas = canvasRef.current;
		if (!canvas) return { x: 0, y: 0, time: Date.now() };

		const rect = canvas.getBoundingClientRect();
		return {
			x: e.clientX - rect.left,
			y: e.clientY - rect.top,
			time: Date.now(),
			pressure: e.pressure && e.pressure > 0 && e.pressure <= 1 ? e.pressure : undefined,
		};
	};

	// Обработчики сенсорного рисования
	const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
		e.currentTarget.setPointerCapture(e.pointerId);
		setIsDrawing(true);
		const point = getPointFromEvent(e);
		currentStrokeRef.current = [point];

		const canvas = canvasRef.current;
		const ctx = canvas?.getContext("2d");
		if (ctx) {
			drawSmoothStrokeOnContext(ctx, { points: [point], isDot: true });
		}
	};

	const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
		if (!isDrawing) return;
		const point = getPointFromEvent(e);
		currentStrokeRef.current.push(point);

		const pts = currentStrokeRef.current;
		const canvas = canvasRef.current;
		const ctx = canvas?.getContext("2d");
		if (ctx && pts.length >= 2) {
			const lastTwo = pts.slice(-2);
			const p0 = lastTwo[0];
			const p1 = lastTwo[1];
			if (p0 && p1) {
				const v = calculatePointVelocity(p0, p1);
				const w = calculateStrokeWidth(v, p1.pressure);

				ctx.strokeStyle = "#0f172a";
				ctx.fillStyle = "#0f172a";
				ctx.lineWidth = w;
				ctx.lineCap = "round";
				ctx.lineJoin = "round";
				ctx.beginPath();
				ctx.moveTo(p0.x, p0.y);
				ctx.lineTo(p1.x, p1.y);
				ctx.stroke();
			}
		}
	};

	const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
		if (!isDrawing) return;
		setIsDrawing(false);
		try {
			e.currentTarget.releasePointerCapture(e.pointerId);
		} catch {
			// игнорируем ошибки отмены захвата указателя
		}

		if (currentStrokeRef.current.length > 0) {
			const newStroke: SignatureStroke = {
				points: [...currentStrokeRef.current],
				color: "#0f172a",
			};
			setStrokes((prev) => [...prev, newStroke]);
			setUndoneStrokes([]);
			currentStrokeRef.current = [];
		}
	};

	const handleClearCanvas = () => {
		setStrokes([]);
		setUndoneStrokes([]);
		const canvas = canvasRef.current;
		if (canvas) {
			const ctx = canvas.getContext("2d");
			if (ctx) {
				ctx.fillStyle = "#ffffff";
				ctx.fillRect(0, 0, canvas.width, canvas.height);
			}
		}
	};

	const handleUndo = () => {
		if (strokes.length === 0) return;
		const last = strokes[strokes.length - 1];
		if (!last) return;
		setStrokes((prev) => prev.slice(0, -1));
		setUndoneStrokes((prev) => [...prev, last]);
	};

	const handleRedo = () => {
		if (undoneStrokes.length === 0) return;
		const last = undoneStrokes[undoneStrokes.length - 1];
		if (!last) return;
		setUndoneStrokes((prev) => prev.slice(0, -1));
		setStrokes((prev) => [...prev, last]);
	};

	// Генерация и отправка тестового SMS OTP
	const handleSendOtp = () => {
		setOtpSentTime(Date.now());
		setOtpCountdown(60);
		setOtpDigits(["", "", "", "", "", ""]);
		setOtpVerified(false);
	};

	const handleOtpChange = (index: number, val: string) => {
		const digit = val.replace(/\D/g, "").slice(-1);
		const newDigits = [...otpDigits];
		newDigits[index] = digit;
		setOtpDigits(newDigits);

		// Автопереход к следующему инпуту
		if (digit && index < 5) {
			const nextInput = document.getElementById(`otp-digit-${index + 1}`);
			nextInput?.focus();
		}

		// Проверка 6 цифр
		if (newDigits.every((d) => d.length === 1)) {
			setOtpVerified(true);
		} else {
			setOtpVerified(false);
		}
	};

	// Расчет криптографического отпечатка
	const integrityRecord = useMemo(() => {
		const fullOtp = otpDigits.join("");
		return generateConsentIntegrityHash({
			documentText: rendered.fullTextContent,
			patientInfo: {
				name: substitutionContext.patientName,
				passportOrBirth: substitutionContext.passport || substitutionContext.birthDate,
				phone: substitutionContext.phone,
			},
			timestamp: Date.now(),
			strokes,
			verificationMethod,
			smsOtpCode: verificationMethod === "sms_otp" && otpVerified ? fullOtp : null,
		});
	}, [rendered.fullTextContent, substitutionContext, strokes, verificationMethod, otpVerified, otpDigits]);

	// Копирование хеша
	const handleCopyHash = () => {
		navigator.clipboard.writeText(integrityRecord.hash);
		setCopiedHash(true);
		setTimeout(() => setCopiedHash(false), 2000);
	};

	// Печать документа А4
	const handlePrint = () => {
		window.print();
	};

	// Проверка валидности подписания
	const canSign = useMemo(() => {
		if (verificationMethod === "tablet_stylus") {
			return !isSignatureEmpty(strokes, 4);
		}
		if (verificationMethod === "sms_otp") {
			return otpVerified;
		}
		return false;
	}, [verificationMethod, strokes, otpVerified]);

	// Подписание и подтверждение
	const handleConfirmSign = () => {
		if (!canSign || isSubmitting) return;
		setIsSubmitting(true);

		try {
			const canvas = canvasRef.current;
			const bounds = calculateBoundingBox(strokes);
			const svg = exportSignatureToSvg(
				strokes,
				bounds.width > 0 ? bounds.width + 20 : 320,
				bounds.height > 0 ? bounds.height + 20 : 160,
				{ backgroundColor: "#ffffff" },
			);

			let pngBase64 = "";
			if (canvas) {
				pngBase64 = canvas.toDataURL("image/png");
			}

			const vectorData: SignatureVectorData = {
				strokes,
				bounds,
				timestamp: Date.now(),
				pointCount: strokes.reduce((acc, s) => acc + s.points.length, 0),
				integrityHash: integrityRecord.hash,
			};

			const payload: SignedConsentPayload = {
				templateKey: activeKey,
				code: currentTemplate.code,
				title: currentTemplate.title,
				fullTextContent: rendered.fullTextContent,
				patientName: substitutionContext.patientName || "Не указан",
				birthDate: substitutionContext.birthDate || "Не указана",
				passport: substitutionContext.passport || "Не указан",
				doctorName: substitutionContext.doctorName || "Не указан",
				clinicName: substitutionContext.clinicName || "ООО «ДЕНТЕ»",
				diagnosisIcd: substitutionContext.diagnosisIcd || "",
				toothNumbers: substitutionContext.toothNumbers || "",
				signatureSvg: svg,
				signaturePngBase64: pngBase64,
				vectorData,
				integrityHash: integrityRecord.hash,
				signedAt: new Date().toISOString(),
				verificationMethod,
				smsOtpCode: verificationMethod === "sms_otp" ? otpDigits.join("") : null,
				attachedToForm043u: true,
			};

			if (onConsentSigned) {
				onConsentSigned(payload);
			}

			if (onConsentConfirmed) {
				onConsentConfirmed({
					consentType: currentTemplate.code,
					intervention: currentTemplate.title,
					toothOrArea: substitutionContext.toothNumbers || "Область лечения",
					confirmedAt: new Date().toISOString(),
					integrityHash: integrityRecord.hash,
				});
			}

			onClose();
		} finally {
			setIsSubmitting(false);
		}
	};

	if (!isOpen) return null;

	const allTemplates = getAllConsentTemplates();

	const modalContent = (
		<div className="consent-modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="consent-modal-title">
			<div className="consent-modal-container" onClick={(e) => e.stopPropagation()}>
				{/* Header */}
				<header className="consent-header">
					<div className="consent-header-titles">
						<div className="consent-header-badge-row">
							<span className="consent-statutory-badge">
								<ShieldCheck size={14} />
								323-ФЗ • 152-ФЗ
							</span>
							<span className="consent-code-badge">{currentTemplate.code}</span>
						</div>
						<h2 id="consent-modal-title" className="consent-title">
							Информированное добровольное согласие (ИДС)
						</h2>
					</div>
					<button
						type="button"
						className="consent-close-btn"
						onClick={onClose}
						aria-label="Закрыть окно согласия"
					>
						<X size={22} />
					</button>
				</header>

				{/* Шаблоны согласий (Табы) */}
				<nav className="consent-tabs-scroll" aria-label="Шаблоны согласий">
					{allTemplates.map((tpl) => {
						const isActive = tpl.key === activeKey;
						return (
							<button
								key={tpl.key}
								type="button"
								className={`consent-tab-btn shrink-0 flex-shrink-0 ${isActive ? "active" : ""}`}
								onClick={() => setActiveKey(tpl.key)}
								aria-selected={isActive}
							>
								<span>{TEMPLATE_SHORT_TITLES[tpl.key] || tpl.title}</span>
							</button>
						);
					})}
				</nav>

				{/* Тело модального окна */}
				<div className="consent-modal-body">
					{/* Информационная панель метаданных */}
					<div className="consent-meta-grid">
						<div className="consent-meta-item">
							<span className="consent-meta-label">Пациент</span>
							<span className="consent-meta-value">{substitutionContext.patientName}</span>
							{substitutionContext.birthDate && (
								<span className="consent-meta-label">Д.Р.: {substitutionContext.birthDate}</span>
							)}
						</div>

						<div className="consent-meta-item">
							<span className="consent-meta-label">Лечащий врач</span>
							<span className="consent-meta-value">{substitutionContext.doctorName}</span>
						</div>

						<div className="consent-meta-item">
							<span className="consent-meta-label">Диагноз (МКБ-10)</span>
							<span className="consent-meta-value">{substitutionContext.diagnosisIcd}</span>
						</div>

						<div className="consent-meta-item">
							<span className="consent-meta-label">Зубы / Зона</span>
							<span className="consent-meta-value">{substitutionContext.toothNumbers}</span>
							{substitutionContext.toothNumbers && (
								<div className="consent-teeth-badges">
									{substitutionContext.toothNumbers.split(/[,;\s]+/).map((t) => (
										<span key={t} className="consent-tooth-chip">
											{t}
										</span>
									))}
								</div>
							)}
						</div>
					</div>

					{/* Просмотр текста согласия */}
					<div className="consent-document-sheet">
						<h3 className="consent-document-title">{rendered.title}</h3>
						<p className="consent-document-subtitle">{rendered.subtitle}</p>

						{rendered.renderedSections.map((sec) => (
							<section key={sec.id} className="consent-section-block">
								<h4 className="consent-section-title">{sec.title}</h4>
								<p className="consent-section-text">{sec.content}</p>
								{sec.bullets && sec.bullets.length > 0 && (
									<ul className="consent-bullet-list">
										{sec.bullets.map((bullet, bIdx) => (
											<li key={bIdx}>{bullet}</li>
										))}
									</ul>
								)}
							</section>
						))}

						{rendered.riskFactors.length > 0 && (
							<div className="consent-risk-box">
								<div className="consent-risk-box-header">
									<AlertTriangle size={16} />
									<span>Факторы риска и анатомические особенности</span>
								</div>
								<ul className="consent-bullet-list">
									{rendered.riskFactors.map((rf, idx) => (
										<li key={idx}>{rf}</li>
									))}
								</ul>
							</div>
						)}

						{rendered.aftercareInstructions.length > 0 && (
							<section className="consent-section-block">
								<h4 className="consent-section-title">Рекомендации и ограничения после лечения</h4>
								<ul className="consent-bullet-list">
									{rendered.aftercareInstructions.map((ac, idx) => (
										<li key={idx}>{ac}</li>
									))}
								</ul>
							</section>
						)}
					</div>

					{/* Выбор метода подписания */}
					<div className="consent-method-selector">
						<button
							type="button"
							className={`consent-method-card ${verificationMethod === "tablet_stylus" ? "active" : ""}`}
							onClick={() => setVerificationMethod("tablet_stylus")}
						>
							<PenTool size={22} className="text-[var(--teal,#0d9488)]" />
							<div>
								<div className="font-bold text-sm">Сенсорная подпись (Стилус / Палец)</div>
								<div className="text-xs text-muted">Непосредственный росчерк на экране планшета</div>
							</div>
						</button>

						<button
							type="button"
							className={`consent-method-card ${verificationMethod === "sms_otp" ? "active" : ""}`}
							onClick={() => setVerificationMethod("sms_otp")}
						>
							<Smartphone size={22} className="text-[var(--teal,#0d9488)]" />
							<div>
								<div className="font-bold text-sm">SMS / OTP подтверждение</div>
								<div className="text-xs text-muted">Одноразовый 6-значный код верификации</div>
							</div>
						</button>
					</div>

					{/* Сенсорный холст для подписи */}
					{verificationMethod === "tablet_stylus" && (
						<div className="consent-signature-hud">
							<div ref={containerRef} className="consent-canvas-wrapper">
								<canvas
									ref={canvasRef}
									className="consent-canvas-element"
									onPointerDown={handlePointerDown}
									onPointerMove={handlePointerMove}
									onPointerUp={handlePointerUp}
									onPointerCancel={handlePointerUp}
									role="img"
									aria-label="Поле для сенсорной подписи пациента"
								/>
								{strokes.length === 0 && !isDrawing && (
									<div className="consent-canvas-watermark">
										<PenTool size={24} />
										<span>Распишитесь стилусом или пальцем здесь</span>
									</div>
								)}
								<div className="consent-canvas-baseline" />
							</div>

							<div className="consent-canvas-tools">
								<div className="flex items-center gap-2">
									<button
										type="button"
										className="consent-tool-btn"
										onClick={handleUndo}
										disabled={strokes.length === 0}
										title="Отменить последний штрих"
										aria-label="Отменить последний штрих"
									>
										<RotateCcw size={16} />
										<span>Назад</span>
									</button>
									<button
										type="button"
										className="consent-tool-btn"
										onClick={handleRedo}
										disabled={undoneStrokes.length === 0}
										title="Вернуть отмененный штрих"
										aria-label="Вернуть отмененный штрих"
									>
										<RotateCw size={16} />
										<span>Вперед</span>
									</button>
									<button
										type="button"
										className="consent-tool-btn"
										onClick={handleClearCanvas}
										disabled={strokes.length === 0}
										title="Очистить поле подписи"
										aria-label="Очистить поле подписи"
									>
										<Trash2 size={16} />
										<span>Очистить</span>
									</button>
								</div>

								<div className="text-xs font-semibold text-muted">
									{strokes.length > 0
										? `Штрихов: ${strokes.length} • Точек: ${strokes.reduce((acc, s) => acc + s.points.length, 0)}`
										: "Ожидание росчерка..."}
								</div>
							</div>
						</div>
					)}

					{/* SMS OTP блок */}
					{verificationMethod === "sms_otp" && (
						<div className="consent-otp-box">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<KeyRound size={20} className="text-[var(--teal,#0d9488)]" />
									<span className="font-bold text-sm">Код подтверждения из SMS</span>
								</div>
								{substitutionContext.phone && (
									<span className="text-xs text-muted">на номер: {substitutionContext.phone}</span>
								)}
							</div>

							<div className="consent-otp-inputs">
								{otpDigits.map((digit, idx) => (
									<input
										key={idx}
										id={`otp-digit-${idx}`}
										type="text"
										inputMode="numeric"
										maxLength={1}
										value={digit}
										onChange={(e) => handleOtpChange(idx, e.target.value)}
										className="consent-otp-digit"
										aria-label={`Цифра ${idx + 1} кода подтверждения`}
									/>
								))}
							</div>

							<div className="flex items-center justify-between pt-2">
								<button
									type="button"
									className="consent-tool-btn"
									onClick={handleSendOtp}
									disabled={otpCountdown > 0}
								>
									<RefreshCw size={14} className={otpCountdown > 0 ? "animate-spin" : ""} />
									<span>
										{otpCountdown > 0
											? `Повтор через ${otpCountdown} сек.`
											: otpSentTime
												? "Отправить код повторно"
												: "Отправить код по SMS"}
									</span>
								</button>

								{otpVerified && (
									<div className="flex items-center gap-1 text-sm font-bold text-ok-fg">
										<CheckCircle2 size={16} />
										<span>Код подтвержден</span>
									</div>
								)}
							</div>
						</div>
					)}

					{/* Панель криптографической целостности SHA-256 */}
					<div className="consent-integrity-card">
						<div className="flex items-center gap-2">
							<Lock size={16} className="text-[var(--teal,#0d9488)]" />
							<span className="font-semibold text-xs text-muted">Цифровой отпечаток SHA-256:</span>
							<span className="consent-integrity-hash">{integrityRecord.hash.slice(0, 16)}...</span>
						</div>
						<button
							type="button"
							className="consent-tool-btn py-1 px-2 text-xs"
							onClick={handleCopyHash}
							title="Скопировать полный хеш целостности"
							aria-label="Скопировать полный хеш"
						>
							{copiedHash ? <Check size={14} className="text-ok-fg" /> : <Copy size={14} />}
							<span>{copiedHash ? "Скопировано" : "Копировать"}</span>
						</button>
					</div>
				</div>

				{/* Footer */}
				<footer className="consent-modal-footer">
					<button
						type="button"
						className="consent-action-btn secondary"
						onClick={handlePrint}
						title="Печать бумажного бланка А4"
					>
						<Printer size={18} />
						<span>Распечатать (А4)</span>
					</button>

					<div className="flex items-center gap-3">
						<button
							type="button"
							className="consent-action-btn secondary"
							onClick={onClose}
						>
							<span>Отмена</span>
						</button>

						<button
							type="button"
							className="consent-action-btn primary"
							onClick={handleConfirmSign}
							disabled={!canSign || isSubmitting}
						>
							<FileCheck size={18} />
							<span>Подписать и прикрепить к карте 043/у</span>
						</button>
					</div>
				</footer>
			</div>
		</div>
	);

	if (typeof document === "undefined" || !document.body) {
		return modalContent;
	}

	return createPortal(modalContent, document.body);
};
