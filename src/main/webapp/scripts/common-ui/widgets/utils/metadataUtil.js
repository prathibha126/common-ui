define([
    "jquery",
    "exports",
    "widgetIndex",
    "common-ui/widgets/_TemplatedWidget"
], function($, exports, widgetIndex, _TemplatedWidget) {

    "use strict";

    var widgetConstructors = widgetIndex || {};

    exports.setCustomWidgetConstructors = function(cwc) {
        var key;
        for (key in cwc) {
            if (key && cwc[key]) {
                // strings will be converted into a basic templated widget
                if (typeof cwc[key] === "string") {
                    widgetConstructors[key] = _TemplatedWidget.extend({template : cwc[key], templateRequiresData : true});
                }
                else {
                    widgetConstructors[key] = cwc[key];
                }
            }
        }
    };

    exports.getWidgetConstructorByName  = function(widgetName) {
        if (widgetName) {
            if (widgetConstructors[widgetName]) {
                return widgetConstructors[widgetName];
            }
            else if (window.console && typeof window.console.error === "function") {
                console.error("ERROR: unable to location implementation for " + widgetName + "! Ensure it is imported in the widgetIndex.");
            }
        }
    };
});