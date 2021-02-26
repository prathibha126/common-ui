/**
 * Created by atack on 8/19/16.
 */
define([
    "d3",
    "common-ui/widgets/charting/D3SparkLineChart",
    "common-ui/widgets/utils/formatter"
], function (d3, D3SparkLineChart, formatter) {

    "use strict";

    return D3SparkLineChart.extend({

        baseClass: "card",
        height: 200,
        heightRatio: null,
        maxHeight: 300,
        datasetStrokeWidth: 3,
        showLegend: true,
        labelRotation: 45,
        alwaysRotateLabels: false,
        alwaysShowLastLabel: true,
        verticalLabelPadding : 15,
        yAxisLabelPadding: 40,
        allowLabelRotation: false,
        xAxisTickMarkPadding : '1.1em',
        maxLabelCount: null,
        horizontalLabelPadding: 10,
        showAxisTickMarks : true,
        showGridLines: true,
        preventXAxisCrowding: true,
        marginTop : 20,
        marginLeft : 45,
        marginBottom : 0,
        marginRight : 10,
        minWidth: 200,
        minHeight: 150,
        animation: true,
        tooltips : true,
        tooltipLine : true,
        noAxes : false,
        firstSeriesPointDot: true,
        noDataMessage: "There is no chart data available",
        _isSparkLine : false,
        legendPosition : "bottom",
        allowAddedPrecision : false,

        createChart: function () {
            // append the axis layer before calling the super method since it appends the line layer
            if (!this.axisLayer) {
                this.axisLayer = this.svg.append('g').attr('class', 'axis-layer');
            }
            this._super.apply(this, arguments);
            
            this.xAxis = d3.svg.axis().scale(this.x).orient('bottom');
            this.yAxis = d3.svg.axis().scale(this.y).orient('left')
                .ticks(Math.max(Math.floor(this.getChartHeight()/this.yAxisLabelPadding), this.minYAxisTicks))
                .tickFormat(this.tickFormatFunction.bind(this, this.formatString));

            if (this.showAxisTickMarks) {
                this.xAxis.outerTickSize(0);
                this.yAxis.outerTickSize(0);
            }
            else {
                this.xAxis.tickSize(0);
                this.yAxis.tickSize(0);
            }

            if (this.showGridLines) {
                this.yAxis.tickSize(-(this.getChartWidth()), 0, 0);
            }
        },

        updateChartData: function (data) {
            var horizontalLabelPadding = this.horizontalLabelPadding;
            this.x.rangePoints([0, this.getChartWidth()], 0);

            this.allowLabelRotation = this.labelRotation === 0 ? false : this.allowLabelRotation;

            if (this.chartLabels && this.chartLabels.length > 0) {
                this.x.domain(this.chartLabels);
            }
            else {
                this.x.domain([]);
            }

            this.y.domain([this.dataMin, Math.max(0, this.dataMax || 0)]);
            this.yAxis.ticks(Math.max(Math.floor(this.getChartHeight()/this.yAxisLabelPadding), this.minYAxisTicks))
                .tickFormat(this.tickFormatFunction.bind(this, this.formatString));

            if (this.svg && this.xAxis && this.yAxis) {
                if (data && data.length > 0) {
                    var chartWidth = this.getChartWidth(),
                        combinedLabelLength,
                        xAxisPadding = this.showAxisTickMarks ? this.xAxisTickMarkPadding : '1.1em';

                    this.xAxis.tickValues(this.x.domain().filter(function(d) {return d; }));

                    this.axisLayer.selectAll('g.axis').remove();

                    this.axisLayer.append('g')
                        .attr('class', 'x axis')
                        .attr("opacity", 0)
                        .call(this.xAxis)
                        .selectAll('text')
                        .attr('dy', xAxisPadding);

                    this._overhangOfLastLabel = 0;
                    var maxLabelLength = this._iterateOverLabelAxis("x");

                    combinedLabelLength = (maxLabelLength + horizontalLabelPadding) * this.chartLabels.length;

                    if ((combinedLabelLength >= chartWidth && this.allowLabelRotation) || this.alwaysRotateLabels) {
                        this.rotateLabels();
                    }

                    else if (this.preventXAxisCrowding && (combinedLabelLength >= chartWidth || (this.maxLabelCount && this.chartLabels.length > this.maxLabelCount))) {
                        this.calcXAxisDomain(combinedLabelLength, chartWidth, 1);

                        this.axisLayer.selectAll('g.axis').remove();

                        this.axisLayer.append('g')
                            .attr('class', 'x axis')
                            .attr("opacity", 0)
                            .call(this.xAxis)
                            .selectAll('text')
                            .attr('dy', xAxisPadding);

                        this._iterateOverLabelAxis("x");
                    }

                    this.heightOfLabel = this.axisLayer.select(".x.axis").node().getBBox().height;
                    this.axisLayer.select(".x.axis").attr('transform', 'translate(0, ' + (this.getChartHeight()) + ')');
                    this.y.range([this.getChartHeight(), 0]);

                    var axisAndScale =  this.checkDuplicateAxisTicks(this.yAxis, this.formatString, this.dataMin, this.dataMax, this.y);

                    this.yAxis = axisAndScale[0];
                    this.y = axisAndScale[1];
                    this.formatString = axisAndScale[2];

                    this.axisLayer.append('g')
                        .attr('class', function () {
                            if (this.showGridLines) {
                                return 'y axis gridlines';
                            }
                            else {
                                return 'y axis';
                            }
                        }.bind(this))
                        .attr("opacity", 0)
                        .call(this.yAxis);

                    this.updateYAxisLabels(chartWidth, (this.getChartHeight()));

                    this.resetWidthOfYAxis(chartWidth);

                    this.recalcChartWidth();

                    this.updateXAxis(chartWidth);

                    this.updateYAxis();

                    this.resizeChart();

                    this.recalcMouseLayer();

                    this.axisLayer.selectAll('g.axis').attr("opacity", 1);
                }
                this.drawChartLine(data);
            }
        },

        rotateLabels: function () {
            this.margin = this.getMargin();

            var labelRotation = this.labelRotation,
                verticalLabelPadding = this.verticalLabelPadding,
                text = this.svg.append('text')
                    .attr('class', 'temporary')
                    .text(this.chartLabels[0]),
                bbox = text.node().getBBox(),
                labelHeight = bbox.height,
                combinedLabelWidths = ((labelHeight + verticalLabelPadding)*this.chartLabels.length);

            text.remove();

            this.widthOfFirstXAxisLabel = this._rawFirstLabelWidth * Math.cos(labelRotation/180 * Math.PI);
            this._overhangOfLastLabel = 0;
            var chartWidth = this.getChartWidth();
            this.x.rangePoints([0, chartWidth], 0);

            //filter some ticks out if needed
            if (this.preventXAxisCrowding && (combinedLabelWidths > chartWidth)) {
                this.calcXAxisDomain(combinedLabelWidths, chartWidth, 0.5);
            }

            this.axisLayer.select('.x.axis')
                .call(this.xAxis)
                .selectAll('text')
                .style("text-anchor", "end")
                .attr("dx", "-.8em")
                .attr("dy", ".75em")
                .attr("transform", "rotate(-" + labelRotation + ")" );

            if (this.maxLabelCharacters) {
                this._iterateOverLabelAxis("x");
            }

            var xAxisNode = this.axisLayer.select(".x.axis").node();
            this.heightOfLabel = xAxisNode && xAxisNode.getBBox ? xAxisNode.getBBox().height : 0;
            this._labelsRotated = true;
            
            this.updateYAxis();

            this.axisLayer.select('.x.axis')
                .attr('transform','translate(0, ' + (this.getChartHeight()) + ')');

            this.y.range([this.getChartHeight(), 0]);

            this.recalcMouseLayer();
        },

        calcXAxisDomain: function (combinedLabelWidths, chartWidth, lastLabelPadding) {
            var alwaysShowLastLabel = this.alwaysShowLastLabel;

            var interval = this.maxLabelCount ? Math.ceil(this.chartLabels.length/this.maxLabelCount) : Math.ceil(combinedLabelWidths/chartWidth),
                last = this.chartLabels.length,
                lastStep = last-Math.ceil(interval*lastLabelPadding);

            this.xAxis.tickValues(this.x.domain().filter(function(d, i) {
                if (alwaysShowLastLabel && i === last-1) {
                    return d;
                }

                else if (alwaysShowLastLabel && i >= lastStep) {
                    return false;
                }

                else{
                    return (i % interval) === 0;
                }
            }));
        },

        resizeChart: function (redraw) {
            this._super.apply(this, arguments);
            this.marginRight = 10;

            var chartHeight = this.getChartHeight(),
                chartWidth = this.getChartWidth(),
                numberOfTicks = Math.max(Math.floor(chartHeight/this.yAxisLabelPadding), this.minYAxisTicks);

            this.xAxis.scale(this.x)
                .tickValues(this.x.domain().filter(function(d) {return d; }));
            this.yAxis.scale(this.y)
                .ticks(numberOfTicks)
                .tickSize(-chartWidth);

            if (numberOfTicks > this._numberOfTicks) {
                var originalTicks = this._numberOfTicks,
                    axisAndScale =  this.checkDuplicateAxisTicks(this.yAxis, this.formatString, this.dataMin, this.dataMax, this.y);

                this.yAxis = axisAndScale[0];
                this.y = axisAndScale[1];
                this.formatString = axisAndScale[2];

                if (originalTicks !== this._numberOfTicks) {
                    if (this.showGridLines) {
                        this.yAxis.tickSize(-(this.getChartWidth()), 0, 0);
                        this.axisLayer.select('.y.axis')
                            .call(this.yAxis);
                    }
                    this.resetWidthOfYAxis(this.getChartWidth());
                }
            }

            this.updateXAxis(this.getChartWidth());
            this.updateYAxis();

            if (this.showGridLines) {
                this.yAxis.tickSize(-(this.getChartWidth()), 0, 0);
            }

            this.axisLayer.select('.y.axis')
                .call(this.yAxis);

            if (this.showYAxisLabels) {
                var axisWidth1 = 10 + this.axisLayer.select(".y.axis").node().getBBox().width;

                if (this.showGridLines) {
                    axisWidth1 -= chartWidth;
                }

                this.axisLayer.selectAll('text.axis-label.primary')
                    .attr("transform", "translate("+ (axisWidth1*-1) +","+(chartHeight/2)+")rotate(-90)");
            }

            this.redrawChart(this.getChartHeight(), chartWidth);
        },

        updateXAxis: function (chartWidth) {
            var combinedLabelLength,
                horizontalLabelPadding = this.horizontalLabelPadding,
                xAxisPadding = this.showAxisTickMarks ? this.xAxisTickMarkPadding : '1.1em';

            this.axisLayer.select('.x.axis').call(this.xAxis);
            var maxLabelLength = this._iterateOverLabelAxis("x");
            this.widthOfFirstXAxisLabel = this._rawFirstLabelWidth/2;
            this._overhangOfLastLabel = 0;
            this._labelsRotated = false;

            combinedLabelLength = (maxLabelLength + horizontalLabelPadding) * this.chartLabels.length;

            if ((combinedLabelLength >= chartWidth && this.allowLabelRotation) || this.alwaysRotateLabels) {
                this.rotateLabels();
            }

            else if (this.preventXAxisCrowding && (combinedLabelLength >= chartWidth || (this.maxLabelCount && this.chartLabels.length > this.maxLabelCount))) {
                this.calcXAxisDomain(combinedLabelLength, chartWidth, 1);

                this.axisLayer.select('.x.axis')
                    .call(this.xAxis);

                if (this.maxLabelCharacters) {
                    this._iterateOverLabelAxis("x");
                }
            }
            else {
                this.axisLayer.select('.x.axis')
                    .selectAll('text')
                    .style('text-anchor', 'middle')
                    .attr('dx', null)
                    .attr('dy', xAxisPadding)
                    .attr('transform', 'rotate(0)');
            }

            if (!this._labelsRotated) {
                this._calcRightMargin(chartWidth);
            }

            var axisNode = this.axisLayer.select(".x.axis").node();
            this.heightOfLabel = axisNode ? axisNode.getBBox().height : 0;

            this.axisLayer.select('.x.axis')
                .attr("transform", "translate(0," + (this.getChartHeight()) + ")");

        },

        _calcRightMargin: function (chartWidth) {
            var lastTick = this.axisLayer.selectAll(".x.axis .tick:last-of-type"),
                lastTickPosition = lastTick[0].length ? d3.transform(lastTick.attr("transform")).translate[0] + lastTick.node().getBBox().width/2 : chartWidth;

            this._overhangOfLastLabel = 0;

            if (!this._labelsRotated && this._overhangOfLastLabel === 0 && lastTickPosition > chartWidth) {
                this._overhangOfLastLabel = lastTickPosition - chartWidth;
            }

            if (this._overhangOfLastLabel !== this.marginRight) {
                this.marginRight = this._overhangOfLastLabel > 10 ? this._overhangOfLastLabel : 10;
                this.margin = this.getMargin();
                this.x.rangePoints([0, this.getChartWidth()], 0);
                this.xAxis.scale(this.x);
                this.axisLayer.select('.x.axis')
                    .call(this.xAxis);
                this._iterateOverLabelAxis("x");
            }
        }
    });
});
