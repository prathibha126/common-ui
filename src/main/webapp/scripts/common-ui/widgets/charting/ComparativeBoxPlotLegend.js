define([
    "common-ui/widgets/_TemplatedWidget",
    "text!common-ui/widgets/charting/templates/ComparativeBoxPlotLegend.html"
], function(_TemplatedWidget, template) {

    "use strict";

    return _TemplatedWidget.extend({

        // ComparativeBoxPlot
        //      a static legend for a ComparativeBoxPlot

        template : template

    });
});