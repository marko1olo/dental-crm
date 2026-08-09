import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

declare const process: { env: Record<string, string | undefined> };

const apiProxyTarget =
	process.env.DENTAL_API_PROXY_TARGET ?? "http://127.0.0.1:4100";

// __dirname equivalent for ESM configs
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Always point to root node_modules to prevent React duplication
const rootNodeModules = path.resolve(__dirname, "../../node_modules");

import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
	plugins: [
		react(),
		tailwindcss(),
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
		alias: {
			react: path.join(rootNodeModules, "react"),
			"react-dom": path.join(rootNodeModules, "react-dom"),
			"react/jsx-runtime": path.join(rootNodeModules, "react/jsx-runtime"),
			"react/jsx-dev-runtime": path.join(
				rootNodeModules,
				"react/jsx-dev-runtime",
			),
		},
	},
	optimizeDeps: {
		include: ["react", "react-dom"],
	},
	build: {
		rollupOptions: {
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
					if (normalizedId.endsWith("/apps/web/src/workspacePreload.ts"))
						return "workspace-preload";
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
						normalizedId.endsWith("/apps/web/src/utils/math/toothGeometry.ts")
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
					if (normalizedId.endsWith("/apps/web/src/store/uiStore.ts"))
						return "ui-store";
					// Rollup's functional manualChunks добавляет в ручной чанк не только сам модуль,
					// но и ВСЕ его ещё не занятые зависимости. Из-за этого правило
					// components/settings/ ниже засасывало общие модули, которые к настройкам
					// отношения не имеют, и точка входа получала статическое ребро на
					// settings-components (через lib/publicPortalRoute.ts, который импортирует
					// main.tsx). Каждый общий модуль ниже занят явно, чтобы правила-каталоги
					// не могли его поглотить.
					if (normalizedId.endsWith("/apps/web/src/components/EmptyState.tsx"))
						return "empty-state";
					if (normalizedId.endsWith("/apps/web/src/lib/publicPortalRoute.ts"))
						return "public-portal-route";
					if (normalizedId.endsWith("/apps/web/src/SmartParsePreview.tsx"))
						return "smart-parse-preview";
					if (normalizedId.endsWith("/apps/web/src/PriceDictationBar.tsx"))
						return "price-dictation-bar";
					if (normalizedId.endsWith("/apps/web/src/lib/authedApiFile.ts"))
						return "authed-api-file";
					if (
						normalizedId.endsWith("/apps/web/src/components/PatientPortal.tsx")
					)
						return "patient-portal";
					if (
						normalizedId.endsWith(
							"/apps/web/src/components/workspace/WorkspaceFeaturesSelector.tsx",
						)
					)
						return "features-selector";
					if (normalizedId.includes("/apps/web/src/components/settings/"))
						return "settings-components";
					if (normalizedId.includes("/apps/web/src/components/dicom/"))
						return "dicom-components";
					if (normalizedId.includes("/apps/web/src/components/imaging/"))
						return "imaging-components";
					if (
						normalizedId.includes(
							"/apps/web/src/components/SmartMicrophoneButton",
						)
					)
						return "SmartMicrophoneButton";
					if (normalizedId.includes("/apps/web/src/components/GlobalToast"))
						return "global-toast";
					if (normalizedId.includes("/apps/web/src/components/Omnibar"))
						return "omnibar";
					if (normalizedId.includes("/apps/web/src/components/Odontogram"))
						return "odontogram";
					if (
						normalizedId.includes("/apps/web/src/components/VoiceAssistantUI")
					)
						return "voice-assistant-ui";
					if (normalizedId.endsWith("/apps/web/src/DictationHints.tsx"))
						return "dictation-hints";
					if (normalizedId.endsWith("/apps/web/src/AppHelpers.tsx"))
						return "app-helpers";
					if (normalizedId.endsWith("/apps/web/src/documentLogic.ts"))
						return "document-logic";
					if (normalizedId.endsWith("/apps/web/src/documentValidators.ts"))
						return "document-validators";
					if (normalizedId.endsWith("/apps/web/src/useAppLogic.tsx"))
						return "app-logic";
					// Те же грабли, что и выше, но для правила App.tsx -> workspace: оба модуля
					// общие (PanelLoadFailure рендерят 19 панелей, useWebsocket зовут 5 мест),
					// и без явного захвата они уезжали внутрь workspace, из-за чего ленивые
					// маршруты получали статическое ребро на самый тяжёлый чанк.
					if (
						normalizedId.endsWith(
							"/apps/web/src/components/PanelLoadFailure.tsx",
						)
					)
						return "panel-load-failure";
					if (normalizedId.endsWith("/apps/web/src/hooks/useWebsocket.ts"))
						return "use-websocket";
					if (normalizedId.endsWith("/apps/web/src/App.tsx"))
						return "workspace";
					// d3 объявляют сразу двое: recharts (через victory-vendor) в аналитике и
					// @kitware/vtk.js в просмотрщике DICOM. Кто первым занял модуль, тот его и
					// унёс — все 80 модулей d3 оказались внутри dicom-components (4 268 136 Б),
					// и «Аналитика» получила статическое ребро на весь просмотрщик ради шкал.
					if (normalizedId.includes("/node_modules/d3-")) return "d3-vendor";
					if (
						normalizedId.includes("/node_modules/react") ||
						normalizedId.includes("/node_modules/react-dom")
					)
						return "react-vendor";
					if (normalizedId.includes("/node_modules/lucide-react"))
						return "icons";
					if (normalizedId.includes("/node_modules/zod"))
						return "schema-vendor";
					if (
						normalizedId.includes("/packages/shared") ||
						normalizedId.includes("/node_modules/@dental/shared/")
					)
						return "dental-shared";
					return undefined;
				},
			},
		},
	},
	server: {
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
				ws: true,
				configure: (proxy, _options) => {
					proxy.on("error", (err, _req, _res) => {
						// Ignored to prevent dev server crash during E2E testing
					});
				}
			},
		},
	},
	worker: {
		format: "es",
	},
});
