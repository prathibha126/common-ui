define([
    "common-ui/widgets/_Widget",
    "common-ui/widgets/utils/formatter",
    "common-ui/widgets/utils/colorUtil"
], function(_Widget, formatter, colorUtil) {

    "use strict";

    return _Widget.extend({

        // SparkBarChart
        //      a spark bar chart for use in grid cells
        //
        //      options
        //          data: Number
        //              the percent width (i.e. 100% is 1, 90% is 0.9)

        seriesStrokes: ["#6ccef6", "#ffb819", "#bd10e0", "#ffd930", "#bada55", "#6e991e", "#50e3c2", "#0091b3",  "#005c72", "#C0C0C0", "#666666"],

        baseClass: "",

        barColor: "#6ccef6",

        valueBasedStrokes : null,

        formatString : "0.00%",

        includeTextValue : false,

        displayOriginalValue : false,

        target : null,

        noValuePlaceholder : "",

        stackedBars : false,

        init : function(params) {
            this._super.apply(this, arguments);
            if (this.valueBasedStrokes) {
                this._valueStrokeColors =
                    colorUtil.generateColors(this.seriesStrokes, this.valueBasedStrokes > 1 ? this.valueBasedStrokes : 5, true);
            }
            this.updateData(params ? params.data : null);
        },

        updateData : function(data) {
            this.data = data;
            var template = "",
                textValues = "",
                hasData = this.data !== undefined && this.data !== null && (!this.data.hasOwnProperty("value") ||
                    (this.data.hasOwnProperty("value") && this.data.value !== null && this.data.value !== undefined));

            if (hasData) {
                var vals;

                if (this.data && this.data.barColor) {
                    this.barColor = this.data.barColor;
                }

                if (!isNaN(this.data)) {
                    vals = [{value : Number(this.data)}];
                }
                else if (this.data.value !== undefined && this.data.value !== null) {
                    vals = [this.data];
                }
                else if (Array.isArray(this.data) && this.data.length > 0) {
                    vals = this.data.map(function(item) {
                        if (item && item.value !== undefined && item.value !== null) {
                            return item;
                        }
                        return {value : Number(item)};
                    });
                }

                if (vals && vals.length > 0) {
                    var i = 0, curr, val;
                    for (i; i < vals.length; i++) {
                        curr = vals[i];
                        if (curr) {
                            val = curr.possibleValue ? curr.value / curr.possibleValue : curr.value;
                            template += this._getBarTemplate(curr.statusId, val, i, vals.length);
                            if (this.includeTextValue) {
                                textValues += (textValues ? ", " : "") + formatter.format(this.displayOriginalValue ? curr.value : val, this.formatString);
                            }
                        }
                    }
                }
                template = "<div class=\"spark-bar-outer " + this.baseClass + "\" data-attach-point='bars'>" + template + "</div>";
                if (this.includeTextValue) {
                    template = "<div class='spark-bar-container " + this.baseClass + "'><div class='spark-bar-values'>" + textValues + "</div>" + template + "</div>";
                }
            }
            else {
                template = "<div>" + this.noValuePlaceholder + "</div>";
            }
            this.html = template;
            this.place();
        },

        _getBarTemplate : function(statusId, val, idx, count) {
            var factor = this.displayOriginalValue ?  100 : (this.formatString && this.formatString.indexOf("%") >= 0 ? 100 : 1);
            return "<div class=\"spark-bar measure-status-background measure-status-"
                + (statusId !== null && statusId !== undefined ? statusId : "") + (this.stackedBars ? " stacked-bars" : "") + "\" style=\""
                + (this.valueBasedStrokes || count > 1 ? ("background-color: " + this._getStrokeColor(val, idx) + "; ")
                    : (this.barColor ? ("background-color: " + this.barColor + "; ") : ""))
                + "width: " + ((Number(val) * factor) || 0) + "%\"></div>"
                + (this.target !== null && this.target !== undefined ?
                    "<div class='spark-bar-target' style='left: " + (Number(this.target) * factor) + "%;'></div>" : "");
        },


        _getStrokeColor : function(val, idx) {
            if (this._valueStrokeColors && this._valueStrokeColors.length > 0) {
                var max = this.formatString && this.formatString.indexOf("%") >= 0 ? 1 : 100;
                return colorUtil.getValueColor(this._valueStrokeColors, Number(val), 0, max);
            }
            var stroke = this.seriesStrokes[idx % this.seriesStrokes.length];
            return stroke;
        }

    });
});