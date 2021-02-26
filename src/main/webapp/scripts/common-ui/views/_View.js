define([
    "jquery",
    "common-ui/widgets/_TemplatedWidget",
    "common-ui/widgets/LoadingOverlay",
    "common-ui/widgets/Notification",
    "common-ui/widgets/utils/templateUtil",
    "text!common-ui/views/templates/_View.html"
], function($, TemplatedWidget, LoadingOverlay, Notification, templateUtil, template) {

    "use strict";

    var loadingOverlay = new LoadingOverlay(),
        VIEW_STATE_VISIBLE = 1,
        VIEW_STATE_BACKGROUND = 2,
        VIEW_STATE_POPPED = 3,
        VIEW_PROP_TITLE = "title",
        VIEW_PROP_SUBTITLE = "subTitle",
        WINDOW_STATUS_PRINT_READY = "print-ready";

    return TemplatedWidget.extend({

        title : "",

        viewTemplate : "",

        template : template,

        autoPlace : false,

        append : true,

        hideLoadingIndicator : false,

        singleNotificationVisible : false,

        _viewState : VIEW_STATE_VISIBLE,

        // single static instance of the loading overlay is shared by all views
        _loadingOverlay : loadingOverlay,

        init : function() {
            this._notifications = {};
            this._super.apply(this, arguments);
        },

        showLoading : function() {
            if (!this.hideLoadingIndicator) {
                this._loadingOverlay.show();
            }
        },

        hideLoading : function(clearNotifications) {
            this._loadingOverlay.hide();

            if (clearNotifications) {
                this.hideNotification();
            }

            // TODO this should probably be moved elsewhere!
            if (!this._initialLoadComplete) {
                this._initialLoadComplete = true;
                // TODO
                setTimeout(function() {
                    window.status = WINDOW_STATUS_PRINT_READY;
                }, 150);
            }
        },

        bindProperties : function(props, prop) {
            if (!this.boundProperties) {
                return;
            }
            if (!this._propDataMap) {
                this._propDataMap = {};
                this._propDataMap[VIEW_PROP_TITLE] = null;
                this._propDataMap[VIEW_PROP_SUBTITLE] = null;
            }
            // TODO this validation only returns true once regardless of prop; maybe bc we are sharing a prop data map
            //if (!templateUtil.hasNewBoundPropertyValue(this._propDataMap, props, this.boundProperties[prop])) {
                // skip processing if there is nothing new to process
                //return;
            //}

            // TODO handle props more generically
            if (prop === VIEW_PROP_TITLE || prop === VIEW_PROP_SUBTITLE) {
                var missingProp = false,
                    missingPropHandler = function() {
                      missingProp = true;
                    };
                // manage a bound prop map per prop key
                if (!this._boundPropMaps) {
                    this._boundPropMaps = {};
                }

                if (!this._propDataMap[prop]) {
                    this._propDataMap[prop] = {};
                }
                this._boundPropMaps[prop] = templateUtil.getBoundPropertyMap(this._propDataMap[prop], props,
                    this.boundProperties[prop], missingPropHandler);

                if (!missingProp) {
                    this.notifyDelegate(prop === VIEW_PROP_TITLE ? "setViewTitle" : "setSubTitle",
                        templateUtil.replaceTemplatePlaceholders(this[prop], this._boundPropMaps[prop]) || "", true, true);
                }
            }
        },

        setBoundProperties : function(props, prop) {
            if (!this.boundProperties) {
                this.boundProperties = {};
            }
            this.boundProperties[prop] = props;
        },

        getBoundProperties : function(prop) {
            return this.boundProperties ? this.boundProperties[prop] : null;
        },

        getBoundPropertyMap : function() {
            var key, boundPropMap = {};
            if (this._boundPropMaps) {
                for (key in this._boundPropMaps) {
                    if (key && this._boundPropMaps[key]) {
                        boundPropMap = $.extend(boundPropMap, this._boundPropMaps[key]);
                    }
                }
            }
            return boundPropMap;
        },

        showNotification : function(message, type, dismissable, widgetKey, ephemeral) {
            if (this.attachPoints && this.attachPoints.notificationContainer) {
                if (!type) {
                    type = "error";
                }

                var hash = this._getNotificationHash(message, type, dismissable);
                // only show the notification if it is not already visible

                if (this.singleNotificationVisible) {
                    this.hideAllNotifications();
                }
                else if (this._notifications[hash]) {
                    this._removeNotification(hash);
                }
                var notification = this.addWidget(new Notification({
                    data : {
                        message : message,
                        type : type
                    },
                    _key : widgetKey,
                    ephemeral : ephemeral || false,
                    dismissable : ephemeral || (dismissable !== undefined && dismissable !== null ? dismissable : true),
                    append : type !== "error" // only append non-error messages TODO may cause issues with overriding other non error messages
                }, this.attachPoints.notificationContainer), "notification", true);
                notification.on("closed", function() {
                    this._removeNotification(hash);
                }.bind(this));
                this._notifications[hash] = notification;

                // force the screen to scroll to the top for errors on non-dismissable notifications
                if (type === "error" && String(dismissable).toLowerCase() === "false") {
                    $(window).scrollTop(0);
                }
                return {
                    hide : function() {
                        this._removeNotification(hash);
                    }.bind(this)
                };
            }
        },

        hideNotification : function(message, type, dismissable, ephemeral) {
            if (message === undefined) {
                // for now remove all notifications if nothing is specified to maintain previous behavior
                this.hideAllNotifications();
            }
            else {
                this._removeNotification(this._getNotificationHash(message, type, dismissable));
            }
        },

        hideAllNotifications : function() {
            var hash;
            for (hash in this._notifications) {
                this._removeNotification(hash);
            }
        },

        _removeNotification : function(notificationHash) {
            if (notificationHash && this._notifications[notificationHash]) {
                this._notifications[notificationHash].remove();
                delete this._notifications[notificationHash];
            }
        },

        _getNotificationHash : function(message, type, dismissable) {
            return message + "-" + type + "-" + dismissable;
        },

        onTemplateNodesAttached : function(nodes) {
            if (nodes && nodes.viewContent) {
                // create the view content node
                if (!this._viewContent) {
                    this._viewContent = new TemplatedWidget({
                        template : this.viewTemplate,
                        getTemplateData : this.getViewTemplateData.bind(this),
                        onTemplateNodesAttached : this._handleViewTemplateNodesAttached.bind(this)
                    }, nodes.viewContent);
                }
                else {
                    this._viewContent.place(nodes.viewContent);
                }
            }
        },

        isVisible : function() {
            return this._viewState === VIEW_STATE_VISIBLE;
        },

        onShown : function() {
            this._viewState = VIEW_STATE_VISIBLE;
            this.dispatchEvent("shown");
            // only after this view has been shown a second time, we may need to notify the widgets
            if (this._shown && this.getWidgets) {
                this.dispatchEvent("shownAgain");
                var widgets = this.getWidgets();
                if (widgets && widgets.length > 0) {
                    var i = 0, widget;
                    for (i; i < this.widgets.length; i++) {
                        widget = this.widgets[i];
                        if (widget) {
                            if (widget.dataStore && widget.dataStore.onWidgetShown) {
                                widget.dataStore.onWidgetShown();
                            }
                            if (widget.onViewShown) {
                                widget.onViewShown();
                            }
                            if (widget._cachedUpdateDataArgs) {
                                widget.updateData.apply(widget, widget._cachedUpdateDataArgs);
                                delete widget._cachedUpdateDataArgs;
                            }
                        }
                    }
                }
            }
            else {
                this._shown = true;
            }
            // attach point (must call super)
        },

        onPlacedInBackground : function() {
            this._viewState = VIEW_STATE_BACKGROUND;
            // attach point (must call super)
        },

        onPopped : function() {
            this._viewState = VIEW_STATE_POPPED;
            // attach point (must call super)
        },

        addWidget : function(widget) {
            if (widget && widget.updateData) {
                var oldUpdateData = widget.updateData;
                widget.updateData = function() {
                    if (this.isVisible()) {
                        return oldUpdateData.apply(widget, arguments);
                    }
                    else {
                        widget._cachedUpdateDataArgs = arguments;
                    }

                }.bind(this);
            }

            return this._super.apply(this, arguments);
        },

        _handleViewTemplateNodesAttached : function(nodes) {
            this.viewAttachPoints = nodes;
            this.onViewTemplateNodesAttached(nodes);
        },

        onViewTemplateNodesAttached : function(nodes) {
            // override to create and/or render widgets
        },
        
        getScrollContainer : function() {
            return window;
        },

        getViewTemplateData : function() {
            // attach point
            return null;
        },

        getTemplateData : function() {
            return {
                title : this.title || "",
                viewId : this.viewId || ""
            };
        },

        notifyDelegate : function(ctx) {
            if (this.delegate && this.delegate[ctx] && this.delegate[ctx].apply) {
                this.delegate[ctx].apply(this.delegate, Array.prototype.slice.call(arguments, 1));
            }
        },

        destroy : function() {
            this.remove();
            // TODO
            if (this.containerNode && this.containerNode.remove) {
                this.containerNode.remove();
            }

        }
    });
});