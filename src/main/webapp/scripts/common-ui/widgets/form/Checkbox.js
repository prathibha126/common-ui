/*
 Created by IntelliJ IDEA.
 User: atack
 Date: 7/8/16
 Time: 3:18 PM
 */

define([
    "jquery",
    "common-ui/widgets/_TemplatedWidget",
    "text!common-ui/widgets/form/templates/Checkbox.html",
    "common-ui/widgets/utils/stringUtil"
], function ($, _TemplatedWidget, template, stringUtil) {

    "use strict";

    return _TemplatedWidget.extend({

        // Checkbox
        //      a simple checkbox

        template: template,

        append: true,

        // label: String
        //      the text to display for the checkbox
        label: "",

        // labelPosition: String
        //      where the text is to be displayed relative to the checkbox
        labelPosition: "right",

        // name: String
        //      the name of your html checkbox
        name: "",

        // value: String
        //      the value that your html checkbox holds
        value: "",

        // checkboxClass: String
        //      specific class for your html checkbox
        checkboxClass: "checkbox",

        // disabledClass: String
        //      class to be applied to the label when disabled
        disabledClass : "disabled",

        // disabled: boolean
        //      whether or not the checkbox appears as disabled
        disabled: false,

        // selected: boolean
        //      whether or not the checkbox is selected
        selected: false,

        clickable : false,

        ariaLabel : null,

        onTemplateNodesAttached: function (nodes) {
            if (nodes && nodes.checkbox) {
                this.checkbox = nodes.checkbox;

                this.connect(nodes.checkbox, "change.checkbox", this._handleClick.bind(this));
            }
        },

        _handleClick: function (evt) {
            if (this.dispatchEvents && evt) {
                evt.stopPropagation();
            }
            var el = $(evt.target), val = el.is(":checked");
            this.selected = val;
            this.dispatchEvent("change", {selected: val}, true);
            this.dispatchEvent("click", {selected: val}, true);
        },

        getTemplateData: function () {
            var labelRight = this.labelPosition === "right";
            
            if (this.data !== undefined && this.data !== null){
                this.selected = this.data === true || this.data === false ? this.data : this.data.selected;
                if (this.data.label){
                    this.label = this.data.label;
                }
                if (this.data && this.data.hasOwnProperty("disabled")) {
                    this.disabled = this.data.disabled;
                }
            }

            return {
                checkboxClass: this.checkboxClass,
                name: this.name || "",
                value: this.value || "",
                disabled: this.disabled ? "disabled" : "",
                disabledClass: this.disabled ? this.disabledClass : "",
                selected: this.selected ? "checked" : "",
                leftLabel: !labelRight ? this.label : "",
                rightLabel: labelRight ? this.label : "",
                ariaLabel : this.getAriaLabel()
            };
        },

        getAriaLabel : function() {
            return stringUtil.isValidString( this.ariaLabel ) ? this.ariaLabel : this.label;
        },

        getIsSelected: function () {
            return this.selected;
        },

        setEnabled : function(val) {
            this.setDisabled(!val);
        },

        setDisabled : function(val) {
            if (this.disabled !== val) {
                this.disabled = val || false;
                if (this.checkbox) {
                    this.checkbox.prop("disabled", this.disabled);
                }
                if (this.attachPoints && this.attachPoints.checkboxLabel) {
                    if (!this.disabled) {
                        this.attachPoints.checkboxLabel.removeClass(this.disabledClass);
                    }
                    else {
                        this.attachPoints.checkboxLabel.addClass(this.disabledClass);
                    }
                }
            }
        },

        setSelected : function(val) {
            if (this.selected !== val) {
                this.selected = val || false;
                if (this.checkbox) {
                    this.checkbox.prop("checked", this.selected);
                }
            }
        },

        // @deprecated
        setSelectedState: function (val) {
            // shim for now
            this.setSelected(val);
        }
    });
});