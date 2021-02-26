define([
    "jquery",
    "common-ui/widgets/_TemplatedWidget",
    "common-ui/widgets/utils/formatter",
    "text!common-ui/widgets/charting/templates/ComparativeBoxPlot.html"
], function($, _TemplatedWidget, formatter, template) {

    "use strict";

    var OFFSCREEN = -500,
        MAX_STEPS = 10;

    return _TemplatedWidget.extend({

        // ComparativeBoxPlot
        //      an comparative box plot
        //
        //      options
        //          data: Object
        //              an object containing the floor, benchmark, threshold, and actual values to show in the chart
        //          min: Number
        //              the minimum value of the range
        //          max: Number
        //              the maximum value of the range
        //          step: Number
        //              the step increments in between the min and max of the range
        //          formatString: String
        //              the format string used for the tick marks on the range

        template : template,

        baseClass : "",

        min : 0,
        max : 1,
        // step: Number
        //      the increment between each step; overriden by numSteps
        step : 0.2,
        // numSteps: Number
        //      the number of steps; overrides step if specified
        numSteps : null,
        formatString : "0%",
        tickMarkup : "",
        thresholdsMarkup : "",
        tickMarks : true,
        lowerIsBetter : null,
        animationDuration : 600,
        animationDelay : 300,
        animation : true,
        thresholdLabel : "",
        defaultRange : 1,
        minIsNegativeMax : false,
        derivedBenchmarkThreshold : null,
        derivedBenchmarkThresholdHigherClass : "derived-benchmark-threshold-higher",
        derivedBenchmarkThresholdLowerClass : "derived-benchmark-threshold-lower",
        labels: null,
        bulletActualsMarkup : "",

        _animateActualNode : function(actualNode, calculatedActual) {
            setTimeout(function() {
                actualNode.animate({
                    left : calculatedActual + "%"
                }, this.animationDuration);
            }.bind(this), this.animationDelay);
        },

        onTemplateNodesAttached : function(nodes) {
            if (nodes && this.animation) {
                if (nodes.actual && this._calculatedActual) {
                    var i;
                    for(i=0; i<this._calculatedActual.length; i++ ) {
                        if(nodes.actual.find(".bullet-actual.bullet-actual-" + (i+1)) && this._calculatedActual[i] !== OFFSCREEN){
                            this._animateActualNode(nodes.actual.find(".bullet-actual.bullet-actual-" + (i+1)), this._calculatedActual[i]);
                        }
                    }
                }
                if (nodes.bulletSegments && this._calculatedFloor !== 0) {
                    setTimeout(function() {
                        nodes.bulletSegments.find(".bullet-floor-benchmark").animate({
                            left : this._calculatedFloor + "%"
                        }, this.animationDuration);
                    }.bind(this), this.animationDelay);
                }

                if (this.labelsMarkup && this.attachPoints && this.attachPoints.labels) {
                    this.attachPoints.labels.removeClass("hidden");
                }
            }
        },

        updateData : function() {
            this._super.apply(this, arguments);
            if (this.setThresholdsMarkup) {
                this.setThresholdsMarkup(this.thresholdsMarkup || "");
            }
            if (this.setBulletSegmentsMarkup) {
                this.setBulletSegmentsMarkup(this.bulletSegmentsMarkup || "");
            }
            if (this.setTickMarkup) {
                this.setTickMarkup(this.tickMarkup || "");
            }
            if (this.setLabelsMarkup && this.labels) {
                this.setLabelsMarkup(this.labelsMarkup || "");
            }
            if (this.bulletActualsMarkup) {
                this.bulletActualsMarkup(this.bulletActualsMarkup || "");
            }
        },

        getTemplateData : function() {
            var data = this.data || {},
                backingClass = "";

            this._interceptData(data);
            if (this.lowerIsBetter === true || this.lowerIsBetter === false) {
                backingClass = this.lowerIsBetter ? "gradient g2b" : "gradient b2g";
            }

            return {
                baseClass : this.baseClass,
                backingClass : backingClass,
                benchmarkClass : data.benchmarkClass
            };
        },

        _getRange : function() {
            var range = (this.max - this.min);
            if (range === 0) {
                range = this.defaultRange;
            }
            return range;
        },

        _interceptData : function(data) {
            if (data.derivedBenchmarkThreshold !== undefined && data.derivedBenchmarkThreshold !== null) {
                this.derivedBenchmarkThreshold = data.derivedBenchmarkThreshold;
            }
            if (data.max !== undefined && data.max !== null) {
                this.max = data.max;
            }
            if (data.min !== undefined && data.min !== null) {
                this.min = data.min;
            }
            else if (this.minIsNegativeMax && this.max > 0) {
                this.min = this.max * -1;
            }
            if (this.min === this.max) {
                this.max += Math.floor(this.defaultRange / 2);
                this.min = this.max * -1;
            }
            if (data.formatString) {
                this.formatString = data.formatString;
            }
            if (data.thresholdLabel) {
                this.thresholdLabel = data.thresholdLabel;
            }
            if (data.step) {
                this.step = data.step;
            }
            if (data.lowerIsBetter === true || data.lowerIsBetter === false) {
                this.lowerIsBetter = data.lowerIsBetter;
            }
            if (data.numSteps) {
                this.numSteps = data.numSteps;
            }
            if ((data.threshold === undefined || data.threshold === null) && this.threshold !== undefined && this.threshold !== null) {
                data.threshold = this.threshold;
            }
            if ((data.actual === undefined || data.actual === null) && this.actual !== undefined && this.actual !== null) {
                data.actual = this.actual;
            }
            if (data.tickMarks !== null && data.tickMarks !== undefined) {
                this.tickMarks = data.tickMarks;
            }
            if (data.benchmarkFills) {
                this.benchmarkFills = data.benchmarkFills;
            }

            if (this.values === undefined) {
                if (this.derivedBenchmarkThreshold !== null && this.derivedBenchmarkThreshold !== undefined && !isNaN(this.derivedBenchmarkThreshold)) {
                    var actualArray = $.isArray(data.actual) ? data.actual : [data.actual];
                    if(actualArray.length === 1) {
                        var actualValue = actualArray[0];
                        var dfcav = Number(this.derivedBenchmarkThreshold);
                        if (actualValue < dfcav) {
                            data.floor = actualValue;
                            data.ceiling = dfcav;
                            data.benchmarkClass = this.derivedBenchmarkThresholdLowerClass;
                        }
                        else {
                            data.floor = dfcav;
                            data.ceiling = actualValue;
                            data.benchmarkClass = this.derivedBenchmarkThresholdHigherClass;
                        }
                    }
                }
                else {
                    data.benchmarkClass = "";
                    if ((data.floor === undefined || data.floor === null) && this.floor !== undefined && this.floor !== null) {
                        data.floor = this.floor;
                    }
                    if ((data.ceiling === undefined || data.ceiling === null) && this.ceiling !== undefined && this.ceiling !== null) {
                        data.ceiling = this.ceiling;
                    }
                }
            }

            if (data.labels && Array.isArray(data.labels)) {
                this.labels = data.labels;
            }

            if (this.labels && Array.isArray(this.labels)) {
                this._generateLabels();
            }

            this._generateBulletSegments();
            this._generateActuals();
            this._generateThresholds();
            this._generateTickMarks();
        },

        _generateLabels : function() {
            var labelsMarkup = "",
                xPos, k, lastItem,
                tickLength = this.labels.length;

            for (k = 0; k < tickLength; k++) {
                xPos = k / tickLength * 100;

                labelsMarkup += "<span style=\"left: " + xPos + "%;\" class=\"bullet-label" + (lastItem
                        ? " bullet-label-last" : "") + "\">" + "<span class=\"bullet-label-inner\">"
                    + (formatter.format(this.labels[k], this.formatString || "")) + "</span></span>";
            }

            this.labelsMarkup = labelsMarkup;
        },

        _generateBulletSegments : function() {
            var segments = "",
                data = this.data || {};

            var range = this._getRange();
            if (data.values && data.values.length > 0) {
                var i = data.values.length - 1, curr;
                for (i; i >= 0; i--) {
                    curr = data.values[i];
                    if (curr && curr.floor !== null && curr.floor !== undefined && curr.ceiling !== null && curr.ceiling !== undefined) {
                        segments += "<div class=\"bullet-floor-benchmark bullet-floor-benchmark" + (i + 1)
                            + (curr.descr ? (" bullet-floor-benchmark-" + (curr.descr.toLowerCase().replace(/[^\w]/g, "-"))) : "")
                            + " " + (data.benchmarkClass || "") + "\"" + (curr.descr ? (" title=\"" + curr.descr + "\"") : "") + " style=\"left: "
                            + (this._applyBounds(curr.floor) / range) + "%; right: " + (100 - (this._applyBounds(curr.ceiling) / range)) + "%;"
                            + (curr.stroke || (this.benchmarkFills && this.benchmarkFills.length > 0) ? " background: " + (curr.stroke || this.benchmarkFills[i % this.benchmarkFills.length]) + ";" : "") + "\"></div>";
                    }
                }
            }
            else {
                this._calculatedFloor = data.floor !== null && data.floor !== undefined ? this._applyBounds(data.floor) / range : 0;

                // look for an individual floor/ceiling (and maintain support for floor2/ceiling2)
                var floor = this.animation ? 0 : this._calculatedFloor,
                    ceiling = data.ceiling !== null && data.ceiling !== undefined ? 100 - (this._applyBounds(data.ceiling) / range) : 100,
                    hasFloor2 = data.floor2 !== null && data.floor2 !== undefined,
                    floor2 = hasFloor2 ? this._applyBounds(data.floor2) / range : 0,
                    ceiling2 = hasFloor2 ? 100 - this._applyBounds(data.ceiling2) / range : 100;

                if (hasFloor2) {
                    // TODO floor2/ceiling2 is deprecated
                    segments += "<div class=\"bullet-floor-benchmark2\" style=\"left: " + floor2 + "%; right: " + ceiling2 + "%;\"></div>";
                }
                segments += "<div class=\"bullet-floor-benchmark" + (data.benchmarkClass ? " " + data.benchmarkClass : "") + "\"  "
                    + "style=\"left: " + floor + "%; right: " + ceiling + "%;" + (data.stroke ? " background: " + data.stroke + ";" : "") + "\"></div>";

            }
            this.bulletSegmentsMarkup = segments;
        },

        _generateActuals : function() {
            var bulletActual = "",
                data = this.data || {};
            if (data.actual !== null && data.actual !== undefined) {
                var i = 0, currentActual, range = this._getRange();
                var actualArray = $.isArray(data.actual) ? data.actual : [data.actual];
                var calculatedActualArray = [];
                for (i; i < actualArray.length; i++) {
                    currentActual = actualArray[i];
                    var calculatedActual = currentActual !== null && currentActual !== undefined ?
                        (this._applyBounds(currentActual) / range) || 0 : OFFSCREEN;
                    calculatedActualArray.push(calculatedActual);
                    calculatedActual = this.animation ? (calculatedActual === OFFSCREEN ? OFFSCREEN : 0) : calculatedActual;
                    bulletActual += "<div class=\"bullet-actual bullet-actual-" + (i+1) + "\" style=\"left: "+ calculatedActual + "%;\"></div>";
                }
                this._calculatedActual = calculatedActualArray;
            }

            this.bulletActualsMarkup = bulletActual;
        },

        _generateThresholds : function() {
            var threshold = "",
                data = this.data || {};
            if (data.threshold !== null && data.threshold !== undefined) {
                var i = 0, curr, currValue, range = this._getRange(),
                    thresholds = $.isArray(data.threshold) ? data.threshold : [data.threshold],
                    thresholdLabel = data.thresholdLabel || this.thresholdLabel;
                for (i; i < thresholds.length; i++) {
                    curr = thresholds[i];
                    if (curr !== null && curr !== undefined) {
                        currValue = this._applyBounds(curr) / range;
                        threshold += "<div class=\"bullet-threshold bullet-threshold-" + (i + 1) + "\" style=\"left: " + currValue + "%;\"></div>";
                        if (thresholdLabel) {
                            threshold += "<div class=\"bullet-threshold-label\" style=\"left: " + currValue + "%;\">"
                            + (thresholdLabel === true ? formatter.format(curr, this.formatString || "") : thresholdLabel) + "</div>";
                        }
                    }
                }
            }
            this.thresholdsMarkup = threshold;
        },

        _generateTickMarks : function() {
            var tickMarks = "",
                leftRight = "left",
                xPos,
                lastItem = false,
                isArray = Array.isArray(this.tickMarks);

            if (isArray) {
                var k,
                    tickLength = this.tickMarks.length;
                for (k = 0; k < tickLength; k++) {

                    if (k === tickLength - 1) {
                        leftRight = "right";
                        lastItem = true;
                        xPos = 0;
                    }

                    else {
                        xPos = k / tickLength * 100;
                    }

                    tickMarks += "<span style=\"" + leftRight + ": " + xPos + "%;\" class=\"bullet-tick" + (lastItem
                            ? " bullet-tick-last" : "") + "\">" + "<span class=\"bullet-tick-inner\">"
                        + (formatter.format(this.tickMarks[k], this.formatString || "")) + "</span></span>";
                }
            }

            else if (this.tickMarks && (isArray || String(this.tickMarks).toLowerCase() === "true")) {
                // ensure we never have more than MAX_STEPS
                var i = Number(this.min), stepNum = 0, range = this.max - this.min,
                    steps = this.numSteps > 0 ? (this.numSteps - 1) : Math.min((range / this.step), MAX_STEPS),
                    step = this._truncate(range / steps, 10);

                for (stepNum; stepNum <= steps; stepNum++) {
                    if (i > this.max || stepNum === steps) {
                        i = this.max;
                        leftRight = "right";
                        lastItem = true;
                        xPos = 0;
                    }
                    else {
                        xPos = stepNum / steps * 100;
                    }

                    tickMarks += "<span style=\"" + leftRight + ": " + xPos + "%;\" class=\"bullet-tick" + (lastItem
                        ? " bullet-tick-last" : "") + "\">" + "<span class=\"bullet-tick-inner\">"
                    + (formatter.format(isArray ? this.tickMarks[stepNum] : i, this.formatString || "")) + "</span></span>";

                    i += step;
                }
            }
            this.tickMarkup = tickMarks;
        },

        _applyBounds : function(val) {
            return (Math.max(Math.min(val, this.max), this.min) - this.min) * 100;
        },

        _truncate : function(num, places) {
            var val = (num * Math.pow(10, places)),
                truncatedVal = val < 0 ? Math.ceil(val) : Math.floor(val);
            return truncatedVal / Math.pow(10, places);
        }

    });
});