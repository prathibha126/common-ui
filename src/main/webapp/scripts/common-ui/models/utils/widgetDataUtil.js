define([
    "jquery",
    "common-ui/widgets/utils/templateUtil"
], function($, templateUtil) {

    "use strict";

    var serviceMappers = {},
        handleMapperError = function(ex, mapper) {
            if (window.console && typeof window.console.error === "function") {
                console.error("ERROR: service mapper " + mapper + " encountered exception during mapping", ex);
            }
        };

    return {

        mapData: function (mapper, data, context) {
            if (serviceMappers[mapper]) {
                // currently supported service mappers include JS and JSON
                var serviceMapper = serviceMappers[mapper];
                // JS Mapper:
                if (typeof serviceMapper !== "string" && serviceMapper && (serviceMapper.mapObject || (typeof serviceMapper === "function" && serviceMapper.apply))) {
                    try {
                        if (serviceMapper.mapObject) {
                            return serviceMapper.mapObject(data, context);
                        }
                        else {
                            return serviceMapper(data, context);
                        }
                    }
                    catch (jsMapperEx) {
                        handleMapperError(jsMapperEx, mapper);
                        // if the mapper fails, return null
                        return null;
                    }
                }
            }
            // otherwise just return the original data
            return data;
        },

        setServiceMappers: function (sm) {
            serviceMappers = sm || {};
        },

        addServiceMapper: function (name, mapper) {
            if (!serviceMappers) {
                serviceMappers = {};
            }
            serviceMappers[name] = mapper;
        },

        getWidgetMapperContext: function (widget) {
            if (widget) {
                var ds = widget.dataStore || null,
                    ctx = {
                        widget: widget._key,
                        dataUpdatedCallback: widget.dataStore && widget.dataStore.serviceMapper && widget.dataStore.updateItemsLoaded
                            ? widget.dataStore.updateItemsLoaded.bind(widget.dataStore) : null
                    };
                if (ds && ds.getPropertyDataMap) {
                    ctx = $.extend(true, ctx,
                        (ds.getLastRequestParams ? ds.getLastRequestParams() : {}),
                        (ds.getLastResponseHeaders ? ds.getLastResponseHeaders() : {}),
                        ds.getPropertyDataMap()
                    );
                }
                return ctx;
            }
            return {};
        },

        extractWidgetData: function (widgetData, incomingRowData, widgetContext) {
            // apply a service mapper as first priority
            if (widgetData && widgetData.serviceMapper) {
                incomingRowData = this.mapData(widgetData.serviceMapper, incomingRowData, widgetContext);
            }
            else if (widgetData && widgetData.serviceMappers) {
                var m = 0, mapper;
                for (m; m < widgetData.serviceMappers.length; m++) {
                    mapper = widgetData.serviceMappers[m];
                    if (mapper) {
                        incomingRowData = this.mapData(mapper, incomingRowData, widgetContext);
                    }
                }
            }

            var rowData = widgetData && widgetData.dataPath ?
                templateUtil.getPropertyValue(widgetData.dataPath, incomingRowData) : incomingRowData,
                dataType = widgetData && widgetData.type ? widgetData.type.toLowerCase() : "",
                rowDataIsArray = $.isArray(rowData),
                hasItemPath = widgetData && widgetData.itemPath && rowDataIsArray,
                isList = dataType === "list" || hasItemPath,
                data = isList ? [] : {},
                notifyDataUpdated = function (argData) {
                    if (widgetContext && widgetContext.dataUpdatedCallback) {
                        widgetContext.dataUpdatedCallback(argData);
                    }
                    return argData;
                };

            if (hasItemPath) {
                if (rowData && rowData.length > 0) {
                    rowData.map(function (item) {
                        data.push(templateUtil.getPropertyValue(widgetData.itemPath, item));
                    });
                }
            }
            else if (widgetData && widgetData.columns && !widgetData.serviceUrl) {
                var i, j, col, currVal, val, valProp, rowDataItem,
                    rowDataCount = rowDataIsArray && isList && rowData && rowData.length > 0 ? rowData.length : 1,
                    cols = templateUtil.getSortedWidgetArray(widgetData.columns);

                for (j = 0; j < rowDataCount; j++) {
                    rowDataItem = rowDataIsArray && isList ? rowData[j] : rowData;
                    if (rowDataIsArray && isList) {
                        currVal = {};
                        data.push(currVal);
                    }

                    if (rowDataItem !== null && rowDataItem !== undefined) {
                        for (i = 0; i < cols.length; i++) {
                            col = cols[i];
                            if (col && ((col.dataColumn && rowDataItem[col.dataColumn] !== undefined)
                                || (col.dataColumnValue && rowDataItem[col.dataColumnValue] !== undefined))) {
                                valProp = col.dataValue || "value";
                                val = col.dataColumnValue ? (rowDataItem[col.dataColumnValue] !== undefined ? rowDataItem[col.dataColumnValue] : null)
                                    : (rowDataItem[col.dataColumn] !== undefined && rowDataItem[col.dataColumn] !== null) ? rowDataItem[col.dataColumn][valProp] : null;
                                if (rowDataIsArray && isList) {
                                    currVal[col._key] = val;
                                }

                                if (!rowDataIsArray && val !== undefined && val !== null) {
                                    if (isList) {
                                        data.push(val);
                                    }
                                    else {
                                        data[col._key] = val;
                                    }
                                }
                            }
                        }
                    }
                }
            }
            else if (isList && rowData && !rowDataIsArray) {
                // for "list" data, the assumption is that each key is the index; NOTE indices must be valid and sequential and start at 0
                var prop, rowDataList = [];
                for (prop in rowData) {
                    if (prop && rowData[prop]) {
                        rowDataList[prop] = rowData[prop];
                    }
                }
                return notifyDataUpdated(rowDataList);
            }
            else {
                return notifyDataUpdated(rowData);
            }
            return notifyDataUpdated(data);
        }
    };
});