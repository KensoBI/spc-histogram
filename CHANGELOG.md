# Changelog

## 1.4.0
- **Statistics Table**: Added a statistics table below the histogram showing descriptive statistics (n, Mean, Std Dev, Min, Max), control limits (LCL, UCL), and process capability indices (Cp, Cpk, Pp, Ppk).
- **Configurable Table Columns**: Choose which columns to display in the statistics table via the panel editor.
- **Multiple Custom Lines per Series**: You can now add more than one custom control line to a single series.
- **Gaussian Peak (µ) Control Line**: New control line type that marks the peak of the fitted Gaussian curve. Uses the Levenberg-Marquardt fitted mean, which may differ from the arithmetic mean for non-normal data.

## 1.3.0
- Added support for Custom Control Lines to pull dynamic values from **Feature Series**, allowing more flexible histogram configurations.
- Added the ability to mark series as **Feature Series** and hide them from the histogram.
- Introduced support for a **subgroupSize** dashboard variable to control subgroup size across multiple SPC Histogram panels.

## 1.2.0
-  **Gaussian Curve Functionality**: You can now add a Gaussian (normal distribution) curve to your histograms.
-  **Histogram Curve**: A new option to plot a smoothed curve along your histogram for better data visualization.
-  **Bug Fixes**: We've squashed a few bugs to improve overall performance.
-  **New Documentation**: Check out the updated documentation




