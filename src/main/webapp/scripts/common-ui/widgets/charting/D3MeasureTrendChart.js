define([
    "jquery",
    "common-ui/widgets/_TemplatedWidget",
    "common-ui/widgets/charting/D3LineChart",
    "common-ui/widgets/charting/D3BarChart",
    "common-ui/widgets/charting/D3HorizontalBarChart",
    "common-ui/widgets/charting/D3ScatterPlot",
    "common-ui/widgets/charting/DonutChart",
    "common-ui/widgets/TimeframeSummary",
    "common-ui/widgets/SummaryBar",
    "text!common-ui/widgets/charting/templates/D3MeasureTrendChart.html"
], function($, _TemplatedWidget, LineChart, BarChart, HorizontalBarChart, ScatterPlot, PieChart, TimeframeSummary, SummaryBar, template) {

    "use strict";

    var SERIES_OBSERVED_IDX = 0;

    return _TemplatedWidget.extend({

        // MeasureTrendChart
        //      includes a title, line chart, and timeframe summary for a measure
        //
        //      options
        //          data: Object
        //              a MeasureDetail object; note this object can optionally contain a Measure object
        //          hideTimeframes: Boolean
        //              true if the timeframes bar should be hidden

        template : template,

        // multiple options for chart constructor names to be more flexible
        chartConstructors : {
            "BarChart" : BarChart,
            "Bar" : BarChart,
            "HorizontalBarChart" : HorizontalBarChart,
            "HorizontalBar" : HorizontalBarChart,
            "AreaChart" : LineChart,
            "Area" : LineChart,
            "LineChart" : LineChart,
            "Line" : LineChart,
            "PieChart" : PieChart,
            "Pie" : PieChart,
            "ScatterPlot": ScatterPlot,
            "Scatter": ScatterPlot
        },
        // chartOptions: Map
        //     a map of additional options to pass into the chart on creation
        chartOptions : null,
        chartProperties : null,
        hideTimeframes : false,
        chartWidth : 1025,
        chartHeight : null,
        showLegend : true,
        excludeEmptySeries : false,
        minVal : undefined,
        maxVal : undefined,
        significanceMax : 3,
        contained : false,
        additionalBaseClass : "",
        chartTitle : "",
        chartSubTitle : "",
        firstSeriesPointDot : true,
        noDataClass : "no-data",

        onInit : function() {
            this._interceptData();
        },

        _interceptData : function() {
            // clean up the data for the template
            var d = this.data || {},
                data = d.measure || d;

            if ((!d || $.isEmptyObject(d)) && this.domNode) {
                this.domNode.addClass(this.noDataClass);
            }
            else if (this.domNode) {
                this.domNode.removeClass(this.noDataClass);
            }

            this.chartTitle = d.chartTitle || data.measureDesc || data.label || this.chartTitle || "";
            this.chartTitleMinor = d.chartSubTitle || d.measureSourceDescr || d.measureSourceDesc || data.measureSourceDescr || data.measureSourceDesc || this.chartSubTitle || "";
            if (d.additionalBaseClass) {
                this.additionalBaseClass = d.additionalBaseClass;
            }

            if (this.domNode && this.measureStatusClass) {
                this.domNode.removeClass(this.measureStatusClass);
            }
            this.measureStatusClass = "measure-status-" +  (data.measureStatusId || data.statusId || d.measureStatusId || d.statusId || "");
            this._addMeasureStatusClass();

            if (this.setChartTitle && this.chartTitle) {
                this.setChartTitle(this.chartTitle);
            }
            if (this.setChartTitleMinor && this.chartTitleMinor) {
                this.setChartTitleMinor(this.chartTitleMinor);
            }
        },

        _addMeasureStatusClass : function() {
            if (this.domNode && this.measureStatusClass) {
                this.domNode.addClass(this.measureStatusClass);
            }
        },

        onTemplateNodesAttached : function(nodes) {
            this._renderWidgets(nodes);
            this._renderViewContainer();
            this._addMeasureStatusClass();
        },

        getTemplateData : function() {
            return {
                containerClass : (this.contained ? "shady-container" : "") +
                    (this.additionalBaseClass ? " " + this.additionalBaseClass : "")
            };
        },

        updateMeasureData : function(measureData) {
            if (this.data) {
                this.data.measureDesc = measureData.chartTitle || measureData.measureDesc;
                this.data.measureSourceDescr = measureData.measureSourceDescr;
                this.data.measureStatusId = measureData.measureStatusId || measureData.statusId;

                this._interceptData();
            }
        },

        updateData : function(data) {
            // override to ensure the entire template is not re-applied if unnecessary
            this.data = data;
            this._interceptData();
            if (this.attachPoints) {
                this.toggleElementVisible(this.attachPoints.chartTitleContainer, this.chartTitle);
                this.toggleElementVisible(this.attachPoints.chartTitleMinorContainer, this.chartTitleMinor);

                // re-render using the original attach points
                this._renderWidgets();
            }
            this.dispatchEvent("dataUpdated", data);
            // TODO this change event eventually may be triggered from user interaction
            this.dispatchEvent("change", data);
        },

        resize : function() {
          if (this.trendChart && this.trendChart.resize) {
              this.trendChart.resize();
          }
        },

        getViewContainer : function() {
            // used to support this element as a view container for other sub widgets
            if (!this._viewContainer) {
                this._viewContainer = $("<div class='chart-view-container'></div>");
            }
            this._renderViewContainer();
            return this._viewContainer;
        },

        _renderWidgets : function() {
            this._renderTrendChart();
            this._renderTimeframeSummary();
            this._renderMeasureSummary();
        },

        _renderViewContainer : function() {
            if (this._viewContainer && this.attachPoints && this.attachPoints.chartContainerOuter) {
                this.attachPoints.chartContainerOuter.append(this._viewContainer);
            }
        },

        _renderTrendChart : function() {
            if (!this.attachPoints) {
                return;
            }
            var measureDetailChart = this.data ? this.data.measureDetailChart || (this.data.chartSeries ? this.data : {}) : {},
                chartData = measureDetailChart,
                formatString = this.data ? this.data.formatString || this.formatString || "" : "",
                chartType = measureDetailChart && measureDetailChart.chartType ?
                    measureDetailChart.chartType : this.chartType,
                showLegend = measureDetailChart && measureDetailChart.showLegend !== null && measureDetailChart.showLegend !== undefined ?
                    measureDetailChart.showLegend : this.showLegend;

            if (chartData && chartData.chartTitle) {
                delete chartData.chartTitle;
            }

            if (!this.trendChart) {
                var ChartConstructor = this.chartConstructors[chartType] || LineChart,
                    opts = {
                        baseClass : "",
                        labels : measureDetailChart.labels,
                        data : chartData,
                        formatString : formatString,
                        getSeriesOptions : this._getSeriesOptions.bind(this),
                        width : this.chartWidth,
                        chartType : this.chartType,
                        showLegend : showLegend,
                        excludeEmptySeries : this.excludeEmptySeries,
                        excludeSeries : this.excludeSeries,
                        minVal : this.minVal,
                        maxVal : this.maxVal,
                        chartProperties : this.chartProperties,
                        bezierCurve : this.bezierCurve
                    };

                if (this.chartHeight) {
                    opts.height = this.chartHeight;
                }
                if (this.noDataMessage) {
                    opts.noDataMessage = this.noDataMessage;
                }
                if (this.seriesStrokes && this.seriesStrokes.length > 0) {
                    opts.seriesStrokes = this.seriesStrokes;
                }
                if (this.legendWidth > 0) {
                    opts.legendWidth = this.legendWidth;
                }
                if (this.mobileBreakpoint  > 0) {
                    opts.mobileBreakpoint = this.mobileBreakpoint;
                }
                if (this.tooltips !== null && this.tooltips !== undefined) {
                    opts.tooltips = this.tooltips;
                }
                if (this.animation !== null && this.animation !== undefined) {
                    opts.animation = this.animation;
                }
                if (this.chartOptions && !$.isEmptyObject(this.chartOptions)) {
                    $.extend(opts, this.chartOptions);
                }
                this.trendChart = this.addWidget(new ChartConstructor(opts, this.attachPoints.chartContainer), true, true);
                if (this.trendChart.domNode) {
                    this.connect(this.trendChart.domNode, "click.trendChart." + this._key, this._handleTrendChartClick.bind(this));
                }
            }
            else {
                this.trendChart.formatString = formatString;
                this.trendChart.showLegend = this.showLegend;
                this.trendChart.labels = measureDetailChart.labels;
                this.trendChart.updateData(chartData);
            }

        },

        onViewShown : function() {
          if (this.trendChart && this.trendChart.onViewShown) {
              this.trendChart.onViewShown();
          }
        },

        _renderMeasureSummary : function() {
            if (!this.attachPoints) {
                return;
            }
            var items = this.data ? this.data.measureDetailSummaryItems : [];
            if (!this._measureScorecard && this.attachPoints.chartTitleContainerOuter) {
                var container = $("<div class='chart-summary'/>");
                this.attachPoints.chartTitleContainerOuter.append(container);
                this._measureScorecard = this.addWidget(new SummaryBar({
                    baseClass : "app-context-summary-simple",
                    data : items,
                    append : true
                }, container));
            }
            else if (this._measureScorecard) {
                this._measureScorecard.updateData(items);
            }
        },

        _renderTimeframeSummary : function() {
            if (this.hideTimeframes || !this.attachPoints) {
                return;
            }
            var timeframes = this.data && (this.data.measureDetailChart || this.data.timeframes) ? (this.data.measureDetailChart.timeframes ||this.data.timeframes ) : null;
            if (timeframes) {
                if (!this.timeframeSummary) {
                    var node = $("<div/>");
                    node.insertBefore(this.attachPoints.chartContainer);
                    this.timeframeSummary = this.addWidget(new TimeframeSummary({
                        data : timeframes
                    }, node));
                }
                else {
                    this.timeframeSummary.updateData(timeframes);
                }
            }
            else if (this.timeframeSummary) {
                this.timeframeSummary.remove();
                this.timeframeSummary = null;
            }
        },

        _handleTrendChartClick : function(evt) {
            this.dispatchEvent("click", this.data, true);
        },

        _getSeriesOptions : function(series, seriesIdx) {
            if (seriesIdx === SERIES_OBSERVED_IDX && this.firstSeriesPointDot) {
                return {pointDot : true, datasetFill : false};
            }
            return {};
        }

    });
});