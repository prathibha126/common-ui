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
        heightRatio: 0.50,
        legendWidth: 220,
        max: null,
        min: null,
        datasetStrokeWidth: 3,
        lineInterpolation: "cardinal", // linear for straight line, basis for curve
        chartType: "Bar",
        hoverOpacity: 0.9,
        dateFormatString: "%b %Y",
        heightOfLabel: 0,
        labelRotation: 45,
        alwaysRotateLabels: false,
        horizontalLabelPadding: 10,
        showGridLines: true,
        showAxisTickMarks: true,
        pointDot: false,
        pointDotRadius: 5,
        allowLabelRotation: true,
        barSeriesPadding: 0.1, //value between 0 - 1
        barValuePadding: 0.1, //value between 0-1
        marginTop : 20,
        marginLeft : 40,
        marginBottom : 30,
        marginRight : 20,
        firstSeriesPointDot: true,
        tooltips : true,
        tooltipLine : true,
        multiYAxis: false,
        barAxis: 0,
        lineAxis: 1,
        yLabelMargin: 30,
        showYAxisLabels: false,
        stackedBars: false,
        allowNegatives: true,

        //Separate bar and line colors
        seriesStrokes: ["#6ccef6", "#ffb819", "#bd10e0", "#ffd930", "#bada55", "#6e991e", "#50e3c2", "#0091b3",  "#005c72", "#C0C0C0", "#666666"],
        lineSeriesStrokes: ["#005c72", "#C0C0C0", "#666666"],

        createChart: function () {
            if (this.margin && this.data && this.svg) {
                var hasLine = this._hasLineChart(),
                    chartWidth = this.getChartWidth(),
                    chartHeight = this.getChartHeight(),
                    barSeriesPadding = this.barSeriesPadding;

                this.x0 = d3.scale.ordinal()
                    .rangeRoundBands([0, chartWidth], barSeriesPadding);
                this.x1 = d3.scale.ordinal();
                this.y = d3.scale.linear()
                    .range([chartHeight, 0]);
                
                if (hasLine) {
                    this.line = d3.svg.line()
                        .interpolate(this.lineInterpolation)
                        .x(function (d) {
                            return d ? this.x0(d.x) + this.x0.rangeBand() / 2 : null;
                        }.bind(this))
                        .y(function (d) {
                            return d ? this.lineY(d.y) : null;
                        }.bind(this))
                        .defined(function(d) { return d.y!==null;});
                }

                this.xAxis = d3.svg.axis().scale(this.x0).orient('bottom').outerTickSize(0);
                this.yAxis = d3.svg.axis().scale(this.y).orient('left')
                    .ticks(Math.max((chartHeight)/40, this.minYAxisTicks))
                    .tickFormat(function (val) {
                        return formatter.format(val, this.formatIsArray ? this.formatString[0] : this.formatString);
                    }.bind(this))
                    .outerTickSize(0);

                if (!this.showAxisTickMarks) {
                    this.xAxis.tickSize(0);
                    this.yAxis.tickSize(0);
                }

                if (this.showGridLines) {
                    this.yAxis.tickSize(-chartWidth, 0, 0);
                }

                //Create element to make sure the axis is always behind the chart on the svg
                if (!this.axisLayer) {
                    this.axisLayer = this.svg.append('g').attr('class', 'axis-layer');
                }

                if (!this.barLayer) {
                    this.barLayer = this.svg.append('g').attr('class', 'bar-layer');
                }

                if (!this.lineLayer) {
                    this.lineLayer = this.svg.append('g').attr('class', 'line-layer');
                }

                this.bindTooltipEvents();
            }
        },

        updateChartData: function (data) {
            this.heightOfLabel = 0;
            this.margin = this.getMargin();

            var hasLine = this._hasLineChart(), 
                barValuePadding = this.barValuePadding,
                barSeriesPadding = this.barSeriesPadding,
                xAxisPadding = this.showAxisTickMarks ? '.75em' : '1.1em',
                animationDuration = this.getAnimationDuration(),
                animationDelay = this.getAnimationDelay(),
                chartWidth = this.getChartWidth(),
                chartHeight = this.getChartHeight();

            this.allowLabelRotation = this.labelRotation === 0 ? false : this.allowLabelRotation;

            if (this.chartLabels && this.chartLabels.length > 0) {
                this.x0.domain(this.chartLabels).rangeRoundBands([0, chartWidth], barSeriesPadding);
            }
            else {
                this.x0.domain([]).rangeRoundBands([0, chartWidth], barSeriesPadding);
            }

            if (!this.multiYAxis) {
                var min = this.dataMin.length ? this.dataMin[0] : this.dataMin,
                    max = this.dataMax.length ? this.dataMax[0] : this.dataMax;

                this.y.domain([min, Math.max(0, max)]);
            }

            if (this.svg && this.xAxis && (this.yAxis || this.yAxis0)) {
                if (data && data.length > 0 && this.finalBarData && this.finalBarData.length > 0) {
                    var tooltip = this.createTooltip(),
                        combinedLabelLength,
                        horizontalLabelPadding = this.horizontalLabelPadding,
                        axisFormatString;

                    this.formatIsArray = Array.isArray(this.formatString);
                    
                    this.axisLayer.selectAll('g.axis').remove();

                    this.axisLayer.append('g')
                        .attr('class', 'x axis')
                        .attr('transform', 'translate(0, ' + chartHeight + ')')
                        .call(this.xAxis)
                        .selectAll('text')
                        .attr('dy', xAxisPadding);

                    var maxLabelLength = this._iterateOverLabelAxis("x");

                    combinedLabelLength = (maxLabelLength + horizontalLabelPadding) * this.chartLabels.length;

                    if ((combinedLabelLength >= chartWidth && this.allowLabelRotation) || this.alwaysRotateLabels) {
                        this.rotateLabels(chartWidth, maxLabelLength);
                        this.recalcMouseLayer();
                        chartHeight = this.getChartHeight();
                    }

                    this.y.range([chartHeight, 0]);
                    
                    if (this.multiYAxis) {
                        this.y0 = d3.scale.linear().range([chartHeight, 0]).domain([this.dataMin[0], Math.max(0, this.dataMax[0])]);
                        this.y1 = d3.scale.linear().range([chartHeight, 0]).domain([this.dataMin[1], Math.max(0, this.dataMax[1])]);

                        this.yAxis0 = d3.svg.axis().scale(this.y0).orient('left')
                            .ticks(Math.max((chartHeight)/40, this.minYAxisTicks))
                            .tickFormat(function (val) {
                                axisFormatString = this.formatIsArray ? this.formatString[0] : this.formatString;
                                return formatter.format(val, axisFormatString);
                            }.bind(this))
                            .outerTickSize(0);
                        this.yAxis1 = d3.svg.axis().scale(this.y1).orient('right')
                            .ticks(Math.max((chartHeight)/40, this.minYAxisTicks))
                            .tickFormat(function (val) {
                                axisFormatString = this.formatIsArray ? this.formatString[1] : this.formatString;
                                return formatter.format(val, axisFormatString);
                            }.bind(this))
                            .outerTickSize(0);

                        if (!this.showAxisTickMarks) {
                            this.yAxis0.tickSize(0);
                            this.yAxis1.tickSize(0);
                        }

                        if (this.showGridLines) {
                            this.yAxis0.tickSize(-chartWidth, 0, 0);
                        }

                        this.axisLayer.append('g')
                            .attr('class', function () {
                                if (this.showGridLines) {
                                    return 'y axis primary gridlines';
                                }
                                else {
                                    return 'y axis primary';
                                }
                            }.bind(this))
                            .call(this.yAxis0);

                        this.axisLayer.append('g')
                            .attr('class', 'y axis secondary')
                            .attr('transform', "translate(" + chartWidth + " ,0)")
                            .call(this.yAxis1);
                    }

                    else {
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

                    var series = [];

                    data.forEach(function(d, i){
                        if (d.label !== null && d.label !== undefined && i < this.numberOfBarSeries) {
                            series.push(d.label);
                        }
                    }.bind(this));

                    if (this.stackedBars) {
                        this.x1.domain([1]).rangeRoundBands([0, this.x0.rangeBand()]);
                    }
                    else {
                        this.x1.domain(series).rangeRoundBands([0, this.x0.rangeBand()], barValuePadding);
                    }

                    this.updateBars(data, tooltip, animationDelay, animationDuration);
                }

                if (data && data.length > 0 && hasLine) {
                    this.updateLines(animationDelay, animationDuration);
                }

                this.updateYAxisLabels(chartWidth, chartHeight);
                this.svg.attr('transform', 'translate(' + this.margin.left + ', ' + this.margin.top + ')');
            }
        },

        updateBars: function (data, tooltip, animationDelay, animationDuration) {
            var barData = this.finalBarData;
            this.barY = this.y;

            if (this.multiYAxis) {
                if (this.barAxis > 0) {
                    this.barY = this.y1;
                }
                else {
                    this.barY = this.y0;
                }
            }

            this.bars = this.barLayer.selectAll(".bars").data(barData);

            this.bars.exit().remove();

            this.bars.selectAll('rect')
                .data(function (d) {
                    return d.data;
                })
                .exit()
                .attr("class", "exit")
                .transition()
                .delay(animationDelay)
                .duration(animationDuration)
                .style("fill-opacity", 0)
                .remove();

            this.bars.transition()
                .delay(animationDelay)
                .duration(animationDuration)
                .attr('transform', function(d) {
                    return "translate(" + this.x0(d.x) + ",0)";
                }.bind(this));

            this.bars.selectAll('rect')
                .data(function(d) {
                    return d.data; })
                .transition()
                .delay(animationDelay)
                .duration(animationDuration)
                .attr('width', this.x1.rangeBand())
                .attr('x', function(d) {
                    return this.stackedBars ? this.x1(1) : this.x1(d.seriesDescr);
                }.bind(this))
                .attr('y', function(d) {
                    if (this.allowNegatives && d.y < 0) {
                        return this.barY(0);
                    }
                    return this.barY(d.y + d.y0);
                }.bind(this))
                .attr('height', function(d) {
                    return Math.abs(this.barY(Math.max(d.y0, this.barY.domain()[0])) - this.barY(d.y + d.y0));
                }.bind(this))
                .style('fill', function(d, i) {
                    return d.seriesStrokeColor || this.seriesStrokes[i % this.seriesStrokes.length];
                }.bind(this));

            this.bars.enter().append('g')
                .attr('class', 'bars')
                .attr('transform', function(d) {
                    return "translate(" + this.x0(d.x) + ",0)";
                }.bind(this));

            this.bars.selectAll('rect')
                .data(function(d) {
                    return d.data;
                })
                .enter().append('rect')
                .attr('width', 0)
                .attr('x', function(d) {
                    return this.stackedBars ? this.x1(1) : this.x1(d.seriesDescr);
                }.bind(this))
                .attr('y', function(d) {
                    if (this.allowNegatives && d.y < 0) {
                        return this.barY(0);
                    }
                    return this.barY(d.y + d.y0);
                }.bind(this))
                .attr('height', function(d) {
                    return Math.abs(this.barY(Math.max(d.y0, this.barY.domain()[0])) - this.barY(d.y + d.y0));
                }.bind(this))
                .style('fill', function(d, i) {
                    return d.seriesStrokeColor || this.seriesStrokes[i % this.seriesStrokes.length];
                }.bind(this))
                .transition()
                .delay(animationDelay)
                .duration(animationDuration)
                .attr('width', this.x1.rangeBand());
        },

        updateLines: function (animationDelay, animationDuration) {
            this.lineY = this.y;

            if (this.multiYAxis) {
                if (this.lineAxis > 0) {
                    this.lineY = this.y1;
                }
                else {
                    this.lineY = this.y0;
                }
            }

            var path = this.lineLayer.selectAll("path.line").data(this.lineData);

            path.exit().remove();

            path.style("stroke", function (d, i) {
                    return d.seriesStrokeColor ||  this.lineSeriesStrokes[i % this.lineSeriesStrokes.length];
                }.bind(this))
                .style("stroke-dasharray", this.getSeriesDasharray.bind(this, this.seriesDashes.length));

            var pathContext = animationDuration > 0 ?
                    path.transition()
                        .delay(animationDelay)
                        .duration(animationDuration) :
                    path;

            pathContext
                .attr("d", function (d) {
                    if (d.data) {
                        return this.line(d.data);
                    }
                }.bind(this));

            var trend = path.enter().append("path")
                .attr("class", "line")
                .style("stroke-width", this.datasetStrokeWidth + "px")
                .style("stroke", function (d, i) {
                    return d.seriesStrokeColor ||  this.lineSeriesStrokes[i % this.lineSeriesStrokes.length];
                }.bind(this))
                .style("stroke-dasharray", this.getSeriesDasharray.bind(this, this.seriesDashes.length));

             var trendContext = animationDuration > 0 ?
                trend.attr("d", function (d) {
                        if (d.data) {
                            var initData = $.extend(true, {}, d);
                            initData.data.forEach(function (e, i) {
                                e.sum = this.dataMax + 1;
                                if(this.chartLabels && this.chartLabels[0]) {
                                    e.x = this.chartLabels[0];
                                }
                            }.bind(this));
                            return this.line(initData.data);
                        }
                    }.bind(this))
                    .transition()
                    .delay(animationDelay)
                    .duration(animationDuration) :
                 trend;

                trendContext.attr("d", function (d) {
                    if (d.data) {
                        return this.line(d.data);
                    }
                }.bind(this));

            this.addPointDot(animationDelay, animationDuration);
        },

        addPointDot : function(animationDelay, animationDuration) {
            if (this.pointDot || (this.chartLabels && this.chartLabels.length === 1) || this.firstSeriesPointDot) {
                var lineData = this.firstSeriesPointDot && !this.pointDot ? (this.lineData[0] ? [this.lineData[0]] : []) : this.lineData || [],
                    circle = this.lineLayer.selectAll('g.dot').data(lineData),
                    dot = circle.enter().append('g');

                circle.exit().remove();

                circle.selectAll('circle')
                    .data(function(d){
                        return d.data; })
                    .exit()
                    .remove();
                
                circle
                    .style("fill", function (d, i) {
                        return d.seriesStrokeColor ||  this.lineSeriesStrokes[i % this.lineSeriesStrokes.length];
                    }.bind(this))
                    .selectAll('circle')
                    .data(function(d){
                        return d.data; })
                    .transition()
                    .delay(animationDelay)
                    .duration(animationDuration)
                    .attr('cx', function (d) {
                        return this.x0(d.x) + this.x0.rangeBand()/2; }.bind(this))
                    .attr('cy', function (d) {
                        return this.lineY(d.y); }.bind(this))
                    .attr('r', function(d) {
                        if(d.y !== null){
                            return this.pointDotRadius;
                        }
                        return 0;
                    }.bind(this));

                dot.attr("class", "dot")
                    .style("fill", function (d, i) {
                        return d.seriesStrokeColor ||  this.lineSeriesStrokes[i % this.lineSeriesStrokes.length];
                    }.bind(this));

                circle.selectAll('circle')
                    .data(function(d){
                        return d.data; })
                    .enter().append('circle')
                    .attr('cx', function (d) {
                        return this.x0(d.x) + this.x0.rangeBand()/2; }.bind(this))
                    .attr('cy', function (d) {
                        return this.lineY(d.y); }.bind(this))
                    .attr('r', function(d) {
                        if(d.y !== null){
                            return this.pointDotRadius;
                        }
                        return 0;
                    }.bind(this))
                    .style("fill-opacity", 0)
                    .transition()
                    .delay(animationDelay)
                    .duration(animationDuration)
                    .style("fill-opacity", 1);
            }
        },

        rotateLabels: function (chartWidth, maxLabelLength) {
            var labelRotation = this.labelRotation,
                radians = labelRotation / 180 * Math.PI;

            this.heightOfLabel = Math.sin(radians) * maxLabelLength;

            this.axisLayer.selectAll('.x.axis')
                .attr('transform','translate(0, ' + this.getChartHeight() + ')')
                .call(this.xAxis)
                .selectAll('text')
                .style("text-anchor", "end")
                .attr("dx", "-.8em")
                .attr("dy", ".75em")
                .attr("transform", "rotate(-" + labelRotation + ")" );

            this._iterateOverLabelAxis("x");
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

            this.heightOfLabel = 0;

            d3.select(this.attachPoints.chart[0]).select('svg')
                .attr('height', this.height)
                .attr('width', this.width);

            var chartWidth = this.getChartWidth(),
                chartHeight = this.getChartHeight(),
                combinedLabelLength,
                hasLine = this._hasLineChart(),
                horizontalLabelPadding = this.horizontalLabelPadding,
                xAxisPadding = this.showAxisTickMarks ? '.75em' : '1.1em',
                barSeriesPadding = this.barSeriesPadding,
                barValuePadding = this.barValuePadding;

            this.x0.rangeRoundBands([0, chartWidth], barSeriesPadding);

            if (this.stackedBars) {
                this.x1.rangeRoundBands([0, this.x0.rangeBand()]);
            }
            else {
                this.x1.rangeRoundBands([0, this.x0.rangeBand()], barValuePadding);
            }

            // Update the axis and text with the new scale
            this.axisLayer.select('.x.axis')
                .attr("transform", "translate(0," + chartHeight + ")")
                .call(this.xAxis);

            var maxLabelLength = this._iterateOverLabelAxis("x");

            combinedLabelLength = (maxLabelLength + horizontalLabelPadding) * this.chartLabels.length;

            //recalculate the x and y axis
            if(combinedLabelLength >= chartWidth || this.alwaysRotateLabels) {
                this.rotateLabels(chartWidth, maxLabelLength);
                chartHeight = this.getChartHeight();
            }

            else {
                this.axisLayer.select('.x.axis')
                    .selectAll('text')
                    .style('text-anchor', 'middle')
                    .attr('dx', null)
                    .attr('dy', xAxisPadding)
                    .attr('transform', 'rotate(0)');
            }


            if (this.multiYAxis) {
                this.y0.range([chartHeight, 0]);
                this.y1.range([chartHeight, 0]);

                this.yAxis0.ticks(Math.max(chartHeight/40, this.minYAxisTicks));
                this.yAxis1.ticks(Math.max(chartHeight/40, this.minYAxisTicks));

                if (this.showGridLines) {
                    this.yAxis0.tickSize(-chartWidth, 0, 0);
                }

                this.axisLayer.selectAll('.y.axis.primary')
                    .call(this.yAxis0);
                this.axisLayer.selectAll('.y.axis.secondary')
                    .attr('transform', "translate(" + this.getChartWidth() + " ,0)")
                    .call(this.yAxis1);
            }
            else {
                this.y.range([chartHeight, 0]);

                this.yAxis.ticks(Math.max(chartHeight / 40, this.minYAxisTicks));

                if (this.showGridLines) {
                    this.yAxis.tickSize(-chartWidth, 0, 0);
                }

                this.axisLayer.selectAll('.y.axis')
                    .call(this.yAxis);
            }

            if (this.showYAxisLabels) {
                var axisWidth1 = 10 + (this.chartYAxisLabels.length < 2 ?
                            this.axisLayer.select(".y.axis").node().getBBox().width :
                            this.axisLayer.select(".y.axis.primary").node().getBBox().width);

                if (this.showGridLines) {
                    axisWidth1 -= chartWidth;
                }

                this.axisLayer.selectAll('text.axis-label.primary')
                    .attr("transform", "translate("+ (axisWidth1*-1) +","+(chartHeight/2)+")rotate(-90)");

                if (this.chartYAxisLabels.length > 1) {
                    var axisWidth2 = 10 + this.axisLayer.select(".y.axis.secondary").node().getBBox().width;
                    this.axisLayer.selectAll('text.axis-label.secondary')
                        .attr("transform", "translate("+ (chartWidth + axisWidth2) +","+(chartHeight/2)+")rotate(90)");
                }
            }

            if (this.bars) {
                this.bars.attr('transform', function(d) {
                    return "translate(" + this.x0(d.x) + ",0)";
                }.bind(this));

                this.bars.selectAll('rect')
                    .data(function(d) {
                        return d.data; })
                    .attr('width', this.x1.rangeBand())
                    .attr('x', function(d) {
                        return this.stackedBars ? this.x1(1) : this.x1(d.seriesDescr);
                    }.bind(this))
                    .attr('y', function(d) {
                        if (this.allowNegatives && d.y < 0) {
                            return this.barY(0);
                        }
                        return this.barY(d.y + d.y0);
                    }.bind(this))
                    .attr('height', function(d) {
                        return Math.abs(this.barY(Math.max(d.y0, this.barY.domain()[0])) - this.barY(d.y + d.y0));
                    }.bind(this));
            }

            if (hasLine) {
                this.lineLayer.selectAll('path.line')
                    .attr("d", function(d) { return this.line(d.data); }.bind(this));

                this.lineLayer.selectAll('circle')
                    .attr('cx', function (d) {
                        return this.x0(d.x) + this.x0.rangeBand()/2; }.bind(this))
                    .attr('cy', function (d) {
                        return this.lineY(d.y); }.bind(this));
            }

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
            if (!this.finalBarData || !this.finalBarData.length) {
                return;
            }
            var newChartWidth = this.getChartWidth(),
                range = this.x0.range(),
                interval = range[1] ? (range[1] - (range[0] + this.x0.rangeBand())) : this.x0.rangeBand(),
                x = mouse[0] + range[0]/2,
                bisect = d3.bisect(range, x) - 1,
                index = bisect > -1 ? bisect : 0,
                axisFormatString;

            index = index >= range.length ? index - 1 : index;

            var index2;

            if (this.stackedBars) {
                index2 = this._getSelectedStackedBar(mouse, index);
            }

            else {
                var range2 = this.x1.range(),
                    x2 = mouse[0] - range[index] + (range2[0]/2),
                    bisect2 = d3.bisect(range2, x2) - 1;
                    index2 = bisect2 > -1 ? bisect2 : 0;
            }
            
            if (this._lastTooltipIndex !== index || this._lastTooltipData !== this.finalBarData[index] || this._lastTooltipChartWidth !== newChartWidth) {
                this._lastTooltipIndex = index;
                this._lastTooltipData = this.finalBarData[index];
                this._lastTooltipChartWidth = newChartWidth;
                this._lastSelectedValue = this._lastTooltipData;
                this._lastBarIndex = index2;
                this._lastBarData = this.finalBarData[index] && this.finalBarData[index].data && this.finalBarData[index].data[index2] ? ($.extend({}, this.finalBarData[index].data[index2], this.finalBarData[index].data[index2].originalData) ): null;
                if (this._lastSelectedValue) {
                    this._lastSelectedValue.selectedItem = this._lastBarData;
                }

                if (this.mouseLine) {
                    this.mouseLine.attr("width", this.x0.rangeBand() + interval)
                        .attr("height", this.getChartHeight())
                        .attr("x", Math.max(0, range[index] - (interval/2)))
                        .attr("y", 0);
                }

                var seriesIdx = 0, series, value,
                    tooltipLabelEl = $("<div class='tooltip-label'></div>").text(this.chartLabels[index]),
                    tooltipValueEl,
                    tooltipStrokeEl,
                    tooltipValueTextEl,
                    tooltipValueTextBoldEl;

                tooltip.empty().append(tooltipLabelEl);

                axisFormatString = this.formatIsArray ? this.formatString[this.barAxis] : this.formatString;

                var length = this.stackedBars ? (this.finalBarData[index] ? this.finalBarData[index].data.length : null): this.x1.range().length;

                for(seriesIdx; seriesIdx < length; seriesIdx++){
                    series = this.finalBarData[index] || {};
                    if (series && series.data && series.data.length >= seriesIdx) {
                        value = series.data[seriesIdx];
                        if(value !== null && typeof value !== "undefined") {
                            tooltipValueEl = $("<div class='tooltip-value'></div>");
                            tooltipStrokeEl = $("<span class='tooltip-stroke'></span>")
                                .css("background", this.getSeriesStroke(value, seriesIdx));
                            tooltipValueEl.append(tooltipStrokeEl);
                            tooltip.append(tooltipValueEl);

                            tooltipValueTextEl = $("<span></span>")
                                .text(" " + value.seriesDescr + ": ");
                            tooltipValueEl.append(tooltipValueTextEl);

                            tooltipValueTextBoldEl = $("<b></b>")
                                .text(value.y === null || value.y === undefined
                                    ? this.noLegendValuePlaceholder : formatter.format(value.y, axisFormatString));
                            tooltipValueTextEl.append(tooltipValueTextBoldEl);
                        }
                    }
                }

                seriesIdx = 0;

                axisFormatString = this.formatIsArray ? this.formatString[this.lineAxis] : this.formatString;
                
                for (seriesIdx; seriesIdx < this.data.length; seriesIdx++) {
                    series = this.data[seriesIdx] || {};
                    if (series.data && series.data.length >= index) {
                        value = series.data[index];
                        if (value) {
                            tooltipValueEl = $("<div class='tooltip-value'></div>");
                            tooltip.append(tooltipValueEl);

                            if (!series.tooltipOnly) {
                                tooltipStrokeEl = $("<span class='tooltip-stroke'></span>")
                                    .css("background", this.getSeriesStroke(series, seriesIdx));
                                tooltipValueEl.append(tooltipStrokeEl);
                            }

                            tooltipValueTextEl = $("<span></span>")
                                .text(" " + series.label + ": ");
                            tooltipValueEl.append(tooltipValueTextEl);

                            tooltipValueTextBoldEl = $("<b></b>")
                                .text(value.y === null || value.y === undefined ? this.noLegendValuePlaceholder
                                    : formatter.format(value.y, (series.formatString !== undefined && series.formatString !== null
                                    ? series.formatString : axisFormatString)));
                            tooltipValueTextEl.append(tooltipValueTextBoldEl);
                        }
                    }
                }
            }

            else if (this._lastBarIndex !== index2) {
                this._lastBarIndex = index2;
                this._lastBarData = this.finalBarData[index] && this.finalBarData[index].data && this.finalBarData[index].data[index2] ? ($.extend({}, this.finalBarData[index].data[index2], this.finalBarData[index].data[index2].originalData) ): null;
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
            var mouseY = this.y.invert(mouse[1]);
            if (this.finalBarData[index] && this.finalBarData[index].data) {
                var i,
                    numberOfBars = this.finalBarData[index].data.length;
                for (i = numberOfBars - 1; i > -1; i--) {
                    if (mouseY > this.finalBarData[index].data[i].y0) {
                        // this._lastBarIndex = i;
                        // this._lastBarData = this.finalBarData[index].data[i];
                        // this._lastBarData = $.extend({}, this.finalBarData[index].data[i], this.finalBarData[index].data[i].originalData);
                        return i;
                    }
                }
                return 0;
            }
        },

        _hasLineChart: function () {
            return this.chartType.toLowerCase() === "line";
        },

        _dateFormatter: function () {
            if (!this._dateFormatFunc) {
                this._dateFormatFunc = d3.time.format(this.dateFormatString);
            }
            return this._dateFormatFunc;
        },

        getMin: function (index) {
            if (this.multiYAxis) {
                return this.dataMin[index];
            }

            return this.dataMin;
        },

        getMax: function (index) {
            if (this.multiYAxis) {
                return this.dataMax[index];
            }

            return this.dataMax;
        },

        setMin: function (index, value) {
            if (this.multiYAxis) {
                this.dataMin[index] = value;
            }

            else {
                this.dataMin = value;
            }
        },

        setMax: function (index, value) {
            if (this.multiYAxis) {
                this.dataMax[index] = value;
            }

            else {
                this.dataMax = value;
            }
        },

        extractChartData: function (data) {
            var final = [],
                yAxisLabels = data.yAxisLabels || this.yAxisLabels,
                percentPadding = data.percentPadding !== null && data.percentPadding !== undefined ? data.percentPadding : this.percentPadding;
            this.chartLabels = data && data.labels ? data.labels : (this.labels || []);
            this.dataMax = this.max !== null ? (typeof this.max === "object" ? this.max.slice(0) : this.max) : 0;
            this.dataMin = this.min !== null ? (typeof this.min === "object" ? this.min.slice(0) : this.min) : 0;
            this.numberOfBarSeries = 0;
            this.barAxis = this.chartBarAxis || 0;
            this.lineAxis = this.chartLineAxis || 1;
            this.multiYAxis = this.multipleYAxis || false;
            this.xProperty = data.xProp || this.xProp || "x";
            this.yProperty = data.yProp || this.yProp || "y";

            this.formatIsArray = Array.isArray(this.formatString);

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

            if (yAxisLabels && yAxisLabels.length > 0) {
                this.showYAxisLabels = true;
                this.chartYAxisLabels = yAxisLabels;
                this.recalcMouseLayer();

                if (yAxisLabels.length > 1) {
                    this.multiYAxis = true;
                }
            }

            else {
                this.showYAxisLabels = false;
                this.recalcMouseLayer();
            }

            if (data && data.chartSeries && data.chartSeries.length > 0) {
                var newData,
                    barData = [],
                    tooltipOnlyData = [],
                    labelDate = null,
                    lastValue,
                    labelSums = {},
                    barlabelSums = {},
                    currLabelDate = "",
                    value = null,
                    numberOfLineSeries = 0,
                    dataPointColor = null,
                    seriesStrokeColor,
                    seriesStrokePattern,
                    legendValue = null,
                    legendFormatString,
                    found,
                    completeBarData,
                    dataMinIsArray = Array.isArray(this.dataMin),
                    dataMaxIsArray = Array.isArray(this.dataMax);

                this.lineData = [];

                data.chartSeries.forEach(function (e, seriesIdx) {
                    var tooltipOnly = e.tooltipOnly || false;
                    newData = [];
                    found = -1;
                    
                    if (!excludeSeriesMap[e.seriesDescr] && !excludeSeriesMap[e.seriesName]) {

                        if (e.axis || this.multiYAxis) {
                            this.multiYAxis = true;
                            if (!dataMinIsArray) {
                                this.dataMin = [this.dataMin, this.dataMin];
                                dataMinIsArray = true;
                            }
                            if (!dataMaxIsArray) {
                                this.dataMax = [this.dataMax, this.dataMax];
                                dataMaxIsArray = true;
                            }
                        }

                        if (e && e.dataPoint) {
                            var j;
                            e.dataPoints = [];
                            e.dataPoints.push(e.dataPoint);
                            if (data.labels && data.labels.length > 0) {
                                for (j = 1; j < data.labels.length; j++) {
                                    e.dataPoints.push(e.dataPoint);
                                }
                            }
                        }

                        if (e.chartType && e.chartType.toLowerCase() === 'line') {
                            this.chartType = "Line";

                            e.seriesStrokeColor = e.seriesStrokeColor || this.lineSeriesStrokes[numberOfLineSeries % this.lineSeriesStrokes.length];
                            if (e.axis !== null && e.axis !== undefined) {
                                this.lineAxis = e.axis;
                            }

                            if (e && e.dataPoints && e.dataPoints.length > 0) {
                                e.dataPoints.forEach(function (d, i) {
                                    labelDate = null;

                                    if (d && d[this.xProperty] !== undefined) {
                                        labelDate = d[this.xProperty];
                                        value = this.getSeriesYValue(d, seriesIdx);

                                        found = $.inArray(currLabelDate, this.chartLabels);

                                        if (found < 0) {
                                            this.chartLabels.push(currLabelDate);
                                        }
                                    }

                                    else if (this.chartLabels && this.chartLabels.length > i) {
                                        labelDate = this.chartLabels[i];
                                        value = d === undefined ? null : d;
                                    }

                                    else if (e.seriesDescr) {
                                        currLabelDate = "";
                                        value = d === undefined ? null : d;
                                        if (this.chartLabels.length < 1) {
                                            this.chartLabels.push("");
                                            this.showAxisTickMarks = false;
                                        }
                                    }

                                    if (labelDate !== null) {
                                        if (!labelSums[labelDate]) {
                                            labelSums[labelDate] = 0;
                                        }
                                        if (!this.allowNegatives && value < 0) {
                                            value = null;
                                        }

                                        newData.push({x: labelDate, y: value, y0: 0, sum: labelSums[labelDate]});
                                        labelSums[labelDate] += value || 0;
                                        lastValue = value;

                                        if (value < this.getMin(this.lineAxis)) {
                                            this.setMin(this.lineAxis, value);
                                        }

                                        if (value > this.getMax(this.lineAxis)) {
                                            this.setMax(this.lineAxis, value);
                                        }
                                    }

                                }.bind(this));

                            }
                            seriesStrokeColor = e.seriesStrokeColor || null;
                            legendValue = e.legendValue !== null && e.legendValue !== undefined ? e.legendValue : lastValue;
                            legendFormatString  = e.legendFormatString || this.formatIsArray ? this.formatString[this.lineAxis] : null;
                            seriesStrokePattern = e.seriesStrokePattern || null;

                            this.lineData.push({
                                label: (e.seriesDescr || ""),
                                data: newData,
                                value: legendValue,
                                seriesStrokeColor: seriesStrokeColor,
                                seriesStrokePattern: seriesStrokePattern,
                                legendFormatString: legendFormatString
                            });
                            
                            legendValue = null;
                            numberOfLineSeries++;
                        }

                        else if (tooltipOnly) {
                            if (e && e.dataPoints && e.dataPoints.length > 0) {
                                e.dataPoints.forEach(function (d, i) {
                                    if (d && d[this.xProperty] !== undefined) {
                                        labelDate = d[this.xProperty];
                                        value = this.getSeriesYValue(d, seriesIdx);
                                    }

                                    else if (this.chartLabels && this.chartLabels.length > i) {
                                        labelDate = this.chartLabels[i];
                                        value = d === undefined ? null : d;
                                    }

                                    else if (e.seriesDescr) {
                                        currLabelDate = "";
                                        value = d === undefined ? null : d;
                                    }

                                    if (labelDate !== null) {
                                        newData.push({x: labelDate, y: value, sum: null });
                                    }
                                }.bind(this));

                                tooltipOnlyData.push({
                                    label: (e.seriesDescr || ""),
                                    data: newData,
                                    legendFormatString: legendFormatString,
                                    tooltipOnly: tooltipOnly,
                                    formatString: e.formatString
                                });
                            }
                        }

                        else {
                            if (e && e.dataPoints && e.dataPoints.length > 0) {
                                if (e.axis !== null && e.axis !== undefined) {
                                    this.barAxis = e.axis;
                                }

                                e.dataPoints.forEach(function (d, i) {
                                    currLabelDate = null;
                                    dataPointColor = null;
                                    completeBarData = null;

                                    if (d && d[this.xProperty] !== undefined) {
                                        currLabelDate = d[this.xProperty];
                                        value = this.getSeriesYValue(d, seriesIdx);
                                        found = $.inArray(currLabelDate, this.chartLabels);

                                        if (found < 0) {
                                            this.chartLabels.push(currLabelDate);
                                        }
                                        dataPointColor = d.dataPointColor;
                                        completeBarData = $.extend({}, d);
                                    }

                                    else if (this.chartLabels && this.chartLabels.length > i) {
                                        currLabelDate = this.chartLabels[i];
                                        value = d === undefined ? null : d;
                                    }

                                    else if (e.seriesDescr) {
                                        currLabelDate = "";
                                        value = d === undefined ? null : d;
                                        if (this.chartLabels.length < 1) {
                                            this.chartLabels.push("");
                                            this.showAxisTickMarks = false;
                                        }
                                    }

                                    if (currLabelDate !== null) {
                                        if (!this.allowNegatives && value < 0) {
                                            value = null;
                                        }

                                        if (!barData[i]) {
                                            var barDataItem = {x: currLabelDate, data: [], y: value};
                                            barData[i] = this.gridData ? $.extend({}, d, barDataItem) : barDataItem;
                                        }

                                        if (!barlabelSums[currLabelDate]) {
                                            barlabelSums[currLabelDate] = 0;
                                        }

                                        barData[i].data.push({
                                            y: value,
                                            y0: barlabelSums[currLabelDate],
                                            seriesDescr: (e.seriesDescr || ""),
                                            seriesStrokeColor: dataPointColor || (e.seriesStrokeColor || null),
                                            originalData : completeBarData || d
                                        });
                                        barlabelSums[currLabelDate] += this.stackedBars ? (value || 0) : 0;
                                        //Handling a javascript floating point bug
                                        barlabelSums[currLabelDate] = Math.round(barlabelSums[currLabelDate] * 1000000000)/1000000000;
                                        lastValue = value;

                                        if (value < this.getMin(this.barAxis)) {
                                            this.setMin(this.barAxis, value);
                                        }
                                        if (value > this.getMax(this.barAxis)) {
                                            this.setMax(this.barAxis, value);
                                        }
                                        if (barlabelSums[currLabelDate] > this.getMax(this.barAxis)) {
                                            this.setMax(this.barAxis, barlabelSums[currLabelDate]);
                                        }
                                    }

                                }.bind(this));
                                this.numberOfBarSeries++;
                            }

                            seriesStrokeColor = e.seriesStrokeColor || null;
                            legendValue = e.legendValue !== null && e.legendValue !== undefined ? e.legendValue : lastValue;
                            legendFormatString  = e.legendFormatString || this.formatIsArray ? this.formatString[this.barAxis] : null;

                            final.push({
                                label: (e.seriesDescr || ""),
                                data: null,
                                value: legendValue,
                                seriesStrokeColor: seriesStrokeColor,
                                legendFormatString: legendFormatString
                            });
                            
                            legendValue  = null;
                        }
                    }
                }.bind(this));

                this.lineData.forEach(function(d){
                    d.isLine = true;
                    final.push(d);
                });

                tooltipOnlyData.forEach(function(d){
                    final.push(d);
                });

                this.finalBarData = barData;
                var range;

                if (this.multiYAxis) {
                    var minIsArray = Array.isArray(this.min),
                        maxIsArray = Array.isArray(this.max),
                        i;

                    for (i = 0; i <2; i++) {
                        if (this.dataMin[i] === Number.MAX_VALUE) {
                            this.dataMin[i] = 0;
                        }

                        if (this.dataMax[i] === this.dataMin[i]) {
                            this.dataMax[i] += 1;
                        }

                        range = this.dataMax[i] - this.dataMin[i];

                        if (this.min === null || (this.min !== null && typeof this.min !== "undefined" &&
                            this.dataMin[i] < (minIsArray ? this.min[i] : this.min))) {
                            this.dataMin[i] = this.calcMinOrMax(this.dataMin[i], false, range, percentPadding);
                        }

                        if (this.max === null || (this.max !== null && typeof this.max !== "undefined" &&
                            this.dataMax[i] > (maxIsArray ? this.max[i] : this.max))) {
                            this.dataMax[i] = this.calcMinOrMax(this.dataMax[i], true, range, percentPadding);
                        }
                    }
                }

                else {
                    if (this.dataMin === Number.MAX_VALUE) {
                        this.dataMin = 0;
                    }

                    if (this.dataMax === this.dataMin) {
                        this.dataMax += 1;
                    }

                    range = this.dataMax - this.dataMin;

                    if (this.min === null || (this.min !== null && typeof this.min !== "undefined" && this.dataMin < this.min)) {
                        this.dataMin = this.calcMinOrMax(this.dataMin, false, range, percentPadding);
                    }

                    if (this.max === null || (this.max !== null && typeof this.max !== "undefined" && this.dataMax < this.max)) {
                        this.dataMax = this.calcMinOrMax(this.dataMax, true, range, percentPadding);
                    }
                }
            }
            
            return final;
        }
    });
});
