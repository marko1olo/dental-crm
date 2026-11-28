import React, { useEffect, useState } from "react";
import {
	ShieldCheck,
	AlertTriangle,
	CheckCircle2,
	Clock,
	Calendar,
	Phone,
	MapPin,
	Building2,
	Search,
	Loader2,
	Check,
} from "lucide-react";
import { DentalCrown } from "../components/icons/DentalIcons";
import { clientLogger } from "../services/logging/clientLogger";

interface PublicWarrantyItem {
	readonly toothNumber?: string;
	readonly clinicalWorkTitle?: string;
	readonly materialName?: string;
	readonly manufacturer?: string;
	readonly vitaShade?: string;
	readonly lotNumber?: string;
	readonly serviceCode804n?: string;
	readonly labOrderNumber?: string;
}

interface PublicWarrantyCertificate {
	readonly certificateNumber: string;
	readonly status: "active" | "conditional" | "voided" | string;
	readonly clinicName: string;
	readonly clinicLegalName?: string;
	readonly clinicPhone?: string;
	readonly clinicAddress?: string;
	readonly clinicWebsite?: string;
	readonly warrantyMonths: number;
	readonly serviceLifeMonths: number;
	readonly issuedAt: string;
	readonly expiresAt: string;
	readonly nextRecallDate?: string | null;
	readonly items?: PublicWarrantyItem[];
	readonly integritySha256: string;
	readonly notes?: string | null;
}

export interface PublicWarrantyVerificationPageProps {
	readonly certificateNumber?: string | null;
}

function formatDateRu(isoStr?: string | null): string {
	if (!isoStr) return "—";
	try {
		const d = new Date(isoStr);
		if (Number.isNaN(d.getTime())) return isoStr;
		return d.toLocaleDateString("ru-RU", {
			day: "numeric",
			month: "long",
			year: "numeric",
		});
	} catch {
		return isoStr;
	}
}

export function PublicWarrantyVerificationPage({
	certificateNumber: initialCertNum,
}: PublicWarrantyVerificationPageProps) {
	const [inputCert, setInputCert] = useState<string>(initialCertNum || "");
	const [activeCert, setActiveCert] = useState<string>(initialCertNum || "");
	const [isLoading, setIsLoading] = useState<boolean>(Boolean(initialCertNum));
	const [error, setError] = useState<string | null>(null);
	const [certificate, setCertificate] = useState<PublicWarrantyCertificate | null>(null);

	const fetchWarranty = async (certNum: string) => {
		const trimmed = certNum.trim();
		if (!trimmed) {
			setError("Введите номер гарантийного сертификата (например, WAR-2026-00001)");
			setCertificate(null);
			setIsLoading(false);
			return;
		}

		setIsLoading(true);
		setError(null);

		try {
			const res = await fetch(`/api/public/warranty/${encodeURIComponent(trimmed)}`);
			let json: { message?: string; certificate?: PublicWarrantyCertificate } | null = null;
			try {
				json = (await res.json()) as typeof json;
			} catch (parseErr) {
				clientLogger.warn("[PublicWarrantyVerificationPage] Non-JSON warranty response", parseErr);
			}

			if (!res.ok) {
				setError(
					json?.message ||
						`Гарантийный паспорт ${trimmed} не найден. Проверьте правильность введенного номера или отсканируйте актуальный QR-код.`,
				);
				setCertificate(null);
			} else if (json?.certificate) {
				setCertificate(json.certificate);
				setError(null);
			} else {
				setError("Не удалось получить данные сертификата.");
				setCertificate(null);
			}
		} catch (err) {
			setError("Ошибка сети при проверке гарантийного сертификата. Повторите попытку позже.");
			setCertificate(null);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		if (initialCertNum) {
			setInputCert(initialCertNum);
			setActiveCert(initialCertNum);
			void fetchWarranty(initialCertNum);
		}
	}, [initialCertNum]);

	const handleSubmitSearch = (e: React.FormEvent) => {
		e.preventDefault();
		if (isLoading) return;
		setActiveCert(inputCert);
		void fetchWarranty(inputCert);
	};

	return (
		<div className="min-h-screen bg-[var(--paper-soft)] text-[var(--ink)] font-sans flex flex-col items-center py-6 px-3 sm:px-6">
			{/* BRAND HEADER */}
			<header className="w-full max-w-2xl flex items-center justify-between pb-6 mb-6 border-b border-[var(--line)]">
				<div className="flex items-center gap-3">
					<div className="w-10 h-10 rounded-xl bg-[var(--primary)] text-white flex items-center justify-center shadow-md shrink-0">
						<DentalCrown size={22} />
					</div>
					<div>
						<h1 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2 flex-wrap">
							<span>ДЕНТЕ</span>
							<span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[var(--teal-soft)] text-[var(--primary)] border border-[var(--primary)]/20">
								Официальный реестр гарантий
							</span>
						</h1>
						<p className="text-xs text-[var(--ink-muted)]">
							Публичная верификация стоматологических гарантий и сроков службы
						</p>
					</div>
				</div>
			</header>

			{/* SEARCH BAR (IF NEEDED) */}
			<section className="w-full max-w-2xl mb-6">
				<form onSubmit={handleSubmitSearch} className="flex items-center gap-2">
					<div className="flex-1 min-h-[48px] px-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] flex items-center gap-2.5 focus-within:ring-2 focus-within:ring-[var(--primary)]">
						<Search
							size={18}
							className="text-[var(--ink-muted)] shrink-0 pointer-events-none"
						/>
						<input
							type="text"
							value={inputCert}
							onChange={(e) => setInputCert(e.target.value)}
							placeholder="Номер сертификата (напр. WAR-2026-00001)..."
							style={{ border: "none", background: "transparent", padding: 0, boxShadow: "none", borderRadius: 0 }}
							className="w-full min-w-0 text-sm font-mono font-bold text-[var(--ink)] focus:outline-hidden"
							aria-label="Номер гарантийного сертификата"
						/>
					</div>
					<button
						type="submit"
						aria-busy={isLoading}
						className="min-h-[48px] px-5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-sm font-bold shadow-sm transition-colors cursor-pointer flex items-center gap-2 shrink-0"
					>
						{isLoading ? <Loader2 size={16} className="animate-spin" /> : "Проверить"}
					</button>
				</form>
			</section>

			{/* LOADING SPINNER */}
			{isLoading && (
				<div className="w-full max-w-2xl p-12 rounded-2xl border border-[var(--line)] bg-[var(--paper)] flex flex-col items-center justify-center gap-3 shadow-xs">
					<Loader2 size={32} className="text-[var(--primary)] animate-spin" />
					<p className="text-sm font-semibold text-[var(--ink-muted)]">
						Проверка цифрового сертификата в защищенном реестре...
					</p>
				</div>
			)}

			{/* ERROR STATE */}
			{!isLoading && error && (
				<div className="w-full max-w-2xl p-6 rounded-2xl border border-[var(--danger)]/30 bg-[var(--danger-soft)] text-[var(--ink)] space-y-3">
					<div className="flex items-start gap-3">
						<AlertTriangle size={22} className="text-[var(--danger)] shrink-0 mt-0.5" />
						<div>
							<h3 className="text-sm font-bold">Сертификат не подтвержден</h3>
							<p className="text-xs mt-1 text-[var(--danger)] leading-relaxed">
								{error}
							</p>
						</div>
					</div>
					<div className="pt-2 text-xs text-[var(--ink-muted)] border-t border-[var(--danger)]/20">
						Если вы только что вышли от врача, данные могут загружаться в течение 1–2 минут. При возникновении вопросов обратитесь в регистратуру клиники.
					</div>
				</div>
			)}

			{/* SUCCESS CERTIFICATE VIEW */}
			{!isLoading && certificate && (
				<main className="w-full max-w-2xl space-y-5" data-testid="public-warranty-card">
					{/* STATUS BADGE BANNER */}
					<div
						className={`p-4 sm:p-5 rounded-2xl border flex items-center justify-between gap-3 shadow-sm ${
							certificate.status === "active"
								? "bg-[var(--success-soft)] border-[var(--ok-fg)]/30 text-[var(--ink)]"
								: certificate.status === "conditional"
								? "bg-[var(--warn-bg)] border-[var(--warn-fg)]/30 text-[var(--ink)]"
								: "bg-[var(--danger-soft)] border-[var(--danger)]/30 text-[var(--ink)]"
						}`}
					>
						<div className="flex items-center gap-3">
							{certificate.status === "active" ? (
								<div className="w-10 h-10 rounded-full bg-[var(--ok-fg)] text-white flex items-center justify-center shrink-0 shadow-sm">
									<CheckCircle2 size={24} />
								</div>
							) : certificate.status === "conditional" ? (
								<div className="w-10 h-10 rounded-full bg-[var(--warn-fg)] text-white flex items-center justify-center shrink-0 shadow-sm">
									<AlertTriangle size={22} />
								</div>
							) : (
								<div className="w-10 h-10 rounded-full bg-[var(--danger)] text-white flex items-center justify-center shrink-0 shadow-sm">
									<AlertTriangle size={22} />
								</div>
							)}
							<div>
								<div className="text-xs font-semibold tracking-wider text-[var(--ink-muted)]">
									Статус сертификата
								</div>
								<div className="text-base sm:text-lg font-black leading-tight text-[var(--ink)]">
									{certificate.status === "active"
										? "Гарантия активна"
										: certificate.status === "conditional"
										? "Условная гарантия (требуется осмотр)"
										: "Гарантия приостановлена"}
								</div>
							</div>
						</div>
						<div className="text-right">
							<div className="text-xs font-semibold text-[var(--ink-muted)]">
								Сертификат №
							</div>
							<div className="text-xs sm:text-sm font-mono font-bold text-[var(--ink)]">
								{certificate.certificateNumber}
							</div>
						</div>
					</div>

					{/* CLINIC & VALIDITY DETAILS */}
					<div className="p-5 rounded-2xl border border-[var(--line)] bg-[var(--paper)] shadow-xs space-y-4">
						<div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
							<div className="flex items-center gap-2">
								<Building2 size={18} className="text-[var(--primary)] shrink-0" />
								<div>
									<h2 className="text-sm font-bold text-[var(--ink)]">
										{certificate.clinicName}
									</h2>
									{certificate.clinicLegalName && (
										<p className="text-xs text-[var(--ink-muted)]">
											{certificate.clinicLegalName}
										</p>
									)}
								</div>
							</div>
							{certificate.clinicPhone && (
								<a
									href={`tel:${certificate.clinicPhone.replace(/[^+\d]/g, "")}`}
									className="min-h-[44px] px-3 rounded-lg border border-[var(--line)] hover:border-[var(--primary)] text-xs font-bold text-[var(--ink)] inline-flex items-center gap-1.5 transition-colors"
								>
									<Phone size={13} className="text-[var(--primary)]" />
									<span>{certificate.clinicPhone}</span>
								</a>
							)}
						</div>

						{certificate.clinicAddress && (
							<div className="flex items-center gap-2 text-xs text-[var(--ink-muted)]">
								<MapPin size={14} className="text-[var(--ink-muted)] shrink-0" />
								<span>{certificate.clinicAddress}</span>
							</div>
						)}

						{/* KEY DATES GRID */}
						<div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
							<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
								<span className="text-xs font-semibold text-[var(--ink-muted)] flex items-center gap-1">
									<Calendar size={12} className="text-[var(--primary)]" />
									Выдан
								</span>
								<div className="text-xs font-bold text-[var(--ink)] mt-1">
									{formatDateRu(certificate.issuedAt)}
								</div>
							</div>

							<div className="p-3 rounded-xl bg-[var(--success-soft)] border border-[var(--ok-fg)]/30">
								<span className="text-xs font-semibold text-[var(--ok-fg)] flex items-center gap-1">
									<ShieldCheck size={12} className="text-[var(--ok-fg)]" />
									Гарантия до
								</span>
								<div className="text-xs font-black text-[var(--ink)] mt-1">
									{formatDateRu(certificate.expiresAt)}
								</div>
								<div className="text-xs text-[var(--ok-fg)] mt-0.5">
									{certificate.warrantyMonths} месяцев
								</div>
							</div>

							<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
								<span className="text-xs font-semibold text-[var(--ink-muted)] flex items-center gap-1">
									<Clock size={12} className="text-[var(--primary)]" />
									Срок службы
								</span>
								<div className="text-xs font-bold text-[var(--ink)] mt-1">
									до {Math.round(certificate.serviceLifeMonths / 12)} лет
								</div>
								<div className="text-xs text-[var(--ink-muted)] mt-0.5">
									{certificate.serviceLifeMonths} месяцев
								</div>
							</div>
						</div>

						{/* NEXT RECALL CHECKUP NOTICE */}
						{certificate.nextRecallDate && (
							<div className="p-3.5 rounded-xl bg-[var(--warn-bg)] border border-[var(--warn-fg)]/30 flex items-center justify-between gap-3 text-xs">
								<div className="flex items-center gap-2 min-w-0">
									<Clock size={16} className="text-[var(--warn-fg)] shrink-0" />
									<div>
										<span className="font-bold text-[var(--ink)]">
											Следующий обязательный контрольный осмотр:
										</span>{" "}
										<strong className="text-[var(--ink)]">
											до {formatDateRu(certificate.nextRecallDate)}
										</strong>
										<div className="text-xs text-[var(--warn-fg)] mt-0.5">
											Осмотр и окклюзионный контроль бесплатны (0 ₽) в рамках гарантии.
										</div>
									</div>
								</div>
							</div>
						)}
					</div>

					{/* WORKS & RESTORATIONS LIST */}
					{certificate.items && certificate.items.length > 0 && (
						<div className="p-5 rounded-2xl border border-[var(--line)] bg-[var(--paper)] shadow-xs space-y-3">
							<h3 className="text-xs font-semibold tracking-wider text-[var(--ink-muted)]">
								Выполненные ортопедические конструкции:
							</h3>
							<div className="divide-y divide-[var(--line)]">
								{certificate.items.map((it, idx) => (
									<div key={idx} className="py-2.5 flex items-start justify-between gap-3 text-xs">
										<div>
											<div className="font-bold text-[var(--ink)] flex items-center gap-2">
												{it.toothNumber && (
													<span className="px-2 py-0.5 rounded bg-[var(--paper-soft)] font-mono font-bold text-[var(--primary)]">
														Зуб {it.toothNumber}
													</span>
												)}
												<span>{it.clinicalWorkTitle || "Ортопедическая конструкция"}</span>
											</div>
											<div className="text-xs text-[var(--ink-muted)] mt-1 flex flex-wrap items-center gap-x-2">
												{it.materialName && <span>Материал: {it.materialName}</span>}
												{it.vitaShade && <span>· Цвет VITA: <strong>{it.vitaShade}</strong></span>}
												{it.labOrderNumber && <span>· Наряд ЗТЛ: {it.labOrderNumber}</span>}
											</div>
										</div>
										<span className="px-2 py-0.5 rounded-full bg-[var(--success-soft)] text-[var(--ok-fg)] border border-[var(--ok-fg)]/20 text-xs font-bold shrink-0">
											Под защитой
										</span>
									</div>
								))}
							</div>
						</div>
					)}

					{/* INTEGRITY SEAL (SHA-256) */}
					<div className="p-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-xs text-[var(--ink-muted)] flex items-center justify-between gap-2 flex-wrap">
						<div className="flex items-center gap-1.5 font-mono">
							<Check size={13} className="text-[var(--ok-fg)]" />
							<span>ЭЦП SHA-256:</span>
							<strong className="text-[var(--ink)]">
								{certificate.integritySha256.slice(0, 16)}...{certificate.integritySha256.slice(-8)}
							</strong>
						</div>
						<span>СтАР / Закон РФ № 2300-1 ст. 29</span>
					</div>
				</main>
			)}
		</div>
	);
}

export default PublicWarrantyVerificationPage;
