/**
 * Created by atack on 8/19/16.
 */
define([
    "jquery",
    "d3",
    "common-ui/widgets/charting/_D3Chart",
    "common-ui/widgets/utils/formatter"
], function ($, d3, _D3Chart, formatter) {

    "use strict";

    return _D3Chart.extend({

        height: 250,
        minHeight: 100,
        maxHeight: 10000,
        heightRatio: 0.5,
        legendWidth: 175,
        max: null,
        min: null,
        chartType: "Bar",
        hoverOpacity: 0.9,
        dateFormatString: "%b %Y",
        yAxisLabelPadding: 20,
        xAxisLabelPadding: 40,
        showGridLines: true,
        showAxisTickMarks: true,
        barPadding: 5,
        barHeight: 15,
        growChartHeight: true,
        marginTop : 20,
        marginLeft : 50,
        marginBottom : 15,
        marginRight : 20,
        tooltips : true,
        tooltipLine : true,
        heightOfLabel: 0,
        singleSeriesColoredBars: false,
        barSeriesPadding: 0.15,
        stackedBars: false,
        allowNegatives: true,

        // drawNegativesLeftToRight: Boolean
        //      Must also set allowNegatives: true
        //      If set to true and only negative values are given, the axis will draw max to min instead of min to max
        //      If set to true and positives and negatives are given, it will be ignored
        drawNegativesLeftToRight: false,

        // drawYAxisLabelsInsideChart: Boolean
        //      moves the y axis labels inside of the chart to be displayed on top of the bars
        drawYAxisLabelsInsideChart: false,

        createChart: function () {
            if (this.margin && this.svg) {
                var chartWidth = this.width - this.margin.left - this.margin.right,
                    yAxisOrientation = this.drawYAxisLabelsInsideChart ? 'right' : 'left';

                this.y0 = d3.scale.ordinal()
                    .rangeBands([0, this.height - this.margin.top - this.margin.bottom], this.barSeriesPadding);
                this.y1 = d3.scale.ordinal();
                this.x = d3.scale.linear()
                    .range([0, chartWidth]);

                this._previousTickNumber = Math.max((this.width - this.margin.left - this.margin.right)/this.xAxisLabelPadding, 4);

                this.yAxis = d3.svg.axis().scale(this.y0).orient(yAxisOrientation);

                this.xAxis = d3.svg.axis().scale(this.x).orient('top')
                    .ticks(this._previousTickNumber)
                    .tickFormat(function (val) {
                        return formatter.format(val, this.formatString);
                    }.bind(this));

                if (this.showAxisTickMarks && !this.drawYAxisLabelsInsideChart) {
                    this.yAxis.outerTickSize(0);
                    this.xAxis.outerTickSize(0);
                }
                else {
                    this.yAxis.tickSize(0);
                    this.xAxis.tickSize(0);
                }

                if (this.showGridLines) {
                    this.xAxis.tickSize(-(this.height - this.margin.top - this.margin.bottom), 0, 0);
                }

                //Create element to make sure the axis is always behind the chart on the svg
                if (!this.axisLayer) {
                    this.axisLayer = this.svg.append('g').attr('class', 'axis-layer');
                    this.axisLayer.append("g").attr("class", "x axis");
                    this.axisLayer.append("g").attr("class", "y axis");
                }

                if (!this.barLayer) {
                    this.barLayer = this.svg.append('g').attr('class', 'bar-layer');
                }

                if (this.mouseLayer) {
                    this.svg.select(".mouse-events").remove();
                    this.mouseLayer = undefined;
                }
                this.bindTooltipEvents();
            }
        },

        getMargin: function () {
            return {top: this.marginTop, left: this.marginLeft, bottom: this.marginBottom, right: this.marginRight};
        },

        updateChartData: function (data) {
            var animationDuration = this.getAnimationDuration();

            if (this._selectedDom) {
                this._selectedDom.forEach(function (d) {
                    $(d).removeClass("selected");
                    $(d).removeClass("unselected");

                });
                this._selectedDom = false;
            }

            if (this.chartLabels && this.chartLabels.length > 0) {
                this.y0.domain(this.chartLabels);
            }
            else {
                this.y0.domain([]);
            }

            this.x.domain([this.dataMin, this.dataMax]);

            if (this.svg && this.xAxis && this.yAxis) {
                if (data && this.finalBarData) {
                    var maxLabelLength = 0,
                        barData = this.finalBarData;

                    this.axisLayer.selectAll('.inner-axis').remove();

                    this.axisLayer.select(".y.axis").append('g')
                        .attr('class', 'inner-axis')
                        .call(this.yAxis);

                    if (this.drawYAxisLabelsInsideChart) {
                        //add 6 since that's half the font height of the label. Should refactor is needed later
                        var pixelsToMoveLabel = -(this.y0.rangeBand()/2) - 6;
                        this.axisLayer.selectAll(".y.axis text")
                            .attr('transform', function() {
                                if (this.drawYAxisLabelsInsideChart) {
                                    return "translate(0," + pixelsToMoveLabel + ")";
                                }
                                return 0;
                            }.bind(this));
                    }

                    maxLabelLength = this._iterateOverLabelAxis("y");

                    this.calcMarginLeft(maxLabelLength);
                    this.recalcMouseLayer();
                    var chartWidth = this.getChartWidth();

                    this.x.range([0, chartWidth]);

                    this.axisLayer.select(".x.axis").append('g')
                        .attr('class', function () {
                            if (this.showGridLines) {
                                return 'inner-axis gridlines';
                            }
                            else {
                                return 'inner-axis';
                            }
                        }.bind(this))
                        .call(this.xAxis);

                    var series = [];
                    data.forEach(function(d){
                        if (d.label !== null && d.label !== undefined) {
                            series.push(d.label);
                        }
                    });

                    if (this.stackedBars) {
                        this.y1.domain([1]).rangeRoundBands([0, this.y0.rangeBand()]);
                    }
                    else {
                        this.y1.domain(series).rangeRoundBands([0, this.y0.rangeBand()], 0);
                    }
                    
                    this.bars = this.barLayer.selectAll(".bars").data(barData);

                    this.bars.exit()
                        .remove();

                    this.bars.selectAll('rect')
                        .data(function (d) {
                            return d.data;
                        })
                        .exit()
                        .attr("class", "exit")
                        .transition()
                        .duration(animationDuration)
                        .style("fill-opacity", 0)
                        .remove();

                    this.bars.transition()
                        .duration(animationDuration)
                        .attr('transform', function(d) {
                            return "translate(0," + this.y0(d.x) + ")";
                        }.bind(this));

                    this.bars.selectAll('rect')
                        .data(function(d) {
                            return d.data; })
                        .transition()
                        .duration(animationDuration)
                        .attr('width', function(d){
                            return Math.abs(this.x(d.y) - this.x(this.dataMin < 0 ? 0 : this.dataMin));
                        }.bind(this))
                        .attr('x', function (d) {
                            return this._switchedMinMax ? this.x(this.dataMin) : this.x(Math.min((this.dataMin < 0 ? 0 : this.dataMin), d.y)) + this.x(d.y0);
                        }.bind(this))
                        .attr('y', function(d) {
                            return this.stackedBars ? this.y1(1) : this.y1(d.seriesDescr);
                        }.bind(this))
                        .attr('height', this.y1.rangeBand())
                        .style('fill', function(d, i) {
                            return d.barColor || d.seriesStrokeColor || this.seriesStrokes[i % this.seriesStrokes.length];
                        }.bind(this));

                    this.bars.enter().append('g')
                        .attr('class', 'bars')
                        .attr('transform', function(d) {
                            return "translate(0, " + this.y0(d.x)  + ")";
                        }.bind(this));

                    this.bars.selectAll('rect')
                        .data(function(d) {
                            return d.data;
                        })
                        .enter().append('rect')
                        .attr('width', 0)
                        .attr('x', function (d) {
                            return this._switchedMinMax ? this.x(this.dataMin) : this.x(Math.min((this.dataMin < 0 ? 0 : this.dataMin), d.y)) + this.x(d.y0);
                        }.bind(this))
                        .attr('y', function(d) {
                            return this.stackedBars ? this.y1(1) : this.y1(d.seriesDescr);
                        }.bind(this))
                        .attr('height', this.y1.rangeBand())
                        .style('fill', function(d, i) {
                            return d.barColor || d.seriesStrokeColor || this.seriesStrokes[i % this.seriesStrokes.length];
                        }.bind(this))
                        .transition()
                        .duration(animationDuration)
                        .attr('width', function(d){
                            return Math.abs(this.x(d.y) - this.x(this.dataMin < 0 ? 0 : this.dataMin));
                        }.bind(this));
                }

                this.svg.attr('transform', 'translate(' + this.margin.left + ', ' + this.margin.top + ')');
            }
        },

        calcMarginLeft: function(maxLabelLength) {
            this.marginLeft = maxLabelLength + this.yAxisLabelPadding;
        },

        resizeChart: function () {
            this.width = this.getWidth(this.margin, this.attachPoints.chart);

            d3.select(this.attachPoints.chart[0]).select('svg')
                .attr('height', this.height)
                .attr('width', this.width);

            var chartWidth = this.getChartWidth(),
                chartHeight = this.getChartHeight();

            this.xAxis.ticks(Math.max((chartWidth)/this.xAxisLabelPadding, 4));

            this.x.range([0, chartWidth]);

            // Update the axis and text with the new scale
            this.axisLayer.select('.x.axis .inner-axis')
                .call(this.xAxis);

            this.bars.selectAll('rect')
                .data(function (d) {
                    return d.data;
                })
                .attr('width', function (d) {
                    return Math.abs(this.x(d.y) - this.x(this.dataMin < 0 ? 0 : this.dataMin));
                }.bind(this))
                .attr('x', function (d) {
                    return this._switchedMinMax ? this.x(this.dataMin) : this.x(Math.min((this.dataMin < 0 ? 0 : this.dataMin), d.y))  + this.x(d.y0);
                }.bind(this))
                .attr('y', function (d) {
                    return this.stackedBars ? this.y1(1) : this.y1(d.seriesDescr);
                }.bind(this))
                .attr('height', this.y1.rangeBand());

            if (this.mouseLayer) {
                this.mouseLayer
                    .attr('width', chartWidth)
                    .attr('height', chartHeight);
            }
        },

        additionalClickEvents : function () {
            this.dispatchEvent("barClick", this._lastBarData, true);
        },

        calcTooltipValues : function(mouse, evt, tooltip, toggleTooltipVisible) {
            var newChartWidth = this.getChartWidth(),
                range = this.y0.range(),
                interval = range[1] ? (range[1] - (range[0] + this.y0.rangeBand())) : this.y0.rangeBand(),
                y = mouse[1] - interval/2 + range[0],
                bisect = d3.bisect(range, y) - 1,
                index = bisect > -1 ? (bisect >= range.length ? range.length-1: bisect) : 0,
                index2;

            if (this.stackedBars) {
                index2 = this._getSelectedStackedBar(mouse, index);
            }

            else {
                var range2 = this.y1.range(),
                    y2 = mouse[1] - range[index] + (range2[0]/2),
                    bisect2 = d3.bisect(range2, y2) - 1;
                index2 = bisect2 > -1 ? bisect2 : 0;
            }

            if (this._lastTooltipIndex !== index || this._lastTooltipData !== this.finalBarData[index] || this._lastTooltipChartWidth !== newChartWidth) {
                this._lastTooltipIndex = index;
                this._lastTooltipData = this.finalBarData[index];
                this._lastTooltipChartWidth = newChartWidth;
                this._lastSelectedValue = this._lastTooltipData;
                this._lastBarIndex = index2;
                this._lastBarData = this.finalBarData[index] && this.finalBarData[index].data ? this.finalBarData[index].data[index2] : null;
                if (this._lastSelectedValue) {
                    this._lastSelectedValue.selectedItem = this._lastBarData;
                }
                
                if (this.mouseLine) {
                    this.mouseLine.attr("width", newChartWidth)
                        .attr("height", this.y0.rangeBand() + interval)
                        .attr("x", 0)
                        .attr("y", Math.max(0, range[index] - (interval/2)));
                }

                if (this.toggleSelectionOnClick) {
                    this._selectedDom = this.bars[0];
                    this._selectedIndex = index;

                    $(this.bars).addClass("unselected");
                }

                var seriesIdx = 0, series, value,
                    tooltipTextEl = $("<div class='tooltip-label'></div>").text(this.chartLabels[index]),
                    tooltipValueEl,
                    tooltipStrokeEl,
                    tooltipLabelEl,
                    tooltipLabelBoldEl,
                    length = this.stackedBars ? (this.finalBarData[index] ? this.finalBarData[index].data.length : null): this.y1.range().length;

                tooltip.empty().append(tooltipTextEl);

                for(seriesIdx; seriesIdx < length; seriesIdx++){
                    series = this.finalBarData[index] || {};
                    if (series && series.data && series.data.length >= seriesIdx) {
                        value = series.data[seriesIdx];
                        if (value !== null && typeof value !== "undefined") {
                            tooltipValueEl = $("<div class='tooltip-value'></div>");
                            tooltip.append(tooltipValueEl);

                            tooltipStrokeEl = $("<span class='tooltip-stroke'></span>")
                                .css("background", this.getSeriesStroke(value, seriesIdx));
                            tooltipValueEl.append(tooltipStrokeEl);

                            tooltipLabelEl = $("<span></span>")
                                .text(" " + value.seriesDescr + ": ");
                            tooltipValueEl.append(tooltipLabelEl);

                            tooltipLabelBoldEl = $("<b></b>")
                                .text(value.y === null || value.y === undefined
                                    ? this.noLegendValuePlaceholder : formatter.format(value.y, this.formatString));
                            tooltipValueEl.append(tooltipLabelBoldEl);
                        }
                    }
                }
            }

            else if (this._lastBarIndex !== index2) {
                this._lastBarIndex = index2;
                this._lastBarData = this.finalBarData[index] && this.finalBarData[index].data ? this.finalBarData[index].data[index2] : null;
                if (this._lastSelectedValue) {
                    this._lastSelectedValue.selectedItem = this._lastBarData;
                }
            }
            
            tooltip.css({"top": (evt.clientY - 20) + "px", "left": (evt.clientX + 20) + "px"});
            if (!this.tooltipVisible) {
                toggleTooltipVisible(true);
            }
        },

        _getSelectedStackedBar: function (mouse, index){
            var mouseX = this.x.invert(mouse[0]);
            if (this.finalBarData[index] && this.finalBarData[index].data) {
                var i,
                    numberOfBars = this.finalBarData[index].data.length;
                for (i = numberOfBars - 1; i > -1; i--) {
                    if (mouseX > this.finalBarData[index].data[i].y0) {
                        return i;
                    }
                }
                return 0;
            }
        },

        calcChartHeight: function (numberOfSeries) {
            if (this.drawYAxisLabelsInsideChart && this.barPadding < 15) {
                this.barPadding = 15;
            }

            var numberOfLabels = this.chartLabels.length,
                numberOfBars = numberOfLabels * (numberOfSeries || 1),
                totalPadding = (numberOfLabels + 1) * this.barPadding,
                totalBarHeight = this.barHeight * numberOfBars,
                barSeriesPadding = this.barPadding/(this.barHeight * numberOfSeries) * 0.75;

            this.barSeriesPadding = barSeriesPadding < 1 && barSeriesPadding > 0 ? barSeriesPadding : 0.15;

            if (!this.margin) {
                this.margin = this.getMargin();
            }
            this.height = totalPadding + totalBarHeight + this.margin.top + this.margin.bottom;

            d3.select(this.attachPoints.chart[0]).select('svg')
                .attr('height', this.height)
                .attr('width', this.width);
        },

        _dateFormatter: function () {
            if (!this._dateFormatFunc) {
                this._dateFormatFunc = d3.time.format(this.dateFormatString);
            }
            return this._dateFormatFunc;
        },

        getSelectedItem : function() {  return this._lastSelectedValue; },

        extractChartData: function (data) {
            var final = [],
                completeBarData,
                percentPadding = data.percentPadding !== null && data.percentPadding !== undefined ? data.percentPadding : this.percentPadding;
            this.chartLabels = data && data.labels ? data.labels : (this.labels || []);
            this.dataMax = this.max !== null ? this.max : 0;
            this.dataMin = this.min !== null ? this.min : 0;
            this.xProperty = data.xProp || this.xProp || "x";
            this.yProperty = data.yProp || this.yProp || "y";
            this.drawNegativesLeftToRight = data.drawNegativesLeftToRight !== undefined && data.drawNegativesLeftToRight !== null ? data.drawNegativesLeftToRight : this.drawNegativesLeftToRight;
            this._switchedMinMax = false;

            if (data && data.length > 0 && (data.chartSeries === null || data.chartSeries === undefined)) {
                data.chartSeries = data;
            }

            var excludeSeriesMap = {};

            if (this.excludeSeries && this.excludeSeries.length > 0) {
                var k;
                for (k = 0; k < this.excludeSeries.length; k++) {
                    excludeSeriesMap[this.excludeSeries[k]] = true;
                }
            }

            if (data && data.chartSeries && data.chartSeries.length > 0) {
                var barData = [],
                    lastValue,
                    barlabelSums = {},
                    currLabelDate = "",
                    numberOfSeries = 0,
                    value = null,
                    seriesStrokeColor,
                    legendValue,
                    legendFormatString,
                    found;
                
                this.lineData = [];

                data.chartSeries.forEach(function (e) {
                    found = -1;
                    
                    if (!excludeSeriesMap[e.seriesDescr] && !excludeSeriesMap[e.seriesName]) {

                        if (e && e.dataPoint && data.labels && data.labels.length > 0) {
                            var j;
                            e.dataPoints = [];
                            for (j = 0; j < data.labels.length; j++) {
                                e.dataPoints.push(e.dataPoint);
                            }
                        }

                        if (e && e.dataPoints && e.dataPoints.length > 0) {
                            e.dataPoints.forEach(function (d, i) {
                                currLabelDate = null;
                                completeBarData = null;

                                if (d && d[this.xProperty]) {
                                    currLabelDate = d[this.xProperty];
                                    value = d[this.yProperty] === undefined ? null : d[this.yProperty];
                                    found = $.inArray(currLabelDate, this.chartLabels);

                                    if (found < 0) {
                                        this.chartLabels.push(currLabelDate);
                                    }

                                    completeBarData = $.extend({}, d);
                                }

                                else if (data.labels && data.labels.length > i) {
                                    currLabelDate = data.labels[i];
                                    value = d === undefined ? null : d;
                                }

                                if (currLabelDate !== null) {
                                    if (barData[i] === undefined) {
                                        barData[i] = {x: currLabelDate, data: [], y: value};
                                    }

                                    if (!barlabelSums[currLabelDate]) {
                                        barlabelSums[currLabelDate] = 0;
                                    }

                                    barData[i].data.push({
                                        y: value,
                                        y0: barlabelSums[currLabelDate],
                                        seriesDescr: (e.seriesDescr || ""),
                                        seriesStrokeColor: (e.seriesStrokeColor || null),
                                        barColor: (this.singleSeriesColoredBars ? this.seriesStrokes[i % this.seriesStrokes.length] : null),
                                        originalBarData: completeBarData || d
                                    });

                                    barlabelSums[currLabelDate] += this.stackedBars ? (value || 0) : 0;
                                    //Handling a javascript floating point bug
                                    barlabelSums[currLabelDate] = Math.round(barlabelSums[currLabelDate] * 1000000000)/1000000000;
                                    lastValue = value;

                                    if (value > this.dataMax) {
                                        this.dataMax = value;
                                    }

                                    if (value < this.dataMin) {
                                        this.dataMin = value;
                                    }

                                    if (barlabelSums[currLabelDate] > this.dataMax) {
                                        this.dataMax =  barlabelSums[currLabelDate];
                                    }
                                }
                            }.bind(this));
                            numberOfSeries++;
                        }

                        seriesStrokeColor = e.seriesStrokeColor || null;
                        legendValue = e.legendValue !== null && e.legendValue !== undefined ? e.legendValue : lastValue;
                        legendFormatString = e.legendFormatString || null;

                        final.push({
                            label: (e.seriesDescr || ""),
                            data: null,
                            value: legendValue,
                            seriesStrokeColor: seriesStrokeColor,
                            legendFormatString: legendFormatString
                        });
                        
                        legendValue = null;
                    }

                }.bind(this));


                this.finalBarData = barData;

                if (this.dataMin === Number.MAX_VALUE) {
                    this.dataMin = 0;
                }

                if (this.dataMax === this.dataMin) {
                    this.dataMax += 1;
                }
                
                var range = this.dataMax - this.dataMin;

                var onlyNegatives = false;

                if (this.dataMin <= 0 && this.dataMax <= 0) {
                    onlyNegatives = true;
                }

                if (this.min === null || (this.min !== null && typeof this.min !== "undefined" && this.dataMin < this.min)) {
                    this.dataMin = this.calcMinOrMax(this.dataMin, false, range, percentPadding);
                }

                if (this.max === null || (this.max !== null && typeof this.max !== "undefined" && this.dataMax < this.max)) {
                    this.dataMax = this.calcMinOrMax(this.dataMax, true, range, percentPadding);
                }
                
                if (this.drawNegativesLeftToRight && onlyNegatives) {
                    var temp = Math.min(0, this.dataMax);
                    this.dataMax = this.dataMin;
                    this.dataMin = temp;
                    this._switchedMinMax = true;
                }

                if (this.growChartHeight) {
                    this.heightRatio = null;
                    numberOfSeries = this.stackedBars ? 1 : numberOfSeries;
                    if (this.stackedBars) {
                        numberOfSeries = 1;
                        this.barHeight = this.barHeight <= 20 ? 20 : this.barHeight;
                    }
                    this.calcChartHeight(numberOfSeries);
                }
            }

            this.createChart();

            return final;
        }
    });
});
