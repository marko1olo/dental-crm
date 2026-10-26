/**
 * toolGroups.ts — Настройка групп инструментов Cornerstone (Мандат 8b <= 120 строк).
 */

import * as cornerstoneTools from "@cornerstonejs/tools";
import { VIEWPORT_IDS } from "./presets";

export function setupMprToolGroup(toolGroupId: string, renderingEngineId: string): void {
	let toolGroup = cornerstoneTools.ToolGroupManager.getToolGroup(toolGroupId);
	if (!toolGroup) {
		toolGroup = cornerstoneTools.ToolGroupManager.createToolGroup(toolGroupId)!;
	}

	toolGroup.addTool(cornerstoneTools.CrosshairsTool.toolName);
	toolGroup.setToolConfiguration(cornerstoneTools.CrosshairsTool.toolName, {
		viewportIndicators: false,
		autoPan: { enabled: false },
		mobile: { enabled: true, opacity: 1, handleRadius: 6 },
	});
	toolGroup.setToolActive(cornerstoneTools.CrosshairsTool.toolName, {
		bindings: [{ mouseButton: cornerstoneTools.Enums.MouseBindings.Primary }],
	});
	toolGroup.addTool(cornerstoneTools.WindowLevelTool.toolName);
	toolGroup.setToolActive(cornerstoneTools.WindowLevelTool.toolName, {
		bindings: [{ mouseButton: cornerstoneTools.Enums.MouseBindings.Secondary }],
	});
	toolGroup.addTool(cornerstoneTools.ZoomTool.toolName);
	toolGroup.setToolActive(cornerstoneTools.ZoomTool.toolName, {
		bindings: [{ mouseButton: cornerstoneTools.Enums.MouseBindings.Auxiliary }],
	});
	toolGroup.addTool(cornerstoneTools.PanTool.toolName);
	toolGroup.addTool(cornerstoneTools.LengthTool.toolName);
	toolGroup.addTool(cornerstoneTools.SplineROITool.toolName);
	toolGroup.addTool(cornerstoneTools.EllipticalROITool.toolName);
	toolGroup.addTool(cornerstoneTools.ProbeTool.toolName);

	toolGroup.addViewport(VIEWPORT_IDS.axial, renderingEngineId);
	toolGroup.addViewport(VIEWPORT_IDS.sagittal, renderingEngineId);
	toolGroup.addViewport(VIEWPORT_IDS.coronal, renderingEngineId);
}

export function setupVolume3DToolGroup(toolGroupId: string, renderingEngineId: string): void {
	let toolGroup = cornerstoneTools.ToolGroupManager.getToolGroup(toolGroupId);
	if (!toolGroup) {
		toolGroup = cornerstoneTools.ToolGroupManager.createToolGroup(toolGroupId)!;
	}

	try {
		toolGroup.addTool(cornerstoneTools.TrackballRotateTool.toolName);
		toolGroup.setToolActive(cornerstoneTools.TrackballRotateTool.toolName, {
			bindings: [{ mouseButton: cornerstoneTools.Enums.MouseBindings.Primary }],
		});
	} catch {}

	try {
		toolGroup.addTool(cornerstoneTools.ZoomTool.toolName);
		toolGroup.setToolActive(cornerstoneTools.ZoomTool.toolName, {
			bindings: [{ mouseButton: cornerstoneTools.Enums.MouseBindings.Auxiliary }],
		});
	} catch {}

	try {
		toolGroup.addTool(cornerstoneTools.PanTool.toolName);
		toolGroup.setToolActive(cornerstoneTools.PanTool.toolName, {
			bindings: [{ mouseButton: cornerstoneTools.Enums.MouseBindings.Secondary }],
		});
	} catch {}

	try {
		toolGroup.addViewport(VIEWPORT_IDS.volume3d, renderingEngineId);
	} catch {}
}
