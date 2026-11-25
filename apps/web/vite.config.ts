import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

declare const process: {
	env: Record<string, string | undefined>;
	on?: (event: string, handler: (err: any) => void) => void;
};

if (typeof process !== "undefined" && typeof (process as any).on === "function") {
	(process as any).on("uncaughtException", (err: any) => {
		if (err?.code === "ECONNRESET" || err?.code === "ECONNREFUSED") return;
		console.error("[Vite Proxy Socket]", err);
	});
}

const apiProxyTarget = process.env.DENTAL_API_PROXY_TARGET ?? "http://127.0.0.1:4100";

// __dirname equivalent for ESM configs
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Always point to root node_modules to prevent React duplication
const rootNodeModules = path.resolve(__dirname, "../../node_modules");

function onnxMimePlugin() {
	return {
		name: "vite-plugin-onnx-mime",
		configureServer(server: any) {
			server.middlewares.use((req: any, res: any, next: any) => {
				if (req.url && req.url.includes(".onnx")) {
					res.setHeader("Content-Type", "application/octet-stream");
					res.setHeader("Accept-Ranges", "bytes");
				} else if (req.url && req.url.includes(".wasm")) {
					res.setHeader("Content-Type", "application/wasm");
					res.setHeader("Accept-Ranges", "bytes");
				}
				next();
			});
		},
	};
}

export default defineConfig({
	root: __dirname,
	plugins: [
		react(),
		tailwindcss(),
		onnxMimePlugin(),
		VitePWA({
			registerType: "autoUpdate",
			includeAssets: ["favicon.ico", "apple-touch-icon.png", "masked-icon.svg"],
			manifest: {
				name: "Dente CRM",
				short_name: "Dente",
				description: "Умная CRM для стоматологий",
				theme_color: "#0d9488",
				background_color: "#ffffff",
				display: "standalone",
				icons: [
					{
						src: "pwa-192x192.png",
						sizes: "192x192",
						type: "image/png",
					},
					{
						src: "pwa-512x512.png",
						sizes: "512x512",
						type: "image/png",
					},
				],
			},
			workbox: {
				maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
			},
		}),
	],
	resolve: {
		dedupe: [
			"react",
			"react-dom",
			"react/jsx-runtime",
			"react/jsx-dev-runtime",
		],
		alias: [
			{ find: /^node:os$/, replacement: path.resolve(__dirname, "src/lib/nodeBuiltinBrowserStub.ts") },
			{ find: /^node:zlib$/, replacement: path.resolve(__dirname, "src/lib/nodeBuiltinBrowserStub.ts") },
			{ find: /^node:crypto$/, replacement: path.resolve(__dirname, "src/lib/nodeBuiltinBrowserStub.ts") },
			{ find: /^@dental\/shared$/, replacement: path.resolve(__dirname, "../../packages/shared/src/index.ts") },
			{ find: /^@dental\/shared\/(.*)$/, replacement: path.resolve(__dirname, "../../packages/shared/src/$1") },
			{ find: "react", replacement: path.join(rootNodeModules, "react") },
			{ find: "react-dom", replacement: path.join(rootNodeModules, "react-dom") },
			{ find: "react/jsx-runtime", replacement: path.join(rootNodeModules, "react/jsx-runtime") },
			{
				find: "react/jsx-dev-runtime",
				replacement: path.join(rootNodeModules, "react/jsx-dev-runtime"),
			},
		],
	},
	optimizeDeps: {
		include: ["react", "react-dom"],
		entries: ["index.html"],
		exclude: ["three"],
	},
	esbuild: {
		drop: process.env.NODE_ENV === "production" ? ["console", "debugger"] : [],
	},
	build: {
		target: "es2022",
		minify: "esbuild",
		cssMinify: true,
		sourcemap: false,
		reportCompressedSize: false,
		assetsInlineLimit: 4096,
		modulePreload: {
			resolveDependencies(filename, deps) {
				// Don't inject <link rel="modulepreload"> for heavy 3D, DICOM, charts, and secondary chunks on initial page load.
				// These are loaded strictly on demand or background idle, preventing 5400 RPM HDD I/O starvation and memory thrashing.
				return deps.filter((dep) => {
					const lower = dep.toLowerCase();
					if (lower.includes("three") || lower.includes("cornerstone") || lower.includes("vtk")) return false;
					if (lower.includes("pdf-canvas") || lower.includes("jspdf") || lower.includes("chart")) return false;
					if (lower.includes("dicom") || lower.includes("analytics")) return false;
					if (lower.includes("d3") || lower.includes("panoramic") || lower.includes("cbct") || lower.includes("zip") || lower.includes("fflate")) return false;
					if (lower.includes("radiology") || lower.includes("perio") || lower.includes("endo") || lower.includes("egisz") || lower.includes("marketing")) return false;
					if (lower.includes("telephony") || lower.includes("dental-lab") || lower.includes("inventory") || lower.includes("onboarding") || lower.includes("sanpin")) return false;
					if (lower.includes("ortho") || lower.includes("surgery") || lower.includes("prosthetics") || lower.includes("reports") || lower.includes("audit") || lower.includes("somatic") || lower.includes("speech")) return false;
					return true;
				});
			},
		},
		rollupOptions: {
			maxParallelFileOps: 2,
			output: {
				manualChunks(id) {
					const normalizedId = id.replaceAll("\\", "/");
					// Виртуальный модуль Vite с хелпером __vitePreload. Без явного захвата он
					// попадает в первый чанк, который его использовал (здесь — app-helpers,
					// 120 862 Б), и точка входа тянет весь тот чанк ради одной привязки.
					if (normalizedId.includes("vite/preload-helper"))
						return "vite-preload-helper";
					if (normalizedId.endsWith("/apps/web/src/AppBootState.tsx"))
						return "boot-state";
					if (normalizedId.endsWith("/apps/web/src/browserContinuity.ts"))
						return "browser-continuity";
					if (
						normalizedId.endsWith("/apps/web/src/workspacePreload.ts") ||
						normalizedId.includes("/apps/web/src/workspacePreloadModules/")
					)
						return "workspace-preload";
					if (normalizedId.endsWith("/apps/web/src/lib/lazyWithRetry.ts"))
						return "lazy-with-retry";
					if (normalizedId.endsWith("/apps/web/src/workspaceShell.tsx"))
						return "workspace-shell";
					if (
						normalizedId.endsWith("/apps/web/src/workspaceContinuityStrip.tsx")
					)
						return "workspace-continuity";
					if (
						normalizedId.endsWith(
							"/apps/web/src/workspaceRouteErrorBoundary.tsx",
						)
					)
						return "workspace-route-boundary";
					if (normalizedId.endsWith("/apps/web/src/ClinicalRulePanel.tsx"))
						return "clinical-rules";
					if (normalizedId.endsWith("/apps/web/src/motionPreference.ts"))
						return "motion-preference";
					if (normalizedId.endsWith("/apps/web/src/rubAmountInput.ts"))
						return "rub-amount-input";
					if (normalizedId.endsWith("/apps/web/src/settingsStaticData.tsx"))
						return "settings-static-data";
					if (normalizedId.endsWith("/apps/web/src/imagingUiLabels.ts"))
						return "imaging-ui-labels";
					// Геометрия КТ-планирования живёт в utils/math/toothGeometry.ts: именно оттуда
					// ctPlanningState.ts берёт buildCtPlanningGeometrySummary. Файл
					// src/ctPlanningGeometry.ts — его мёртвый дубль, на него ссылаются только
					// `import type`, поэтому в рантайм-графе его нет и правило на него не давало
					// ни одного чанка. Правило переведено на живой модуль.
					if (
						normalizedId.endsWith("/apps/web/src/utils/math/toothGeometry.ts") ||
						normalizedId.includes("/apps/web/src/utils/math/toothGeometry/")
					)
						return "ct-planning-geometry";
					if (
						normalizedId.endsWith("/apps/web/src/ctPlanningMeasurementPlan.ts")
					)
						return "ct-planning-measurement-plan";
					if (
						normalizedId.endsWith(
							"/apps/web/src/ctPlanningMeasurementPanel.tsx",
						)
					)
						return "ct-planning-measurement-panel";
					if (normalizedId.endsWith("/apps/web/src/ctPlanningWorkflowPlan.ts"))
						return "ct-planning-workflow-plan";
					if (
						normalizedId.endsWith("/apps/web/src/ctPlanningWorkflowPanel.tsx")
					)
						return "ct-planning-workflow-panel";
					if (normalizedId.endsWith("/apps/web/src/ctPlanningImplantFit.ts"))
						return "ct-planning-implant-fit";
					if (
						normalizedId.endsWith("/apps/web/src/ctPlanningImplantFitPanel.tsx")
					)
						return "ct-planning-implant-fit-panel";
					if (normalizedId.endsWith("/apps/web/src/ctPlanningImplantModel.ts"))
						return "ct-planning-implant-model";
					if (
						normalizedId.endsWith(
							"/apps/web/src/ctPlanningImplantModelPanel.tsx",
						)
					)
						return "ct-planning-implant-model-panel";
					if (
						normalizedId.endsWith("/apps/web/src/ctPlanningReconstruction.ts")
					)
						return "ct-planning-reconstruction";
					if (
						normalizedId.endsWith(
							"/apps/web/src/ctPlanningReconstructionPanel.tsx",
						)
					)
						return "ct-planning-reconstruction-panel";
					if (normalizedId.endsWith("/apps/web/src/ctPlanningValidation.ts"))
						return "ct-planning-validation";
					if (
						normalizedId.endsWith("/apps/web/src/ctPlanningValidationPanel.tsx")
					)
						return "ct-planning-validation-panel";
					if (normalizedId.endsWith("/apps/web/src/ctPlanningExport.ts"))
						return "ct-planning-export";
					if (normalizedId.endsWith("/apps/web/src/ctPlanningViewerRestore.ts"))
						return "ct-planning-viewer-restore";
					if (
						normalizedId.endsWith(
							"/apps/web/src/ctPlanningViewerBridgeLaunch.ts",
						)
					)
						return "ct-planning-viewer-bridge-launch";
					if (
						normalizedId.endsWith(
							"/apps/web/src/ctPlanningViewerBridgeAudit.ts",
						)
					)
						return "ct-planning-viewer-bridge-audit";
					if (
						normalizedId.endsWith(
							"/apps/web/src/ctPlanningViewerBridgeHandoff.ts",
						)
					)
						return "ct-planning-viewer-bridge-handoff";
					if (
						normalizedId.endsWith(
							"/apps/web/src/ctPlanningViewerBridgeAttributes.ts",
						)
					)
						return "ct-planning-viewer-bridge-handoff";
					if (
						normalizedId.endsWith(
							"/apps/web/src/ctPlanningExportScenarioSummary.ts",
						)
					)
						return "ct-planning-export-scenario-summary";
					if (
						normalizedId.endsWith(
							"/apps/web/src/ctPlanningExportScenarioPanel.tsx",
						)
					)
						return "ct-planning-export-scenario-panel";
					if (normalizedId.endsWith("/apps/web/src/ctPlanningExportPanel.tsx"))
						return "ct-planning-export-panel";
					if (
						normalizedId.endsWith("/apps/web/src/ctPlanningArtifactCommands.ts")
					)
						return "ct-planning-artifact-commands";
					if (
						normalizedId.endsWith("/apps/web/src/ctPlanningArtifactPanel.tsx")
					)
						return "ct-planning-artifact-panel";
					if (normalizedId.endsWith("/apps/web/src/ctPlanningCatalog.ts"))
						return "ct-planning-catalog";
					if (normalizedId.endsWith("/apps/web/src/ctPlanningState.ts"))
						return "ct-planning-state";
					if (normalizedId.endsWith("/apps/web/src/ctPlanningTools.tsx"))
						return "ct-planning-tools";
					if (normalizedId.endsWith("/apps/web/src/imagingComparison.ts"))
						return "imaging-comparison";
					if (normalizedId.endsWith("/apps/web/src/mprControlMath.ts"))
						return "mpr-control-math";
					if (normalizedId.endsWith("/apps/web/src/mprClinicalStatus.ts"))
						return "mpr-clinical-status";
					if (normalizedId.endsWith("/apps/web/src/pricelistUiMeta.ts"))
						return "pricelist-ui-meta";
					if (normalizedId.endsWith("/apps/web/src/visitSpecialtyData.ts"))
						return "visit-specialty-data";
					if (normalizedId.endsWith("/apps/web/src/visitDictationData.ts"))
						return "visit-dictation-data";
					if (normalizedId.endsWith("/apps/web/src/postVisitCareData.ts"))
						return "post-visit-care-data";
					if (normalizedId.endsWith("/apps/web/src/communicationTaskData.ts"))
						return "communication-task-data";
					if (normalizedId.endsWith("/apps/web/src/workspaceStaticOptions.ts"))
						return "workspace-static-options";
					if (normalizedId.endsWith("/apps/web/src/workspaceUiLabels.ts"))
						return "workspace-ui-labels";
					if (normalizedId.endsWith("/apps/web/src/store/settingsStore.ts"))
						return "settings-store";
					if (normalizedId.endsWith("/apps/web/src/store/documentStore.ts"))
						return "document-store";
					if (normalizedId.endsWith("/apps/web/src/store/imagingStore.ts"))
						return "imaging-store";
					if (normalizedId.endsWith("/apps/web/src/store/scheduleStore.ts"))
						return "schedule-store";
					if (normalizedId.endsWith("/apps/web/src/store/patientStore.ts"))
						return "patient-store";
					if (normalizedId.endsWith("/apps/web/src/store/visitStore.ts"))
						return "visit-store";
					if (normalizedId.endsWith("/apps/web/src/store/appStore.ts"))
						return "app-store";
					if (
						normalizedId.includes("/node_modules/dicom-parser") ||
						normalizedId.includes("/node_modules/dcmjs") ||
						normalizedId.includes("/node_modules/dicomweb-client")
					)
						return "dicom-parser-vendor";
					if (
						normalizedId.includes("/node_modules/@kitware/vtk.js") ||
						normalizedId.includes("/node_modules/@kitware/")
					)
						return "vtk-vendor";
					if (
						normalizedId.includes("/node_modules/@cornerstonejs/") ||
						normalizedId.includes("/node_modules/cornerstone") ||
						normalizedId.includes("/node_modules/gl-matrix") ||
						normalizedId.includes("/node_modules/hammerjs")
					)
						return "cornerstone-vendor";
					if (
						normalizedId.includes("/node_modules/three/") ||
						normalizedId.includes("/node_modules/three") ||
						normalizedId.includes("/node_modules/@types/three") ||
						normalizedId.includes("/node_modules/three-stdlib") ||
						normalizedId.includes("/node_modules/@react-three/")
					)
						return "three-vendor";
					// react-rnd выносим до react-vendor, иначе includes("/node_modules/react") захватывает его
					if (normalizedId.includes("/node_modules/react-rnd"))
						return "rnd-vendor";
					if (
						normalizedId.includes("/node_modules/react/") ||
						normalizedId.includes("/node_modules/react-dom/") ||
						normalizedId.endsWith("/node_modules/react") ||
						normalizedId.endsWith("/node_modules/react-dom")
					)
						return "react-vendor";
					if (
						normalizedId.includes("/node_modules/lucide-react") ||
						normalizedId.includes("/node_modules/lucide")
					)
						return "lucide-vendor";
					if (normalizedId.includes("/node_modules/framer-motion"))
						return "motion-vendor";
					if (normalizedId.includes("/node_modules/@tanstack/react-query"))
						return "query-vendor";
					if (normalizedId.includes("/node_modules/zod"))
						return "schema-vendor";
					if (
						normalizedId.includes("/node_modules/jspdf") ||
						normalizedId.includes("/node_modules/pdfjs-dist") ||
						normalizedId.includes("/node_modules/html2canvas") ||
						normalizedId.includes("/node_modules/canvas")
					)
						return "pdf-canvas-vendor";
					if (
						normalizedId.includes("/node_modules/date-fns") ||
						normalizedId.includes("/node_modules/dayjs")
					)
						return "date-vendor";
					if (normalizedId.includes("/node_modules/fflate"))
						return "zip-vendor";
					if (normalizedId.includes("/node_modules/zustand"))
						return "store-vendor";
					if (normalizedId.includes("/node_modules/decimal.js"))
						return "math-vendor";
					if (normalizedId.includes("/node_modules/fuse.js"))
						return "search-vendor";
					if (
						normalizedId.includes("/node_modules/recharts") ||
						normalizedId.includes("/node_modules/victory-vendor") ||
						normalizedId.includes("/node_modules/chart.js") ||
						normalizedId.includes("/node_modules/chartjs") ||
						normalizedId.includes("/node_modules/echarts") ||
						normalizedId.includes("/node_modules/apexcharts")
					)
						return "charts-vendor";
					// Изоляция ORM и DB-клиентов при возможном импорте из общих схем
					if (
						normalizedId.includes("/node_modules/drizzle-orm") ||
						normalizedId.includes("/node_modules/@electric-sql/")
					)
						return "db-vendor";
					return undefined;
				},
			},
		},
	},
	server: {
		watch: {
			ignored: [
				"**/node_modules/**",
				"**/.git/**",
				"**/.data/**",
				"**/.local-pg-data/**",
				"**/pglite-data/**",
				"**/temp-test-db/**",
				"**/scratch/**",
				"**/artifacts/**",
				"**/coverage/**",
				"**/dist/**",
				"**/playwright-report/**",
				"**/test-results/**",
				"**/docs/screenshots/**",
				"**/docs/proofs/**",
				"**/docs/**",
				"**/screenshots/**",
				"**/uploads/**",
				"**/.agents/**",
				"**/reference_repos/**",
				"**/РЕВЕРС ИНЖИНИРИНГ*/**",
				"**/*.png",
				"**/*.jpg",
				"**/*.jpeg",
				"**/*.webp",
				"**/*.dicom",
				"**/*.dcm",
				"**/*.onnx",
				"**/*.tsbuildinfo",
				"**/*.mem.json",
			],
		},
		hmr: process.env.VITE_DISABLE_HMR === "true" ? false : { overlay: false },
		...(process.env.VITE_DISABLE_WATCH === "true" ? { watch: null } : {}),
		headers: {
			"Cross-Origin-Opener-Policy": "same-origin",
			"Cross-Origin-Embedder-Policy": "require-corp",
		},
		proxy: {
			// Живые обновления идут через тот же префикс /api, но требуют апгрейда
			// до WebSocket. Без ws: true строковая форма прокси пропускает только
			// обычный HTTP, и рукопожатие с /api/ws/schedule висело до таймаута:
			// компоненты, собирающие адрес от window.location.host (например
			// FamilyWalletPanel), не получали обновлений вообще.
			"/api": {
				target: apiProxyTarget,
				changeOrigin: true,
				ws: process.env.VITE_DISABLE_WS_PROXY !== "true",
				configure: (proxy, _options) => {
					proxy.on("error", (err, _req, res) => {
						try {
							if (res && typeof (res as any).writeHead === "function" && !(res as any).headersSent) {
								(res as any).writeHead(503, { "Content-Type": "application/json" });
								(res as any).end(JSON.stringify({ error: "Backend unavailable", code: (err as any).code }));
							} else if (res && typeof (res as any).destroy === "function") {
								(res as any).destroy();
							}
						} catch {}
					});
					proxy.on("proxyReq", (proxyReq, req) => {
						proxyReq.on("error", () => {});
						if (req && (req as any).socket && typeof (req as any).socket.on === "function") {
							(req as any).socket.on("error", () => {});
						}
					});
					(proxy as any).on("proxySocket", (socket: any) => {
						if (socket && typeof socket.on === "function") {
							socket.on("error", () => {});
						}
					});
					(proxy as any).on("proxyReqWs", (_proxyReq: any, _req: any, socket: any) => {
						if (socket && typeof socket.on === "function") {
							socket.on("error", () => {});
						}
					});
				}
			},
		},
	},
	worker: {
		format: "es",
		rollupOptions: {
			maxParallelFileOps: 1,
		},
	},
});
