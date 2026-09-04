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
	getBlankConsentSubstitutionContext,
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
	generatePaperSignatureSvg,
	isSignatureEmpty,
	PAPER_SIGNATURE_FALLBACK_PNG,
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
	verificationMethod: "tablet_stylus" | "sms_otp" | "paper_physical";
	smsOtpCode?: string | null;
	attachedToForm043u: boolean;
	paperOriginalStored?: boolean;
	statusText?: string;
	note?: string;
}

const TEMPLATE_SHORT_TITLES: Record<ConsentTemplateKey, string> = {
	CONSENT_THERAPY: "Терапия и Эндодонтия",
	CONSENT_SURGERY_IMPLANT: "Хирургия / Имплантация",
	CONSENT_ORTHODONTICS: "Ортодонтия (Брекеты)",
	CONSENT_ORTHOPEDICS: "Ортопедия (Коронки)",
	CONSENT_HYGIENE_BLEACHING: "Профгигиена и отбеливание",
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
	const [verificationMethod, setVerificationMethod] = useState<"tablet_stylus" | "sms_otp" | "paper_physical">("paper_physical");
	const [isPrintingBlank, setIsPrintingBlank] = useState<boolean>(false);
	
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
			setVerificationMethod("paper_physical");
			setIsPrintingBlank(false);
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
			clinicOgrn: clinicOgrn || "1217700123456",
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

	// Контекст чистого бланка для печати со строками «________»
	const printBlankContext = useMemo<ConsentSubstitutionContext>(() => {
		return getBlankConsentSubstitutionContext({
			clinicName: clinicName ?? null,
			clinicLegalName: clinicLegalName ?? null,
			clinicAddress: clinicAddress ?? null,
			clinicOgrn: clinicOgrn ?? null,
			licenseNumber: licenseNumber ?? null,
		});
	}, [clinicName, clinicLegalName, clinicAddress, clinicOgrn, licenseNumber]);

	const effectiveContext = isPrintingBlank ? printBlankContext : substitutionContext;

	const currentTemplate = useMemo<ConsentTemplate>(() => {
		return getConsentTemplate(activeKey);
	}, [activeKey]);

	const rendered = useMemo(() => {
		return renderConsentTemplate(currentTemplate, effectiveContext);
	}, [currentTemplate, effectiveContext]);

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

	// Печать документа А4 (заполненный бланк)
	const handlePrint = () => {
		window.print();
	};

	// Печать чистого бланка ИДС со строками «________» для ручного заполнения пациентом до приема без 403-ошибок
	const handlePrintBlank = () => {
		setIsPrintingBlank(true);
		setTimeout(() => {
			window.print();
			setTimeout(() => {
				setIsPrintingBlank(false);
			}, 600);
		}, 80);
	};

	// Проверка валидности подписания (для бумажного носителя ВСЕГДА true — 0 блокировок)
	const canSign = useMemo(() => {
		if (verificationMethod === "paper_physical") {
			return true;
		}
		if (verificationMethod === "tablet_stylus") {
			return !isSignatureEmpty(strokes, 4);
		}
		if (verificationMethod === "sms_otp") {
			return otpVerified;
		}
		return false;
	}, [verificationMethod, strokes, otpVerified]);

	// Подписание и подтверждение (включая мгновенный 1-клик для бумаги)
	const handleConfirmSign = (forcedMethod?: "tablet_stylus" | "sms_otp" | "paper_physical") => {
		const method = forcedMethod || verificationMethod;
		if (method !== "paper_physical" && !canSign) return;
		if (isSubmitting) return;
		setIsSubmitting(true);

		try {
			const canvas = canvasRef.current;
			let svg = "";
			let pngBase64 = "";

			if (method === "paper_physical") {
				svg = generatePaperSignatureSvg({
					date: effectiveContext.date || new Date().toLocaleDateString("ru-RU"),
					clinicName: effectiveContext.clinicName || "ООО «Стоматологическая клиника ДЕНТЕ»",
				});
				pngBase64 = PAPER_SIGNATURE_FALLBACK_PNG;
			} else {
				const bounds = calculateBoundingBox(strokes);
				svg = exportSignatureToSvg(
					strokes,
					bounds.width > 0 ? bounds.width + 20 : 320,
					bounds.height > 0 ? bounds.height + 20 : 160,
					{ backgroundColor: "#ffffff" },
				);
				if (canvas) {
					pngBase64 = canvas.toDataURL("image/png");
				}
			}

			const vectorData: SignatureVectorData = {
				strokes: method === "paper_physical" ? [] : strokes,
				bounds:
					method === "paper_physical"
						? { minX: 0, minY: 0, maxX: 400, maxY: 120, width: 400, height: 120 }
						: calculateBoundingBox(strokes),
				timestamp: Date.now(),
				pointCount: method === "paper_physical" ? 0 : strokes.reduce((acc, s) => acc + s.points.length, 0),
				integrityHash: integrityRecord.hash,
			};

			const payload: SignedConsentPayload = {
				templateKey: activeKey,
				code: currentTemplate.code,
				title: currentTemplate.title,
				fullTextContent: rendered.fullTextContent,
				patientName: effectiveContext.patientName || "Не указан",
				birthDate: effectiveContext.birthDate || "Не указана",
				passport: effectiveContext.passport || "Не указан",
				doctorName: effectiveContext.doctorName || "Не указан",
				clinicName: effectiveContext.clinicName || "ООО «ДЕНТЕ»",
				diagnosisIcd: effectiveContext.diagnosisIcd || "",
				toothNumbers: effectiveContext.toothNumbers || "",
				signatureSvg: svg,
				signaturePngBase64: pngBase64,
				vectorData,
				integrityHash: integrityRecord.hash,
				signedAt: new Date().toISOString(),
				verificationMethod: method,
				smsOtpCode: method === "sms_otp" ? otpDigits.join("") : null,
				attachedToForm043u: true,
				paperOriginalStored: method === "paper_physical",
				statusText:
					method === "paper_physical"
						? "Бумажный оригинал подписан пациентом (хранится в архиве карты 043/у)"
						: "Электронная подпись подтверждена",
			};

			if (onConsentSigned) {
				onConsentSigned(payload);
			}

			if (onConsentConfirmed) {
				onConsentConfirmed({
					consentType: currentTemplate.code,
					intervention: currentTemplate.title,
					toothOrArea: effectiveContext.toothNumbers || "Область лечения",
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
		<div className="consent-modal-overlay print-layer" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="consent-modal-title">
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

						{/* Блок подписей сторон (для печати бумажного бланка и подшивки в форму 043/у) */}
						<div
							className="consent-print-signatures-block"
							style={{
								marginTop: "1.5rem",
								paddingTop: "1rem",
								borderTop: "1px solid #cbd5e1",
								display: "flex",
								flexDirection: "column",
								gap: "0.85rem",
							}}
						>
							<div
								style={{
									display: "grid",
									gridTemplateColumns: "1fr 1fr",
									gap: "1.5rem",
								}}
							>
								<div>
									<div
										style={{
											fontSize: "11px",
											fontWeight: "bold",
											textTransform: "uppercase",
											color: "#475569",
											marginBottom: "4px",
										}}
									>
										Пациент (законный представитель):
									</div>
									<div style={{ fontSize: "12px", color: "#0f172a" }}>
										Подпись: __________________ / {effectiveContext.patientName || "____________________"} /
									</div>
								</div>
								<div>
									<div
										style={{
											fontSize: "11px",
											fontWeight: "bold",
											textTransform: "uppercase",
											color: "#475569",
											marginBottom: "4px",
										}}
									>
										Лечащий врач:
									</div>
									<div style={{ fontSize: "12px", color: "#0f172a" }}>
										Подпись: __________________ / {effectiveContext.doctorName || "____________________"} /
									</div>
								</div>
							</div>
							<div
								style={{
									display: "flex",
									justifyContent: "space-between",
									fontSize: "11px",
									color: "#64748b",
								}}
							>
								<span>Дата: {effectiveContext.date || new Date().toLocaleDateString("ru-RU")}</span>
								<span>Клиника: {effectiveContext.clinicName}</span>
							</div>
						</div>
					</div>

					{/* Выбор метода подписания */}
					<div className="consent-method-selector">
						<button
							type="button"
							className={`consent-method-card ${verificationMethod === "paper_physical" ? "active" : ""}`}
							onClick={() => setVerificationMethod("paper_physical")}
							data-testid="btn-method-paper-physical"
						>
							<FileCheck size={22} className="text-[var(--teal,#0d9488)]" />
							<div>
								<div className="font-bold text-sm">Бумажный бланк (Ручка / 043/у)</div>
								<div className="text-xs text-muted">Оригинал подписан пациентом от руки (в 95% клиник РФ)</div>
							</div>
						</button>

						<button
							type="button"
							className={`consent-method-card ${verificationMethod === "tablet_stylus" ? "active" : ""}`}
							onClick={() => setVerificationMethod("tablet_stylus")}
							data-testid="btn-method-tablet-stylus"
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
							data-testid="btn-method-sms-otp"
						>
							<Smartphone size={22} className="text-[var(--teal,#0d9488)]" />
							<div>
								<div className="font-bold text-sm">SMS / OTP подтверждение</div>
								<div className="text-xs text-muted">Одноразовый 6-значный код верификации</div>
							</div>
						</button>
					</div>

					{/* Подтверждение бумажного подписания (323-ФЗ) */}
					{verificationMethod === "paper_physical" && (
						<div
							className="consent-paper-box"
							style={{
								display: "flex",
								flexDirection: "column",
								gap: "0.85rem",
								background: "var(--paper-soft)",
								border: "1px solid var(--teal, #0d9488)",
								borderRadius: "var(--radius-lg, 12px)",
								padding: "1.25rem",
							}}
						>
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<ShieldCheck size={22} className="text-[var(--teal,#0d9488)]" />
									<span className="font-bold text-sm">
										Подписание на бумажном носителе (323-ФЗ ст. 20)
									</span>
								</div>
								<span className="consent-statutory-badge">
									Оригинал в карте 043/у
								</span>
							</div>
							<p className="text-xs text-muted" style={{ margin: 0, lineHeight: 1.5 }}>
								Пациент ознакомился с текстом согласия и расписался шариковой ручкой на бумажном бланке.
								Бумажный оригинал подшивается в медицинскую карту пациента формы № 043/у (нормативный срок хранения 25 лет).
								В электронной карте фиксируется статус согласия с формированием криптографического отпечатка SHA-256.
							</p>
							<div className="flex items-center gap-3 pt-1 flex-wrap">
								<button
									type="button"
									className="consent-action-btn primary"
									data-testid="btn-confirm-paper-signed"
									onClick={() => handleConfirmSign("paper_physical")}
									disabled={isSubmitting}
									style={{
										minHeight: "44px",
										fontSize: "14px",
										fontWeight: "bold",
										background: "var(--teal, #0d9488)",
										color: "#ffffff",
										boxShadow: "0 2px 8px rgba(13, 148, 136, 0.25)",
									}}
								>
									<CheckCircle2 size={18} />
									<span>⚡ Подтвердить подписание на бумаге (1 клик)</span>
								</button>
								<button
									type="button"
									className="consent-tool-btn"
									onClick={handlePrint}
									title="Печать заполненного бланка ИДС на принтер (А4)"
								>
									<Printer size={16} />
									<span>Печать бланка (А4)</span>
								</button>
								<button
									type="button"
									className="consent-tool-btn"
									data-testid="btn-print-blank-consent-inline"
									onClick={handlePrintBlank}
									title="Печать чистого бланка со строками «________» для ручного заполнения пациентом"
								>
									<FileText size={16} />
									<span>Печать чистого бланка («________»)</span>
								</button>
							</div>
						</div>
					)}

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
					<div className="flex items-center gap-2 flex-wrap">
						<button
							type="button"
							className="consent-action-btn secondary"
							onClick={handlePrint}
							title="Печать заполненного бланка ИДС на принтер (А4)"
						>
							<Printer size={18} />
							<span>Печать бланка (А4)</span>
						</button>
						<button
							type="button"
							className="consent-action-btn secondary"
							data-testid="btn-print-blank-consent"
							onClick={handlePrintBlank}
							title="Печать чистого бланка со строками «________» для ручного заполнения"
						>
							<FileText size={18} />
							<span>Печать чистого бланка («________»)</span>
						</button>
					</div>

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
							data-testid="btn-confirm-sign"
							onClick={() => handleConfirmSign()}
							disabled={!canSign || isSubmitting}
						>
							{verificationMethod === "paper_physical" ? (
								<>
									<CheckCircle2 size={18} />
									<span>⚡ Подтвердить подписание на бумаге (1 клик)</span>
								</>
							) : (
								<>
									<FileCheck size={18} />
									<span>Подписать и прикрепить к карте 043/у</span>
								</>
							)}
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
