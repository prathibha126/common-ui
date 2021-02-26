define([
    "jquery",
    "d3",
    "common-ui/widgets/charting/D3ScatterPlot",
    "common-ui/widgets/utils/formatter",
    "common-ui/widgets/utils/colorUtil"
], function ($, d3, ScatterPlot, formatter, colorUtil) {

    "use strict";

    return ScatterPlot.extend({
        
        chartType: "Bubble",
        legendPosition: "bottom",
        showLegend: true,
        tooltips: true,
        heightRatio : 0.5,
        showGridLines: true,
        showAxisTickMarks: true,
        formatString : "",
        bubbleStrokeWidth : 3,
        marginTop : 40,
        marginRight : 50,
        marginLeft : 50,
        bubbleLegendShowMax: true,

        legendBubbleSizeCount : 3,
        chromaSeriesStrokes: ["#00c2f8", "#f79c37", "#DC004B"],
        lineSeriesStrokes: ["#30659B", "#C0C0C0", "#666666"],

        regularDotSize: 150, //100-1000
        selectedDotSize: 350,
        pointDotRadius: 3,
        showDotLabels: true,
        intervalCount: 5,
        useChromaColors: true,
        reverseColors: true,
        minRadius: 10,
        maxRadius: 30,
        showYAxis: false,
        preventOverlap: true,

        deselectedOpacity : 0.7,
        showQuadrants : false,
        quadrantStrokePattern : "5, 3",
        quadrantStrokeColor : "#ccc",
        colorLegendOnAxis: true,
        circlePadding: 1,
        showColorLegend: true,

        updateDots: function () {
            var chartWidth = this.getChartWidth(),
                chartHeight = this.getChartHeight(),
                animationDelay = this.getAnimationDelay(),
                animationDuration = this.getAnimationDuration(),
                me = this;

            this.calculateRadiusScale();

            this.bubbleData = this.bubbleData.map(function (d, i) {
                return {
                    cy: chartHeight/2,
                    cx: me.x(d.xVal),
                    x: me.x(d.xVal),
                    color: d.seriesStrokeColor || me.getColor(d.xVal, me.values, me.colors, i),
                    radius: me.radiusScale(d.rVal),
                    label: d.label,
                    xVal: d.xVal,
                    yVal: d.yVal,
                    rVal: d.rVal
                };
            });

            this.force = d3.layout.force()
                .nodes(this.bubbleData)
                .size([chartWidth, chartHeight])
                .gravity(0)
                .charge(0)
                .on("tick", function (d) {
                    return me.tick(d); });

            this.bubble = this.dotsLayer.selectAll(".bubble")
                .data(this.bubbleData);

            this.bubble.selectAll("circle.dots")
                .remove();

            this.bubble
                .exit()
                .remove();

            this.bubble.enter()
                .append("g")
                .attr("class", "bubble");

            this.dots = this.bubble
                .append("circle")
                .attr("class", "dots")
                .attr("cx", function(d) {
                    if (d.cx > (chartWidth - d.radius)) {
                        return chartWidth - d.radius;
                    }
                    return d.cx; })
                .attr("cy", function(d) {
                    return d.cy; })
                .attr("r", function (d) {
                    return d.radius; })
                .style("fill", function (d) {
                    return d.color; })
                .attr("opacity", 0);

            if (this.preventOverlap) {
                this.dots.call(this.force.start);
            }
            else {
                this.dots
                    .transition()
                    .delay(animationDelay)
                    .duration(animationDuration)
                    .attr("cy", function(d) {
                        d.cy = me.y(d.yVal);
                        return d.cy;
                    });
            }

            this.bubble.selectAll("text.dot-label").remove();

            if (this.showDotLabels) {
                this.appendLabels(animationDelay, animationDuration);
            }

            this.svg.selectAll("#axisGradient").remove();
            this.axisLayer.selectAll(".x.axis.multicolor").remove();

            if (this.colorLegendOnAxis) {
                this.renderAxisColorLegend();
            }

            this.dots.attr("opacity", this.deselectedOpacity);
        },

        tick: function (d) {
            var me = this;
            this.dots
                .each(me.gravity(0.08 * d.alpha))
                .each(me.collide(0.5))
                .attr("cx", function(z) {
                    z.newX = me.x.invert(z.x);
                    return z.x; })
                .attr("cy", function(o) {
                    o.newY = me.y.invert(o.y);
                    return o.y; });

            if (this.dotsLabels) {
                this.dotsLabels
                    .attr("transform", function(v) {
                        return "translate(" + v.x +", " + v.y + ")";
                    });
            }
        },

        gravity: function(alpha) {
            return function(d) {
                d.y += (d.cy - d.y) * alpha;
                d.x += (d.cx - d.x) * alpha;
            };
        },

        collide: function (alpha) {
            var quadtree = d3.geom.quadtree(this.bubbleData),
                chartWidth = this.getChartWidth(),
                chartHeight = this.getChartHeight(),
                me = this;
            return function(d) {
                d.y = Math.max(d.radius, Math.min(chartHeight - d.radius, d.y));
                d.x = Math.max(d.radius, Math.min(chartWidth - d.radius, me.x(d.newX || d.xVal)));

                var r = d.radius + me.maxRadius + me.circlePadding,
                    nx1 = d.x - r,
                    nx2 = d.x + r,
                    ny1 = d.y - r,
                    ny2 = d.y + r;
                quadtree.visit(function (quad, x1, y1, x2, y2) {
                    if (quad.point && (quad.point !== d)) {
                        var x = d.x - quad.point.x,
                            y = d.y - quad.point.y,
                            l = Math.sqrt(x * x + y * y),
                            t = d.radius + quad.point.radius + (d.color !== quad.point.color) * me.circlePadding;
                        if (l < t) {
                            l = (l - t) / l * alpha;
                            d.x -= x *= l;
                            d.y -= y *= l;
                            quad.point.x += x;
                            quad.point.y += y;
                        }
                    }
                    return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
                });
            };
        },

        renderAxisColorLegend: function () {
            var chartWidth = this.getChartWidth(),
                chartHeight = this.getChartHeight();

            var axisGradient = this.svg.append("defs")
                .append("linearGradient")
                .attr("id", "axisGradient")
                .attr("x1", "0%")
                .attr("y1", "0%")
                .attr("x2", "100%")
                .attr("y2", "0%")
                .attr("spreadMethod", "pad");

            var i,
                j = 0,
                offset = 100/this.colors.length;
            for (i = 0; i < this.colors.length; i++) {
                axisGradient.append("stop")
                    .attr("offset", (offset * i) + j + "%")
                    .attr("stop-color", this.colors[i])
                    .attr("stop-opacity", 1);

                axisGradient.append("stop")
                    .attr("offset", (offset * (i+1)) + "%")
                    .attr("stop-color", this.colors[i])
                    .attr("stop-opacity", 1);

                j = 1;
            }

            this.axisLayer.append("rect")
                .attr("class", "x axis multicolor")
                .attr("x", 0)
                .attr("width", chartWidth)
                .attr("y", chartHeight - 2)
                .attr("height", 2)
                .style("fill", "url(#axisGradient)");
        },

        appendLabels: function (animationDelay, animationDuration) {
            this.dotsLabels = this.bubble
                .append("text")
                .attr("class", "dot-label")
                .attr("text-anchor", "middle")
                .attr("font-size", function (d) {
                    return Math.sqrt(d.radius) * 2.25;
                })
                .attr("dy", "0.4em")
                .attr("transform", function(d) {
                    return "translate(" + d.cx +", " + d.cy + ")";
                })
                .text(function (d) {
                    return d.label;
                })
                .attr("opacity", 0);

            this.dotsLabels
                .text(function (d) {
                    var title = d.label;
                    if (title) {
                        if (d.radius < 6) {
                            return "";
                        }
                        var symbolSize = this.getBBox().width / title.length + 1,
                            diameter = (d.radius * 2) - 8,
                            trimmed = false;
                        while ((title.length + 1) * symbolSize > diameter) {
                            trimmed = true;
                            title = title.slice(0, -1);
                        }
                        return title.length > 1 ? (trimmed ? title.slice(0, -1) + "…": title) : "";
                    }
                    return "";
                })
                .attr("opacity", 1);
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

                var selection = ".bubble",
                    evtPostfix = '.chart.' + this._key + name;

                this.dotsLayer.selectAll(selection)
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
                    this.connect($(this.dotsLayer[0]).find(selection), 'click' + evtPostfix, function (evt) {
                        evt.stopPropagation();
                        toggleTooltipVisible(false);
                        this._lastClickedValue = this._lastSelectedValue;
                        this.dispatchEvent("change", this._lastSelectedValue, true);
                        this.dispatchEvent("selectionClick", this._lastSelectedValue, true);
                    }.bind(this));
                }
            }
        },

        highlightSelected: function (me) {
            d3.select(me).selectAll(".dots")
                .transition()
                .duration(100)
                .attr("opacity", 1);
        },

        deselect: function (me) {
            d3.select(me).selectAll(".dots")
                .transition()
                .duration(100)
                .attr("opacity", this.deselectedOpacity);
        },

        resizeChart: function () {
            this._super.apply(this, arguments);

            var me = this,
                chartWidth = this.getChartWidth(),
                chartHeight = this.getChartHeight();

            this.axisLayer.selectAll(".x.axis.multicolor")
                .attr("x", 0)
                .attr("width", chartWidth)
                .attr("y", chartHeight - 2)
                .attr("height", 2);

            this.force
                .size([chartWidth, chartHeight])
                .gravity(0)
                .charge(0);

            this.calculateRadiusScale();

            this.dots
                .attr("r", function (d) {
                    d.radius = me.radiusScale(d.rVal);
                    return d.radius; })
                .attr("cx", function(d) {
                    d.cx = me.x(d.xVal);
                    d.newX = d.xVal;
                    d.x = d.cx;
                    return d.cx;
                });

            if (this.preventOverlap) {
                this.dots
                    .attr("cy", function(d) {
                        d.cy = chartHeight/2;
                        return me.y(d.newY); })
                    .call(this.force.start);
            }
            else {
                this.dots
                    .attr("cy", function(d) {
                        d.cy = me.y(d.yVal);
                        d.newY = d.yVal;
                        return d.cy;
                    });
            }

            this.dotsLabels
                .attr("font-size", function (d) {
                    return Math.sqrt(d.radius) * 2.25;
                })
                .attr("transform", function(d) {
                    return "translate(" + me.x(d.newX) +", " + me.y(d.newY) + ")";
                })
                .text(function (d) {
                    return d.label;
                })
                .attr("opacity", 0);

            this.dotsLabels
                .text(function (d) {
                    var title = d.label;
                    if (title) {
                        if (d.radius < 6) {
                            return "";
                        }
                        var symbolSize = this.getBBox().width / title.length + 1,
                            diameter = (d.radius * 2) - 8,
                            trimmed = false;
                        while ((title.length + 1) * symbolSize > diameter) {
                            trimmed = true;
                            title = title.slice(0, -1);
                        }
                        return title.length > 1 ? (trimmed ? title.slice(0, -1) + "…": title) : "";
                    }
                    return "";
                })
                .attr("opacity", 1);

            this.renderLegend(this.data);
        },

        getColor: function (d, values, colors, i) {
            if (this.useChromaColors) {
                return values.length > 0 ? colorUtil.getValueColor(colors, d, this.dataMinX, this.dataMaxX) : colors[0];
            }
            return this.seriesStrokes[i % this.seriesStrokes.length];
        },

        renderLegend: function (data) {
            var legendEl = $("<div></div>"),
                colorLegendEl,
                colorLegendTitleEl,
                colorLegendItemEl,
                colorLegendItemBarEl,
                colorLegendItemSeparatorEl,
                colorLegendItemValueEl;
            if (data && data.length > 0) {
                var i = 0, curr;
                if (this.showColorLegend && !this.colorLegendOnAxis) {
                    for (i; i < this.intervalCount; i++) {
                        curr = this.values[i];
                        if (curr !== null && curr !== undefined) {
                            var seriesColor = this.colors[i],
                                formatString = this.xFormat || this.formatString;

                            if (!colorLegendEl) {
                                colorLegendEl = $('<div class="bubble-color-legend"></div>');
                                colorLegendTitleEl = $('<div class="color-legend-title" style="padding-bottom: '
                                        + Math.max(5, Math.floor(this.maxRadius / 2)) + 'px;"></div>')
                                    .text('Color' + (this.xLabel ? " shows " + this.xLabel : ""));
                                colorLegendEl.append(colorLegendTitleEl);
                                legendEl.append(colorLegendEl);
                            }

                            colorLegendItemEl = $('<div class="bubble-color-legend-item"></div>');
                            colorLegendItemBarEl = $('<div class="color-legend-bar"></div>')
                                .css({
                                    opacity : this.deselectedOpacity,
                                    background : seriesColor
                                });
                            colorLegendItemEl.append(colorLegendItemBarEl);
                            colorLegendEl.append(colorLegendItemEl);

                            if (i > 0) {
                                colorLegendItemSeparatorEl = $('<div class="color-legend-separator"><div class="color-legend-separator-line"></div></div>');
                                colorLegendItemValueEl = $('<div class="color-legend-separator-value"></div>')
                                    .text(formatter.format(curr, formatString));
                                colorLegendItemSeparatorEl.append(colorLegendItemValueEl);
                                colorLegendItemEl.append(colorLegendItemSeparatorEl);
                            }
                        }
                    }
                }

                legendEl.append(this._renderCircleLegend());

            }

            if (this.domNode) {
                if (!this.legend) {
                    this.legend = $('<div class="chart-legend"></div>').addClass(this.legendPosition);

                    if (this.legendPosition.toLowerCase() !== "bottom") {
                        this.legend.css({
                            width : this.legendWidth - 10 // subtract 10 to account for padding
                        });
                    }

                    this.domNode.append(this.legend);
                }
                this.legend.empty().append(legendEl);
                this.legend.show();
            }
        },

        _renderCircleLegend: function() {
            var i = 0, radius, value, circleLegendEl = "",
                showMax = this.bubbleLegendShowMax ? 1 : 0,
                valueInterval = (this.dataMaxR - this.dataMinR) / Math.max(1, this.legendBubbleSizeCount - showMax);

            if (this.dataMinR !== Number.MAX_VALUE) {
                circleLegendEl = $('<div class="circle-legend" style="margin-bottom: '
                    + Number(this.radiusScale(this.dataMinR + (valueInterval * (this.legendBubbleSizeCount - 1))))
                    + 'px;"></div>');
                var circleLegendBoldEl = $("<b></b>").text('Size Shows ' + (this.rLabel || this.yLabel || "")),
                    circleLegendItemsEl = $('<div class="circle-legend-items" style="min-height: '
                        + Number(this.maxRadius) + 'px;"></div>');

                circleLegendEl.append(circleLegendBoldEl);
                circleLegendEl.append(circleLegendItemsEl);


                var numBubbles = this.dataMaxR === this.dataMinR ? 1 : this.legendBubbleSizeCount,
                    circleLegendItemEl,
                    circleLegendCircleEl,
                    circleLegendLabelEl;
                for (i; i < numBubbles; i++) {
                    value = this.dataMinR + (valueInterval * i);
                    radius = this.radiusScale(value);

                    circleLegendItemEl = $('<div class="circle-legend-item"></div>');
                    circleLegendCircleEl = $('<div class="circle round" style="width: ' + Number(radius * 2) + 'px'
                        + '; height: ' + Number(radius * 2) + 'px'
                        + '; margin-bottom: ' + Number((radius * -1) + 6) + 'px'
                        + '; "></div>');
                    circleLegendItemEl.append(circleLegendCircleEl);

                    circleLegendLabelEl = $('<div class="circle-label"></div>').text(formatter.format(value, this.rFormat));
                    circleLegendItemEl.append(circleLegendLabelEl);

                    circleLegendItemsEl.append(circleLegendItemEl);
                }
            }

            return circleLegendEl;
        },

        extractChartData: function (data) {
            var final = [],
                seriesData =[],
                legendValue = null,
                legendFormatString = null,
                seriesStrokeColor = null,
                seriesStrokePattern = null,
                numberOfDots = 0;

            this.bubbleData = [];

            this.initializeData(data);

            if (data && data.length > 0 && (data.chartSeries === null || data.chartSeries === undefined)) {
                data.chartSeries = data;
            }

            var excludeSeriesMap = this.mapExclusions();

            if (data && data.chartSeries && data.chartSeries.length > 0) {
                var x = null,
                    y = null,
                    r = null,
                    label = null;

                data.chartSeries.forEach(function (d) {
                    if (!excludeSeriesMap[d.seriesDescr] && !excludeSeriesMap[d.seriesName]) {
                        seriesData = [];
                        if (d && d.dataPoints && d.dataPoints.length > 0) {
                            d.dataPoints.forEach(function (e) {
                                if (e && e[this.xProperty] !== undefined) {
                                    x = e[this.xProperty];
                                    y = e[this.yProperty] !== undefined ? e[this.yProperty] : null;
                                    r = e[this.rProperty] !== null && e[this.rProperty] !== undefined ? e[this.rProperty] : y;
                                    label = e[this.labelProperty] || d.seriesDescr || "";

                                    var seriesDataItem = {x: x, y: y, xVal: x, yVal: y, rVal: r, label: label, seriesDescr: (d.seriesDescr || ""), seriesStrokeColor: (d.seriesStrokeColor || null)};

                                    this.bubbleData.push(seriesDataItem);
                                    
                                    seriesData.push(this.gridData ? $.extend({}, e, seriesDataItem) : seriesDataItem);

                                    if (x !== null && this.dataMinX > x) {
                                        this.dataMinX = x;
                                    }
                                    if (y !== null && this.dataMinY > y) {
                                        this.dataMinY = y;
                                    }
                                    if (r !== null && this.dataMinR > r) {
                                        this.dataMinR = r;
                                    }
                                    if (this.dataMaxX < x) {
                                        this.dataMaxX = x;
                                    }
                                    if (this.dataMaxY < y) {
                                        this.dataMaxY = y;
                                    }
                                    if (this.dataMaxR < r) {
                                        this.dataMaxR = r;
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
                        else {
                            numberOfDots += seriesData.length;
                            this.dotsData.push({label: (d.seriesDescr || ""), data: seriesData, value: legendValue, seriesStrokeColor: seriesStrokeColor});
                        }
                    }
                }.bind(this));

                this.dotsData.forEach(function(d){
                    final.push(d);
                });

                if (this.showQuadrants) {
                    this.hasRegressionLine = true;
                    var xMid = (this.dataMaxX - this.dataMinX) / 2 + this.dataMinX,
                        yMid = (this.dataMaxY - this.dataMinY) / 2 + this.dataMinY;
                    this.lineData.push({
                        data : [
                            {x : xMid, y : this.dataMinY},
                            {x : xMid, y : this.dataMaxY}
                        ],
                        seriesStrokePattern : this.quadrantStrokePattern,
                        seriesStrokeColor : this.quadrantStrokeColor
                    });
                    this.lineData.push({
                        data : [
                            {x : this.dataMinX, y : yMid},
                            {x : this.dataMaxX, y : yMid}
                        ],
                        seriesStrokePattern : this.quadrantStrokePattern,
                        seriesStrokeColor : this.quadrantStrokeColor
                    });
                }

                this.lineData.forEach(function(d){
                    final.push(d);
                });

                this.setMinandMax();

                this.colorInterval = (this.dataMaxX - this.dataMinX)/this.intervalCount;

                this.colors = colorUtil.generateColors(this.chromaSeriesStrokes, this.intervalCount, this.reverseColors);
                this.values = [];
                var i;

                for (i = 0; i < this.intervalCount; i++) {
                    this.values.push(this.dataMinX + (this.colorInterval * i));
                }

                this.numberOfDots = numberOfDots;
                this.createChart();
            }

            return final;
        },

        calculateRadiusScale: function () {
            var worstCaseSpace = this.numberOfDots * Math.pow(this.maxRadius * 2, 2),
                actualSpace = this.getChartHeight() * this.getChartWidth(),
                downsizeRatio = 1,
                minRadius = this.minRadius,
                maxRadius = this.maxRadius;

            if (worstCaseSpace > actualSpace) {
                downsizeRatio = actualSpace/worstCaseSpace;
                minRadius = Math.max(minRadius * downsizeRatio, 1);
                maxRadius = Math.max(maxRadius * downsizeRatio, 4);
            }

            this.radiusScale = d3.scale.pow()
                .exponent(0.5)
                .domain([this.dataMinR, this.dataMaxR])
                .range([minRadius, maxRadius]);
        },

        initializeData: function(data) {
            this._super.apply(this, arguments);

            this.rFormat = data.rFormatString || this.rFormatString || this.yFormat;
            this.rProperty = data.rProp || this.rProp || "r";
            var minR = data.minR !== null && data.minR !== undefined ? data.minR : this.minR;
            var maxR = data.maxR !== null && data.maxR !== undefined ? data.maxR : this.maxR;
            this.dataMinR = minR !== null && minR !== undefined ? minR : Number.MAX_VALUE;
            this.dataMaxR = maxR !== null && maxR !== undefined ? maxR : 0;
        }
    });
});
