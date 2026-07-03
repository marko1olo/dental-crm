import cp, { type ChildProcess } from "node:child_process";
import fs from "node:fs";
import { resolve } from "node:path";
import net from "node:net";

let tunnelProcess: ChildProcess | null = null;
const SOCKS_PORT = 1080;

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
  const sshKey = process.env.SSH_KEY_PATH;
  const sshHost = process.env.SSH_HOST;

  if (!sshKey || !sshHost) {
    console.warn(`[SSH Tunnel] SSH_KEY_PATH or SSH_HOST environment variables not set. Cannot start tunnel.`);
    return false;
  }

  if (sshHost.startsWith("-") || sshKey.startsWith("-")) {
    console.warn(`[SSH Tunnel] Invalid SSH_HOST or SSH_KEY_PATH. Cannot start tunnel.`);
    return false;
  }

  // 1. Проверяем, слушает ли уже порт 1080
  const alreadyOpen = await isPortOpen(SOCKS_PORT);
  if (alreadyOpen) {
    return true;
  }

  // 2. Проверяем наличие приватного ключа
  if (!fs.existsSync(sshKey)) {
    console.warn(`[SSH Tunnel] SSH key not found at ${sshKey}. Cannot start tunnel.`);
    return false;
  }

  
  try {
    const cmdArgs = [
      "-N",
      "-D", SOCKS_PORT.toString(),
      "-o", "ExitOnForwardFailure=yes",
      "-o", "ConnectTimeout=5",
      "-o", "StrictHostKeyChecking=no",
      "-o", "UserKnownHostsFile=NUL",
      "-i", sshKey,
      sshHost
    ];

    tunnelProcess = cp.spawn("ssh", cmdArgs, {
      detached: true,
      stdio: "ignore"
    });

    tunnelProcess.unref();

    // Ждем 2 секунды, пока туннель установит соединение
    await new Promise((r) => setTimeout(r, 2000));

    const checkOpen = await isPortOpen(SOCKS_PORT);
    if (checkOpen) {
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
