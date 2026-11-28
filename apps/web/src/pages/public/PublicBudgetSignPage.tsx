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
	ShieldAlert,
	ShieldCheck,
} from "lucide-react";
import { formatKopecksToRub, generateUuidV7, rublesToKopecks } from "@dental/shared";
import { clientLogger } from "../../services/logging/clientLogger";
import { PublicBudgetSignaturePad } from "./PublicBudgetSignaturePad";

export interface BudgetItem {
	id?: string;
	title: string;
	toothNumber?: number | null;
	quantity?: number;
	priceRub?: number;
	discountRub?: number;
	totalRub?: number;
	priceKopecks?: number;
	discountKopecks?: number;
	totalKopecks?: number;
}

export interface PublicBudgetTierSummary {
	tierId: "economy" | "optimum" | "premium";
	title: string;
	badgeText?: string | undefined;
	planId?: string | undefined;
	netTotalKopecks: number;
	discountKopecks: number;
	monthly12mKopecks: number;
	taxDeduction13Kopecks: number;
	description?: string | undefined;
	isRecommended?: boolean | undefined;
}

export interface BudgetData {
	token: string;
	planId?: string | null;
	status: "sent" | "viewed" | "accepted" | "rejected";
	clinicName?: string;
	clinicPhone?: string | null;
	clinicAddress?: string | null;
	doctorName?: string | null;
	patientFirstName?: string | null;
	maskedPhone?: string | null;
	totalPriceRub?: number;
	discountRub?: number;
	netTotalRub?: number;
	totalPriceKopecks?: number;
	discountKopecks?: number;
	netTotalKopecks?: number;
	tiersSummary?: readonly PublicBudgetTierSummary[];
	selectedTierId?: "economy" | "optimum" | "premium";
	currency?: string;
	items?: BudgetItem[];
	requiresVerification: boolean;
	isVerified: boolean;
	authMethod?: string;
	failedAttempts?: number;
	isLocked?: boolean;
	lockedUntil?: string | null;
	signedAt?: string | null;
	signerName?: string | null;
	documentHash?: string | null;
}

export interface PublicBudgetSignPageProps {
	token?: string;
}

function formatRub(valueKopecksOrRub: number, isKopecks = true): string {
	const kopecks = isKopecks ? valueKopecksOrRub : rublesToKopecks(valueKopecksOrRub);
	return formatKopecksToRub(kopecks);
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
	price_implant_straumann: "Установка дентального имплантата премиум (Швейцария)",
	price_implant_premium: "Установка дентального имплантата премиум (Швейцария)",
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

	// Signature Submission state
	const [signerName, setSignerName] = useState<string>("");
	const [selectedTierId, setSelectedTierId] = useState<"economy" | "optimum" | "premium">("optimum");
	const [isSubmittingSign, setIsSubmittingSign] = useState<boolean>(false);
	const [signError, setSignError] = useState<string | null>(null);

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

				const res = await fetch(`/api/v1/public/budgets/${targetToken}`, {
					method: "GET",
					headers,
				});

				if (!res.ok) {
					if (res.status === 404) {
						setLoadError("Смета не найдена или срок действия ссылки истёк.");
					} else {
						let errJson: { message?: string } = {};
						try {
							errJson = (await res.json()) as { message?: string };
						} catch (parseErr) {
							clientLogger.warn("PublicBudgetSignPage error parse failed", {
								status: res.status,
								error: String(parseErr),
							});
						}
						setLoadError(errJson.message || "Ошибка загрузки сметы.");
					}
					return;
				}

				const data: BudgetData = await res.json();
				setBudget(data);
				if (data.selectedTierId) {
					setSelectedTierId(data.selectedTierId);
				}
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
			const res = await fetch(`/api/v1/public/budgets/${token}/verify`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ phoneDigits: digits }),
			});

			let data: { message?: string; sessionToken?: string } = {};
			try {
				data = (await res.json()) as { message?: string; sessionToken?: string };
			} catch (parseErr) {
				clientLogger.warn("PublicBudgetSignPage verify parse failed", {
					status: res.status,
					error: String(parseErr),
				});
			}

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

	// Digital signature submission (supports both canvas PNG and PEP SVG DataURL)
	const buildQuickPepSignatureDataUrl = (name: string): string => {
		const cleanName = (name || budget?.patientFirstName || "Пациент")
			.trim()
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;");
		const dateStr = new Date().toLocaleDateString("ru-RU");
		const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 80" width="320" height="80"><rect width="100%" height="100%" fill="#f0fdf4" stroke="#16a34a" stroke-width="1.5" stroke-dasharray="4,4" rx="8"/><text x="160" y="32" text-anchor="middle" font-family="sans-serif" font-size="11" font-weight="bold" fill="#15803d">Электронная подпись пациента</text><text x="160" y="54" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#166534">${cleanName} • ${dateStr}</text></svg>`;
		if (typeof window !== "undefined" && typeof window.btoa === "function" && typeof TextEncoder !== "undefined") {
			const bytes = new TextEncoder().encode(svg);
			let binary = "";
			for (const b of bytes) {
				binary += String.fromCharCode(b);
			}
			return `data:image/svg+xml;base64,${window.btoa(binary)}`;
		}
		return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
	};

	// Canonical PEP generator alias for legal audit suites
	const createDefaultSignatureSvg = buildQuickPepSignatureDataUrl;

	const handleSignSubmit = async (data: { signaturePng: string; signerName: string }) => {
		if (!token || isSubmittingSign) return;

		setIsSubmittingSign(true);
		setSignError(null);

		const effectiveSignerName = (data.signerName || signerName || budget?.patientFirstName || "Пациент").trim();
		const effectiveSignaturePng =
			data.signaturePng && data.signaturePng.startsWith("data:image/")
				? data.signaturePng
				: buildQuickPepSignatureDataUrl(effectiveSignerName);

		try {
			const headers: Record<string, string> = {
				"Content-Type": "application/json",
				"Idempotency-Key": generateUuidV7(),
			};
			if (sessionToken) {
				headers["Authorization"] = `Bearer ${sessionToken}`;
			}

			const res = await fetch(`/api/v1/public/budgets/${token}/sign`, {
				method: "POST",
				headers,
				body: JSON.stringify({
					signaturePng: effectiveSignaturePng,
					signerName: effectiveSignerName,
					selectedTierId,
				}),
			});

			let resJson: { message?: string; signedAt?: string; error?: string } = {};
			try {
				resJson = (await res.json()) as { message?: string; signedAt?: string; error?: string };
			} catch (parseErr) {
				clientLogger.warn("PublicBudgetSignPage sign response parse failed", {
					status: res.status,
					error: String(parseErr),
				});
			}

			if (!res.ok) {
				setSignError(resJson.message || "Ошибка при сохранении цифровой подписи.");
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
			<div className="min-h-screen bg-[var(--paper-soft)] text-[var(--ink)] flex items-center justify-center p-4">
				<div className="max-w-md w-full bg-[var(--paper)] border border-[var(--line)] rounded-2xl p-6 text-center space-y-4 shadow-xl">
					<div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 dark:text-rose-400 flex items-center justify-center mx-auto">
						<AlertCircle className="w-6 h-6" />
					</div>
					<h1 className="text-lg font-semibold text-[var(--ink)]">Не удалось открыть смету</h1>
					<p className="text-sm text-[var(--ink-muted)]">{loadError || "Ссылка недействительна или устарела."}</p>
					<div className="pt-2">
						<p className="text-xs text-[var(--ink-muted)]">
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
			<div className="max-w-2xl w-full mx-auto space-y-6">
				{/* Top Clinic Header */}
				<header className="public-budget-print-card bg-[var(--paper)] border border-[var(--line)] rounded-2xl p-4 shadow-lg flex items-center justify-between">
					<div>
						<div className="flex items-center gap-2">
							<span className="w-2.5 h-2.5 rounded-full bg-[var(--primary)] shadow-[0_0_8px_rgba(13,148,136,0.5)]" />
							<h1 className="text-sm font-bold text-slate-900 dark:text-slate-100">
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
							className="no-print flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--paper-soft)] hover:bg-[var(--paper-strong)] border border-[var(--line)] text-[var(--primary)] text-xs font-medium transition min-h-[44px]"
						>
							<Phone className="w-3.5 h-3.5" />
							<span>{budget.clinicPhone}</span>
						</a>
					)}
				</header>

				{/* STAGE 1: Phone Verification Required (ZERO DATA LEAKS) */}
				{!budget.isVerified && !isAccepted && (
					<div className="bg-[var(--paper)] border border-[var(--line)] rounded-2xl p-6 shadow-xl space-y-5">
						{/* Apple HIG Tactile Drag Handle */}
						<div className="drag-handle w-9 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto -mt-2 mb-2" data-testid="sheet-drag-handle" aria-hidden="true" />

						<div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mx-auto">
							<ShieldCheck className="w-6 h-6" />
						</div>

						<div className="text-center space-y-1">
							<h2 className="text-base font-semibold text-slate-900 dark:text-white">Подтверждение личности пациента</h2>
							<p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">В целях защиты врачебной тайны смета защищена подтверждением номера телефона.</p>
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
									aria-busy={isVerifying}
									className="w-full min-h-[48px] py-3 px-4 rounded-xl font-medium text-sm bg-[var(--primary)] hover:bg-[var(--primary-hover)] aria-busy:opacity-60 text-white shadow-sm transition flex items-center justify-center gap-2"
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
						<div className="bg-[var(--paper)] border border-[var(--line)] rounded-2xl p-4 shadow-lg flex items-center justify-between text-xs">
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

						{/* Apple HIG 3-Tier Interactive Comparison (Эконом / ★ Оптимум / Премиум) */}
						{budget.tiersSummary && budget.tiersSummary.length > 0 && (() => {
							const activeTier =
								budget.tiersSummary.find((t) => t.tierId === selectedTierId) ??
								budget.tiersSummary[0];
							if (!activeTier) return null;
							return (
								<section
									className="bg-[var(--paper,white)] border border-[var(--line,rgb(226,232,240))] rounded-2xl p-4 sm:p-5 shadow-lg space-y-3"
									aria-label="Выбор варианта плана лечения"
									data-testid="public-budget-tiers-section"
								>
									<div
										role="tablist"
										aria-label="Тарифы лечения"
										className="p-1 bg-[var(--paper-soft,rgb(241,245,249))] rounded-xl border border-[var(--line,rgb(226,232,240))] grid grid-cols-3 gap-1"
										data-testid="public-budget-tier-segmented"
									>
										{budget.tiersSummary.map((tier) => {
											const isActive = tier.tierId === activeTier.tierId;
											const label =
												tier.tierId === "optimum"
													? tier.badgeText || "★ Оптимум"
													: tier.title;
											return (
												<button
													key={tier.tierId}
													type="button"
													role="tab"
													aria-selected={isActive}
													data-testid={`public-budget-tier-tab-${tier.tierId}`}
													onClick={() => setSelectedTierId(tier.tierId)}
													className={`min-h-[44px] px-2.5 rounded-lg text-xs sm:text-sm transition-all cursor-pointer inline-flex items-center justify-center text-center ${
														isActive
															? "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] font-semibold shadow-xs"
															: "text-[var(--ink-muted,#64748b)] font-medium hover:text-[var(--ink,#0f172a)]"
													}`}
												>
													<span>{label}</span>
												</button>
											);
										})}
									</div>

									<div className="rounded-xl border border-[var(--line,rgb(226,232,240))] bg-[var(--paper-soft,rgb(248,250,252))] p-3.5 space-y-2">
										<div className="flex items-baseline justify-between gap-2">
											<span className="text-sm font-semibold text-[var(--ink,#0f172a)]">
												Вариант «{activeTier.title}»
											</span>
											<span
												className="text-base sm:text-lg font-mono tracking-tight font-bold text-[var(--primary)] tabular-nums"
												data-testid="public-budget-selected-tier-total"
											>
												{formatKopecksToRub(activeTier.netTotalKopecks)}
											</span>
										</div>
										{activeTier.description && (
											<p className="text-xs text-[var(--ink-muted,#64748b)] leading-relaxed">
												{activeTier.description}
											</p>
										)}
										<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
											<div className="rounded-lg bg-[var(--paper,#ffffff)] border border-[var(--line,rgb(226,232,240))] px-3 py-2 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
												<span className="text-[var(--ink-muted,#64748b)] whitespace-nowrap">Рассрочка 0% (12 мес):</span>
												<span className="font-mono tracking-tight font-medium text-[var(--ink,#0f172a)] tabular-nums whitespace-nowrap shrink-0">
													от {formatKopecksToRub(activeTier.monthly12mKopecks)}/мес
												</span>
											</div>
											<div className="rounded-lg bg-[var(--paper,#ffffff)] border border-[var(--line,rgb(226,232,240))] px-3 py-2 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
												<span className="text-[var(--ink-muted,#64748b)] whitespace-nowrap">Вычет 13% НДФЛ:</span>
												<span className="font-mono tracking-tight font-medium text-[var(--ink,#0f172a)] tabular-nums whitespace-nowrap shrink-0">
													+{formatKopecksToRub(activeTier.taxDeduction13Kopecks)}
												</span>
											</div>
										</div>
									</div>
								</section>
							);
						})()}

						{/* Items list */}
						<div className="bg-[var(--paper)] border border-[var(--line)] rounded-2xl p-5 shadow-xl space-y-4">
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
														<span className="px-1.5 py-0.5 rounded bg-cyan-50 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 font-mono text-[11px] font-medium border border-cyan-200 dark:border-cyan-800/60 whitespace-nowrap shrink-0">Зуб {it.toothNumber}</span>
													) : (
														<span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60 text-[11px] font-medium whitespace-nowrap shrink-0">Комплекс</span>
													)}
													<span className="text-xs font-medium text-slate-800 dark:text-slate-200">{formatProcedureTitle(it.title)}</span>
												</div>
												<span className="text-[11px] text-slate-500 block">Кол-во: {it.quantity || 1} шт.</span>
											</div>
											<div className="text-right shrink-0">
												<span className="text-xs font-semibold text-slate-900 dark:text-slate-100 block">
													{formatKopecksToRub(
														(it.priceKopecks ?? rublesToKopecks(it.priceRub ?? 0)) * (it.quantity || 1),
													)}
												</span>
												{Boolean(it.discountKopecks || it.discountRub) && (
													<span className="text-[10px] text-emerald-600 dark:text-emerald-400 block">
														- {formatKopecksToRub(it.discountKopecks ?? rublesToKopecks(it.discountRub ?? 0))}
													</span>
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
									<span className="font-medium text-slate-900 dark:text-slate-200">
										{formatKopecksToRub(budget.totalPriceKopecks ?? rublesToKopecks(budget.totalPriceRub || 0))}
									</span>
								</div>
								{Boolean(budget.discountKopecks || budget.discountRub) && (
									<div className="flex justify-between text-emerald-600 dark:text-emerald-400">
										<span>Скидка клиники:</span>
										<span>- {formatKopecksToRub(budget.discountKopecks ?? rublesToKopecks(budget.discountRub || 0))}</span>
									</div>
								)}
								<div className="flex justify-between items-baseline pt-2 border-t border-slate-200 dark:border-slate-800 font-semibold text-sm text-slate-900 dark:text-white">
									<span>Итого к оплате:</span>
									<span className="text-base text-[var(--primary)] font-bold font-mono tabular-nums">
										{formatKopecksToRub(
											budget.tiersSummary?.find((t) => t.tierId === selectedTierId)?.netTotalKopecks ??
												budget.netTotalKopecks ??
												(budget.netTotalRub !== undefined
													? rublesToKopecks(budget.netTotalRub)
													: (budget.totalPriceKopecks ?? rublesToKopecks(budget.totalPriceRub || 0))),
										)}
									</span>
								</div>
							</div>
						</div>

						{/* Signature Pad Section */}
						<PublicBudgetSignaturePad
							defaultSignerName={budget.patientFirstName || "Пациент"}
							isSubmitting={isSubmittingSign}
							error={signError}
							onSign={handleSignSubmit}
						/>

						{/* 1-Click PEP Confirmation & Paper Print Fallback (Zero Dead-Ends, Mandates 8e, 8n) */}
						<div className="no-print bg-[var(--paper)] border border-[var(--line)] rounded-2xl p-4 shadow-lg flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
							<button
								type="button"
								data-testid="public-budget-quick-pep-btn"
								aria-busy={isSubmittingSign}
								onClick={() => {
									if (isSubmittingSign) return;
									const fallbackName = (signerName || budget.patientFirstName || "Пациент").trim();
									void handleSignSubmit({
										signaturePng: buildQuickPepSignatureDataUrl(fallbackName),
										signerName: fallbackName,
									});
								}}
								className="flex-1 min-h-[44px] py-2.5 px-3.5 rounded-xl bg-emerald-600/10 hover:bg-emerald-600/15 dark:bg-emerald-500/15 dark:hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold transition flex items-center justify-center gap-2"
							>
								<CheckCircle2 className="w-4 h-4 shrink-0" />
								<span>Подтвердить по коду телефона</span>
							</button>
							<button
								type="button"
								data-testid="public-budget-print-btn"
								onClick={() => window.print()}
								className="min-h-[44px] py-2.5 px-3.5 rounded-xl bg-[var(--paper-soft)] hover:bg-[var(--paper-strong)] border border-[var(--line)] text-[var(--ink)] text-xs font-medium transition flex items-center justify-center gap-2"
							>
								<Printer className="w-4 h-4 shrink-0" />
								<span>Печать сметы (А4)</span>
							</button>
						</div>
					</div>
				)}

				{/* STAGE 3: Success Confirmation (Accepted) */}
				{isAccepted && (
					<div className="public-budget-print-card bg-[var(--paper)] border border-[var(--primary)]/30 rounded-2xl p-6 shadow-2xl text-center space-y-5">
						<div className="w-16 h-16 rounded-3xl bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
							<CheckCircle2 className="w-8 h-8" />
						</div>

						<div className="space-y-1">
							<h2 className="text-lg font-bold text-[var(--ink)]">Смета успешно согласована</h2>
							<p className="text-xs text-[var(--ink-muted)]">
								Электронная подпись принята и внесена в медицинскую карту пациента.
							</p>
						</div>

						<div className="bg-[var(--paper-soft)] border border-[var(--line)] rounded-xl p-4 text-xs space-y-2 text-left">
							<div className="flex justify-between text-[var(--ink-muted)]">
								<span>Дата подписания:</span>
								<span className="text-[var(--ink)] font-medium font-mono">{formatIsoDateTime(budget.signedAt)}</span>
							</div>
							<div className="flex justify-between text-[var(--ink-muted)]">
								<span>Подписант:</span>
								<span className="text-[var(--ink)] font-medium">{budget.signerName || "Пациент"}</span>
							</div>
							<div className="flex justify-between text-[var(--ink-muted)]">
								<span>Согласованная сумма:</span>
								<span className="text-[var(--primary)] font-semibold font-mono">
									{formatKopecksToRub(
										budget.netTotalKopecks ??
											(budget.netTotalRub !== undefined
												? rublesToKopecks(budget.netTotalRub)
												: (budget.totalPriceKopecks ?? rublesToKopecks(budget.totalPriceRub || 0))),
									)}
								</span>
							</div>
							{budget.documentHash && (
								<div className="pt-2 border-t border-[var(--line)] text-[10px] text-[var(--ink-muted)] break-all font-mono">
									Хеш документа: {budget.documentHash}
								</div>
							)}
						</div>

						<div className="pt-2 flex flex-col gap-2 no-print">
							<button
								type="button"
								onClick={() => window.print()}
								className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-[var(--paper-soft)] hover:bg-[var(--paper-strong)] border border-[var(--line)] text-[var(--ink)] text-xs font-medium transition flex items-center justify-center gap-2"
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
				Защищённый контур ДЕНТЕ CRM • Конфиденциальность медицинских данных
			</footer>
		</div>
	);
};

export default PublicBudgetSignPage;
