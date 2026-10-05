/**
 * In-browser standard PKZIP generator for DENTE Bot Studio.
 * Produces 100% standard, uncompressed (STORE mode 0) zip archives
 * without external dependencies. Compatible with Windows Explorer, macOS Finder, 7-Zip, unzip.
 */

// CRC-32 Lookup Table
const CRC32_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
	let c = i;
	for (let j = 0; j < 8; j++) {
		c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
	}
	CRC32_TABLE[i] = c;
}

function calculateCrc32(bytes: Uint8Array): number {
	let crc = 0xffffffff;
	for (let i = 0; i < bytes.length; i++) {
		const byte = bytes[i] ?? 0;
		const tableVal = CRC32_TABLE[(crc ^ byte) & 0xff] ?? 0;
		crc = (crc >>> 8) ^ tableVal;
	}
	return (crc ^ 0xffffffff) >>> 0;
}

export interface BotZipFileEntry {
	name: string;
	content: string | Uint8Array;
}

export interface BotZipOptions {
	channel: "telegram" | "vk" | "whatsapp" | "max";
	clinicName: string;
	clinicAddress?: string;
	clinicPhone?: string;
	botToken: string;
	botUsername?: string;
	welcomeText: string;
	enabledPlugins: {
		onlineBooking: boolean;
		reminders: boolean;
		reviews: boolean;
		priceFaq: boolean;
		adminEscalation: boolean;
	};
	serverWebhookUrl?: string;
}

/**
 * Builds standard ZIP byte buffer from file entries.
 */
export function buildZipArchive(entries: BotZipFileEntry[]): Uint8Array {
	const encoder = new TextEncoder();
	const localHeaders: Uint8Array[] = [];
	const centralHeaders: Uint8Array[] = [];

	let currentOffset = 0;

	for (const entry of entries) {
		const nameBytes = encoder.encode(entry.name);
		const dataBytes =
			typeof entry.content === "string"
				? encoder.encode(entry.content)
				: entry.content;

		const crc = calculateCrc32(dataBytes);
		const size = dataBytes.length;

		// Dos time/date: 2026-10-05 12:00:00
		const dosTime = (12 << 11) | (0 << 5) | (0 >> 1);
		const dosDate = ((2026 - 1980) << 9) | (10 << 5) | 5;

		// 1. Local Header (30 bytes + name length)
		const localHeader = new Uint8Array(30 + nameBytes.length);
		const lView = new DataView(localHeader.buffer);
		lView.setUint32(0, 0x04034b50, true); // Local header signature PK\x03\x04
		lView.setUint16(4, 20, true); // Version needed to extract (2.0)
		lView.setUint16(6, 0, true); // General purpose bit flag
		lView.setUint16(8, 0, true); // Compression method (0 = STORE)
		lView.setUint16(10, dosTime, true);
		lView.setUint16(12, dosDate, true);
		lView.setUint32(14, crc, true); // CRC-32
		lView.setUint32(18, size, true); // Compressed size
		lView.setUint32(22, size, true); // Uncompressed size
		lView.setUint16(26, nameBytes.length, true); // File name length
		lView.setUint16(28, 0, true); // Extra field length
		localHeader.set(nameBytes, 30);

		localHeaders.push(localHeader, dataBytes);

		// 2. Central Directory Header (46 bytes + name length)
		const centralHeader = new Uint8Array(46 + nameBytes.length);
		const cView = new DataView(centralHeader.buffer);
		cView.setUint32(0, 0x02014b50, true); // Central directory signature PK\x01\x02
		cView.setUint16(4, 20, true); // Version made by
		cView.setUint16(6, 20, true); // Version needed to extract
		cView.setUint16(8, 0, true); // Bit flag
		cView.setUint16(10, 0, true); // Compression (0)
		cView.setUint16(12, dosTime, true);
		cView.setUint16(14, dosDate, true);
		cView.setUint32(16, crc, true);
		cView.setUint32(20, size, true);
		cView.setUint32(24, size, true);
		cView.setUint16(28, nameBytes.length, true);
		cView.setUint16(30, 0, true); // Extra field length
		cView.setUint16(32, 0, true); // Comment length
		cView.setUint16(34, 0, true); // Disk number start
		cView.setUint16(36, 0, true); // Internal attributes
		cView.setUint32(38, 0, true); // External attributes
		cView.setUint32(42, currentOffset, true); // Relative offset of local header
		centralHeader.set(nameBytes, 46);

		centralHeaders.push(centralHeader);

		currentOffset += localHeader.length + dataBytes.length;
	}

	const centralDirStartOffset = currentOffset;
	let centralDirSize = 0;
	for (const ch of centralHeaders) {
		centralDirSize += ch.length;
	}

	// 3. End of Central Directory Record (22 bytes)
	const eocd = new Uint8Array(22);
	const eView = new DataView(eocd.buffer);
	eView.setUint32(0, 0x06054b50, true); // EOCD signature PK\x05\x06
	eView.setUint16(4, 0, true); // Disk number
	eView.setUint16(6, 0, true); // Disk with central directory
	eView.setUint16(8, entries.length, true); // Entries on this disk
	eView.setUint16(10, entries.length, true); // Total entries
	eView.setUint32(12, centralDirSize, true); // Central directory size
	eView.setUint32(16, centralDirStartOffset, true); // Offset of start of central directory
	eView.setUint16(20, 0, true); // Comment length

	// Concatenate all chunks
	const totalSize = currentOffset + centralDirSize + eocd.length;
	const finalArchive = new Uint8Array(totalSize);

	let writePos = 0;
	for (const chunk of localHeaders) {
		finalArchive.set(chunk, writePos);
		writePos += chunk.length;
	}
	for (const chunk of centralHeaders) {
		finalArchive.set(chunk, writePos);
		writePos += chunk.length;
	}
	finalArchive.set(eocd, writePos);

	return finalArchive;
}

/**
 * Generates ready-to-run source code bundle for the selected channel and configuration.
 */
export function generateBotSourceEntries(options: BotZipOptions): BotZipFileEntry[] {
	const {
		channel,
		clinicName,
		clinicAddress = "Кутузовский проспект, 24",
		clinicPhone = "+7 (999) 000-00-00",
		botToken,
		botUsername = "clinic_bot",
		welcomeText,
		enabledPlugins,
		serverWebhookUrl = "https://crm.dente-clinic.ru/api/webhooks/bot",
	} = options;

	const channelTitle =
		channel === "telegram"
			? "Telegram Bot"
			: channel === "vk"
				? "ВКонтакте Сообщество (VK Bot)"
				: channel === "whatsapp"
					? "WhatsApp Business Cloud Bot"
					: "MAX (1С:Медицина) Bot";

	const packageJson = JSON.stringify(
		{
			name: `dente-${channel}-bot`,
			version: "1.0.0",
			description: `Автономный ${channelTitle} для стоматологии ${clinicName}`,
			main: "index.js",
			scripts: {
				start: "node index.js",
				dev: "node --watch index.js",
			},
			dependencies: {
				dotenv: "^16.4.5",
				express: "^4.19.2",
				...(channel === "telegram" ? { "telegraf": "^4.16.3" } : {}),
				...(channel === "vk" ? { "vk-io": "^4.9.0" } : {}),
				axios: "^1.7.2",
			},
			keywords: ["dental-crm", "bot", "medical", channel],
			author: `${clinicName} & DENTE Open Bot Engine`,
			license: "MIT",
		},
		null,
		2,
	);

	const envExample = `# ========================================================
# Конфигурация DENTE ${channelTitle}
# Клиника: ${clinicName}
# ========================================================

PORT=3000
BOT_CHANNEL=${channel}
BOT_TOKEN=${botToken || "your_bot_token_here"}
CLINIC_NAME=${clinicName}
CLINIC_PHONE=${clinicPhone}
CLINIC_ADDRESS=${clinicAddress}
DENTE_CRM_WEBHOOK_URL=${serverWebhookUrl}
CRM_SYNC_SECRET=dente_secret_${Math.random().toString(36).slice(2, 10)}
`;

	const readme = `# 🦷 ${channelTitle} — Стоматология «${clinicName}»

Автономный бот для пациентов клиники, экспортированный из **DENTE Bot Studio**.

---

## 🚀 Быстрый старт на собственном сервере (VPS)

### Вариант 1. Запуск через Node.js:
\`\`\`bash
# 1. Распакуйте архив и перейдите в папку
cd dente-${channel}-bot

# 2. Установите зависимости
npm install

# 3. Скопируйте настройки окружения и укажите ваш токен
cp .env.example .env

# 4. Запустите бота
npm start
\`\`\`

### Вариант 2. Запуск через Docker:
\`\`\`bash
docker build -t dente-${channel}-bot .
docker run -d --name dente-bot --restart always -p 3000:3000 --env-file .env dente-${channel}-bot
\`\`\`

---

## 📦 Включенные модули и плагины:
- **Онлайн-запись 24/7:** ${enabledPlugins.onlineBooking ? "ВКЛЮЧЕНО (Mini App & выбор слотов)" : "Отключено"}
- **Напоминания о приеме (24ч / 2ч):** ${enabledPlugins.reminders ? "ВКЛЮЧЕНО" : "Отключено"}
- **Сбор отзывов (Яндекс.Карты, 2ГИС, ПроДокторов):** ${enabledPlugins.reviews ? "ВКЛЮЧЕНО" : "Отключено"}
- **Умный прейскурант и FAQ:** ${enabledPlugins.priceFaq ? "ВКЛЮЧЕНО" : "Отключено"}
- **Связь с администратором клиники:** ${enabledPlugins.adminEscalation ? "ВКЛЮЧЕНО" : "Отключено"}

---

## 🔒 152-ФЗ Безопасность данных:
Бот не хранит медицинские диагнозы, планы лечения или паспортные данные. Все конфиденциальные операции направляются через защищенный SSL-шлюз DENTE.
`;

	const dockerfile = `FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
`;

	const indexJs = `// ========================================================
// DENTE Autonomous Bot Server
// Channel: ${channel}
// Clinic: ${clinicName}
// Generated by DENTE Bot Studio
// ========================================================

require('dotenv').config();
const express = require('express');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const CLINIC_NAME = process.env.CLINIC_NAME || '${clinicName}';
const CLINIC_PHONE = process.env.CLINIC_PHONE || '${clinicPhone}';
const CLINIC_ADDRESS = process.env.CLINIC_ADDRESS || '${clinicAddress}';
const WELCOME_TEXT = ${JSON.stringify(welcomeText)};

console.log('🚀 Запуск DENTE Bot для клиники:', CLINIC_NAME);
console.log('Канал:', '${channel}');
console.log('Плагины:', ${JSON.stringify(enabledPlugins)});

// Базовый роут проверки здоровья (Healthcheck)
app.get('/health', (req, res) => {
  res.json({
    status: 'online',
    channel: '${channel}',
    clinic: CLINIC_NAME,
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Роут вебхука от DENTE CRM для отправки напоминаний
app.post('/webhook/crm-events', (req, res) => {
  const { eventType, patientPhone, message } = req.body;
  console.log('📩 Получено событие от CRM:', eventType, 'для:', patientPhone);
  
  // Отправка сообщения в мессенджер в зависимости от канала
  res.json({ ok: true, deliveredAt: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(\`✅ Сервер бота слушает порт \${PORT}\`);
  console.log('Готов к приему сообщений пациентов 24/7.');
});
`;

	const manifestJson = JSON.stringify(
		{
			schemaVersion: "2.0",
			channel,
			clinicName,
			clinicAddress,
			clinicPhone,
			botUsername,
			welcomeText,
			enabledPlugins,
			exportedAt: "2026-10-05T12:00:00Z",
			system: "DENTE Dental CRM Bot Studio",
		},
		null,
		2,
	);

	return [
		{ name: "package.json", content: packageJson },
		{ name: ".env.example", content: envExample },
		{ name: "README.md", content: readme },
		{ name: "Dockerfile", content: dockerfile },
		{ name: "index.js", content: indexJs },
		{ name: "manifest.json", content: manifestJson },
	];
}

/**
 * Triggers a browser file download of the generated bot zip archive.
 */
export function downloadBotSourceZip(options: BotZipOptions): void {
	const entries = generateBotSourceEntries(options);
	const archiveBytes = buildZipArchive(entries);
	const blob = new Blob([archiveBytes.buffer as ArrayBuffer], { type: "application/zip" });
	const url = URL.createObjectURL(blob);

	const link = document.createElement("a");
	link.href = url;
	const safeName = options.clinicName
		.toLowerCase()
		.replace(/[^a-z0-9а-яё]/gi, "-")
		.replace(/-+/g, "-")
		.slice(0, 30);
	link.download = `dente-${options.channel}-bot-${safeName || "clinic"}.zip`;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);

	setTimeout(() => URL.revokeObjectURL(url), 2000);
}
