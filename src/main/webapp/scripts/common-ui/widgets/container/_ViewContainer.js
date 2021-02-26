define([
    "jquery",
    "common-ui/widgets/utils/templateUtil",
    "common-ui/widgets/_TemplatedWidget",
    "text!common-ui/widgets/container/templates/ViewContainer.html"
], function($, templateUtil, _TemplatedWidget, template) {
    
    "use strict";

    return _TemplatedWidget.extend({

        isViewContainer : true,

        template : template,

        title : null,

        singleWidgetVisible : true,

        // selectedItemFromChild: Boolean
        //      true if getSelectedItem() should invoke the method on the currently selected child; otherwise it is invoked on the controls
        selectedItemFromChild : false,

        baseClass : "",

        selectedValue : null,

        _selectedViewWidget : null,

        pipeControlEvents : true,

        flexbox : false,

        init : function() {
            this._super.apply(this, arguments);
            if (this.selectedValue) {
                this._selectedViewWidget = true;
            }
            this._renderTitle();
        },

        isSingleWidgetVisible : function() {
            return this.singleWidgetVisible;
        },

        getSelectedItem : function() {
            // implemented to support getting current selected value
            if (!this.selectedItemFromChild && this.isSingleWidgetVisible() && this.controls && this.controls.getSelectedItem) {
                return this.controls.getSelectedItem();
            }
            else if (this.selectedItemFromChild && this.isSingleWidgetVisible() && this.getSelectedWidget() &&
                this.getSelectedWidget().getSelectedItem) {
                return this.getSelectedWidget().getSelectedItem();
            }
        },

        getViewContainer : function(widgetKey) {
            if (!this._viewContainer) {
                this._viewContainer = $("<div class='view-container-inner"
                    + (!this.singleWidgetVisible ? " view-all" : "")
                    + (this.flexbox ? " flexbox" : "")
                    + "'></div>");
            }
            return this._viewContainer;
        },

        getData : function() {
            if (!this.selectedItemFromChild && this.isSingleWidgetVisible() && this.controls && this.controls.getData) {
                return this.controls.getData();
            }
            else if (this.selectedItemFromChild && this.isSingleWidgetVisible() && this.getSelectedWidget() &&
                this.getSelectedWidget().getData) {
                return this.getSelectedWidget().getData();
            }
            return [];
        },

        _getPromptLabel : function() {
           return this.title || "";
        },

        setTitle : function(title) {
            this.title = title;
            this._renderTitle();
        },

        _renderTitle : function() {
            if (this.title !== undefined && this.title !== null && this.domNode) {
                if (!this._titleContainer) {
                    this._titleContainer = $("<div class='app-legend'></div>");
                    if (this.domNode) {
                        this.domNode.prepend(this._titleContainer);
                    }
                }
                this._titleContainer.text(templateUtil.htmlDecode(this.title, "text"));
            }
            else if (this._titleContainer) {
                this._titleContainer.text("");
                this._titleContainer.hide();
            }
        },

        getSelectedWidget : function() {
            return this._selectedViewWidget;
        },

        getSelectedValue : function() {
            // this api method is implemented to support getting current view state
            var selectedWidget = this.getSelectedWidget();
            if (selectedWidget) {
                return selectedWidget._key;
            }
            return null;
        },

        getAllValues : function() {
            // this api method is implemented to support getting view state
            var widgets = this.getWidgets();
            return widgets  && widgets.length > 0 ? widgets.map(function(widget) {
                return widget._key;
            }) : [];
        },

        hasWidget : function(widgetId) {
            var widgets = this.getAllValues();
            if (widgets && widgets.length > 0) {
                var i = 0;
                for (i; i < widgets.length; i++) {
                    if (widgets[i] === widgetId) {
                        return true;
                    }
                }
            }
            return false;
        },

        _getWidgetIndex : function(widget) {
            var widgets = this.getWidgets();
            if (widgets && widgets.length > 0) {
                var i = 0;
                for (i; i < widgets.length; i++) {
                    if (widgets[i] === widget) {
                        return i;
                    }
                }
            }
            return -1;
        },

        setSelectedWidget : function(widget) {
            if (widget && this.singleWidgetVisible && widget !== this._selectedViewWidget) {
                this.doSetSelectedWidget(widget);
            }
        },

        doSetSelectedWidget : function(widget) {
            this._setSelectedWidget(widget);
        },

        _setSelectedWidget : function(widget) {
            if (widget && widget !== true) {
                this.changeView(widget);
                this._updateWidgetVisibleWidgets(widget);
            }
        },

        setSelectedWidgetId : function(id) {
            this._doChangeView({id : id});
        },

        setSelectedIndex : function(idx) {
            var widgets = this.getWidgets();
            if (widgets && widgets.length > idx) {
                this.setSelectedWidget(widgets[idx]);
            }
        },

        addWidget : function(widget, pipeDispatchedEvents, pipeDispatchedEventsAugmentsExisting) {
            if (widget === this.controls) {
                return this._super.apply(this, arguments);
            }
            else if (widget) {
                widget._container = this;
                widget.getContainer = function() {
                    return widget._container;
                };
                this._super.apply(this, arguments);

                // intercept a selected value
                if ((this._selectedViewWidget === true && this.selectedValue && widget._key === this.selectedValue) ||
                    (!this._selectedViewWidget && this.singleWidgetVisible)) {
                    this._selectedViewWidget = widget;
                    widget._containerSelected = true;
                }
                else if (this.singleWidgetVisible && this._selectedViewWidget !== widget) {
                    widget.hide();
                }

                this.addWidgetToControls(widget);
                this._overrideViewWidgetGetData(widget);
                this._overrideViewWidgetShow(widget);
            }
        },

        updateData : function(data) {
            // intercept update data calls and invoke on each contained widget
            var widgets = this.getWidgets();
            if (widgets && widgets.length > 0) {
                var i = 0, widget;
                for (i; i < widgets.length; i++) {
                    widget = widgets[i];
                    if (widget && widget._key) {
                        // try to use set widget data on the view so it can intercept any widgetData config when applying
                        var view = this.getView();
                        if (view && view.setWidgetData && view.getWidget(widget._key)) {
                            view.setWidgetData.apply(view, [widget._key].concat(Array.prototype.slice.call(arguments)));
                        }
                        else if (widget.updateData) {
                            widget.updateData.apply(widget, arguments);
                        }
                    }
                }
            }
        },

        hideControls : function() {
            if (this.controls && this.controls.hide) {
                this.controls.hide();
            }
        },

        showControls : function() {
            if (this.controls && this.controls.show) {
                this.controls.show();
            }
        },

        onTemplateNodesAttached : function(nodes) {
            if (nodes && !this.controls) {
                this._renderTitle();
                this.controls = this.createControls(nodes.controls);
                this.addWidget(this.controls, this.pipeControlEvents, true);
                if (this.controls && this.controls.on) {
                    this.controls.on("change", this._doChangeView.bind(this));
                }
                if (nodes.views) {
                    nodes.views.append(this.getViewContainer());
                }
                // wait a tick to get the dom node's width to use for comparison purposes later
                setTimeout(function() {
                   this._lastWidth = this.domNode.width();
                }.bind(this), 10);
            }
        },

        onViewShown : function() {
            var currWidth = this.domNode.width();
            // to ensure anything needing resizing does so properly, ensure that if the dom node width changed we trigger a resize
            if (currWidth !== this._lastWidth && this._selectedViewWidget && this._selectedViewWidget.containerNeedsResize) {
                $(window).trigger("resize");
                this._lastWidth = currWidth;
            }

            // TODO basically check to see if the visible tab has been changed programatically  from what it was the last time this widget was visible
            // and if it has we need to have the widget inside re-render
            if (this._selectedViewWidget && this._selectedViewWidget.onViewShown) {
               this._selectedViewWidget.onViewShown();
            }
        },

        _doChangeView : function(data) {
            // note event must pass data with value or id representing the key of the selected widget
            if (data && (data.value || data.id)) {
                this.selectedValue = data.value || data.id;
                var newWidget = this.getWidget(this.selectedValue);
                if (!this._selectedViewWidget) {
                    this._selectedViewWidget = newWidget || true;
                }
                this._setSelectedWidget(newWidget);
            }
        },

        _updateWidgetVisibleWidgets : function(newWidget) {
            if (newWidget) {
                if (!newWidget.singleWidgetVisible) {
                    // if all widgets are visible, update them and recurse
                    var widgets = newWidget.getWidgets();
                    if (widgets && widgets.length > 0) {
                        var i = 0, widget;
                        for (i; i < widgets.length; i++) {
                            widget = widgets[i];
                            if (widget && widget._container) {
                                this._updateWidgetCachedData(widgets[i]);
                                this._updateWidgetVisibleWidgets(widget);
                            }
                        }
                    }
                }
                else {
                    // only update the selected widget's data and then get recursive
                    var selectedWidget = newWidget._selectedViewWidget;
                    if (selectedWidget && selectedWidget._container) {
                        this._updateWidgetCachedData(selectedWidget);
                        this._updateWidgetVisibleWidgets(selectedWidget);
                    }
                }
            }
        },

        createControls : function(node) {
            // abstract method; must be implemented; returns controls!
        },

        addWidgetToControls : function(widget) {
            // abstract method; must be implemented
        },

        getTemplateData : function() {
            return {
                baseClass : this.baseClass || ""
            };
        },

        changeView : function(newViewWidget) {
            if (newViewWidget) {
                if (this._selectedViewWidget && this._selectedViewWidget !== true) {
                    this._selectedViewWidget._containerSelected = false;
                    this._selectedViewWidget.hide();
                }
                this._selectedViewWidget = newViewWidget;
                this._selectedViewWidget._containerSelected = true;
                newViewWidget.show();
                this.onViewShown();
                this.dispatchEvent("viewChange", newViewWidget);
                this.dispatchEvent("viewIndexChange", this._getWidgetIndex(newViewWidget));
                this._updateWidgetCachedData(newViewWidget);
            }
        },

        _updateWidgetCachedData : function(widget) {
            if (widget && widget._cachedGetDataArguments && widget._doGetData) {
                // because a new request may be made and the cached data args might be removed, we need to wait a tick here
                setTimeout(function() {
                    if (widget && widget._cachedGetDataArguments && widget._doGetData) {
                        widget._doGetData.apply(widget, widget._cachedGetDataArguments);
                        delete widget._cachedGetDataArguments;
                    }
                }, 10);
            }
        },

        _overrideViewWidgetGetData : function(widget) {
            // delay updating the view widgets data until it is visible
            if (widget) {
                var hasDataStoreGetData = widget.dataStore && widget.dataStore.getData,
                    oldGetData = hasDataStoreGetData ? widget.dataStore.getData : widget.updateData;
                if (oldGetData) {
                    // create a generic ref to the new function
                    widget._doGetData = function(data, selectedValue, append) {

                        // need to trace up the container hierarchy to see if this one should be updated
                        var widgetVisible = true,
                            current = widget;

                        while (current._container && widgetVisible) {
                            if (current._container.singleWidgetVisible && !current._containerSelected) {
                                widgetVisible = false;
                                break;
                            }
                            current = current._container;
                        }

                        if (widgetVisible) {
                            // clear out any old cached data args
                            delete widget._cachedGetDataArguments;
                            return oldGetData.apply(hasDataStoreGetData ? widget.dataStore : widget, arguments);
                        }
                        else {
                            // check to see if the new data should be appended to an existing cached data
                            if (!hasDataStoreGetData && append && widget._cachedGetDataArguments && widget._cachedGetDataArguments.length > 0) {
                                var lastData = widget._cachedGetDataArguments[0],
                                    newData = data && data.data ? data.data : data;
                                if (lastData && lastData.data && lastData.data.length > 0 && lastData.data.concat) {
                                    lastData = lastData.data.concat(newData);
                                }
                                else if (lastData && lastData.length >= 0 && lastData.concat) {
                                    lastData = lastData.concat(newData);
                                }
                                // overwrite the incoming value
                                data = lastData;
                            }
                            widget._cachedGetDataArguments = arguments;
                        }
                    };
                    // update the original function ref
                    if (hasDataStoreGetData) {
                        widget.dataStore.getData = widget._doGetData;
                    }
                    else {
                        widget.dataStore = this.dataStore;
                        widget.updateData = widget._doGetData;
                    }
                }
            }
        },

        _overrideViewWidgetShow : function(widget) {
            if (widget && widget.show && this.singleWidgetVisible) {
                var oldShow = widget.show;
                widget.show = function() {
                    // only show the widget if it is should be shown; this prevents an outside invocation of show
                    // from showing the widget when this container determines it should be hidden
                    if (this._selectedViewWidget === widget) {
                        oldShow.apply(widget, arguments);
                    }
                }.bind(this);
            }
        }
    });
});