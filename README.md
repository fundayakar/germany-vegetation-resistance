# Hydrological Control of Vegetation Resistance to Climate Variability in Germany

This repository contains the data and code used to analyze vegetation response to climate variability across Germany using MODIS NDVI and ERA5-Land climate data (2017–2024).

## Overview

The study investigates how vegetation responds to climate variability and identifies the dominant role of soil moisture in shaping vegetation dynamics. It further examines differences across land cover types and spatial patterns during extreme drought conditions.

## Data sources

- MODIS NDVI (MOD13Q1, Collection 6.1)
- ERA5-Land climate data (temperature and soil moisture)

## Repository structure

- `data/` — processed dataset used in the analysis  
- `python/` — regression models and figure generation scripts  
- `gee/` — Google Earth Engine scripts for data processing  
- `figures/` — final figures used in the manuscript  

## Reproducibility

1. Run the GEE script in `gee/` to generate NDVI anomaly data  
2. Load the dataset from `data/`  
3. Run regression models using `python/01_regression_analysis.py`  
4. Generate Figure 1 using `python/02_generate_figures.py`  
5. Figure 2 was produced in QGIS  

## Main findings

- Vegetation response is primarily driven by soil moisture rather than temperature  
- Temperature influences vegetation indirectly through its effect on soil moisture  
- Croplands are more sensitive to drought, while forests show greater resistance  
- Vegetation response varies spatially under extreme drought conditions  

## Author

Funda Yakar
