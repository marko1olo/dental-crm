import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
	extractGostCmsMetadata,
	type GeneratedDocument,
	injectVisualSignatureStampIntoHtml,
	renderDigitalSignatureStampHtml,
} from "@dental/shared";

export function documentAttachmentFileName(
	document: GeneratedDocument,
	extension: "html" | "pdf" | "xml",
): string {
	return `dente-${document.kind}-${document.id}.${extension}`;
}

export function documentRequiresIssuedArchive(
	document: GeneratedDocument,
): boolean {
	return (
		document.status === "issued" ||
		(document.status === "voided" && Boolean(document.issuedAt))
	);
}

export function documentHasIssuedArchiveMetadata(
	document: GeneratedDocument,
): boolean {
	return Boolean(
		document.issuedSnapshotSha256 && document.issuedSnapshotCreatedAt,
	);
}

function pdfBrowserCandidates(): string[] {
	return [
		"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
		"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
		"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		"/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
		"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
		"/usr/bin/microsoft-edge",
		"/usr/bin/google-chrome",
		"/usr/bin/chromium",
		"/usr/bin/chromium-browser",
	].filter((candidate): candidate is string => Boolean(candidate));
}

const allowedPdfBrowserExecutables = new Set([
	"msedge.exe",
	"microsoft edge",
	"google chrome",
	"microsoft-edge",
	"google-chrome",
	"chromium",
	"chromium-browser",
	"chrome.exe",
	"chrome",
]);

function isSafeBrowserPath(candidate: string): boolean {
	const basename = candidate.split(/[/\\]/).pop()?.toLowerCase();
	return basename ? allowedPdfBrowserExecutables.has(basename) : false;
}

function findPdfBrowserPath(): string | null {
	return (
		pdfBrowserCandidates().find(
			(candidate) => isSafeBrowserPath(candidate) && existsSync(candidate),
		) ?? null
	);
}

function configuredPdfExportTimeoutMs(): number {
	const raw = Number(process.env.DENTE_PDF_EXPORT_TIMEOUT_MS ?? "60000");
	if (!Number.isFinite(raw)) return 60000;
	return Math.min(180000, Math.max(10000, Math.trunc(raw)));
}

async function readValidPdfFile(pdfPath: string): Promise<Buffer | null> {
	try {
		const pdf = await readFile(pdfPath);
		if (pdf.length >= 512 && pdf.subarray(0, 4).equals(Buffer.from("%PDF")))
			return pdf;
	} catch {
		return null;
	}
	return null;
}

export async function renderIssuedHtmlToPdf(
	html: string,
): Promise<{ ok: true; pdf: Buffer } | { ok: false; error: string }> {
	const browserPath = findPdfBrowserPath();
	if (!browserPath) {
		return {
			ok: false,
			error:
				"PDF-экспорт недоступен: на сервере клиники не найден браузер для печати документов. Укажите путь к браузеру в серверных настройках.",
		};
	}

	const workDir = await mkdtemp(path.join(os.tmpdir(), "dente-pdf-"));
	const htmlPath = path.join(workDir, "document.html");
	await writeFile(
		htmlPath,
		html.includes("<meta charset=")
			? html
			: html.replace(/<head>/i, '<head><meta charset="utf-8">'),
		"utf8",
	);

	try {
		const timeoutMs = configuredPdfExportTimeoutMs();
		const attempts = [
			{ label: "headless-new", headlessFlag: "--headless=new" },
			{ label: "headless-classic", headlessFlag: "--headless" },
		] as const;
		let lastFailure = "PDF-экспорт завершился неизвестной ошибкой.";

		for (const [index, attempt] of attempts.entries()) {
			const profileDir = path.join(workDir, `profile-${index}`);
			const pdfPath = path.join(workDir, `document-${index}.pdf`);
			const result = await new Promise<{
				code: number | null;
				timedOut: boolean;
				error?: Error;
			}>((resolve) => {
				const child = spawn(
					browserPath,
					[
						attempt.headlessFlag,
						"--disable-gpu",
						"--disable-background-networking",
						"--disable-breakpad",
						"--disable-component-update",
						"--disable-default-apps",
						"--disable-extensions",
						"--disable-features=OptimizationHints,Translate",
						"--disable-dev-shm-usage",
						"--hide-scrollbars",
						"--mute-audio",
						"--no-first-run",
						"--no-default-browser-check",
						"--print-to-pdf-no-header",
						"--run-all-compositor-stages-before-draw",
						"--virtual-time-budget=10000",
						`--user-data-dir=${profileDir}`,
						`--print-to-pdf=${pdfPath}`,
						pathToFileURL(htmlPath).href,
					],
					{ stdio: "ignore" },
				);
				let completed = false;
				let timedOut = false;
				const complete = (value: {
					code: number | null;
					timedOut: boolean;
					error?: Error;
				}) => {
					if (completed) return;
					completed = true;
					clearTimeout(timeout);
					resolve(value);
				};
				const timeout = setTimeout(() => {
					timedOut = true;
					child.kill("SIGKILL");
				}, timeoutMs);
				child.once("error", (error) =>
					complete({ code: null, timedOut, error }),
				);
				child.once("exit", (code) => complete({ code, timedOut }));
			});

			const pdf = await readValidPdfFile(pdfPath);
			if (pdf) return { ok: true, pdf };
			if (result.error) {
				lastFailure =
					"PDF-экспорт не запустил браузер документов. Проверьте путь к браузеру в серверных настройках.";
				continue;
			}
			if (result.timedOut) {
				lastFailure = `PDF-экспорт не завершился за ${Math.round(timeoutMs / 1000)} секунд. Проверьте, что браузер документов запускается на сервере клиники.`;
				continue;
			}
			if (result.code !== 0) {
				lastFailure =
					"PDF-экспорт завершился с ошибкой браузера документов. Проверьте установку браузера на сервере клиники.";
				continue;
			}
			lastFailure =
				"PDF-экспорт вернул поврежденный файл. Повторите выгрузку или проверьте сервер печати документов.";
		}

		return { ok: false, error: lastFailure };
	} catch {
		return {
			ok: false,
			error:
				"PDF-экспорт не завершился. Проверьте права на временную папку сервера и браузер для печати документов.",
		};
	} finally {
		await rm(workDir, {
			recursive: true,
			force: true,
			maxRetries: 5,
			retryDelay: 250,
		});
	}
}

/**
 * Накладывает синий визуальный штамп усиленной электронной подписи (УКЭП / УНЭП)
 * по ГОСТ Р 7.0.97-2016 на печатную HTML-форму документа.
 * Если документ не подписан или штамп уже присутствует — возвращает исходный HTML без изменений.
 */
export function applySignatureStampIfSigned(
	document: GeneratedDocument,
	html: string,
): string {
	const isElectronicallySigned =
		document.signatureAttestation?.mode === "qualified_electronic_signature" ||
		document.signatureAttestation?.mode === "enhanced_non_qualified_electronic_signature" ||
		Boolean(document.cryptoSignaturePkcs7 && document.cryptoSignaturePkcs7.length > 0) ||
		Boolean(document.doctorSignaturePkcs7 && document.doctorSignaturePkcs7.length > 0);

	if (!isElectronicallySigned || html.includes("BEGIN_GOST_SIGNATURE_STAMP")) {
		return html;
	}

	let certSerial = document.doctorCertSerial;
	if (!certSerial) {
		const rawPkcs7 =
			document.doctorSignaturePkcs7 || document.cryptoSignaturePkcs7;
		if (rawPkcs7) {
			try {
				const der = Buffer.from(rawPkcs7, "base64");
				const meta = extractGostCmsMetadata(der);
				if (meta.certificateSerialNumber) {
					certSerial = meta.certificateSerialNumber;
				}
			} catch {
				// DER parsing fallback
			}
		}
	}

	if (!certSerial) {
		return html;
	}
	const isTaxCert =
		document.kind === "tax_deduction_certificate" ||
		document.kind === "legacy_tax_deduction_certificate";
	const isContract =
		document.kind === "paid_medical_services_contract";
	const defaultSubject = isTaxCert
		? document.signatureAttestation?.staffFullName ||
			"Главный врач / Уполномоченное лицо клиники"
		: isContract
			? document.signatureAttestation?.staffFullName ||
				"Руководитель медицинской организации / Главный врач"
			: "Врач-стоматолог клиники";
	const certSubject =
		document.doctorCertSubject ||
		document.signatureAttestation?.staffFullName ||
		defaultSubject;
	const validFrom = document.issuedAt || new Date().toISOString();
	const validToDate = new Date(validFrom);
	validToDate.setFullYear(validToDate.getFullYear() + 1);

	const stampHtml = renderDigitalSignatureStampHtml({
		certificateSerialNumber: certSerial,
		certificateSubject: certSubject,
		certificateIssuer: "Головной УЦ Минцифры России (ГОСТ Р 34.10-2012)",
		validFrom,
		validTo: validToDate.toISOString(),
		signedAt:
			document.doctorSignedAt ||
			document.signatureAttestation?.signedAt ||
			document.issuedAt ||
			undefined,
		signatureType:
			document.signatureAttestation?.mode ===
			"enhanced_non_qualified_electronic_signature"
				? "unep"
				: "ukep",
		documentId: document.id,
	});

	return injectVisualSignatureStampIntoHtml(html, stampHtml);
}
