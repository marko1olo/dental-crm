import { fetch, ProxyAgent } from 'undici';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Загрузим env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function run() {
  console.log("=== ТЕСТ UNDICI FETCH + DISPATCHER ===");
  const proxyUrl = "socks5://127.0.0.1:1080";
  console.log("Используем прокси:", proxyUrl);

  try {
    const dispatcher = new ProxyAgent({ uri: proxyUrl });
    console.log("Отправляем запрос через undici fetch с dispatcher...");
    const res = await fetch("https://api.ipify.org?format=json", { dispatcher });
    const ip = await res.json() as { ip: string };
    console.log("Наш внешний IP через undici fetch:", ip);
  } catch (err: any) {
    console.log("Ошибка undici fetch:", err.message);
  }
}

run();
