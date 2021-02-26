define([
    "jquery",
    "common-ui/widgets/grid/_MetadataDrivenGrid",
    "text!common-ui/widgets/grid/templates/ChartGrid.html"
], function($, _MetadataDrivenGrid, template) {

    "use strict";

    var defaultChartProps = {
        tooltips : false,
        heightRatio : null,
        pointDotRadius : 3,
        height : 150,
        minHeight: 100,
        legendWidth : 125
    };

    return _MetadataDrivenGrid.extend({

        // ChartTable
        //      a chart table view ideal for rendering a list or grid of charts
        //
        //      options
        //          columns: Object
        //              descriptions for each column and the type of data/widget used to render them
        //          data: Array
        //              the data for each column

        template : template,

        baseClass : "chart-grid-container shady-container",

        rowClass : "chart-grid-row",

        cellClass : "chart-grid-row-cell",

        containerNeedsResize : true,

        chartRowOffsetAnimationDelayMultiplier : 50,
        
        flexbox: true,

        defaultWidgetPropMap : {
            "D3MeasureTrendChart" : {chartOptions : defaultChartProps},
            "DonutChart" : defaultChartProps,
            "D3BarChart" : defaultChartProps,
            "D3LineChart" : defaultChartProps,
            "MeasureTrendChart" : {chartOptions : defaultChartProps},
            "BarChart" : defaultChartProps,
            "LineChart" : defaultChartProps
        },

        init : function() {
            if (this.title) {
                this.setTitle(this.title);
            }
            this._super.apply(this, arguments);
        },

        generateRowDom : function(rowData, rowIdx) {
            var attrs = {"data-idx" : rowIdx, "tabindex" : 0, "role" : "button", "aria-pressed" : false};
            if (this.valueProp && rowData && rowData[this.valueProp] !== null && rowData[this.valueProp] !== undefined) {
                attrs["data-" + this.valueProp] = rowData[this.valueProp];
            }
            return $("<div/>")
                .addClass(this.rowClass + " " + (rowData ? rowData.rowClass || "" : "") + " " + this.rowClass + "-"
                    + (rowIdx % 2 === 0 ? "even" : "odd"))
                .attr(attrs);
        },

        setTitle : function(title) {
            this.title = title;
            if (!this.overview) {
                this.overview = {title : title};
            }
            else if (this.overview && !this.overview.title) {
                this.overview.title = title;
            }
        },

        generateCellDom : function(cellData, cellIdx, colSpan, column) {
            return $("<div/>").addClass("column-" + column + " " + this.cellClass);
        },

        _getDefaultColumnWidgetProps : function(widgetType, cellIdx, rowOffset) {
            var defaults = this._super.apply(this, arguments);
            // when we are working with a chart, add in an animation delay
            if (defaults && defaults.chartOptions) {
                defaults.chartOptions.animationDelay = rowOffset * this.chartRowOffsetAnimationDelayMultiplier;
            }

            return defaults;
        },

        _appendMessageRow : function(rowClass, message, node, noData) {
            var messageRow = this._super.apply(this, arguments);
            if (noData) {
                messageRow.addClass("card");
            }
            return messageRow;
        },

        _setCellRawValue : function(cell, column, cellValue) {
            if (cell) {
                if (column && (column.tileHeader || (this.tileHeaders && !column.columnClass))) {
                    var header = $("<span/>")
                            .addClass("column-tile-header")
                            .text(column.tileHeader === true || (!column.tileHeader && this.tileHeaders)
                                ? (column.name || "") : column.tileHeader),
                        val = $("<span/>")
                            .addClass("column-tile-value" + (column.columnClass ? " " + column.columnClass : ""))
                            .text(cellValue);
                    cell.empty().append(header).append(val);
                }
                else {
                    this._super.apply(this, arguments);
                }
            }
        }

    });
});