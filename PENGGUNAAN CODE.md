# Google Open Buildings Building Height Mapping
## Case Study: Balikpapan City Indonesia


## Overview

Repository ini berisi workflow Google Earth Engine
untuk ekstraksi footprint dan estimasi tinggi bangunan
menggunakan:

- Google Open Buildings V3
- Google Open Buildings Temporal V1


## Dataset

### Open Buildings V3

Function:
- Building footprint extraction
- Polygon building outline


### Open Buildings Temporal V1

Function:
- Building height estimation
- Annual temporal information


## Study Area

Balikpapan City,
East Kalimantan,
Indonesia.


## Workflow

1. Load administrative boundary
2. Extract building footprint
3. Filter confidence >= 0.75
4. Retrieve building height 2023
5. Extract height per polygon
6. Export shapefile


## Output

Each building polygon contains:

- bldg_id
- area_m2
- confidence
- hmed_m
- year
