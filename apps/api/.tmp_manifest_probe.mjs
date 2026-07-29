const { parseImagingManifest } = await import("./dist/imaging/manifestParser.js").catch(() => import("./src/imaging/manifestParser.ts"));
const r = await parseImagingManifest({
  sourceName: "probe", sourceKind: "folder_watch",
  rawText: "/path/to/some/image/file.jpg Иванова Марина Сергеевна +7 (900) 555-55-55 01.01.2023 ОПТГ 11",
});
console.log(JSON.stringify({ total: r.totalRows, row: r.rows[0] }, null, 1).slice(0, 900));
