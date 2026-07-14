# Changelog

## 1.5.2

### Bug Fixes
- **Correct statistics when one query returns several frames**: A query can return multiple data frames that share a refId but hold different measurements (for example a Prometheus query with several label sets, or a datasource that splits series by timestamp). The statistics table matched raw data and spec limits by refId, so every such frame reused the first frame's values — showing wrong n, Mean, Std Dev, Min, Max and capability indices. Each frame is now matched to its own data by position, keeping frames with a shared refId distinct.
- **Gaussian curve fits data on any measurement scale**: The Levenberg-Marquardt fit used a fixed gradient step of 0.1, so for data measured in small units (for example 0.005 ± 0.0005 mm) the fit never moved off its initial guess and the drawn bell did not match the data. Gradient steps now scale with each fitted parameter, and the fit converges to the correct amplitude, mean and sigma regardless of the measurement scale.
- **Smooth Gaussian curve with an exact peak**: The fitted curve was only evaluated at histogram bin centers, drawing an angular line whose peak was clipped whenever the true mean fell between two bins. The curve is now sampled at 200 points concentrated on the bell itself (mean ± 5 sigma), so it stays smooth and full-height even when coarse bins are used or several frames widen the histogram range.
- **Gaussian fit uses the right series with multiple frames and wide queries**: Initial fit parameters were estimated from raw values pooled across all value columns of a frame, which targeted the wrong data when a query returned several frames or several value columns. They are now derived from the histogram of the selected series itself, which also makes the fit work for pre-binned histogram queries.
- **Histogram-fit curves no longer bridge empty regions**: With several frames joined into one histogram, a Histogram-fit curve drew long lines across ranges where its series has no data, connecting it to other series' regions. The curve now stays over its own bins.
- **Curve options pointing at a removed query no longer break rendering**: A stale series reference in the curve or bell-curve options could crash panel drawing; such curves are now skipped. A fitted Gaussian mean of exactly 0 is also no longer ignored by the Gaussian Peak (µ) control line.

## 1.5.1

### Bug Fixes
- **Wide queries now show every measurement in the statistics table**: When a single query returns several value columns (for example `part_a` and `part_b` in one result), the histogram already drew a distribution for each, but the statistics table only listed the first one. It now shows one row per value column, each with its own n, Mean, Std Dev, Min, Max and control limits.
- **Missing values no longer skew subgroup calculations**: With subgrouping or aggregation enabled, empty/null readings inside a subgroup were being treated as zero, pulling means and ranges toward 0 (and a fully empty subgroup could produce bad values). Missing readings are now ignored, and a subgroup with no data simply leaves a gap.
- **Correct series label on collapsed control lines**: The series name shown on a collapsed control-line header could be wrong (or read "(stale series)") when a feature/reference query came before the plotted data. Each control line now shows the correct series it applies to.

## 1.5.0

### Breaking changes
- **Statistics table is now a Minitab-style capability report**: n, Mean, Std Dev, Min and Max describe the raw individual measurements (not the plotted subgroup aggregates). Cp/Cpk use the within-subgroup sigma estimated the way Minitab does - Rbar/d2 for Xbar-R charts, sbar/c4 for Xbar-S, average moving range/d2 for XmR and ungrouped data, pooled standard deviation (with c4 unbiasing) for subgrouped data without a chart. Pp/Ppk use the overall sample standard deviation of the individuals. Previously all of these were computed from the aggregated (e.g. subgroup-mean) values, which overstated capability by roughly √subgroup-size. LCL/UCL still show the control chart limits.

### Bug Fixes
- **Capability indices now work with spec limits from a query**: When the LSL and USL lines get their values from a data field (Position input = Series, e.g. limits pulled from a reference/feature query), the statistics table now calculates Cp, Cpk, Pp and Ppk. Previously these were left blank unless the limits were typed in as fixed values, even though the limit lines still showed on the chart. The exported CSV now includes these limits too.
- **S chart lower control limit used the wrong constant**: the LCL was computed with A3 instead of B3, producing an incorrect lower limit for every subgroup size.
- **Standard deviation ignored missing data incorrectly**: null and NaN values could distort (or poison) the Std Dev statistic; it is now computed over valid values only.
- **Control limits from partial subgroups**: Xbar-R/S center lines and limits are now estimated from complete subgroups only, and charts with insufficient data no longer produce NaN limits.
- **CSV export dropped static control lines when a feature query was configured** (series index mismatch).

## 1.4.2

### Features
- **Statistics column editor**: Added an info tooltip explaining the requirements for Cp, Cpk, Pp, and Ppk to appear (both LSL and USL must be configured, sufficient data points required).

### Bug Fixes
- **Fix spec limits from feature series**: LSL and USL control lines configured to pull values from a feature series field were not being resolved correctly; capability indices now reflect the actual series value.
- **Multi-series spec limit fallback**: When a series has no LSL/USL configured, it now falls back to the limits defined for the first series, so a single pair of spec limits applies to all series by default.
- **Theme consistency**: Replaced remaining hardcoded values with Grafana theme tokens — control line default colors now use the visualization palette (`dark-green`, `dark-red`, `blue`, etc.), hover range and tooltip offset use `theme.spacing()`, and annotation colors are resolved via `theme.visualization.getColorByName()`.
- **Grafana dependency**: Minimum required Grafana version bumped to 11.6.10.

## 1.4.1
- **Theme consistency**: Replaced hardcoded pixel values and hex color constants with Grafana theme tokens (`theme.spacing()`, `theme.colors.*`, `theme.visualization.getColorByName()`) across editor and tooltip components, improving light/dark mode consistency.
- **Documentation**: Updated plugin and usage documentation.

## 1.4.0
- **Export to CSV**: Export calculated SPC data (statistics, control lines, and histogram buckets) to a CSV file. Available from the download icon in the statistics table header or by right-clicking the panel and selecting "Download CSV".
- **Statistics Table**: Added a statistics table below the histogram showing descriptive statistics (n, Mean, Std Dev, Min, Max), control limits (LCL, UCL), and process capability indices (Cp, Cpk, Pp, Ppk).
- **Configurable Table Columns**: Choose which columns to display in the statistics table via the panel editor.
- **Multiple Custom Lines per Series**: You can now add more than one custom control line to a single series.
- **Gaussian Peak (µ) Control Line**: New control line type that marks the peak of the fitted Gaussian curve. Uses the Levenberg-Marquardt fitted mean, which may differ from the arithmetic mean for non-normal data.
- **Histogram Tooltip**: Hover over histogram bins to see bucket range and count for each series, similar to Grafana's built-in histogram tooltip. Bell curve fitted values are included when a Gaussian curve is configured.

## 1.3.0
- Added support for Custom Control Lines to pull dynamic values from **Feature Series**, allowing more flexible histogram configurations.
- Added the ability to mark series as **Feature Series** and hide them from the histogram.
- Introduced support for a **subgroupSize** dashboard variable to control subgroup size across multiple SPC Histogram panels.

## 1.2.0
-  **Gaussian Curve Functionality**: You can now add a Gaussian (normal distribution) curve to your histograms.
-  **Histogram Curve**: A new option to plot a smoothed curve along your histogram for better data visualization.
-  **Bug Fixes**: We've squashed a few bugs to improve overall performance.
-  **New Documentation**: Check out the updated documentation




