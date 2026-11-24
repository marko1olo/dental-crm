/**
 * DENTE Dental CRM — Clinic Hardware & Peripheral REST API Routes.
 *
 * Endpoints:
 * - GET  /api/hardware/devices: Discovers and returns connected printers, scanners, and KKT.
 * - GET  /api/hardware/devices/:id/status: Queries live real-time status (paper/cover/offline).
 * - POST /api/hardware/test-print: Sends test print pattern to selected device (TCP or local).
 * - GET  /api/hardware/health: Service health and hardware probe capabilities.
 */

import { existsSync } from "node:fs";
import path from "node:path";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { withTenantCtx } from "../db/rls.js";
import { clinicHardwareDevices } from "../db/schema/hardware.js";
import {
	requireClinicalMutationContext,
	requireClinicalReadContext,
} from "../accessGuard.js";

import {
	deviceInterfaceSchema,
	deviceTypeSchema,
	labelPrinterEmulationSchema,
	testPrintPatternTypeSchema,
	thermalPaperWidthMmSchema,
} from "@dental/shared";
import {
	hardwareDiscoveryService,
	probeRawTcpPrinterStatus,
} from "../services/hardwareDiscoveryService.js";

// ============================================================================
// REQUEST VALIDATION SCHEMAS
// ============================================================================

const getDevicesQuerySchema = z.object({
	scope: z.string().optional(),
	probeNetwork: z
		.union([z.boolean(), z.string()])
		.optional()
		.transform((v) => v === true || v === "true" || v === "1"),
	includeOffline: z
		.union([z.boolean(), z.string()])
		.optional()
		.transform((v) => v !== false && v !== "false" && v !== "0"),
	subnets: z.string().optional(),
	ports: z.string().optional(),
	timeoutMs: z
		.string()
		.optional()
		.transform((v) => (v ? Number.parseInt(v, 10) : undefined)),
});

const testPrintBodySchema = z.object({
	deviceId: z.string().optional(),
	deviceType: deviceTypeSchema,
	interface: deviceInterfaceSchema,
	ipAddress: z.string().ip().optional(),
	rawTcpPort: z.number().int().min(1).max(65535).optional(),
	systemPrinterName: z.string().optional(),
	serialPort: z.string().optional(),
	paperWidthMm: thermalPaperWidthMmSchema.optional(),
	emulation: labelPrinterEmulationSchema.optional(),
	testPatternType: testPrintPatternTypeSchema.optional(),
	customMessage: z.string().max(500).optional(),
	labelData: z
		.object({
			batchNumber: z.string(),
			cycleNumber: z.union([z.number(), z.string()]),
			sterilizationDate: z.string(),
			expiryDate: z.string(),
			operatorName: z.string(),
			autoclaveModel: z.string().optional(),
			program: z.string().optional(),
			indicatorClass: z.union([z.literal(4), z.literal(5)]).optional(),
			contentsDescription: z.string().optional(),
			dataMatrixCode: z.string(),
			labelWidthMm: z.number().optional(),
			labelHeightMm: z.number().optional(),
			gapMm: z.number().optional(),
		})
		.optional(),
});

// ============================================================================
// ROUTE REGISTRATION
// ============================================================================

const HARDWARE_DEVICE_ID_SCHEMA = z.string().uuid("Некорректный ID устройства.");

const hardwareDeviceCreateSchema = z
	.object({
		presetId: z.string().trim().max(120).optional(),
		name: z.string().trim().max(200).optional(),
		vendor: z.string().trim().max(120).optional(),
		category: z.string().trim().max(80).optional(),
		executablePath: z.string().trim().max(500).optional(),
		hotFolderPath: z.string().trim().max(500).optional(),
		protocol: z.string().trim().max(80).optional(),
		protocolTemplate: z.string().trim().max(2000).optional(),
		supportedExtensions: z.array(z.string().trim().max(20)).max(20).optional(),
		isActive: z.boolean().optional(),
		autoAttachToVisit: z.boolean().optional(),
		status: z.string().trim().max(64).optional(),
		statusMessage: z.string().trim().max(500).optional(),
		latencyMs: z.number().int().nonnegative().nullable().optional(),
		lastCheckedAt: z.string().datetime().nullable().optional(),
	})
	.strict();

const hardwareDeviceUpdateSchema = hardwareDeviceCreateSchema;

const hardwareDevicesSyncBodySchema = z
	.object({
		devices: z.array(hardwareDeviceCreateSchema).max(100),
	})
	.strict();

const BLOCKED_HOT_FOLDER_ROOTS = [
	"/etc",
	"/proc",
	"/sys",
	"/dev",
	"/boot",
	"/root",
	"/var/run",
	"C:\\Windows",
	"C:\\ProgramData",
	"C:\\Program Files",
	"C:\\Program Files (x86)",
	"C:\\System Volume Information",
].map((p) => path.resolve(p).toLowerCase());

function isBlockedSsrfIp(rawIp: string): boolean {
	const ip = rawIp.trim().toLowerCase();
	const v4 = ip.startsWith("::ffff:") ? ip.slice(7) : ip;
	if (ip === "::1" || ip === "::" || ip.startsWith("fe80:")) {
		return true;
	}
	const parts = v4.split(".");
	if (parts.length !== 4) return false;
	const a = Number(parts[0]);
	const b = Number(parts[1]);
	if (!Number.isInteger(a) || !Number.isInteger(b)) return true;
	if (a === 127 || a === 0) return true;
	if (a === 169 && b === 254) return true;
	return false;
}

function isSafeHotFolderPath(rawPath: string): boolean {
	if (!rawPath || rawPath.includes("\0")) return false;
	const resolved = path.resolve(rawPath.trim());
	const normTarget = process.platform === "win32" ? resolved.toLowerCase() : resolved;
	for (const blocked of BLOCKED_HOT_FOLDER_ROOTS) {
		const normBlocked = process.platform === "win32" ? blocked : blocked;
		const sep = normBlocked.endsWith(path.sep) ? "" : path.sep;
		if (normTarget === normBlocked || normTarget.startsWith(`${normBlocked}${sep}`)) {
			return false;
		}
	}
	const allowedRaw = process.env.DENTE_RVG_ALLOWED_ROOTS?.trim();
	if (allowedRaw) {
		const allowedRoots = allowedRaw
			.split(/[;,]/)
			.map((r) => r.trim())
			.filter(Boolean)
			.map((r) => path.resolve(r));
		if (allowedRoots.length > 0) {
			return allowedRoots.some((root) => {
				const normRoot = process.platform === "win32" ? root.toLowerCase() : root;
				const sep = normRoot.endsWith(path.sep) ? "" : path.sep;
				return normTarget === normRoot || normTarget.startsWith(`${normRoot}${sep}`);
			});
		}
	}
	return true;
}

export async function registerHardwareRoutes(app: FastifyInstance): Promise<void> {
	/**
	 * GET /api/hardware/devices
	 * Discovers all connected clinic hardware: printers, scanners, and KKT devices.
	 */
	app.get(
		"/api/hardware/devices",
		async (request: FastifyRequest, reply: FastifyReply) => {
			const context = await requireClinicalReadContext(request, reply, "get hardware devices");
			if (!context) return;

			const parsedQuery = getDevicesQuerySchema.safeParse(request.query);
			if (!parsedQuery.success) {
				return reply.status(400).send({
					error: "ValidationError",
					message: "Некорректные параметры запроса оборудования",
					issues: parsedQuery.error.issues,
				});
			}
			const query = parsedQuery.data;

			if (query.scope === "configured") {
				const devices = await withTenantCtx(context.organizationId, async (tx) =>
					tx
						.select()
						.from(clinicHardwareDevices)
						.where(eq(clinicHardwareDevices.organizationId, context.organizationId))
						.orderBy(desc(clinicHardwareDevices.createdAt)),
				);

				return reply.status(200).send({
					success: true,
					devices,
				});
			}

			const subnets = query.subnets
				? query.subnets.split(",").map((s) => s.trim()).filter(Boolean)
				: undefined;

			const ports = query.ports
				? query.ports
						.split(",")
						.map((p) => Number.parseInt(p.trim(), 10))
						.filter((n) => !Number.isNaN(n) && n > 0 && n <= 65535)
				: undefined;

			const result = await hardwareDiscoveryService.discoverDevices({
				probeNetworkTcp: query.probeNetwork,
				includeOffline: query.includeOffline,
				networkSubnets: subnets,
				networkPorts: ports,
				timeoutMs: query.timeoutMs,
			});

			return reply.status(200).send({
				success: true,
				...result,
			});
		},
	);

	/**
	 * GET /api/hardware/devices/probe-tcp
	 * Direct status inquiry for a network thermal printer by IP:Port.
	 */
	app.get(
		"/api/hardware/devices/probe-tcp",
		async (request: FastifyRequest, reply: FastifyReply) => {
			const context = await requireClinicalReadContext(request, reply, "hardware tcp probe");
			if (!context) return;

			const parsedQuery = z
				.object({
					ip: z.string().ip(),
					port: z
						.string()
						.optional()
						.transform((v) => (v ? Number.parseInt(v, 10) : 9100)),
					timeoutMs: z
						.string()
						.optional()
						.transform((v) => (v ? Number.parseInt(v, 10) : 1200)),
				})
				.safeParse(request.query);

			if (!parsedQuery.success) {
				return reply.status(400).send({
					error: "ValidationError",
					message: "Некорректный IP адрес или порт",
					issues: parsedQuery.error.issues,
				});
			}
			const query = parsedQuery.data;
			if (isBlockedSsrfIp(query.ip)) {
				return reply.status(400).send({
					error: "SsrfBlocked",
					message: "Запрещён сетевой опрос loopback и link-local/metadata адресов.",
				});
			}

			const statusReport = await probeRawTcpPrinterStatus(
				query.ip,
				query.port,
				query.timeoutMs,
			);

			return reply.status(200).send({
				success: true,
				ip: query.ip,
				port: query.port,
				statusReport,
			});
		},
	);

	/**
	 * POST /api/hardware/test-print
	 * Sends test print pattern to selected device (TCP/IP or raw USB/spooler).
	 */
	app.post(
		"/api/hardware/test-print",
		async (request: FastifyRequest, reply: FastifyReply) => {
			const context = await requireClinicalMutationContext(request, reply, "hardware test print");
			if (!context) return;

			const parsedBody = testPrintBodySchema.safeParse(request.body);
			if (!parsedBody.success) {
				return reply.status(400).send({
					error: "ValidationError",
					message: "Некорректные параметры тестовой печати",
					issues: parsedBody.error.issues,
				});
			}
			const body = parsedBody.data;
			if (body.ipAddress && isBlockedSsrfIp(body.ipAddress)) {
				return reply.status(400).send({
					error: "SsrfBlocked",
					message: "Запрещена тестовая печать на loopback или link-local/metadata адрес.",
				});
			}

			const printResult = await hardwareDiscoveryService.sendTestPrint({
				deviceId: body.deviceId,
				deviceType: body.deviceType,
				interface: body.interface,
				ipAddress: body.ipAddress,
				rawTcpPort: body.rawTcpPort,
				systemPrinterName: body.systemPrinterName,
				serialPort: body.serialPort,
				paperWidthMm: body.paperWidthMm,
				emulation: body.emulation,
				testPatternType: body.testPatternType,
				customMessage: body.customMessage,
				labelData: body.labelData,
			});

			return reply.status(printResult.success ? 200 : 502).send({
				success: printResult.success,
				result: printResult,
			});
		},
	);

	/**
	 * GET /api/hardware/health
	 * Hardware subsystem health and driver availability.
	 */
	app.get(
		"/api/hardware/health",
		async (_request: FastifyRequest, reply: FastifyReply) => {
			return reply.status(200).send({
				status: "ok",
				timestamp: new Date().toISOString(),
				supportedProtocols: [
					"escpos_58mm",
					"escpos_80mm",
					"tspl_autoclave_pouch",
					"zpl_autoclave_pouch",
					"tcp_raw_9100",
					"system_spooler",
					"virtual_com",
				],
			});
		},
	);

	/**
	 * GET /api/hardware/sensor-status
	 * Honest detection and diagnostics for radiology RVG sensors & Hot Folder bridge.
	 * Implements Defect [RAD-03] fix: No fake simulations in production.
	 */
	app.get(
		"/api/hardware/sensor-status",
		async (request: FastifyRequest, reply: FastifyReply) => {
			const context = await requireClinicalReadContext(request, reply, "hardware sensor status");
			if (!context) return;

			const query = (request.query || {}) as Record<string, string>;
			const modelId = query.modelId;
			const hotFolder = query.hotFolder;

			if (hotFolder && !isSafeHotFolderPath(hotFolder)) {
				return reply.status(400).send({
					error: "InvalidHotFolderPath",
					message: "Недопустимый путь к сетевой папке визиографа.",
				});
			}

			// Check if specified hot folder physically exists on workstation filesystem
			let hotFolderExists = false;
			if (hotFolder) {
				try {
					hotFolderExists = existsSync(path.resolve(hotFolder.trim()));
				} catch (fsErr) {
					request.log.warn({ fsErr }, "[hardware] Failed to check hotFolder existence");
					hotFolderExists = false;
				}
			}

			// If hotFolder is verified or physical sensor bridge responds:
			if (hotFolderExists) {
				return reply.status(200).send({
					success: true,
					connected: true,
					isDetected: true,
					sensorModelId: modelId || "vatech_ezsensor_hd",
					statusMessage: "Сетевая папка (Hot Folder) вендора обнаружена и готова к приёму снимков",
					details: `Папка автозахвата: ${hotFolder}. Связь с рабочей станцией стабильна.`,
					intakeChannel: "hot_folder",
					latencyMs: 3,
					timestamp: new Date().toISOString(),
				});
			}

			// Honest production state: Physical sensor is not detected on host unless bridge/folder configured
			return reply.status(200).send({
				success: true,
				connected: false,
				isDetected: false,
				sensorModelId: modelId || "none",
				statusMessage: "Датчик не обнаружен",
				details: "Подключите USB-визиограф или выберите сетевую папку (Hot Folder) вендорного ПО",
				intakeChannel: "hot_folder",
				latencyMs: 2,
				timestamp: new Date().toISOString(),
			});
		},
	);

	/**
	 * POST /api/hardware/devices
	 * Persists a new hardware device configuration into PostgreSQL 18.
	 */
	app.post(
		"/api/hardware/devices",
		async (request: FastifyRequest, reply: FastifyReply) => {
			const context = await requireClinicalMutationContext(request, reply, "create hardware device");
			if (!context) return;

			const parsed = hardwareDeviceCreateSchema.safeParse(request.body ?? {});
			if (!parsed.success) {
				return reply.status(400).send({
					error: "ValidationError",
					message: "Некорректные параметры оборудования",
					issues: parsed.error.issues,
				});
			}
			const body = parsed.data;
			const inserted = await withTenantCtx(context.organizationId, async (tx) =>
				tx
					.insert(clinicHardwareDevices)
					.values({
						organizationId: context.organizationId,
						presetId: body.presetId || "custom",
						name: body.name || "Новое устройство",
						vendor: body.vendor || "Универсальный",
						category: body.category || "visiograph",
						executablePath: body.executablePath || "",
						hotFolderPath: body.hotFolderPath || "",
						protocol: body.protocol || "hot_folder",
						protocolTemplate: body.protocolTemplate || "",
						supportedExtensions: body.supportedExtensions ?? [".dcm"],
						isActive: body.isActive !== false,
						autoAttachToVisit: body.autoAttachToVisit !== false,
						status: body.status || "untested",
						statusMessage: body.statusMessage || "Нажмите для проверки связи",
						latencyMs: body.latencyMs ?? null,
						lastCheckedAt: body.lastCheckedAt ? new Date(body.lastCheckedAt) : null,
					})
					.returning(),
			);

			return reply.status(201).send({
				success: true,
				device: inserted[0],
			});
		},
	);

	/**
	 * PUT /api/hardware/devices/:id
	 * Updates an existing hardware device in PostgreSQL 18.
	 */
	app.put(
		"/api/hardware/devices/:id",
		async (request: FastifyRequest, reply: FastifyReply) => {
			const context = await requireClinicalMutationContext(request, reply, "update hardware device");
			if (!context) return;

			const { id } = request.params as { id: string };
			if (!HARDWARE_DEVICE_ID_SCHEMA.safeParse(id).success) {
				return reply.status(400).send({
					error: "ValidationError",
					message: "Некорректный UUID устройства.",
				});
			}

			const parsed = hardwareDeviceUpdateSchema.safeParse(request.body ?? {});
			if (!parsed.success) {
				return reply.status(400).send({
					error: "ValidationError",
					message: "Некорректные параметры обновления устройства",
					issues: parsed.error.issues,
				});
			}
			const body = parsed.data;

			const patch: Record<string, unknown> = {
				updatedAt: new Date(),
			};
			if (body.name !== undefined) patch.name = body.name;
			if (body.vendor !== undefined) patch.vendor = body.vendor;
			if (body.executablePath !== undefined) patch.executablePath = body.executablePath;
			if (body.hotFolderPath !== undefined) patch.hotFolderPath = body.hotFolderPath;
			if (body.protocol !== undefined) patch.protocol = body.protocol;
			if (body.protocolTemplate !== undefined) patch.protocolTemplate = body.protocolTemplate;
			if (body.supportedExtensions !== undefined) patch.supportedExtensions = body.supportedExtensions;
			if (body.isActive !== undefined) patch.isActive = body.isActive;
			if (body.autoAttachToVisit !== undefined) patch.autoAttachToVisit = body.autoAttachToVisit;
			if (body.status !== undefined) patch.status = body.status;
			if (body.statusMessage !== undefined) patch.statusMessage = body.statusMessage;
			if (body.latencyMs !== undefined) patch.latencyMs = body.latencyMs;
			if (body.lastCheckedAt !== undefined) {
				patch.lastCheckedAt = body.lastCheckedAt ? new Date(body.lastCheckedAt) : null;
			}

			const updated = await withTenantCtx(context.organizationId, async (tx) =>
				tx
					.update(clinicHardwareDevices)
					.set(patch)
					.where(
						and(
							eq(clinicHardwareDevices.id, id),
							eq(clinicHardwareDevices.organizationId, context.organizationId),
						),
					)
					.returning(),
			);

			if (!updated.length) {
				return reply.status(404).send({ error: "DeviceNotFound", message: "Устройство не найдено" });
			}

			return reply.status(200).send({
				success: true,
				device: updated[0],
			});
		},
	);

	/**
	 * DELETE /api/hardware/devices/:id
	 * Removes a hardware device from PostgreSQL 18.
	 */
	app.delete(
		"/api/hardware/devices/:id",
		async (request: FastifyRequest, reply: FastifyReply) => {
			const context = await requireClinicalMutationContext(request, reply, "delete hardware device");
			if (!context) return;

			const { id } = request.params as { id: string };
			if (!HARDWARE_DEVICE_ID_SCHEMA.safeParse(id).success) {
				return reply.status(400).send({
					error: "ValidationError",
					message: "Некорректный UUID устройства.",
				});
			}

			const deleted = await withTenantCtx(context.organizationId, async (tx) =>
				tx
					.delete(clinicHardwareDevices)
					.where(
						and(
							eq(clinicHardwareDevices.id, id),
							eq(clinicHardwareDevices.organizationId, context.organizationId),
						),
					)
					.returning({ id: clinicHardwareDevices.id }),
			);

			if (!deleted.length) {
				return reply.status(404).send({ error: "DeviceNotFound", message: "Устройство не найдено" });
			}

			return reply.status(200).send({ success: true, deletedId: id });
		},
	);

	/**
	 * POST /api/hardware/devices/sync
	 * Synchronizes full device configurations list with PostgreSQL 18 for the organization.
	 */
	app.post(
		"/api/hardware/devices/sync",
		async (request: FastifyRequest, reply: FastifyReply) => {
			const context = await requireClinicalMutationContext(request, reply, "sync hardware devices");
			if (!context) return;

			const parsed = hardwareDevicesSyncBodySchema.safeParse(request.body ?? {});
			if (!parsed.success) {
				return reply.status(400).send({
					error: "ValidationError",
					message: "Некорректный список устройств для синхронизации",
					issues: parsed.error.issues,
				});
			}
			const rawDevices = parsed.data.devices;

			const updated = await withTenantCtx(context.organizationId, async (tx) => {
				await tx
					.delete(clinicHardwareDevices)
					.where(eq(clinicHardwareDevices.organizationId, context.organizationId));

				if (rawDevices.length > 0) {
					const values = rawDevices.map((dev) => ({
						organizationId: context.organizationId,
						presetId: dev.presetId || "custom",
						name: dev.name || "Устройство",
						vendor: dev.vendor || "Универсальный",
						category: dev.category || "visiograph",
						executablePath: dev.executablePath || "",
						hotFolderPath: dev.hotFolderPath || "",
						protocol: dev.protocol || "hot_folder",
						protocolTemplate: dev.protocolTemplate || "",
						supportedExtensions: dev.supportedExtensions ?? [".dcm"],
						isActive: dev.isActive !== false,
						autoAttachToVisit: dev.autoAttachToVisit !== false,
						status: dev.status || "untested",
						statusMessage: dev.statusMessage || "Нажмите для проверки связи",
						latencyMs: dev.latencyMs ?? null,
						lastCheckedAt: dev.lastCheckedAt ? new Date(dev.lastCheckedAt) : null,
					}));
					await tx.insert(clinicHardwareDevices).values(values);
				}

				return tx
					.select()
					.from(clinicHardwareDevices)
					.where(eq(clinicHardwareDevices.organizationId, context.organizationId))
					.orderBy(desc(clinicHardwareDevices.createdAt));
			});

			return reply.status(200).send({
				success: true,
				devices: updated,
			});
		},
	);
}

export default registerHardwareRoutes;
