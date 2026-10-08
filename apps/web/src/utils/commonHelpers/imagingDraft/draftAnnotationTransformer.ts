import type {
	DenteTelegramVisualCardKey,
	DenteTelegramVisualCardUrls,
} from "@dental/shared";
import { showToast } from "../../../components/GlobalToast";
import { actionFailureToast } from "../../../lib/panelStateText";
import {
	clampMprAxisDeg,
	clampMprSlabMm,
	clampMprSliceIndex,
} from "../../../mprControlMath";
import { telegramVisualCardFields } from "../../../workspaceStaticOptions";
import { normalizedLocalOrganizationId } from "../../AuthOnboardingHelpers";
import {
	isBrowserMigrationScanAbortError,
	localImagingFolderFingerprint,
} from "../../browserScanUtils";
import { sensitiveLocalDraftRetentionMs } from "../../commonHelpers/documentDraftHelpers";
import {
	type DicomWorkbenchLocalDraft,
	isMprProjection,
	isMprWindowPreset,
	loadImageFromDataUrl,
	type MprWorkbenchLocalDraft,
	type MprWorkbenchState,
	readFileAsDataUrl,
} from "../../ImagingHelpers";
import { localSavedAtFresh } from "../../localStorageHelpers";
import {
	telegramPublicUrlSensitivePathSegments,
	telegramPublicUrlSensitiveQueryKeys,
} from "../../TelegramHelpers";
import {
	maxPricelistImageBase64Chars,
	pricelistImageMimeTypes,
} from "./constants";
import type { PersistenceHealth, PricelistImageMimeType } from "./types";

export function browserGeneratedId(prefix: string): string {
	return `${prefix}-${crypto.randomUUID()}`;
}

export function createLocalQueueId(): string {
	if (typeof crypto !== "undefined") {
		if ("randomUUID" in crypto) return crypto.randomUUID();
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		const cryptoAny = crypto as any;
		if (typeof cryptoAny.getRandomValues === "function") {
			const array = new Uint32Array(1);
			cryptoAny.getRandomValues(array);
			return `local-${Date.now()}-${(array[0] || 0).toString(16)}`;
		}
	}
	const timeStr = Date.now().toString(16);
	let hash = 0;
	for (let i = 0; i < timeStr.length; i++) {
		hash = (Math.imul(31, hash) + timeStr.charCodeAt(i)) | 0;
	}
	return `local-${Date.now()}-${Math.abs(hash).toString(16)}`;
}

export function normalizePersistenceHealth(
	payload: unknown,
): PersistenceHealth | null {
	if (!payload || typeof payload !== "object") return null;
	const persistence =
		(
			payload as {
				meta?: Partial<PersistenceHealth>;
				persistence?: Partial<PersistenceHealth>;
			}
		).meta ??
		(payload as { persistence?: Partial<PersistenceHealth> }).persistence;
	if (!persistence || typeof persistence !== "object") return null;

	return {
		enabled: persistence.enabled === true,
		filePath:
			typeof persistence.filePath === "string" ? persistence.filePath : "",
		exists: persistence.exists === true,
		version:
			typeof persistence.version === "number" ? persistence.version : null,
		savedAt:
			typeof persistence.savedAt === "string" ? persistence.savedAt : null,
		checksum:
			typeof persistence.checksum === "string" ? persistence.checksum : null,
		backupDirectoryPath:
			typeof persistence.backupDirectoryPath === "string"
				? persistence.backupDirectoryPath
				: "",
		backupCount:
			typeof persistence.backupCount === "number" ? persistence.backupCount : 0,
		latestBackupAt:
			typeof persistence.latestBackupAt === "string"
				? persistence.latestBackupAt
				: null,
		latestBackupSizeBytes:
			typeof persistence.latestBackupSizeBytes === "number"
				? persistence.latestBackupSizeBytes
				: null,
		maxBackupCount:
			typeof persistence.maxBackupCount === "number"
				? persistence.maxBackupCount
				: 0,
	};
}

export function offlineDraftOrganizationKey(
	organizationId: string | null | undefined = null,
): string {
	return normalizedLocalOrganizationId(organizationId) ?? "default";
}

export function normalizeMprWorkbenchState(
	value: unknown,
): MprWorkbenchState | null {
	if (!value || typeof value !== "object") return null;
	const source = value as Partial<MprWorkbenchState>;
	if (
		!isMprProjection(source.projection) ||
		!isMprWindowPreset(source.windowPreset)
	)
		return null;
	const axisDeg = Number(source.axisDeg);
	const slabMm = Number(source.slabMm);
	const sliceIndex = Number(source.sliceIndex ?? 0);
	if (
		!Number.isFinite(axisDeg) ||
		!Number.isFinite(slabMm) ||
		!Number.isFinite(sliceIndex)
	)
		return null;
	return {
		projection: source.projection,
		axisDeg: clampMprAxisDeg(axisDeg),
		slabMm: clampMprSlabMm(slabMm),
		sliceIndex: clampMprSliceIndex(sliceIndex, 100000),
		windowPreset: source.windowPreset,
		crosshair: source.crosshair !== false,
		linkedPlanes: source.linkedPlanes !== false,
	};
}

export function normalizeLocalDicomWorkbenchDraft(
	value: unknown,
): DicomWorkbenchLocalDraft | null {
	if (!value || typeof value !== "object") return null;
	const parsed = value as Partial<DicomWorkbenchLocalDraft>;
	if (parsed?.manifest?.version !== "dental-crm-dicom-workbench-v1")
		return null;
	if (
		typeof parsed.seriesKey !== "string" ||
		typeof parsed.clientSavedAt !== "string"
	)
		return null;
	if (!localSavedAtFresh(parsed.clientSavedAt, sensitiveLocalDraftRetentionMs))
		return null;
	return {
		manifest: parsed.manifest,
		seriesKey: parsed.seriesKey,
		clientSavedAt: parsed.clientSavedAt,
	};
}

export function normalizeMprWorkbenchDraft(
	value: unknown,
	seriesKey: string,
): MprWorkbenchLocalDraft | null {
	if (!value || typeof value !== "object") return null;
	const parsed = value as Partial<MprWorkbenchLocalDraft>;
	if (
		parsed?.version !== 1 ||
		parsed.seriesKey !== seriesKey ||
		typeof parsed.clientSavedAt !== "string"
	)
		return null;
	if (!localSavedAtFresh(parsed.clientSavedAt, sensitiveLocalDraftRetentionMs))
		return null;
	const state = normalizeMprWorkbenchState(parsed.state);
	return state
		? { version: 1, seriesKey, state, clientSavedAt: parsed.clientSavedAt }
		: null;
}

export function uniqueDicomDownloadWarnings(warnings: string[]): string[] {
	return Array.from(
		new Set(warnings.map((warning) => warning.trim()).filter(Boolean)),
	);
}

export function isLocalDicomDownloadPath(value: string): boolean {
	const input = value.trim();
	if (!input || input.startsWith("redacted-local-dicom-path:")) return false;
	if (/^(?:https?|blob|data):/i.test(input)) return false;
	if (/^[A-Za-z]:[\\/]/.test(input) || input.startsWith("\\\\")) return true;
	if (
		/^\/(?:Users|Volumes|home|mnt|media|var|tmp|srv|opt|data|storage|dicom|pacs)(?:\/|$)/i.test(
			input,
		)
	)
		return true;
	if (input.includes("::")) return true;
	return /^[^:?#]+[\\/][^:?#]+/.test(input) && !input.startsWith("/");
}

export function redactedLocalDicomDownloadPath(
	value: string | null,
): string | null {
	if (!value) return null;
	if (!isLocalDicomDownloadPath(value)) return value;
	return `redacted-local-dicom-path:${localImagingFolderFingerprint(value)}`;
}

export function normalizeTelegramPublicHttpsUrlDraft(
	fieldLabel: string,
	value: string | null | undefined,
): string | null {
	const raw = value?.trim() ?? "";
	if (!raw) return null;

	let parsed: URL;
	try {
		parsed = new URL(raw);
	} catch {
		throw new Error(`${fieldLabel}: укажите полный адрес вида https://...`);
	}

	if (parsed.protocol !== "https:") {
		throw new Error(`${fieldLabel}: нужна ссылка https://...`);
	}
	if (parsed.username || parsed.password) {
		throw new Error(`${fieldLabel}: уберите логин и пароль из ссылки.`);
	}

	const pathSegments = parsed.pathname
		.split("/")
		.map((segment) => {
			try {
				return decodeURIComponent(segment).trim().toLowerCase();
			} catch (scanError) {
				showToast(
					actionFailureToast(
						"Ошибка выполнения операции",
						(scanError as { status?: number })?.status ?? null,
					),
					"error",
				);
				if (isBrowserMigrationScanAbortError(scanError)) throw scanError;
				throw new Error(`${fieldLabel}: исправьте кодировку пути в ссылке.`);
			}
		})
		.filter(Boolean);

	for (const segment of pathSegments) {
		const compactDigits = segment.replace(/\D/g, "");
		if (telegramPublicUrlSensitivePathSegments.has(segment)) {
			throw new Error(
				`${fieldLabel}: ссылка должна вести на общую публичную страницу, без patient/visit/document/token в пути.`,
			);
		}
		if (
			/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
				segment,
			)
		) {
			throw new Error(
				`${fieldLabel}: уберите идентификатор пациента, визита или документа из пути.`,
			);
		}
		if (compactDigits.length >= 10 || /\b\d{12}\b/.test(segment)) {
			throw new Error(
				`${fieldLabel}: уберите телефон, ИНН, СНИЛС или другой личный номер из пути.`,
			);
		}
	}

	const sensitiveQueryKeys = Array.from(parsed.searchParams.keys()).filter(
		(key) => telegramPublicUrlSensitiveQueryKeys.has(key.trim().toLowerCase()),
	);
	if (sensitiveQueryKeys.length) {
		throw new Error(
			`${fieldLabel}: уберите персональные параметры из ссылки: ${sensitiveQueryKeys.join(", ")}.`,
		);
	}
	for (const valuePart of parsed.searchParams.values()) {
		const compactDigits = valuePart.replace(/\D/g, "");
		if (compactDigits.length >= 10 || /\b\d{12}\b/.test(valuePart)) {
			throw new Error(
				`${fieldLabel}: уберите телефон, ИНН, СНИЛС или другой личный номер из параметров.`,
			);
		}
	}

	parsed.hash = "";
	return parsed.toString();
}

export function normalizeTelegramVisualCardUrlDraftsForSave(
	drafts: DenteTelegramVisualCardUrls,
): DenteTelegramVisualCardUrls {
	const fieldLabel = (key: DenteTelegramVisualCardKey) =>
		telegramVisualCardFields.find((field) => field.key === key)?.label ??
		`Картинка Telegram ${key}`;
	return {
		mainMenu: normalizeTelegramPublicHttpsUrlDraft(
			fieldLabel("mainMenu"),
			drafts.mainMenu,
		),
		appointment: normalizeTelegramPublicHttpsUrlDraft(
			fieldLabel("appointment"),
			drafts.appointment,
		),
		documents: normalizeTelegramPublicHttpsUrlDraft(
			fieldLabel("documents"),
			drafts.documents,
		),
		tax: normalizeTelegramPublicHttpsUrlDraft(fieldLabel("tax"), drafts.tax),
		billing: normalizeTelegramPublicHttpsUrlDraft(
			fieldLabel("billing"),
			drafts.billing,
		),
		care: normalizeTelegramPublicHttpsUrlDraft(fieldLabel("care"), drafts.care),
		review: normalizeTelegramPublicHttpsUrlDraft(
			fieldLabel("review"),
			drafts.review,
		),
		staff: normalizeTelegramPublicHttpsUrlDraft(
			fieldLabel("staff"),
			drafts.staff,
		),
	};
}

export function normalizeTelegramBotUsernameDraft(
	fieldLabel: string,
	value: string | null | undefined,
): string | null {
	const normalized = value?.trim().replace(/^@/, "") ?? "";
	if (!normalized) return null;
	if (!/^[A-Za-z][A-Za-z0-9_]{1,28}[Bb][Oo][Tt]$/.test(normalized)) {
		throw new Error(
			`${fieldLabel}: укажите имя Telegram-бота без ссылки, 5-32 символа: латинские буквы, цифры, подчёркивания и окончание bot.`,
		);
	}
	return normalized;
}

export async function preparePricelistImage(file: File): Promise<{
	base64: string;
	mimeType: PricelistImageMimeType;
	note: string;
}> {
	if (!pricelistImageMimeTypes.includes(file.type as PricelistImageMimeType)) {
		throw new Error("Поддерживаются JPEG, PNG или WebP.");
	}

	const dataUrl = await readFileAsDataUrl(file);
	const image = await loadImageFromDataUrl(dataUrl);
	const originalLongestSide = Math.max(image.naturalWidth, image.naturalHeight);
	const outputMimeType: PricelistImageMimeType = "image/jpeg";

	for (const maxSide of [1600, 1200, 900, 720]) {
		const scale = Math.min(1, maxSide / originalLongestSide);
		const width = Math.max(1, Math.round(image.naturalWidth * scale));
		const height = Math.max(1, Math.round(image.naturalHeight * scale));
		const canvas = document.createElement("canvas");
		canvas.width = width;
		canvas.height = height;
		const context = canvas.getContext("2d");
		if (!context) throw new Error("Canvas недоступен для сжатия изображения.");
		context.fillStyle = "#ffffff";
		context.fillRect(0, 0, width, height);
		context.drawImage(image, 0, 0, width, height);

		for (const quality of [0.82, 0.72, 0.62]) {
			const compressed = canvas.toDataURL(outputMimeType, quality);
			const base64 = compressed.split(",")[1] ?? "";
			if (base64.length <= maxPricelistImageBase64Chars) {
				const megapixels = ((width * height) / 1_000_000).toFixed(1);
				return {
					base64,
					mimeType: outputMimeType,
					note: `Фото подготовлено: ${width}x${height}, ${megapixels} Мп, JPEG ${Math.round(quality * 100)}%.`,
				};
			}
		}
	}

	throw new Error(
		"Фото прайса слишком большое даже после сжатия. Нужен более четкий фрагмент страницы.",
	);
}
