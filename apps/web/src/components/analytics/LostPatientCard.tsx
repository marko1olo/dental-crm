/**
 * Карточка пациента в зоне риска оттока.
 * Эргономика: 2 первичные кнопки (звонок, WhatsApp), вспомогательные действия в выпадающем меню (...).
 * Без эмодзи, с поддержкой дизайн-токенов темы.
 */

import {
	Archive,
	Calendar,
	MessageSquare,
	MoreHorizontal,
	Phone,
	Sparkles,
	UserCheck,
} from "lucide-react";
import React from "react";
import { formatPhoneNumber } from "../../utils/inputSanitation";
import { classifyChurnRisk } from "./analyticsWidgetData.js";
import type { LostPatientRow } from "./LostPatientOfferModal";

export interface LostPatientCardProps {
	readonly patient: LostPatientRow;
	readonly isOpenMenu: boolean;
	readonly onToggleMenu: () => void;
	readonly onOpenCard: (patientId: string) => void;
	readonly onGenerateOffer: (patient: LostPatientRow) => void;
}

export const LostPatientCard: React.FC<LostPatientCardProps> = ({
	patient,
	isOpenMenu,
	onToggleMenu,
	onOpenCard,
	onGenerateOffer,
}) => {
	const days =
		typeof patient?.daysSinceLastVisit === "number" &&
		!Number.isNaN(patient.daysSinceLastVisit)
			? patient.daysSinceLastVisit
			: 0;
	const risk = classifyChurnRisk(days, patient.lastTreatmentCategory);

	const badgeClass =
		risk.badgeTone === "bad"
			? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
			: risk.badgeTone === "warn"
				? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
				: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";

	const categoryTitle =
		patient.lastTreatmentCategory === "implantation"
			? "Имплантация"
			: patient.lastTreatmentCategory === "sanitation"
				? "Санация"
				: "Терапия";

	return (
		<div className="p-3 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] hover:border-[var(--teal)] transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-2 flex-wrap">
					<span className="font-semibold text-[var(--ink)] text-sm">
						{patient?.patientName && patient.patientName !== "Пациент"
							? patient.patientName
							: (patient?.patientName || "Пациент")}
					</span>
					<span
						className={`px-2 py-0.5 rounded border text-[11px] font-medium ${badgeClass}`}
					>
						{risk.bandLabel}
					</span>
					<span className="px-1.5 py-0.2 rounded bg-[var(--paper)] border border-[var(--line)] text-[10px] text-[var(--muted)]">
						{categoryTitle}
					</span>
				</div>

				<div className="flex items-center gap-3 text-[var(--muted)] text-[11px] mt-1 flex-wrap">
					<span className="flex items-center gap-1">
						<Phone className="w-3 h-3 text-[var(--teal)]" />
						{formatPhoneNumber(patient?.phone)}
					</span>
					<span>·</span>
					<span>
						{days <= 0
							? "Визит сегодня или нет записей"
							: `Без приёма ${days} дн.`}
					</span>
					<span>·</span>
					<span className="text-[var(--teal)]">
						{risk.recommendedService}
					</span>
				</div>
			</div>

			<div className="flex items-center gap-1.5 flex-shrink-0 relative">
				{/* Primary Action Button 1: Позвонить */}
				{patient?.phone ? (
					<a
						href={`tel:${patient.phone.replace(/[^\d+]/g, "")}`}
						className="px-2.5 py-1.5 rounded-lg bg-[var(--teal)] hover:bg-[var(--teal-dark,var(--teal))] text-white font-medium text-xs transition-colors flex items-center gap-1.5 shadow-sm touch-manipulation"
						title="Позвонить пациенту"
					>
						<Phone className="w-3.5 h-3.5" />
						<span>Позвонить</span>
					</a>
				) : (
					<span
						className="px-2.5 py-1.5 rounded-lg bg-[var(--paper-soft)] text-[var(--muted)] font-medium text-xs flex items-center gap-1.5 border border-[var(--line)] cursor-not-allowed opacity-60"
						title="Номер телефона не указан"
					>
						<Phone className="w-3.5 h-3.5" />
						<span>Позвонить</span>
					</span>
				)}

				{/* Primary Action Button 2: WhatsApp */}
				{patient?.phone ? (
					<a
						href={`https://wa.me/${patient.phone.replace(/\D/g, "")}`}
						target="_blank"
						rel="noopener noreferrer"
						className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs transition-colors flex items-center gap-1.5 shadow-sm touch-manipulation"
						title="Написать в WhatsApp"
					>
						<MessageSquare className="w-3.5 h-3.5" />
						<span>WhatsApp</span>
					</a>
				) : (
					<span
						className="px-2.5 py-1.5 rounded-lg bg-[var(--paper-soft)] text-[var(--muted)] font-medium text-xs flex items-center gap-1.5 border border-[var(--line)] cursor-not-allowed opacity-60"
						title="Номер телефона не указан"
					>
						<MessageSquare className="w-3.5 h-3.5" />
						<span>WhatsApp</span>
					</span>
				)}

				{/* Secondary Actions Dropdown Menu (...) - Hick's Law: max 2 direct buttons, 4+ auxiliary actions consolidated */}
				<div className="relative">
					<button
						type="button"
						onClick={onToggleMenu}
						className="p-1.5 min-h-[32px] min-w-[32px] rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:border-[var(--teal)] text-[var(--muted)] hover:text-[var(--ink)] transition-colors flex items-center justify-center cursor-pointer touch-manipulation"
						title="Дополнительные действия"
						aria-label="Дополнительные действия"
					>
						<MoreHorizontal className="w-4 h-4" />
					</button>

					{isOpenMenu && (
						<div
							className="absolute right-0 top-full mt-1 w-52 rounded-xl border border-[var(--line)] bg-[var(--paper-strong,var(--paper,#ffffff))] shadow-xl z-30 py-1 text-xs divide-y divide-[var(--line)]"
							style={{ minWidth: "200px" }}
						>
							<div className="py-1">
								<button
									type="button"
									onClick={() => {
										onToggleMenu();
										onGenerateOffer(patient);
									}}
									className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-[var(--paper-soft)] text-[var(--ink)] cursor-pointer"
								>
									<Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
									<span>Спецпредложение</span>
								</button>
								<button
									type="button"
									onClick={() => {
										onToggleMenu();
										onOpenCard(patient.id);
									}}
									className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-[var(--paper-soft)] text-[var(--ink)] cursor-pointer"
								>
									<UserCheck className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" />
									<span>Открыть медкарту</span>
								</button>
								<button
									type="button"
									onClick={() => {
										onToggleMenu();
										window.location.hash = "#schedule";
									}}
									className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-[var(--paper-soft)] text-[var(--ink)] cursor-pointer"
								>
									<Calendar className="w-3.5 h-3.5 text-blue-500 shrink-0" />
									<span>Записать на приём</span>
								</button>
							</div>
							<div className="py-1">
								<button
									type="button"
									onClick={() => {
										onToggleMenu();
									}}
									className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-[var(--paper-soft)] text-[var(--muted)] cursor-pointer"
								>
									<Archive className="w-3.5 h-3.5 shrink-0" />
									<span>В архив оттока</span>
								</button>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};
