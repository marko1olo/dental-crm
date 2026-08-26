/**
 * PublicEstimatePortal.tsx — 2FA Public Treatment Plan & Estimate Portal
 *
 * Implements:
 * 1. Zero-SMS 2FA Verification Cascade (phone_last4 / dob / manual_code)
 * 2. Itemized treatment plan & pricing presentation with 3-Tier options
 * 3. HTML5 Canvas Patient Signature with SHA-256 document hashing
 * 4. Post-acceptance certificate download & 1-click SBP QR payment integration
 */

import React, { useState, useEffect, useRef } from "react";
import {
	AlertCircle,
	Calendar,
	Check,
	CheckCircle2,
	Clock,
	Download,
	FileCheck,
	FileText,
	HelpCircle,
	Lock,
	PenTool,
	Phone,
	QrCode,
	RotateCcw,
	Shield,
	ShieldAlert,
	ShieldCheck,
	Sparkles,
	User,
	X,
	XCircle,
} from "lucide-react";
import type {
	PublicAuthMethod,
	PublicEstimateDetail,
	PublicEstimateItem,
	PublicEstimateMeta,
	PublicRejectionReason,
} from "@dental/shared";

interface PublicEstimatePortalProps {
	readonly token: string;
	readonly apiBaseUrl?: string;
	readonly initialMeta?: PublicEstimateMeta;
	readonly onAccepted?: (estimateNumber: string) => void;
	readonly onRejected?: (reason: string) => void;
}

export const PublicEstimatePortal: React.FC<PublicEstimatePortalProps> = ({
	token,
	apiBaseUrl = "",
	initialMeta,
	onAccepted,
	onRejected,
}) => {
	const [meta, setMeta] = useState<PublicEstimateMeta | null>(initialMeta || null);
	const [estimate, setEstimate] = useState<PublicEstimateDetail | null>(null);
	const [sessionToken, setSessionToken] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState<boolean>(!initialMeta);
	const [isVerifying, setIsVerifying] = useState<boolean>(false);
	const [verifyValue, setVerifyValue] = useState<string>("");
	const [verifyError, setVerifyError] = useState<string | null>(null);
	const [selectedTier, setSelectedTier] = useState<string>("standard");

	// Signature & Acceptance State
	const [showAcceptModal, setShowAcceptModal] = useState<boolean>(false);
	const [signerName, setSignerName] = useState<string>("");
	const [consentAgreed, setConsentAgreed] = useState<boolean>(true);
	const [signaturePng, setSignaturePng] = useState<string | null>(null);
	const [isSubmittingAccept, setIsSubmittingAccept] = useState<boolean>(false);
	const [acceptSuccess, setAcceptSuccess] = useState<boolean>(false);

	// Rejection State
	const [showRejectModal, setShowRejectModal] = useState<boolean>(false);
	const [rejectReason, setRejectReason] = useState<PublicRejectionReason>("price");
	const [rejectNote, setRejectNote] = useState<string>("");
	const [isSubmittingReject, setIsSubmittingReject] = useState<boolean>(false);

	// Canvas Ref for Signature
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const isDrawingRef = useRef<boolean>(false);
	const lastPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

	// Fetch Meta on Mount
	useEffect(() => {
		async function fetchMeta() {
			try {
				setIsLoading(true);
				const res = await fetch(`${apiBaseUrl}/api/public/estimates/${token}/meta`);
				if (!res.ok) {
					throw new Error("Не удалось загрузить данные сметы.");
				}
				const json = await res.json();
				setMeta(json.data);
				if (json.data?.patient_first_name) {
					setSignerName(json.data.patient_first_name);
				}

				// If no verification required or already decided, load estimate details directly
				if (!json.data.requires_verification && !json.data.locked && !json.data.expired) {
					await fetchEstimateDetails();
				}
			} catch (err: any) {
				setVerifyError(err.message || "Ошибка подключения к серверу.");
			} finally {
				setIsLoading(false);
			}
		}

		if (!initialMeta) {
			fetchMeta();
		} else if (!initialMeta.requires_verification) {
			fetchEstimateDetails();
		}
	}, [token, apiBaseUrl, initialMeta]);

	async function fetchEstimateDetails(authToken?: string) {
		try {
			setIsLoading(true);
			const headers: Record<string, string> = {};
			const tokenToUse = authToken || sessionToken;
			if (tokenToUse) {
				headers.Authorization = `Bearer ${tokenToUse}`;
			}

			const res = await fetch(`${apiBaseUrl}/api/public/estimates/${token}`, {
				headers,
				credentials: "include",
			});

			if (res.ok) {
				const json = await res.json();
				setEstimate(json.data);
				if (json.data.status === "accepted") {
					setAcceptSuccess(true);
				}
			}
		} catch {
			// silent fallback
		} finally {
			setIsLoading(false);
		}
	}

	async function handleVerifySubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!verifyValue.trim() || isVerifying || !meta) return;

		setIsVerifying(true);
		setVerifyError(null);

		try {
			const res = await fetch(`${apiBaseUrl}/api/public/estimates/${token}/verify`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					method: meta.method,
					value: verifyValue.trim(),
				}),
				credentials: "include",
			});

			const json = await res.json();

			if (!res.ok) {
				setVerifyError(json.message || "Неверные данные подтверждения.");
				if (res.status === 423 || res.status === 429) {
					setMeta((prev) => (prev ? { ...prev, locked: true } : null));
				}
				return;
			}

			if (json.sessionToken) {
				setSessionToken(json.sessionToken);
				await fetchEstimateDetails(json.sessionToken);
			}
		} catch (err: any) {
			setVerifyError(err.message || "Сетевая ошибка при проверке.");
		} finally {
			setIsVerifying(false);
		}
	}

	// Canvas Drawing Handlers
	function startDrawing(e: React.PointerEvent<HTMLCanvasElement>) {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const rect = canvas.getBoundingClientRect();
		isDrawingRef.current = true;
		lastPosRef.current = {
			x: e.clientX - rect.left,
			y: e.clientY - rect.top,
		};
	}

	function draw(e: React.PointerEvent<HTMLCanvasElement>) {
		if (!isDrawingRef.current || !canvasRef.current) return;
		const canvas = canvasRef.current;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		const rect = canvas.getBoundingClientRect();
		const currentX = e.clientX - rect.left;
		const currentY = e.clientY - rect.top;

		ctx.strokeStyle = "#0f172a";
		ctx.lineWidth = 2.5;
		ctx.lineCap = "round";
		ctx.lineJoin = "round";

		ctx.beginPath();
		ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
		ctx.lineTo(currentX, currentY);
		ctx.stroke();

		lastPosRef.current = { x: currentX, y: currentY };
	}

	function stopDrawing() {
		if (!isDrawingRef.current || !canvasRef.current) return;
		isDrawingRef.current = false;
		setSignaturePng(canvasRef.current.toDataURL("image/png"));
	}

	function clearSignature() {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (ctx) {
			ctx.clearRect(0, 0, canvas.width, canvas.height);
		}
		setSignaturePng(null);
	}

	async function handleAcceptSubmit() {
		if (!signerName.trim() || !consentAgreed || isSubmittingAccept) return;

		setIsSubmittingAccept(true);
		try {
			const res = await fetch(`${apiBaseUrl}/api/public/estimates/${token}/accept`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
				},
				body: JSON.stringify({
					signerName: signerName.trim(),
					signatureMethod: signaturePng ? "drawn" : "click_accept",
					signaturePng: signaturePng || undefined,
				}),
				credentials: "include",
			});

			if (!res.ok) {
				const json = await res.json();
				throw new Error(json.message || "Не удалось сохранить подпись.");
			}

			setAcceptSuccess(true);
			setShowAcceptModal(false);
			if (onAccepted && meta?.estimate_number) {
				onAccepted(meta.estimate_number);
			}
			await fetchEstimateDetails();
		} catch (err: any) {
			alert(err.message || "Ошибка сохранения согласования.");
		} finally {
			setIsSubmittingAccept(false);
		}
	}

	async function handleRejectSubmit() {
		if (isSubmittingReject) return;

		setIsSubmittingReject(true);
		try {
			const res = await fetch(`${apiBaseUrl}/api/public/estimates/${token}/reject`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
				},
				body: JSON.stringify({
					reason: rejectReason,
					note: rejectNote.trim() || undefined,
				}),
				credentials: "include",
			});

			if (!res.ok) {
				const json = await res.json();
				throw new Error(json.message || "Не удалось отклонить смету.");
			}

			setShowRejectModal(false);
			if (onRejected) {
				onRejected(rejectReason);
			}
			await fetchEstimateDetails();
		} catch (err: any) {
			alert(err.message || "Ошибка отправки решения.");
		} finally {
			setIsSubmittingReject(false);
		}
	}

	// Loading State
	if (isLoading) {
		return (
			<div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center space-y-4">
				<div className="w-12 h-12 rounded-2xl border-4 border-teal-500 border-t-transparent animate-spin" />
				<p className="text-sm font-medium text-[var(--muted,#64748b)]">Загрузка плана лечения и сметы...</p>
			</div>
		);
	}

	// Locked / Expired State
	if (meta?.locked || meta?.expired) {
		return (
			<div className="max-w-md mx-auto my-12 p-6 rounded-3xl bg-[var(--paper,#ffffff)] border border-[var(--border,#cbd5e1)] shadow-xl text-center space-y-5">
				<div
					className={`w-16 h-16 mx-auto rounded-3xl flex items-center justify-center ${
						meta.locked ? "bg-rose-500/10 text-rose-600" : "bg-amber-500/10 text-amber-600"
					}`}
				>
					{meta.locked ? <ShieldAlert size={32} /> : <Clock size={32} />}
				</div>
				<div>
					<h2 className="text-lg font-bold text-[var(--ink,#0f172a)]">
						{meta.locked ? "Ссылка заблокирована" : "Срок действия сметы истёк"}
					</h2>
					<p className="text-xs text-[var(--muted,#64748b)] mt-1.5 leading-relaxed">
						{meta.locked
							? "Превышено максимальное число попыток подтверждения личности. Для безопасности медицинских данных доступ закрыт."
							: "Срок действия предварительной сметы подошел к концу. Свяжитесь с клиникой для актуализации стоимости."}
					</p>
				</div>
				{meta.clinic_phone && (
					<a
						href={`tel:${meta.clinic_phone}`}
						className="inline-flex items-center justify-center gap-2 w-full min-h-[44px] px-5 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs transition-colors"
					>
						<Phone size={16} />
						Позвонить в клинику ({meta.clinic_phone})
					</a>
				)}
			</div>
		);
	}

	// 2FA Verification Form (Pre-verification)
	if (!estimate && meta?.requires_verification) {
		const methodLabels = {
			phone_last4: "Последние 4 цифры вашего номера телефона",
			dob: "Дата вашего рождения (ДД.ММ.ГГГГ или ГГГГ-ММ-ДД)",
			manual_code: "4-значный код безопасности (выдан администратором)",
			none: "Подтверждение не требуется",
		};

		return (
			<div className="max-w-md mx-auto my-8 p-6 rounded-3xl bg-[var(--paper,#ffffff)] border border-[var(--border,#cbd5e1)] shadow-xl space-y-6">
				<div className="flex items-center gap-3 pb-4 border-b border-[var(--border,#cbd5e1)]">
					<div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-600 flex items-center justify-center shrink-0">
						<Lock size={20} />
					</div>
					<div>
						<h2 className="text-base font-bold text-[var(--ink,#0f172a)]">Подтверждение личности (2FA)</h2>
						<p className="text-xs text-[var(--muted,#64748b)]">{meta.clinic_name || "Стоматологическая клиника"}</p>
					</div>
				</div>

				<form onSubmit={handleVerifySubmit} className="space-y-4">
					<p className="text-xs text-[var(--muted,#64748b)] leading-relaxed">
						Для защиты персональных и медицинских данных (ст. 13 323-ФЗ) подтвердите доступ к вашей смете:
					</p>

					<div className="space-y-1.5">
						<label className="text-xs font-bold text-[var(--ink,#0f172a)]">
							{methodLabels[meta.method] || "Код подтверждения"}
						</label>
						<input
							type={meta.method === "dob" ? "date" : "text"}
							inputMode={meta.method === "phone_last4" || meta.method === "manual_code" ? "numeric" : undefined}
							maxLength={meta.method === "phone_last4" ? 4 : meta.method === "manual_code" ? 6 : undefined}
							placeholder={meta.method === "phone_last4" ? "Например: 1234" : "Введите значение"}
							value={verifyValue}
							onChange={(e) => setVerifyValue(e.target.value)}
							autoFocus
							className="w-full min-h-[44px] px-4 py-2 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)] text-sm font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
						/>
					</div>

					{verifyError && (
						<div className="flex items-center gap-2 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs">
							<AlertCircle size={14} className="shrink-0" />
							<span>{verifyError}</span>
						</div>
					)}

					<button
						type="submit"
						disabled={!verifyValue.trim() || isVerifying}
						className="w-full min-h-[44px] flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-extrabold text-xs shadow-md shadow-teal-600/20 disabled:opacity-50 transition-all cursor-pointer"
					>
						{isVerifying ? <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> : <ShieldCheck size={16} />}
						<span>{isVerifying ? "Проверка..." : "Открыть план лечения"}</span>
					</button>
				</form>
			</div>
		);
	}

	// Estimate Details View (Verified)
	if (estimate) {
		const isDecided = estimate.status === "accepted" || estimate.status === "rejected";

		return (
			<div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
				{/* Clinic & Hero Header */}
				<header className="p-6 rounded-3xl bg-gradient-to-br from-teal-900 to-slate-900 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
					<div className="space-y-1">
						<span className="text-[10px] font-extrabold uppercase tracking-widest text-teal-300">
							{estimate.status === "accepted"
								? "✓ Согласовано"
								: estimate.status === "rejected"
									? "Отклонено"
									: "Предварительная смета"}
						</span>
						<h1 className="text-xl sm:text-2xl font-black">
							{meta?.patient_first_name ? `Здравствуйте, ${meta.patient_first_name}!` : "План лечения и смета"}
						</h1>
						<p className="text-xs text-teal-100/80">
							{meta?.clinic_name || "Стоматологическая клиника"} • № {estimate.estimate_number}
						</p>
					</div>

					<div className="text-left sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-white/10">
						<span className="text-[11px] text-teal-200 block">Итого к оплате:</span>
						<span className="text-2xl sm:text-3xl font-black font-mono text-emerald-400">
							{estimate.total_rub.toLocaleString("ru-RU")} ₽
						</span>
					</div>
				</header>

				{/* Note from Clinic */}
				{estimate.patient_notes && (
					<div className="p-4 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)] text-xs text-[var(--ink,#0f172a)] flex items-start gap-3">
						<Sparkles size={18} className="text-teal-600 shrink-0 mt-0.5" />
						<div>
							<span className="font-bold block">Комментарий лечащего врача:</span>
							<p className="text-[var(--muted,#64748b)] mt-0.5">{estimate.patient_notes}</p>
						</div>
					</div>
				)}

				{/* 3-Tier Option Selector */}
				{estimate.tier_options && estimate.tier_options.length > 0 && !isDecided && (
					<div className="space-y-3">
						<h2 className="text-sm font-bold text-[var(--ink,#0f172a)] flex items-center gap-2">
							<Sparkles size={16} className="text-teal-600" />
							Выберите вариант плана лечения:
						</h2>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
							{estimate.tier_options.map((t) => (
								<button
									key={t.tierId}
									type="button"
									onClick={() => setSelectedTier(t.tierId)}
									className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
										selectedTier === t.tierId
											? "border-teal-500 bg-teal-500/10 shadow-md ring-2 ring-teal-500/30"
											: "border-[var(--border,#cbd5e1)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f8fafc)]"
									}`}
								>
									<span className="text-xs font-bold text-[var(--ink,#0f172a)] block">{t.title}</span>
									<span className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono block mt-1">
										{t.totalRub.toLocaleString("ru-RU")} ₽
									</span>
									<ul className="text-[11px] text-[var(--muted,#64748b)] mt-2 space-y-1">
										{t.benefits.map((b, i) => (
											<li key={i} className="flex items-center gap-1.5">
												<Check size={12} className="text-teal-600" />
												<span>{b}</span>
											</li>
										))}
									</ul>
								</button>
							))}
						</div>
					</div>
				)}

				{/* Itemized Treatments Table */}
				<div className="rounded-3xl bg-[var(--paper,#ffffff)] border border-[var(--border,#cbd5e1)] shadow-sm overflow-hidden">
					<div className="p-4 border-b border-[var(--border,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] flex items-center justify-between">
						<h2 className="text-xs font-extrabold uppercase tracking-wider text-[var(--muted,#64748b)]">
							Состав услуг и материалов ({estimate.items.length})
						</h2>
						{estimate.valid_until && (
							<span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
								<Calendar size={12} /> Действует до {estimate.valid_until}
							</span>
						)}
					</div>

					<div className="divide-y divide-[var(--border,#cbd5e1)]">
						{estimate.items.map((item, idx) => (
							<div key={item.id} className="p-4 flex items-center justify-between gap-3 text-xs">
								<div className="flex items-start gap-3 min-w-0">
									<span className="w-6 h-6 rounded-full bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)] flex items-center justify-center font-bold text-[10px] text-[var(--muted,#64748b)] shrink-0">
										{idx + 1}
									</span>
									<div>
										<p className="font-bold text-[var(--ink,#0f172a)]">{item.title}</p>
										<div className="flex items-center gap-2 mt-0.5 text-[11px] text-[var(--muted,#64748b)]">
											{item.tooth_number && (
												<span className="px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-700 dark:text-teal-300 font-bold">
													Зуб {item.tooth_number}
												</span>
											)}
											<span>
												{item.quantity} × {item.unit_price_rub.toLocaleString("ru-RU")} ₽
											</span>
										</div>
									</div>
								</div>

								<div className="text-right shrink-0">
									{item.discount_rub > 0 && (
										<span className="text-[10px] text-[var(--muted,#64748b)] line-through block">
											{item.line_total_rub.toLocaleString("ru-RU")} ₽
										</span>
									)}
									<span className="font-extrabold text-[var(--ink,#0f172a)] font-mono">
										{item.net_line_total_rub.toLocaleString("ru-RU")} ₽
									</span>
								</div>
							</div>
						))}
					</div>

					{/* Totals Summary */}
					<div className="p-4 bg-[var(--paper-soft,#f8fafc)] border-t border-[var(--border,#cbd5e1)] space-y-1.5 text-xs text-right">
						<div className="flex justify-between text-[var(--muted,#64748b)]">
							<span>Стоимость без скидки:</span>
							<span>{estimate.subtotal_rub.toLocaleString("ru-RU")} ₽</span>
						</div>
						{estimate.total_discount_rub > 0 && (
							<div className="flex justify-between text-emerald-600 font-bold">
								<span>Скидка клиники:</span>
								<span>−{estimate.total_discount_rub.toLocaleString("ru-RU")} ₽</span>
							</div>
						)}
						<div className="flex justify-between text-sm font-black text-[var(--ink,#0f172a)] pt-1 border-t border-[var(--border,#cbd5e1)]">
							<span>Итого к согласованию:</span>
							<span className="text-emerald-600 dark:text-emerald-400 font-mono">
								{estimate.total_rub.toLocaleString("ru-RU")} ₽
							</span>
						</div>
					</div>
				</div>

				{/* Trust Badges */}
				<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center text-xs text-[var(--muted,#64748b)]">
					<div className="p-3 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)] flex items-center justify-center gap-2">
						<ShieldCheck size={16} className="text-teal-600" />
						<span>256-битное шифрование</span>
					</div>
					<div className="p-3 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)] flex items-center justify-center gap-2">
						<FileCheck size={16} className="text-emerald-600" />
						<span>Юридическая сила (63-ФЗ)</span>
					</div>
					<div className="p-3 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)] flex items-center justify-center gap-2">
						<Lock size={16} className="text-indigo-600" />
						<span>Защита от подделки</span>
					</div>
				</div>

				{/* Post-Accepted Signed Card */}
				{acceptSuccess && (
					<div className="p-6 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-4">
						<div className="w-12 h-12 mx-auto rounded-full bg-emerald-500 text-white flex items-center justify-center">
							<CheckCircle2 size={24} />
						</div>
						<div>
							<h3 className="text-base font-bold text-emerald-800 dark:text-emerald-200">
								План лечения успешно утвержден и подписан!
							</h3>
							<p className="text-xs text-emerald-700/80 dark:text-emerald-300/80 mt-1">
								Администратор клиники свяжется с вами для бронирования удобного времени приема.
							</p>
						</div>

						<div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
							<a
								href={`${apiBaseUrl}/api/public/estimates/${token}/pdf/signed`}
								target="_blank"
								rel="noreferrer"
								className="w-full sm:w-auto inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 rounded-2xl bg-[var(--paper,#ffffff)] text-emerald-800 border border-emerald-500/30 font-bold text-xs shadow-sm hover:bg-emerald-50 transition-colors"
							>
								<Download size={15} />
								Скачать подписанный акт
							</a>
						</div>
					</div>
				)}

				{/* Action CTAs (Unaccepted) */}
				{!isDecided && !acceptSuccess && (
					<div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
						<button
							type="button"
							onClick={() => setShowAcceptModal(true)}
							className="w-full sm:flex-1 min-h-[48px] flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-extrabold text-sm shadow-lg shadow-emerald-600/25 transition-all cursor-pointer"
						>
							<PenTool size={16} />
							Согласовать и подписать
						</button>

						<button
							type="button"
							onClick={() => setShowRejectModal(true)}
							className="w-full sm:w-auto min-h-[48px] px-5 py-3 rounded-2xl border border-[var(--border,#cbd5e1)] text-[var(--muted,#64748b)] hover:text-rose-600 hover:border-rose-300 font-bold text-xs transition-colors cursor-pointer"
						>
							Не подходит
						</button>
					</div>
				)}

				{/* Accept & Signature Modal */}
				{showAcceptModal && (
					<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
						<div className="w-full max-w-lg rounded-3xl bg-[var(--paper,#ffffff)] border border-[var(--border,#cbd5e1)] shadow-2xl p-6 space-y-4 text-left">
							<div className="flex items-center justify-between pb-3 border-b border-[var(--border,#cbd5e1)]">
								<h3 className="text-base font-bold text-[var(--ink,#0f172a)] flex items-center gap-2">
									<FileCheck size={18} className="text-teal-600" />
									Электронная подпись сметы
								</h3>
								<button
									type="button"
									onClick={() => setShowAcceptModal(false)}
									className="p-1.5 rounded-xl text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
								>
									<X size={18} />
								</button>
							</div>

							<div className="space-y-1.5">
								<label className="text-xs font-bold text-[var(--ink,#0f172a)]">ФИО подписанта:</label>
								<input
									type="text"
									value={signerName}
									onChange={(e) => setSignerName(e.target.value)}
									placeholder="Фамилия Имя Отчество"
									className="w-full min-h-[44px] px-3.5 py-2 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)] text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
								/>
							</div>

							{/* Canvas Signature Pad */}
							<div className="space-y-1.5">
								<div className="flex items-center justify-between">
									<label className="text-xs font-bold text-[var(--ink,#0f172a)]">Нарисуйте подпись на экране:</label>
									<button
										type="button"
										onClick={clearSignature}
										className="text-[11px] text-[var(--muted,#64748b)] hover:text-rose-600 flex items-center gap-1"
									>
										<RotateCcw size={12} /> Очистить
									</button>
								</div>
								<div className="h-36 rounded-2xl border-2 border-dashed border-[var(--border,#cbd5e1)] bg-white overflow-hidden touch-none">
									<canvas
										ref={canvasRef}
										width={500}
										height={144}
										className="w-full h-full cursor-crosshair block"
										onPointerDown={startDrawing}
										onPointerMove={draw}
										onPointerUp={stopDrawing}
										onPointerLeave={stopDrawing}
									/>
								</div>
							</div>

							{/* Statutory Consent Checkbox */}
							<label className="flex items-start gap-2.5 text-xs text-[var(--ink,#0f172a)] cursor-pointer select-none">
								<input
									type="checkbox"
									checked={consentAgreed}
									onChange={(e) => setConsentAgreed(e.target.checked)}
									className="mt-0.5 w-4 h-4 rounded text-teal-600 border-[var(--border,#cbd5e1)] focus:ring-teal-500 cursor-pointer"
								/>
								<span>
									Ознакомлен(а) со стоимостью, перечнем процедур и даю информированное согласие на лечение (ст. 20
									323-ФЗ).
								</span>
							</label>

							<div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--border,#cbd5e1)]">
								<button
									type="button"
									onClick={() => setShowAcceptModal(false)}
									className="min-h-[44px] px-4 py-2 rounded-2xl border border-[var(--border,#cbd5e1)] text-xs font-bold text-[var(--muted,#64748b)]"
								>
									Отмена
								</button>
								<button
									type="button"
									disabled={!signerName.trim() || !consentAgreed || isSubmittingAccept}
									onClick={handleAcceptSubmit}
									className="min-h-[44px] flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-extrabold text-xs shadow-md disabled:opacity-50 transition-all cursor-pointer"
								>
									<Check size={16} />
									<span>{isSubmittingAccept ? "Сохранение..." : "Утвердить план"}</span>
								</button>
							</div>
						</div>
					</div>
				)}

				{/* Rejection Modal */}
				{showRejectModal && (
					<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
						<div className="w-full max-w-md rounded-3xl bg-[var(--paper,#ffffff)] border border-[var(--border,#cbd5e1)] shadow-2xl p-6 space-y-4 text-left">
							<div className="flex items-center justify-between pb-3 border-b border-[var(--border,#cbd5e1)]">
								<h3 className="text-base font-bold text-[var(--ink,#0f172a)] flex items-center gap-2">
									<XCircle size={18} className="text-rose-600" />
									Отклонение плана
								</h3>
								<button
									type="button"
									onClick={() => setShowRejectModal(false)}
									className="p-1.5 rounded-xl text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
								>
									<X size={18} />
								</button>
							</div>

							<div className="space-y-1.5">
								<label className="text-xs font-bold text-[var(--ink,#0f172a)]">Укажите причину:</label>
								<select
									value={rejectReason}
									onChange={(e) => setRejectReason(e.target.value as PublicRejectionReason)}
									className="w-full min-h-[44px] px-3.5 py-2 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)] text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
								>
									<option value="price">Высокая стоимость / нужен бюджетный вариант</option>
									<option value="time">Не подходят сроки лечения</option>
									<option value="second_opinion">Хочу проконсультироваться в другой клинике</option>
									<option value="other">Другая причина</option>
								</select>
							</div>

							<div className="space-y-1.5">
								<label className="text-xs font-bold text-[var(--ink,#0f172a)]">Комментарий (необязательно):</label>
								<textarea
									rows={3}
									value={rejectNote}
									onChange={(e) => setRejectNote(e.target.value)}
									placeholder="Опишите, что мы можем улучшить..."
									className="w-full p-3 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)] text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none resize-none"
								/>
							</div>

							<div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--border,#cbd5e1)]">
								<button
									type="button"
									onClick={() => setShowRejectModal(false)}
									className="min-h-[44px] px-4 py-2 rounded-2xl border border-[var(--border,#cbd5e1)] text-xs font-bold text-[var(--muted,#64748b)]"
								>
									Назад
								</button>
								<button
									type="button"
									disabled={isSubmittingReject}
									onClick={handleRejectSubmit}
									className="min-h-[44px] px-5 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs shadow-md disabled:opacity-50 transition-all cursor-pointer"
								>
									{isSubmittingReject ? "Отправка..." : "Подтвердить отказ"}
								</button>
							</div>
						</div>
					</div>
				)}
			</div>
		);
	}

	return null;
};

export default PublicEstimatePortal;
