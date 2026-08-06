/**
 * Поле анамнеза: пустое по умолчанию, с быстрой вставкой отрицательного ответа.
 *
 * Раньше поля «Аллергии», «Постоянные препараты», «Хронические заболевания»,
 * «Антикоагулянты» и «Инфекционные риски» открывались с уже вписанным текстом
 * вида «со слов пациента не отмечены». Врач мог не открыть анкету вовсе, а
 * документ уходил на подпись с отрицательным аллергоанамнезом, которого никто
 * не собирал. Это не мелочь оформления: подписанная анкета — доказательство,
 * что пациента опросили.
 *
 * Пустое поле честнее, но заставлять врача набирать одну и ту же фразу по пять
 * раз за приём — верный способ получить пустую анкету. Поэтому фраза осталась,
 * но за одно нажатие: врач спросил, пациент ответил «нет» — кнопка вписывает
 * ровно тот же текст. Кнопка видна, только пока поле пустое, и не мешает,
 * когда есть что записать.
 */

type AnamnesisFieldProps = {
	/** Подпись поля, как её видит врач. */
	label: string;
	value: string;
	onChange: (value: string) => void;
	/** Подсказка в пустом поле: что сюда пишут. */
	placeholder: string;
	/** Текст, который вставляет кнопка отрицательного ответа. */
	denialText: string;
	/** Подпись кнопки. По умолчанию — «Со слов пациента — нет». */
	denialLabel?: string;
	rows?: number;
};

export function AnamnesisField({
	label,
	value,
	onChange,
	placeholder,
	denialText,
	denialLabel = "Со слов пациента — нет",
	rows = 2,
}: AnamnesisFieldProps) {
	const empty = value.trim() === "";
	return (
		<label className="document-anamnesis-field">
			{label}
			<textarea
				value={value}
				onChange={(event) => onChange(event.target.value)}
				placeholder={placeholder}
				rows={rows}
			/>
			{empty ? (
				<button
					type="button"
					className="document-anamnesis-quick"
					onClick={() => onChange(denialText)}
				>
					{denialLabel}
				</button>
			) : null}
		</label>
	);
}
