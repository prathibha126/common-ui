define([
    "jquery",
    "Class",
    "common-ui/models/_Model",
    "common-ui/widgets/utils/formUtil",
    "common-ui/models/utils/widgetDataUtil",
    "common-ui/widgets/utils/templateUtil",
    "common-ui/widgets/utils/notificationUtil"
], function($, Class, Model, formUtil, widgetDataUtil, templateUtils, notificationUtil) {

    "use strict";

    var model = new Model(),
        encodeURLParam = function(prop) {
            return encodeURIComponent(templateUtils.htmlDecode(String(prop) || "", "text"));
        },
        getURLSafeParamValue = function(prop) {
            // kinda hacky, but we need to remove html entities and then encode the value for sending back in the service url
            if (prop && typeof prop === "string") {
                return encodeURLParam(prop);
            }
            else if ($.isArray(prop) && prop.length > 0) {
                return prop.reduce(function(prev, curr) {
                    return prev + (prev ? "," : "") + (curr && typeof curr === "string" ? encodeURLParam(curr) : curr);
                }, "");
            }
            return prop;
        };

    return Class.extend({

        // serviceUrl: String
        //      the url to invoke for the service data; used for both read and write operations
        serviceUrl : "",
        // fixtureUrl: String
        //      a test/demo url used in place of the service url; only applicable when fixtures is true
        fixtureUrl : "",
        // method: String
        //      the HTTP method to use for the read operation; typically GET
        method : "GET",
        // valueChangePersistMethod: String
        //      the method used when persisting data; typically POST
        valueChangePersistMethod : "POST",
        // persistValueChange: Boolean
        //      true if data included with change events dispatched from the associated widget should be persisted to the service url
        persistValueChange : false,
        // persistValueJSON: Boolean
        //      true if data persisted should be JSON.stringify'd (valid for JSON data structures); if false, the data is sent as a raw string
        persistValueJSON : true,
        // writeOnly: Boolean
        //      true if this data store ONLY makes "write" requests to persist new/updated data instead of also making GET requests
        writeOnly : false,
        // idProperty: String
        //      the property name of a field that uniquely identifies each row in the data; required when performing grid rows updates, etc
        idProperty : "id",
        // fixtures: Boolean
        //      true if the fixture url should be used instead of the service url (for testing/demo purposes)
        fixtures : false,
        // handleAs: String
        //      the value of the "dataType" property for the ajax request (xml|html|json|text)
        handleAs : null,
        // preserveSort: Boolean
        //      true if the sort value should be preserved from the last request and used if none is specified
        preserveSort : false,
        // preserveFilters: Boolean
        //      true if the filter values should be preserved from the last request and used if none are specified
        preserveFilters : false,
        // paginationParamNameLimit: String
        //      the name of the limit parameter to send on paginated requests
        paginationParamNameLimit : "limit",
        // paginationParamNameOffset: String
        //      the name of the offset parameter to send on paginated requests
        paginationParamNameOffset : "offset",
        // rangeHeader: Boolean
        //      true if a "Range" header should be sent for paginated requests instead of query params (e.g. Range: items=0-99)
        rangeHeader : false,
        // pageSize: Number
        //      if set to a value > 0, enables pagination for this widget with the specific page size
        pageSize : 0,
        // printPageSize: Number
        //     if pageSize > 0 and printPageSize is set, this value will be used in place of pageSize only when in print mode
        printPageSize : 0,
        // printMaxPages: Number
        //      the max number of pages to retrieve (when pageSize > 0) when in print mode
        printMaxPages : 10,
        // allowDuplicateRequests: Boolean
        //      preventing accidental duplicate requests by ignoring data from the earlier request in the same data store
        //      if it returned after another request was made. only the data for the request most recently made will be
        //      honored. note this is now the default behavior for all widgets but it can be overridden by setting the
        //      "allowDuplicateRequests" to true within a widget's widgetData
        allowDuplicateRequests : false,
        // pollingInterval: Number
        ///     if set to a value > 0, enables background polling of the service url at the specific interval in milliseconds
        pollingInterval : -1,
        // timeout: Number
        //      the number of milliseconds after which the request will timeout; defaults to 45000 (45 seconds)
        timeout : null,
        // validResponseCodes: Array of Number
        //      an array of HTTP response codes considered valid for requests; this can be used to prevent error notifications
        //      when receiving a 403 or 500 if those are considered acceptable responses; only applicable when the request
        //      is handled by the error handler. example: [403, 500]
        validResponseCodes : null,
        // extractItems: Boolean
        //      true (default) if data received contains an items property and the associated value should be
        //      extracted from responses and all other data ignored
        extractItems : true,
        // paginationOnlyExtractItems: Boolean
        //      true (false is default) if the .items value in the response should be considered for pagination calculations in the data store.
        //      this is useful if a service mapper is used and extractItems is set to false to preserve the original data structure
        //      while maintaining pagination support
        paginationOnlyExtractItems : false,
        // loadDataCountdownMillis: Number
        //      the timeout in milliseconds used in a countdown timer to prevent duplicate requests
        loadDataCountdownMillis : 5,
        // initialLoadDataCountdownMillis: Number
        //      the timeout in milliseconds used in a countdown timer to prevent duplicate requests for the first request only
        loadInitialDataCountdownMillis : 30,
        // enableGetRedirect: Boolean
        //      true if the response body contains a "redirect" property that should be honored as a redirect. this can also be set globally
        enableGetRedirect : false,
        // fileUpload: Boolean
        //      true if persist value changes requests contain a file upload
        fileUpload : false,
        // autoBoundProp: String
        //      set to the name of the prop that will be used to find and auto-wire bound properties.
        //      if set, it will only respond to property values that have been bound. note the
        //      value for the autoBoundProp must be passed on init
        autoBoundProp : null,

        resolveEmptyPromiseBeforeLoad : true,

        start : 0,
        asyncServiceMapper : null,
        defaultBackgroundPollingInterval : 1000,
        hideNotificationCallback : null,
        showNotificationCallback : null,
        widgetCanLoadDataCallback : null,
        // allowEmptyResponse: Boolean
        //      true if an empty server response (e.g. "") is acceptable
        allowEmptyResponse : true,

        _requestsLoading : 0,

        init : function(opts) {
            $.extend(this, opts);
            this.dataCallbacks = [];
            this.errorCallbacks = [];

            if (opts.pollingInterval > 0) {
                this.setPollingInterval(opts.pollingInterval);
            }
            if (this.pageSize && !isNaN(this.pageSize) && this.pageSize !== -1) {
                this.pageSize = Number(window.Modernizr.printlayout && this.printPageSize > 0 && !isNaN(this.printPageSize)
                    ? this.printPageSize : this.pageSize);
            }
            if (this.autoBoundProp) {
                var autoBoundProp = this[this.autoBoundProp];
                this.boundProperties = !autoBoundProp ? [] :
                    ((autoBoundProp.match(templateUtils.PLACEHOLDER_PATTERN) || [])
                        .map(function(item) {
                            return item ? item.substring(2, item.length - 1) : "";
                        }));
            }
        },

        sort : function(sort, filters) {
            // applies to pagination only
            if (this.pageSize > 0) {
                if (filters && filters.action && filters.preventDefault === true) {
                    // invoke load data with a custom promise to override the default behavior of updating the data
                    this._loadData(false, sort, filters, null, null, {
                        resolve: function (data, append) {
                            // just dispatch an event based on the filter action and the response data
                            if (this.widgetDispatchEventCallback) {
                                this.widgetDispatchEventCallback(filters.action, data);
                            }
                        }.bind(this),
                        fail: function (err, append) {
                            this._invokeErrorCallbacks(err, append);
                        }.bind(this),
                        then: function (callback, errorCallback) {
                        }
                    });
                }
                else {
                    this._resetPagination();
                    this.loadData(sort, filters);
                }
            }
        },

        loadNextPage : function(sort, filters) {
            // applies to pagination only
            if (this.pageSize > 0 && !this._lastPageLoaded) {
                this.loadData(sort, filters);
            }
            else if (this.promise) {
                // otherwise resolve now with an empty result to indicate we are done
                this.promise.resolve(null, this.pageSize > 0 && this.start >= this.pageSize);
            }
        },

        onBeforeLoad : function() {
            // attach point invoked prior to loading data
        },

        onAfterLoad : function() {
            // attach point invoked after data is loaded
        },

        onLoadError : function() {
            // attach point invoked if there is an error loading data
        },

        refreshData : function() {
            this.bindProperties(this._propDataMap, this.fixtures ? "fixtureUrl" : "serviceUrl", true);
        },

        loadInitialData : function() {
            return this.loadData(this.initialSort, this.initialFilters);
        },

        loadData : function(sort, filters) {
            var promise = this._createPromise();
            if (!this._appliedInitialSortAndFilters) {
                if (sort !== undefined) {
                    this.initialSort = sort;
                }
                if (filters !== undefined) {
                    this.initialFilters = filters;
                }
            }
            this._loadData(false, sort, filters);
            return promise;
        },

        loadItemData : function(itemValue, callback, errCallback) {
            var params = this._createRequestParams(false, null),
                itemValueQuery = this.idProperty + "=" + itemValue;

            // append the id of the parent to the url
            if (params.fixtures) {
                params.fixture += (params.fixture.indexOf("?") >= 0 ? "&" : "?") + itemValueQuery;
            }
            else {
                params.url += (params.url.indexOf("?") >= 0 ? "&" : "?") + itemValueQuery;
            }
            // add the id of the parent in the source param map
            params.sourceParamMap[this.idProperty] = itemValue;

            this.getData(params, {
                resolve: function (data, append, status) {
                    callback(data, append, status);
                },
                fail: function (err) {
                    this._invokeErrorCallbacks(err, true);
                    if (errCallback) {
                        errCallback(err);
                    }
                }.bind(this)
            }, false);
        },

        setPollingInterval : function(pollingInterval) {
            this.pollingInterval = pollingInterval;
            
            if (this.pollingInterval > 0) {
                this._pollingStarted = new Date().getTime();
                if (this._pollingIntervalRef) {
                    window.clearInterval(this._pollingIntervalRef);
                }
                this._pollingIntervalRef = setInterval(function() {
                    if (new Date().getTime() - this._pollingStarted >= this.pollingInterval) {
                        this._pollingStarted = new Date().getTime();
                        this._loadData(true);
                    }
                }.bind(this), Math.min(this.pollingInterval, this.defaultBackgroundPollingInterval));
            }
            else if (this._pollingIntervalRef) {
                this._pollingStarted = false;
                window.clearInterval(this._pollingIntervalRef);
            }
        },

        _createPromise : function() {
            if (!this.promise) {
                this.promise = {
                    resolve: function (data, append, status) {
                        this._invokeDataCallbacks(data, append, status);
                    }.bind(this),
                    fail: function (err, append) {
                        this._invokeErrorCallbacks(err, append);
                    }.bind(this),
                    then: function (callback, errorCallback) {
                        this.addCallback(callback, errorCallback);
                    }.bind(this)
                };
            }
            return this.promise;
        },

        _invokeDataCallbacks : function(data, append, status) {
            if (this.dataCallbacks && this.dataCallbacks.length > 0) {
                this.dataCallbacks.map(function(callback) {
                    callback(data, append, status);
                });
            }
        },

        _invokeErrorCallbacks : function(err, append) {
            if (this.errorCallbacks && this.errorCallbacks.length > 0) {
                this.errorCallbacks.map(function(callback) {
                    if (callback && callback.apply) {
                        callback(null, append);
                    }
                });
            }
        },

        addCallback : function(callback, errorCallback) {
            this.dataCallbacks.push(callback);
            this.errorCallbacks.push(errorCallback);
        },

        persistData : function(data, dataPersistedCallback, errorCallback) {
            if (this.persistValueChange) {
                if (!this.promise) {
                    this._createPromise();
                }
                // file uploads must use PUT or POST
                if (String(this.fileUpload).toLowerCase() === "true" &&
                    (this.valueChangePersistMethod !== "POST" || this.valueChangePersistMethod !== "PUT")) {
                    this.valueChangePersistMethod = "POST";
                }
                this._loadData(false, null, null, this.valueChangePersistMethod, data, {
                    resolve : function(reqData, append) {
                        if (dataPersistedCallback && dataPersistedCallback.apply) {
                            dataPersistedCallback(reqData);
                        }
                    },
                    fail : function(err, append) {
                        if (errorCallback && errorCallback.apply) {
                            errorCallback(err);
                        }
                        this._invokeErrorCallbacks(err);
                    }.bind(this)
                }, true);
            }
        },

        _loadData : function(skipShowLoading, sort, filters, method, dataToPersist, promise, persistValueChange) {
            if (this._loadDataCountdown) {
                clearTimeout(this._loadDataCountdown);
            }
            // use a countdown timer to prevent duplicate load requests
            this._loadDataCountdown = setTimeout(function() {
                this._initialLoadComplete = true;
                delete this._loadDataCountdown;

                if (((filters && filters.preventDefault === true) || !this._lastPageLoaded) &&
                    this.promise && (!this.boundProperties || (this.boundProperties && this.boundServiceUrl))
                    && (!this.writeOnly || (this.writeOnly && dataToPersist))
                    && (!this.widgetCanLoadDataCallback || (this.widgetCanLoadDataCallback && this.widgetCanLoadDataCallback()))) {

                    if (!method) {
                        method = this.method;
                    }

                    if (!this._appliedInitialSortAndFilters) {
                        this._appliedInitialSortAndFilters = true;
                        if (!filters && this.initialFilters) {
                            filters = this.initialFilters;
                        }
                        if (!sort && this.initialSort) {
                            sort = this.initialSort;
                        }
                    }

                    var sorting = sort || filters ? true : false;
                    if (this.preserveSort) {
                        if (!sort && this._lastSort) {
                            sort = this._lastSort;
                        }
                        else if (sort) {
                            this._lastSort = sort;
                        }
                    }
                    if (this.preserveFilters && (!filters || !filters.preventDefault)) {
                        if (!filters && this._lastFilters) {
                            // prevent the source param from being persisted as this is a 1-time indicator
                            if (this.sourceParam) {
                                delete this._lastFilters[this.sourceParam];
                            }
                            filters = this._lastFilters;
                        }
                        else if (filters) {
                            this._lastFilters = filters;
                        }
                    }

                    var params = this._createRequestParams(skipShowLoading, method);
                    params.preventDefault = filters && filters.preventDefault === true;
                    params.persistValueChange = this.persistValueChange && persistValueChange === true;

                    if (dataToPersist) {
                        // convert json data to a query string for get requests
                        if (method === "GET") {
                            var urlQueryParts = params.url.split("?");
                            params.url = urlQueryParts[0] + formUtil.convertMapToQuery(dataToPersist,
                                    "?" + (urlQueryParts.length === 2 ? urlQueryParts[1] : ""), true);
                        }
                        else {
                            if (String(this.fileUpload).toLowerCase() === "true" && window.FormData) {
                                // convert the data into a form data object
                                var key, formData = new window.FormData();
                                for (key in dataToPersist) {
                                    if (key) {
                                        formData.append(key, dataToPersist[key]);
                                    }
                                }
                                params.data = formData;
                                params.fileUpload = true;
                            }
                            else {
                                params.data = this.persistValueJSON ? JSON.stringify(dataToPersist) : String(dataToPersist);
                            }
                        }
                    }
                    if (method === "POST") {
                        params.contentType = "application/json;charset=UTF-8";
                    }

                    var lastRequestParams = {};
                    if (this.pageSize > 0) {
                        var addtlParams = "";
                        if (this.rangeHeader && !params.fixtures) {
                            if (!params.headers) {
                                params.headers = {};
                            }
                            params.headers.Range = "items=" + this.start + "-" + (this.start + this.pageSize - 1);
                        }
                        else {
                            addtlParams += this.paginationParamNameLimit + "=" + this.pageSize + "&"
                                + this.paginationParamNameOffset + "=" + this.start;
                        }

                        lastRequestParams[this.paginationParamNameLimit] = this.pageSize;
                        lastRequestParams[this.paginationParamNameOffset] = this.start;

                        if (sort && sort.column) {
                            addtlParams += "&sort=";
                            if (sort.asc === -1) {
                                addtlParams += "-";
                                lastRequestParams.sort = "-" + sort.column;
                            }
                            else {
                                lastRequestParams.sort = sort.column;
                            }
                            addtlParams += getURLSafeParamValue(sort.column);
                        }

                        if (filters) {
                            var filter;
                            for (filter in filters) {
                                if (filter && filters.hasOwnProperty(filter)) {
                                    addtlParams += "&" + filter + "=" + getURLSafeParamValue(filters[filter]);
                                    lastRequestParams[filter] = filters[filter];
                                }
                            }
                        }

                        if (params.fixtures) {
                            params.fixture += (params.fixture.indexOf("?") >= 0 ? "&" : "?") + addtlParams;
                        }
                        else {
                            params.url += (params.url.indexOf("?") >= 0 ? "&" : "?") + addtlParams;
                        }

                    }
                    this._lastRequestParams = lastRequestParams;
                    
                    // also add the last request params into the source param map
                    params.sourceParamMap = $.extend({}, lastRequestParams, params.sourceParamMap);

                    this.getData(params, promise || this.promise, sorting);
                }
            }.bind(this), this._initialLoadComplete ? this.loadDataCountdownMillis : this.loadInitialDataCountdownMillis);
        },

        _createRequestParams : function(skipShowLoading, method) {
            var hasBoundServiceUrl = this.boundProperties && this.boundServiceUrl,
                url = hasBoundServiceUrl ? this.boundServiceUrl : this.serviceUrl || "",
                fixtures = ((this.fixtureUrl || url) && String(this.fixtures).toLowerCase() === "true") ||
                    (model.getConfigValue("fixtures") === true),
                params = {
                    timeout : this.timeout,
                    url : url,
                    method : method,
                    fixture : hasBoundServiceUrl && fixtures ? url : this.fixtureUrl,
                    fixtures : fixtures,
                    handleAs : this.handleAs,
                    skipShowLoading : this.skipShowLoading || skipShowLoading,
                    allowEmptyResponse : this.allowEmptyResponse,
                    hideNotificationCallback : this.hideNotificationCallback,
                    showNotificationCallback : this.showNotificationCallback,
                    enableGetRedirect : this.enableGetRedirect
                };

            if (this.headers) {
                params.headers = this.headers;
            }

            // add optional params
            if (this.serviceRequestFilters) {
                params.serviceRequestFilters = this.serviceRequestFilters;
            }

            if (this.latency >= 0) {
                params.latency = this.latency;
            }

            if (this.validResponseCodes && this.validResponseCodes.length > 0) {
                params.validResponseCodes = this.validResponseCodes;
            }

            // include the widget and view ids in case we need them
            params.widgetId = this.widgetKey;
            params.viewId = this.viewId;

            // also include the json data map in case it is needed
            params.sourceParamMap = $.extend(true, {widget : this.widgetKey}, this.getPropertyDataMap());
            return params;
        },

        getLastRequestParams : function() {
            return this._lastRequestParams || {};
        },

        getLastResponseHeaders : function() {
            return this._lastResponseHeaders || {};
        },

        onWidgetShown : function() {
            // wait just a tick in case another get data request is made (negating this one)
            setTimeout(function() {
                if (this._cachedGetDataArgs) {
                    this.getData.apply(this, this._cachedGetDataArgs);
                }
            }.bind(this), 100);
        },

        isCurrentlyLoading : function() {
            return this._requestsLoading > 0;
        },

        getData : function(params, promise, sorting) {
            if (this.widgetVisibleCallback && !this.widgetVisibleCallback()) {
                this._cachedGetDataArgs = arguments;
                return;
            }
            delete this._cachedGetDataArgs;

            this.onBeforeLoad();
            var startTime = new Date().getTime(),
                append = this.pageSize > 0 && this.start >= this.pageSize;
            this._lastStartTime = startTime;
            this._requestsLoading++;


            // resolve now to indicate loading state but only for the first page and not when polling
            if ((!this.pageSize || (this.pageSize > 0 && !this.start)) && !sorting && params && params.method === "GET"
                && this.pollingInterval === -1 && this.resolveEmptyPromiseBeforeLoad) {
                promise.resolve(null, false, "loading");
            }

            var onSuccess = function(data, status, xhr, notification) {

                // if response headers are available, convert to a map and make accessible from the datastore
                if (xhr && xhr.getAllResponseHeaders) {
                    this._lastResponseHeaders = {
                        responseHeaders : {}
                    };
                    var headerMap = {},
                        headers = xhr.getAllResponseHeaders();

                    if (headers && headers.trim) {
                        headers = headers.trim().split(/[\r\n]+/);
                        headers.forEach(function(h) {
                            h = h.split(": ");
                            headerMap[h[0]] = h[1];
                        });
                    }

                    this._lastResponseHeaders.responseHeaders[this.widgetKey] = headerMap;
                }

                // TODO this feels rather specific
                // when persisting, determine the status of persisting from the status or notification.type and then dispatch a more specific event (e.g. persistedSuccess)
                if (this.persistValueChange && params.persistValueChange && this.widgetDispatchEventCallback) {

                    var type = notification && notification.type ? notification.type : status,
                        persistedPostfix = type && type.length > 1 ? type.charAt(0).toUpperCase() + type.slice(1) : type;
                    if (persistedPostfix) {
                        this.widgetDispatchEventCallback("persisted" + persistedPostfix, data, true);
                    }
                }

                if (!this.allowDuplicateRequests && startTime < this._lastStartTime) {
                    this._handleDuplicateRequestError(params);
                    return;
                }

                if (!this.serviceMapper && params.preventDefault !== true) {
                    this.updateItemsLoaded(data);
                }
                promise.resolve(this.extractItems && data && data.items ? data.items : data, append);
                this._requestsLoading--;
                this.onAfterLoad();
            }.bind(this);

            model.ajax(params)
                .done(function(data, status, xhr, notification) {
                    // if we have an unresolved async service mapper, load it before calling the success handler
                    if (this.asyncServiceMapper) {
                        this._loadServiceMapper(this.asyncServiceMapper, function(mapper) {
                            if (mapper === false) {
                                notificationUtil.extractHideAndShowNotification({
                                    message : notificationUtil.getErrorMessageGeneric(),
                                    type : "error"
                                }, params.widgetId, params.hideNotificationCallback, params.showNotificationCallback);
                            }
                            else if (mapper) {
                                widgetDataUtil.addServiceMapper(this.asyncServiceMapper, mapper);
                                delete this.asyncServiceMapper;
                            }
                            // TODO should the fail handler be called if the service mapper could not be loaded?
                            onSuccess(data, status, xhr, notification);
                        }.bind(this));
                    }
                    else {
                        onSuccess(data, status, xhr, notification);
                    }
                }.bind(this))
                .fail(function(err) {
                    if (!this.allowDuplicateRequests && startTime < this._lastStartTime) {
                        this._handleDuplicateRequestError(params);
                        return;
                    }

                    promise.fail(err, append);
                    this._requestsLoading--;
                    this.onAfterLoad();
                    this.onLoadError();
                }.bind(this));
        },

        updateItemsLoaded : function(data) {
            if (!this.itemsLoaded) {
                this.itemsLoaded = 0;
            }
            var items = (this.extractItems || this.paginationOnlyExtractItems)  && data && data.items
                ? data.items || [] : (data && data.data ? (data.data || []) : data || []);
            if (this.pageSize > 0) {
                this.itemsLoaded += items.length;

                // reached the last page?
                if (!items.length || items.length < this.pageSize ||
                    (window.Modernizr.printlayout && ((this.start + Number(this.pageSize)) / this.pageSize) >= this.printMaxPages)) {
                    this._lastPageLoaded = true;
                }
                // technically this should not be incremented if the last page has been loaded, but doing so just in case
                this.start += Number(this.pageSize);
            }
            else {
                this.itemsLoaded = items.length;
            }
        },

        _loadServiceMapper : function(mapper, callback) {
            if (mapper && mapper.indexOf(".") > 0) {
                var mapperParts = mapper.split("."),
                    dataType = mapperParts[mapperParts.length - 1];

                if (dataType) {
                    dataType = dataType.toLowerCase();
                    if (dataType === "js") {
                        window.require([mapper], callback);
                    }
                    else if (dataType === "json" || dataType === "xml") { // TODO deprecated support for XML
                        model.ajax({
                            url : mapper,
                            handleAs : dataType
                        }).done(callback).fail(callback.bind(callback, false));
                    }
                }
            }
        },

        _handleDuplicateRequestError : function(params) {
            if (window.console && typeof window.console.error === "function") {
                console.error("ERROR: duplicate request detected and rejected for "
                    + (params ? (params.fixtures ? params.fixture : params.url) : "N/A")
                    /*+ ". Consider using widgetData.justInTimeLoading"*/);
            }
        },

        _resetPagination : function() {
            this._lastPageLoaded = false;
            this.start = 0;
            this.itemsLoaded = 0;
        },

        unbindProperty : function(propertyName) {
            if (this._propDataMap) {
                delete this._propDataMap[propertyName];
                this._resetPagination();
            }
        },

        unbindProperties : function() {
            this._propDataMap = {};
            this._resetPagination();
        },

        hasBoundProperty : function(propName) {
            return this.boundProperties && this.boundProperties.filter(function(el) {
                return el === propName;
            }).length > 0;
        },

        getBoundProperties : function() {
            return this.boundProperties;
        },

        bindProperties : function(propertyDataMap, propName, force, sort, filters, createPromise) {
            // TODO figure out a way to cache so we can handle multiple required values
            // the reason this is tricky is bc one value can change before another value does
            // making the combination invalid and subject to immediate change once a valid value is bound
            // TODO if the only values in here already match what we have, just bail.
            // TODO we really need to determine the dependency tree and wait to update until the entire tree is updated.
            // at the moment, we may get a series of requests, only the latter of which is valid

            if (!this._propDataMap) {
                this._propDataMap = {};
                // initialize the prop data map with null values for all bound properties
                if (this.boundProperties && this.boundProperties.length > 0) {
                    var i = 0, boundProp;
                    for (i; i < this.boundProperties.length; i++) {
                        boundProp = this.boundProperties[i];
                        if (boundProp) {
                            this._propDataMap[boundProp] = null;
                        }
                    }
                }
            }

            if (!force && !templateUtils.hasNewBoundPropertyValue(this._propDataMap, propertyDataMap,
                this.boundProperties, this.autoBoundProp !== null)
                && (!filters || filters === this._savedFilters)) {
                // skip processing if there is nothing new to process
                return;
            }
            delete this._cachedGetDataArgs;
            var proceed = true,
                madeEmptyPromise = false,
                missingPropertyValueHandler = function(missingVal) { // we need to resolve the promise if a property value is missing
                    proceed = false;
                    if (this.promise && !madeEmptyPromise) {
                        madeEmptyPromise = true;
                        // this.promise.resolve([]);
                    }
                }.bind(this);
            this._boundPropMap = templateUtils.getBoundPropertyMap(this._propDataMap, propertyDataMap, this.boundProperties,
                missingPropertyValueHandler, getURLSafeParamValue);

            if (proceed) {
                this.boundServiceUrl = templateUtils.replaceTemplatePlaceholders(this[propName], this._boundPropMap);
                this._resetPagination();
                if (!filters && this._savedFilters) {
                    filters = this._savedFilters;
                }
                if (!sort && this._savedSort) {
                    sort = this._savedSort;
                }
                this._savedFilters = null;
                this._savedSort = null;

                if (createPromise) {
                    this.loadData(sort, filters);
                }
                else {
                    this._loadData(false, sort, filters);
                }
            }
            else {
                if (filters) {
                    this._savedFilters = filters;
                }
                if (sort) {
                    this._savedSort = sort;
                }

                // TODO this is new and may be suspect if something breaks :)
                this.boundServiceUrl = "";
            }
        },

        setBoundProperties : function(props) {
            this.boundProperties = props || [];
        },

        getBoundPropertyMap : function() {
            return this._boundPropMap || {};
        },

        hasDataForAllBoundProperties : function(propMap) {
            if (propMap && this.boundProperties && this.boundProperties.length > 0) {
                var i = 0, prop;
                for (i; i < this.boundProperties.length; i++) {
                    prop = this.boundProperties[i];
                    // todo this only checks that there is an entry for this prop, not each specific value from it (e.g. re.id & re.label)
                    if (prop && propMap[prop.split(".")[0]] === undefined) {
                        return false;
                    }
                }
                return true;
            }
            return false;
        },

        getPropertyDataMap : function() {
            return this._propDataMap || {};
        },

        isValueEqual : function(propertyName, value, valueProp) {
            var origVal = this._propDataMap ? this._propDataMap[propertyName] : null;
            return value === origVal || JSON.stringify(value) === JSON.stringify(origVal) ||
                (valueProp && value && origVal && value[valueProp] === origVal[valueProp]);
        }

    });
});