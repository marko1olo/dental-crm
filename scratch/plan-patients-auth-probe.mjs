/**
 * Почему приложение не пускает свежий токен: спрашиваем сервер напрямую.
 * Только чтение. Значения токенов в вывод не попадают.
 */
import { spawn } from "node:child_process";

const minted = await new Promise((resolve, reject) => {
  const child = spawn("npx", ["tsx", "../../scratch/plan-mint-tokens.ts"], {
    cwd: "C:/Clinic_MVP/dental-crm/apps/api",
    shell: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let out = "";
  let err = "";
  child.stdout.on("data", (c) => {
    out += c.toString();
  });
  child.stderr.on("data", (c) => {
    err += c.toString();
  });
  child.on("close", (code) =>
    code === 0 ? resolve(JSON.parse(out.trim())) : reject(new Error(err.slice(0, 300))),
  );
});

const bases = ["http://127.0.0.1:5173", "http://127.0.0.1:4100"];
const paths = ["/api/dashboard", "/api/patients"];

for (const base of bases) {
  for (const path of paths) {
    for (const withStaff of [true, false]) {
      const headers = { authorization: `Bearer ${minted.clinicToken}` };
      if (withStaff) headers["x-dente-staff-token"] = minted.staffToken;
      try {
        const response = await fetch(base + path, { headers });
        const text = await response.text();
        console.log(
          `${base}${path} staff=${withStaff} -> ${response.status} ${response.statusText}; ` +
            `тело ${text.length} б: ${text.replace(/\s+/g, " ").slice(0, 180)}`,
        );
      } catch (error) {
        console.log(`${base}${path} staff=${withStaff} -> запрос упал: ${error.message}`);
      }
    }
  }
}
