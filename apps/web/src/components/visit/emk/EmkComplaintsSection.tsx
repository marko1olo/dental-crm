import React from "react";
import { FileText, PlusCircle, Sparkles } from "lucide-react";
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
				<div className="flex items-center justify-between gap-2">
					<label className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
						<FileText size={14} className="text-[var(--teal,var(--brand-primary))]" />
						<span>Жалобы пациента (Subjective)</span>
					</label>
					<span className="text-[11px] text-[var(--muted)]">Симптомы со слов пациента</span>
				</div>

				<DebouncedEmkTextarea
					fieldKey="complaint"
					label="Жалобы пациента"
					value={visitNoteForm?.complaint || ""}
					onCommit={updateVisitNoteField}
					placeholder="Опишите жалобы пациента (характер боли, локализация, провоцирующие факторы)..."
					className="w-full min-h-[90px] p-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-xs text-[var(--ink)] focus:outline-none focus:border-[var(--teal)] transition-all resize-y"
				/>

				{/* Быстрые чипы жалоб */}
				<div className="flex items-center gap-1.5 flex-wrap">
					{complaintChips.map((chip, idx) => (
						<button
							key={idx}
							type="button"
							onClick={() => handleAddChip("complaint", chip)}
							className="px-2 py-0.5 rounded text-[11px] font-medium bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] hover:border-[var(--teal)] transition-all cursor-pointer inline-flex items-center gap-1"
							title={chip}
						>
							<PlusCircle size={10} className="text-[var(--muted)]" />
							<span className="max-w-[200px] truncate">{chip}</span>
						</button>
					))}
				</div>
			</div>

			{/* Анамнез */}
			<div className="flex flex-col gap-2">
				<div className="flex items-center justify-between gap-2">
					<label className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
						<FileText size={14} className="text-[var(--teal,var(--brand-primary))]" />
						<span>Анамнез заболевания и жизни (Anamnesis morbi et vitae)</span>
					</label>
					<span className="text-[11px] text-[var(--muted)]">Развитие заболевания, аллергоанамнез</span>
				</div>

				<DebouncedEmkTextarea
					fieldKey="anamnesis"
					label="Анамнез"
					value={visitNoteForm?.anamnesis || ""}
					onCommit={updateVisitNoteField}
					placeholder="История настоящего заболевания, перенесенные соматические заболевания, аллергологический статус..."
					className="w-full min-h-[90px] p-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-xs text-[var(--ink)] focus:outline-none focus:border-[var(--teal)] transition-all resize-y"
				/>

				{/* Быстрые чипы анамнеза */}
				<div className="flex items-center gap-1.5 flex-wrap">
					{anamnesisChips.map((chip, idx) => (
						<button
							key={idx}
							type="button"
							onClick={() => handleAddChip("anamnesis", chip)}
							className="px-2 py-0.5 rounded text-[11px] font-medium bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] hover:border-[var(--teal)] transition-all cursor-pointer inline-flex items-center gap-1"
							title={chip}
						>
							<PlusCircle size={10} className="text-[var(--muted)]" />
							<span className="max-w-[200px] truncate">{chip}</span>
						</button>
					))}
				</div>
			</div>
		</div>
	);
}
