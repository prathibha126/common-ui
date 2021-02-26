define([
    "jquery",
    "d3",
    "common-ui/widgets/charting/_D3Chart",
    "common-ui/widgets/utils/formatter"
], function ($, d3, _D3Chart, formatter) {

    "use strict";

    return _D3Chart.extend({

        chartType: "Scatter",
        height: 500,
        heightRatio: 0.50,
        heightOfLabel: 0,
        marginTop : 20,
        marginLeft : 60,
        marginBottom : 50,
        marginRight : 25,
        showLegend: false,
        legendPosition: "bottom",
        minX : null,
        minY : null,
        maxX : null,
        maxY : null,
        percentPaddingX : 0.05,
        percentPaddingY : 0.05,
        tooltips: true,
        showGridLines: true,
        showXGridLines: false,
        showAxisTickMarks: true,
        formatString: "",
        datasetStrokeWidth: 2,
        lineInterpolation: "cardinal",
        yAxisLabelPadding: 40,

        seriesStrokes: ["#6ccef6", "#ffb819", "#bd10e0", "#ffd930", "#bada55", "#6e991e", "#50e3c2", "#0091b3",  "#005c72", "#C0C0C0", "#666666"],
        lineSeriesStrokes: ["#30659B", "#C0C0C0", "#666666"],

        regularDotSize: 150, //100-1000
        selectedDotSize: 350,
        showYAxis: true,

        createChart: function () {
            if (this.margin) {
                var chartWidth = this.getChartWidth(),
                    chartHeight = this.getChartHeight();

                this.x = d3.scale.linear().range([0, chartWidth]);
                this.y = d3.scale.linear().range([chartHeight, 0]);

                if (this.hasRegressionLine) {
                    this.chart = d3.svg.line()
                        .interpolate(this.lineInterpolation)
                        .x(function (d) {
                            return d ? this.x(d.x) : null;
                        }.bind(this))
                        .y(function (d) {
                            return d ? this.y(d.y) : null;
                        }.bind(this))
                        .defined(function(d) { return d.y!==null;});
                }

                this.xAxis = d3.svg.axis().scale(this.x).orient('bottom')
                    .tickFormat(function (val) {
                        return formatter.format(val, this.xFormat);
                    }.bind(this)).outerTickSize(0);

                this.yAxis = d3.svg.axis().scale(this.y).orient('left')
                    .ticks(Math.max(Math.floor(this.getChartHeight()/this.yAxisLabelPadding), 4))
                    .tickFormat(function (val) {
                        return formatter.format(val, this.yFormat);
                    }.bind(this)).outerTickSize(0);


                if (!this.showAxisTickMarks) {
                    this.xAxis.tickSize(0);
                    this.yAxis.tickSize(0);
                }

                if (this.showGridLines) {
                    this.yAxis.tickSize(-chartWidth, 0, 0);
                }

                if (this.showXGridLines) {
                    this.xAxis.tickSize(-chartHeight, 0, 0);
                }

                if (!this.axisLayer) {
                    this.axisLayer = this.svg.append('g').attr('class', 'axis-layer');
                }

                //Add && hasLine
                if (!this.lineLayer) {
                    this.lineLayer = this.svg.append('g').attr('class', 'line-layer');
                }

                if (!this.dotsLayer) {
                    this.dotsLayer = this.svg.append('g').attr('class', 'dots-layer');
                }

            }
        },

        updateChartData: function (data) {
            if (data && data.length > 0 && this.svg && this.xAxis && this.yAxis) {
                var chartWidth = this.getChartWidth(),
                    chartHeight = this.getChartHeight(),
                    maxLabelLength = 0,
                    currLabelLength = 0,
                    xAxisPadding = this.showAxisTickMarks ? '.75em' : '1.1em',
                    _xPosition = 0,
                    xPosition = 0,
                    tickGap = 0,
                    maxTickGap = 0;

                this.x.domain([this.dataMinX, this.dataMaxX]);
                this.y.domain([this.dataMinY, this.dataMaxY]);

                this.axisLayer.selectAll('g.axis').remove();

                this.axisLayer.append('g')
                    .attr('class', function () {
                        if (this.showGridLines) {
                            return 'x axis gridlines';
                        }
                        else {
                            return 'x axis';
                        }
                    }.bind(this))
                    .attr('transform', 'translate(0, ' + chartHeight + ')')
                    .call(this.xAxis)
                    .selectAll('text')
                    .attr('dy', xAxisPadding)
                    .each(function(d){
                        currLabelLength = this.getComputedTextLength();

                        if(currLabelLength > maxLabelLength) {
                            maxLabelLength = currLabelLength;
                        }

                        xPosition = d3.transform(d3.select(this.parentNode).attr("transform")).translate[0];
                        tickGap = xPosition - _xPosition;

                        if (tickGap > maxTickGap) {
                            maxTickGap = tickGap;
                        }

                        _xPosition = xPosition;
                    });

                if (maxLabelLength > maxTickGap) {
                    this.xAxis.ticks(Math.max(chartWidth / (maxLabelLength + 10), 4));
                    this.axisLayer.select('.x.axis').call(this.xAxis);
                }

                this.y.range([chartHeight, 0]);

                if (this.showYAxis) {
                    this.axisLayer.append('g')
                        .attr('class', function () {
                            if (this.showGridLines) {
                                return 'y axis gridlines';
                            }
                            else {
                                return 'y axis';
                            }
                        }.bind(this))
                        .call(this.yAxis);
                }

                this.axisLayer.selectAll("text.axis-label").remove();

                var yAxisWidth = 10,
                    xAxisHeight = 20;

                // we need to wrap the next 2 lines in a try catch in case either of the axes are hidden (will error in firefox)
                try {
                    xAxisHeight += this.axisLayer.select("g.x.axis").node().getBBox().height;
                }
                catch (err1) {
                    // do nothing
                }
                
                if (this.showYAxis) {
                    try {
                        yAxisWidth += this.axisLayer.select("g.y.axis").node().getBBox().width;
                    }
                    catch (err2) {
                        // do nothing
                    }

                    if (this.showGridLines) {
                        yAxisWidth -= chartWidth;
                    }

                    this.axisLayer.append("text")
                        .attr("class", "y axis axis-label")
                        .attr("text-anchor", "middle")
                        .attr("transform", "translate(" + (yAxisWidth * -1) + "," + (chartHeight / 2) + ")rotate(-90)")
                        .text(this.yLabel);
                }

                this.axisLayer.append("text")
                    .attr("class", "x axis axis-label")
                    .attr("text-anchor", "middle")
                    .attr("transform", "translate("+ (chartWidth/2) +","+(chartHeight + xAxisHeight)+")")
                    .text(this.xLabel);

                this.updateDots(data);

                this.updateLines();

                this.bindTooltipEvents();

                this.svg.attr('transform', 'translate(' + this.margin.left + ', ' + this.margin.top + ')');
            }
        },

        updateDots: function () {
            var animationDuration = this.getAnimationDuration(),
                animationDelay = this.getAnimationDelay();

            this.dots = this.dotsLayer.selectAll(".series").data(this.dotsData);

            this.dots.exit()
                .transition()
                .duration(animationDuration/2)
                .attr("opacity", 0)
                .remove();

            this.dots
                .selectAll("path.dots")
                .data(function (d) {
                    return d.data;
                })
                .exit()
                .transition()
                .duration(animationDuration/2)
                .attr("opacity", 0)
                .remove();

            this.dots
                .style("fill", function (d, i) {
                    return d.seriesStrokeColor || this.seriesStrokes[i % this.seriesStrokes.length];
                }.bind(this));

            this.dots
                .selectAll("path.dots")
                .data(function (d) {
                    return d.data;
                })
                .transition()
                .delay(animationDelay)
                .duration(animationDuration)
                .attr("d", function(d,i, j) { return d3.svg.symbol().type(d3.svg.symbolTypes[j % 6]).size(this.regularDotSize)(); }.bind(this))
                .attr("transform", function(d) { return "translate(" + this.x(d.x) + "," + this.y(d.y) + ")"; }.bind(this));

            this.dots
                .enter().append('g')
                .attr("class", "series")
                .style("fill", function (d, i) {
                    return d.seriesStrokeColor || this.seriesStrokes[i % this.seriesStrokes.length];
                }.bind(this));

            this.dots
                .selectAll("path.dots")
                .data(function (d) {
                    return d.data;
                })
                .enter()
                .append("path")
                .attr("class", "dots")
                .attr("d", function(d,i, j) { return d3.svg.symbol().type(d3.svg.symbolTypes[j % 6]).size(this.regularDotSize)(); }.bind(this))
                .attr("opacity", 0)
                .attr("transform", function(d) { return "translate(" + this.x(d.x) + "," + this.y(0) + ")"; }.bind(this))
                .transition()
                .delay(animationDelay)
                .duration(animationDuration)
                .attr("transform", function(d) { return "translate(" + this.x(d.x) + "," + this.y(d.y) + ")"; }.bind(this))
                .attr("opacity", 1);
        },

        updateLines: function () {
            if (this.svg) {
                var animationDuration = this.getAnimationDuration(),
                    animationDelay = this.getAnimationDelay(),
                    path = this.lineLayer.selectAll("path.line").data(this.lineData);

                path.exit()
                    .transition()
                    .duration(animationDuration/2)
                    .remove();

                path.style("stroke-width", this.datasetStrokeWidth + "px")
                    .style("stroke", function (d, i) {
                        return d.seriesStrokeColor || this.lineSeriesStrokes[i % this.lineSeriesStrokes.length];
                    }.bind(this))
                    .style("stroke-dasharray", this.getSeriesDasharray.bind(this, this.lineData.length));

                var pathContext = animationDuration > 0 ?
                    path.transition()
                        .delay(animationDelay)
                        .duration(animationDuration) :
                    path;

                pathContext.attr("d", function (d) {
                    return this.chart(d.data);
                }.bind(this));

                var trend = path.enter().append("path")
                    .attr("class", "line")
                    .style("stroke-width", this.datasetStrokeWidth + "px")
                    .style("stroke", function (d, i) {
                        return d.seriesStrokeColor || this.lineSeriesStrokes[i % this.lineSeriesStrokes.length];
                    }.bind(this))
                    .style("stroke-dasharray", this.getSeriesDasharray.bind(this, this.lineData.length));

                var trendContext = animationDuration > 0 ?
                    trend.attr("d", this.getTrendData.bind(this))
                        .transition()
                        .duration(animationDuration) :
                    trend;
                trendContext.attr("d", function (d) {
                    return this.chart(d.data);
                }.bind(this));
            }
        },

        getTrendData : function (d) {
            if (this.animationDuration > 0) {
                var initData = $.extend(true, {}, d);
                initData.data.forEach(function (e, i) {
                    e.y = 0;
                });
                return this.chart(initData.data);
            }
            else {
                return this.chart(d.data);
            }
        },

        resizeChart: function () {
            var currWidth = $(window).width(),
                currHeight = $(window).height();

            if ((this.width === currWidth && this.height === currHeight) ||
                currWidth <= 0 || currHeight <= 0 || !$(this.domNode).is(":visible")) {
                return;
            }

            this.width = this.getWidth(this.margin, this.attachPoints.chart);
            this.height = this.getHeight(this.margin, this.attachPoints.chart);

            d3.select(this.attachPoints.chart[0]).select('svg')
                .attr('height', this.height)
                .attr('width', this.width);

            var chartWidth = this.getChartWidth(),
                chartHeight = this.getChartHeight(),
                xAxisPadding = this.showAxisTickMarks ? '.75em' : '1.1em',
                maxLabelLength = 0,
                currLabelLength = 0,
                _xPosition = 0,
                xPosition = 0,
                tickGap = 0,
                maxTickGap = 0;

            this.x.range([0, chartWidth]);
            this.y.range([chartHeight, 0]);

            // Update the axis and text with the new scale
            this.xAxis = d3.svg.axis().scale(this.x).orient('bottom')
                .tickFormat(function (val) {
                    return formatter.format(val, this.xFormat);
                }.bind(this)).outerTickSize(0);

            if (this.showXGridLines) {
                this.xAxis.tickSize(-chartHeight, 0, 0);
            }

            this.axisLayer.select('g.x.axis')
                .attr('transform', 'translate(0, ' + chartHeight + ')')
                .call(this.xAxis)
                .selectAll('text')
                .attr('dy', xAxisPadding)
                .each(function(d){
                    currLabelLength = this.getComputedTextLength();

                    if(currLabelLength > maxLabelLength) {
                        maxLabelLength = currLabelLength;
                    }

                    xPosition = d3.transform(d3.select(this.parentNode).attr("transform")).translate[0];
                    tickGap = xPosition - _xPosition;

                    if (tickGap > maxTickGap) {
                        maxTickGap = tickGap;
                    }

                    _xPosition = xPosition;
                });

            if (maxLabelLength > maxTickGap) {
                this.xAxis.ticks(Math.max(chartWidth / (maxLabelLength + 10), 4));
                this.axisLayer.select('.x.axis').call(this.xAxis);
            }

            var xAxisHeight = 20 + this.axisLayer.select("g.x.axis").node().getBBox().height;

            this.axisLayer.selectAll(".x.axis.multicolor")
                .attr("x", 0)
                .attr("width", chartWidth)
                .attr("y", chartHeight - 2)
                .attr("height", 2);

            this.axisLayer.selectAll("text.x.axis.axis-label")
                .attr("transform", "translate("+ (chartWidth/2) +","+(chartHeight + xAxisHeight)+")");

            if (this.showYAxis) {
                this.yAxis.ticks(Math.max(Math.floor(this.getChartHeight()/this.yAxisLabelPadding), 4));

                if (this.showGridLines) {
                    this.yAxis.tickSize(-chartWidth, 0, 0);
                }

                this.axisLayer.selectAll('g.y.axis')
                    .call(this.yAxis);

                var yAxisWidth = 10 + this.axisLayer.select("g.y.axis").node().getBBox().width;

                if (this.showGridLines) {
                    yAxisWidth -= chartWidth;
                }

                this.axisLayer.selectAll("text.y.axis.axis-label")
                    .attr("transform", "translate("+ (yAxisWidth*-1) +","+(chartHeight/2)+")rotate(-90)");
            }

            this.dots.selectAll("path.dots")
                .attr("transform", function(d) {
                    return "translate(" + this.x(d.x) + "," + this.y(d.y) + ")";
                }.bind(this));

            this.dots.selectAll("circle.dots")
                .attr('cx', function (d) {
                    return this.x(d.x); }.bind(this))
                .attr('cy', function (d) {
                    return this.y(d.y); }.bind(this));

            this.dots.selectAll(".dot-label").attr("transform", function(d) {
                return "translate(" + this.x(d.x) +", " + this.y(d.y) + ")";
            }.bind(this));

            this.lineLayer.selectAll('path.line')
                .attr("d", function(d) { return this.chart(d.data); }.bind(this));
        },

        bindTooltipEvents : function(name) {
            if (this.tooltips && !window.Modernizr.printlayout) {
                var me = this,
                    tooltip = this.createTooltip(),
                    toggleTooltipVisible = function (visible) {
                        if (visible) {
                            tooltip.show();
                        }
                        else {
                            tooltip.hide();
                        }
                        me.tooltipVisible = visible;
                    };

                var selection = this.chartType.toLowerCase() === "bubble" ? ".bubble" : ".dots",
                    evtPostfix = '.chart.' + this._key + name;

                this.dots.selectAll(selection)
                    .on('mousemove' + evtPostfix, function (d, i, j) {
                        me.highlightSelected(this, j);
                        me.calcTooltipValues(this, d, i, j, tooltip, toggleTooltipVisible);
                    })
                    .on('mouseover' + evtPostfix, toggleTooltipVisible.bind(this, true))
                    .on('mouseout' + evtPostfix, function (d, i, j) {
                        me.deselect(this, j);
                        toggleTooltipVisible(false);
                    });

                if (this.dots && this.dots.length > 0) {
                    this.connect($(this.dots[0]).find(selection), 'click' + evtPostfix, function (evt) {
                        evt.stopPropagation();
                        toggleTooltipVisible(false);
                        this._lastClickedValue = this._lastSelectedValue;
                        this.dispatchEvent("change", this._lastSelectedValue, true);
                        this.dispatchEvent("selectionClick", this._lastSelectedValue, true);
                    }.bind(this));
                }
            }
        },

        highlightSelected: function (me, series) {
            d3.select(me)
                .transition()
                .duration(100)
                .attr('d', d3.svg.symbol().type(d3.svg.symbolTypes[series % 6]).size(this.selectedDotSize));
        },

        deselect: function (me, series) {
            d3.select(me)
                .transition()
                .duration(100)
                .attr('d', d3.svg.symbol().type(d3.svg.symbolTypes[series % 6]).size(this.regularDotSize));
        },

        calcTooltipValues: function (me, d, index, j, tooltip, toggleTooltipVisible) {
            var newChartWidth = this.getChartWidth(),
                label = d.label || (this.data.length > j && this.data[j] ? this.data[j].label : ""),
                valueX = d.xVal !== undefined ? d.xVal : d.x,
                valueY = d.yVal !== undefined ? d.yVal : d.y,
                valueR = d.rVal !== undefined ? d.rVal : d.r;

            //Add d.x and d.y check
            if (this._lastTooltipValueX !== valueX || this._lastTooltipValueY !== valueY || this._lastTooltipLabel !== label || this._lastTooltipChartWidth !== newChartWidth) {
                this._lastTooltipValueX = valueX;
                this._lastTooltipValueY = valueY;
                this._lastTooltipLabel = label;
                this._lastTooltipChartWidth = newChartWidth;
                this._lastSelectedValue = null;

                var tooltipTextEl,
                    tooltipStrokeEl,
                    tooltipTextLabelEl,
                    tooltipValueEl,
                    tooltipValueItemEl,
                    tooltipValueItemBoldEl;

                tooltip.empty();

                if (label !== undefined && label !== null) {
                    this._lastSelectedValue = d;

                    // use the first valid series to add the x value
                    tooltipTextEl = $("<div class='tooltip-label'></div>");

                    tooltipStrokeEl = $("<span class='tooltip-stroke'></span>")
                        .css("background", (d.color || (this.useChromaColors && this.chartType.toLowerCase() === "bubble" ?
                            this.getColor(valueX, this.values, this.colors) : this.getSeriesStroke(this.data, j))));
                    tooltipTextEl.append(tooltipStrokeEl);

                    tooltipTextLabelEl = $("<span></span>")
                        .text(" " + label);
                    tooltipTextEl.append(tooltipTextLabelEl);

                    tooltip.append(tooltipTextEl);

                    tooltipValueEl = $("<div class='tooltip-value'></div>");

                    if (this.xLabel) {
                        tooltipValueItemEl = $("<div class='x-value'></div>")
                            .text(this.xLabel + ": ");
                        tooltipValueItemBoldEl = $("<b></b>")
                            .text(valueX === null || valueX === undefined ? this.noLegendValuePlaceholder : formatter.format(valueX, this.xFormat));
                        tooltipValueItemEl.append(tooltipValueItemBoldEl);
                        tooltipValueEl.append(tooltipValueItemEl);
                    }

                    if (this.yLabel) {
                        tooltipValueItemEl = $("<div class='y-value'></div>")
                            .text(this.yLabel + ": ");
                        tooltipValueItemBoldEl = $("<b></b>")
                            .text(valueY === null || valueY === undefined ? this.noLegendValuePlaceholder : formatter.format(valueY, this.yFormat));
                        tooltipValueItemEl.append(tooltipValueItemBoldEl);
                        tooltipValueEl.append(tooltipValueItemEl);
                    }

                    if (this.rLabel) {
                        tooltipValueItemEl = $("<div class='r-value'></div>")
                            .text(this.rLabel + ": ");
                        tooltipValueItemBoldEl = $("<b></b>")
                            .text(valueR === null || valueR === undefined ? this.noLegendValuePlaceholder : formatter.format(valueR, this.rFormat));
                        tooltipValueItemEl.append(tooltipValueItemBoldEl);
                        tooltipValueEl.append(tooltipValueItemEl);
                    }

                    tooltip.append(tooltipValueEl);

                }
            }
            tooltip.css({"top": (d3.event.clientY - 20) + "px", "left": (d3.event.clientX + 20) + "px"});
            if (!this.tooltipVisible) {
                toggleTooltipVisible(true);
            }
        },

        initializeData: function(data) {
            this.lineData = [];
            this.dotsData = [];
            this.hasRegressionLine = false;
            this.xLabel = data.xAxisLabel || this.xAxisLabel || "";
            this.yLabel = data.yAxisLabel || this.yAxisLabel || "";
            this.rLabel = data.rValueLabel || this.rValueLabel || "";
            var minX = data.minX !== null && data.minX !== undefined ? data.minX : this.minX;
            var minY = data.minY !== null && data.minY !== undefined ? data.minY : this.minY;
            var maxX = data.maxX !== null && data.maxX !== undefined ? data.maxX : this.maxX;
            var maxY = data.maxY !== null && data.maxY !== undefined ? data.maxY : this.maxY;
            this.dataMinX = minX !== null && minX !== undefined ? minX : Number.MAX_VALUE;
            this.dataMinY = minY !== null && minY !== undefined ? minY : Number.MAX_VALUE;
            this.dataMaxX = maxX !== null && maxX !== undefined ? maxX : 0;
            this.dataMaxY = maxY !== null && maxY !== undefined ? maxY : 0;
            this.xFormat = data.xFormatString || this.xFormatString || this.formatString || "";
            this.yFormat = data.yFormatString || this.yFormatString || this.formatString || "";
            this.xProperty = data.xProp || this.xProp || "x";
            this.yProperty = data.yProp || this.yProp || "y";
            this.labelProperty = data.labelProp || this.labelProp || "label";
        },

        mapExclusions: function () {
            var excludeSeriesMap = {};
            if (this.excludeSeries && this.excludeSeries.length > 0) {
                var k;
                for (k = 0; k < this.excludeSeries.length; k++) {
                    excludeSeriesMap[this.excludeSeries[k]] = true;
                }
            }
            return excludeSeriesMap;
        },
        
        setMinandMax: function (data) {
            var percentPaddingX = data && data.percentPaddingX !== null && data.percentPaddingX !== undefined ? data.percentPaddingX : this.percentPaddingX,
                percentPaddingY = data && data.percentPaddingY !== null && data.percentPaddingY !== undefined ? data.percentPaddingY : this.percentPaddingY;

            if (this.dataMinX === Number.MAX_VALUE) {
                this.dataMinX = 0;
            }
            if (this.dataMinY === Number.MAX_VALUE) {
                this.dataMinY = 0;
            }

            var rangeX = this.dataMaxX - this.dataMinX,
                rangeY = this.dataMaxY - this.dataMinY;

            // if max and min are both 0, then make the range 0-1
            if (this.dataMaxX === this.dataMinX) {
                this.dataMaxX = this.calcMinOrMax(this.dataMaxX, true, rangeX, percentPaddingX);
                if (this.dataMaxX === 0 && this.dataMaxX === this.dataMinX) {
                    this.dataMaxX = 1;
                }
            }
            // if max and min are both 0, then make the range 0-1
            if (this.dataMaxY === this.dataMinY) {
                this.dataMaxY = this.calcMinOrMax(this.dataMaxY, true, rangeY, percentPaddingY);
                if (this.dataMaxY === 0 && this.dataMaxY === this.dataMinY) {
                    this.dataMaxY = 1;
                }
            }

            if (this.minX === null || (this.minX !==null && typeof this.minX !== "undefined" && this.dataMinX < this.minX)) {
                this.dataMinX = this.calcMinOrMax(this.dataMinX, false, rangeX, percentPaddingX);
            }
            if (this.minY === null || (this.minY !== null && typeof this.minY !== "undefined" && this.dataMinY < this.minY)) {
                this.dataMinY = this.calcMinOrMax(this.dataMinY, false, rangeY, percentPaddingY);
            }

            if (this.maxX === null || (this.maxX !== null && typeof this.maxX !== "undefined" && this.dataMaxX < this.maxX)) {
                this.dataMaxX = this.calcMinOrMax(this.dataMaxX, true, rangeX, percentPaddingX);
            }
            if (this.maxY === null || (this.maxY !== null && typeof this.maxY !== "undefined" && this.dataMaxY < this.maxY)) {
                this.dataMaxY = this.calcMinOrMax(this.dataMaxY, true, rangeY, percentPaddingY);
            }
        },

        extractChartData: function (data) {
            var final = [],
                seriesData =[],
                legendValue = null,
                legendFormatString = null,
                seriesStrokeColor = null,
                seriesStrokePattern = null;

            this.initializeData(data);

            if (data && data.length > 0 && (data.chartSeries === null || data.chartSeries === undefined)) {
                data.chartSeries = data;
            }

            var excludeSeriesMap = this.mapExclusions();

            if (data && data.chartSeries && data.chartSeries.length > 0) {
                var x = null,
                    y = null;

                data.chartSeries.forEach(function (d) {
                    if (!excludeSeriesMap[d.seriesDescr] && !excludeSeriesMap[d.seriesName]) {
                        seriesData = [];
                        if (d && d.dataPoints && d.dataPoints.length > 0) {
                            d.dataPoints.forEach(function (e) {
                                if (e && e[this.xProperty] !== undefined) {
                                    x = e[this.xProperty] !== null && e[this.xProperty] !== undefined ? e[this.xProperty] : null;
                                    y = e[this.yProperty] !== null && e[this.yProperty] !== undefined ? e[this.yProperty] : null;

                                    if (x !== null && y !== null) {
                                        seriesData.push({x: x, y: y});
                                    }

                                    if (x !== null && this.dataMinX > x) {
                                        this.dataMinX = x;
                                    }
                                    if (y !== null && this.dataMinY > y) {
                                        this.dataMinY = y;
                                    }
                                    if (this.dataMaxX < x) {
                                        this.dataMaxX = x;
                                    }
                                    if (this.dataMaxY < y) {
                                        this.dataMaxY = y;
                                    }

                                }
                            }.bind(this));
                        }

                        seriesStrokeColor = d.seriesStrokeColor || null;
                        legendValue = d.legendValue || y;
                        legendFormatString  = d.legendFormatString || null;
                        seriesStrokePattern = d.seriesStrokePattern || null;

                        if (d.chartType && d.chartType.toLowerCase() === 'line') {
                            this.hasRegressionLine = true;

                            this.lineData.push({
                                label: (d.seriesDescr || ""),
                                data: seriesData,
                                value: legendValue,
                                seriesStrokeColor: seriesStrokeColor,
                                seriesStrokePattern: seriesStrokePattern,
                                legendFormatString: legendFormatString
                            });
                        }

                        else if (seriesData.length > 0) {
                            this.dotsData.push({label: (d.seriesDescr || ""), data: seriesData, value: legendValue, seriesStrokeColor: seriesStrokeColor});
                        }
                    }


                }.bind(this));

                this.dotsData.forEach(function(d){
                    final.push(d);
                });

                this.lineData.forEach(function(d){
                    final.push(d);
                });

                this.setMinandMax(data);

                this.createChart();
            }

            return final;
        }
    });
});
