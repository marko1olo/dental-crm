import * as cornerstoneTools from "@cornerstonejs/tools";

// Initialize cornerstone tools and tool groups
export async function initCornerstoneTools() {
	await cornerstoneTools.init();

	// Add MPR tools
	cornerstoneTools.addTool(cornerstoneTools.CrosshairsTool);
	cornerstoneTools.addTool(cornerstoneTools.PanTool);
	cornerstoneTools.addTool(cornerstoneTools.WindowLevelTool);
	cornerstoneTools.addTool(cornerstoneTools.ZoomTool);

	// Add measurement and analysis tools
	cornerstoneTools.addTool(cornerstoneTools.SplineROITool);
	cornerstoneTools.addTool(cornerstoneTools.EllipticalROITool);
	cornerstoneTools.addTool(cornerstoneTools.RectangleROITool);
	cornerstoneTools.addTool(cornerstoneTools.ProbeTool);
	cornerstoneTools.addTool(cornerstoneTools.LengthTool);
	cornerstoneTools.addTool(cornerstoneTools.AngleTool);

	// Add scrolling

	// Add VR tools
	cornerstoneTools.addTool(cornerstoneTools.TrackballRotateTool);
}

export function setupMprToolGroup(
	renderingEngineId: string,
	viewportIds: string[],
) {
	const toolGroupId = "mpr-tool-group";

	// Destroy existing to prevent duplicates
	cornerstoneTools.ToolGroupManager.destroyToolGroup(toolGroupId);

	const toolGroup =
		cornerstoneTools.ToolGroupManager.createToolGroup(toolGroupId)!;

	// Add tools to the group
	toolGroup.addTool(cornerstoneTools.CrosshairsTool.toolName);
	toolGroup.addTool(cornerstoneTools.PanTool.toolName);
	toolGroup.addTool(cornerstoneTools.WindowLevelTool.toolName);
	toolGroup.addTool(cornerstoneTools.ZoomTool.toolName);
	toolGroup.addTool(cornerstoneTools.SplineROITool.toolName);
	toolGroup.addTool(cornerstoneTools.EllipticalROITool.toolName);
	toolGroup.addTool(cornerstoneTools.RectangleROITool.toolName);
	toolGroup.addTool(cornerstoneTools.ProbeTool.toolName);
	toolGroup.addTool(cornerstoneTools.LengthTool.toolName);
	toolGroup.addTool(cornerstoneTools.AngleTool.toolName);

	// Crosshairs configuration
	toolGroup.setToolConfiguration(cornerstoneTools.CrosshairsTool.toolName, {
		viewportIndicators: false,
		autoPan: { enabled: false },
		mobile: { enabled: true, opacity: 1, handleRadius: 6 },
	});

	// Default active tools
	toolGroup.setToolActive(cornerstoneTools.CrosshairsTool.toolName, {
		bindings: [{ mouseButton: cornerstoneTools.Enums.MouseBindings.Primary }],
	});
	toolGroup.setToolActive(cornerstoneTools.PanTool.toolName, {
		bindings: [{ mouseButton: cornerstoneTools.Enums.MouseBindings.Auxiliary }], // Middle
	});
	toolGroup.setToolActive(cornerstoneTools.WindowLevelTool.toolName, {
		bindings: [{ mouseButton: cornerstoneTools.Enums.MouseBindings.Secondary }], // Right
	});
	toolGroup.setToolActive(cornerstoneTools.ZoomTool.toolName, {
		bindings: [
			{
				mouseButton: cornerstoneTools.Enums.MouseBindings.Primary,
				modifierKey: cornerstoneTools.Enums.KeyboardBindings.Shift,
			},
		],
	});

	// Add viewports to toolgroup
	viewportIds.forEach((id) => {
		toolGroup.addViewport(id, renderingEngineId);
	});

	// Setup synchronizer for Crosshairs
	/*
  const syncId = "crosshairs-synchronizer";
  let crosshairsSynchronizer = (cornerstoneTools.synchronizers as any).getSynchronizer(syncId);
  if (crosshairsSynchronizer) {
    (cornerstoneTools.synchronizers as any).destroySynchronizer(syncId);
  }
  crosshairsSynchronizer = (cornerstoneTools.synchronizers as any).createCrosshairsSynchronizer(syncId);
  
  viewportIds.forEach((id) => {
    crosshairsSynchronizer.add({ renderingEngineId, viewportId: id });
  });
  */

	return toolGroup;
}

export function setupVrToolGroup(
	renderingEngineId: string,
	vrViewportId: string,
) {
	const vrToolGroupId = "vr-tool-group";
	cornerstoneTools.ToolGroupManager.destroyToolGroup(vrToolGroupId);
	const vrToolGroup =
		cornerstoneTools.ToolGroupManager.createToolGroup(vrToolGroupId)!;

	vrToolGroup.addTool(cornerstoneTools.TrackballRotateTool.toolName);
	vrToolGroup.addTool(cornerstoneTools.ZoomTool.toolName);
	vrToolGroup.addTool(cornerstoneTools.PanTool.toolName);

	vrToolGroup.setToolActive(cornerstoneTools.TrackballRotateTool.toolName, {
		bindings: [{ mouseButton: cornerstoneTools.Enums.MouseBindings.Primary }],
	});
	vrToolGroup.setToolActive(cornerstoneTools.PanTool.toolName, {
		bindings: [{ mouseButton: cornerstoneTools.Enums.MouseBindings.Auxiliary }],
	});
	vrToolGroup.setToolActive(cornerstoneTools.ZoomTool.toolName, {
		bindings: [
			{
				mouseButton: cornerstoneTools.Enums.MouseBindings.Primary,
				modifierKey: cornerstoneTools.Enums.KeyboardBindings.Shift,
			},
		],
	});

	vrToolGroup.addViewport(vrViewportId, renderingEngineId);

	return vrToolGroup;
}
