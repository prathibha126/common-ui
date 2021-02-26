define([
    "common-ui/widgets/container/_ViewContainer",
    "common-ui/widgets/ToggleBar"
], function(_ViewContainer, ToggleBar) {
    
    "use strict";

    var BASE_CLASSES_CONTROLS_ON_LEFT = {
        "tab-bar" : true,
        "tab-bar-simple" : true
    };

    return _ViewContainer.extend({

        controlsOnLeft : false,

        baseClass : "toggle-bar-container",

        toggleBarBaseClass : null,

        controlMinVisibleItems : 2,

        init : function(opts) {
            this._toggleBarOptions = [];
            // preserve old property name
            if (opts && opts.minVisibleItems) {
                this.controlMinVisibleItems = opts.minVisibleItems;
                delete opts.minVisibleItems;
            }
            this._super.apply(this, arguments);
        },

        createControls : function(node) {
            var opts = {
                selectedValue : this.selectedValue,
                minVisibleItems : this.controlMinVisibleItems
            };
            if (this.toggleBarBaseClass) {
                opts.baseClass = this.toggleBarBaseClass;
            }
            if (this._toggleBarOptions && this._toggleBarOptions.length > 0) {
                opts.data = this._toggleBarOptions;
            }
            if (this.controlsOnLeft || (opts.baseClass && BASE_CLASSES_CONTROLS_ON_LEFT[opts.baseClass])) {
                node.css({"float" : "none", "display" : "block"});
            }
            this._toggleBar = new ToggleBar(opts, node);
            return this._toggleBar;
        },

        addWidgetToControls : function(widget) {
            this._toggleBarOptions.push({
                type : widget.containerIconType,
                label : widget.containerTitle || widget.title,
                value : widget._key,
                target : widget.containerTarget || null,
                iconClass : widget.containerIconClass
            });
            if (!this._widgetIdx) {
                this._widgetIdx = 1;
            }
            widget._widgetIdx = this._widgetIdx++;
            // wait to update the list if there is a selected widget id and we have not yet found it
            if (this.selectedValue && widget._key !== this.selectedValue && !this.hasWidget(this.selectedValue)) {
                return;
            }
            else if (this._toggleBar) {
                this._toggleBar.updateData(this._toggleBarOptions);
                delete this.selectedValue;
            }
        },

        doSetSelectedWidget : function(widget) {
            this._super.apply(this, arguments);
            if (this._toggleBar && widget && widget._widgetIdx > 0) {
                this._toggleBar.setSelectedIndex(widget._widgetIdx - 1);
            }
        },

        setSelectedWidgetId : function(id) {
            if (!id) {
                return;
            }
            this.selectedValue = id;
            // intercept to use the selection list to drive the selection change
            if (this._toggleBar && id) {
                this._toggleBar.setSelectedIdentifier(id);
            }
            else {
                this._super.apply(this, arguments);
            }
        }

    });
});