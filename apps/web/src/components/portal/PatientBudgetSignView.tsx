/**
 * DENTE CRM — Patient Quote Review & Mobile Touch Digital Signature Portal View
 * (DOMAIN: PATIENT PORTAL QUOTE REVIEW & PEP SIGNATURE, MANDATES 8c, 8e, 8n, 8s)
 * Strict clinical style, 0 emojis, >=44px touch targets, Retina canvas support.
 */

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
	AlertCircle,
	CheckCircle2,
	Clock,
	FileText,
	Lock,
	PenTool,
	Printer,
	RotateCcw,
	ShieldCheck,
} from "lucide-react";
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
	authMethod: "phone_last4" | "dob" | "manual_code" | "none";
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
	return `${Math.round(value).toLocaleString("ru-RU")} \u20BD`;
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

	// Fetch budget details from backend
	const fetchBudget = useCallback(
		async (tok: string, sToken?: string) => {
			if (!tok) {
				setIsLoading(false);
				setFetchError("\u0422\u043e\u043a\u0435\u043d \u0441\u043c\u0435\u0442\u044b \u043d\u0435 \u0443\u043a\u0430\u0437\u0430\u043d \u0438\u043b\u0438 \u043d\u0435\u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0442\u0435\u043b\u0435\u043d.");
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
						setFetchError("\u0421\u043c\u0435\u0442\u0430 \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u0430 \u0438\u043b\u0438 \u0441\u0440\u043e\u043a \u0435\u0451 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044f \u0438\u0441\u0442\u0451\u043a.");
					} else {
						const errJson = await res.json().catch(() => ({}));
						setFetchError(errJson.message || "\u041e\u0448\u0438\u0431\u043a\u0430 \u043f\u0440\u0438 \u0437\u0430\u0433\u0440\u0443\u0437\u043a\u0435 \u0441\u043c\u0435\u0442\u044b.");
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
			} catch (err) {
				setFetchError("\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0441\u043e\u0435\u0434\u0438\u043d\u0438\u0442\u044c\u0441\u044f \u0441 \u0441\u0435\u0440\u0432\u0435\u0440\u043e\u043c. \u041f\u0440\u043e\u0432\u0435\u0440\u044c\u0442\u0435 \u043f\u043e\u0434\u043a\u043b\u044e\u0447\u0435\u043d\u0438\u0435.");
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

	// Setup canvas resolution and coordinate scaling for Retina displays
	const setupCanvas = useCallback(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const rect = canvas.getBoundingClientRect();
		const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

		canvas.width = rect.width * dpr;
		canvas.height = rect.height * dpr;

		const ctx = canvas.getContext("2d");
		if (ctx) {
			ctx.scale(dpr, dpr);
			ctx.lineCap = "round";
			ctx.lineJoin = "round";
			ctx.strokeStyle = "#0f172a";
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

	// Handle 2FA verification submit
	const handleVerifySubmit = async (e?: React.FormEvent) => {
		if (e) e.preventDefault();
		if (!activeToken || !verifyFactor.trim()) return;

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
				setVerifyError(data.message || "\u041d\u0435\u0432\u0435\u0440\u043d\u044b\u0439 \u043a\u043e\u0434 \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0438\u044f.");
				return;
			}

			if (data.sessionToken) {
				setSessionToken(data.sessionToken);
				await fetchBudget(activeToken, data.sessionToken);
			} else {
				await fetchBudget(activeToken);
			}
		} catch {
			setVerifyError("\u041e\u0448\u0438\u0431\u043a\u0430 \u0441\u0435\u0442\u0438 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0435 \u043a\u043e\u0434\u0430.");
		} finally {
			setIsVerifying(false);
		}
	};

	// Touch/Pointer drawing handlers for signature canvas
	const getCanvasCoordinates = (e: React.PointerEvent<HTMLCanvasElement>) => {
		const canvas = canvasRef.current;
		if (!canvas) return { x: 0, y: 0 };
		const rect = canvas.getBoundingClientRect();
		return {
			x: e.clientX - rect.left,
			y: e.clientY - rect.top,
		};
	};

	const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
		e.preventDefault();
		const canvas = canvasRef.current;
		if (!canvas) return;

		canvas.setPointerCapture(e.pointerId);
		const { x, y } = getCanvasCoordinates(e);
		const ctx = canvas.getContext("2d");
		if (ctx) {
			ctx.beginPath();
			ctx.moveTo(x, y);
		}
		setIsDrawing(true);
		setHasStrokes(true);
	};

	const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
		if (!isDrawing) return;
		e.preventDefault();
		const canvas = canvasRef.current;
		if (!canvas) return;

		const { x, y } = getCanvasCoordinates(e);
		const ctx = canvas.getContext("2d");
		if (ctx) {
			ctx.lineTo(x, y);
			ctx.stroke();
		}
	};

	const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
		if (!isDrawing) return;
		e.preventDefault();
		const canvas = canvasRef.current;
		if (canvas && canvas.hasPointerCapture(e.pointerId)) {
			canvas.releasePointerCapture(e.pointerId);
		}
		setIsDrawing(false);
	};

	const handleClearCanvas = () => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (ctx) {
			const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
			ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
		}
		setHasStrokes(false);
	};

	// 1-Click PEP stamp generation for frictionless UX (Mandates 8e, 8n)
	const handleOneClickPep = () => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
		const w = canvas.width / dpr;
		const h = canvas.height / dpr;

		ctx.clearRect(0, 0, w, h);

		// Draw border badge
		ctx.fillStyle = "#f8fafc";
		ctx.fillRect(8, 8, w - 16, h - 16);
		ctx.strokeStyle = "#059669";
		ctx.lineWidth = 2;
		ctx.strokeRect(8, 8, w - 16, h - 16);

		// Draw official PEP text
		ctx.fillStyle = "#047857";
		ctx.font = "bold 13px -apple-system, BlinkMacSystemFont, sans-serif";
		ctx.textAlign = "center";
		ctx.fillText("\u041f\u041e\u0414\u041f\u0418\u0421\u0410\u041d\u041e \u0412 \u041f\u041e\u0420\u0422\u0410\u041b\u0415 \u041f\u0410\u0426\u0418\u0415\u041d\u0422\u0410", w / 2, h / 2 - 14);

		ctx.fillStyle = "#065f46";
		ctx.font = "11px -apple-system, BlinkMacSystemFont, sans-serif";
		ctx.fillText("\u041f\u042d\u041f 63-\u0424\u0417 \u0441\u0442. 5 \u2022 \u041f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u043e \u043f\u0430\u0446\u0438\u0435\u043d\u0442\u043e\u043c", w / 2, h / 2 + 6);

		const dateStr = new Date().toLocaleString("ru-RU");
		ctx.fillStyle = "#64748b";
		ctx.font = "10px -apple-system, BlinkMacSystemFont, sans-serif";
		ctx.fillText(`${signerName || budget?.patientFirstName || "\u041f\u0430\u0446\u0438\u0435\u043d\u0442"} \u2022 ${dateStr}`, w / 2, h / 2 + 24);

		setHasStrokes(true);
	};

	// Submit signed budget
	const handleSignSubmit = async () => {
		if (!activeToken || !canvasRef.current || !hasStrokes) return;

		setIsSubmittingSign(true);
		setSignError(null);

		try {
			const signaturePng = canvasRef.current.toDataURL("image/png");

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
					signerName: signerName.trim() || budget?.patientFirstName || "\u041f\u0430\u0446\u0438\u0435\u043d\u0442",
				}),
			});

			const data = await res.json();
			if (!res.ok || !data.success) {
				setSignError(data.message || "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0441\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c \u043f\u043e\u0434\u043f\u0438\u0441\u044c \u0441\u043c\u0435\u0442\u044b.");
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
			setSignError("\u0421\u0435\u0442\u0435\u0432\u0430\u044f \u043e\u0448\u0438\u0431\u043a\u0430 \u043f\u0440\u0438 \u043e\u0442\u043f\u0440\u0430\u0432\u043a\u0435 \u043f\u043e\u0434\u043f\u0438\u0441\u0438.");
		} finally {
			setIsSubmittingSign(false);
		}
	};

	if (isLoading) {
		return (
			<div className={`patient-budget-container ${className}`}>
				<div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--muted, #64748b)" }}>
					<Clock size={32} style={{ margin: "0 auto 1rem", display: "block" }} />
					<p>\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430 \u0434\u0430\u043d\u043d\u044b\u0445 \u0441\u043c\u0435\u0442\u044b...</p>
				</div>
			</div>
		);
	}

	if (fetchError || !budget) {
		return (
			<div className={`patient-budget-container ${className}`}>
				<div className="patient-budget-card" style={{ textAlign: "center", padding: "2rem 1rem" }}>
					<AlertCircle size={40} color="#dc2626" style={{ margin: "0 auto 0.75rem", display: "block" }} />
					<h3 style={{ fontSize: "1rem", fontWeight: 700, margin: "0 0 0.5rem" }}>
						\u041e\u0448\u0438\u0431\u043a\u0430 \u0434\u043e\u0441\u0442\u0443\u043f\u0430
					</h3>
					<p style={{ fontSize: "0.875rem", color: "var(--muted, #64748b)", margin: 0 }}>
						{fetchError || "\u0421\u043c\u0435\u0442\u0430 \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u0430."}
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
						{budget.clinicName || "\u0421\u0442\u043e\u043c\u0430\u0442\u043e\u043b\u043e\u0433\u0438\u0447\u0435\u0441\u043a\u0430\u044f \u043a\u043b\u0438\u043d\u0438\u043a\u0430"}
					</div>
					{budget.doctorName && (
						<div className="patient-budget-doctor-name">
							\u0412\u0440\u0430\u0447: {budget.doctorName}
						</div>
					)}
				</div>

				<div>
					{isAccepted ? (
						<span className="patient-budget-status-chip accepted">
							<CheckCircle2 size={12} />
							\u0421\u043e\u0433\u043b\u0430\u0441\u043e\u0432\u0430\u043d\u043e
						</span>
					) : (
						<span className="patient-budget-status-chip pending">
							<Clock size={12} />
							\u041e\u0436\u0438\u0434\u0430\u0435\u0442 \u043f\u043e\u0434\u043f\u0438\u0441\u0438
						</span>
					)}
				</div>
			</div>

			{/* 2FA Verification Form if required and not verified */}
			{budget.requiresVerification && !budget.isVerified && (
				<div className="patient-budget-verify-box">
					<div className="patient-budget-card-title">
						<Lock size={16} />
						\u041f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0438\u0435 \u0434\u043e\u0441\u0442\u0443\u043f\u0430
					</div>
					<p style={{ fontSize: "0.8125rem", color: "#64748b", margin: "0 0 0.5rem" }}>
						{budget.authMethod === "phone_last4"
							? "\u0414\u043b\u044f \u043f\u0440\u043e\u0441\u043c\u043e\u0442\u0440\u0430 \u043f\u043e\u043b\u043d\u043e\u0433\u043e \u043f\u043b\u0430\u043d\u0430 \u043b\u0435\u0447\u0435\u043d\u0438\u044f \u0432\u0432\u0435\u0434\u0438\u0442\u0435 \u043f\u043e\u0441\u043b\u0435\u0434\u043d\u0438\u0435 4 \u0446\u0438\u0444\u0440\u044b \u0432\u0430\u0448\u0435\u0433\u043e \u043d\u043e\u043c\u0435\u0440\u0430 \u0442\u0435\u043b\u0435\u0444\u043e\u043d\u0430:"
							: "\u0423\u043a\u0430\u0436\u0438\u0442\u0435 \u0434\u0430\u0442\u0443 \u0440\u043e\u0436\u0434\u0435\u043d\u0438\u044f (\u0414\u0414.\u041c\u041c.\u0413\u0413\u0413\u0413):"}
					</p>
					<form onSubmit={handleVerifySubmit}>
						<div className="patient-budget-verify-input-group">
							<input
								type="text"
								className="patient-budget-verify-input"
								placeholder={budget.authMethod === "phone_last4" ? "\u2022\u2022\u2022\u2022" : "\u0414\u0414.\u041c\u041c.\u0413\u0413\u0413\u0413"}
								maxLength={budget.authMethod === "phone_last4" ? 4 : 10}
								inputMode={budget.authMethod === "phone_last4" ? "numeric" : "text"}
								value={verifyFactor}
								onChange={(e) => setVerifyFactor(e.target.value)}
								autoFocus
							/>
							<button
								type="submit"
								className="patient-budget-verify-btn"
								disabled={isVerifying || !verifyFactor.trim()}
							>
								<ShieldCheck size={16} />
								{isVerifying ? "..." : "\u0412\u043e\u0439\u0442\u0438"}
							</button>
						</div>
					</form>
					{verifyError && (
						<div className="patient-budget-error-msg">
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
					\u041f\u043b\u0430\u043d \u043b\u0435\u0447\u0435\u043d\u0438\u044f \u0438 \u0441\u043c\u0435\u0442\u0430 \u0443\u0441\u043b\u0443\u0433
				</div>

				{budget.items.length === 0 ? (
					<p style={{ fontSize: "0.8125rem", color: "var(--muted, #64748b)" }}>
						\u0421\u043f\u0438\u0441\u043e\u043a \u0443\u0441\u043b\u0443\u0433 \u0443\u0442\u043e\u0447\u043d\u044f\u0435\u0442\u0441\u044f.
					</p>
				) : (
					budget.items.map((item, idx) => (
						<div key={item.id || idx} className="patient-budget-item-row">
							<div className="patient-budget-item-info">
								{item.toothNumber && (
									<span className="patient-budget-tooth-badge">
										\u0417\u0443\u0431 {item.toothNumber}
									</span>
								)}
								<span className="patient-budget-item-title">{item.title}</span>
								{item.quantity && item.quantity > 1 && (
									<span className="patient-budget-item-qty">{item.quantity} \u0448\u0442.</span>
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
								<span>\u0421\u0443\u043c\u043c\u0430 \u043f\u043e \u043f\u0440\u0430\u0439\u0441\u0443:</span>
								<span>{formatRub(budget.totalPriceRub)}</span>
							</div>
							<div className="patient-budget-total-line" style={{ color: "#059669" }}>
								<span>\u0421\u043a\u0438\u0434\u043a\u0430 \u043a\u043b\u0438\u043d\u0438\u043a\u0438:</span>
								<span>-{formatRub(budget.discountRub)}</span>
							</div>
						</>
					)}
					<div className="patient-budget-grand-total">
						<span>\u0418\u0442\u043e\u0433\u043e \u043a \u043e\u043f\u043b\u0430\u0442\u0435:</span>
						<span className="patient-budget-grand-price">{formatRub(budget.netTotalRub)}</span>
					</div>
				</div>
			</div>

			{/* Accepted Card (post-signing state) */}
			{isAccepted ? (
				<div className="patient-budget-accepted-card">
					<CheckCircle2 size={40} color="#166534" style={{ margin: "0 auto" }} />
					<div className="patient-budget-accepted-title">
						\u0421\u043c\u0435\u0442\u0430 \u0443\u0441\u043f\u0435\u0448\u043d\u043e \u0441\u043e\u0433\u043b\u0430\u0441\u043e\u0432\u0430\u043d\u0430
					</div>
					<p style={{ fontSize: "0.8125rem", color: "#166534", margin: "0 0 0.5rem" }}>
						\u041f\u043b\u0430\u043d \u043b\u0435\u0447\u0435\u043d\u0438\u044f \u0443\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043d \u043f\u0430\u0446\u0438\u0435\u043d\u0442\u043e\u043c:{" "}
						<strong>{budget.signerName || budget.patientFirstName || "\u041f\u0430\u0446\u0438\u0435\u043d\u0442"}</strong>
					</p>
					{budget.signedAt && (
						<p style={{ fontSize: "0.75rem", color: "#15803d", margin: "0 0 0.5rem" }}>
							\u0414\u0430\u0442\u0430 \u0438 \u0432\u0440\u0435\u043c\u044f: {formatIsoDateTime(budget.signedAt)}
						</p>
					)}
					{budget.documentHash && (
						<div className="patient-budget-hash-box">
							<strong>SHA-256 \u0446\u0435\u043b\u043e\u0441\u0442\u043d\u043e\u0441\u0442\u0438:</strong>
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
						\u0420\u0430\u0441\u043f\u0435\u0447\u0430\u0442\u0430\u0442\u044c / \u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c \u0432 PDF
					</button>
				</div>
			) : budget.isVerified ? (
				/* Signature Pad Card */
				<div className="patient-budget-card">
					<div className="patient-budget-card-title">
						<PenTool size={16} />
						\u042d\u043b\u0435\u043a\u0442\u0440\u043e\u043d\u043d\u0430\u044f \u043f\u043e\u0434\u043f\u0438\u0441\u044c \u043f\u0430\u0446\u0438\u0435\u043d\u0442\u0430
					</div>
					<p style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)", margin: "0 0 0.5rem" }}>
						\u0420\u0430\u0441\u043f\u0438\u0448\u0438\u0442\u0435\u0441\u044c \u043f\u0430\u043b\u044c\u0446\u0435\u043c \u0438\u043b\u0438 \u0441\u0442\u0438\u043b\u0443\u0441\u043e\u043c \u0432 \u043f\u043e\u043b\u0435 \u043d\u0438\u0436\u0435:
					</p>

					<div className="patient-budget-canvas-wrap">
						<canvas
							ref={canvasRef}
							className="patient-budget-canvas"
							onPointerDown={handlePointerDown}
							onPointerMove={handlePointerMove}
							onPointerUp={handlePointerUp}
							onPointerCancel={handlePointerUp}
						/>
						{!hasStrokes && (
							<div className="patient-budget-canvas-guide">
								<span className="patient-budget-canvas-guide-text">
									\u041c\u0435\u0441\u0442\u043e \u0434\u043b\u044f \u0432\u0430\u0448\u0435\u0439 \u0440\u043e\u0441\u043f\u0438\u0441\u0438
								</span>
							</div>
						)}
					</div>

					<div className="patient-budget-canvas-toolbar">
						<button
							type="button"
							className="patient-budget-clear-btn"
							onClick={handleClearCanvas}
						>
							<RotateCcw size={14} />
							\u041e\u0447\u0438\u0441\u0442\u0438\u0442\u044c
						</button>

						<button
							type="button"
							className="patient-budget-clear-btn"
							style={{ color: "#059669", borderColor: "#059669" }}
							onClick={handleOneClickPep}
							title="\u041f\u043e\u0441\u0442\u0430\u0432\u0438\u0442\u044c \u043f\u0435\u0447\u0430\u0442\u044c \u041f\u042d\u041f \u0432 1 \u043a\u043b\u0438\u043a"
						>
							<ShieldCheck size={14} />
							1-\u043a\u043b\u0438\u043a \u041f\u042d\u041f
						</button>
					</div>

					<input
						type="text"
						className="patient-budget-signer-input"
						placeholder="\u0424\u0418\u041e \u043f\u043e\u0434\u043f\u0438\u0441\u0430\u043d\u0442\u0430 (\u043f\u0430\u0446\u0438\u0435\u043d\u0442\u0430)"
						value={signerName}
						onChange={(e) => setSignerName(e.target.value)}
					/>

					<div className="patient-budget-legal-text">
						\u041d\u0430\u0441\u0442\u043e\u044f\u0449\u0438\u043c \u044f \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0430\u044e \u0441\u043e\u0433\u043b\u0430\u0441\u0438\u0435 \u0441 \u043f\u0440\u0435\u0434\u043b\u043e\u0436\u0435\u043d\u043d\u044b\u043c \u043f\u043b\u0430\u043d\u043e\u043c \u043b\u0435\u0447\u0435\u043d\u0438\u044f \u0438 \u0435\u0433\u043e \u0441\u0442\u043e\u0438\u043c\u043e\u0441\u0442\u044c\u044e. \u0412 \u0441\u043e\u043e\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0438\u0438 \u0441 \u0424\u0417 \u211663-\u0424\u0417 «\u041e\u0431 \u044d\u043b\u0435\u043a\u0442\u0440\u043e\u043d\u043d\u043e\u0439 \u043f\u043e\u0434\u043f\u0438\u0441\u0438» \u043f\u0440\u043e\u0441\u0442\u0430\u044f \u044d\u043b\u0435\u043a\u0442\u0440\u043e\u043d\u043d\u0430\u044f \u043f\u043e\u0434\u043f\u0438\u0441\u044c (\u041f\u042d\u041f) \u043f\u0440\u0438\u0437\u043d\u0430\u0451\u0442\u0441\u044f \u0440\u0430\u0432\u043d\u043e\u0437\u043d\u0430\u0447\u043d\u043e\u0439 \u0441\u043e\u0431\u0441\u0442\u0432\u0435\u043d\u043d\u043e\u0440\u0443\u0447\u043d\u043e\u0439 \u043f\u043e\u0434\u043f\u0438\u0441\u0438.
					</div>

					{signError && (
						<div className="patient-budget-error-msg" style={{ marginBottom: "0.75rem" }}>
							<AlertCircle size={14} />
							{signError}
						</div>
					)}

					<button
						type="button"
						className="patient-budget-submit-btn"
						disabled={isSubmittingSign || !hasStrokes}
						onClick={handleSignSubmit}
					>
						<CheckCircle2 size={18} />
						{isSubmittingSign ? "\u0421\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u0438\u0435 \u043f\u043e\u0434\u043f\u0438\u0441\u0438..." : "\u0421\u043e\u0433\u043b\u0430\u0441\u043e\u0432\u0430\u0442\u044c \u043f\u043b\u0430\u043d \u043b\u0435\u0447\u0435\u043d\u0438\u044f"}
					</button>
				</div>
			) : null}
		</div>
	);
};

export default PatientBudgetSignView;
