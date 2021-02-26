define([
    "jquery",
    "d3",
    "common-ui/widgets/charting/_SVG",
    "common-ui/widgets/utils/formatter",
    "common-ui/widgets/charting/utils/chartUtil",
    "text!common-ui/widgets/charting/templates/D3Chart.html"
], function ($, d3, _SVG, formatterjs, chartUtil, template) {

    "use strict";

    var SERIES_DASHARRAY_VAL_NONE = "none";

    return _SVG.extend({

        template: template,
        baseClass : "card",
        animationDuration : 500,
        animationDelay : 0,
        animation : true,
        legendWidth: 175,
        title: "",
        formatString: "",
        showLegend: true,
        chartType : "",
        dashedLines: true,
        seriesDashes: ["none", "8, 3, 5, 3", "3, 5", "10, 10", "10, 5, 3, 5, 3, 5"],
        seriesStrokes: ["#6ccef6", "#ffb819", "#bd10e0", "#ffd930", "#bada55", "#6e991e", "#50e3c2", "#0091b3",  "#005c72", "#C0C0C0", "#666666"],
        heightRatio : null,
        hideLegendValues : false,
        legendPositionPrint : "right",
        percentPadding: 0.05,
        allowNegatives: false,
        minYAxisTicks: 2,

        // ignoreSeriesStrokeColors: Boolean
        //      only set to true if the series stroke color should be derived from the seriesStrokes array regardless of the seriesStrokeColor specified by the series data
        ignoreSeriesStrokeColors : false,
        noDataMessage: "There is no chart data available",
        excludeEmptySeries: false,
        noLegendValuePlaceholder : "--",
        tooltipLineFill : "rgba(204, 204, 204, 0.25)",
        gridData : false,
        xProp : "x",
        yProp : "y",
        yProps : null, // if we have > 1 series, you can specify a diff y prop for each series
        clickableStopsPropagation : true,
        defaultRemoveValuesOnY: false,
        _addPrecisionCount: 0,
        _maxPrecisionExtension: 8,
        maxLabelCharacters: null,
        widthOfFirstXAxisLabel: 0,

        init : function(options) {
            // force legend position to right for print
            if (window.Modernizr.printlayout && options) {
                options.legendPosition = this.legendPositionPrint;
            }
            this._super.apply(this, arguments);
        },

        onTemplateNodesAttached: function () {
            setTimeout(function() {
                if (!this._dataUpdated) {
                    this.updateData(this.data);
                }
            }.bind(this), 25);
        },

        onViewShown : function() {
            if (!this.isHidden() && !this._chartCreated) {
                setTimeout(function() {
                    this._renderChart();
                }.bind(this), 10);
            }
        },

        getSelectedItem : function() { return this._lastClickedValue; },

        updateData: function (data, selectedValue, append) {
            // TODO how to do handle pagination? may need to support appending data and re-rendering, but need a trigger to load subsequent pages
            this._originalData = data;
            if (this.attachPoints) {
                this._dataUpdated = true;

                var chartData = this.gridData ?
                    chartUtil.convertGridDataToChartData(data, this.columns, this.xProp, this.yProps || this.yProp, this.rProp) : data;

                this.formatString = chartData && chartData.formatString ? chartData.formatString : this.formatString;
                this.chartTitle = chartData && (chartData.chartTitle || chartData.title) ?
                    chartData.chartTitle || chartData.title : this.title;
                if (this.chartTitle) {
                    this.setTitle(this.chartTitle);
                }
                if (chartData && chartData.noDataMessage) {
                    this.noDataMessage = chartData.noDataMessage;
                }
                this.data = this.extractChartData(chartData || []);
                setTimeout(function() {
                    this._renderChart();
                }.bind(this), 5);
            }
        },

        _renderChart: function () {
            var noData = this.data === null || typeof this.data === "undefined" || !this.data.length || $.isEmptyObject(this.data),
                hidden = this.domNode && !this.domNode.is(":visible") && !window.Modernizr.printlayout;

            if (this.attachPoints) {
                if (this.attachPoints.chart) {
                    if (!noData && !hidden) {
                        if (this.noDataDiv) {
                            this.noDataDiv.hide();
                            this.attachPoints.chart.show();
                        }
                        if (!this._chartCreated) {
                            this.attachPoints.chart.show();
                            this.createSVG(this.attachPoints.chart);
                            this.createChart(this.data);
                            this._chartCreated = true;
                        }
                    }
                }
                this.toggleElementVisible(this.attachPoints.chartTitleContainer, this.chartTitle);
            }

            if (this._chartCreated && !noData) {
                if (!hidden && this.width !== this.getWidth(this.margin)) {
                    this.resize();
                }
                
                this.updateChartData(this.data);
                if (this.showLegend) {
                    this.renderLegend(this.data);
                }
                
                if (!window.Modernizr.printlayout && !this._resizeHandle) {
                    this._resizeHandle = this.connect(window, "resize.d3chart." + this._key, this.resize.bind(this));
                }
            }
            else if (noData) {
                if (this.attachPoints.chart) {
                    this.attachPoints.chart.hide();
                }
                if (this.legend) {
                    this.legend.hide();
                }

                if (this.domNode) {
                    var noDataHtml = $("<div></div>").text(this.data && this.data.noDataMessage ? this.data.noDataMessage : this.noDataMessage || "");

                    if (!this.noDataDiv) {
                        this.noDataDiv = $('<div class="no-data"></div>');
                        this.domNode.append(this.noDataDiv);
                    }

                    else {
                        this.noDataDiv.show();
                    }

                    this.noDataDiv.empty().append(noDataHtml);
                }
            }
        },

        //Converts data for pie chart
        extractChartData: function (data) {
            return data;
        },

        createChart : function() {
            // abstract method must be implemented by subclass
        },

        updateChartData : function(data) {
            // abstract method must be implemented by subclass
        },

        resize : function() {
            if (!this.svg) {
                return;
            }
            var currWidth = this.getWidth(this.margin, this.attachPoints.chart),
                currHeight = this.getHeight(this.margin, this.attachPoints.chart);
            if ((this.width === currWidth) || currWidth <= 0 || currHeight <= 0 || !$(this.domNode).is(":visible")) {
                return;
            }
            this.resizeChart(true);
        },

        resizeChart : function(redraw){
            // abstract method must be implemented by subclass
        },

        getSeriesStroke : function(series, seriesIdx) {
            var stroke = !this.ignoreSeriesStrokeColors && series && series.seriesStrokeColor ? series.seriesStrokeColor :
                this.seriesStrokes[seriesIdx % this.seriesStrokes.length];
            if (stroke && stroke.strokeColor) {
                return stroke.strokeColor;
            }
            return stroke;
        },

        renderLegend: function (data) {
            var legendHtml = "";
            if (data && data.length > 0) {
                var i = 0, curr, legendItemNode,
                    isLegendPositionBottom = this.legendPosition === "bottom" && !window.Modernizr.printlayout,
                    legendWidth = isLegendPositionBottom ? Math.floor(100 / Math.max(2, data.length)) + '%' : null;

                legendHtml = $("<div></div>");
                for (i; i < data.length; i++) {
                    curr = data[i];
                    if (curr && !curr.tooltipOnly && !curr.hideInLegend) {
                        var seriesColor = this.getSeriesStroke(curr, i),
                            seriesDashArray = curr.isLine ? this.getSeriesDasharray(data.length, curr, i) : null,
                            seriesLineStyle = this.convertDashArrayToBackgroundGradient(seriesDashArray, seriesColor),
                            formatString = curr.legendFormatString || this.formatString,
                            hideLegendValues = curr.hideLegendValue || this.hideLegendValues;

                        legendItemNode = $('<div class="chart-legend-item"><i style="' + seriesLineStyle + '"></i></div>');
                        if (legendWidth) {
                            legendItemNode.css("width", legendWidth);
                        }
                        if (!hideLegendValues) {
                            legendItemNode.append($('<span class="chart-legend-value"></span>').text(
                                (curr.value === null || curr.value === undefined)
                                    ? this.noLegendValuePlaceholder : formatterjs.format(curr.value, formatString)
                            ));
                        }
                        if (curr.label) {
                            legendItemNode.append($('<span class="chart-legend-label"></span>').text(curr.label));
                        }
                        legendHtml.append(legendItemNode);
                    }
                }
            }
            if (this.domNode) {
                if (!this.legend) {
                    this.legend = $('<div class="chart-legend"></div>')
                        .addClass(window.Modernizr.printlayout ? this.legendPositionPrint : this.legendPosition);

                    if (this.legendPosition.toLowerCase() !== "bottom") {
                        this.legend.css({
                            width : this.legendWidth - 10 // subtract 10 to account for padding
                        });
                    }

                    this.domNode.append(this.legend);
                }
                this.legend.empty().append(legendHtml);
                this.legend.show();
            }
        },

        convertDashArrayToBackgroundGradient : function(dashArray, seriesColor) {
            var gradient = 'background: ' + seriesColor + ';';
            if (this.chartType !== "Line" || !dashArray || dashArray.trim().toLowerCase() === "none" ||
                this.legendPosition === this.legendPositionPrint) {
                return gradient;
            }
            var percent = 0,
                currPercent,
                currColor,
                dashes = dashArray.replace(/ /g, "").split(","),
                dashSum = dashes.reduce(function(pv, cv) { return Number(pv) + Number(cv); }, 0),
                i = 0,
                gradientContent = "",
                dash;

            for (i; i < dashes.length; i++) {
                dash = Number(dashes[i]);
                currPercent =  Math.floor(dash / dashSum * 100);
                currColor = i % 2 === 0 ? seriesColor : "rgba(0, 0, 0, 0)";
                gradientContent += currColor + " " + percent + "%," + currColor + " " + (percent + currPercent) + "%";
                if (i < dashes.length - 1) {
                    gradientContent += ",";
                }
                percent += currPercent;
            }
            gradient += ' background: -moz-linear-gradient(left, ' + gradientContent + ");";
            gradient += ' background: -webkit-linear-gradient(left, ' + gradientContent + ");";
            gradient += ' background: linear-gradient(to right, ' + gradientContent + ");";
            return gradient + ' background-size: ' + dashSum + 'px 3px;';
        },

        getTemplateData : function() {
            return {
                chartType : this.chartType.toLowerCase(),
                baseClass : this.baseClass,
                legendPosition: window.Modernizr.printlayout ? this.legendPositionPrint : this.legendPosition
            };
        },

        getData : function() {
            // override to return the unaltered data that was passed into this chart
            return this.gridData && this._originalData && this._originalData.data ? this._originalData.data :
                this._originalData;
        },

        calcMinOrMax: function (value, isUpper, range, paddingPercent) {
            if (!isNaN(value)) {
                range = range || 1;
                var diff = Math.abs(range * paddingPercent) * (isUpper ? 1 : -1),
                    newValue = value + diff;
                value = value >= 0 && newValue < 0 ? 0 : newValue;
                //Handling a javascript floating point bug
                return !this.allowNegatives && value < 0 ? 0 : Math.round(value * 1000000000)/1000000000;
            }
            return value;
        },

        createTooltip: function () {
            if (!this.tooltip) {
                this.tooltip = $("<div/>", {
                    "class": "chart-tooltip"
                });
                if (this.domNode) {
                    this.domNode.append(this.tooltip);
                }
            }
            return this.tooltip;
        },

        bindTooltipEvents : function(name) {
            if (!this.mouseLayer && this.tooltips && !window.Modernizr.printlayout) {
                var mouseGroup = this.svg.append('g')
                    .attr('class', 'mouse-events');
                if (this.tooltipLine) {
                    this.mouseLine = mouseGroup.append("rect") // this is the vertical line to follow mouse
                        .attr("class", "mouse-line")
                        .style("fill", this.tooltipLineFill)
                        .style("stroke-width", "0px")
                        .style("opacity", "0");
                }
                this.mouseLayer = mouseGroup.append('rect') // append a rect to catch mouse movements on canvas
                    .attr('width', this.getChartWidth()) // can't catch mouse events on a g element
                    .attr('height', this.getChartHeight())
                    .attr('fill', 'none')
                    .attr('class', 'chart-mouse-layer')
                    .attr('pointer-events', 'all');

                var me = this,
                    tooltip = this.createTooltip(),
                    toggleTooltipVisible = function (visible) {
                        if (me.mouseLine) {
                            me.mouseLine.style("opacity", visible ? 1 : 0);
                        }
                        if (visible) {
                            tooltip.show();
                        }
                        else {
                            tooltip.hide();
                        }
                        me.tooltipVisible = visible;
                    };

                toggleTooltipVisible(false);

                this._unbindTooltipEvents();

                var mouseTarget = $(this.mouseLayer[0]),
                    evtPostfix = '.chart.' + this._key + name;
                this._chartMouseMoveEvent = this.connect(mouseTarget, 'mousemove' + evtPostfix, function (evt) {
                    var offset = $(evt.target).offset(),
                        x = evt.pageX - offset.left,
                        y = evt.pageY - offset.top;
                    me.calcTooltipValues([x, y], evt, tooltip, toggleTooltipVisible.bind(this, true));
                });
                this._chartMouseOverEvent = this.connect(mouseTarget, 'mouseover' + evtPostfix, function (evt) {
                    var offset = $(evt.target).offset(),
                        x = evt.pageX - offset.left,
                        y = evt.pageY - offset.top;
                    me.calcTooltipValues([x, y], evt, tooltip, toggleTooltipVisible.bind(this, true));
                });
                this._chartMouseOutEvent = this.connect(mouseTarget, 'mouseout' + evtPostfix, toggleTooltipVisible.bind(this, false));
                this._chartClickEvent = this.connect(mouseTarget, 'click' + evtPostfix, function (evt) {
                    evt.stopPropagation();
                    toggleTooltipVisible(false);

                    if (this.toggleSelectionOnClick) {
                        if (this._valueSelected === this._lastSelectedValue.x) {
                            if (this._selectedDom && this._selectedDom.length) {
                                this._selectedDom.forEach(function (d) {
                                        $(d).removeClass("selected");
                                        $(d).removeClass("unselected");

                                });
                            }
                            this._valueSelected = false;
                        }
                        else {
                            this._valueSelected = this._lastSelectedValue.x;
                            if (this._selectedDom) {
                                if (this._selectedDom && this._selectedDom.length) {
                                    this._selectedDom.forEach(function (d, i) {
                                        if (this._selectedIndex === i) {
                                            $(d).addClass("selected");
                                            $(d).removeClass("unselected");
                                        }
                                        else {
                                            $(d).addClass("unselected");
                                            $(d).removeClass("selected");
                                        }
                                    }.bind(this));
                                }
                            }
                        }
                    }

                    this._lastClickedValue = $.extend({}, this._lastSelectedValue);
                    this.dispatchEvent("change", this._lastSelectedValue, true);
                    if (!this.toggleSelectionOnClick || this._valueSelected) {
                        this.dispatchEvent("selectionClick", this._lastSelectedValue, true);
                    }
                    else if (this.toggleSelectionOnClick) {
                        this.dispatchEvent("unselectedClick", this._lastSelectedValue, true);
                    }
                    this.additionalClickEvents(evt);
                }.bind(this));
            }
        },

        _unbindTooltipEvents : function () {
            if (this._chartMouseMoveEvent) {
                this.disconnect(this._chartMouseMoveEvent);
                delete this._chartMouseMoveEvent;
            }
            if (this._chartMouseOverEvent) {
                this.disconnect(this._chartMouseOverEvent);
                delete this._chartMouseOverEvent;
            }
            if (this._chartMouseOutEvent) {
                this.disconnect(this._chartMouseOutEvent);
                delete this._chartMouseOutEvent;
            }
            if (this._chartClickEvent) {
                this.disconnect(this._chartClickEvent);
                delete this._chartClickEvent;
            }
        },

        calcTooltipValues: function (mouse, evt, tooltip, toggleTooltipVisible) {
            //Overridden in specific widgets
        },
        
        additionalClickEvents : function () {
            //Overridden in specific widgets
        },

        recalcMouseLayer: function () {
            this.margin = this.getMargin();
            if (this.mouseLayer) {
                this.mouseLayer
                    .attr('width', this.getChartWidth())
                    .attr('height', this.getChartHeight());
            }
        },

        getSeriesDasharray : function(dataLength, d, i) {
            // IMPORTANT: stroke-dasharray must be "none" instead of 0 for pdf generation
            var val = this.dashedLines ? (d.seriesStrokePattern ||
                (this.seriesDashes && this.seriesDashes.length > i ? this.seriesDashes[i % dataLength] :
                    SERIES_DASHARRAY_VAL_NONE)) : SERIES_DASHARRAY_VAL_NONE;
            return String(val) === "0" ? SERIES_DASHARRAY_VAL_NONE : val;
        },

        getSeriesYValue : function(data, seriesIdx) {
            var yProp = this.yProps && this.yProps.length > seriesIdx ? this.yProps[seriesIdx] : this.yProperty;
            return data[yProp] === undefined ? null : data[yProp];
        },
        
        updateYAxisLabels: function(chartWidth, chartHeight) {
            this.axisLayer.selectAll("text.axis-label").remove();

            if (this.showYAxisLabels) {
                var axisWidth1 = 10 + (this.chartYAxisLabels.length < 2 ?
                        this.axisLayer.select(".y.axis").node().getBBox().width :
                        this.axisLayer.select(".y.axis.primary").node().getBBox().width);

                if (this.showGridLines) {
                    axisWidth1 -= chartWidth;
                }

                this.axisLayer.append("text")
                    .attr("class", "axis-label primary")
                    .attr("text-anchor", "middle")
                    .attr("transform", "translate("+ (axisWidth1*-1) +","+(chartHeight/2)+")rotate(-90)")
                    .text(this.chartYAxisLabels[0]);

                if (this.chartYAxisLabels.length > 1) {
                    var axisWidth2 = 10 + this.axisLayer.select(".y.axis.secondary").node().getBBox().width;

                    this.axisLayer.append("text")
                        .attr("class", "axis-label secondary")
                        .attr("text-anchor", "middle")
                        .attr("transform", "translate(" + (chartWidth + axisWidth2) + "," + (chartHeight / 2) + ")rotate(90)")
                        .text(this.chartYAxisLabels[1]);
                }
            }
        },

        resetWidthOfYAxis: function(chartWidth) {
            var axisNode = this.chartYAxisLabels && this.chartYAxisLabels.length > 1 ? this.axisLayer.select(".y.axis.primary").node() : this.axisLayer.select(".y.axis").node(),
                axisWidth1 = 10 + (axisNode ? axisNode.getBBox().width : 0);

                if (this.showGridLines) {
                    axisWidth1 -= chartWidth;
                }

                var yMargin = this.widthOfFirstXAxisLabel > 20 ? this.widthOfFirstXAxisLabel : 20,
                    previousMargin = this.marginLeft;
                this.marginLeft = axisWidth1 > yMargin ? axisWidth1 : yMargin + (window.Modernizr.printlayout ? 25 : 0);

                if (previousMargin !== this.marginLeft) {
                    this.margin = this.getMargin();
                    chartWidth = this.getChartWidth();
                    this.x.rangePoints([0, chartWidth], 0);
                }

                if (this.showYAxisLabels && this.chartYAxisLabels && this.chartYAxisLabels.length > 1) {
                    var axisWidth2 = 10 + this.axisLayer.select(".y.axis.secondary").node().getBBox().width;
                    this.marginRight = axisWidth2 || 25;
                }
        },
        
        shouldExcludeSeries: function (xCount, seriesName, seriesDescr) {
            var excludeEmptySeriesIsArray = $.isArray(this.excludeEmptySeries);

            if (xCount < 1 && this.excludeEmptySeries ) {
                if (excludeEmptySeriesIsArray) {
                    if ((seriesName && $.inArray(seriesName, this.excludeEmptySeries) > -1) || (seriesDescr && $.inArray(seriesDescr, this.excludeEmptySeries) > -1)) {
                        return true;
                    }
                }
                else {
                    return true;
                }
            }
            return false;
        },

        recalcChartWidth: function () {
            this.margin = this.getMargin();

            var chartHeight = this.getChartHeight(),
                chartWidth = this.getChartWidth();

            this.x.rangePoints([0, chartWidth], 0);
            this.y.range([chartHeight, 0]);

            this.xAxis.scale(this.x)
                .tickValues(this.x.domain().filter(function (d) {
                    return d;
                }));
            this.yAxis.scale(this.y);

            if (this.mouseLayer) {
                this.mouseLayer
                    .attr('width', chartWidth)
                    .attr('height', chartHeight);
            }
        },

        updateYAxis: function () {
            var chartHeight = this.getChartHeight(),
                chartWidth = this.getChartWidth(),
                numberOfTicks = Math.max(Math.floor(chartHeight/this.yAxisLabelPadding), this.minYAxisTicks);

            if (this.showGridLines) {
                this.yAxis.tickSize(-chartWidth, 0, 0);
            }

            this.y.range([chartHeight, 0]);
            this.yAxis.scale(this.y)
                .ticks(numberOfTicks);

            this.axisLayer.select('.y.axis')
                .call(this.yAxis);
        },

        tickFormatFunction: function (formatString, val) {
            return formatterjs.format((Math.round(val * 1000000000)/1000000000), formatString);
        },

        checkDuplicateAxisTicks: function (axis, formatString, min, max, scale) {
            var ticks = axis.scale().ticks(axis.ticks()[0]),
                currTick,
                prevTick = formatterjs.format(ticks[0], formatString),
                i;

            for (i = 1; i < ticks.length; i++) {
                currTick = formatterjs.format(ticks[i], formatString);

                if (currTick === prevTick) {
                    var newMinAndMax = this.adjustMinAndMax(min, max);

                    if (this._addPrecisionCount < this._maxPrecisionExtension && (this.allowAddedPrecision || this._maxTicksRemoved)) {
                        formatString = this.addPrecision(formatString);
                        axis.tickFormat(this.tickFormatFunction.bind(this, formatString));
                        return this.checkDuplicateAxisTicks(axis, formatString, min, max, scale);
                    }

                    else if ((!this._maxTicksRemoved && this.defaultRemoveValuesOnY) || (newMinAndMax[0] === min && newMinAndMax[1] === max)) {
                        axis = this.removeAxisTicks(axis, ticks.length, formatString);
                        return this.checkDuplicateAxisTicks(axis, formatString, min, max, scale);
                    }

                    else if (newMinAndMax[0] !== min || newMinAndMax[1] !== max) {
                        scale.domain([newMinAndMax[0], newMinAndMax[1]]);
                        return this.checkDuplicateAxisTicks(axis, formatString, newMinAndMax[0], newMinAndMax[1], scale);
                    }

                    else {
                        axis.ticks(1);
                    }
                    break;
                }
                prevTick = currTick;
            }

            this._numberOfTicks = axis.scale().ticks(axis.ticks()[0]).length;

            return [axis, scale, formatString];
        },

        adjustMinAndMax: function (min, max) {
            var range = max - min,
                newMin = this.calcMinOrMax(min, false, range, this.percentPadding),
                newMax = this.calcMinOrMax(max, true, range, this.percentPadding);

            if (this.min !== null && this.min !== undefined && newMin < this.min) {
                newMin = this.min;
            }

            if (this.max !== null && this.max !== undefined && newMax > this.max) {
                newMax = this.max;
            }
            
            return [newMin, newMax];
        },

        removeAxisTicks: function (axis, numberOfTicks) {
            var i;
            for (i = 1; axis.scale().ticks(axis.ticks()[0]).length >= numberOfTicks; i++ ) {
                axis.ticks(numberOfTicks - i);
            }

            if (axis.scale().ticks(axis.ticks()[0]).length < 1) {
                this._maxTicksRemoved = true;
                axis.ticks(2);
            }
            return axis;
        },

        addPrecision: function (formatString) {
            var dotIndex = formatString.indexOf("."),
                lastIndex = formatString.indexOf("0");

            if (dotIndex > -1) {
                formatString = formatString.substring(0, dotIndex + 1) + '0' + formatString.substring(dotIndex + 1);
            }

            else if (lastIndex === 0) {
                formatString = formatString + '.0';
            }

            else if (lastIndex > 0) {
                formatString = formatString.substring(0, lastIndex + 1) + '.0' + formatString.substring(lastIndex + 1);
            }

            else {
                formatString = formatString + "0";
            }
            
            this._addPrecisionCount++;
            return formatString;
        },
        
        _iterateOverLabelAxis: function (axis) {
            if (!this.drawYAxisLabelsInsideChart) {
                var currLabelLength = 0,
                    maxLabelLength = 0,
                    widthOfFirstLabel = 0,
                    maxLabelCharacters = this.maxLabelCharacters;

                this._labelsRotated = false;

                this.axisLayer.selectAll('.' + axis + '.axis text')
                    .each(function (d, i) {
                        if (maxLabelCharacters && d.length > maxLabelCharacters) {
                            d3.select(this).text(d.slice(0, maxLabelCharacters) + "...");
                        }

                        currLabelLength = this.getComputedTextLength();
                        if (i === 0) {
                            widthOfFirstLabel = currLabelLength;
                        }

                        if (currLabelLength > maxLabelLength) {
                            maxLabelLength = currLabelLength;
                        }

                    });

                this._rawFirstLabelWidth = widthOfFirstLabel;
                return maxLabelLength;
            }
            return 0;
        }

    });
});
