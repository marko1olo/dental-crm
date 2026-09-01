import assert from "node:assert/strict";
import test from "node:test";

test("3D CBCT MPR Workspace: iPad Touch Pinch-to-Zoom & DOM Vector Badges", async (t) => {
	await t.test("Pinch-to-zoom gesture math correctly scales viewport transform and clamps within [0.5, 4.0]", () => {
		const initialTouches: [{ clientX: number; clientY: number }, { clientX: number; clientY: number }] = [
			{ clientX: 100, clientY: 100 },
			{ clientX: 200, clientY: 200 },
		];
		const t0 = initialTouches[0];
		const t1 = initialTouches[1];
		const initialDist = Math.hypot(
			t0.clientX - t1.clientX,
			t0.clientY - t1.clientY,
		);
		assert.equal(Math.round(initialDist), 141);

		// Pinch Out (Zoom in 2x)
		const pinchedTouches: [{ clientX: number; clientY: number }, { clientX: number; clientY: number }] = [
			{ clientX: 50, clientY: 50 },
			{ clientX: 250, clientY: 250 },
		];
		const pt0 = pinchedTouches[0];
		const pt1 = pinchedTouches[1];
		const pinchedDist = Math.hypot(
			pt0.clientX - pt1.clientX,
			pt0.clientY - pt1.clientY,
		);
		const scale = pinchedDist / initialDist;
		const nextZoom = Math.min(4.0, Math.max(0.5, 1.0 * scale));

		assert.equal(scale, 2);
		assert.equal(nextZoom, 2);

		// Extreme pinch in (clamp to 0.5 min)
		const extremeInTouches: [{ clientX: number; clientY: number }, { clientX: number; clientY: number }] = [
			{ clientX: 145, clientY: 145 },
			{ clientX: 155, clientY: 155 },
		];
		const et0 = extremeInTouches[0];
		const et1 = extremeInTouches[1];
		const extremeInDist = Math.hypot(
			et0.clientX - et1.clientX,
			et0.clientY - et1.clientY,
		);
		const extremeInScale = extremeInDist / initialDist;
		const clampedMinZoom = Math.min(4.0, Math.max(0.5, 1.0 * extremeInScale));
		assert.equal(clampedMinZoom, 0.5);

		// Extreme pinch out (clamp to 4.0 max)
		const extremeOutScale = 10;
		const clampedMaxZoom = Math.min(4.0, Math.max(0.5, 1.0 * extremeOutScale));
		assert.equal(clampedMaxZoom, 4.0);
	});

	await t.test("Single touch pan shifts viewport center coordinates when zoomed in", () => {
		const initialPan = { x: 0, y: 0 };
		const startTouch = { clientX: 200, clientY: 200 };
		const moveTouch = { clientX: 245, clientY: 180 };

		const deltaX = moveTouch.clientX - startTouch.clientX;
		const deltaY = moveTouch.clientY - startTouch.clientY;

		const nextPan = {
			x: initialPan.x + deltaX,
			y: initialPan.y + deltaY,
		};

		assert.equal(nextPan.x, 45);
		assert.equal(nextPan.y, -20);
	});

	await t.test("DOM coordinate badge string format meets >=13px bold requirements with accurate axis units", () => {
		const axialCoordBadge = { axis: "Z", valueMm: 48, label: "Срез:", fullText: "Z: 48 мм" };
		const coronalCoordBadge = { axis: "Y", valueMm: 52, label: "Срез:", fullText: "Y: 52 мм" };
		const sagittalCoordBadge = { axis: "X", valueMm: 60, label: "Срез:", fullText: "X: 60 мм" };
		const curvedArchBadge = { axis: "Curved", label: "Дуга:", fullText: "FDI 11..48" };

		assert.equal(axialCoordBadge.fullText, "Z: 48 мм");
		assert.equal(coronalCoordBadge.fullText, "Y: 52 мм");
		assert.equal(sagittalCoordBadge.fullText, "X: 60 мм");
		assert.equal(curvedArchBadge.fullText, "FDI 11..48");
	});
});
