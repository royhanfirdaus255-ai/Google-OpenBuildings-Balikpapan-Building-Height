// =============================================================
// MODUL OPEN BUILDINGS - KOTA BALIKPAPAN
// Open Buildings V3 + Temporal V1, height tahun 2023
// Versi dokumen: 2.0 | 31 Agustus 2026
// =============================================================
// =============================================================
// 0. KONFIGURASI - WAJIB PERIKSA
// =============================================================
var CONFIG = {
 aoiAsset:
 'projects/balikpapan-buildings-density/assets/' +
 'Batas_Wilayah_Kelurahan_Kota_Balikpapan',
 targetYear: 2023,
 v3Confidence: 0.75,
 presenceThreshold: 0.50,
 analysisScale: 4,
 analysisCrs: 'EPSG:32750',
 tileScale: 4,
 maxPixelsPerRegion: 1000000,
 testLimit: 1000,
 driveFolder: 'GEE_OB_BPN_2023'
};
// =============================================================
// 1. AOI
// =============================================================
var adminUnits = ee.FeatureCollection(CONFIG.aoiAsset);
var aoi = adminUnits.geometry();
print('AOI FeatureCollection:', adminUnits);
print('Jumlah unit administrasi:', adminUnits.size());
print('Field AOI:', adminUnits.first().propertyNames());
print('Luas AOI (km2):', aoi.area(1).divide(1e6));
Map.centerObject(aoi, 11);
Map.setOptions('SATELLITE');
Map.addLayer(
 adminUnits.style({
 color: 'FFFF00',
 fillColor: '00000000',
 width: 2
 }),
 {},
 'Batas Kota Balikpapan'
);

var test = ee.FeatureCollection(
  'projects/balikpapan-buildings-density/assets/Batas_Wilayah_Kelurahan_Kota_Balikpapan'
);

print(test);
// =============================================================
// 2. OPEN BUILDINGS V3 POLYGONS
// =============================================================
var buildingsRaw = ee.FeatureCollection(
 'GOOGLE/Research/open-buildings/v3/polygons'
).filterBounds(aoi);
print('Contoh feature V3:', buildingsRaw.first());
print('Field V3:', buildingsRaw.first().propertyNames());
var buildingsFiltered = buildingsRaw.filter(
 ee.Filter.gte('confidence', CONFIG.v3Confidence)
);
var buildingsPrepared = buildingsFiltered.map(function(f) {
 return ee.Feature(f.geometry(), {
 bldg_id: f.id(),
 area_m2: f.get('area_in_meters'),
 conf_v3: f.get('confidence'),
 plus_code: f.get('full_plus_code')
 });
});
print('Footprint setelah filter:', buildingsFiltered.size());
print('Contoh atribut V3 bersih:', buildingsPrepared.first());
Map.addLayer(
 buildingsPrepared,
 {color: '00FFFF'},
 'V3 | confidence >= ' + CONFIG.v3Confidence,
 false
);
// =============================================================
// 3. OPEN BUILDINGS TEMPORAL V1
// =============================================================
var temporal = ee.ImageCollection(
 'GOOGLE/Research/open-buildings-temporal/v1'
).filterBounds(aoi);
var startDate = ee.Date.fromYMD(CONFIG.targetYear, 1, 1);
var endDate = startDate.advance(1, 'year');
var temporalYearCollection = temporal.filterDate(startDate, endDate);
print('Jumlah tile tahun target:', temporalYearCollection.size());
var temporalYear = temporalYearCollection
 .mosaic()
 .clip(aoi);
print('Band tahun target:', temporalYear.bandNames());
var presence2023 = temporalYear.select('building_presence');
var fractionalCount2023 = temporalYear.select(
 'building_fractional_count'
);
var height2023 = temporalYear.select('building_height');
print('Proyeksi height:', height2023.projection());
print(
 'Nominal scale height:',
 height2023.projection().nominalScale()
);
Map.addLayer(
 presence2023,
 {min: 0, max: 1, palette: ['000000', 'FFFF00', 'FF0000']},
 'Building Presence 2023',
 false
);
Map.addLayer(
 fractionalCount2023,
 {
 min: 0,
 max: 0.0216,
 palette: ['FFFFFF', 'FFFF00', 'FF8800', 'FF0000']
 },
 'Fractional Building Count 2023',
 false
);
Map.addLayer(
 height2023,
 {
 min: 0,
 max: 40,
 palette: ['FFFFCC', 'FEB24C', 'FD8D3C', 'E31A1C', '800026']
 },
 'Building Height 2023',
 false
);
// =============================================================
// 4. MASK HEIGHT
// =============================================================
var heightMasked2023 = height2023.updateMask(
 presence2023.gte(CONFIG.presenceThreshold)
);
Map.addLayer(
 heightMasked2023,
 {
 min: 0,
 max: 40,
 palette: ['FFFFCC', 'FEB24C', 'FD8D3C', 'E31A1C', '800026']
 },
 'Height 2023 | presence >= ' + CONFIG.presenceThreshold,
 false
);

// =============================================================
// 5. REDUCER DAN FUNGSI CLEAN
// =============================================================
var heightForStats = heightMasked2023.rename('h');
var heightReducer = ee.Reducer.mean()
 .combine({
 reducer2: ee.Reducer.median(),
 sharedInputs: true
 })
 .combine({
 reducer2: ee.Reducer.max(),
 sharedInputs: true
 })
 .combine({
 reducer2: ee.Reducer.count(),
 sharedInputs: true
 });
function cleanHeightFeature(f) {
 var qcValid = ee.Number(
 ee.Algorithms.If(
 ee.Algorithms.IsEqual(f.get('h_median'), null),
 0,
 1
 )
 );
 return ee.Feature(f.geometry(), {
 bldg_id: f.get('bldg_id'),
 area_m2: f.get('area_m2'),
 conf_v3: f.get('conf_v3'),
 plus_code: f.get('plus_code'),
 hmean_m: f.get('h_mean'),
 hmed_m: f.get('h_median'),
 hmax_m: f.get('h_max'),
 px_count: f.get('h_count'),
 qc_valid: qcValid,
 h_year: CONFIG.targetYear,
 pres_thr: CONFIG.presenceThreshold,
 scale_m: CONFIG.analysisScale
 });
}

// =============================================================
// 7. PRODUKSI PENUH
// JALANKAN HANYA SETELAH TEST DINYATAKAN LULUS.
// =============================================================
var allHeightStats = heightForStats.reduceRegions({
 collection: buildingsPrepared,
 reducer: heightReducer,
 scale: CONFIG.analysisScale,
 crs: CONFIG.analysisCrs,
 tileScale: CONFIG.tileScale,
 maxPixelsPerRegion: CONFIG.maxPixelsPerRegion
});
var finalBuildings2023 = allHeightStats.map(cleanHeightFeature);
print('Contoh keluaran final:', finalBuildings2023.first());

// =============================================================
// 9. EXPORT RASTER
// =============================================================
Export.image.toDrive({
 image: temporalYear
 .select([
 'building_presence',
 'building_fractional_count',
 'building_height'
 ])
 .toFloat(),
 description: 'OB_Temporal_BPN_2023',
 folder: CONFIG.driveFolder,
 fileNamePrefix: 'OB_Temporal_BPN_2023',
 region: aoi,
 scale: CONFIG.analysisScale,
 crs: CONFIG.analysisCrs,
 maxPixels: 1e13,
 skipEmptyTiles: true,
 fileFormat: 'GeoTIFF',
 formatOptions: {
 cloudOptimized: true
 }
});
Export.image.toDrive({
 image: heightMasked2023.toFloat(),
 description: 'OB_HeightMasked_BPN_2023_P050',
 folder: CONFIG.driveFolder,
 fileNamePrefix: 'OB_HeightMasked_BPN_2023_P050',
 region: aoi,
 scale: CONFIG.analysisScale,
 crs: CONFIG.analysisCrs,
 maxPixels: 1e13,
 skipEmptyTiles: true,
 fileFormat: 'GeoTIFF',
 formatOptions: {
 cloudOptimized: true
 }
});
