/***************************************
 GERMANY MODIS RESISTANCE
***************************************/

var START_YEAR = 2017;
var END_YEAR = 2024;
var EXPORT_FOLDER = 'GEE_Germany_Resistance_Outputs';

var years = ee.List.sequence(START_YEAR, END_YEAR);

var germany = ee.FeatureCollection('FAO/GAUL/2015/level0')
  .filter(ee.Filter.eq('ADM0_NAME', 'Germany'))
  .geometry();

var states = ee.FeatureCollection('FAO/GAUL/2015/level1')
  .filter(ee.Filter.eq('ADM0_NAME', 'Germany'));


/**** MODIS NDVI ****/
var modis = ee.ImageCollection('MODIS/061/MOD13Q1')
  .filterBounds(germany)
  .filterDate(
    ee.Date.fromYMD(START_YEAR, 1, 1),
    ee.Date.fromYMD(END_YEAR + 1, 1, 1)
  )
  .map(function(img) {
    return img.select('NDVI')
      .multiply(0.0001)
      .rename('NDVI')
      .copyProperties(img, ['system:time_start']);
  });


/**** ANNUAL NDVI, FILTERDATE ONLY ****/
var annualNDVI = ee.ImageCollection.fromImages(
  years.map(function(y) {
    y = ee.Number(y);

    var yearStart = ee.Date.fromYMD(y, 1, 1);
    var yearEnd = yearStart.advance(1, 'year');

    var growingStart = ee.Date.fromYMD(y, 4, 1);
    var growingEnd = ee.Date.fromYMD(y, 11, 1);

    var summerStart = ee.Date.fromYMD(y, 6, 1);
    var summerEnd = ee.Date.fromYMD(y, 9, 1);

    var annual = modis.filterDate(yearStart, yearEnd);
    var growing = modis.filterDate(growingStart, growingEnd);
    var summer = modis.filterDate(summerStart, summerEnd);

    return annual.mean().rename('annual_mean_ndvi')
      .addBands(growing.mean().rename('growing_mean_ndvi'))
      .addBands(summer.mean().rename('summer_mean_ndvi'))
      .clip(germany)
      .set('year', y)
      .set('system:time_start', yearStart.millis());
  })
);


/**** NDVI ANOMALIES ****/
var ltGrowing = annualNDVI.select('growing_mean_ndvi').mean();
var ltSummer = annualNDVI.select('summer_mean_ndvi').mean();

var annualNDVIAnom = annualNDVI.map(function(img) {
  return img
    .addBands(
      img.select('growing_mean_ndvi')
        .subtract(ltGrowing)
        .rename('anomaly_growing_mean_ndvi')
    )
    .addBands(
      img.select('summer_mean_ndvi')
        .subtract(ltSummer)
        .rename('anomaly_summer_mean_ndvi')
    )
    .copyProperties(img, img.propertyNames());
});


/**** ERA5-LAND ****/
var era5 = ee.ImageCollection('ECMWF/ERA5_LAND/MONTHLY_AGGR')
  .filterBounds(germany)
  .filterDate(
    ee.Date.fromYMD(START_YEAR, 1, 1),
    ee.Date.fromYMD(END_YEAR + 1, 1, 1)
  )
  .map(function(img) {
    var t2m = img.select('temperature_2m')
      .subtract(273.15)
      .rename('t2m_c');

    var sm = img.select('volumetric_soil_water_layer_1')
      .add(img.select('volumetric_soil_water_layer_2'))
      .divide(2)
      .rename('sm_shallow');

    return t2m.addBands(sm)
      .copyProperties(img, ['system:time_start']);
  });


/**** ANNUAL SUMMER CLIMATE, FILTERDATE ONLY ****/
var annualClimate = ee.ImageCollection.fromImages(
  years.map(function(y) {
    y = ee.Number(y);

    var summerStart = ee.Date.fromYMD(y, 6, 1);
    var summerEnd = ee.Date.fromYMD(y, 9, 1);

    var summer = era5.filterDate(summerStart, summerEnd);

    return summer.select('t2m_c').mean().rename('summer_temp_mean_c')
      .addBands(summer.select('sm_shallow').mean().rename('summer_sm_mean'))
      .clip(germany)
      .set('year', y)
      .set('system:time_start', ee.Date.fromYMD(y, 1, 1).millis());
  })
);

var ltTemp = annualClimate.select('summer_temp_mean_c').mean();
var ltSM = annualClimate.select('summer_sm_mean').mean();

var annualClimateAnom = annualClimate.map(function(img) {
  return img
    .addBands(
      img.select('summer_temp_mean_c')
        .subtract(ltTemp)
        .rename('summer_temp_anomaly')
    )
    .addBands(
      img.select('summer_sm_mean')
        .subtract(ltSM)
        .rename('summer_sm_anomaly')
    )
    .copyProperties(img, img.propertyNames());
});


/**** JOIN NDVI + CLIMATE ****/
var combined = ee.ImageCollection.fromImages(
  years.map(function(y) {
    y = ee.Number(y);

    var ndvi = ee.Image(annualNDVIAnom.filter(ee.Filter.eq('year', y)).first());
    var clim = ee.Image(annualClimateAnom.filter(ee.Filter.eq('year', y)).first());

    var img = ndvi.addBands(clim);

    var dryness = img.select('summer_sm_anomaly')
      .multiply(-1)
      .rename('dryness_anomaly');

    var stress = img.select('summer_temp_anomaly')
      .add(dryness)
      .rename('stress_score');

    var resistance = img.select('anomaly_growing_mean_ndvi')
      .divide(stress.abs().add(0.01))
      .rename('resistance_candidate');

    return img
      .addBands(dryness)
      .addBands(stress)
      .addBands(resistance)
      .set('year', y)
      .set('system:time_start', ee.Date.fromYMD(y, 1, 1).millis());
  })
);


/**** LAND COVER ****/
var lc = ee.Image('ESA/WorldCover/v200/2021')
  .select('Map')
  .clip(germany);

var lcReclass = lc.remap([10, 30, 40], [1, 2, 3]).rename('lc_class');
lcReclass = lcReclass.updateMask(lcReclass.neq(0));


/**** ZONAL STATS ****/
function statsForLC(img, lcVal, lcName) {
  var masked = img.updateMask(lcReclass.eq(lcVal));

  var stats = masked.reduceRegions({
    collection: states,
    reducer: ee.Reducer.mean(),
    scale: 5000,
    tileScale: 8
  });

  return stats.map(function(f) {
    return ee.Feature(null, {
      year: img.get('year'),
      adm1_name: f.get('ADM1_NAME'),
      lc_class: lcVal,
      lc_name: lcName,
      growing_mean_ndvi: f.get('growing_mean_ndvi'),
      anomaly_growing_mean_ndvi: f.get('anomaly_growing_mean_ndvi'),
      summer_temp_anomaly: f.get('summer_temp_anomaly'),
      summer_sm_anomaly: f.get('summer_sm_anomaly'),
      stress_score: f.get('stress_score'),
      resistance_candidate: f.get('resistance_candidate')
    });
  });
}

var zonalTable = ee.FeatureCollection(
  combined.map(function(img) {
    return statsForLC(img, 1, 'forest')
      .merge(statsForLC(img, 2, 'grassland'))
      .merge(statsForLC(img, 3, 'cropland'));
  }).flatten()
);


/**** EXPORT CSV ****/
Export.table.toDrive({
  collection: zonalTable,
  description: 'Germany_MODIS_Resistance_ZonalStats_2017_2024_NO_CALENDAR',
  folder: EXPORT_FOLDER,
  fileNamePrefix: 'Germany_MODIS_Resistance_ZonalStats_2017_2024_NO_CALENDAR',
  fileFormat: 'CSV',
  selectors: [
    'year',
    'adm1_name',
    'lc_class',
    'lc_name',
    'growing_mean_ndvi',
    'anomaly_growing_mean_ndvi',
    'summer_temp_anomaly',
    'summer_sm_anomaly',
    'stress_score',
    'resistance_candidate'
  ]
});