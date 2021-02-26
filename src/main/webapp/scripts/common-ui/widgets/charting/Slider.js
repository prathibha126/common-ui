define([
    "jquery",
    "d3",
    "common-ui/widgets/charting/_SVG",
    "common-ui/widgets/utils/formatter",
    "text!common-ui/widgets/charting/templates/Slider.html"
], function ($, d3, _SVG, formatterjs, template) {

    "use strict";

    return _SVG.extend({
        template: template,

        heightRatio: null,
        height: 35,
        minHeight: 10,
        showLegend: false,
        marginRight: 10,
        marginLeft: 10,
        marginTop: 5,
        marginBottom: 20,
        chartLabels: null,
        startIndex: null,
        endIndex: null,
        startValue: null,
        endValue: null,
        defaultNumberSelected: 2,
        minSelectionAllowed : 2,
        maxSelectionAllowed : 10000,
        horizontalLabelPadding: 5,
        alwaysShowLastLabel: false,
        dispatchInitialChange : true,

        //  labelsReducedFromLeft: Boolean
        //      removing labels when they don't fit from left to right of the axis which causes the first label to always
        //      show but doesn't guarantee that the last one will (since all the labels are evenly spaced). If set to false,
        //      the calculation will be switched and the reductions will start at the right which means the last label will
        //      always show but since all the labels are evenly spaced, it doesn't guarantee that the first label will
        //      always be there.
        labelsReducedFromLeft: true,

        onTemplateNodesAttached: function () {
            setTimeout(function() {
                if (!this._dataUpdated) {
                    this.updateData(this.data);
                }
            }.bind(this), 10);
        },

        onViewShown : function() {
            if (!this.isHidden() && !this._chartCreated) {
                setTimeout(function() {
                    this._renderSlider();
                }.bind(this), 10);
            }
        },

        getSelectedLabel : function () {
            return this.range || "";
        },

        getSelectedValue : function () {
            return this._selectedRange;
        },

        getSelectedItem : function() {
            return this._selectedRange;
        },

        getHeight: function (margin, id) {
            var h = this.height || (id.width() / 1.5 - 70);

            h = ( h - margin.top - margin.bottom <= 0 ) ?
            margin.top + margin.bottom + 20 : h;

            return Math.min(this.maxHeight, Math.max(h, this.minHeight));
        },

        _createChart: function () {
            if (this.margin && this.data && this.svg) {
                this.x = d3.scale.ordinal().rangePoints([0, this.getChartWidth()], 0);
                this.xAxis = d3.svg.axis().scale(this.x).orient('bottom');

                //Create element to make sure the axis is always behind the chart on the svg
                if (!this.axisLayer) {
                    this.axisLayer = this.svg.append('g').attr('class', 'axis-layer');
                }

                if (!this.sliderLayer) {
                    this.sliderLayer = this.svg.append('g').attr('class', 'slider');
                }
            }
        },

        _updateSlider: function () {
            this.heightOfLabel = 0;
            this.margin = this.getMargin();
            var width = this.getChartWidth(),
                height = this.getChartHeight(),
                horizontalLabelPadding = this.horizontalLabelPadding;

            if (this.chartLabels && this.chartLabels.length > 0) {
                this.x.domain(this.chartLabels);
            }
            else {
                this.x.domain([]);
            }

            this.x.rangePoints([0, width], 0);
            this._numberOfLabelsShown = this.chartLabels.length;

            if (this.svg && this.xAxis) {
                this.xAxis.scale(this.x).ticks(this.x.domain().filter(function(d) {return d; })).tickFormat(function(d) {return d;});

                this.axisLayer.selectAll('g.axis').remove();

                this.axisLayer.append('g')
                    .attr('class', 'x axis')
                    .attr("transform", "translate(0," + height + ")")
                    .call(this.xAxis)
                    .selectAll('text')
                    .style("text-anchor", "middle");

                this._iterateOverLabelAxis("x");
                this.marginLeft = this.marginRight = (this._maxLabelLength / 2) > 10 ? (this._maxLabelLength / 2 ) : 10;
                this.margin = this.getMargin();

                width = this.getChartWidth();
                var combinedLabelLength = (this._maxLabelLength + horizontalLabelPadding) * this.chartLabels.length;

                this.x.rangePoints([0, width]);
                
                if (combinedLabelLength >= width || (this.maxLabelCount && this.chartLabels.length > this.maxLabelCount)) {
                    this._calcXAxisDomain(combinedLabelLength, width, 1);

                    this.axisLayer.selectAll('g.axis').remove();

                    this.axisLayer.append('g')
                        .attr('class', 'x axis')
                        .attr("transform", "translate(0," + height + ")")
                        .call(this.xAxis);

                    this._iterateOverLabelAxis("x");
                }
                else {
                    this.axisLayer.selectAll('g.axis').remove();
                    this.axisLayer.append('g')
                        .attr('class', 'x axis')
                        .attr("transform", "translate(0," + height + ")")
                        .call(this.xAxis);
                }

                if (!this.brush) {
                    this._createBrush();
                }

                this.sliderLayer.select('.brush')
                    // .transition()
                    // .delay(animationDelay)
                    // .duration(animationDuration)
                    .call(this.brush.extent([this.x(this._initStart), this.x(this._initEnd)]));

                this.setRange(this.chartLabels[this._startIndex] + " - " + this.chartLabels[this._endIndex]);
                if (this.dispatchInitialChange) {
                    this._brushended();
                }
            }

            this.svg.attr('transform', 'translate(' + this.margin.left + ', ' + this.margin.top + ')');
        },

        _createBrush: function() {
            var width = this.getChartWidth(),
                height = this.getChartHeight(),
                me = this;

            this.brush = d3.svg.brush()
                .x(this.x)
                .extent([width, height])
                .on("brush", function () {
                    me._brushed(this);
                })
                .on("brushend", this._brushended.bind(this));

            var brushContainer = this.sliderLayer.append("g")
                .attr("class", "brush")
                .call(this.brush);

            brushContainer.selectAll("rect")
                .attr("height", height);

            brushContainer.selectAll(".background")
                .on("mousedown", this._brushCentered.bind(this))
                .on("touchstart", this._brushCentered.bind(this));

            this.sliderLayer.selectAll(".w")
                .append("circle")
                .attr("r", (height / 2) + 4)
                .attr("cy", height / 2);

            this.sliderLayer.selectAll(".e")
                .append("circle")
                .attr("r", (height / 2) + 4)
                .attr("cy", height / 2);
        },

        _brushed : function (me) {
            var newChartWidth = this.getChartWidth(),
                interval = this.chartLabels.length > 1 ? Math.floor((newChartWidth / (this.chartLabels.length - 1)) / 2) : newChartWidth,
                range = this.x.range(),
                d0 = this.brush.extent(),
                start = d3.bisect(range, d0[0] - interval),
                end = d3.bisect(range, d0[1] - interval),
                selectedRange = Math.abs(end - start) + 1;

            if (selectedRange >= this._minSelectionAllowed && selectedRange <= this._maxSelectionAllowed + 1) {

                if (start > end) {
                    start = Math.floor(d0[0] / range[1]);
                    end = Math.ceil(d0[1] / range[1]);
                }

                this._startIndex = start;
                this._endIndex = end;
            }

            this.setRange(this.chartLabels[this._startIndex] + " - " + this.chartLabels[this._endIndex]);

            d3.select(me).call(this.brush.extent([this.x(this.chartLabels[this._startIndex]), this.x(this.chartLabels[this._endIndex])]));
        },

        _brushCentered: function () {
            d3.event.stopImmediatePropagation();

            var dx = this.brush.extent()[1] - this.brush.extent()[0],
                cx = d3.mouse(d3.event.target)[0],
                x0 = cx - dx / 2,
                x1 = cx + dx / 2,
                width = this.getChartWidth(),
                interval = this.chartLabels.length > 1 ? Math.floor((width / (this.chartLabels.length - 1)) / 2) : width,
                range = this.x.range(),
                startIndex = d3.bisect(range, x0 - interval),
                endIndex = d3.bisect(range, x1 - interval),
                startX = this.x(this.chartLabels[startIndex]),
                endX = this.x(this.chartLabels[endIndex]),
                newExtent = x1 > width ? [width - dx, width] : x0 < 0 ? [0, dx] : [startX, endX];

            this._startIndex = d3.bisect(range, newExtent[0] - interval);
            this._endIndex = d3.bisect(range, newExtent[1] - interval);

            this.setRange(this.chartLabels[this._startIndex] + " - " + this.chartLabels[this._endIndex]);

            d3.select(d3.event.target.parentNode).call(this.brush.extent(newExtent));
            this._brushended();
        },

        _brushended: function () {
            var start = this.chartLabels[this._startIndex],
                end = this.chartLabels[this._endIndex];
            this._selectedRange = {
                start: start,
                end: end,
                from: start,
                to : end,
                startIndex: this._startIndex,
                endIndex: this._endIndex,
                selectionCount : this._endIndex - this._startIndex,
                data: this.data
            };
            this.dispatchEvent("change", this._selectedRange, true);
        },

        _calcXAxisDomain: function (combinedLabelWidths, chartWidth, lastLabelPadding) {
            var alwaysShowLastLabel = this.alwaysShowLastLabel,
                interval = this.maxLabelCount ? Math.ceil(this.chartLabels.length/this.maxLabelCount) : Math.ceil(combinedLabelWidths/chartWidth),
                last = this.chartLabels.length,
                lastStep = last-Math.ceil(interval*lastLabelPadding),
                lastIndex = last-1;

            this._numberOfLabelsShown = 0;

            this.xAxis.tickFormat(function(d, i) {
                if (!this.labelsReducedFromLeft) {
                    i = lastIndex-i;
                }
                if (alwaysShowLastLabel && i === lastIndex) {
                    this._numberOfLabelsShown++;
                    return d;
                }

                else if (alwaysShowLastLabel && i >= lastStep) {
                    return "";
                }

                else{
                    this._numberOfLabelsShown += (i % interval) === 0 ? 1 : 0;
                    return (i % interval) === 0 ? d : "";
                }
            }.bind(this));
        },

        _iterateOverLabelAxis: function (axis) {
            var currLabelLength = 0,
                maxLabelLength = 0,
                widthOfFirstLabel = 0,
                maxLabelCharacters = this.maxLabelCharacters;

            this.axisLayer.selectAll('.x.axis text')
                .each(function(d, i){
                    if (maxLabelCharacters && d.length > maxLabelCharacters) {
                        this.innerHTML = d.slice(0, maxLabelCharacters) + "...";
                    }

                    currLabelLength = this.getComputedTextLength();
                    if (i === 0) {
                        widthOfFirstLabel = currLabelLength;
                    }

                    if(currLabelLength > maxLabelLength) {
                        maxLabelLength = currLabelLength;
                    }
                });

            this._rawFirstLabelWidth = widthOfFirstLabel;
            this._overhangOfLastLabel = currLabelLength/2;
            this._maxLabelLength = maxLabelLength;
        },

        updateData: function (data) {
            this.data = this._extractSliderData(data);
            
            if (this.attachPoints) {
                this._dataUpdated = true;
                this._renderSlider();
            }
        },

        _resize : function() {
            if (!this.svg) {
                return;
            }
            var currWidth = this.getWidth(this.margin, this.attachPoints.sliderFilter),
                currHeight = this.getHeight(this.margin, this.attachPoints.sliderFilter);
            if ((this.width === currWidth) || currWidth <= 0 || currHeight <= 0 || !$(this.domNode).is(":visible")) {
                return;
            }

            if (this.width !== currWidth) {
                this.width = currWidth;
                this.height = this.getHeight(this.margin, this.attachPoints.sliderFilter);

                d3.select(this.attachPoints.sliderFilter[0]).select('svg')
                    .attr('height', this.height)
                    .attr('width', this.width);

                var chartWidth = this.getChartWidth(),
                    chartHeight = this.getChartHeight();
                this.x.rangePoints([0, chartWidth], 0);
                this.sliderLayer.select('.brush').call(this.brush.extent([this.x(this.chartLabels[this._startIndex]), this.x(this.chartLabels[this._endIndex])]));

                this.xAxis.scale(this.x);

                var combinedLabelLength = (this._maxLabelLength + this.horizontalLabelPadding) * this.chartLabels.length,
                    numberOfLabelsThatWillFit = Math.round(chartWidth/(this._maxLabelLength + this.horizontalLabelPadding));

                if (numberOfLabelsThatWillFit !== this._numberOfLabelsShown || (this.maxLabelCount && this.chartLabels.length > this.maxLabelCount)) {
                    this.xAxis.ticks(this.x.domain().filter(function(d) {return d; })).tickFormat(function(d) {return d;});
                    this._calcXAxisDomain(combinedLabelLength, chartWidth, 1);
                    this.axisLayer.selectAll('g.axis').remove();

                    this.axisLayer.append('g')
                        .attr('class', 'x axis')
                        .attr("transform", "translate(0," + chartHeight + ")")
                        .call(this.xAxis)
                        .selectAll('text')
                        .style("text-anchor", "middle");
                }

                else {
                    this.axisLayer.select('.x.axis').call(this.xAxis);
                }
            }
        },

        _renderSlider: function() {
            var noData = this.data === null || this.data === undefined || $.isEmptyObject(this.data),
                hidden = this.domNode && !this.domNode.is(":visible") && !window.Modernizr.printlayout;

            if (this.attachPoints) {
                if (this.attachPoints.sliderFilter) {
                    if (!noData && !hidden) {
                        if (this.noDataDiv) {
                            this.noDataDiv.hide();
                            this.attachPoints.sliderFilter.show();
                        }
                        if (!this._chartCreated) {
                            this.attachPoints.sliderFilter.show();
                            this.createSVG(this.attachPoints.sliderFilter);
                            this._createChart(this.data);
                            this._chartCreated = true;
                        }
                    }
                }
                this.toggleElementVisible(this.attachPoints.sliderFilterTitleContainer, this.title);
            }
            if (this._chartCreated && !noData) {
                if (!hidden && this.width !== this.getWidth(this.margin)) {
                    this._resize();
                }

                this._updateSlider(this.data);

                if (!window.Modernizr.printlayout && !this._resizeHandle) {
                    this._resizeHandle = this.connect(window, "resize.slider." + this._key, this._resize.bind(this));
                }
            }
        },

        _extractSliderData: function(data) {
            if (data) {
                this.chartLabels = data && data.labels ? data.labels : data;
                if (this.chartLabels.length > 1) {
                    this._startIndex = data.startIndex || this.startIndex;
                    this._endIndex = data.endIndex || this.endIndex;
                    this._initStart = data.initStart || (this._startIndex !== null && this._startIndex !== undefined ? this.chartLabels[this._startIndex] : this.startValue);
                    this._initEnd = data.initEnd || (this._endIndex !== null && this._endIndex !== undefined ? this.chartLabels[this._endIndex] : this.endValue);
                    this._minSelectionAllowed = data.minSelectionAllowed || this.minSelectionAllowed;
                    this._maxSelectionAllowed = data.maxSelectionAllowed || this.maxSelectionAllowed;
                    this._defaultNumberSelected = data.defaultNumberSelected || this._minSelectionAllowed > this.defaultNumberSelected ? this._minSelectionAllowed : this.defaultNumberSelected;
                    this._defaultNumberSelected = this._defaultNumberSelected > 0 ? this._defaultNumberSelected : 1;
                    this._minSelectionAllowed = this._minSelectionAllowed > 0 ? this._minSelectionAllowed : 1;
                    this._maxSelectionAllowed = this._maxSelectionAllowed >= this._minSelectionAllowed ? this._maxSelectionAllowed : this._minSelectionAllowed;
                    var i;

                    if ((this._initStart === null || this._initStart === undefined) &&
                        (this._initEnd === null || this._initEnd === undefined)) {

                        this._endIndex = this.chartLabels.length - 1;
                        this._startIndex = this.chartLabels.length - this._defaultNumberSelected;

                        this._initEnd = this.chartLabels[this._endIndex];
                        this._initStart = this.chartLabels[this._startIndex];
                    }

                    else {
                        if ((this._initStart !== null && this._initStart !== undefined) ||
                            (this._initEnd !== null && this._initEnd !== undefined)) {
                            for (i = 0; i < this.chartLabels.length; i++) {
                                if (this.chartLabels[i] === this._initStart) {
                                    this._startIndex = i;
                                }
                                if (this.chartLabels[i] === this._initEnd) {
                                    this._endIndex = i;
                                }
                            }
                        }
                    }
                    return data;
                }
                return null;
            }
        }

    });
});