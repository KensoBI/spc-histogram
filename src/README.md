# SPC Histogram

Visualize your process data distributions with built-in Statistical Process Control — right inside Grafana.

SPC Histogram turns your time series data into interactive histograms with automatic control limits, bell curves, capability indices, and a detailed statistics table. Whether you're monitoring manufacturing tolerances, tracking measurement stability, or analyzing process performance, this panel gives you the tools to understand your data at a glance.

![SPC Histogram](https://raw.githubusercontent.com/KensoBI/spc-histogram/main/src/img/spc-histogram-release.gif)

## Key Features

### Control Charts (XmR, Xbar-R, Xbar-S)

Select a chart type and the panel automatically calculates control limits (LCL, UCL) and displays them as vertical lines on the histogram. Supports individual measurements (XmR), subgroup averages with range (Xbar-R), and subgroup averages with standard deviation (Xbar-S).

### Bell Curves

Overlay a **Gaussian curve** fitted using the Levenberg-Marquardt algorithm to see how closely your data follows a normal distribution. Or use the **Histogram curve** to trace the actual shape of your distribution.

![Gaussian Curve](https://raw.githubusercontent.com/KensoBI/spc-histogram/main/src/img/gaussian-curve.png)

### Statistics Table with Capability Indices

A built-in statistics table displays descriptive statistics (n, Mean, Std Dev, Min, Max), control limits, and process capability indices (**Cp, Cpk, Pp, Ppk**) — everything you need to assess whether your process is within specification.

![Statistics Table](https://raw.githubusercontent.com/KensoBI/spc-histogram/main/src/img/stat-table.png)

### Custom Control Lines

Add specification limits (LSL/USL), target values, or any reference line — either as fixed values or pulled dynamically from a separate data source query. Fill regions to highlight acceptable or out-of-spec zones.

### Multiple Series

Compare distributions across multiple data series side by side, each with its own color and statistics. Or combine them into a single histogram to see the overall picture.

![Multiple Series](https://raw.githubusercontent.com/KensoBI/spc-histogram/main/src/img/multi-series.png)

### Export to CSV

Export all calculated SPC data — statistics, control lines, and histogram buckets — to a CSV file with one click.

### Interactive Tooltips

Hover over any histogram bar to see bucket ranges and counts, control line values, and fitted Gaussian curve values in a unified tooltip.

## Getting Started

1. Add an **SPC Histogram** panel to your dashboard
2. Connect a data source with time series data
3. Choose a **Chart Type** (XmR, Xbar-R, or Xbar-S) to enable automatic control limits
4. Add **Control Lines** for specification limits (LSL/USL) to see capability indices
5. Add a **Bell Curve** to visualize the distribution fit

## Documentation

For detailed configuration guides, visit the [full documentation](https://docs.kensobi.com/panels/spc-histogram).
