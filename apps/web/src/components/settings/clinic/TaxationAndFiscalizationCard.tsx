/**
 * apps/web/src/components/settings/clinic/TaxationAndFiscalizationCard.tsx
 *
 * Налогообложение (СНО) и фискализация кассы по 54-ФЗ / ФФД 1.2:
 * - Выбор режима СНО: УСН 6% (Доходы), УСН 15% (Доходы-расходы), Патент (ПСН), ОСНО
 * - Признаки расчетов по 54-ФЗ: Медуслуги (освобождение от НДС ст. 149 НК РФ), товары (НДС 20%)
 * - Методы сплит-платежей: Наличные, POS-эквайринг, СБП QR, расчетный счет, ДМС, депозит
 * - Суверенитет масштаба (Мандат 8s) & Докторская автономия: 1-клик чекаут без обязательного ИНН физлица,
 *   нулевые тупики при сбоях связи с ОФД (очередь в ФН).
 *
 * Мандаты 8b, 8d, 8n, 8s: строго <= 800 строк, ноль мультяшных эмодзи.
 */

import {
	Building2,
	CheckCircle2,
	CreditCard,
	Info,
	QrCode,
	Receipt,
	Scale,
	ShieldCheck,
	Wallet,
	Zap,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { showToast } from "../../GlobalToast";

export type TaxationSystem = "usn_income" | "usn_income_expense" | "patent" | "osno";

interface TaxationSystemConfig {
	id: TaxationSystem;
	name: string;
	shortName: string;
	rateDescription: string;
	vatRule: string;
	recommendedFor: string;
}

const TAXATION_SYSTEMS: TaxationSystemConfig[] = [
	{
		id: "usn_income",
		name: "УСН «Доходы» (6%)",
		shortName: "УСН Доходы",
		rateDescription: "Ставка налога 6% от всей выручки клиники",
		vatRule: "Без НДС (ст. 346.11 НК РФ)",
		recommendedFor: "Рекомендуется для соло-врачей и небольших клиник на 1–3 кресла с умеренными расходами на материалы",
	},
	{
		id: "usn_income_expense",
		name: "УСН «Доходы минус расходы» (15%)",
		shortName: "УСН Доходы–Расходы",
		rateDescription: "Ставка налога 15% от операционной прибыли клиники",
		vatRule: "Без НДС (ст. 346.11 НК РФ)",
		recommendedFor: "Рекомендуется для хирургии, имплантологии и клиник с собственной зуботехнической лабораторией",
	},
	{
		id: "patent",
		name: "Патентная система налогообложения (ПСН)",
		shortName: "Патент (ПСН)",
		rateDescription: "Фиксированная стоимость патента на стоматологические услуги",
		vatRule: "Без НДС (ст. 346.43 НК РФ)",
		recommendedFor: "Доступно для ИП со штатом до 15 человек и годовым доходом до 60 млн ₽",
	},
	{
		id: "osno",
		name: "Общая система налогообложения (ОСНО)",
		shortName: "ОСНО",
		rateDescription: "Налог на прибыль 20% / НДФЛ + сопутствующий НДС",
		vatRule: "Медуслуги: Без НДС; Сопутствующие товары: НДС 20%",
		recommendedFor: "Крупные медицинские центры и сетевые клиники с выручкой свыше 450 млн ₽",
	},
];

export const TaxationAndFiscalizationCard: React.FC = () => {
	const [activeTaxation, setActiveTaxation] = useState<TaxationSystem>("usn_income");
	const [ofdProvider, setOfdProvider] = useState("platform_ofd");
	const [ffdVersion, setFfdVersion] = useState("1.2");
	const [autoSendReceipt, setAutoSendReceipt] = useState(true);
	const [allowAutonomousBuffer, setAllowAutonomousBuffer] = useState(true);

	const handleSaveTaxation = () => {
		showToast("Настройки налогообложения и кассы успешно сохранены", "success");
	};

	const currentSystem = TAXATION_SYSTEMS.find((s) => s.id === activeTaxation)!;

	return (
		<div className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5 space-y-5 shadow-xs">
			{/* Header */}
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--line)] pb-4">
				<div className="flex items-center gap-3">
					<div className="w-10 h-10 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
						<Receipt size={22} />
					</div>
					<div>
						<div className="flex items-center gap-2">
							<h4 className="font-bold text-base text-[var(--ink)]">
								Налогообложение (СНО) и касса
							</h4>
							<span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30">
								Протокол кассы {ffdVersion}
							</span>
						</div>
						<p className="text-xs text-[var(--muted)] mt-0.5">
							Конфигурация кассового аппарата (ККТ), системы налогообложения и льгот по НДС
						</p>
					</div>
				</div>

				<button
					type="button"
					onClick={handleSaveTaxation}
					className="primary-button text-xs h-8 px-3.5 self-start sm:self-auto"
				>
					<CheckCircle2 size={14} />
					<span>Применить СНО</span>
				</button>
			</div>

			{/* Taxation System Selector */}
			<div className="space-y-3">
				<label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
					<Scale size={14} className="text-amber-600" />
					Система налогообложения клиники:
				</label>
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
					{TAXATION_SYSTEMS.map((system) => {
						const isSelected = activeTaxation === system.id;
						return (
							<button
								key={system.id}
								type="button"
								onClick={() => setActiveTaxation(system.id)}
								className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
									isSelected
										? "bg-teal-500/15 border-teal-500/50 shadow-xs ring-1 ring-teal-500/30 text-[var(--ink)]"
										: "bg-[var(--paper-soft)] border-[var(--line)] text-[var(--muted)] hover:border-teal-400"
								}`}
							>
								<div>
									<div className="flex items-center justify-between">
										<span className="font-bold text-xs text-[var(--ink)]">
											{system.shortName}
										</span>
										{isSelected && (
											<CheckCircle2 size={14} className="text-teal-600 shrink-0" />
										)}
									</div>
									<span className="text-[11px] text-[var(--muted)] block mt-1">
										{system.rateDescription}
									</span>
								</div>
								<div className="mt-3 pt-2 border-t border-[var(--line)]">
									<span className="text-[10px] font-mono text-teal-700 dark:text-teal-300 font-semibold block">
										{system.vatRule}
									</span>
								</div>
							</button>
						);
					})}
				</div>

				<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-xs text-[var(--muted)] flex items-start gap-2.5">
					<Info size={16} className="text-teal-600 shrink-0 mt-0.5" />
					<div>
						<strong className="text-[var(--ink)] block mb-0.5">
							{currentSystem.name}
						</strong>
						<span>{currentSystem.recommendedFor}</span>
					</div>
				</div>
			</div>

			{/* Accepted Payment Modes (54-FZ Split Payments) */}
			<div className="space-y-3 pt-2 border-t border-[var(--line)]">
				<label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
					<CreditCard size={14} className="text-blue-600" />
					Разрешенные способы расчетов (сплит-платежи):
				</label>
				<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
					{[
						{ label: "Наличные (ККТ)", icon: Wallet, tag: "1031" },
						{ label: "POS-эквайринг", icon: CreditCard, tag: "1081" },
						{ label: "СБП (по QR-коду)", icon: QrCode, tag: "1081" },
						{ label: "Безналичный счет", icon: Building2, tag: "1081" },
						{ label: "Возмещение ДМС", icon: ShieldCheck, tag: "1215" },
						{ label: "Семейный депозит", icon: Zap, tag: "1217" },
					].map((item) => {
						const Icon = item.icon;
						return (
							<div
								key={item.label}
								className="p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] flex flex-col items-center text-center gap-1"
							>
								<Icon size={16} className="text-[var(--ink)]" />
								<span className="text-[11px] font-bold text-[var(--ink)] leading-tight">
									{item.label}
								</span>
								<span className="text-[9px] font-mono text-[var(--muted)]">
									Тег {item.tag}
								</span>
							</div>
						);
					})}
				</div>
			</div>

			{/* Solo Doctor Autonomy & Zero Dead-Ends Banner (Mandate 8s) */}
			<div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent border border-emerald-500/25 space-y-2">
				<div className="flex items-center gap-2">
					<ShieldCheck size={16} className="text-emerald-600 shrink-0" />
					<span className="text-xs font-bold text-[var(--ink)]">
						Автономия соло-практики и бесперебойная работа кассы:
					</span>
				</div>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-[var(--muted)]">
					<div className="flex items-start gap-2">
						<div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
						<span>
							<strong className="text-[var(--ink)]">0-кликовый чекаут физлиц:</strong> Согласно 54-ФЗ, ИНН покупателя-физического лица не является обязательным реквизитом чека. Кассир и врач могут пробивать оплату мгновенно без бюрократических барьеров.
						</span>
					</div>
					<div className="flex items-start gap-2">
						<div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
						<span>
							<strong className="text-[var(--ink)]">Автономный буфер фискализации:</strong> При временном обрыве связи с ОФД или кассой чек сохраняется в защищенную локальную очередь и отправляется автоматически при восстановлении связи без остановки приема.
						</span>
					</div>
				</div>
			</div>

			{/* KKT & OFD Options Strip */}
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[var(--line)]">
				<div className="space-y-1.5">
					<label className="text-[11px] font-semibold text-[var(--muted)] block">
						Оператор фискальных данных (ОФД):
					</label>
					<select
						value={ofdProvider}
						onChange={(e) => setOfdProvider(e.target.value)}
						className="w-full text-xs p-2 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] outline-none"
					>
						<option value="platform_ofd">Платформа ОФД</option>
						<option value="first_ofd">Первый ОФД</option>
						<option value="taxcom">Такском ОФД</option>
						<option value="sbis">СБИС (Тензор)</option>
						<option value="kontur">Контур ОФД</option>
					</select>
				</div>

				<div className="space-y-1.5">
					<label className="text-[11px] font-semibold text-[var(--muted)] block">
						Версия кассового протокола:
					</label>
					<select
						value={ffdVersion}
						onChange={(e) => setFfdVersion(e.target.value)}
						className="w-full text-xs p-2 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] outline-none"
					>
						<option value="1.2">Стандартный протокол 1.2 (Поддержка Честный ЗНАК)</option>
						<option value="1.05">Протокол 1.05 (Устаревший)</option>
					</select>
				</div>

				<div className="flex flex-col justify-end space-y-1.5">
					<label className="flex items-center gap-2 text-xs text-[var(--ink)] cursor-pointer">
						<input
							type="checkbox"
							checked={autoSendReceipt}
							onChange={(e) => setAutoSendReceipt(e.target.checked)}
							className="rounded accent-teal-600"
						/>
						<span>Электронный чек по SMS/Email</span>
					</label>
					<label className="flex items-center gap-2 text-xs text-[var(--ink)] cursor-pointer">
						<input
							type="checkbox"
							checked={allowAutonomousBuffer}
							onChange={(e) => setAllowAutonomousBuffer(e.target.checked)}
							className="rounded accent-teal-600"
						/>
						<span>Автономный буфер чеков при сбое связи</span>
					</label>
				</div>
			</div>
		</div>
	);
};
