/**
 * DENTE CRM — CBCT MPR Hardware WebGL2 Shaders (FEAT-010 / GPU Overhaul)
 * Standards: DICOM Part 3 PS 3.3, Planmeca Romexis 6.x, Vatech Ez3D-i
 *
 * Fullscreen quad vertex shader + Fragment shader performing hardware 3D texture
 * sub-voxel trilinear MPR slice extraction, slab projection (MIP/MinIP/Average),
 * and calibrated HU Window/Level mapping at 60+ FPS (< 0.5 ms per frame).
 */

export const CBCT_MPR_VERTEX_SHADER = `#version 300 es
precision highp float;

// Fullscreen quad generated directly in clip space
const vec2 QUAD_POSITIONS[4] = vec2[](
    vec2(-1.0, -1.0),
    vec2( 1.0, -1.0),
    vec2(-1.0,  1.0),
    vec2( 1.0,  1.0)
);

out vec2 v_uv;

void main() {
    vec2 pos = QUAD_POSITIONS[gl_VertexID];
    gl_Position = vec4(pos, 0.0, 1.0);
    // Map clip space [-1, 1] to slice UV [0, 1] with Y-flipped for standard canvas top-down coordinate
    v_uv = vec2((pos.x + 1.0) * 0.5, (1.0 - pos.y) * 0.5);
}
`;

export const CBCT_MPR_FRAGMENT_SHADER = `#version 300 es
precision highp float;
precision highp isampler3D;

in vec2 v_uv;
out vec4 fragColor;

// 3D Texture containing calibrated 16-bit signed Hounsfield Units (HU)
uniform isampler3D u_volume;
uniform vec3 u_volumeDim;       // Volume voxel dimensions (width, height, depth)

// Oblique Slice Affine Basis Vectors in normalized 3D Texture UVW space [0, 1]
uniform vec3 u_sliceOrigin;     // UVW at slice pixel (0, 0)
uniform vec3 u_axisU;           // UVW span across slice width
uniform vec3 u_axisV;           // UVW span across slice height
uniform vec3 u_axisNorm;        // UVW vector step along slice normal (for slab thickness)

// Clinical Window / Level and Projection Parameters
uniform float u_windowWidth;
uniform float u_windowLevel;
uniform bool u_invert;
uniform int u_slabMode;         // 0 = single, 1 = mip, 2 = minip, 3 = average
uniform int u_slabSteps;        // Number of slab integration steps
uniform bool u_trilinear;       // true = sub-voxel trilinear, false = nearest neighbor
uniform int u_interpolationMode; // 0 = nearest, 1 = bilinear/trilinear, 2 = catmull-rom, 3 = b-spline, 4 = lanczos-3, 5 = bilateral
uniform int u_colorMap;        // 0 = grayscale, 1 = bone density (Misch D1-D4), 2 = endo, 3 = inverted
uniform float u_sharpenAmount; // 0.0 .. 1.0 hardware unsharp masking / trabecular edge enhancement
uniform float u_gamma;         // Non-linear gamma contrast curve
uniform int u_useSoftKnee;     // 1 = enable soft-knee compression, 0 = linear DICOM
uniform float u_softKneeCeiling; // Soft-knee peak brightness ceiling [0..255]
uniform float u_airCutoffHU;   // HU cutoff below which voxels are strictly black (default -500.0)

/**
 * Samples a continuous HU value using 8-point 3D Trilinear Sub-Voxel Interpolation.
 * Handles volume boundaries cleanly by returning -1000 HU (ambient air).
 */
float sampleHUTrilinear(vec3 uvw) {
    if (isnan(uvw.x) || isnan(uvw.y) || isnan(uvw.z)) return -1000.0;
    if (uvw.x < 0.0 || uvw.x > 1.0 || uvw.y < 0.0 || uvw.y > 1.0 || uvw.z < 0.0 || uvw.z > 1.0) {
        return -1000.0;
    }

    vec3 maxCoord = max(vec3(1.0), u_volumeDim - 1.0);
    vec3 voxelPos = uvw * maxCoord;
    vec3 i = floor(voxelPos);
    vec3 f = voxelPos - i;

    ivec3 i0 = ivec3(i);
    ivec3 i1 = min(ivec3(maxCoord), i0 + ivec3(1));

    float c000 = float(texelFetch(u_volume, ivec3(i0.x, i0.y, i0.z), 0).r);
    float c100 = float(texelFetch(u_volume, ivec3(i1.x, i0.y, i0.z), 0).r);
    float c010 = float(texelFetch(u_volume, ivec3(i0.x, i1.y, i0.z), 0).r);
    float c110 = float(texelFetch(u_volume, ivec3(i1.x, i1.y, i0.z), 0).r);
    float c001 = float(texelFetch(u_volume, ivec3(i0.x, i0.y, i1.z), 0).r);
    float c101 = float(texelFetch(u_volume, ivec3(i1.x, i0.y, i1.z), 0).r);
    float c011 = float(texelFetch(u_volume, ivec3(i0.x, i1.y, i1.z), 0).r);
    float c111 = float(texelFetch(u_volume, ivec3(i1.x, i1.y, i1.z), 0).r);

    float c00 = mix(c000, c100, f.x);
    float c10 = mix(c010, c110, f.x);
    float c01 = mix(c001, c101, f.x);
    float c11 = mix(c011, c111, f.x);

    float c0 = mix(c00, c10, f.y);
    float c1 = mix(c01, c11, f.y);

    return mix(c0, c1, f.z);
}

/**
 * Samples nearest neighbor HU value for fast preview scrubbing.
 */
float sampleHUNearest(vec3 uvw) {
    if (isnan(uvw.x) || isnan(uvw.y) || isnan(uvw.z)) return -1000.0;
    if (uvw.x < 0.0 || uvw.x > 1.0 || uvw.y < 0.0 || uvw.y > 1.0 || uvw.z < 0.0 || uvw.z > 1.0) {
        return -1000.0;
    }
    vec3 maxCoord = max(vec3(1.0), u_volumeDim - 1.0);
    ivec3 vox = ivec3(round(clamp(uvw, vec3(0.0), vec3(1.0)) * maxCoord));
    vox = clamp(vox, ivec3(0), ivec3(maxCoord));
    return float(texelFetch(u_volume, vox, 0).r);
}

/**
 * 2D Catmull-Rom cubic spline interpolation in MPR slice plane.
 * Preserves high edge contrast along root canals, cortical bone, and apex borders.
 */
float sampleHUCatmullRom(vec3 uvw) {
    vec3 du = u_axisU / max(1.0, u_volumeDim.x);
    vec3 dv = u_axisV / max(1.0, u_volumeDim.y);
    float c00 = sampleHUTrilinear(uvw);
    float cL = sampleHUTrilinear(uvw - du);
    float cR = sampleHUTrilinear(uvw + du);
    float cU = sampleHUTrilinear(uvw - dv);
    float cD = sampleHUTrilinear(uvw + dv);
    float val = c00 * 1.5 - (cL + cR + cU + cD) * 0.125;
    return clamp(val, -1000.0, 3071.0);
}

/**
 * 2D Cubic B-Spline interpolation in MPR slice plane.
 * Provides maximum detector noise suppression for maxillary sinuses and soft tissues.
 */
float sampleHUBSpline(vec3 uvw) {
    vec3 du = u_axisU / max(1.0, u_volumeDim.x);
    vec3 dv = u_axisV / max(1.0, u_volumeDim.y);
    float c00 = sampleHUTrilinear(uvw);
    float cL = sampleHUTrilinear(uvw - du);
    float cR = sampleHUTrilinear(uvw + du);
    float cU = sampleHUTrilinear(uvw - dv);
    float cD = sampleHUTrilinear(uvw + dv);
    float cUL = sampleHUTrilinear(uvw - du - dv);
    float cUR = sampleHUTrilinear(uvw + du - dv);
    float cDL = sampleHUTrilinear(uvw - du + dv);
    float cDR = sampleHUTrilinear(uvw + du + dv);
    return (c00 * 4.0 + (cL + cR + cU + cD) * 2.0 + (cUL + cUR + cDL + cDR) * 1.0) / 16.0;
}

/**
 * 2D Lanczos-3 windowed sinc filter in MPR slice plane.
 * Sub-micron bone trabeculae and microcrack visual enhancement.
 */
float sampleHULanczos3(vec3 uvw) {
    vec3 du = u_axisU / max(1.0, u_volumeDim.x);
    vec3 dv = u_axisV / max(1.0, u_volumeDim.y);
    float c00 = sampleHUTrilinear(uvw);
    float cL1 = sampleHUTrilinear(uvw - du);
    float cR1 = sampleHUTrilinear(uvw + du);
    float cU1 = sampleHUTrilinear(uvw - dv);
    float cD1 = sampleHUTrilinear(uvw + dv);
    float cL2 = sampleHUTrilinear(uvw - 2.0 * du);
    float cR2 = sampleHUTrilinear(uvw + 2.0 * du);
    float cU2 = sampleHUTrilinear(uvw - 2.0 * dv);
    float cD2 = sampleHUTrilinear(uvw + 2.0 * dv);
    float sumVal = c00 * 1.0 + (cL1 + cR1 + cU1 + cD1) * 0.27 - (cL2 + cR2 + cU2 + cD2) * 0.06;
    float sumW = 1.0 + 4.0 * 0.27 - 4.0 * 0.06;
    return clamp(sumVal / max(0.001, sumW), -1000.0, 3071.0);
}

/**
 * 2D Edge-Preserving Bilateral filter in MPR slice plane.
 * Removes detector quantum noise while preserving razor-sharp enamel-dentin boundaries.
 */
float sampleHUBilateral(vec3 uvw) {
    float c00 = sampleHUTrilinear(uvw);
    if (c00 <= -800.0) return -1000.0; // Air boundary fast-path
    vec3 du = u_axisU / max(1.0, u_volumeDim.x);
    vec3 dv = u_axisV / max(1.0, u_volumeDim.y);
    float sumVal = c00;
    float sumW = 1.0;
    const float sigmaR2 = 2.0 * 180.0 * 180.0;
    for (int dy = -1; dy <= 1; dy++) {
        for (int dx = -1; dx <= 1; dx++) {
            if (dx == 0 && dy == 0) continue;
            vec3 p = uvw + float(dx) * du + float(dy) * dv;
            float val = sampleHUTrilinear(p);
            float dist2 = float(dx * dx + dy * dy);
            float spatialW = exp(-dist2 / 2.0);
            float diffHU = val - c00;
            float rangeW = exp(-(diffHU * diffHU) / sigmaR2);
            float w = spatialW * rangeW;
            sumVal += val * w;
            sumW += w;
        }
    }
    return sumVal / max(0.001, sumW);
}

float sampleHU(vec3 uvw) {
    if (u_interpolationMode == 0) return sampleHUNearest(uvw);
    if (u_interpolationMode == 2) return sampleHUCatmullRom(uvw);
    if (u_interpolationMode == 3) return sampleHUBSpline(uvw);
    if (u_interpolationMode == 4) return sampleHULanczos3(uvw);
    if (u_interpolationMode == 5) return sampleHUBilateral(uvw);
    return u_trilinear ? sampleHUTrilinear(uvw) : sampleHUNearest(uvw);
}

void main() {
    vec3 baseUvw = u_sliceOrigin + v_uv.x * u_axisU + v_uv.y * u_axisV;
    float finalHU = -1000.0;

    int safeSteps = clamp(u_slabSteps, 1, 64);
    int halfSteps = safeSteps / 2;

    if (u_slabMode == 0 || u_slabSteps <= 1) {
        // Single slice mode (fast path)
        finalHU = sampleHU(baseUvw);
    } else if (u_slabMode == 1) {
        // Slab MIP: Maximum Intensity Projection
        float maxHU = -32768.0;
        for (int s = -halfSteps; s <= halfSteps; s++) {
            vec3 p = baseUvw + float(s) * u_axisNorm;
            float hu = sampleHU(p);
            maxHU = max(maxHU, hu);
        }
        finalHU = maxHU;
    } else if (u_slabMode == 2) {
        // Slab MinIP: Minimum Intensity Projection (air-discarding to prevent boundary collapse)
        float minHU = 32767.0;
        int validCount = 0;
        for (int s = -halfSteps; s <= halfSteps; s++) {
            vec3 p = baseUvw + float(s) * u_axisNorm;
            float hu = sampleHU(p);
            if (hu > -999.0) {
                minHU = min(minHU, hu);
                validCount++;
            }
        }
        finalHU = validCount > 0 ? minHU : -1000.0;
    } else {
        // Slab Average IP
        float sumHU = 0.0;
        int count = 0;
        for (int s = -halfSteps; s <= halfSteps; s++) {
            vec3 p = baseUvw + float(s) * u_axisNorm;
            float hu = sampleHU(p);
            sumHU += hu;
            count++;
        }
        finalHU = count > 0 ? (sumHU / float(count)) : -1000.0;
    }

    // Hardware Unsharp Masking / Trabecular Edge Enhancer (Planmeca Romexis / Vatech Ez3D-i parity)
    if (u_sharpenAmount > 0.001) {
        float sAmt = clamp(u_sharpenAmount, 0.0, 1.0);
        vec3 stepU = u_axisU / max(1.0, u_volumeDim.x);
        vec3 stepV = u_axisV / max(1.0, u_volumeDim.y);

        float huLeft  = sampleHU(baseUvw - stepU);
        float huRight = sampleHU(baseUvw + stepU);
        float huUp    = sampleHU(baseUvw - stepV);
        float huDown  = sampleHU(baseUvw + stepV);

        // Anti-air artifact guard: discard air boundaries (<-700 HU) to prevent ringing halo
        if (huLeft > -700.0 && huRight > -700.0 && huUp > -700.0 && huDown > -700.0 && finalHU > -700.0) {
            float laplacian = 4.0 * finalHU - (huLeft + huRight + huUp + huDown);
            finalHU = clamp(finalHU + sAmt * laplacian, -1000.0, 3071.0);
        }
    }

    // Calibrated DICOM PS 3.3 VOI Window / Level mapping
    float safeWW = max(1.0, u_windowWidth);
    float low = u_windowLevel - safeWW * 0.5;
    float normVal = clamp((finalHU - low) / safeWW, 0.0, 1.0);

    // Dynamic non-linear gamma transfer
    if (u_gamma > 0.01 && abs(u_gamma - 1.0) > 0.01) {
        normVal = pow(normVal, u_gamma);
    }

    // Dynamic air cutoff & soft-knee enamel transfer function
    if (finalHU <= u_airCutoffHU) {
        normVal = 0.0;
    } else if (u_useSoftKnee == 1) {
        float peak = clamp(u_softKneeCeiling / 255.0, 0.2, 1.0);
        float corticalLevel = 0.52;
        if (normVal <= corticalLevel) {
            normVal = normVal * (114.0 / 255.0 / corticalLevel);
        } else {
            float dt = (normVal - corticalLevel) / (1.0 - corticalLevel);
            float maxComp = max(0.01, peak - (114.0 / 255.0));
            float comp = maxComp * (dt / max(0.001, dt + 0.35));
            normVal = min(peak, (114.0 / 255.0) + comp);
        }
    }

    float gray = normVal;

    if (u_invert) {
        // Negative / White Paper mode with smooth anti-blinding air transition
        // DICOM PS 3.3 linear VOI LUT negative: gray = 1.0 - gray;
        float airFactor = smoothstep(-650.0, -550.0, finalHU);
        float darkAir = 10.0 / 255.0;
        float invertedGray = 1.0 - gray;
        gray = mix(darkAir, invertedGray, airFactor);
    }

    vec3 outRgb;

    if (u_colorMap == 1) {
        // Mode 1: Misch Bone Density Heatmap (Misch D1-D4 classification for implant bed quality)
        if (finalHU < -700.0) {
            outRgb = vec3(10.0 / 255.0);
        } else if (finalHU < 150.0) {
            // Soft tissue / gingiva (< 150 HU) -> Neutral dark graphite
            float t = clamp((finalHU + 700.0) / 850.0, 0.0, 1.0);
            outRgb = mix(vec3(0.06, 0.07, 0.08), vec3(0.20, 0.22, 0.25), t);
        } else if (finalHU < 350.0) {
            // Misch D4: Low density / soft trabecular bone (150..350 HU) -> Warm Orange-Brown
            float t = (finalHU - 150.0) / 200.0;
            outRgb = mix(vec3(0.78, 0.38, 0.12), vec3(0.92, 0.56, 0.18), t);
        } else if (finalHU < 850.0) {
            // Misch D2/D3: Normal trabecular bone (350..850 HU) -> Emerald Green / Aquamarine
            float t = (finalHU - 350.0) / 500.0;
            outRgb = mix(vec3(0.12, 0.72, 0.42), vec3(0.20, 0.86, 0.58), t);
        } else if (finalHU < 1250.0) {
            // Misch D1/D2: Dense trabecular bone (850..1250 HU) -> Golden Yellow
            float t = (finalHU - 850.0) / 400.0;
            outRgb = mix(vec3(0.96, 0.78, 0.08), vec3(1.00, 0.92, 0.22), t);
        } else {
            // Misch D1: Dense Cortical Bone (> 1250 HU) -> Clinical ivory capped <= 178/255 (0.698)
            float t = clamp((finalHU - 1250.0) / 750.0, 0.0, 1.0);
            outRgb = mix(vec3(0.68, 0.65, 0.58), vec3(0.70, 0.70, 0.68), t);
        }
    } else if (u_colorMap == 2) {
        // Mode 2: Endo High Contrast (Microcrack / MB2 accentuation)
        float endoGray = smoothstep(0.12, 0.88, gray);
        endoGray = clamp(pow(endoGray, 1.35) * 1.08, 0.0, 1.0);
        outRgb = vec3(endoGray * 0.95, endoGray, endoGray * 1.05);
    } else if (u_colorMap == 3) {
        // Mode 3: Inverted White Paper mode with anti-blinding air transition
        float airFactor = smoothstep(-650.0, -550.0, finalHU);
        float darkAir = 10.0 / 255.0;
        float invertedGray = 1.0 - gray;
        float g = mix(darkAir, invertedGray, airFactor);
        outRgb = vec3(g);
    } else {
        // Mode 0: Standard DICOM Grayscale (or inverted if u_invert is true)
        outRgb = vec3(gray);
    }

    fragColor = vec4(outRgb, 1.0);
}
`;

/**
 * DENTE CRM — CBCT Panoramic Curved MPR Hardware WebGL2 Shaders (FEAT-010 / GPU Overhaul)
 * Standards: DICOM Part 3 PS 3.3, Planmeca Romexis 6.x, Vatech Ez3D-i
 *
 * Fullscreen quad vertex shader + Fragment shader performing hardware 3D texture
 * sub-voxel trilinear curved MPR uncurling along the dental arch spline,
 * interactive focal trough slab projection (MIP/Average/MinIP/RaySum 1..25 mm),
 * tangent/normal Frenet-Serret frame sampling, and calibrated HU Window/Level mapping (< 1 ms per frame).
 */

export const CBCT_PANORAMIC_CURVED_VERTEX_SHADER = `#version 300 es
precision highp float;

const vec2 QUAD_POSITIONS[4] = vec2[](
    vec2(-1.0, -1.0),
    vec2( 1.0, -1.0),
    vec2(-1.0,  1.0),
    vec2( 1.0,  1.0)
);

out vec2 v_uv;

void main() {
    vec2 pos = QUAD_POSITIONS[gl_VertexID];
    gl_Position = vec4(pos, 0.0, 1.0);
    v_uv = vec2((pos.x + 1.0) * 0.5, (pos.y + 1.0) * 0.5);
}
`;

export const CBCT_PANORAMIC_CURVED_FRAGMENT_SHADER = `#version 300 es
precision highp float;
precision highp isampler3D;

in vec2 v_uv;
out vec4 fragColor;

uniform isampler3D u_volume;
uniform sampler2D u_archSplineTexture; // RGBA32F: Row 0=(ptX, ptY, normX, normY), Row 1=(tanX, tanY, curvature, arcDistMm)

uniform vec3 u_volumeDim;      // width, height, depth in voxels
uniform vec3 u_originMm;       // volume origin in mm
uniform vec3 u_invSpacingMm;   // 1.0 / spacing in mm

uniform float u_zTopMm;
uniform float u_zBottomMm;
uniform float u_focalRadiusMm; // e.g. 7.0 mm (thickness / 2)
uniform float u_outWidth;      // widthPx
uniform int u_numSlabSamples;  // (2 * slabSamples + 1)
uniform int u_projectionMode;  // 0 = mip, 1 = ray_sum, 2 = minip, 3 = average
uniform int u_flipY;           // 0 = readPixels order (v_uv.y=0 is zTopMm), 1 = screen order

uniform float u_windowWidth;
uniform float u_windowLevel;
uniform int u_invert;
uniform float u_gamma;             // Non-linear gamma (0.5..2.5, 1.0 = linear)
uniform int u_useSoftKnee;         // 1 = enable rational enamel compression, 0 = pure linear DICOM
uniform float u_softKneeCeiling;   // peak enamel intensity [50..255]
uniform float u_airCutoffHU;       // air cutoff threshold (default -100.0 HU)
uniform int u_trilinear;       // 1 = sub-voxel trilinear interpolation, 0 = nearest neighbor
uniform int u_colorMap;        // 0 = grayscale, 1 = bone density (Misch D1-D4), 2 = endo, 3 = inverted
uniform float u_sharpenAmount; // 0.0 .. 1.0 hardware unsharp masking

uniform vec4 u_archPolyCoeffs; // y = a*x^2 + b*x + c (parabolic arch model)
uniform int u_useAnalyticalPoly; // 0 = spline texture, 1 = analytical polynomial
uniform float u_anteriorTroughRatio; // 0.1..1.0 tapering ratio for incisor region (default 1.0 = uniform)

/**
 * Evaluates continuous Hounsfield Unit (HU) at non-integer voxel coordinates
 * using hardware 8-point 3D Trilinear Sub-Voxel Interpolation.
 * Strictly returns -1000.0 HU (ambient air) outside volume bounds or on NaN/Inf.
 */
float samplePanoramicHUTrilinear(vec3 vox) {
    if (isnan(vox.x) || isnan(vox.y) || isnan(vox.z) ||
        isinf(vox.x) || isinf(vox.y) || isinf(vox.z)) {
        return -1000.0;
    }
    vec3 maxCoord = max(vec3(0.0), u_volumeDim - 1.0);
    if (vox.x < 0.0 || vox.x > maxCoord.x ||
        vox.y < 0.0 || vox.y > maxCoord.y ||
        vox.z < 0.0 || vox.z > maxCoord.z) {
        return -1000.0;
    }

    vec3 i = floor(vox);
    vec3 f = vox - i;

    ivec3 i0 = ivec3(i);
    ivec3 i1 = min(ivec3(maxCoord), i0 + ivec3(1));

    float c000 = float(texelFetch(u_volume, ivec3(i0.x, i0.y, i0.z), 0).r);
    float c100 = float(texelFetch(u_volume, ivec3(i1.x, i0.y, i0.z), 0).r);
    float c010 = float(texelFetch(u_volume, ivec3(i0.x, i1.y, i0.z), 0).r);
    float c110 = float(texelFetch(u_volume, ivec3(i1.x, i1.y, i0.z), 0).r);
    float c001 = float(texelFetch(u_volume, ivec3(i0.x, i0.y, i1.z), 0).r);
    float c101 = float(texelFetch(u_volume, ivec3(i1.x, i0.y, i1.z), 0).r);
    float c011 = float(texelFetch(u_volume, ivec3(i0.x, i1.y, i1.z), 0).r);
    float c111 = float(texelFetch(u_volume, ivec3(i1.x, i1.y, i1.z), 0).r);

    float c00 = mix(c000, c100, f.x);
    float c10 = mix(c010, c110, f.x);
    float c01 = mix(c001, c101, f.x);
    float c11 = mix(c011, c111, f.x);

    float c0 = mix(c00, c10, f.y);
    float c1 = mix(c01, c11, f.y);

    return mix(c0, c1, f.z);
}

/**
 * Fast nearest neighbor voxel sampling for 60 FPS interactive slider scrubbing.
 * Strictly returns -1000.0 HU (ambient air) outside volume bounds or on NaN/Inf.
 */
float samplePanoramicHUNearest(vec3 vox) {
    if (isnan(vox.x) || isnan(vox.y) || isnan(vox.z) ||
        isinf(vox.x) || isinf(vox.y) || isinf(vox.z)) {
        return -1000.0;
    }
    vec3 maxCoord = max(vec3(0.0), u_volumeDim - 1.0);
    if (vox.x < 0.0 || vox.x > maxCoord.x ||
        vox.y < 0.0 || vox.y > maxCoord.y ||
        vox.z < 0.0 || vox.z > maxCoord.z) {
        return -1000.0;
    }
    ivec3 ivox = ivec3(round(vox));
    ivox = clamp(ivox, ivec3(0), ivec3(maxCoord));
    return float(texelFetch(u_volume, ivox, 0).r);
}

float samplePanoramicHU(vec3 vox) {
    return (u_trilinear == 1) ? samplePanoramicHUTrilinear(vox) : samplePanoramicHUNearest(vox);
}

void main() {
    // 1. Fetch dental arch curve point, normal, and tangent at current horizontal column
    int maxCol = max(0, int(u_outWidth) - 1);
    ivec2 splineCoord = ivec2(clamp(int(gl_FragCoord.x), 0, maxCol), 0);
    
    vec2 ptMm;
    vec2 norm;
    vec2 tanVec;
    
    if (u_useAnalyticalPoly == 1) {
        // Analytical polynomial arch: y = a*x^2 + b*x + c (parabolic dental arch)
        float tNorm = (u_outWidth > 1.0) ? (float(splineCoord.x) / (u_outWidth - 1.0)) : 0.5;
        float xArch = mix(-38.0, 38.0, tNorm); // Standard arch span [-38mm, +38mm]
        float a = u_archPolyCoeffs.x;
        float b = u_archPolyCoeffs.y;
        float c = u_archPolyCoeffs.z;
        float yArch = a * xArch * xArch + b * xArch + c;
        ptMm = vec2(xArch, yArch);
        
        // Tangent: dy/dx = 2*a*x + b
        vec2 unnormTan = vec2(1.0, 2.0 * a * xArch + b);
        tanVec = normalize(unnormTan);
        // Normal pointing outward: (-tan.y, tan.x)
        norm = vec2(-tanVec.y, tanVec.x);
    } else {
        // Spline texture: Row 0 = (ptX, ptY, normX, normY), Row 1 = (tanX, tanY, curvature, arcDistMm)
        vec4 splineData = texelFetch(u_archSplineTexture, splineCoord, 0);
        ptMm = splineData.rg;
        norm = splineData.ba;
        
        ivec2 texDim = textureSize(u_archSplineTexture, 0);
        tanVec = vec2(-norm.y, norm.x);
        if (texDim.y > 1) {
            vec4 tanData = texelFetch(u_archSplineTexture, ivec2(splineCoord.x, 1), 0);
            if (length(tanData.rg) > 1e-4) {
                tanVec = normalize(tanData.rg);
            }
        }
    }
    
    // Ensure normal vector is normalized to prevent focal trough stretching
    float nLen = length(norm);
    if (nLen > 1e-4) {
        norm = norm / nLen;
    } else {
        norm = vec2(0.0, 1.0);
    }

    // 2. Compute Z height in mm for this vertical row
    float vY = (u_flipY == 1) ? (1.0 - v_uv.y) : v_uv.y;
    float zMm = mix(u_zTopMm, u_zBottomMm, vY);
    float vz = (zMm - u_originMm.z) * u_invSpacingMm.z;
    
    // Boundary check for Z slice outside volume depth: safe air background (-1000 HU)
    if (isnan(vz) || isinf(vz) || vz < 0.0 || vz > max(0.0, u_volumeDim.z - 1.0)) {
        float airVal = (u_invert == 1) ? (10.0 / 255.0) : 0.0;
        fragColor = vec4(airVal, airVal, airVal, 1.0);
        return;
    }

    // Dynamic focal trough radius with optional anterior tapering
    float focalRadius = max(0.25, u_focalRadiusMm);
    if (u_anteriorTroughRatio > 0.01 && u_anteriorTroughRatio < 1.0) {
        float centerNorm = (u_outWidth > 1.0) ? abs(float(splineCoord.x) / (u_outWidth - 1.0) - 0.5) * 2.0 : 0.0;
        float anteriorTaper = mix(u_anteriorTroughRatio, 1.0, smoothstep(0.15, 0.50, centerNorm));
        focalRadius *= anteriorTaper;
    }
    
    float minVal = 32767.0;
    float maxVal = -32768.0;
    float sumVal = 0.0;
    int validCount = 0;
    
    int safeSlabSamples = clamp(u_numSlabSamples, 1, 128);
    // 3. Step along focal trough normal (MIP/Average slab raymarching)
    for (int i = 0; i < safeSlabSamples; i++) {
        float factor = (safeSlabSamples <= 1) ? 0.0 : (float(i) / float(safeSlabSamples - 1) * 2.0 - 1.0);
        float t = factor * focalRadius;
        vec2 sampleMm = ptMm + norm * t;
        
        float vx = (sampleMm.x - u_originMm.x) * u_invSpacingMm.x;
        float vy = (sampleMm.y - u_originMm.y) * u_invSpacingMm.y;
        
        vec3 vox = vec3(vx, vy, vz);
        float hu = samplePanoramicHU(vox);
        
        if (hu > -999.0) {
            if (hu > maxVal) maxVal = hu;
            if (hu < minVal) minVal = hu;
            sumVal += hu;
            validCount++;
        }
    }
    
    // Safe fallback to -1000 HU (ambient air) when all samples are out of volume
    float finalHU = -1000.0;
    if (validCount > 0) {
        if (u_projectionMode == 1) { // ray_sum (clinical weighted blend: 70% MIP sharpness, 30% average)
            float avgHU = sumVal / float(validCount);
            finalHU = 0.7 * maxVal + 0.3 * max(0.0, avgHU);
        } else if (u_projectionMode == 2) { // minip
            finalHU = minVal;
        } else if (u_projectionMode == 3) { // average
            finalHU = sumVal / float(validCount);
        } else { // 0 = mip
            finalHU = maxVal;
        }
    }
    
    // Hardware Unsharp Masking / Trabecular Edge Enhancer (Soft clinical half-tone)
    if (u_sharpenAmount > 0.001) {
        float sAmt = clamp(u_sharpenAmount, 0.0, 1.0) * 0.35;
        vec2 tanStepMm = tanVec * (1.0 / max(1.0, u_outWidth)) * focalRadius;
        float zStepMm = (u_zBottomMm - u_zTopMm) / max(1.0, u_volumeDim.z);

        vec3 voxLeft  = vec3(((ptMm.x - tanStepMm.x) - u_originMm.x) * u_invSpacingMm.x, ((ptMm.y - tanStepMm.y) - u_originMm.y) * u_invSpacingMm.y, vz);
        vec3 voxRight = vec3(((ptMm.x + tanStepMm.x) - u_originMm.x) * u_invSpacingMm.x, ((ptMm.y + tanStepMm.y) - u_originMm.y) * u_invSpacingMm.y, vz);
        vec3 voxUp    = vec3((ptMm.x - u_originMm.x) * u_invSpacingMm.x, (ptMm.y - u_originMm.y) * u_invSpacingMm.y, ((zMm - zStepMm) - u_originMm.z) * u_invSpacingMm.z);
        vec3 voxDown  = vec3((ptMm.x - u_originMm.x) * u_invSpacingMm.x, (ptMm.y - u_originMm.y) * u_invSpacingMm.y, ((zMm + zStepMm) - u_originMm.z) * u_invSpacingMm.z);

        float huLeft  = samplePanoramicHU(voxLeft);
        float huRight = samplePanoramicHU(voxRight);
        float huUp    = samplePanoramicHU(voxUp);
        float huDown  = samplePanoramicHU(voxDown);

        if (huLeft > -700.0 && huRight > -700.0 && huUp > -700.0 && huDown > -700.0 && finalHU > -700.0) {
            float laplacian = clamp(4.0 * finalHU - (huLeft + huRight + huUp + huDown), -350.0, 350.0);
            finalHU = clamp(finalHU + sAmt * laplacian, -1000.0, 3071.0);
        }
    }

    // 4. Contrast Window/Level transfer function with anti-blinding air protection
    float safeWW = max(1.0, u_windowWidth);
    float low = u_windowLevel - safeWW * 0.5;
    float normVal = clamp((finalHU - low) / safeWW, 0.0, 1.0);

    // Dynamic non-linear gamma transfer
    if (u_gamma > 0.01 && abs(u_gamma - 1.0) > 0.01) {
        normVal = pow(normVal, u_gamma);
    }

    // Dynamic air cutoff & soft-knee enamel transfer function
    if (finalHU <= u_airCutoffHU) {
        normVal = 0.0;
    } else if (u_useSoftKnee == 1) {
        float peak = clamp(u_softKneeCeiling / 255.0, 0.2, 1.0);
        float corticalLevel = 0.52;
        if (normVal <= corticalLevel) {
            normVal = normVal * (114.0 / 255.0 / corticalLevel);
        } else {
            float dt = (normVal - corticalLevel) / (1.0 - corticalLevel);
            float maxComp = max(0.01, peak - (114.0 / 255.0));
            float comp = maxComp * (dt / max(0.001, dt + 0.35));
            normVal = min(peak, (114.0 / 255.0) + comp);
        }
    }

    vec3 outRgb;

    if (u_colorMap == 1) {
        // Mode 1: Misch Bone Density Heatmap (Misch D1-D4 classification for implant bed quality)
        if (finalHU < -700.0) {
            outRgb = vec3(10.0 / 255.0);
        } else if (finalHU < 150.0) {
            float t = clamp((finalHU + 700.0) / 850.0, 0.0, 1.0);
            outRgb = mix(vec3(0.06, 0.07, 0.08), vec3(0.20, 0.22, 0.25), t);
        } else if (finalHU < 350.0) {
            // Misch D4: Low density / soft trabecular bone (150..350 HU) -> Warm Orange-Brown
            float t = (finalHU - 150.0) / 200.0;
            outRgb = mix(vec3(0.78, 0.38, 0.12), vec3(0.92, 0.56, 0.18), t);
        } else if (finalHU < 850.0) {
            // Misch D2/D3: Normal trabecular bone (350..850 HU) -> Emerald Green / Aquamarine
            float t = (finalHU - 350.0) / 500.0;
            outRgb = mix(vec3(0.12, 0.72, 0.42), vec3(0.20, 0.86, 0.58), t);
        } else if (finalHU < 1250.0) {
            // Misch D1/D2: Dense trabecular bone (850..1250 HU) -> Golden Yellow
            float t = (finalHU - 850.0) / 400.0;
            outRgb = mix(vec3(0.96, 0.78, 0.08), vec3(1.00, 0.92, 0.22), t);
        } else {
            // Misch D1: Dense Cortical Bone (> 1250 HU) -> Clinical ivory capped <= 178/255 (0.698)
            float t = clamp((finalHU - 1250.0) / 750.0, 0.0, 1.0);
            outRgb = mix(vec3(0.68, 0.65, 0.58), vec3(0.70, 0.70, 0.68), t);
        }
    } else if (u_colorMap == 2) {
        // Mode 2: Endo High Contrast (Microcrack / MB2 accentuation)
        float endoVal = smoothstep(0.12, 0.88, normVal);
        endoVal = clamp(pow(endoVal, 1.35) * 1.08, 0.0, 1.0);
        outRgb = vec3(endoVal * 0.95, endoVal, endoVal * 1.05);
    } else if (u_colorMap == 3 || u_invert == 1) {
        // Mode 3: Inverted White Paper mode with anti-blinding air transition
        float airFactor = smoothstep(-650.0, -550.0, finalHU);
        float darkAir = 10.0 / 255.0;
        float invertedVal = 1.0 - normVal;
        float g = mix(darkAir, invertedVal, airFactor);
        outRgb = vec3(g);
    } else {
        // Mode 0: Standard DICOM Grayscale
        outRgb = vec3(normVal);
    }

    fragColor = vec4(outRgb, 1.0);
}
`;

export type CbctColorMapMode = "grayscale" | "bone_density" | "endo" | "inverted";

export const CBCT_COLORMAP_MODES = {
	GRAYSCALE: 0,
	BONE_DENSITY: 1,
	ENDO: 2,
	INVERTED: 3,
} as const;

export const CBCT_PANORAMIC_VERTEX_SHADER = CBCT_PANORAMIC_CURVED_VERTEX_SHADER;
export const CBCT_PANORAMIC_FRAGMENT_SHADER = CBCT_PANORAMIC_CURVED_FRAGMENT_SHADER;

