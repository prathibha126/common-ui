define([
    "jquery"
], function($) {

    "use strict";

    return {

        convertGridDataToChartData : function(gridData, chartColumns, xProp, yProp, rProp) {
            var chartData = null;
            if (gridData) {
                chartData = {chartSeries : []};
                // iterate each of the y props, or at least iterate once even if the yProp is undefined
                var yProps = (yProp && $.isArray(yProp) && yProp.length > 0) ? yProp : [yProp];
                yProps.forEach(function(funYProp) {
                    var gridSeries = {dataPoints : gridData.data !== undefined ? gridData.data : gridData};
                    chartData.chartSeries.push(gridSeries);

                    // cols can be specified on the chart or derived from columns within the grid data
                    var cols = chartColumns || gridData.columns;
                    if (cols) {
                        if (xProp && cols[xProp]) {
                            chartData.xAxisLabel = cols[xProp].name;
                            if (cols[xProp].formatString) {
                                chartData.xFormatString = cols[xProp].formatString;
                            }
                        }
                        if (funYProp && cols[funYProp]) {
                            // the y axis label is only applied from the first y-series
                            if (!chartData.yAxisLabel) {
                                chartData.yAxisLabel = cols[funYProp].name;
                            }
                            gridSeries.seriesDescr = cols[funYProp].name;
                            if (cols[funYProp].formatString) {
                                chartData.yFormatString = cols[funYProp].formatString;
                                chartData.formatString = chartData.yFormatString;
                            }
                        }
                        // if the rvalue is the same as the x or y values, we don't need to include these props to avoid redundancy
                        if (rProp && rProp !== xProp && rProp !== funYProp && cols[rProp]) {
                            chartData.rValueLabel = cols[rProp].name;
                            if (cols[rProp].formatString) {
                                chartData.rFormatString = cols[rProp].formatString;
                            }
                        }
                    }

                });

                // title and series descr can come from the grid data overview
                if (gridData.overview && gridData.overview.title) {
                    chartData.chartTitle = gridData.overview.title;
                }
            }
            return chartData;
        }
    };

});