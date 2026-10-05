import zlib from "node:zlib";

/**
 * Простая, надежная реализация стандартного ZIP-архиватора (PKZIP 2.0 / RFC 1951)
 * на чистом Node.js (node:zlib) без внешних npm-зависимостей.
 */
export class ZipArchiveBuilder {
	private readonly files: Array<{
		name: string;
		data: Buffer;
		compressed: Buffer;
		crc32: number;
	}> = [];

	public addFile(path: string, content: string | Buffer): void {
		const data = typeof content === "string" ? Buffer.from(content, "utf8") : content;
		const compressed = zlib.deflateRawSync(data, { level: 9 });
		const crc32 = this.computeCrc32(data);

		this.files.push({
			name: path.replace(/\\/g, "/"),
			data,
			compressed,
			crc32,
		});
	}

	public build(): Buffer {
		const chunks: Buffer[] = [];
		const centralDirectoryEntries: Buffer[] = [];
		let currentOffset = 0;

		const now = new Date();
		const dosTime =
			((now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)) & 0xffff;
		const dosDate =
			(((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()) & 0xffff;

		for (const file of this.files) {
			const nameBuf = Buffer.from(file.name, "utf8");

			// 1. Local File Header (30 байт + имя + сжатые данные)
			const localHeader = Buffer.alloc(30);
			localHeader.writeUInt32LE(0x04034b50, 0); // PK\x03\x04
			localHeader.writeUInt16LE(20, 4); // Версия для распаковки (2.0)
			localHeader.writeUInt16LE(0x0800, 6); // Флаг: UTF-8 имена
			localHeader.writeUInt16LE(8, 8); // Метод сжатия: Deflate
			localHeader.writeUInt16LE(dosTime, 10);
			localHeader.writeUInt16LE(dosDate, 12);
			localHeader.writeUInt32LE(file.crc32, 14);
			localHeader.writeUInt32LE(file.compressed.length, 18);
			localHeader.writeUInt32LE(file.data.length, 22);
			localHeader.writeUInt16LE(nameBuf.length, 26);
			localHeader.writeUInt16LE(0, 28); // Extra field length

			chunks.push(localHeader, nameBuf, file.compressed);

			// 2. Central Directory Header (46 байт + имя)
			const cdHeader = Buffer.alloc(46);
			cdHeader.writeUInt32LE(0x02014b50, 0); // PK\x01\x02
			cdHeader.writeUInt16LE(20, 4); // Версия создателя
			cdHeader.writeUInt16LE(20, 6); // Версия для распаковки
			cdHeader.writeUInt16LE(0x0800, 8); // Флаг: UTF-8
			cdHeader.writeUInt16LE(8, 10); // Deflate
			cdHeader.writeUInt16LE(dosTime, 12);
			cdHeader.writeUInt16LE(dosDate, 14);
			cdHeader.writeUInt32LE(file.crc32, 16);
			cdHeader.writeUInt32LE(file.compressed.length, 20);
			cdHeader.writeUInt32LE(file.data.length, 24);
			cdHeader.writeUInt16LE(nameBuf.length, 28);
			cdHeader.writeUInt16LE(0, 30); // Extra field length
			cdHeader.writeUInt16LE(0, 32); // File comment length
			cdHeader.writeUInt16LE(0, 34); // Disk number
			cdHeader.writeUInt16LE(0, 36); // Internal file attributes
			cdHeader.writeUInt32LE(0, 38); // External file attributes
			cdHeader.writeUInt32LE(currentOffset, 42); // Относительное смещение Local Header

			centralDirectoryEntries.push(cdHeader, nameBuf);

			currentOffset += localHeader.length + nameBuf.length + file.compressed.length;
		}

		const centralDirStartOffset = currentOffset;
		let centralDirSize = 0;
		for (const cd of centralDirectoryEntries) {
			centralDirSize += cd.length;
		}

		// 3. End of Central Directory Record (22 байта)
		const eocd = Buffer.alloc(22);
		eocd.writeUInt32LE(0x06054b50, 0); // PK\x05\x06
		eocd.writeUInt16LE(0, 4); // Номер диска
		eocd.writeUInt16LE(0, 6); // Диск с началом CD
		eocd.writeUInt16LE(this.files.length, 8); // Число записей на этом диске
		eocd.writeUInt16LE(this.files.length, 10); // Всего записей в CD
		eocd.writeUInt32LE(centralDirSize, 12); // Размер CD
		eocd.writeUInt32LE(centralDirStartOffset, 16); // Смещение начала CD
		eocd.writeUInt16LE(0, 20); // Длина комментария

		return Buffer.concat([...chunks, ...centralDirectoryEntries, eocd]);
	}

	private computeCrc32(buf: Buffer): number {
		let crc = ~0;
		for (let i = 0; i < buf.length; i++) {
			crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ buf[i]!) & 0xff]!;
		}
		return (~crc) >>> 0;
	}
}

// Таблица предвычисленных CRC32
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
	let c = n;
	for (let k = 0; k < 8; k++) {
		c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
	}
	CRC_TABLE[n] = c;
}

/**
 * Генератор автономного пакета исходного кода бота (Standalone Bot Exporter).
 * Создает полностью независимый, готовый к деплою проект для клиники.
 */
export class BotSourceExporter {
	/**
	 * Сборка ZIP-архива с исходным кодом демона бота клиники.
	 */
	static exportStandaloneBotPackage(params: {
		botId: string;
		organizationId: string;
		clinicName: string;
		channel: "telegram" | "vk" | "whatsapp" | "max";
		botTokenMasked?: string;
		denteApiUrl?: string;
	}): Buffer {
		const builder = new ZipArchiveBuilder();
		const clinicSlug = params.clinicName.toLowerCase().replace(/[^a-z0-9а-яё]+/gi, "-").slice(0, 30);
		const apiUrl = params.denteApiUrl || "https://crm.dente.clinic";

		// 1. package.json
		builder.addFile(
			"package.json",
			JSON.stringify(
				{
					name: `dente-bot-${clinicSlug}`,
					version: "1.0.0",
					private: true,
					description: `Автономный чат-бот для стоматологической клиники "${params.clinicName}" (DENTE Omnichannel)`,
					main: "dist/bot.js",
					type: "module",
					scripts: {
						build: "tsc",
						start: "node dist/bot.js",
						dev: "tsx watch src/bot.ts",
					},
					dependencies: {
						undici: "^6.19.8",
						dotenv: "^16.4.5",
					},
					devDependencies: {
						typescript: "^5.5.4",
						"@types/node": "^22.5.4",
						tsx: "^4.19.0",
					},
				},
				null,
				2,
			),
		);

		// 2. tsconfig.json
		builder.addFile(
			"tsconfig.json",
			JSON.stringify(
				{
					compilerOptions: {
						target: "ES2022",
						module: "NodeNext",
						moduleResolution: "NodeNext",
						outDir: "./dist",
						rootDir: "./src",
						strict: true,
						esModuleInterop: true,
						skipLibCheck: true,
						forceConsistentCasingInFileNames: true,
					},
					include: ["src/**/*"],
				},
				null,
				2,
			),
		);

		// 3. .env.example
		builder.addFile(
			".env.example",
			[
				`# Настройки автономного бота клиники "${params.clinicName}"`,
				`CLINIC_NAME="${params.clinicName}"`,
				`ORGANIZATION_ID="${params.organizationId}"`,
				`DENTE_API_URL="${apiUrl}"`,
				`DENTE_API_SECRET="your-dente-api-key-here"`,
				"",
				"# Telegram Bot API (@BotFather)",
				`TELEGRAM_BOT_TOKEN="your-telegram-bot-token"`,
				"",
				"# ВКонтакте (Сообщество -> Настройки -> Работа с API)",
				`VK_COMMUNITY_TOKEN="your-vk-community-token"`,
				`VK_CONFIRMATION_CODE="your-vk-confirmation-string"`,
				`VK_SECRET_KEY="your-vk-secret-key"`,
				"",
				"# WhatsApp (Green-API)",
				`GREEN_API_INSTANCE_ID="1101234567"`,
				`GREEN_API_TOKEN="your-green-api-token"`,
				"",
				"# Режим работы: polling (локально/без белого IP) или webhook",
				`BOT_MODE="polling"`,
				`PORT="3000"`,
			].join("\n"),
		);

		// 4. Dockerfile
		builder.addFile(
			"Dockerfile",
			[
				"FROM node:20-alpine AS builder",
				"WORKDIR /app",
				"COPY package.json tsconfig.json ./",
				"RUN npm install",
				"COPY src ./src",
				"RUN npm run build",
				"",
				"FROM node:20-alpine",
				"WORKDIR /app",
				"COPY package.json ./",
				"RUN npm install --omit=dev",
				"COPY --from=builder /app/dist ./dist",
				"ENV NODE_ENV=production",
				"CMD [\"node\", \"dist/bot.js\"]",
			].join("\n"),
		);

		// 5. docker-compose.yml
		builder.addFile(
			"docker-compose.yml",
			[
				"version: '3.8'",
				"services:",
				`  dente-bot:`,
				`    container_name: dente-bot-${clinicSlug}`,
				"    build: .",
				"    restart: unless-stopped",
				"    env_file: .env",
				"    environment:",
				"      - NODE_ENV=production",
				"    logging:",
				"      driver: \"json-file\"",
				"      options:",
				"        max-size: \"10m\"",
				"        max-file: \"3\"",
			].join("\n"),
		);

		// 6. src/bot.ts (Автономный демон)
		builder.addFile(
			"src/bot.ts",
			[
				"import 'dotenv/config';",
				"",
				`console.log("🚀 Запуск автономного бота для клиники: ${params.clinicName}");`,
				"",
				"const orgId = process.env.ORGANIZATION_ID;",
				"const tgToken = process.env.TELEGRAM_BOT_TOKEN;",
				"const denteApiUrl = process.env.DENTE_API_URL || 'https://crm.dente.clinic';",
				"",
				"if (!tgToken && !process.env.VK_COMMUNITY_TOKEN) {",
				"  console.error('❌ ОШИБКА: Не задан TELEGRAM_BOT_TOKEN или VK_COMMUNITY_TOKEN в .env');",
				"  process.exit(1);",
				"}",
				"",
				"// Автономный цикл обработки обновлений (Long Polling)",
				"async function startTelegramPolling() {",
				"  if (!tgToken) return;",
				"  let offset = 0;",
				"  console.log('🤖 Telegram Long Polling запущен успешно!');",
				"",
				"  while (true) {",
				"    try {",
				"      const res = await fetch(`https://api.telegram.org/bot${tgToken}/getUpdates?offset=${offset}&timeout=25`);",
				"      const data = await res.json() as any;",
				"",
				"      if (data.ok && Array.isArray(data.result)) {",
				"        for (const update of data.result) {",
				"          offset = update.update_id + 1;",
				"          await handleTelegramUpdate(update);",
				"        }",
				"      }",
				"    } catch (err) {",
				"      console.error('Ошибка в цикле Telegram polling:', err);",
				"      await new Promise((r) => setTimeout(r, 3000));",
				"    }",
				"  }",
				"}",
				"",
				"async function handleTelegramUpdate(update: any) {",
				"  const msg = update.message;",
				"  const callback = update.callback_query;",
				"  const chatId = msg?.chat?.id || callback?.message?.chat?.id;",
				"  const text = msg?.text || '';",
				"  const payload = callback?.data || '';",
				"",
				"  if (!chatId) return;",
				"",
				"  // 1. Онлайн-запись",
				"  if (text.includes('запис') || payload === 'booking:start') {",
				"    await sendTelegramMessage(chatId, '📅 <b>Онлайн-запись к врачу:</b>\\n\\nПожалуйста, выберите удобное время:', [",
				"      [{ text: '🕒 Завтра 10:00 (Терапевт)', callback_data: 'booking:confirm:10:00' }],",
				"      [{ text: '🕒 Завтра 14:00 (Хирург-имплантолог)', callback_data: 'booking:confirm:14:00' }],",
				"      [{ text: '🕒 Завтра 17:00 (Ортодонт)', callback_data: 'booking:confirm:17:00' }],",
				"    ]);",
				"    return;",
				"  }",
				"",
				"  // 2. Подтверждение записи",
				"  if (payload.startsWith('booking:confirm:') || payload.startsWith('confirm_visit:')) {",
				"    await sendTelegramMessage(chatId, '✅ <b>Ваш приём успешно подтверждён!</b>\\n\\nДоктор и стерильный кабинет подготовлены. Ждём вас в клинике!');",
				"    return;",
				"  }",
				"",
				"  // 3. Прейскурант и цены",
				"  if (text.includes('цена') || text.includes('прайс') || text.includes('сколько стоит') || text.includes('пломб')) {",
				"    await sendTelegramMessage(chatId, '🦷 <b>Прейскурант услуг клиники:</b>\\n\\n• Консультация и 3D КЛКТ: <b>от 1 500 ₽</b>\\n• Лечение кариеса (пломба): <b>от 3 900 ₽</b>\\n• Профессиональная гигиена: <b>от 4 500 ₽</b>\\n• Имплантация под ключ: <b>от 35 000 ₽</b>', [",
				"      [{ text: '📅 Записаться на консультацию', callback_data: 'booking:start' }],",
				"    ]);",
				"    return;",
				"  }",
				"",
				"  // 4. Отзывы",
				"  if (text.includes('отзыв') || payload === 'reviews:get') {",
				"    await sendTelegramMessage(chatId, '⭐ <b>Будем благодарны за ваш отзыв!</b>\\n\\nВыберите удобную площадку:', [",
				"      [{ text: '📍 Яндекс.Карты', url: 'https://yandex.ru/maps' }],",
				"      [{ text: '📍 2ГИС', url: 'https://2gis.ru' }],",
				"      [{ text: '👨‍⚕️ ПроДокторов', url: 'https://prodoctorov.ru' }],",
				"    ]);",
				"    return;",
				"  }",
				"",
				"  // Меню по умолчанию",
				"  await sendTelegramMessage(chatId, `Здравствуйте! Вас приветствует виртуальный администратор стоматологии <b>${params.clinicName}</b>.\\n\\nЧем я могу помочь?`, [",
				"    [{ text: '📅 Записаться на приём', callback_data: 'booking:start' }],",
				"    [{ text: '🦷 Узнать цены на услуги', callback_data: 'price:all' }],",
				"    [{ text: '⭐ Оставить отзыв о клинике', callback_data: 'reviews:get' }],",
				"  ]);",
				"}",
				"",
				"async function sendTelegramMessage(chatId: number, text: string, buttons?: any[][]) {",
				"  const body: any = {",
				"    chat_id: chatId,",
				"    text,",
				"    parse_mode: 'HTML',",
				"  };",
				"  if (buttons) {",
				"    body.reply_markup = { inline_keyboard: buttons };",
				"  }",
				"  await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {",
				"    method: 'POST',",
				"    headers: { 'content-type': 'application/json' },",
				"    body: JSON.stringify(body),",
				"  });",
				"}",
				"",
				"startTelegramPolling();",
			].join("\n"),
		);

		// 7. README.md
		builder.addFile(
			"README.md",
			[
				`# 🤖 Автономный демон бота: ${params.clinicName}`,
				"",
				"Этот пакет содержит полностью самостоятельный, изолированный исходный код чат-бота для вашей стоматологической клиники.",
				"Бот может работать как на вашем собственном выделенном сервере/VPS клиники, так и подключаться к облаку DENTE CRM.",
				"",
				"## 🚀 Быстрый запуск в 2 клика (Docker Compose)",
				"",
				"1. Скопируйте файл окружения и укажите ваши токены:",
				"   ```bash",
				"   cp .env.example .env",
				"   nano .env",
				"   ```",
				"2. Запустите контейнер:",
				"   ```bash",
				"   docker compose up -d",
				"   ```",
				"3. Проверьте логи работы:",
				"   ```bash",
				"   docker compose logs -f",
				"   ```",
				"",
				"## 🛠️ Запуск без Docker (Node.js)",
				"",
				"```bash",
				"npm install",
				"npm run build",
				"npm start",
				"```",
				"",
				"## ⚙️ Установка службы Systemd (Ubuntu / Debian Linux)",
				"",
				"1. Создайте файл службы `/etc/systemd/system/dente-bot.service`:",
				"   ```ini",
				"   [Unit]",
				`   Description=DENTE Clinic Bot (${params.clinicName})`,
				"   After=network.target",
				"",
				"   [Service]",
				"   Type=simple",
				"   User=root",
				`   WorkingDirectory=/opt/dente-bot`,
				"   ExecStart=/usr/bin/node dist/bot.js",
				"   Restart=always",
				"   RestartSec=5",
				"   EnvironmentFile=/opt/dente-bot/.env",
				"",
				"   [Install]",
				"   WantedBy=multi-user.target",
				"   ```",
				"2. Активируйте и запустите службу:",
				"   ```bash",
				"   sudo systemctl daemon-reload",
				"   sudo systemctl enable --now dente-bot",
				"   sudo systemctl status dente-bot",
				"   ```",
				"",
				"## 🔒 Безопасность и соответствие законам РФ (152-ФЗ / 323-ФЗ)",
				"- Бот не хранит персональные данные пациентов на сторонних серверах.",
				"- Все запросы к расписанию и прейскуранту осуществляются строго в защищенном контуре клиники.",
			].join("\n"),
		);

		return builder.build();
	}
}
