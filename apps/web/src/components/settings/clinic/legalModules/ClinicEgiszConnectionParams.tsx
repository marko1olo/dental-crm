import React from "react";
import { ExternalLink, KeyRound, ShieldAlert } from "lucide-react";
import type { LicenseValidationResult } from "./clinicLegalTypes";

interface ClinicEgiszConnectionParamsProps {
	oid: string;
	oidValidation: LicenseValidationResult;
	isTestMode: boolean;
	certThumbprint: string;
	updateClinicProfileDraft: (field: string, value: any) => void;
}

export const ClinicEgiszConnectionParams: React.FC<ClinicEgiszConnectionParamsProps> = ({
	oid,
	oidValidation,
	isTestMode,
	certThumbprint,
	updateClinicProfileDraft,
}) => {
	return (
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
						onChange={(e) => updateClinicProfileDraft("egiszOid", e.target.value.trim())}
						className={`w-full px-3 py-2 rounded-lg border text-sm bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-teal-500/30 ${
							oid && !oidValidation.isValid ? "border-amber-500" : "border-[var(--line)]"
						}`}
					/>
					<small className="text-[11px] text-[var(--muted)]">
						{oid && !oidValidation.isValid ? oidValidation.message : "Уникальный идентификатор объекта в номенклатуре Минздрава РФ"}
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
						value={certThumbprint}
						onChange={(e) => updateClinicProfileDraft("egiszCertThumbprint", e.target.value.trim())}
						className="w-full px-3 py-2 rounded-lg border border-[var(--line)] text-sm bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-teal-500/30 font-mono text-xs"
					/>
					<small className="text-[11px] text-[var(--muted)]">
						КриптоПро CSP ГОСТ Р 34.10-2012 для автоматического подписания
					</small>
				</label>

				<div className="flex flex-col justify-center p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
					<div className="flex items-center justify-between">
						<div className="space-y-0.5">
							<span className="text-xs font-bold text-[var(--ink)] block">Тестовый контур (Песочница)</span>
							<span className="text-[11px] text-[var(--muted)] block">Отправка в тестовый контур ЕГИСЗ без фиксации в РЭМД</span>
						</div>
						<label className="relative inline-flex items-center cursor-pointer">
							<input
								type="checkbox"
								checked={isTestMode}
								onChange={(e) => updateClinicProfileDraft("egiszTestMode", e.target.checked)}
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
	);
};
