define([
    "d3",
    "jquery",
    "common-ui/widgets/charting/_D3Chart",
    "common-ui/widgets/utils/formatter",
    "common-ui/widgets/utils/colorUtil"
], function (d3, $,  _D3Chart, formatter, colorUtil) {

    "use strict";

    return _D3Chart.extend({
        
        height: 200,
        chartType : "Donut",
        heightOfLabel: 0,
        displayTotal: true,
        tooltips: true,
        hideTooltipValues: false,
        donutThickness: 15,
        minRadius: 30,
        gaugeBackgroundDifference: 0,
        unselectedOpacity: 0.5,
        gauge: false,
        polarArea: false,
        polarAreaOuterCircleColor: "#ddd",
        polarAreaOuterTextColor: "#333",
        polarAreaOuterWidth: 3,
        polarAreaOpacity: 0.7,
        polarAreaAxisPadding: 25,
        showPossibleValue : false,
        possibleValueFormatString : null,
        gaugeCornerRadius: 10,
        valueBasedStrokes : null,
        outsidePadding: 10,
        minR: null,
        maxR: null,
        centerText: "Total",
        centerValue: null,
        displayEmptyGauge: false,
        toggleSelectionOnClick : false,

        highlightRadius : 4,
        animationDuration : 750,
        animationDelay : 100,

        createChart : function () {
            var radius = Math.min(this.getChartWidth(), this.getChartHeight()) / 2,
                donutThickness = this.donutThickness,
                backgroundDifference = this.gaugeBackgroundDifference;

            this.pie = d3.layout.pie()
                .padAngle(0.02)
                .value(function (d) {
                    return d.value || 0;
                })
                .sort(null);

            if (this.polarArea) {
                this.maxRadius = radius - this.outsidePadding - this.polarAreaOuterWidth;

                this.arc = this.arc = d3.svg.arc()
                    .cornerRadius(2)
                    .innerRadius(this.minRadius);

                this.radiusScale = d3.scale.linear()
                    .domain([this.dataMinR, this.dataMaxR])
                    .range([this.minRadius, this.maxRadius]);

                if (this.svg) {
                    this.drawPolarAreaOuter();
                }
            }

            else {
                this.arc = d3.svg.arc()
                    .cornerRadius(2)
                    .outerRadius(radius - this.outsidePadding)
                    .innerRadius(radius - (this.outsidePadding + donutThickness));

                this.arcFocused = d3.svg.arc()
                    .cornerRadius(2)
                    .outerRadius(radius - (this.outsidePadding - this.highlightRadius))
                    .innerRadius(radius - ((this.outsidePadding + this.highlightRadius) + donutThickness));
            }

            if (this.gauge) {
                if (this.valueBasedStrokes) {
                    this._valueStrokeColors =
                        colorUtil.generateColors(this.seriesStrokes, this.valueBasedStrokes > 1 ? this.valueBasedStrokes : 5, true);
                }

                this.arc.cornerRadius(this.gaugeCornerRadius)
                    .innerRadius(radius - (10 + donutThickness));

                this.gaugeArc = d3.svg.arc()
                    .startAngle(0)
                    .endAngle(2 * Math.PI)
                    .outerRadius(radius - (10 + backgroundDifference))
                    .innerRadius(radius - (10 - backgroundDifference + donutThickness));
            }

            if (this.svg) {
                this.svg.attr('transform', 'translate(' + this.width / 2 + ', ' + this.height / 2 + ')');
            }

            if (!this.gaugeLayer && this.svg) {
                this.gaugeLayer = this.svg.append('g').attr('class', 'gauge-layer');
            }

            if (!this.donutLayer && this.svg) {
                this.donutLayer = this.svg.append('g').attr('class', 'donut-layer');
            }
        },

        updateChartData : function (data) {
            if (!this.donutData) {
                this.donutData = [];
            }
            if (this.radiusScale && this.minRadius !== undefined) {
                this.updateRadiusScale();
            }

            if (this._valueSelected) {
                this._valueSelected = false;
                if (this._selectedSlice) {
                    this.deselectSlice(this._selectedSlice, data);
                    this._selectedSlice = false;
                }
            }

            var color = this.seriesStrokes,
                me = this,
                arc = this.arc,
                arcFocused = this.arcFocused,
                gaugeArc = this.gaugeArc,
                pie = this.pie,
                polarArea = this.polarArea,
                radiusScale = this.radiusScale,
                path  = this.donutLayer.selectAll("path"),
                data0 = path.data(),
                data1 = pie(this.donutData),
                animationDelay = this.getAnimationDelay(),
                animationDuration = this.getAnimationDuration();

            this.arcTween = function(d) {
                //function used for transitioning arcs
                var i = d3.interpolate(this._current, d);
                this._current = i(0);

                if ((d.data && d.data.highlight) && !polarArea) {
                    return function (t) {
                        return arcFocused(i(t));
                    };
                }

                if (polarArea) {
                    arc.outerRadius(function(g){
                        return radiusScale(g.data.radius);
                    });

                    return function (y) {
                        return arc(i(y));
                    };
                }

                return function (t) {
                    return arc(i(t));
                };
            };

            if (this.gauge && !this.gaugeBackground) {
                this.gaugeBackground = this.gaugeLayer
                    .append("path")
                    .attr("class", "gauge-background")
                    .style("fill", "#ddd")
                    .attr("d", gaugeArc);
            }

            path = path.data(data1);

            //following the update pattern of remove unwanted, update current, append new
            path.exit()
                .datum(function (d, i) {
                    return this.findNeighborArc(i, data1, data0) || d;
                }.bind(this))
                .transition()
                .duration(Math.floor(animationDuration / 3))
                .attrTween("d", this.arcTween)
                .style("fill-opacity", 0)
                .remove();

            path.attr("fill", function (d, i) {
                    return d.data && d.data.seriesStrokeColor ? d.data.seriesStrokeColor : color[i % color.length];
                })
                .transition()
                .duration(animationDuration)
                .attrTween("d", this.arcTween);

            path.enter().append("path")
                .each(function (d, i) {
                    this._current = me.findNeighborArc(i, data0, data1) ||
                        {data: d.data, startAngle: d.startAngle, endAngle: d.startAngle, padAngle: d.padAngle};

                    if (d.data && d.data.radius !== null && d.data.radius !== undefined) {
                        this.radius = d.data.radius;
                    }
                })
                .attr("fill", function (d, i) {
                    if (this._valueStrokeColors && this._valueStrokeColors.length > 0 && d.value !== null && d.value !== undefined) {
                        return colorUtil.getValueColor(this._valueStrokeColors, d.value, 0, d.data ? d.data.possibleValue || 1 : 1);
                    }
                    return d.data && d.data.seriesStrokeColor ? d.data.seriesStrokeColor : color[i % color.length];
                }.bind(this))
                .style("fill-opacity", function(d, i){
                    if (this.gauge && i > 0) {
                        return 0;
                    }
                    if (this.polarArea) {
                        return this.polarAreaOpacity;
                    }
                    return 1;
                }.bind(this))
                .transition()
                .delay(animationDelay)
                .duration(animationDuration)
                .attrTween("d", this.arcTween);

            if (this.displayTotal) {
                this._renderTotal(data);
            }

            this.bindTooltipEvents();
        },

        drawPolarAreaOuter: function() {
            var radiusRange = this.maxRadius - this.minRadius;
            
            this.polarAreaAxis = this.svg.append('g')
                .attr('class', 'polar-area-axis')
                .selectAll("g")
                .data(this.radiusScale.ticks(radiusRange/this.polarAreaAxisPadding, 2))
                .enter().append("g");

            this.polarAreaAxis.append("circle")
                .style("fill", "none")
                .style("stroke", this.polarAreaOuterCircleColor)
                .attr("r", this.radiusScale);

            this.polarAreaAxis.append("text")
                .attr("y", function(d) {
                    return -this.radiusScale(d) - 4;
                }.bind(this))
                .style("text-anchor", "middle")
                .style("fill", this.polarAreaOuterTextColor)
                // .attr("transform", "rotate(15)")
                .text(function(d) {
                    return d;
                });
        },

        updateRadiusScale: function () {
            this.radiusScale
                .domain([this.dataMinR, this.dataMaxR])
                .range([this.minRadius, this.maxRadius]);
        },

        bindTooltipEvents : function(name) {
            if (this.tooltips && !Modernizr.printlayout) {
                var me = this,
                    tooltip = this.createTooltip(),
                    toggleTooltipVisible = function (visible, d) {
                        var hideTooltip = d && d.data && d.data.hideTooltip;

                        if (visible && !hideTooltip) {
                            tooltip.show();
                        }
                        else {
                            tooltip.hide();
                        }
                        me.tooltipVisible = visible;
                    };

                var evtPostfix = '.chart.' + this._key + name;
                this.donutLayer.selectAll('path')
                    .on('mousemove' + evtPostfix, function (d) {
                        if (!me.gauge && (!me.toggleSelectionOnClick || (me.toggleSelectionOnClick && !me._valueSelected))) {
                            me.highlightSelectedSlice(this);
                        }
                        me.calcTooltipValues(this, d, tooltip, toggleTooltipVisible);
                    })
                    .on('mouseover' + evtPostfix, function (d) {
                        toggleTooltipVisible(true, d);
                    })
                    .on('mouseout' + evtPostfix, function (d) {
                        if (!me.gauge && (!me.toggleSelectionOnClick || (me.toggleSelectionOnClick && !me._valueSelected))) {
                            me.deselectSlice(this, d);
                        }
                        toggleTooltipVisible(false, d);
                    });

                if (this.donutLayer && this.donutLayer.length > 0) {
                    this._unbindTooltipEvents();

                    this._chartClickEvent = this.connect($(this.donutLayer[0]).find('path'), 'click' + evtPostfix, function (evt) {
                        evt.stopPropagation();
                        toggleTooltipVisible(false);
                        me._lastClickedValue = me._lastSelectedValue;
                        me.dispatchEvent("change", me._lastSelectedValue, true);

                        if (me.toggleSelectionOnClick) {
                            var d = d3.select(this).datum();

                            if (me._valueSelected === me._lastSelectedValue.seriesDescr) {
                                me._valueSelected = false;
                                me.deselectSlice(me._selectedSlice, d);
                                me._selectedSlice = null;
                            }
                            else {
                                me._valueSelected = me._lastSelectedValue.seriesDescr;
                                if (me._selectedSlice) {
                                    me.deselectSlice(me._selectedSlice, d);
                                }
                                me.highlightSelectedSlice(this);
                                me._selectedSlice = this;
                            }
                        }

                        if (!me.toggleSelectionOnClick || me._valueSelected) {
                            me.dispatchEvent("selectionClick", me._lastSelectedValue, true);
                        }
                        else if (me.toggleSelectionOnClick) {
                            me.dispatchEvent("unselectedClick", me._lastSelectedValue, true);
                        }
                    });
                }
            }
        },

        calcTooltipValues: function (me, d, tooltip, toggleTooltipVisible) {
            var newChartWidth = this.getChartWidth(),
                index = d.data.index,
                label = d.data.label,
                value = d.data.value,
                possibleValue = d.data.possibleValue,
                postfix = d.data.postfix,
                tooltipOnlyInfo = d.data.tooltipOnlyInfo,
                tooltipTextEl,
                tooltipTextBoldEl,
                tooltipTextOfEl;

            if (this.gauge && (this._lastTooltipValue !== value || this._lastTooltipPossiblValue !== possibleValue || this._lastTooltipPostfix !== postfix ||this._lastTooltipChartWidth !== newChartWidth)) {
                this._lastTooltipValue = value;
                this._lastTooltipPossiblValue = possibleValue;
                this._lastTooltipPostfix = postfix;
                this._lastTooltipChartWidth = newChartWidth;
                this._lastSelectedValue = {value: value, possibleValue: possibleValue, postfix: postfix};

                tooltipTextEl = $("<div class='tooltip-value'><span class='tooltip-stroke' style='background: "
                    + this.getSeriesStroke(d.data, 0) + ";'></span> </div>");

                tooltipTextBoldEl = $("<b></b>");
                tooltipTextBoldEl.text(formatter.format(value, this.formatString));
                tooltipTextEl.append(tooltipTextBoldEl);

                tooltipTextOfEl = $("<span></span>");
                tooltipTextOfEl.text(" of " + formatter.format(possibleValue, this.formatString)
                    + (postfix ? " " + postfix : ""));
                tooltipTextEl.append(tooltipTextOfEl);

                tooltip.empty().append(tooltipTextEl);
            }

            else if (!this.gauge && (this._lastTooltipValue !== value || this._lastTooltipLabel !== label || this._lastTooltipChartWidth !== newChartWidth)) {
                this._lastTooltipValue = value;
                this._lastTooltipLabel = label;
                this._lastTooltipChartWidth = newChartWidth;
                this._lastSelectedValue = {};

                if (label !== undefined && label !== null) {
                    this._lastSelectedValue = {seriesDescr: label, x: label, y: value, index: index};
                    tooltipTextEl = $("<div class='tooltip-value'><span class='tooltip-stroke' style='background: "
                        + this.getSeriesStroke(d.data, index) + ";'></span> </div>");

                    tooltipTextEl.append(this._createTooltipDiv(label, value, false));

                    if (tooltipOnlyInfo) {
                        var tooltipOnlyInfoArray = $.isArray(tooltipOnlyInfo) ? tooltipOnlyInfo : [tooltipOnlyInfo],
                            i = 0,
                            tooltipOnlyInfoEl;
                        for (i; i < tooltipOnlyInfoArray.length; i++) {
                            tooltipOnlyInfoEl = $("<div class='tooltip-value tooltip-additional-info'></div>");
                            tooltipOnlyInfoEl.append(this._createTooltipDiv(tooltipOnlyInfoArray[i].label,
                                tooltipOnlyInfoArray[i].value, tooltipOnlyInfoArray[i].formatString));
                            tooltipTextEl.append(tooltipOnlyInfoEl);
                        }
                    }
                    tooltip.empty().append(tooltipTextEl);
                }
            }
            tooltip.css({"top": (d3.event.clientY - 20) + "px", "left": (d3.event.clientX + 20) + "px"});
            if (!this.tooltipVisible) {
                toggleTooltipVisible(true, d);
            }
        },

        _createTooltipDiv : function (label, value, formatString) {
            var tooltipLabelEl = $("<span></span>"),
                format = formatString || this.formatString;
            tooltipLabelEl.text(label + ": ");

            if (!this.hideTooltipValues) {
                var tooltipLabelBoldEl = $("<b></b>");
                tooltipLabelBoldEl.text((value === null || value === undefined
                    ? this.noLegendValuePlaceholder : formatter.format(value, format)));
                tooltipLabelEl.append(tooltipLabelBoldEl);
            }

            return tooltipLabelEl;
        },

        highlightSelectedSlice: function (me) {
            var opacity = this.unselectedOpacity;
            if (!this.polarArea) {
                d3.select(me).attr('d', this.arcFocused);
            }

            //Comment out if you want the opacity to change
            this.donutLayer.selectAll('path').style('opacity',function () {
                return (this === me) ? 1.0 : opacity;
            });
        },

        deselectSlice: function (me, d) {
            //Comment out if you want the opacity to change
            this.donutLayer.selectAll('path').style('opacity', 1.0);

            if (d.data && d.data.highlight) {
                return;
            }

            d3.select(me).attr('d', this.arc);
        },

        key: function (d) {
            if (d && d.data && d.data.label) {
                return d.data.label;
            }
        },

        _renderTotal: function (data) {
            var svg = this.svg,
                totalValue = 0,
                possibleValue = null,
                text = this._centerText,
                textPosition = "-0.6em",
                valuePosition = "0.6em",
                showPossibleValue = this.showPossibleValue,
                centerFormatString = this.formatString;
            
            svg.selectAll("text.middle").remove();

            if (data && data.length > 0) {
                if (this.gauge) {
                    totalValue = data[0].centerValue !== null && data[0].centerValue !== undefined ? data[0].centerValue : data[0].value;
                    possibleValue = data[0].possibleValue;
                    text = data[0].postfix || null;
                    showPossibleValue = data[0].showPossibleValue || this.showPossibleValue;
                    valuePosition = "0em";
                    textPosition = "1em";
                }

                else if (this._centerValue !== null && this._centerValue !== undefined) {
                    totalValue = this._centerValue;
                }

                else {
                    var i = 0;
                    for (i; i < data.length; i++) {
                        totalValue += data[i].value;
                    }
                }

                if (this.centerValueFormatString !== null && this.centerValueFormatString !== undefined ) {
                    centerFormatString = this.centerValueFormatString;
                }

                if (totalValue !== null && totalValue !== undefined) {
                    totalValue = formatter.format(totalValue, centerFormatString);
                }

                else {
                    totalValue = this.noLegendValuePlaceholder;
                }

                svg.append("text")
                    .attr("class", "middle label")
                    .attr("text-anchor", "middle")
                    .attr("dy", textPosition)
                    .text(text);
                svg.append("text")
                    .attr("class", "middle value")
                    .attr("text-anchor", "middle")
                    .attr("dy", valuePosition)
                    .text(totalValue +
                        (showPossibleValue && possibleValue !== null && possibleValue !== undefined
                            ? " of " + formatter.format(possibleValue, this.possibleValueFormatString || centerFormatString) : ""));
            }
        },

        findNeighborArc: function (i, data0, data1) {
            var d;
            var d1 = this.findPreceding(i, data0, data1);

            if (!d1) {
                var d2 = this.findFollowing(i, data0, data1);
                if (d2) {
                    d = {startAngle: d2.startAngle, endAngle: d2.startAngle};
                }
                else {
                    d = null;
                }
            }

            else {
                if (d1) {
                    d = {startAngle: d1.endAngle, endAngle: d1.endAngle};
                }
                else {
                    d = null;
                }
            }

            return d;
        },

        // Find the element in data0 that joins the highest preceding element in data1.
        findPreceding: function (i, data0, data1) {
            var m = data0.length;
            while (--i >= 0) {
                var k = this.key(data1[i]),
                    j;
                for (j = 0; j < m; ++j) {
                    if (this.key(data0[j]) === k) {
                        return data0[j];
                    }
                }
            }
        },

        // Find the element in data0 that joins the lowest following element in data1.
        findFollowing: function (i, data0, data1) {
            var n = data1.length, m = data0.length;
            while (++i < n) {
                var k = this.key(data1[i]),
                    j;
                for (j = 0; j < m; ++j) {
                    if (this.key(data0[j]) === k) {
                        return data0[j];
                    }
                }
            }
        },

        getWidth: function (margin, id) {
            return this.getHeight(margin,id);
        },

        setMinandMax: function (data) {
            if (this.dataMinR === Number.MAX_VALUE) {
                this.dataMinR = 0;
            }
            
            var range = this.dataMaxR - this.dataMinR,
                percentPadding = data && data.percentPadding !== null && data.percentPadding !== undefined ? data.percentPadding : this.percentPadding;

            // if max and min are both 0, then make the range 0-1
            if (this.dataMaxR === this.dataMinR) {
                this.dataMaxR = this.calcMinOrMax(this.dataMaxR, true, range, percentPadding);
                if (this.dataMaxR === 0 && this.dataMaxR === this.dataMinR) {
                    this.dataMaxR = 1;
                }
            }

            if (this.minR === null || typeof this.minR === "undefined" || (this.minR !== null && typeof this.minR !== "undefined" &&
                this.dataMinR < this.minR)) {
                this.dataMinR = this.calcMinOrMax(this.dataMinR, false, range, percentPadding);
            }

            if (this.maxR === null || typeof this.maxR === "undefined" || (this.maxR !== null && typeof this.maxR !== "undefined" &&
                this.dataMaxR < this.maxR)) {
                this.dataMaxR = this.calcMinOrMax(this.dataMaxR, true, range, percentPadding);
            }
        },

        initializeData: function(data) {
            this.donutData = [];
            this.xProperty = data.xProp || this.xProp || "x";
            this.yProperty = data.yProp || this.yProp || "y";
            this.rProperty = data.rProp || this.rProp || "r";
            this.minR = data.minR !== null && data.minR !== undefined ? data.minR : this.minR;
            this.maxR = data.maxR !== null && data.maxR !== undefined ? data.maxR : this.maxR;
            this.dataMinR = this.minR !== null && this.minR !== undefined ? this.minR : Number.MAX_VALUE;
            this.dataMaxR = this.maxR !== null && this.maxR !== undefined ? this.maxR : 0;
            this._centerText = data.centerText !== null && data.centerText !== undefined ? data.centerText : this.centerText;

            if (this.polarAreaOuter) {
                this.donutLayer.selectAll("path").remove();
            }
        },

        extractChartData : function(data) {
            var final = [];

            this.initializeData(data);

            if (data) {
                this.chartLabels = data && data.labels ? data.labels : (this.labels || []);
                this.height = data.height || this.height;
                this.donutThickness = data.donutThickness || this.donutThickness;
                // put the data in the proper format if necessary
                if (data && (data.length > 0 || (data.dataPoints && data.dataPoints.length > 0)) &&
                    (data.chartSeries === null || data.chartSeries === undefined)) {
                    data.chartSeries = data;
                }

                this._centerValue = data.centerValue;

                if (data && data.chartSeries && data.chartSeries.length > 0) {
                    var label = null,
                        point = null,
                        rVal = null,
                        dataPointColor = null;

                        data.chartSeries.forEach(function (e, k) {
                        if (e.dataPoints && e.dataPoints.length > 0) {
                            e.dataPoints.forEach(function (f, j) {
                                if (f[this.xProperty] !== null && f[this.xProperty] !== undefined &&
                                    f[this.yProperty] !== null && f[this.yProperty] !== undefined) {
                                    label = f[this.xProperty];
                                    point = f[this.yProperty];
                                    if (this.chartLabels.length < 1) {
                                        this.chartLabels.push(label);
                                    }
                                    dataPointColor = f.dataPointColor;
                                }

                                else if (this.chartLabels.length > j) {
                                    label = this.chartLabels[j];
                                    point = f;
                                }

                                if (f[this.rProperty] !== null && f[this.rProperty] !== undefined) {
                                    rVal = f[this.rProperty];

                                    if (rVal < this.dataMinR) {
                                        this.dataMinR = rVal;
                                    }

                                    if (rVal > this.dataMaxR) {
                                        this.dataMaxR = rVal;
                                    }
                                }

                                if (this.chartLabels && this.chartLabels.length > 0) {
                                    if (point > 0) {
                                        this.donutData.push({
                                            index: j,
                                            label: label,
                                            value: point,
                                            radius: rVal,
                                            seriesStrokeColor: dataPointColor || this.getSeriesStroke(e, j),
                                            highlight: e.highlight,
                                            legendFormatString: e.legendFormatString,
                                            tooltipOnlyInfo: e.tooltipOnlyInfo || f.tooltipOnlyInfo || null
                                        });
                                    }

                                    final.push({
                                        index: j,
                                        label: label,
                                        value: point,
                                        seriesStrokeColor: dataPointColor || e.seriesStrokeColor,
                                        highlight: e.highlight,
                                        legendFormatString: e.legendFormatString
                                    });
                                }
                            }.bind(this));
                        }
                    }.bind(this));
                }

                else if (data && data.chartSeries) {
                    if (data.chartSeries.dataPoints) {
                        data.chartSeries.dataPoints.forEach(function (d, i) {
                            var funLabel = null,
                            funPoint = null,
                            localDataPointColor = null;

                            if (d[this.xProperty] !== null && d[this.xProperty] !== undefined &&
                                d[this.yProperty] !== null && d[this.yProperty] !== undefined) {
                                funLabel = d[this.xProperty];
                                funPoint = d[this.yProperty];
                                if (this.chartLabels.length < 1) {
                                    this.chartLabels.push(funLabel);
                                }
                                localDataPointColor = d.dataPointColor;
                            }

                            else if (this.chartLabels.length > i) {
                                funLabel = this.chartLabels[i];
                                funPoint = d;
                            }

                            if (d[this.rProperty] !== null && d[this.rProperty] !== undefined) {
                                var localRVal = d[this.rProperty];

                                if (localRVal < this.dataMinR) {
                                    this.dataMinR = localRVal;
                                }

                                if (localRVal > this.dataMaxR) {
                                    this.dataMaxR = localRVal;
                                }
                            }

                            if (funPoint > 0) {
                                this.donutData.push({
                                    index: i,
                                    label: funLabel,
                                    value: funPoint,
                                    radius: localRVal,
                                    seriesStrokeColor: localDataPointColor || this.getSeriesStroke(d, i),
                                    highlight: d.highlight,
                                    legendFormatString: d.legendFormatString,
                                    tooltipOnlyInfo: d.tooltipOnlyInfo || null
                                });
                            }

                            final.push({
                                index: i,
                                label: funLabel,
                                value: funPoint,
                                seriesStrokeColor: localDataPointColor || d.seriesStrokeColor,
                                highlight: d.highlight,
                                legendFormatString: d.legendFormatString
                            });
                        }.bind(this));
                    }
                }

                else if (((data.value !== null && data.value !== undefined) || this.displayEmptyGauge) && data.possibleValue !== null && data.possibleValue !== undefined) {
                    this.showLegend = false;
                    this.gauge = true;
                    this.chartType = "Gauge";
                    this.formatString = data.formatString || this.formatString;
                    this.centerValueFormatString = data.centerValueFormatString !== null && data.centerValueFormatString !== undefined ? data.centerValueFormatString : this.centerValueFormatString;
                    this.possibleValueFormatString = data.possibleValueFormatString || this.possibleValueFormatString;
                    this.title = data.title || data.descr || this.title;
                    dataPointColor = data.dataPointColor || data.strokeColor || data.seriesStrokeColor;

                    this.subTitle = data.subTitle || data.subDescr || this.subTitle;
                    data.centerValue = data.centerValue !== null && data.centerValue !== undefined ? data.centerValue : this.centerValue;

                    final.push({value: data.value, possibleValue: data.possibleValue, centerValue: data.centerValue, postfix: data.postfix, seriesStrokeColor: dataPointColor, showPossibleValue: data.showPossibleValue});
                    final.push({value: data.possibleValue - (data.value || 0), possibleValue: data.possibleValue, postfix: data.postfix, hideTooltip: true});

                    this.donutData.push(final[0]);

                    if (final[1].value) {
                        this.donutData.push(final[1]);
                    }
                }

                this.setMinandMax(data);
            }
            return final;
        }
    });
});

