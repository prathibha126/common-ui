define([
    "jquery",
    "Class",
    "common-ui/widgets/utils/formUtil",
    "common-ui/widgets/utils/notificationUtil",
    "common-ui/widgets/utils/templateUtil",
    "common-ui/widgets/utils/analytics"
], function($, Class, formUtil, notificationUtil, templateUtil, analytics) {

    "use strict";

    var config = {
            baseHostname : "",
            baseUrl : ""
        },
        activeRequests = {};

    return Class.extend({

        fixtures : false,
        baseUrl : "",
        latency : 0,

        setConfig : function(configuration) {
            // this method should only be called once and will modify the static config var shared by all model instances
            config = configuration;
        },

        addConfig : function(prop, value) {
            if (config) {
                config[prop] = value;
            }
        },

        getConfigValue : function(prop) {
            return config ? config[prop] : null;
        },

        getStartupParams : function() {
            if (config && config.startupParams) {
                return config.startupParams;
            }
            return {};
        },

        ajax : function(params) {
            if (!params) {
                params = {};
            }
            var fixturesEnabled = (config.fixtures || this.fixtures || params.fixtures) && !params.disableFixtures,
                url = fixturesEnabled ? params.fixture :
                (config && config.baseUrl ? config.baseUrl : "") + (this.baseUrl || "") + (params.url || ""),
                headers = params.headers || {},
                method = (params.method || "GET").toUpperCase();

            // update the param value since this is referenced later
            params.method = method;

            // for local deployments
            if (config.baseHostname && window.location.hostname.indexOf("premierinc") === -1) {
                // for now only for local requests we will include the widget and view id
                if (params.widgetId) {
                    headers.widget_id = params.widgetId;
                }
                if (params.viewId) {
                    headers.view_id = params.viewId;
                }
            }

            // apply jwt token header to all state-changing operations:
            if (method === "POST" || method === "PUT" || method === "DELETE" || method === "PATCH") {
                var token = formUtil.getUserToken(),
                    header = formUtil.getUserTokenHeaderName();
                if (token && header) {
                    headers[header] = token;
                }   
            }

            // if there is a simultaneous request for the same data, abort it!
            // TODO this does not prevent the same request but with diff params, should it?!
            if (activeRequests[url] && activeRequests[url].abort) {
                return activeRequests[url];
                /* // TODO will this work to satisfy both??!
                 activeRequests[url].abort();
                 delete activeRequests[url];*/
            }
            else {
                // dispatch a global ajax event for net new requests
                $(document).trigger("ajaxRequest", [url, config.hideLoadingIndicator || params.skipShowLoading], params.noExtendSession);
            }
            var startTime = Date.now(),
                ajaxParams = {
                    cache : params.cache || false,
                    type : method,
                    url : url,
                    data : params.data || null,
                    dataType : params.handleAs || "json",
                    timeout : params.timeout || 45000,
                    headers : headers
                };

            // override params for file upload
            if (params.fileUpload) {
                ajaxParams.contentType = false;
                ajaxParams.processData = false;
            }
            else if (params.contentType) {
                ajaxParams.contentType = params.contentType;
            }
            if (params.allowEmptyResponse) {
                ajaxParams.dataFilter = function(data, type) {
                    if (type === "json" && data === "") {
                        return null;
                    }
                    return data;
                };
            }

            var dfd = new $.Deferred(),
                signalRequestComplete = function() {
                    $(document).trigger("ajaxRequestComplete", [url, config.hideLoadingIndicator || params.skipShowLoading]);
                };
            if (!ajaxParams.url) {
                if (window.console && typeof window.console.error === "function") {
                    console.error("Error no valid " + (fixturesEnabled ? "fixture " : "") +  "url was found for "
                        + (params.url || params.fixtureUrl));
                }
                signalRequestComplete();
                dfd.reject.apply(this, arguments);
                return dfd;
            }

            var cancelRequest = false,
                resolveRequest = false,
                resolveArgs = null;
            if (params.serviceRequestFilters) {
                var filters = $.isArray(params.serviceRequestFilters) ? params.serviceRequestFilters : [params.serviceRequestFilters],
                    i = 0, filter;

                // add a function to enable cancelling the request from within a filter
                ajaxParams.cancel = function() {
                    cancelRequest = true;
                };
                // add a function to enable resolving the request from within a filter
                ajaxParams.resolve = function(args) {
                    resolveRequest = true;
                    resolveArgs = args;
                };
                for (i; i < filters.length; i++) {
                    filter = filters[i];
                    if (filter) {
                        ajaxParams = this._filterServiceRequest(filter, ajaxParams, params.sourceParamMap || {});
                    }
                }
                delete ajaxParams.cancel;
                delete ajaxParams.resolve;
            }
            if (cancelRequest) {
                signalRequestComplete();
                return dfd;
            }
            if (resolveRequest) {
                signalRequestComplete();
                dfd.resolve(resolveArgs);
                return dfd;
            } else {
                // latency can be specified at the model level or per ajax request
                setTimeout(function() {
                    var resp = activeRequests[url] = params && url ? $.ajax(ajaxParams) : $.Deferred().reject();

                    resp.done(function(response, status, xhr){
                        var duration = Date.now() - startTime;
                        setTimeout(function() {
                            // TODO strip params from url?
                            analytics.methodTiming(url, duration);
                        }, 500);

                        var ct = xhr ? xhr.getResponseHeader("content-type") || "" : "";

                        // TODO for now assuming any responses with html content type is a redirect to the login page
                        if (ct.indexOf('html') >= 0 && params.handleAs !== "html") {
                            $(document).trigger("sessionTimeout");
                        }
                        else if (ct.indexOf('javascript') === -1) {
                            this._resolve(dfd, params, response, status, xhr);
                        }
                    }.bind(this)).fail(function (err, reason) {
                        // check to see if this response code may actually be valid; precendence is param and then config
                        var status = err && err.status ? err.status : -1,
                            codes = params.validResponseCodes || config.validResponseCodes;
                        if (codes && codes.length > 0 && status && codes.indexOf(status) >= 0) {
                            this._resolve(dfd, params, err.responseJSON || {}, status, err);
                        }
                        else if (reason !== "abort" && reason !== "timeout") {
                            // show notifications embedded in error responses as well
                            if (err.responseJSON) {
                                notificationUtil.extractHideAndShowNotification(err.responseJSON.notification || err.responseJSON.notifications,
                                    params.widgetId, params.hideNotificationCallback, params.showNotificationCallback);
                            }

                            // status code 0 typically indicates cross-site scripting - which in our case is likely a redirect to the login page
                            // TODO may cause the page to reload unexpectedly depending on the type of error
                            if (err && String(err.status) === "0") {
                                $(document).trigger("sessionTimeout");
                            }
                            else {
                                dfd.reject.apply(this, arguments);
                            }
                        }
                        else if (reason === "timeout") {
                            dfd.reject.apply(this, arguments);
                        }
                    }.bind(this)).always(function (err, reason) {
                        if (reason !== "abort") {
                            delete activeRequests[url];
                            signalRequestComplete();
                        }
                    });
                }.bind(this), params.latency || this.latency || 0);
            }
            return dfd.promise();
        },

        _filterServiceRequest : function(filter, ajaxParams, sourceParamMap) {
            var serviceRequestFilters = this.getConfigValue("serviceRequestFilters");
            if (serviceRequestFilters && serviceRequestFilters[filter]) {
                var srf = serviceRequestFilters[filter];
                if (srf && (srf.filterRequest || (typeof srf === "function" && srf.apply))) {
                    try {
                        var result;
                        if (srf.filterRequest) {
                            result = srf.filterRequest(ajaxParams, sourceParamMap);
                        }
                        else {
                            result = srf(ajaxParams, sourceParamMap);
                        }
                        if (result !== null && result !== undefined) {
                            return result;
                        }
                    }
                    catch (ex) {
                        if (window.console && typeof window.console.error === "function") {
                            console.error("ERROR: service request filter " + filter + " encountered exception during filtering", ex);
                        }
                    }
                }
            }
            // if the mapper fails, bypass it
            return ajaxParams;
        },

        _resolve : function(promise, params, data, status, xhr) {
            var notification = data ? notificationUtil.extractHideAndShowNotification(data.notification || data.notifications,
                params.widgetId, params.hideNotificationCallback, params.showNotificationCallback) : null;
            // POST response body objects can include a redirect
            if (params.method && (params.method.toUpperCase() === "POST" || params.enableGetRedirect ||
                (this.getConfigValue("enableGetRedirect") === true && params.method.toUpperCase() === "GET")) && data && data.redirect) {
                window.location = templateUtil.decodeHTMLEntities(data.redirect);
                return;
            }
            promise.resolve(data && (data.body || notification) ? data.body : data, status, xhr,
                notification ? notification.data : null);
        }
    });
});