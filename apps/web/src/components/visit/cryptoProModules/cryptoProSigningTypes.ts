export interface CryptoProSignerProps {
	diaryHash: string | null;
	isLocked: boolean;
	lockedAt: string | null;
	ensureDraftSaved: () => Promise<{ id: string; hash: string | null } | null>;
	onLock: (
		certThumbprint: string,
		signature: string,
		alreadySavedId?: string | null,
	) => Promise<void>;
	onPrintDraft?: () => void;
}

export const CRYPTO_SIGNING_UNAVAILABLE_TEXT =
	"Подпись КриптоПро пока недоступна: нужен отпечаток сохранённого черновика, а его ещё нет. Нажмите «Сохранить черновик», дождитесь отметки времени сохранения и откройте подписание снова — отпечаток придёт с сервера. Пока можно подписать простой подписью по ПИН-коду на соседней вкладке.";

export function readableSigningFailure(error: unknown): string {
	const raw = error instanceof Error ? error.message : String(error ?? "");
	const text = raw.toLowerCase();
	if (text.includes("rutoken") && text.includes("pin")) {
		return "Носитель Рутокен не принял ПИН-код. Проверьте раскладку и введите ПИН-код носителя заново.";
	}
	if (text.includes("device id")) {
		return "Носитель Рутокен не определился. Выньте и вставьте его заново, затем обновите список сертификатов.";
	}
	if (text.includes("rutoken") && text.includes("not available")) {
		return "Модуль работы с Рутокеном не отвечает. Проверьте, что носитель вставлен и его драйвер установлен.";
	}
	if (text.includes("cryptopro") || text.includes("plugin")) {
		return "КриптоПро на этом компьютере не отвечает. Проверьте, что программа установлена и расширение браузера включено.";
	}
	if (text.includes("cancel") || text.includes("отмен")) {
		return "Подписание отменено. Запись не подписана, набранный текст на месте.";
	}
	return "Подписать не удалось: программа подписи вернула отказ. Запись не подписана, набранный текст на месте. Повторите попытку или подпишите простой подписью по ПИН-коду.";
}
