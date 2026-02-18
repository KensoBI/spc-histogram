# SPC Histogram

![Dynamic JSON Badge](https://img.shields.io/badge/dynamic/json?logo=grafana&query=$.version&url=https://grafana.com/api/plugins/kensobi-spchistogram-panel&label=Marketplace&prefix=v&color=F47A20)
![Grafana](https://img.shields.io/badge/Grafana-11%2B-orange?logo=grafana)

Visualize your process data distributions with built-in **Statistical Process Control** — right inside Grafana. SPC Histogram turns your time series data into interactive histograms with automatic control limits, bell curves, capability indices, and a detailed statistics table.

![SPC Histogram](https://raw.githubusercontent.com/KensoBI/spc-histogram/main/src/img/spc-histogram-release.gif)

## Why SPC Histogram?

Histograms are a fundamental tool for understanding process data. When combined with Statistical Process Control, they answer the key questions about your process:

- **Control limits** — automatically calculated LCL/UCL lines show whether variation is within expected bounds
- **Capability indices** — Cp, Cpk, Pp, and Ppk tell you whether your process fits within specification limits
- **Bell curves** — Gaussian curves fitted using the Levenberg-Marquardt algorithm reveal how closely your data follows a normal distribution
- **Statistics at a glance** — a built-in table displays n, Mean, Std Dev, Min, Max, and more for every series

![Gaussian Curve](https://raw.githubusercontent.com/KensoBI/spc-histogram/main/src/img/gaussian-curve.png)

## Built for Grafana

SPC Histogram is built using Grafana's native visualization components. This means it inherits the look, feel, and behavior you already know:

- **Native theming** — automatically adapts to light and dark mode
- **Standard panel options** — legend placement, tooltip behavior, and field overrides work just like any other Grafana panel
- **Resizable statistics table** — drag the splitter to balance chart and table space, just like Grafana's built-in panels
- **Works with any data source** — use it with SQL databases, Prometheus, InfluxDB, CSV files, or any other Grafana data source

## Features

| Feature | Description |
|---------|-------------|
| Control charts | XmR, Xbar-R, and Xbar-S chart types with automatic LCL/UCL calculation |
| Bell curves | Gaussian (Levenberg-Marquardt fit) and histogram curve overlays |
| Statistics table | n, Mean, Std Dev, Min, Max, LCL, UCL, Cp, Cpk, Pp, Ppk per series |
| Custom control lines | Static values or dynamic values pulled from a separate query |
| Specification limits | LSL/USL with automatic capability index calculation |
| Multiple series | Compare distributions side by side or combine into one histogram |
| Aggregation | Mean, Range, Standard Deviation, and Moving Range modes |
| Export to CSV | Export statistics, control lines, and histogram buckets to CSV |
| Interactive tooltips | Bucket counts, control line values, and Gaussian curve values on hover |
| Resizable layout | Drag the splitter between chart and statistics table |

![Statistics Table](https://raw.githubusercontent.com/KensoBI/spc-histogram/main/src/img/stat-table.png)

## Use Cases

- **Manufacturing quality** — monitor dimensional tolerances with control limits and capability indices
- **Process engineering** — track measurement stability and detect shifts in process centering
- **Laboratory testing** — analyze instrument measurement distributions and repeatability
- **Supply chain** — monitor incoming material quality against specification limits
- **Pharmaceutical** — validate process capability for batch manufacturing (Cp/Cpk)

## Requirements

- Grafana **11** or later

## Getting Started

1. Install the plugin from the [Grafana Plugin Catalog](https://grafana.com/grafana/plugins/kensobi-spchistogram-panel/)
2. Add a new panel and select **SPC Histogram** as the visualization
3. Connect a data source with time series data
4. Choose a **Chart Type** (XmR, Xbar-R, or Xbar-S) to enable automatic control limits
5. Add **Control Lines** for specification limits (LSL/USL) to see capability indices
6. Add a **Bell Curve** to visualize the distribution fit

![Multiple Series](https://raw.githubusercontent.com/KensoBI/spc-histogram/main/src/img/multi-series.png)

## Panel Options

### Histogram

| Option | Description | Default |
|--------|-------------|---------|
| Bucket count | Approximate number of histogram bars | 30 |
| Bucket size | Fixed width for each bucket (overrides bucket count) | Auto |
| Bucket offset | Shifts bucket boundaries by a fixed amount | 0 |
| Combine series | Merge all series into a single histogram | Off |
| Feature Queries | Select queries excluded from histogram calculations | None |

### SPC

| Option | Description | Default |
|--------|-------------|---------|
| Chart type | none, X chart (XmR), mR chart (XmR), X chart (Xbar-R), R chart (Xbar-R), X chart (Xbar-S), S chart (Xbar-S) | none |
| Subgroup size | Number of measurements per subgroup | 1 |
| Aggregation type | None, Moving range, Mean, Range, Standard Deviation. Only available when chart type is "none". | None |
| Control lines | LCL, UCL, Mean, Min, Max, Range, LSL, USL, Gaussian Peak, Custom, Nominal | None |

### Curve

| Option | Description | Default |
|--------|-------------|---------|
| Add a Bell Curve | Gaussian or Histogram curve with configurable series, line width, and color | None |

### Statistics Table

| Option | Description | Default |
|--------|-------------|---------|
| Show statistics table | Display the statistics table below the histogram | Off |
| Visible columns | n, Mean, Std Dev, Min, Max, LCL, UCL, Cp, Cpk, Pp, Ppk | All |

### Bar Appearance

| Option | Description | Default |
|--------|-------------|---------|
| Fill opacity | Bar fill opacity (0–100%) | 80% |
| Line width | Bar border width (0–10) | 1 |
| Gradient mode | None, Opacity, or Hue | None |

## Documentation

For detailed documentation, configuration guides, and examples, see the [full documentation](https://docs.kensobi.com/panels/spc-histogram/).

## Part of the KensoBI SPC Suite

SPC Histogram is part of a growing family of **Statistical Process Control** plugins for Grafana by Kenso Software:

**[SPC Chart Panel](https://github.com/KensoBI/spc-chart)** — Control charts for monitoring process stability over time. Supports Xbar-R, Xbar-S, and XmR charts with automatic calculation of control limits. If you're tracking whether a process is staying in control, this is your starting point.

**[SPC Pareto Panel](https://github.com/KensoBI/spc-pareto)** — Pareto charts for identifying the most significant factors contributing to defects or issues. Automatic sorting, cumulative percentage lines, and 80/20 threshold analysis help you focus improvement efforts where they matter most.

**[SPC CAD Panel](https://github.com/KensoBI/spc-cad)** — Brings 3D geometry into the picture, letting you bind the data from control charts and histograms to physical features on your parts.

## License

This software is distributed under the AGPL-3.0-only license — see [LICENSE](https://raw.githubusercontent.com/KensoBI/spc-histogram/refs/heads/main/LICENSE) for details.

## Support

If you have any questions or feedback, you can:

- Ask a question on the [KensoBI Discord channel](https://discord.gg/bekfAuAjGm).
- GitHub Issues: https://github.com/KensoBI/spc-histogram/issues
