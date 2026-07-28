import type { ReactNode } from "react";

/**
 * Карточка формы документа: заголовок, пояснение и складной блок ручной правки.
 *
 * ОДНА И ТА ЖЕ РАЗМЕТКА БЫЛА ПОВТОРЕНА 28 РАЗ В DocumentsView.tsx, вместе с
 * ТРЕМЯ объектами `style={{ … }}` на каждой копии (на `<details>`, на
 * `<summary>` и на блоке содержимого) — 13 свойств. Эти inline-стили не
 * рисовали ничего: в styles/dente-redesign.css:1262-1287 те же свойства
 * объявлены с `!important`, а важное авторское объявление сильнее атрибута
 * style. То есть 28 копий задавали `borderRadius: 8px`, `marginTop: 16px`,
 * `gap: 16px`, `color: var(--brand-700)` — а экран всё это время показывал
 * 10px, 12px, 10px и var(--teal-dark) из CSS. Копии врали читателю кода и
 * ломали правило «Tailwind вместо inline-стилей».
 *
 * Поэтому здесь остались только классы. Внешний вид не меняется — он и раньше
 * приходил из CSS; проверка равенства свойств живёт в
 * tests/documentPayloadForms.test.ts и упадёт, если из CSS уберут `!important`.
 */
export interface DocumentPayloadCardProps {
	/** Название документа, как его видит администратор или врач. */
	title: string;
	/** Одна строка о том, что именно фиксирует форма. */
	description: string;
	/**
	 * Предупреждение над складным блоком: то, что человек обязан прочесть, НЕ
	 * разворачивая поля. Внутрь `<details>` такое ставить нельзя — свёрнутый блок
	 * его прячет, и получается предупреждение, которого никто не видит. Ровно так
	 * стоит перечень нехваток у договора платных услуг (DocumentsView.tsx:1159),
	 * там карточка выписана руками; этот слот избавляет от второй такой копии.
	 */
	notice?: ReactNode;
	/** Поля формы: они и раньше лежали внутри складного блока. */
	children: ReactNode;
}

export function DocumentPayloadCard({ title, description, notice, children }: DocumentPayloadCardProps) {
	return (
		<article className="document-payload-card">
			<div>
				<h3>{title}</h3>
				<p>{description}</p>
			</div>
			{notice ?? null}
			<details className="document-manual-override">
				<summary>✏️ Ручная корректировка полей (развернуть)</summary>
				<div className="document-payload-collapsed-content">{children}</div>
			</details>
		</article>
	);
}
