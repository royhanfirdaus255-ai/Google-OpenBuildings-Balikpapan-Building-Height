// =====================================================
// AOI BALIKPAPAN
// Google Earth Engine
// =====================================================


var balikpapan = ee.FeatureCollection(
'projects/balikpapan-buildings-density/assets/Batas_Wilayah_Kelurahan_Kota_Balikpapan'
);


print(
'Jumlah polygon:',
balikpapan.size()
);


print(
'Field:',
balikpapan.first().propertyNames()
);


Map.centerObject(
balikpapan,
11
);


Map.addLayer(
balikpapan,
{
color:'yellow'
},
'Batas Balikpapan'
);
