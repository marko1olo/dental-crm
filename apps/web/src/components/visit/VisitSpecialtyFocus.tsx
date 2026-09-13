import { useAppLogicContext } from "../../contexts/AppLogicContext";

export function VisitSpecialtyFocus() {
	// `|| {}` убран: useAppLogicContext() либо отдаёт контекст, либо бросает
	// исключение (contexts/AppLogicContext.tsx) — пустой объект он больше не
	// выдумывает, и вторая ветка была недостижима.
	const context = useAppLogicContext();
	const {
		activeDoctor,
		activeChair,
		selectedSpecialty,
		setSelectedSpecialty,
		setSelectedProtocolId,
		specialtyLabels = {},
		visibleVisitSpecialtyFocusOptions = [],
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	} = context as any;

	/*
	  БЫЛО: `|| "Терапия"`. Если выбранной специальности нет в справочнике (или
	  выбор ещё не пришёл), панель уверенно писала «Терапия» — то есть называла
	  врачу тот приём, которого он не выбирал, и делала это в клинической части
	  экрана. Показываем то, что есть: название из справочника, иначе само
	  значение, иначе нейтральное «Прием» — так же, как это сделано в остальной
	  разметке приёма.
	*/
	const currentSpecialtyLabel =
		(selectedSpecialty && specialtyLabels[selectedSpecialty]) ||
		selectedSpecialty ||
		"Прием";
	const focusOptions = Array.isArray(visibleVisitSpecialtyFocusOptions)
		? visibleVisitSpecialtyFocusOptions
		: [];

	return (
		<section
			data-testid="visit-specialty-focus"
			className="specialty-focus-bar bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] rounded-xl px-3 py-1.5 flex items-center justify-between gap-2 min-h-[32px] sm:h-8 text-xs shrink-0 select-none"
			aria-label="Фокус специальности приема"
		>
			<div className="flex items-center gap-2 min-w-0">
				<span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] shrink-0">Фокус:</span>
				<strong className="font-semibold text-xs text-[var(--ink)] truncate">{currentSpecialtyLabel}</strong>
				<span className="text-[11px] text-[var(--muted)] hidden sm:inline shrink-0">
					({activeDoctor?.fullName?.split(" ")[0] ?? "Врач"} · {activeChair?.name ?? "кресло"})
				</span>
			</div>
			<div className="flex items-center gap-1 overflow-x-auto whitespace-nowrap scrollbar-none">
				{focusOptions.length === 0 ? (
					<span className="text-[11px] text-[var(--muted)] truncate">
						Направления не настроены
					</span>
				) : null}
				{/* biome-ignore lint/suspicious/noExplicitAny: automated suppression */}
				{focusOptions.map((option: any) => (
					<button
						className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${selectedSpecialty === option.specialty ? "bg-[var(--teal)] text-[var(--paper)] font-bold" : "bg-[var(--paper-soft)] text-[var(--ink)] hover:bg-[var(--line)]"}`}
						type="button"
						key={option.specialty}
						aria-pressed={selectedSpecialty === option.specialty}
						onClick={() => {
							if (setSelectedSpecialty) setSelectedSpecialty(option.specialty);
							if (setSelectedProtocolId) setSelectedProtocolId(null);
						}}
						title={option.hint}
					>
						<strong>{option.title}</strong>
					</button>
				))}
			</div>
		</section>
	);
}
