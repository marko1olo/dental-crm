/**
 * DENTE Dental CRM — Clinic Hardware & Peripheral REST API Routes.
 *
 * Endpoints:
 * - GET  /api/hardware/devices: Discovers and returns connected printers, scanners, and KKT.
 * - GET  /api/hardware/devices/:id/status: Queries live real-time status (paper/cover/offline).
 * - POST /api/hardware/test-print: Sends test print pattern to selected device (TCP or local).
 * - GET  /api/hardware/health: Service health and hardware probe capabilities.
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";

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

export async function registerHardwareRoutes(app: FastifyInstance): Promise<void> {
	/**
	 * GET /api/hardware/devices
	 * Discovers all connected clinic hardware: printers, scanners, and KKT devices.
	 */
	app.get(
		"/api/hardware/devices",
		async (request: FastifyRequest, reply: FastifyReply) => {
			const parsedQuery = getDevicesQuerySchema.safeParse(request.query);
			if (!parsedQuery.success) {
				return reply.status(400).send({
					error: "ValidationError",
					message: "Некорректные параметры запроса оборудования",
					issues: parsedQuery.error.issues,
				});
			}
			const query = parsedQuery.data;

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
			const parsedBody = testPrintBodySchema.safeParse(request.body);
			if (!parsedBody.success) {
				return reply.status(400).send({
					error: "ValidationError",
					message: "Некорректные параметры тестовой печати",
					issues: parsedBody.error.issues,
				});
			}
			const body = parsedBody.data;

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
}

export default registerHardwareRoutes;
