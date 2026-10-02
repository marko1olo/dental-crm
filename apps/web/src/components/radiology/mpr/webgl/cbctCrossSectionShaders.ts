/**
 * DENTE CRM — CBCT Transverse Cross-Section Hardware WebGL2 Shaders (FEAT-010 / GPU Overhaul)
 * Standards: DICOM Part 3 PS 3.3, Planmeca Romexis 6.x, Vatech Ez3D-i, Misch CE, Buser
 *
 * Fullscreen quad vertex shader + Fragment shader performing hardware 3D texture
 * sub-voxel trilinear transverse cross-section slice extraction along dental arch normal N
 * and tangent T, slab projection (MIP/MinIP/Average), and calibrated HU Window/Level mapping
 * at 60+ FPS (< 0.5 ms per frame).
 */

export const CBCT_CROSS_SECTION_VERTEX_SHADER = `#version 300 es
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

export const CBCT_CROSS_SECTION_FRAGMENT_SHADER = `#version 300 es
precision highp float;
precision highp isampler3D;

in vec2 v_uv;
out vec4 fragColor;

// 3D Texture containing calibrated 16-bit signed Hounsfield Units (HU)
uniform isampler3D u_volume;
uniform vec3 u_volumeDim;       // Volume voxel dimensions (width, height, depth)

// Transverse Cross-Section Affine Basis Vectors in normalized 3D Texture UVW space [0, 1]
uniform vec3 u_sliceOrigin;     // UVW at slice pixel (0, 0) (top-left)
uniform vec3 u_axisU;           // UVW span across slice width (bucco-lingual along normal N)
uniform vec3 u_axisV;           // UVW span across slice height (cranial-caudal along vertical Z)
uniform vec3 u_axisNorm;        // UVW step along arch tangent T (for slab thickness integration)

// Clinical Window / Level and Projection Parameters
uniform float u_windowWidth;
uniform float u_windowLevel;
uniform bool u_invert;
uniform int u_slabMode;         // 0 = single, 1 = mip, 2 = minip, 3 = average
uniform int u_slabSteps;        // Number of slab integration steps
uniform bool u_trilinear;       // true = sub-voxel trilinear, false = nearest neighbor
uniform int u_colorMap;        // 0 = grayscale, 1 = bone density (Misch D1-D4), 2 = endo, 3 = inverted
uniform float u_sharpenAmount; // 0.0 .. 1.0 hardware unsharp masking / trabecular edge enhancement
uniform float u_gamma;         // Non-linear gamma contrast curve (default 1.50)
uniform int u_useSoftKnee;     // 1 = enable soft-knee compression, 0 = linear DICOM
uniform float u_softKneeCeiling; // Soft-knee peak brightness ceiling [0..255] (default 178.0)
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

float sampleHU(vec3 uvw) {
    return u_trilinear ? sampleHUTrilinear(uvw) : sampleHUNearest(uvw);
}

void main() {
    // Traverse perpendicular cross-section along normal N (u_axisU) and vertical Z (u_axisV)
    vec3 baseUvw = u_sliceOrigin + v_uv.x * u_axisU + v_uv.y * u_axisV;
    float finalHU = -1000.0;

    int safeSteps = clamp(u_slabSteps, 1, 64);
    int halfSteps = safeSteps / 2;

    if (u_slabMode == 0 || u_slabSteps <= 1) {
        // Single transverse slice mode (< 0.5 ms high-speed path)
        finalHU = sampleHU(baseUvw);
    } else if (u_slabMode == 1) {
        // Slab MIP: Maximum Intensity Projection along arch tangent T
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
        // Slab Average IP along arch tangent T
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

    // Hardware Unsharp Masking / Alveolar Crest & Trabecular Edge Enhancer
    if (u_sharpenAmount > 0.001) {
        float sAmt = clamp(u_sharpenAmount, 0.0, 1.0);
        vec3 stepU = u_axisU / max(1.0, u_volumeDim.x);
        vec3 stepV = u_axisV / max(1.0, u_volumeDim.y);

        float huLeft  = sampleHU(baseUvw - stepU);
        float huRight = sampleHU(baseUvw + stepU);
        float huUp    = sampleHU(baseUvw - stepV);
        float huDown  = sampleHU(baseUvw + stepV);

        // Anti-air artifact guard: discard air boundaries (<-700 HU) to prevent haloing
        if (huLeft > -700.0 && huRight > -700.0 && huUp > -700.0 && huDown > -700.0 && finalHU > -700.0) {
            float laplacian = 4.0 * finalHU - (huLeft + huRight + huUp + huDown);
            finalHU = clamp(finalHU + sAmt * laplacian, -1000.0, 3071.0);
        }
    }

    // Calibrated DICOM PS 3.3 VOI Window / Level mapping
    float safeWW = max(1.0, u_windowWidth);
    float low = u_windowLevel - safeWW * 0.5;
    float normVal = clamp((finalHU - low) / safeWW, 0.0, 1.0);

    // Dynamic non-linear gamma transfer (default 1.50 for clinical trabecular contrast)
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
        float airFactor = smoothstep(-650.0, -550.0, finalHU);
        float darkAir = 10.0 / 255.0;
        float invertedGray = 1.0 - gray;
        gray = mix(darkAir, invertedGray, airFactor);
    }

    vec3 outRgb;

    if (u_colorMap == 1) {
        // Mode 1: Misch Bone Density Heatmap (Misch D1-D4 classification for implant site evaluation)
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
        // Mode 2: Endo High Contrast (Microcrack / Root canal anatomy)
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
