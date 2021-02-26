define([
    "common-ui/widgets/_TemplatedWidget",
    "common-ui/widgets/utils/templateUtil",
    "text!common-ui/widgets/charting/templates/LegendItem.html"
], function(_TemplatedWidget, templateUtil, templateLegendItem) {

    "use strict";

    return _TemplatedWidget.extend({

        // Legend
        //  a legend used for charts
        //      options
        //          data: Array
        //              an array of legend item data, each containing the following props:
        //                  strokeColor: String
        //                      a hex or rgb/rgba color
        //                  value: String
        //                      the formatted value to be shown
        //                  label: String
        //                      the label to be shown

        strokeColors : [],

        getTemplate : function() {
            if (this.data && this.data.length > 0) {
                var template = "", i = 0, curr;
                for (i; i < this.data.length; i++) {
                    curr = this.data[i];
                    if (curr) {
                        if (!curr.strokeColor) {
                            curr.strokeColor = this.getStrokeColor(curr, i);
                        }
                        if (!curr.strokeClass) {
                            curr.strokeClass = "";
                        }
                        curr.highlightClass = curr.highlight ? " legend-item-highlight" : "";
                        template += templateUtil.replaceTemplatePlaceholders(templateLegendItem, curr, false, true);
                    }
                }
                return template;
            }
            return "";
        },

        getTemplateData : function() {
            // overriding to return false since we are injecting everything via getTemplate
            return false;
        },

        getStrokeColor : function(legendItem, index) {
            if (this.strokeColors && this.strokeColors.length > 0) {
                while (index >= this.strokeColors.length) {
                    index -= this.strokeColors.length;
                }
                index = Math.max(0, index);
                return this.strokeColors[index];
            }
            return "inherit";
        }

    });
});