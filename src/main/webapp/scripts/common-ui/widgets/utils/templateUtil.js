define([
    "jquery",
    "common-ui/widgets/utils/formatter"
], function($, formatter) {

    "use strict";

    var RESERVED_WORD_MAP = {
        "arguments" : true,
        "eval" : true,
        "function" : true,
        "constructor" : true,
        "prototype" : true,
        "__proto__" : true
    };

    function _placeholderStripper(paramWithPlaceholders) {
        if (paramWithPlaceholders && paramWithPlaceholders.length >= 4) {
            return paramWithPlaceholders.substring(2, paramWithPlaceholders.length - 1);
        }
        return paramWithPlaceholders;
    }

    function _htmlDecode(val, elType) {
        if (val && typeof val === "string") {
            var decodedVal = val,
                i = 0,
                entities = [
                    [/<\s*script\s*>/ig, ''],
                    [/<\s*\/\s*script\s*>/ig, ''],
                    [/&#39;/g, '\''],
                    [/&x27;/g, '\''],
                    [/&rsquo;/ig, '\''],
                    [/&apos;/ig, '\''],
                    [/&nbsp;/ig, ' '],
                    [/&quot;/ig, '"'],
                    [/&#174;/g, '®'],
                    [/&reg;/ig, '®'],
                    [/&#169;/g, '©'],
                    [/&copy;/ig, '©'],
                    [/&#8482;/g, '™'],
                    [/&trade;/ig, '™'],
                    [/&bull;/ig, '•'],
                    [/&ldquo;/ig, '“'],
                    [/&rdquo;/ig, '”'],
                    [/&amp;/ig, '&'],
                    [/&ge;/ig, '≥'],
                    [/&le;/ig, '≤']
                ];

            // only escape < and > when using .text() for security!!!!
            if (elType === "text") {
                entities.push([/&gt;/ig, '>'], [/&lt;/ig, '<']);
            }

            /**
             ['#x2F', '/'],
             ['#47', '/'],*/
            for (i; i < entities.length; i++) {
                decodedVal = decodedVal.replace(entities[i][0], entities[i][1]);
            }
            return decodedVal;
        }
        return val;
    }

    function _getObjectPropertyValue(prop, obj) {
        // safely retrieve values from objects to prevent returning functions
        if (prop !== null && prop !== undefined && typeof prop === "string" && !RESERVED_WORD_MAP[prop]) {
            var propParts = prop.split(":"),
                formatString = null;
            if (propParts.length === 2) {
                prop = propParts[0];
                formatString = propParts[1];
            }
            if (obj !== null && obj !== undefined && typeof obj === "object" && obj.hasOwnProperty(prop) &&
                !RESERVED_WORD_MAP[prop] && typeof obj[prop] !== "function") {

                return formatString !== null ? formatter.format(obj[prop], formatString) : obj[prop];
            }
        }
        return null;
    }

    function _getPropertyValue(prop, value) {
        var propValPtr = null;
        // looks within value to find a property value; propName can be a.b.c.d.e or simply a
        if (prop && value) {
            var propWithoutFormatString = prop.split(":"),
                propEntries = propWithoutFormatString[0].split("."), j = 1;
            if (propEntries && propEntries.length > 0) {
                propValPtr = value[propEntries[0]];
                for (j; j < propEntries.length; j++) {
                    if (propWithoutFormatString.length > 1) {
                        propEntries[j] += ":" + propWithoutFormatString[1];
                    }
                    propValPtr = _getObjectPropertyValue(propEntries[j], propValPtr);
                }
                /*if (j === propEntries.length && (propValPtr === undefined || propValPtr === null)) {
                    return "";
                }*/
            }
        }
        return propValPtr;
    }

    function _placeholderReplacer(data, deepProps, skipDecode, elType) {
        return function(s) {
            var placeholder = _placeholderStripper(s),
                placeholderWithoutFormat = placeholder.split(":")[0],
                val = deepProps && placeholderWithoutFormat && placeholderWithoutFormat.indexOf(".") > 0
                    ? _getPropertyValue(placeholder, data) : _getObjectPropertyValue(placeholder, data);
            if (val === null || val === undefined) {
                return "";
            }
            return skipDecode ? val : _htmlDecode(val, elType);
        };
    }

    // markdownPatterns: Array
    //      an array of objects each containing a pattern (Regex) and replacement (String)
    //      currently supporting link markdown:
    //              [This link](relative/url/only?a=1&b=2|true) -> <span class="get" data-target="relative/url/only?a=1&b=2">This link</span>
    //                  "|true" above implies that this is a continue link that should be POST'd to, and the expectation is another notification response
    //              [This link](newEvent|100) -> <span class="customEvent hyperlink" data-evt="newEvent" data-value="100">This link</span>
    //                  when the link is clicked, the event in parenthesis will be dispatched; note the "|100" following the custom event name
    //                  is optional and if provided defines which unique value is associated with the custom event
    //              [This link](http://example.net/) -> <a href="http://example.net/" target="_blank">This link</a>.
    //      note more specific patterns should be provided first, as patterns are replaced in the order provided
    var markdownPatterns = [
        {pattern : /\[([\w ]+)\]\(([\w/\.\-\?=&]+)(?:\|true)\)/g, replacement : "<span class='continue hyperlink' data-continue=\"$2\">$1</span>"},
        {pattern : /\[([\w \W]+?)\]\(([\w]+)(?:\|([\w]+))?\)/g, replacement : "<span class='customEvent hyperlink'data-evt=\"$2\" data-value=\"$3\" >$1</span>"},
        {pattern : /\[([\w ]+)\]\(([\w:/\.\-\?=&]+)\)/g, replacement : "<a href=\"$2\" target=\"_blank\" rel=\"noopener\">$1</a>"}
    ];

    return {

        PLACEHOLDER_PATTERN : /\$\{(.*?)\}/g,
        PLACEHOLDER_REPEATED_PATTERN : /\$\.\{(.*?)\}/g,
        PARAMETER_PATTERN : /\w+=\$\{(.*?)\}/g,

        replaceTemplatePlaceholders : function(templateString, data, deepProps, skipDecode, elType) {
            if (templateString && data) {
                templateString = templateString.replace(this.PLACEHOLDER_PATTERN, _placeholderReplacer(data, deepProps,
                    skipDecode, elType));
            }
            return templateString;
        },

        stripPlaceholders : function(paramWithPlaceholders) {
            return _placeholderStripper(paramWithPlaceholders);
        },

        hasPlaceholders : function(val) {
            var matches = val ? val.match(this.PLACEHOLDER_PATTERN) : null;
            return (val && matches && matches.length > 0);
        },

        replaceMarkdownPattern : function (message) {
            var patterns = this.markdownPatterns || markdownPatterns;
            if (message && patterns && patterns.length > 0) {
                var i = 0, curr;
                for (i; i < patterns.length; i++) {
                    curr = patterns[i];
                    if (curr && curr.pattern && curr.replacement !== null && curr.replacement !== undefined) {
                        message = message.replace(curr.pattern, curr.replacement);
                    }
                }
            }

            return message;
        },

        htmlDecode : function(val, elType) {
            return _htmlDecode(val, elType);
        },

        decodeHTMLEntities : function(val) {
            return _htmlDecode(val);
        },

        decodeParam : function(encodedVal, singleDecode) {
            var decode = (encodedVal !== null && encodedVal !== undefined && isNaN(encodedVal));
            if (decode) {
                var decodedVal = decodeURIComponent(String(encodedVal));
                if (!singleDecode) {
                    return decodeURIComponent(decodedVal);
                }
                return decodedVal;
            }
            return encodedVal;
        },

        hasNewBoundPropertyValue : function(existingPropertyDataMap, propertyDataMap, boundProperties, boundPropertiesOnly) {
            if (!propertyDataMap || $.isEmptyObject(propertyDataMap) || typeof boundProperties === "undefined") {
                return false;
            }
            var key, a, b, propKey, containsBoundProp;
            for (key in propertyDataMap) {
                if (key && propertyDataMap[key]) {
                    // if this key has a null value, we already know we can proceed
                    if (existingPropertyDataMap &&
                        ((boundPropertiesOnly !== true && typeof existingPropertyDataMap[key] === "undefined") ||
                            existingPropertyDataMap[key] === null)) {
                        return true;
                    }
                    else {
                        a = propertyDataMap[key];
                        b = existingPropertyDataMap ? existingPropertyDataMap[key] : null;
                        containsBoundProp = this.containsBoundPropByName(key, boundProperties, true);
                        // support empty objects if only the prop is being referenced by itself and not any of its nested prop values
                        if ($.isEmptyObject(a) && !$.isEmptyObject(b) && containsBoundProp) {
                            return true;
                        }
                        if (a !== null && typeof a !== "undefined" && b !== null && typeof b !== "undefined") {
                            if (typeof a === "object") {
                                for (propKey in a) {
                                    if (propKey && a[propKey] !== undefined && a[propKey] !== b[propKey] &&
                                        (this.containsBoundPropByName(key + "." + propKey, boundProperties) ||
                                            this.containsBoundPropByName(key, boundProperties, true))) {
                                        return true;
                                    }
                                }
                            }
                            else if (containsBoundProp && a !== b && a !== "" && b !== "") {
                                return true;
                            }
                        }
                    }

                }
            }
            return false;
        },

        containsBoundPropByName : function(name, boundProperties, exactMatch) {
            if (name && boundProperties) {
                var i = 0, prop;
                for (i; i < boundProperties.length; i++) {
                    prop = boundProperties[i];
                    if (prop && ((!exactMatch && prop.indexOf(name) >= 0) || (exactMatch && prop === name))) {
                        return true;
                    }
                }
            }
            return false;
        },

        getPropertyValue : function(prop, value) {
            return _getPropertyValue(prop, value);
        },

        getBoundPropertyMap : function(existingPropertyDataMap, propertyDataMap, boundProperties,
                                       missingPropertyValueHandler, propertyParseFunction) {
            // missingPropertyValueHandler is called in the event that a value is missing for a property
            // propertyParseFunction takes in a property value and parses it for setting in the map

            // mixin the new properties
            $.extend(existingPropertyDataMap, propertyDataMap);

            var propMap = {};
            // check to see if any properties are not set and don't bother making the request if so
            if (boundProperties) {
                var i = 0, prop, propValPtr;
                for (i; i < boundProperties.length; i++) {
                    prop = boundProperties[i];
                    if (prop) {
                        propValPtr = this.getPropertyValue(prop, existingPropertyDataMap);
                        // if any properties are missing, call the handler
                        if (propValPtr === null || propValPtr === undefined) {
                            if (missingPropertyValueHandler && missingPropertyValueHandler.apply) {
                                missingPropertyValueHandler(prop);
                            }
                        }
                        else {
                            propMap[prop] = propertyParseFunction && propertyParseFunction.apply ?
                                propertyParseFunction(propValPtr) : propValPtr;
                        }
                    }
                }
            }
            return propMap;
        },

        getSortedWidgetArray : function(colMap, prop, clone, postfix) {
            // returns a sorted array of "widgets" from a map based on an index property
            // prop is optional and defaults to index
            if (clone) {
                colMap = $.extend({}, colMap);
            }
            var cols = [], columnKey;
            for (columnKey in colMap) {
                if (colMap[columnKey]) {
                    colMap[columnKey]._key = columnKey;
                    cols.push(colMap[columnKey]);
                }
            }
            return cols.sort(function(a, b) {
                var propPostfix = postfix ? prop + postfix : prop,
                    aProp = postfix && a && prop && a[propPostfix] !== null && a[propPostfix] !== undefined ? propPostfix : prop,
                    bProp = postfix && b && prop && b[propPostfix] !== null && b[propPostfix] !== undefined ? propPostfix : prop,
                    aIdx = a ? (aProp && a[aProp] !== null && a[aProp] !== undefined ? a[aProp] : a.index) || 0 : 0,
                    bIdx = b ? (bProp && b[bProp] !== null && b[bProp] !== undefined ? b[bProp] : b.index) || 0 : 0;
                return Number(aIdx) - Number(bIdx);
            });
        }

    };
});