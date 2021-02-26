define([
    "jquery",
    "common-ui/widgets/_TemplatedWidget",
    "text!common-ui/widgets/form/templates/TextInput.html"
], function($, _TemplatedWidget, template) {

    "use strict";

    return _TemplatedWidget.extend({

        // TextInput
        //      a text input box
        //
        //      options
        //          promptLabel: String
        //              optional; a prompt label for the input
        //          clearable: Boolean
        //              true if this text input has a clear button
        //          placeholder: String
        //              the text to be shown as a placeholder in the input
        //          width: Number
        //              optional; the width of the text input
        //          type: String
        //              optional; the type of input;
        //              options: text, number, email, etc
        //          min: Number
        //              only applicable if type is number; the minimum numeric value allowed
        //          max: Number
        //              only applicable if type is number; the maximum numeric value allowed
        //          step: Number
        //              only applicable if type is number; the numeric value to be incremented/decremented with each step


        placeholder : "Enter keyword(s)", // TODO set this to "" by default
        template : template,
        clearable : true,
        disabled : false,

        baseClass: "",

        // keyPressDelay: Number
        //      the amount of time in between the last key press and when the keypress event is fired
        keyPressDelay : 450,

        // changeOnKeyPress: Boolean
        //      true if a change event should be dispatched as keys are pressed (after the keyPressDelay has elapsed)
        changeOnKeyPress : true,
        type: "text",

        // preventDuplicateChangeEvents: Boolean
        //      true if change events should be suppressed if the value has not changed from the previous
        preventDuplicateChangeEvents : false,

        // promptLabel: String
        //      the prompt label to display before the input
        promptLabel : "",

        // validationPattern: String
        //      a regex string used for validation
        validationPattern : null,

        // allowEmptyValue: Boolean
        //      true if type is number and value is empty is allowed
        allowEmptyValue : false,

        //ariaLabel: String
        //      to set ariaLabel
        ariaLabel : "text input",

        onTemplateNodesAttached : function(nodes) {
            if (this.domNode) {
                if (this.clearable && this.type !== "number") {
                    this.clearButton = $("<span class='clear-button'/>");
                    this.domNode.append(this.clearButton);
                    this.connect(this.clearButton, "click", this.clear.bind(this, true));
                }
                if (this.promptLabel) {
                    this.domNode.prepend($("<span class='text-input-prompt'/>").text(this.promptLabel + ":"));
                }
            }
            if (nodes.input) {
                if (this.width > 0) {
                    nodes.input.width(this.width);
                }
                this.input = nodes.input;
                this.connect(nodes.input, "change.textinput", this._handleValueChange.bind(this));
                this.connect(nodes.input, "keyup.textinput", this._handleKeypress.bind(this));
            }
            this._updateClearButtonVisibility();

            if (this.disabled) {
                this.setDisabled(true);
            }
        },

        setValue : function(val) {
            if (val !== this.value) {
                this.value = val;
                if (this.input) {
                    this.input.val(val);
                    this._handleValueChange();
                }
            }
        },

        getValue : function() {
            return this.value;
        },

        clear : function(doFocus) {
            this.setValue("");
            if (doFocus === true && this.attachPoints && this.attachPoints.input) {
                this.attachPoints.input.focus();
            }
            this._handleValueChange();
        },

        setDisabled : function(disabled) {
            this.disabled = disabled;
            if (this.input && this.input.prop) {
                this.input.prop("disabled", disabled);
            }
        },

        _handleValueChange : function() {
            var val = this.input ? this.input.val() : "";
            this.value = val;
            this._updateClearButtonVisibility();
            this._dispatchChange(val);
        },

        _updateClearButtonVisibility : function() {
            if (this.clearButton) {
                if (!this.value || !this.value.length) {
                    this.clearButton.hide();
                }
                else {
                    this.clearButton.show();
                }
            }
        },

        _handleKeypress : function(evt) {
            var val = $(evt.target).val();
            if (val !== this.value) {
                this.value = val;
                this._updateClearButtonVisibility();
                if (this._countdown) {
                    clearTimeout(this._countdown);
                }
                this._countdown = setTimeout(function() {
                    this.dispatchEvent("keypress", {value : val}, true);
                    if (this.changeOnKeyPress) {
                        this._dispatchChange(val);
                    }
                }.bind(this), this.keyPressDelay);
            }
        },

        _dispatchChange : function(value) {
            if (!this.preventDuplicateChangeEvents || value !== this._lastValue) {
                var val = value === "" ? null : Number(value);
                if (this.type === "number" && !(val === null && this.allowEmptyValue) &&
                    (isNaN(val) || val === null ||
                    (this.max !== null && !isNaN(this.max) && val > this.max) ||
                    (this.min !== null && !isNaN(this.min) && val < this.min))) {
                    var msg = "Please enter a valid number",
                        hasMin = false;
                    if (this.min !== null && this.min !== undefined) {
                        msg += " greater than or equal to " + this.min;
                        hasMin = true;
                    }
                    if (this.max !== null && this.max !== undefined) {
                        if (hasMin) {
                            msg += " and ";
                        }
                        msg += " less than or equal to " + this.max;
                    }
                    msg += ".";
                    // todo show a cleaner notification message instead of an alert
                    alert(msg);
                }
                else {
                    if (this.type === "text" && this.validationPattern && value !== "") {
                        var rgx = new RegExp("^" + this.validationPattern + "$");
                        if (!value.match(rgx)) {
                            alert(this.validationMessage || "Please enter a valid value");
                            return;
                        }
                    }
                    this._lastValue = value;
                    this.dispatchEvent("change", {value : value}, true);
                }
            }
        },

        getTemplateData : function() {
            var additionalAttributes = "",
                name = this.data && this.data.name !== undefined ? this.data.name : null,
                baseClass = this.data && this.data.baseClass !== null && this.data.baseClass !== undefined ? this.data.baseClass : null;

            this.value = this.data && this.data.value !== undefined ? this.data.value : this.value;
            this.placeholder = this.data && this.data.placeholder !== undefined ? this.data.placeholder : this.placeholder;
            this.type = this.data && this.data.type !== undefined ? this.data.type : this.type;

            if (this.min !== null && this.min !== undefined && !isNaN(this.min)) {
                additionalAttributes += " min='" + Number(this.min) + "'";
            }
            if (this.max !== null && this.max !== undefined && !isNaN(this.max)) {
                additionalAttributes += " max='" + Number(this.max) + "'";
            }
            if(this.step !== null && this.step !== undefined ){
                additionalAttributes += " step='" + this.step  + "'";
            }
            return {
                baseClass : baseClass || this.baseClass,
                placeholder : this.placeholder,
                value : this.value !== null && this.value !== undefined ? this.value : "",
                name : name || this._key || this.name || "",
                type: this.type,
                additionalAttributes : additionalAttributes,
                ariaLabel : this.ariaLabel
            };
        }
    });
});