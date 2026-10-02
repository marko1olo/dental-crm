import React from "react";
import { FileText, PlusCircle, ShieldCheck, Sparkles } from "lucide-react";
import { DebouncedEmkTextarea } from "./DebouncedEmkTextarea";
import { appendClinicalText, type EmkSectionProps } from "./EmkTypes";

export function EmkComplaintsSection({
	visitNoteForm,
	updateVisitNoteField,
	isLocked,
}: EmkSectionProps) {
	const complaintChips = [
		"Жалоб на момент осмотра активно не предъявляет (профилактический осмотр).",
		"Острая самопроизвольная приступообразная боль, усиливающаяся в ночное время.",
		"Кратковременные боли от температурных и химических раздражителей, быстро проходящие после устранения причины.",
		"Ноющая боль в зубе при накусывании, ощущение «выросшего» зуба.",
		"Застревание пищи в межзубном промежутке, неприятный запах.",
		"Скол коронковой части зуба / пломбы, шероховатость языком.",
		"Кровоточивость десен при чистке зубов и приеме твердой пищи.",
		"Эстетический дефект, изменение цвета коронки зуба.",
	];

	const anamnesisChips = [
		"Соматически здоров. Аллергоанамнез не отягощен. Вредных привычек нет.",
		"Зуб ранее лечен по поводу кариеса/пульпита.",
		"Боли появились впервые 2–3 дня назад.",
		"Гигиенический уход регулярный (зубная щетка, паста 2 раза в день).",
		"Перенесенные заболевания: ОРВИ, детские инфекции. Гепатит, ВИЧ, туберкулез отрицает.",
		"Контакт с инфекционными больными отрицает.",
	];

	const handleAddChip = (fieldKey: string, chipText: string) => {
		const current = visitNoteForm?.[fieldKey] || "";
		updateVisitNoteField(fieldKey, appendClinicalText(current, chipText, " "));
	};

	return (
		<div className="flex flex-col gap-4">
			{/* Жалобы */}
			<div className="flex flex-col gap-2">
				<div className="flex items-center justify-between gap-2 flex-wrap">
					<label className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
						<FileText size={14} className="text-[var(--teal,var(--brand-primary))]" />
						<span>Жалобы пациента</span>
					</label>
					<div className="flex items-center gap-1.5" data-testid="emk-complaint-norm-bar">
						<span className="text-[11px] text-[var(--muted)] hidden md:inline">Симптомы со слов пациента</span>
						<button
							type="button"
							data-testid="btn-emk-complaints-norm"
							onClick={() => updateVisitNoteField("complaint", "Жалоб на момент осмотра активно не предъявляет (профилактический осмотр).")}
							disabled={false}
							className="hidden"
							title="0-Клик: Жалоб нет (плановый осмотр)"
						>
							<ShieldCheck size={12} className="text-emerald-600" />
							<span>0-Клик: Жалоб нет (профосмотр)</span>
						</button>
					</div>
				</div>

				<DebouncedEmkTextarea
					fieldKey="complaint"
					label="Жалобы пациента"
					value={visitNoteForm?.complaint || ""}
					onCommit={updateVisitNoteField}
					placeholder="Опишите жалобы пациента (характер боли, локализация, провоцирующие факторы)..."
					className="w-full min-h-[80px] p-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-xs text-[var(--ink)] focus:outline-none focus:border-[var(--teal)] transition-all resize-y"
				/>

				{/* Быстрые шаблоны жалоб: упорядоченная 2-колоночная сетка */}
				<div className="rounded-lg border border-[var(--line)] bg-[var(--paper-soft)]/50 p-2">
					<div className="flex items-center justify-between gap-1 mb-1.5 px-0.5">
						<span className="text-[11px] font-bold text-[var(--ink)] flex items-center gap-1">
							<Sparkles size={11} className="text-[var(--teal,var(--brand-primary))]" />
							<span>Шаблоны жалоб ({complaintChips.length})</span>
						</span>
						<span className="text-[10px] text-[var(--muted)] hidden sm:inline">1-клик вставка</span>
					</div>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
						{complaintChips.map((chip, idx) => (
							<button
								key={idx}
								type="button"
								onClick={() => handleAddChip("complaint", chip)}
								disabled={false}
								className="px-2 py-1 rounded text-[11px] font-medium bg-[var(--paper)] hover:bg-[var(--paper-soft)] border border-[var(--line)] hover:border-[var(--teal,var(--brand-primary))] text-[var(--ink)] transition-all cursor-pointer inline-flex items-center gap-1.5 text-left w-full min-w-0 disabled:opacity-50"
								title={chip}
							>
								<PlusCircle size={11} className="text-[var(--teal,var(--brand-primary))] shrink-0" />
								<span className="truncate">{chip}</span>
							</button>
						))}
					</div>
				</div>
			</div>

			{/* Анамнез */}
			<div className="flex flex-col gap-2">
				<div className="flex items-center justify-between gap-2 flex-wrap">
					<label className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
						<FileText size={14} className="text-[var(--teal,var(--brand-primary))]" />
						<span>Анамнез заболевания и жизни</span>
					</label>
					<div className="flex items-center gap-1.5" data-testid="emk-anamnesis-norm-bar">
						<span className="text-[11px] text-[var(--muted)] hidden md:inline">Развитие заболевания</span>
						<button
							type="button"
							data-testid="btn-emk-anamnesis-norm"
							onClick={() => updateVisitNoteField("anamnesis", "Соматически здоров. Аллергоанамнез не отягощен. Перенесенные инфекционные заболевания со слов отрицает. Норма.")}
							disabled={false}
							className="hidden"
							title="0-Клик: Соматически здоров / норма"
						>
							<ShieldCheck size={12} className="text-emerald-600" />
							<span>0-Клик: Соматически здоров / норма</span>
						</button>
					</div>
				</div>

				<DebouncedEmkTextarea
					fieldKey="anamnesis"
					label="Анамнез"
					value={visitNoteForm?.anamnesis || ""}
					onCommit={updateVisitNoteField}
					placeholder="История настоящего заболевания, перенесенные соматические заболевания, аллергологический статус..."
					className="w-full min-h-[80px] p-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-xs text-[var(--ink)] focus:outline-none focus:border-[var(--teal)] transition-all resize-y"
				/>

				{/* Быстрые шаблоны анамнеза: упорядоченная 2-колоночная сетка */}
				<div className="rounded-lg border border-[var(--line)] bg-[var(--paper-soft)]/50 p-2">
					<div className="flex items-center justify-between gap-1 mb-1.5 px-0.5">
						<span className="text-[11px] font-bold text-[var(--ink)] flex items-center gap-1">
							<Sparkles size={11} className="text-[var(--teal,var(--brand-primary))]" />
							<span>Шаблоны анамнеза ({anamnesisChips.length})</span>
						</span>
						<span className="text-[10px] text-[var(--muted)] hidden sm:inline">1-клик вставка</span>
					</div>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
						{anamnesisChips.map((chip, idx) => (
							<button
								key={idx}
								type="button"
								onClick={() => handleAddChip("anamnesis", chip)}
								disabled={false}
								className="px-2 py-1 rounded text-[11px] font-medium bg-[var(--paper)] hover:bg-[var(--paper-soft)] border border-[var(--line)] hover:border-[var(--teal,var(--brand-primary))] text-[var(--ink)] transition-all cursor-pointer inline-flex items-center gap-1.5 text-left w-full min-w-0 disabled:opacity-50"
								title={chip}
							>
								<PlusCircle size={11} className="text-[var(--teal,var(--brand-primary))] shrink-0" />
								<span className="truncate">{chip}</span>
							</button>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
