import * as React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	AlertCircle,
	CheckCircle2,
	Clock,
	FileCheck,
	FileText,
	Lock,
	Phone,
	Printer,
	RotateCcw,
	ShieldAlert,
	ShieldCheck,
	Sparkles,
} from "lucide-react";

export interface BudgetItem {
	id?: string; title: string; toothNumber?: number | null; quantity?: number;
	priceRub: number; discountRub?: number; totalRub?: number;
}

export interface BudgetData {
	token: string; planId?: string | null; status: "sent" | "viewed" | "accepted" | "rejected";
	clinicName?: string; clinicPhone?: string | null; clinicAddress?: string | null; doctorName?: string | null;
	patientFirstName?: string | null; maskedPhone?: string | null; totalPriceRub?: number; discountRub?: number;
	netTotalRub?: number; currency?: string; items?: BudgetItem[]; requiresVerification: boolean; isVerified: boolean;
	authMethod?: string; failedAttempts?: number; isLocked?: boolean; lockedUntil?: string | null;
	signedAt?: string | null; signerName?: string | null; documentHash?: string | null;
}

export interface PublicBudgetSignPageProps {
	token?: string;
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

const PROCEDURE_TITLE_MAP: Record<string, string> = {
	price_caries_16: "Лечение глубокого кариеса (зуб 16)",
	price_endo_36: "Эндодонтическое лечение (зуб 36)",
	price_hygiene: "Комплексная гигиена полости рта",
	price_implant_straumann: "Установка дентального имплантата Straumann",
	price_crown_zirconia: "Коронка из диоксида циркония на имплантате",
	price_consultation: "Первичный консультационный приём",
};

export function formatProcedureTitle(rawTitle: string): string {
	if (!rawTitle) return "Стоматологическая процедура";
	if (PROCEDURE_TITLE_MAP[rawTitle]) {
		return PROCEDURE_TITLE_MAP[rawTitle];
	}
	if (rawTitle.startsWith("price_") || rawTitle.startsWith("srv_")) {
		const clean = rawTitle
			.replace(/^(price_|srv_)/, "")
			.replace(/_/g, " ");
		return clean.charAt(0).toUpperCase() + clean.slice(1);
	}
	return rawTitle;
}

export const PublicBudgetSignPage: React.FC<PublicBudgetSignPageProps> = ({
	token: propToken,
}) => {
	// 1. Resolve token from props or URL
	const [token, setToken] = useState<string>(() => {
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

	const [budget, setBudget] = useState<BudgetData | null>(null);
	const [sessionToken, setSessionToken] = useState<string>("");
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const [loadError, setLoadError] = useState<string | null>(null);

	// 2FA Phone digits state
	const [phoneDigits, setPhoneDigits] = useState<string>("");
	const [isVerifying, setIsVerifying] = useState<boolean>(false);
	const [verifyError, setVerifyError] = useState<string | null>(null);

	// Canvas Signature state
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const [isDrawing, setIsDrawing] = useState<boolean>(false);
	const [hasStrokes, setHasStrokes] = useState<boolean>(false);
	const [signerName, setSignerName] = useState<string>("");
	const [isSubmittingSign, setIsSubmittingSign] = useState<boolean>(false);
	const [signError, setSignError] = useState<string | null>(null);
	const [agreedToTerms, setAgreedToTerms] = useState<boolean>(true);

	const fetchBudget = useCallback(
		async (targetToken: string, sToken?: string) => {
			if (!targetToken) {
				setIsLoading(false);
				setLoadError("Токен сметы не указан.");
				return;
			}

			try {
				setIsLoading(true);
				setLoadError(null);

				const headers: Record<string, string> = {};
				const currentSession = sToken || sessionToken;
				if (currentSession) {
					headers["Authorization"] = `Bearer ${currentSession}`;
				}

				// Try /api/v1/public/budgets/:token first, fall back to /api/portal/budget/:token
				let res = await fetch(`/api/v1/public/budgets/${targetToken}`, {
					method: "GET",
					headers,
				});

				if (!res.ok && res.status === 404) {
					res = await fetch(`/api/portal/budget/${targetToken}`, {
						method: "GET",
						headers,
					});
				}

				if (!res.ok) {
					if (res.status === 404) {
						setLoadError("Смета не найдена или срок действия ссылки истёк.");
					} else {
						const errJson = await res.json().catch(() => ({}));
						setLoadError(errJson.message || "Ошибка загрузки сметы.");
					}
					return;
				}

				const data: BudgetData = await res.json();
				setBudget(data);
				if (data.patientFirstName && !signerName) {
					setSignerName(data.patientFirstName);
				}
			} catch {
				setLoadError("Не удалось подключиться к серверу клиники. Проверьте интернет-соединение.");
			} finally {
				setIsLoading(false);
			}
		},
		[sessionToken, signerName],
	);

	useEffect(() => {
		if (token) {
			fetchBudget(token);
		} else {
			setIsLoading(false);
		}
	}, [token, fetchBudget]);

	// Setup Retina canvas resolution
	const setupCanvas = useCallback(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const rect = canvas.getBoundingClientRect();
		const effectiveWidth = rect.width > 0 ? rect.width : 360;
		const effectiveHeight = rect.height > 0 ? rect.height : 150;
		const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

		canvas.width = effectiveWidth * dpr;
		canvas.height = effectiveHeight * dpr;

		const ctx = canvas.getContext("2d");
		if (ctx) {
			ctx.scale(dpr, dpr);
			ctx.lineCap = "round";
			ctx.lineJoin = "round";
			ctx.lineWidth = 2.5;
			const isDark =
				document.documentElement.classList.contains("dark") ||
				(typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches);
			ctx.strokeStyle = isDark ? "#38bdf8" : "#0f172a"; // Crisp neon cyan in dark mode, deep clinical dark navy ink in light mode
		}
	}, []);

	useEffect(() => {
		if (budget?.isVerified && budget?.status !== "accepted") {
			const timer = setTimeout(setupCanvas, 100);
			return () => clearTimeout(timer);
		}
	}, [budget?.isVerified, budget?.status, setupCanvas]);

	// Canvas drawing handlers (mouse & touch)
	const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent) => {
		const canvas = canvasRef.current;
		if (!canvas) return { x: 0, y: 0 };
		const rect = canvas.getBoundingClientRect();

		if ("touches" in e) {
			const touch = e.touches[0];
			if (!touch) return { x: 0, y: 0 };
			return {
				x: touch.clientX - rect.left,
				y: touch.clientY - rect.top,
			};
		}
		return {
			x: e.clientX - rect.left,
			y: e.clientY - rect.top,
		};
	};

	const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
		if ("touches" in e) {
			e.preventDefault();
		}
		const { x, y } = getCanvasCoords(e);
		const ctx = canvasRef.current?.getContext("2d");
		if (!ctx) return;

		ctx.beginPath();
		ctx.moveTo(x, y);
		setIsDrawing(true);
		setHasStrokes(true);
		setSignError(null);
	};

	const draw = (e: React.MouseEvent | React.TouchEvent) => {
		if (!isDrawing) return;
		if ("touches" in e) {
			e.preventDefault();
		}
		const { x, y } = getCanvasCoords(e);
		const ctx = canvasRef.current?.getContext("2d");
		if (!ctx) return;

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
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		setupCanvas();
		setHasStrokes(false);
		setSignError(null);
	};

	// Verification submission
	const handleVerifySubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!token) return;

		const digits = phoneDigits.replace(/\D/g, "");
		if (digits.length !== 4) {
			setVerifyError("Введите ровно 4 последние цифры номера телефона.");
			return;
		}

		setIsVerifying(true);
		setVerifyError(null);

		try {
			let res = await fetch(`/api/v1/public/budgets/${token}/verify`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ phoneDigits: digits }),
			});

			if (!res.ok && res.status === 404) {
				res = await fetch(`/api/portal/budget/${token}/verify`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ phone_last4: digits, method: "phone_last4" }),
				});
			}

			const data = await res.json().catch(() => ({}));

			if (!res.ok) {
				if (res.status === 429) {
					setVerifyError(
						"Превышено число попыток ввода (максимум 3). Доступ временно заблокирован на 15 минут.",
					);
				} else {
					setVerifyError(data.message || "Неверные цифры номера телефона.");
				}
				return;
			}

			if (data.sessionToken) {
				setSessionToken(data.sessionToken);
				await fetchBudget(token, data.sessionToken);
			}
		} catch {
			setVerifyError("Сетевая ошибка при проверке. Пожалуйста, попробуйте снова.");
		} finally {
			setIsVerifying(false);
		}
	};

	// Digital signature submission
	const handleSignSubmit = async () => {
		if (!token) return;
		if (!hasStrokes || !canvasRef.current) {
			setSignError("Пожалуйста, распишитесь в поле выше пальцем или стилусом.");
			return;
		}

		if (!signerName.trim()) {
			setSignError("Пожалуйста, укажите имя или фамилию подписывающего лица.");
			return;
		}

		if (!agreedToTerms) {
			setSignError("Необходимо подтвердить ознакомление с планом лечения и сметой.");
			return;
		}

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

			let res = await fetch(`/api/v1/public/budgets/${token}/sign`, {
				method: "POST",
				headers,
				body: JSON.stringify({
					signaturePng,
					signerName: signerName.trim(),
				}),
			});

			if (!res.ok && res.status === 404) {
				res = await fetch(`/api/portal/budget/${token}/sign`, {
					method: "POST",
					headers,
					body: JSON.stringify({
						signaturePng,
						signerName: signerName.trim(),
					}),
				});
			}

			const data = await res.json().catch(() => ({}));

			if (!res.ok) {
				setSignError(data.message || "Ошибка при сохранении цифровой подписи.");
				return;
			}

			// Refresh budget state to accepted
			await fetchBudget(token, sessionToken);
		} catch {
			setSignError("Не удалось отправить цифровую подпись. Проверьте соединение.");
		} finally {
			setIsSubmittingSign(false);
		}
	};

	// Loading state
	if (isLoading) {
		return (
			<div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex items-center justify-center p-4">
				<div className="flex flex-col items-center gap-3">
					<div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
					<p className="text-sm font-medium text-slate-500 dark:text-slate-400">Загрузка сметы лечения...</p>
				</div>
			</div>
		);
	}

	// Error state
	if (loadError || !budget) {
		return (
			<div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex items-center justify-center p-4">
				<div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center space-y-4 shadow-xl">
					<div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 dark:text-rose-400 flex items-center justify-center mx-auto">
						<AlertCircle className="w-6 h-6" />
					</div>
					<h1 className="text-lg font-semibold text-slate-900 dark:text-white">Не удалось открыть смету</h1>
					<p className="text-sm text-slate-500 dark:text-slate-400">{loadError || "Ссылка недействительна или устарела."}</p>
					<div className="pt-2">
						<p className="text-xs text-slate-400 dark:text-slate-500">
							Пожалуйста, свяжитесь с клиникой для получения актуальной ссылки.
						</p>
					</div>
				</div>
			</div>
		);
	}

	const isAccepted = budget.status === "accepted";

	return (
		<div className="public-budget-print-container min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between py-6 px-4 sm:px-6">
			<style>{`
				@media print {
					@page {
						size: A4 portrait;
						margin: 12mm 10mm;
					}
					body, html {
						background: #ffffff !important;
						color: #000000 !important;
					}
					.no-print, .drag-handle, button, a[href^="tel:"], footer {
						display: none !important;
					}
					.public-budget-print-container {
						background: #ffffff !important;
						color: #000000 !important;
						padding: 0 !important;
					}
					.public-budget-print-card {
						background: #ffffff !important;
						color: #000000 !important;
						box-shadow: none !important;
						border: 1px solid #94a3b8 !important;
						page-break-inside: avoid !important;
						break-inside: avoid !important;
					}
					* {
						-webkit-print-color-adjust: exact !important;
						print-color-adjust: exact !important;
					}
				}
			`}</style>
			<div className="max-w-lg w-full mx-auto space-y-6">
				{/* Top Clinic Header */}
				<header className="public-budget-print-card bg-white/90 dark:bg-slate-900/80 backdrop-blur border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 shadow-lg flex items-center justify-between">
					<div>
						<div className="flex items-center gap-2">
							<span className="w-2.5 h-2.5 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
							<h1 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
								{budget.clinicName || "Стоматологическая клиника ДЕНТЕ"}
							</h1>
						</div>
						{budget.clinicAddress && (
							<p className="text-xs text-slate-500 dark:text-slate-300 mt-0.5">{budget.clinicAddress}</p>
						)}
					</div>
					{budget.clinicPhone && (
						<a
							href={`tel:${budget.clinicPhone}`}
							className="no-print flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-cyan-700 dark:text-cyan-300 text-xs font-medium transition min-h-[44px]"
						>
							<Phone className="w-3.5 h-3.5" />
							<span>{budget.clinicPhone}</span>
						</a>
					)}
				</header>

				{/* STAGE 1: Phone Verification Required (ZERO DATA LEAKS) */}
				{!budget.isVerified && !isAccepted && (
					<div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
						{/* Apple HIG Tactile Drag Handle */}
						<div className="drag-handle w-9 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto -mt-2 mb-2" data-testid="sheet-drag-handle" aria-hidden="true" />

						<div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mx-auto">
							<ShieldCheck className="w-6 h-6" />
						</div>

						<div className="text-center space-y-1">
							<h2 className="text-base font-semibold text-slate-900 dark:text-white">Подтверждение личности пациента</h2>
							<p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">В целях защиты врачебной тайны (323-ФЗ ст. 13) смета защищена подтверждением номера телефона.</p>
						</div>

						{budget.maskedPhone && (
							<div className="p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl text-center">
								<span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Номер пациента:</span>
								<span className="text-sm font-mono font-medium text-cyan-700 dark:text-cyan-300 tracking-wider">{budget.maskedPhone}</span>
							</div>
						)}

						{verifyError && (
							<div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-600 dark:text-rose-300 flex items-start gap-2">
								<AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
								<span>{verifyError}</span>
							</div>
						)}

						{budget.isLocked ? (
							<div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-center space-y-2">
								<Lock className="w-6 h-6 text-amber-500 dark:text-amber-400 mx-auto" />
								<p className="text-xs text-amber-700 dark:text-amber-300 font-medium">
									Ввод временно заблокирован на 15 минут из-за превышения 3 попыток.
								</p>
							</div>
						) : (
							<form onSubmit={handleVerifySubmit} className="space-y-4">
								<div className="space-y-1.5 text-center">
									<label htmlFor="phoneDigitsInput" className="text-xs font-medium text-slate-700 dark:text-slate-300 block">
										Введите последние 4 цифры вашего телефона:
									</label>
									<input
										id="phoneDigitsInput"
										type="text"
										inputMode="numeric"
										pattern="[0-9]*"
										maxLength={4}
										value={phoneDigits}
										onChange={(e) => setPhoneDigits(e.target.value.replace(/\D/g, "").slice(0, 4))}
										placeholder="••••"
										autoFocus
										className="w-40 mx-auto text-center font-mono text-2xl tracking-[0.5em] py-2.5 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl text-slate-900 dark:text-white outline-none transition"
									/>
								</div>

								<button
									type="submit"
									disabled={isVerifying || phoneDigits.length !== 4}
									className="w-full min-h-[48px] py-3 px-4 rounded-xl font-medium text-sm bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-lg shadow-cyan-600/20 transition flex items-center justify-center gap-2"
								>
									{isVerifying ? (
										<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
									) : (
										<>
											<span>Открыть смету</span>
											<FileText className="w-4 h-4" />
										</>
									)}
								</button>
							</form>
						)}
					</div>
				)}

				{/* STAGE 2: Verified Service Breakdown & Signature Pad */}
				{budget.isVerified && !isAccepted && (
					<div className="space-y-6">
						{/* Apple HIG Tactile Drag Handle */}
						<div className="drag-handle w-9 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto -mb-2" data-testid="sheet-drag-handle" aria-hidden="true" />
						{/* Doctor & Patient Info */}
						<div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-lg flex items-center justify-between text-xs">
							<div>
								<span className="text-slate-500 dark:text-slate-400 block">Пациент:</span>
								<span className="font-semibold text-slate-900 dark:text-slate-200 text-sm">
									{budget.patientFirstName || "Пациент"}
								</span>
							</div>
							{budget.doctorName && (
								<div className="text-right">
									<span className="text-slate-500 dark:text-slate-400 block">Лечащий врач:</span>
									<span className="font-medium text-slate-900 dark:text-slate-200">{budget.doctorName}</span>
								</div>
							)}
						</div>

						{/* Items list */}
						<div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
							<div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
								<h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
									<FileCheck className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
									<span>План лечения и смета</span>
								</h2>
								<span className="text-xs text-slate-500 dark:text-slate-400">
									Позиций: {budget.items?.length || 0}
								</span>
							</div>

							<div className="space-y-3 divide-y divide-slate-100 dark:divide-slate-800/60">
								{budget.items && budget.items.length > 0 ? (
									budget.items.map((it, idx) => (
										<div key={it.id || idx} className="pt-2.5 first:pt-0 flex items-start justify-between gap-3">
											<div className="space-y-1">
												<div className="flex items-center gap-2">
													{it.toothNumber ? (
														<span className="px-1.5 py-0.5 rounded bg-cyan-50 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 font-mono text-[11px] font-medium border border-cyan-200 dark:border-cyan-800/60">Зуб {it.toothNumber}</span>
													) : (
														<span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[11px]">Комплекс</span>
													)}
													<span className="text-xs font-medium text-slate-800 dark:text-slate-200">{formatProcedureTitle(it.title)}</span>
												</div>
												<span className="text-[11px] text-slate-500 block">Кол-во: {it.quantity || 1} шт.</span>
											</div>
											<div className="text-right shrink-0">
												<span className="text-xs font-semibold text-slate-900 dark:text-slate-100 block">{formatRub(it.priceRub * (it.quantity || 1))}</span>
												{Boolean(it.discountRub) && (
													<span className="text-[10px] text-emerald-600 dark:text-emerald-400 block">- {formatRub(it.discountRub || 0)}</span>
												)}
											</div>
										</div>
									))
								) : (
									<p className="text-xs text-slate-500 dark:text-slate-400 py-2">Состав процедур уточняется врачом.</p>
								)}
							</div>

							{/* Financial Totals */}
							<div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
								<div className="flex justify-between text-slate-600 dark:text-slate-400">
									<span>Сумма по прайсу:</span>
									<span className="font-medium text-slate-900 dark:text-slate-200">{formatRub(budget.totalPriceRub || 0)}</span>
								</div>
								{Boolean(budget.discountRub) && (
									<div className="flex justify-between text-emerald-600 dark:text-emerald-400">
										<span>Скидка клиники:</span>
										<span>- {formatRub(budget.discountRub || 0)}</span>
									</div>
								)}
								<div className="flex justify-between items-baseline pt-2 border-t border-slate-200 dark:border-slate-800 font-semibold text-sm text-slate-900 dark:text-white">
									<span>Итого к оплате:</span>
									<span className="text-base text-cyan-600 dark:text-cyan-400 font-bold font-mono">
										{formatRub(budget.netTotalRub || budget.totalPriceRub || 0)}
									</span>
								</div>
							</div>
						</div>

						{/* Signature Pad Section */}
						<div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
							<div className="flex items-center justify-between gap-3">
								<label className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-1.5 min-w-0">
									<Sparkles className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
									<span className="truncate">Подпись пациента (ПЭП)</span>
								</label>
								<button
									type="button"
									onClick={clearCanvas}
									className="text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 flex items-center gap-1 py-1 px-2.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition min-h-[36px] shrink-0"
								>
									<RotateCcw className="w-3.5 h-3.5" />
									<span>Очистить</span>
								</button>
							</div>

							<div className="relative bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl overflow-hidden touch-none h-[150px]">
								<canvas
									ref={canvasRef}
									onMouseDown={startDrawing}
									onMouseMove={draw}
									onMouseUp={stopDrawing}
									onMouseLeave={stopDrawing}
									onTouchStart={startDrawing}
									onTouchMove={draw}
									onTouchEnd={stopDrawing}
									className="w-full h-full cursor-crosshair block"
								/>
								{!hasStrokes && (
									<div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 dark:text-slate-600 text-xs font-medium">
										Распишитесь пальцем или стилусом здесь
									</div>
								)}
							</div>

							{/* Signer full name */}
							<div className="space-y-1">
								<label htmlFor="signerNameInput" className="text-xs text-slate-600 dark:text-slate-400 block">
									ФИО подписывающего лица:
								</label>
								<input
									id="signerNameInput"
									type="text"
									value={signerName}
									onChange={(e) => setSignerName(e.target.value)}
									placeholder="Иванов И.И."
									className="w-full text-xs py-2 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white outline-none focus:border-cyan-500 transition"
								/>
							</div>

							{/* Consent checkbox */}
							<label className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer select-none">
								<input
									type="checkbox"
									checked={agreedToTerms}
									onChange={(e) => setAgreedToTerms(e.target.checked)}
									className="mt-0.5 rounded border-slate-300 dark:border-slate-700 text-cyan-600 focus:ring-0 bg-white dark:bg-slate-950"
								/>
								<span>
									Я подтверждаю согласие с предложенным планом лечения и стоимостью (ст. 20 323-ФЗ и ПП РФ №659).
								</span>
							</label>

							{signError && (
								<div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-600 dark:text-rose-300 flex items-start gap-2">
									<AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
									<span>{signError}</span>
								</div>
							)}

							{/* Primary CTA (Natural Thumb Zone) */}
							<button
								type="button"
								onClick={handleSignSubmit}
								disabled={isSubmittingSign || !hasStrokes}
								className="w-full min-h-[50px] py-3.5 px-4 rounded-xl font-medium text-sm bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-lg shadow-cyan-600/20 transition flex items-center justify-center gap-2"
							>
								{isSubmittingSign ? (
									<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
								) : (
									<>
										<CheckCircle2 className="w-4 h-4" />
										<span>Подписать и согласовать смету</span>
									</>
								)}
							</button>
						</div>
					</div>
				)}

				{/* STAGE 3: Success Confirmation (Accepted) */}
				{isAccepted && (
					<div className="public-budget-print-card bg-white dark:bg-slate-900 border border-emerald-500/30 rounded-2xl p-6 shadow-2xl text-center space-y-5">
						<div className="w-16 h-16 rounded-3xl bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
							<CheckCircle2 className="w-8 h-8" />
						</div>

						<div className="space-y-1">
							<h2 className="text-lg font-bold text-slate-900 dark:text-white">Смета успешно согласована</h2>
							<p className="text-xs text-slate-500 dark:text-slate-400">
								Цифровая подпись принята и внесена в электронную медицинскую карту.
							</p>
						</div>

						<div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-xs space-y-2 text-left">
							<div className="flex justify-between text-slate-500 dark:text-slate-400">
								<span>Дата подписания:</span>
								<span className="text-slate-800 dark:text-slate-200 font-medium font-mono">{formatIsoDateTime(budget.signedAt)}</span>
							</div>
							<div className="flex justify-between text-slate-500 dark:text-slate-400">
								<span>Подписант:</span>
								<span className="text-slate-800 dark:text-slate-200 font-medium">{budget.signerName || "Пациент"}</span>
							</div>
							<div className="flex justify-between text-slate-500 dark:text-slate-400">
								<span>Согласованная сумма:</span>
								<span className="text-cyan-600 dark:text-cyan-400 font-semibold font-mono">{formatRub(budget.netTotalRub || budget.totalPriceRub || 0)}</span>
							</div>
							{budget.documentHash && (
								<div className="pt-2 border-t border-slate-200 dark:border-slate-900 text-[10px] text-slate-400 dark:text-slate-500 break-all font-mono">
									Хеш документа: {budget.documentHash}
								</div>
							)}
						</div>

						<div className="pt-2 flex flex-col gap-2 no-print">
							<button
								type="button"
								onClick={() => window.print()}
								className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-medium transition flex items-center justify-center gap-2"
							>
								<Printer className="w-4 h-4" />
								<span>Сохранить копию / Распечатать</span>
							</button>
						</div>
					</div>
				)}
			</div>

			{/* Footer disclaimer */}
			<footer className="no-print mt-8 text-center text-[11px] text-slate-600 max-w-sm mx-auto">
				Защищённый контур ДЕНТЕ CRM. Сертификация по 152-ФЗ и 323-ФЗ ст. 13.
			</footer>
		</div>
	);
};

export default PublicBudgetSignPage;
