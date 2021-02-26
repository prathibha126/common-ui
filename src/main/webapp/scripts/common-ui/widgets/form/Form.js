define([
    "jquery",
    "common-ui/widgets/_TemplatedWidget",
    "common-ui/widgets/utils/formUtil",
    "common-ui/widgets/utils/templateUtil",
    "common-ui/widgets/utils/metadataUtil",
    "common-ui/widgets/utils/stringUtil",
    "common-ui/widgets/form/FileUploadInput",
    "common-ui/widgets/SelectionList",
    "common-ui/widgets/Select",
    "common-ui/widgets/InfoTooltip",
    "common-ui/widgets/form/DateTimePicker",
    "common-ui/models/DataStore",
    "text!common-ui/widgets/form/templates/Form.html"
], function($, _TemplatedWidget, formUtil, templateUtil, metadataUtil, stringUtil, FileUploadInput, SelectionList, Select, InfoTooltip, DateTimePicker, DataStore, template) {

    "use strict";

    var INPUT_TYPE_STATIC = "static",
        INPUT_TYPE_TEXT = "text",
        INPUT_TYPE_EMAIL = "email",
        INPUT_TYPE_PASSWORD = "password",
        INPUT_TYPE_NUMBER = "number",
        INPUT_TYPE_SELECT = "select",
        INPUT_TYPE_TEXTAREA = "textarea",
        INPUT_TYPE_CHECKBOX = "checkbox",
        INPUT_TYPE_RADIO = "radio",
        INPUT_TYPE_HIDDEN = "hidden",
        INPUT_TYPE_DATETIME = "datetime",
        INPUT_TYPE_FILEUPLOAD = "fileupload",
        INPUT_TYPE_SECTION = "section",
        INPUT_TYPE_MATRIX = "matrix",
        VALIDATORS = {
            /* for more validator patterns see http://html5pattern.com/ */
            /* DO NOT USE AN EMAIL PATTERN; THIS IS ACHIEVED WITH input type="email" */
            DATE : {
                pattern : /(0[1-9]|1[0-2])[/](0[1-9]|[12]\d|3[01])[/](19|20)\d\d/,
                title : "Please enter a date in the format MM/DD/YYYY"
            },
            NUMBER : {
                pattern : /^[-+]?[0-9]*[.,]?[0-9]+$/,
                title : "Please enter a valid number"
            },
            NUMBER_POSITIVE_MAX_2DECIMAL : {
                pattern : /^[0-9]+(\.[0-9]{1,2})?$/,
                title : "Please enter a positive number with at most two decimal places"
            },
            ZIP : {
                pattern : /(\d{5})/,
                title : "Please enter a valid 5-digit zip code"
            }
        },
        formId = 1;

    return _TemplatedWidget.extend({

        // Form
        //      a form containing a variety of form elements
        //
        //      options
        //         inputs: Array
        //              a array of form inputs keyed by the input name
        //              each input can have a type, label, required (true|false) and name and value
        //              select and radio style inputs have an options array (label/value)

        inputs : null,

        template : template,

        // baseClass: String
        //      the base css class for this form; consider using 'simple-form' as a more standard option
        baseClass : "shady-container",

        // parentBaseClass: String
        //      the parent base css class for this form (on the div containing the baseClass div)
        //      defaults to card, but if baseClass is set to an empty string, it parentBaseClass will also be an empty string
        parentBaseClass : "card",

        // skipClass: String
        //      the css class applied to each form input row when it should be skipped
        skipClass : "form-input-skip",

        // errorClass: String
        //      the css class applied to each form input row when it has a validation error (including empty required inputs)
        errorClass : "has-error",

        // readOnlyClass: String
        //      the css class applied to the entire form if it is in read only mode
        readOnlyClass : "read-only",

        // disabledClass: String
        //      the css class applied to the entire form if it is disabled
        disabledClass : "disabled-form",

        // enableSubmit: Boolean
        //      true if the form should include a submit button
        enableSubmit : false,

        // enableIncompleteSubmit: Boolean
        //      true if this form can be submitted while incomplete via the incompleteSubmit button.
        //      note form will dispatch an incompleteSubmit event instead of submit and persistedIncomplete[Success|Warn|Error]
        enableIncompleteSubmit : false,

        // incompleteSubmitLabel: String
        //      the label of the button used to submit an incomplete form (only valid if enableIncompleteSubimt is true
        incompleteSubmitLabel : "Save and Finish Later",

        // incompleteSubmitProp: String
        //      the name of the boolean property value included in the incomplete submit data to signify that the data is incomplete
        incompleteSubmitProp : "incomplete",

        // readOnly: Boolean
        //      true if the form should be in read only mode
        readOnly : null,

        // resetOnSubmit: Boolean
        //      true if the form should reset as soon as it is valid and submitted; otherwise it must be reset manually
        resetOnSubmit : true,

        // resetOnPersistedSuccess: Boolean
        //      true if the form should be reset when this widget dispatches a "persistedSuccess" event
        resetOnPersistedSuccess : false,

        // submitLabel: String
        //      the label of the submit button
        submitLabel : "Save",

        // textMaxLength: Number
        //      the global max length for any text-based input; this can be overridden on a per-input basis
        textMaxLength : 250,
        
        // numbered: Boolean
        //      true if the form inputs should be numbered (1, 2, 3, ...)
        numbered : false,

        // disabled: Boolean
        //      true if all inputs within the form are disabled; this can be overridden on a per-input basis
        disabled: false,

        // TODO consider making disabled, visible (not included in post) also a string that can support expressions (e.g. "input2=3")
        // may also need dynamic validation based on the value of another input

        // includeDisabledInputs: Boolean
        //      true if disabled input values should be included when submitting the form
        includeDisabledInputs : true,

        // skipLogicIgnoreSkippedInputs: Boolean
        //      true if skip logic should ignore inputs that are skipped
        skipLogicIgnoreSkippedInputs : false,

        // sourceWidget: String
        //      the name of the widget that triggers this form, if applicable. params from this widget will be unbound in the data store
        //      after form submit if this form is not write only since the form will be reset and the retrieved data values would otherwise be lost.
        //      TODO this is a temporary solution and ultimately the retrieved data should be cached and restored when this form is shown again if there is not a new value to show
        sourceWidget : null,

        valueProp : "value",

        // instructions: String
        //      text instructions to be displayed at the top of the form (can also be provided with data)
        instructions : "",

        // multipleSelectMaxOptions: Number
        //      the max number of options that can be selected in a multi select by default; overridden if item.multiple is set to a value other than true
        multipleSelectMaxOptions : 100,

        // invalidLabel: String
        //      text that displays when attempting to submit an invalid form in addition to element level validation
        invalidLabel : "",

        // perInputValidationMessages: Boolean
        //      true if validation messages should be shown per form input
        perInputValidationMessages : true,

        // requiredMessage: String
        //      the validation message shown when a required element does not have a value
        requiredMessage : "This field is required",

        // disableHTML5Validation: Boolean
        //      true if https://www.w3.org/TR/html5/forms.html#attr-fs-novalidate should be set to true
        disableHTML5Validation : true,

        // enableHTMLEntities: Boolean
        //      true if labels and values could contain html entities such as &amp; that should be decoded as &. use caution
        //      and only enable with safe, non-user provided values
        enableHTMLEntities : false,

        // allInputsContainSafeMarkup: Boolean
        //      USE EXTREME CAUTION! this should only be enabled if the HTML content is from a trusted, non-user provided source!
        //      this will enable HTML (including scripts!) to be embedded within form input labels and options.
        allInputsContainSafeMarkup : false,

        // sectionWizardStyle: Boolean
        //      true and there is more than 1 section defined the form will add a progress bar, next, and previous buttons to the form to model a wizard style
        sectionWizardStyle : false,

        // notSelectedSectionClass: String
        //      the the class for the sections of the form that are not selected
        //          One option is "disabled"
        notSelectedSectionClass : "section-not-selected",

        // backButtonLabel: String
        //      the label for the back button when in the wizard view
        backButtonLabel : "Back",

        // nextButtonLabel: String
        //      the label for the next button when in the wizard view
        nextButtonLabel : "Next",

        // validationMessageDefault: String
        //      the validation message to show from an input if its value is invalid and a more specific message is not available
        validationMessageDefault : "Please enter a valid value",

        // preventAbandon: Boolean
        //      true if this form will block navigation away from this application or to other screens if it has been modified but not submitted
        preventAbandon : false,

        // preventAbandonMessage: String
        //      the message to be displayed if the user attempts to navigate to another screen without submitting a modified form
        preventAbandonMessage : "Your changes have not yet been saved; are you sure you wish to navigate away from this screen?",

        // setInputValuePreventAbandon
        //      true if changes to input values made via the setInputValue method will prevent form abandon when preventAbandon is true
        setInputValuePreventAbandon : false,

        // submitRedirectUrl: String
        //      if provided, the form will be post'd to this url instead of simply making an ajax request to the service url,
        //      and the browser will navigate to this url, leaving the current application
        submitRedirectUrl : null,
        
        // submitRedirectUrlIncludeUserToken: Boolean
        //      include the JWT (token) when using the submitRedirectUrl option for the form
        submitRedirectUrlIncludeUserToken : false,

        // submitRedirectTarget: String
        //      if submitRedirectUrl is specified, the target (_blank|_self|_parent|_top|framename) to which the form will be submitted
        submitRedirectTarget : "_self",

        // requiredSelectDefaultEmptyOption: Boolean
        //      true if all required select inputs should be given a default empty option (a selection will still be required)
        requiredSelectDefaultEmptyOption : false,

        // groupAddButtonLabel: String
        //      the label for the add button for grouped elements that are able to be duplicated
        groupAddButtonLabel : "Add",

        init : function(opts) {
            if (opts.data) {
                this.updateData(opts.data);
            }
            this._super.apply(this, arguments);
            if (this.preventAbandon) {
                this.connect(window, "beforeunload.form." + this._key + (formId++),
                    this._handlePreventAbandon.bind(this));
            }
        },

        onTemplateNodesAttached : function(nodes) {
            if (nodes.form && !this._formRendered) {
                this._renderForm();
            }
        },

        updateData : function(data) {
            this.data = data;
            if (data) {
                if (data.disabled !== null && data.disabled !== undefined) {
                    this.disabled = data.disabled;
                }
                if (data.readOnly !== null && data.readOnly !== undefined) {
                    this.readOnly = data.readOnly;
                }
                if (data.hidden !== null && data.hidden !== undefined) {
                    var hidden = String(data.hidden).toLowerCase() === "true";
                    this.setVisible(!hidden);
                }
                if (data.instructions) {
                    this.instructions = data.instructions;
                }
                if (data.submitLabel) {
                    this.submitLabel = data.submitLabel;
                }
                if (data.inputs && data.inputs.length >= 0) {
                    // if inputs are provided, we need to re-render the form; any data values will also be captured here
                    this._dataValueMap = data.data || data.values || {};
                    this.inputs = data.inputs;
                    this._renderForm();
                }
                else {
                    // otherwise there is some sort of data provided, so set the values
                    this.setValues(data.data || data.values || data);

                    // also check to see if submit was enabled within the data
                    if (data.enableSubmit !== null && data.enableSubmit !== undefined) {
                        this.setEnableSubmit(data.enableSubmit);
                    }
                    if (data.enableIncompleteSubmit !== null && data.enableIncompleteSubmit !== undefined) {
                        this.setEnableIncompleteSubmit(data.enableIncompleteSubmit);
                    }
                }
                if (data.readOnly !== null && data.readOnly !== undefined) {
                    this.setReadOnly(data.readOnly);
                }

                if (data.disabled !== null && data.disabled !== undefined) {
                    this.setDisabled(data.disabled);
                }
            }
            this.dispatchEvent("dataUpdated", data);
        },

        dispatchEvent : function(type) {
            if (type === "persistedSuccess") {
                if (this.resetOnPersistedSuccess) {
                    this.reset();
                }
                else {
                    this._inputValueChangePreventUnload = false;
                }
            }
            this._super.apply(this, arguments);
            // note the super call above will set this._lastChangeEventData with the value of the data for change events
            // we need to remove password values from this map once the data has been sent
            if (type === "change" && this._lastChangeEventData) {
                var inputName;
                for (inputName in this._lastChangeEventData) {
                    if (inputName && this._inputMap[inputName] && this._inputMap[inputName].type === INPUT_TYPE_PASSWORD &&
                        typeof this._lastChangeEventData[inputName] !== "undefined") {
                        this._lastChangeEventData[inputName] = "";
                    }
                }
            }
        },

        _renderForm : function() {
            if (this.attachPoints && this.attachPoints.form) {
                this._formRendered = true;

                // if there was a submit button created previously, its reference needs to be removed before emptying the form
                if (this._submitButton) {
                    delete this._submitButton;
                }
                if (this._incompleteSubmitButton) {
                    delete this._incompleteSubmitButton;
                }
                if (this._submitListener) {
                    this.disconnect(this._submitListener);
                    delete this._submitListener;
                }
                if (this._incompleteSubmitListener) {
                    this.disconnect(this._incompleteSubmitListener);
                    delete this._incompleteSubmitListener;
                }

                // unbind any input change handlers before emptying the form
                this._unbindInputChangeHandlers();
                this.attachPoints.form.empty();
                if (this._afterSubmitContainer) {
                    this._afterSubmitContainer.empty();
                }

                // apply the submit redirect url if provided
                if (this.submitRedirectUrl) {
                    this.setSubmitRedirectUrl(this.submitRedirectUrl);
                }

                // remove all widgets created from previous rendering
                if (this._inputMap) {
                    var key;
                    for (key in this._inputMap) {
                        if (key && this._inputMap[key] && this._inputMap[key]._widget && this._inputMap[key]._widget.remove) {
                            this._inputMap[key]._widget.remove();
                        }
                    }
                }

                this._inputMap = {};
                this._inputSkipTargetMap = {};
                this._inputNodeMap = {};
                this._inputRowNodeMap = {};
                this._skippedInputMap = {};
                this._inputValueMap = {};
                this._inputOptionsDataStoreMap = {};
                this._sectionInputMap = {};
                this._sectionCountMap = {};
                this._sectionList = [];
                this._repeatGroupsMap = {};
                this._inputValueChangePreventUnload = false;
                this._hasFileUpload = false;

                if (this.inputs && this.inputs.length > 0) {
                    var dom, currEl, currInnerEl, currLabelEl, currInputContainerEl, currPromptEl, currLabel,
                        instructionsEl, staticInputEl, currInputEl, currSubLabelEl, tooltipEl, tooltip,
                        i = 0, currWidgetEl, hiddenClass, disabled, curr, opts,
                        val, maxlength, enableHTMLEntities, matrixDom = "", matrixDomOpen = false,
                        sectionDom = "", sectionDomOpen = false, afterSubmit, currentSection = null;
                    for (i; i < this.inputs.length; i++) {
                        curr = this.inputs[i];

                        if (curr && curr.repeatingGroup) {
                            this._addRepeatingGroups(curr, sectionDomOpen, sectionDom);
                        }
                        if (curr && curr.type) {
                            curr.type = curr.type.toLowerCase();
                        }
                        if (curr && (curr.name || curr.type === INPUT_TYPE_STATIC)) {
                            dom = $("<div/>").addClass("form-input-row-container");

                            // append the instructions first if included
                            if (!i && this.instructions) {
                                instructionsEl = $("<div class='form-instructions'></div>");
                                instructionsEl.text(templateUtil.htmlDecode(this.instructions, "text"));
                                this.attachPoints.form.append(instructionsEl);
                            }

                            this._inputMap[curr.name] = curr;
                            disabled = curr.disabled || this.disabled || (this.data && this.data.disabled) ? "disabled " : "";
                            enableHTMLEntities = curr.enableHTMLEntities !== undefined && curr.enableHTMLEntities !== null
                                ? curr.enableHTMLEntities : this.enableHTMLEntities;

                            // extract any value from the data value map if provided
                            if (this._dataValueMap && this._dataValueMap.hasOwnProperty(curr.name)) {
                                curr[this.valueProp] = this._dataValueMap[curr.name];
                            }

                            afterSubmit = curr.type === INPUT_TYPE_STATIC && String(curr.afterSubmit).toLowerCase() === "true";
                            hiddenClass = curr.type === INPUT_TYPE_HIDDEN ? "-hidden" : "";

                            if (!afterSubmit) {
                                currEl = $("<div class='form-input-row form-group "
                                    + (hiddenClass ? " hidden" : "")
                                    + (curr.skip ? " form-input-skip" : "")
                                    + (curr.type !== INPUT_TYPE_STATIC && curr.type !== INPUT_TYPE_HIDDEN && this.numbered
                                        && !(sectionDomOpen && this._radioMatrixWidth)
                                        ? " form-input-row-numbered" : "")
                                    + "'></div>");
                                currEl.addClass("form-input-" + curr.name);
                                if (curr.inputClass) {
                                    currEl.addClass(curr.inputClass);
                                }
                                dom.append(currEl);

                                currInnerEl = $("<div class='form-input-row-inner" + hiddenClass + "'></div>");
                                currEl.append(currInnerEl);

                                if (curr.label !== null && curr.label !== undefined) {
                                    currLabelEl = $("<div class='form-input-label control-label"
                                            + (!curr.label ? " form-input-label-empty" : "") + "'></div>");
                                    currLabel = templateUtil.htmlDecode((curr.label || " "), "text")
                                        + (curr.required && curr.label && !curr.noAsterisk ? "*" : "");
                                    if (curr.containsSafeMarkup === true || this.allInputsContainSafeMarkup === true) {
                                        currLabelEl.append(currLabel);
                                    }
                                    else {
                                        currLabelEl.text(currLabel);
                                    }
                                    currInnerEl.append(currLabelEl);

                                    if (curr.tooltip) {
                                        tooltipEl = $("<span></span>");
                                        tooltip = new InfoTooltip({
                                            tooltipText : curr.tooltip,
                                            showInfoDesc : false,
                                            showInfoValue : false
                                        }, tooltipEl);
                                        currLabelEl.append(tooltipEl);
                                    }

                                    if (curr.subLabel) {
                                        currSubLabelEl = $("<div class='form-input-sub-label'></div>");
                                        currSubLabelEl.text(templateUtil.htmlDecode(curr.subLabel, "text"));
                                        currLabelEl.append(currSubLabelEl);
                                    }
                                }
                                currInputContainerEl = $("<div class='form-input" + hiddenClass + "'></div>");
                                currInnerEl.append(currInputContainerEl);
                            }

                            if (curr.prompt) {
                                currPromptEl = $("<span class='form-input-prompt'></span>");
                                currPromptEl.text(templateUtil.htmlDecode(curr.prompt, "text")
                                    + (curr.required && !curr.noAsterisk ? "*" : "") + ":");
                                currInputContainerEl.append(currPromptEl);
                            }

                            if (curr.type === INPUT_TYPE_STATIC) {
                                val = (curr[this.valueProp] || curr.value);
                                staticInputEl = $("<p/>")
                                    .attr("name", curr.name)
                                    .addClass("form-input-static");

                                if (curr.options && curr.options.serviceUrl) {
                                    this._getInputOptions(curr,
                                        this._resetStaticInputValue.bind(this, staticInputEl),
                                        this._setStaticInputValue.bind(this, curr, staticInputEl));
                                }
                                else {
                                    this._setStaticInputValue(curr, staticInputEl, val);
                                }


                                // if the afterSubmit flag is set, append this static input after the submit button in a sep container
                                if (afterSubmit) {
                                    if (!this._afterSubmitContainer) {
                                        this._afterSubmitContainer = $("<div class='form-after-submit'></div>");
                                        if (this.attachPoints && this.attachPoints.formContainer) {
                                            this.attachPoints.formContainer.append(this._afterSubmitContainer);
                                        }
                                    }
                                    this._afterSubmitContainer.append(staticInputEl);
                                }
                                else {
                                    currInputContainerEl.append(staticInputEl);
                                }
                            }
                            else if (curr.type === INPUT_TYPE_SELECT) {
                                currWidgetEl = $("<div/>");
                                this._updateSelectedOptions(curr[this.valueProp], curr.options);
                                curr._enableHTMLEntities = enableHTMLEntities;
                                curr._disabled = disabled;

                                this._addEmptySelectOption(curr, curr.options);

                                curr._widget = this._createFormWidget(curr, currWidgetEl);
                            }
                            else if (curr.type === INPUT_TYPE_DATETIME) {
                                // TODO support 2 linked date pickers
                                currWidgetEl = $("<div/>");
                                // use the existing props and remove those that do not apply
                                opts = $.extend({}, curr);
                                delete opts.label;
                                delete opts.type;
                                delete opts.required;
                                if (!opts[this.valueProp]) {
                                    opts.noDefault = true;
                                }
                                opts.valueProp = this.valueProp;
                                opts.disabled = disabled ? true : false;
                                opts.ariaLabel = curr.ariaLabel || null;
                                curr._widgetOpts = opts;
                                curr._widget = this._createFormWidget(curr, currWidgetEl);
                            }
                            else if (curr.type === INPUT_TYPE_RADIO) {
                                if (curr.options && (curr.options.length > 0 || curr.options.serviceUrl) && curr.name) {
                                    currInputContainerEl.append(
                                        this._generateInputOptionDom(curr.options, curr.name, "radio", disabled, curr));
                                }
                            }
                            else if (curr.type === INPUT_TYPE_TEXTAREA) {
                                maxlength = Number(curr.textMaxLength || this.textMaxLength);
                                val = (curr[this.valueProp] || curr.value);
                                val = val ? templateUtil.htmlDecode(val, "text") : "";

                                currInputEl = $("<textarea maxlength='" + maxlength + "' " + disabled
                                    + (curr.width ? (" style='width: " + Number(curr.width) + "px;' ") : "")
                                    + "></textarea>");
                                if (curr.placeholder) {
                                    currInputEl.attr("placeholder", curr.placeholder);
                                }
                                currInputEl.attr({"name": curr.name , "aria-label": this._getAriaLabel( curr ) });
                                currInputEl.val(val);
                                currInputContainerEl.append(currInputEl);
                            }
                            else if (curr.type === INPUT_TYPE_CHECKBOX) {
                                if (curr.options && (curr.options.length > 0 || curr.options.serviceUrl) && curr.name) {
                                    curr.multiple = true;
                                    currInputContainerEl.append(
                                        this._generateInputOptionDom(curr.options, curr.name, "checkbox", disabled, curr));
                                }
                                else {
                                    val = curr.selected ||
                                        (curr[this.valueProp] && String(curr[this.valueProp]).toLowerCase() === "true")
                                            ? " checked" : "";
                                    currInputEl = $("<input " + disabled + val + " type='checkbox' />");
                                    currInputEl.attr({"name" : curr.name , "aria-label" : this._getAriaLabel( curr )});
                                    currInputContainerEl.append(currInputEl);
                                }
                            }
                            else if (curr.type === INPUT_TYPE_FILEUPLOAD) {
                                this._hasFileUpload = true;
                                currWidgetEl = $("<div/>");
                                // ensure the data store is configured correctly:
                                if (this.dataStore) {
                                    this.dataStore.fileUpload = true;
                                }
                                curr._widget = this._createFormWidget(curr, currWidgetEl);
                            }
                            else if (curr.type === INPUT_TYPE_EMAIL || curr.type === INPUT_TYPE_TEXT ||
                                curr.type === INPUT_TYPE_PASSWORD || curr.type === INPUT_TYPE_HIDDEN ||
                                curr.type === INPUT_TYPE_NUMBER || !curr.type) {
                                currInputContainerEl.append(this._createInput(curr, disabled));
                            }

                            if (currWidgetEl) {
                                currInputContainerEl.append(currWidgetEl);
                                currWidgetEl = null;
                            }
                            if (curr.skip) {
                                this._processSkipLogic(curr);
                            }
                            curr.canChange = !disabled && !hiddenClass && curr.type !== INPUT_TYPE_STATIC;

                            if (curr.feedback) {
                                dom.append(this._createFeedbackElement(curr.feedback));
                            }


                            if (curr.type === INPUT_TYPE_MATRIX) {
                                if (matrixDomOpen || curr.end) {
                                    if (!this._appendFormDomElement(curr, sectionDom, matrixDom, sectionDomOpen)) {
                                        this.attachPoints.form.append(matrixDom);
                                    }
                                    matrixDom = "";
                                    matrixDomOpen = false;
                                    this._radioMatrixWidth = null;
                                }

                                if (!curr.end) {
                                    matrixDom = $("<div/>").addClass("form-matrix form-matrix-" + curr.name);
                                    matrixDomOpen = true;

                                    if (curr.label) {
                                        var matrixLabel = $("<div/>").addClass("form-matrix-label"),
                                            matrixLabelText = templateUtil.htmlDecode(curr.label, "text");

                                        if (curr.containsSafeMarkup === true || this.allInputsContainSafeMarkup === true) {
                                            matrixLabel.append(matrixLabelText);
                                        }
                                        else {
                                            matrixLabel.text(matrixLabelText);
                                        }
                                        matrixDom.append(matrixLabel);
                                    }

                                    if (curr.options && (curr.options.length || curr.options.serviceUrl)) {
                                        var idx, option, tempDom, optionLabel,
                                            matrixOptionsDom = $("<div/>").addClass("form-matrix-options"),
                                            cssWidth = 100 / curr.options.length;

                                        this._radioMatrixWidth = cssWidth;

                                        for (idx = 0; idx < curr.options.length; idx++) {
                                            option = curr.options[idx];

                                            if (option && option.label) {
                                                tempDom = $("<div/>")
                                                    .addClass("form-matrix-option-label")
                                                    .css("width", cssWidth + "%");
                                                optionLabel = templateUtil.htmlDecode(option.label, "text");
                                                if (curr.containsSafeMarkup === true || this.allInputsContainSafeMarkup === true) {
                                                    tempDom.append(optionLabel);
                                                }
                                                else {
                                                    tempDom.text(optionLabel);
                                                }

                                                matrixOptionsDom.append(tempDom);
                                            }
                                        }
                                        matrixDom.append(matrixOptionsDom);
                                    }
                                }
                            }
                            else if (matrixDomOpen && curr.type === INPUT_TYPE_RADIO) {
                                matrixDom.append(dom);
                                if (sectionDomOpen) {
                                    this._updateSectionCount(currentSection, curr.name);
                                    this._inputMap[curr.name]._section = currentSection;
                                }
                            }

                            else {
                                if (matrixDomOpen) {
                                    if (!this._appendFormDomElement(curr, sectionDom, matrixDom, sectionDomOpen)) {
                                        this.attachPoints.form.append(matrixDom);
                                    }
                                    matrixDom = "";
                                    matrixDomOpen = false;
                                    this._radioMatrixWidth = null;
                                }

                                if (sectionDomOpen && curr.type === INPUT_TYPE_SECTION) {
                                    this.attachPoints.form.append(sectionDom);
                                }

                                if (curr.type === INPUT_TYPE_SECTION && curr.name !== null && curr.name !== undefined) {
                                    var sectionListLength = this._sectionList.length;
                                    sectionDom = $("<div/>").addClass("form-section form-section-" + curr.name);
                                    if (this.sectionWizardStyle) {
                                        sectionDom.addClass(this.notSelectedSectionClass);
                                    }
                                    if (curr.label) {
                                        var sectionLabel = $("<div/>").addClass("form-section-label")
                                            .text(templateUtil.htmlDecode(curr.label, "text"));
                                        sectionDom.append(sectionLabel);
                                    }

                                    sectionDomOpen = true;
                                    currentSection = curr.name;
                                    this._sectionList.push(curr.name);
                                    this._sectionInputMap[curr.name] = {start: i};
                                    this._sectionInputMap[curr.name].inputs = [];
                                    if (sectionListLength > 0) {
                                        this._sectionInputMap[this._sectionList[sectionListLength - 1]].end = i - 1;
                                    }
                                }
                                else if (sectionDomOpen) {
                                    if (matrixDom !== "") {
                                        this._appendFormDomElement(curr, sectionDom, matrixDom, sectionDomOpen);
                                    }
                                    else {
                                        this._appendFormDomElement(curr, sectionDom, dom, sectionDomOpen);
                                        this._updateSectionCount(currentSection, curr.name);
                                        this._inputMap[curr.name]._section = currentSection;
                                    }
                                }
                                else if (curr.repeatingGroup && curr._duplicateGroupName) {
                                    this._repeatGroupsMap[curr.repeatingGroup].duplicatedDom.find(".form-group-inner." + curr._duplicateGroupName).append(dom);
                                }
                                else if (curr.repeatingGroup) {
                                    this._repeatGroupsMap[curr.repeatingGroup].dom.append(dom);
                                }
                                else {
                                    this.attachPoints.form.append(dom);
                                }
                            }
                        }
                    }


                    this._previousButton = null;
                    this._nextButton = null;
                    if (sectionDom !== "") {
                        this.selectedSection = 0;
                        var finalSectionLength = this._sectionList.length;
                        this._sectionInputMap[this._sectionList[finalSectionLength - 1]].end = i-1;
                        if (finalSectionLength > 1 && this.sectionWizardStyle) {
                            this._progressBar = $("<div class='progress-slice'></div>");
                            var progressBarContainerEl = $("<div class='progress-bar-container'></div>");
                            progressBarContainerEl.append(this._progressBar);

                            this.attachPoints.form.prepend(progressBarContainerEl);
                            this.attachPoints.form.append(sectionDom);
                            var navigationButtonsEl = $("<div class='form-navigation-buttons-container'></div>"),
                                previousButtonTextEl = $("<span></span>"),
                                nextButtonTextEl = $("<span></span>");
                            this._previousButton = $("<button type='button' class='primary-button previous-button hide'><i class='glyphicon glyphicon-chevron-left'/> </button>");
                            this._nextButton = $("<button type='button' class='primary-button next-button'> <i class='glyphicon glyphicon-chevron-right'/></button>");

                            previousButtonTextEl.text(this.backButtonLabel);
                            this._previousButton.append(previousButtonTextEl);
                            navigationButtonsEl.append(this._previousButton);

                            nextButtonTextEl.text(this.nextButtonLabel);
                            this._nextButton.prepend(nextButtonTextEl);
                            navigationButtonsEl.append(this._nextButton);

                            this.previousButtonHidden = true;
                            this.attachPoints.form.append(navigationButtonsEl);

                            // ensure this is hidden by default if there is more than 1 step
                            if (this._afterSubmitContainer) {
                                this._afterSubmitContainer.hide();
                            }

                            if (this._previousListener) {
                                this.disconnect(this._previousListener);
                            }
                            this._previousListener = this.connect(this._previousButton,
                                "click.button.previous-button" + this._key, this._handleWizardNavigation.bind(this, -1, false));

                            if (this._nextListener) {
                                this.disconnect(this._nextListener);
                            }
                            this._nextListener = this.connect(this._nextButton,
                                "click.button.next-button" + this._key, this._handleWizardNavigation.bind(this, 1, false));
                        }
                        else {
                            this.attachPoints.form.append(sectionDom);
                        }

                        var section = this.attachPoints.form.find(".form-section-" + this._sectionList[this.selectedSection]);
                        section.removeClass(this.notSelectedSectionClass);
                        this.setProgressBarPercentage();
                    }

                    // Create and append the add buttons if a group is present
                    var groupName, groupOuterDom;
                    for (groupName in this._repeatGroupsMap) {
                        if (groupName && this._repeatGroupsMap[groupName]) {
                            groupOuterDom = this.attachPoints.form.find(".form-repeat-group-"+ groupName);
                            groupOuterDom.append(this._repeatGroupsMap[groupName].dom);
                            if (this._repeatGroupsMap[groupName].duplicatedDom.children()) {
                                groupOuterDom.append(this._repeatGroupsMap[groupName].duplicatedDom.children());
                            }
                            var addGroupButton = $("<button type='button'/>").text(this.groupAddButtonLabel).val(groupName).addClass("primary-button add-button " + groupName);
                            this._repeatGroupsMap[groupName].addListener = this.connect(addGroupButton,
                                "click.button.add-button."+ groupName + this._key, this._handleGroupAddButtonClick.bind(this, groupName, false));
                            this._repeatGroupsMap[groupName].addButton = addGroupButton;
                            groupOuterDom.append(addGroupButton);
                        }
                    }

                    // if we have a file upload widget, we need to modify the behavior of the form to post to a hidden iframe
                    if (this._hasFileUpload) {
                        this.attachPoints.form.attr({
                            enctype : "multipart/form-data"
                        });
                    }

                    // now that all inputs have been created, listen for changes after a short delay to ensure the elements are in the dom
                    setTimeout(function() {
                        this._bindInputChangeHandlers();
                    }.bind(this), 100);
                }
                else {
                    this.inputs = [];
                }

                if (this.data && this.data.readOnly !== null && this.data.readOnly !== undefined) {
                    this.readOnly = this.data.readOnly;
                }
                
                if (this.readOnly !== null && this.readOnly !== undefined) {
                    this.setReadOnly(this.readOnly);
                }

                if (this.disabled) {
                    this.setDisabled(this.disabled);
                }

                if (this.data && this.data.enableSubmit !== null && this.data.enableSubmit !== undefined) {
                    this.enableSubmit = this.data.enableSubmit;
                }

                if (this.data && this.data.enableIncompleteSubmit !== null && this.data.enableIncompleteSubmit !== undefined) {
                    this.enableIncompleteSubmit = this.data.enableIncompleteSubmit;
                }
                
                if (this.enableSubmit !== null && this.enableSubmit !== undefined) {
                    this.setEnableSubmit(this.enableSubmit, true);
                }

                if (this.data && this.data.enableIncompleteSubmit !== null && this.data.enableIncompleteSubmit !== undefined) {
                    this.enableIncompleteSubmit = this.data.enableIncompleteSubmit;
                }

                if (this.enableIncompleteSubmit !== null && this.enableIncompleteSubmit !== undefined) {
                    this.setEnableIncompleteSubmit(this.enableIncompleteSubmit, true);
                }
            }
        },

        _appendFormDomElement : function(curr, sectionDom, dom, sectionDomOpen) {
            var i = true;
            if (curr.repeatingGroup && curr._duplicateGroupName) {
                this._repeatGroupsMap[curr.repeatingGroup].duplicatedDom.find(".form-group-inner." + curr._duplicateGroupName).append(dom);
            }
            else if (curr.repeatingGroup) {
                this._repeatGroupsMap[curr.repeatingGroup].dom.append(dom);
            }
            else if (sectionDomOpen) {
                sectionDom.append(dom);
            }
            else {
                i = false;
            }
            return i;
        },

        _createFormWidget : function (curr, currWidgetEl, isDuplicate) {
            if (curr.type === INPUT_TYPE_SELECT) {
                var currValue = isDuplicate === true ? "" : curr[this.valueProp],
                    inputOptions = curr.options;

                if (inputOptions && inputOptions.serviceUrl) {
                    inputOptions = this._getInputOptions(curr,
                        this._resetSelectInput.bind(this, curr),
                        this._getSelectInputOptionsCallback(curr, currValue));
                }
                else {
                    this._updateSelectedOptions(currValue, inputOptions);
                }

                if (curr.multiple) {
                    return this.addWidget(new Select({
                        valueProp : this.valueProp,
                        maxOptions : typeof curr.multiple === "number" ? Number(curr.multiple) : this.multipleSelectMaxOptions,
                        defaultSelectCount : 0,
                        dropupAuto : true,
                        ariaLabel : this._getAriaLabel( curr ),
                        disabled : curr._disabled ? true : false,
                        multiple : true,
                        name : curr.name,
                        allowNoSelection : true,
                        deselectAllText : curr.clearSelectionLabel || this.clearSelectionLabel,
                        selectAllText : curr.selectAllLabel || this.selectAllLabel,
                        selectAllEnabled: curr.selectAllEnabled !== undefined && curr.selectAllEnabled !== null ? curr.selectAllEnabled : this.selectAllEnabled,
                        grouped: curr.grouped !== undefined && curr.grouped !== null ? curr.grouped : this.grouped,
                        title : "Select",
                        minRequiredSearchChars: curr.minRequiredSearchChars,
                        enableHTMLEntities : curr._enableHTMLEntities,
                        valuesContainSafeMarkup : (curr.containsSafeMarkup === true || this.allInputsContainSafeMarkup === true),
                        data : inputOptions
                    }, currWidgetEl));
                }
                else {
                    var WidgetConstructor = metadataUtil.getWidgetConstructorByName("SelectionList");
                    return  this.addWidget(new WidgetConstructor({
                        enableHTMLEntities : curr._enableHTMLEntities,
                        valuesContainSafeMarkup : (curr.containsSafeMarkup === true || this.allInputsContainSafeMarkup === true),
                        name : curr.name,
                        data : inputOptions,
                        ariaLabel : this._getAriaLabel( curr ),
                        disabled : curr._disabled ? true : false,
                        valueProp : this.valueProp,
                        labelProp : "label",
                        allowNoSelection: curr.allowNoSelection || false,
                        grouped: curr.grouped !== undefined && curr.grouped !== null ? curr.grouped : this.grouped
                    }, currWidgetEl));
                }
            }

            if (curr.type === INPUT_TYPE_DATETIME) {
                if (isDuplicate === true) {
                    delete curr._widgetOpts[this.valueProp];
                    curr._widgetOpts.noDefault = true;
                }
                return this.addWidget(new DateTimePicker(curr._widgetOpts, currWidgetEl));
            }

            if (curr.type === INPUT_TYPE_FILEUPLOAD) {
                return this.addWidget(new FileUploadInput({
                    name : curr.name,
                    acceptPattern : curr.acceptPattern,
                    valueProp : this.valueProp,
                    disabled : curr._disabled ? true : false,
                    ariaLabel : this._getAriaLabel( curr )
                }, currWidgetEl));
            }
        },

        setEnableIncompleteSubmit : function (enableIncompleteSubmit, recreate) {
            this.enableIncompleteSubmit = enableIncompleteSubmit;
            if (enableIncompleteSubmit) {
                if (!this._incompleteSubmitButton || recreate === true) {
                    this._incompleteSubmitButton = $("<button type='submit' class='secondary-button submit-incomplete'/>")
                        .text(this.incompleteSubmitLabel);
                    this.attachPoints.form.append(this._incompleteSubmitButton);
                    if (this._incompleteSubmitListener) {
                        this.disconnect(this._incompleteSubmitListener);
                    }
                    this._incompleteSubmitListener = this.connect(this._incompleteSubmitButton, "click.incompleteSubmit." + this._key,
                        this._handleFormIncompleteSubmit.bind(this));
                }
                else if (this._incompleteSubmitButton) {
                    this._incompleteSubmitButton.removeClass("hide");
                }
            }
            else if (enableIncompleteSubmit === false && this._incompleteSubmitButton) {
                this._incompleteSubmitButton.addClass("hide");
            }
        },

        setEnableSubmit : function (enableSubmit, recreate) {
            this.enableSubmit = enableSubmit;
            if (enableSubmit) {
                if (!this._submitButton || recreate === true) {
                    var btnLabel = stringUtil.isValidString( this.submitLabel ) ? this.submitLabel : "Submit";
                    this._submitButton = $("<button type='submit' class='primary-button'></button>")
                        .text(this.submitLabel)
                        .attr( "aria-label" , btnLabel );
                    if (this.sectionWizardStyle && this._nextButton) {
                        this._submitButton.addClass("hide");
                    }
                    this.attachPoints.form.append(this._submitButton);
                    if (this._submitListener) {
                        this.disconnect(this._submitListener);
                    }
                    this._submitListener = this.connect(this.attachPoints.form, "submit." + this._key,
                        this._handleFormSubmit.bind(this));
                }
                else if (this._submitButton) {
                    this._submitButton.removeClass("hide");
                }
            }
            else if (enableSubmit === false && this._submitButton) {
                this._submitButton.addClass("hide");
            }
        },

        setReadOnly : function (readOnly) {
            if (readOnly === true || readOnly === false) {
                this.readOnly = readOnly;
                if ( this.attachPoints && this.attachPoints.form) {
                    if (readOnly) {
                        this.attachPoints.form.addClass(this.readOnlyClass);
                    }
                    else {
                        this.attachPoints.form.removeClass(this.readOnlyClass);
                    }

                    if (this.inputs && this.inputs.length > 0) {
                        var i, input, inputElement;
                        for (i = 0; i < this.inputs.length; i++) {
                            input = this.inputs[i];
                            inputElement = this._findInputByName(input.name);
                            if (input && !input.disabled && input.name && input.type !== INPUT_TYPE_STATIC && input.type !== INPUT_TYPE_SECTION) {
                                if (input._widget) {
                                    if (input._widget.setReadOnly) {
                                        input._widget.setReadOnly(readOnly);
                                    }
                                    else if (input._widget.setDisabled) {
                                        input._widget.setDisabled(readOnly);
                                    }
                                }
                                else {
                                    if (inputElement) {
                                        inputElement.prop("disabled", readOnly);
                                        if (input.type === INPUT_TYPE_CHECKBOX) {
                                            inputElement.closest(".form-input").find("input[data-disabled!='true']").attr("disabled", readOnly);
                                        }
                                    }
                                }
                            }
                            if (input.placeholder) {
                                inputElement.prop("placeholder", (readOnly ? "" : input.placeholder));
                            }
                        }
                    }
                }
            }
        },

        setDisabled : function (disabled) {
            if (disabled === true || disabled === false) {
                this.disabled = disabled;
                if (this.attachPoints && this.attachPoints.form) {
                    if (disabled) {
                        this.attachPoints.form.addClass(this.disabledClass);
                    }
                    else {
                        this.attachPoints.form.removeClass(this.disabledClass);
                    }

                    if (this.inputs && this.inputs.length > 0) {
                        var i, input, inputElement;
                        for (i = 0; i < this.inputs.length; i++) {
                            input = this.inputs[i];
                            if (input.name !== null && typeof input.name !== "undefined") {
                                inputElement = this._findInputByName(input.name);
                                if (input && !input.disabled && input.name && input.type !== INPUT_TYPE_STATIC && input.type !== INPUT_TYPE_SECTION) {
                                    if (input._widget) {
                                        if (input._widget.setDisabled) {
                                            input._widget.setDisabled(disabled);
                                        }
                                    }
                                    else {
                                        if (inputElement) {
                                            inputElement.prop("disabled", disabled);
                                            if (input.type === INPUT_TYPE_CHECKBOX) {
                                                inputElement.closest(".form-input").find("input[data-disabled!='true']").attr("disabled", disabled);
                                            }
                                        }
                                    }
                                }
                                if (input.placeholder) {
                                    inputElement.prop("placeholder", (disabled ? "" : input.placeholder));
                                }
                            }
                        }
                    }
                    if (this._repeatGroupsMap) {
                        var groupName;
                        for (groupName in this._repeatGroupsMap) {
                            if (groupName && this._repeatGroupsMap[groupName] && this._repeatGroupsMap[groupName].addButton) {
                                this._repeatGroupsMap[groupName].addButton.prop("disabled", disabled).toggleClass("disabled", disabled);
                            }
                        }
                    }
                }
            }
        },

        setSubmitRedirectUrl : function(submitRedirectUrl) {
            this.submitRedirectUrl = submitRedirectUrl;
            if (this.attachPoints && this.attachPoints.form) {
                this.attachPoints.form.attr({
                    action : this.submitRedirectUrlIncludeUserToken ? formUtil.appendUserTokenToUrl(this.submitRedirectUrl) : this.submitRedirectUrl,
                    method : "POST",
                    target : this.submitRedirectTarget
                });
            }
        },

        canUnload : function() {
            if ((this.enableSubmit || this.enableIncompleteSubmit) && this._inputValueChangePreventUnload && this.preventAbandon) {
                if (confirm(this.preventAbandonMessage)) {
                    this._inputValueChangePreventUnload = false;
                }
                else {
                    return false;
                }
            }
            return this._super.apply(this, arguments);
        },

        _handlePreventAbandon : function(e) {
            if (this.preventAbandon && this.domNode && this.domNode.is(":visible") && (this.enableSubmit || this.enableIncompleteSubmit) &&
                this._inputValueChangePreventUnload) {
               var confirmationMessage = this.preventAbandonMessage;
               if (e) {
                   e.returnValue = confirmationMessage;
               }
               return confirmationMessage;
            }
        },

        _updateSectionCount : function (currentSection, currName) {
            if (currentSection !== null && typeof currentSection !== "undefined") {
                if (this._sectionCountMap && currentSection && !this._sectionCountMap[currentSection]) {
                    this._sectionCountMap[currentSection] = 1;
                }
                else {
                    this._sectionCountMap[currentSection]++;
                }

                this._sectionInputMap[currentSection].inputs.push(currName);
            }
        },

        setSelectedSection : function(step) {
            var sectionNumber = this._sectionList.indexOf(step);

            if (sectionNumber > -1 && sectionNumber !== this.selectedSection) {
                var direction = sectionNumber - this.selectedSection;
                this._handleWizardNavigation(direction, true);
            }
        },

        _handleWizardNavigation : function (direction, userInitiated) {
            var sectionLength = this._sectionList ? this._sectionList.length : null,
                selectedSection = sectionLength !== null && this.selectedSection >= 0 && this.selectedSection <= sectionLength ? this._sectionList[this.selectedSection] : null,
                sectionInput = selectedSection && this._sectionInputMap ? this._sectionInputMap[selectedSection] : null,
                sectionStart = sectionInput ? sectionInput.start : null,
                sectionEnd = sectionInput ? sectionInput.end : null;

            if ((this.selectedSection - direction >= 0 && direction < 0) || (direction > 0 &&
                this.selectedSection !== sectionLength - 1 && this.checkIfFormValid(sectionStart, sectionEnd))) {
                var section = this.attachPoints.form.find(".form-section-" + this._sectionList[this.selectedSection]);
                section.addClass(this.notSelectedSectionClass);

                this.selectedSection += direction;

                if (this._sectionCountMap) {
                    var i;
                    for (i = this.selectedSection; i < this._sectionList.length && i >= 0; i += direction) {
                        selectedSection = this._sectionList[i];
                        if (selectedSection !== null && typeof selectedSection !== "undefined" && this._sectionCountMap[selectedSection]) {
                            this.selectedSection = i;
                            break;
                        }
                    }
                }

                section = this.attachPoints.form.find(".form-section-" + this._sectionList[this.selectedSection]);
                section.removeClass(this.notSelectedSectionClass);
                sectionLength = this.setProgressBarPercentage();
                this.updateNavButtonVisibility(sectionLength);

                if (!userInitiated) {
                    this.dispatchEvent(direction > 0 ? "nextSection" : "previousSection", {
                        selectedSection: this._sectionList[this.selectedSection],
                        direction: direction
                    }, true);
                }
                else {
                    this.dispatchEvent("sectionChange", {
                        selectedSection: this._sectionList[this.selectedSection],
                        direction: direction
                    }, true);
                }
            }
        },

        _addRepeatingGroups : function(curr, sectionDomOpen, sectionDom) {
            if (!this._repeatGroupsMap[curr.repeatingGroup]) {
                //create the repeating group dom element
                var groupDom = $("<div/>").addClass("form-repeat-group form-repeat-group-" + curr.repeatingGroup),
                    innerGroupDom = $("<div/>").addClass("flexbox form-group-inner " + curr.repeatingGroup);
                if (sectionDomOpen) {
                    sectionDom.append(groupDom);
                }
                else {
                    this.attachPoints.form.append(groupDom);
                }
                this._repeatGroupsMap[curr.repeatingGroup] = {inputs: [], dom: innerGroupDom, count: 1, duplicatedDom: $("<div/>")};
            }
            //keep track of the original values of the inputs for the groups
            if (!curr._duplicate) {
                this._repeatGroupsMap[curr.repeatingGroup].inputs.push(curr);
            }
            else if (curr._duplicateGroupName) {
                // if the item is a duplicate then create the inner dom
                if (!this._repeatGroupsMap[curr.repeatingGroup].duplicatedDom.find("." + curr._duplicateGroupName).length) {
                    var newDuplicateDom = $("<div/>").addClass("flexbox form-group-inner " + curr.repeatingGroup + " duplicate-input " + curr._duplicateGroupName);
                    this._repeatGroupsMap[curr.repeatingGroup].duplicatedDom.append(newDuplicateDom);
                    // increment the group count
                    this._repeatGroupsMap[curr.repeatingGroup].count++;
                }
            }

            if ($.isArray(curr[this.valueProp]) && curr[this.valueProp].length) {
                var valueIndex, newFormInput;
                if (!(curr.multiple && !$.isArray(curr[this.valueProp][0]))) {
                    for (valueIndex = 1; valueIndex < curr.value.length; valueIndex++) {
                        newFormInput = {};
                        newFormInput = $.extend(true, {}, curr);
                        newFormInput[this.valueProp] = curr[this.valueProp][valueIndex];
                        newFormInput.name = curr.name + "-" + valueIndex;
                        newFormInput._duplicate = true;
                        newFormInput._duplicateOf = curr.name;
                        newFormInput._duplicateIndex = valueIndex;
                        newFormInput._duplicateGroupName = curr.repeatingGroup + "-" + valueIndex;
                        this.inputs.push(newFormInput);
                        if (!this._duplicatedInputs) {
                            this._duplicatedInputs = [];
                        }
                        this._duplicatedInputs.push(newFormInput);
                    }
                    curr[this.valueProp] = curr[this.valueProp][0];
                }
            }
        },

        _handleGroupAddButtonClick : function (groupName) {
            if (groupName && this._repeatGroupsMap && this._repeatGroupsMap[groupName]) {
                //remove current change handlers so they are not duplicated
                this._unbindInputChangeHandlers();
                var i, curr, name,
                    inputs = this._repeatGroupsMap[groupName].inputs,
                    count = this._repeatGroupsMap[groupName].count,
                    originalDom = this._repeatGroupsMap[groupName].dom.clone(true).addClass("duplicate-input " +  groupName + "-" + count);

                if (!this._duplicatedInputs) {
                    this._duplicatedInputs = [];
                }
                for (i = 0; i < inputs.length; i++) {
                    curr = $.extend({},inputs[i]);
                    if (curr) {
                        name = curr.name + "-" + count;
                        originalDom.find(".form-input-" + curr.name).removeClass("form-input-" + curr.name).addClass("form-input-" + name);
                        curr._duplicate = true;
                        curr._duplicateOf = curr.name;
                        curr._duplicateIndex = count;
                        curr.name = name;

                        //if there is a widget that has been created, delete the dom elements and recreate a new widget
                        if (curr._widget) {
                            var currWidgetEl = $("<div/>");
                            curr._widget = this._createFormWidget(curr, currWidgetEl, true);
                            originalDom.find(".form-input-" + name + " .form-input").empty().append(currWidgetEl);
                        }
                        else {
                            // otherwise reset the value
                            var originalInput = originalDom.find(".form-input-" + curr.name + " input");
                            originalInput.attr("name", name);
                            if (curr.type === INPUT_TYPE_CHECKBOX || curr.type === INPUT_TYPE_RADIO) {
                                originalInput.prop("checked", false);
                            }
                            else {
                                originalInput.val("");
                            }
                        }

                        this._duplicatedInputs.push(curr);
                        this.inputs.push(curr);
                        this._inputMap[name] = curr;
                    }
                }

                this._repeatGroupsMap[groupName].count++;
                this.attachPoints.form.find("button." + groupName).before(originalDom);
                //rebind the change handlers to include the new inputs
                this._bindInputChangeHandlers();
            }
        },

        updateNavButtonVisibility : function (sectionLength) {
            if(this.sectionWizardStyle) {
                if (this.nextButtonHidden) {
                    if (this._submitButton) {
                        this._submitButton.addClass("hide");
                    }
                    this._nextButton.removeClass("hide");
                    this.nextButtonHidden = false;
                }

                if (this.previousButtonHidden) {
                    this._previousButton.removeClass("hide");
                    this.previousButtonHidden = false;
                }

                if (this.selectedSection === 0) {
                    this._previousButton.addClass("hide");
                    this.previousButtonHidden = true;
                }

                if (this.selectedSection === sectionLength - 1) {
                    this._nextButton.addClass("hide");
                    if (this._submitButton) {
                        this._submitButton.removeClass("hide");
                    }
                    this.nextButtonHidden = true;

                    // toggle visibility of the after submit container based on submit button visibility
                    if (this._afterSubmitContainer) {
                        this._afterSubmitContainer.show();
                    }
                } else {
                    if (this._afterSubmitContainer) {
                        this._afterSubmitContainer.hide();
                    }
                }
            }
        },

        setProgressBarPercentage : function () {
            if (this._sectionList && this._sectionList.length > 0 && this._progressBar) {
                var length  = this._sectionList.length;
                if (this._sectionCountMap) {
                    var key;
                    for (key in this._sectionCountMap) {
                        if (key !== null && typeof key !== "undefined" && this._sectionCountMap[key] < 1) {
                            length--;
                        }
                    }
                }
                var progressBarWidth = Math.max(0, Math.min(100, 100 - ((100 / length) * (this.selectedSection + 1))));
                this._progressBar.css({
                    "transform": "translateX(-" + progressBarWidth + "%)",
                    "-webkit-transform": "translateX(-" + progressBarWidth + "%)"
                });
                return length;
            }
        },

        _getAriaLabel( curr ) {
            if( stringUtil.isValidString( curr.ariaLabel ) ) {
                return curr.ariaLabel;
            }
            else {
                if( curr.type && ( curr.type === INPUT_TYPE_SELECT
                                    || curr.type === INPUT_TYPE_CHECKBOX
                                    || curr.type === INPUT_TYPE_RADIO )) {
                    return this._getFallBackAriaLabel( curr , "click to select the option" );
                }
                else if( curr.type &&
                            ( curr.type === INPUT_TYPE_TEXT
                                || curr.type === INPUT_TYPE_TEXTAREA
                                || curr.type === INPUT_TYPE_PASSWORD
                                || curr.type === INPUT_TYPE_EMAIL
                                || curr.type === INPUT_TYPE_NUMBER )) {
                    return this._getFallBackAriaLabel( curr , "enter the value");
                }
                else if( curr.type && curr.type === INPUT_TYPE_FILEUPLOAD ) {
                    return this._getFallBackAriaLabel( curr , "click to browse file");
                }
            }
        },

        _getFallBackAriaLabel( curr , defaultAriaLabel ) {
            var aLabel = curr.prompt || curr.subLabel || curr.label;
            return stringUtil.isValidString(aLabel) ? aLabel : defaultAriaLabel;
        },

        _getAriaLabelForOption( option ) {
            if( stringUtil.isValidString( option.ariaLabel ) ) {
                return option.ariaLabel;
            }
            else {
                return stringUtil.isValidString( option.label ) ? "click to select " + option.label : "click to select this option";
            }
        },

        _generateInputOptionDom : function (inputOptions, name, inputType, disabled, input) {
            var dom = $("<span/>"), generateInputOptionDom = function(options) {
                var j, option, labelEl, labelText, inputEl, iconEl, labelInnerEl, validatedInput,
                    optionDisabled;
                for (j = 0; j < options.length; j++) {
                    option = options[j];
                    if (option[this.valueProp] !== null && option[this.valueProp] !== undefined) {
                        labelEl = $("<label/>")
                            .addClass(inputType + "-input-label");
                        dom.append(labelEl);

                        optionDisabled = !disabled && option.disabled !== null && option.disabled !== undefined ? (option.disabled ? "disabled" : "") : disabled;

                        inputEl = $("<input " + optionDisabled + " type='" + inputType + "'"
                            + (option.selected ? " checked" : "")
                            + (optionDisabled ? " data-disabled='true'" : "")
                            + (option.voidOtherOptions ? " data-void-others='true'" : "") + ">");
                        inputEl.attr({ "name": name , "aria-label" : this._getAriaLabelForOption( option ) } );
                        inputEl.val(option[this.valueProp]);
                        labelEl.append(inputEl);

                        if (this._radioMatrixWidth && inputType === "radio") {
                            labelEl.css("width", this._radioMatrixWidth + "%");
                        }

                        if (option.iconClass) {
                            iconEl = $("<i/>")
                                .addClass(option.iconClass);
                            labelEl.append(iconEl);
                        }
                        if (option.label) {
                            labelInnerEl = $("<span/>")
                                .addClass(inputType + "-input-label-text");
                            labelText = templateUtil.htmlDecode(option.label, "text");
                            if (input.containsSafeMarkup === true || this.allInputsContainSafeMarkup === true) {
                                labelInnerEl.append(labelText);
                            }
                            else {
                                labelInnerEl.text(labelText);
                            }
                            labelEl.append(labelInnerEl);
                        }

                        if (option.correct !== null && option.correct !== undefined) {
                            validatedInput = true;
                            if (option.correct) {
                                labelEl.addClass("correct-answer measure-status-1");
                                labelEl.prepend("<span class='measure-status-icon'></span>");
                            }
                            else if (!option.correct && option.selected) {
                                labelEl.addClass("incorrect-answer measure-status-3");
                                if (option.selected) {
                                    labelEl.addClass("selected-option");
                                    labelEl.prepend("<span class='measure-status-icon'></span>");
                                }
                            }
                        }

                        if (!this._radioMatrixWidth && option.other !== null && option.other !== undefined) {
                            var otherDom = this._generateOtherTextField(option, input);
                            labelEl.append(otherDom);
                        }

                        if (option.feedback) {
                            dom.append(this._createFeedbackElement(option.feedback));
                            dom.addClass("feedback-present");
                        }
                    }
                }

                if (validatedInput) {
                    dom.addClass("validated-input");
                }

                return dom;
            }.bind(this);

            if (input.options && input.options.serviceUrl) {
                this._getInputOptions(input, this._resetInputOptionDom.bind(this, input, dom), function(options) {
                    // regenerate the options
                    generateInputOptionDom(options);
                    // now rebind the change handler
                    this._bindInputChangeHandler(input, true);
                }.bind(this));

                return dom;
            }
            else {
                return generateInputOptionDom(inputOptions);
            }
        },

        _resetInputOptionDom : function(input, dom) {
            if (input) {
                // unbind any existing change handler
                if (this._inputChangeHandlers && this._inputChangeHandlers[input.name]) {
                    this.disconnect(this._inputChangeHandlers[input.name]);
                    delete this._inputChangeHandlers[input.name];
                }

                // remove the reference to the input nodes
                if (this._inputNodeMap && this._inputNodeMap[input.name]) {
                    delete this._inputNodeMap[input.name];
                }

                // clear out the previous value
                if (this._inputValueMap && this._inputValueMap[input.name]) {
                    this._inputValueMap[input.name] = null;
                }

                // empty the dom for this input and remove all css classes
                if (dom && dom.empty) {
                    dom.empty();
                    dom.removeClass();
                }
            }
        },

        _createInput : function(curr, disabled) {
            if (curr) {
                // force input type to allowed values of email, text, hidden or number
                if (curr.type !== null && curr.type !== undefined && curr.type !== INPUT_TYPE_PASSWORD &&
                    curr.type !== INPUT_TYPE_EMAIL && curr.type !== INPUT_TYPE_TEXT &&
                    curr.type !== INPUT_TYPE_HIDDEN && curr.type !== INPUT_TYPE_NUMBER) {
                    curr.type = null;
                }

                // custom validator can be provided (by specifying pattern and title) or referenced by name
                var currVal = curr[this.valueProp] !== null && curr[this.valueProp] !== undefined
                        ? curr[this.valueProp] : curr.value,
                    maxlength = curr.textMaxLength || this.textMaxLength,
                    dom = $("<input type='" + (curr.type || INPUT_TYPE_TEXT) + "' maxlength='" + Number(maxlength) + "'"
                        + (curr.required ? " required='true'" : "")
                        + (curr.width ? " style='width: " + Number(curr.width) + "px;'" : "")
                        + " " + disabled  + (curr.readonly ? " readonly" : "")
                        + " />");

                dom.attr({ "name" : curr.name , "aria-label": this._getAriaLabel( curr ) });

                if (curr.placeholder) {
                    dom.attr("placeholder", curr.placeholder);
                }
                if (currVal !== null && currVal !== undefined && curr.type !== INPUT_TYPE_PASSWORD) {
                    dom.val(templateUtil.htmlDecode(currVal, "text"));
                }

                // number input types can also specify a min, max and step
                if (curr.type === INPUT_TYPE_NUMBER) {
                    if (curr.min !== null && curr.min !== undefined && !isNaN(curr.min)) {
                        dom.attr("min", Number(curr.min));
                    }
                    if (curr.max !== null && curr.max !== undefined && !isNaN(curr.max)) {
                        dom.attr("max", Number(curr.max));
                    }
                    if(curr.step !== null && curr.step !== undefined ){
                        dom.attr("step", (curr.step === -1 ? "any" : Number(curr.step)));
                    }
                }
                else if (!curr.type || curr.type === INPUT_TYPE_TEXT || curr.type === INPUT_TYPE_PASSWORD) {
                    dom.attr("autocomplete", "off");
                }
                return dom;
            }
            return "";
        },

        _createFeedbackElement : function(feedbackText) {
            return $("<div/>")
                .addClass("option-feedback")
                .text(templateUtil.htmlDecode(feedbackText, "text"));
        },

        _addEmptySelectOption : function(input, options) {
            if (input && options && !input.multiple && (!input.required || (input.required &&
                (input.defaultEmptyOption || this.requiredSelectDefaultEmptyOption)))) {
                var noneOption = {label : ""};
                noneOption[this.valueProp] = "";
                options.unshift(noneOption);
            }
        },

        _updateSelectedOptions : function(value, options) {
            if (options && options.length > 0) {
                // iterate through each fo the values and flag those that need to be pre-selected
                if (value !== null && value !== undefined) {
                    if (!$.isArray(value)) {
                        value = [value];
                    }
                    var valMap = value.reduce(function(map, val) {
                        map[val] = true;
                        return map;
                    }, {}), j = 0, option;
                    for (j; j < options.length; j++) {
                        option = options[j];
                        if (option && valMap[option[this.valueProp]] === true) {
                            option.selected = true;
                        }
                        else {
                            delete option.selected;
                        }
                    }
                }
            }
        },

        _generateOtherTextField : function(option, input) {
            var otherDom = $("<input class='other-input-option inline' type='text' onclick='event.preventDefault();'>");
            otherDom.attr( {"name" : input.name + "-other" , "aria-label" : input.name + "-other" } );
            otherDom.prop("required", true);

            if (String(option.other).toLowerCase() !== "true") {
                otherDom.val(option.other);
            }

            input._hasOther = [input.name + "-other", String(option[this.valueProp])];

            if (!option.selected) {
                otherDom.prop("disabled", true);
            }

            return otherDom;
        },

        _unbindInputChangeHandlers : function() {
            if (this._inputChangeHandlers) {
                var inputName;
                for (inputName in this._inputChangeHandlers) {
                    if (inputName && this._inputChangeHandlers[inputName]) {
                        this.disconnect(this._inputChangeHandlers[inputName]);
                    }
                }
            }
            delete this._inputChangeHandlers;
        },

        _bindInputChangeHandlers : function() {
            this._unbindInputChangeHandlers();
            this._inputChangeHandlers = {};
            var i;
            if (this.inputs && this.inputs.length > 0) {
                for (i = 0; i < this.inputs.length; i++) {
                    this._bindInputChangeHandler(this.inputs[i], true);
                }
            }
        },

        _bindInputChangeHandler : function(input, onInit) {
            if (input && input.name && input.type !== INPUT_TYPE_STATIC) {
                var changeHandler = this._getInputChangeHandler(input);
                if (input._widget) {
                    if (input.canChange) {
                        input._widget.on("change", changeHandler);
                    }
                    // widgets must implement get selected item so we can retrieve the initial value
                    if (onInit && input._widget.getSelectedItem) {
                        changeHandler(input._widget.getSelectedItem(), false, true);
                    }
                }
                else {
                    var inputElement = this._findInputByName(input.name);
                    if (inputElement && inputElement.length > 0) {
                        if (input.canChange) {
                            this._inputChangeHandlers[input.name] = this.connect(inputElement,
                                "change.forminput." + input.name, changeHandler);
                        }
                        if (onInit) {
                            changeHandler({target: inputElement}, false, true);
                        }
                    }
                }
            }
        },

        _getInputChangeHandler : function(input) {
            return function(eventData, userInitiated, onInit) {
                if (!onInit) {
                    this._inputValueChangePreventUnload = true;
                }
                if (eventData && input) {
                    var val,
                        otherValSelected = false;
                    input._otherOptionSelected = false;
                    if (input._widget) {
                        val = eventData && eventData.hasOwnProperty(this.valueProp) ? eventData[this.valueProp] : null;

                        if (input.multiple && eventData.selectedOptions) {
                            var option,
                            selectedOptions = eventData.selectedOptions;
                            for (option in selectedOptions) {
                                if (selectedOptions[option] && selectedOptions[option].other !== null && selectedOptions[option].other !== undefined) {
                                    eventData = selectedOptions[option];
                                    otherValSelected = true;
                                    input._otherOptionSelected = true;
                                    break;
                                }
                            }
                        }

                        if (eventData.other !== null && eventData.other !== undefined) {
                            var otherTextDom;
                            if (input._hasOther) {
                                otherTextDom = this.attachPoints.form.find(".form-input-" + input.name + " .form-input .other-input-option[name='" + input._hasOther[0] + "']");
                            }

                            if (!input._hasOther || (otherTextDom && !otherTextDom.length)) {
                                var dom = this.attachPoints.form.find(".form-input-" + input.name + " .form-input .selection-list-parent-visible"),
                                    otherDom = this._generateOtherTextField(eventData, input);

                                dom.append(otherDom);
                            }

                            if (!otherValSelected) {
                                otherValSelected = String(val) === input._hasOther[1];
                                input._otherOptionSelected = otherValSelected;
                            }
                        }

                        if (input._hasOther) {
                            var otherInputDom = this.attachPoints.form.find(".form-input-" + input.name + " .form-input .other-input-option[name='" + input._hasOther[0] + "']");
                            otherInputDom.prop("disabled", this.disabled || !otherValSelected);

                            if (!otherValSelected) {
                                otherInputDom.css("display", "none");
                            }
                            else {
                                otherInputDom.css("display", "inline-block");
                            }
                        }

                    }
                    else {
                        var target = $(eventData.target);

                        if (input.type === INPUT_TYPE_RADIO) {
                            target = target.closest(":checked");
                        }

                        if (input.type === INPUT_TYPE_CHECKBOX) {
                            if (input.options && (input.options.length > 0 || input.options.serviceUrl)) {
                                val = [];
                                var el, elVal, voidOthers = false;
                                target.closest(".form-input").find(":checked").each(function() {
                                    el = $(this);
                                    elVal = el.val();
                                    // check to see if the selected option should void all other options
                                    voidOthers = String(el.data("void-others")) === "true" ? elVal : false;
                                    val.push(elVal);

                                    if (input._hasOther && !otherValSelected) {
                                        otherValSelected = elVal === input._hasOther[1];
                                        input._otherOptionSelected = otherValSelected;
                                    }
                                });
                                if (val.length === 0) {
                                    val = [-1];
                                }
                                // if the option should void other options, uncheck and disable the other options
                                if (voidOthers !== false) {
                                    target.closest(".form-input").find("input[value!='" + voidOthers + "']")
                                        .prop("checked", false).attr("disabled", true);
                                    // reset the value to only include the voidOtherOptions value
                                    val = [voidOthers];
                                }
                                // otherwise enable all inputs not originally marked as disabled
                                else if (!this.readOnly){
                                    target.closest(".form-input").find("input[data-disabled!='true']").attr("disabled", false);
                                }
                            }
                            else {
                                val = target.is(":checked");

                                if (input._hasOther) {
                                    otherValSelected = val === input._hasOther[1];
                                    input._otherOptionSelected = otherValSelected;
                                }
                            }
                        }
                        else {
                            val = target ? target.val() : null;

                            if (input._hasOther) {
                                otherValSelected = val === input._hasOther[1];
                                input._otherOptionSelected = otherValSelected;
                            }
                        }

                        if (input._hasOther) {
                            var otherInput = target.closest(".form-input").find(".other-input-option[name='" + input._hasOther[0] + "']");
                            otherInput.prop("disabled", this.disabled || !otherValSelected);
                        }
                    }
                    this._inputValueMap[input.name] = val;

                    // only validate for subsequent change events
                    if (!onInit) {
                        var ignore = false;
                        if (this._ignoreNextInputChange && this._ignoreNextInputChange[input.name]) {
                            delete this._ignoreNextInputChange[input.name];
                            ignore = true;
                        }
                        if (!ignore && this._validateInputValue(input, val)) {
                            // only dispatch an input change event when it is valid
                            this.dispatchEvent("inputChange", {
                                name : input.name,
                                value : val
                            }, true);

                            this.dispatchEvent("formChange", $.extend({changedInputName : input.name}, this._inputValueMap), true);
                        }
                    }

                    // see if this input is a target of skip logic and if so evaluate any effects
                    if (input.name && this._inputSkipTargetMap[input.name]) {
                        this._validateSkipLogic(input.name);
                    }

                    // check to see if this input value drives any lazy-loaded input options
                    if (this._inputValueMap[input.name] !== null) {
                        this._lazyLoadInputOptions(input.name);
                    }
                }
            }.bind(this);
        },

        _getInputOptions : function(input, setInputOptionsBeforeLoadCallback, setInputOptionsCallback) {
            // determine if the options are provided or need to be retrieved via a datastore
            if (input && input.name && input.options) {
                if (input.options.serviceUrl) {
                    if (!this._inputOptionsDataStoreMap) {
                        this._inputOptionsDataStoreMap = {};
                    }
                    var ds = new DataStore({
                        serviceUrl : input.options.serviceUrl,
                        autoBoundProp : "serviceUrl",
                        resolveEmptyPromiseBeforeLoad : false
                        // TODO may eventually need pageSize support within these controls for larger lists
                    });
                    if (setInputOptionsBeforeLoadCallback) {
                        ds.onBeforeLoad = setInputOptionsBeforeLoadCallback;
                    }
                    ds.addCallback(function(options) {
                        setInputOptionsCallback(options || []);
                    }, function() {
                        setInputOptionsCallback([]);
                    });
                    this._inputOptionsDataStoreMap[input.name] = ds;

                    // return an empty list for now
                    return [];
                }
                else {
                    return input.options;
                }
            }
        },

        _lazyLoadInputOptions : function(changedInputName) {
            if (this._inputOptionsDataStoreMap && !$.isEmptyObject(this._inputOptionsDataStoreMap)) {
                var input, store, boundProps, i, boundProp, dependentStore;

                // before binding properties on this store, we need to determine which values in the input value map
                // should be voided since they will change too based on the dependency tree. TODO needs to be recursive
                for (input in this._inputOptionsDataStoreMap) {
                    if (input !== changedInputName && this._inputOptionsDataStoreMap[input]) {
                        store = this._inputOptionsDataStoreMap[input];
                        if (store && store.hasBoundProperty(changedInputName)) {
                            boundProps = store.getBoundProperties();
                            if (boundProps && boundProps.length > 0) {
                                for (i = 0; i < boundProps.length; i++) {
                                    boundProp = boundProps[i];
                                    if (boundProp && boundProp !== changedInputName && this._inputOptionsDataStoreMap[boundProp]) {
                                        dependentStore = this._inputOptionsDataStoreMap[boundProp];
                                        if (dependentStore && dependentStore.hasBoundProperty(changedInputName)) {
                                            // clear the value of the input that is about to change
                                            this._inputValueMap[boundProp] = null;
                                            // call on before load on the store to reset the value now
                                            store.onBeforeLoad();
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                // now actually bind the properties on each of the stores if the store has the changed input as a bound property
                for (input in this._inputOptionsDataStoreMap) {
                    if (input !== changedInputName && this._inputOptionsDataStoreMap[input]) {
                        store = this._inputOptionsDataStoreMap[input];
                        if (store && store.hasBoundProperty(changedInputName)) {
                            store.bindProperties(this._inputValueMap, "serviceUrl", false, null, null, true);
                        }
                    }
                }
            }
        },

        _resetStaticInputValue : function(staticInputEl) {
            if (staticInputEl && staticInputEl.empty) {
                staticInputEl.empty();
            }
        },

        _setStaticInputValue : function(input, staticInputEl, val) {
            if (input && staticInputEl) {
                // if a target is provided, create an inner anchor element for it instead of adding the text
                if (input.target) {
                    staticInputEl.empty().append($("<a target='_blank' rel='noopener'/>")
                        .attr("href", templateUtil.htmlDecode(input.target, "text"))
                        .text(templateUtil.htmlDecode(val || "", "text")));
                }
                // enable html entities must be specified on each input for static inputs to append the data to the dom
                else if (String(input.enableHTMLEntities).toLowerCase() === "true") {
                    staticInputEl.empty().append(templateUtil.replaceMarkdownPattern(val || ""));
                }
                else {
                    staticInputEl.text(templateUtil.htmlDecode(val || "", "text"));
                }
            }
        },

        _resetSelectInput : function(input) {
            // clear out the previous value
            if (this._inputValueMap && this._inputValueMap[input.name]) {
                this._inputValueMap[input.name] = null;
            }

            if (input._widget && input._widget.updateData) {
                input._widget.updateData([]);
            }
        },

        _getSelectInputOptionsCallback : function(input, value) {
            var onInit = true;
            return function(options) {
                this._addEmptySelectOption(input, options);
                if (onInit) {
                    // only apply the value selection with the initial set of options?
                    onInit = false;
                    this._updateSelectedOptions(value, options);
                }
                if (input._widget && input._widget.updateData) {
                    if (options && options.length > 0) {
                        // prevent validation from running when the new options list is set
                        if (!this._ignoreNextInputChange) {
                            this._ignoreNextInputChange = {};
                        }
                        this._ignoreNextInputChange[input.name] = true;
                    }
                    input._widget.updateData(options);
                }
            }.bind(this);
        },

        _getInputValidator : function(input) {
            return input && input.validator && (input.validator.pattern || input.validator.matchesInput)
                ? input.validator : VALIDATORS[input.validator] || null;
        },

        _processSkipLogic : function(input) {
            // TODO add support for question groups/sections that can be skipped as a group
            // TODO need to add support for OR logic

            var skipCriteria = formUtil.extractQueryParams(input.skip),
                criteriaInputMap = {};
            skipCriteria.forEach(function(criteria) {
                if (criteria && criteria.key) {
                    if (!this._inputSkipTargetMap[criteria.key]) {
                        this._inputSkipTargetMap[criteria.key] = {};
                    }
                    if(this._inputMap[criteria.key] && this._inputMap[criteria.key].type === INPUT_TYPE_NUMBER){
                        criteria["num"] = true;
                    }
                    if (!criteriaInputMap[input.name]) {
                        criteriaInputMap[input.name] = [criteria];
                    }
                    else {
                        criteriaInputMap[input.name].push(criteria);
                    }
                    this._inputSkipTargetMap[criteria.key][input.name] = criteriaInputMap[input.name];
                }
            }.bind(this));
        },

        _validateSkipLogic : function(targetKey) {
            // this is called after an input has changed to see if it causes other inputs to be skipped:
            var skipCriteriaMap = this._inputSkipTargetMap[targetKey];
            if (skipCriteriaMap) {
                var key, skip, skipCriteria, filteredSkipCriteria, curr, input, inputRow, inputWidget, i, j, currSkipCriteria;
                for (i = 0; i < this.inputs.length; i++) {
                    curr = this.inputs[i];
                    key = curr ? curr.name : null;
                    if (key && skipCriteriaMap[key]) {
                        skipCriteria = skipCriteriaMap[key];

                        // if we are ignoring skipped inputs, filter out those which are already in the skipped map
                        if (this.skipLogicIgnoreSkippedInputs) {
                            filteredSkipCriteria = [];
                            if (skipCriteria && skipCriteria.length > 0) {
                                for (j = 0; j < skipCriteria.length; j++) {
                                    currSkipCriteria = skipCriteria[j];
                                    if (currSkipCriteria && currSkipCriteria.key && !this._skippedInputMap[currSkipCriteria.key]) {
                                        filteredSkipCriteria.push(currSkipCriteria);
                                    }
                                }
                            }
                        }
                        else {
                            filteredSkipCriteria = skipCriteria;
                        }
                        skip = filteredSkipCriteria && filteredSkipCriteria.length > 0 &&
                            formUtil.doesDataMatchQueryParams(this._inputValueMap, filteredSkipCriteria);
                        if (skip) {
                            if (!this._skippedInputMap[key]) {
                                this._updateSkippedSections(curr, -1);
                            }
                            this._skippedInputMap[key] = true;
                            if (this.skipLogicIgnoreSkippedInputs) {
                                this._validateSkipLogic(key);
                            }
                        }
                        else if (this._skippedInputMap[key]) {
                            delete this._skippedInputMap[key];
                            this._updateSkippedSections(curr, 1);
                            if (this.skipLogicIgnoreSkippedInputs) {
                                this._validateSkipLogic(key);
                            }
                        }
                        input = this._findInputByName(key);
                        inputRow = input ? input.closest(".form-input-row.form-input-" + key) : null;
                        if (inputRow) {
                            var disabled = this.readOnly ? true : skip;
                            inputWidget = this._inputMap[key] ? this._inputMap[key]._widget : null;
                            if (!this.disabled) {
                                if (inputWidget && inputWidget.setDisabled) {
                                    inputWidget.setDisabled(disabled);
                                }
                                else if (!input.data("disabled")) {
                                    input.prop("disabled", disabled);
                                }
                            }

                            if (skip) {
                                inputRow.addClass(this.skipClass);
                            }
                            else {
                                inputRow.removeClass(this.skipClass);
                            }
                        }
                    }
                }
                this._updateSkippedRepeatingGroups();
            }
        },

        _updateSkippedRepeatingGroups : function() {
            // determine if all the inputs within a repeating group need to be skipped and if so skip/hide the entire group
            if (this._repeatGroupsMap && !$.isEmptyObject(this._repeatGroupsMap) && this._skippedInputMap) {
                var groupName, group, i, input, isAllGroupInputsSkipped;
                for (groupName in this._repeatGroupsMap) {
                    if (groupName && this._repeatGroupsMap[groupName]) {
                        group = this._repeatGroupsMap[groupName];
                        if (group.dom && group.inputs && group.inputs.length > 0) {
                            isAllGroupInputsSkipped = true;
                            for (i = 0; i < group.inputs.length; i++) {
                                input = group.inputs[i];
                                if (input && input.name && !this._skippedInputMap[input.name]) {
                                    isAllGroupInputsSkipped = false;
                                    break;
                                }
                            }
                            // toggle the skip class to the repeated group
                            $(group.dom).parent(".form-repeat-group").toggleClass("form-group-skip", isAllGroupInputsSkipped);
                        }
                    }
                }
            }
        },

        _updateSkippedSections : function (curr, direction) {
            if (curr._section !== null && typeof curr._section !== "undefined" &&
                this._sectionCountMap !== null && typeof this._sectionCountMap !== "undefined") {

                this._sectionCountMap[curr._section] += direction;

                //update the progress bar if a section has been added or removed
                if ((direction > 0 && this._sectionCountMap[curr._section] === 1) ||
                    (direction < 0 && this._sectionCountMap[curr._section] < 1)) {
                    var sectionLength = this.setProgressBarPercentage();
                    this.updateNavButtonVisibility(sectionLength);
                }
            }
        },

        _validateInputValue : function(input, val) {
            var valid = false,
                validationMessage = "",
                inputRow = this._findInputRowByName(input.name),
                validator = this._getInputValidator(input);

            if (inputRow) {
                // ignore skipped and static inputs
                if (this._skippedInputMap[input.name] || input.type === INPUT_TYPE_STATIC) {
                    valid = true;
                }
                else {
                    if (!validationMessage && input.required && (val === null || val === undefined || val === "" ||
                        ((input.multiple === true || input.multiple > 0) && String(val) === "-1"))) {
                        validationMessage = this.requiredMessage;
                    }
                    var inputEl = this._findInputByName(input.name);
                    // check to see if the input has a ValidityState and if so whether or not is is invalid
                    if (this.disableHTML5Validation !== true && inputEl && inputEl.length === 1 &&
                        inputEl[0].validity && inputEl[0].validity.valid === false) {
                        validationMessage = this.validationMessageDefault;
                    }
                    // skip the validation if the input is not required and has an empty value
                    if (!validationMessage && validator && !(!input.required && val === "")) {
                        var testVal = $.isArray(val) ? val.toString() : val;
                        // test pattern matching
                        if (validator.pattern) {
                            var regex = new RegExp(validator.pattern);
                            if (!(testVal !== null && typeof testVal !== "undefined" && regex.test(testVal))) {
                                validationMessage = validator.title || this.validationMessageDefault;
                            }
                        }
                        // test to see if this input's value should match another inputs
                        if (validator.matchesInput && typeof this._inputValueMap[validator.matchesInput] !== "undefined") {
                            var matchesInputValue = this._inputValueMap[validator.matchesInput];
                            if ($.isArray(matchesInputValue)) {
                                matchesInputValue = matchesInputValue.toString();
                            }
                            if (testVal !== matchesInputValue) {
                                validationMessage = validator.title || this.validationMessageDefault;
                            }
                        }
                    }
                    if (!validationMessage && input.type === INPUT_TYPE_NUMBER) {
                        if (isNaN(val)) {
                            validationMessage = "Please enter a valid number";
                        }
                        else {
                            val = Number(val);
                            if (input.min !== null && input.min !== undefined && val < input.min) {
                                validationMessage = "Please enter a value greater than or equal to " + input.min;
                            }
                            else if (input.max !== null && input.max !== undefined && val > input.max) {
                                validationMessage = "Please enter a value less than or equal to " + input.max;
                            }
                            else {
                                valid = true;
                            }
                        }
                    }
                    if (!validationMessage) {
                        valid = true;
                    }
                }

                // update the validation message and error class
                if (this.perInputValidationMessages) {
                    inputRow.attr("data-validation-msg", validationMessage);
                }
                if (valid) {
                    inputRow.removeClass(this.errorClass);
                }
                else {
                    inputRow.addClass(this.errorClass);
                }
            }

            return valid;
        },

        _handleFormIncompleteSubmit : function(evt) {
            evt.preventDefault();
            evt.stopPropagation();

            var dataMap = this._getFormDataMap();
            dataMap[this.incompleteSubmitProp] = true;
            this.dispatchEvent("change", dataMap, true);
            this.dispatchEvent("incompleteSubmit", dataMap, true);
        },

        _handleFormSubmit : function(evt) {
            if (this._doSubmitRedirect) {
                return true;
            }
            evt.preventDefault();
            evt.stopPropagation();
            this.submit();
        },

        setInputValue : function(inputName, newValue, createIfNew) {
            if (inputName) {
                if (this._inputMap[inputName]) {
                    if (this.setInputValuePreventAbandon) {
                        this._inputValueChangePreventUnload = true;
                    }
                    if (this._inputMap[inputName]._widget && this._inputMap[inputName]._widget.setValue) {
                        this._inputMap[inputName]._widget.setValue(newValue);
                    }
                    else if (this._inputMap[inputName].type && this._inputMap[inputName].type.toLowerCase() === INPUT_TYPE_STATIC) {
                        var domElement = this.domNode.find(".form-input-" + inputName + " .form-input-static");

                        if (domElement) {
                            if (String(this._inputMap[inputName].enableHTMLEntities).toLowerCase() === "true") {
                                domElement.append(templateUtil.replaceMarkdownPattern(newValue));
                            }
                            else {
                                domElement.text(templateUtil.htmlDecode(newValue, "text"));
                            }

                            this._inputMap[inputName].value = newValue;
                        }
                    }

                    else {
                        this._findInputByName(inputName).val(templateUtil.htmlDecode(newValue, "text"));
                    }
                }
                else if (createIfNew === true || createIfNew === INPUT_TYPE_STATIC || createIfNew === INPUT_TYPE_TEXT ||
                    createIfNew === INPUT_TYPE_EMAIL || createIfNew === INPUT_TYPE_NUMBER ||
                    createIfNew === INPUT_TYPE_SELECT || createIfNew === INPUT_TYPE_TEXTAREA ||
                    createIfNew === INPUT_TYPE_CHECKBOX || createIfNew === INPUT_TYPE_RADIO ||
                    createIfNew === INPUT_TYPE_HIDDEN || createIfNew === INPUT_TYPE_DATETIME ||
                    createIfNew === INPUT_TYPE_SECTION || createIfNew === INPUT_TYPE_PASSWORD) {

                    if (this.setInputValuePreventAbandon) {
                        this._inputValueChangePreventUnload = true;
                    }
                    var newInput = {
                        type : createIfNew === true ? INPUT_TYPE_HIDDEN : createIfNew,
                        name : inputName
                    };
                    newInput[this.valueProp] = newValue;
                    this.addInput(newInput);
                }
            }
        },

        addInput : function(newInput) {
            if (newInput && newInput.name) {
                this.inputs.push(newInput);
                this._inputMap[newInput.name] = newInput;
                if (this.attachPoints && this.attachPoints.form) {
                    this.attachPoints.form.append(this._createInput(newInput));
                }
            }
        },

        setValues : function(dataValueMap, createIfNew) {
            this._dataValueMap = dataValueMap || {};
            if (this.attachPoints && this.attachPoints.form && (createIfNew || (this.inputs && this.inputs.length > 0))) {
                this.reset(true);
                var key, val;
                for (key in this._dataValueMap) {
                    if (key && this._dataValueMap[key] !== undefined && this._dataValueMap[key] !== null) {
                        val = this._dataValueMap[key];
                        this.setInputValue(key, val, createIfNew);
                    }
                }
                this._bindInputChangeHandlers();
            }
        },

        _findInputRowByName : function(name) {
            if (this._inputRowNodeMap[name] && this._inputRowNodeMap[name].length > 0) {
                return this._inputRowNodeMap[name];
            }
            this._inputRowNodeMap[name] = this.attachPoints.form.find(".form-input-row.form-input-" + name);
            return this._inputRowNodeMap[name];
        },

        _findInputByName : function(name) {
            if (this._inputNodeMap[name] && this._inputNodeMap[name].length > 0) {
                return this._inputNodeMap[name];
            }
            this._inputNodeMap[name] = this.attachPoints.form.find("[name='" + name + "']");
            return this._inputNodeMap[name];
        },

        submit : function() {
            var dataMap = this.checkIfFormValid(0, this.inputs && this.inputs.length > 0 ? this.inputs.length - 1 : 0);
            if (dataMap) {
                if (this._validationNotification && this._validationNotification.hide) {
                    this._validationNotification.hide();
                    delete this._validationNotification;
                }

                // if this form is doing a direct post to another url, submit the form now and we're out
                if (this.submitRedirectUrl && this.attachPoints && this.attachPoints.form) {
                    this._doSubmitRedirect = true;
                    this.attachPoints.form.attr("onsubmit", "");
                    this.attachPoints.form.submit();
                    if (this.submitRedirectTarget !== "_blank") {
                        return;
                    }
                    this._doSubmitRedirect = false;
                }

                if (this.resetOnSubmit) {
                    this.reset();
                }
                // if the data store retrieves form data from a service url and there is a source widget defined,
                // after submitting the form we need to reset the data sourceWidget property on the datastore
                // since that source widget will fire another event once its data changes
                if (this.dataStore && !this.dataStore.writeOnly && this.sourceWidget) {
                    this.dataStore.unbindProperty(this.sourceWidget);
                }
                this.dispatchedDataMap = dataMap;
                this.dispatchEvent("change", dataMap, true);
                this.dispatchEvent("submit", dataMap, true);
            }
        },
        
        checkIfFormValid : function (startIndex, endIndex)  {
            if (this._submitButton) {
                this._submitButton.blur();
            }
            if (this.attachPoints && this.attachPoints.form) {
                var formValid = true, firstInvalidInput = false,
                    disabledElements = this.includeDisabledInputs ? this._removeAllDisabledAttr() : null,
                    dataMap = this._getFormDataMap();

                // need to iterate over all multiple select elements and ensure a value is provided for each
                if (this.inputs && this.inputs.length > 0 && endIndex < this.inputs.length) {
                    var i = startIndex, curr;
                    for (i; i <= endIndex; i++) {
                        curr = this.inputs[i];
                        if ((!curr.repeatingGroup && !this._validateInputValue(curr, dataMap[curr.name])) ||
                            (curr.repeatingGroup &&
                                !this._validateInputValue(curr, this._getRepeatingGroupInputByName(curr, dataMap)))) {

                            formValid = false;
                            if (!firstInvalidInput) {
                                firstInvalidInput = this._findInputByName(curr.name);
                            }
                        }
                    }
                }

                if (disabledElements) {
                    disabledElements.attr('disabled', 'disabled');
                }
                if (formValid) {
                    return dataMap;
                }
                else {
                    if (this.invalidLabel) {
                        var view = this.getView();
                        if (view) {
                            this._validationNotification = view.showNotification(this.invalidLabel, "error", false, this._key);
                        }
                        else {
                            alert(this.invalidLabel);
                        }
                    }
                    else if (firstInvalidInput && firstInvalidInput.length > 0 && this.perInputValidationMessages) {
                        $('html, body').scrollTop(firstInvalidInput.offset().top - 75);
                    }
                }
            }
            return false;
        },

        _getRepeatingGroupInputByName : function(input, dataMap) {
            if (input && input.name && input.repeatingGroup && dataMap && dataMap[input.repeatingGroup]) {
                var inputGroupIndex = input._duplicateIndex || 0;
                if (dataMap[input.repeatingGroup].length > inputGroupIndex) {
                    var inputGroupData = dataMap[input.repeatingGroup][inputGroupIndex],
                        origInputName = input._duplicateOf || input.name;
                    if (inputGroupData && inputGroupData[origInputName] !== undefined) {
                        return inputGroupData[origInputName];
                    }
                }
            }
            return null;
        },

        reset : function(skipRebindChangeHandlers) {
            if (this.attachPoints && this.attachPoints.form && this.attachPoints.form.length > 0 && this.attachPoints.form[0]) {
                if (this._duplicatedInputs && this._duplicatedInputs.length) {
                    // remove all duplicated inputs from the form on reset
                    var i, curr;
                    for (i = 0; i < this._duplicatedInputs.length; i++) {
                        curr = this._duplicatedInputs[i];
                        //make sure the widgets are safely removed
                        if (curr._widget) {
                            curr._widget.remove();
                        }

                        //reset the duplicated widget count
                        if (this._repeatGroupsMap[curr.repeatingGroup]) {
                            this._repeatGroupsMap[curr.repeatingGroup].count = 1;
                        }

                        delete this._inputMap[curr.name];
                    }

                    // remove from inputs array
                    this.inputs.splice(this.inputs.length - this._duplicatedInputs.length, this.inputs.length);
                    // remove from dom
                    this.attachPoints.form.find(".form-group-inner.duplicate-input").remove();

                    this._duplicatedInputs = [];
                    delete this._duplicatedInputs;
                }
                this.attachPoints.form[0].reset();
                this.attachPoints.form.find(".form-input-row").removeClass(this.errorClass);
            }
            var formWidgets = this.getWidgets();
            if (formWidgets && formWidgets.length > 0) {
                formWidgets.forEach(function(formWidget) {
                    if (formWidget && formWidget.reset) {
                        formWidget.reset();
                    }
                });
            }
            if (skipRebindChangeHandlers !== true) {
                this._inputValueChangePreventUnload = false;
                this._bindInputChangeHandlers();
            }
        },

        getSelectedItem : function() {
            return this.dispatchedDataMap;
        },

        getTemplateData : function() {
            var baseClass = this.sectionWizardStyle ? this.baseClass + " section-wizard-style" : this.baseClass;
            return {
                baseClass : baseClass,
                parentBaseClass : this.baseClass === "" ? "" : this.parentBaseClass,
                numbered : String(this.numbered).toLowerCase() === "true" ? " numbered-form" : "",
                disableHTML5Validation : String(this.disableHTML5Validation).toLowerCase() === "true" ? "novalidate" : ""
            };
        },

        _getFormDataMap : function() {
            if (this.attachPoints && this.attachPoints.form) {
                var data = this.attachPoints.form.serializeArray(),
                    formDataMap = data.reduce(function(dataMap, curr) {
                    if (curr && curr.name && (!this._skippedInputMap || !this._skippedInputMap[curr.name])) {
                        if (this._inputMap && this._inputMap[curr.name] && this._inputMap[curr.name].multiple) {
                            if (!dataMap[curr.name]) {
                                dataMap[curr.name] = [];
                            }
                            dataMap[curr.name].push(curr.value);
                        }
                        else {
                            dataMap[curr.name] = curr.value;
                        }
                    }
                    return dataMap;
                }.bind(this), {});

                // now iterate the inputs to see if any are missing from the map - except for checkboxes
                if (this._inputMap) {
                    var inputName, input, repeatingGroupInputIndex;
                    for (inputName in this._inputMap) {
                        input = this._inputMap[inputName];
                        if (inputName && input && formDataMap[inputName] === undefined
                            && input.type !== INPUT_TYPE_CHECKBOX
                            && this._inputValueMap && this._inputValueMap[inputName] !== undefined) {
                            formDataMap[inputName] = this._inputValueMap[inputName];
                        }

                        if (input._hasOther && !input._otherOptionSelected) {
                            delete formDataMap[input._hasOther[0]];
                        }
                        if (input.repeatingGroup) {
                            // if the input is part of a group, move the value into a group map then delete it from the
                            // current value map
                            var groupName = input.repeatingGroup;
                            if (!formDataMap[groupName]) {
                                formDataMap[groupName] = [];
                            }
                            repeatingGroupInputIndex = input._duplicateIndex || 0;
                            while (formDataMap[groupName].length < repeatingGroupInputIndex + 1) {
                                formDataMap[groupName].push({});
                            }
                            formDataMap[groupName][repeatingGroupInputIndex][input._duplicateOf || inputName] = formDataMap[inputName];
                            delete formDataMap[inputName];
                        }
                    }
                }
                return formDataMap;

            }
            return {};
        },

        _removeAllDisabledAttr: function () {
            return this.attachPoints.form.find('.form-input-row :disabled').removeAttr('disabled');
        }

    });
});