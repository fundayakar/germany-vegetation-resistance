import pandas as pd
import statsmodels.formula.api as smf

# =========================
# Load data
# =========================
DATA_PATH = "data/Germany_MODIS_Resistance_ZonalStats_2017_2024_NO_CALENDAR.csv"

df = pd.read_csv(DATA_PATH)
df = df.dropna()

df["lc_name"] = df["lc_name"].astype("category")
df["adm1_name"] = df["adm1_name"].astype("category")
df["year"] = df["year"].astype("category")

print("Dataset shape:", df.shape)
print(df.head())


# =========================
# Model 1: climate effects with region and year fixed effects
# =========================
m1 = smf.ols(
    "anomaly_growing_mean_ndvi ~ summer_temp_anomaly + summer_sm_anomaly + C(lc_name) + C(adm1_name) + C(year)",
    data=df
).fit(cov_type="HC1")

print("\nMODEL 1: Climate effects with region and year fixed effects")
print(m1.summary())


# =========================
# Model 2: climate effects with region fixed effects only
# =========================
m2 = smf.ols(
    "anomaly_growing_mean_ndvi ~ summer_temp_anomaly + summer_sm_anomaly + C(lc_name) + C(adm1_name)",
    data=df
).fit(cov_type="HC1")

print("\nMODEL 2: Climate effects with region fixed effects")
print(m2.summary())


# =========================
# Model 3: temperature effect on soil moisture
# =========================
m3 = smf.ols(
    "summer_sm_anomaly ~ summer_temp_anomaly",
    data=df
).fit()

print("\nMODEL 3: Temperature effect on soil moisture")
print(m3.summary())


# =========================
# Model 4: land cover interactions
# =========================
m4 = smf.ols(
    "anomaly_growing_mean_ndvi ~ summer_temp_anomaly * C(lc_name) + summer_sm_anomaly * C(lc_name) + C(adm1_name)",
    data=df
).fit(cov_type="HC1")

print("\nMODEL 4: Land cover interaction model")
print(m4.summary())


# =========================
# Model comparison table
# =========================
comparison = pd.DataFrame({
    "model": [
        "M1: climate + land cover + region + year FE",
        "M2: climate + land cover + region FE",
        "M3: temperature to soil moisture",
        "M4: land cover interactions"
    ],
    "nobs": [m1.nobs, m2.nobs, m3.nobs, m4.nobs],
    "r2": [m1.rsquared, m2.rsquared, m3.rsquared, m4.rsquared],
    "adj_r2": [m1.rsquared_adj, m2.rsquared_adj, m3.rsquared_adj, m4.rsquared_adj],
    "aic": [m1.aic, m2.aic, m3.aic, m4.aic],
    "bic": [m1.bic, m2.bic, m3.bic, m4.bic]
})

print("\nModel comparison")
print(comparison)

comparison.to_csv("outputs/model_comparison.csv", index=False)
