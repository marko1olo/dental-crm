/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL DENTAL DICOM / RVG IMAGING ENGINE
 * Math, Touch Gestures, Calibrated Subpixel Measurements & WebGL Lifecycles
 * ═══════════════════════════════════════════════════════════════════════════
 */
export const DEFAULT_DICOM_VIEWPORT_STATE = {
    zoom: 1.0,
    panX: 0,
    panY: 0,
    windowWidth: 2000,
    windowCenter: 500,
    invert: false,
    sharpen: 0,
    emboss: false,
    gamma: 1.0,
    activeTool: "pan",
    calibrationMmPerPixel: 0.0264, // ~96 DPI standard default (~0.0264 mm/px)
};
/** ─── 1. ТАЧ-ЖЕСТЫ ДЛЯ ПЛАНШЕТОВ (Pinch-to-zoom, 1-finger Pan, 2-finger Window/Level) ─── */
export function calculatePinchDistance(p1, p2) {
    const dx = p1.clientX - p2.clientX;
    const dy = p1.clientY - p2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
}
export function calculatePinchCenter(p1, p2) {
    return {
        x: (p1.clientX + p2.clientX) / 2,
        y: (p1.clientY + p2.clientY) / 2,
    };
}
export function calculatePinchZoom(initialDistance, currentDistance, initialZoom, minZoom = 0.25, maxZoom = 16.0) {
    if (initialDistance <= 0 || !Number.isFinite(currentDistance) || currentDistance <= 0) {
        return initialZoom;
    }
    const scaleFactor = currentDistance / initialDistance;
    const calculated = initialZoom * scaleFactor;
    return Number(Math.max(minZoom, Math.min(maxZoom, calculated)).toFixed(4));
}
export function calculate1FingerPan(startPos, currentPos, initialPan) {
    return {
        x: Number((initialPan.x + (currentPos.x - startPos.x)).toFixed(2)),
        y: Number((initialPan.y + (currentPos.y - startPos.y)).toFixed(2)),
    };
}
export function calculate2FingerWindowLevel(deltaX, deltaY, initialWw, initialWl, sensitivity = 2.0) {
    const newWw = Math.max(1, Math.round(initialWw + deltaX * sensitivity));
    const newWl = Math.round(initialWl - deltaY * sensitivity);
    return {
        windowWidth: newWw,
        windowCenter: newWl,
    };
}
export function calibrateMmPerPixel(p1, p2, knownPhysicalMm) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const pixelDistance = Math.sqrt(dx * dx + dy * dy);
    if (pixelDistance <= 0 || knownPhysicalMm <= 0) {
        return 0.0264; // safe fallback
    }
    return Number((knownPhysicalMm / pixelDistance).toFixed(6));
}
export function measureDistanceMm(p1, p2, mmPerPixel) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const distancePx = Math.sqrt(dx * dx + dy * dy);
    const distanceMm = distancePx * mmPerPixel;
    return {
        distancePx: Number(distancePx.toFixed(3)),
        distanceMm: Number(distanceMm.toFixed(2)),
    };
}
export function measureRootCanalWorkingLength(points, mmPerPixel) {
    if (points.length < 2) {
        return { totalLengthPx: 0, totalLengthMm: 0, segments: [] };
    }
    let totalPx = 0;
    const segments = [];
    for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const segDistPx = Math.sqrt(dx * dx + dy * dy);
        totalPx += segDistPx;
        segments.push(Number((segDistPx * mmPerPixel).toFixed(2)));
    }
    return {
        totalLengthPx: Number(totalPx.toFixed(3)),
        totalLengthMm: Number((totalPx * mmPerPixel).toFixed(2)),
        segments,
    };
}
export function measureBoneHeightAndWidth(crestPoint, basePoint, buccalPoint, lingualPoint, mmPerPixel) {
    const height = measureDistanceMm(crestPoint, basePoint, mmPerPixel).distanceMm;
    const width = measureDistanceMm(buccalPoint, lingualPoint, mmPerPixel).distanceMm;
    // Standard implant candidate check: height >= 8.0 mm, width >= 5.5 mm
    const isImplantCandidate = height >= 8.0 && width >= 5.5;
    return {
        heightMm: height,
        widthMm: width,
        isImplantCandidate,
    };
}
/** ─── 3. ФИЛЬТРЫ: ИНВЕРСИЯ (НЕГАТИВ), РЕЗКОСТЬ (SHARPEN) И РЕЛЬЕФ (EMBOSS) ─── */
export const SHARPEN_KERNEL_3X3 = [
    [0, -1, 0],
    [-1, 5, -1],
    [0, -1, 0],
];
export const EMBOSS_SHADOW_KERNEL_3X3 = [
    [-2, -1, 0],
    [-1, 1, 1],
    [0, 1, 2],
];
export function buildDicomTonalLUT(options) {
    const lut = new Uint8Array(256);
    const ww = Math.max(1, options.windowWidth);
    const wl = options.windowCenter;
    const invert = Boolean(options.invert);
    const gamma = Math.max(0.1, Math.min(4.0, options.gamma || 1.0));
    const invGamma = 1.0 / gamma;
    const minVal = wl - ww / 2;
    const maxVal = wl + ww / 2;
    for (let i = 0; i < 256; i++) {
        let normalized;
        if (i <= minVal) {
            normalized = 0;
        }
        else if (i >= maxVal) {
            normalized = 255;
        }
        else {
            normalized = Math.max(0, Math.min(255, ((i - minVal) / (maxVal - minVal)) * 255));
        }
        // Ensure full 0..255 clamp at limits
        if (i === 0 && minVal <= 0)
            normalized = 0;
        if (i === 255 && maxVal >= 255)
            normalized = 255;
        // Gamma correction
        let val = 255 * (normalized / 255) ** invGamma;
        let clamped = Math.round(Math.max(0, Math.min(255, val)));
        if (invert) {
            clamped = 255 - clamped;
        }
        lut[i] = clamped;
    }
    return lut;
}
export function apply2DConvolutionFilter(srcPixels, width, height, kernel, offset = 0) {
    const dest = new Uint8ClampedArray(srcPixels.length);
    const kRows = kernel.length;
    const kCols = kernel[0].length;
    const rHalf = Math.floor(kRows / 2);
    const cHalf = Math.floor(kCols / 2);
    let kSum = 0;
    for (let r = 0; r < kRows; r++) {
        for (let c = 0; c < kCols; c++) {
            kSum += kernel[r][c];
        }
    }
    const divisor = kSum > 0 ? kSum : 1.0;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let sumR = 0;
            let sumG = 0;
            let sumB = 0;
            for (let kr = 0; kr < kRows; kr++) {
                for (let kc = 0; kc < kCols; kc++) {
                    const sx = Math.min(width - 1, Math.max(0, x + kc - cHalf));
                    const sy = Math.min(height - 1, Math.max(0, y + kr - rHalf));
                    const sIdx = (sy * width + sx) * 4;
                    const weight = kernel[kr][kc];
                    sumR += srcPixels[sIdx] * weight;
                    sumG += srcPixels[sIdx + 1] * weight;
                    sumB += srcPixels[sIdx + 2] * weight;
                }
            }
            const dIdx = (y * width + x) * 4;
            dest[dIdx] = Math.max(0, Math.min(255, Math.round(sumR / divisor + offset)));
            dest[dIdx + 1] = Math.max(0, Math.min(255, Math.round(sumG / divisor + offset)));
            dest[dIdx + 2] = Math.max(0, Math.min(255, Math.round(sumB / divisor + offset)));
            dest[dIdx + 3] = srcPixels[dIdx + 3]; // preserve alpha
        }
    }
    return dest;
}
export function disposeWebGlRenderingContext(gl, resources) {
    let texturesDisposed = 0;
    let buffersDisposed = 0;
    let programsDisposed = 0;
    let contextLostTriggered = false;
    if (!gl) {
        return { texturesDisposed: 0, buffersDisposed: 0, programsDisposed: 0, contextLostTriggered: false };
    }
    if (resources?.textures) {
        for (const tex of resources.textures) {
            if (tex && typeof gl.deleteTexture === "function") {
                gl.deleteTexture(tex);
                texturesDisposed++;
            }
        }
    }
    if (resources?.buffers) {
        for (const buf of resources.buffers) {
            if (buf && typeof gl.deleteBuffer === "function") {
                gl.deleteBuffer(buf);
                buffersDisposed++;
            }
        }
    }
    if (resources?.programs) {
        for (const prog of resources.programs) {
            if (prog && typeof gl.deleteProgram === "function") {
                gl.deleteProgram(prog);
                programsDisposed++;
            }
        }
    }
    // Trigger loose extension loseContext if available to release GPU VRAM immediately
    try {
        const loseExt = gl.getExtension ? gl.getExtension("WEBGL_lose_context") : null;
        if (loseExt && typeof loseExt.loseContext === "function") {
            loseExt.loseContext();
            contextLostTriggered = true;
        }
    }
    catch {
        // Ignore if loseContext not supported
    }
    return {
        texturesDisposed,
        buffersDisposed,
        programsDisposed,
        contextLostTriggered,
    };
}
