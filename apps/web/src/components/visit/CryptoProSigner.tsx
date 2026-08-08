import { CheckCircle2, Lock, ShieldCheck } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { type CertificateInfo, signatureService } from "../../lib/cryptopro";
import { actionFailureToast } from "../../lib/panelStateText";
import { showToast } from "../GlobalToast";

interface CryptoProSignerProps {
	diaryHash: string | null;
	isLocked: boolean;
	lockedAt: string | null;
	ensureDraftSaved: () => Promise<{ id: string; hash: string | null } | null>;
	onLock: (
		certThumbprint: string,
		signature: string,
		alreadySavedId?: string | null,
	) => Promise<void>;
}

/*
  ПОДПИСАНИЕ ДНЕВНИКА ПРИЁМА. ЧТО ЗДЕСЬ БЫЛО СЛОМАНО.

  1. Отказ подписания показывался через alert() с текстом ошибки от плагина —
     по-английски: «CryptoPro plugin is not available.», «PIN code is required
     for Rutoken signing», «Cannot create object». Врач у кресла читал латиницу
     и не понимал ни причины, ни что делать. Теперь причина называется словами
     по-русски прямо в окне подписания, а машинный текст уходит в консоль.
  2. Подписать носителем Рутокен было НЕВОЗМОЖНО. Поле ПИН-кода показывалось
     только для простой подписи, а lib/cryptopro.ts для Рутокена требует ПИН
     обязательно и без него бросает исключение. То есть выбор сертификата с
     Рутокена всегда заканчивался ошибкой на английском. Теперь для таких
     сертификатов поле ПИН-кода носителя показывается.
  3. Кнопка «Подписать» не блокировалась на время запроса: двойной клик отправлял
     два подписания одной записи.
  4. Простая подпись принимала любой ввод: проверка была `if (!pinCode)`, то есть
     одной цифры хватало. ПИН сотрудника во всём продукте — четыре цифры
     (components/auth/AcceptInvite.tsx, settings/SettingsStaffTab.tsx).
  5. Пустой список сертификатов выглядел одинаково и когда носитель не вставлен,
     и когда плагин не установлен, и когда сертификатов действительно нет:
     getCertificates() в lib/cryptopro.ts глотает любую ошибку и возвращает
     пустой список. Теперь рядом со списком написано, что проверить.
  6. Дата подписания печаталась как new Date(lockedAt!) — при отсутствии даты
     врач видел «Invalid Date» под словом «Подписано».
  7. Окно не закрывалось клавишей Escape, хотя перекрывало весь экран.
  8. Закрыть окно посреди подписания было можно — и это выглядело как успех.
     И Escape, и кнопка «Отмена» смотрели только на isSigning, а ожидание
     подтверждения подписи (до 1,5 секунды) ими закрывалось. Врач, решив, что
     «Подписываю…» повисло, закрывал окно — исчезнувшее окно и есть тот самый
     единственный признак, который читается как «подписано», — а вместе с окном
     гасла ещё не показанная причина отказа. Запись оставалась неподписанной.
     Теперь на время подписания заперты все элементы окна, и окно объясняет,
     чего именно ждёт.

  ПРОСТАЯ ЭП. Клиент по-прежнему шлёт `PIN:<четыре цифры>` в pkcs7Signature.
  Сервер (/api/diaries/:id/lock и POST signed) сверяет цифры с pin_code_hash
  сотрудника смены и пишет в crypto_signature_pkcs7 непрозрачную отметку
  SIMPLE_PIN_EP|userId|iso|hashPrefix — не сами цифры PIN. Неверный PIN → 403.
  Legacy строки PIN:… при GET редactятся. Это простая ЭП (ст. 5 63-ФЗ), не УКЭП.
*/

/**
 * Почему подпись КриптоПро сейчас не проходит и что делать вместо неё. Текст
 * один и тот же для предупреждения в окне и для отказа по кнопке, чтобы врач не
 * читал две разные версии одной причины.
 */
export const CRYPTO_SIGNING_UNAVAILABLE_TEXT =
	"Подпись КриптоПро пока недоступна: нужен отпечаток сохранённого черновика, а его ещё нет. Нажмите «Сохранить черновик», дождитесь отметки времени сохранения и откройте подписание снова — отпечаток придёт с сервера. Пока можно подписать простой подписью по ПИН-коду на соседней вкладке.";

/** Человеческая причина отказа. Машинный текст плагина на экран не выносим. */
function readableSigningFailure(error: unknown): string {
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

export const CryptoProSigner: React.FC<CryptoProSignerProps> = ({
	diaryHash,
	isLocked,
	lockedAt,
	ensureDraftSaved,
	onLock,
}) => {
	const [certificates, setCertificates] = useState<CertificateInfo[]>([]);
	const [certificatesLoaded, setCertificatesLoaded] = useState(false);
	const [selectedCert, setSelectedCert] = useState("");
	const [isLoadingCerts, setIsLoadingCerts] = useState(false);
	const [showPinDialog, setShowPinDialog] = useState(false);
	const [pinCode, setPinCode] = useState("");
	const [signatureType, setSignatureType] = useState<"crypto" | "pin">("pin");
	const [isSigning, setIsSigning] = useState(false);
	const [failureText, setFailureText] = useState<string | null>(null);
	/*
	 * ОКНО БОЛЬШЕ НЕ ЗАКРЫВАЕТСЯ КАК ПРИ УСПЕХЕ, ПОКА ПОДПИСЬ НЕ ПОДТВЕРЖДЕНА.
	 *
	 * БЫЛО: сразу после `await onLock(...)` вызывался closeDialog(). А doLock
	 * (components/useVisitDiaryLogic.ts) при отказе исключение НЕ бросает: он
	 * показывает всплывающее сообщение и возвращает управление точно так же, как
	 * при удачном подписании. Отказов там шесть — врач не выбран, дневник ещё не
	 * прочитан с сервера, штрихкод лотка не подтверждён журналом стерилизации,
	 * дневник не сохранён (нет его идентификатора), маршрут /lock ответил
	 * ошибкой, сеть не дошла. В каждом из них окно подписания закрывалось,
	 * ПИН стирался, и врач у кресла видел единственный признак — окно исчезло,
	 * то есть «подписано». Запись при этом оставалась неподписанной.
	 *
	 * Подтверждение приходит не ответом функции, а сменой признака isLocked у
	 * родителя. Поэтому ждём его ограниченное время: подписалось — компонент сам
	 * уходит в ветку «Подписано» и окно исчезает; не подписалось — говорим об
	 * этом словами прямо в окне, а не всплывающей подсказкой, которая гаснет.
	 */
	const [awaitingLockConfirmation, setAwaitingLockConfirmation] =
		useState(false);

	/*
	 * ПОДПИСАНИЕ ИДЁТ — ОКНО ЗАКРЫТЬ НЕЛЬЗЯ НИЧЕМ.
	 *
	 * БЫЛО: и клавиша Escape, и кнопка «Отмена» смотрели ТОЛЬКО на isSigning, а
	 * ожидание подтверждения подписи (awaitingLockConfirmation, до 1,5 секунды)
	 * ими не закрывалось. Это возвращало ровно тот дефект, от которого ожидание и
	 * заведено: врач нажимал «Подписать», окно замирало на «Подписываю…», и,
	 * решив, что ничего не происходит, он жал Escape или «Отмена». Окно исчезало —
	 * то есть подавало ЕДИНСТВЕННЫЙ признак, который врач читает как «подписано»,
	 * — а closeDialog гасил таймер вместе с ещё не показанной причиной отказа.
	 * Запись при этом оставалась неподписанной и открытой для правок.
	 *
	 * Отказы doLock (components/useVisitDiaryLogic.ts) исключений не бросают:
	 * врач не выбран, дневник не прочитан с сервера, штрихкод лотка не подтверждён
	 * журналом стерилизации, дневник не сохранён, маршрут /lock ответил ошибкой,
	 * сеть не дошла — в каждом случае функция возвращает управление так же, как
	 * при успехе. Признак успеха один: isLocked у родителя. Пока его нет, окно
	 * держим, причём запрет ограничен по времени: таймер ожидания всегда
	 * срабатывает и либо показывает отказ, либо компонент уходит в ветку
	 * «Подписано». Тупика здесь нет.
	 */
	const lockInProgress = isSigning || awaitingLockConfirmation;

	const closeDialog = useCallback(() => {
		setShowPinDialog(false);
		setFailureText(null);
		setAwaitingLockConfirmation(false);
		// ПИН не держим в памяти дольше самого подписания.
		setPinCode("");
	}, []);

	// Окно перекрывает весь экран, поэтому обязано закрываться Escape — но не
	// посреди подписания, когда закрытие выглядит как подтверждение подписи.
	useEffect(() => {
		if (!showPinDialog) return;
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape" && !lockInProgress) closeDialog();
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [showPinDialog, lockInProgress, closeDialog]);

	// Ожидание подтверждения подписи: истекло, а признак isLocked не пришёл —
	// значит, подписание отказало без исключения (см. пояснение выше).
	useEffect(() => {
		if (!awaitingLockConfirmation) return;
		const timer = setTimeout(() => {
			setAwaitingLockConfirmation(false);
			setFailureText(
				"Запись НЕ подписана: сервер не подтвердил подпись. Набранный текст на месте, ничего не потеряно. Причину показало сообщение в углу экрана — чаще всего дневник не сохранён на сервере или не подтверждён штрихкод лотка. Нажмите «Сохранить черновик», затем повторите подписание.",
			);
		}, 1500);
		return () => clearTimeout(timer);
	}, [awaitingLockConfirmation]);

	const loadCertificates = async () => {
		setIsLoadingCerts(true);
		setFailureText(null);
		try {
			const certs = await signatureService.getCertificates();
			setCertificates(certs);
			setCertificatesLoaded(true);
			if (certs.length > 0) setSelectedCert(certs[0]?.thumbprint ?? "");
		} catch (error) {
			showToast(
				actionFailureToast(
					"Ошибка выполнения операции",
					(error as { status?: number })?.status ?? null,
				),
				"error",
			);
			console.error("[ЭЦП] список сертификатов не прочитан:", error);
			setCertificates([]);
			setCertificatesLoaded(true);
			setFailureText(readableSigningFailure(error));
		} finally {
			setIsLoadingCerts(false);
		}
	};

	const selectedCertInfo = certificates.find(
		(c) => c.thumbprint === selectedCert,
	);
	// Рутокен без ПИН-кода носителя подписать нельзя — так устроен lib/cryptopro.ts.
	const needsTokenPin =
		selectedCertInfo?.provider === "rutoken" ||
		selectedCertInfo?.deviceId !== undefined;

	/*
	 * Подписывается отпечаток записи (diaryHash) с сервера.
	 *
	 * БЫЛО: diary_hash писался только в /lock → у черновика diaryHash всегда
	 * null → вкладка КриптоПро навсегда «недоступна». Сохранение не помогало.
	 *
	 * СТАЛО: POST /api/diaries (draft) считает и отдаёт hash; doSave кладёт
	 * его в state. Пока hash null (черновик ещё не сохранён) — честный совет
	 * «Сохранить черновик». Считать хеш на клиенте нельзя: порядок полей
	 * серверный.
	 */
	const cryptoSigningUnavailable = !diaryHash;

	const handleConfirmLock = async () => {
		// Пока ждём подтверждения подписи, второе нажатие — второе подписание той
		// же записи.
		if (lockInProgress) return;
		setFailureText(null);

		if (signatureType === "crypto") {
			if (!selectedCert) {
				setFailureText("Сначала выберите сертификат из списка.");
				return;
			}
			if (cryptoSigningUnavailable) {
				setFailureText(CRYPTO_SIGNING_UNAVAILABLE_TEXT);
				return;
			}
			if (needsTokenPin && pinCode.length === 0) {
				setFailureText("Введите ПИН-код носителя Рутокен.");
				return;
			}
			setIsSigning(true);
			try {
				const draft = await ensureDraftSaved();
				if (!draft?.id || !draft.hash) {
					setFailureText(
						"Черновик не сохранился — отпечаток для подписи не получен. Нажмите «Сохранить черновик» и повторите подписание.",
					);
					return;
				}
				const { signatureBase64 } = await signatureService.signData(
					selectedCert,
					draft.hash,
					pinCode,
					selectedCertInfo?.deviceId,
				);
				await onLock(selectedCert, signatureBase64, draft.id);
				// ПИН носителя в памяти дольше подписания не держим, а окно закроется
				// само, когда придёт подтверждение подписи.
				setPinCode("");
				setAwaitingLockConfirmation(true);
			} catch (error) {
				showToast(
					actionFailureToast(
						"Ошибка выполнения операции",
						(error as { status?: number })?.status ?? null,
					),
					"error",
				);
				console.error("[ЭЦП] подписание не выполнено:", error);
				setFailureText(readableSigningFailure(error));
			} finally {
				setIsSigning(false);
			}
			return;
		}

		if (pinCode.length !== 4) {
			setFailureText("ПИН-код сотрудника — четыре цифры. Введите все четыре.");
			return;
		}
		setIsSigning(true);
		try {
			await onLock("PIN_SIGNATURE", `PIN:${pinCode}`);
			setPinCode("");
			setAwaitingLockConfirmation(true);
		} catch (error) {
			showToast(
				actionFailureToast(
					"Ошибка выполнения операции",
					(error as { status?: number })?.status ?? null,
				),
				"error",
			);
			console.error("[ЭЦП] простое подписание не выполнено:", error);
			setFailureText(readableSigningFailure(error));
		} finally {
			setIsSigning(false);
		}
	};

	if (isLocked) {
		/* Дата может не прийти: раньше здесь стоял new Date(lockedAt!) и врач видел
		   «Invalid Date» под словом «Подписано». */
		const signedAtText = lockedAt
			? new Date(lockedAt).toLocaleString("ru-RU")
			: null;
		return (
			<div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
				<ShieldCheck className="w-4 h-4 text-emerald-500" />
				<div>
					<div className="text-xs font-medium text-emerald-400">
						Подписано и защищено от правок
					</div>
					<div className="text-[10px] text-emerald-500/70">
						{signedAtText ?? "время подписания уточняется"}
					</div>
				</div>
			</div>
		);
	}

	return (
		<>
			<button
				type="button"
				onClick={() => {
					setFailureText(null);
					setShowPinDialog(true);
				}}
				className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-xl transition-colors border border-zinc-700"
			>
				<Lock className="w-4 h-4" />
				<span>Подписать и закрыть</span>
			</button>

			{showPinDialog && (
				<div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
					<div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative overflow-hidden">
						<div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-500 to-orange-500"></div>

						<h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
							<ShieldCheck className="w-6 h-6 text-rose-500" />
							Подписание дневника
						</h3>
						<p className="text-zinc-400 text-sm mb-6">
							После подписания редактирование будет заблокировано.
						</p>

						<div className="flex gap-2 mb-6 p-1 bg-zinc-950 rounded-lg border border-zinc-800">
							<button
								type="button"
								disabled={lockInProgress}
								onClick={() => {
									setSignatureType("pin");
									setFailureText(null);
									// Поле ПИН общее для двух способов: чужой остаток не переносим.
									setPinCode("");
								}}
								className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors disabled:opacity-60 ${
									signatureType === "pin"
										? "bg-zinc-800 text-white shadow-sm"
										: "text-zinc-500 hover:text-zinc-300"
								}`}
							>
								Простая подпись (ПИН)
							</button>
							<button
								type="button"
								disabled={lockInProgress}
								onClick={() => {
									setSignatureType("crypto");
									setFailureText(null);
									setPinCode("");
									loadCertificates();
								}}
								className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors disabled:opacity-60 ${
									signatureType === "crypto"
										? "bg-zinc-800 text-white shadow-sm"
										: "text-zinc-500 hover:text-zinc-300"
								}`}
							>
								КриптоПро / Рутокен
							</button>
						</div>

						{signatureType === "pin" ? (
							<div className="mb-6">
								<label
									htmlFor="cryptopro-pincode"
									className="block text-xs font-medium text-zinc-500 mb-2 uppercase tracking-wider"
								>
									Ваш ПИН-код сотрудника
								</label>
								<input
									id="cryptopro-pincode"
									type="password"
									inputMode="numeric"
									autoComplete="off"
									maxLength={4}
									disabled={lockInProgress}
									className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white text-center text-2xl tracking-[1em] focus:ring-2 focus:ring-rose-500 focus:outline-none disabled:opacity-60"
									value={pinCode}
									onChange={(e) => {
										setPinCode(e.target.value.replace(/\D/g, ""));
										setFailureText(null);
									}}
									placeholder="••••"
								/>
								<p className="mt-2 text-[11px] text-zinc-500">
									Четыре цифры — тот же ПИН, которым вы входите в смену.
								</p>
							</div>
						) : (
							<div className="mb-6 space-y-4">
								{/*
									Причина называется до всех действий: раньше врач выбирал
									сертификат, искал носитель, вводил ПИН носителя — и только
									после кнопки узнавал отказ, да ещё и с неверным советом.
								*/}
								{cryptoSigningUnavailable ? (
									<p
										role="status"
										aria-live="polite"
										className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-200 text-xs leading-relaxed"
									>
										{CRYPTO_SIGNING_UNAVAILABLE_TEXT}
									</p>
								) : null}
								<div>
									<label
										htmlFor="cryptopro-cert-select"
										className="block text-xs font-medium text-zinc-500 mb-2 uppercase tracking-wider"
									>
										Выберите сертификат
									</label>
									<select
										id="cryptopro-cert-select"
										className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-200 focus:ring-2 focus:ring-rose-500 focus:outline-none"
										value={selectedCert}
										onChange={(e) => {
											setSelectedCert(e.target.value);
											setFailureText(null);
										}}
										disabled={isLoadingCerts || lockInProgress}
									>
										{isLoadingCerts ? (
											<option>Читаем сертификаты…</option>
										) : certificates.length === 0 ? (
											<option value="">Сертификаты не найдены</option>
										) : (
											certificates.map((c) => (
												<option key={c.thumbprint} value={c.thumbprint}>
													{c.name} (до{" "}
													{new Date(c.validTo).toLocaleDateString("ru-RU")})
												</option>
											))
										)}
									</select>
									{/*
										Пустой список раньше выглядел одинаково для трёх разных
										причин, потому что getCertificates() глотает ошибки. Пишем,
										что проверить, — иначе врач решает, что подписать нечем.
									*/}
									{!isLoadingCerts &&
									certificatesLoaded &&
									certificates.length === 0 ? (
										<p className="mt-2 text-[11px] text-amber-400">
											Ни одного сертификата не видно. Проверьте: носитель
											Рутокен вставлен, КриптоПро установлен, расширение
											браузера включено. Затем нажмите «Обновить список».
											Подписать приём можно и простой подписью по ПИН-коду.
										</p>
									) : null}
									<button
										type="button"
										onClick={loadCertificates}
										disabled={isLoadingCerts || lockInProgress}
										className="mt-2 text-xs text-rose-400 hover:text-rose-300 disabled:opacity-60"
									>
										{isLoadingCerts ? "Обновляю…" : "Обновить список"}
									</button>
								</div>

								{/*
									Для Рутокена ПИН носителя обязателен — без него подписание
									всегда падало с английской ошибкой, а поля ввода не было.
								*/}
								{needsTokenPin ? (
									<div>
										<label
											htmlFor="cryptopro-token-pin"
											className="block text-xs font-medium text-zinc-500 mb-2 uppercase tracking-wider"
										>
											ПИН-код носителя Рутокен
										</label>
										<input
											id="cryptopro-token-pin"
											type="password"
											autoComplete="off"
											disabled={lockInProgress}
											className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-rose-500 focus:outline-none disabled:opacity-60"
											value={pinCode}
											onChange={(e) => {
												setPinCode(e.target.value);
												setFailureText(null);
											}}
											placeholder="ПИН носителя"
										/>
									</div>
								) : null}
							</div>
						)}

						{failureText ? (
							<div
								role="alert"
								aria-live="assertive"
								className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/40 text-rose-200 text-xs leading-relaxed"
							>
								{failureText}
							</div>
						) : null}

						{/*
							Кнопки на время подписания заперты, поэтому окно обязано сказать,
							ЧЕГО оно ждёт и сколько. Молча погасшая «Отмена» — это отдельный
							дефект: врач решает, что окно повисло, и ищет, чем его закрыть.
						*/}
						{lockInProgress ? (
							<div
								role="status"
								aria-live="polite"
								className="mb-4 p-3 rounded-xl bg-zinc-800/70 border border-zinc-700 text-zinc-300 text-xs leading-relaxed"
							>
								Отправили подпись и ждём подтверждения сервера — это пара
								секунд. Не закрывайте окно: пока подтверждения нет, запись НЕ
								подписана. Если подписать не удалось, причина появится здесь же.
							</div>
						) : null}

						<div className="flex gap-3 pt-2">
							<button
								type="button"
								onClick={closeDialog}
								disabled={lockInProgress}
								title={
									lockInProgress
										? "Идёт подписание. Дождитесь подтверждения сервера или сообщения об отказе — закрытое окно выглядело бы как подписанная запись."
										: undefined
								}
								className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium rounded-xl transition-colors disabled:opacity-60"
							>
								Отмена
							</button>
							{/*
								Кнопка не ведёт в тупик: пока подпись КриптоПро невозможна,
								нажимать её незачем — рядом написано, чем подписать вместо неё.
								Проверка в handleConfirmLock оставлена как второй рубеж.
							*/}
							<button
								type="button"
								onClick={handleConfirmLock}
								disabled={
									lockInProgress ||
									(signatureType === "crypto" && cryptoSigningUnavailable)
								}
								title={
									signatureType === "crypto" && cryptoSigningUnavailable
										? CRYPTO_SIGNING_UNAVAILABLE_TEXT
										: undefined
								}
								className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-medium rounded-xl transition-colors shadow-lg shadow-rose-500/20 disabled:opacity-60 flex items-center justify-center gap-2"
							>
								{lockInProgress ? (
									"Подписываю…"
								) : (
									<>
										<CheckCircle2 className="w-4 h-4" /> Подписать
									</>
								)}
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	);
};
