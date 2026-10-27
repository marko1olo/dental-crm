/**
 * badgeFormatter.ts — Форматирование уведомлений о восстановлении диктовки с русской плюрализацией
 */

export function formatRestoredDictationsBadge(count: number): string {
	const safeCount = Math.max(0, Math.floor(count));
	const mod10 = safeCount % 10;
	const mod100 = safeCount % 100;

	let phrase: string;
	if (mod100 >= 11 && mod100 <= 19) {
		phrase = "надиктованных сообщений";
	} else if (mod10 === 1) {
		phrase = "надиктованное сообщение";
	} else if (mod10 >= 2 && mod10 <= 4) {
		phrase = "надиктованных сообщения";
	} else {
		phrase = "надиктованных сообщений";
	}

	return `Восстановлено ${safeCount} ${phrase} после обрыва сети`;
}
