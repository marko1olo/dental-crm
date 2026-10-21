/**
 * apps/web/src/components/settings/clinic/legalModules/ClinicRequisitesCard.tsx
 *
 * Clinic legal & banking requisites: INN, KPP, OGRN/OGRNIP,
 * bank details (BIK, settlement account), and contract signatories.
 *
 * Implements Scale Sovereignty: Solo Doctor (IP without KPP) and Network Clinic (OOO).
 * Mandates 8b, 8c, 8d, 8e, 8n: Desktop density, <= 500 lines, WCAG AAA.
 */

import React from "react";
import { Building, CheckCircle2, CreditCard, HelpCircle, UserCheck } from "lucide-react";
import {
	validateBik,
	validateCheckingAccount,
	validateInn,
	validateKpp,
	validateOgrn,
} from "./clinicLegalTypes";

export interface ClinicRequisitesCardProps {
	clinicProfileDraft: Record<string, any>;
	updateClinicProfileDraft: (field: string, value: any) => void;
}

export const ClinicRequisitesCard: React.FC<ClinicRequisitesCardProps> = ({
	clinicProfileDraft,
	updateClinicProfileDraft,
}) => {
	const inn = clinicProfileDraft.inn || "";
	const kpp = clinicProfileDraft.kpp || "";
	const ogrn = clinicProfileDraft.ogrn || "";
	const bik = clinicProfileDraft.bik || "";
	const checkingAccount = clinicProfileDraft.checkingAccount || "";

	const innValidation = validateInn(inn);
	const isIp = innValidation.type === "physical" || inn.length === 12;
	const kppValidation = validateKpp(kpp, isIp);
	const ogrnValidation = validateOgrn(ogrn);
	const bikValidation = validateBik(bik);
	const accValidation = validateCheckingAccount(checkingAccount, bik);

	return (
		<article
			className="p-4 sm:p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] space-y-5"
			data-testid="clinic-requisites-card"
		>
			<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-[var(--line)]">
				<div className="flex items-center gap-2.5">
					<div className="w-8 h-8 rounded-lg bg-[var(--teal)]/10 text-[var(--teal)] flex items-center justify-center shrink-0">
						<Building size={18} aria-hidden="true" />
					</div>
					<div>
						<h4 className="text-sm font-bold text-[var(--ink)] m-0">
							Юридические и банковские реквизиты
						</h4>
						<p className="text-xs text-[var(--muted)] m-0 mt-0.5">
							Данные для автоматической генерации договоров, актов, счетов и фискальных чеков
						</p>
					</div>
				</div>
				<div className="flex items-center gap-1.5">
					<span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[var(--paper-soft)] text-[var(--muted)] border border-[var(--line)]">
						{isIp ? "Форма: ИП (Соло-врач)" : "Форма: Юрлицо (ООО/АО)"}
					</span>
				</div>
			</div>

			{/* Основные регистрационные данные */}
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<label className="sm:col-span-2 flex flex-col gap-1.5 text-xs font-medium text-[var(--ink)]">
					<span>Полное юридическое наименование организации или ИП</span>
					<input
						type="text"
						data-testid="input-clinic-legal-name"
						placeholder={isIp ? "Индивидуальный предприниматель Иванов Иван Иванович" : "Общество с ограниченной ответственностью «ДЕНТЕ»"}
						value={clinicProfileDraft.legalName || ""}
						onChange={(e) => updateClinicProfileDraft("legalName", e.target.value)}
						className="w-full px-3 py-2 rounded-lg border border-[var(--line)] text-sm bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-teal-500/30"
					/>
					<small className="text-[11px] text-[var(--muted)]">
						Вносится точно как в выписке ЕГРЮЛ / ЕГРИП
					</small>
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
						type="text"
						inputMode="numeric"
						data-testid="input-clinic-inn"
						placeholder="7701234567"
						value={inn}
						onChange={(e) =>
							updateClinicProfileDraft(
								"inn",
								e.target.value.replace(/[^\d]/g, "").slice(0, 12),
							)
						}
						className={`w-full px-3 py-2 rounded-lg border text-sm bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-teal-500/30 ${
							inn && !innValidation.isValid ? "border-amber-500" : "border-[var(--line)]"
						}`}
					/>
					<small className="text-[11px] text-[var(--muted)]">
						{inn && !innValidation.isValid ? innValidation.message : "Идентификационный номер налогоплательщика"}
					</small>
				</label>

				<label className="flex flex-col gap-1.5 text-xs font-medium text-[var(--ink)]">
					<div className="flex items-center justify-between">
						<span>КПП (Код причины постановки)</span>
						{isIp && (
							<span className="text-[11px] text-[var(--muted)] font-normal">
								Не требуется для ИП
							</span>
						)}
					</div>
					<input
						type="text"
						inputMode="numeric"
						data-testid="input-clinic-kpp"
						placeholder={isIp ? "Для ИП КПП отсутствует" : "770101001"}
						disabled={isIp}
						value={isIp ? "" : kpp}
						onChange={(e) =>
							updateClinicProfileDraft(
								"kpp",
								e.target.value.replace(/[^\d]/g, "").slice(0, 9),
							)
						}
						className={`w-full px-3 py-2 rounded-lg border text-sm bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-teal-500/30 ${
							isIp ? "opacity-60 bg-[var(--paper-soft)] cursor-not-allowed" : kpp && !kppValidation.isValid ? "border-amber-500" : "border-[var(--line)]"
						}`}
					/>
					<small className="text-[11px] text-[var(--muted)]">
						{isIp
							? "Индивидуальные предприниматели работают без КПП (Мандат 8n)"
							: kpp && !kppValidation.isValid
								? kppValidation.message
								: "9 цифр для юридических лиц"}
					</small>
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
						type="text"
						inputMode="numeric"
						data-testid="input-clinic-ogrn"
						placeholder={isIp ? "321774600123456 (15 цифр)" : "1027700123456 (13 цифр)"}
						value={ogrn}
						onChange={(e) =>
							updateClinicProfileDraft(
								"ogrn",
								e.target.value.replace(/[^\d]/g, "").slice(0, 15),
							)
						}
						className={`w-full px-3 py-2 rounded-lg border text-sm bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-teal-500/30 ${
							ogrn && !ogrnValidation.isValid ? "border-amber-500" : "border-[var(--line)]"
						}`}
					/>
					<small className="text-[11px] text-[var(--muted)]">
						{ogrn && !ogrnValidation.isValid ? ogrnValidation.message : "Основной государственный регистрационный номер"}
					</small>
				</label>

				<label className="flex flex-col gap-1.5 text-xs font-medium text-[var(--ink)]">
					<span>Официальный Email клиники</span>
					<input
						type="email"
						data-testid="input-clinic-email"
						placeholder="info@clinic-dente.ru"
						value={clinicProfileDraft.email || ""}
						onChange={(e) => updateClinicProfileDraft("email", e.target.value)}
						className="w-full px-3 py-2 rounded-lg border border-[var(--line)] text-sm bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-teal-500/30"
					/>
					<small className="text-[11px] text-[var(--muted)]">
						Для отправки чеков, справок об оплате и договоров
					</small>
				</label>
			</div>

			{/* Банковские реквизиты */}
			<div className="pt-3 border-t border-[var(--line)] space-y-3">
				<div className="flex items-center gap-2">
					<CreditCard size={16} className="text-[var(--teal)]" aria-hidden="true" />
					<span className="text-xs font-bold text-[var(--ink)]">
						Банковские реквизиты для безналичных расчетов
					</span>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
					<label className="flex flex-col gap-1 text-xs font-medium text-[var(--ink)]">
						<div className="flex items-center justify-between">
							<span>БИК Банка</span>
							{bik && bikValidation.isValid && (
								<span className="text-[11px] text-teal-600 dark:text-teal-400 font-semibold inline-flex items-center gap-1">
									<CheckCircle2 size={12} /> Корректен
								</span>
							)}
						</div>
						<input
							type="text"
							inputMode="numeric"
							data-testid="input-clinic-bik"
							placeholder="044525225"
							value={bik}
							onChange={(e) =>
								updateClinicProfileDraft(
									"bik",
									e.target.value.replace(/[^\d]/g, "").slice(0, 9),
								)
							}
							className={`w-full px-3 py-2 rounded-lg border text-sm bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-teal-500/30 ${
								bik && !bikValidation.isValid ? "border-amber-500" : "border-[var(--line)]"
							}`}
						/>
						<small className="text-[11px] text-[var(--muted)]">9 цифр, код ЦБ РФ</small>
					</label>

					<label className="sm:col-span-2 flex flex-col gap-1 text-xs font-medium text-[var(--ink)]">
						<div className="flex items-center justify-between">
							<span>Расчетный счет (р/с)</span>
							{checkingAccount && accValidation.isValid && (
								<span className="text-[11px] text-teal-600 dark:text-teal-400 font-semibold inline-flex items-center gap-1">
									<CheckCircle2 size={12} /> Корректен
								</span>
							)}
						</div>
						<input
							type="text"
							inputMode="numeric"
							data-testid="input-clinic-checking-account"
							placeholder="40702810000000000000"
							value={checkingAccount}
							onChange={(e) =>
								updateClinicProfileDraft(
									"checkingAccount",
									e.target.value.replace(/[^\d]/g, "").slice(0, 20),
								)
							}
							className={`w-full px-3 py-2 rounded-lg border text-sm bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-teal-500/30 ${
								checkingAccount && !accValidation.isValid ? "border-amber-500" : "border-[var(--line)]"
							}`}
						/>
						<small className="text-[10px] text-[var(--muted)]">20 цифр в валюте РФ</small>
					</label>
				</div>
			</div>

			{/* Подписант договоров */}
			<div className="pt-3 border-t border-[var(--line)] space-y-3">
				<div className="flex items-center gap-2">
					<UserCheck size={16} className="text-[var(--teal)]" aria-hidden="true" />
					<span className="text-xs font-bold text-[var(--ink)]">
						Подписант документов со стороны клиники
					</span>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
					<label className="flex flex-col gap-1 text-xs font-medium text-[var(--ink)]">
						<span>ФИО подписанта</span>
						<input
							type="text"
							placeholder="Иванов Михаил Сергеевич"
							value={clinicProfileDraft.signatoryName || ""}
							onChange={(e) => updateClinicProfileDraft("signatoryName", e.target.value)}
							className="w-full px-3 py-2 rounded-lg border border-[var(--line)] text-sm bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-teal-500/30"
						/>
						<small className="text-[10px] text-[var(--muted)]">
							Выводится в блоке «Исполнитель» договоров
						</small>
					</label>

					<label className="flex flex-col gap-1 text-xs font-medium text-[var(--ink)]">
						<span>Должность подписанта</span>
						<input
							type="text"
							placeholder={isIp ? "Индивидуальный предприниматель" : "Генеральный директор"}
							value={clinicProfileDraft.signatoryTitle || ""}
							onChange={(e) => updateClinicProfileDraft("signatoryTitle", e.target.value)}
							className="w-full px-3 py-2 rounded-lg border border-[var(--line)] text-sm bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-teal-500/30"
						/>
						<small className="text-[10px] text-[var(--muted)]">
							Действует на основании Устава или листа записи ЕГРИП
						</small>
					</label>
				</div>
			</div>
		</article>
	);
};

export default ClinicRequisitesCard;
