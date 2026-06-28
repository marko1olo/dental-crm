import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import net from "node:net";

let tunnelProcess: ChildProcess | null = null;
const SOCKS_PORT = 1080;
const SSH_KEY = "C:\\Users\\Admin\\\\.ssh\\\\id_ed25519";
const SSH_HOST = "root@62.84.100.97";

function isPortOpen(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => {
      // Порт занят (значит, туннель или другой прокси уже слушает порт)
      resolve(true);
    });
    server.once("listening", () => {
      // Порт свободен
      server.close();
      resolve(false);
    });
    server.listen(port, "127.0.0.1");
  });
}

export async function ensureSshTunnel(): Promise<boolean> {
  // 1. Проверяем, слушает ли уже порт 1080
  const alreadyOpen = await isPortOpen(SOCKS_PORT);
  if (alreadyOpen) {
    console.log(`[SSH Tunnel] SOCKS5 port ${SOCKS_PORT} is already active/listening.`);
    return true;
  }

  // 2. Проверяем наличие приватного ключа
  if (!existsSync("C:\\Users\\Admin\\.ssh\\id_ed25519")) {
    console.warn(`[SSH Tunnel] SSH key not found at C:\\Users\\Admin\\.ssh\\id_ed25519. Cannot start tunnel.`);
    return false;
  }

  console.log(`[SSH Tunnel] Starting SSH SOCKS5 tunnel on port ${SOCKS_PORT} via ${SSH_HOST}...`);
  
  try {
    const cmdArgs = [
      "-N",
      "-D", SOCKS_PORT.toString(),
      "-o", "ExitOnForwardFailure=yes",
      "-o", "ConnectTimeout=5",
      "-o", "StrictHostKeyChecking=no",
      "-o", "UserKnownHostsFile=NUL",
      "-i", "C:\\Users\\Admin\\.ssh\\id_ed25519",
      SSH_HOST
    ];

    tunnelProcess = spawn("ssh", cmdArgs, {
      detached: true,
      stdio: "ignore"
    });

    tunnelProcess.unref();

    // Ждем 2 секунды, пока туннель установит соединение
    await new Promise((r) => setTimeout(r, 2000));

    const checkOpen = await isPortOpen(SOCKS_PORT);
    if (checkOpen) {
      console.log(`[SSH Tunnel] SSH SOCKS5 tunnel successfully established on port ${SOCKS_PORT}.`);
      return true;
    } else {
      console.warn(`[SSH Tunnel] Tunnel process spawned but port ${SOCKS_PORT} is still closed.`);
      return false;
    }
  } catch (err) {
    console.error(`[SSH Tunnel] Failed to launch SSH tunnel:`, err);
    return false;
  }
}

export function stopSshTunnel(): void {
  if (tunnelProcess) {
    console.log("[SSH Tunnel] Stopping SSH SOCKS5 tunnel...");
    try {
      tunnelProcess.kill();
    } catch {
      // Игнорируем ошибки при закрытии
    }
    tunnelProcess = null;
  }
}

// Завершаем процесс при закрытии приложения
process.on("exit", () => {
  stopSshTunnel();
});
process.on("SIGINT", () => {
  stopSshTunnel();
  process.exit();
});
process.on("SIGTERM", () => {
  stopSshTunnel();
  process.exit();
});
