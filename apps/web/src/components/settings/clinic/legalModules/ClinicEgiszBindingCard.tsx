/**
 * apps/web/src/components/settings/clinic/legalModules/ClinicEgiszBindingCard.tsx
 *
 * EGISZ (Uniform State Health Information System) binding card:
 * Medical organization OID (FRMO), digital signature (ECP),
 * and test sandbox switch for REMD electronic outpatient documents.
 *
 * Mandates 8b, 8c, 8d, 8e: desktop density, <= 500 lines, WCAG AAA.
 */

import React from "react";
import { ExternalLink, KeyRound, Network, ShieldAlert, ShieldCheck } from "lucide-react";
import { validateEgiszOid } from "./clinicLegalTypes";

export interface ClinicEgiszBindingCardProps {
	clinicProfileDraft: Record<string, any>;
	updateClinicProfileDraft: (field: string, value: any) => void;
}

export const ClinicEgiszBindingCard: React.FC<ClinicEgiszBindingCardProps> = ({
	clinicProfileDraft,
	updateClinicProfileDraft,
}) => {
	const isEgiszEnabled = Boolean(clinicProfileDraft.egiszEnabled);
	const isAutonomousMode = Boolean(
		clinicProfileDraft.egiszAutonomousMode ?? !clinicProfileDraft.egiszEnabled,
	);
	const oid = clinicProfileDraft.egiszOid || "";
	const isTestMode = Boolean(clinicProfileDraft.egiszTestMode);
	const oidValidation = validateEgiszOid(oid);

	return (
		<article
			className="p-4 sm:p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] space-y-4"
			data-testid="clinic-egisz-binding-card"
		>
			<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-[var(--line)]">
				<div className="flex items-center gap-2.5">
					<div className="w-8 h-8 rounded-lg bg-[var(--teal)]/10 text-[var(--teal)] flex items-center justify-center shrink-0">
						<Network size={18} aria-hidden="true" />
					</div>
					<div>
						<h4 className="text-sm font-bold text-[var(--ink)] m-0">
							Интеграция с ЕГИСЗ (ФРМО / РЭМД Минздрава РФ)
						</h4>
						<p className="text-xs text-[var(--muted)] m-0 mt-0.5">
							Передача электронных медицинских документов (ЭМД) в федеральный реестр
						</p>
					</div>
				</div>
				<div className="flex items-center gap-2">
					{isAutonomousMode && (
						<span
							className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5"
							data-testid="badge-egisz-autonomous"
						>
							<ShieldCheck size={13} />
							<span>Автономия врача</span>
						</span>
					)}
					<span
						className={`text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 ${
							isEgiszEnabled
								? "bg-teal-500/10 text-[var(--teal)] border border-teal-500/30"
								: "bg-[var(--paper-soft)] text-[var(--muted)] border border-[var(--line)]"
						}`}
						data-testid="badge-egisz-status"
					>
						{isEgiszEnabled ? (
							<>
								<ShieldCheck size={13} />
								<span>Адаптер активен</span>
							</>
						) : (
							<span>Отключен (по умолчанию)</span>
						)}
					</span>
				</div>
			</div>

			{/* Главный тумблер активации */}
			<div className="flex items-center justify-between pt-3 border-t border-[var(--line)]">
				<div className="space-y-0.5">
					<span className="text-xs font-bold text-[var(--ink)] block">
						Включить передачу протоколов в ЕГИСЗ
					</span>
					<p className="text-[11px] text-[var(--muted)] m-0">
						Требуется для частных клиник по Постановлению Правительства № 140
					</p>
				</div>
				<label className="relative inline-flex items-center cursor-pointer">
					<input
						type="checkbox"
						data-testid="toggle-egisz-enabled"
						checked={isEgiszEnabled}
						onChange={(e) =>
							updateClinicProfileDraft("egiszEnabled", e.target.checked)
						}
						className="sr-only peer"
					/>
					<div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600" />
				</label>
			</div>

			{/* Автономный режим соло-врача (Мандат 8n) */}
			<div
				className="flex items-center justify-between pt-3 border-t border-[var(--line)]"
				data-testid="egisz-autonomous-mode-row"
			>
				<div className="space-y-0.5 pr-4">
					<div className="flex items-center gap-2">
						<span className="text-xs font-bold text-[var(--ink)] block">
							Автономный режим (без принудительной выгрузки в ЕГИСЗ)
						</span>
						<span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
							Мандат 8n
						</span>
					</div>
					<p className="text-[11px] text-[var(--muted)] m-0 leading-relaxed">
						Для соло-врачей и небольших клиник: все интеграционные проверки носят исключительно информационный характер. Сохранение приёма, печать протоколов и касса никогда не блокируются.
					</p>
				</div>
				<label className="relative inline-flex items-center cursor-pointer shrink-0">
					<input
						type="checkbox"
						data-testid="toggle-egisz-autonomous-mode"
						checked={isAutonomousMode}
						onChange={(e) =>
							updateClinicProfileDraft("egiszAutonomousMode", e.target.checked)
						}
						className="sr-only peer"
					/>
					<div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
				</label>
			</div>

			{/* Параметры подключения при активном адаптере */}
			{isEgiszEnabled && (
				<div className="space-y-4 pt-2">
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<label className="sm:col-span-2 flex flex-col gap-1.5 text-xs font-medium text-[var(--ink)]">
							<div className="flex items-center justify-between">
								<span>OID организации в реестре ФРМО</span>
								<a
									href="https://frmo.rosminzdrav.ru/"
									target="_blank"
									rel="noreferrer noopener"
									className="text-[11px] text-[var(--teal)] hover:underline inline-flex items-center gap-1"
								>
									<span>Паспорт ФРМО</span>
									<ExternalLink size={11} aria-hidden="true" />
								</a>
							</div>
							<input
								type="text"
								data-testid="input-egisz-oid"
								placeholder="1.2.643.5.1.13.3.25.77..."
								value={oid}
								onChange={(e) =>
									updateClinicProfileDraft("egiszOid", e.target.value.trim())
								}
								className={`w-full px-3 py-2 rounded-lg border text-sm bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-teal-500/30 ${
									oid && !oidValidation.isValid
										? "border-amber-500"
										: "border-[var(--line)]"
								}`}
							/>
							<small className="text-[11px] text-[var(--muted)]">
								{oid && !oidValidation.isValid
									? oidValidation.message
									: "Уникальный идентификатор объекта в номенклатуре Минздрава РФ"}
							</small>
						</label>

						<label className="flex flex-col gap-1.5 text-xs font-medium text-[var(--ink)]">
							<span className="flex items-center gap-1.5">
								<KeyRound size={13} className="text-[var(--teal)]" />
								<span>Отпечаток сертификата ЭЦП организации (Thumbprint)</span>
							</span>
							<input
								type="text"
								placeholder="a4f89d3c5e7b1a2f..."
								value={clinicProfileDraft.egiszCertThumbprint || ""}
								onChange={(e) =>
									updateClinicProfileDraft(
										"egiszCertThumbprint",
										e.target.value.trim(),
									)
								}
								className="w-full px-3 py-2 rounded-lg border border-[var(--line)] text-sm bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-teal-500/30 font-mono text-xs"
							/>
							<small className="text-[11px] text-[var(--muted)]">
								КриптоПро CSP ГОСТ Р 34.10-2012 для автоматического подписания
							</small>
						</label>

						<div className="flex flex-col justify-center p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
							<div className="flex items-center justify-between">
								<div className="space-y-0.5">
									<span className="text-xs font-bold text-[var(--ink)] block">
										Тестовый контур (Песочница)
									</span>
									<span className="text-[11px] text-[var(--muted)] block">
										Отправка в тестовый контур ЕГИСЗ без фиксации в РЭМД
									</span>
								</div>
								<label className="relative inline-flex items-center cursor-pointer">
									<input
										type="checkbox"
										checked={isTestMode}
										onChange={(e) =>
											updateClinicProfileDraft("egiszTestMode", e.target.checked)
										}
										className="sr-only peer"
									/>
									<div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600" />
								</label>
							</div>
						</div>
					</div>

					<div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 flex items-start gap-2.5">
						<ShieldAlert size={16} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
						<p className="text-xs text-[var(--ink)] m-0 leading-relaxed">
							При сохранении протокола приёма врача подписывается электронный документ стандарта CDA R3 и ставится в тихую фоновую очередь отправки. Врач не ждет ответа сервера ЕГИСЗ.
						</p>
					</div>
				</div>
			)}

			{isAutonomousMode && (
				<div
					className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex items-start gap-2.5"
					data-testid="egisz-autonomous-banner"
				>
					<ShieldCheck size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
					<div className="space-y-0.5">
						<strong className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 block">
							Автономный режим активен: полная автономия врача (Мандаты 8e и 8n)
						</strong>
						<p className="text-xs text-[var(--ink)] m-0 leading-relaxed">
							Приём пациентов, сохранение дневника, печать протоколов и касса 54-ФЗ работают без блокировок шлюза. Документы подписываются локально и ставятся в очередь отправки в РЭМД без задержек у кресла.
						</p>
					</div>
				</div>
			)}
		</article>
	);
};

export default ClinicEgiszBindingCard;
