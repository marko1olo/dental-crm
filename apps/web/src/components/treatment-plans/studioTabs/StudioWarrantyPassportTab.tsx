/**
 * StudioWarrantyPassportTab.tsx — Вкладка «Гарантийный паспорт и срок службы» в студии планов лечения (SSOT).
 * Мандаты 8b, 8e, 8x: Чистый клинический язык без канцелярита, автономия врача, 0 disabled кнопок.
 * Канонические сроки: Эконом — 1 год / 5 лет, Оптимум — 3 года / 10 лет, Премиум — 10 лет / 25 лет.
 */

import React from "react";
import { ShieldCheck, Award, Calendar, CheckCircle2, FileText, Printer, Sparkles } from "lucide-react";
import type { TreatmentPlanTier } from "../treatmentPlanTypes";

export interface StudioWarrantyPassportTabProps {
	readonly activeTier: TreatmentPlanTier;
	readonly patientName?: string;
	readonly doctorFullName?: string;
}

export const StudioWarrantyPassportTab: React.FC<StudioWarrantyPassportTabProps> = ({
	activeTier,
	patientName = "Пациент",
	doctorFullName = "Лечащий врач",
}) => {
	const sanitizedTitle = activeTier.title.replace(/^[^a-zA-Zа-яА-Я0-9]+/, "");

	// Определение сервисных сроков по тарифу
	const serviceLifeYears = activeTier.tierId === "premium" ? 25 : activeTier.tierId === "optimum" ? 10 : 5;
	const materialStandards =
		activeTier.tierId === "premium"
			? [
					{ name: "Имплантационная система Straumann Roxolid SLActive (Швейцария)", cert: "ISO 13485 / CE 0123", warranty: "Пожизненная гарантия завода" },
					{ name: "Высокотранслюцентный диоксид циркония Katana ML (Япония)", cert: "Многослойный градиент прочности 1100 МПа", warranty: "10 лет клинической стойкости" },
					{ name: "Премиальная прессованная керамика IPS e.max Ivoclar", cert: "Медицинский дисиликат лития 530 МПа", warranty: "10 лет клинической гарантии" },
				]
			: activeTier.tierId === "optimum"
				? [
						{ name: "Керамические коронки и виниры Ivoclar Vivadent e.max CAD", cert: "Дисиликат лития / CAD-CAM фрезерование", warranty: "3 года гарантии клиники" },
						{ name: "Дентальные имплантаты с гидрофильной поверхностью (Osstem / Dentium)", cert: "SLA поверхность / ISO 13485", warranty: "Гарантия производителя 15 лет" },
						{ name: "Наногибридный японский композит светового отверждения (Estelite Quick / Filtek)", cert: "Субмикронный сферический наполнитель 82%", warranty: "3 года гарантии клиники" },
					]
				: [
						{ name: "Светоотверждаемый наногибридный композит (GC Gradia Direct)", cert: "ГОСТ Р 56924-2016 / CE", warranty: "1 год клинической гарантии" },
						{ name: "Металлокерамические коронки с Co-Cr каркасом без никеля (Duceram Plus)", cert: "Медицинский сплав Co-Cr", warranty: "1 год клинической гарантии" },
						{ name: "Стандартная имплантационная система базового класса", cert: "Остеокондуктивная титановая резьба", warranty: "1 год гарантии" },
					];

	return (
		<div className="space-y-5 max-w-3xl mx-auto" data-testid="studio-warranty-passport-tab">
			{/* 1. Главная карточка гарантийного статуса */}
			<div className="p-5 rounded-2xl border-2 border-[var(--teal,#0d9488)] bg-[var(--paper-soft)] shadow-xs space-y-4">
				<div className="flex items-center justify-between flex-wrap gap-3">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-xl bg-[var(--teal-soft,rgba(13,148,136,0.15))] text-[var(--teal,#0d9488)] flex items-center justify-center shrink-0">
							<ShieldCheck className="w-6 h-6" />
						</div>
						<div>
							<span className="text-[11px] font-bold text-[var(--teal,#0d9488)] uppercase tracking-wider block">
								Гарантийный сертификат качества DENTE
							</span>
							<h3 className="text-base sm:text-lg font-black text-[var(--ink)] m-0 flex items-center gap-1.5">
								{activeTier.isRecommended && <Sparkles className="w-4 h-4 text-amber-500 fill-amber-400 shrink-0" />}
								<span>Тариф «{sanitizedTitle}»</span>
							</h3>
						</div>
					</div>

					<button
						type="button"
						onClick={() => typeof window !== "undefined" && window.print()}
						className="min-h-[40px] px-3.5 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--line-subtle)] text-xs font-bold text-[var(--ink)] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
						data-testid="print-warranty-passport-btn"
					>
						<Printer className="w-4 h-4 text-[var(--muted)]" />
						<span>Печать гарантийного паспорта</span>
					</button>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[var(--line)]">
					<div className="p-3 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex items-center gap-3">
						<Award className="w-5 h-5 text-[var(--teal,#0d9488)] shrink-0" />
						<div>
							<div className="text-[11px] text-[var(--muted)] font-medium">Безусловная гарантия клиники</div>
							<div className="text-base font-black text-[var(--ink)]">
								{`${activeTier.warrantyYears} ${activeTier.warrantyYears === 1 ? "год" : activeTier.warrantyYears === 3 ? "года" : "лет"}`}
							</div>
						</div>
					</div>

					<div className="p-3 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex items-center gap-3">
						<Calendar className="w-5 h-5 text-[var(--teal,#0d9488)] shrink-0" />
						<div>
							<div className="text-[11px] text-[var(--muted)] font-medium">Прогнозируемый срок службы</div>
							<div className="text-base font-black text-[var(--ink)]">
								{`до ${serviceLifeYears} лет службы`}
							</div>
						</div>
					</div>
				</div>

				<div className="text-xs text-[var(--muted)] leading-relaxed">
					Пациент: <strong className="text-[var(--ink)]">{patientName}</strong> · Лечащий врач:{" "}
					<strong className="text-[var(--ink)]">{doctorFullName}</strong>.
					При возникновении любых вопросов по состоянию пломб, коронок или имплантатов гарантийное обслуживание проводится бесплатно в приоритетном порядке.
				</div>
			</div>

			{/* 2. Сертификаты и спецификация материалов */}
			<div className="p-5 rounded-2xl border border-[var(--line)] bg-[var(--paper)] space-y-3">
				<h4 className="text-xs sm:text-sm font-bold text-[var(--ink)] m-0 flex items-center gap-2">
					<FileText className="w-4 h-4 text-[var(--teal,#0d9488)]" />
					<span>Сертифицированные биосовместимые материалы тарифа</span>
				</h4>

				<div className="space-y-2.5">
					{materialStandards.map((mat, idx) => (
						<div key={idx} className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex items-start justify-between gap-3 text-xs">
							<div className="space-y-0.5 min-w-0">
								<div className="font-bold text-[var(--ink)]">{mat.name}</div>
								<div className="text-[11px] text-[var(--muted)]">{mat.cert}</div>
							</div>
							<span className="text-[11px] font-bold text-[var(--teal,#0d9488)] bg-[var(--teal-soft,rgba(13,148,136,0.1))] px-2 py-0.5 rounded-md shrink-0">
								{mat.warranty}
							</span>
						</div>
					))}
				</div>
			</div>

			{/* 3. Условия сохранения и пролонгации гарантии */}
			<div className="p-5 rounded-2xl border border-[var(--line)] bg-[var(--paper-soft)] space-y-3">
				<h4 className="text-xs sm:text-sm font-bold text-[var(--ink)] m-0 flex items-center gap-2">
					<CheckCircle2 className="w-4 h-4 text-[var(--teal,#0d9488)]" />
					<span>Простые правила сохранения гарантии</span>
				</h4>

				<ul className="space-y-2 text-xs text-[var(--muted)] m-0 pl-0 list-none">
					<li className="flex items-start gap-2">
						<CheckCircle2 className="w-4 h-4 text-[var(--teal,#0d9488)] shrink-0 mt-0.5" />
						<span>Контрольный осмотр и профессиональная гигиена полости рта 1 раз в 6 месяцев.</span>
					</li>
					<li className="flex items-start gap-2">
						<CheckCircle2 className="w-4 h-4 text-[var(--teal,#0d9488)] shrink-0 mt-0.5" />
						<span>Соблюдение индивидуальных рекомендаций лечащего врача по ежедневной домашней гигиене.</span>
					</li>
					<li className="flex items-start gap-2">
						<CheckCircle2 className="w-4 h-4 text-[var(--teal,#0d9488)] shrink-0 mt-0.5" />
						<span>Своевременное обращение в клинику при возникновении дискомфорта без самостоятельного вмешательства.</span>
					</li>
				</ul>
			</div>
		</div>
	);
};

export default StudioWarrantyPassportTab;
