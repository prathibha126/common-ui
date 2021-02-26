define([
    "jquery",
    "common-ui/widgets/_Widget",
    "common-ui/widgets/utils/formUtil",
    "common-ui/widgets/utils/templateUtil",
    "common-ui/widgets/utils/accessibilityUtil",
    "common-ui/widgets/utils/analytics"
], function($, _Widget, formUtil, templateUtil, accessibilityUtil, analytics) {

    "use strict";

    var ATTACH_POINT_ATTRIBUTE_NAME = "attach-point",
        ATTACH_EVENT_ATTRIBUTE_NAME = "attach-event",
        BIND_VALUE_ATTRIBUTE_NAME = "bind-value",
        BIND_CONTENT_ATTRIBUTE_NAME = "bind-content",
        BIND_VALUE_INTERCEPTOR_ATTRIBUTE_NAME = "bind-value-interceptor",
        REPEAT_ELEMENT_ATTRIBUTE_NAME = "fe-repeat",
        REPEAT_ELEMENT_ATTRIBUTE_INDEX = "fe-index",
        CONDITIONAL_ELEMENT_ATTRIBUTE_NAME = "if-query",
        IMG_SRC_ATTRIBUTE_NAME = "img-src";

    return _Widget.extend({

        template : "",

        autoPlace : true,

        // collapsible: Boolean
        //      true if this widget can be expanded/collapsed
        collapsible : false,

        // collapsed: Boolean
        //      TODO collapsed by default is buggy and needs to be fixed
        //      true if this widget should be collapsed by default
        collapsed : false,

        // collapsedHeight: Number
        //      the height of this widget when collapsed
        collapsedHeight : 40,


        // attachPointLoaded: String
        //      the name of the attach point containing the content to display once loaded; null if not enabled
        attachPointLoaded : null,

        // attachPointLoading: String
        //      the name of the attach point containing the content to display during loading; null if not enabled
        attachPointLoading : null,

        // attachEventCallbacks: Boolean
        //      true if a callback should be auto-called for attached events using the name of the event prefixed with on (e.g. onClick)
        attachEventCallbacks : false,

        // templateValuesSafeToDecode: Boolean
        //      ** only set to true if all the placeholders (e.g. ${prop}) in the template for this widget
        //      contain non-user input values that are safe to treat as raw markup and can be decoded (e.g. &nbsp; becomes [space]).
        //      note all user-generated content sent to/displayed in the UI should be encoded!
        templateValuesSafeToDecode : false,

        // templateDataContainsSafeMarkup: Boolean
        //      ** only set to true if all the placeholders (e.g. ${prop}) in the template for this widget
        //      contain non-user input values that are safe to treat as raw HTML markup and can be decoded (e.g. &lt; becomes <).
        //      note all user-generated content sent to/displayed in the UI should be encoded!
        templateDataContainsSafeMarkup : false,

        // templateRequiresData: Boolean
        //      true if the template should not be rendered (instead an empty string will be used) if the data is null or undefined
        templateRequiresData : false,

        init : function(opts) {
            // templated widget helper
            //  options
            //      template: String
            //          the template string (likely loaded via text! plugin)
            //      data: Object
            //          optional; by default getTemplateData returns this.data (could be mixed in via options.data)

            this._super.apply(this, arguments);
            this.attachPoints = {};
            this._bindValueSetters = {};
            this.onInit();
            this.updateTemplate();
        },

        onInit : function() {
            // attach point invoked after init but before template updated
        },

        updateTemplate : function() {
            // TODO this should only happen the first time a widget is created; beyond this never re-render; refactor to use bind values

            var template = this.getTemplate(),
                templateData = this.getTemplateData();

            // cache a reference to the most recent template data
            this._lastTemplateData = templateData;

            if (template || template === "") {
                if (this.templateRequiresData && (templateData === null || templateData === undefined || $.isEmptyObject(templateData))) {
                    var newHtml = templateUtil.hasPlaceholders(template) ? "" : template;
                    if (this.html === newHtml) {
                        return;
                    }
                    this.html = newHtml;
                }
                else {
                    this.html = templateData && template ?
                        templateUtil.replaceTemplatePlaceholders(template, templateData, true, !this.templateValuesSafeToDecode,
                            this.templateDataContainsSafeMarkup === true ? "text" : false) : template;
                }

                if (this.autoPlace || this._templateUpdatedOnce) {
                    this._templateUpdatedOnce = true;
                    this.place();
                }
            }
        },

        getHTML : function() {
            var node;
            // since a templated widget's html could include other data after it is placed, we need to return the
            // outer html of the dom node if it exists
            if (this.domNode && this.domNode[0] && this.domNode[0].outerHTML) {
                node = this.domNode[0].outerHTML;
            }
            else {
                node = this._super.apply(this, arguments);
            }
            node = $(node);
            // before adding to the dom, check to see if any conditional elements should be removed or others should be repeated
            this._checkConditionalTemplateElements(node, this._lastTemplateData);
            this._repeatTemplateElements(node, this._lastTemplateData, 1);

            // now check to see if any image sources that were deferred via data-img-src (to prevent invalid loads) need to be set
            this._replaceImageSources(node);
            return node;
        },

        setLoading : function(loading) {
            this._isLoading = loading;
            if (this.attachPoints && (this.attachPointLoading || this.attachPointLoaded)) {
                var attachPointLoaded = this.attachPoints[this.attachPointLoaded],
                    attachPointLoading = this.attachPoints[this.attachPointLoading];
                if (loading) {
                    if (attachPointLoaded) {
                        attachPointLoaded.addClass("hidden");
                    }
                    if (attachPointLoading) {
                        attachPointLoading.removeClass("hidden");
                    }
                }
                else {
                    if (attachPointLoading) {
                        attachPointLoading.addClass("hidden");
                    }
                    if (attachPointLoaded) {
                        attachPointLoaded.removeClass("hidden");
                    }
                }
            }
        },

        dispatchEvent : function(evt, data, userInitiated) {
            this._super.apply(this, arguments);
            // intercept change events to keep a reference to the last change event data
            if (evt === "change") {
                this._lastChangeEventData = $.extend(true, {}, data);
            }
        },

        getSelectedItem : function() {
            return this._lastChangeEventData || null;
        },

        _place : function(changingContainers) {
            this._super.apply(this, arguments);
            // if we are just changing container, no need to re-attach template nodes
            if (this.domNode && !changingContainers) {
                this._bindTemplateValues();
                this._attachTemplateNodes();
                this._attachTemplateEvents();
            }
        },

        _checkConditionalTemplateElements : function(domNode, templateData) {
            var nodes = domNode.find("[data-" + CONDITIONAL_ELEMENT_ATTRIBUTE_NAME + "]"),
                parentRepeatedElements,
                conditionalQuery, node, i = 0;

            if (nodes && nodes.length > 0) {
                for (i; i < nodes.length; i++) {
                    node = $(nodes[i]);
                    if (node && node.length > 0) {
                        parentRepeatedElements = node.parentsUntil(domNode, "[data-" + REPEAT_ELEMENT_ATTRIBUTE_NAME + "]");
                        if (!parentRepeatedElements || parentRepeatedElements.length === 0) {
                            conditionalQuery = node.data(CONDITIONAL_ELEMENT_ATTRIBUTE_NAME);
                            if (conditionalQuery) {
                                if (formUtil.doesDataMatchQueryParams(templateData,
                                    formUtil.extractQueryParams(conditionalQuery))) {
                                    node.removeAttr("data-" + CONDITIONAL_ELEMENT_ATTRIBUTE_NAME);
                                }
                                else {
                                    node.remove();
                                }
                            }
                        }
                    }
                }
            }
        },

        _repeatTemplateElements : function(domNode, templateData, depth) {
            var repeatElementQuery = "[data-" + REPEAT_ELEMENT_ATTRIBUTE_NAME + "]",
                nodes = domNode.find(repeatElementQuery), prevSiblingNode, parentNode,
                repeatDataName, repeatDataValue, currRepeatedDataValueType, placeholderPatternStr, placeholderPattern,
                node, i, repeatedNodeHtml, newHtml = $("<div/>"), hasRepeatedElements, repeatedElement;

            if (nodes && nodes.length > 0) {
                // dynamically create the placeholder pattern based on the depth of the search
                placeholderPatternStr = "\\$";
                for (i = 0; i < depth; i++) {
                    placeholderPatternStr += "\\.";
                }
                placeholderPatternStr += "\\{(.*?)\\}";
                placeholderPattern = new RegExp(placeholderPatternStr, "g");


                for (i = 0; i < nodes.length; i++) {
                    node = $(nodes[i]);
                    if (node && node.length > 0) {
                        repeatDataName = node.data(REPEAT_ELEMENT_ATTRIBUTE_NAME);

                        // do not process nested/child repeated elements, as those will be processed recursively
                        var parentRepeatedElements = node.parentsUntil(domNode, repeatElementQuery), j, currRepeatedDataValue, hasKeyIndex;
                        if (!parentRepeatedElements || parentRepeatedElements.length === 0) {
                            if (repeatDataName && templateData) {
                                repeatDataValue = repeatDataName === "_data_" ? templateData :
                                    templateUtil.getPropertyValue(repeatDataName, templateData);

                                // if we encounter an object, create a cloned sorted array so we can iterate it
                                hasKeyIndex = $.isPlainObject(repeatDataValue);
                                if (hasKeyIndex) {
                                    repeatDataValue = templateUtil.getSortedWidgetArray(repeatDataValue, "index", true);
                                }

                                if (repeatDataValue !== null && repeatDataValue !== undefined && $.isArray(repeatDataValue)) {
                                    hasRepeatedElements = true;
                                    repeatedNodeHtml = node[0].outerHTML || "";
                                    if (repeatedNodeHtml) {
                                        for (j = 0; j < repeatDataValue.length; j++) {
                                            currRepeatedDataValue = repeatDataValue[j];
                                            currRepeatedDataValueType = typeof currRepeatedDataValue;
                                            // primitive type values are wrapped in an object for convenience
                                            if (currRepeatedDataValueType === "string" || currRepeatedDataValueType === "number" ||
                                                currRepeatedDataValueType === "boolean") {
                                                currRepeatedDataValue = {"_value_" : currRepeatedDataValue};
                                            }

                                            repeatedElement = $(templateUtil.replaceTemplatePlaceholders(
                                                repeatedNodeHtml.replace(placeholderPattern, "${$1}"),
                                                currRepeatedDataValue, true, !this.templateValuesSafeToDecode,
                                                this.templateDataContainsSafeMarkup === true ? "text" : false))
                                                .attr("data-" + REPEAT_ELEMENT_ATTRIBUTE_INDEX,
                                                    hasKeyIndex ? currRepeatedDataValue._key : j);
                                            newHtml.append(repeatedElement);

                                            // call this function recursively to find additional repeated child elements
                                            this._repeatTemplateElements(repeatedElement, currRepeatedDataValue, depth + 1);
                                            this._checkConditionalTemplateElements(repeatedElement, currRepeatedDataValue);
                                        }
                                    }
                                }
                            }
                            prevSiblingNode = node.prev();
                            parentNode = node.parent();
                            node.remove();
                            // either append after the previous sibling or prepend if there are none
                            if (prevSiblingNode && prevSiblingNode.length > 0) {
                                $(newHtml.children()).insertAfter(prevSiblingNode);
                            }
                            else if (parentNode) {
                                parentNode.prepend(newHtml.children());
                            }
                        }
                    }
                }
            }
            this._hasRepeatedElements = hasRepeatedElements === true;
        },

        _replaceImageSources : function(domNode) {
            var nodes = domNode.find("[data-" + IMG_SRC_ATTRIBUTE_NAME + "]"),
                node, imgSrc, i = 0;
            if (nodes && nodes.length > 0) {
                for (i; i < nodes.length; i++) {
                    node = $(nodes[i]);
                    if (node) {
                        imgSrc = node.data(IMG_SRC_ATTRIBUTE_NAME);
                        if (imgSrc) {
                            node.attr("src", imgSrc);
                        }
                    }
                }
            }
        },

        _bindTemplateValues : function() {
            // unmap all previously bound setters
            var setterName;
            for (setterName in this._bindValueSetters) {
                if (this._bindValueSetters[setterName]) {
                    delete this._bindValueSetters[setterName];
                }
            }

            // the bind value cache stores the last value set on each node which is used to diff prior to modifying the dom
            this._bindValueCache = {};
            // perform once for simple bind text values and again for content
            this._bindTemplateValueSetters(BIND_VALUE_ATTRIBUTE_NAME, false);
            this._bindTemplateValueSetters(BIND_CONTENT_ATTRIBUTE_NAME, true);
        },

        _bindTemplateValueSetters : function(attrName, isContentMarkup) {
            var nodes = this.domNode.find("[data-" + attrName + "]"), node, i = 0;
            if (nodes && nodes.length > 0) {
                for (i; i < nodes.length; i++) {
                    node = $(nodes[i]);
                    if (node) {
                        this._createBindValueSetter(node, node.data(attrName),
                            node.data(BIND_VALUE_INTERCEPTOR_ATTRIBUTE_NAME), isContentMarkup);
                    }
                }
            }
        },

        _createBindValueSetter : function(node, bindValueVar, bindValueInterceptorName, isContentMarkup) {
            if (node && bindValueVar) {
                var bindValueName = bindValueVar,
                    bindValueParts = bindValueName.split("."),
                    bindValueIntercetptor = this[bindValueInterceptorName],
                    setterName = "set";
                // handle nested properties - setter will be bound to top level object
                if (bindValueParts.length > 1) {
                    bindValueName = bindValueParts[0];
                }
                setterName += bindValueName.charAt(0).toUpperCase() + bindValueName.substr(1);

                // bind a setter
                var me = this,
                    existingSetter = this[setterName],
                    cachedValueKey = function() {
                        var key = bindValueVar,
                            postfixCount = 1;
                        while (this._bindValueCache.hasOwnProperty(key)) {
                            key = bindValueVar + "_" + (postfixCount++);
                        }
                        return key;
                    }.bind(this)(),
                    setter = this[setterName] = function(val) {
                        var valueToSet = val || "",
                            cachedValue = this._bindValueCache[cachedValueKey];
                        if (valueToSet && bindValueParts.length > 1) {
                            valueToSet = templateUtil.getPropertyValue(bindValueParts.slice(1).join("."), valueToSet) || "";
                        }
                        // apply the interceptor to the value if one is provided
                        if (bindValueIntercetptor && bindValueIntercetptor.apply) {
                            valueToSet = bindValueIntercetptor.apply(this, [valueToSet]);
                        }
                        // check the cache to see if this value has changed since it was last updated in the dom
                        if (cachedValue !== valueToSet) {
                            this._bindValueCache[cachedValueKey] = valueToSet;
                            if (node && node instanceof $) {
                                node.empty();
                                if (isContentMarkup === true) {
                                    node.append(valueToSet);
                                }
                                else {
                                    node.text(templateUtil.htmlDecode(valueToSet, "text"));
                                }
                            }
                        }

                        // now call the super if exists
                        if (existingSetter && existingSetter.apply) {
                            existingSetter.apply(me, [val]);
                        }
                    }.bind(this);
                this._bindValueSetters[setterName] = setter;
                // and invoke it for the initial value
                setter(this[bindValueName]);
            }
        },

        _attachTemplateNodes : function() {
            this.attachPoints = {};
            var nodes = this.domNode.find("[data-" + ATTACH_POINT_ATTRIBUTE_NAME + "]"), node, i = 0, attachPointName;
            if (nodes && nodes.length > 0) {
                for (i; i < nodes.length; i++) {
                    node = $(nodes[i]);
                    if (node) {
                        attachPointName = node.data(ATTACH_POINT_ATTRIBUTE_NAME);
                        if (attachPointName) {
                            this.attachPoints[attachPointName] = node;
                        }
                    }
                }
            }
            if (this.collapsible && this.domNode) {
                this._expandCollapseNode = $("<span class='expand-collapse'></span>");
                this._expandCollapseFader = $("<span class='bottom-fader'></span>");
                this._expandCollapseFader.hide();
                this.domNode.addClass("collapsible");
                this.domNode.append(this._expandCollapseNode);
                this.domNode.append(this._expandCollapseFader);
                this.connect(this._expandCollapseNode, "click", this._handleExpandCollapse.bind(this));
                if (this.collapsed) {
                    this._expandCollapse(false, true);
                }
            }
            this.onTemplateNodesAttached(this.attachPoints);
        },

        _attachTemplateEvents : function() {
            // detach existing
            var j;
            if (this._attachedEventListeners && this._attachedEventListeners.length > 0) {
                for (j = 0; j < this._attachedEventListeners.length; j++) {
                    this.disconnect(this._attachedEventListeners[j]);
                }
            }
            this._attachedEventListeners = [];
            var nodes = this.domNode.find("[data-" + ATTACH_EVENT_ATTRIBUTE_NAME + "]"),
                node, i = 0, attachEventName, attachEventNameParts, eventData,
                repeatElementParent, repeatElementParents, repeatElementDataName, repeatElementDataIndex,
                repeatElementQuery = "data-" + REPEAT_ELEMENT_ATTRIBUTE_NAME,
                repeatElementIndexQuery = "data-" + REPEAT_ELEMENT_ATTRIBUTE_INDEX;
            if (nodes && nodes.length > 0) {
                for (i; i < nodes.length; i++) {
                    node = $(nodes[i]);
                    if (node) {
                        attachEventName = node.data(ATTACH_EVENT_ATTRIBUTE_NAME);
                        if (attachEventName) {
                            // attach event name can be "click", which will listen for and dispatch a click event
                            //  or it can be "click|change", which will listen for a click event and dispatch a change event
                            attachEventNameParts = attachEventName.split("|");
                            eventData = this._lastTemplateData || this.data;

                            // see if this element is a child of a repeated element to refine which data to include with the event
                            if (this._hasRepeatedElements) {
                                repeatElementParents = node.parentsUntil(this.domNode, "[" + repeatElementQuery + "]");
                                if (repeatElementParents && repeatElementParents.length > 0) {
                                    for (j = repeatElementParents.length - 1; j >= 0; j--) {
                                        repeatElementParent = $(repeatElementParents[j]);
                                        repeatElementDataName = repeatElementParent.attr(repeatElementQuery);

                                        if (repeatElementDataName) {
                                            repeatElementDataIndex = repeatElementParent.attr(repeatElementIndexQuery);
                                            if (!isNaN(repeatElementDataIndex) && repeatElementDataName === "_data_" && $.isArray(eventData)
                                                && Number(repeatElementDataIndex) < eventData.length) {
                                                eventData = eventData[Number(repeatElementDataIndex)];
                                            }
                                            else {
                                                eventData = templateUtil.getPropertyValue(
                                                    repeatElementDataName + "." + repeatElementDataIndex, eventData);
                                            }
                                        }
                                    }
                                }
                            }

                            // ensure multiple dom events separated with a space are supported
                            var domEvents = attachEventNameParts[0].split(" ").map(domEvent => domEvent + ".attachEvent").join(" ");
                            this._attachedEventListeners.push(this.connect(node, domEvents,
                                this._getAttachEventHandler(attachEventNameParts, eventData)));
                        }
                    }
                }
            }
        },

        _getAttachEventHandler : function(attachEventNameParts, eventData) {
            return function(evt) {
                var eventName = attachEventNameParts[attachEventNameParts.length - 1],
                    domEvents = attachEventNameParts[0],
                    funcName = "on" + eventName.charAt(0).toUpperCase() + eventName.substring(1);

                // if a keypress event is included, assume it is for accessibility and only allow enter/space
                if (domEvents && domEvents.indexOf("keypress") !== -1 && !accessibilityUtil.clicked(evt)) {
                    return;
                }
                // call "onEventName" function if it exists
                if (this.attachEventCallbacks && this[funcName] && this[funcName].apply) {
                    this[funcName](eventData, evt);
                }
                this.dispatchEvent(eventName, eventData, true);
            }.bind(this);
        },

        onTemplateNodesAttached : function(attachPoints) {
            // connection point
        },

        onCollapsed : function() {

        },

        onExpanded : function() {

        },

        expand : function() {
            this._expandCollapse(true);
        },

        collapse : function() {
            this._expandCollapse(false);
        },

        updateData : function(data, forceUpdate) {
            if (data !== this.data || forceUpdate) {
                this._super.apply(this, arguments);
                this.updateTemplate();
            }
        },

        getTemplate : function() {
            return this.template;
        },

        getTemplateData : function() {
            return this.data || {};
        },

        _handleExpandCollapse : function(evt) {
            this._expandCollapse();
        },

        _expandCollapse : function(doExpand, skipAnimate) {
            if (this.domNode/* && !Modernizr.printlayout TODO does printing honor current setting? */) {
                var collapsed = this.domNode.hasClass("collapsed");
                if ((doExpand === true && !collapsed) || (doExpand === false && collapsed)) {
                    return;
                }
                if (!collapsed) {
                    this._expandedHeight = this.domNode.height();
                    this._expandCollapseFader.show();
                }
                this.domNode.toggleClass("collapsed");
                var currHeight = this.domNode.height(),
                    newHeight = (!collapsed ? (this.collapsedHeight - (this.domNode.innerHeight() - currHeight)) : this._expandedHeight),
                    afterToggleHandler = collapsed ? function() {
                        this._expandCollapseFader.hide();
                        this.domNode.height("inherit");
                        this.onCollapsed();
                        this.dispatchEvent("toggleExpanded", true);
                    }.bind(this) : function() {
                        this.onExpanded();
                        this.dispatchEvent("toggleExpanded", false);
                    }.bind(this);

                if (skipAnimate) {
                    this.domNode.css("height", newHeight);
                    afterToggleHandler();
                }
                else {
                    this.domNode.animate({
                        height : newHeight + "px"
                    }, Math.min((Math.abs(newHeight - currHeight) * 10), 400), afterToggleHandler);
                }

                if (doExpand === undefined) {
                    analytics.action(this._key, collapsed ? "expand" : "collapse");
                }
            }
        }

    });
});