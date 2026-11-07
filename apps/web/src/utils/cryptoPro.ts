import { GOST_CRYPTO_OIDS } from "@dental/shared";
import { logger } from "./logger";

/**
 * Utility module to interface with CryptoPro Browser Plug-in (cadesplugin)
 * for signing documents with Qualified Electronic Signature (УКЭП/УНЭП)
 * under GOST R 34.10-2012 (Hardware CAdES-BES contour).
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
	isNative?: boolean;
	deviceId?: number;
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
				: (err ?? ""),
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
				"Алгоритм ключа не соответствует ГОСТ Р 34.10-2012. Выберите квалифицированный сертификат по стандарту ГОСТ Р 34.10-2012.",
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

let cachedNativeStatus: { available: boolean; timestamp: number } | null = null;

/**
 * Проверяет доступность нативного CLI-моста КриптоПро на бэкенде (cryptcp.exe / csptest.exe).
 */
export async function checkCryptoProNativeBridge(): Promise<boolean> {
	if (cachedNativeStatus && Date.now() - cachedNativeStatus.timestamp < 10000) {
		return cachedNativeStatus.available;
	}
	try {
		const res = await fetch("/api/cryptopro/native/status", {
			method: "GET",
			headers: { Accept: "application/json" },
		});
		if (!res.ok) {
			cachedNativeStatus = { available: false, timestamp: Date.now() };
			return false;
		}
		const data = (await res.json()) as { success?: boolean; signingAvailable?: boolean };
		const isAvail = Boolean(data.success && data.signingAvailable);
		cachedNativeStatus = { available: isAvail, timestamp: Date.now() };
		return isAvail;
	} catch (e) {
		logger.info("[CryptoPro] Нативный CLI-мост бэкенда недоступен:", e);
		cachedNativeStatus = { available: false, timestamp: Date.now() };
		return false;
	}
}

/**
 * Checks if CryptoPro is available either via the browser extension (cadesplugin)
 * or via the backend native CLI bridge (cryptcp.exe / csptest.exe) [CRY-03].
 */
export async function checkCryptoProPlugin(): Promise<boolean> {
	// 1. Проверяем браузерное расширение cadesplugin
	if (typeof window !== "undefined" && window.cadesplugin) {
		try {
			await withTimeout(
				window.cadesplugin.then,
				5000,
				"Таймаут инициализации плагина КриптоПро.",
			);
			return true;
		} catch (e) {
			logger.warn("CryptoPro browser plugin check failed:", e);
		}
	}

	// 2. [CRY-03]: Если расширения браузера нет — проверяем нативный CLI-мост бэкенда Fastify
	const isNativeAvailable = await checkCryptoProNativeBridge();
	return isNativeAvailable;
}

/**
 * Извлекает сертификаты через браузерный плагин CAdESCOM.Store.
 */
async function getCertificatesFromCadesPlugin(): Promise<CryptoProCertificate[]> {
	const cades = window.cadesplugin;
	return await withTimeout(
		(async () => {
			const oStore = await cades.CreateObjectAsync("CAdESCOM.Store");
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
						algorithmOid === GOST_CRYPTO_OIDS.GOST_3410_2012_256 ||
						algorithmOid === GOST_CRYPTO_OIDS.GOST_3410_2012_512 ||
						algorithmOid === GOST_CRYPTO_OIDS.GOST_3410_2001_LEGACY ||
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
						isNative: false,
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
}

/**
 * Retrieves a list of available personal certificates from CryptoPro
 * (via browser extension cadesplugin or transparent native Fastify CLI bridge [CRY-03]).
 */
export async function getPersonalCertificates(): Promise<CryptoProCertificate[]> {
	// 1. Попытка чтения через браузерный плагин cadesplugin
	if (typeof window !== "undefined" && window.cadesplugin) {
		try {
			await withTimeout(window.cadesplugin.then, 5000, "Таймаут");
			return await getCertificatesFromCadesPlugin();
		} catch (cadesErr) {
			logger.warn("CAdESCOM plugin store fetch failed, falling back to native bridge:", cadesErr);
		}
	}

	// 2. [CRY-03]: Прозрачное обращение к нативному эндпоинту Fastify /api/cryptopro/native/certificates
	try {
		const res = await fetch("/api/cryptopro/native/certificates", {
			method: "GET",
			headers: { Accept: "application/json" },
		});
		if (!res.ok) {
			const errData = (await res.json().catch(() => ({}))) as { message?: string; code?: string };
			if (res.status === 503 || errData.code === "CSP_NOT_INSTALLED") {
				throw new Error("КриптоПро CSP не обнаружен в операционной системе. Доступна работа в автономном режиме и печать бумажного бланка для личной подписи врача.");
			}
			throw new Error(errData.message || `Не удалось получить сертификаты КриптоПро (HTTP ${res.status})`);
		}
		const data = (await res.json()) as { success?: boolean; certificates?: Array<Record<string, unknown>> };
		if (!data.success || !Array.isArray(data.certificates)) {
			return [];
		}

		return data.certificates.map((cert) => {
			const subjectName = String(cert.subjectName || `CN=${cert.doctorFullName || "Врач клиники"}`);
			const doctorFullName = cert.doctorFullName ? String(cert.doctorFullName) : subjectName;
			return {
				name: doctorFullName,
				subjectName,
				issuerName: String(cert.issuerName || "Удостоверяющий центр"),
				validFrom: String(cert.validFrom),
				validTo: String(cert.validTo),
				thumbprint: String(cert.thumbprint),
				hasPrivateKey: Boolean(cert.hasPrivateKey),
				isValid: Boolean(cert.isValid),
				serialNumber: cert.serialNumber ? String(cert.serialNumber) : undefined,
				algorithmOid: String(cert.algorithmOid || GOST_CRYPTO_OIDS.GOST_3410_2012_256),
				algorithmName: String(cert.algorithmName || "ГОСТ Р 34.10-2012 256 бит"),
				isGost: true,
				isNative: true,
				certObject: null,
			};
		});
	} catch (nativeErr: unknown) {
		logger.error("Failed to read certificates from native CryptoPro bridge:", nativeErr);
		const parsed = parseCryptoProError(nativeErr);
		throw new Error(parsed.userMessage);
	}
}

/**
 * Подписывает данные через браузерный плагин CAdESCOM.
 */
async function signWithCadesPlugin(
	base64Content: string,
	thumbprint: string,
	pin?: string,
): Promise<string> {
	const cades = window.cadesplugin;
	return await withTimeout(
		(async () => {
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
			await oSigner.propset_CheckCertificate(true);
			if (pin) {
				try {
					await oSigner.propset_KeyPin(pin);
				} catch (pinErr) {
					logger.info("Programmatic KeyPin not accepted by token driver, falling back to system PIN dialog:", pinErr);
				}
			}

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
}

/**
 * Signs base64 data (PDF file or XML) using a specific certificate thumbprint
 * in detached CAdES-BES format via browser extension or native CLI bridge [CRY-03].
 */
export async function signBase64WithCertificate(
	base64Content: string,
	thumbprint: string,
	pin?: string,
): Promise<string> {
	// 1. Попытка формирования подписи через браузерный плагин cadesplugin
	if (typeof window !== "undefined" && window.cadesplugin) {
		try {
			await withTimeout(window.cadesplugin.then, 5000, "Таймаут");
			return await signWithCadesPlugin(base64Content, thumbprint, pin);
		} catch (cadesErr) {
			logger.warn("CAdESCOM signing failed, trying native CLI bridge:", cadesErr);
			const parsed = parseCryptoProError(cadesErr);
			if (parsed.isCancellation) {
				throw new Error(parsed.userMessage);
			}
		}
	}

	// 2. [CRY-03]: Прозрачное обращение к нативному эндпоинту Fastify /api/cryptopro/native/sign
	try {
		const res = await fetch("/api/cryptopro/native/sign", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
			},
			body: JSON.stringify({
				data: base64Content,
				dataEncoding: "base64",
				thumbprint,
				...(pin ? { pin: pin.trim() } : {}),
			}),
		});

		const data = (await res.json().catch(() => ({}))) as {
			success?: boolean;
			signatureBase64?: string;
			message?: string;
			code?: string;
		};

		if (!res.ok || !data.success || !data.signatureBase64) {
			const errorMsg = data.message || `Ошибка формирования электронной подписи КриптоПро (HTTP ${res.status})`;
			const err = new Error(errorMsg);
			(err as { code?: string }).code = data.code || "SIGNING_FAILED";
			throw err;
		}

		return data.signatureBase64;
	} catch (nativeErr: unknown) {
		logger.error("CryptoPro native signing error:", nativeErr);
		const parsed = parseCryptoProError(nativeErr);
		throw new Error(parsed.userMessage);
	}
}

/**
 * Алиас для совместимости с модальными окнами рецептов и документов.
 */
export const getUserCertificates = getPersonalCertificates;
