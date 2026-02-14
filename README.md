## SPC Histogram

![Main](https://raw.githubusercontent.com/KensoBI/spc-histogram/main/src/img/spc-histogram.png)

Welcome to the KensoBI SPC Histogram panel for Grafana. This plugin enables you to easily create statistical process control (SPC) histograms, including Xbar-R, XbarS, and XmR charts. It automatically calculates and displays control limits on the histogram as vertical lines, with options to add your own custom limits. Additionally, you can group your samples into subgroups and aggregate them using methods such as moving range, range, mean, or standard deviation.

## Features

- **Xbar-R, XbarS, and XmR Charts:** Create various types of SPC charts.
- **Automatic Control Limits:** LCL, UCL and mean control limits are automatically calculated and displayed.
- **Custom Limits:** Add your own limits for more tailored analysis.
- **Subgrouping:** Group your samples into subgroups and aggregate it.
- **Aggregation:** Aggregate your data by moving range, range, mean, or standard deviation.
- **Statistics Table:** View descriptive statistics, control limits, and process capability indices (Cp, Cpk, Pp, Ppk) in a table below the histogram.
- **Histogram Bell Curve:** Visualize the distribution of your data with a histogram bell curve overlay.
- **Gaussian Bell Curve:** Add a Gaussian (normal) distribution curve to your histogram for comparison and analysis.
- **Gaussian Peak (µ) Control Line:** Display the peak of the fitted Gaussian curve as a control line, using the Levenberg-Marquardt fitted mean.
- **Interactive Tooltips:** Hover over histogram bins to see bucket range and series counts. Control line tooltips show name and value. Gaussian curve fitted values are included in the bucket tooltip.
- **Export to CSV:** Export calculated statistics, control lines, and histogram data to a CSV file. Available from the download icon in the statistics table or by right-clicking the panel.

## Histogram Curve

![Histogram curve](https://raw.githubusercontent.com/KensoBI/spc-histogram/main/src/img/histogram-curve.png)

The histogram bell curve provides a smoothed visualization of your data distribution, making it easier to observe overall patterns and trends in the dataset. This curve is created by simply connecting the midpoints of each histogram bin, offering a straightforward representation of the data distribution.

## Gaussian Curve

![Gaussian bell curve ](https://raw.githubusercontent.com/KensoBI/spc-histogram/main/src/img/gaussian-curve.png)

The Gaussian bell curve fits a normal distribution to your data, allowing for a direct comparison between actual data and the ideal normal distribution. This highlights deviations from normality, aiding in process analysis and improvement opportunities.

The Gaussian fit is performed using the Levenberg-Marquardt algorithm, a popular method for solving non-linear least squares problems. This algorithm iteratively adjusts the parameters of the Gaussian function (amplitude, mean, and standard deviation) to minimize the difference between the fitted curve and the actual histogram data.

The implementation uses the [ml-levenberg-marquardt](https://github.com/mljs/levenberg-marquardt) library to perform the fitting process, ensuring an accurate representation of the Gaussian distribution that best matches your data.

## Getting Help

If you have any questions or feedback, you can:

- Ask a question on the [KensoBI Discord channel](https://discord.gg/bekfAuAjGm).
- Create an [issue](https://github.com/KensoBI/spc-histogram/issues) to report bugs, issues, and feature suggestions.

Your feedback is always welcome!


## License

This software is distributed under the [AGPL-3.0-only](https://raw.githubusercontent.com/KensoBI/spc-histogram/main/LICENSE).

## Notes

Copyright (c) 2024 [Kenso Software](https://kensobi.com)
