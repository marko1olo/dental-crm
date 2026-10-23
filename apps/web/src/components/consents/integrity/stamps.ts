/**
 * Канонический векторный SVG-штамп для подтверждения подписания на бумажном носителе.
 */
export function generatePaperSignatureSvg(options: {
	date?: string | undefined;
	clinicName?: string | undefined;
	patientFullName?: string | undefined;
	scanFileName?: string | null | undefined;
	scanFileSizeBytes?: number | null | undefined;
	width?: number | undefined;
	height?: number | undefined;
} = {}): string {
	const w = options.width || 420;
	const h = options.height || 130;
	const dateStr = options.date || new Date().toLocaleDateString("ru-RU");
	const clinic = options.clinicName ? ` • ${options.clinicName}` : "";
	const patient = options.patientFullName ? `Пациент: ${options.patientFullName} • ` : "";
	const scanDetail = options.scanFileName
		? `Скан-копия бланка прикреплена: ${options.scanFileName} (${options.scanFileSizeBytes ? `${Math.round(options.scanFileSizeBytes / 1024)} КБ` : "файл"})`
		: "Бумажный оригинал подписан пациентом (хранится в архиве карты 043/у)";

	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  <rect width="100%" height="100%" fill="#f8fafc" stroke="#0d9488" stroke-width="2" rx="8"/>
  <rect x="10" y="10" width="${w - 20}" height="${h - 20}" fill="none" stroke="#99f6e4" stroke-width="1" stroke-dasharray="4,4" rx="6"/>
  <text x="20" y="32" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="bold" fill="#0f766e">ПОДПИСАНО НА БУМАЖНОМ НОСИТЕЛЕ</text>
  <text x="20" y="52" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10.5" fill="#0f172a">${patient}${dateStr}</text>
  <text x="20" y="70" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" fill="#334155">${scanDetail}</text>
  <text x="20" y="88" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="9" fill="#64748b">(хранится в архиве карты 043/у, срок 25 лет)</text>
  <text x="20" y="108" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="9" fill="#0d9488">323-ФЗ ст. 20 • Приказ Минздрава № 1051н${clinic}</text>
</svg>`;
}

/**
 * Канонический векторный SVG-штамп простой электронной подписи (ПЭП по 63-ФЗ через SMS OTP).
 */
export function generateSmsPepSignatureSvg(options: {
	patientFullName?: string | undefined;
	phoneMasked?: string | undefined;
	timestampIso?: string | undefined;
	integrityHash?: string | undefined;
	clinicName?: string | undefined;
	width?: number | undefined;
	height?: number | undefined;
} = {}): string {
	const w = options.width || 420;
	const h = options.height || 130;
	const patient = options.patientFullName || "Пациент";
	const phone = options.phoneMasked || "+7 (***) ***-**-**";
	const dt = options.timestampIso ? new Date(options.timestampIso) : new Date();
	const dtFormatted = `${dt.toLocaleDateString("ru-RU")} ${dt.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`;
	const clinic = options.clinicName ? ` • ${options.clinicName}` : "";
	const hashShort = (options.integrityHash || "00000000000000000000").slice(0, 20);

	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  <rect width="100%" height="100%" fill="#f0fdf4" stroke="#16a34a" stroke-width="2" rx="8"/>
  <rect x="10" y="10" width="${w - 20}" height="${h - 20}" fill="none" stroke="#86efac" stroke-width="1" stroke-dasharray="4,4" rx="6"/>
  <text x="20" y="32" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="bold" fill="#15803d">ПОДПИСАНО ПРОСТОЙ ЭЛЕКТРОННОЙ ПОДПИСЬЮ (ПЭП)</text>
  <text x="20" y="52" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10.5" fill="#166534">Пациент: ${patient} • Телефон: ${phone}</text>
  <text x="20" y="70" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" fill="#334155">Код подтверждения СМС: [ПОДТВЕРЖДЁН] • Время: ${dtFormatted}</text>
  <text x="20" y="88" font-family="monospace" font-size="9.5" fill="#0f766e">SHA-256: ${hashShort}...</text>
  <text x="20" y="108" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="9" fill="#15803d">63-ФЗ ст. 5, ст. 9 • 323-ФЗ ст. 20 • Приказ МЗ РФ № 1051н${clinic}</text>
</svg>`;
}

export const PAPER_SIGNATURE_FALLBACK_PNG =
	"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
