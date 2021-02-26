define([
    "jquery",
    "d3",
    "common-ui/widgets/_TemplatedWidget",
    "text!common-ui/widgets/charting/templates/TimeSlider.html"
], function ($, d3, _TemplatedWidget, template) {

    "use strict";

    var parseDateString = function (s, timeFormat) {
            return d3.time.format(timeFormat).parse(s);
        },
        TIME_INTERVALS = ["millisecond", "second", "minute", "hour", "day", "week", "month", "year"];

    return _TemplatedWidget.extend({

        template: template,

        height: 65,

        timeFormat : "%Y-%m-%d",
        labelFormat : "%b %Y",
        tickFormat : "%Y",
        defaultSelectionCount : 24,
        // timeInterval: String
        //      [second|minute|hour|day|week|month|year]
        timeInterval : "month",
        changeDispatcher : true,

        startDate: null,
        endDate: null,
        initStart: null,
        initEnd: null,
        title: "Timeframe",
        timeRange: "",
        yLabel: "",
        renderBars: false,
        renderLine: true,
        fillColor: "steelblue",
        fillLine: true,

        init : function() {
            this._super.apply(this, arguments);

            var interval, intervalIdx = 1;
            for (intervalIdx; intervalIdx < TIME_INTERVALS.length; intervalIdx++) {
                if (TIME_INTERVALS[intervalIdx] === this.timeInterval) {
                    interval = this.timeInterval;
                    break;
                }
            }
            if (!interval) {
                interval = "month";
            }
            this._timeInterval = d3.time[interval];
            this._timeIntervalPrevious = d3.time[TIME_INTERVALS[intervalIdx - 1]];
            this._timeIntervals = d3.time[interval + "s"];
        },

        onTemplateNodesAttached: function () {
            setTimeout(function () {
                this._renderTimeline();
            }.bind(this), 1);
        },

        updateData: function (data) {
            this.data = data;
            this.barData = this._convertDataForBars(this.data);
            if (data && data.labels && data.labels.length > 1) {
                this.startDate = parseDateString(data.labels[0], this.timeFormat);
                this.endDate = parseDateString(data.labels[data.labels.length - 1], this.timeFormat);
                /*var calcEnd  = new Date(this._timeInterval.offset(this.endDate, +1));
                calcEnd = new Date(this._timeInterval.ceil(calcEnd));
                calcEnd = new Date(this._timeIntervalPrevious.offset(calcEnd, -1));
                this.endDate = calcEnd;*/

                if (!this.initEnd) {
                    this.initEnd = this.endDate;
                    if (this.defaultSelectionCount !== null && this.defaultSelectionCount > 0) {
                        this.initStart = parseDateString(data.labels[Math.max(0, data.labels.length - this.defaultSelectionCount)], this.timeFormat);
                    }
                }
            }
            this._renderTimeline();
        },

        _convertDataForBars: function (data) {
            var final = [];
            if (data && data.labels && data.chartSeries && data.chartSeries.length > 0) {
                var labels = data.labels;
                var points = data.chartSeries[0].dataPoints;

                points.forEach(function (d, i) {
                    final.push({label: labels[i], value: points[i]});
                });
            }
            return final;
        },

        _renderTimeline: function () {
            if (!this.brush && this.data && this.attachPoints && this.attachPoints.slider) {
                var domNode = this.attachPoints.slider;
                var bgroup = d3.select(domNode[0]);
                this.brush = this.timelineWidget(domNode);
                this.brush(bgroup);
            }

            else if (this.brush) {
                this.brush.refresh(this.barData, this.startDate, this.endDate);
            }
        },

        dispatchChange: function (from, to) {
            if (from && to && !isNaN(from.getTime()) && !isNaN(to.getTime()) &&
                (!this._lastEvent || new Date().getTime() > this._lastEvent + 500)) {
                this._lastEvent = new Date().getTime();
                var labelFormat = d3.time.format(this.labelFormat),
                    fromLabel = labelFormat(from),
                    toLabel = labelFormat(to);
                this.timeRange = fromLabel + " - " + toLabel;
                if (this.setTimeRange) {
                    this.setTimeRange(this.title + ": " + this.timeRange);
                }
                this._lastSelectedValue = {
                    from: from.getTime(),
                    to: to.getTime(),
                    fromLabel : fromLabel,
                    toLabel : toLabel,
                    data : this.data
                };
                this.dispatchEvent("change", this._lastSelectedValue, true);
            }
        },

        getSelectedItem : function() {
            return this._lastSelectedValue;
        },


        timelineWidget: function (domNode) {
            var height = this.height, // default height
                width = domNode.width(),
                endDate = this.endDate || new Date(),
                defaultSelectionCount = this.defaultSelectionCount,
                startDate = this.startDate || new Date(this._timeInterval.offset(endDate, defaultSelectionCount * -1)),
                initStart = this.initStart || null,
                initEnd = this.initEnd || null,
                monthBool = true,
                data = this.barData,
                dispatchEvent = this.dispatchChange.bind(this),
                yLabel = this.yLabel,
                renderBars = this.renderBars,
                renderLine = this.renderLine,
                fillColor = this.fillColor,
                fillLine = this.fillLine,
                timeFormat = this.timeFormat,
                tickFormat = this.tickFormat,
                timeInterval =  this._timeInterval,
                timeIntervalPrevious = this._timeIntervalPrevious;

            function slider(selection) {
                selection.each(function () {
                    if (startDate > endDate) {
                        startDate = timeInterval.offset(endDate, defaultSelectionCount * -1);
                    }

                    var midpoint = new Date((endDate.getTime() + startDate.getTime()) / 2);

                    var parseDate = d3.time.format(timeFormat);
                    if (initStart === null || typeof initStart === "undefined") {
                        initStart = new Date(timeInterval.offset(midpoint, -3));
                    }

                    if (initEnd === null || typeof initEnd === "undefined") {
                        initEnd = new Date(timeInterval.offset(midpoint, 3));
                    }

                    var onBrush;

                    var x = d3.time.scale()
                        .domain([startDate, endDate])
                        .range([0, width]);

                    var x2 = d3.time.scale()
                        .domain([startDate, endDate])
                        .range([0, width]);

                    var chartBG = d3.select(domNode[0])
                        .append('svg')
                        .attr('width', width)
                        .attr('height', height)
                        .attr('class', 'chartBG');

                    var timechart = chartBG.append('g')
                        .attr('width', width)
                        .attr('height', height)
                        .attr('class', 'timechart');

                    if (renderBars || renderLine) {
                        if (renderBars) {
                            fillColor = "#333";
                        }

                        if (yLabel !== "") {
                            chartBG.attr('height', height + 20);

                            chartBG.append("rect")
                                .attr("class", "legend")
                                .attr("height", 10)
                                .attr("width", 10)
                                .attr("fill", fillColor)
                                .attr("transform", "translate(10," + (height + 5) + ")");

                            chartBG.append("text")
                                .attr("class", "legend-text")
                                .attr("text-anchor", "start")
                                .attr("transform", "translate(30," + (height + 15) + ")")
                                .text(yLabel);
                        }

                        var dataPoints = data;

                        // x.domain([startDate, timeInterval.offset(endDate, 1)]);
                        // x2.domain([startDate, timeInterval.offset(endDate, 1)]);

                        x.domain([startDate, endDate]);
                        x2.domain([startDate, endDate]);

                        //Height of the bars with 20 px padding at top
                        var y = d3.scale.linear()
                            .range([0, height - 20]);

                        //domain from 0 - max value
                        y.domain([0, d3.max(dataPoints, function (d) {
                            return d.value;
                        })]);

                        if (renderBars) {
                            //create bars
                            timechart.append('g').selectAll(".bar")
                                .data(dataPoints)
                                .enter()
                                .append("rect")
                                .attr("class", "bar")
                                .attr("y", height)
                                .attr("x", function (d) {
                                    return x(parseDate.parse(d.label));
                                })
                                .attr("width", ((width - 12) / dataPoints.length) - 2) // add padding
                                .attr("height", 0)
                                .attr("fill", fillColor)
                                .transition()
                                .duration(750)
                                .attr("y", function (d) {
                                    return height - y(d.value);
                                })
                                .attr("height", function (d) {
                                    return y(d.value);
                                });
                        }

                        else if (renderLine) {
                            var area = d3.svg.area()
                                .x(function (d) {
                                    return x(parseDate.parse(d.label));
                                })
                                .y(function (d) {
                                    return height - y(d.value);
                                })
                                .y0(height);

                            timechart.append("path")
                                .datum(dataPoints)
                                .attr("class", "area")
                                .attr("fill", "none")
                                .attr("stroke", fillColor)
                                .attr("d", area);

                            if (fillLine) {
                                timechart.selectAll("path.area").attr("fill", fillColor);
                            }
                        }
                    }

                    var xYearAxis = d3.svg.axis()
                        .scale(x)
                        .orient('bottom')
                        .tickFormat(d3.time.format(tickFormat))
                        .tickSize(6, 0, 0);


                    timechart.append('g')
                        .attr('class', 'axis year')
                        .call(xYearAxis)
                        .selectAll('text')
                        .style("text-anchor", "start");

                    //Calculate the diff between two dates
                    function calcDateIntervalDiff(start, end) {
                        return Math.max(0, timeInterval.range(start, end).length);
                    }

                    // draw the selection area
                    var brush = d3.svg.brush();


                    function selectBars() {
                        if (renderBars) {
                            var extent = brush.extent();
                            timechart.selectAll(".bar").classed("selected", function (d) {
                                return timeInterval(extent[0]) <= parseDate.parse(d.label) && parseDate.parse(d.label) <= extent[1];
                            });
                        }

                    }

                    //display for expanding and contracting the brush area
                    function displayResize() {
                        var minExtent = timeIntervalPrevious(brush.extent()[0]), maxExtent = timeIntervalPrevious(brush.extent()[1]);

                        timechart.select('.brush').call(brush.extent([minExtent, maxExtent]));

                        if (renderBars) {
                            selectBars();
                        }
                    }

                    //animates the brush moving to a new location
                    function displayTransition() {
                        var minExtent = timeInterval(brush.extent()[0]), maxExtent = timeInterval(brush.extent()[1]);
                        maxExtent = new Date(timeIntervalPrevious.offset(maxExtent, 0));

                        timechart.select('.brush').transition()
                            .duration(brush.empty() ? 0 : 450)
                            .call(brush.extent([minExtent, maxExtent]));

                        if (renderBars) {
                            selectBars();
                        }
                        var extents = brush.extent();
                        if (extents) {
                            if (extents[0] > extents[1]) {
                                dispatchEvent(extents[1], extents[0]);
                            }
                            else {

                                dispatchEvent(extents[0], extents[1]);
                            }
                        }
                    }

                    //calculates the new position of the brush
                    function moveBrush() {
                        if (!onBrush) {
                            var origin = d3.mouse(this)
                                , point = x2.invert(origin[0])
                                , pointTime = point.getTime()
                                , extent = brush.extent()
                                , extentStart = extent[0].getTime()
                                , extentEnd = extent[1].getTime()
                                , halfExtent = (extentEnd - extentStart) / 2
                                , start = new Date(pointTime - halfExtent)
                                , end = new Date(pointTime + halfExtent);


                            start = timeInterval.round(start);
                            end = timeInterval.round(end);

                            if (!calcDateIntervalDiff(start, end)) {
                                start = timeInterval.offset(start, -1);
                            }
                            if (startDate.getTime() > start.getTime()) {
                                start = new Date(startDate);
                            }
                            if (endDate.getTime() < end.getTime()) {
                                end = new Date(endDate);
                                start = timeInterval.offset(start, -1);
                            }

                            if (pointTime < extentStart || pointTime > extentEnd) {
                                brush.extent([start, end]);
                                displayTransition();
                            }
                        }
                    }

                    function refresh(updateData, argStartDate, argEndDate) {
                        var extents = brush.extent(),
                            start = extents[0],
                            end = extents[1],
                            prevDiff = (calcDateIntervalDiff(start, end)) || defaultSelectionCount,
                            maxDiff = calcDateIntervalDiff(argStartDate, argEndDate),
                            newDiff = Math.min(prevDiff, maxDiff);

                        if (isNaN(newDiff) || newDiff === 0) {
                            newDiff = Math.min(maxDiff, 1);
                        }

                        if (end.getTime() > argEndDate.getTime()) {
                            end = new Date(argEndDate);
                        }
                        start = timeInterval.offset(argEndDate, newDiff * -1);
                        if (start.getTime() < argStartDate.getTime()) {
                            start = new Date(argStartDate);
                        }

                        x.domain([argStartDate, argEndDate]);
                        x2.domain([argStartDate, argEndDate]);

                        timechart.select('.axis.year').call(xYearAxis);

                        if (renderBars) {
                            y.domain([0, d3.max(updateData, function (d) {
                                return d.value;
                            })]);

                            timechart.selectAll("rect.bar")
                                .data(data)
                                .transition()
                                .duration(750)
                                .attr("x", function (d) {
                                    return x(parseDate.parse(d.label)) + 2;
                                })
                                .attr("width", ((width - 12) / updateData.length) - 2)
                                .attr("y", function (d) {
                                    return height - y(d.value);
                                })
                                .attr("height", function (d) {
                                    return y(d.value);
                                });
                        }

                        if (renderLine) {
                            y.domain([0, d3.max(updateData, function (d) {
                                return d.value;
                            })]);

                            var secondArea = d3.svg.area()
                                .x(function (d) {
                                    return x(parseDate.parse(d.label));
                                })
                                .y(function (d) {
                                    return height - y(d.value);
                                })
                                .y0(height);

                            timechart.selectAll("path.area")
                                .datum(updateData)
                                .transition()
                                .duration(750)
                                .attr("d", secondArea);
                        }


                        brush.extent([start, end]);
                        displayTransition();
                    }

                    function emptyBrush() {
                        var minExtent = timeInterval(brush.extent()[0]);
                        var maxExtent = new Date(timeInterval.offset(minExtent, +1));

                        //Make sure the new brush is inside the domain
                        if (maxExtent.getTime() < endDate.getTime()) {
                            timechart.select('.brush').transition()
                                .duration(brush.empty() ? 0 : 450)
                                .call(brush.extent([minExtent, maxExtent]));

                            brush.extent([minExtent, maxExtent]);
                        }

                        else {
                            maxExtent = timeInterval(brush.extent()[1]);
                            minExtent = new Date(timeInterval.offset(minExtent, -1));

                            timechart.select('.brush').transition()
                                .duration(brush.empty() ? 0 : 450)
                                .call(brush.extent([minExtent, maxExtent]));

                            brush.extent([minExtent, maxExtent]);
                        }
                    }

                    function resize() {
                        if (!domNode.width() || !domNode.is(":visible")) {
                            return;
                        }
                        width = Math.max(400, domNode.width());

                        var minExtent = timeInterval(brush.extent()[0]), maxExtent = new Date(timeInterval.ceil(brush.extent()[1]));
                        maxExtent = new Date(timeIntervalPrevious.offset(maxExtent, 0));

                        x.range([0, width]);
                        x2.range([0, width]);
                        chartBG.attr("width", width);

                        if (renderBars) {
                            timechart.selectAll("rect.bar").attr("x", function (d) {
                                return x(parseDate.parse(d.label)) + 2;
                            }).attr("width", ((width - 12) / data.length) - 2);
                        }

                        if (renderLine) {
                            var secondArea = d3.svg.area()
                                .x(function (d) {
                                    return x(parseDate.parse(d.label));
                                })
                                .y(function (d) {
                                    return height - y(d.value);
                                })
                                .y0(height);

                            timechart.selectAll("path.area")
                                .attr("class", "area")
                                .attr("fill", "none")
                                .attr("stroke", fillColor)
                                .attr("d", secondArea);

                            if (fillLine) {
                                timechart.selectAll("path").attr("fill", fillColor);
                            }
                        }

                        timechart.selectAll(".resize").select("rect")
                            .style('visibility', 'visible')
                            .attr('x', -2)
                            .attr("rx", 3)
                            .attr("ry", 3);

                        timechart.selectAll(".resize.w").select("rect")
                            .attr('x', -4);

                        timechart.attr("width", width);
                        timechart.select("rect.hit-window").attr("width", width);
                        timechart.select('.axis.year').call(xYearAxis);
                        timechart.select('.brush').call(brush.extent([minExtent, maxExtent]));
                    }

                    // invisible hit area to move around the selection window
                    timechart.append('rect')
                        .attr('class', 'hit-window')
                        .attr('pointer-events', 'painted')
                        .attr('width', width)
                        .attr('height', height)
                        .attr('visibility', 'hidden')
                        .on('mouseup', moveBrush);

                    brush
                        .x(x2)
                        .extent([startDate, endDate])
                        .on("brush", function () {
                            onBrush = true;
                            displayResize();
                        })
                        .on("brushend", function () {
                            //If the brush extent is less than a width
                            if ((brush.extent()[1] - brush.extent()[0]) < (brush.extent()[1] - timeInterval.offset(brush.extent()[0], +1))) {
                                //Pop the brush to the width of a month
                                emptyBrush();
                            }
                            var start = timeInterval.round(brush.extent()[0]),
                                end = timeInterval.round(brush.extent()[1]);

                            if (!calcDateIntervalDiff(start, end)) {
                                start = timeInterval.offset(start, -1);
                            }

                            timechart.select('.brush').transition().duration(400).call(brush.extent([start, end]));
                            dispatchEvent(brush.extent()[0], brush.extent()[1]);
                            onBrush = false;
                        });

                    timechart.append('g')
                        .attr('class', 'x brush')
                        .call(brush)
                        .selectAll('rect')
                        .attr('y', 0)
                        .attr('height', height);

                    //transition the brush onto the page
                    timechart.select('.brush').transition()
                        .duration(800)
                        .call(brush.extent([initStart, initEnd]));

                    //when clicked, remove the background and transition to new position
                    timechart.selectAll('rect.background').remove();
                    displayTransition();

                    //resize();
                    d3.select(window).on("resize.timeline." + domNode, resize);

                    resize();

                    slider.refresh = refresh;

                });
                return slider;
            }

            slider.width = function (value) {
                if (!arguments.length) {
                    return width;
                }
                width = value;
                return slider;
            };

            slider.height = function (value) {
                if (!arguments.length) {
                    return height;
                }
                height = value;
                return slider;
            };

            slider.domNode = function (value) {
                if (!arguments.length) {
                    return domNode;
                }
                domNode = value;
                return slider;
            };

            slider.startDate = function (value) {
                if (!arguments.length) {
                    return startDate;
                }
                startDate = new Date(value);
                return slider;
            };

            slider.endDate = function (value) {
                if (!arguments.length) {
                    return endDate;
                }
                endDate = new Date(value);
                return slider;
            };

            slider.monthBool = function (value) {
                if (!arguments.length) {
                    return monthBool;
                }
                monthBool = value;
                return slider;
            };

            slider.initStart = function (value) {
                if (!arguments.length) {
                    return initStart;
                }
                initStart = new Date(value);
                return slider;
            };

            slider.initEnd = function (value) {
                if (!arguments.length) {
                    return initEnd;
                }
                initEnd = new Date(value);
                return slider;
            };

            slider.yLabel = function (value) {
                if (!arguments.length) {
                    return yLabel;
                }
                yLabel = value;
                return slider;
            };

            return slider;
        }

    });

});
