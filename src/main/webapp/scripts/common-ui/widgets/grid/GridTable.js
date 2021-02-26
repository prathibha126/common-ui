define([
    "jquery",
    "common-ui/widgets/grid/_MetadataDrivenGrid",
    "common-ui/widgets/Button",
    "common-ui/widgets/Tooltip",
    "text!common-ui/widgets/grid/templates/GridTable.html",
    "common-ui/widgets/utils/templateUtil",
    "common-ui/widgets/utils/stringUtil",
    "common-ui/widgets/utils/accessibilityUtil"
], function($, _MetadataDrivenGrid, Button, Tooltip, template, templateUtil, stringUtil, accessibilityUtil) {

    "use strict";

    return _MetadataDrivenGrid.extend({

        // GridTable
        //      a grid table view ideal for smaller data sets with custom widget renderers per column
        //
        //      options
        //          columns: Object
        //              descriptions for each column and the type of data/widget used to render them
        //          data: Array
        //              the data for each column

        template : template,

        // defaultColumnMinWidth: Number
        //      the default column min width; used for responsive behavior
        defaultColumnMinWidth : 50,

        // columnPadding: Number
        //      the amount of horizontal padding between columns; used for responsive behavior
        columnPadding : 10,

        responsive : false,

        baseClass : "grid-table-container",

        // TODO     border-bottom: 5px solid #00c5ff;
        lastRowClass : "last-row",

        // if including multiple dynamic grids with unknown numbers of columns in a pdf, force landscape
        pdfLayoutLandscapeAll : true,

        headers : true,

        // columnNameMaxLength: Number
        //      the max length of a column name in characters before the column name is truncated and an ellipsis is added.
        //      the full name will be shown in a tooltip
        columnNameMaxLength : 100,

        // freezeHeader: Boolean
        //      set to true if you want the headers to stick at the top when scrolling
        freezeHeader : false,

        attachPointLoaded : "gridContainer",

        // responsiveIndexProp: String
        //      the name of the index property to use for determining responsive index
        responsiveIndexProp : "responsiveIndex",

        // responsiveMinColumnCount: Number
        //      the minimum number of columns to be shown in responsive views
        responsiveMinColumnCount : 1,

        // restrictOneRowExpand: Boolean
        //      set to true if you want an expanded row to collapse when another row is expanded
        restrictOneRowExpand : false,

        init : function(opts) {
            // disable freeze header option in unsupported browsers (IE 9 - 11)
            if ((opts && String(opts.freezeHeader).toLowerCase() === "true") &&
                (/MSIE 10/i.test(navigator.userAgent) || /MSIE 9/i.test(navigator.userAgent) ||
                    /rv:11.0/i.test(navigator.userAgent))) {
                opts.freezeHeader = false;
            }
            this._super.apply(this, arguments);
        },

        onInit : function() {
            this._super.apply(this, arguments);
            if (this.columns && this.responsive) {
                this._generateResponsiveColumnList();
            }
            // TODO TODO this handler is not removed when the object is destroyed! this prob happens in other places too!
            if (!this.isIE() && this.responsive) {
                this.connect(window, "resize.grid", this._handleResize.bind(this));
            }
        },

        onTemplateNodesAttached : function(nodes) {
            if (!this.headers && nodes) {
                delete nodes.header;
            }
            this._super.apply(this, arguments);
            if (this.exportable && nodes && nodes.gridTitle) {
                var exportButtonNode = $("<div/>")
                        .addClass('grid-table-export-button'),
                    exportBtn = new Button({
                        baseClass : "export",
                        title : "Export to Excel"
                    }, exportButtonNode);
                exportBtn.on("click", this._handleClickExport.bind(this));
                nodes.gridTitle.after(exportButtonNode);
            }
            if (this.footer && nodes.gridContainerOuter) {
                var footerNode = $("<div class='grid-table-footer'></div>");
                nodes.gridContainerOuter.after(footerNode);
                this.connect(footerNode, "click.gridFooter", this._handleClickFooter.bind(this));
            }
        },

        _handleClickFooter : function() {
            if (this.domNode) {
                this.domNode.toggleClass("grid-footer-toggled");
            }
            this.dispatchEvent("footerClick", null, true);
        },

        setColumns : function(columns) {
            if (this._cachedColumnNameUpdateList && columns) {
                var col;
                for (col in this._cachedColumnNameUpdateList) {
                    if (col && this._cachedColumnNameUpdateList && columns[col]) {
                        columns[col].name = this._cachedColumnNameUpdateList[col];
                        // TODO should these be removed once used or used each time the cols are set?
                        delete this._cachedColumnNameUpdateList[col];
                    }
                }
            }

            if (columns && (this.hasExpandingRows || this.allRowsExpandable)) {
                columns[this.expandColumnName] = {
                    index: this.expandColumnIndex,
                    name: "",
                    columnFormat:{
                        minWidth: "20px"
                    },
                    widget: {
                        widgetProperties: {
                            captureClick : !this.expandOnRowClick,
                            buttonClass: "grid-expand-button",
                            iconClass: "glyphicon glyphicon-menu-right",
                            ariaLabel : "Click to expand"
                        },
                        widgetType: "GridButton"
                    }
                };
            }

            this._super.apply(this, arguments);
            // each time the columns are updated, we need to update the responsive column list
            if (this.columns && this.responsive) {
                this._generateResponsiveColumnList();
            }
        },

        setColumnName : function(column, name) {
            if (column && this.columns && this.columns[column]) {
                this.columns[column].name = name;
                if (this.attachPoints && this.attachPoints.header) {
                    this.attachPoints.header.find(".grid-cell[data-col-key='" + column + "']").text(name);
                }
            }
            else {
                if (!this._cachedColumnNameUpdateList) {
                    this._cachedColumnNameUpdateList = {};
                }
                this._cachedColumnNameUpdateList[column] = name;
            }
        },

        getColumnCount : function() {
            var cols = this.getColumnList();
            return cols ? cols.length || 0 : 0;
        },

        _handleClickExport : function() {
            this.dispatchEvent("excelExport");
        },

        updateData : function(data, selectedValue, append, isError) {
            var rows = data && data.data ? data.data : data;
            // intercept to remove the last row class until we actually hit the last row
            if (this.data && append && rows && rows.length > 0 && this.domNode) {
                this.domNode.find("." + this.rowClass).removeClass(this.lastRowClass);
            }
            this._super.apply(this, arguments);
        },

        _generateResponsiveColumnList : function() {
            this._responsiveColumnList = templateUtil.getSortedWidgetArray(this.columns, this.responsiveIndexProp);
        },

        onGridDataRendered : function() {
            this._handleResize();
        },

        _handleResize : function() {
            var windowWidth = $(window).width();
            // NOTE IE8 triggers a resize event when anything resizes, not just the window. ensure the width actually changed!
            if (this.domNode && (!this._lastWidth || windowWidth !== this._lastWidth ||
                this._responsiveColumnList !== this._lastResponsiveColumnList) && !this.isIE() && this.responsive) {
                this._lastResponsiveColumnList = this._responsiveColumnList;
                this._lastWidth = windowWidth;
                delete this._firstHiddenResponsiveColumnIndex;

                var width = this.domNode.width();
                if (this._responsiveColumnList && width) {
                    var i = 0, col, minWidth, totalWidth = 100; // TODO why do we need this off by 100px?
                    this.domNode.find("." + this.cellClass).show();

                    for (i; i < this._responsiveColumnList.length; i++) {
                        col = this._responsiveColumnList[i];
                        if (col) {
                            minWidth = col.columnFormat && col.columnFormat.minWidth ? col.columnFormat.minWidth : this.defaultColumnMinWidth;
                            if (minWidth) {
                                if (String(minWidth).indexOf("px") > 0) {
                                    minWidth = minWidth.replace("px", "");
                                }
                                else if (String(minWidth).indexOf("%") > 0) {
                                    minWidth = Math.floor(Number(minWidth) / 100 * width);
                                }
                            }
                            totalWidth += Number(minWidth) + (this.columnPadding || 0);
                            // tables aren't good without at least x columns; always leave at least that many
                            if (totalWidth > width && i > this.responsiveMinColumnCount - 1) {
                                $("." + this.cellClass + ".colidx-" + col._idx).hide();
                                if (this._firstHiddenResponsiveColumnIndex === undefined) {
                                    this._firstHiddenResponsiveColumnIndex = !isNaN(col[this.responsiveIndexProp]) ?
                                        Number(col[this.responsiveIndexProp]) : null;
                                }
                            }
                        }
                    }
                }
            }
        },

        generateHeaderDom : function(col, colIdx) {
            if (col) {
                if (Number(col.colspan) === 0 || col.showInHeader === false || col.childRowOnly === true) {
                    return "";
                }
                var colFormatCss = this._getColumnFormatCss(col.columnFormat);
                if (!colIdx) {
                    // assume default sort is by first column
                    this.defaultSortColumnIndex = col.index;
                }
                var name = col.name || "",
                    subTitle = col.subTitle || null,
                    subHeaderDiv = null,
                    ttcol = "";

                if (name) {
                    // NOTE since we are decoding the name for TEXT-ONLY display, ensure it is only set on elements using .text()
                    name = templateUtil.htmlDecode(name, "text");
                }

                // determine if the name exceeds the max length and if so truncate it and add a class to this cell
                if (this.columnNameMaxLength && name.length > this.columnNameMaxLength) {
                    if (!this._columnTooltipNameMap) {
                        this._columnTooltipNameMap = {};
                    }
                    // since the name var is only safe for .text() usage, refer back to the original un-decoded col name here:
                    this._columnTooltipNameMap[col._key] = col.name;
                    name = name.substring(0, this.columnNameMaxLength - 1) + "...";
                    ttcol = "col-name-tt ";
                }
                var sortable = (col.sortable && String(col.sortable).toUpperCase() === "TRUE") || this.allColumnsSortable,
                    attrs = {
                        "data-display-priority": (col.displayPriority || "-1"),
                        "data-col-key": col._key
                    };
                if (sortable) {
                    attrs["tabindex"] = 0;
                    attrs["role"] = "button";
                    attrs["aria-pressed"] = false;
                }
                if (col.colspan > 1) {
                    attrs.colspan = Number(col.colspan);
                }

                var headerDom = $("<th/>")
                    .addClass(ttcol + (col.columnHeaderClass || "") + " " + this.cellClass + " no-select colidx-" + colIdx + " column-" + col._key
                        + (sortable ? " column-sortable" : "")
                        + (col.hideInMobile && String(col.hideInMobile).toUpperCase() === "TRUE" ? " hidden-small-down" : ""))
                    .attr(attrs)
                    .css(colFormatCss)
                    .text(name);

                if( !stringUtil.isValidString( name ) && col && col.index && col.index === -999 ) {
                    headerDom.html('<span class="d-n-s">Click below icon to expand</span>');
                }
                else if( !stringUtil.isValidString( name ) ) {
                    headerDom.html('<span class="d-n-s">No column title</span>');
                }

                if( subTitle !== null )
                {
                    if ( stringUtil.isValidString( name ) ) {
                        // NOTE since we are decoding the name for TEXT-ONLY display, ensure it is only set on elements using .text()
                        subHeaderDiv = $("<div/>").addClass("sub-header").text(templateUtil.htmlDecode(subTitle, "text"));
                        headerDom.append(subHeaderDiv);
                    }
                    else {
                        subHeaderDiv = $("<div/>").addClass("sub-header").text(templateUtil.htmlDecode(subTitle, "text"));
                        headerDom.html(subHeaderDiv);
                    }
                }

                return headerDom;
            }
            return "";
        },

        generateRowDom : function(rowData, rowIdx) {
            var attrs = {"data-idx" : rowIdx, "tabindex" : 0, "role" : "button", "aria-pressed" : false};
            if (this.valueProp && rowData && rowData[this.valueProp] !== null && rowData[this.valueProp] !== undefined) {
                attrs["data-" + this.valueProp.toLowerCase()] = rowData[this.valueProp];
            }
            return $("<tr/>")
                .addClass(this.rowClass + " " + this.rowClass + "-" + rowIdx + " "
                    + (rowData ? rowData.rowClass || "" : "") + " "
                    + (rowIdx === (this.data && this.data.length ? this.data.length - 1 : 0)
                        ? this.lastRowClass : ""))
                .attr(attrs);
        },

        generateCellDom : function(cellData, cellIdx, colSpan, colKey, showInHeader) {
            // see if this col has a row span applied tp it
            if (colKey && this._rowSpanColRenderMap && this._rowSpanColRenderMap[colKey] > 0) {
                this._rowSpanColRenderMap[colKey]--;
                if (this._rowSpanColRenderMap[colKey] <= 0) {
                    delete this._rowSpanColRenderMap[colKey];
                }
                else {
                    return null;
                }
            }
            var rowSpan, attrs = {};
            // keep track of cells with row span to prevent rendering subsequent cells in the same col and next row(s)
            if (colKey && cellData && Number(cellData.rowSpan) > 0) {
                rowSpan = cellData.rowSpan;
                if (!this._rowSpanColRenderMap) {
                    this._rowSpanColRenderMap = {};
                }
                this._rowSpanColRenderMap[colKey] = Number(rowSpan);
            }
            if (rowSpan > 0) {
                attrs.rowspan = Number(rowSpan);
            }
            if (colSpan === -1 || colSpan > 1) {
                attrs.colspan = colSpan === -1 ? 100 : Number(colSpan);
                if (showInHeader === false && (cellData === null || cellData === undefined)) {
                    return "";
                }
            }
            var col = this.columns ? this.columns[colKey] : null,
                cellDom = $("<td/>")
                    .addClass(this.cellClass + (cellData && cellData.cellClass ? " " + cellData.cellClass : "")
                        + (col && col.cellClass ? " " + col.cellClass : "")
                        + " column-" + colKey + " app-context-summary-simple colidx-" + cellIdx
                        + (col && col.hideInMobile && String(col.hideInMobile).toUpperCase() === "TRUE" ?
                            " hidden-small-down" : ""))
                    .attr(attrs)
                    .append("&nbsp;");
            if (colKey === this.expandColumnName) {
                cellDom.css("width", "20px");
            }
            else if (col && col.columnFormat) {
                cellDom.css(this._getColumnFormatCss(col.columnFormat));
            }
            if (this.responsive && col && this._firstHiddenResponsiveColumnIndex !== undefined &&
                this._firstHiddenResponsiveColumnIndex !== null) {
                var currColResponsiveIndex = !isNaN(col[this.responsiveIndexProp]) ? Number(col[this.responsiveIndexProp]) : null;
                if (currColResponsiveIndex !== null && currColResponsiveIndex >= this._firstHiddenResponsiveColumnIndex) {
                    cellDom.hide();
                }
            }
            return cellDom;
        },

        onHeaderRendered : function(headerNode) {
            if (!this.headers) {
                return;
            }
            if (this._sortClickHandle) {
                this.disconnect(this._sortClickHandle);
            }

            if (this._stickySortClickHandle) {
                this.disconnect(this._stickySortClickHandle);
            }

            if (this._stickyCheckboxClickHandle) {
                this.disconnect(this._stickyCheckboxClickHandle);
            }
            this._sortClickHandle = this.connect(headerNode.find("th.column-sortable"), "click.columnSort keypress.columnSort", this._handleColumnSort.bind(this));
            if (this._clonedHeader) {
                this._stickyCheckboxClickHandle = this.connect(this._clonedHeader.find(".checkbox-container input"), "click.stickyHeaderCheckbox", this._handleClonedHeaderCheckboxClick.bind(this));

                this._stickySortClickHandle = this.connect(this._clonedHeader.find("th.column-sortable"), "click.stickyHeaderSort", this._handleColumnSort.bind(this));
            }
            this._renderColumnTooltips(headerNode);
        },

        _getColumnFormatCss : function(colFormat) {
            var colFormatCss = {};
            if (colFormat) {
                if (colFormat.minWidth) {
                    colFormatCss["min-width"] = colFormat.minWidth;
                }
                if (colFormat.maxWidth) {
                    colFormatCss["max-width"] = colFormat.maxWidth;
                }
                if (colFormat.percentWidth) {
                    colFormatCss.width = colFormat.percentWidth + "%";
                }
                else if (colFormat.width) {
                    colFormatCss.width = colFormat.width;
                }
            }
            return colFormatCss;
        },

        _handleClonedHeaderCheckboxClick : function (evt) {
            this._checkForValueProp();
            evt.stopImmediatePropagation();

            var checked = $(evt.target).is(":checked"),
                column = $(evt.currentTarget).closest(".grid-cell"),
                columnKey = column.data("col-key"),
                columnIdx = column.data("col-idx");

            if (this.attachPoints && this.attachPoints.header && columnIdx !== null && columnIdx !== undefined) {
                this.attachPoints.header.find(".colidx-" + columnIdx + " .checkbox-container input").prop("checked", checked);
            }

            this._updateGridCheckboxes(checked, columnIdx, columnKey);
        },

        _renderColumnTooltips : function(headerNode) {
            if (this.columnNameMaxLength) {
                var i, tip;
                // destroy and existing tooltip widgets
                if (this._colTooltips && this._colTooltips.length > 0) {
                    for (i = 0; i < this._colTooltips.length; i++) {
                        tip = this._colTooltips[i];
                        if (tip) {
                            tip.remove();
                        }
                    }
                }
                this._colTooltips = [];

                // now find all columns flagged with the tooltip class
                var ttCols = headerNode.find("th.col-name-tt");
                if (ttCols && ttCols.length > 0) {
                    var col, colKey;
                    for (i = 0; i < ttCols.length; i++) {
                        col = $(ttCols[i]);
                        colKey = col.data("col-key");
                        if (colKey && this._columnTooltipNameMap && this._columnTooltipNameMap[colKey]) {
                            tip = new Tooltip({target : $(ttCols[i]), tooltipText : this._columnTooltipNameMap[colKey]});
                            delete this._columnTooltipNameMap[colKey];
                            this._colTooltips.push(tip);
                        }
                    }
                }
            }
        },

        renderGrid : function(node, datasetIdx, sorting) {
            var result = this._super.apply(this, arguments);
            if (result !== false && !datasetIdx) {
                // override to set the last sort col idx
                if (!sorting && this.defaultSort && this.defaultSort.column) {
                    this._lastSortColIdx = this.defaultSort.asc === -1 ? false : this.defaultSort.column;
                    if (this.attachPoints && this.attachPoints.header) {
                        var col = this.attachPoints.header.find("th.column-sortable[data-col-key=\"" + this.defaultSort.column +"\"]");
                        if (col) {
                            this._updateSortColumnIndicator(col, this.defaultSort.asc);
                        }
                    }
                }
            }

            if (this.attachPoints && this.attachPoints.header && this.headers && this.freezeHeader) {
                this._freezeTableHeader();
            }
        },

        emptyGrid : function() {
            if (this._clonedHeader) {
                this._clonedHeader.hide();
            }
            this._super.apply(this, arguments);
        },

        renderHeader : function(node) {
            if (this._clonedHeader) {
                this._clonedHeader.remove();
                this._clonedHeader = null;
            }
            this._super.apply(this, arguments);
        },

        _handleColumnSort : function(evt) {
            if (!accessibilityUtil.clicked(evt)) {
                return;
            }
            var col = $(evt.target);
            // traverse up to the parent node if something interior was clicked
            if (col && !col.data("col-key")) {
                col = col.closest("th.column-sortable");
            }

            var colIdx = col.data("col-key"),
                sortAsc = String(this._lastSortColIdx) === String(colIdx) ? -1 : 1;
            if (!colIdx) {
                // just in case...
                return;
            }

            this._updateSortColumnIndicator(col, sortAsc);

            this._lastSortColIdx = sortAsc === -1 ? false : colIdx;
            this.defaultSort = {
                column : colIdx,
                asc : sortAsc
            };
            // sorting is achieved by re-ordering the underlying data set
            if (this.attachPoints && this.attachPoints.grid) {
                this.reset(true, null, false, "sort");
                if (this._shouldClientSort()) {
                    this.renderGrid(this.attachPoints.grid, null, true);
                    if (this._clonedHeaderVisible) {
                        this._clonedHeader.show();
                    }
                }
            }
        },

        _updateSortColumnIndicator : function(col, sortAsc) {
            // update the column sort header classes
            if (this.attachPoints && this.attachPoints.header) {
                if (this._clonedHeader) {
                    this._clonedHeader.find("th.column-sortable .column-sort-indicator").remove();
                }
                this.attachPoints.header.find("th.column-sortable .column-sort-indicator").remove();
            }

            var span = "<span class='column-sort-indicator "
                + "'><img alt='Sort Arrow' src='images/sort_arrow" + (sortAsc === 1 ? "_up" : "")  + ".png'></span>",
                subHeader = col.find(".sub-header");

            if (this._clonedHeader && col && $(col).attr("class")) {
                var selector = "th." + $(col).attr("class").split(' ').join('.');

                if (subHeader.length) {
                    this.attachPoints.header.find(selector + " .sub-header").before(span);
                    this._clonedHeader.find(selector  + " .sub-header").before(span);
                }
                else {
                    this.attachPoints.header.find(selector).append(span);
                    this._clonedHeader.find(selector).append(span);
                }
            }
            else {
                if (subHeader.length) {
                    subHeader.before(span);
                }

                else {
                    col.append(span);
                }
            }
        },

        _freezeTableHeader : function () {
            // TODO will the frozen header re-render if the columns change?
            if (this.attachPoints && this.attachPoints.grid && !this._clonedHeader) {
                var theadNode = this.attachPoints.grid.find("thead")[0],
                    headerNode = $(theadNode).find("tr")[0],
                    columnNodes = headerNode ? headerNode.childNodes : [],
                    gridWidth = headerNode ? headerNode.scrollWidth : 0,
                    clonedHeader,
                    clonedColumns,
                    gridContainer = $(this.attachPoints.gridContainer),
                    k,
                    position = this.scrollContainer ? {"position": "absolute", "padding": "0"} : {"position": "fixed"};

                clonedHeader = this.attachPoints.grid.find("thead")[0].cloneNode(true);
                this._clonedHeader = $(clonedHeader).addClass("sticky-header").hide();
                this._clonedHeader.offset().left = $(headerNode).offset().left;
                this.attachPoints.grid.prepend(this._clonedHeader);
                clonedColumns = this._clonedHeader.find("tr")[0].childNodes;
                $(theadNode).addClass("main-header");
                this._clonedHeader.removeClass("main-header");

                this._clonedHeader.css("left", gridContainer.offset().left);

                if (gridWidth) {
                    for (k = 0; k < columnNodes.length; k++) {
                        $(clonedColumns[k]).css("width", columnNodes[k].getBoundingClientRect().width + "px");
                    }
                }
                this._offsetTableTop = this.attachPoints.grid.offset().top;
                this._clonedHeaderHeight = $(this._clonedHeader).height();
                this._clonedHeader.find("tr").css("width", this.attachPoints.grid.width());
                this._clonedHeader.css("left", this.scrollContainer ? 0 : gridContainer.offset().left);
                this._clonedHeader.css(position);
                gridContainer.css("position", "static");

                this._createTableScrollEvent();
            }
        },

        _createTableScrollEvent : function () {
            var scrollContainer = this._getScrollContainer(),
                positionOfHeader = 0,
                newPosition = 0,
                bottomOfChart = 0,
                scrollTop = 0,
                scrollHandler = function (evt) {
                    if ((evt && evt.type === "resize") || this._oldWindowWidth !== $(window).width()
                        || this._oldChartHeight !== this.attachPoints.grid.height()) {

                        this._oldWindowWidth = $(window).width();
                        this._adjustWidthOfStickyHeader();
                    }

                    scrollTop = $(window).scrollTop();
                    positionOfHeader = this._offsetTableTop - $(scrollContainer).scrollTop();
                    newPosition = scrollContainer === window ? 0 : $(scrollContainer).scrollTop();
                    bottomOfChart = this._offsetTableTop + this.attachPoints.grid.height();

                    if (this.scrollContainer) {
                        positionOfHeader -= scrollTop;
                    }

                    if ((this.scrollContainer && $(scrollContainer).scrollTop() > 0 ) ||
                        (!this.scrollContainer && (positionOfHeader < 0 || positionOfHeader < newPosition) && scrollTop < bottomOfChart - this._clonedHeaderHeight)) {
                        this._clonedHeader.css("top", newPosition);
                        this._clonedHeader.show();
                        this._clonedHeaderVisible = true;
                    }

                    else if (!this.scrollContainer && (scrollTop >= (bottomOfChart - this._clonedHeaderHeight) && scrollTop < bottomOfChart)) {
                        newPosition = (this._clonedHeaderHeight + scrollTop - bottomOfChart) * -1;
                        this._clonedHeader.css("top", newPosition);
                        this._clonedHeader.show();
                        this._clonedHeaderVisible = true;
                    }

                    else {
                        this._clonedHeader.hide();
                        this._clonedHeaderVisible = false;
                    }

                }.bind(this);

            if (this._tableScrollHandler) {
                this.disconnect(this._tableScrollHandler);
            }
            this._tableScrollHandler = this.connect(scrollContainer, ("scroll.table" + (this.isIE() ? "" : " resize.table")),
                scrollHandler);

            if (this.scrollContainer) {
                if (this._stickyHeaderResizeHandler) {
                    this.disconnect(this._stickyHeaderResizeHandler);
                }
                this._stickyHeaderResizeHandler = this.connect(window, "resize.stickyHeader" , scrollHandler);
            }
        },

        _adjustWidthOfStickyHeader : function () {
            var headerNode = this.attachPoints.grid.find("thead.main-header tr")[0],
                columnNodes = headerNode ? headerNode.childNodes : [],
                clonedColumns = this.attachPoints.grid.find("thead.sticky-header tr")[0],
                clonedNodes = clonedColumns ? clonedColumns.childNodes : [],
                k;

            this._oldChartHeight = this.attachPoints.grid.height();
            this._offsetTableTop = this.attachPoints.grid.offset().top;

            for (k = 0; k < columnNodes.length; k++) {
                $(clonedNodes[k])[0].style.setProperty('width', columnNodes[k].getBoundingClientRect().width + "px", 'important');
            }

            //Set widths and left position
            this._clonedHeader.find("tr").css("width", $(headerNode).width());
            this._clonedHeader.css("left", this.scrollContainer ? 0 : $(this.attachPoints.gridContainer).offset().left);
            this._clonedHeaderHeight = $(this._clonedHeader).height();
        },

        onCssClassToggled : function(cssClass) {
            this._super.apply(this, arguments);

            if (this._clonedHeader) {
                this._adjustWidthOfStickyHeader();
            }
        },

        toggleRowExpanded : function(rowData) {
            this._checkForValueProp();
            if (rowData) {
                // handle results with multiple rows or an object representing a single row
                if ($.isArray(rowData)) {
                    var i = 0;
                    for (i; i < rowData.length; i++) {
                        this._toggleRowExpanded(rowData[i]);
                    }
                }
                else {
                    this._toggleRowExpanded(rowData);
                }
            }
        },

        _toggleRowExpanded : function(rowData) {
            if (rowData && this.valueProp && rowData[this.valueProp] !== undefined && rowData[this.valueProp] !== null) {
                var origRowValue = rowData[this.valueProp];
                if (origRowValue !== null && origRowValue !== undefined) {
                    this._handleRowExpansion(this._getGridRowByValue(origRowValue));
                }
            }
        },

        _handleRowExpansion : function(row) {
            if (row) {
                row = $(row);
                var isExpanded = !row.hasClass(this.expandedRowClass),
                    dataIdx = row.data("grid-row-idx"),
                    dataValue = row.data(this.valueProp.toLowerCase()),
                    children = $(row).nextUntil(":not(.child)");

                // do not allow collapsing of the only row
                if (this.expandedSingleRowPreventCollapse && !isExpanded && this.data && this.data.length <= 1) {
                    return;
                }

                row.toggleClass(this.expandedRowClass);
                row.attr("aria-expanded", isExpanded);
                this.dispatchEvent("rowExpandCollapse", {
                    expanded : isExpanded,
                    data : this._getRowDataByValue(dataValue)
                }, true);

                if (this.restrictOneRowExpand && this._expandedRow && isExpanded) {
                    var previousExpandedRow = this._expandedRow,
                        previousDiv = $(previousExpandedRow.currentTarget).closest("." + this.rowClass),
                        previousDataIdx = previousDiv.data("grid-row-idx");
                    this._expandedRow = false;

                    if (dataIdx !== previousDataIdx) {
                        this._handleRowExpansion(previousExpandedRow);
                    }
                }

                if (dataIdx !== null && dataIdx !== undefined && dataValue !== null && dataValue !== undefined) {
                    if (children.length) {
                        //collapse children
                        var i, child, firstChild;//, childIdx, childData;
                        for (i = 0; i < children.length; i++) {
                            child = $(children[i]);
                            if (child && child.length > 0) {
                                if (i === 0) {
                                    firstChild = child;
                                }
                                child.toggleClass("hidden");
                                /* TODO we can do something with the child rows here if needed
                                childIdx = this._getRowDataIndex(child);
                                if (childIdx !== null && childIdx !== undefined) {
                                    childData = this.dataMap ? this.dataMap[childIdx] : null;
                                }*/
                            }
                        }
                        this._expandedRow = firstChild && firstChild.hasClass("hidden") ? false : row;
                    }
                    else if (isExpanded) {
                        if (dataIdx !== null && dataIdx !== undefined && this.dataMap[dataIdx] &&
                            this.dataMap[dataIdx][this.expandableRowChildrenProp]) {
                            var parentData = this.dataMap[dataIdx];
                            this.insertChildRow(parentData[this.expandableRowChildrenProp], dataValue, true);
                        }
                        else if (this.dataStore && this.dataStore.loadItemData) {
                            // retrieve the children from the data store if they were not included with the data
                            this.dataStore.loadItemData(dataValue, function(data) {
                                if (data !== undefined && data !== null) {
                                    this.insertChildRow(data, dataValue, false);
                                }
                            }.bind(this), function(err) {
                                // reset the expand class if the request failed
                                row.removeClass(this.expandedRowClass);
                            });
                        }
                        this._expandedRow = row;
                    }
                }
            }
        },

        insertChildRow : function(childRowData, parentValue, expandCurrent) {
            this._checkForValueProp();

            if (childRowData) {
                this._unbindEventListeners();
                // handle results with multiple rows or an object representing a single row
                if ($.isArray(childRowData)) {
                    var i = 0;
                    for (i; i < childRowData.length; i++) {
                        this._insertChildRowData(childRowData[i], parentValue, i, expandCurrent, i === childRowData.length - 1);
                    }
                }
                else {
                    this._insertChildRowData(childRowData, parentValue, 0, expandCurrent, true);
                }
                this._bindEventListeners();
            }
        },

        _insertChildRowData : function(childRowData, parentValue, childIdx, expandCurrent, isLastChildRow) {
            if (childRowData && this.valueProp && childRowData[this.valueProp] !== undefined && childRowData[this.valueProp] !== null && this.data) {
                var newRow,
                    parentRow,
                    parent = childRowData.parentValue !== null && childRowData.parentValue !== undefined ? childRowData.parentValue : parentValue;
                if (parent !== null && parent !== undefined) {
                    parentRow = this._getGridRowByValue(parent);
                    if (parentRow) {
                        var i = $(parentRow).data("grid-row-idx"),
                            row = this.dataMap[i];
                        if (row && row[this.valueProp] === parent) {
                            if (childRowData[this.expandColumnName] !== true) {
                                childRowData[this.expandColumnName] = false;
                            }
                            if (!expandCurrent) {
                                if (row[this.expandableRowChildrenProp] === null ||row[this.expandableRowChildrenProp] === undefined) {
                                    row[this.expandableRowChildrenProp] = [];
                                }
                                row[this.expandableRowChildrenProp].push(childRowData);
                                // childIdx starts with 1, be sure to account for this when pulling from _children by index
                                childIdx = row[this.expandableRowChildrenProp].length;
                            }

                            newRow = this.renderGridRow(childRowData, i + "." + childIdx, null, true);
                            newRow.addClass(this.childRowClass);
                            // add an additional class to all of the child rows except for the last one
                            if (!isLastChildRow) {
                                newRow.addClass(this.childRowClass + "-not-last");
                            }

                            var lastChild = $(parentRow).nextUntil(":not(.child)").last();

                            if (lastChild.length === 0) {
                                newRow.insertAfter(parentRow);
                            }
                            else if (lastChild.length === 1) {
                                newRow.insertAfter(lastChild);
                            }
                        }
                    }
                }
            }
        }
    });
});