import React from "react";

interface DictationHintsProps {
	isVisible: boolean;
	type: "schedule" | "patient" | "visit" | "prices" | "payment";
}

export function DictationHints({ isVisible, type }: DictationHintsProps) {
	if (!isVisible) return null;

	return (
		<div className="smart-ai-hints-popup">
			<p>Памятка для умного ввода</p>

			{type === "schedule" && (
				<ul>
					<li>
						<strong>Запись:</strong> «Запиши Иванова к Смирнову завтра в 14:30
						на чистку»
					</li>
					<li>
						<strong>Отмена:</strong> «Отмени запись Петрова на завтра»
					</li>
					<li>
						<strong>Заметка:</strong> «Заметка: пациент очень боится»
					</li>
				</ul>
			)}

			{type === "patient" && (
				<ul>
					<li>
						<strong>Создание:</strong> «Новый пациент Иванов Иван 12 мая 1990
						телефон 8 999 123 45 67»
					</li>
					<li>
						<strong>Заметки:</strong> «... пометка: аллергия на лидокаин»
					</li>
				</ul>
			)}

			{type === "visit" && (
				<ul>
					<li>Называйте номера зубов: «45 зуб», «8ки снизу»</li>
					<li>
						Используйте слова маркеры:{" "}
						<strong>Жалобы, Объективно, Диагноз, Лечение</strong>
					</li>
					<li>
						Пример: «Жалуется на боль в 45 зубе... Диагноз средний кариес...»
					</li>
				</ul>
			)}

			{type === "prices" && (
				<ul>
					<li>
						<strong>Добавление:</strong> «Добавь в прайс удаление восьмерки за 5
						тысяч рублей»
					</li>
					<li>
						<strong>Категории:</strong> «... категория терапия»
					</li>
				</ul>
			)}

			{type === "payment" && (
				<ul>
					<li>
						<strong>Сумма:</strong> «Оплата 15000»
					</li>
					<li>
						<strong>Способ:</strong> «по карте», «наличными», «сбп»
					</li>
					<li>
						<strong>Вычет:</strong> «оформи вычет», «код 1»
					</li>
				</ul>
			)}
		</div>
	);
}
