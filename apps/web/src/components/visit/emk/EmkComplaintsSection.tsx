import React from "react";
import {
	Activity,
	AlertTriangle,
	CheckCircle2,
	Clock,
	Droplet,
	FileText,
	Heart,
	Mic,
	Pill,
	Search,
	ShieldAlert,
	ShieldCheck,
	Snowflake,
	Sparkles,
	UserCheck,
	Zap,
} from "lucide-react";
import { showToast } from "../../GlobalToast";
import { DebouncedEmkTextarea } from "./DebouncedEmkTextarea";
import type { EmkSectionProps } from "./EmkTypes";

interface SymptomChip {
	id: string;
	label: string;
	icon: React.ComponentType<{ size?: number; className?: string }>;
}

const SYMPTOM_CHIPS: readonly SymptomChip[] = [
	{ id: "cold_hot", label: "Боль от холодного/горячего", icon: Snowflake },
	{ id: "acute_spontaneous", label: "Острая самопроизвольная боль", icon: Zap },
	{ id: "bite_pain", label: "Боль при накусывании", icon: Activity },
	{ id: "broken_filling", label: "Выпала пломба / скол зуба", icon: ShieldAlert },
	{ id: "bleeding_gums", label: "Кровоточивость дёсен", icon: Droplet },
	{ id: "food_impact", label: "Застревание пищи", icon: Search },
	{ id: "routine_checkup", label: "Плановый осмотр", icon: Sparkles },
];

const ANAMNESIS_CHIPS: readonly SymptomChip[] = [
	{ id: "no_allergies", label: "Аллергий нет", icon: ShieldCheck },
	{ id: "anesthetic_allergy", label: "Аллергия на анестетики", icon: AlertTriangle },
	{ id: "anticoagulants", label: "Приём антикоагулянтов", icon: Pill },
	{ id: "hypertension", label: "Гипертония / ИБС", icon: Heart },
	{ id: "diabetes", label: "Сахарный диабет", icon: Activity },
	{ id: "pregnancy", label: "Беременность", icon: UserCheck },
	{ id: "duration_2_3_days", label: "Боль 2–3 дня", icon: Clock },
	{ id: "took_nsaids", label: "Приём НПВП", icon: Pill },
];

export function EmkComplaintsSection({
	visitNoteForm,
	updateVisitNoteField,
}: EmkSectionProps) {
	const handleFillComplaintsNorm = () => {
		if (!updateVisitNoteField) return;
		const normText =
			"Жалоб нет. Обратился(лась) для планового профилактического осмотра и санации полости рта.";
		updateVisitNoteField("complaint", normText);
		updateVisitNoteField("complaints", normText);
	};

	const handleFillAnamnesisNorm = () => {
		if (!updateVisitNoteField) return;
		updateVisitNoteField(
			"anamnesis",
			"Соматически здоров. Аллергологический анамнез не отягощен. Хронические заболевания отрицает. Ранее стоматологическое лечение переносил без осложнений.",
		);
	};

	const handleAddComplaintChip = (chipText: string) => {
		if (!updateVisitNoteField) return;
		const current = (visitNoteForm?.complaint || visitNoteForm?.complaints || "").trim();
		if (
			!current ||
			current.includes("Жалоб нет") ||
			current.includes("активно не предъявляет")
		) {
			updateVisitNoteField("complaint", chipText);
			updateVisitNoteField("complaints", chipText);
			return;
		}
		if (current.includes(chipText)) return;
		const nextVal = `${current}, ${chipText.toLowerCase()}`;
		updateVisitNoteField("complaint", nextVal);
		updateVisitNoteField("complaints", nextVal);
	};

	const handleAddAnamnesisChip = (chipText: string) => {
		if (!updateVisitNoteField) return;
		const current = (visitNoteForm?.anamnesis || "").trim();
		if (
			!current ||
			current.includes("Соматически здоров") ||
			current.includes("Аллергологический анамнез не отягощен")
		) {
			updateVisitNoteField("anamnesis", chipText);
			return;
		}
		if (current.includes(chipText)) return;
		updateVisitNoteField("anamnesis", `${current}. ${chipText}`);
	};

	const [isListening, setIsListening] = React.useState<boolean>(false);
	const recognitionRef = React.useRef<any>(null);

	const handleToggleVoiceDictation = () => {
		if (typeof window === "undefined") return;
		const SpeechRec =
			(window as any).SpeechRecognition ||
			(window as any).webkitSpeechRecognition;
		if (!SpeechRec) {
			showToast("Голосовой ввод не поддерживается данным браузером", "info");
			return;
		}

		if (isListening && recognitionRef.current) {
			try {
				recognitionRef.current.stop();
			} catch {
				// ignore
			}
			setIsListening(false);
			return;
		}

		try {
			const rec = new SpeechRec();
			rec.lang = "ru-RU";
			rec.continuous = false;
			rec.interimResults = false;

			rec.onstart = () => {
				setIsListening(true);
				showToast("Слушаю жалобы пациента...", "info", 2000);
			};

			rec.onresult = (event: any) => {
				const transcript = event.results?.[0]?.[0]?.transcript;
				if (
					transcript &&
					typeof transcript === "string" &&
					updateVisitNoteField
				) {
					const current = (
						visitNoteForm?.complaint ||
						visitNoteForm?.complaints ||
						""
					).trim();
					const nextVal = current
						? `${current} ${transcript.trim()}`
						: transcript.trim();
					updateVisitNoteField("complaint", nextVal);
					updateVisitNoteField("complaints", nextVal);
					showToast("Жалобы записаны голосом", "success", 2000);
				}
			};

			rec.onerror = () => {
				setIsListening(false);
			};

			rec.onend = () => {
				setIsListening(false);
			};

			recognitionRef.current = rec;
			rec.start();
		} catch {
			setIsListening(false);
		}
	};

	return (
		<div className="flex flex-col gap-3.5" data-testid="emk-complaints-section">
			{/* 1. Жалобы */}
			<div className="p-3 sm:p-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] shadow-2xs flex flex-col gap-2.5">
				<div className="flex items-center justify-between gap-2 flex-wrap pb-1.5 border-b border-[var(--line-subtle)]">
					<label className="text-xs sm:text-sm font-bold text-[var(--ink)] flex items-center gap-1.5">
						<FileText size={15} className="text-[var(--teal,var(--brand-primary))]" />
						<span>Жалобы пациента</span>
					</label>
					<span className="text-[11px] text-[var(--muted)]">
						Симптомы со слов пациента
					</span>
					{/* Скрытый триггер для программной совместимости */}
					<button
						type="button"
						data-testid="btn-emk-complaints-norm"
						onClick={handleFillComplaintsNorm}
						className="hidden"
						aria-hidden="true"
						tabIndex={-1}
					/>
				</div>

				{/* Поле жалоб с компактной иконкой микрофона в правом нижнем углу (Apple-style) */}
				<div className="relative w-full">
					<DebouncedEmkTextarea
						fieldKey="complaint"
						label="Жалобы пациента"
						value={visitNoteForm?.complaint || visitNoteForm?.complaints || ""}
						onCommit={(key, val) => {
							updateVisitNoteField(key, val);
							updateVisitNoteField("complaints", val);
						}}
						placeholder="Опишите жалобы пациента (характер боли, локализация, провоцирующие факторы)..."
						className="w-full min-h-[85px] p-3 pr-10 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-sm text-[var(--ink)] focus:outline-none focus:border-[var(--teal)] transition-all resize-y leading-relaxed shadow-2xs"
					/>
					<button
						type="button"
						onClick={handleToggleVoiceDictation}
						className={`absolute right-2.5 bottom-2.5 w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-2xs ${
							isListening
								? "bg-rose-500 text-white animate-pulse"
								: "bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--teal)] hover:bg-[var(--paper-soft)] border border-[var(--line)]"
						}`}
						title={
							isListening
								? "Остановить запись"
								: "Надиктовать жалобы голосом"
						}
						aria-label="Голосовой ввод жалоб"
						data-testid="btn-dictate-complaints"
					>
						<Mic size={14} className={isListening ? "animate-pulse" : ""} />
					</button>
				</div>

				{/* Ряд быстрых чипов симптомов */}
				<div
					className="dente-filter-chips pt-0.5"
					data-testid="emk-complaints-quick-chips"
				>
					<span className="text-[11px] font-semibold text-[var(--muted)] shrink-0 hidden sm:inline">
						Быстрые симптомы:
					</span>
					{SYMPTOM_CHIPS.map((chip) => {
						const IconComponent = chip.icon;
						return (
							<button
								key={chip.id}
								type="button"
								data-testid={`btn-complaint-chip-${chip.id}`}
								onClick={() => handleAddComplaintChip(chip.label)}
								className="dente-filter-chip min-h-[44px] sm:min-h-[28px] sm:h-7"
								title={`Добавить симптом: ${chip.label}`}
							>
								<IconComponent size={13} className="text-[var(--muted)] shrink-0" />
								<span>{chip.label}</span>
							</button>
						);
					})}
				</div>
			</div>

			{/* 2. Анамнез */}
			<div className="p-3 sm:p-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] shadow-2xs flex flex-col gap-2.5">
				<div className="flex items-center justify-between gap-2 flex-wrap pb-1.5 border-b border-[var(--line-subtle)]">
					<label className="text-xs sm:text-sm font-bold text-[var(--ink)] flex items-center gap-1.5">
						<FileText size={15} className="text-[var(--teal,var(--brand-primary))]" />
						<span>Анамнез заболевания и жизни</span>
					</label>
					<div className="flex items-center gap-2">
						<span className="text-[11px] text-[var(--muted)] hidden md:inline">
							Развитие заболевания и соматический статус
						</span>
						<button
							type="button"
							data-testid="btn-emk-anamnesis-norm"
							onClick={handleFillAnamnesisNorm}
							className="emk-norm-button"
							title="Заполнить анамнез нормой: Соматически здоров"
						>
							<CheckCircle2 size={14} className="shrink-0" />
							<span>Соматически здоров</span>
						</button>
					</div>
				</div>

				<DebouncedEmkTextarea
					fieldKey="anamnesis"
					label="Анамнез"
					value={visitNoteForm?.anamnesis || ""}
					onCommit={updateVisitNoteField}
					placeholder="История настоящего заболевания, перенесенные соматические заболевания, аллергологический статус..."
					className="w-full min-h-[85px] p-3 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-sm text-[var(--ink)] focus:outline-none focus:border-[var(--teal)] transition-all resize-y leading-relaxed shadow-2xs"
				/>

				{/* Ряд быстрых соматических чипов */}
				<div
					className="dente-filter-chips pt-0.5"
					data-testid="emk-anamnesis-quick-chips"
				>
					<span className="text-[11px] font-semibold text-[var(--muted)] shrink-0 hidden sm:inline">
						Соматика и аллергии:
					</span>
					{ANAMNESIS_CHIPS.map((chip) => {
						const IconComponent = chip.icon;
						return (
							<button
								key={chip.id}
								type="button"
								data-testid={`btn-anamnesis-chip-${chip.id}`}
								onClick={() => handleAddAnamnesisChip(chip.label)}
								className="dente-filter-chip min-h-[44px] sm:min-h-[28px] sm:h-7"
								title={`Добавить в анамнез: ${chip.label}`}
							>
								<IconComponent size={13} className="text-[var(--muted)] shrink-0" />
								<span>{chip.label}</span>
							</button>
						);
					})}
				</div>
			</div>
		</div>
	);
}
