/**
 * themeToggleHelper — Переключение светлой/тёмной темы оформления.
 */

export function toggleTheme(): void {
	if (typeof document === "undefined") return;
	const isDark =
		document.documentElement.classList.contains("dark") ||
		document.documentElement.getAttribute("data-theme") === "dark";
	const next = isDark ? "light" : "dark";
	document.documentElement.setAttribute("data-theme", next);
	document.body.setAttribute("data-theme", next);
	if (next === "dark") {
		document.documentElement.classList.add("dark");
		document.documentElement.classList.remove("light");
		document.body.classList.add("dark");
		document.body.classList.remove("light");
	} else {
		document.documentElement.classList.remove("dark");
		document.documentElement.classList.add("light");
		document.body.classList.remove("dark");
		document.body.classList.add("light");
	}
	try {
		localStorage.setItem("dente_theme", next);
	} catch {
		// Ignore storage write failure
	}
}
