/**
 * Created by atack on 8/19/16.
 */
define([
    "d3",
    "jquery",
    "common-ui/widgets/charting/_D3Chart",
    "common-ui/widgets/utils/formatter"
], function (d3, $, _D3Chart, formatter) {

    "use strict";

    var CHART_TYPE_LINE = "Line",
        CHART_TYPE_AREA = "Area";

    return _D3Chart.extend({

        baseClass: "",
        height: 30,
        heightOfLabel: 0,
        heightRatio: null,
        max: null,
        min: null,
        datasetStrokeWidth: 2,
        lineInterpolation: "monotone", // linear for straight line, monotone for curve
        chartType: CHART_TYPE_LINE,
        pointDot: false,
        pointDotRadius: 3,
        pointDotOpacity : 1,
        areaPercentOfMax : false,
        // areaStacked: Boolean
        //      by default we stack area charts, so the y0 is driven by the area below it. when areaStacked is false, you can provide custom y0 points
        areaStacked : true,
        marginTop : 5,
        marginLeft : 10,
        marginBottom : 5,
        marginRight : 10,
        yLabelMargin: 30,
        showLegend: false,
        minWidth: 150,
        minHeight: 20,
        animation: false,
        firstSeriesPointDot: false,
        tooltips : false,
        tooltipLine : false,
        noDataMessage: "",
        _isSparkLine : true,
        showSingleDataPointDot: true,
        areaFillOpacity: 0.9,
        hasImage: false,
        imageSize: 20,

        y0Prop : "y0",

        createChart: function () {
            // spark lines do not have titles   
            if (this._isSparkLine && this.attachPoints && this.attachPoints.chartTitleContainer) {
                this.attachPoints.chartTitleContainer.remove();
            }

            this.x = d3.scale.ordinal()
                .rangePoints([0, this.getChartWidth()], 0);
            this.y = d3.scale.linear()
                .range([this.getChartHeight(), 0]);

            this.lineChart = d3.svg.line()
                .interpolate(this.lineInterpolation)
                .x(function (d) {
                    return d ? (this.x(d.x) || null) : null;
                }.bind(this))
                .y(function (d) {
                    return d ? (this.y(d.y) || null) : null;
                }.bind(this))
                .defined(function(d) { return d.y!==null;});

            this.areaChart = d3.svg.area()
                .interpolate(this.lineInterpolation)
                .x(function (d) {
                    return d ? this.x(d.x) : null;
                }.bind(this))
                .y0(function (d) {
                    if (d) {
                        if (!this.areaPercentOfMax) {
                            return this.y(Math.max(this.dataMin, this.areaStacked ? d.sum : d.y0));
                        }
                        else {
                            return this.y(Math.max(this.dataMin, d.y0));
                        }
                    }
                    return null;
                }.bind(this))
                .y1(function (d) {
                    if (d) {
                        if (!this.areaPercentOfMax) {
                            return this.y((this.areaStacked ? d.sum : 0) + d.y);
                        }
                        else {
                            return (this.dataMax - d.sum > 0 ? this.y(this.dataMax - d.sum) : this.y(0));
                        }
                    }
                    return null;
                }.bind(this))
                .defined(function(d) { return d.y!==null;});

            if (!this.lineLayer) {
                this.lineLayer = this.svg.append('g').attr('class', 'line-layer');
            }
            this.bindTooltipEvents();
        },

        updateChartData: function (data) {
            this.allowLabelRotation = this.labelRotation === 0 ? false : this.allowLabelRotation;

            if (this.chartLabels && this.chartLabels.length > 0) {
                this.x.domain(this.chartLabels);
            }
            else {
                this.x.domain([]);
            }

            this.y.domain([this.dataMin, Math.max(0, this.dataMax || 0)]);

            this.drawChartLine(data);
        },

        drawChartLine : function(data) {
            if (this.svg) {
                if (data && data.length > 0) {
                    var isLineChart = this._isLineChart(),
                        animationDuration = this.getAnimationDuration(),
                        animationDelay = this.getAnimationDelay(),
                        path = this.lineLayer.selectAll("path." + this.chartType.toLowerCase()).data(data);

                    path.exit()
                        .remove();

                    path.call(function(selection){
                        this.styleLine(selection, isLineChart, data.length);
                    }.bind(this));

                    var pathContext = animationDuration > 0 ?
                        path.transition()
                            .delay(animationDelay)
                            .duration(animationDuration) :
                        path;

                    pathContext.attr("d", function (d) {
                        return d.area ? this.areaChart(d.data) : this.lineChart(d.data);
                    }.bind(this));

                    var trend = this.styleLine(path.enter().append("path"), isLineChart, data.length);
                    trend.attr("class", this.chartType.toLowerCase());

                    var trendContext = animationDuration > 0 ?
                        trend.attr("d", this.getTrendData.bind(this, isLineChart))
                            .transition()
                            .duration(animationDuration) :
                        trend;
                    trendContext.attr("d", function (d) {
                        if (d.tooltipOnly) {
                            return [];
                        }
                        return d.area ? this.areaChart(d.data) : this.lineChart(d.data);
                    }.bind(this));

                    this.addPointDot(data, animationDuration, animationDelay);

                    if (this.hasImage) {
                        this.addImageOnDot(data, animationDuration, animationDelay);
                    }
                }

                this.svg.attr('transform', 'translate(' + this.margin.left + ', ' + this.margin.top + ')');
            }
        },

        addPointDot : function(data, animationDuration, animationDelay) {
            if (this.pointDot || (this.chartLabels && this.chartLabels.length === 1 && this.showSingleDataPointDot) || this.firstSeriesPointDot || this.seriesPointDot || this._previousSeriesPointDot) {
                var lineData = this.firstSeriesPointDot && !this.pointDot && !this.seriesPointDot ? [data[0]] : data,
                    circle = this.lineLayer.selectAll('g.dot').data(lineData),
                    dot = circle.enter().append('g');

                circle.exit().remove();
                
                circle.selectAll('circle')
                    .data(this.getSeriesWithPointDots.bind(this))
                    .exit()
                    .remove();

                var circleData = circle
                    .style("fill", this.getSeriesStroke.bind(this))
                    .selectAll('circle')
                    .data(this.getSeriesWithPointDots.bind(this));

                var circleContext = animationDuration > 0 ?
                    circleData.transition()
                        .delay(animationDelay)
                        .duration(animationDuration) :
                    circleData;

                circleContext.attr('cx', function (d) {
                        return this.x(d.x); }.bind(this))
                    .attr('cy', function (d) {
                        return this.y(d.y); }.bind(this))
                    .attr('r', function(d) {
                        if(d.y !== null){
                            return this.pointDotRadius;
                        }
                        return 0;
                    }.bind(this));

                dot.attr("class", "dot")
                    .style("opacity", this.pointDotOpacity)
                    .style("fill", this.getSeriesStroke.bind(this));

                circleContext = circle.selectAll('circle')
                    .data(this.getSeriesWithPointDots.bind(this))
                    .enter().append('circle')
                    .attr('cx', function (d) {
                        return this.x(d.x); }.bind(this))
                    .attr('cy', function (d) {
                        return this.y(d.y); }.bind(this))
                    .attr('r', function(d) {
                        if(d.y !== null){
                            return this.pointDotRadius;
                        }
                        return 0;
                    }.bind(this));

                if (animationDuration > 0) {
                    circleContext.style("fill-opacity", 0)
                        .transition()
                        .delay(animationDelay)
                        .duration(animationDuration)
                        .style("fill-opacity", 1);
                }

            }
        },

        addImageOnDot: function (data, animationDuration, animationDelay) {
            var images = this.lineLayer.selectAll('g.images').data(data),
                selection = images.enter().append('g');

            images.exit().remove();

            images.selectAll("image")
                .data(function (d) {
                    return d.data;
                })
                .exit().remove();

            var imageSelection = images.selectAll("image")
                .data(function (d) {
                    return d.data;
                });

            selection.attr("class", "images");

            imageSelection.enter().append('image');

            imageSelection
                .attr("transform", function (d) {
                    return "translate(" + this.x(d.x) + "," + this.y(d.y) + ")";
                }.bind(this))
                .attr("xlink:href", function (d) {
                    if (d.image !== null && d.y !== null && d.y !== undefined) {
                        return d.image;
                    }
                    return null;
                })
                .attr("x", -1 * (this.imageSize/2))
                .attr("y", -1 * (this.imageSize/2))
                .attr("width", 0)
                .attr("height", 0)
                .transition()
                .delay(animationDelay)
                .duration(animationDuration)
                .attr("width", this.imageSize)
                .attr("height", this.imageSize);
        },

        getSeriesWithPointDots: function (d) {
            if (d.tooltipOnly) {
                return [];
            }
            if (d.seriesPointDot === true) {
                return d.data;
            }
            return [];
        },

        getTrendData : function (isLineChart, d) {
            if (this.animationDuration > 0) {
                var initData = $.extend(true, {}, d);
                initData.data.forEach(function (e, i) {
                    if (e.tooltipOnly) {
                        return [];
                    }
                    if (isLineChart) {
                        e.sum = this.dataMax + 1;
                        if(this.chartLabels && this.chartLabels[0]) {
                            e.x = this.chartLabels[0];
                        }
                    }
                    else {
                        e.sum = 0;
                    }

                }.bind(this));
                return initData.area ? this.areaChart(initData.data) : this.lineChart(initData.data);
            }
            else {
                if (d.tooltipOnly) {
                    return [];
                }
                return d.area ? this.areaChart(d.data) : this.lineChart(d.data);
            }
        },

        styleLine : function(target, isLineChart, dataLength) {
            return target.style("stroke-width", this.datasetStrokeWidth + "px")
                .style("stroke", function (d, i) {
                    return d.area ? "none" : this.getSeriesStroke(d, i);}.bind(this))
                .style("stroke-dasharray", this.getSeriesDasharray.bind(this, dataLength))
                .style("fill", function(d, i) {
                    return d.area ? this.getSeriesStroke(d, i) : "none";}.bind(this))
                .style("fill-opacity", function(d) {
                    return d.area ? (d.seriesFillOpacity || this.areaFillOpacity) : "none";}.bind(this));
        },

        calcTooltipValues: function (mouse, evt, tooltip, toggleTooltipVisible) {
            var newChartWidth = this.getChartWidth(),
                interval = this.chartLabels.length > 1 ? Math.floor((newChartWidth/(this.chartLabels.length - 1))/2) : newChartWidth,
                x = mouse[0] - interval,
                range = this.x.range(),
                bisect = d3.bisect(range, x),
                index = bisect > -1 ? bisect : 0;

            if (this._lastTooltipIndex !== index || this._lastTooltipData !== this.data[0] || this._lastTooltipChartWidth !== newChartWidth) {
                this._lastTooltipIndex = index;
                this._lastTooltipData = this.data[0];
                this._lastTooltipChartWidth = newChartWidth;

                if (this.mouseLine) {
                    this.mouseLine.attr("width", !index || index >= (range.length - 1) ? interval : interval * 2)
                        .attr("height", this.getChartHeight())
                        .attr("x", Math.max(0, range[index] - interval))
                        .attr("y", 0);
                }

                var seriesIdx = 0, series, value,
                    tooltipTextEl = $("<div class='tooltip-label'></div>"),
                    tooltipValEl,
                    tooltipValTextEl,
                    tooltipBoldEl,
                    selectedDataArray = [];
                tooltipTextEl.text(this.chartLabels[index]);

                tooltip.empty().append(tooltipTextEl);

                for (seriesIdx; seriesIdx < this.data.length; seriesIdx++) {
                    series = this.data[seriesIdx] || {};
                    if (series.data && series.data.length >= index && !series.hideInTooltip) {
                        value = series.data[index];
                        if (value !== undefined) {
                            tooltipValEl = $("<div class='tooltip-value "
                                + (series.tooltipOnly ? "tooltip-only'>"
                                    : ("'><span class='tooltip-stroke' style='background: "
                                        + this.getSeriesStroke(series, seriesIdx) + ";'></span> ")) + "</div>");
                            tooltipValTextEl = $("<span></span>");
                            tooltipValTextEl.text(series.label + ": ");

                            if (series.area && value.y !== null && value.y !== undefined && !this.areaStacked) {
                                tooltipBoldEl = $("<b></b>");
                                tooltipBoldEl.text((value.y0 === null || value.y0 === undefined
                                    ? this.noLegendValuePlaceholder : formatter.format(value.y0, this.formatString)) + " - ");
                                tooltipValTextEl.append(tooltipBoldEl);
                            }

                            tooltipBoldEl = $("<b></b>");
                            tooltipBoldEl.text(value.y === null || value.y === undefined
                                ? this.noLegendValuePlaceholder : formatter.format(value.y, this.formatString));
                            tooltipValTextEl.append(tooltipBoldEl);

                            tooltipValEl.append(tooltipValTextEl);
                            tooltip.append(tooltipValEl);
                        }
                        var yValue = value ? value.y : this.noLegendValuePlaceholder,
                            y0Value = value ? value.y0 : this.noLegendValuePlaceholder,
                            image = value ? value.image : null;
                        selectedDataArray.push({seriesDescr: this.data[seriesIdx].label, x: this.x.domain()[index], y: yValue, y0: y0Value, image: image});
                    }
                }

                this._lastSelectedValue = {};
                this._lastSelectedValue.x = this.x.domain()[index];
                this._lastSelectedValue.data = selectedDataArray;
            }
            tooltip.css({"top": (evt.clientY - 20) + "px", "left": (evt.clientX + 20) + "px"});
            if (!this.tooltipVisible) {
                toggleTooltipVisible(true);
            }
        },
        
        resizeChart: function (redraw) {
            var newWidth = this.getWidth(this.margin, this.attachPoints.chart);

            if (this.width !== newWidth) {
                this.width = newWidth;
                this.height = this.getHeight(this.margin, this.attachPoints.chart);

                d3.select(this.attachPoints.chart[0]).select('svg')
                    .attr('height', this.height)
                    .attr('width', this.width);
                
                var chartHeight = this.getChartHeight(),
                    chartWidth = this.getChartWidth();

                this.x.rangePoints([0, chartWidth], 0);
                this.y.range([chartHeight, 0]);

                if (redraw) {
                    this.redrawChart(chartHeight, chartWidth);
                }
            }
        },

        redrawChart : function(chartHeight, chartWidth) {
            // Force D3 to recalculate and update the line
            this.lineLayer.selectAll('path.' + this.chartType.toLowerCase())
                .transition()
                .delay(0)
                .duration(0)
                .attr("d", function(d) { return d.area ? this.areaChart(d.data) : this.lineChart(d.data); }.bind(this));

            this.lineLayer.selectAll('circle')
                .transition()
                .delay(0)
                .duration(0)
                .style("fill-opacity", 1)
                .attr('cx', function (d) {
                    return this.x(d.x); }.bind(this))
                .attr('cy', function (d) {
                    return this.y(d.y); }.bind(this))
                .attr('r', function(d) {
                    if(d.y !== null){
                        return this.pointDotRadius;
                    }
                    return 0;
                }.bind(this));

            this.lineLayer.selectAll('image')
                .transition()
                .delay(0)
                .duration(0)
                .attr("transform", function (d) {
                    return "translate(" + (this.x(d.x) || 0) + "," + (this.y(d.y) || 0) + ")";
                }.bind(this));

            if (this.mouseLayer) {
                this.mouseLayer
                    .attr('width', chartWidth)
                    .attr('height', chartHeight);
            }
        },

        _isLineChart: function () {
            return this.chartType.toLowerCase() === CHART_TYPE_LINE.toLowerCase();
        },

        extractChartData: function (data) {
            var isLine = this._isLineChart(),
                yAxisLabels = data.yAxisLabels || this.yAxisLabels,
                percentPadding = data.percentPadding !== null && data.percentPadding !== undefined ? data.percentPadding : this.percentPadding, 
                final = [],
                tooltipOnlyData = [],
                min = data.min !== null && data.min !== undefined ? data.min : this.min,
                max = data.max !== null && data.max !== undefined ? data.max : this.max,
                backgrounds = data.backgrounds || this.backgrounds || null,
                hasData = false;
            this.dataMin = min !== null && min !== undefined ? min : Number.MAX_VALUE;
            this.dataMax = max !== null && max !== undefined ? max : 0;
            this.xProperty = data.xProp || this.xProp || "x";
            this.yProperty = data.yProp || this.yProp || "y";
            this.y0Property = data.y0Prop || this.y0Prop || "y0";
            this._previousSeriesPointDot = this.seriesPointDot;
            this.seriesPointDot = false;
            this.excludeEmptySeries = data.excludeEmptySeries !== null && data.excludeEmptySeries !== undefined ? data.excludeEmptySeries : this.excludeEmptySeries;
            
            this.chartLabels = data && data.labels ? data.labels : (this.labels || []);

            if (!isLine && this.dataMin !== Number.MAX_VALUE) {
                this.dataMin = 0;
            }

            var newData,
                labelDate,
                lastValue = null,
                labelSums = {},
                excludeSeriesMap = {};

            if (this.excludeSeries && this.excludeSeries.length > 0) {
                var k;
                for (k = 0; k < this.excludeSeries.length; k++) {
                    excludeSeriesMap[this.excludeSeries[k]] = true;
                }
            }

            if (yAxisLabels && yAxisLabels.length > 0) {
                this.showYAxisLabels = true;
                //Don't allow two axis on line chart yet
                this.chartYAxisLabels = [yAxisLabels[0]];
                this.recalcMouseLayer();
            }
            else {
                this.showYAxisLabels = false;
                this.recalcMouseLayer();
            }

            if (data && data.length > 0 && (data.chartSeries === null || data.chartSeries === undefined)) {
                data.chartSeries = data;
            }

            if (data && data.chartSeries && data.chartSeries.length > 0) {
                if (this.chartLabels && this.chartLabels.length > 0) {
                    data.labels = this.chartLabels;
                }

                data.chartSeries.forEach(function (e, c) {
                    lastValue = null;
                    newData = [];
                    var xCount = 0,
                        area = false;

                    if ((!excludeSeriesMap[e.seriesDescr] && !excludeSeriesMap[e.seriesName]) || (this.dataSeries && e.seriesName && e.seriesName === this.dataSeries)) {
                        
                        if ((e && e.chartType && e.chartType.toLowerCase() === CHART_TYPE_AREA.toLowerCase()) || !isLine) {
                            area = true;
                            if (c < 1) {
                                this.firstSeriesPointDot = false;
                            }
                        }

                        if (e && e.dataPoint && data.labels && data.labels.length > 0) {
                            var j;
                            e.dataPoints = [];
                            for (j = 0; j < data.labels.length; j++) {
                                e.dataPoints.push(e.dataPoint);
                            }
                        }

                        if (e && e.dataPoints && e.dataPoints.length > 0) {
                            var lastX = null, y, y0, lowestOfYOrY0;
                            e.dataPoints.forEach(function (d, i) {
                                if (d && d[this.xProperty] !== null && d[this.xProperty] !== undefined) {
                                    labelDate = this.chartLabels && this.chartLabels.length > i && this.chartLabels[i] ?
                                        this.chartLabels[i] : d[this.xProperty];

                                    if (lastX !== labelDate) {
                                        if (!labelSums[labelDate]) {
                                            if (this.chartLabels.length < e.dataPoints.length) {
                                                this.chartLabels.push(labelDate);
                                            }
                                            labelSums[labelDate] = 0;
                                        }

                                        y = d[this.yProperty] !== null && d[this.yProperty] !== undefined ? d[this.yProperty] : null;
                                        y0 = d[this.y0Property] !== null && d[this.y0Property] !== undefined ? d[this.y0Property] : 0;

                                        if (y !== null && y !== undefined) {
                                            xCount++;
                                        }

                                        if (d.image && !this.hasImage) {
                                            this.hasImage = true;
                                        }
                                        newData.push({x: labelDate, y: y, y0: y0, sum : labelSums[labelDate], image: d.image || null});
                                        labelSums[labelDate] += this.areaStacked ? y : 0;
                                        if (y !== null) {
                                            lastValue = y;
                                        }

                                        if (area && labelSums[labelDate] > this.dataMax) {
                                            this.dataMax = labelSums[labelDate];
                                        }
                                        else if (y > this.dataMax && y !== null) {
                                            this.dataMax = y;
                                        }

                                        lowestOfYOrY0 = !area ? y : Math.min(y, y0);
                                        if (lowestOfYOrY0 < this.dataMin && lowestOfYOrY0 !== null) {
                                            this.dataMin = lowestOfYOrY0;
                                        }
                                    }
                                }
                                else {
                                    if (data.labels && data.labels.length > i) {
                                        labelDate = data.labels[i];
                                    }
                                    else if (this.chartLabels && this.chartLabels.length > i) {
                                        labelDate = this.chartLabels[i];
                                    }
                                    else {
                                        labelDate = i;
                                    }
                                    if (lastX !== labelDate) {
                                        if (!labelSums[labelDate]) {
                                            if (this.chartLabels.length < e.dataPoints.length) {
                                                this.chartLabels.push(labelDate);
                                            }
                                            labelSums[labelDate] = 0;
                                        }
                                        y = d !== null && d !== undefined ? d : null;

                                        if (y !== null && y !== undefined) {
                                            xCount++;
                                        }

                                        if (e.image && !this.hasImage) {
                                            this.hasImage = true;
                                        }

                                        newData.push({x: labelDate, y: y, y0: 0, sum: labelSums[labelDate], image: e.image || null});
                                        labelSums[labelDate] += this.areaStacked ? y : 0;
                                        if (y !== null) {
                                            lastValue = y;
                                        }
                                        if (area && labelSums[labelDate] > this.dataMax) {
                                            this.dataMax = labelSums[labelDate];
                                        }
                                        else if (y > this.dataMax && y !== null) {
                                            this.dataMax = y;
                                        }

                                        if (y < this.dataMin && y !== null) {
                                            this.dataMin = y;
                                        }
                                    }
                                }
                                lastX = labelDate;
                                hasData = true;
                            }.bind(this));
                        }

                        if (xCount <= 1 && this.showSingleDataPointDot) {
                            e.seriesPointDot = true;
                        }

                        if (e.seriesPointDot !== undefined) {
                            this.seriesPointDot = true;
                        }

                        var excludeThisSeries = this.excludeEmptySeries && this.shouldExcludeSeries(xCount, e.seriesName, e.seriesDescr);

                        if (!excludeThisSeries) {
                            var seriesStrokeColor = e.seriesStrokeColor || this.seriesStrokes[c] || null,
                                seriesFillOpacity = e.seriesFillOpacity || null,
                                legendValue = e.legendValue !== null && e.legendValue !== undefined ? e.legendValue : lastValue,
                                seriesStrokePattern = e.seriesStrokePattern || null,
                                legendFormatString = e.legendFormatString || null,
                                seriesPointDot = e.seriesPointDot !== undefined ? e.seriesPointDot : (this.firstSeriesPointDot && c === 0 ? true : this.pointDot),
                                hideLegendValue = e.hideLegendValue !== null && e.hideLegendValue !== undefined ? e.hideLegendValue : this.hideLegendValues,
                                hideInLegend = e.hideInLegend,
                                hideInTooltip = e.hideInTooltip;

                            if (e.tooltipOnly && newData.length) {
                                tooltipOnlyData.push({
                                    label: (e.seriesDescr || ""),
                                    data: newData,
                                    legendFormatString: legendFormatString,
                                    hideInLegend: true,
                                    tooltipOnly: true
                                });
                            }

                            else {
                                final.push({
                                    label: (e.seriesDescr || ""),
                                    data: newData,
                                    value: legendValue,
                                    area: area,
                                    isLine : !area,
                                    seriesStrokeColor: seriesStrokeColor,
                                    seriesFillOpacity: seriesFillOpacity,
                                    seriesStrokePattern: seriesStrokePattern,
                                    legendFormatString: legendFormatString,
                                    seriesPointDot: seriesPointDot,
                                    hideLegendValue: hideLegendValue,
                                    hideInLegend: hideInLegend,
                                    hideInTooltip: hideInTooltip
                                });
                            }

                            legendValue = null;
                        }

                    }

                }.bind(this));

                if (!hasData) {
                    final = [];
                }

                if (this.dataMin === Number.MAX_VALUE) {
                    this.dataMin = 0;
                }
                
                var range = this.dataMax - this.dataMin;

                if (this.dataMax === this.dataMin) {
                    if (max === null || this.dataMin === 0) {
                        this.dataMax = max = this.calcMinOrMax(this.dataMax, true, range, percentPadding);
                    }
                    else {
                        this.dataMin = min = this.calcMinOrMax(this.dataMin, false, range, percentPadding);
                    }
                    if (this.dataMax === 0 && this.dataMax === this.dataMin) {
                        this.dataMax = 1;
                    }
                }
                if (min === null || (min !== null && typeof min !== "undefined" && this.dataMin < min)) {
                    this.dataMin = this.calcMinOrMax(this.dataMin, false, range, percentPadding);
                }
                if ((max === null || (max !== null && typeof max !== "undefined" && this.dataMax > max)) || (this.formatString.slice(-1) === "%" && this.dataMax !== 1)) {
                    this.dataMax = this.calcMinOrMax(this.dataMax, true, range, percentPadding);
                }

                tooltipOnlyData.forEach(function(d){
                    final.push(d);
                });

                if (backgrounds && backgrounds.length > 0 && final.length > 0) {
                    var i,
                        newBackgrounds = [];
                    for(i = 0; i < backgrounds.length; i++) {
                        if (backgrounds[i].start !== undefined && backgrounds[i].start !== null && backgrounds[i].end !== undefined && backgrounds[i].end !== null) {
                            var startIndex = this.chartLabels.indexOf(backgrounds[i].start),
                                endIndex = this.chartLabels.indexOf(backgrounds[i].end);

                            if (startIndex !== -1 && endIndex !== -1 && (endIndex-startIndex > 0)) {
                                var j;
                                for (j = 0; j < this.chartLabels.length; j++) {
                                    if (j >= startIndex && j <= endIndex) {
                                        newBackgrounds.push({x: this.chartLabels[j], y: this.dataMax, y0: this.dataMin, sum: 0});
                                    }
                                    else {
                                        newBackgrounds.push({x: this.chartLabels[j], y: null, y0: null, sum: 0});
                                    }
                                }
                            }

                            var seriesStrokeColor = backgrounds[i].seriesStrokeColor || null,
                                seriesFillOpacity = backgrounds[i].seriesFillOpacity || null,
                                legendValue = backgrounds[i].legendValue || null,
                                legendFormatString = backgrounds[i].legendFormatString || null,
                                hideLegendValue = backgrounds[i].hideLegendValue || this.hideLegendValues,
                                hideInLegend = backgrounds[i].hideInLegend,
                                hideInTooltip = backgrounds[i].hideInTooltip;

                            final.push({
                                label: (backgrounds[i].seriesDescr || ""),
                                data: newBackgrounds,
                                value: legendValue,
                                area: true,
                                seriesStrokeColor: seriesStrokeColor,
                                seriesFillOpacity: seriesFillOpacity,
                                seriesStrokePattern: null,
                                legendFormatString: legendFormatString,
                                seriesPointDot: null,
                                hideLegendValue: hideLegendValue,
                                hideInLegend: hideInLegend,
                                hideInTooltip: hideInTooltip
                            });
                        }
                    }
                }
            }

            return final;
        }
    });
});
