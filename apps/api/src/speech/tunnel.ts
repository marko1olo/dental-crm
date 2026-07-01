import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import net from "node:net";

let tunnelProcess: ChildProcess | null = null;

function getSocksPort(): number {
  return process.env.DENTAL_SSH_SOCKS_PORT ? parseInt(process.env.DENTAL_SSH_SOCKS_PORT, 10) : 1080;
}

function getSshKey(): string | undefined {
  return process.env.DENTAL_SSH_KEY;
}

function getSshHost(): string | undefined {
  return process.env.DENTAL_SSH_HOST;
}

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
  const sshKey = getSshKey();
  const sshHost = getSshHost();
  const socksPort = getSocksPort();

  if (!sshKey || !sshHost) {
    console.warn("[SSH Tunnel] DENTAL_SSH_KEY or DENTAL_SSH_HOST is not set. Cannot start tunnel.");
    return false;
  }

  // 1. Проверяем, слушает ли уже порт
  const alreadyOpen = await isPortOpen(socksPort);
  if (alreadyOpen) {
    console.log(`[SSH Tunnel] SOCKS5 port ${socksPort} is already active/listening.`);
    return true;
  }

  // 2. Проверяем наличие приватного ключа
  if (!existsSync(sshKey)) {
    console.warn(`[SSH Tunnel] SSH key not found at ${sshKey}. Cannot start tunnel.`);
    return false;
  }

  console.log(`[SSH Tunnel] Starting SSH SOCKS5 tunnel on port ${socksPort} via ${sshHost}...`);
  
  try {
    const cmdArgs = [
      "-N",
      "-D", socksPort.toString(),
      "-o", "ExitOnForwardFailure=yes",
      "-o", "ConnectTimeout=5",
      "-o", "StrictHostKeyChecking=no",
      "-o", "UserKnownHostsFile=NUL",
      "-i", sshKey,
      sshHost
    ];

    tunnelProcess = spawn("ssh", cmdArgs, {
      detached: true,
      stdio: "ignore"
    });

    tunnelProcess.unref();

    // Ждем 2 секунды, пока туннель установит соединение
    await new Promise((r) => setTimeout(r, 2000));

    const checkOpen = await isPortOpen(socksPort);
    if (checkOpen) {
      console.log(`[SSH Tunnel] SSH SOCKS5 tunnel successfully established on port ${socksPort}.`);
      return true;
    } else {
      console.warn(`[SSH Tunnel] Tunnel process spawned but port ${socksPort} is still closed.`);
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
