define([
    "jquery",
    "common-ui/views/_View",
    "common-ui/widgets/utils/metadataUtil",
    "common-ui/models/utils/widgetDataUtil",
    "common-ui/models/DataStore",
    "common-ui/widgets/utils/formUtil",
    "common-ui/widgets/utils/templateUtil",
    "common-ui/widgets/utils/topic"
], function($, _View, metadataUtil, widgetDataUtil, DataStore, formUtil, templateUtil, topic) {

    "use strict";

    var widgetRegistry = {},
        dataStoreRegistry = {},
        widgetMetadataDirectory = {},
        deferredWidgetEventHandlerMap = {},
        deferredDataSetPrimaryMap = {},
        defaultWidgetProperties = {},
        targetValueMap = {},
        targetValueConfigMap = {},
        targetValueSourceWidgetMap = {},
        startupParams = {},
        clonedWidgetCount = 0,
        globalFixtures = false,
        reactUtil = null,
        QUERY_PARAMS_NAME = "queryParams",
        WIDGET_EXCEL_EXPORT_EVENT = "excelExport",
        BINDABLE_VIEW_PROPERTIES = ["title", "subTitle"],
        VIEW_CONTAINER_SINGLE_SELECT_WIDGETS = {
            ProgrammaticContainer : true,
            SelectionListContainer : true,
            ToggleBarContainer : true,
            ToggleBar : true,
            WizardContainer : true
        };

    return _View.extend({

        widgetMetadata : null,
        dataStoreMetadata : null,
        widgets : null,

        NAV_WIDGET_TYPES : {
            DateTimePicker : true,
            SelectionList : true,
            Select : true,
            Slider : true,
            Button : true
        },

        NO_LAYOUT_WIDGET_TYPES : {
            DataSet : true
        },

        // smartPropertyBinding: Boolean
        //      check the dependencies of the widget we're binding placeholders for to see if those dependencies
        //      are also dependant on the widget that just changed (implying they will change very soon)
        //      TODO this is still in beta and can be too aggressive in some cases causing data not to load
        smartPropertyBinding : true,

        // smartPropertyBindingDelta: Boolean
        //      smartPropertyBinding behavior is only applied if there was a change in the value that triggered the
        //      change event. this means that drilling on/selecting the same item or row will not trigger any change
        smartPropertyBindingDelta : true,

        viewTemplate : "<div><div data-attach-point='widgets' class='view-widgets'></div></div>",

        // viewContext: Object|String|Number
        //      any context associated with this view to allow it to be reused with different contexts; this can be bound to in widget service urls
        //      NOTE: this is static and can only be set on initialization since it is used as a postfix for all contained widget names
        viewContext : null,

        // viewContextIdentifierPath: String
        //      if the view context is an object, this represents a path (e.g. myval.id) to traverse on that object
        //      to retrieve a string representation of the view context
        viewContextIdentifierPath : "",

        // widgetAttachPoint: String
        //      the name of the attach point used for adding widgets
        widgetAttachPoint : "widgets",

        // inputWidgetAnalyticsTriggers: Object
        //      a hash map of widget names that will trigger analytics input change events; key is widget type, value is event name
        inputWidgetAnalyticsTriggers : {
            SelectionList : "change",
            Select : "change",
            Button : "click"
        },

        // filterAndSortPreservationWidgetTypeMap: Object
        //      a has map of widget type names that sort and filters will be auto-preserved within their data stores unless specified otherwise in
        //      each widget's widgetData
        filterAndSortPreservationWidgetTypeMap : {
            GridTable : true,
            ChartGrid : true
        },

        // deepLinkParams: Object
        //      a map of parameters that will be included as query string params on the url for this view
        deepLinkParams : null,

        init : function() {
            this._super.apply(this, arguments);
            this._key = this.viewId;
            widgetRegistry[this.viewId] = this;
            this._processDeferredWidgetEventHandlers(this.viewId);
        },

        setMetadata : function(metadata, dataStoreMetadata, startupParamsLocal) {
            if (dataStoreMetadata) {
                this.dataStoreMetadata = dataStoreMetadata || {};
            }
            if (startupParamsLocal) {
                startupParams = startupParamsLocal || {};
            }
            if (metadata) {
                if (String(metadata.noScorecard).toLowerCase() === "true") {
                    this._noScorecard = true;
                }
                if (String(metadata.hideLoadingIndicator).toLowerCase() === "true") {
                    this.hideLoadingIndicator = true;
                }
                // mixin view context if provided
                if (metadata.viewContext) {
                    this.viewContext = metadata.viewContext;
                }
                if (metadata.viewContextIdentifierPath) {
                    this.viewContextIdentifierPath = metadata.viewContextIdentifierPath;
                }
                // process each of the bindable properties
                var i = 0, curr, hasViewContext = this.getViewContext(), contextPostfix = this.getViewContextPostfix();
                for (i; i < BINDABLE_VIEW_PROPERTIES.length; i++) {
                    curr = BINDABLE_VIEW_PROPERTIES[i];
                    this[curr] = hasViewContext && contextPostfix ? (metadata[curr + contextPostfix] || metadata[curr]) :
                    metadata[curr] || "";
                }
                this.widgetMetadata = metadata.widgets || {};

                // process target values specified at the top level only once in the navigation view
                if (metadata.targetValues && this.isNavigation) {
                    this._processTargetValues(metadata.targetValues);
                }

                this._processStartupParams();
                this._renderWidgets();
                if (metadata.widgetBindings) {
                    this._processWidgetBindings(metadata.widgetBindings, this);
                }
            }
        },

        setStartupWidgetData : function(startupWidgetData) {
            this.startupWidgetData = startupWidgetData;
            if (startupWidgetData) {
                var widgets = this.getWidgets(), widget, value, i;
                if (widgets && widgets.length > 0) {
                    for (i = 0; i < widgets.length; i++) {
                        widget = widgets[i];
                        if (widget && widget.dataStore) {
                            value = startupWidgetData[widget._key];
                            // preselect the value in the widget but prevent it from dispatching change events
                            if (value && widget.setValue) {
                                widget.setValue(value, false, true);
                            }
                            // now inject the values into the widget's data store
                            this._bindDataStoreStartupPropertiesAndFilters(widget.dataStore, startupWidgetData, widget.dataStore.urlProp, false);
                        }
                    }
                    // bind local properties like title and sub title
                    if (this.bindProperties) {
                        for (i = 0; i < BINDABLE_VIEW_PROPERTIES.length; i++) {
                            this.bindProperties(startupWidgetData, BINDABLE_VIEW_PROPERTIES[i]);
                        }
                    }
                }


                // also handle any widget bindings associated with widget's in the startup widget data
                var startupWidgetKey;
                for (startupWidgetKey in startupWidgetData) {
                    if (startupWidgetKey && startupWidgetData[startupWidgetKey]) {
                        widget = this.getWidget(startupWidgetKey);
                        if (widget && widget.dispatchEvent) {
                            widget.dispatchEvent("changeStartupWidgetData", startupWidgetData[startupWidgetKey]);
                        }
                    }
                }
                this.startupWidgetData = null;
            }
        },

        _bindDataStoreStartupPropertiesAndFilters : function(dataStore, widgetData, urlProp, force) {
            if (widgetData && dataStore && (force || this._dataStoreHasDataForAllBoundProperties(dataStore, widgetData))) {
                var filterKey = dataStore.widgetKey ? dataStore.widgetKey + "_filters" : null,
                    filters = filterKey && widgetData[filterKey] ? formUtil.convertQueryToMap(widgetData[filterKey]) : null;
                dataStore.bindProperties(widgetData, urlProp, false, null, filters, true);
                return true;
            }
            return false;
        },

        _processStartupParams : function() {
            // see if the app is in print mode and startup params were provided
            if (startupParams && this.widgetMetadata && (window.Modernizr.printlayout || startupParams._deepLink)) {
                // see if any params have multiple values
                var param, val, vals, widget, widgetMetadata, currVal, boundWidgets, boundWidget, newWidget, newWidgetIndex, newWidgetKey, i, j;
                for (param in startupParams) {
                    // see if there is a widget in this view matching this param name
                    if (param && this.widgetMetadata[param]) {
                        widget = this.widgetMetadata[param];
                        if (widget) {
                            val = templateUtil.decodeParam(startupParams[param], true);
                            vals = val.split(",");

                            // if we are specifying 1 or more children that should be visible in a view container, remove the other children
                            if (VIEW_CONTAINER_SINGLE_SELECT_WIDGETS[widget.widgetType]) {
                                if (!widget.widgetProperties) {
                                    widget.widgetProperties = {};
                                }
                                widget.widgetProperties.singleWidgetVisible = false;
                                this._removeNonVisibleViewContainerWidgets(param, vals);
                                // TODO by doing this we are losing the titles from the view container controls identifying each section
                            }
                            else {
                                // when we encounter multiple values...
                                if (vals && vals.length > 0) {
                                    // for standard widgets, we need to clone the filter widget and all widgets bound to it
                                    boundWidgets = this._getBoundWidgets(param);
                                    for (i = 0; i < vals.length; i++) {
                                        currVal = vals[i];
                                        // update the startup params for the initial widget instance
                                        if (!i) {
                                            startupParams[param] = currVal;
                                        }
                                        // now clone that widget n times and all of its properties and data
                                        else {
                                            newWidgetKey = param + "__" + i;
                                            newWidgetIndex = ((widget.index || 0) + i) * 1000;
                                            startupParams[newWidgetKey] = currVal;
                                            this._cloneWidget(widget, param, newWidgetKey, newWidgetIndex, true);

                                            // process all of the widgets that are bound to this one and clone them
                                            if (boundWidgets && boundWidgets.length > 0) {
                                                for (j = 0; j < boundWidgets.length; j++) {
                                                    boundWidget = boundWidgets[j];
                                                    if (boundWidget) {
                                                        newWidget = this._cloneWidget(boundWidget, boundWidget._key, boundWidget._key + "__" + i + "_" + (j + 1),
                                                            newWidgetIndex + ((boundWidget.index || 0) + (j / 1000)) * 100);
                                                        // now replace the service url
                                                        this._renameWidgetServiceUrlParam(newWidget, param, newWidgetKey);
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                    // only process startup target value props once in the navigation view
                    else if (param && param.indexOf("@") === 0 && this.isNavigation) {
                        var targetParamVals = param.split("."),
                            targetParamName = targetParamVals[0],
                            targetParamVal = templateUtil.decodeParam(startupParams[param]);
                        
                        if (targetValueMap[targetParamName] === undefined || targetValueMap[targetParamName] === null) {
                            targetValueMap[targetParamName] = targetParamVals.length === 1 ? targetParamVal : {};
                        }
                        if (targetParamVals && targetParamVals.length > 1) {
                            var targetParamValIdx = 1, targetParamValItem, ptr = targetValueMap[targetParamName];
                            for (targetParamValIdx; targetParamValIdx < targetParamVals.length; targetParamValIdx++) {
                                targetParamValItem = targetParamVals[targetParamValIdx];
                                if (ptr[targetParamValItem] === null || ptr[targetParamValItem] === undefined) {
                                    ptr[targetParamValItem] = targetParamValIdx === targetParamVals.length - 1
                                        ? targetParamVal : {};
                                }
                                ptr = ptr[targetParamValItem];
                            }
                        }
                    }
                    else if (param && param.indexOf(".") > 0) {
                        // see if there is a label value provided for a filter meaning it did not have a data store
                        // in this case we will just hardcode the dataset to the one provided from the request
                        var paramVals = param.split("."),
                            paramName = paramVals[0];

                        if (paramName && this.widgetMetadata[paramName] && paramVals.length > 1) {
                            if (!this._widgetData) {
                                this._widgetData = {};
                            }

                            var widgetDataVal = null;
                            if (startupParams[paramName]) {
                                if (this._widgetData[paramName] && this._widgetData[paramName].length === 1) {
                                    // there will only be one value in the dataset for this param name, we can grab it and append the new property
                                    widgetDataVal = this._widgetData[paramName][0];
                                }

                                if (!widgetDataVal) {
                                    widgetMetadata = this.widgetMetadata[paramName];
                                    var valueProp = (widgetMetadata && widgetMetadata.widgetProperties && widgetMetadata.widgetProperties.valueProp)
                                        ? widgetMetadata.widgetProperties.valueProp : "id";
                                    widgetDataVal = {};
                                    widgetDataVal[valueProp] = decodeURIComponent(startupParams[paramName]);
                                    this._widgetData[paramName] = [
                                        widgetDataVal
                                    ];
                                }
                            }
                            else {
                                if (!this._widgetData[paramName]) {
                                    widgetDataVal = {};
                                    this._widgetData[paramName] = widgetDataVal;
                                }
                                else {
                                    widgetDataVal = this._widgetData[paramName];
                                }
                            }

                            // now append the new param
                            widgetDataVal[paramVals[1]] = templateUtil.decodeParam(startupParams[param]);
                        }
                    }
                    else if (param && param.indexOf("_filters") > 0) {
                        var filterVals = templateUtil.decodeParam(startupParams[param]);
                        this._presetWidgetFilters(param.replace("_filters", ""), filterVals);
                    }
                    else if (param && param.indexOf("_visible") > 0) {
                        var widgetName = param.replace("_visible", "");
                        widgetMetadata = this.widgetMetadata[widgetName];
                        if (widgetMetadata) {
                            if (!widgetMetadata.widgetProperties) {
                                widgetMetadata.widgetProperties = {};
                            }
                            widgetMetadata.widgetProperties.hidden = String(startupParams[param]) !== "true";
                        }
                    }
                }
            }
        },

        _presetWidgetFilters : function(widgetKey, filterQueryString) {
            if (widgetKey && filterQueryString) {
                var widgetMeta = this.widgetMetadata[widgetKey];
                if (widgetMeta) {
                    if (!widgetMeta.widgetData) {
                        widgetMeta.widgetData = {};
                    }
                    if (!widgetMeta.widgetProperties) {
                        widgetMeta.widgetProperties = {};
                    }
                    var filterProps = formUtil.convertQueryToMap(filterQueryString);
                    // add into both the widget properties and data
                    widgetMeta.widgetProperties.filterValues = filterProps;
                    widgetMeta.widgetData.filterValues = $.extend({columns : true}, filterProps);
                }
            }
        },

        _removeNonVisibleViewContainerWidgets : function(containerWidgetName, visibleContainerWidgets) {
            var widgetKey, visibleContainerWidgetMap = visibleContainerWidgets.reduce(function(map, widget) {
                map[widget] = true;
                return map;
            }, {});
            // look through all widgets and remove those who are not supposed to be visible based on the requested visible views for the container
            for (widgetKey in this.widgetMetadata) {
                if (widgetKey && this.widgetMetadata[widgetKey] && this.widgetMetadata[widgetKey].container === containerWidgetName && !visibleContainerWidgetMap[widgetKey]) {
                    // if the widget we are about to remove is a container, recursively call this function to remove its children
                    this._removeNonVisibleViewContainerWidgets(widgetKey, []);
                    delete this.widgetMetadata[widgetKey];
                }
            }
        },

        _cloneWidget : function(widget, oldWidgetKey, newWidgetKey, newWidgetIndex, createSharedDataStore) {
            var newWidget;
            if (widget && newWidgetKey) {
                newWidget = this.widgetMetadata[newWidgetKey] = {
                    _key : newWidgetKey,
                    index : newWidgetIndex,
                    widgetType : widget.widgetType,
                    container : widget.container,
                    widgetProperties : $.extend({}, widget.widgetProperties),
                    widgetEvents : $.extend({}, widget.widgetEvents)
                };
                // copy the widget data
                if (widget.widgetData) {
                    if (createSharedDataStore) {
                        newWidget.widgetData = {};
                        // if we have a data store, we are good, otherwise create one so it can be shared
                        if (!widget.widgetData.dataStore) {
                            var dataStoreName = oldWidgetKey + "Store";
                            this.dataStoreMetadata[dataStoreName] = widget.widgetData;
                            delete widget.widgetData;
                            widget.widgetData = {
                                dataStore : dataStoreName
                            };
                        }
                        newWidget.widgetData.dataStore = widget.widgetData.dataStore;
                    }
                    else {
                        newWidget.widgetData = $.extend({}, widget.widgetData);
                    }
                    // start applying some latency to give the server a break but not beyond 20ms otherwise print will think load is done
                    newWidget.widgetData.latency = Math.min(clonedWidgetCount++, 20);
                }
            }
            return newWidget;
        },

        _getBoundWidgets : function(widgetName) {
            var boundWidgets = [];
            if (widgetName && this.widgetMetadata) {
                var key, widget, serviceUrl;
                for (key in this.widgetMetadata) {
                    if (key && key !== widgetName && this.widgetMetadata[key]) {
                        widget = this.widgetMetadata[key];
                        if (widget.widgetData) {
                            serviceUrl = null;
                            // determine the service url for the widget
                            if (widget.widgetData.dataStore && this.dataStoreMetadata[widget.widgetData.dataStore]) {
                                serviceUrl = this.dataStoreMetadata[widget.widgetData.dataStore].serviceUrl;
                            }
                            else {
                                serviceUrl = widget.widgetData.serviceUrl;
                            }
                            // now test the service url to see if it is bound to the widget in question
                            if (serviceUrl && serviceUrl.indexOf("${" + widgetName + ".") > 0) {
                                widget._key = key;
                                boundWidgets.push(widget);
                            }
                        }
                    }
                }
            }
            return boundWidgets;
        },

        _renameWidgetServiceUrlParam : function(widget, oldParam, newParam) {
            if (widget && widget.widgetData && oldParam && newParam) {
                var widgetData = widget.widgetData;
                if (widgetData.dataStore && this.dataStoreMetadata[widgetData.dataStore]) {
                    widgetData = this.dataStoreMetadata[widgetData.dataStore];
                }
                if (widgetData && widgetData.serviceUrl) {
                    widgetData.serviceUrl =
                        widgetData.serviceUrl.replace(new RegExp("\\${" + oldParam + ".", 'g'), "${" + newParam + ".");
                }
            }
            return widget;
        },

        setGlobalFixtures : function(globalFixturesEnabled) {
            globalFixtures = globalFixturesEnabled;
        },

        setDefaultWidgetProperties : function(props) {
            defaultWidgetProperties = props;
        },

        getDefaultWidgetProperties : function(widgetType) {
            if (widgetType) {
                return $.extend(true, {}, defaultWidgetProperties[widgetType]);
            }
            return defaultWidgetProperties;
        },

        getViewContext : function() {
            // returns the viewContext; can be overridden to do something more complex
            return this.viewContext;
        },

        getViewContextIdentifier : function() {
            // this must return a globally unique String|Number representation of the view context to be used as a postfix for widget names within this context
            // NOTE you must override this method if your view context is an object
            if (this.viewContext && typeof this.viewContext === "object") {
                if (this.viewContextIdentifierPath === "") {
                    this.viewContext = "";
                }
                else if (this.viewContextIdentifierPath) {
                    this.viewContext = templateUtil.getPropertyValue(this.viewContextIdentifierPath, this.viewContext);
                }
                else if (window.console && typeof window.console.error === "function") {
                    console.error("ERROR: you have specified a non-primitive view context for " + (this.title || this.viewId) +
                        ". Either specify a viewContextIdentifierPath or the view class must override getViewContextIdentifier to return a globally unique String or numeric representation");
                }
            }
            return this.viewContext ? String(this.viewContext) : null;
        },

        getViewContextPostfix : function() {
            // this must return a globally unique String|Number representation of the view context to be used as a postfix for widget names within this context
            // NOTE you must override this method if your view context is an object
            this.viewContextIdentifier = this.viewContextIdentifier || this.getViewContextIdentifier();
            return this.viewContextIdentifier ? "-" + this.viewContextIdentifier : null;
        },

        getWidget : function(widgetKey) {
            var ctxWidgetKey = this._appendWidgetContextPostfix(widgetKey);
            if (widgetRegistry) {
                if (widgetRegistry[ctxWidgetKey]) {
                    return widgetRegistry[ctxWidgetKey];
                }
                else if (widgetRegistry[widgetKey]) {
                    return widgetRegistry[widgetKey];
                }
            }
        },

        getWidgets : function() {
            return this.widgets || [];
        },

        getWidgetsByType : function(type) {
            var i = 0, curr, typedWidgets = [];
            if (this.widgets && this.widgets.length > 0) {
                for (i; i < this.widgets.length; i++) {
                    curr = this.widgets[i];
                    if (curr && curr._type === type) {
                        typedWidgets.push(curr);
                    }
                }
            }
            return typedWidgets;
        },

        setWidgetData : function(widgetKey, data, selectedValue, append, isError) {
            widgetKey = this._appendWidgetContextPostfix(widgetKey);
            if (!this._widgetData) {
                this._widgetData = {};
            }

            var dataToSet = data;
            if (!isError) {
                if (this.widgetMetadata && widgetKey && this.widgetMetadata[widgetKey] && this.widgetMetadata[widgetKey].widgetData) {
                    dataToSet = widgetDataUtil.extractWidgetData(this.widgetMetadata[widgetKey].widgetData,
                        data, widgetDataUtil.getWidgetMapperContext(this.getWidget(widgetKey)));
                }
                if (!append) {
                    this._widgetData[widgetKey] = dataToSet;
                }
            }

            if (widgetRegistry && widgetRegistry[widgetKey]) {
                var widget = widgetRegistry[widgetKey];
                if (widget.setLoading) {
                    widget.setLoading(false);
                }
                if (widget.updateData) {
                    widget.updateData(dataToSet, selectedValue, append, isError);
                }
            }
        },

        getWidgetData : function(widgetKey) {
            widgetKey = this._appendWidgetContextPostfix(widgetKey);
            return this._widgetData ? this._widgetData[widgetKey] : null;
        },

        getWidgetDataStore : function(widgetKey) {
            widgetKey = this._appendWidgetContextPostfix(widgetKey);
            var widget = this.getWidget(widgetKey);
            if (widget && widget.dataStore) {
                return widget.dataStore;
            }
        },

        updateWidgetDataAndShow : function(widgetKey, data, selectedValue) {
            widgetKey = this._appendWidgetContextPostfix(widgetKey);
            this.setWidgetData(widgetKey, data, selectedValue);
            this.toggleWidgetVisible(widgetKey, true);
        },

        toggleWidgetVisible : function(widgetKey, visible) {
            if (widgetKey) {
                widgetKey = this._appendWidgetContextPostfix(widgetKey);
                var visibleMethod = visible ? "show" : "hide";
                var widget = this.getWidget(widgetKey);
                if (widget && widget[visibleMethod]) {
                    widget[visibleMethod]();
                }
            }
        },

        onWidgetsRendered : function() {
            // attach point
        },

        getWidgetConstructorByName : function(widgetType) {
            // this can be overriden to return your own custom widget types as well
            return metadataUtil.getWidgetConstructorByName(widgetType);
        },

        _handleViewTemplateNodesAttached : function() {
            this._super.apply(this, arguments);
            this._renderWidgets();
        },

        _appendWidgetContextPostfix : function(widgetKey) {
            if (this.viewContext && widgetKey && !this.isNavigation) {
                // append the postfix when trying to get a widget within a view with a context if it is not already
                var postfix = this.getViewContextPostfix();
                if (postfix && widgetKey.indexOf(postfix) === -1) {
                    widgetKey += postfix;
                }
            }
            return widgetKey;
        },

        _getInputWidgetAnalyticsChangeHandler : function() {
            return function(widgetName, value, userInitiated) {
                if (userInitiated) {
                    var w = this.getWidget(widgetName);
                    this.notifyDelegate("didChangeInput", widgetName, w && w.getSelectedLabel ? w.getSelectedLabel() : value);
                }
            }.bind(this);
        },

        _getNavWidgetChangeHandler : function() {
            return function(widgetName, value, userInitiated) {
                var widget = this.getWidget(widgetName),
                    val = widget && widget.getSelectedValue ? widget.getSelectedValue() : null,
                    label = widget && widget.getSelectedLabel ? widget.getSelectedLabel() : value;

                if (widgetName && val) {
                    formUtil.updateQueryState(this.getStateMap());
                }

                this.notifyDelegate("shouldSelect" + (widgetName.charAt(0).toUpperCase() + widgetName.substr(1)), value, userInitiated);
                if (userInitiated) {
                    this.notifyDelegate("didChangeFilter", widgetName, label);
                }
            }.bind(this);
        },

        _getWidgetFilterBindingHandler : function(widgetName, filterWidgetName, binding) {
            // handler to select a value in a filter based on the selected value from a widget
            return function(reqWidgetName, value) {
                if (binding) {
                    var extractedValue = templateUtil.getPropertyValue(binding.value || "id", value);
                    if (extractedValue !== null) {
                        var filter = this.getWidget(filterWidgetName),
                            sourceWidgetName = binding.sourceWidgetData,
                            sourceWidgetDataValues;
                        // if the binding.sourceWidgetData === "_value_" || "@value", extract the data from the data dispatched from the event
                        if (sourceWidgetName === "_value_" || sourceWidgetName === "@value") {
                            sourceWidgetDataValues = widgetDataUtil.extractWidgetData(binding, [value],
                                widgetDataUtil.getWidgetMapperContext(filter));
                        }
                        else if (sourceWidgetName) {
                            // widget data can be sourced from the widget name on which the filter binding was applied or any
                            // other widget in existence by name (instead of using true as the value of sourceWidgetData, use the
                            // desired source widget's name)
                            var sourceWidget = this.getWidget(sourceWidgetName === true ? reqWidgetName : sourceWidgetName);
                            if (sourceWidget && sourceWidget.getData) {
                                sourceWidgetDataValues = widgetDataUtil.extractWidgetData(binding, sourceWidget.getData(),
                                    widgetDataUtil.getWidgetMapperContext(filter));
                            }
                        }
                        if (filter) {
                            var idChanged = filter.getSelectedIdentifier && filter.getSelectedIdentifier() !== extractedValue,
                                dataChanged = filter.getData && filter.getData() !== sourceWidgetDataValues;
                            if ((dataChanged || idChanged) && sourceWidgetDataValues && filter.updateData) {
                                filter.updateData(sourceWidgetDataValues, extractedValue, idChanged);
                            }
                            else if (idChanged && filter.setSelectedIdentifier) {
                                filter.setSelectedIdentifier(extractedValue, true);
                            }
                        }
                    }
                }
            }.bind(this);
        },

        _renderWidgets : function() {
            if (!this.widgets && this.widgetMetadata && this.viewAttachPoints && this.viewAttachPoints[this.widgetAttachPoint]) {
                this.widgets = [];

                var i = 0, j, widget, WidgetConstructor, widgetProps, defaultWidgetProps, defaultWidgtDataProps,
                    widgetData, dataStore, widgetEvents, widgetContainer, skipWidget,
                    widgetContainerName, widgetParentContainer, deferredDataStoreBindings = {}, widgetViewContainerWidget,
                    contextPostfix = this.viewContext ? this.getViewContextPostfix() : "",
                    widgets = templateUtil.getSortedWidgetArray(this.widgetMetadata, "index", false, contextPostfix),
                    idx, oldKey, widgetInstance, widgetDataSetHandler, dataSetPrimary,
                    widgetOnLoadErrorHandler = function() {
                        this.notifyDelegate("handleDataLoadError", true);
                    }.bind(this),
                    getView = function() {
                        return this;
                    }.bind(this);

                for (i; i < widgets.length; i++) {
                    widget = widgets[i];
                    if (widget && widget._key && (widget.widgetType || (widget.widgetClone && widgetRegistry[widget.widgetClone]))) {
                        dataStore = null;
                        dataSetPrimary = null;
                        skipWidget = false;
                        if (this.viewContext) {
                            // some widgets may only want to exist in a specific context; check to see if this is one and honor that request
                            if (widget.viewContext) {
                                if (typeof widget.viewContext === "string" && widget.viewContext !== this.getViewContextIdentifier()) {
                                    skipWidget = true;
                                }
                                else if ($.isArray(widget.viewContext) && widget.viewContext.length > 0) {
                                    skipWidget = true;
                                    for (j = 0; j < widget.viewContext.length; j++) {
                                        if (widget.viewContext[j] === this.getViewContextIdentifier()) {
                                            skipWidget = false;
                                            break;
                                        }
                                    }
                                }

                            }
                            if (!skipWidget) {
                                widget._key = this._appendWidgetContextPostfix(widget._key);
                            }
                        }

                        if (!skipWidget) {
                            if (widgetRegistry[widget._key] || widget._key === QUERY_PARAMS_NAME) {
                                if (window.console && typeof window.console.error === "function") {
                                    if (widget._key === QUERY_PARAMS_NAME) {
                                        console.error("ERROR: widgets cannot be named " + QUERY_PARAMS_NAME);
                                    }
                                    else {
                                        console.error("ERROR: duplicate widget key '" + widget._key + "'. Currently all widget keys must be unique across views and filters.");
                                    }
                                }
                                // TODO attempt to destroy before removing ref?
                                delete widgetRegistry[widget._key];
                            }
                            else if (widget.widgetClone && widgetRegistry[widget.widgetClone]) {
                                // grab a copy of the widget from the directory but maintain the index and key from the current
                                idx = widget.index;
                                oldKey = widget._key;
                                widget = widgetMetadataDirectory[widget.widgetClone];
                                widget.index = idx;
                                widget._key = oldKey;
                            }
                            else {
                                // add unique widgets to the directory
                                widgetMetadataDirectory[widget._key] = widget;
                            }

                            WidgetConstructor = this.getWidgetConstructorByName(widget.widgetType);
                            defaultWidgetProps = this.getDefaultWidgetProperties(widget.widgetType);
                            defaultWidgtDataProps = {};
                            // shift targetValues to defaultWidgetDataProps
                            if (defaultWidgetProps.targetValues) {
                                defaultWidgtDataProps.targetValues = defaultWidgetProps.targetValues;
                                delete defaultWidgetProps.targetValues;
                            }

                            // widgetData, widgetProperties, and widgetEvents can be context-bound

                            if (this.viewContext && contextPostfix) {
                                widgetData = widget["widgetData" + contextPostfix] || widget.widgetData;
                                widgetProps = widget["widgetProperties" + contextPostfix] || widget.widgetProperties;
                                widgetEvents = widget["widgetEvents" + contextPostfix] || widget.widgetEvents;
                                widgetContainerName = widget["container" + contextPostfix] || widget.container;
                            }
                            else {
                                widgetData = widget.widgetData;
                                widgetProps = widget.widgetProperties;
                                widgetEvents = widget.widgetEvents;
                                widgetContainerName = widget.container;
                            }

                            // TODO for nested widgets (currently just ChartListToggleBarContainer), overlay default widget props:
                            if (widget.widgetType === "ChartListToggleBarContainer") {
                                defaultWidgetProps.gridProperties = this.getDefaultWidgetProperties("GridTable");
                                defaultWidgetProps.tileProperties = $.extend(true, {}, defaultWidgetProps.gridProperties, this.getDefaultWidgetProperties("ChartGrid"));
                                defaultWidgetProps.chartProperties = this.getDefaultWidgetProperties(widgetProps && widgetProps.chartType ? widgetProps.chartType || "D3BarChart" : "D3BarChart");
                            }

                            widgetData = $.extend(true, defaultWidgtDataProps, widgetData);
                            widgetProps = $.extend(true, defaultWidgetProps, widgetProps);
                            widgetEvents = $.extend(true, {}, widgetEvents);
                            widgetViewContainerWidget = widgetContainerName ? this.getWidget(widgetContainerName) : null;


                            if (this.isModal && this.getScrollContainer) {
                                widgetProps.scrollContainer = this.getScrollContainer();
                            }

                            if (this.viewContext && contextPostfix && widgetData.fixtureUrl && widgetData.fixtureUrl.indexOf("-SELF") > 0) {
                                widgetData.fixtureUrl = widgetData.fixtureUrl.replace(/\-SELF/g, contextPostfix);
                            }
                            if (this.viewContext && contextPostfix && widgetData.serviceUrl && widgetData.serviceUrl.indexOf("-SELF") > 0) {
                                widgetData.serviceUrl = widgetData.serviceUrl.replace(/\-SELF/g, contextPostfix);
                            }
                            if (this.filterAndSortPreservationWidgetTypeMap[widget.widgetType]) {
                                if (widgetData.preserveSort === undefined) {
                                    widgetData.preserveSort = true;
                                }
                                if (widgetData.preserveFilters === undefined) {
                                    widgetData.preserveFilters = true;
                                }
                            }

                            if (widgetViewContainerWidget && widgetViewContainerWidget.getViewContainer) {
                                widgetParentContainer = widgetViewContainerWidget.getViewContainer(widget._key);
                                widgetProps.widgetContainer = widgetContainerName;
                            }
                            else {
                                widgetParentContainer = this.isNavigation && !this.NAV_WIDGET_TYPES[widget.widgetType]
                                && this.attachPoints && this.attachPoints.appWidgets ?
                                    this.attachPoints.appWidgets : this.viewAttachPoints[this.widgetAttachPoint];
                            }

                            widgetContainer = !this.NO_LAYOUT_WIDGET_TYPES || !this.NO_LAYOUT_WIDGET_TYPES[widget.widgetType]
                                ? this.createWidgetContainer(widget._key, widgetParentContainer, widgetProps, widget.index) : null;

                            widgetProps.append = false;

                            // default nav widgets to selection list
                            if (this.isNavigation && !widget.widgetType) {
                                widget.widgetType = "SelectionList";
                            }

                            // check to see if we can set an initial data set now before the widget is created
                            if (widgetData.dataSets && $.isArray(widgetData.dataSets) && widgetData.dataSets.length > 0) {
                                if (widgetData.dataSets.length > 1) {
                                    // dataSets takes priority over dataSet, which will be ignored
                                    delete widgetData.dataSet;

                                    // TODO wire up initial check for datasets
                                }
                                else {
                                    // if we just have 1 data set, relocate the prop to dataSet for simplicity of handling
                                    widgetData.dataSet = widgetData.dataSets[0];
                                    delete widgetData.dataSets;
                                }

                                // if there is only a single dataset, it becomes the primary so we have a reference to its datastore
                                // TODO is this safe to do?
                                if (widgetData.dataSet) {
                                    widgetData.dataSetPrimary = widgetData.dataSet;
                                }

                                // with multiple data sets, one can be designated as the primary that is used for pagination, etc.
                                if (widgetData.dataSetPrimary) {
                                    dataSetPrimary = this.getWidget(widgetData.dataSetPrimary);
                                    if (dataSetPrimary && dataSetPrimary.dataStore) {
                                        dataStore = dataSetPrimary.dataStore;
                                    }
                                    else {
                                        // if the dataset hasn't been created yet, add it to a map and create the association later
                                        if (!deferredDataSetPrimaryMap[widgetData.dataSetPrimary]) {
                                            deferredDataSetPrimaryMap[widgetData.dataSetPrimary] = [];
                                        }
                                        deferredDataSetPrimaryMap[widgetData.dataSetPrimary].push(widget._key);
                                    }
                                }
                            }
                            else if (widgetData.dataSets) {
                                delete widgetData.dataSets;
                            }

                            if (widgetData.type && widgetData.data) {
                                widgetProps.data = widgetDataUtil.extractWidgetData(widgetData, widgetData.data, {widget : widget._key});
                            }
                            else if (widgetData.dataStore && this.dataStoreMetadata && this.dataStoreMetadata[widgetData.dataStore]) {
                                if (dataStoreRegistry[widgetData.dataStore]) {
                                    dataStore = dataStoreRegistry[widgetData.dataStore];
                                }
                                else {
                                    dataStore = this.createWidgetDataStore(widget._key, this.dataStoreMetadata[widgetData.dataStore],
                                        widgetOnLoadErrorHandler, widgetData.dataStore, widget.widgetType);
                                }
                            }
                            else if (widgetData.serviceUrl || widgetData.fixtureUrl || widgetData.watchValues) {
                                // TODO is there any reason a widget needs a ref to its store?
                                dataStore = this.createWidgetDataStore(widget._key, widgetData, widgetOnLoadErrorHandler, null,
                                    widget.widgetType);
                            }
                            else if (widgetProps.data === undefined || widgetProps.data === null) {
                                widgetProps.data = this.getWidgetData(widget._key);
                            }

                            // if there is a default selection for a view container, set it on the widget props
                            if (startupParams && startupParams[widget._key] && VIEW_CONTAINER_SINGLE_SELECT_WIDGETS[widget.widgetType] &&
                                (window.Modernizr.printlayout || startupParams._deepLink)) {
                                // TODO this is prob no longer needed since we filter our the non visible container widgets
                                widgetProps.selectedValue = startupParams[widget._key];
                            }

                            this._processWidgetFilterBindings(widget, widgetData, dataStore);

                            if (dataStore) {
                                // give a ref to the widget
                                widgetProps.dataStore = dataStore;

                                // add the data store to a map so we can bind any placeholders later only if this is not a multi data set situation
                                if (!dataSetPrimary) {
                                    deferredDataStoreBindings[widget._key] = dataStore;
                                }

                                if (dataStore.pageSize) {
                                    widgetProps.pageSize = dataStore.pageSize;
                                }
                            }

                            widgetProps._type = widget.widgetType;
                            widgetProps._key = widget._key;

                            if (WidgetConstructor && WidgetConstructor.react) {
                                if (!reactUtil) {
                                    reactUtil = metadataUtil.getWidgetConstructorByName("reactUtil");
                                }
                                widgetInstance = reactUtil.createWidget(WidgetConstructor.react, widgetProps, widgetContainer[0]);
                            }
                            else {
                                widgetProps.getView = getView;
                                widgetInstance = WidgetConstructor
                                    ? new WidgetConstructor(widgetProps, widgetContainer) : widgetProps;
                            }
                            widgetRegistry[widget._key] = widgetInstance;

                            if (WidgetConstructor && widgetInstance) {
                                if (widgetViewContainerWidget) {
                                    widgetViewContainerWidget.addWidget(widgetInstance);
                                }
                                else {
                                    this.addWidget(widgetInstance);
                                }

                                // bind the excel export event
                                if ((widgetProps.exportable || (widgetProps.gridProperties && widgetProps.gridProperties.exportable)) && widgetInstance.on) {
                                    widgetInstance.on(WIDGET_EXCEL_EXPORT_EVENT, this.notifyDelegate.bind(this, "shouldExcelExport", widget._key));
                                }

                                if ((widgetInstance.dataStore || (widgetViewContainerWidget && widgetViewContainerWidget.dataStore))
                                    && (widgetProps.data === undefined || widgetProps.data === null) && widgetInstance.setLoading) {
                                    widgetInstance.setLoading(true);

                                }
                                if (widgetInstance.dataStore && widgetInstance.dataStore.persistValueChange) {
                                    widgetInstance.on(widgetInstance.dataStore.persistValueChangeEvent || "change",
                                        this._getWidgetDataPersistValueChangeCallback(widgetInstance));
                                }

                            }

                            // TODO safe to store ref on this per widget by key?
                            //this[widget._key] = widgetInstance;
                            this.widgets.push(widgetInstance);

                            if (widgetData.dataSets) {
                                this._connectWidgetDataSetsHandler(widgetData.dataSets, widget._key, widgetData.dataSetPrimary);
                            }
                            else if (widgetData.dataSet) {
                                widgetDataSetHandler = this._connectWidgetEventHandler(widgetData.dataSet, "change",
                                    this._getWidgetDataSetHandler(widget._key));
                                if (widgetDataSetHandler) {
                                    widgetDataSetHandler(true);
                                }
                            }

                            // parse widget bindings
                            this._processWidgetBindings(widget.widgetBindings, widgetInstance);

                            this._connectWidgetEvents(widgetInstance, widgetData);

                            this._processDeferredWidgetEventHandlers(widget._key);

                            this._processDeferredDataSetWidgetConnections(widget._key);
                        }
                    }
                    else {
                        if (window.console && typeof window.console.error === "function") {
                            console.error("ERROR: widgetType must be specified for " + (widget ? widget._key : ""));
                        }
                    }
                }

                if (!this.isModal && !this.isNavigation && this._noScorecard && this.viewAttachPoints && this.viewAttachPoints[this.widgetAttachPoint]) {
                    this.viewAttachPoints[this.widgetAttachPoint].addClass("no-scorecard");
                }

                // TODO consider moving to a separate function
                // wait for all widgets to finish rendering before wiring up data store bindings
                setTimeout(function() {
                    if (deferredDataStoreBindings) {
                        var widgetDataStoreKey, ds, cb, ecb;
                        for (widgetDataStoreKey in deferredDataStoreBindings) {
                            if (widgetDataStoreKey && deferredDataStoreBindings[widgetDataStoreKey]) {
                                ds = deferredDataStoreBindings[widgetDataStoreKey];
                                this._bindWidgetStorePlaceholders(ds, ds.urlProp);

                                /*if (this.isNavigation && widgetInstance._type === DEFAULT_NAV_WIDGET_TYPE) {
                                 // override the widget's show function to trigger the first load of the data store when showing it for the first time
                                 widgetInstance.show = this._getNavFilterShowOverride(widgetInstance.show, dataStore, widget._key);
                                 }
                                 else {*/
                                cb = this._getWidgetOnDataLoadedCallback(widgetDataStoreKey);
                                ecb = this._getWidgetOnDataLoadedCallback(widgetDataStoreKey, true);
                                if (this._dataStoreHasDataForAllBoundProperties(ds, this.startupWidgetData)) {
                                    ds.addCallback(cb, ecb);
                                }
                                else if (ds.loadInitialData) {
                                    ds.loadInitialData().then(cb, ecb);
                                }
                                else if (ds.loadData) {
                                    ds.loadData().then(cb, ecb);
                                }
                                //}
                            }
                        }
                    }
                    // bind view properties
                    for (i = 0; i < BINDABLE_VIEW_PROPERTIES.length; i++) {
                        this._bindWidgetStorePlaceholders(this, BINDABLE_VIEW_PROPERTIES[i], true);
                    }
                }.bind(this), 10);

                this.startupWidgetData = null;
                this.onWidgetsRendered();
            }
        },

        _dataStoreHasDataForAllBoundProperties : function(ds, widgetData) {
            return widgetData && ds && ds.hasDataForAllBoundProperties && ds.hasDataForAllBoundProperties(widgetData);
        },

        _processDeferredWidgetEventHandlers : function(widgetKey) {
            // see if we are waiting for this widget to be created to bind events to it
            if (deferredWidgetEventHandlerMap[widgetKey] && deferredWidgetEventHandlerMap[widgetKey].length > 0) {
                var handlerMap = deferredWidgetEventHandlerMap[widgetKey], cb, j = 0;
                for (j; j < handlerMap.length; j++) {
                    cb = this._connectWidgetEventHandler.apply(this, handlerMap[j]);
                    if (cb) {
                        cb();
                    }
                    handlerMap[j] = null;
                }
                delete deferredWidgetEventHandlerMap[widgetKey];
            }
        },

        _processDeferredDataSetWidgetConnections : function(widgetKey) {
            var dataSet = this.getWidget(widgetKey),
                dataStore = dataSet ? dataSet.dataStore : null;
            // see if we are waiting for this dataset to be created to associate it to widgets
            if (dataStore && deferredDataSetPrimaryMap[widgetKey] && deferredDataSetPrimaryMap[widgetKey].length > 0) {
                var connectionMap = deferredDataSetPrimaryMap[widgetKey], connectedWidget, j = 0;
                for (j; j < connectionMap.length; j++) {
                    connectedWidget = this.getWidget(connectionMap[j]);
                    if (connectedWidget) {
                        connectedWidget.dataStore = dataStore;
                        if (dataStore.pageSize) {
                            connectedWidget.pageSize = dataStore.pageSize;
                        }
                    }

                    connectionMap[j] = null;
                }
                delete deferredDataSetPrimaryMap[widgetKey];
            }
        },

        getBoundWidgetPlaceholderMap : function() {
            return this._widgetStorePlaceholderMap;
        },

        _connectWidgetEvents : function(widget, widgetData) {
            if (widget) {
                // TODO this should only occur when an event binding is defined - and then only for that event; for now occuring for all nav only!
                if (this.isNavigation) {
                    this._connectWidgetEventHandler(widget._key, "change", this._getNavWidgetChangeHandler());
                }
                // TODO capture all "input" style changes here
                else if (this.inputWidgetAnalyticsTriggers[widget._type]) {
                    this._connectWidgetEventHandler(widget._key, this.inputWidgetAnalyticsTriggers[widget._type],
                        this._getInputWidgetAnalyticsChangeHandler());
                }
                // see if a targetValueProp has been specified for this widget, and if so wire it up
                // if a targetValueEvent is specified, we will listen for that; otherwise default to "change"
                if (widgetData) {
                    if (widgetData.targetValueProp) {
                        this._connectWidgetEventHandler(widget._key, widgetData.targetValueEvent || "change",
                            this._getWidgetSetTargetValueHandler(widgetData));
                    }
                    // targetValues can be an array of {targetValueProp : "@prop", targetValueEvent : "change"} objects
                    if (widgetData.targetValues && widgetData.targetValues.length > 0) {
                        var i = 0, targetValue;
                        for (i; i < widgetData.targetValues.length; i++) {
                            targetValue = widgetData.targetValues[i];
                            if (targetValue && targetValue.targetValueProp) {
                                this._connectWidgetEventHandler(widget._key, targetValue.targetValueEvent || "change",
                                    this._getWidgetSetTargetValueHandler(targetValue));
                            }
                        }
                    }
                }
            }
        },

        _processTargetValues : function(targetValues) {
            if (targetValues && !$.isEmptyObject(targetValues)) {
                var targetValue;
                for (targetValue in targetValues) {
                    if (targetValue) {
                        // target value prop names do not have to start with @, but references to it do so it will be appended regardless
                        var name = (targetValue.charAt(0) !== "@" ? "@" : "") + targetValue,
                            valData = targetValues[targetValue],
                            val = valData && valData.targetValueDefault !== undefined ? valData.targetValueDefault : valData;

                        // store additional config here
                        targetValueConfigMap[name] = {
                            valueProp : valData && valData.valueProp !== undefined && valData.valueProp !== null
                                ? valData.valueProp : null,
                            deepLinkEnabled : valData.deepLinkEnabled === true,
                            deepLinkProperties : valData.deepLinkProperties
                        };
                        this._setTargetValueDefault(name, val);
                    }
                }
            }
        },

        _processWidgetFilterBindings : function(widget, widgetData, dataStore) {
            // multiple filter bindings can be defined; PREFERRED
            if (widgetData.filterBindings) {
                var filterKey, binding;
                for (filterKey in widgetData.filterBindings) {
                    if (filterKey && widgetData.filterBindings[filterKey]) {
                        binding = widgetData.filterBindings[filterKey];
                        if (typeof binding === "object") {
                            if (!binding.value) {
                                binding.value = "id";
                            }
                            if (binding.cloneData && dataStore && dataStore.addCallback) {
                                if (this.widgetMetadata && filterKey && (!this.widgetMetadata[filterKey] || !this.widgetMetadata[filterKey].widgetData)) {
                                    if (!this.widgetMetadata[filterKey]) {
                                        this.widgetMetadata[filterKey] = {};
                                    }
                                    this.widgetMetadata[filterKey].widgetData = {
                                        dataPath : binding.dataPath,
                                        itemPath : binding.itemPath
                                    };
                                }
                                dataStore.addCallback(this._getWidgetOnDataLoadedCallback(filterKey),
                                    this._getWidgetOnDataLoadedCallback(filterKey, true));
                            }
                        }
                        else {
                            binding = {
                                value : binding
                            };
                        }
                        this._connectWidgetEventHandler(widget._key, binding.event || "change",
                            this._getWidgetFilterBindingHandler(widget._key, filterKey, binding));
                    }
                }
            }
            // TODO @deprecated
            // filter binding is used to wire widget change events to selected values in a filter
            if (widgetData.filterBinding) {
                /*if (window.console && typeof window.console.error === "function") {
                 console.error("widgetData.filterBinding is deprecated; please switch to widgetData.filterBindings (map)");
                 }*/
                // TODO should we expect valueProp to be part of widgetData here since its typically within widgetProperties...?
                this._connectWidgetEventHandler(widget._key, "change",
                    this._getWidgetFilterBindingHandler(widget._key, widgetData.filterBinding, {value : (widgetData.valueProp || "id")}));
            }
        },

        _processWidgetBindings : function(widgetBindings, widgetInstance) {
            if (widgetBindings) {
                var key, binding;
                for (key in widgetBindings) {
                    // TODO do these keys need this._appendWidgetContextPostfix(widget._key)?
                    if (key && widgetBindings[key]) {
                        binding = widgetBindings[key];
                        if (binding) {
                            // bindings can be an array with multiple values or just a single object
                            if ($.isArray(binding)) {
                                var i = 0;
                                for (i; i < binding.length; i++) {
                                    this._processWidgetBinding(binding[i], key, widgetInstance);
                                }
                            }
                            else {
                                this._processWidgetBinding(binding, key, widgetInstance);
                            }
                        }
                    }
                }
            }
        },

        _processWidgetBinding : function(binding, bindingWidgetKey, widgetInstance) {
            if (binding) {
                if (bindingWidgetKey === "this" && widgetInstance) {
                    bindingWidgetKey = widgetInstance._key || "this";
                }
                if (binding === true) {
                    binding = {};
                }
                if (!binding.action) {
                    binding.action = "updateData";
                }
                if (!binding.event) {
                    binding.event = "change";
                }
                var queryParams = binding.query ? formUtil.extractQueryParams(binding.query) : null,
                    widgetBindingCallback = this._getWidgetBindingCallback(widgetInstance,
                        binding.actions || [{action : binding.action, args : binding.args}],
                        binding.delay, queryParams, binding.callback),
                    callback = this._connectWidgetEventHandler(bindingWidgetKey, binding.event, widgetBindingCallback);
                if (binding.event === "change") {
                    this._connectWidgetEventHandler(bindingWidgetKey, "changeStartupWidgetData", widgetBindingCallback);
                }

                // trigger callback for change events now in case this widget was instantiated late
                if (callback && (((binding.event.split(".").pop() === "change" || binding.getInitialChangeEventData) &&
                    (widgetRegistry[bindingWidgetKey] || (this.startupWidgetData && this.startupWidgetData[bindingWidgetKey]))) ||
                    targetValueMap[bindingWidgetKey])) {
                    if (widgetBindingCallback && this.startupWidgetData && this.startupWidgetData[bindingWidgetKey]) {
                        widgetBindingCallback(bindingWidgetKey, this.startupWidgetData[bindingWidgetKey]);
                    }
                    else {
                        callback();
                    }
                }
            }
        },

        createWidgetDataStore : function(widgetKey, widgetData, widgetOnLoadErrorHandler, storeName, widgetType) {
            var serviceUrl = widgetData.serviceUrl ? widgetData.serviceUrl.replace(/&amp;/gi, "&") : "",
                fixtureUrl = widgetData.fixtureUrl ? widgetData.fixtureUrl.replace(/&amp;/gi, "&") : "",
                fixtures = String(widgetData.fixtures).toLowerCase() === "true" || globalFixtures,
                props = $.extend({}, widgetData, {
                    serviceUrl : serviceUrl,
                    fixtureUrl : fixtureUrl,
                    fixtures : fixtures,
                    urlProp : fixtureUrl && fixtures ? "fixtureUrl" : "serviceUrl",
                    asyncServiceMapper : widgetData.serviceMapper && widgetData.serviceMapper.indexOf(".") > 0
                        ? widgetData.serviceMapper : null,
                    skipShowLoading : widgetData.hideLoading ||
                        (defaultWidgetProperties[widgetType] ? defaultWidgetProperties[widgetType].hideLoading : false) || false,
                    onLoadError : widgetOnLoadErrorHandler,
                    hideNotificationCallback : this.isModal ? undefined : this.hideNotification.bind(this),
                    showNotificationCallback : this.isModal ? undefined : this.showNotification.bind(this),
                    widgetVisibleCallback : this.isVisible.bind(this),
                    widgetDispatchEventCallback : this._dispatchWidgetEvent.bind(this, widgetKey),
                    widgetCanLoadDataCallback : this.canLoadData.bind(this),
                    widgetKey : widgetKey,
                    viewId : this.isNavigation ? "filters" : this.viewId,
                    validResponseCodes : widgetData.validResponseCodes || this.validResponseCodes,
                    _lastFilters : widgetData.preserveFilters && widgetData.filterValues && window.Modernizr.printlayout
                        ? widgetData.filterValues : null
                }),
                dataStore = new DataStore(props);

            if (!storeName) {
                storeName = widgetKey + "Store";

                // ensure name is unique
                while (dataStoreRegistry[storeName]) {
                    storeName += "_";
                }
            }
            dataStoreRegistry[storeName] = dataStore;

            return dataStore;
        },

        createWidgetContainer : function(widgetKey, parentContainer, widgetProperties, index) {
            var viewCtxPostfix = this.getViewContextPostfix(),
                keySeparatorIdx = widgetKey ? widgetKey.indexOf("__") : -1,
                classes = widgetKey,
                container;

            // be sure to append the original widget key as a class if the current one is context-postfixed
            if (viewCtxPostfix) {
                classes += " " + widgetKey.substring(0, widgetKey.indexOf(viewCtxPostfix));
            }

            if (keySeparatorIdx > 0) {
                classes += " " + widgetKey.substring(0, keySeparatorIdx);
            }

            container = $("<div class='fireball-widget " + classes + "'></div>");

            // cssWidth: Number|String
            //      An integer representing the number of pixels, or an integer along with an optional unit of measure appended (as a string) e.g. 20%
            // cssHeight: Number|String
            //      An integer representing the number of pixels, or an integer along with an optional unit of measure appended (as a string). e.g. 20%
            // cssClasses: String|Array
            //     a String array of css class names to be applied to this dom node or a string with class names separated by a space
            if (widgetProperties.cssWidth !== null && widgetProperties.cssWidth !== undefined) {
                // anything other than 100% width becomes display inline-block
                container.width(widgetProperties.cssWidth);
                if (widgetProperties.cssWidth !== "100%") {
                    container.css("display", "inline-block");
                    container.addClass("widget-inline");
                }
            }
            if (widgetProperties.cssHeight !== null && widgetProperties.cssHeight !== undefined) {
                container.height(widgetProperties.cssHeight);
            }
            if (widgetProperties.cssClasses && widgetProperties.cssClasses.length > 0) {
                container.addClass($.isArray(widgetProperties.cssClasses)
                    ? widgetProperties.cssClasses.join(" ") : widgetProperties.cssClasses);
            }

            if (widgetProperties.container && typeof widgetProperties.container === "string") {
                $(widgetProperties.container).append(container);
                widgetProperties.customContainer = true;
            }
            else {
                parentContainer.append(container);
            }
            return container;
        },

        _dispatchWidgetEvent : function(widgetKey, evt, data, userInitiated) {
            var widget = this.getWidget(widgetKey);
            if (widget && widget.dispatchEvent) {
                widget.dispatchEvent(evt, data, userInitiated);
            }
        },
        
        _setTargetValueDefault : function(targetValueProp, defVal) {
            if (defVal !== null && defVal !== undefined) {
                // target value defaults can reference query params via ${queryParams.[name]}
                var queryParamPrefix = "${" + QUERY_PARAMS_NAME + ".";

                if (defVal.indexOf && defVal.indexOf(queryParamPrefix) === 0 && defVal.length > queryParamPrefix.length) {
                    var startupParamName = defVal.substring(queryParamPrefix.length, defVal.length - 1);
                    defVal = (startupParamName && startupParams && startupParams[startupParamName] !== undefined
                    && startupParams[startupParamName] !== null) ? startupParams[startupParamName] : "";
                }
                targetValueMap[targetValueProp] = defVal;
            }
        },

        _getWidgetSetTargetValueHandler : function(widgetData)  {
            var targetValueProp = widgetData.targetValueProp,
                targetValueData = widgetData.targetValueData,
                targetValueQueryParams = widgetData.query ? formUtil.extractQueryParams(widgetData.query) : null;
            this._setTargetValueDefault(targetValueProp, widgetData.targetValueDefault);
            return function(sourceWidgetKey, newValue, userInitiated, onWidgetInit) {
                // target value prop names do not have to start with @, but references to it do so it will be appended regardless
                if (targetValueProp.charAt(0) !== "@") {
                    targetValueProp = "@" + targetValueProp;
                }
                if (!targetValueQueryParams ||
                    (targetValueQueryParams && formUtil.doesDataMatchQueryParams(newValue, targetValueQueryParams))) {
                    if (targetValueData !== undefined && targetValueData !== null) {
                        newValue = templateUtil.replaceTemplatePlaceholders(targetValueData, newValue, true, true);
                    }
                    this.setTargetValueProp(targetValueProp, newValue, userInitiated, onWidgetInit, sourceWidgetKey);
                }
            }.bind(this);
        },

        setTargetValueProp : function(targetValueProp, newValue, userInitiated, onWidgetInit, sourceWidgetKey) {
            if (targetValueMap && targetValueSourceWidgetMap) {
                targetValueMap[targetValueProp] = newValue;
                targetValueSourceWidgetMap[targetValueProp] = sourceWidgetKey;
                topic.publish(targetValueProp + ".change", [newValue, userInitiated, onWidgetInit]);

                // if a value prop is a deep link param, update the url
                var deepLinkParams = this.getDeepLinkParams();
                if (deepLinkParams[targetValueProp]) {
                    formUtil.updateRouterState(null, true, true, this.getStateMap());
                }
            }
        },

        getDeepLinkParams : function() {
            // returns the deep link params for the currently visible view
            return this.deepLinkParams || {};
        },

        _getWidgetDataPersistValueChangeCallback : function(widget) {
            return function(val, userInitiated) {
                if (userInitiated && widget && widget.dataStore && widget.dataStore.persistData) {
                    widget.dataStore.persistData(val, function(response) {
                        widget.dispatchEvent("persisted", response, true);
                    });
                }
            };
        },

        _getNavFilterShowOverride : function(oldShowFunc, dataStore, key) {
            var cb = this._getWidgetOnDataLoadedCallback(key);
            return function() {
                if (!this._loadedDataStore) {
                    this._loadedDataStore = true;
                    dataStore.loadData().then(cb);
                }
                return oldShowFunc.apply(this, arguments);
            };
        },

        _getWidgetOnDataLoadedCallback : function(widgetKey, isError) {
            return function(data, append, status) {
                var widget = this.getWidget(widgetKey),
                    isLoading = data === null && !append && status === "loading";
                if (isLoading) {
                    if (widget && widget.setLoading) {
                        widget.setLoading(isLoading);
                    }
                }
                else {
                    var defaultVal = isError ? null : templateUtil.decodeParam(startupParams[widgetKey]);
                    this.setWidgetData(widgetKey, data, defaultVal, append, isError);
                    this.notifyDelegate("onWidgetDataLoaded", widgetKey, data, append, isError);

                    if (this.onWidgetDataLoaded && this.onWidgetDataLoaded.apply) {
                        this.onWidgetDataLoaded.apply(this, [widgetKey, data, append, isError]);
                    }
                }
            }.bind(this);
        },

        _getWidgetBindingCallback : function(widget, actions, delay, queryParams, bindingCallback) {
            // TODO apply function now?
            return function(widgetName, data) {
                if (!queryParams || (queryParams && formUtil.doesDataMatchQueryParams(data, queryParams))) {
                    if (widget && actions && actions.length > 0) {
                        var i = 0, j, actionItem, arg, argsArray;
                        for (i; i < actions.length; i++) {
                            actionItem = actions[i];
                            if (actionItem && actionItem.action) {
                                if (actionItem.action === "_reload_") {
                                    location.reload();
                                }
                                else if (widget[actionItem.action] && widget[actionItem.action].apply) {
                                    argsArray = [];
                                    if (actionItem.args && actionItem.args.length > 0) {
                                        for (j = 0; j < actionItem.args.length; j++) {
                                            arg = actionItem.args[j];
                                            if (arg === "_value_") {
                                                argsArray[j] = data;
                                            }
                                            else if (arg === "_data_") {
                                                var origWidget = this.getWidget(widgetName);
                                                if (origWidget && origWidget.getData) {
                                                    argsArray[j] = origWidget.getData();
                                                }
                                            }
                                            else if (arg === "_source_" && widgetName.indexOf("@") === 0) {
                                                argsArray[j] = targetValueSourceWidgetMap[widgetName];
                                            }
                                            else if (arg && typeof arg === "string") {
                                                var argName = String(arg).replace(new RegExp(widgetName + "\\.", 'g'), ""),
                                                    argValue = templateUtil.getPropertyValue(
                                                        templateUtil.stripPlaceholders(argName), data);

                                                // send the raw object/array value if found
                                                if (argValue !== null && typeof argValue === "object") {
                                                    argsArray[j] = argValue;
                                                }
                                                else {
                                                    argsArray[j] = templateUtil.replaceTemplatePlaceholders(
                                                        argName, data, true, true);
                                                }
                                            }
                                            else {
                                                argsArray[j] = arg;
                                            }
                                        }
                                    }
                                    else {
                                        // if no args array is provided, just send the data as the only arg
                                        argsArray.push(data);
                                    }
                                    var widgetBindingActionCallback = this._getWidgetBindingActionCallback(
                                        widget, actionItem, argsArray, bindingCallback, data);
                                    if (delay && Number(delay) > 0) {
                                        setTimeout(widgetBindingActionCallback, delay);
                                    }
                                    else {
                                        widgetBindingActionCallback();
                                    }
                                }
                            }
                        }
                    }
                }
            }.bind(this);
        },

        _getWidgetBindingActionCallback : function(widget, actionItem, argsArray, bindingCallback, data) {
            return function() {
                var retVal = widget[actionItem.action].apply(widget, argsArray);

                // a widget binding callback is a new event fired from this widget/view in response
                //  with the original data that triggered the widget binding
                if (bindingCallback && bindingCallback.event) {
                    // if a query is provided, only conditionally dispatch the callback event if the response
                    // from the original widget binding action (function) matches the query
                    if (!bindingCallback.query || (bindingCallback.query &&
                        formUtil.doesDataMatchQueryParams(retVal, formUtil.extractQueryParams(bindingCallback.query)))) {
                        this.dispatchEvent(bindingCallback.event, data);
                    }
                }
            }.bind(this);
        },

        _bindWidgetStorePlaceholders : function(store, prop, force) {
            if (!this._widgetStorePlaceholderMap) {
                this._widgetStorePlaceholderMap = {};
            }
            if (store && ((prop && store[prop]) || store.watchValues)) {
                var additionalBoundProperties = store.watchValues && store.watchValues.length > 0
                        ? store.watchValues : null,
                    boundProperties = store[prop] ? (store[prop].match(templateUtil.PLACEHOLDER_PATTERN) || []) : [],
                    formattedBoundProperties = [],
                    callbacks = [],
                    cb;
                if (additionalBoundProperties) {
                    boundProperties = boundProperties.concat(additionalBoundProperties);
                }
                if (boundProperties && boundProperties.length > 0) {
                    var i = 0, curr, currName, boundPropertyChangeHandlerMap = {},
                        changeHandler = this._getWidgetBoundPropertyChangeHandler(store, prop),
                        changingHandler = function(key) {
                            // when we know definitively that a value is about to change, unbind that prop
                            if (store && store.unbindProperty) {
                                store.unbindProperty(key);
                            }
                        };
                    for (i; i < boundProperties.length; i++) {
                        curr = boundProperties[i];
                        if (curr) {
                            curr = curr.substring(2, curr.length - 1);
                            formattedBoundProperties.push(curr);
                            currName = curr.split(".")[0];
                            // prevent multiple bindings for different properties within the same object
                            if (currName && !boundPropertyChangeHandlerMap[currName]) {
                                boundPropertyChangeHandlerMap[currName] = true;
                                if (currName === "viewContext") {
                                    // we can bind to viewContext
                                    callbacks.push(this._connectViewContextChangeHandler(changeHandler));
                                }
                                else {
                                    // TODO this assumes a lot...this should be achieved with event bindings!
                                    cb = this._connectWidgetEventHandler(currName, "change", changeHandler);
                                    if (cb) {
                                        callbacks.push(cb);
                                    }
                                    this._connectWidgetEventHandler(currName, "changing", changingHandler);
                                    this._widgetStorePlaceholderMap[currName] = true;
                                }
                            }
                        }
                    }
                    store.setBoundProperties(formattedBoundProperties, prop);

                    // callbacks cannot be invoked until properties are bound!
                    if (!this._bindDataStoreStartupPropertiesAndFilters(store, this.startupWidgetData, prop, force)) {
                        for (i = 0; i < callbacks.length; i++) {
                            callbacks[i](true);
                        }
                    }
                }
            }
        },

        _getTargetValueInitCallback : function(currName, changeHandler) {
            return function(onWidgetInit) {
                var selectedItem = targetValueMap[currName];
                // grab the current value from the map
                if (selectedItem !== null && selectedItem !== undefined) {
                    // only in the case of widget init do we want to pass a 3rd param
                    if (onWidgetInit) {
                        changeHandler(currName, selectedItem, false, onWidgetInit);
                    }
                    else {
                        changeHandler(currName, selectedItem);
                    }
                }
            };
        },

        _getQueryStringValueInitCallback : function(currName, changeHandler) {
            var decodedParams = {}, key;
            if (startupParams) {
                for (key in startupParams) {
                    if (key) {
                        decodedParams[key] = templateUtil.decodeParam(startupParams[key]);
                    }
                }
            }

            return function(onWidgetInit) {
                if (onWidgetInit) {
                    changeHandler(currName, decodedParams, false, onWidgetInit);
                }
                else {
                    changeHandler(currName, decodedParams);
                }
            };
        },

        _getWidgetBoundPropertyChangeHandler : function(store, prop) {
            return function(widgetName, newVal, userInitiated, widgetInit) {


                var origWidgetName = widgetName;
                if (!widgetInit && this.smartPropertyBinding && store && store.getPropertyDataMap) {
                    // check the dependencies of the widget we're binding placeholders for to see if those dependencies
                    // are also dependant on the widget that just changed (implying they will change very soon)

                    // only continue if the property value actually changed - may be risky but probably a better idea to
                    // prevent issues
                    var widget = this.getWidget(widgetName),
                        valueProp = widget ? widget.valueProp : null;

                    if (!(this.smartPropertyBindingDelta && store.isValueEqual && store.isValueEqual(widgetName, newVal, valueProp))) {

                        var storeWidget = this.getWidget(store.widgetKey);
                        if (storeWidget && storeWidget.changeDispatcher) {
                            storeWidget.dispatchEvent.call(storeWidget, "changing");
                        }

                        var storePropDataMap = store.getPropertyDataMap(), key, boundWidget, boundWidgetStorePropertyDataMap;
                        for (key in storePropDataMap) {
                            if (key && storePropDataMap[key]) {
                                key = this._getSourceWidget(key);

                                if (key !== widgetName) {
                                    boundWidget = this.getWidget(key);
                                    // note the only type of widgets with the necessary behavior are Selects
                                    if (boundWidget !== null && boundWidget !== undefined && boundWidget.dataStore &&
                                        (this.NAV_WIDGET_TYPES[boundWidget._type] || boundWidget.changeDispatcher)) {

                                        boundWidgetStorePropertyDataMap = boundWidget.dataStore.getPropertyDataMap();
                                        if (boundWidgetStorePropertyDataMap && boundWidgetStorePropertyDataMap[widgetName]
                                            && store.unbindProperty) {
                                            // have the bound widget notify watchers that it is changing
                                            boundWidget.dispatchEvent.call(boundWidget, "changing");
                                            // unbind the key from this store as well
                                            store.unbindProperty(key); //TODO this fixes it but will cause other issues
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                var props = {};
                props[origWidgetName] = newVal;
                store.bindProperties(props, prop);
            }.bind(this);
        },

        getStateMap : function() {
            var stateMap = {}, key, widget, deepLinkParams = this.getDeepLinkParams();
            if (deepLinkParams) {
                for (key in deepLinkParams) {
                    if (key && deepLinkParams[key]) {
                        if (deepLinkParams[key]) {
                            if (key.charAt(0) === "@" && targetValueConfigMap[key] &&
                                (targetValueConfigMap[key].valueProp || targetValueConfigMap[key].deepLinkProperties) &&
                                targetValueMap[key] !== undefined && targetValueMap[key] !== null) {
                                this._setStateValues(stateMap, key, targetValueConfigMap[key], targetValueMap[key]);
                            }
                            else {
                                widget = this.getWidget(key);
                                if (widget && (widget.valueProp || widget.deepLinkProperties) && widget.getSelectedItem) {
                                    this._setStateValues(stateMap, key, widget, widget.getSelectedItem());
                                }
                            }
                        }
                    }
                }
            }
            return stateMap;
        },

        _setStateValues : function(stateMap, key, config, value) {
            if (config.deepLinkProperties) {
                var i = 0, prop, propVal;
                for (i; i < config.deepLinkProperties.length; i++) {
                    prop = config.deepLinkProperties[i];
                    if (prop) {
                        propVal = templateUtil.getPropertyValue(prop, value);
                        if (propVal !== null && propVal !== undefined) {
                            stateMap[key + "." + prop] = propVal;
                        }
                    }
                }
            }
            else if (config.valueProp) {
                var valueProp = config.valueProp;
                if (value && value[valueProp] !== undefined && value[valueProp] !== null) {
                    stateMap[key + "." + valueProp] = value[valueProp];
                }
            }
            else if (typeof value !== "object") {
                stateMap[key] = value;
            }
        },

        _getSourceWidget : function(widgetKey) {
            while (widgetKey && targetValueMap[widgetKey] && targetValueSourceWidgetMap[widgetKey]) {
                widgetKey = targetValueSourceWidgetMap[widgetKey];
            }
            return widgetKey;
        },

        _connectWidgetDataSetsHandler : function(dataSets, widgetKey, dataSetPrimary) {
            var i,
                dataSetMap = dataSets.reduce(function(map, dataSet) {
                    map[dataSet] = false;
                    return map;
                }, {}),
                callbacks = [],
                doAllDataSetsHaveData = function(currMap) {
                    if ($.isEmptyObject(currMap)) {
                        // don't resolve as true for an empty object
                        return false;
                    }
                    var currDataSet;
                    for (currDataSet in currMap) {
                        if (currDataSet && (!currMap[currDataSet] || !currMap[currDataSet].hasData)) {
                            return false;
                        }
                    }
                    return true;
                },
                handleDataSetChanging = function(dataSetName) {
                    // when a dataset is about to change, invalidate the cached values
                    if (dataSetName) {
                        dataSetMap[dataSetName] = false;
                    }
                },
                handleDataSetChange = function(dataSetName, data, userInitiated, append, isError) {
                    // TODO note this will always bypass resetting if the primary dataset is updated; not just if appending or sort/filtering
                    var currDataSet;
                    if (isError === true) {
                        return;
                    }

                    // update the map with the data
                    dataSetMap[dataSetName] = {hasData : true, data : data};

                    var setWidgetDataMap = {};

                    if (doAllDataSetsHaveData(dataSetMap)) {
                        for (i = 0; i < dataSets.length; i++) {
                            currDataSet = dataSets[i];
                            if (dataSetMap[currDataSet] && dataSetMap[currDataSet].hasData) {
                                setWidgetDataMap[currDataSet] = dataSetMap[currDataSet].data;
                            }
                        }
                        if (dataSetPrimary && dataSetMap.hasOwnProperty(dataSetPrimary)) {
                            // keep all but the primary as it is expected to change for paging
                            dataSetMap[dataSetPrimary] = false;
                        }
                    } else {
                        return;
                    }

                    this.setWidgetData(widgetKey, setWidgetDataMap, null, append);

                }.bind(this);

            for (i = 0; i < dataSets.length; i++) {
                this._connectWidgetEventHandler(dataSets[i], "changing", handleDataSetChanging);
                callbacks.push(this._connectWidgetEventHandler(dataSets[i], "change", handleDataSetChange));
            }

            callbacks.forEach(function(cb) {
                // immediately execute the callbacks in case some datasets were already populated
                if (cb) {
                    cb(true);
                }
            });
        },

        _getWidgetDataSetHandler : function(widgetKey) {
            return function(dataSetName, data, userInitiated) {
                this.setWidgetData(widgetKey, data);
            }.bind(this);
        },

        _connectViewContextChangeHandler : function(handler) {
            // and return a callback that will resolve with the current view context if already set
            return function(onWidgetInit) {
                var ctx = this.getViewContext();
                if (ctx) {
                    handler("viewContext", ctx, false, onWidgetInit);
                }
            }.bind(this);
        },

        _connectWidgetEventHandler : function(widgetName, eventName, handler) {
            // return a callback that can be executed once properties are bound
            var callback = null;
            if (widgetName && widgetName.charAt(0) === "@") {
                topic.subscribe(widgetName + "." + eventName, function(evt, val, userInitiated, append, arg) {
                    handler(widgetName, val, userInitiated, append, arg);
                });
                // also add a callback that will return the current value
                callback = this._getTargetValueInitCallback(widgetName, handler);
            }
            else if (widgetName === QUERY_PARAMS_NAME) {
                callback = this._getQueryStringValueInitCallback(widgetName, handler);
            }
            else if (widgetName && (widgetName === "this" || widgetRegistry[widgetName])) {
                var widget = widgetName === "this" ? this : widgetRegistry[widgetName];
                if (widget) {
                    var handlerCallback = function(val, userInitiated, append, arg) {
                        handler(widgetName, val, userInitiated, append, arg);
                    };
                    if (widget.on) {
                        widget.on(eventName, handlerCallback);
                    }
                    else {
                        topic.subscribe(widgetName + "." + eventName, handlerCallback);
                    }

                    callback = function(onWidgetInit) {
                        var selectedItem = widget.getSelectedItem ? widget.getSelectedItem() : null;
                        if (selectedItem) {
                            // only in the case of widget init do we want to pass a 3rd param
                            if (onWidgetInit) {
                                if (!(widget.dataStore && widget.dataStore.isCurrentlyLoading())) {
                                    handler(widgetName, selectedItem, false, onWidgetInit);
                                }
                            }
                            // otherwise don't pass the 3rd param bc another one may be getting passed
                            else {
                                handler(widgetName, selectedItem);
                            }
                        }
                    };
                }
            }
            else {
                // each entry is an array of arguments for this widget name since we may have multiple handlers for this widget
                if (deferredWidgetEventHandlerMap[widgetName] && deferredWidgetEventHandlerMap[widgetName].push) {
                    deferredWidgetEventHandlerMap[widgetName].push(arguments);
                }
                else {
                    deferredWidgetEventHandlerMap[widgetName] = [arguments];
                }
            }
            return callback;
        },

        remove : function() {
            // intercept to remove all widgets from the registry
            if (widgetRegistry && this.widgets) {
                var i = 0, curr;
                for (i; i < this.widgets.length; i++) {
                    curr = this.widgets[i];
                    if (curr && curr._key && widgetRegistry[curr._key]) {
                        delete widgetRegistry[curr._key];
                    }
                }
            }

            this._super.apply(this, arguments);
        }


    });
});