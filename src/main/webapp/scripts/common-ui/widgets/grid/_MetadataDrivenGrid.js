define([
    "jquery",
    "common-ui/widgets/_TemplatedWidget",
    "common-ui/widgets/utils/formatter",
    "common-ui/models/utils/widgetDataUtil",
    "common-ui/widgets/utils/metadataUtil",
    "common-ui/widgets/utils/templateUtil",
    "common-ui/widgets/utils/accessibilityUtil",
    "common-ui/widgets/OverviewToggleBar",
    "common-ui/widgets/Button",
    "common-ui/widgets/ConfirmationModal",
    "common-ui/widgets/form/DateTimePicker",
    "common-ui/widgets/SelectionList",
    "common-ui/widgets/Select",
    "common-ui/widgets/form/TextInput",
    "common-ui/widgets/ToggleBar",
    "common-ui/widgets/Tooltip"
], function($, _TemplatedWidget, formatter, widgetDataUtil, metadataUtil, templateUtil, accessibilityUtil, OverviewToggleBar, Button, ConfirmationModal, DateTimePicker, SelectionList, Select, TextInput, ToggleBar, Tooltip) {

    "use strict";

    var currentDatasetIdx = 1,
        FILTER_TYPE_DATETIME = "Datetime",
        FILTER_TYPE_TEXT = "text",
        isDef = function(val) {
            return val !== undefined && val !== null;
        },
        colorUtil;

    return _TemplatedWidget.extend({

        // _MetadataDrivenGrid
        //      an abstract base meta-driven widget that features a list of repeating widgets such as a table or grid
        //
        //      options
        //          columns: Object
        //              descriptions for each column/grid cell and the type of data/widget used to render them
        //          columnOptions: Object
        //              base descriptions for each column/grid cell and the type of data/widget used to render them
        //              these descriptions are combined with the column definition (if provided); column def takes priority
        //          overview: Object
        //              optional; an object containing two properties: title and data. title is the title of the OverviewBar
        //              and data is an array of OverviewItem objects that are injected into the OverviewBar (legend), which is
        //              displayed above the grid
        //          noValuePlaceholder: String
        //              this can be provided at the grid-level and will be used when a widget is not used to render a column
        //              or it can be specified per column definition
        //          data: Array
        //              the data for each column/grid cell
        //          title: String
        //              optional; a title to be displayed above the grid
        //          minVisibleItems: Number
        //              the number of data items required before this widget is visible; defaults to 0. for ex
        //              it may make sense to only show if at least 1 item is available so the widget will be hidden until that case is met
        //          scrollContainer: DOMNode
        //              the container with overflow-y: auto that contains this grid. for most all grids inline on the page, this
        //              defaults to window. for grids inside of nested containers with inner scrollbars, specify a reference to that container

        template : "", // note template must have a grid attach point and can optionally have a header attach point!

        widgets : null,

        baseClass : "",

        baseClassOuter : "",

        additionalBaseClass : "",

        allColumnsSortable : false,

        // clientSortingEnabled: Boolean
        //      only applies to a paginated grid that has all of its pages loaded in memory on the client
        clientSortingEnabled : false,

        // clientFilteringEnabled: Boolean
        //      only applies to a non-paginated grid that has all of its data loaded in memory on the client
        clientFilteringEnabled : false,

        // clientFilteringIncludeRowProp: String
        //      the name of the boolean property on each row that indicates if the row should be always included
        //      when client-side filtering. this is useful to retain header rows that should always be visible
        clientFilteringIncludeRowProp : null,

        rowClass : "grid-row",

        childRowClass : "child",

        rowInnerClass : "", // set this to tile if you want to have a tile-based layout; otherwise use whatever

        cellClass : "grid-cell",

        noDataRowClass : "no-data",

        errorRowClass : "no-data data-error",

        noValuePlaceholder : "",

        renderDelayRowClass : "loading-more",

        dataErrorMessage : "There was an error loading the data.",

        noDataMessage : "No data available",

        delayRenderingMessage : "Loading more data...",

        printLayoutMaxRenderBatch : 500,

        printLayoutBatchDelay : 25,

        printOffscreenRendering : false,

        // triggerRenderPixelsFromBottom: Number
        //      once the user scrolls past this number of pixels above the bottom of the last row, render more rows
        triggerRenderPixelsFromBottom : 1500,

        // renderRowBatchSize: Number
        //      the number of rows to render in each "batch"; scrolling beyond the "fold" will trigger another batch to load
        renderRowBatchSize : 25,

        multipleSelectMaxOptions : 10,

        multipleSelectAllowNoSelection : false,

        nullValueAsc : 999999999999999,

        nullValueDesc : -999999999999999,

        // filterTextMinChars: Number
        //      the minimum number of characters required in a filter text field before a change event is dispatched; -1 indicates no min
        filterTextMinChars : 0,

        // nestedCellValues: Boolean
        //      true if cells values are nested within a "value" property
        nestedCellValues : true,

        // hiddenMaxRenderRows: Number
        //      the max number of rows to render when this is hidden
        hiddenMaxRenderRows : 40,

        // rendering of row batches be delayed in older browsers if any of the following widgets are encountered by the specified duration in MS
        // if multiple delay rendering widgets are encountered in the same grid, the max rendering delay is used
        delayRenderingColumnWidgets : {
            SparkLineChart : 750
        },

        // changeDispatchingColumnWidgets: Object
        //      a map of widget types that will swallow change events (the grid will not dispatch its own even when they are clicked)
        //          TODO this should be automatically determined based on widget.changeDispatcher === true
        changeDispatchingColumnWidgets : {
            Select : true,
            SelectionList : true,
            Form : true
        },

        // suppressWidgetColumnChangeEvents: Boolean
        //      true if change events should not be dispatched when a column is clicked if the column is rendered using a widget
        suppressWidgetColumnChangeEvents : false,

        title : "",

        // titleClickable: Boolean
        //      true if the title should appear clickable and the grid will dispatch a titleClick event when it is clicked
        titleClickable : false,

        // valueProp: String
        //      if provided, the property within each row data object that defines the identifier/value for each row
        valueProp : null,

        // this will cause issues with filter widgets like Select not receiving their events if set to true
        clickableStopsPropagation : false,

        // sourceParam: String
        //      true if a param with the name represented by this string should be included to identify the source of a grid data update request
        //      possible values include: "action" (grid action button clicked), "sort" or [filter name] (grid filter applied)
        sourceParam : null,

        hasApplyButton: false,

        applyButtonLabel: "Apply",

        // hasFilterResetButton: Boolean
        //      true if a reset button is desired for the grid.  This will reset the filters back to their original values
        //      when they were first created
        hasFilterResetButton: false,

        // resetButtonLabel: String
        //      the label on the reset button
        resetButtonLabel: "Reset Filters",

        // filtersAllowShowHide: Boolean
        //      true if a show/hide button should appear in mobil view collapsing all og the grid filters into a dropdown.
        //      This will only work if filtersPosition is set to "left.
        filtersAllowShowHide: true,

        // filtersShowHideLabel: String
        //      the label for the button that will show/hide the filters on the grid
        filtersShowHideLabel: "Filters",

        // filtersPosition: String
        //      the position for the filters.  Only accepts "left" the default is floating right
        filtersPosition: "",

        // autoDetectNestedCellValues: Boolean
        //      true if nested cell values (e.g. {value : 1, sortValue : 2}) should be automatically detected based on
        //      the presence of a sortValue property even if nestedCellValues is false
        autoDetectNestedCellValues : true,

        attachPointLoaded : "grid",

        scrollContainer: false,

        // hideLabelInTooltip: Boolean
        //      hides the column name in the tooltip if set to true
        hideLabelInTooltip: false,

        // hasExpandingRows: Boolean
        //      if set to true, the table will add an expanding rows column and an expand button will appear for all
        //      rows where the expand column is set to true.
        hasExpandingRows : false,

        // allRowsExpandable: Boolean
        //      if set to true, all the rows in the table (excluding children) will be expandable.  If a row has the
        //      data for that column set to false, that row will not have an expand button
        allRowsExpandable : false,

        // expandableRowChildrenProp: String
        //      the name of the property that contains the children rows for an expandable row
        expandableRowChildrenProp : "_children",

        // expandColumnName: String
        //      the name of the column that has the expand button to expand the rows
        expandColumnName : "_expandable",

        // expandColumnIndex: Number
        //      the order in which the expand column should appear
        expandColumnIndex : -999,

        // expandedRowClass: String
        //      the css class applied to expanded grid rows
        expandedRowClass : "grid-row-expanded",

        // expandedProp: String
        //      true if the current row should be expanded by default
        expandedProp : "expanded",

        // expandOnRowClick: Boolean
        //      true if clicking anywhere on the row should expand it (if expandable); otherwise only the expand node is clickable
        expandOnRowClick : false,

        // expandedSingleRowPreventCollapse: Boolean
        //      true if there is only one row of data, and once expanded that row cannot be collapsed (ideally expanded by default)
        expandedSingleRowPreventCollapse : false,

        // parentRowClass: String
        //      the class that is added to every row that can be expanded
        parentRowClass : "parent-row",

        // saveAllFilterConfirmChange: Boolean
        //      only works if selectAllEnabled is set at the column level.  Will add a confirmation modal before a filter change if there are unsaved changes.
        saveAllFilterConfirmChange : false,

        // selectAllFilterChangeConfirmationMessage: String
        //      if saveAllFilterConfirmChange is true, this is the confirmation message
        selectAllFilterChangeConfirmationMessage : "Are you sure you want to change your filters?  Any unsaved selections will be lost.",

        // stopPropagationOnRowClick: Boolean
        //      if true, a row click will stop all events for the nested custom widgets
        stopPropagationOnRowClick: true,

        // cellValuesContainSafeMarkup: false
        //      warning - do not enable this with user-provided content for security reasons! if set to true,
        //      cell values are treated as safe markup and added to the dom as html rather than text.
        cellValuesContainSafeMarkup : false,

        // filterValuesContainSafeMarkup: false
        //      warning - do not enable this with user-provided content for security reasons! if set to true,
        //      filter values are treated as safe markup and added to the dom as html rather than text.
        filterValuesContainSafeMarkup : false,

        // excludeDisabledFilters: Boolean
        //      If true, the values of disabled filters will be removed from filterValues when the apply button is
        //      clicked to trigger the filterChange dispatch and reset
        //      Only applicable if the apply button is enabled
        excludeDisabledFilters : false,

        onInit : function() {
            if (this.dataStore) {
                if (this.dataStore.pageSize > 0) {
                    this.renderRowBatchSize = Math.min(this.renderRowBatchSize, Math.floor(this.dataStore.pageSize / 2));
                }
                if (this.sourceParam) {
                    this.dataStore.sourceParam = this.sourceParam;
                }
            }
            this._interceptData(this.data, true);
        },

        setColumns : function(columns, skipRender) {
            if (!columns) {
                columns = {};
            }
            this.defaultSort = null;
            this.delayRenderingDuration = 50;
            this._hasTooltips = false;
            var options = this.columnOptions || {},
                types = this.columnTypes || {},
                key;
            for (key in columns) {
                if (key && columns[key]) {
                    if (columns[key].columnType && types[columns[key].columnType]) {
                        columns[key] = $.extend({}, types[columns[key].columnType], columns[key]);
                        delete columns[key].columnType;
                    }
                    // mixin the column options if any are provided
                    // note column definitions override column options
                    if (options[key]) {
                        columns[key] = $.extend({}, options[key], columns[key]);
                    }
                    // for now just use the last sort ind as the default sort
                    if (columns[key].sortInd) {
                        this.defaultSort = {
                            column : key,
                            asc : Number(columns[key].sortInd) === -1 ? -1 : 1
                        };
                    }

                    if (columns[key].columnColorScale && $.isPlainObject(columns[key].columnColorScale)) {
                        var chromaColumn = columns[key].columnColorScale;
                        if (chromaColumn.chromaSeriesStrokes && chromaColumn.intervalCount && chromaColumn.reverseColors !== null && chromaColumn.reverseColors !== undefined) {
                            if (!colorUtil) {
                                colorUtil = metadataUtil.getWidgetConstructorByName("colorUtil");
                            }
                            columns[key].columnColorScale.colors = colorUtil.generateColors(chromaColumn.chromaSeriesStrokes, chromaColumn.intervalCount, chromaColumn.reverseColors);
                        }
                    }

                    if ((columns[key].tooltipColumns && columns[key].tooltipColumns.length > 0) || columns[key].cellTextMaxLength) {
                        if (columns[key].cellTextMaxLength) {
                            var tooltipValue = {column: key, hideLabel: true};
                            if (columns[key].tooltipColumns && columns[key].tooltipColumns.length > 0) {
                                columns[key].tooltipColumns.unshift(tooltipValue);
                            }
                            else {
                                columns[key].tooltipColumns = [tooltipValue];
                            }
                        }
                        this._hasTooltips = true;
                    }
                    // maintain the max rendering delay based on what widgets are present
                    if (columns[key].widget && columns[key].widget.widgetType &&
                        this.delayRenderingColumnWidgets[columns[key].widget.widgetType]) {
                        this.delayRenderingDuration = Math.max(this.delayRenderingDuration,
                            this.delayRenderingColumnWidgets[columns[key].widget.widgetType]);
                    }
                }
            }

            // assigning columns to this.columns may seem redundant but is needed in some cases
            this.columns = columns;

            this._columnList = templateUtil.getSortedWidgetArray(columns);
            this._columnsListUpdated = true;

            if (!skipRender && this.attachPoints) {
                this.onTemplateNodesAttached(this.attachPoints);
            }
        },

        getColumns : function() {
            return this.columns;
        },

        getColumnList : function() {
            return this._columnList;
        },

        setFilters : function(filters) {
            if (!filters) {
                filters = {};
            }

            this.filters = filters;
            this._filterList = templateUtil.getSortedWidgetArray(filters);
            this._filtersListUpdated = true;
            this.renderFilters();
        },

        getFilterValues : function() {
            return this.filterValues;
        },

        setFilterValues : function(filterValueMap) {
            if (filterValueMap) {
                var filter;
                for (filter in filterValueMap) {
                    if (filter) {
                        this.setFilterValue(filter, filterValueMap[filter]);
                    }
                }
            }
        },

        setFilterValue : function(filterName, newValue) {
            if (filterName) {
                if (!this._filterMap) {
                    if (!this._initialFilterValues) {
                        this._initialFilterValues = {};
                    }
                    this._initialFilterValues[filterName] = newValue;
                }
                else if (this._filterMap && this._filterMap[filterName] && this.filterValues) {
                    var filterWidget = this._filterMap[filterName];
                    if (filterWidget && filterWidget.widget) {
                        if (filterWidget.widget.setValue) {
                            filterWidget.widget.setValue(newValue);
                        }
                    }
                }
            }
        },

        setFilterDisabled : function(filterName, disabled) {
            if (this._filterMap && this._filterMap[filterName]) {
                var filterWidget = this._filterMap[filterName];
                if (filterWidget && filterWidget.widget && filterWidget.widget.setDisabled) {
                    filterWidget.disabled = disabled;
                    filterWidget.widget.setDisabled(disabled);
                }
            }
        },

        onTemplateNodesAttached : function(nodes) {
            if (this.domNode) {
                this.domNode.addClass(this.noDataRowClass);
                if (this.additionalBaseClass) {
                    this.domNode.addClass(this.additionalBaseClass);
                }
            }
            if (nodes) {
                if (nodes.overview && this.overview) {
                    this.renderOverview(nodes.overview);
                }
                else if (nodes.overview) {
                    nodes.overview.hide();
                }
                if (nodes.filters && !this._filtersRendered) {
                    if (this.filters) {
                        this.renderFilters();
                    }
                    else {
                        nodes.filters.hide();
                    }
                }
                // header is optional!
                if (nodes.header) {
                    this.renderHeader(nodes.header);
                }
                if (nodes.grid) {
                    // to improve print performance, render in a detached div rather than the one on screen if offscreen rendering enabled
                    if (window.Modernizr.printlayout && this.printOffscreenRendering) {
                        this.attachPoints.grid.detach();
                    }
                    this.renderGrid(this.attachPoints.grid);
                }
                if (nodes.gridTitle && this.title) {
                    nodes.gridTitle.addClass("grid-title");
                }
            }
        },

        _interceptData : function(data, isStartup, append, isClientFiltering) {
            // override to ensure the entire template is not re-applied if unnecessary
            this._columnsListUpdated = false;
            this._filtersListUpdated = false;
            var hasColumns = data && data.columns && data.data;
            if (data && !$.isArray(data)) {
                this.overview = data ? data.overview : null;
            }

            if ((data && data.title) || this.title) {
                this.title = data && data.title ? data.title : this.title;
                if (this.setTitle) {
                    this.setTitle(this.title);
                }
            }
            if (data && data.filters) {
                this.setFilters(data.filters);
            }
            else if (isStartup && this.filters) {
                this.setFilters(this.filters);
            }
            // this handler can also take a macro-data set that includes both columns and the data
            if (hasColumns) {
                if (!append) {
                    // only set the columns when not appending
                    this.setColumns(data.columns, true);
                }
                data = data.data;
            }
            else if (isStartup) {
                this.setColumns(this.columns);
            }

            // reset the unfiltered data as long as we are not currently filtering
            if (isClientFiltering !== true) {
                delete this._unfilteredData;
            }


            var newData = data ? (data.data || data) : data;
            if (append) {
                this.data = this.data ? this.data.concat(newData) : newData;
            }
            else {
                this.data = newData;

                if (this.domNode) {
                    this._headerSelectAllChecked = null;
                    this._unselectedMap = null;
                    this._selectedMap = null;
                    this._unsavedChanges = false;
                    this._addSaveFilterButton();
                }
            }

            this.updateDataVisibility(this.data);

            if (this.dataStore && this.dataStore.pageSize > 0) {
                this._lastPageSize = newData ? newData.length : 0;
            }
            // TODO note this re-indexes all data; not just starting at the new item; safer but more $$
            this._indexData();

            return hasColumns;
        },

        _indexData : function() {
            var data = this.data;
            if (data && data.length > 0) {
                var i = 0, curr;
                for (i; i < data.length; i++) {
                    curr = data[i];
                    if (curr) {
                        curr._idx = i + 1;
                    }
                }
            }
        },

        refreshData : function() {
            // intercept the refresh data call to preserve the filters and sort
            if (this.dataStore && this.dataStore.pageSize > 0) {
                this.reset(false, null, true);
            }
            else {
                this._super.apply(this, arguments);
            }
        },

        updateData : function(data, selectedValue, append, isError, isClientFiltering) {
            this._isError = isError;
            var hasColumns = this._interceptData(data, false, append, isClientFiltering);
            if (append) {
                if (this.attachPoints) {
                    if (isError) {
                        this._appendMessageRow(this.errorRowClass, this.dataErrorMessage, this.attachPoints.grid);
                    }
                    else {
                        this.renderGrid(this.attachPoints.grid);
                    }
                }
            }
            else {
                this.dispatchEvent("gridDataUpdated", data);
                if (this._pendingAction && this._pendingAction.length > 1) {
                    var payload = {action : this._pendingAction, data : data};
                    this.dispatchEvent("gridActionComplete" + this._pendingAction.charAt(0).toUpperCase() + this._pendingAction.slice(1),
                        payload);
                    this.dispatchEvent("gridActionComplete", payload);
                    delete this._pendingAction;
                }
                if (this._scrollResizeEventScope) {
                    this.disconnect(this._scrollResizeEventScope);
                }
                if (this.attachPoints) {
                    // re-render using the original attach points
                    this.reset();
                    if (this.overview) {
                        this.renderOverview(this.attachPoints.overview);
                    }
                    else if (this.attachPoints.overview) {
                        this.attachPoints.overview.hide();
                    }
                    if (hasColumns) {
                        this.renderHeader(this.attachPoints.header);
                    }
                    this.renderGrid(this.attachPoints.grid);
                }
                else {
                    // but if for some reason we don't have attach points, re-render
                    this._super.apply(this, arguments);
                }
            }

        },

        reset : function(sorting, action, forceFetch, source) {
            this.__scrollDataStartIdx = 0;
            this._waiting = false;
            this._lastTooltip = null;
            if (sorting || forceFetch) {
                delete this._lastWindowHeight;
                if (this.dataStore && this.dataStore.pageSize > 0 && (forceFetch || !this._shouldClientSort())) {
                    this._applyFilterAction(action, source);
                }
                else if (this._shouldClientFilter() && this.data && this.filterValues) {
                    var filteredData = this._filterData(this.data);
                    if (filteredData) {
                        this.updateData(filteredData, null, false, false, true);
                    }
                }
            }
            // TODO reset sorts, etc
        },

        onViewShown : function() {
            var widgets = this.getWidgets();
            if (widgets && widgets.length > 0) {
                var i = 0, widget;
                for (i; i < widgets.length; i++) {
                    widget = widgets[i];
                    if (widget && widget !== this._confirmationModal && widget !== this._saveButtonConfirmationModal &&
                        widget.onViewShown) {
                        widget.onViewShown();
                    }
                }
            }
        },

        _applyFilterAction : function(action, source) {
            var filterValues = $.extend({}, action || null, this.filterValues);
            this._pendingAction = action ? action.action : null;
            if (this.sourceParam && source) {
                filterValues[this.sourceParam] = source;
            }
            this.dataStore.sort(this.defaultSort, filterValues);
        },

        _filterData : function(data) {
            if (data && this.filterValues) {
                if (!this._unfilteredData) {
                    this._unfilteredData = data;
                }
                return this._unfilteredData.filter(function(item) {
                    if (item) {
                        if (this.clientFilteringIncludeRowProp && String(item[this.clientFilteringIncludeRowProp]).toLowerCase() === "true") {
                            return true;
                        }

                        // TODO handle multiple value filters
                        var filterKey, filterValue, filterDataPath, filterItemValue, filter, valueCompareOperator;
                        for (filterKey in this.filterValues) {
                            if (filterKey && this.filterValues[filterKey] && this._filterMap[filterKey]) {
                                filter = this._filterMap[filterKey];
                                // when using a compare operator, use the numeric value
                                if (filter.valueCompareOperator) {
                                    filterValue = !isNaN(this.filterValues[filterKey]) ?
                                        Number(this.filterValues[filterKey]) : null;
                                }
                                else {
                                    filterValue = String(this.filterValues[filterKey]).toLowerCase();
                                }

                                // if a dataPath is specified, use that; otherwise default to the name
                                filterDataPath = filter.dataPath || filterKey;
                                filterItemValue = templateUtil.getPropertyValue(filterDataPath, item);
                                if (!filter.multiple ||
                                    (filter.multiple && this.multipleSelectAllowNoSelection && filterValue !== "-1")) {
                                    if (typeof filterItemValue !== "undefined" && filterItemValue !== null) {
                                        // valueCompareOperator is for numeric types and can be: <, >, <=, >=
                                        if (filter.valueCompareOperator) {
                                            valueCompareOperator = templateUtil.htmlDecode(filter.valueCompareOperator, "text");
                                            // cast the value to a number if possible
                                            filterItemValue = !isNaN(filterItemValue) ? Number(filterItemValue) : null;

                                            // ensure a value is available to do the comparison
                                            if (filterValue !== null && typeof filterValue !== "undefined") {
                                                if ((valueCompareOperator === "<=" && filterItemValue > filterValue) ||
                                                    (valueCompareOperator === ">=" && filterItemValue < filterValue) ||
                                                    (valueCompareOperator === "<" && filterItemValue >= filterValue) ||
                                                    (valueCompareOperator === ">" && filterItemValue <= filterValue)) {
                                                    return false;
                                                }
                                            }
                                            else {
                                                return false;
                                            }
                                        }
                                        else {
                                            filterItemValue = String(filterItemValue).toLowerCase();
                                            if ((filter.contains && filterItemValue.indexOf(filterValue) === -1) ||
                                                (!filter.contains && filterItemValue !== filterValue)) {
                                                return false;
                                            }
                                        }
                                    }
                                    else {
                                        return false;
                                    }
                                }
                            }
                        }
                        return true;
                    }
                }.bind(this));
            }
            return data;
        },

        renderOverview : function(node) {
            var overview = this.overview || {},
                overviewData = overview.data || [],
                overviewTitle = overview.title || "",
                overviewSubtitle = overview.subtitle || "";
            if (!this.overviewBar) {
                this.overviewBar = new OverviewToggleBar({
                    data : overviewData,
                    title : overviewTitle,
                    subtitle : overviewSubtitle
                }, node);

            }
            else {
                if (this._titleClickConnection) {
                    this.disconnect(this._titleClickConnection);
                    delete this._titleClickConnection;
                }
                this.overviewBar.title = overviewTitle;
                this.overviewBar.subtitle = overviewSubtitle;
                this.overviewBar.updateData(overviewData);
            }

            if (this.titleClickable) {
                var titleNode = node.find(".app-legend-title");
                titleNode.addClass("hyperlink");
                this._titleClickConnection = this.connect(titleNode, "click.gridtitle.drill", this._handleGridTitleClick.bind(this));
            }
            node.show();
        },

        _handleGridTitleClick : function() {
            this.dispatchEvent("titleClick", this.overview, true);
        },

        renderFilters : function() {
            var node = this.attachPoints ? this.attachPoints.filters : null;
            if (node) {
                this._filtersRendered = true;
                if (node.empty) {
                    node.empty();
                }
                if (this._filterWidgets && this._filterWidgets.length > 0) {
                    // remove the old filter widgets
                    var j = 0, widget;
                    for (j; j < this._filterWidgets.length; j++) {
                        widget = this._filterWidgets[j];
                        if (widget) {
                            this.removeWidget(widget);
                            widget = null;
                        }
                    }
                }
                this._filterWidgets = [];
                this._filterMap = {};
                this.filterValues = {};
                if (this._filterList && this._filterList.length > 0) {
                    var i = 0, filter, filterNode, filterWidget, isSingleAction, opts, WidgetConstructor, initialValue, filterType;
                    for (i; i < this._filterList.length; i++) {
                        filter = this._filterList[i];
                        if (filter) {
                            this._filterMap[filter._key] = filter;
                            initialValue = this._initialFilterValues ? this._initialFilterValues[filter._key] : null;
                            filterNode = $("<div/>").addClass("grid-filter " + filter._key);
                            isSingleAction = false;
                            filterType = filter.type;
                            node.append(filterNode);
                            if (filter.options || filter.optionType === "Button"|| filter.type === "Button") {
                                if (filter.optionType === "Button" || filter.type === "Button") {
                                    if (filter.options && filter.options.length > 0) {
                                        filterWidget = new ToggleBar({
                                            baseClass: "toggle-button-bar " + (filter.hasOwnProperty("toggleMultiDisplay") && filter.toggleMultiDisplay ? "" : "toggle-single-display"),
                                            data: filter.options,
                                            valueProp: "id",
                                            selectedValue: initialValue || filter.selectedValue,
                                            disabled : filter.disabled || false
                                        }, filterNode);
                                    }
                                    else {
                                        filterWidget = new Button({
                                            label: filter.name || "",
                                            baseClass: filter.baseClass || "simple-button",
                                            title : filter.title || "",
                                            iconClass : filter.iconClass || "",
                                            data: {targetUrl: filter.targetUrl},
                                            disabled : filter.disabled || false
                                        }, filterNode);
                                        isSingleAction = true;
                                    }
                                }
                                else if (filter.multiple === true || filter.multiple > 0) {
                                    filterWidget = new Select({
                                        valueProp: "id",
                                        maxOptions: typeof filter.multiple === "number" ? Number(filter.multiple) : this.multipleSelectMaxOptions,
                                        defaultSelectCount: 0,
                                        multiple: true,
                                        allowNoSelection: this.multipleSelectAllowNoSelection,
                                        deselectAllText: filter.clearSelectionLabel || this.clearSelectionLabel,
                                        selectAllText: filter.selectAllLabel || this.selectAllLabel,
                                        selectAllEnabled: filter.selectAllEnabled !== undefined && filter.selectAllEnabled !== null ? filter.selectAllEnabled : this.selectAllEnabled,
                                        grouped: filter.grouped !== undefined && filter.grouped !== null ? filter.grouped : this.grouped,
                                        enableHTMLEntities: filter.enableHTMLEntities || false,
                                        valuesContainSafeMarkup : this.filterValuesContainSafeMarkup,
                                        title: filter.title || "Select",
                                        name: filter._key,
                                        promptLabel: filter.name || "",
                                        data: filter.options,
                                        selectedValue: initialValue,
                                        disabled : filter.disabled || false
                                    }, filterNode);
                                }
                                else {
                                    WidgetConstructor = metadataUtil.getWidgetConstructorByName("SelectionList");
                                    filterWidget = new WidgetConstructor({
                                        name: filter._key,
                                        promptLabel: filter.name || "",
                                        data: filter.options,
                                        valuesContainSafeMarkup : this.filterValuesContainSafeMarkup,
                                        enableHTMLEntities: filter.enableHTMLEntities || false,
                                        selectedValue: initialValue || filter.selectedValue,
                                        disabled : filter.disabled || false
                                    }, filterNode);
                                }
                                filterWidget.on("change", this._handleFilterValueChange.bind(this, filterWidget, filterType, isSingleAction, false));
                                if (!isSingleAction) {
                                    this.filterValues[filter._key] = filterWidget.getSelectedValue();
                                }
                            }
                            else if (filter.type === FILTER_TYPE_DATETIME) {
                                opts = $.extend({
                                    name: filter._key,
                                    label: filter.name || "",
                                    value: filter.selectedValue || null,
                                    disabled : filter.disabled || false,
                                    startOf : filter.startOf || null,
                                    endOf : filter.endOf || null
                                }, filter);

                                filterWidget = new DateTimePicker(opts, filterNode);

                                filterWidget.on("change", this._handleFilterValueChange.bind(this, filterWidget, filterType, isSingleAction, false));

                                this.filterValues[filter._key] = this._getFilterValue(FILTER_TYPE_DATETIME, filterWidget);
                            }
                            else {
                                // default text filters to contains if client filtering enabled or no page size is set
                                if ((this.clientFilteringEnabled || (!this.dataStore || !this.dataStore.pageSize)) &&
                                    (filter.contains === undefined || filter.contains === null)) {
                                    filter.contains = true;
                                }
                                opts = {
                                    promptLabel: filter.name || "",
                                    name: filter._key,
                                    changeOnKeyPress: false,
                                    disabled : filter.disabled || false
                                };
                                if (!initialValue && filter.value !== null && filter.value !== undefined) {
                                    initialValue = filter.value;
                                }
                                if (initialValue) {
                                    opts.value = initialValue;
                                }
                                if (filter.placeholder) {
                                    opts.placeholder = filter.placeholder;
                                }
                                if ((filter.keyPressDelay !== null && filter.keyPressDelay !== undefined) ||
                                    this.filterKeyPressDelay) {
                                    opts.keyPressDelay = filter.keyPressDelay || this.filterKeyPressDelay || 10;
                                }
                                else if (this.clientFilteringEnabled) {
                                    opts.keyPressDelay = 1;
                                }
                                filterType = FILTER_TYPE_TEXT;
                                filterWidget = new TextInput(opts, filterNode);
                                filterWidget.on("change", this._handleFilterValueChange.bind(this, filterWidget, filterType, isSingleAction, false));
                                if (!this.hasApplyButton) {
                                    filterWidget.on("keypress", this._handleFilterValueChange.bind(this, filterWidget, filterType, isSingleAction, false));
                                }
                                this.filterValues[filter._key] = initialValue || "";
                            }
                            filterWidget._key = filter._key;
                            this.addWidget(filterWidget);
                            this._filterWidgets.push(filterWidget);
                            this._filterMap[filter._key].widget = filterWidget;
                            if (this.clientFilteringEnabled && (initialValue || filter.selectedValue)) {
                                this._handleFilterValueChange(filterWidget, filterType, isSingleAction, true);
                            }
                        }
                    }
                    // delete the initial filter values after the first rendering of filters
                    delete this._initialFilterValues;

                    if (this.hasApplyButton && this._filterWidgets.length > 0) {
                        node = this.addGridFilterButton("apply", this.applyButtonLabel, node, this._handleApplyButtonClick);
                    }
                    if (this.hasFilterResetButton && this._filterWidgets.length > 0) {
                        node = this.addGridFilterButton("reset", this.resetButtonLabel, node, this._handleResetButtonClick);
                    }
                    this.dispatchEvent("filterChange", this.filterValues);
                    node.show();
                    this.addShowHideFiltersButton();
                }
                else {
                    node.hide();
                }
            }
        },

        _addSaveFilterButton : function() {
            this._selectAllSaveButtonColumns = {};

            if (!this._filtersListUpdated && this._numberOfAddedFilters && this.attachPoints && this.attachPoints.filters) {
                var i,
                    numberOfChildren = this.attachPoints.filters.children().length - 1;

                for (i = 0; i < this._numberOfAddedFilters; i++) {
                    if (numberOfChildren > i) {
                        $(this.attachPoints.filters.children()[numberOfChildren - i]).remove();
                    }
                }
            }

            this._numberOfAddedFilters = 0;
            var columns = this.columns,
                node = this.attachPoints ? this.attachPoints.filters : null,
                key;
            for (key in columns) {
                if (key && columns[key]) {
                    if (columns[key]._saveButtonDisabled !== null && columns[key]._saveButtonDisabled !== undefined) {
                        delete columns[key]._saveButtonDisabled;
                    }
                    if (columns[key].saveSelectAllStateLabel !== null && columns[key].saveSelectAllStateLabel !== undefined) {
                        this._selectAllSaveButtonColumns[key] = columns[key].saveSelectAllStateLabel;
                        columns[key]._saveButtonDisabled = true;
                    }
                }
            }

            if (this._selectAllSaveButtonColumns && !$.isEmptyObject(this._selectAllSaveButtonColumns)) {
                var buttons = this._selectAllSaveButtonColumns;
                for (key in buttons) {
                    if (key && buttons[key]) {
                        this._numberOfAddedFilters++;
                        var preventDefault = true,
                            buttonClass = "select-all-save " + key + "-select-all-save";
                        if (columns[key].refreshGrid !== null && columns[key].refreshGrid !== undefined && columns[key].refreshGrid === true){
                            preventDefault = false;
                        }
                        if (columns[key].confirmationMessage){
                            node = this.addGridFilterButton(buttonClass, buttons[key], node, this._handleConfirmSaveButton.bind(this, key, preventDefault), true);
                        }
                        else {
                            node = this.addGridFilterButton(buttonClass, buttons[key], node, this._handleSaveButtonClick.bind(this, key, preventDefault), true);
                        }
                    }
                }
            }
        },

        addGridFilterButton : function(buttonName, buttonLabel, node, buttonFunction, disabled) {
            this.domNode.removeClass("apply-enabled");
            this.domNode.removeClass("reset-enabled");

            var filterNode = $("<div/>")
                .addClass("grid-filter " + buttonName + "-button");
            node.append(filterNode);
            var button = new Button({
                label : buttonLabel || "",
                baseClass : "primary-button" + (disabled ? " disabled" : "")
            }, filterNode);

            button.on("change", buttonFunction.bind(this));

            if (!this._filterWidgets) {
                this._filterWidgets = [];
            }
            this._filterWidgets.push(button);
            this.originalFilterValues = $.extend({}, this.filterValues);

            return node;
        },

        _handleResetButtonClick : function() {
            if (this.domNode && this.domNode.hasClass("reset-enabled")) {
                this.resetFilters();
            }
        },

        _handleApplyButtonClick : function() {
            if (this.domNode && this.domNode.hasClass("apply-enabled")) {
                var filter,
                    filterValues = {};
                if (this.excludeDisabledFilters) {
                    for (filter in this._filterMap) {
                        if (!this._filterMap[filter].disabled && this.filterValues.hasOwnProperty(filter)) {
                            filterValues[filter] = this.filterValues[filter];
                        }
                    }
                } else {
                    filterValues = this.filterValues;
                }

                this.dispatchEvent("filterApply", filterValues, true);
                this.reset(false, null, true, "apply");
                this.originalFilterValues = $.extend({}, filterValues);
                this.domNode.removeClass("apply-enabled");
            }
        },

        _handleConfirmSaveButton : function(key, preventDefault) {
            if (!this.columns[key]._saveButtonDisabled) {
                this._saveButtonConfirmationModal = this.addWidget(new ConfirmationModal({
                    title: this.columns[key] && this.columns[key].confirmationModalTitle ? this.columns[key].confirmationModalTitle : "Confirm Change",
                    confirmationMessage: this.columns[key] && this.columns[key].confirmationMessage ? this.columns[key].confirmationMessage : this.confirmationMessage
                }));

                // reset the select immediately to maintain the ui state
                this._saveButtonConfirmationModal.confirm(function (confirmed) {
                    if (confirmed) {
                        this._handleSaveButtonClick(key, preventDefault);
                    }
                }.bind(this));
            }
        },

        _handleSaveButtonClick : function(key, preventDefault) {
            if (!this.columns[key]._saveButtonDisabled) {
                var selectedItems = "",
                    unselectedItems = "",
                    index, temp = "", itemMap,
                    headerSelectAllItems = this._headerSelectAllChecked ? this._headerSelectAllChecked[key] : null;

                if (this._unselectedMap && this._unselectedMap[key]) {
                    itemMap = this._unselectedMap[key];
                    for (index in itemMap) {
                        if (temp === "") {
                            temp += index;
                        }
                        else {
                            temp += "," + index;
                        }
                    }
                    unselectedItems = temp;
                    temp = "";
                }

                if (this._selectedMap && this._selectedMap[key]) {
                    itemMap = this._selectedMap[key];
                    for (index in itemMap) {
                        if (temp === "") {
                            temp += index;
                        }
                        else {
                            temp += "," + index;
                        }
                    }
                    selectedItems = temp;
                }

                if (headerSelectAllItems) {
                    var domEl = this.attachPoints.header.find(".grid-cell[data-col-key=\"" + key + "\"] .checkbox-container input");
                    if (domEl) {
                        domEl.prop("checked", false);
                    }
                }

                if (!this.columns[key].skipResetOfCheckboxes) {
                    this.resetColumnCheckboxes(key);

                    if (this.attachPoints && this.attachPoints.filters) {
                        var buttonDom = this.attachPoints.filters.find("." + key + "-select-all-save-button .primary-button");

                        if (buttonDom && buttonDom.length) {
                            buttonDom.addClass("disabled");
                            this.columns[key]._saveButtonDisabled = true;
                        }

                    }
                }

                var filterAction = ({
                    action: preventDefault ? key : "change",
                    column: key,
                    preventDefault: preventDefault,
                    allSelected: headerSelectAllItems,
                    selectedItems: selectedItems,
                    unselectedItems: unselectedItems,
                    filterValues: this.filterValues
                });

                if (!this.columns[key].saveButtonEventOnly) {
                    this._applyFilterAction(filterAction, key);
                }
                this.dispatchEvent("filterAction", filterAction, true);
            }
        },

        resetColumnCheckboxes : function(key) {
            if (this._unselectedMap && this._unselectedMap[key]) {
                delete this._unselectedMap[key];
            }
            if (this._selectedMap && this._selectedMap[key]) {
                delete this._selectedMap[key];
            }
            if (this._headerSelectAllChecked && this._headerSelectAllChecked[key] !== null && this._headerSelectAllChecked[key] !== undefined) {
                delete this._headerSelectAllChecked[key];
            }
            if ($.isEmptyObject(this._selectedMap) && $.isEmptyObject(this._unselectedMap) && ($.isEmptyObject(this._headerSelectAllChecked) || this._headerSelectAllChecked === null)) {
                this._unsavedChanges = false;
            }
        },

        _removeDisabledButtonClass : function(columnKey) {
            if (this.columns && this.columns[columnKey] && this.columns[columnKey]._saveButtonDisabled) {
                this.columns[columnKey]._saveButtonDisabled = false;

                if (this.attachPoints && this.attachPoints.filters) {
                    var buttonDom = this.attachPoints.filters.find("." + columnKey + "-select-all-save-button .primary-button");

                    if (buttonDom && buttonDom.length) {
                        buttonDom.removeClass("disabled");
                    }

                }
            }
        },

        resetFilters : function() {
            this.filterValues = $.extend({}, this.originalFilterValues);
            this.dispatchEvent("filterReset", this.filterValues, true);
            this.renderFilters();
            if (this._shouldClientFilter()) {
                this.reset(false, null, true, "filterReset");
            }
            else {
                this.refreshData();
            }
            this.domNode.removeClass("reset-enabled");
        },

        _handleFilterValueChange : function(filterWidget, filterType, isSingleAction, forceFilter) {
            if (this.saveAllFilterConfirmChange && this._unsavedChanges) {

                if (!this._confirmationModal) {
                    this._confirmationModal = this.addWidget(new ConfirmationModal({
                        title: "Confirm Change",
                        confirmationMessage: this.selectAllFilterChangeConfirmationMessage
                    }));
                }

                // reset the select immediately to maintain the ui state
                if (!this._confirmModalVisible) {
                    this._confirmModalVisible = true;
                    this._confirmationModal.confirm(function (confirmed) {
                        if (confirmed) {
                            this._unsavedChanges = false;
                            this._unselectedMap = null;
                            this._selectedMap = null;

                            this._handleFilterValueChange(filterWidget, filterType, isSingleAction, forceFilter);
                            this._confirmModalVisible = false;
                        }
                        else {
                            if (filterWidget && (filterWidget.setValue || filterWidget.setSelectedValue) && filterWidget._key && this.filterValues) {
                                if (filterWidget.setValue) {
                                    filterWidget.setValue(this.filterValues[filterWidget._key]);
                                }
                                else {
                                    filterWidget.setSelectedValue(this.filterValues[filterWidget._key]);
                                }
                            }
                            this._confirmModalVisible = false;
                        }
                    }.bind(this));
                }
            }

            else {
                if (isSingleAction && filterWidget && filterWidget._key) {
                    var filterItem = this._filterMap ? this._filterMap[filterWidget._key] : null,
                        filterAction = {action: filterWidget._key},
                        actionSource = "action";
                    if (filterItem.targetUrl) {
                        return;
                    }
                    if (filterItem.preventDefault && this.dataStore && this.dataStore.pageSize > 0) {
                        filterAction.preventDefault = true;
                        this._applyFilterAction(filterAction, actionSource);
                    }
                    else {
                        this.reset(false, filterAction, true, actionSource);
                    }
                    this.dispatchEvent("filterAction", filterAction, true);
                    return;
                }
                else if (filterWidget && (filterWidget.getValue || filterWidget.getSelectedValue) && filterWidget._key) {
                    var val = this._getFilterValue(filterType, filterWidget);

                    // ignore until a min number of chars (or none) is reached if is text and filterTextMinChars is specified
                    if (filterType === FILTER_TYPE_TEXT && this.filterTextMinChars > 0 && val !== undefined && val !== null &&
                        val.length > 0 && val.length < this.filterTextMinChars) {
                        return;
                    }
                    if (this.filterValues && (forceFilter === true || this.filterValues[filterWidget._key] !== val)) {
                        this.filterValues[filterWidget._key] = val;
                        this.dispatchEvent("filterChange", this.filterValues, true);
                        this.dispatchEvent("filterValueChange", {
                            filter : filterWidget._key,
                            value : val
                        }, true);
                        if (!this.hasApplyButton) {
                            this._canLoadData = false;
                            if (this._filterResetCountdown) {
                                clearTimeout(this._filterResetCountdown);
                            }
                            this._filterResetCountdown = setTimeout(function () {
                                delete this._filterResetCountdown;
                                this._canLoadData = true;
                                this.reset(false, null, true, filterWidget._key);
                            }.bind(this), 1);
                        }
                    }
                }

                if (this.hasApplyButton || this.hasFilterResetButton) {
                    var key, allEqual = true;
                    for (key in this.originalFilterValues) {
                        if (key && $.isArray(this.originalFilterValues[key]) && $.isArray(this.filterValues[key])) {
                            if (this.originalFilterValues[key].length !== this.filterValues[key].length) {
                                allEqual = false;
                            }

                            if (allEqual) {
                                var i;
                                for (i = 0; i < this.originalFilterValues[key].length; i++) {
                                    if (!this.isAFilterValue(key, String(this.originalFilterValues[key][i]))) {
                                        allEqual = false;
                                        break;
                                    }
                                }
                            }
                        }

                        else if (key && this.originalFilterValues[key] !== this.filterValues[key]) {
                            allEqual = false;
                        }

                        if (!allEqual) {
                            break;
                        }
                    }

                    if (!allEqual) {
                        if (this.hasApplyButton) {
                            this.domNode.addClass("apply-enabled");
                        }
                        if (this.hasFilterResetButton) {
                            this.domNode.addClass("reset-enabled");
                        }
                    }

                    else {
                        if (this.hasApplyButton) {
                            this.domNode.removeClass("apply-enabled");
                        }
                        if (this.hasFilterResetButton) {
                            this.domNode.removeClass("reset-enabled");
                        }
                    }
                }

                if (!$.isEmptyObject(this._headerSelectAllChecked)) {
                    var headerSelectAllColumns = this._headerSelectAllChecked,
                        colKey, domEl;
                    for (colKey in headerSelectAllColumns) {
                        if (colKey !== null && colKey !== undefined) {
                            domEl = this.attachPoints.header.find(".grid-cell[data-col-key=\"" + colKey + "\"] .checkbox-container input");
                            if (domEl) {
                                domEl.prop("checked", false);
                                delete this._headerSelectAllChecked[colKey];
                                this._removeDisabledButtonClass(colKey);
                            }
                        }
                    }
                }
            }
        },

        _getFilterValue : function(filterType, filterWidget) {
            // for date time filters when client filtering is enabled, used the epoch time
            if (this.clientFilteringEnabled && filterType === FILTER_TYPE_DATETIME && filterWidget.getSelectedValue) {
                var selectedDateValue = filterWidget.getSelectedValue();
                return selectedDateValue ? selectedDateValue.time : null;
            }
            else {
                return filterWidget.getValue ? filterWidget.getValue() : filterWidget.getSelectedValue();
            }
        },

        isAFilterValue : function (key, originalValue) {
            var i;
            for(i=0; i < this.filterValues[key].length; i++) {
                if (originalValue === String(this.filterValues[key][i])) {
                    return true;
                }
            }
        },

        addShowHideFiltersButton: function () {
            if (this.filtersAllowShowHide && this.attachPoints && this.attachPoints.filters) {
                this.attachPoints.filters.addClass("responsive-filters");
            }

            if (this.filtersAllowShowHide && !this.showHideButton) {
                var node = this.attachPoints ? this.attachPoints.filters : null,
                    showHideNode = $("<div/>")
                        .addClass("show-hide-filters-button");

                node.before(showHideNode);
                this.showHideButton = new Button({
                    label : this.filtersShowHideLabel || "",
                    baseClass : "simple-button",
                    iconClass : "glyphicon glyphicon-filter"
                }, showHideNode);

                this.showHideButton.on("click", this._handleShowHideButtonClick.bind(this));
            }
        },

        _handleShowHideButtonClick: function () {
            var node = this.attachPoints ? this.attachPoints.filters : null;

            if (node) {
                if (this._filtersVisible) {
                    node.removeClass("show-filters");
                    this._filtersVisible = false;
                }
                else {
                    node.addClass("show-filters");
                    this._filtersVisible = true;
                }
            }
        },

        renderHeader : function(node) {
            if (node && node.empty) {
                node.empty();
            }
            if (this._columnList && node) {
                var header, i = 0, col;
                for (i; i < this._columnList.length; i++) {
                    col = this._columnList[i] || {};
                    col._idx = i;
                    if (this._isColVisible(col)) {
                        header = this.generateHeaderDom(col, i);
                        if (header) {
                            if (col.selectAllEnabled) {
                                var ColWidgetConstructor = metadataUtil.getWidgetConstructorByName("Checkbox"),
                                    checkboxWidget = new ColWidgetConstructor({}, header);

                                this.connect(header.find("input"), "click.headerCheckbox." + col._key, this._handleCheckboxClick.bind(this));
                            }
                            header.attr("data-col-idx", col._idx);
                            node.append(header);
                        }
                    }
                }
            }
            setTimeout(function() {
                this.dispatchEvent("headerRendered", node);
                this.onHeaderRendered(node);
            }.bind(this), 100);
        },

        _handleCheckboxClick : function(evt) {
            this._checkForValueProp();
            evt.stopImmediatePropagation();

            var checked = $(evt.target).is(":checked"),
                column = $(evt.currentTarget).closest(".grid-cell"),
                columnKey = column.data("col-key"),
                columnIdx = column.data("col-idx");

            if (this._clonedHeader) {
                this._clonedHeader.find(".colidx-" + columnIdx + " .checkbox-container input").prop("checked", checked);
            }

            this._updateGridCheckboxes(checked, columnIdx, columnKey);

            this._removeDisabledButtonClass(columnKey);
        },

        _updateGridCheckboxes : function(checked, columnIdx, columnKey) {
            var tableRows = this.domNode.find(".grid-row"),
                i, curr;

            for (i = 0; i < tableRows.length; i++) {
                curr = $(tableRows[i]).find(".colidx-" + columnIdx + " .checkbox-container input");

                if (curr && !curr.is(":disabled")) {
                    curr.prop("checked", checked);
                }
            }

            if (!this._unselectedMap) {
                this._unselectedMap = {};
            }

            if (!this._selectedMap) {
                this._selectedMap = {};
            }
            this._unselectedMap[columnKey] = {};
            this._selectedMap[columnKey] = {};
            this._headerSelectAllChecked[columnKey] = checked;
            this._unsavedChanges = true;

            this.dispatchEvent("selectAllChecked", {
                columnName: columnKey,
                selected: checked,
                filterValues: this.filterValues
            }, true);

        },

        _isColVisible : function(col) {
            return String(col.visible).toLowerCase() !== "false" && String(col.hidden).toLowerCase() !== "true";
        },

        _unbindEventListeners : function() {
            // unbind old event listeners
            if (this._rowClickListener) {
                this.disconnect(this._rowClickListener);
                delete this._rowClickListener;
            }
            if (this._tooltipOverListener) {
                this.disconnect(this._tooltipOverListener);
                delete this._tooltipOverListener;
            }
            if (this._tooltipOutListener) {
                this.disconnect(this._tooltipOutListener);
                delete this._tooltipOutListener;
            }
            if (this._expandListener) {
                this.disconnect(this._expandListener);
                delete this._expandListener;
            }
        },

        _bindEventListeners : function() {
            // listen for row clicks on the rows that have been rendered
            if (!window.Modernizr.printlayout) {
                var me = this;
                setTimeout(function () {
                    if (this.domNode && this.attachPoints) {
                        this._rowClickListener = this.connect(this.domNode.find("." + this.rowClass),
                            "click.grid." + this._key + " keypress.grid." + this._key, function (evt) {
                            if (!accessibilityUtil.clicked(evt)) {
                                return;
                            }
                            var isChild = (me.hasExpandingRows || me.allRowsExpandable) && $(this).hasClass(me.childRowClass),
                                target = $(evt.target),
                                dataIdx = me._getClickedRowDataIndex(target),
                                column = me._getClickedColumnName(target),
                                columnInfo = me.columns && me.columns[column] ? me.columns[column] : null,
                                rawData = (me.dataMap ? me.dataMap[dataIdx] : null);

                            if (isChild) {
                                var parentIdx = dataIdx.toString().split(".")[0],
                                    childIdx = dataIdx.toString().split(".")[1];

                                // childIdx always starts with 1, so decrement to get _children array index
                                rawData = me.data && me.data[parentIdx] && me.data[parentIdx][this.expandableRowChildrenProp]
                                    ? me.data[parentIdx][this.expandableRowChildrenProp][childIdx - 1] : null;
                            }

                            var data = $.extend({_column : column}, rawData);

                            // when clicking in columns with certain widget types outside of the widget, don't dispatch an event and cause confusion
                            if (me.changeDispatchingColumnWidgets && columnInfo && columnInfo.widget &&
                                me.changeDispatchingColumnWidgets[columnInfo.widget.widgetType]) {
                                return;
                            }

                            if (me.stopPropagationOnRowClick) {
                                evt.stopPropagation();
                            }

                            // TODO not sure why but we are getting double clicks with this! fix the root of the issue!
                            var now = new Date().getTime();
                            if (!me._lastClick || now > me._lastClick + 500) {
                                me._lastClick = now;
                            }
                            else {
                                return;
                            }

                            if (me._tooltip) {
                                me._tooltip.hide();
                            }

                            var rowData = $.extend(true, {}, {index: dataIdx, data: data, column: column});

                            if (me._selectedItem && data && ((!me.valueProp && me._selectedItem === data) ||
                                (me.valueProp && me._lastSelectedValue !== null && me._lastSelectedValue !== undefined && data[me.valueProp] === me._lastSelectedValue))) {
                                me.dispatchEvent("sameRowClick", rowData, true);
                            }
                            if (me.valueProp && data) {
                                me._lastSelectedValue = data[me.valueProp];
                            }

                            me._selectedItem = data;

                            me.dispatchEvent("rowClick", rowData, true);

                            if (isChild) {
                                me.dispatchEvent("childRowClick", rowData, true);
                            }

                            // also dispatch a change event indicating potential selection
                            me.dispatchEvent("change", data, true);
                            // also dispatch an event tied to the column that was clicked
                            if (column && (!me.suppressWidgetColumnChangeEvents || (me.suppressWidgetColumnChangeEvents &&
                                (!columnInfo || !columnInfo.widget)))) {
                                me.dispatchEvent(column + ".change", data, true);
                            }
                            me.onRowClick.apply(me, [dataIdx, data, column]);
                        });

                        if (this._hasTooltips) {
                            this._tooltipOverListener = this.connect(this.domNode.find("." + this.rowClass + " ." + this.cellClass + ".tt"),
                                "mousemove.grid." + this._key, this._showTooltip.bind(this));

                            this._tooltipOutListener = this.connect(this.domNode.find("." + this.rowClass + " ." + this.cellClass + ".tt"),
                                "mouseleave.grid." + this._key, this._hideTooltip.bind(this));
                        }
                        if (!this._expandListener && (this.hasExpandingRows || this.allRowsExpandable)) {
                            var expandHandler = function(evt) {
                                this._handleRowExpansion($(evt.currentTarget).closest("." + this.rowClass));
                            }.bind(this);
                            if (this.expandOnRowClick) {
                                this._expandListener = this.connect(
                                    this.attachPoints.grid.find(".grid-expand-button").closest("." + this.rowClass),
                                    "click.expandable", expandHandler);
                            }
                            else {
                                this._expandListener = this.connect(this.attachPoints.grid.find(".grid-expand-button"),
                                    "click.expandable", expandHandler);
                            }

                        }
                    }
                }.bind(this), 100);
            }
        },

        _showTooltip : function(evt) {
            var tgt = $(evt.target),
                col = tgt.closest("." + this.cellClass).data("column-key"),
                row = tgt.closest("." + this.rowClass),
                rowDataIdx = row ? row.data("idx") : null,
                tooltipTemplate = "",
                tooltipData = {},
                isChild = row.hasClass(this.childRowClass);

            if (this._lastTooltip && this._lastTooltip.col === col && this._lastTooltip.rowDataIdx === rowDataIdx) {
                tooltipTemplate = this._lastTooltip.template;
                tooltipData = this._lastTooltip.data;
            }
            else if (col && this.columns && this.columns[col] && rowDataIdx >= 0 && this.data && rowDataIdx < this.data.length) {
                var rowData = this.data[rowDataIdx],
                    column = this.columns[col],
                    tCol,
                    cellData,
                    hideLabel,
                    parentIdx,
                    childIdx,
                    cellValue = null,
                    numberOfTooltipElements = 0;

                if (isChild) {
                    parentIdx = rowDataIdx.toString().split(".")[0];
                    childIdx = rowDataIdx.toString().split(".")[1];

                    // childIdx always starts with 1, so decrement to get _children array index
                    rowData = this.data[parentIdx][this.expandableRowChildrenProp][childIdx - 1];
                }

                column.tooltipColumns.forEach(function(tColName, idx) {
                    hideLabel = null;
                    if (tColName.column) {
                        hideLabel = tColName.hideLabel;
                        tColName = tColName.column;
                    }

                    tCol = tColName && this.columns && this.columns[tColName] ? this.columns[tColName] : null;

                    if (tCol) {
                        if (hideLabel === null) {
                            hideLabel = tCol.hideLabelInTooltip !== undefined && tCol.hideLabelInTooltip !== null
                                ? tCol.hideLabelInTooltip : this.hideLabelInTooltip;
                        }
                        cellData = this.extractRowData(tCol, rowData);

                        var colName = (tCol.tooltipName || tCol.name || "");
                        cellValue = formatter.format(
                            this._getCellDataValue(cellData, false, tCol.noValuePlaceholder || this.noValuePlaceholder),
                            this._getCellFormatString(cellData, rowData, tCol));

                        tooltipTemplate += "<div class='tooltip-row'>"
                            + (hideLabel ? "" : "<span class='tooltip-label'>${colName" + idx + "}</span>")
                            + "<span class='tooltip-value'>${cellValue" + idx + "}</span></div>";
                        tooltipData["colName" + idx] = colName;
                        tooltipData["cellValue" + idx] = cellValue;

                        if (cellValue !== null && cellValue !== undefined && cellValue !== "") {
                            numberOfTooltipElements++;
                        }
                    }
                }.bind(this));
                if (hideLabel && !numberOfTooltipElements) {
                    tooltipTemplate = null;
                }
                this._lastTooltip = {col : col, rowDataIdx : rowDataIdx, template : tooltipTemplate, data : tooltipData};
            }
            if (tooltipTemplate) {
                if (!this._tooltip) {
                    var tooltipNode = $("<div/>");
                    this.domNode.append(tooltipNode);
                    this._tooltip = new Tooltip({});
                }
                this._tooltip.showTooltip(evt, tooltipTemplate, tooltipData, true);
            }
            else {
                this._hideTooltip();
            }
        },

        _hideTooltip : function() {
            if (this._tooltip) {
                this._tooltip.hide();
            }
        },

        renderGrid : function(node, datasetIdx) {
            // TODO note if there are no widgets that need to be visible while rendered (charts?), render in hidden dom node
            // TODO otherwise we are currently causing a TON of reflow since IE triggers resize events for every cell rendered
            // prevent additional render calls if a delay triggered this before the data changed
            if ((datasetIdx && datasetIdx !== currentDatasetIdx) || (this._delayedRenderInProgress)) {
                return false;
            }

            // in IE this row can get stuck so make sure it's removed
            if (node && this.isIE()) {
                node.find("." + this.renderDelayRowClass).remove();
            }

            if (this._rebindEventListenerCountdown) {
                clearTimeout(this._rebindEventListenerCountdown);
                delete this._rebindEventListenerCountdown;
            }
            else {
                this._unbindEventListeners();
            }

            // if we aren't resuming rendering, ensure the grid is empty and values are reset
            if (!this.__scrollDataStartIdx) {
                this.__scrollDataStartIdx = 0;
                currentDatasetIdx++;

                this.domNode.css("min-height", this.domNode.height());
                this.emptyGrid();
                this.dataMap = {};
                this._gridWidgets = {};

                // let the async loader listener know that we are going to delay rendering of this grid
                if (window.Modernizr.printlayout && this.data && (this.data.length > this.printLayoutMaxRenderBatch ||
                    (this.dataStore && this.dataStore.pageSize > 0 && this.data.length >= this.dataStore.pageSize))) {
                    this._delayedRender = true;
                    $(document).trigger("delayedRender");
                }
                else {
                    this._delayedRender = false;
                }

                // apply the default sort if one is provided prior to rendering the data for the first time
                if (this._shouldClientSort()) {
                    this.data.sort(function(a, b) {
                        return a.stickAtTop ? -1 : this.sortCompareColumnDataValues(a, b, this.defaultSort.column, this.defaultSort.asc);
                    }.bind(this));
                }
            }
            var allDataRendered = true,
                someDataRendered = false,
                i;
            if (this.data && this.data.length > 0 && !$.isEmptyObject(this.getColumns())) {
                // remove the no data class
                this.domNode.removeClass(this.noDataRowClass);

                var curr, row, rowPositionTop = node.offset().top, rowsRendered,
                    scrollContainer = $(this._getScrollContainer()),
                    windowHeight = scrollContainer.height(),
                    windowWidth = scrollContainer.width(),
                    isCurrentlyVisible = this.domNode && this.domNode.is(":visible");

                if (!this._pendingRowContainer) {
                    this._pendingRowContainer = document.createDocumentFragment();
                }

                // render as much data as needed for now
                i = this.__scrollDataStartIdx || 0;
                for (i; i < this.data.length; i++) {
                    curr = this.data[i];
                    if (curr) {
                        this.dataMap[i] = curr;
                        row = this.renderGridRow(curr, i, i - this.__scrollDataStartIdx, false);
                        row.data("grid-row-idx", i);
                        this._pendingRowContainer.appendChild(row[0]);
                        someDataRendered = true;
                        this._delayedRenderInProgress = true;
                        rowsRendered = i - this.__scrollDataStartIdx;

                        // add a class to parent rows
                        if (curr && (this.allRowsExpandable || curr[this.expandColumnName] || curr[this.expandableRowChildrenProp])) {
                            row.addClass(this.parentRowClass);
                        }

                        // render children now that aren't expandable manually otherwise or any rows marked expanded by default
                        if (curr[this.expandableRowChildrenProp] && curr[this.expandableRowChildrenProp].length &&
                            ((!curr[this.expandColumnName] && !this.allRowsExpandable) || curr[this.expandedProp] === true)) {
                            row.addClass(this.expandedRowClass);
                            if (this.restrictOneRowExpand) {
                                this._expandedRow = row;
                            }
                            var k, childRow, childIdx;
                            for (k = 0; k < curr[this.expandableRowChildrenProp].length; k++) {
                                childIdx = i + "." + (k + 1);
                                childRow = this.renderGridRow(curr[this.expandableRowChildrenProp][k], childIdx, null, true);
                                childRow.data("grid-row-idx", childIdx);
                                childRow.addClass(this.childRowClass);
                                this._pendingRowContainer.appendChild(childRow[0]);
                            }
                        }

                        // for perf reasons only calculate row offset every 5 rows
                        if (!window.Modernizr.printlayout && i > this.__scrollDataStartIdx && i < this.data.length - 1) {
                            if ((!isCurrentlyVisible && i > this.hiddenMaxRenderRows) || (rowsRendered >= this.renderRowBatchSize)) {
                                // delay rendering!
                                break;
                            }
                        }
                        else if (window.Modernizr.printlayout && rowsRendered > this.printLayoutMaxRenderBatch) {
                            break;
                        }
                    }
                }

                var scrollHandler;
                // check to see if not all of the data was rendered
                if (i < this.data.length) {
                    this.__scrollDataStartIdx = i + 1;
                    allDataRendered = false;
                    // render all data now for print layout - just delay a bit to avoid blocking
                    if (window.Modernizr.printlayout) {
                        setTimeout(function() {
                            this._delayedRenderInProgress = false;
                            this.renderGrid(node);
                        }.bind(this), this.printLayoutBatchDelay);
                        return;
                    }
                    else {
                        // now listen for scroll or resize events to determine when to render more
                        scrollHandler = function(evt) {
                            window.requestAnimationFrame(function() {
                                // do not listen to scroll events when this view is not visible
                                if (this._delayedRenderInProgress || (this.domNode && !this.domNode.is(":visible"))) {
                                    return;
                                }
                                // recalculate affected vals on resize
                                if (evt && evt.type === "resize") {
                                    windowHeight = scrollContainer.height();
                                    windowWidth = scrollContainer.width();
                                    if (!this._lastWindowHeight || windowHeight !== this._lastWindowHeight) {
                                        this._lastWindowHeight = windowHeight;
                                    }
                                    if (!this._lastWindowWidth || windowWidth > this._lastWindowWidth) {
                                        this._lastWindowWidth = windowWidth;
                                    }
                                    else {
                                        return;
                                    }
                                    rowPositionTop = node.offset().top;
                                }

                                if (!this.waiting &&
                                    ((this.scrollContainer && (node.height() + node.position().top - scrollContainer.height() <= this.triggerRenderPixelsFromBottom)) ||
                                        (!this.scrollContainer && (node.height() - (scrollContainer.scrollTop() - rowPositionTop) - windowHeight) <= this.triggerRenderPixelsFromBottom))) {
                                    this._waiting = true;
                                    this.disconnect(this._scrollResizeEventScope);
                                    if (this.__scrollDataStartIdx > 0) {
                                        this.renderGrid(node, currentDatasetIdx);
                                        this._waiting = false;
                                    }
                                }
                            }.bind(this));
                        }.bind(this);
                        this._scrollResizeEventScope = this.connect(scrollContainer, "scroll.mgrid resize.mgrid", scrollHandler);
                    }
                }
                else {
                    this.__scrollDataStartIdx = 0;
                }

                window.requestAnimationFrame(function() {
                    node.append(this._pendingRowContainer);
                    delete this._pendingRowContainer;
                    this._delayedRenderInProgress = false;
                }.bind(this));

                this._rebindEventListenerCountdown = setTimeout(function() {
                    delete this._rebindEventListenerCountdown;
                    this._bindEventListeners();
                }.bind(this), 500);
            }
            else {
                this.domNode.addClass(this.noDataRowClass);
                // render the "no-data" row
                if (this._isError) {
                    var dataErrorMessage = this.data && this.data.dataErrorMessage ? this.data.dataErrorMessage : this.dataErrorMessage;
                    this._appendMessageRow(this.errorRowClass, dataErrorMessage, node, true);
                }
                else {
                    var noDataMessage = this.data && this.data.noDataMessage ? this.data.noDataMessage : this.noDataMessage;
                    this._appendMessageRow(this.noDataRowClass, noDataMessage, node, true);
                }
                this.__scrollDataStartIdx = this.data ? this.data.length : 0;
            }
            this.domNode.css("min-height", "");

            this.dispatchEvent("gridDataRendered", node, allDataRendered);
            if (someDataRendered && allDataRendered && this.dataStore && this.dataStore.pageSize > 0 && this._lastPageSize >= this.dataStore.pageSize) {
                this.__scrollDataStartIdx = this.data ? this.data.length : 0;
                setTimeout(function() {
                    delete this._pendingAction;
                    this.dataStore.loadNextPage(this.defaultSort, this.filterValues);
                }.bind(this), window.Modernizr.printlayout ? this.printLayoutBatchDelay : 0);
            }
            else if ((someDataRendered || (this.data && i > 0 && i >= this.data.length)) && allDataRendered && window.Modernizr.printlayout &&
                (this.printOffscreenRendering || this._delayedRender)) {
                this._finishPrintRender(node);
            }

            this.onGridDataRendered(node, allDataRendered);
        },

        _freezeTableHeader : function () {
            //implemented in gridTable.js
        },

        _getScrollContainer : function() {
            return this.scrollContainer === true && this.attachPoints ?
                (this.attachPoints.gridContainer || this.attachPoints.grid) : (this.scrollContainer || window);
        },

        _getClickedColumnName : function(row) {
            return row ? row.closest("." + this.cellClass).data("column-key") : undefined;
        },

        _getClickedRowDataIndex : function(row) {
            if (row) {
                return this._getRowDataIndex(row.closest("." + this.rowClass));
            }
        },

        _getRowDataIndex : function(row) {
            if (row) {
                var rowIdx = row.data("grid-row-idx");
                return rowIdx !== undefined ? rowIdx : row.data("idx");
            }
        },

        _finishPrintRender : function(node) {
            setTimeout(function() {
                if (this.printOffscreenRendering && this.attachPoints && this.attachPoints.gridContainer) {
                    this.attachPoints.gridContainer.append(node);
                }
                // let the async loader listener know that delayed rendering of this grid is complete
                if (this._delayedRender) {
                    setTimeout(function() {
                        $(document).trigger("delayedRenderComplete");
                    }, this.printLayoutBatchDelay * 2);
                }
            }.bind(this), 10);
        },

        getSelectedItem : function() {
            return this._selectedItem;
        },

        _appendMessageRow : function (rowClass, message, node, noData) {
            var messageRow = $(this.generateRowDom(null, 0)).addClass(rowClass + " " + this.rowClass),
                cell = $(this.generateCellDom(null, 0, -1));
            cell.text(message);
            node.append(messageRow.append(cell));
            return messageRow;
        },

        _shouldClientSort : function() {
            return this.data && this.data.length > 0 && (!this.dataStore || !this.dataStore.pageSize ||
                (this.dataStore.pageSize > 0 && this.clientSortingEnabled && this._lastPageSize < this.dataStore.pageSize))
                && this.defaultSort && this.defaultSort.column;
        },

        _shouldClientFilter : function() {
            return ((this._unfilteredData && this._unfilteredData.length > 0) || !this.data || (this.data && this.data.length > 0)) &&
                this.clientFilteringEnabled && (!this.dataStore || !this.dataStore.pageSize ||
                    (this.dataStore.pageSize > 0 && this._lastPageSize < this.dataStore.pageSize));
        },

        renderGridRow : function(rowData, rowIdx, rowOffset, isChildRow) {
            // iterate over each column
            var rowOuter = $(this.generateRowDom(rowData, rowIdx)),
                row;
            if (this.rowInnerClass || this.flexbox) {
                row = $("<div/>").addClass((this.flexbox ? "flexbox " : "") + this.rowInnerClass);
                rowOuter.append(row);
            }
            else {
                row = rowOuter;
            }

            if (rowData && rowData.rowClass) {
                rowOuter.addClass(rowData.rowClass);
            }
            if (this._columnList && row && row.length > 0) {
                var i = 0, col, cell, cells = document.createDocumentFragment();
                for (i; i < this._columnList.length; i++) {
                    col = this._columnList[i];
                    if (col && col._key && this._isColVisible(col) && (!col.childRowOnly || (col.childRowOnly && isChildRow))) {
                        var extractedData = this.extractRowData(col, rowData);
                        if (this.allRowsExpandable && col._key === this.expandColumnName && extractedData !== false) {
                            extractedData = true;
                        }
                        cell = this.renderGridRowCell(col, extractedData, i, rowData, rowOffset, rowIdx);
                        if (cell && cell.length > 0) {
                            cells.appendChild(cell[0]);
                        }
                        if (extractedData !== null && extractedData !== undefined && col.colSpan !== null && col.colSpan !== undefined) {
                            i += col.colSpan === -1 ? 100 : Number(col.colSpan);
                        }
                    }
                }
                row[0].appendChild(cells);
            }
            return rowOuter;
        },

        prependRow : function(rowData) {
            if (this.data) {
                this.data.unshift(rowData);
            }
            else {
                this.data = [rowData];
            }
            this.updateData(this.data);
        },

        updateRow : function(rowData, updateParentOnly) {
            this._checkForValueProp();
            if (rowData) {
                // handle results with multiple rows or an object representing a single row
                if ($.isArray(rowData)) {
                    var i = 0;
                    for (i; i < rowData.length; i++) {
                        this._updateRowData(rowData[i], updateParentOnly);
                    }
                }
                else {
                    this._updateRowData(rowData, updateParentOnly);
                }
            }
            // TODO ELSE show an error?
            // show a warning to indicate "action could not be verified or confirmed" something like that?

        },

        _updateRowData : function(rowData, updateParentOnly) {
            if (rowData && this.valueProp && rowData[this.valueProp] !== undefined && rowData[this.valueProp] !== null) {
                var origRow = this._getGridRowByValue(rowData[this.valueProp]);
                if (origRow) {
                    origRow = $(origRow);
                    this._unbindEventListeners();
                    var rowIdx = origRow.data("idx"),
                        row = this.renderGridRow(rowData, rowIdx, null, false),
                        children = $(origRow).nextUntil(":not(.child)"),
                        skipChildUpdate = updateParentOnly !== null && updateParentOnly !== undefined ? String(updateParentOnly).toUpperCase() === "TRUE" : false;
                    row.data("grid-row-idx", rowIdx);
                    origRow.hide();
                    row.insertAfter(origRow);

                    var i, curr, newProp = rowData[this.valueProp];

                    if (!skipChildUpdate && children.length) {
                        children.remove();
                    }
                    else if (children.length && rowData[this.expandedProp] === true) {
                        row.toggleClass(this.expandedRowClass);
                    }

                    origRow.remove();

                    if (this.data && this.data.length) {
                        for (i=0; i < this.data.length; i++) {
                            curr = this.data[i];
                            if (curr[this.valueProp] === newProp) {
                                this.data[i] = rowData;
                                break;
                            }
                        }
                    }

                    if (this.dataMap && rowIdx !== null && rowIdx !== undefined) {
                        this.dataMap[rowIdx] = rowData;
                    }

                    if (this._unfilteredData && this._unfilteredData.length) {
                        for (i=0; i < this._unfilteredData.length; i++) {
                            curr = this._unfilteredData[i];
                            if (curr[this.valueProp] === newProp) {
                                this._unfilteredData[i] = rowData;
                                break;
                            }
                        }

                        //TODO: Consider reapplying the filter values if update invalidates the filtered data
                    }

                    if (!skipChildUpdate && children.length && rowData[this.expandedProp] === true) {
                        this._handleRowExpansion(row);
                    }

                    this._bindEventListeners();
                    return;
                }
            }
        },

        deleteRow : function(rowData) {
            this._checkForValueProp();

            if (rowData) {
                // handle results with multiple rows or an object representing a single row
                if ($.isArray(rowData)) {
                    var i = 0;
                    for (i; i < rowData.length; i++) {
                        this._deleteRowData(rowData[i]);
                    }
                }
                else {
                    this._deleteRowData(rowData);
                }
            }
            // TODO ELSE show an error?
            // show a warning to indicate "action could not be verified or confirmed" something like that?
        },

        _deleteRowData : function(rowData) {
            if (rowData && this.valueProp && rowData[this.valueProp] !== undefined && rowData[this.valueProp] !== null) {
                var origRowValue = rowData[this.valueProp],
                    origRow = this._getGridRowByValue(origRowValue);
                if (origRow) {
                    origRow = $(origRow);
                    this._unbindEventListeners();
                    origRow.remove();
                    var i;
                    if (this.data) {
                        for (i = 0; i < this.data.length; i++) {
                            var row = this.data[i];
                            if (row && row[this.valueProp] === origRowValue) {
                                this.data.splice(i, 1);
                                break;
                            }
                        }
                    }
                    this._bindEventListeners();
                    return;
                }
            }
        },

        _getRowDataByValue : function(value) {
            this._checkForValueProp();
            if (value !== null && value !== undefined && this.valueProp && this.data) {
                value = String(value);
                var i = 0;
                for (i; i < this.data.length; i++) {
                    var row = this.data[i];
                    if (row && String(row[this.valueProp]) === value) {
                        return row;
                    }
                }
            }
            return null;
        },

        _getGridRowByValue : function(value) {
            if (this.attachPoints && this.attachPoints.grid) {
                var rows = this.attachPoints.grid.find("." + this.rowClass + "[data-" + this.valueProp.toLowerCase() + "='" + value + "']");
                if (rows && rows.length > 0) {
                    return rows[0];
                }
            }
        },

        extractRowData : function(col, rowData) {
            // if the column needs the entire row data, this can be accomplished 2 diff ways:
            //     (1) set col.columnData = true OR (2) name the column "_data_" (*note col names must be unique)
            if (col.columnData === true || col._key === "_data_") {
                return rowData;
            }

            if (col.columnData) {
                return templateUtil.getPropertyValue(col.columnData, rowData);
            }
            var data = rowData ? rowData[col._key] : null;
            return data;
        },

        renderGridRowCell : function(column, cellData, cellIdx, rowData, rowOffset, rowIdx) {
            var cell = $(this.generateCellDom(cellData, cellIdx, column.colSpan, column._key, column.showInHeader)),
                widgetView, colWidget, colWidgetProperties, defaultColWidgetProps, ColWidgetConstructor, cellDom,
                columnKey = column._key, noValPlaceholder = column.noValuePlaceholder || this.noValuePlaceholder;
            if (cell) {
                cell.data("column-key", columnKey || "");

                // we may derive a dynamic column type from the cell definition
                if (cellData && cellData.cellColumnType && this.columnTypes && this.columnTypes[cellData.cellColumnType]) {
                    column = $.extend({}, this.columnTypes[cellData.cellColumnType]);
                }

                if (column.widget && column.widget.widgetType) {
                    var widgetData;
                    if (column.widget.widgetData && rowData) {
                        widgetData = widgetDataUtil.extractWidgetData(column.widget.widgetData, rowData, {widget : this._key, column : columnKey});
                    }
                    else {
                        widgetData = this._getCellDataValue(cellData, true);
                        if (widgetData === undefined) {
                            widgetData = null;
                        }
                    }

                    if (!(widgetData === null && (column.widget.widgetRequiresValues === true || this.widgetRequiresValues === true))) {
                        widgetView = this.getView && this.getView.apply ? this.getView() : null;

                        ColWidgetConstructor = metadataUtil.getWidgetConstructorByName(column.widget.widgetType);
                        if (!ColWidgetConstructor && widgetView && widgetView.getWidgetConstructorByName) {
                            ColWidgetConstructor = widgetView.getWidgetConstructorByName(column.widget.widgetType);
                        }

                        if (widgetView && widgetView.getDefaultWidgetProperties) {
                            defaultColWidgetProps = widgetView.getDefaultWidgetProperties(column.widget.widgetType);
                        }

                        colWidgetProperties = $.extend(true, {}, defaultColWidgetProps,
                            this._getDefaultColumnWidgetProps(column.widget.widgetType, cellIdx, rowOffset),
                            column.widget.widgetProperties);
                        colWidgetProperties.append = false;
                        // for any widgets are suppressing dispatching events, enable it
                        if (colWidgetProperties.dispatchEvents !== false) {
                            colWidgetProperties.dispatchEvents = true;
                        }

                        // mixin format string if none provided
                        if (column.dataFormatString || column.formatString || rowData.formatString) {
                            if (!colWidgetProperties.formatString) {
                                colWidgetProperties.formatString = column.dataFormatString || column.formatString || rowData.formatString;
                            }
                            if (widgetData && $.isPlainObject(widgetData) && !widgetData.formatString) {
                                widgetData.formatString = column.dataFormatString || column.formatString || rowData.formatString;
                            }
                        }

                        colWidgetProperties.data = widgetData;
                        colWidgetProperties.gridRowData = rowData;

                        if (ColWidgetConstructor) {
                            colWidget = new ColWidgetConstructor(colWidgetProperties,
                                cell.append($("<div/>").addClass(column.columnClass || "")));
                            if (!this._gridWidgets[rowIdx]) {
                                this._gridWidgets[rowIdx] = {};
                            }
                            this._gridWidgets[rowIdx][columnKey] = this.addWidget(colWidget);

                            // override column widgets dispatch event to funnel through this widgets dispatch event
                            this._overrideColumnWidgetDispatchEvent(columnKey, colWidget, rowData);
                        }
                    }
                    else if (noValPlaceholder) {
                        cell.text(noValPlaceholder);
                    }
                }
                // if no widget is specified, just use the format string
                else if ((cellData !== null && cellData !== undefined) || String(cellData) === "0") {
                    var val = this._getCellDataValue(cellData, false, noValPlaceholder);
                    // prevent empty objects from causing issues
                    if (val && isNaN(val) && (typeof val !== 'string')) {
                        cellDom = noValPlaceholder || "";
                    }
                    else {
                        cellDom = formatter.format(val, this._getCellFormatString(cellData, rowData, column));
                    }
                    this._setCellRawValue(cell, column, cellDom);


                    if ((typeof val !== 'string') && column.columnColorScale && column.columnColorScale.colors) {
                        var colors = column.columnColorScale.colors;

                        if (column.columnColorScale.min !== null &&column.columnColorScale.min !== undefined &&
                            column.columnColorScale.max !== null &&column.columnColorScale.max !== undefined) {
                            if (!colorUtil) {
                                colorUtil = metadataUtil.getWidgetConstructorByName("colorUtil");
                            }
                            cell.css("background-color", colorUtil.getValueColor(colors, val, column.columnColorScale.min, column.columnColorScale.max));
                        }
                    }
                }
                else if (!cellData && noValPlaceholder) {
                    cell.text(noValPlaceholder);
                }

                // when we have tooltips to be displayed for this col, we need to add a class and a data value
                if (column.tooltipColumns && column.tooltipColumns.length > 0) {
                    cell.addClass("tt");
                }

                if (column.selectAllEnabled !== null && column.selectAllEnabled !== undefined) {
                    if (!this._headerSelectAllChecked) {
                        this._headerSelectAllChecked = {};
                    }

                    if (this._headerSelectAllChecked[columnKey] !== null && this._headerSelectAllChecked[columnKey] !== undefined){
                        var checkboxDom = $(cell).find(".checkbox-container input");
                        if (checkboxDom && !checkboxDom.is(":disabled")) {
                            if (this._headerSelectAllChecked[columnKey] && this._unselectedMap && this._unselectedMap[columnKey]) {
                                if (!this._unselectedMap[columnKey][rowData[this.valueProp]]) {
                                    checkboxDom.prop("checked", this._headerSelectAllChecked[columnKey]);
                                }
                            }
                            else if (!this._headerSelectAllChecked[columnKey] && this._selectedMap && this._selectedMap[columnKey]) {
                                if (!this._selectedMap[columnKey][rowData[this.valueProp]]) {
                                    checkboxDom.prop("checked", this._headerSelectAllChecked[columnKey]);
                                }
                                else {
                                    checkboxDom.prop("checked", true);
                                }
                            }
                        }
                    }
                }
            }
            return cell;
        },

        _setCellRawValue : function(cell, column, cellValue) {
            if (cell) {
                var textValue = templateUtil.htmlDecode(cellValue, "text");
                if (column.cellTextMaxLength && column.cellTextMaxLength > 1 && textValue.length > column.cellTextMaxLength) {
                    textValue = textValue.substring(0, column.cellTextMaxLength - 1) + "...";
                }

                var cellDom;
                if (column && column.columnClass) {
                    cellDom = $("<span/>")
                        .addClass(column.columnClass);
                    // hyperlink class needs accessibility values
                    if (column.columnClass === "hyperlink") {
                        cellDom.attr({
                            "tabindex" : 0,
                            "role" : "button",
                            "aria-pressed" : false
                        });
                    }
                }
                else {
                    cellDom = cell;
                }
                if (this.cellValuesContainSafeMarkup === true) {
                    cellDom.append(textValue);
                }
                else {
                    cellDom.text(textValue);
                }
                if (column && column.columnClass) {
                    cell.empty().append(cellDom);
                }
            }
        },

        _getDefaultColumnWidgetProps : function(widgetType, cellIdx, rowOffset) {
            return this.defaultWidgetPropMap && this.defaultWidgetPropMap[widgetType] ?
                this.defaultWidgetPropMap[widgetType] : {};
        },

        _getGridWidgetForCell : function(rowIdx, colName) {
            if (rowIdx !== null && rowIdx !== undefined && colName !== null && colName !== undefined) {
                return this._gridWidgets && this._gridWidgets[rowIdx] ? this._gridWidgets[rowIdx][colName] : null;
            }
        },

        _overrideColumnWidgetDispatchEvent : function(colKey, colWidget, rowData) {
            if (colWidget && colWidget.dispatchEvent) {
                colWidget.dispatchEvent = function(type, data, userInitiated) {
                    //this.dispatchEvent(type, rowData, userInitiated);

                    // ${myGrid.|col1.id} captures data from an event from a widget in col1 (grids)
                    // note this is different than the syntax for a trigger, which just uses the . notation ("myGrid.col1.change")
                    var colData = {};
                    colData["|" + colKey] = data;
                    var newData = $.extend({}, colData, rowData);
                    this._selectedItem = newData;

                    if (this.valueProp) {
                        var rowId = rowData[this.valueProp];
                        if (this.columns[colKey] && (this.columns[colKey].selectAllEnabled || this.columns[colKey].saveSelectAllStateLabel )) {
                            this._unsavedChanges = true;

                            if (data && data.selected) {
                                if (!this._selectedMap) {
                                    this._selectedMap = {};
                                }
                                if (!this._selectedMap[colKey]) {
                                    this._selectedMap[colKey] = {};
                                }
                                if (this._unselectedMap && this._unselectedMap[colKey] && this._unselectedMap[colKey][rowId]) {
                                    delete this._unselectedMap[colKey][rowId];
                                }
                                this._selectedMap[colKey][rowId] = newData;
                            }
                            else {
                                if (!this._unselectedMap) {
                                    this._unselectedMap = {};
                                }
                                if (!this._unselectedMap[colKey]) {
                                    this._unselectedMap[colKey] = {};
                                }
                                if (this._selectedMap && this._selectedMap[colKey] && this._selectedMap[colKey][rowId]) {
                                    delete this._selectedMap[colKey][rowId];
                                }
                                this._unselectedMap[colKey][rowId] = newData;
                            }

                            this._removeDisabledButtonClass(colKey);
                        }
                    }

                    this.dispatchEvent(type, newData, userInitiated);

                    // dispatching a name-spaced event for more specific event binding or triggers
                    this.dispatchEvent(colKey + "." + type, newData, userInitiated);
                }.bind(this);
            }
        },

        _getCellFormatString : function(cellData, rowData, column) {
            if (column && column.formatStringData) {
                return templateUtil.getPropertyValue(column.formatStringData, rowData);
            }
            return cellData && cellData.formatString ? cellData.formatString :
                (column && (column.dataFormatString || column.formatString) ?
                    (column.dataFormatString || column.formatString) :
                    (rowData && rowData.formatString ? rowData.formatString : null));
        },

        _getCellDataValue : function(cellData, preserveNoData, noValuePlaceholder) {
            var val = cellData;
            if (this.nestedCellValues || (this.autoDetectNestedCellValues && cellData !== null && cellData !== undefined &&
                cellData.sortValue !== null && cellData.sortValue !== undefined)) {
                if (cellData && cellData.hasOwnProperty("value")) {
                    val = cellData.value;
                }
            }
            if (!preserveNoData && (val === null || val === undefined || val === "")) {
                return noValuePlaceholder || "";
            }
            return val;
        },

        onHeaderRendered : function(headerNode) {
            // attach point; can be used to attach events, etc
        },

        onGridDataRendered : function(gridNode, allDataRendered) {
            // attach point; can be used to attach events, etc. note allDataRendered is true when all data is done rendering
        },

        onRowClick : function(rowIdx, rowData, column) {
            // attach point; invoked when a row is clicked
        },

        generateHeaderDom : function(col, colIdx) {
            // override to return the dom for a column header
            return "";
        },

        generateRowDom : function(rowData, rowIdx) {
            // override to return the dom for a row; note row should have this.rowClass
            return "";
        },

        generateCellDom : function(cellData, cellIdx, colSpan, colKey, showInHeader) {
            // override to return the dom for a cell; note colSpan of -1 indicates entire row
            return "";
        },

        _handleRowExpansion : function () {
            // implemented in GridTable to handle expanding and collapsing rows
        },

        sortCompareColumnDataValues : function(a, b, columnName, sortAsc) {
            // NOTE sortAsc should be a number (either -1 or 1)
            var NO_VAL = sortAsc === 1 ? this.nullValueAsc : this.nullValueDesc,
                aVal = this._getSortCompareValue(a, columnName, NO_VAL),
                bVal = this._getSortCompareValue(b, columnName, NO_VAL);

            if (typeof aVal !== "string" && isNaN(aVal) && (aVal.measureDesc || aVal.desc || aVal.value || Number(aVal.value) === 0)) {
                aVal = aVal.measureDesc || aVal.desc || aVal.value;
            }
            if (typeof bVal !== "string" && isNaN(bVal) && (bVal.measureDesc || bVal.desc || bVal.value || Number(bVal.value) === 0)) {
                bVal = bVal.measureDesc || bVal.desc || bVal.value;
            }

            // if we are still left with objects, goodbye
            if (typeof aVal === "object") {
                aVal = NO_VAL;
            }
            if (typeof bVal === "object") {
                bVal = NO_VAL;
            }

            // handle undefineds or empty strings
            if (aVal === null || aVal === undefined || aVal === "") {
                aVal = NO_VAL;
            }
            if (bVal === null || bVal === undefined || bVal === "") {
                bVal = NO_VAL;
            }

            // ensure numeric sorting is handled
            if (!isNaN(aVal)) {
                aVal = Number(aVal);
            }
            if (!isNaN(bVal)) {
                bVal = Number(bVal);
            }

            if (typeof aVal === "string") {
                aVal = aVal.toLowerCase();
            }

            if (typeof bVal === "string") {
                bVal = bVal.toLowerCase();
            }

            // use the idx as a secondary sort to stabilize when values are equal
            if (aVal === bVal) {
                return a._idx - b._idx;
            }

            // otherwise sort based on the sort direction and the actual values
            if (aVal < bVal) {
                return (-1 * sortAsc);
            }
            else if (aVal > bVal) {
                return sortAsc;
            }
            return 0;
        },

        _getSortCompareValue : function(data, columnName, NO_VAL) {
            if (isDef(data) && isDef(data[columnName])) {
                var colData = data[columnName];
                if (isDef(colData.sortValue)) {
                    return colData.sortValue;
                }
                else if (isDef(colData.value)) {
                    return colData.value;
                }
                else if (isDef(colData.measureScore)) {
                    return colData.measureScore;
                }
                return colData;
            }
            return NO_VAL;
        },

        emptyGrid : function() {
            // first destroy all existing widgets
            if (this._gridWidgets) {
                var key, rowWidgetMap, rowWidgetKey, curr;
                for (key in this._gridWidgets) {
                    rowWidgetMap = this._gridWidgets[key];
                    if (rowWidgetMap) {
                        for (rowWidgetKey in rowWidgetMap) {
                            curr = rowWidgetMap[rowWidgetKey];
                            if (curr) {
                                this.removeWidget(curr);
                                rowWidgetMap[rowWidgetKey] = null;
                            }
                        }
                    }
                }
            }

            if (this.attachPoints && this.attachPoints.grid) {
                // remove all nodes but the header
                this.attachPoints.grid.find("." + this.rowClass).remove();
            }
        },

        getTemplateData : function() {
            var filtersPosition = this.filtersPosition ? this.filtersPosition.toLowerCase() : "",
                gridFiltersClass = filtersPosition ? "grid-filters-" + filtersPosition : "";

            if (filtersPosition === "left-side") {
                filtersPosition += " card padded";
            }

            return {
                title : this.title || "",
                baseClass : this.baseClass || "",
                baseClassOuter : this.baseClassOuter || "",
                filtersPosition: filtersPosition,
                gridFiltersClass: gridFiltersClass || "",
                noDataRowClass : this.noDataRowClass,
                scrollContainerClass : this.scrollContainer === true ? "scroll-inner" : ""
            };
        },

        _checkForValueProp : function () {
            if (!this.valueProp && window.console && typeof window.console.error === "function") {
                console.error("valueProp must be specified for " + this._key + " to handle row inserts");
                return;
            }
        }

    });
});