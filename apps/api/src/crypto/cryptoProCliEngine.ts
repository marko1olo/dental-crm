/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CRYPTOPRO CSP NATIVE CLI BRIDGE (ГОСТ Р 34.10-2012 / УКЭП / ЕГИСЗ РЭМД)
 * Production CLI bridge for CryptoPro CSP using csptest.exe / cryptcp.exe / certmgr.exe.
 * Reverse-engineered from StomX (ipc_handlers_full.js) with zero mocks and
 * strict race-condition isolation (StomX #4975).
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { execFile } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

// ─── Error Handling ─────────────────────────────────────────────────────────

export class CryptoProCliError extends Error {
	readonly success = false;
	readonly code: string;
	readonly details?: unknown;

	constructor(code: string, message: string, details?: unknown) {
		super(message);
		this.name = "CryptoProCliError";
		this.code = code;
		this.details = details;
	}
}

// ─── Data Types ─────────────────────────────────────────────────────────────

export interface CryptoProCertInfo {
	thumbprint: string; // 40-значный hex SHA-1 отпечаток (uppercase)
	serialNumber: string;
	subjectName: string;
	doctorFullName: string;
	doctorSnils?: string | null;
	ogrn?: string | null;
	ogrnip?: string | null;
	inn?: string | null;
	organizationName?: string | null;
	issuerName: string;
	validFrom: string; // ISO 8601
	validTo: string; // ISO 8601
	hasPrivateKey: boolean;
	isValid: boolean;
	algorithmOid?: string | undefined;
	algorithmName?: string | undefined;
	containerName?: string | undefined;
	isQualified?: boolean | undefined;
}

export interface CryptoProPaths {
	csptest: string | null;
	cryptcp: string | null;
	certmgr: string | null;
}

export type CryptoProSignResult =
	| {
			success: true;
			signature: Buffer;
			signatureBase64: string;
			thumbprint: string;
	  }
	| {
			success: false;
			code: string;
			message: string;
			details?: unknown;
	  };

// ─── System Paths & Binary Discovery ────────────────────────────────────────

const STANDARD_WINDOWS_PATHS = {
	csptest: [
		"C:\\Program Files\\Crypto Pro\\CSP\\csptest.exe",
		"C:\\Program Files (x86)\\Crypto Pro\\CSP\\csptest.exe",
	],
	cryptcp: [
		"C:\\Program Files\\Crypto Pro\\CSP\\cryptcp.x64.exe",
		"C:\\Program Files\\Crypto Pro\\CSP\\cryptcp.exe",
		"C:\\Program Files (x86)\\Crypto Pro\\CSP\\cryptcp.exe",
	],
	certmgr: [
		"C:\\Program Files\\Crypto Pro\\CSP\\certmgr.exe",
		"C:\\Program Files (x86)\\Crypto Pro\\CSP\\certmgr.exe",
	],
};

const STANDARD_UNIX_PATHS = {
	csptest: [
		"/opt/cprocsp/bin/amd64/csptest",
		"/opt/cprocsp/bin/ia32/csptest",
		"/opt/cprocsp/bin/csptest",
	],
	cryptcp: [
		"/opt/cprocsp/bin/amd64/cryptcp",
		"/opt/cprocsp/bin/cryptcp",
	],
	certmgr: [
		"/opt/cprocsp/bin/amd64/certmgr",
		"/opt/cprocsp/bin/certmgr",
	],
};

/**
 * Ищет бинарные утилиты КриптоПро в операционной системе.
 */
export function findCryptoProPaths(): CryptoProPaths {
	const result: CryptoProPaths = {
		csptest: null,
		cryptcp: null,
		certmgr: null,
	};

	const isWindows = process.platform === "win32";

	// 1. Проверяем переменные окружения
	if (process.env.CRYPTOPRO_CSPTEST_PATH && fs.existsSync(process.env.CRYPTOPRO_CSPTEST_PATH)) {
		result.csptest = process.env.CRYPTOPRO_CSPTEST_PATH;
	}
	if (process.env.CRYPTOPRO_CRYPTCP_PATH && fs.existsSync(process.env.CRYPTOPRO_CRYPTCP_PATH)) {
		result.cryptcp = process.env.CRYPTOPRO_CRYPTCP_PATH;
	}
	if (process.env.CRYPTOPRO_CERTMGR_PATH && fs.existsSync(process.env.CRYPTOPRO_CERTMGR_PATH)) {
		result.certmgr = process.env.CRYPTOPRO_CERTMGR_PATH;
	}

	// 2. Если задан общий путь к папке установки КриптоПро
	if (process.env.CRYPTOPRO_PATH && fs.existsSync(process.env.CRYPTOPRO_PATH)) {
		const baseDir = process.env.CRYPTOPRO_PATH;
		const csptestCand = path.join(baseDir, isWindows ? "csptest.exe" : "csptest");
		const cryptcpCand = path.join(baseDir, isWindows ? "cryptcp.exe" : "cryptcp");
		const certmgrCand = path.join(baseDir, isWindows ? "certmgr.exe" : "certmgr");

		if (!result.csptest && fs.existsSync(csptestCand)) result.csptest = csptestCand;
		if (!result.cryptcp && fs.existsSync(cryptcpCand)) result.cryptcp = cryptcpCand;
		if (!result.certmgr && fs.existsSync(certmgrCand)) result.certmgr = certmgrCand;
	}

	// 3. Стандартные пути Windows / Unix
	const candidates = isWindows ? STANDARD_WINDOWS_PATHS : STANDARD_UNIX_PATHS;

	if (!result.csptest) {
		for (const p of candidates.csptest) {
			if (fs.existsSync(p)) {
				result.csptest = p;
				break;
			}
		}
	}

	if (!result.cryptcp) {
		for (const p of candidates.cryptcp) {
			if (fs.existsSync(p)) {
				result.cryptcp = p;
				break;
			}
		}
	}

	if (!result.certmgr) {
		for (const p of candidates.certmgr) {
			if (fs.existsSync(p)) {
				result.certmgr = p;
				break;
			}
		}
	}

	return result;
}

/**
 * Проверяет, установлен ли КриптоПро CSP в операционной системе.
 */
export async function isCryptoProInstalled(): Promise<boolean> {
	const paths = findCryptoProPaths();
	return Boolean(paths.csptest || paths.cryptcp || paths.certmgr);
}

/**
 * Возвращает статус установки утилит КриптоПро для диагностических экранов.
 */
export async function getCryptoProCliStatus(): Promise<{
	installed: boolean;
	paths: CryptoProPaths;
}> {
	const paths = findCryptoProPaths();
	return {
		installed: Boolean(paths.csptest || paths.cryptcp || paths.certmgr),
		paths,
	};
}

// ─── Encoding Helpers ───────────────────────────────────────────────────────

/**
 * Декодирует вывод консольных утилит КриптоПро (в Windows обычно CP1251 или IBM866, в Linux UTF-8).
 */
export function decodeCryptoProOutput(buffer: Buffer): string {
	// Сначала пробуем UTF-8
	try {
		const utf8Str = buffer.toString("utf8");
		if (/[А-Яа-яЁё]/.test(utf8Str) && !utf8Str.includes("\ufffd")) {
			return utf8Str;
		}
	} catch {
		// fallback to cp1251
	}

	// Пробуем windows-1251
	try {
		const cp1251Decoder = new TextDecoder("windows-1251");
		const decoded = cp1251Decoder.decode(buffer);
		if (/[А-Яа-яЁё]/.test(decoded)) {
			return decoded;
		}
	} catch {
		// ignore
	}

	// Пробуем ibm866 (DOS / OEM кодировка консоли Windows)
	try {
		const cp866Decoder = new TextDecoder("ibm866");
		const decoded = cp866Decoder.decode(buffer);
		if (/[А-Яа-яЁё]/.test(decoded)) {
			return decoded;
		}
	} catch {
		// ignore
	}

	return buffer.toString("utf8");
}

// ─── Parsing Output from csptest / cryptcp / certmgr ────────────────────────

function extractDnValue(dnString: string, keyPattern: string): string | null {
	const regex = new RegExp(`(?:^|[,/\\s])(?:${keyPattern})\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^,/\\r\\n]+))`, "i");
	const match = dnString.match(regex);
	if (!match) return null;
	const val = (match[1] ?? match[2] ?? match[3] ?? "").trim();
	return val.length > 0 ? val : null;
}

function parseDateTimeString(raw: string): string | null {
	if (!raw) return null;
	const cleaned = raw.trim().replace(/\s*UTC\s*$/i, "").trim();

	// Формат DD.MM.YYYY HH:mm:ss или DD/MM/YYYY HH:mm:ss
	const dmyMatch = cleaned.match(/^(\d{2})[./](\d{2})[./](\d{4})(?:\s+(\d{2}):(\d{2}):(\d{2}))?/);
	if (dmyMatch) {
		const [, day, month, year, h = "00", m = "00", s = "00"] = dmyMatch;
		const isoCandidate = `${year}-${month}-${day}T${h}:${m}:${s}.000Z`;
		const d = new Date(isoCandidate);
		if (!Number.isNaN(d.getTime())) {
			return d.toISOString();
		}
	}

	// Формат YYYY-MM-DD
	const isoMatch = cleaned.match(/^(\d{4}-\d{2}-\d{2}(?:T|\s)\d{2}:\d{2}:\d{2})/);
	if (isoMatch) {
		const d = new Date(isoMatch[1]!.replace(" ", "T") + "Z");
		if (!Number.isNaN(d.getTime())) {
			return d.toISOString();
		}
	}

	const fallbackDate = new Date(cleaned);
	if (!Number.isNaN(fallbackDate.getTime())) {
		return fallbackDate.toISOString();
	}

	return null;
}

/**
 * Парсит консольный вывод certmgr, cryptcp или csptest со списком сертификатов.
 */
export function parseCertificatesOutput(rawText: string): CryptoProCertInfo[] {
	if (!rawText || rawText.trim().length === 0) return [];

	const blocks: string[] = [];
	const rawBlocks = rawText.split(/(?=(?:={5,}|^\s*\d+\|?\s*Certificate|AcquireContext:\s*OK|Container name:|Контейнер:))/im);

	for (const chunk of rawBlocks) {
		const trimmed = chunk.trim();
		if (
			(trimmed.includes("Subject") || trimmed.includes("Субъект") || trimmed.includes("CN=")) &&
			(trimmed.includes("SHA1") || trimmed.includes("Отпечаток") || trimmed.includes("Serial") || trimmed.includes("Серийный"))
		) {
			blocks.push(trimmed);
		}
	}

	if (blocks.length === 0 && (rawText.includes("Subject") || rawText.includes("Субъект")) && (rawText.includes("SHA1") || rawText.includes("Serial"))) {
		blocks.push(rawText);
	}

	const certificates: CryptoProCertInfo[] = [];

	for (const block of blocks) {
		// 1. Отпечаток SHA-1
		const thumbMatch = block.match(/(?:SHA1 Hash|SHA1-отпечаток|Отпечаток\s*(?:\(SHA1\))?|Хэш)\s*[:=]\s*([a-f0-9\s:-]+?)(?=\r?\n|$)/i);
		if (!thumbMatch) continue;

		const rawThumb = thumbMatch[1]!.replace(/[\s:-]/g, "").toUpperCase();
		if (rawThumb.length < 32) continue;
		const thumbprint = rawThumb;

		// 2. Серийный номер
		const serialMatch = block.match(/(?:Serial(?:\s*Number)?|Серийный\s*номер)\s*[:=]\s*(?:0x)?([a-f0-9\s:-]+)/i);
		const serialNumber = serialMatch ? serialMatch[1]!.replace(/[\s:-]/g, "").toUpperCase() : "";

		// 3. Субъект
		const subjectMatch = block.match(/(?:Subject|Субъект)\s*[:=]\s*(.+?)(?=(?:Issuer|Издатель|Serial|Серийный|Not valid|Действителен|$))/is);
		const subjectName = subjectMatch ? subjectMatch[1]!.replace(/[\r\n]+/g, " ").trim() : "";

		// 4. Издатель
		const issuerMatch = block.match(/(?:Issuer|Издатель)\s*[:=]\s*(.+?)(?=(?:Subject|Субъект|Serial|Серийный|Not valid|Действителен|$))/is);
		const issuerName = issuerMatch ? issuerMatch[1]!.replace(/[\r\n]+/g, " ").trim() : "";

		// 5. Атрибуты из субъекта
		const commonName = extractDnValue(subjectName, "CN") || "";
		const snils = extractDnValue(subjectName, "SNILS|СНИЛС");
		const ogrn = extractDnValue(subjectName, "OGRN|ОГРН");
		const ogrnip = extractDnValue(subjectName, "OGRNIP|ОГРНИП");
		const inn = extractDnValue(subjectName, "INN|ИНН");
		const organization = extractDnValue(subjectName, "O|О|ORG|ORGANIZATION");

		// ФИО врача: берем CN либо Фамилия Имя
		const surname = extractDnValue(subjectName, "SURNAME|SN");
		const givenName = extractDnValue(subjectName, "GIVENNAME|G");
		let doctorFullName = commonName;
		if (surname && givenName) {
			doctorFullName = `${surname} ${givenName}`.trim();
		} else if (!doctorFullName && commonName) {
			doctorFullName = commonName;
		}

		// 6. Сроки действия
		const validFromMatch = block.match(/(?:Not valid before|Valid from|Действителен\s*с)\s*[:=]\s*([^\r\n]+)/i);
		const validToMatch = block.match(/(?:Not valid after|Valid to|Действителен\s*по)\s*[:=]\s*([^\r\n]+)/i);

		const validFrom = parseDateTimeString(validFromMatch ? validFromMatch[1]! : "") || new Date().toISOString();
		const validTo = parseDateTimeString(validToMatch ? validToMatch[1]! : "") || new Date(Date.now() + 365 * 86400000).toISOString();

		// 7. Наличие закрытого ключа
		const hasPrivateKey =
			/PrivateKey\s*[:=]\s*(?:Present|Yes|Available|true|valid)/i.test(block) ||
			/Закрытый\s*ключ\s*[:=]\s*(?:Присутствует|Есть|Да)/i.test(block) ||
			/AcquireContext\s*:\s*OK/i.test(block) ||
			/Certificate in container/i.test(block);

		// 8. Валидность по времени
		const now = Date.now();
		const fromTime = new Date(validFrom).getTime();
		const toTime = new Date(validTo).getTime();
		const isValid = !Number.isNaN(fromTime) && !Number.isNaN(toTime) && now >= fromTime && now <= toTime;

		// 9. Алгоритм
		const algMatch = block.match(/(?:Algorithm|Алгоритм(?: ключа)?)\s*[:=]\s*([^\r\n]+)/i);
		const algorithmRaw = algMatch ? algMatch[1]!.trim() : "";
		const algorithmOid = algorithmRaw.includes("1.2.643.7.1.1.1.2")
			? "1.2.643.7.1.1.1.2"
			: "1.2.643.7.1.1.1.1";
		const algorithmName = algorithmRaw || "ГОСТ Р 34.10-2012 256 бит";

		// 10. Контейнер
		const containerMatch =
			block.match(/(?:Container name|Имя контейнера|FQCN)\s*[:=]\s*([^\r\n]+)/i) ||
			block.match(/(?:^|\r?\n)\s*([^\r\n]+?)\s*\r?\nCertificate in container:/i);
		const containerName = containerMatch ? containerMatch[1]!.trim() : undefined;

		certificates.push({
			thumbprint,
			serialNumber: serialNumber || thumbprint.slice(0, 16),
			subjectName: subjectName || `CN=${doctorFullName}`,
			doctorFullName: doctorFullName || "Врач клиники",
			doctorSnils: snils,
			ogrn,
			ogrnip,
			inn,
			organizationName: organization,
			issuerName: issuerName || "Удостоверяющий центр",
			validFrom,
			validTo,
			hasPrivateKey,
			isValid,
			algorithmOid,
			algorithmName,
			containerName,
			isQualified: true,
		});
	}

	return certificates;
}

// ─── Core Methods ───────────────────────────────────────────────────────────

/**
 * Возвращает список установленных сертификатов в личном хранилище (uMy)
 * или контейнерах закрытых ключей CryptoPro.
 * Если утилиты КриптоПро не установлены — выбрасывает честное исключение CSP_NOT_INSTALLED.
 */
export async function listInstalledCertificates(): Promise<CryptoProCertInfo[]> {
	const paths = findCryptoProPaths();

	if (!paths.csptest && !paths.cryptcp && !paths.certmgr) {
		throw new CryptoProCliError(
			"CSP_NOT_INSTALLED",
			"КриптоПро CSP не обнаружен в операционной системе",
			{ searchedStandardPaths: STANDARD_WINDOWS_PATHS },
		);
	}

	// 1. Предпочитаем certmgr или cryptcp (быстрее и структурированнее выдают uMy)
	if (paths.certmgr) {
		try {
			const { stdout } = await execFileAsync(paths.certmgr, ["-list", "-store", "uMy"], {
				encoding: "buffer",
			});
			const text = decodeCryptoProOutput(stdout);
			return parseCertificatesOutput(text);
		} catch {
			// Если certmgr завершился с ошибкой, попробуем cryptcp
		}
	}

	if (paths.cryptcp) {
		try {
			const { stdout } = await execFileAsync(paths.cryptcp, ["-list", "-store", "uMy"], {
				encoding: "buffer",
			});
			const text = decodeCryptoProOutput(stdout);
			return parseCertificatesOutput(text);
		} catch {
			// fallback to csptest
		}
	}

	// 2. Использование csptest (-keyset -enum_cont -fqcn -verifyc)
	if (paths.csptest) {
		try {
			const { stdout } = await execFileAsync(
				paths.csptest,
				["-keyset", "-enum_cont", "-fqcn", "-verifyc"],
				{ encoding: "buffer" },
			);
			const text = decodeCryptoProOutput(stdout);
			return parseCertificatesOutput(text);
		} catch (err: unknown) {
			const error = err as { stdout?: Buffer; stderr?: Buffer; message?: string };
			const errOutput = decodeCryptoProOutput(error.stderr || error.stdout || Buffer.from(error.message || ""));
			throw new CryptoProCliError(
				"CERTIFICATES_ENUM_FAILED",
				`Не удалось перечислить сертификаты КриптоПро: ${errOutput}`,
				{ rawError: errOutput },
			);
		}
	}

	return [];
}

/**
 * Создает отсоединенную электронную подпись (detached CMS / PKCS#7) по ГОСТ Р 34.10-2012.
 * Использует нативную команду csptest / cryptcp:
 *   csptest.exe -sign -detached -nochain -thumbprint <THUMBPRINT> -dir <TEMP_DIR> <TEMP_FILE>
 *
 * КАТЕГОРИЧЕСКИЙ ЗАПРЕТ НА ФЕЙКОВЫЕ ПОДПИСИ:
 * Если утилита не найдена в системе — возвращает честную ошибку CSP_NOT_INSTALLED
 * без генерации случайных строк через Math.random()!
 */
export async function signDetachedGost(
	dataBuffer: Buffer,
	thumbprint: string,
	options?: { requestId?: string | undefined },
): Promise<Buffer> {
	const paths = findCryptoProPaths();

	if (!paths.csptest && !paths.cryptcp) {
		throw new CryptoProCliError(
			"CSP_NOT_INSTALLED",
			"КриптоПро CSP не обнаружен в операционной системе",
			{ searchedStandardPaths: STANDARD_WINDOWS_PATHS },
		);
	}

	// Валидация и нормализация отпечатка (40 hex chars)
	const cleanThumbprint = thumbprint.replace(/[\s:-]/g, "").toUpperCase();
	if (!/^[A-F0-9]{40}$/i.test(cleanThumbprint)) {
		throw new CryptoProCliError(
			"INVALID_THUMBPRINT",
			"Некорректный отпечаток сертификата: ожидается 40-значный шестнадцатеричный SHA-1 отпечаток",
			{ providedThumbprint: thumbprint },
		);
	}

	if (!dataBuffer || dataBuffer.length === 0) {
		throw new CryptoProCliError(
			"EMPTY_PAYLOAD",
			"Тело данных для формирования электронной подписи не может быть пустым",
		);
	}

	// Защита от параллельных гонок по стандарту StomX (#4975)
	const requestId = options?.requestId ?? crypto.randomUUID();
	const fileTag = "-" + String(requestId).replace(/[^a-z0-9]/gi, "");
	const tmpDir = os.tmpdir();
	const tmpFile = path.join(tmpDir, `dente-sign${fileTag}.dat`);
	const sgnFile = `${tmpFile}.sgn`;
	const sigFile = `${tmpFile}.sig`;

	const cleanup = async () => {
		await fs.promises.unlink(tmpFile).catch(() => {});
		await fs.promises.unlink(sgnFile).catch(() => {});
		await fs.promises.unlink(sigFile).catch(() => {});
	};

	try {
		// Записываем исходный буфер во временный файл
		await fs.promises.writeFile(tmpFile, dataBuffer);

		// Выбираем бинарник: prefer csptest или cryptcp
		const execBin = paths.csptest || paths.cryptcp!;

		// Аргументы команды подписания (StomX стандарт: -sign -detached -nochain -thumbprint ... -dir ... ...)
		const args = [
			"-sign",
			"-detached",
			"-nochain",
			"-thumbprint",
			cleanThumbprint,
			"-dir",
			tmpDir,
			tmpFile,
		];

		try {
			await execFileAsync(execBin, args, { encoding: "buffer" });
		} catch (execErr: unknown) {
			// Если -sign не поддержан (старые версии csptest), пробуем -sfsign
			if (paths.csptest && execBin === paths.csptest) {
				const fallbackArgs = [
					"-sfsign",
					"-sign",
					"-detached",
					"-in",
					tmpFile,
					"-out",
					sgnFile,
					"-my",
					cleanThumbprint,
				];
				await execFileAsync(paths.csptest, fallbackArgs, { encoding: "buffer" });
			} else {
				throw execErr;
			}
		}

		// Проверяем наличие полученного файла подписи (.sgn или .sig)
		let signaturePath: string | null = null;
		if (fs.existsSync(sgnFile)) {
			signaturePath = sgnFile;
		} else if (fs.existsSync(sigFile)) {
			signaturePath = sigFile;
		}

		if (!signaturePath) {
			throw new CryptoProCliError(
				"SIGNATURE_FILE_NOT_FOUND",
				"Утилита КриптоПро завершилась, но файл отсоединенной подписи (.sgn/.sig) не был создан",
			);
		}

		const signatureBuffer = await fs.promises.readFile(signaturePath);
		if (signatureBuffer.length === 0) {
			throw new CryptoProCliError(
				"EMPTY_SIGNATURE",
				"Файл отсоединенной подписи имеет нулевой размер",
			);
		}

		return signatureBuffer;
	} catch (err: unknown) {
		if (err instanceof CryptoProCliError) {
			throw err;
		}
		const execError = err as { stdout?: Buffer; stderr?: Buffer; message?: string; code?: number };
		const decodedErr = decodeCryptoProOutput(execError.stderr || execError.stdout || Buffer.from(execError.message || ""));

		let errorCode = "SIGNING_FAILED";
		let userMessage = `Ошибка создания электронной подписи КриптоПро: ${decodedErr}`;

		if (decodedErr.includes("0x80090016") || decodedErr.includes("NTE_BAD_KEYSET")) {
			errorCode = "CERTIFICATE_KEYSET_NOT_FOUND";
			userMessage = "Закрытый ключ сертификата не найден в контейнере или токен отключен";
		} else if (decodedErr.includes("0x80090010") || decodedErr.includes("Access denied")) {
			errorCode = "PIN_REQUIRED_OR_ACCESS_DENIED";
			userMessage = "Требуется ввод PIN-кода аппаратного токена или доступ ограничен";
		} else if (decodedErr.includes("Certificate not found") || decodedErr.includes("Сертификат не найден")) {
			errorCode = "CERTIFICATE_NOT_FOUND";
			userMessage = `Сертификат с отпечатком ${cleanThumbprint} не найден в хранилище uMy`;
		}

		throw new CryptoProCliError(errorCode, userMessage, {
			thumbprint: cleanThumbprint,
			rawOutput: decodedErr,
			exitCode: execError.code,
		});
	} finally {
		await cleanup();
	}
}

/**
 * Безопасная обертка для подписания, возвращающая объект результата без выбрасывания исключений.
 */
export async function executeSignDetachedGost(
	dataBuffer: Buffer,
	thumbprint: string,
	options?: { requestId?: string | undefined },
): Promise<CryptoProSignResult> {
	try {
		const signature = await signDetachedGost(dataBuffer, thumbprint, options);
		return {
			success: true,
			signature,
			signatureBase64: signature.toString("base64"),
			thumbprint: thumbprint.replace(/[\s:-]/g, "").toUpperCase(),
		};
	} catch (err: unknown) {
		if (err instanceof CryptoProCliError) {
			return {
				success: false,
				code: err.code,
				message: err.message,
				details: err.details,
			};
		}
		const message = err instanceof Error ? err.message : String(err);
		return {
			success: false,
			code: "SIGNING_FAILED",
			message,
		};
	}
}
