define([
    "jquery",
    "common-ui/widgets/utils/templateUtil"
], function($, templateUtil) {

    "use strict";

    var STARTUP_PARAM_HASH = "__hash__",
        QUERY_PARAM_REGEX_PREFIX = "REGEX:",
        lastUri,
        lastRouterState,
        skipNextRouterStateUpdate = false;

    return {

        getQueryStringParams : function() {
            var params = {},
                url = window.location.href,
                hashIndex = url.indexOf("#");

            // separate hash from url
            if (hashIndex > 0) {
                var pieces = url.split("#");
                if (pieces.length >  1) {
                    var hash = pieces[1];
                    if (hash) {
                        var hashPieces = hash.split("/");
                        if (hashPieces && hashPieces.length > 0) {
                            hashPieces.map(function(hashPiece) {
                                if (hashPiece.indexOf("?") === 0 && hashPiece.length > 0) {
                                    var hashParams = hashPiece.substr(1).split("&");
                                    if (hashParams && hashParams.length > 0) {
                                        hashParams.map(function(hashParam) {
                                            if (hashParam) {
                                                var hashParamPieces = hashParam.split("=");
                                                params[hashParamPieces[0]] = hashParamPieces.length > 1 ?
                                                    hashParamPieces[1] : undefined;
                                            }
                                        });
                                    }
                                }
                                else if (hashPiece) {
                                    // this will overwrite with the last one - which is all we need for now
                                    params[STARTUP_PARAM_HASH] = hashPiece;
                                }
                            });
                        }
                    }
                }
                url = pieces[0];
            }
            if (url.indexOf('?') > 0) {
                var i = 0, queryParam, queryVal,
                    queryParams = url.slice(url.indexOf('?') + 1).split('&');

                for (i; i < queryParams.length; i++) {
                    queryParam = queryParams[i];
                    if (queryParam && queryParam.indexOf("=") > 0) {
                        queryParam = queryParam.split('=');
                        if (queryParam.length > 1) {
                            queryVal = queryParam[1];
                            params[queryParam[0]] = queryVal;
                        }
                    }
                }
            }
            return params;
        },

        hashChanged : function() {
            var newUri = window.location.href,
                changedParams = null;
            if (lastUri !== newUri) {
                var oldParams = this.getHashParamsFromUri(lastUri),
                    newParams = this.getHashParamsFromUri(newUri);

                changedParams = {};
                if (newParams) {
                    var key;
                    for (key in newParams) {
                        if (key && newParams[key] !== null && newParams[key] !== undefined &&
                            newParams[key] !== oldParams[key]) {
                            changedParams[key] = newParams[key];
                        }
                    }
                }
                lastUri = newUri;
            }
            return changedParams;
        },

        getHashParamsFromUri : function(uri) {
            var params = {},
                hashIdx = uri ? uri.indexOf("#?") : -1;

            if (hashIdx > 0 && uri.length > hashIdx + 2) {
                var hash = uri.substr(hashIdx + 2),
                    slashIdx = hash.lastIndexOf("/");
                if (slashIdx > 0) {
                    hash = hash.substring(0, slashIdx);
                }
                if (hash && hash.length > 0) {
                    var hashParams = hash.split("&");
                    hashParams.map(function(param) {
                        if (param) {
                            var splitParam = param.split("=");
                            if (splitParam && splitParam.length > 1) {
                                params[splitParam[0]] = splitParam[1] !== null && splitParam[1] !== undefined && isNaN(splitParam[1]) ?
                                    templateUtil.decodeParam(splitParam[1], true) : splitParam[1];
                            }
                        }
                    });
                }
            }

            return params;
        },

        skipNextRouterStateUpdate : function() {
            skipNextRouterStateUpdate = true;
        },

        updateRouterState : function(newRoute, replaceCurrent, restorePrevious, stateData) {
            var newState = restorePrevious ? lastRouterState : {route : newRoute, stateData : stateData},
                route = newState ? encodeURIComponent(newState.route) : "";

            if (skipNextRouterStateUpdate) {
                skipNextRouterStateUpdate = false;
                lastRouterState = newState;
                return;
            }

            // prevent duplicating state entries:
            if (restorePrevious || !lastRouterState ||
                (!restorePrevious && lastRouterState && lastRouterState.route !== route)) {

                // append route query params if provided
                var routeQueryParams = stateData ? this.convertMapToQuery(stateData, "", true) : "";
                if (routeQueryParams) {
                    routeQueryParams = "?" + routeQueryParams;
                }

                if (replaceCurrent) {
                    window.history.replaceState(newState, null, route + routeQueryParams);
                }
                else {
                    window.history.pushState(newState, null, route + routeQueryParams);
                }
                lastRouterState = newState;
            }
            return route;
        },

        updateQueryState : function(stateMap) {
            // TODO track nav widget value change in history state
            //window.history.replaceState()
        },

        navigateToPreviousView : function() {
            window.history.back();
        },

        navigateToViewDelta : function(viewDelta) {
            if (!isNaN(viewDelta)) {
                window.history.go(viewDelta);
            }
        },

        extractQueryParams : function(queryString, separator) {
            // from a string e.g. "a=2&b=*&d!=3, will extract a list of the associated params in the following format:
            // [{key : a, value : 2, negated : false}, {key : b, value : *, negated : false}, {key : c, value : 3, negated : true}
            var params = [];
            if (queryString) {
                if (!separator) {
                    queryString = templateUtil.htmlDecode(queryString, "text");
                }
                // auto guess separator if we find || or &&
                if (!separator) {
                    if (queryString.indexOf("||") > 0) {
                        separator = "||";
                    }
                    else if (queryString.indexOf("&&") > 0) {
                        separator = "&&";
                    }
                }
                var triggerDataParams = queryString.split(separator || "&");
                triggerDataParams.map(function (triggerDataParam) {
                    if (triggerDataParam) {
                        var opIdx = triggerDataParam.indexOf("="), // find the first index of =
                            opDoubleEq = triggerDataParam.length > opIdx + 2 && triggerDataParam[opIdx + 1] === "=",
                            keyVal = [triggerDataParam.substring(0, opIdx), triggerDataParam.substring(opIdx + (opDoubleEq ? 2 : 1))];
                        if (keyVal && keyVal.length === 2 && keyVal[0]) {
                            var origKeyVal = keyVal[0],
                                op = origKeyVal.slice(-1),
                                negated = op === "!" || op === "^",
                                contains = op === "~" || op === "^",
                                eq = op === "=",
                                gt = op === ">", // only supports <= or >=; not < or >. cannot be combined with negated or contains
                                lt = op === "<",
                                key = eq || negated || contains || gt || lt ? origKeyVal.substr(0, origKeyVal.length - 1) : origKeyVal,
                                keyParts = key.split("."),  // the key should only include the initial value ("a" from "a.b.c")
                                value = keyVal[1],
                                param = {key: keyParts.shift(), or : separator === "||"};

                            if (param.key && param.key.charAt(0) === "#" && param.key.length > 1) {
                                param.key = param.key.substring(1);
                                param.static = true;
                            }

                            if (value && value.indexOf(QUERY_PARAM_REGEX_PREFIX) === 0 && value.length > QUERY_PARAM_REGEX_PREFIX.length) {
                                value = value.substring(QUERY_PARAM_REGEX_PREFIX.length);
                                param.regex = new RegExp(value, "g");
                            }
                            param.value = value;

                            if (contains) {
                                param.contains = contains;
                            }
                            if (gt) {
                                param.gt = gt;
                            }
                            if (lt) {
                                param.lt = lt;
                            }
                            if (negated) {
                                param.negated = negated;
                            }
                            // if the key was something like a.b.c, key = "a" and keyParts = ["b", "c"]
                            if (keyParts.length > 0) {
                                // convert to ".b.c" as a postfix that will later be appended to the key for value lookup
                                param.keyPostfix = "." + keyParts.join(".");
                            }
                            params.push(param);
                        }
                    }
                });
            }
            return params;
        },

        doesDataMatchQueryParams : function(data, queryParams) {
            var doesMatch = true;
            if (queryParams && queryParams.length > 0) {
                var i = 0, item;
                for (i; i < queryParams.length; i++) {
                    item = queryParams[i];
                    if (item && item.key) {
                        var propValue = item.static === true ? item.key :
                            (item.key === "_value_" && !item.keyPostfix ? data :
                                templateUtil.getPropertyValue(item.key + (item.keyPostfix || ""), data)),
                            isWildcard = item.value === "*",
                            matchesRegex,
                            isNumeric = item.gt || item.lt || item.num;

                        // handle contains within an array differently
                        if (!item.regex && item.contains && $.isArray(propValue)) {
                            var j = 0, itemValueString = String(item.value), foundMatch = false;
                            for (j; j < propValue.length; j++) {
                                if (String(propValue[j]) === itemValueString) {
                                    if (item.or && !item.negated) {
                                        return true;
                                    }
                                    foundMatch = true;
                                }
                            }
                            if (!item.or && ((!item.negated && !foundMatch) || (item.negated && foundMatch))) {
                                return false;
                            }
                            if ((!item.negated && !foundMatch) || (item.negated && foundMatch)) {
                                doesMatch = false;
                            }
                        }
                        else {
                            // handle regex differently than standard values; currently only supported with equals and not equals
                            if (item.regex) {
                                matchesRegex = item.regex.test(String(propValue));
                                if (typeof propValue !== "undefined" && propValue !== null &&
                                    ((matchesRegex && !item.negated) || (!matchesRegex && item.negated))) {
                                    if (item.or) {
                                        return true;
                                    }
                                }
                                else {
                                    if (!item.or) {
                                        return false;
                                    }
                                    doesMatch = false;
                                }
                            }
                            // if value is * wild card, any value is allowed as long as the property is defined and non-null
                            else if ((isWildcard && ((!item.negated && typeof propValue !== "undefined" && propValue !== null) ||
                                (item.negated && (typeof propValue === "undefined" || propValue === null)))) ||
                                // non-wildcard numeric searches
                                (!isWildcard && isNumeric && !isNaN(propValue) && !isNaN(item.value) &&
                                    ((item.gt && Number(propValue) >= Number(item.value)) || (item.lt && Number(propValue) <= Number(item.value)) || (item.num && Number(propValue) === Number(item.value)))
                                ) ||
                                // non-wildcard, non-numeric: use string compare for equality since value params are all strings
                                (!isWildcard && !isNumeric &&
                                    ((item.contains && !item.negated && String(propValue).indexOf(item.value) >= 0) ||
                                        (item.contains && item.negated && String(propValue).indexOf(item.value) === -1) ||
                                        (!item.contains && item.negated && String(propValue) !== String(item.value)) ||
                                        (!item.contains && !item.negated && String(propValue) === String(item.value))))) {

                                // first match in an or means this is valid
                                if (item.or) {
                                    return true;
                                }
                            }
                            else {
                                if (!item.or) {
                                    return false;
                                }
                                doesMatch = false;
                            }
                        }
                    }
                }
            }
            return doesMatch;
        },

        convertQueryToMap : function(query, decode, deep) {
            // converts a=1&b=2 to {a : 1, b : 2}
            //    if deep === true, converts a.x=1&a.y=2&b.z=3 to {a : {x : 1, y : 2}, b : {z : 3}}
            var map = {};
            if (query) {
                var queryParts = query.split("&");
                if (queryParts && queryParts.length > 0) {
                    var i = 0, queryPart, keyVals, param, val, paramParts, paramPart, ptr, j;
                    for (i; i < queryParts.length; i++) {
                        queryPart = queryParts[i];
                        if (queryPart) {
                            keyVals = queryPart.split("=");
                            if (keyVals && keyVals.length === 2) {
                                param = keyVals[0];
                                if (param) {
                                    val = decode ? templateUtil.decodeParam(keyVals[1], true) : keyVals[1];
                                    if (deep === true && param.indexOf(".") > 0) {
                                        paramParts = param.split(".");
                                        ptr = map;
                                        for (j = 0; j < paramParts.length; j++) {
                                            paramPart = paramParts[j];
                                            if (paramPart) {
                                                if (j < paramParts.length - 1) {
                                                    if (!ptr[paramPart] || typeof ptr[paramPart] !== "object") {
                                                        ptr[paramPart] = {};
                                                    }
                                                    ptr = ptr[paramPart];
                                                }
                                                else {
                                                    ptr[paramPart] = val;
                                                }
                                            }
                                        }
                                    }
                                    else {
                                        map[param] = val;
                                    }
                                }
                            }
                        }
                    }
                }
            }
            return map;
        },

        convertMapToQuery : function(map, query, encode) {
            // TODO consider using $.param
            var key;
            if (!query) {
                query = "";
            }
            if (map) {
                for (key in map) {
                    if (key && map[key] !== null && map[key] !== undefined) {
                        if (query && query.length > 0 && query.charAt(query.length - 1) !== "?") {
                            query += "&";
                        }
                        query += key + "=" + (encode ? encodeURIComponent(map[key]) : map[key]);
                    }
                }
            }
            return query;
        },

        getUserToken : function() {
            var token = $("meta[name='token']").attr("content");
            return token === "${token}" ? null : token;
        },

        getUserTokenParamName : function() {
            var paramName = $("meta[name='token_param']").attr("content");
            return paramName === "${tokenParamName}" ? null : paramName;
        },

        getUserTokenHeaderName : function() {
            var headerName = $("meta[name='token_header']").attr("content");
            return headerName === "${tokenHeaderName}" ? null : headerName;
        },

        appendUserTokenToUrl : function(url) {
            if (!url) {
                url = "";
            }
            url += (url.indexOf("?") === -1 ? "?" : "&") + this.getUserTokenParamName() + "=" + this.getUserToken();
            return url;
        },

        // TODO refactor this to be specifically for a file download util
        submitForm : function(url, paramDataName, params, method, target, paramMap, excludeUserToken) {
            /*var requestIdentifier = new Date().getTime(),
                iframe = $("<iframe style='display: none; height: 0px; width: 0px;' name='"
                    + requestIdentifier + "' id='" + requestIdentifier + "'></iframe>");*/

            // append the status identifier to the url
            /*if (url && url.indexOf("?") > 0) {
                url += "&";
            }
            else {
                url += "?";
            }
            url += "statusToken=" + requestIdentifier;*/

            // TODO keep generic and change to form data

            var form = $("<form method='" + (method || "POST") + "' target='" + (target || "_self") + "'/>"),
                input;
            form.attr('action', excludeUserToken === true ? url : this.appendUserTokenToUrl(url));
            if (paramDataName) {
                input = $("<input type='hidden'>");
                input.attr("name", paramDataName);
                input.val(JSON.stringify(params || {}));
                form.append(input);
            }

            if (paramMap) {
                var key;
                for (key in paramMap) {
                    if (key && paramMap[key] !== undefined) {
                        input = $("<input type='hidden'>");
                        input.attr("name", key);
                        input.val(paramMap[key]);
                        form.append(input);
                    }
                }
            }

            //iframe.appendTo("body");
            $("body").append(form);

            /*var wait = setInterval(function() {
                var statusCookie = getCookie(requestIdentifier);
                if (statusCookie) {
                    if (wait) {
                        clearInterval(wait);
                    }
                    // TODO handle errors
                    $(document).trigger("ajaxRequestComplete", requestIdentifier);
                    if (String(statusCookie) !== "true") {
                        $(document).trigger("showNotification", {
                            data : { //  TODO use generic message
                                message : "There was an error creating that file. Please contact the Premier Solution Center if this issue persists.",
                                type : "error"
                            },
                            dismissable : true
                        });
                    }
                    // clean up
                    iframe.remove();
                    form.remove();
                }
            }, 100);

            // now trigger the request
            $(document).trigger("ajaxRequest", [requestIdentifier]);*/
            form.submit();
            //iframe.remove();
            form.remove();
        }

    };
});