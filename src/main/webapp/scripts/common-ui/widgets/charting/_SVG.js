define([
    "jquery",
    "d3",
    "common-ui/widgets/_TemplatedWidget",
    "common-ui/widgets/utils/formatter"
], function ($, d3, _TemplatedWidget, formatterjs) {

    "use strict";
    
    return _TemplatedWidget.extend({

        baseClass: "",
        height: null, /* height is calculated as a factor of width unless specified */
        marginTop:  null,
        marginLeft: null,
        marginBottom: null,
        marginRight: null,
        minWidth: 200,
        minHeight: 150,
        printMinHeight : 150,
        maxHeight : 400,
        xAxisPrintPadding : 15,
        showLegend: false,
        legendPosition: "",
        animationDuration : 500,
        animationDelay : 0,
        animation : true,

        // mobileBreakpoint: Number
        //      the max width for "mobile" mode in which the legend is hidden
        mobileBreakpoint : 543,
        
        createSVG: function (id) {
            this.margin = this.getMargin();
            this.width = this.getWidth(this.margin, id);
            this.height = this.getHeight(this.margin, id);

            var printPadding = window.Modernizr.printlayout ? this.xAxisPrintPadding : 0;
            this.svg = d3.select(id[0]).select("svg")
                .attr("height", this.height + printPadding)
                .attr("width", this.width)
                .style('position', 'relative')
                .append('g')
                .attr("height", this.height + printPadding)
                .attr("width", this.width);
        },

        getWidth: function (margin, id) {
            var w = this.domNode ? this.domNode.width() : 0;

            // in print layout mode, make sure the chart never tries to be larger than the width of the container - 20px padding
            if (window.Modernizr.printlayout) {
                w = Math.min(w, window.Modernizr["printlayout-landscape"] ? 1080 : 780);
            }

            w = ( (w - margin.left - margin.right - 20) < 0 ) ? margin.left + margin.right + 20 : w;

            // check to ensure we are beyond the mobile breakpoint and the legend is visible (not valid for print)
            if (this.showLegend && this.legendPosition !== "bottom" && (window.Modernizr.printlayout || !window.Modernizr.mq("(max-width: " + this.mobileBreakpoint + "px)"))) {
                w -= (this.legendWidth + 5);
            }
            return Math.max(w, this.minWidth);
        },

        getHeight: function (margin, id) {
            var h = 0;

            if (this.heightRatio) {
                h = (this.width * this.heightRatio) || this.height;
            }

            else {
                h = this.height || (id.width() / 1.5 - 70);
            }

            h = ( h - margin.top - margin.bottom - 20 < 0 ) ?
            margin.top + margin.bottom + 20 : h;

            return Math.min(this.maxHeight, Math.max(h, window.Modernizr.printlayout ? this.printMinHeight : this.minHeight));
        },

        setMargin: function () {
            var left = this.showYAxisLabels ? this.marginLeft + this.yLabelMargin : this.marginLeft,
                right = this.showYAxisLabels && this.chartYAxisLabels.length > 1 ? this.marginRight + this.yLabelMargin : this.marginRight;

            return {left: left, right: right};
        },

        getMargin: function () {
            var margin = this.setMargin();

            return {top: this.marginTop || 0, left: margin.left || 0, bottom: this.marginBottom || 0, right: margin.right || 0};
        },

        getChartHeight : function() {
            return this.height - this.margin.top - this.margin.bottom - this.heightOfLabel;
        },

        getChartWidth : function() {
            return this.width - this.margin.left - this.margin.right;
        },

        getAnimationDuration : function() {
            // don't animate in print mode
            return window.Modernizr.printlayout || !this.animation ? 0 : this.animationDuration;
        },

        getAnimationDelay : function() {
            return  window.Modernizr.printlayout ? 0 : this.animationDelay;
        },

        getTemplateData : function() {
            return {
                baseClass : this.baseClass
            };
        }
    });
});