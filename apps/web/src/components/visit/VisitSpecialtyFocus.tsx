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
			className="specialty-focus-bar bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl p-4"
			aria-label="Фокус специальности приема"
		>
			<div>
				<p className="eyebrow">Фокус врача</p>
				<h3>{currentSpecialtyLabel}</h3>
				<p>
					{activeDoctor?.fullName?.split(" ")[0] ?? "Врач"} ·{" "}
					{activeChair?.name ?? "кресло"}
				</p>
			</div>
			<div className="specialty-focus-options">
				{/*
				  Пустой список раньше оставлял справа глухое место без объяснения:
				  врач видел заголовок «Фокус врача» и ничего под ним.
				*/}
				{focusOptions.length === 0 ? (
					<p className="text-xs text-slate-500 dark:text-slate-400 m-0">
						Направления приёма не настроены. Их включают в настройках клиники,
						на вкладке профиля; приём можно вести и без них.
					</p>
				) : null}
				{focusOptions.map((option: any) => (
					<button
						className={selectedSpecialty === option.specialty ? "active" : ""}
						type="button"
						key={option.specialty}
						aria-pressed={selectedSpecialty === option.specialty}
						onClick={() => {
							if (setSelectedSpecialty) setSelectedSpecialty(option.specialty);
							if (setSelectedProtocolId) setSelectedProtocolId(null);
						}}
					>
						<strong>{option.title}</strong>
						<span>{option.hint}</span>
					</button>
				))}
			</div>
		</section>
	);
}
