/**
 * Разрешение темы: какой атрибут и какие классы должны стоять на <html>.
 *
 * ЗАЧЕМ ОТДЕЛЬНАЯ ФУНКЦИЯ. Раньше это жило внутри useEffect в AppShell и не
 * проверялось ничем. Ошибка там не видна ни в типах, ни в тестах — только
 * глазами на конкретном экране в конкретной теме, и то если попасть на нужный
 * компонент.
 *
 * ЧТО БЫЛО СЛОМАНО. Класс выставлялся так:
 *   root.classList.toggle("dark", resolved === "dark");
 *   root.classList.toggle("light", resolved === "light");
 * В НОЧНОЙ теме не оставалось ни одного класса. А Tailwind настроен на
 * darkMode по классу, и в проекте 72 файла используют варианты `dark:`. То есть
 * в ночной теме — тёмной! — все эти узлы отрисовывались в СВЕТЛОМ варианте:
 * светлый текст правил CSS-переменных поверх светлых плашек Tailwind.
 *
 * ПОЧЕМУ ИСПРАВЛЕНО НЕ ЗДЕСЬ, А В TAILWIND.CSS. Добавить класс `dark` для
 * ночной темы нельзя: селектор `html.dark` в main.css (специфичность 0,1,1)
 * сильнее `[data-theme="night"]` (0,1,0), и ночная палитра молча подменилась бы
 * тёмной. Поэтому второй источник истины убран у Tailwind: вариант `dark:`
 * объявлен через data-theme (см. styles/tailwind.css), и класс на <html>
 * остаётся тем же, чем был, — опорой для нескольких старых правил CSS.
 *
 * Здесь же собрано разрешение темы целиком, чтобы оно было проверяемо: раньше
 * ошибка в этих четырёх строках не ловилась ничем.
 */

export type ThemeMode = "light" | "dark" | "night" | "auto";

/** Что именно выставляется на корневом элементе. */
export type ResolvedTheme = {
	/** Значение data-theme: единственный источник истины для палитры. */
	readonly theme: "light" | "dark" | "night";
	/**
	 * Классы на <html>. Вариант Tailwind `dark:` на них НЕ опирается — он читает
	 * data-theme, иначе ночная тема осталась бы без тёмных вариантов. Классы
	 * нужны нескольким старым правилам CSS (`html.dark`, `html.light`).
	 */
	readonly darkClass: boolean;
	readonly lightClass: boolean;
	/** Для системных элементов управления: полос прокрутки, полей ввода. */
	readonly colorScheme: "light" | "dark";
};

export function resolveTheme(themeMode: ThemeMode, prefersDark: boolean): ResolvedTheme {
	const theme = themeMode === "auto" ? (prefersDark ? "dark" : "light") : themeMode;
	return {
		theme,
		darkClass: theme === "dark",
		lightClass: theme === "light",
		// Ночная тема — тоже тёмная: системные полосы прокрутки и поля ввода
		// должны быть тёмными, иначе браузер рисует их светлыми поверх тёмного.
		colorScheme: theme === "light" ? "light" : "dark"
	};
}

/** Применение к <html>. Вынесено рядом, чтобы порядок действий был один. */
export function applyThemeToRoot(root: HTMLElement, resolved: ResolvedTheme): void {
	root.dataset.theme = resolved.theme;
	root.classList.toggle("dark", resolved.darkClass);
	root.classList.toggle("light", resolved.lightClass);
	root.style.colorScheme = resolved.colorScheme;
}
