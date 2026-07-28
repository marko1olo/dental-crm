import type { PaidContractRequiredFieldsReview } from "./paidContractRequiredFields";

/**
 * «Чего не хватает договору» — весь перечень до нажатия «Создать».
 *
 * ЧТО ВИДЕЛ АДМИНИСТРАТОР. Раздел «Документы», вид «Договор»: заголовок,
 * описание и свёрнутый блок с полями. На экране ни одной пометки, что поля
 * обязательны, и ни слова о том, чего не хватает. Нажатие «Создать выбранный
 * документ» — «Заполните поле: договор, номер». Вписал, нажал — «Заполните поле:
 * договор, начало оказания услуг». Потом состав услуг, потом стоимость, потом
 * четыре отметки-подтверждения по одной за нажатие. Проверка договора устроена
 * цепочкой `??` и физически отдаёт одну позицию за раз, поэтому на новой клинике
 * это восемь отказов подряд, и каждый следующий человек узнаёт только после
 * очередного нажатия.
 *
 * ЧТО СТАЛО. Перечень показан сразу, целиком, с выполнимой подсказкой по каждой
 * позиции, и пересчитывается по ходу заполнения. Кнопку создания не запираем:
 * решение остаётся за проверкой при нажатии, иначе при расхождении перечня с
 * проверкой человек получил бы мёртвую кнопку без объяснения.
 *
 * Вид рамки взят у формы записи на приём (класс schedule-create-missing): это
 * единственный готовый в приложении вид списка «чего не хватает», а правки в
 * styles/* этой задаче не разрешены. Расхождения в оформлении быть и не должно —
 * администратор видит оба списка в один день.
 */

export interface PaidContractRequiredFieldsPanelProps {
	review: PaidContractRequiredFieldsReview;
	/** Подпись свёрнутого блока с полями: куда идти заполнять. */
	fieldsBlockTitle: string;
}

export function PaidContractRequiredFieldsPanel({
	review,
	fieldsBlockTitle,
}: PaidContractRequiredFieldsPanelProps) {
	const { requiredCount, missing } = review;

	if (missing.length === 0) {
		return (
			<p
				className="document-required-fields-ready"
				role="status"
				style={{
					background: "var(--ok-bg)",
					borderRadius: "8px",
					color: "var(--ok-fg)",
					fontSize: "13px",
					margin: "12px 0 0",
					padding: "10px 12px",
				}}
			>
				Обязательные поля договора заполнены, все {requiredCount}. Дату договора и
				время подписания программа поставит сама при создании.
			</p>
		);
	}

	return (
		<div
			className="schedule-create-missing document-required-fields-missing"
			role="status"
			aria-live="polite"
			style={{ marginTop: "12px" }}
		>
			<strong>
				Не хватает {missing.length} из {requiredCount} обязательных полей — без них
				договор не создастся:
			</strong>
			<ul>
				{missing.map((entry) => (
					<li key={entry.field}>
						{entry.label} — {entry.hint}
					</li>
				))}
			</ul>
			<small>Все эти поля в блоке «{fieldsBlockTitle}» ниже.</small>
		</div>
	);
}
