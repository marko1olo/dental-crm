/**
 * DENTE CRM — CBCT 3D WebGL2 Volume Raymarching Shaders (Layer 1)
 * Standards: DICOM Part 3 PS 3.3, WebGL2 PS 3.3, Planmeca Romexis 6.x
 */

export const CBCT_VOLUME_3D_VERTEX_SHADER = `#version 300 es
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
    v_uv = vec2((pos.x + 1.0) * 0.5, (1.0 - pos.y) * 0.5);
}
`;

export const CBCT_VOLUME_3D_FRAGMENT_SHADER = `#version 300 es
precision highp float;
precision highp isampler3D;

in vec2 v_uv;
out vec4 fragColor;

uniform isampler3D u_volume;
uniform vec3 u_volumeDim;      // (width, height, depth) in voxels
uniform mat3 u_rotMatrix;      // 3x3 camera rotation matrix
uniform vec2 u_resolution;     // (canvas.width, canvas.height)
uniform vec2 u_pan;            // pan.x, pan.y in pixels
uniform float u_zoom;          // zoom factor
uniform float u_huMin;         // preset huMin
uniform float u_huMax;         // preset huMax
uniform int u_presetMode;      // 0 = surface (skull, dense_bone, soft_tissue), 1 = mip
uniform vec3 u_boneColor;      // base bone color (e.g. 240, 225, 200 / 255.0)
uniform vec3 u_lightDir;       // normalized light direction
uniform int u_maxSteps;        // 60-200 steps
uniform float u_voxelStep;     // adaptive ray step in voxels (0.5 ultra, 1.0 balanced, 1.8 low, 2.5 potato)
uniform vec3 u_clipMin;        // normalized [0, 1] clipping box minimum
uniform vec3 u_clipMax;        // normalized [0, 1] clipping box maximum
uniform int u_refineSteps;     // 0 during interaction, 4 on mouseUp

uniform int u_renderMode;      // 0 = clinical RGBA color, 1 = Ez3D G-Buffer Object Picking
uniform float u_objectId;      // Object ID for 0-ms mouse picking (e.g. 1.0=bone, 2.0=nerve, 3.0=implant)
uniform int u_marActive;       // 1 = Metal Artifact Reduction (MAR) active, 0 = off

// 3D Dental Implants (up to 4 fixtures in alveolar bone)
uniform int u_implantCount;                  // 0..4
uniform vec3 u_implantEntry[4];              // Platform entry in volume voxel coordinates
uniform vec3 u_implantApex[4];               // Apex bottom in volume voxel coordinates
uniform vec2 u_implantRadii[4];              // (platformRadiusVoxel, apexRadiusVoxel)
uniform vec3 u_implantColors[4];             // Surgical Emerald / Neon Green RGB

struct ImplantHit {
    bool isInside;
    float distToSurface;
    vec3 normal;
    vec3 color;
    float tAlongAxis;
};

ImplantHit evaluateImplantAt(vec3 pos, int k) {
    vec3 entry = u_implantEntry[k];
    vec3 apex = u_implantApex[k];
    vec2 radii = u_implantRadii[k];
    vec3 col = u_implantColors[k];
    
    vec3 ba = apex - entry;
    float axisLen = length(ba);
    if (axisLen < 0.001) {
        ImplantHit none;
        none.isInside = false;
        return none;
    }
    vec3 axisDir = ba / axisLen;
    vec3 pa = pos - entry;
    float proj = dot(pa, axisDir);
    float h = proj / axisLen;
    
    ImplantHit hit;
    hit.isInside = false;
    hit.color = col;
    hit.tAlongAxis = h;
    
    // Check if within axial range with spherical apex cap and platform coronal cap
    if (h >= -0.04 && h <= 1.05) {
        float clampedH = clamp(h, 0.0, 1.0);
        float rAtH = mix(radii.x, radii.y, clampedH);
        vec3 axisPt = entry + axisDir * (clampedH * axisLen);
        vec3 radialVec = pos - axisPt;
        float rDist = length(radialVec);
        
        // Realistic helical screw thread profile
        // Thread pitch ~ 3.2 voxels (~0.8 mm), thread amplitude ~ 0.5 voxels (~0.12 mm)
        float thread = 0.0;
        if (h >= 0.06 && h <= 0.94) {
            float threadPitch = max(1.5, axisLen * 0.08);
            thread = cos(proj * 6.2831853 / threadPitch) * (radii.x * 0.085);
        }
        float effectiveRadius = rAtH + thread;
        
        hit.distToSurface = rDist - effectiveRadius;
        if (hit.distToSurface <= 0.0) {
            hit.isInside = true;
            vec3 nRadial = (rDist > 1e-4) ? (radialVec / rDist) : vec3(0.0, 1.0, 0.0);
            float taperSlope = (radii.y - radii.x) / axisLen;
            vec3 surfNorm = normalize(nRadial - axisDir * taperSlope);
            
            // Platform top cap normal
            if (h < 0.02) {
                surfNorm = -axisDir;
            }
            // Spherical apex bottom cap normal
            else if (h > 0.98) {
                surfNorm = normalize(pos - apex);
            }
            hit.normal = surfNorm;
        }
    }
    return hit;
}

// Analytical Ray-AABB intersection in centered voxel space
// Box bounds: [-halfDim, halfDim]
vec2 intersectAABB(vec3 rayOrigin, vec3 rayDir, vec3 boxMin, vec3 boxMax) {
    vec3 safeDir = vec3(
        abs(rayDir.x) < 1e-6 ? (rayDir.x < 0.0 ? -1e-6 : 1e-6) : rayDir.x,
        abs(rayDir.y) < 1e-6 ? (rayDir.y < 0.0 ? -1e-6 : 1e-6) : rayDir.y,
        abs(rayDir.z) < 1e-6 ? (rayDir.z < 0.0 ? -1e-6 : 1e-6) : rayDir.z
    );
    vec3 invD = 1.0 / safeDir;
    vec3 t0 = (boxMin - rayOrigin) * invD;
    vec3 t1 = (boxMax - rayOrigin) * invD;
    vec3 tNearVec = min(t0, t1);
    vec3 tFarVec = max(t0, t1);
    float tNear = max(max(tNearVec.x, tNearVec.y), tNearVec.z);
    float tFar = min(min(tFarVec.x, tFarVec.y), tFarVec.z);
    return vec2(tNear, tFar);
}

// 8-point 3D Trilinear Sub-Voxel Continuous Density Sampling
float sampleHUTrilinear(vec3 pos) {
    if (pos.x < 0.0 || pos.x > u_volumeDim.x - 1.0 ||
        pos.y < 0.0 || pos.y > u_volumeDim.y - 1.0 ||
        pos.z < 0.0 || pos.z > u_volumeDim.z - 1.0) {
        return -1000.0;
    }
    vec3 i = floor(pos);
    vec3 f = pos - i;
    ivec3 i0 = ivec3(i);
    ivec3 maxCoord = ivec3(u_volumeDim) - 1;
    ivec3 i1 = min(maxCoord, i0 + 1);

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

// Metal Artifact Reduction (MAR): detects 1D high-density streak needles/spikes radiating from metal
bool isMetalStreakArtifact(vec3 pos, float huVal, vec3 rayDirection) {
    if (u_marActive == 0) return false;
    // On low/potato interaction passes with coarse step, skip expensive transverse sampling
    if (u_refineSteps == 0 && u_voxelStep >= 1.5) return false;
    
    // Only filter high-density candidates that could be streak spikes
    if (huVal < u_huMin) return false;
    
    // Construct two orthonormal basis vectors perpendicular to rayDirection
    vec3 w = normalize(rayDirection);
    vec3 up = (abs(w.y) < 0.9) ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
    vec3 u = normalize(cross(up, w));
    vec3 v = cross(w, u);
    
    // Sampling radius transverse to the ray (1.5 voxels, ~0.6 mm)
    float r = 1.5;
    
    // Sample transverse neighbors around candidate voxel
    float hUpos = sampleHUTrilinear(pos + u * r);
    float hUneg = sampleHUTrilinear(pos - u * r);
    float hVpos = sampleHUTrilinear(pos + v * r);
    float hVneg = sampleHUTrilinear(pos - v * r);
    
    // Real bone is a continuous 2D/3D plate or volume:
    // It has continuity along at least one transverse axis (U or V)
    bool hasUContinuity = (hUpos >= u_huMin * 0.70) && (hUneg >= u_huMin * 0.70);
    bool hasVContinuity = (hVpos >= u_huMin * 0.70) && (hVneg >= u_huMin * 0.70);
    
    if (hasUContinuity || hasVContinuity) {
        return false;
    }
    
    // Check diagonal transverse support
    float diagR = r * 0.707;
    float hD1 = sampleHUTrilinear(pos + (u + v) * diagR);
    float hD2 = sampleHUTrilinear(pos - (u + v) * diagR);
    if ((hD1 >= u_huMin * 0.70) && (hD2 >= u_huMin * 0.70)) {
        return false;
    }
    
    // Count how many transverse neighbors have bone density
    int boneSupportCount = 0;
    if (hUpos >= u_huMin * 0.65) boneSupportCount++;
    if (hUneg >= u_huMin * 0.65) boneSupportCount++;
    if (hVpos >= u_huMin * 0.65) boneSupportCount++;
    if (hVneg >= u_huMin * 0.65) boneSupportCount++;
    
    float avgTransverseHU = (hUpos + hUneg + hVpos + hVneg) * 0.25;
    
    // Streak needle condition: isolated in transverse plane, surrounded by air/soft tissue
    if (boneSupportCount <= 1 && avgTransverseHU < u_huMin * 0.45) {
        return true;
    }
    
    return false;
}

void main() {
    float maxDim = max(1.0, max(u_volumeDim.x, max(u_volumeDim.y, u_volumeDim.z)));
    float safeZoom = max(0.01, u_zoom);
    float scale = max(1e-5, (min(u_resolution.x, u_resolution.y) / maxDim) * safeZoom * 0.95);
    
    vec2 screenPixel = v_uv * u_resolution;
    vec2 center = u_resolution * 0.5 + u_pan;
    
    float viewX = (screenPixel.x - center.x) / scale;
    float viewY = -(screenPixel.y - center.y) / scale;
    
    // Camera ray direction (Column 2 of rotation matrix)
    vec3 rayDir = normalize(u_rotMatrix[2]);
    
    // Screen plane point centered at origin
    vec3 planePt = u_rotMatrix[0] * viewX + u_rotMatrix[1] * viewY;
    
    // Place camera origin safely outside the volume bounding box opposite to ray direction
    float boxDiag = maxDim * 1.75;
    vec3 camOrigin = planePt - rayDir * boxDiag;
    
    vec3 halfDim = u_volumeDim * 0.5;
    vec2 tHit = intersectAABB(camOrigin, rayDir, -halfDim, halfDim);
    
    float tNear = max(0.0, tHit.x);
    float tFar = min(boxDiag * 2.5, tHit.y);
    
    // If ray misses skull AABB or is NaN, instant discard (render background #09090b or 0 in G-Buffer)
    if (isnan(tNear) || isnan(tFar) || tNear >= tFar) {
        fragColor = (u_renderMode == 1) ? vec4(0.0, 0.0, 0.0, 0.0) : vec4(0.035, 0.035, 0.043, 1.0); // #09090b
        return;
    }
    
    float rayDist = tFar - tNear;
    int safeMaxSteps = clamp(u_maxSteps, 1, 200);
    float stepSize = max(0.25, (u_voxelStep > 0.05 ? u_voxelStep : rayDist / float(safeMaxSteps)));
    int actualSteps = int(clamp(ceil(rayDist / stepSize), 1.0, float(safeMaxSteps)));
    float dt = rayDist / float(actualSteps);
    
    vec3 curPos = camOrigin + rayDir * tNear + halfDim;
    vec3 stepVec = rayDir * dt;
    
    bool hit = false;
    bool hitIsImplant = false;
    vec3 implantHitColor = vec3(0.0, 1.0, 0.45);
    float implantBlendWeight = 0.0;
    vec3 implantBlendNorm = vec3(0.0);
    float maxHU = -1000.0;
    float hitDepth = 0.0;
    vec3 norm = vec3(0.0);
    
    for (int i = 0; i < actualSteps; i++) {
        // Interactive 3D Volume Clipping Box (normalized UVW [0, 1])
        vec3 normPos = curPos / u_volumeDim;
        if (normPos.x < u_clipMin.x || normPos.x > u_clipMax.x ||
            normPos.y < u_clipMin.y || normPos.y > u_clipMax.y ||
            normPos.z < u_clipMin.z || normPos.z > u_clipMax.z) {
            curPos += stepVec;
            continue;
        }

        // 1. Direct hit check on implant fixture in open air or above bone
        if (!hit && u_implantCount > 0) {
            for (int k = 0; k < 4; k++) {
                if (k >= u_implantCount) break;
                ImplantHit impHit = evaluateImplantAt(curPos, k);
                if (impHit.isInside) {
                    hit = true;
                    hitIsImplant = true;
                    hitDepth = float(i + 1) / float(actualSteps);
                    norm = impHit.normal;
                    if (dot(norm, -rayDir) < 0.0) norm = -norm;
                    implantHitColor = impHit.color;
                    break;
                }
            }
            if (hitIsImplant) {
                break; // Stop ray: solid titanium implant reached in air
            }
        }

        ivec3 vox = ivec3(floor(curPos));
        if (vox.x >= 0 && vox.x < int(u_volumeDim.x) &&
            vox.y >= 0 && vox.y < int(u_volumeDim.y) &&
            vox.z >= 0 && vox.z < int(u_volumeDim.z)) {
            
            // Continuous density sampling (trilinear in beauty pass, fast texel in interaction)
            float hu = (u_refineSteps > 0)
                ? sampleHUTrilinear(curPos)
                : float(texelFetch(u_volume, vox, 0).r);
            
            // MAR: Metal Artifact Reduction - skip isolated streak needles/spikes
            if (u_marActive == 1 && isMetalStreakArtifact(curPos, hu, rayDir)) {
                curPos += stepVec;
                continue;
            }
            
            if (u_presetMode == 1) { // MIP
                if (hu > maxHU) {
                    maxHU = hu;
                    if (maxHU >= 2500.0 || maxHU >= u_huMax) {
                        break;
                    }
                }
            } else {
                bool isHit = (u_presetMode == 2)
                    ? (hu >= u_huMin && hu <= u_huMax)
                    : (hu >= u_huMin);
                if (isHit) {
                    hit = true;
                    hitIsImplant = false;
                    vec3 hitPos = curPos;
                    // Sub-voxel bisection refinement (4 steps) on mouseUp (u_refineSteps > 0)
                    if (u_refineSteps > 0) {
                        vec3 p0 = curPos - stepVec;
                        vec3 p1 = curPos;
                        for (int b = 0; b < 4; b++) {
                            if (b >= u_refineSteps) break;
                            vec3 pm = (p0 + p1) * 0.5;
                            float h = sampleHUTrilinear(pm);
                            bool hHit = (u_presetMode == 2) ? (h >= u_huMin && h <= u_huMax) : (h >= u_huMin);
                            if (hHit) p1 = pm; else p0 = pm;
                        }
                        hitPos = (p0 + p1) * 0.5;
                    }
                    hitDepth = float(i + 1) / float(actualSteps);
                    
                    // Central differences normal computation:
                    vec3 grad;
                    if (u_refineSteps > 0) {
                        float eps = 0.85;
                        float gx = sampleHUTrilinear(hitPos + vec3(eps, 0.0, 0.0)) - sampleHUTrilinear(hitPos - vec3(eps, 0.0, 0.0));
                        float gy = sampleHUTrilinear(hitPos + vec3(0.0, eps, 0.0)) - sampleHUTrilinear(hitPos - vec3(0.0, eps, 0.0));
                        float gz = sampleHUTrilinear(hitPos + vec3(0.0, 0.0, eps)) - sampleHUTrilinear(hitPos - vec3(0.0, 0.0, eps));
                        grad = vec3(gx, gy, gz);
                    } else {
                        ivec3 vHit = clamp(ivec3(floor(hitPos)), ivec3(1), ivec3(u_volumeDim) - 2);
                        float gx = float(texelFetch(u_volume, vHit + ivec3(1, 0, 0), 0).r) - float(texelFetch(u_volume, vHit - ivec3(1, 0, 0), 0).r);
                        float gy = float(texelFetch(u_volume, vHit + ivec3(0, 1, 0), 0).r) - float(texelFetch(u_volume, vHit - ivec3(0, 1, 0), 0).r);
                        float gz = float(texelFetch(u_volume, vHit + ivec3(0, 0, 1), 0).r) - float(texelFetch(u_volume, vHit - ivec3(0, 0, 1), 0).r);
                        grad = vec3(gx, gy, gz);
                    }
                    float gLen = length(grad);
                    // Outward surface normal points toward lower density (from bone into air)
                    // For airway, surface normal points inward toward cavity lumen
                    norm = gLen > 0.001
                        ? (u_presetMode == 2 ? normalize(grad) : -normalize(grad))
                        : -rayDir;
                    // Ensure normal faces toward the camera
                    if (dot(norm, -rayDir) < 0.0) {
                        norm = -norm;
                    }

                    // Volumetric X-Ray Penetration: check if implant sits inside the mandibular alveolar bone along this ray
                    // Implements realistic Beer-Lambert physical attenuation through cortical/trabecular bone
                    if (u_implantCount > 0) {
                        vec3 probePos = hitPos;
                        float accumulatedBoneDensity = 0.0;
                        int numProbeSteps = 24;
                        float probeStepSize = 0.75;
                        
                        for (int pStep = 1; pStep <= numProbeSteps; pStep++) {
                            probePos += stepVec * probeStepSize;
                            float probeHu = sampleHUTrilinear(probePos);
                            accumulatedBoneDensity += max(0.0, probeHu - u_huMin);
                            
                            for (int k = 0; k < 4; k++) {
                                if (k >= u_implantCount) break;
                                ImplantHit deepHit = evaluateImplantAt(probePos, k);
                                if (deepHit.isInside) {
                                    float distInsideBone = float(pStep) * probeStepSize;
                                    // Physics-based exponential bone attenuation:
                                    // Thin cortical bone (<1.5 mm): subtle translucent glow
                                    // Deep bone (>3 mm): completely occluded by bone opacity
                                    float boneThicknessAttenuation = exp(-distInsideBone * 0.35);
                                    float densityAttenuation = exp(-accumulatedBoneDensity * 0.001);
                                    float totalTransmittance = boneThicknessAttenuation * densityAttenuation;
                                    
                                    // Maximum subsurface weight is 0.28 (soft translucent sheen, never blasting neon)
                                    implantBlendWeight = clamp(totalTransmittance * 0.28, 0.0, 0.28);
                                    implantHitColor = deepHit.color;
                                    implantBlendNorm = deepHit.normal;
                                    if (dot(implantBlendNorm, -rayDir) < 0.0) implantBlendNorm = -implantBlendNorm;
                                    break;
                                }
                            }
                            if (implantBlendWeight > 0.0) break;
                        }
                    }
                    break;
                }
            }
        }
        curPos += stepVec;
    }
    
    if (u_presetMode == 1) { // MIP
        if (maxHU > u_huMin) {
            float huSpan = max(1.0, u_huMax - u_huMin);
            float n = clamp((maxHU - u_huMin) / huSpan, 0.0, 1.0);
            float clinicalPeak = 178.0 / 255.0; // Enamel burnout safeguard ceiling <= 180/255
            vec3 mipColor = u_boneColor * (n * clinicalPeak);
            if (u_renderMode == 1) {
                vec3 c255 = mipColor * 255.0;
                float packedRB = (floor(c255.r) + floor(c255.b) * 256.0) / 65535.0;
                fragColor = vec4(packedRB, floor(c255.g) / 255.0, u_objectId / 255.0, 0.5);
            } else {
                fragColor = vec4(mipColor, 1.0);
            }
        } else {
            if (u_renderMode == 1) {
                fragColor = vec4(0.0, 0.0, 0.0, 0.0);
            } else {
                fragColor = vec4(0.0, 0.0, 0.0, 1.0);
            }
        }
    } else if (hit) {
        // --- VATECH EZ3D TWO-SIDED CLINICAL SHADING ENGINE ---
        // Prevents cavities, root canals, and maxillary sinuses from collapsing into pitch-black voids.
        vec3 viewDir = -rayDir;
        // Directional key light from upper-front-right relative to camera (Vatech Zeus3D)
        vec3 lightDir = normalize(viewDir * 0.80 + u_rotMatrix[0] * 0.35 + u_rotMatrix[1] * 0.45);
        vec3 halfVec = normalize(lightDir + viewDir);

        if (hitIsImplant) {
            // METALLIC TITANIUM SURGICAL IMPLANT SHADING (Vivid Emerald Neon Green)
            float NdotL = abs(dot(norm, lightDir));
            float ambient = 0.35;
            float diffuse = NdotL * 0.65;
            float NdotH = max(0.0, dot(norm, halfVec));
            float spec = pow(NdotH, 36.0) * 0.45;
            float NdotV = max(0.0, abs(dot(norm, viewDir)));
            float rim = pow(1.0 - NdotV, 3.0) * 0.25;

            vec3 litImplant = implantHitColor * (ambient + diffuse + rim) + vec3(0.85, 1.0, 0.90) * spec;
            if (u_renderMode == 1) {
                fragColor = vec4(litImplant.r, litImplant.g, 3.0 / 255.0, hitDepth);
            } else {
                fragColor = vec4(clamp(litImplant, 0.0, 1.0), 1.0);
            }
        } else {
            // Two-sided diffuse response (abs eliminates darkness in maxillary sinuses and mandibular canals)
            // Formula: fDiff = abs(dot(-lightDir, norm))
            float NdotL = abs(dot(norm, lightDir));

            // Vatech Ez3D weighting: 25% Ambient Floor + 75% Diffuse Amplitude (OBJShader.fx)
            float ambient = 0.25;
            float diffuse = NdotL * 0.75;

            // Blinn-Phong half-vector for enamel specular highlight
            float NdotH = max(0.0, abs(dot(norm, halfVec)));
            float spec = pow(NdotH, 24.0) * 0.12;

            // Cortical plate rim lighting
            float NdotV = max(0.0, abs(dot(norm, viewDir)));
            float rim = pow(1.0 - NdotV, 3.0) * 0.10;

            float depthFade = 1.0 - hitDepth * 0.12;
            // Clinical soft-knee highlight ceiling (strictly <= 178/255 to eliminate enamel blinding burnout)
            float clinicalCeiling = 178.0 / 255.0;

            vec3 rawLit = u_boneColor * (ambient + diffuse * depthFade + rim) + vec3(0.95, 0.92, 0.88) * spec;
            vec3 lit = clamp(min(rawLit, vec3(clinicalCeiling)), 0.0, 1.0);

            // Subsurface implant glow through alveolar bone:
            // "в кости то просвечивают слегка, полупрозрачно. реалистично чтобы видно было"
            if (implantBlendWeight > 0.005) {
                float impNdotL = abs(dot(implantBlendNorm, lightDir));
                float impSpec = pow(max(0.0, dot(implantBlendNorm, halfVec)), 28.0) * 0.35;
                vec3 litImplantInside = implantHitColor * (0.30 + impNdotL * 0.70) + vec3(0.85, 1.0, 0.90) * impSpec;
                // Soft translucent subsurface blend: anatomical bone dominates with delicate submerged hint
                lit = mix(lit, lit * 0.75 + litImplantInside * 0.40, implantBlendWeight);
            }

            if (u_renderMode == 1) {
                // Vatech Ez3D G-Buffer Encoding (OBJShader.fx adaptation for WebGL2):
                fragColor = vec4(lit.r, lit.g, u_objectId / 255.0, hitDepth);
            } else {
                fragColor = vec4(lit, 1.0);
            }
        }
    } else {
        if (u_renderMode == 1) {
            fragColor = vec4(0.0, 0.0, 0.0, 0.0);
        } else {
            fragColor = vec4(0.0, 0.0, 0.0, 1.0);
        }
    }
}
`;
