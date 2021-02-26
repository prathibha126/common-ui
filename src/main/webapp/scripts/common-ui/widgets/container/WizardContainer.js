define([
    "common-ui/widgets/container/_ViewContainer",
    "common-ui/widgets/WizardProgressBar"
], function(_ViewContainer, WizardProgressBar) {

    "use strict";

    return _ViewContainer.extend({

        baseClass : "wizard",

        init : function() {
            this._super.apply(this, arguments);
            this._toggleBarOptions = [];
        },

        createControls : function(node) {
            this._toggleBar = new WizardProgressBar({}, node);
            return this._toggleBar;
        },

        addWidgetToControls : function(widget) {
            this._toggleBarOptions.push({
                descr : widget.containerTitle || widget.title,
                value : widget.subTitle || "Step " + (this._toggleBarOptions.length + 1),
                id : widget._key
            });
            this._toggleBar.updateData(this._toggleBarOptions);
        }

    });
});