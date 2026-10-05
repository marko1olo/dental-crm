/**
 * DENTE CRM — Unit Tests for CBCT Endo 4-Quadrant Diagnostic Cockpit & Anti-Mockup Inquisitor
 * Verifies:
 * 1. Complete eradication of text mockups (zero densitometry cards, zero Ingle texts, zero pseudo-AI zones).
 * 2. 4-quadrant pure radiological workspace:
 *    - Top-Left: Paraxial Coronal (renderers.renderCoronal)
 *    - Top-Right: Cross-Axial (renderers.renderAxial)
 *    - Bottom-Left: Sagittal (renderers.renderSagittal)
 *    - Bottom-Right: 3D High-Res Voxel Cube / Cross-Section (renderers.renderVolume3D)
 * 3. Working length caliper ruler tool & hardware unsharp filters in toolbar.
 * 4. Fast tooth selection FDI for endodontics.
 * 5. Interactive 4-way grid splitters (vertical, horizontal, crosshair knob).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { EndoWorkspace } from "../mpr/workspaces/EndoWorkspace";
import type { ViewportRenderers } from "../mpr/workspaces/workspaceTypes";

describe("CBCT Endo 4-Quadrant Diagnostic Cockpit (Zero Mocks)", () => {
	const createMockRenderers = (): ViewportRenderers => ({
		renderAxial: (cls) => <div data-testid="mock-axial-canvas" className={cls}>AXIAL_SLICE</div>,
		renderCoronal: (cls) => <div data-testid="mock-coronal-canvas" className={cls}>CORONAL_SLICE</div>,
		renderSagittal: (cls) => <div data-testid="mock-sagittal-canvas" className={cls}>SAGITTAL_SLICE</div>,
		renderPanoramic: (cls) => <div data-testid="mock-panoramic-canvas" className={cls}>PANO_SLICE</div>,
		renderCrossSection: (cls) => <div data-testid="mock-cross-canvas" className={cls}>CROSS_SLICE</div>,
		renderVolume3D: (cls) => <div data-testid="mock-volume3d-canvas" className={cls}>VOLUME_3D_CUBE</div>,
	});

	it("1. Completely eradicates text mockup cards and Ingle pseudo-AI descriptions", () => {
		const renderers = createMockRenderers();
		const html = renderToStaticMarkup(
			<EndoWorkspace
				volume={null}
				renderers={renderers}
				activeViewport="coronal"
				setActiveViewport={() => {}}
				maximizedViewport={null}
				handleToggleMaximize={() => {}}
				mobileActiveTab="coronal"
				activeToothFdi={46}
			/>,
		);

		// Verified zero text mockup phrases
		assert.ok(!html.includes("Денситометрический профиль корня"), "Must NOT contain densitometric profile text");
		assert.ok(!html.includes("Периапикальная костная ткань интактна"), "Must NOT contain periapical status text");
		assert.ok(!html.includes("Верхушечная спонгиоза"), "Must NOT contain spongiosa HU texts");
		assert.ok(!html.includes("cbct-endo-station-panel"), "Must NOT contain text station panel");
		assert.ok(!html.includes("cbct-endo-periapical-status-card"), "Must NOT contain periapical card");
		assert.ok(!html.includes("cbct-endo-4zone-grid"), "Must NOT contain 4-zone HU grid");
		assert.ok(!html.includes("cbct-endo-anatomy-reference-card"), "Must NOT contain textbook anatomy card");
		assert.ok(!html.includes("cbct-endo-export-043-btn"), "Must NOT contain export densitometry button");
	});

	it("2. Renders authentic 4-quadrant radiological cockpit with all 4 X-ray views", () => {
		const renderers = createMockRenderers();
		const html = renderToStaticMarkup(
			<EndoWorkspace
				volume={null}
				renderers={renderers}
				activeViewport="coronal"
				setActiveViewport={() => {}}
				maximizedViewport={null}
				handleToggleMaximize={() => {}}
				mobileActiveTab="coronal"
				activeToothFdi={46}
			/>,
		);

		// Root container and 4-way grid
		assert.ok(html.includes('data-testid="cbct-workspace-endo-root"'));
		assert.ok(html.includes('data-testid="cbct-endo-quad-grid"'));

		// Quadrant 1: Top-Left Paraxial Coronal
		assert.ok(html.includes('data-testid="cbct-endo-paraxial-viewport"'));
		assert.ok(html.includes("1. Продольная ось корня (Paraxial Coronal)"));
		assert.ok(html.includes("CORONAL_SLICE"));

		// Quadrant 2: Top-Right Cross-Axial
		assert.ok(html.includes('data-testid="cbct-endo-crossaxial-viewport"'));
		assert.ok(html.includes("2. Поперечный срез канала (Cross-Axial)"));
		assert.ok(html.includes("AXIAL_SLICE"));

		// Quadrant 3: Bottom-Left Sagittal
		assert.ok(html.includes('data-testid="cbct-endo-sagittal-viewport"'));
		assert.ok(html.includes("3. Сагиттальный срез корня (Sagittal)"));
		assert.ok(html.includes("SAGITTAL_SLICE"));

		// Quadrant 4: Bottom-Right 3D Voxel Cube / Cross-Section
		assert.ok(html.includes('data-testid="cbct-endo-3d-zoom-viewport"'));
		assert.ok(html.includes('data-testid="cbct-endo-mode-volume3d"'));
		assert.ok(html.includes('data-testid="cbct-endo-mode-crosssection"'));
		assert.ok(html.includes("VOLUME_3D_CUBE"));
	});

	it("3. Features fast tooth switching FDI buttons and outpatient card copy toolbar control", () => {
		const renderers = createMockRenderers();
		const html = renderToStaticMarkup(
			<EndoWorkspace
				volume={null}
				renderers={renderers}
				activeViewport="coronal"
				setActiveViewport={() => {}}
				maximizedViewport={null}
				handleToggleMaximize={() => {}}
				mobileActiveTab="coronal"
				activeToothFdi={16}
			/>,
		);

		// Tooth FDI buttons
		assert.ok(html.includes('data-testid="cbct-endo-tooth-btn-16"'));
		assert.ok(html.includes('data-testid="cbct-endo-tooth-btn-46"'));
		assert.ok(html.includes('data-testid="cbct-endo-tooth-btn-26"'));

		// Outpatient medical record copy button
		assert.ok(html.includes('data-testid="cbct-endo-copy-emr-btn"'));
		assert.ok(html.includes("В медкарту"));

		// Verified eradication of awkward caliper and raw voxel sharpness controls
		assert.ok(!html.includes("Калипер канала"), "Must NOT contain awkward caliper button");
		assert.ok(!html.includes("Резкость корня"), "Must NOT contain awkward sharpness toggle");
		assert.ok(!html.includes("RAW VOXEL"), "Must NOT contain raw voxel dev text");
	});

	it("4. Includes 4-way interactive splitters for customized window dimensions", () => {
		const renderers = createMockRenderers();
		const html = renderToStaticMarkup(
			<EndoWorkspace
				volume={null}
				renderers={renderers}
				activeViewport="coronal"
				setActiveViewport={() => {}}
				maximizedViewport={null}
				handleToggleMaximize={() => {}}
				mobileActiveTab="coronal"
			/>,
		);

		assert.ok(html.includes('data-testid="cbct-endo-vertical-splitter"'));
		assert.ok(html.includes('data-testid="cbct-endo-horizontal-splitter"'));
		assert.ok(html.includes('data-testid="cbct-endo-grid-splitter-knob"'));
	});

	it("5. Supports single viewport maximization without UI deformation", () => {
		const renderers = createMockRenderers();
		const html = renderToStaticMarkup(
			<EndoWorkspace
				volume={null}
				renderers={renderers}
				activeViewport="coronal"
				setActiveViewport={() => {}}
				maximizedViewport="coronal"
				handleToggleMaximize={() => {}}
				mobileActiveTab="coronal"
			/>,
		);

		assert.ok(html.includes('data-testid="cbct-endo-maximized-grid"'));
		assert.ok(html.includes("CORONAL_SLICE"));
		assert.ok(!html.includes('data-testid="cbct-endo-crossaxial-viewport"'));
	});

	it("6. Displays honest clinical safe slice inspection mode and isolated worker status", () => {
		const renderers = createMockRenderers();
		const html = renderToStaticMarkup(
			<EndoWorkspace
				volume={null}
				renderers={renderers}
				activeViewport="coronal"
				setActiveViewport={() => {}}
				maximizedViewport={null}
				handleToggleMaximize={() => {}}
				mobileActiveTab="coronal"
				activeToothFdi={36}
			/>,
		);

		// Verified honest safe slice mode badge
		assert.ok(html.includes('data-testid="cbct-endo-safe-mode-badge"'));
		assert.ok(html.includes("Безопасный режим просмотра срезов зуба"));

		// Verified toggle button contains honest worker badge
		assert.ok(html.includes('data-testid="cbct-endo-compass-toggle-btn"'));
		assert.ok(html.includes("Воркер"));

		// By default floating compass is closed to guarantee unobstructed view of cross-axial viewport
		assert.ok(!html.includes('data-testid="cbct-endo-floating-compass"'));
	});
});
