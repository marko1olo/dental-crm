# Implementation Plan — Ultimate Anatomical Odontogram Pro, Shaders, Restorations & Clinical Ergonomics Overhaul

## R1: Photorealistic Multi-Root Anatomical Vector Engine & Shader Library
1. Morphological Path Definitions (`apps/web/src/components/odontogram/anatomicalToothPaths.ts`):
   - Upper molars (16, 17, 18, 26, 27, 28): 3 distinct roots (Mesio-Buccal, Disto-Buccal, Palatal) with realistic curvature, bifurcation/trifurcation shadows, and CEJ cervical margin.
   - Lower molars (46, 47, 48, 36, 37, 38): 2 distinct roots (Mesial with 2 canals, Distal with 1-2 canals) with interradicular bone crest gap.
   - Premolars (14/24): 2 bifurcated roots (buccal & palatal) + single root for 15/25/34/35/44/45 with developmental grooves.
   - Canines & Incisors (13..11, 21..23, 43..41, 31..33): Long tapered single roots, cingulum, incisal edges.
   - Primary / Pediatric teeth (55..51, 61..65, 85..81, 71..75): Bulbous crowns, pronounced cervical constriction, flared molar roots for premolar buds.
2. SVG Shader Defs & Visual Textures (`apps/web/src/components/odontogram/AnatomicalSvgDefs.tsx`):
   - Natural Enamel gradient & specular highlights.
   - Pulp Chamber & Canal paths extending down into each individual root.
   - Periapical Pathology halo (granuloma, cyst) at root apex.

## R2: Complete Dental Restorations & Surgical Pathologies
1. Restorative Treatment Shaders & Surface Overlays:
   - Photopolymer composite: tooth-colored fills with distinct MOD / MO / DO / O / V / L / Class V cervical margins.
   - Amalgam restoration: silver/metallic burnished texture.
   - Ceramic inlays / onlays / overlays: translucent E.max porcelain with marginal micro-gap.
   - Full Crowns: PFM (with cervical metal collar), All-Ceramic, Monolithic Zirconia (anatomical fissure lines), Gold Cast Crown, Temporary Acrylic Crown.
   - Bridges & Suspended Pontics: Bridge span connectors between abutment crowns and missing tooth pontics with hygienic basal clearance.
   - Veneers: Labial ceramic laminate shells.
   - Cult tabs (Культевые штифтовые вкладки): Cast metal and zirconia core posts.
2. Endodontics & Canals:
   - Gutta-percha obturation (hermetic root canal filling with apex stop).
   - Fiber glass posts (Стекловолоконные штифты) in canals.
   - Unfinished/In-Progress root canal treatment with temporary filling.
   - Resorption / Broken instrument in canal indicator.
3. Implants & Surgery:
   - Threaded Titanium Fixture (micro-threaded collar, spiral self-tapping threads, apical venting).
   - Healing Abutment (формирователь десны) and Angled Zirconia/Ti Abutments.
   - Missing tooth indicator (0 / Extraction socket with healing bone trabeculae).
   - Bone Resorption & Periodontal pockets (depth in mm, furcation involvement I–III).

## R3: Radial Tooth HUD & Ergonomic Multi-Tool Bar
1. Radial Tooth HUD (`RadialToothMenu.tsx`):
   - Non-overlapping 8-slice pie menu (r=145px) with glassmorphism disc backdrop, high-contrast action pills, and 1-key instant hotkeys.
   - Quick sub-drawers for Endodontics canal depth logger, Periodontal probing chart, and Live Invoice itemization.
2. 1-Click Quick Layers & Batch Actions:
   - Toggle Wisdom Teeth (8-ки), X-Ray / Canal mode, 1-Click Fast Extraction, Pediatric primary dentition, AI Diagnocat heatmap overlay.

## R4: Multi-Agent Ruthless Self-Critique & 4-State Visual Verification
1. Verification of all static gates:
   - `node scripts/check-encoding.mjs`
   - `node scripts/check-css-tokens.mjs`
   - `npm run typecheck -w @dental/web`
   - `npm test -w @dental/web`
2. Automated visual capture of 4 states across themes (Mobile Light, Mobile Dark, PC Light, PC Dark) + Odontogram Studio states.
3. Multimodal vision self-critique and defect fixing.
