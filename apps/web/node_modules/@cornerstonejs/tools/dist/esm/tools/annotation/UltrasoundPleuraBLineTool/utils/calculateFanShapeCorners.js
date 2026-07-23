export function pickPoints(hull, slack = 7) {
    if (!hull.length) {
        throw new Error('Convex hull is empty');
    }
    const n = hull.length;
    const next = (i) => (i + 1) % n;
    const walk = (from, to) => {
        const idx = [];
        for (let i = from;; i = next(i)) {
            idx.push(i);
            if (i === to) {
                break;
            }
        }
        return idx;
    };
    let i2 = 0, i3 = 0;
    for (let i = 1; i < n; i++) {
        if (hull[i][0] < hull[i2][0]) {
            i2 = i;
        }
        if (hull[i][0] > hull[i3][0]) {
            i3 = i;
        }
    }
    const P2 = hull[i2];
    const P3 = hull[i3];
    const pathA = walk(i2, i3);
    const pathB = walk(i3, i2);
    const globalYmin = Math.min(...hull.map((p) => p[1]));
    const upperPath = pathA.some((i) => hull[i][1] === globalYmin)
        ? pathA
        : pathB;
    const topY = Math.min(...upperPath.map((i) => hull[i][1]));
    let arcPts = upperPath
        .map((i) => hull[i])
        .filter((p) => Math.abs(p[1] - topY) <= slack);
    if (arcPts.length < 2) {
        arcPts = upperPath
            .map((i) => hull[i])
            .sort((a, b) => a[1] - b[1])
            .slice(0, 2);
    }
    const P1 = arcPts.reduce((best, p) => (p[0] < best[0] ? p : best), arcPts[0]);
    const P4 = arcPts.reduce((best, p) => (p[0] > best[0] ? p : best), arcPts[0]);
    return { P1, P2, P3, P4 };
}
export function computeEdgeBuffer(buffer, width, height) {
    const total = width * height;
    const channels = buffer.length / total;
    if (![1, 3, 4].includes(channels)) {
        throw new Error('Buffer must be 1,3 or 4 channels per pixel');
    }
    const gray = new Float32Array(total);
    for (let i = 0; i < total; i++) {
        if (channels === 1) {
            gray[i] = buffer[i];
        }
        else {
            const base = i * channels;
            const r = buffer[base];
            const g = buffer[base + 1];
            const b = buffer[base + 2];
            gray[i] = 0.299 * r + 0.587 * g + 0.114 * b;
        }
    }
    const edgeBuf = new Float32Array(total);
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const idx = y * width + x;
            const i00 = idx - width - 1;
            const i01 = idx - width;
            const i02 = idx - width + 1;
            const i10 = idx - 1;
            const i11 = idx;
            const i12 = idx + 1;
            const i20 = idx + width - 1;
            const i21 = idx + width;
            const i22 = idx + width + 1;
            const gx = -gray[i00] +
                gray[i02] +
                -2 * gray[i10] +
                2 * gray[i12] +
                -gray[i20] +
                gray[i22];
            const gy = gray[i00] +
                2 * gray[i01] +
                gray[i02] -
                gray[i20] -
                2 * gray[i21] -
                gray[i22];
            edgeBuf[idx] = Math.hypot(gx, gy);
        }
    }
    return edgeBuf;
}
export function refineCornersDirectional(edgeBuf, width, height, rough, contour, opts = {}) {
    const { maxDist = 15, slack = 2 } = opts;
    const directions = {
        P1: { dx: -1, dy: -1 },
        P2: { dx: -1, dy: +1 },
        P3: { dx: +1, dy: +1 },
        P4: { dx: +1, dy: -1 },
    };
    function snapQuadrant(pt, { dx, dy }, threshold = 5) {
        const xmin = dx < 0 ? pt[0] - maxDist : pt[0] - slack;
        const xmax = dx < 0 ? pt[0] + slack : pt[0] + maxDist;
        const ymin = dy < 0 ? pt[1] - maxDist : pt[1] - slack;
        const ymax = dy < 0 ? pt[1] + slack : pt[1] + maxDist;
        let best = pt;
        for (const [cx, cy] of contour) {
            if (cx < xmin || cx > xmax || cy < ymin || cy > ymax) {
                continue;
            }
            const xi = Math.round(cx);
            const yi = Math.round(cy);
            if (xi < 0 || xi >= width || yi < 0 || yi >= height) {
                continue;
            }
            const xAlign = (xi - best[0]) * dx;
            const yAlign = (yi - best[0]) * dy;
            const v = edgeBuf[yi * width + xi];
            if (v > threshold && (xAlign > 0 || yAlign > 0)) {
                best = [cx, cy];
            }
        }
        return best;
    }
    return {
        P1: snapQuadrant(rough.P1, directions.P1),
        P2: snapQuadrant(rough.P2, directions.P2),
        P3: snapQuadrant(rough.P3, directions.P3),
        P4: snapQuadrant(rough.P4, directions.P4),
    };
}
export function calculateFanShapeCorners(imageBuffer, width, height, hull, roughContour) {
    const rough = pickPoints(hull);
    const refined = refineCornersDirectional(imageBuffer, width, height, rough, roughContour, {
        maxDist: 20,
        step: 0.5,
    });
    return refined;
}
