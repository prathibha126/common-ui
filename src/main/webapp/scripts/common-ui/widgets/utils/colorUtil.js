define([
    "chroma"
], function(chroma) {

    "use strict";

    var generatedColorMap = {};

    /**
     * note this is an optional library that should be required dynamically to prevent the chroma library from being loaded if not needed
     */

    return {

        getValueColor : function(colors, value, minValue, maxValue) {
            var valueStep = colors.length > 0 ? (maxValue - minValue) / (colors.length) : 0,
                valIdx = valueStep > 0 ? Math.floor((value - minValue) / valueStep) : 0;
            return colors[Math.min(colors.length - 1, Math.max(0, valIdx))];
        },

        generateColors : function (colorStops, count, reverseColors) {
            var hash = String(colorStops) + "." + count + "." + reverseColors;
            if (generatedColorMap[hash]) {
                return generatedColorMap[hash];
            }
            var i = 0, steps = [], step = colorStops.length > 0 ? 1 / (colorStops.length) : 0;
            for (i; i < 1; i+= step) {
                steps.push(i);
            }
            // make sure the last step is 1
            if (steps[steps.length - 1] !== 1) {
                steps[steps.length - 1] = 1;
            }
            var colors = chroma.scale(colorStops).domain(steps)
                .mode("lab").correctLightness()
                .colors(count);

            if (reverseColors) {
                colors.reverse();
            }
            generatedColorMap[hash] = colors;

            return colors;
        },

        COLORS: {
            white: "FFF",
            mobius1: "612141",
            mobius2: "64A70B",
            mobius3: "407EC9",
            typography: "3F4444",
            secondary1: "FF9E1B",
            secondary2: "CB333B",
            secondary3: "00B2A9",
            secondary4: "009FDF"
        }
    };
});