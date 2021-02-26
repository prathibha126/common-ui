define([
    "jquery",
    "Class",
    "common-ui/widgets/utils/analytics",
    "common-ui/views/_MetadataDrivenView",
    "common-ui/widgets/utils/formUtil",
    "common-ui/widgets/utils/notificationUtil",
    "common-ui/widgets/utils/templateUtil"
], function($, Class, analytics, _MetadataDrivenView, formUtil, notificationUtil, templateUtil) {

    "use strict";

    var metadataCache = false,
        startupParamsCache = false,
        EXPORT_MAX_GRID_COLS_PORTRAIT = 6,
        EXPORTABLE_WIDGET_TYPES = {
            "MeasureDetailChart" : true,
            "DomainSummary" : true,
            "Scorecard" : true,
            "SummaryBar" : true,
            "ChartGrid" : true,
            "GridTable" : true
        };

    return Class.extend({

        view : null,
        viewId : "",
        viewTitle : "",
        breadcrumbTitle : "",
        viewConstructor : null,
        containerNode : null,

        // destroyOnPop: Boolean
        //      true if this controller/view should be destroyed each time it is popped off of the view stack
        destroyOnPop : false,

        // singleInstance: Boolean
        //      true if only one instance of this view can exist at a time, meaning if it is a target while already in the view stack,
        //      navigation will return to this instance via popping all views above it
        singleInstance : true,

        // singleNotificationVisible: Boolean
        //      true if only one notification can be visible for this view at a time. this will clear out any existing notifications
        //      from any widget within this view when a new notification occurs for any other notification on this view
        singleNotificationVisible : false,
        // titlesContainSafeMarkup: Boolean
        //      warning - use extreme caution! this should only be set to true with trusted, non-user provided markup
        //      and will render html in the app title, view title and sub title elements
        titlesContainSafeMarkup : false,

        startupWidgetData : null,

        init : function(options) {
            // mixin the options
            $.extend(this, options);

            this.createView();
            if (metadataCache) {
                this.onMetadataSet();
            }
            if (this.view && this.view.place) {
                this.view.place();
            }

            // TODO surfacing these here for custom controllers that extend from this; may be removed in the future
            this.ERROR_MESSAGE_GENERIC = notificationUtil.getErrorMessageGeneric();
            this.ERROR_MESSAGE_NO_ACCESS = notificationUtil.getErrorMessageNoAccess();
        },

        _setMetadata : function(metadata, startupParams) {
            metadataCache = metadata;
            startupParamsCache = startupParams;
        },

        onMetadataSet : function() {
            if (this.view && this.view.setMetadata) {
                var viewMeta = this.getViewMetadata(),
                    dataStoreMeta = this.getMetadataDataStores();
                this.view.setMetadata(viewMeta, dataStoreMeta, startupParamsCache);

                if (viewMeta) {
                    var contextPostfix = this.view.getViewContextPostfix(),
                        viewContext = this.view.getViewContext();
                    if (viewMeta.title) {
                        this.setViewTitle(viewContext && contextPostfix ? viewMeta["title" + contextPostfix] || viewMeta.title : viewMeta.title);
                    }
                    if (viewMeta.subTitle) {
                        this.setSubTitle(viewContext && contextPostfix ? viewMeta["subTitle" + contextPostfix] || viewMeta.subTitle : viewMeta.subTitle);
                    }
                    // TODO this does not work due to timing
                    if (viewMeta.breadcrumbTitle) {
                        this.breadcrumbTitle = viewContext && contextPostfix ? viewMeta["breadcrumbTitle" + contextPostfix] || viewMeta.breadcrumbTitle : viewMeta.breadcrumbTitle;
                    }
                }

            }
            // attach point
        },

        onShown : function() {
            if (this.view && this.view.onShown) {
                this.view.onShown();
            }
            // attach point called when this view is shown
        },

        onPlacedInBackground : function() {
            if (this.view && this.view.onPlacedInBackground) {
                this.view.onPlacedInBackground();
            }
            // attach point called when this view is placed in the background (a new view is shown on top)
        },

        onPopped : function() {
            if (this.view && this.view.onPopped) {
                this.view.onPopped();
            }
            // attach point called when this view is popped from the stack
        },

        addSubview : function(subview, viewId) {
            if (!subview) {
                return;
            }
            subview.delegate = this;
            if (!this.subviews) {
                this.subviews = [subview];
            }
            else {
                this.subviews.push(subview);
            }
            if (subview.setMetadata && metadataCache && metadataCache.views && metadataCache.views[viewId]) {
                subview.setMetadata(metadataCache.views[viewId]);
            }
        },

        removeSubview : function(subview) {
            if (subview && this.subviews) {
                var i = 0;
                for (i; i < this.subviews.length; i++) {
                    if (this.subviews[i] === subview) {
                        this.subviews.splice(i, 1);
                        return;
                    }
                }
            }
        },

        getView : function() {
            return this.view;
        },

        getMetadataCache : function() {
            return metadataCache;
        },

        getViewMetadata : function() {
            return this.viewId && metadataCache && metadataCache.views && metadataCache.views[this.viewId] ?
                metadataCache.views[this.viewId] : false;
        },

        getMetadataFilters : function() {
            var view = this.viewId && metadataCache && metadataCache.views && metadataCache.views[this.viewId] ?
                metadataCache.views[this.viewId] : false;

            var filters = view ? view.filters : false;
            if (view && this.view && this.view.getViewContext && this.view.getViewContext() && this.view.getViewContextPostfix) {
                var contextPostfix = this.view.getViewContextPostfix();
                if (contextPostfix) {
                    filters = view["filters" + contextPostfix] || view.filters;
                }
            }

            return this._filterOptionsForContext(filters);
        },

        getMetadataMenuOptions : function() {
            var key, option,
                options = this.viewId && metadataCache && metadataCache.views && metadataCache.views[this.viewId]
                    ? metadataCache.views[this.viewId].menuOptions || {} : {};

            // extract global filters
            if (metadataCache && metadataCache.menuOptions) {
                for (key in metadataCache.menuOptions) {
                    if (key && metadataCache.menuOptions[key] && String(metadataCache.menuOptions[key].global).toLowerCase() === "true"
                        && options[key] === undefined) {
                        options[key] = "on";
                    }
                }
            }

            options = this._filterOptionsForContext(options);

            if (metadataCache && metadataCache.menuOptions) {
                for (key in options) {
                    if (key && metadataCache.menuOptions[key]) {
                        option = metadataCache.menuOptions[key];
                        // remove children if their parent is not present
                        if (option.parentMenuOption && !options[option.parentMenuOption]) {
                            delete options[key];
                        }
                    }
                }
            }
            return options;
        },

        getMetadataDataStores : function() {
            return metadataCache ? metadataCache.dataStores || {} : {};
        },

        canUnload : function() {
            return !this.view || (this.view && this.view.canUnload && this.view.canUnload());
        },

        _filterOptionsForContext : function(options) {
            // if the view has a context, remove any filters not valid in this context
            if (options && this.view) {
                var filterSubset = {}, key, filterSetting, i, filterSettingVal, viewContextId = this.view.getViewContextIdentifier();
                for (key in options) {
                    if (key && options.hasOwnProperty(key)) {
                        filterSetting = options[key];
                        // any non-numeric value other than "on" assumes a matching view context is required
                        // if the setting is none, it implies the view context should be null
                        if ((filterSetting === "_NONE_" && viewContextId === null) || (filterSetting === viewContextId)) {
                            filterSubset[key] = "on";
                        }
                        else if (filterSetting !== null && filterSetting !== undefined) {
                            if ($.isArray(filterSetting) && filterSetting.length > 0) {
                                for (i = 0; i < filterSetting.length; i++) {
                                    filterSettingVal = filterSetting[i];
                                    if (filterSettingVal !== null && filterSettingVal !== undefined
                                        && (typeof filterSettingVal === "number" || filterSettingVal === true || filterSettingVal.toLowerCase() === "on" || String(filterSettingVal) === viewContextId)) {
                                        filterSubset[key] = "on";
                                        break;
                                    }
                                }
                            }
                            else if (typeof filterSettingVal === "number" || filterSetting === true || filterSetting.toLowerCase() === "on" || String(filterSetting) === viewContextId) {
                                filterSubset[key] = "on";
                            }
                        }
                    }
                }
                return filterSubset;
            }
            return options;
        },

        getViewWidgetMetadata : function(widgetKey) {
            var meta = this.getViewMetadata();
            if (this.view && this.view.getViewContext()) {
                widgetKey += this.view.getViewContextPostfix();
            }
            return widgetKey && meta && meta.widgets && meta.widgets[widgetKey] ? meta.widgets[widgetKey] : false;
        },

        getViewWidgets : function() {
            return this.view && this.view.getWidgets ? this.view.getWidgets() : null;
        },

        getViewExportConfig : function(filters) {
            // TODO this can be overridden with custom values
            // if no values are provided, the defaults are used

            var title = metadataCache ? metadataCache.title : this.viewTitle,
                fileName = this.getViewTitle();

            // only decode and convert to a text string if we know this markup is safe
            if (this.titlesContainSafeMarkup === true) {
                title = $("<span/>").append(templateUtil.htmlDecode(title, "text")).text();
                fileName = $("<span/>").append(templateUtil.htmlDecode(fileName, "text")).text();
            }

            return {
                title : title,     // the title of the export
                fileName : fileName,  // {fileName}_DATE.xlsx
                header : "",    // header shown below logo
                sheetTitle : "Data" // the title of the sheet
            };
        },

        getWidgetValueMap : function(allValues, allContainerViews, encode, includeFilters) {
            var widgetValueMap = {},
                widgets = this.getViewWidgets();
            
            if (this.view && this.view.getBoundPropertyMap) {
                this._addDataStorePropMapToValueMap(this.view.getBoundPropertyMap(), widgetValueMap, encode);
            }
            
            if (widgets && widgets.length > 0) {
                var i = 0, widget, vals, val, key, valueProp, labelProp, widgetData, widgetContainerMap = {},
                    valMapper = function(curr) {
                        if (val) {
                            val += ",";
                        }
                        val += encode ? encodeURIComponent(curr) : curr;
                    };
                for (i; i < widgets.length; i++) {
                    widget = widgets[i];
                    // hidden widgets will remain hidden in print
                    if (widget && widget.printPreserveVisibility) {
                        widgetValueMap[widget._key + "_visible"] = !widget.isHidden();
                    }
                    if (widget && widget._key && (!widget.isViewContainer || (widget.isViewContainer && widget.singleWidgetVisible !== false))) {
                        if (widget.widgetContainer) {
                            widgetContainerMap[widget._key] = widget.widgetContainer;
                        }

                        if (widget.dataStore && widget.dataStore.getBoundPropertyMap) {
                            // note these do not need to be encoded since they are encoded from the datastore
                            this._addDataStorePropMapToValueMap(widget.dataStore.getBoundPropertyMap(), widgetValueMap, false);
                        }
                        if (widget.getSelectedValue || (allValues && !widget.isViewContainer && widget.getAllValues) ||
                            (allContainerViews && widget.isViewContainer && widget.getAllValues)) {
                            if ((allValues && !widget.isViewContainer && widget.getAllValues) ||
                                (allContainerViews && widget.isViewContainer && widget.getAllValues)) {
                                vals = widget.getAllValues();
                                val = "";
                                vals.map(valMapper);
                            }
                            else {
                                val = encode ? encodeURIComponent(widget.getSelectedValue()) : widget.getSelectedValue();
                            }

                            widgetData = widget.getData ? widget.getData() : [];
                            if ((allValues || allContainerViews) && widgetData && widgetData.length  > 0) {
                                valueProp = widget._getIdProp ? widget._getIdProp() : "id";
                                labelProp = widget._getLabelProp ? widget._getLabelProp() : "label";

                                // add the data and config from the widget itself into the widgets map if there are options to chose from
                                if (!widgetValueMap.widgets) {
                                    widgetValueMap.widgets = {};
                                }

                                // normalize the data props (convert to value/label):
                                widgetValueMap.widgets[widget._key] = this._getWidgetValueMapWidgetConfig(widget, widgetData, valueProp, labelProp, i, val);
                            }
                            else {
                                widgetValueMap[widget._key] = val;
                            }

                        }
                        if (includeFilters && widget.getFilterValues) {
                            var widgetValueMapFilterValues = formUtil.convertMapToQuery(widget.getFilterValues(), "", encode);
                            widgetValueMap[widget._key + "_filters"] =
                                encode ? encodeURIComponent(widgetValueMapFilterValues) : widgetValueMapFilterValues;
                        }
                    }
                }

                // check to see if any widgets have containers in the map and if they do make sure their container is visible
                for (key in widgetValueMap) {
                    if (key && widgetContainerMap[key] && widgetValueMap[widgetContainerMap[key]] !== key) {
                        delete widgetValueMap[key];
                        if (widgetValueMap.widgets && widgetValueMap.widgets[key]) {
                            delete widgetValueMap.widgets[key];
                        }
                    }
                }
            }
            return widgetValueMap;
        },

        getViewStateMap : function() {
            return this.view && this.view.getStateMap ? this.view.getStateMap() || {} : {};
        },

        _getWidgetValueMapWidgetConfig : function(widget, widgetData, valueProp, labelProp, index, value) {
            return {
                index : index,
                label : widget._getPromptLabel ? widget._getPromptLabel() : widget.title || "Select",
                data : widgetData.map(function(item) {
                    return {value : item ? item[valueProp] : null, label : item ? item[labelProp] : ""};
                }),
                isViewContainer : widget.isViewContainer === true,
                value : value
            };
        },

        _addDataStorePropMapToValueMap : function(dataStorePropMap, valueMap, encode) {
            if (dataStorePropMap) {
                var key;
                for (key in dataStorePropMap) {
                    if (key && valueMap[key] === undefined && dataStorePropMap[key] !== undefined && dataStorePropMap[key] !== null) {
                        valueMap[key] = encode ? encodeURIComponent(dataStorePropMap[key]) : dataStorePropMap[key];
                    }
                }
            }
        },

        getViewWidgetExportLandscape : function(allValues, allContainerViews) {
            // for now defaulting to landscape when more than EXPORT_MAX_GRID_COLS_PORTRAIT columns are in a grid
            // TODO this may need more sophisticated logic down the road based on other widget types
            var widgets = this.getViewWidgets();
            if (widgets && widgets.length > 0) {
                var i = 0, widget, widgetVisible, container;
                for (i; i < widgets.length; i++) {
                    widget = widgets[i];
                    if (widget && ((allValues && widget.pdfLayoutLandscapeAll) ||
                        (widget.getColumnCount && widget.getColumnCount() > EXPORT_MAX_GRID_COLS_PORTRAIT))) {
                        widgetVisible = true;
                        if (widget.getContainer) {
                            // TODO may need to trace up the hierarchy if we have multiple levels of containers
                            container = widget.getContainer();
                            if (!allContainerViews && container && container.isSingleWidgetVisible && container.isSingleWidgetVisible()
                                && container.getSelectedWidget && container.getSelectedWidget() !== widget) {
                                widgetVisible = false;
                            }
                        }
                        if (widgetVisible) {
                            return true;
                        }
                    }
                }
            }
            return false;
        },

        getViewWidgetExportMap : function(widgetName) {
            var widgets = this.getViewWidgets(),
                exportMap = {};
            if (widgets && widgets.length > 0) {
                var i = 0, curr,
                    ctxPostfix = this.view && this.view.getViewContextPostfix ?  this.view.getViewContextPostfix() : "";
                for (i; i < widgets.length; i++) {
                    curr = widgets[i];
                    if (curr && curr._key && curr._type && EXPORTABLE_WIDGET_TYPES[curr._type]
                        && (!widgetName || (widgetName && curr._key === widgetName))) {

                        var widgetExportMap = {},
                            serviceUrl = curr.dataStore.serviceUrl || "",
                            querySeparatorIndex = serviceUrl.indexOf("?"),
                            servicePathParamIndex = querySeparatorIndex === -1 ? serviceUrl.length : querySeparatorIndex,
                            servicePath = servicePathParamIndex >= 0 ? serviceUrl.substring(0, servicePathParamIndex) : "",
                            queryPath = servicePathParamIndex >= 0 && serviceUrl.length > servicePathParamIndex
                                ? serviceUrl.substring(servicePathParamIndex + 1) : "",
                            pathParams = servicePath ? servicePath.match(templateUtil.PLACEHOLDER_PATTERN) : null,
                            queryParams = queryPath ? queryPath.match(templateUtil.PARAMETER_PATTERN) : null,
                            boundPropMap = curr.dataStore.getBoundPropertyMap() || {},
                            filters = curr.getFilterValues ? curr.getFilterValues() : null,
                            j;

                        // process path params first
                        if (pathParams && pathParams.length > 0) {
                            var pathParam;
                            for (j = 0; j < pathParams.length; j++) {
                                pathParam = templateUtil.stripPlaceholders(pathParams[j]);
                                if (pathParam) {
                                    widgetExportMap["$" + (j + 1)] = boundPropMap[pathParam] || "";
                                }
                            }
                        }
                        if (filters && !$.isEmptyObject(filters)) {
                            var filterKey;
                            for (filterKey in filters) {
                                widgetExportMap["$filter." + filterKey] = filters[filterKey];
                            }
                        }

                        // now process query params
                        if (queryParams && queryParams.length > 0) {
                            var queryParam, equalsIndex, param;
                            for (j = 0; j < queryParams.length; j++) {
                                queryParam = queryParams[j];
                                if (queryParam) {
                                    equalsIndex = queryParam.indexOf("=");
                                    if (equalsIndex > 0 && queryParam.length > equalsIndex) {
                                        param = templateUtil.stripPlaceholders(queryParam.substring(equalsIndex + 1));
                                        if (param) {
                                            widgetExportMap[queryParam.substring(0, equalsIndex)] = boundPropMap[param];
                                        }
                                    }
                                }
                            }
                        }
                        // remove the context from the widget name
                        exportMap[curr._key.replace(ctxPostfix, "")] = widgetExportMap;
                    }
                }
            }
            return exportMap;
        },

        getViewDomNode : function() {
            return this.view ? this.view.getDomNode() : null;
        },

        getViewTitle : function() {
            return this.viewTitle;
        },

        setViewTitle : function(viewTitle) {
            this.viewTitle = viewTitle;
            // kind of a shim for now...
            this.notifyParentController("shouldSetTopViewControllerTitle", this);
        },

        getSubTitle : function() {
            return this.subTitle;
        },

        setSubTitle : function(subTitle) {
            this.subTitle = subTitle;
            this.notifyParentController("shouldSetTopViewControllerSubTitle", this);
        },

        setStartupWidgetData : function(startupWidgetData) {
            this.startupWidgetData = startupWidgetData;
            if (this.view && this.view.setStartupWidgetData) {
                this.view.setStartupWidgetData(startupWidgetData);
            }
        },

        createView : function(options) {
            if (options && options.containerNode) {
                this.containerNode = options.containerNode;
            }
            if (!this.viewConstructor) {
                this.viewConstructor = _MetadataDrivenView;
            }
            if (this.viewConstructor) {
                var opts = this.getViewOptions() || {};
                opts.delegate = this;
                opts.viewId = this.viewId;
                opts.title = this.viewTitle;
                opts.singleNotificationVisible = this.singleNotificationVisible;
                opts.deepLinkParams = this.deepLinkParams;
                if (this.viewContext) {
                    opts.viewContext = this.viewContext;
                }
                if (this.startupWidgetData) {
                    opts.startupWidgetData = this.startupWidgetData;
                }
                this.view = new this.viewConstructor(opts, this.containerNode);
            }
        },

        notifyParentController : function(ctx) {
            if (this.parentViewController && this.parentViewController[ctx] && this.parentViewController[ctx].apply) {
                this.parentViewController[ctx].apply(this.parentViewController, Array.prototype.slice.call(arguments, 1));
            }
        },

        setContainerNode : function(containerNode) {
            this.containerNode = containerNode;
            if (this.view) {
                this.view.place(containerNode);
            }
        },

        getViewContext : function() {
            if (this.view && this.view.getViewContext) {
                return this.view.getViewContext();
            }
            return this.viewContext;
        },

        getViewOptions : function() {
            return {};
        },

        didChangeInput : function(inputName, newValue) {
            analytics.inputChange(this.breadcrumbTitle, inputName, newValue);
        },

        getData : function(model, method, params) {
            // TODO
            if (model && model[method]) {
                return model[method](params);
            }
            // just in case:
            return {
                done : function() {},
                fail : function() {}
            };
        },

        shouldExcelExport : function() {
            var args = Array.prototype.slice.call(arguments);
            args.unshift("shouldExcelExport");
            this.notifyParentController.apply(this, args);
        },

        handleDataLoadError : function(msg) {
            // TODO
            if (this.view) {
                if (msg) {
                    this.view.showNotification(msg === true ? notificationUtil.getErrorMessageGeneric() : msg, "error", true);
                }
            }
        },

        showNotification : function() {

            if (this.view) {
                this.view.showNotification.apply(this.view, arguments);
            }
        },

        hideNotification : function() {
            if (this.view) {
                this.view.hideNotification.apply(this.view, arguments);
            }
        },

        reset : function() {
            if (this.view && this.view.reset) {
                this.view.reset();
            }
        },

        destroy : function() {
            if (this.subviews && this.subviews.length > 0) {
                var i = 0, curr;
                for (i; i < this.subviews.length; i++) {
                    curr = this.subviews[i];
                    if (curr && curr.destroy) {
                        curr.destroy();
                        curr = null;
                    }
                }
                this.subviews = null;
            }
            if (this.view) {
                this.view.destroy();
            }
            this.containerNode = null;
            this.view = null;
        }


    });
});