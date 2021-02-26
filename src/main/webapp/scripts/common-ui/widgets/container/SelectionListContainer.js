define([
    "common-ui/widgets/container/_ViewContainer",
    "common-ui/widgets/SelectionList",
    "common-ui/widgets/utils/metadataUtil"
], function(_ViewContainer, SelectionList, metadataUtil ) {

    "use strict";

    return _ViewContainer.extend({

        viewSelectionPrompt : "View",
        ariaLabel : null,
        controlMinVisibleItems : 2,

        init : function(opts) {
            // preserve old property name
            if (opts && opts.minVisibleItems) {
                this.controlMinVisibleItems = opts.minVisibleItems;
                delete opts.minVisibleItems;
            }
            this._super.apply(this, arguments);
            this._options = [];
        },

        createControls : function(node) {
            var WidgetConstructor = metadataUtil.getWidgetConstructorByName("SelectionList");
            this._selectionList = new WidgetConstructor({
                promptLabel : this.viewSelectionPrompt,
                minVisibleItems : this.controlMinVisibleItems,
                ariaLabel : this._getAriaLabel(),
                data : this._options
            }, node);
            return this._selectionList;
        },

        _getAriaLabel() {
            return this.ariaLabel || ( this.viewSelectionPrompt.indexOf('select')!== -1 ? this.viewSelectionPrompt : 'Select '+this.viewSelectionPrompt  );
        },

        setSelectedWidget : function(widget) {
            // intercept to use the selection list to drive the selection change
            if (this._selectionList && widget && widget._key) {
                this._selectionList.setSelectedIdentifier(widget._key);
            }
            else {
                this._super.apply(this, arguments);
            }
        },

        setSelectedWidgetId : function(id) {
            if (!id) {
                return;
            }
            this.selectedValue = id;
            // intercept to use the selection list to drive the selection change
            if (this._selectionList && id) {
                this._selectionList.setSelectedIdentifier(id);
            }
            else {
                this._super.apply(this, arguments);
            }
        },

        addWidgetToControls : function(widget) {
            // uses the widget key as a backup; hopefully dev sees this and fixes it
            var opt = {
                label : widget.containerTitle || widget.title || widget._key,
                id : widget._key
            };
            if (this.selectedValue === widget._key) {
                opt.selected = true;
            }
            this._options.push(opt);
            // wait to update the list if there is a selected value and we have not yet found it
            if (this.selectedValue && widget._key !== this.selectedValue && !this.hasWidget(this.selectedValue)) {
                return;
            }
            else if (this._selectionList) {
                this._selectionList.updateData(this._options);
                delete this.selectedValue;
            }
        },

        _getPromptLabel : function() {
            return this.viewSelectionPrompt;
        }

    });
});