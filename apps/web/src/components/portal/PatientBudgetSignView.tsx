/**
 * DENTE CRM — Patient Budget & Treatment Plan Signing View (SSOT)
 * (DOMAIN: PATIENT PORTAL & CLINICAL TRANSPARENCY)
 *
 * Implements 1-Click & Stylus/Finger Plan Approval (152-FZ & 63-FZ PEP).
 * Mandates: 8am (Single Primary CTA var(--teal)), 8ze (Apple HIG), 8e (Zero Disabled Buttons).
 * Sweet Spot: 250-320 lines (No micro-shredder antipattern per Mandate 8b).
 */

import * as React from "react";
import {
	AlertCircle,
	CheckCircle2,
	Clock,
	FileText,
	Lock,
	Printer,
	RotateCcw,
	ShieldCheck,
	Sparkles,
} from "lucide-react";
import "./patientBudgetSign.css";
import type {
	BudgetItem,
	BudgetPortalData,
	PatientBudgetSignViewProps,
} from "./budgetSign/budgetSignTypes";
import { formatIsoDateTime, formatRub } from "./budgetSign/budgetSignTypes";

export * from "./budgetSign/budgetSignTypes";

export const PatientBudgetSignView: React.FC<PatientBudgetSignViewProps> = ({
	token: propToken,
	apiBaseUrl = "",
	onSuccess,
	className = "",
}) => {
	// Active token from props or hash route
	const activeToken = React.useMemo(() => {
		if (propToken) return propToken;
		if (typeof window === "undefined") return "";
		const hash = window.location.hash || "";
		const match = hash.match(/#\/portal\/budget\/([^/?#]+)/);
		return match && match[1] ? match[1] : "";
	}, [propToken]);

	// Session token & data state
	const [budget, setBudget] = React.useState<BudgetPortalData | null>(null);
	const [sessionToken, setSessionToken] = React.useState<string | null>(null);
	const [isLoading, setIsLoading] = React.useState<boolean>(true);
	const [fetchError, setFetchError] = React.useState<string | null>(null);

	// Verification state
	const [verifyFactor, setVerifyFactor] = React.useState<string>("");
	const [isVerifying, setIsVerifying] = React.useState<boolean>(false);
	const [verifyError, setVerifyError] = React.useState<string | null>(null);

	// Signature & consent state
	const [signerName, setSignerName] = React.useState<string>("");
	const [isSubmittingSign, setIsSubmittingSign] = React.useState<boolean>(false);
	const [signError, setSignError] = React.useState<string | null>(null);
	const [legalConsent152Fz, setLegalConsent152Fz] = React.useState<boolean>(true);

	// Canvas drawing state
	const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
	const [isDrawing, setIsDrawing] = React.useState<boolean>(false);
	const [hasStrokes, setHasStrokes] = React.useState<boolean>(false);

	// Initial data fetch
	React.useEffect(() => {
		if (!activeToken) {
			setFetchError("Токен сметы не указан.");
			setIsLoading(false);
			return;
		}

		let isMounted = true;
		const fetchBudget = async () => {
			setIsLoading(true);
			setFetchError(null);
			try {
				const res = await fetch(`${apiBaseUrl}/api/portal/budget/${activeToken}`);
				if (!res.ok) {
					throw new Error(res.status === 404 ? "Смета не найдена или срок действия ссылки истёк." : "Ошибка загрузки сметы.");
				}
				const data = await res.json();
				if (isMounted) {
					setBudget(data);
					if (data.sessionToken) setSessionToken(data.sessionToken);
					if (data.patientFirstName) setSignerName(data.patientFirstName);
				}
			} catch (err: any) {
				if (isMounted) setFetchError(err.message || "Не удалось загрузить данные сметы.");
			} finally {
				if (isMounted) setIsLoading(false);
			}
		};

		void fetchBudget();
		return () => { isMounted = false; };
	}, [activeToken, apiBaseUrl]);

	// Retina Canvas calibration
	const setupCanvas = React.useCallback(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const rect = canvas.getBoundingClientRect();
		const effectiveWidth = rect.width > 0 ? rect.width : 400;
		const effectiveHeight = rect.height > 0 ? rect.height : 140;
		const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
		canvas.width = effectiveWidth * dpr;
		canvas.height = effectiveHeight * dpr;
		const ctx = canvas.getContext("2d");
		if (ctx) {
			ctx.scale(dpr, dpr);
			ctx.lineCap = "round";
			ctx.lineJoin = "round";
			ctx.strokeStyle = "var(--teal, #0d9488)";
			ctx.lineWidth = 2.5;
		}
	}, []);

	React.useEffect(() => {
		if (budget && budget.isVerified && budget.status !== "accepted") {
			setupCanvas();
			const handleResize = () => setupCanvas();
			window.addEventListener("resize", handleResize);
			return () => window.removeEventListener("resize", handleResize);
		}
	}, [budget, setupCanvas]);

	// Touch & stylus pointer handlers
	const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		const rect = canvas.getBoundingClientRect();
		ctx.beginPath();
		ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
		setIsDrawing(true);
		setHasStrokes(true);
	};

	const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
		if (!isDrawing) return;
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		const rect = canvas.getBoundingClientRect();
		ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
		ctx.stroke();
	};

	const stopDrawing = () => setIsDrawing(false);

	const clearCanvas = () => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
		ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
		setHasStrokes(false);
	};

	// 1-Click PEP stamp generation
	const handleOneClickPep = React.useCallback(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
		const w = (canvas.width || 400 * dpr) / dpr;
		const h = (canvas.height || 140 * dpr) / dpr;
		ctx.clearRect(0, 0, w, h);
		ctx.fillStyle = "rgba(13, 148, 136, 0.08)";
		ctx.fillRect(8, 8, w - 16, h - 16);
		ctx.strokeStyle = "var(--teal, #0d9488)";
		ctx.lineWidth = 2;
		ctx.strokeRect(8, 8, w - 16, h - 16);

		ctx.fillStyle = "var(--teal, #0d9488)";
		ctx.font = "bold 13px system-ui, -apple-system, sans-serif";
		ctx.textAlign = "center";
		ctx.fillText("СОГЛАСОВАНО В 1 КЛИК (ПЭП 63-ФЗ)", w / 2, h / 2 - 10);
		ctx.font = "11px system-ui, -apple-system, sans-serif";
		ctx.fillText(signerName.trim() || budget?.patientFirstName || "Пациент", w / 2, h / 2 + 8);
		ctx.fillText(new Date().toLocaleDateString("ru-RU"), w / 2, h / 2 + 24);
		setHasStrokes(true);
	}, [signerName, budget?.patientFirstName]);

	// 2FA phone / dob verification submit
	const handleVerifySubmit = async (e?: React.FormEvent) => {
		if (e) e.preventDefault();
		if (!activeToken) return;
		if (!verifyFactor.trim()) {
			setVerifyError("Пожалуйста, введите данные для подтверждения доступа.");
			return;
		}
		setIsVerifying(true);
		setVerifyError(null);
		try {
			const res = await fetch(`${apiBaseUrl}/api/portal/budget/${activeToken}/verify`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ value: verifyFactor.trim() }),
			});
			const data = await res.json();
			if (!res.ok || !data.verified) {
				setVerifyError(data.message || "Неверный проверочный код. Проверьте последние 4 цифры номера телефона.");
				return;
			}
			setBudget((prev) => (prev ? { ...prev, isVerified: true, items: data.items || prev.items } : null));
			if (data.sessionToken) setSessionToken(data.sessionToken);
		} catch {
			setVerifyError("Сетевая ошибка при проверке доступа. Попробуйте еще раз.");
		} finally {
			setIsVerifying(false);
		}
	};

	// Final Plan & Budget Signing submit (Live Fastify API)
	const handleSignSubmit = async () => {
		if (!activeToken) return;
		if (!legalConsent152Fz) {
			setSignError("Необходимо подтвердить согласие на обработку персональных данных (152-ФЗ) и утверждение сметы.");
			return;
		}
		if (!hasStrokes && canvasRef.current) handleOneClickPep();
		setIsSubmittingSign(true);
		setSignError(null);
		try {
			const signaturePng = canvasRef.current ? canvasRef.current.toDataURL("image/png") : "";
			const headers: Record<string, string> = { "Content-Type": "application/json" };
			if (sessionToken) headers["Authorization"] = `Bearer ${sessionToken}`;
			const res = await fetch(`${apiBaseUrl}/api/portal/budget/${activeToken}/sign`, {
				method: "POST",
				headers,
				body: JSON.stringify({ signaturePng, signerName: signerName.trim() || budget?.patientFirstName || "Пациент" }),
			});
			const data = await res.json();
			if (!res.ok || !data.success) {
				setSignError(data.message || "Не удалось сохранить подпись сметы.");
				return;
			}
			setBudget((prev) => (prev ? {
				...prev,
				status: "accepted",
				signedAt: data.signedAt || new Date().toISOString(),
				documentHash: data.documentHash || null,
				signerName: data.signerName || signerName,
			} : null));
			onSuccess?.({ signedAt: data.signedAt, documentHash: data.documentHash });
		} catch {
			setSignError("Сетевая ошибка при отправке подписи.");
		} finally {
			setIsSubmittingSign(false);
		}
	};

	// 1. Loading state
	if (isLoading) {
		return (
			<div className={`patient-budget-container ${className}`}>
				<div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--muted)" }}>
					<Clock size={32} style={{ margin: "0 auto 1rem", display: "block" }} />
					<p>Загрузка данных сметы...</p>
				</div>
			</div>
		);
	}

	// 2. Error state
	if (fetchError || !budget) {
		return (
			<div className={`patient-budget-container ${className}`}>
				<div className="patient-budget-card" style={{ textAlign: "center", padding: "2rem 1rem" }}>
					<AlertCircle size={40} style={{ margin: "0 auto 0.75rem", display: "block", color: "var(--bad-fg, var(--rust))" }} />
					<h3 style={{ fontSize: "1rem", fontWeight: 700, margin: "0 0 0.5rem", color: "var(--ink)" }}>Ошибка доступа</h3>
					<p style={{ fontSize: "0.875rem", color: "var(--muted)", margin: 0 }}>{fetchError || "Смета не найдена."}</p>
				</div>
			</div>
		);
	}

	const isAccepted = budget.status === "accepted";
	const isPhoneAuth = budget.authMethod === "phone_last4";

	return (
		<div className={`patient-budget-container ${className}`}>
			{/* Header with clinic & doctor info */}
			<div className="patient-budget-header">
				<div>
					<div className="patient-budget-clinic-title">{budget.clinicName || "Стоматологическая клиника"}</div>
					{budget.doctorName && <div className="patient-budget-doctor-name">Врач: {budget.doctorName}</div>}
				</div>
				<div>
					{isAccepted ? (
						<span className="patient-budget-status-chip accepted"><CheckCircle2 size={12} />Согласовано</span>
					) : (
						<span className="patient-budget-status-chip pending"><Clock size={12} />Ожидает подписи</span>
					)}
				</div>
			</div>

			{/* 2FA Verification section if required */}
			{budget.requiresVerification && !budget.isVerified && (
				<div className="patient-budget-verify-box">
					<div className="patient-budget-card-title"><Lock size={16} />Подтверждение доступа</div>
					<p style={{ fontSize: "0.8125rem", color: "var(--muted)", margin: "0 0 0.5rem" }}>
						{isPhoneAuth ? "Для просмотра полного плана лечения введите последние 4 цифры вашего номера телефона:" : "Укажите дату рождения (ДД.ММ.ГГГГ):"}
					</p>
					<form onSubmit={handleVerifySubmit}>
						<div className="patient-budget-verify-input-group">
							<input
								type="text"
								className="patient-budget-verify-input"
								placeholder={isPhoneAuth ? "••••" : "ДД.ММ.ГГГГ"}
								maxLength={isPhoneAuth ? 4 : 10}
								inputMode={isPhoneAuth ? "numeric" : "text"}
								value={verifyFactor}
								onChange={(e) => setVerifyFactor(e.target.value)}
								autoFocus
							/>
							<button type="submit" className="patient-budget-verify-btn" data-testid="patient-budget-verify-submit-btn">
								{isVerifying ? "Проверка..." : "Войти"}
							</button>
						</div>
						{verifyError && <div className="patient-budget-error-msg"><AlertCircle size={14} />{verifyError}</div>}
					</form>
				</div>
			)}

			{/* Plan Services & Items Table */}
			<div className="patient-budget-card">
				<div className="patient-budget-card-title"><FileText size={16} />План лечения и смета услуг</div>
				{budget.items.length === 0 ? (
					<p style={{ fontSize: "0.8125rem", color: "var(--muted)" }}>Список услуг уточняется.</p>
				) : (
					budget.items.map((item: BudgetItem, idx: number) => (
						<div key={item.id || idx} className="patient-budget-item-row">
							<div className="patient-budget-item-info">
								{item.toothNumber && <span className="patient-budget-tooth-badge">Зуб {item.toothNumber}</span>}
								<span className="patient-budget-item-title">{item.title}</span>
								{item.quantity && item.quantity > 1 && <span className="patient-budget-item-qty">{item.quantity} шт.</span>}
							</div>
							<div className="patient-budget-item-price">{formatRub(item.priceRub * (item.quantity || 1))}</div>
						</div>
					))
				)}
				<div className="patient-budget-totals">
					{budget.discountRub > 0 && (
						<>
							<div className="patient-budget-total-line"><span>Сумма по прайсу:</span><span>{formatRub(budget.totalPriceRub)}</span></div>
							<div className="patient-budget-total-line" style={{ color: "var(--teal)" }}><span>Скидка клиники:</span><span>-{formatRub(budget.discountRub)}</span></div>
						</>
					)}
					<div className="patient-budget-grand-total">
						<span>Итого к оплате:</span>
						<span className="patient-budget-grand-price">{formatRub(budget.netTotalRub)}</span>
					</div>
				</div>
			</div>

			{/* Accepted Card (Success State) */}
			{isAccepted ? (
				<div className="patient-budget-accepted-card">
					<CheckCircle2 size={40} style={{ margin: "0 auto", color: "var(--teal)" }} />
					<div className="patient-budget-accepted-title">Смета успешно согласована</div>
					<p className="patient-budget-accepted-desc">План лечения утверждён пациентом: <strong>{budget.signerName || budget.patientFirstName || "Пациент"}</strong></p>
					{budget.signedAt && <p className="patient-budget-accepted-date">Дата и время: {formatIsoDateTime(budget.signedAt)}</p>}
					{budget.documentHash && <div className="patient-budget-hash-box"><strong>SHA-256 целостности документа:</strong><br />{budget.documentHash}</div>}
					<button type="button" className="patient-budget-print-btn" onClick={() => window.print()}><Printer size={16} />Распечатать / Сохранить в PDF</button>
				</div>
			) : budget.isVerified ? (
				/* Interactive Touch & Stylus Signature Card (152-FZ & 63-FZ) */
				<div className="patient-budget-card" data-testid="patient-budget-sign-card">
					<div className="patient-budget-card-title"><ShieldCheck size={18} style={{ color: "var(--teal)" }} />Электронное согласование сметы онлайн</div>
					<p style={{ fontSize: "0.8125rem", color: "var(--muted)", margin: "0 0 0.75rem" }}>Распишитесь пальцем/стилусом или согласуйте в 1 клик с формированием электронной подписи:</p>
					<div className="patient-budget-signature-section">
						<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
							<span style={{ fontSize: "12px", fontWeight: 600, color: "var(--ink)" }}>Подпись пациента:</span>
							<div style={{ display: "flex", gap: "6px" }}>
								{hasStrokes && <button type="button" onClick={clearCanvas} className="patient-budget-clear-btn" data-testid="patient-budget-clear-canvas-btn"><RotateCcw size={12} />Очистить</button>}
								<button type="button" onClick={handleOneClickPep} className="patient-budget-stamp-btn" data-testid="patient-budget-generate-pep-stamp-btn"><Sparkles size={12} />Штамп ПЭП (1 клик)</button>
							</div>
						</div>
						<div className="patient-budget-canvas-wrapper">
							<canvas ref={canvasRef} className="patient-budget-signature-canvas" data-testid="patient-budget-signature-canvas" onPointerDown={startDrawing} onPointerMove={draw} onPointerUp={stopDrawing} onPointerLeave={stopDrawing} />
							{!hasStrokes && <div className="patient-budget-canvas-placeholder">Распишитесь пальцем/стилусом в поле выше или нажмите «Согласовать в 1 клик»</div>}
						</div>
					</div>
					<input type="text" className="patient-budget-signer-input" placeholder="ФИО подписанта (пациента)" value={signerName} onChange={(e) => setSignerName(e.target.value)} data-testid="patient-budget-signer-input" />
					<label className="patient-budget-consent-label" data-testid="patient-budget-152fz-consent-label">
						<input type="checkbox" checked={legalConsent152Fz} onChange={(e) => setLegalConsent152Fz(e.target.checked)} data-testid="patient-budget-152fz-checkbox" style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "var(--teal)" }} />
						<span>Я подтверждаю согласие на обработку персональных данных (152-ФЗ) и утверждение сметы (63-ФЗ ПЭП)</span>
					</label>
					<div className="patient-budget-legal-text">В соответствии с 152-ФЗ и 63-ФЗ простая электронная подпись (ПЭП) признаётся равнозначной собственноручной подписи.</div>
					{signError && <div className="patient-budget-error-msg" style={{ marginBottom: "0.75rem" }} data-testid="patient-budget-sign-error"><AlertCircle size={14} />{signError}</div>}
					
					{/* Single Primary CTA Button (Mandate 8am & Apple HIG Thumb Zone) */}
					<button type="button" className="patient-budget-submit-btn" onClick={handleSignSubmit} data-testid="patient-budget-agree-oneclick-btn">
						<ShieldCheck size={18} />{isSubmittingSign ? "Сохранение согласования..." : "Согласовать смету и план лечения"}
					</button>
				</div>
			) : null}
		</div>
	);
};

export default PatientBudgetSignView;
