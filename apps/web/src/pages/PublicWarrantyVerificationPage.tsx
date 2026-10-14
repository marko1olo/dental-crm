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
			const json = await res.json().catch(() => null);

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
		setActiveCert(inputCert);
		void fetchWarranty(inputCert);
	};

	return (
		<div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans flex flex-col items-center py-6 px-3 sm:px-6">
			{/* BRAND HEADER */}
			<header className="w-full max-w-2xl flex items-center justify-between pb-6 mb-6 border-b border-slate-200 dark:border-slate-800">
				<div className="flex items-center gap-3">
					<div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-md">
						<DentalCrown size={22} />
					</div>
					<div>
						<h1 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
							<span>ДЕНТЕ</span>
							<span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20">
								Официальный реестр гарантий
							</span>
						</h1>
						<p className="text-xs text-slate-500 dark:text-slate-400">
							Публичная верификация стоматологических гарантий и сроков службы
						</p>
					</div>
				</div>
			</header>

			{/* SEARCH BAR (IF NEEDED) */}
			<section className="w-full max-w-2xl mb-6">
				<form onSubmit={handleSubmitSearch} className="flex items-center gap-2">
					<div className="relative flex-1">
						<input
							type="text"
							value={inputCert}
							onChange={(e) => setInputCert(e.target.value)}
							placeholder="Номер сертификата (напр. WAR-2026-00001)..."
							className="w-full min-h-[48px] pl-10 pr-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono font-bold focus:outline-hidden focus:ring-2 focus:ring-teal-500"
							aria-label="Номер гарантийного сертификата"
						/>
						<Search
							size={18}
							className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
						/>
					</div>
					<button
						type="submit"
						disabled={isLoading}
						className="min-h-[48px] px-5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-sm font-bold shadow-sm transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-50"
					>
						{isLoading ? <Loader2 size={16} className="animate-spin" /> : "Проверить"}
					</button>
				</form>
			</section>

			{/* LOADING SPINNER */}
			{isLoading && (
				<div className="w-full max-w-2xl p-12 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col items-center justify-center gap-3 shadow-xs">
					<Loader2 size={32} className="text-teal-600 animate-spin" />
					<p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
						Проверка цифрового сертификата в защищенном реестре...
					</p>
				</div>
			)}

			{/* ERROR STATE */}
			{!isLoading && error && (
				<div className="w-full max-w-2xl p-6 rounded-2xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/70 dark:bg-rose-950/20 text-rose-900 dark:text-rose-200 space-y-3">
					<div className="flex items-start gap-3">
						<AlertTriangle size={22} className="text-rose-600 shrink-0 mt-0.5" />
						<div>
							<h3 className="text-sm font-bold">Сертификат не подтвержден</h3>
							<p className="text-xs mt-1 text-rose-800 dark:text-rose-300 leading-relaxed">
								{error}
							</p>
						</div>
					</div>
					<div className="pt-2 text-[11px] text-slate-600 dark:text-slate-400 border-t border-rose-200/60 dark:border-rose-900/40">
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
								? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-100"
								: certificate.status === "conditional"
								? "bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-100"
								: "bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800 text-rose-950 dark:text-rose-100"
						}`}
					>
						<div className="flex items-center gap-3">
							{certificate.status === "active" ? (
								<div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
									<CheckCircle2 size={24} />
								</div>
							) : certificate.status === "conditional" ? (
								<div className="w-10 h-10 rounded-full bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-sm">
									<AlertTriangle size={22} />
								</div>
							) : (
								<div className="w-10 h-10 rounded-full bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-sm">
									<AlertTriangle size={22} />
								</div>
							)}
							<div>
								<div className="text-xs font-bold uppercase tracking-wider opacity-80">
									Статус сертификата
								</div>
								<div className="text-base sm:text-lg font-black leading-tight">
									{certificate.status === "active"
										? "Гарантия активна"
										: certificate.status === "conditional"
										? "Условная гарантия (требуется осмотр)"
										: "Гарантия приостановлена"}
								</div>
							</div>
						</div>
						<div className="text-right">
							<div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">
								Сертификат №
							</div>
							<div className="text-xs sm:text-sm font-mono font-bold">
								{certificate.certificateNumber}
							</div>
						</div>
					</div>

					{/* CLINIC & VALIDITY DETAILS */}
					<div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
						<div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
							<div className="flex items-center gap-2">
								<Building2 size={18} className="text-teal-600 dark:text-teal-400 shrink-0" />
								<div>
									<h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
										{certificate.clinicName}
									</h2>
									{certificate.clinicLegalName && (
										<p className="text-[11px] text-slate-500 dark:text-slate-400">
											{certificate.clinicLegalName}
										</p>
									)}
								</div>
							</div>
							{certificate.clinicPhone && (
								<a
									href={`tel:${certificate.clinicPhone.replace(/[^+\d]/g, "")}`}
									className="min-h-[44px] px-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-teal-500 text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
								>
									<Phone size={13} className="text-teal-600" />
									<span>{certificate.clinicPhone}</span>
								</a>
							)}
						</div>

						{certificate.clinicAddress && (
							<div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
								<MapPin size={14} className="text-slate-400 shrink-0" />
								<span>{certificate.clinicAddress}</span>
							</div>
						)}

						{/* KEY DATES GRID */}
						<div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
							<div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
								<span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
									<Calendar size={12} className="text-teal-600" />
									Выдан
								</span>
								<div className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-1">
									{formatDateRu(certificate.issuedAt)}
								</div>
							</div>

							<div className="p-3 rounded-xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/50">
								<span className="text-[10px] uppercase font-bold text-teal-800 dark:text-teal-300 flex items-center gap-1">
									<ShieldCheck size={12} className="text-teal-600" />
									Гарантия до
								</span>
								<div className="text-xs font-black text-teal-900 dark:text-teal-100 mt-1">
									{formatDateRu(certificate.expiresAt)}
								</div>
								<div className="text-[10px] text-teal-700 dark:text-teal-300 mt-0.5">
									{certificate.warrantyMonths} месяцев
								</div>
							</div>

							<div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
								<span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
									<Clock size={12} className="text-teal-600" />
									Срок службы
								</span>
								<div className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-1">
									до {Math.round(certificate.serviceLifeMonths / 12)} лет
								</div>
								<div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
									{certificate.serviceLifeMonths} месяцев
								</div>
							</div>
						</div>

						{/* NEXT RECALL CHECKUP NOTICE */}
						{certificate.nextRecallDate && (
							<div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-xs">
								<div className="flex items-center gap-2 min-w-0">
									<Clock size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
									<div>
										<span className="font-bold text-amber-950 dark:text-amber-200">
											Следующий обязательный контрольный осмотр:
										</span>{" "}
										<strong className="text-slate-900 dark:text-slate-100">
											до {formatDateRu(certificate.nextRecallDate)}
										</strong>
										<div className="text-[11px] text-amber-800 dark:text-amber-300/90 mt-0.5">
											Осмотр и окклюзионный контроль бесплатны (0 ₽) в рамках гарантии.
										</div>
									</div>
								</div>
							</div>
						)}
					</div>

					{/* WORKS & RESTORATIONS LIST */}
					{certificate.items && certificate.items.length > 0 && (
						<div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-3">
							<h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
								Выполненные ортопедические конструкции:
							</h3>
							<div className="divide-y divide-slate-100 dark:divide-slate-800">
								{certificate.items.map((it, idx) => (
									<div key={idx} className="py-2.5 flex items-start justify-between gap-3 text-xs">
										<div>
											<div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
												{it.toothNumber && (
													<span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono font-bold text-teal-700 dark:text-teal-300">
														Зуб {it.toothNumber}
													</span>
												)}
												<span>{it.clinicalWorkTitle || "Ортопедическая конструкция"}</span>
											</div>
											<div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap items-center gap-x-2">
												{it.materialName && <span>Материал: {it.materialName}</span>}
												{it.vitaShade && <span>· Цвет VITA: <strong>{it.vitaShade}</strong></span>}
												{it.labOrderNumber && <span>· Наряд ЗТЛ: {it.labOrderNumber}</span>}
											</div>
										</div>
										<span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 text-[10px] font-bold shrink-0">
											Под защитой
										</span>
									</div>
								))}
							</div>
						</div>
					)}

					{/* INTEGRITY SEAL (SHA-256) */}
					<div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900/60 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between gap-2 flex-wrap">
						<div className="flex items-center gap-1.5 font-mono">
							<Check size={13} className="text-emerald-600" />
							<span>ЭЦП SHA-256:</span>
							<strong className="text-slate-700 dark:text-slate-300">
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
