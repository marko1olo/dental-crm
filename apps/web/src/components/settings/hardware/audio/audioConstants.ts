import type { ComponentType } from "react";
import { AlertOctagon, Receipt, Save, Scan } from "lucide-react";
import type { ProceduralSignalType } from "../../../../services/audio/clinicalProceduralAudio.js";

export interface SignalDescriptor {
	title: string;
	freq: string;
	desc: string;
	icon: ComponentType<{ className?: string }>;
}

export const SIGNAL_LABELS: Record<ProceduralSignalType, SignalDescriptor> = {
	scanner_beep: {
		title: "Считывание Честный ЗНАК",
		freq: "2200 → 2600 Гц (35 мс)",
		desc: "Мгновенное подтверждение оптического захвата GS1 DataMatrix препаратов, карпул или браслета пациента.",
		icon: Scan,
	},
	cashier_kaching: {
		title: "Фискализация чека 54-ФЗ",
		freq: "1200 + 2400 Гц (140 мс)",
		desc: "Подтверждение безналичной оплаты картой/QR-кодом или успешной отправки фискального чека в ОФД.",
		icon: Receipt,
	},
	autosave_whisper: {
		title: "Фоновое автосохранение",
		freq: "1760 Гц (шелест 30 мс)",
		desc: "Субтильная фиксация протокола и черновиков в IndexedDB без отвлечения врача и раздражения пациента.",
		icon: Save,
	},
	somatic_danger_chord: {
		title: "Клинический стоп-фактор",
		freq: "440 + 466 Гц (150 мс)",
		desc: "Тревожный акустический маркер при наличии непереносимости анестетиков или соматических противопоказаний.",
		icon: AlertOctagon,
	},
};
