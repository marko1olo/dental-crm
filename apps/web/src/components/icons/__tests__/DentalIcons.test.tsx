import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DENTAL_ICONS_MAP,
  ToothMolar,
  ToothCaries,
  EndoFileCanal,
  DentalImplant,
  DentalCrown,
  DentalBridge,
  PerioProbe,
  DentalSyringe,
  ToothShadeGuide,
  ScanBodyMarker,
  DentalArticulator,
  DentalChairUnit,
  DentalMirrorProbe,
  DentalForm043,
  DentalLabOrder,
  NerveCanal,
  DentalHandpiece,
  ToothDeciduous,
  BracesBracket,
  AlignerTray,
  UltrasonicScaler,
  BoneGraft,
  ToothExtractForceps,
  Autoclave,
  ToothPulpitis,
  DentalVeneer,
  ToothIncisor,
  DentalAbutment,
  CuringLight,
  ApexLocator,
  RubberDam,
  SalivaEjector,
  DentalPanoramicArch,
  CheekRetractor,
  BleachingLamp,
  GingivaRecession,
} from "../DentalIcons";

test("DentalIcons: Catalog contains exactly 36 specialized benchmark dental icons", () => {
  const iconNames = Object.keys(DENTAL_ICONS_MAP);
  assert.equal(
    iconNames.length,
    36,
    `Expected exactly 36 icons in DENTAL_ICONS_MAP, found ${iconNames.length}`
  );
});

test("DentalIcons: Every icon is a forwardRef component with correct displayName", () => {
  for (const [name, Component] of Object.entries(DENTAL_ICONS_MAP)) {
    assert.equal(
      Component.displayName,
      name,
      `Icon ${name} should have displayName matching its export name`
    );
    assert.equal(
      typeof Component,
      "object",
      `Icon ${name} should be a React forwardRef exotic component`
    );
  }
});

test("DentalIcons: All 36 icons render valid SVG with Lucide default attributes", () => {
  for (const [name, Component] of Object.entries(DENTAL_ICONS_MAP)) {
    const html = renderToStaticMarkup(React.createElement(Component));

    assert.ok(html.startsWith("<svg"), `${name} must render an <svg> tag`);
    assert.ok(
      html.includes('viewBox="0 0 24 24"'),
      `${name} must have viewBox="0 0 24 24"`
    );
    assert.ok(
      html.includes('width="24"'),
      `${name} must have default width="24"`
    );
    assert.ok(
      html.includes('height="24"'),
      `${name} must have default height="24"`
    );
    assert.ok(
      html.includes('stroke="currentColor"'),
      `${name} must have default stroke="currentColor"`
    );
    assert.ok(
      html.includes('stroke-width="1.75"'),
      `${name} must have default stroke-width="1.75"`
    );
    assert.ok(
      html.includes('stroke-linecap="round"'),
      `${name} must have stroke-linecap="round"`
    );
    assert.ok(
      html.includes('stroke-linejoin="round"'),
      `${name} must have stroke-linejoin="round"`
    );
    assert.ok(
      html.includes("class=\"lucide "),
      `${name} must have lucide className prefix`
    );
  }
});

test("DentalIcons: Props forwarding — size, strokeWidth, color, className", () => {
  const customHtml = renderToStaticMarkup(
    React.createElement(ToothMolar, {
      size: 18,
      strokeWidth: 2,
      color: "#38bdf8",
      className: "custom-molar-icon",
    })
  );

  assert.ok(
    customHtml.includes('width="18"'),
    'Should apply custom width="18"'
  );
  assert.ok(
    customHtml.includes('height="18"'),
    'Should apply custom height="18"'
  );
  assert.ok(
    customHtml.includes('stroke-width="2"'),
    'Should apply custom stroke-width="2"'
  );
  assert.ok(
    customHtml.includes('stroke="#38bdf8"'),
    'Should apply custom stroke color'
  );
  assert.ok(
    customHtml.includes("custom-molar-icon"),
    "Should include custom className"
  );
  assert.ok(
    customHtml.includes("lucide-tooth-molar"),
    "Should retain base lucide icon class"
  );
});

test("DentalIcons: Red Team visual polish invariants for top-5 audited icons", () => {
  // 1. ToothMolar: must have Y-fissure (v-3.5 and M9.5 6l2.5 2 2.5-2), NOT the old cross
  const molarHtml = renderToStaticMarkup(React.createElement(ToothMolar));
  assert.ok(
    molarHtml.includes('d="M12 11.5v-3.5"'),
    "ToothMolar must contain anatomical Y-fissure stem"
  );
  assert.ok(
    !molarHtml.includes('d="M9.5 8.5h5"'),
    "ToothMolar must NOT contain old arithmetic cross fissure"
  );

  // 2. DentalImplant: must have angled spiral thread pitch, NOT horizontal 9.5/13/16.5
  const implantHtml = renderToStaticMarkup(React.createElement(DentalImplant));
  assert.ok(
    implantHtml.includes('x1="7" y1="9" x2="17" y2="10"'),
    "DentalImplant must have angled helical thread pitch"
  );
  assert.ok(
    implantHtml.includes('d="M10.5 21.5l1.5-2.2 1.5 2.2"'),
    "DentalImplant must contain apical self-tapping flute notch"
  );

  // 3. ToothCaries: full anatomical molar contour + clean closed caries cavity
  const cariesHtml = renderToStaticMarkup(React.createElement(ToothCaries));
  assert.ok(
    cariesHtml.includes('cx="17.2" cy="5.6"'),
    "ToothCaries must contain clean closed cavity ellipse defect"
  );
  assert.ok(
    cariesHtml.includes('d="M6 12c-1.5-1-2-2.2-2-4'),
    "ToothCaries must have complete unbroken molar roots and bifurcation"
  );

  // 4. DentalArticulator: must have streamlined non-redundant geometry
  const articulatorHtml = renderToStaticMarkup(
    React.createElement(DentalArticulator)
  );
  assert.ok(
    articulatorHtml.includes('cx="6" cy="11" r="2"'),
    "DentalArticulator must have clean condylar sphere joint"
  );

  // 5. DentalCrown: must have cervical preparation finish line, NOT igloo arch
  const crownHtml = renderToStaticMarkup(React.createElement(DentalCrown));
  assert.ok(
    crownHtml.includes('d="M5.5 15.5c2-1 4.2-1.5 6.5-1.5s4.5.5 6.5 1.5"'),
    "DentalCrown must contain natural cervical preparation margin"
  );

  // 6. ToothShadeGuide: authentic VITA shade tab with holder, pin and crown key
  const shadeHtml = renderToStaticMarkup(React.createElement(ToothShadeGuide));
  assert.ok(
    shadeHtml.includes('x="7" y="16" width="10" height="6"'),
    "ToothShadeGuide must have rectangular tab holder at bottom"
  );
  assert.ok(
    shadeHtml.includes('d="M8 2.5h8'),
    "ToothShadeGuide must have anatomical sample tooth key at top"
  );

  // 7. NerveCanal: mandible profile with tubular IAN and mental foramen
  const nerveHtml = renderToStaticMarkup(React.createElement(NerveCanal));
  assert.ok(
    nerveHtml.includes('cx="8" cy="11.5" r="1.5"'),
    "NerveCanal must have mental foramen exit ring"
  );
  assert.ok(
    nerveHtml.includes('d="M3 12c3 0 7-.5 10-2.5l3-5.5'),
    "NerveCanal must have anatomical mandible bone contour"
  );

  // 8. DentalHandpiece: MK-dent photo replica (Midwest coupling + S-curve handle + 18° rotor head + push-button + FG bur)
  const handpieceHtml = renderToStaticMarkup(React.createElement(DentalHandpiece));
  assert.ok(
    handpieceHtml.includes('width="3.8" height="4.6"'),
    "DentalHandpiece must have proportional miniature rotor head"
  );
  assert.ok(
    handpieceHtml.includes('x1="14" y1="2.2" x2="15.8" y2="2.8"'),
    "DentalHandpiece must have low-profile push-button cap"
  );
  assert.ok(
    handpieceHtml.includes('x1="11" y1="5.6" x2="7" y2="4"'),
    "DentalHandpiece must have FG diamond bur shank"
  );
  assert.ok(
    handpieceHtml.includes('cx="6.4" cy="3.8"'),
    "DentalHandpiece must have spherical diamond bur tip"
  );
  assert.ok(
    handpieceHtml.includes('x1="9.5" y1="20" x2="14.5" y2="20"'),
    "DentalHandpiece must have Midwest quick-coupling collar"
  );

  // 9. UltrasonicScaler: straight handpiece + sickle scaler tip + vibration waves
  const scalerHtml = renderToStaticMarkup(React.createElement(UltrasonicScaler));
  assert.ok(
    scalerHtml.includes('d="M12 12l2.5-2.5c1.5-1.5 3.5-1.5 5 0'),
    "UltrasonicScaler must have slender sickle scaler hook tip"
  );
  assert.ok(
    scalerHtml.includes('d="M20 11.5c2 0 3.5 1.5 3.5 3.5"'),
    "UltrasonicScaler must have ultrasonic vibration waves at working tip"
  );

  // 10. DentalVeneer: sagittal incisor with chamfer shelf + adhering ceramic veneer shell
  const veneerHtml = renderToStaticMarkup(React.createElement(DentalVeneer));
  assert.ok(
    veneerHtml.includes('d="M9 21.5 C7 19 5.5 16 5 13.5'),
    "DentalVeneer must have anatomical sagittal incisor tooth core"
  );
  assert.ok(
    veneerHtml.includes('d="M14 14.5 c1.8-3.5 1.8-8.5-.5-12 H9.5"'),
    "DentalVeneer must have adhering ceramic veneer shell over facial surface"
  );
  assert.ok(
    veneerHtml.includes('stroke-dasharray="1 1.5"'),
    "DentalVeneer must contain internal pulp canal"
  );

  // 11. ToothIncisor: smooth single-path central incisor with single conical root
  const incisorHtml = renderToStaticMarkup(React.createElement(ToothIncisor));
  assert.ok(
    incisorHtml.includes('d="M12 2.5c-.8 2.5-1.7 5-2 7.5'),
    "ToothIncisor must have smooth anatomical central incisor contour"
  );

  // 12. CuringLight: pen wand handle + button + shield disk + curved guide + focused rays
  const curingHtml = renderToStaticMarkup(React.createElement(CuringLight));
  assert.ok(
    curingHtml.includes('x1="7.5" y1="10.5" x2="12.5" y2="15.5"'),
    "CuringLight must have protective glare shield disk on guide"
  );
  assert.ok(
    curingHtml.includes('d="M3 18c-.8.8-.8 1.8 0 2.5s1.8.8 2.5 0"'),
    "CuringLight must have ergonomic pen wand handle"
  );
  assert.ok(
    curingHtml.includes('cx="6.5" cy="16.5" r=".8"'),
    "CuringLight must have power button on wand handle"
  );
  assert.ok(
    curingHtml.includes('x1="19.5" y1="12" x2="22.5" y2="14"'),
    "CuringLight must have focused curing rays"
  );
});

test("DentalIcons: Individual named exports match all 36 canonical icons", () => {
  const namedIcons = [
    ToothMolar,
    ToothCaries,
    EndoFileCanal,
    DentalImplant,
    DentalCrown,
    DentalBridge,
    PerioProbe,
    DentalSyringe,
    ToothShadeGuide,
    ScanBodyMarker,
    DentalArticulator,
    DentalChairUnit,
    DentalMirrorProbe,
    DentalForm043,
    DentalLabOrder,
    NerveCanal,
    DentalHandpiece,
    ToothDeciduous,
    BracesBracket,
    AlignerTray,
    UltrasonicScaler,
    BoneGraft,
    ToothExtractForceps,
    Autoclave,
    ToothPulpitis,
    DentalVeneer,
    ToothIncisor,
    DentalAbutment,
    CuringLight,
    ApexLocator,
    RubberDam,
    SalivaEjector,
    DentalPanoramicArch,
    CheekRetractor,
    BleachingLamp,
    GingivaRecession,
  ];

  assert.equal(namedIcons.length, 36);
  for (const Icon of namedIcons) {
    assert.ok(Icon, "Exported icon component must be defined");
    const rendered = renderToStaticMarkup(React.createElement(Icon));
    assert.ok(rendered.length > 50, "Rendered SVG markup must be non-empty");
  }
});
