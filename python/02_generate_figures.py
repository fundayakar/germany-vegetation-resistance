import pandas as pd
import matplotlib.pyplot as plt
import numpy as np

# =========================
# Load data
# =========================
DATA_PATH = "data/Germany_MODIS_Resistance_ZonalStats_2017_2024_NO_CALENDAR.csv"

df = pd.read_csv(DATA_PATH)
df = df.dropna()

# Optional ordering
lc_order = ["forest", "grassland", "cropland"]

colors = {
    "forest": "darkgreen",
    "grassland": "goldenrod",
    "cropland": "red"
}


# =========================
# Figure 1: soil moisture anomaly vs NDVI anomaly
# =========================
plt.figure(figsize=(8, 6))

for lc in lc_order:
    subset = df[df["lc_name"] == lc]

    x = subset["summer_sm_anomaly"]
    y = subset["anomaly_growing_mean_ndvi"]

    plt.scatter(
        x,
        y,
        alpha=0.35,
        label=lc,
        color=colors[lc]
    )

    # Linear trend line
    z = np.polyfit(x, y, 1)
    p = np.poly1d(z)

    x_sorted = np.sort(x)
    plt.plot(
        x_sorted,
        p(x_sorted),
        color=colors[lc],
        linewidth=2,
        alpha=0.8
    )

plt.axhline(0, linestyle="--", linewidth=1)
plt.axvline(0, linestyle="--", linewidth=1)

plt.xlabel("Summer soil moisture anomaly")
plt.ylabel("NDVI anomaly (growing season)")
plt.title("Vegetation sensitivity to soil moisture anomalies across land cover types")
plt.legend(frameon=True)

plt.tight_layout()
plt.savefig("figures/figure1_soil_moisture_ndvi_by_landcover.pdf", dpi=300, bbox_inches="tight")
plt.savefig("figures/figure1_soil_moisture_ndvi_by_landcover.png", dpi=300, bbox_inches="tight")
plt.show()