import { logger } from "./logger";

/**
 * Utility module to interface with CryptoPro Browser Plug-in (cadesplugin)
 * for signing documents with Qualified Electronic Signature (УКЭП/УНЭП)
 * under 63-FZ and GOST R 34.10-2012.
 */

declare global {
	interface Window {
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		cadesplugin?: any;
	}
}

export interface CryptoProCertificate {
	/** Readable display name — alias of subjectName for UI convenience */
	name: string;
	subjectName: string;
	issuerName: string;
	validFrom: string;
	validTo: string;
	thumbprint: string;
	hasPrivateKey: boolean;
	isValid: boolean;
	serialNumber?: string;
	algorithmOid?: string;
	algorithmName?: string;
	isGost?: boolean;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	certObject: any;
}

export interface CryptoProParsedError {
	userMessage: string;
	code?: string;
	isCancellation: boolean;
}

/**
 * Helper executing a promise with an enforced timeout to prevent infinite UI hangs.
 */
export async function withTimeout<T>(
	promise: Promise<T>,
	timeoutMs: number,
	timeoutMessage: string,
): Promise<T> {
	let timer: ReturnType<typeof setTimeout> | undefined;
	const timeoutPromise = new Promise<never>((_, reject) => {
		timer = setTimeout(() => {
			reject(new Error(timeoutMessage));
		}, timeoutMs);
	});
	try {
		return await Promise.race([promise, timeoutPromise]);
	} finally {
		if (timer) clearTimeout(timer);
	}
}

/**
 * Parses CryptoPro / cadesplugin COM exceptions and Windows CAPI HRESULTs into
 * human-readable Russian messages with clear recovery actions for clinicians.
 */
export function parseCryptoProError(err: unknown): CryptoProParsedError {
	const raw = String(
		err instanceof Error
			? err.message
			: typeof err === "object" && err !== null && "message" in err
				? (err as { message: unknown }).message
				: err ?? "",
	);
	const lower = raw.toLowerCase();

	// 1. Отмена пользователем (PIN dialog cancelled, window closed)
	if (
		lower.includes("0x8010006e") ||
		lower.includes("0x800704c7") ||
		lower.includes("cancelled") ||
		lower.includes("canceled") ||
		lower.includes("отменено") ||
		lower.includes("отмена") ||
		lower.includes("отклонено")
	) {
		return {
			userMessage:
				"Операция подписания отменена: ввод PIN-кода или подтверждение сертификата отклонены пользователем.",
			code: "USER_CANCELLED",
			isCancellation: true,
		};
	}

	// 2. Ошибки PIN-кода токена
	if (
		lower.includes("0x8009001a") ||
		lower.includes("неверный pin") ||
		lower.includes("неверный пароль") ||
		lower.includes("pin-код") ||
		lower.includes("bad pin") ||
		lower.includes("pin blocked") ||
		lower.includes("заблокирован")
	) {
		return {
			userMessage:
				"Неверный PIN-код токена или токен заблокирован. Проверьте правильность ввода PIN в панели КриптоПро CSP.",
			code: "INVALID_PIN",
			isCancellation: false,
		};
	}

	// 3. Отсутствие ключа на носителе / токен вынут из порта
	if (
		lower.includes("0x80090016") ||
		lower.includes("0x8010000c") ||
		lower.includes("keyset does not exist") ||
		lower.includes("набор ключей не существует") ||
		lower.includes("карта не найдена") ||
		lower.includes("носитель не найден") ||
		lower.includes("smart card was removed")
	) {
		return {
			userMessage:
				"Ключевой носитель (Рутокен, JaCarta или USB-токен) не обнаружен. Вставьте токен в USB-порт компьютера и повторите подписание.",
			code: "TOKEN_NOT_FOUND",
			isCancellation: false,
		};
	}

	// 4. Несовпадение алгоритма (не ГОСТ)
	if (
		lower.includes("0x80090008") ||
		lower.includes("bad algid") ||
		lower.includes("неправильный алгоритм") ||
		lower.includes("не поддерживается") ||
		lower.includes("algorithm mismatch")
	) {
		return {
			userMessage:
				"Алгоритм ключа не соответствует ГОСТ Р 34.10-2012. Подписание медицинских документов допускается только по стандарту ГОСТ Р 34.10-2012 (63-ФЗ).",
			code: "INVALID_ALGORITHM",
			isCancellation: false,
		};
	}

	// 5. Таймаут диалога токена / плагина
	if (
		lower.includes("timeout") ||
		lower.includes("таймаут") ||
		lower.includes("превышено время")
	) {
		return {
			userMessage:
				"Превышено время ожидания ответа КриптоПро (таймаут 45 с). Проверьте, не появилось ли диалоговое окно ввода PIN-кода на панели задач Windows.",
			code: "TIMEOUT",
			isCancellation: false,
		};
	}

	// 6. Служба CSP не отвечает
	if (
		lower.includes("0x800706ba") ||
		lower.includes("rpc server") ||
		lower.includes("сервер rpc")
	) {
		return {
			userMessage:
				"Служба КриптоПро CSP недоступна или остановлена. Перезапустите службу в оснастке Windows («Службы») или перезагрузите компьютер.",
			code: "RPC_UNAVAILABLE",
			isCancellation: false,
		};
	}

	// 7. Плагин не установлен
	if (
		lower.includes("плагин") ||
		lower.includes("cadesplugin") ||
		lower.includes("plugin") ||
		lower.includes("не установлен")
	) {
		return {
			userMessage:
				"Плагин «КриптоПро ЭЦП Browser Plug-in» не обнаружен в браузере. Установите расширение и перезапустите браузер.",
			code: "PLUGIN_NOT_FOUND",
			isCancellation: false,
		};
	}

	// Общая ошибка
	return {
		userMessage: `Ошибка КриптоПро: ${raw || "сбой при взаимодействии с плагином"}`,
		code: "GENERIC_ERROR",
		isCancellation: false,
	};
}

/**
 * Checks if the CryptoPro Browser Plug-in is installed and loaded in the browser.
 */
export async function checkCryptoProPlugin(): Promise<boolean> {
	if (typeof window === "undefined") return false;

	try {
		// Wait for cadesplugin global object to be injected and ready
		if (!window.cadesplugin) {
			return false;
		}

		// Try to run a simple API call with 5s timeout
		await withTimeout(
			window.cadesplugin.then,
			5000,
			"Таймаут инициализации плагина КриптоПро.",
		);
		return true;
	} catch (e) {
		logger.warn("CryptoPro plugin check failed:", e);
		return false;
	}
}

/**
 * Retrieves a list of available personal certificates from the CryptoPro store.
 */
export async function getPersonalCertificates(): Promise<
	CryptoProCertificate[]
> {
	const hasPlugin = await checkCryptoProPlugin();
	if (!hasPlugin) {
		throw new Error(
			"КриптоПро ЭЦП Browser Plug-in не установлен или не запущен.",
		);
	}

	const cades = window.cadesplugin;

	try {
		return await withTimeout(
			(async () => {
				// Create Store object
				const oStore = await cades.CreateObjectAsync("CAdESCOM.Store");
				// Open personal certificates store read-only
				await oStore.Open(
					cades.CADESCOM_CONTAINER_STORE,
					cades.CAPICOM_MY_STORE,
					cades.CAPICOM_STORE_OPEN_READ_ONLY,
				);

				const oCertificates = await oStore.Certificates;
				const count = await oCertificates.Count;
				const certs: CryptoProCertificate[] = [];

				for (let i = 1; i <= count; i++) {
					try {
						const cert = await oCertificates.Item(i);
						const subjectName = await cert.SubjectName;
						const issuerName = await cert.IssuerName;
						const validFrom = await cert.ValidFromDate;
						const validTo = await cert.ValidToDate;
						const thumbprint = await cert.Thumbprint;
						const hasPrivateKey = await cert.HasPrivateKey();
						const isValid = await (await cert.IsValid()).Result;

						let serialNumber = "";
						try {
							serialNumber = (await cert.SerialNumber) || "";
						} catch {
							// Optional
						}

						let algorithmOid = "";
						let algorithmName = "";
						try {
							const pubKey = await cert.PublicKey();
							const alg = await pubKey.Algorithm;
							algorithmOid = (await alg.Value) || "";
							algorithmName = (await alg.FriendlyName) || "";
						} catch {
							// Optional
						}

						const isGost =
							algorithmOid === "1.2.643.7.1.1.1.1" ||
							algorithmOid === "1.2.643.7.1.1.1.2" ||
							algorithmOid === "1.2.643.2.2.19" ||
							algorithmName.toLowerCase().includes("гост") ||
							algorithmName.toLowerCase().includes("gost");

						certs.push({
							name: subjectName,
							subjectName,
							issuerName,
							validFrom: String(validFrom),
							validTo: String(validTo),
							thumbprint,
							hasPrivateKey,
							isValid,
							serialNumber,
							algorithmOid,
							algorithmName,
							isGost,
							certObject: cert,
						});
					} catch (certError) {
						logger.warn(`Failed to parse certificate index ${i}:`, certError);
					}
				}

				await oStore.Close();
				return certs;
			})(),
			15000,
			"Превышено время ожидания ответа хранилища сертификатов (15 с).",
		);
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	} catch (error: any) {
		logger.error("Failed to read CryptoPro certificates store:", error);
		const parsed = parseCryptoProError(error);
		throw new Error(parsed.userMessage);
	}
}

/**
 * Signs base64 data (PDF file or XML) using a specific certificate thumbprint
 * in detached CAdES-BES format with 45-second user prompt timeout.
 */
export async function signBase64WithCertificate(
	base64Content: string,
	thumbprint: string,
): Promise<string> {
	const hasPlugin = await checkCryptoProPlugin();
	if (!hasPlugin) {
		throw new Error(
			"КриптоПро ЭЦП Browser Plug-in не установлен или не запущен.",
		);
	}

	const cades = window.cadesplugin;

	try {
		return await withTimeout(
			(async () => {
				// Find certificate by thumbprint
				const oStore = await cades.CreateObjectAsync("CAdESCOM.Store");
				await oStore.Open(
					cades.CADESCOM_CONTAINER_STORE,
					cades.CAPICOM_MY_STORE,
					cades.CAPICOM_STORE_OPEN_READ_ONLY,
				);

				const oCertificates = await oStore.Certificates;
				const foundCerts = await oCertificates.Find(
					cades.CAPICOM_CERTIFICATE_FIND_SHA1_HASH,
					thumbprint,
				);

				const foundCount = await foundCerts.Count;
				if (foundCount === 0) {
					await oStore.Close();
					throw new Error(
						`Сертификат с отпечатком ${thumbprint} не найден в хранилище.`,
					);
				}

				const cert = await foundCerts.Item(1);

				// Prepare signer
				const oSigner = await cades.CreateObjectAsync("CAdESCOM.CPSigner");
				await oSigner.propset_Certificate(cert);
				// Detached signature (separated from content)
				await oSigner.propset_CheckCertificate(true);

				// Prepare signed data structure
				const oSignedData = await cades.CreateObjectAsync(
					"CAdESCOM.CadesSignedData",
				);
				await oSignedData.propset_ContentEncoding(
					cades.CADESCOM_BASE64_TO_BINARY,
				);
				await oSignedData.propset_Content(base64Content);

				// Generate detached CAdES-BES signature
				const pkcs7Signature = await oSignedData.SignCades(
					oSigner,
					cades.CADESCOM_CADES_BES,
					true, // Detached
				);

				await oStore.Close();
				return pkcs7Signature;
			})(),
			45000,
			"Превышено время ожидания ввода PIN-кода токена (таймаут 45 с). Проверьте окно ввода PIN-кода на панели задач.",
		);
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	} catch (error: any) {
		logger.error("CryptoPro signing error:", error);
		const parsed = parseCryptoProError(error);
		throw new Error(parsed.userMessage);
	}
}
