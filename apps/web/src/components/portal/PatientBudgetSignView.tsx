/**
 * DENTE CRM — Patient Quote Review & Mobile Touch Digital Signature Portal View
 * (DOMAIN: PATIENT PORTAL QUOTE REVIEW & PEP SIGNATURE, MANDATES 8c, 8e, 8n, 8s)
 * Strict clinical style, 0 emojis, >=44px touch targets, Retina canvas support.
 */

import * as React from "react";
import { useEffect, useRef, useState, useCallback } from "react";
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
import type { PublicAuthMethod } from "@dental/shared";
import "./patientBudgetSign.css";

export interface BudgetItem {
	id?: string;
	title: string;
	toothNumber?: number | null;
	quantity?: number;
	priceRub: number;
	discountRub?: number;
}

export interface BudgetPortalData {
	token: string;
	planId?: string | null;
	status: "pending" | "viewed" | "accepted" | "rejected" | "expired";
	clinicName?: string;
	clinicPhone?: string;
	clinicAddress?: string;
	doctorName?: string;
	patientFirstName?: string;
	totalPriceRub: number;
	discountRub: number;
	netTotalRub: number;
	currency: string;
	items: BudgetItem[];
	requiresVerification: boolean;
	authMethod: PublicAuthMethod;
	isVerified: boolean;
	viewedAt?: string | null;
	signedAt?: string | null;
	signerName?: string | null;
	documentHash?: string | null;
}

export interface PatientBudgetSignViewProps {
	token?: string;
	apiBaseUrl?: string;
	onSuccess?: (data: { signedAt: string; documentHash: string }) => void;
	className?: string;
}

function formatRub(value: number): string {
	return `${Math.round(value).toLocaleString("ru-RU")} ₽`;
}

function formatIsoDateTime(isoString?: string | null): string {
	if (!isoString) return "";
	try {
		const d = new Date(isoString);
		return d.toLocaleString("ru-RU", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	} catch {
		return isoString;
	}
}

export const PatientBudgetSignView: React.FC<PatientBudgetSignViewProps> = ({
	token: propToken,
	apiBaseUrl = "",
	onSuccess,
	className = "",
}) => {
	// 1. Resolve token from props or URL
	const [activeToken, setActiveToken] = useState<string>(() => {
		if (propToken) return propToken;
		if (typeof window !== "undefined") {
			const searchParams = new URLSearchParams(window.location.search);
			const qToken = searchParams.get("token") || searchParams.get("t");
			if (qToken) return qToken;
			const match = window.location.pathname.match(/\/budget\/([a-zA-Z0-9_-]+)/);
			if (match && match[1]) return match[1];
			const hashMatch = window.location.hash.match(/\/budget\/([a-zA-Z0-9_-]+)/);
			if (hashMatch && hashMatch[1]) return hashMatch[1];
		}
		return "";
	});

	const [budget, setBudget] = useState<BudgetPortalData | null>(null);
	const [sessionToken, setSessionToken] = useState<string>("");
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const [fetchError, setFetchError] = useState<string | null>(null);

	// 2FA state
	const [verifyFactor, setVerifyFactor] = useState<string>("");
	const [isVerifying, setIsVerifying] = useState<boolean>(false);
	const [verifyError, setVerifyError] = useState<string | null>(null);

	// Signature Canvas state
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const [isDrawing, setIsDrawing] = useState<boolean>(false);
	const [hasStrokes, setHasStrokes] = useState<boolean>(false);
	const [signerName, setSignerName] = useState<string>("");
	const [isSubmittingSign, setIsSubmittingSign] = useState<boolean>(false);
	const [signError, setSignError] = useState<string | null>(null);
	const [legalConsent152Fz, setLegalConsent152Fz] = useState<boolean>(true);

	// Fetch budget details from backend
	const fetchBudget = useCallback(
		async (tok: string, sToken?: string) => {
			if (!tok) {
				setIsLoading(false);
				setFetchError("Токен сметы не указан или недействителен.");
				return;
			}

			try {
				setIsLoading(true);
				setFetchError(null);

				const headers: Record<string, string> = {};
				const currentSession = sToken || sessionToken;
				if (currentSession) {
					headers["Authorization"] = `Bearer ${currentSession}`;
				}

				const res = await fetch(`${apiBaseUrl}/api/portal/budget/${tok}`, {
					method: "GET",
					headers,
				});

				if (!res.ok) {
					if (res.status === 404) {
						setFetchError("Смета не найдена или срок её действия истёк.");
					} else {
						const errJson = await res.json().catch(() => ({}));
						setFetchError(errJson.message || "Ошибка при загрузке сметы.");
					}
					return;
				}

				const data: BudgetPortalData = await res.json();
				setBudget(data);
				if (data.patientFirstName && !signerName) {
					setSignerName(data.patientFirstName);
				}

				// Trigger idempotent view registration
				if (data.status === "pending") {
					fetch(`${apiBaseUrl}/api/portal/budget/${tok}/view`, {
						method: "POST",
					}).catch(() => {
						// non-blocking tracking
					});
				}
			} catch {
				setFetchError("Не удалось соединиться с сервером. Проверьте подключение.");
			} finally {
				setIsLoading(false);
			}
		},
		[apiBaseUrl, sessionToken, signerName],
	);

	useEffect(() => {
		if (activeToken) {
			fetchBudget(activeToken);
		} else {
			setIsLoading(false);
		}
	}, [activeToken, fetchBudget]);

	// Setup canvas resolution and coordinate scaling for touch signature pad & PEP stamp
	const setupCanvas = useCallback(() => {
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
			ctx.strokeStyle = "#0d9488";
			ctx.lineWidth = 2.5;
		}
	}, []);

	useEffect(() => {
		if (budget && budget.isVerified && budget.status !== "accepted") {
			setupCanvas();
			const handleResize = () => setupCanvas();
			window.addEventListener("resize", handleResize);
			return () => window.removeEventListener("resize", handleResize);
		}
	}, [budget, setupCanvas]);

	// Interactive touch / pointer signature handlers
	const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		const rect = canvas.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;
		ctx.beginPath();
		ctx.moveTo(x, y);
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
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;
		ctx.lineTo(x, y);
		ctx.stroke();
	};

	const stopDrawing = () => {
		setIsDrawing(false);
	};

	const clearCanvas = () => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
		ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
		setHasStrokes(false);
	};

	// Handle 2FA verification submit (0 disabled buttons — accessible validation)
	const handleVerifySubmit = async (e?: React.FormEvent) => {
		if (e) e.preventDefault();
		if (!activeToken) return;

		if (!verifyFactor.trim()) {
			setVerifyError(
				budget?.authMethod === "phone_last4"
					? "Пожалуйста, введите последние 4 цифры вашего номера телефона."
					: "Пожалуйста, укажите дату рождения в формате ДД.ММ.ГГГГ.",
			);
			return;
		}

		setIsVerifying(true);
		setVerifyError(null);

		try {
			const res = await fetch(`${apiBaseUrl}/api/portal/budget/${activeToken}/verify`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					method: budget?.authMethod || "phone_last4",
					value: verifyFactor.trim(),
					phone_last4: verifyFactor.trim(),
				}),
			});

			const data = await res.json();
			if (!res.ok || !data.success) {
				setVerifyError(data.message || "Неверный код подтверждения.");
				return;
			}

			if (data.sessionToken) {
				setSessionToken(data.sessionToken);
				await fetchBudget(activeToken, data.sessionToken);
			} else {
				await fetchBudget(activeToken);
			}
		} catch {
			setVerifyError("Ошибка сети при проверке кода.");
		} finally {
			setIsVerifying(false);
		}
	};

	// 1-Click PEP stamp generation for frictionless UX (Mandates 8e, 8k, 8n)
	const handleOneClickPep = useCallback(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
		const w = (canvas.width || 400 * dpr) / dpr;
		const h = (canvas.height || 140 * dpr) / dpr;

		ctx.clearRect(0, 0, w, h);

		// Draw border badge
		ctx.fillStyle = "rgba(13, 148, 136, 0.08)";
		ctx.fillRect(8, 8, w - 16, h - 16);
		ctx.strokeStyle = "#0d9488";
		ctx.lineWidth = 2;
		ctx.strokeRect(8, 8, w - 16, h - 16);

		// Draw official PEP text
		ctx.fillStyle = "#0f766e";
		ctx.font = "bold 14px -apple-system, BlinkMacSystemFont, sans-serif";
		ctx.textAlign = "center";
		ctx.fillText("ПОДПИСАНО В ПОРТАЛЕ ПАЦИЕНТА", w / 2, h / 2 - 16);

		ctx.fillStyle = "#115e59";
		ctx.font = "12px -apple-system, BlinkMacSystemFont, sans-serif";
		ctx.fillText("Электронная подпись • Подтверждено пациентом", w / 2, h / 2 + 6);

		const dateStr = new Date().toLocaleString("ru-RU");
		ctx.fillStyle = "#64748b";
		ctx.font = "12px -apple-system, BlinkMacSystemFont, sans-serif";
		ctx.fillText(`${signerName.trim() || budget?.patientFirstName || "Пациент"} • ${dateStr}`, w / 2, h / 2 + 24);

		setHasStrokes(true);
	}, [signerName, budget?.patientFirstName]);

	// Submit signed budget in 1-click via 63-FZ PEP with 152-FZ consent (Mandates 8e, 8k, 8n)
	const handleSignSubmit = async () => {
		if (!activeToken) return;

		if (!legalConsent152Fz) {
			setSignError("Необходимо подтвердить согласие на обработку персональных данных (152-ФЗ) и утверждение сметы.");
			return;
		}

		// If patient has not drawn on canvas, automatically render official 1-click PEP stamp
		if (!hasStrokes && canvasRef.current) {
			handleOneClickPep();
		}

		setIsSubmittingSign(true);
		setSignError(null);

		try {
			const signaturePng = canvasRef.current ? canvasRef.current.toDataURL("image/png") : "";

			const headers: Record<string, string> = {
				"Content-Type": "application/json",
			};
			if (sessionToken) {
				headers["Authorization"] = `Bearer ${sessionToken}`;
			}

			const res = await fetch(`${apiBaseUrl}/api/portal/budget/${activeToken}/sign`, {
				method: "POST",
				headers,
				body: JSON.stringify({
					signaturePng,
					signerName: signerName.trim() || budget?.patientFirstName || "Пациент",
				}),
			});

			const data = await res.json();
			if (!res.ok || !data.success) {
				setSignError(data.message || "Не удалось сохранить подпись сметы.");
				return;
			}

			// Update state to accepted
			setBudget((prev) =>
				prev
					? {
							...prev,
							status: "accepted",
							signedAt: data.signedAt || new Date().toISOString(),
							documentHash: data.documentHash || null,
							signerName: data.signerName || signerName,
						}
					: null,
			);

			onSuccess?.({
				signedAt: data.signedAt,
				documentHash: data.documentHash,
			});
		} catch {
			setSignError("Сетевая ошибка при отправке подписи.");
		} finally {
			setIsSubmittingSign(false);
		}
	};

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

	if (fetchError || !budget) {
		return (
			<div className={`patient-budget-container ${className}`}>
				<div className="patient-budget-card" style={{ textAlign: "center", padding: "2rem 1rem" }}>
					<AlertCircle size={40} style={{ margin: "0 auto 0.75rem", display: "block", color: "var(--bad-fg, var(--rust))" }} />
					<h3 style={{ fontSize: "1rem", fontWeight: 700, margin: "0 0 0.5rem", color: "var(--ink)" }}>
						Ошибка доступа
					</h3>
					<p style={{ fontSize: "0.875rem", color: "var(--muted)", margin: 0 }}>
						{fetchError || "Смета не найдена."}
					</p>
				</div>
			</div>
		);
	}

	const isAccepted = budget.status === "accepted";

	return (
		<div className={`patient-budget-container ${className}`}>
			{/* Header */}
			<div className="patient-budget-header">
				<div>
					<div className="patient-budget-clinic-title">
						{budget.clinicName || "Стоматологическая клиника"}
					</div>
					{budget.doctorName && (
						<div className="patient-budget-doctor-name">
							Врач: {budget.doctorName}
						</div>
					)}
				</div>

				<div>
					{isAccepted ? (
						<span className="patient-budget-status-chip accepted">
							<CheckCircle2 size={12} />
							Согласовано
						</span>
					) : (
						<span className="patient-budget-status-chip pending">
							<Clock size={12} />
							Ожидает подписи
						</span>
					)}
				</div>
			</div>

			{/* 2FA Verification Form if required and not verified */}
			{budget.requiresVerification && !budget.isVerified && (
				<div className="patient-budget-verify-box">
					<div className="patient-budget-card-title">
						<Lock size={16} />
						Подтверждение доступа
					</div>
					<p style={{ fontSize: "0.8125rem", color: "var(--muted)", margin: "0 0 0.5rem" }}>
						{budget.authMethod === "phone_last4"
							? "Для просмотра полного плана лечения введите последние 4 цифры вашего номера телефона:"
							: "Укажите дату рождения (ДД.ММ.ГГГГ):"}
					</p>
					<form onSubmit={handleVerifySubmit}>
						<div className="patient-budget-verify-input-group">
							<input
								type="text"
								className="patient-budget-verify-input"
								placeholder={budget.authMethod === "phone_last4" ? "••••" : "ДД.ММ.ГГГГ"}
								maxLength={budget.authMethod === "phone_last4" ? 4 : 10}
								inputMode={budget.authMethod === "phone_last4" ? "numeric" : "text"}
								value={verifyFactor}
								onChange={(e) => setVerifyFactor(e.target.value)}
								autoFocus
							/>
							<button
								type="submit"
								className="patient-budget-verify-btn"
								data-testid="patient-budget-verify-submit-btn"
							>
								<ShieldCheck size={16} />
								{isVerifying ? "Проверка..." : "Войти"}
							</button>
						</div>
					</form>
					{verifyError && (
						<div className="patient-budget-error-msg" data-testid="patient-budget-verify-error">
							<AlertCircle size={14} />
							{verifyError}
						</div>
					)}
				</div>
			)}

			{/* Service Items Table Card */}
			<div className="patient-budget-card">
				<div className="patient-budget-card-title">
					<FileText size={16} />
					План лечения и смета услуг
				</div>

				{budget.items.length === 0 ? (
					<p style={{ fontSize: "0.8125rem", color: "var(--muted)" }}>
						Список услуг уточняется.
					</p>
				) : (
					budget.items.map((item, idx) => (
						<div key={item.id || idx} className="patient-budget-item-row">
							<div className="patient-budget-item-info">
								{item.toothNumber && (
									<span className="patient-budget-tooth-badge">
										Зуб {item.toothNumber}
									</span>
								)}
								<span className="patient-budget-item-title">{item.title}</span>
								{item.quantity && item.quantity > 1 && (
									<span className="patient-budget-item-qty">{item.quantity} шт.</span>
								)}
							</div>
							<div className="patient-budget-item-price">
								{formatRub(item.priceRub * (item.quantity || 1))}
							</div>
						</div>
					))
				)}

				{/* Totals Summary */}
				<div className="patient-budget-totals">
					{budget.discountRub > 0 && (
						<>
							<div className="patient-budget-total-line">
								<span>Сумма по прайсу:</span>
								<span>{formatRub(budget.totalPriceRub)}</span>
							</div>
							<div className="patient-budget-total-line" style={{ color: "var(--teal)" }}>
								<span>Скидка клиники:</span>
								<span>-{formatRub(budget.discountRub)}</span>
							</div>
						</>
					)}
					<div className="patient-budget-grand-total">
						<span>Итого к оплате:</span>
						<span className="patient-budget-grand-price">{formatRub(budget.netTotalRub)}</span>
					</div>
				</div>
			</div>

			{/* Accepted Card (post-signing state) */}
			{isAccepted ? (
				<div className="patient-budget-accepted-card">
					<CheckCircle2 size={40} style={{ margin: "0 auto", color: "var(--teal)" }} />
					<div className="patient-budget-accepted-title">
						Смета успешно согласована
					</div>
					<p className="patient-budget-accepted-desc">
						План лечения утверждён пациентом:{" "}
						<strong>{budget.signerName || budget.patientFirstName || "Пациент"}</strong>
					</p>
					{budget.signedAt && (
						<p className="patient-budget-accepted-date">
							Дата и время: {formatIsoDateTime(budget.signedAt)}
						</p>
					)}
					{budget.documentHash && (
						<div className="patient-budget-hash-box">
							<strong>SHA-256 целостности документа:</strong>
							<br />
							{budget.documentHash}
						</div>
					)}
					<button
						type="button"
						className="patient-budget-print-btn"
						onClick={() => window.print()}
					>
						<Printer size={16} />
						Распечатать / Сохранить в PDF
					</button>
				</div>
			) : budget.isVerified ? (
				/* 63-FZ PEP Electronic Agreement Card with Interactive Touch Signature Pad */
				<div className="patient-budget-card" data-testid="patient-budget-sign-card">
					<div className="patient-budget-card-title">
						<ShieldCheck size={18} style={{ color: "var(--teal)" }} />
						Электронное согласование сметы онлайн
					</div>
					<p style={{ fontSize: "0.8125rem", color: "var(--muted)", margin: "0 0 0.75rem" }}>
						Распишитесь пальцем/стилусом или согласуйте в 1 клик с формированием электронной подписи:
					</p>

					{/* Interactive Touch / Mobile Canvas for Signature or 1-Click PEP Stamp */}
					<div className="patient-budget-signature-section">
						<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
							<span style={{ fontSize: "12px", fontWeight: 600, color: "var(--ink)" }}>
								Подпись пациента:
							</span>
							<div style={{ display: "flex", gap: "6px" }}>
								{hasStrokes && (
									<button
										type="button"
										onClick={clearCanvas}
										className="patient-budget-clear-btn"
										data-testid="patient-budget-clear-canvas-btn"
									>
										<RotateCcw size={12} />
										Очистить
									</button>
								)}
								<button
									type="button"
									onClick={handleOneClickPep}
									className="patient-budget-stamp-btn"
									data-testid="patient-budget-generate-pep-stamp-btn"
								>
									<Sparkles size={12} />
									Штамп ПЭП (1 клик)
								</button>
							</div>
						</div>

						<div className="patient-budget-canvas-wrapper">
							<canvas
								ref={canvasRef}
								className="patient-budget-canvas"
								data-testid="patient-budget-signature-canvas"
								onPointerDown={startDrawing}
								onPointerMove={draw}
								onPointerUp={stopDrawing}
								onPointerLeave={stopDrawing}
							/>
							{!hasStrokes && (
								<div className="patient-budget-canvas-placeholder">
									Распишитесь пальцем/стилусом в поле выше или нажмите «Согласовать в 1 клик»
								</div>
							)}
						</div>
					</div>

					<input
						type="text"
						className="patient-budget-signer-input"
						placeholder="ФИО подписанта (пациента)"
						value={signerName}
						onChange={(e) => setSignerName(e.target.value)}
						data-testid="patient-budget-signer-input"
					/>

					{/* 152-FZ Consent Checkbox */}
					<label className="patient-budget-consent-label" data-testid="patient-budget-152fz-consent-label">
						<input
							type="checkbox"
							checked={legalConsent152Fz}
							onChange={(e) => setLegalConsent152Fz(e.target.checked)}
							data-testid="patient-budget-152fz-checkbox"
							style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "var(--teal)" }}
						/>
						<span>
							Я подтверждаю согласие на обработку персональных данных в соответствии с 152-ФЗ и согласен с планом лечения и сметой (ПЭП 63-ФЗ)
						</span>
					</label>

					<div className="patient-budget-legal-text">
						В соответствии с Федеральным законом № 152-ФЗ «О персональных данных» и Федеральным законом № 63-ФЗ «Об электронной подписи» простая электронная подпись (ПЭП) признаётся равнозначной собственноручной подписи на бумажном носителе.
					</div>

					{signError && (
						<div className="patient-budget-error-msg" style={{ marginBottom: "0.75rem" }} data-testid="patient-budget-sign-error">
							<AlertCircle size={14} />
							{signError}
						</div>
					)}

					<button
						type="button"
						className="patient-budget-submit-btn"
						onClick={handleSignSubmit}
						data-testid="patient-budget-agree-oneclick-btn"
					>
						<ShieldCheck size={18} />
						{isSubmittingSign ? "Сохранение согласования..." : "Согласовать смету и план лечения в 1 клик"}
					</button>
				</div>
			) : null}
		</div>
	);
};

export default PatientBudgetSignView;
