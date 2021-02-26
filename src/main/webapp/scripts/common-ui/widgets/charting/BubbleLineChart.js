define([
    "jquery",
    "common-ui/widgets/_TemplatedWidget",
    "text!common-ui/widgets/charting/templates/BubbleLineChart.html"
], function($, _TemplatedWidget, template) {

    "use strict";

    return _TemplatedWidget.extend({

        // BubbleLineChart
        //      a single horizontal line with a bubble of a variable radius plotted at some point along it
        //
        //      options
        //          data: Number
        //              the percent width (i.e. 100% is 1, 90% is 0.9)

        template : template,

        min : 1,
        max : 10,
        maxBubbleDiameterPixels : 35,
        minBubbleDiameterPixels : 7,

        defaultFillColor : "#000",
        defaultStrokeColor : "#eee",
        animation : true,
        animationDelay : 100,
        animationDuration : 500,

        ranges : [
            {min : 1, max : 5, fillColor : "#65d3ee", strokeColor : "#eee"},
            {min : 5, max : 6.5, fillColor : "#fd9227", strokeColor : "#eee"},
            {min : 6.5, max : 10, fillColor : "#fc4a47", strokeColor : "#eee"}
        ],

        onTemplateNodesAttached : function() {
            this._renderBubbleLine();
        },

        updateData : function(data) {
            this.data = data;
            this._renderBubbleLine();
        },

        _renderBubbleLine : function() {
            if (this.attachPoints && this.attachPoints.bubbles) {
                var dom = "",
                    dataPoints = this.data && this.data.dataPoints ? this.data.dataPoints :
                        ((this.data && (this.data.x !== undefined || this.data.x !== null)) ? [this.data] : null);

                var i, curr, delta = this.max - this.min;
                if (this.ranges && this.ranges.length > 0) {
                    var min, max;
                    for (i = 0; i < this.ranges.length; i++) {
                        curr = this.ranges[i];
                        if (curr) {
                            min = Math.round((Math.max(this.min, curr.min) - this.min) / delta * 100);
                            max = Math.round((Math.min(this.max, curr.max) - this.min) / delta * 100);
                            dom += "<div class=\"bubble-line-range-header\" style=\"left: " + min + "%; right: "
                                + Number(100 - max) + "%; background-color: " + (curr.fillColor || this.defaultFillColor) + ";\"></div>";
                            if (curr.max < this.max) {
                                dom += "<div class=\"bubble-line-range-separator\" style=\"left: " + max + "%;\"></div>";
                            }
                        }
                    }
                }

                if (dataPoints && dataPoints.length > 0) {
                    var size, range, val;
                    for (i = 0; i < dataPoints.length; i++) {
                        curr = dataPoints[i];
                        if (curr) {
                            if (curr.y === undefined || curr.y === null || isNaN(curr.y)) {
                                curr.y = 0;
                            }
                            val = Math.min(Math.max(this.min, Number(curr.x)), this.max);
                            range = this._getRange(val);
                            size = Math.max(Math.round(Math.abs(curr.y) * this.maxBubbleDiameterPixels), this.minBubbleDiameterPixels);
                            dom += "<div class=\"bubble-line-bubble\" " + (this.animation ? "data-size=\"" + size + "\" " : "")
                                + "style=\"position: absolute; left: " + Math.round(((val - this.min) / delta) * 100)
                                + "%; height: " + Number(this.animation ? 1 : size) + "px; width: "
                                + Number(this.animation ? 1 : size) + "px; margin-left: -" + Math.floor(size / 2) + "px; background-color: "
                                + (range.fillColor || this.defaultFillColor) + "; border-color: "
                                + (range.strokeColor || this.defaultStrokeColor) + ";\"></div>";
                        }
                    }
                }
                this.attachPoints.bubbles.empty().append(dom);
                if (this.animation) {
                    this._animateBubbles();
                }
            }
        },

        _getRange : function(xValue) {
            var ranges = this.ranges.filter(function(val, idx) {
                return (val && xValue >= val.min && (idx === this.ranges.length - 1 || xValue < val.max));
            }, this);
            return (ranges && ranges.length === 1) ? ranges[0] : {};
        },

        _animateBubbles : function() {
            var bubbles = this.attachPoints.bubbles.find(".bubble-line-bubble");
            if (bubbles) {
                bubbles.each(function(idx) {
                    setTimeout(function() {
                        var bubble = $(this),
                            size = bubble.data("size");
                        bubble.animate({
                            height : size,
                            width : size
                        }, this.animationDuration);
                    }.bind(this), this.animationDelay * idx);
                });
            }
        }

    });
});