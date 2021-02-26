define([
    "jquery",
    "common-ui/widgets/container/ToggleBarContainer",
    "common-ui/widgets/grid/GridTable",
    "common-ui/widgets/grid/ChartGrid",
    "common-ui/widgets/charting/D3BarChart",
    "common-ui/widgets/charting/D3ScatterPlot",
    "common-ui/widgets/charting/D3BubbleChart"
], function($, ToggleBarContainer, GridTable, ChartGrid, BarChart, ScatterPlot, BubbleChart) {
    
    "use strict";

    var chartConstructors = {
        BarChart: BarChart,
        ScatterPlot : ScatterPlot,
        BubbleChart : BubbleChart
    };

    return ToggleBarContainer.extend({


        gridProperties : null,
        chartProperties : null,
        tileProperties : null,
        sharedProperties : null,

        tileIndex : -1, // -1 implies not included
        gridIndex : 1,
        chartIndex : 2,

        chartType : "Bar",

        pipeControlEvents : false,

        onInit : function() {
            var opts = [this.tileIndex, this.gridIndex, this.chartIndex].sort();
            var i = 0, idx;
            for (i; i < opts.length; i++) {
                idx = opts[i];
                if (idx !== null && idx >= 0) {
                    if (idx === this.tileIndex) {
                        this._addTile();
                    }
                    else if (idx === this.gridIndex) {
                        this._addGrid();
                    }
                    else if (idx === this.chartIndex) {
                        this._addChart();
                    }
                }
            }
        },

        onViewShown : function() {
            var selectedWidget = this.getSelectedWidget();
            if (selectedWidget && selectedWidget.onViewShown) {
                selectedWidget.onViewShown();
            }
            this._super.apply(this, arguments);
        },

        updateData : function(data) {
            this._combinedData = data;
            if (data && data.overview && data.overview.title) {
                this.setTitle(data.overview.title);
                delete data.overview;
            }
            this._super.apply(this, arguments);
        },

        getData : function() {
            return this._combinedData;
        },

        getViewContainer : function(key) {
            var vc = this._super.apply(this, arguments);
            if (key) {
                var widgetContainer = $("<div class='fireball-widget " + key + "'></div>");
                vc.append(widgetContainer);
                return widgetContainer;
            }
            else {
                return vc;
            }
        },

        dispatchEvent : function(evt, data, userInitiated) {
            if (evt === "change") {
                this._lastChangeData = data;
            }
            this._super.apply(this, arguments);
        },

        getSelectedItem : function() {
            return this._lastChangeData;
        },

        _addTile : function() {
            var key = this._key + "Tile",
                tileProps = $.extend(true, {
                    _key : key,
                    append : true,
                    containerIconType : "tile",
                    rowInnerClass : "tile",
                    tileHeaders : true,
                    additionalBaseClass : "x3",
                    widgetContainer : this._key
                }, this.sharedProperties, this.tileProperties);
            this.addWidget(new ChartGrid(tileProps, this.getViewContainer(key)), true, true);
        },

        _addGrid : function() {
            var key = this._key + "Grid",
                gridProps = $.extend(true, {
                    _key : key,
                    append : true,
                    containerIconType : "list",
                    widgetContainer : this._key
                }, this.sharedProperties, this.gridProperties);
            this.addWidget(new GridTable(gridProps, this.getViewContainer(key)), true, true);
        },

        _addChart : function() {
            var key = this._key + "Chart",
                chartProps = $.extend(true, {
                    _key : key,
                    append : true,
                    containerIconType : "chart",
                    gridData : true,
                    widgetContainer : this._key
                }, this.sharedProperties, this.chartProperties);
            var ChartConstructor = chartConstructors[this.chartType] || BarChart;
            if (ChartConstructor) {
                this.addWidget(new ChartConstructor(chartProps, this.getViewContainer(key)), true, true);
            }
        }

    });
});