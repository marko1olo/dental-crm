/**
 * DENTE Dental CRM — Windows PowerShell & Installer Scripts Test Suite
 *
 * Validates:
 * 1. UTF-8 without BOM encoding on all installer scripts and config assets.
 * 2. Strict <= 800 lines ceiling (Mandate 8b) on all installer files.
 * 3. Native PowerShell AST parser syntax validation for all .ps1 files.
 * 4. Safe postmaster.pid handling & port collision fallback (5438) in db-preflight.ps1.
 * 5. Administrator check & Windows 10/11 Home fallback in Setup-DenteLanNetwork.ps1.
 * 6. Service status reporting in Russian («Работает (Порт ...)», «Остановлена», «Ошибка запуска»).
 */

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const installerDir = path.resolve(__dirname, "..");

describe("Windows PowerShell & Installer Hardening Suite", () => {
	const allFiles = fs
		.readdirSync(installerDir, { withFileTypes: true })
		.filter((dirent) => dirent.isFile())
		.map((dirent) => path.join(installerDir, dirent.name));

	const ps1Files = allFiles.filter((f) => f.endsWith(".ps1"));

	it("should find all expected installer script files in installer/windows/", () => {
		assert.ok(ps1Files.length >= 3, `Expected at least 3 .ps1 files, found ${ps1Files.length}`);
		const fileNames = allFiles.map((f) => path.basename(f));
		assert.ok(fileNames.includes("db-preflight.ps1"), "db-preflight.ps1 must exist");
		assert.ok(fileNames.includes("Setup-DenteLanNetwork.ps1"), "Setup-DenteLanNetwork.ps1 must exist");
		assert.ok(fileNames.includes("DenteTray.ps1"), "DenteTray.ps1 must exist");
		assert.ok(fileNames.includes("manage-service.cmd"), "manage-service.cmd must exist");
	});

	it("all installer files must be encoded in UTF-8 without BOM (no mojibake, no replacement chars)", () => {
		for (const filePath of allFiles) {
			const buf = fs.readFileSync(filePath);
			const fileName = path.basename(filePath);

			// Check for UTF-8 BOM (EF BB BF)
			const hasUtf8Bom = buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf;
			assert.strictEqual(
				hasUtf8Bom,
				false,
				`File '${fileName}' contains UTF-8 BOM (EF BB BF). Must be pure UTF-8 without BOM!`,
			);

			// Check for UTF-16 LE/BE BOM (FF FE or FE FF)
			const hasUtf16Bom =
				buf.length >= 2 &&
				((buf[0] === 0xff && buf[1] === 0xfe) || (buf[0] === 0xfe && buf[1] === 0xff));
			assert.strictEqual(
				hasUtf16Bom,
				false,
				`File '${fileName}' contains UTF-16 BOM. Must be pure UTF-8 without BOM!`,
			);

			// Check for valid UTF-8 string decoding and absence of U+FFFD replacement character
			const text = buf.toString("utf8");
			assert.strictEqual(
				text.includes("\uFFFD"),
				false,
				`File '${fileName}' contains replacement character U+FFFD (corrupted encoding)!`,
			);
		}
	});

	it("all installer files must strictly satisfy Mandate 8b (<= 800 lines of code)", () => {
		for (const filePath of allFiles) {
			const text = fs.readFileSync(filePath, "utf8");
			const lines = text.split(/\r?\n/).length;
			const fileName = path.basename(filePath);
			assert.ok(
				lines <= 800,
				`File '${fileName}' has ${lines} lines, exceeding strict Mandate 8b limit of 800 lines!`,
			);
		}
	});

	it("all PowerShell (.ps1) files must pass native AST parser validation without syntax errors", () => {
		for (const ps1Path of ps1Files) {
			const fileName = path.basename(ps1Path);
			const normalizedPath = ps1Path.replace(/\\/g, "/");

			const psScript = `
				$tokens = $null
				$errors = $null
				$null = [System.Management.Automation.Language.Parser]::ParseFile('${normalizedPath}', [ref]$tokens, [ref]$errors)
				if ($errors -and $errors.Count -gt 0) {
					$errors | ForEach-Object { Write-Error ("Line " + $_.Extent.StartLineNumber + ":" + $_.Extent.StartColumnNumber + " - " + $_.Message + " [Snippet: " + $_.Extent.Text + "]") }
					exit 1
				}
				exit 0
			`;

			const res = spawnSync(
				"powershell.exe",
				["-NoProfile", "-NonInteractive", "-Command", psScript],
				{ encoding: "utf8", timeout: 10000 },
			);

			assert.strictEqual(
				res.status,
				0,
				`PowerShell AST parser reported syntax errors in '${fileName}':\n${res.stderr || res.stdout}`,
			);
		}
	});

	describe("db-preflight.ps1 verification", () => {
		const preflightContent = fs.readFileSync(path.join(installerDir, "db-preflight.ps1"), "utf8");

		it("should safely handle postmaster.pid without killing system processes (svchost, System, lsass)", () => {
			// Must check if process is postgres
			assert.ok(
				preflightContent.includes("postmaster.pid"),
				"Must reference postmaster.pid lock file",
			);
			assert.ok(
				preflightContent.includes("Get-Process -Id $recordedPid"),
				"Must query process table by recorded PID",
			);
			assert.ok(
				preflightContent.includes("postgres"),
				"Must verify if process name is postgres",
			);
			// Must NOT call Stop-Process or taskkill on the foreign process
			assert.ok(
				!preflightContent.includes("Stop-Process -Id $recordedPid"),
				"Must NEVER call Stop-Process on recycled recordedPid!",
			);
			assert.ok(
				preflightContent.includes("Remove-Item -Path $pidFilePath"),
				"Must safely remove only the postmaster.pid file itself",
			);
		});

		it("should test port listening with Get-NetTCPConnection and netstat fallback", () => {
			assert.ok(
				preflightContent.includes("Get-NetTCPConnection"),
				"Must use Get-NetTCPConnection for modern Windows",
			);
			assert.ok(
				preflightContent.includes("netstat -ano"),
				"Must include netstat -ano fallback for older Windows",
			);
		});

		it("should switch to fallback port 5438 when port 5432 is occupied and sync configs", () => {
			assert.ok(
				preflightContent.includes("5438"),
				"Must define or use fallback port 5438 (D-E-N-T-E)",
			);
			assert.ok(
				preflightContent.includes("Sync-PostgresConf"),
				"Must include function to update postgresql.conf",
			);
			assert.ok(
				preflightContent.includes("Sync-EnvFile"),
				"Must include function to update dente.env",
			);
			assert.ok(
				preflightContent.includes("DATABASE_URL="),
				"Must update DATABASE_URL with new port in dente.env",
			);
			assert.ok(
				preflightContent.includes("PGPORT="),
				"Must update PGPORT with new port in dente.env",
			);
		});
	});

	describe("Setup-DenteLanNetwork.ps1 verification", () => {
		const setupLanContent = fs.readFileSync(path.join(installerDir, "Setup-DenteLanNetwork.ps1"), "utf8");

		it("should verify administrator elevation via WindowsPrincipal", () => {
			assert.ok(
				setupLanContent.includes("[Security.Principal.WindowsPrincipal]"),
				"Must check WindowsPrincipal for elevation",
			);
			assert.ok(
				setupLanContent.includes("[Security.Principal.WindowsIdentity]::GetCurrent()"),
				"Must check current Windows identity",
			);
			assert.ok(
				setupLanContent.includes("ОШИБКА: Требуются права Администратора!"),
				"Must provide clear localized elevation error message",
			);
		});

		it("should contain try/catch fallback for Windows 10/11 Home editions on Set-NetConnectionProfile", () => {
			assert.ok(
				setupLanContent.includes("Set-NetConnectionProfile"),
				"Must attempt Set-NetConnectionProfile to switch to Private",
			);
			assert.ok(
				setupLanContent.includes("Windows 10/11 Home"),
				"Must document/handle Windows 10/11 Home fallback gracefully",
			);
			assert.ok(
				setupLanContent.includes("HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\NetworkList\\Profiles"),
				"Must attempt registry fallback if cmdlet is restricted",
			);
		});

		it("should configure inbound firewall rules with Profile Any to ensure clinic connectivity", () => {
			assert.ok(
				setupLanContent.includes("Profile Any") || setupLanContent.includes("profile=any"),
				"Must configure firewall rules with Profile Any so rules apply even if network category is Public on Home edition",
			);
			assert.ok(setupLanContent.includes("4000"), "Must open TCP 4000 for Fastify API & Web Client");
			assert.ok(setupLanContent.includes("4100"), "Must open TCP 4100 for WebSocket Broker");
			assert.ok(setupLanContent.includes("5353"), "Must open UDP 5353 for mDNS discovery");
			assert.ok(setupLanContent.includes("4101"), "Must open UDP 4101 for LAN Beacon");
		});
	});

	describe("manage-service.cmd and DenteTray.ps1 service status verification", () => {
		const cmdContent = fs.readFileSync(path.join(installerDir, "manage-service.cmd"), "utf8");
		const trayContent = fs.readFileSync(path.join(installerDir, "DenteTray.ps1"), "utf8");

		it("manage-service.cmd must check Get-Service and output Russian status strings", () => {
			assert.ok(cmdContent.includes("Get-Service"), "Must use Get-Service to query service");
			assert.ok(cmdContent.includes("DenteService"), "Must check DenteService");
			assert.ok(cmdContent.includes("Работает (Порт"), "Must include Russian status 'Работает (Порт ...)'");
			assert.ok(cmdContent.includes("Остановлена"), "Must include Russian status 'Остановлена'");
			assert.ok(cmdContent.includes("Ошибка запуска"), "Must include Russian status 'Ошибка запуска'");
			assert.ok(cmdContent.includes("chcp 65001"), "Must set console code page to UTF-8 (65001)");
		});

		it("DenteTray.ps1 must check Get-Service and provide Russian status strings in health check", () => {
			assert.ok(trayContent.includes("Get-Service"), "Must use Get-Service to query service");
			assert.ok(trayContent.includes("DenteService"), "Must check DenteService");
			assert.ok(trayContent.includes("Работает (Порт"), "Must include Russian status 'Работает (Порт ...)'");
			assert.ok(trayContent.includes("Остановлена"), "Must include Russian status 'Остановлена'");
			assert.ok(trayContent.includes("Ошибка запуска"), "Must include Russian status 'Ошибка запуска'");
			assert.ok(trayContent.includes("Get-DenteServiceHealth"), "Must define health audit function");
		});
	});
});
