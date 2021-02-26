/**
 * Created by atack on 8/19/16.
 */
define([
    "common-ui/widgets/charting/D3LineChart"
], function (D3LineChart) {

    "use strict";

    return D3LineChart.extend({

        chartType: "Area"
    });
});
