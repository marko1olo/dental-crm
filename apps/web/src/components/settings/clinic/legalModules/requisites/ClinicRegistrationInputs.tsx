import { CheckCircle2 } from "lucide-react";
import React from "react";
import { validateInn, validateKpp, validateOgrn } from "../clinicLegalTypes";

interface ClinicRegistrationInputsProps {
	clinicProfileDraft: Record<string, any>;
	updateClinicProfileDraft: (field: string, value: any) => void;
	isIp: boolean;
	inn: string;
	kpp: string;
	ogrn: string;
}

export function ClinicRegistrationInputs({
	clinicProfileDraft, updateClinicProfileDraft, isIp, inn, kpp, ogrn,
}: ClinicRegistrationInputsProps) {
	const innValidation = validateInn(inn);
	const kppValidation = validateKpp(kpp, isIp);
	const ogrnValidation = validateOgrn(ogrn);

	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
			<label className="sm:col-span-2 flex flex-col gap-1.5 text-xs font-medium text-[var(--ink)]">
				<span>Полное юридическое наименование организации или ИП</span>
				<input
					type="text" data-testid="input-clinic-legal-name"
					placeholder={isIp ? "Индивидуальный предприниматель Иванов Иван Иванович" : "Общество с ограниченной ответственностью «ДЕНТЕ»"}
					value={clinicProfileDraft.legalName || ""} onChange={(e) => updateClinicProfileDraft("legalName", e.target.value)}
					className="w-full px-3 py-2 rounded-lg border border-[var(--line)] text-sm bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-teal-500/30"
				/>
				<small className="text-[11px] text-[var(--muted)]">Вносится точно как в выписке ЕГРЮЛ / ЕГРИП</small>
			</label>

			<label className="flex flex-col gap-1.5 text-xs font-medium text-[var(--ink)]">
				<div className="flex items-center justify-between">
					<span>ИНН (10 цифр для ООО, 12 для ИП)</span>
					{inn && innValidation.isValid && (
						<span className="text-[11px] text-teal-600 dark:text-teal-400 font-semibold inline-flex items-center gap-1">
							<CheckCircle2 size={12} /> Корректен
						</span>
					)}
				</div>
				<input
					type="text" inputMode="numeric" data-testid="input-clinic-inn" placeholder="7701234567" value={inn}
					onChange={(e) => updateClinicProfileDraft("inn", e.target.value.replace(/[^\d]/g, "").slice(0, 12))}
					className={`w-full px-3 py-2 rounded-lg border text-sm bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-teal-500/30 ${inn && !innValidation.isValid ? "border-amber-500" : "border-[var(--line)]"}`}
				/>
				<small className="text-[11px] text-[var(--muted)]">{inn && !innValidation.isValid ? innValidation.message : "Идентификационный номер налогоплательщика"}</small>
			</label>

			<label className="flex flex-col gap-1.5 text-xs font-medium text-[var(--ink)]">
				<div className="flex items-center justify-between">
					<span>КПП (Код причины постановки)</span>
					{isIp && <span className="text-[11px] text-[var(--muted)] font-normal">Не требуется для ИП</span>}
				</div>
				<input
					type="text" inputMode="numeric" data-testid="input-clinic-kpp" placeholder={isIp ? "Для ИП КПП отсутствует" : "770101001"}
					disabled={isIp} value={isIp ? "" : kpp}
					onChange={(e) => updateClinicProfileDraft("kpp", e.target.value.replace(/[^\d]/g, "").slice(0, 9))}
					className={`w-full px-3 py-2 rounded-lg border text-sm bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-teal-500/30 ${isIp ? "opacity-60 bg-[var(--paper-soft)] cursor-not-allowed" : kpp && !kppValidation.isValid ? "border-amber-500" : "border-[var(--line)]"}`}
				/>
				<small className="text-[11px] text-[var(--muted)]">{isIp ? "Индивидуальные предприниматели работают без КПП (Мандат 8n)" : kpp && !kppValidation.isValid ? kppValidation.message : "9 цифр для юридических лиц"}</small>
			</label>

			<label className="flex flex-col gap-1.5 text-xs font-medium text-[var(--ink)]">
				<div className="flex items-center justify-between">
					<span>ОГРН / ОГРНИП</span>
					{ogrn && ogrnValidation.isValid && (
						<span className="text-[11px] text-teal-600 dark:text-teal-400 font-semibold inline-flex items-center gap-1">
							<CheckCircle2 size={12} /> Корректен
						</span>
					)}
				</div>
				<input
					type="text" inputMode="numeric" data-testid="input-clinic-ogrn" placeholder={isIp ? "321774600123456 (15 цифр)" : "1027700123456 (13 цифр)"}
					value={ogrn} onChange={(e) => updateClinicProfileDraft("ogrn", e.target.value.replace(/[^\d]/g, "").slice(0, 15))}
					className={`w-full px-3 py-2 rounded-lg border text-sm bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-teal-500/30 ${ogrn && !ogrnValidation.isValid ? "border-amber-500" : "border-[var(--line)]"}`}
				/>
				<small className="text-[11px] text-[var(--muted)]">{ogrn && !ogrnValidation.isValid ? ogrnValidation.message : "Основной государственный регистрационный номер"}</small>
			</label>

			<label className="flex flex-col gap-1.5 text-xs font-medium text-[var(--ink)]">
				<span>Официальный Email клиники</span>
				<input
					type="email" data-testid="input-clinic-email" placeholder="info@clinic-dente.ru" value={clinicProfileDraft.email || ""}
					onChange={(e) => updateClinicProfileDraft("email", e.target.value)}
					className="w-full px-3 py-2 rounded-lg border border-[var(--line)] text-sm bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-teal-500/30"
				/>
				<small className="text-[11px] text-[var(--muted)]">Для отправки чеков, справок об оплате и договоров</small>
			</label>
		</div>
	);
}
