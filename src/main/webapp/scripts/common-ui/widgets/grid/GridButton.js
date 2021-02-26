define([
    "common-ui/widgets/Button",
    "common-ui/widgets/utils/stringUtil"
], function(Button , stringUtil) {

    "use strict";

    return Button.extend({

        // Button
        //      an even simpler button implementation for rendering within grids. does not dispatch events (use grid row click)
        //      it also conditionally renders based on data being true or false
        //
        //      options
        //          data: Boolean
        //              true if the button should be rendered, false otherwise

        template : "<div class=\"button-container\"><button aria-label=\"${ariaLabel}\" class=\"${buttonClass}\" data-attach-point=\"button\">${label}</button></div>",

        buttonClass : "button-primary",

        dataRequired : true,

        perItemLabels : false,

        captureClick : true,

        ariaLabel : null,

        getTemplateData : function() {
            var templateData = this._super.apply(this, arguments) || {};
            templateData.label = this.perItemLabels ? (this.data && this.data.value ? this.data.value : this.data) : this.label;
            templateData.ariaLabel = stringUtil.isValidString( this.ariaLabel ) ? this.ariaLabel : "click for action";
            return templateData;
        },

        onTemplateNodesAttached : function(nodes) {
            if (this.domNode) {
                this.connect(this.domNode, "click.button", this._handleClick.bind(this));
            }
            if (this.iconClass) {
                this.addIconClass();
            }
        },

        _handleClick : function(evt) {
            if (this.captureClick) {
                evt.stopPropagation();
            }
            this._super.apply(this, arguments);
        },

        _getClickEventData : function() {
            return this.gridRowData;
        },

        getTemplate : function() {
            return ((this.data !== null && this.data !== undefined && String(this.data).toLowerCase() !== "false")
                || !this.dataRequired) ? this.template : "";
        }

    });
});