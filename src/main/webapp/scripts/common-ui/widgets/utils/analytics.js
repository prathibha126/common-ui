define([
    "exports",
    "common-ui/widgets/utils/url"
], function(exports, url) {

    "use strict";

    exports.init = function(projectName, projectContext) {
        var isProd = !url.isNonProd();
        window.digitalData = {
            isProd : isProd,
            premierFunctions: {
                //Create an array which will hold the data passed into the track function if Tealium has not loaded yet
                trackHistory: [],
                track: function(data) {
                    try {
                        //Check to see if Tealium has loaded & created our internal tracking function yet.
                        if(digitalData.premierFunctions.internalTrack) {
                            //The internal function has loaded, pass the data into it
                            digitalData.premierFunctions.internalTrack(data);
                        } else {
                            //Our internal track function has not loaded yet, save the data for a later execution
                            var trackObj = {
                                data: data,
                                time: new Date()
                            };
                            digitalData.premierFunctions.trackHistory.push(trackObj);
                        }
                        return "success";
                    } catch(err) {
                        return "error";
                    }
                }
            }
        };
        window.utag_data = {};

        var analyticsTagURL = isProd ?
            '//pwa.premierinc.com/tags/' + projectName + '/prod/utag.js' :
            '//pwadev.premierinc.com/tags/' + projectName + '/dev/utag.js';

        (function (a, b, c, d) {
            a = analyticsTagURL;
            b = document;
            c = 'script';
            d = b.createElement(c);
            d.src = a;
            d.type = 'text/java' + c;
            d.async = true;
            a = b.getElementsByTagName(c)[0];
            a.parentNode.insertBefore(d, a);
        })();
    };

    exports.track = function(data) {
        // TODO queue these and push intermittently
        if (window.digitalData && digitalData.premierFunctions && digitalData.premierFunctions.track) {

            setTimeout(function() {
                digitalData.premierFunctions.track(data);
            }.bind(this), 1000);
        }
    };

    exports.viewChange = function(viewName, context, startTime, endTime) {

        this.track({
            event_category : "view",
            action : "change",
            viewName : viewName || "",
            context : context || {},
            responseTime : Math.max((endTime - startTime), 0) || 0
        });
    };

    exports.filterChange = function(viewName, filterName, newValue, context, startTime, endTime) {

        this.track({
            event_category : "filter",
            action : "change",
            filterID : filterName,
            viewName : viewName,
            filterValue : newValue,
            responseTime : Math.max((endTime - startTime), 0) || 0,
            context : context
        });
    };

    exports.inputChange = function(viewName, inputName, newValue) {
        this.track({
            event_category : "input",
            action : "change",
            inputID : inputName,
            inputValue : newValue,
            viewName : viewName
        });
    };

    exports.help = function(viewName) {
        this.track({
            event_category : "help",
            action : "view",
            viewName : viewName || ""
        });
    };

    exports.exportData = function(viewName, label, format) {
        this.track({
            event_category : "export",
            action : "view",
            viewName : viewName || "",
            label : label || "",
            format : format || "xlsx"
        });
    };

    exports.action = function(viewName, action, context) {
        this.track({
            event_category : "user-action",
            action : action,
            viewName : viewName || "",
            context : context
        });
    };

    exports.methodTiming = function(methodName, responseTime) {
        // TODO enable this when ready
        return;
        // this can be noisy, so delay a bit more
        setTimeout(function() {
            this.track({
                event_category : "method_timing",
                methodName : methodName,
                responseTime : responseTime
            });
        }.bind(this), 1000);
    };

});