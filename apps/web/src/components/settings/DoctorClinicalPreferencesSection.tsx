import { ShieldCheck, Stethoscope } from "lucide-react";
import React, { useState } from "react";
import {
	DoctorAnesthesiaDefaultsSection,
	DoctorForm043TemplatesSection,
	DoctorPrescriptions107Section,
	DoctorSpecialtyPresetsCard,
} from "./doctor";
import { DoctorCbctPreferencesCard } from "./DoctorCbctPreferencesCard";
import {
	DoctorClinicalSubTabNav,
	type DoctorClinicalSubTabKey,
} from "./doctorClinical/DoctorClinicalSubTabNav";
import { DoctorMaterialsTabContent } from "./doctorClinical/DoctorMaterialsTabContent";
import { DoctorSoundAlertsCard } from "./doctorClinical/DoctorSoundAlertsCard";
import { DoctorStandardsSignatureSection } from "./doctorClinical/DoctorStandardsSignatureSection";
import { DoctorThemeSelectorCard } from "./doctorClinical/DoctorThemeSelectorCard";

interface DoctorClinicalPreferencesSectionProps {
	soundNotificationsMuted?: boolean | undefined;
	onToggleSoundMuted?: ((muted: boolean) => void) | undefined;
	onTestOnlineBookingSound?: (() => void) | undefined;
	onTestSlotEndSound?: (() => void) | undefined;
}

export function DoctorClinicalPreferencesSection({
	soundNotificationsMuted,
	onToggleSoundMuted,
	onTestOnlineBookingSound,
	onTestSlotEndSound,
}: DoctorClinicalPreferencesSectionProps) {
	const [clinicalSubTab, setClinicalSubTab] = useState<DoctorClinicalSubTabKey>("materials");

	return (
		<section
			className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5 shadow-xs"
			data-testid="doctor-clinical-preferences-section"
		>
			<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-[var(--line)]">
				<div className="flex items-center gap-2.5 min-w-0">
					<div className="w-8 h-8 rounded-lg bg-[var(--teal-soft)] flex items-center justify-center text-[var(--teal-dark)] shrink-0">
						<Stethoscope size={18} />
					</div>
					<div className="min-w-0">
						<h3 className="m-0 text-base font-bold text-[var(--ink)] leading-snug break-normal">
							Клинические настройки врача
						</h3>
						<p className="m-0 text-xs text-[var(--muted)] leading-relaxed">
							Реестр стоматологических материалов, шаблоны медицинской карты, рецепты и сетка приёма.
						</p>
					</div>
				</div>
				<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 shrink-0 self-start sm:self-auto">
					<ShieldCheck size={13} className="text-emerald-600 dark:text-emerald-400" />
					Автосохранение 0 мс
				</span>
			</div>

			<div className="space-y-6">
				{/* 0. Быстрые пресеты по специальности врача (1 клик) */}
				<DoctorSpecialtyPresetsCard />

				{/* 0.1 Параметры КЛКТ по умолчанию и интерактивный тюнер */}
				<DoctorCbctPreferencesCard />

				{/* Подвкладки клинических настроек */}
				<DoctorClinicalSubTabNav activeTab={clinicalSubTab} onTabChange={setClinicalSubTab} />

				{clinicalSubTab === "materials" && <DoctorMaterialsTabContent />}
				{clinicalSubTab === "anesthesia" && <DoctorAnesthesiaDefaultsSection />}
				{clinicalSubTab === "templates_043" && <DoctorForm043TemplatesSection />}
				{clinicalSubTab === "prescriptions_107" && <DoctorPrescriptions107Section />}
				{clinicalSubTab === "standards" && <DoctorStandardsSignatureSection />}

				{/* Тема оформления кабинета */}
				<DoctorThemeSelectorCard />

				{/* Звуковые оповещения таймера и онлайн-записи */}
				<DoctorSoundAlertsCard
					soundNotificationsMuted={soundNotificationsMuted}
					onToggleSoundMuted={onToggleSoundMuted}
					onTestOnlineBookingSound={onTestOnlineBookingSound}
					onTestSlotEndSound={onTestSlotEndSound}
				/>
			</div>
		</section>
	);
}
