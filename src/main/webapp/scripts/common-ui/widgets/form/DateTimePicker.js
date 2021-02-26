define([
    "jquery",
    "bootstrap",
    "moment",
    "bootstrap-datetimepicker",
    "common-ui/widgets/_TemplatedWidget",
    "text!common-ui/widgets/form/templates/DateTimePicker.html",
    "common-ui/widgets/utils/stringUtil"
], function ($, bstrap, moment, datetimepicker, _TemplatedWidget, template, stringUtil) {

    "use strict";

    return _TemplatedWidget.extend({

        // DateTimePicker
        //      @see http://eonasdan.github.io/bootstrap-datetimepicker/
        //         NOTE dispatched event objects are instances of 'moment' http://momentjs.com
        //          props are time : time in mills, date : JS date object, value : String representation using valueFormat

        template : template,

        width : 120,

        // dateViewMode: String
        //      Accepts: 'decades','years','months','days'. The default view to display when the picker is shown.
        //      Note: To limit the picker to selecting, for instance the year and month, use dateFormat : MM/YYYY
        dateViewMode : 'days',

        // dateFormat: String
        //     Restricts the allowed date formats that can be selected. Options: http://momentjs.com/docs/#/displaying/format/
        //     Note to only allow year/month selection, use 'MM/YYYY'
        dateFormat : 'M/D/YYYY',

        // valueFormat: String
        //      Formats the selected date value into a string specified by the valueFormat. Access using .value prop
        //      See https://momentjs.com/docs/#/displaying/format/. if valueFormat === "", moment().toString() will be used
        valueFormat : 'MM/DD/YYYY',

        // minDate: Boolean|String
        //      false if no min; otherwise provide a min date
        minDate : false,

        // minDate: Boolean|String
        //      false if no min; otherwise provide a max date
        maxDate : false,

        disabled : false,

        disabledDates : false,

        enabledDates : false,

        endOf : null,

        startOf : null,

        // defaultDate: Boolean|String
        //      false if no default; otherwise provide a default date
        defaultDate : false,

        // value: Boolean|String
        //      synonym for defaultDate; will override if specified
        value : null,

        valueProp : "value",

        // noDefault: Boolean
        //      true if there should be no default value specified
        noDefault : false,

        // defaultDateOffsetMillis: Number
        //      a number of milliseconds that will be subtracted from the current time to set the default date.
        //      this can configure the default date as 1 month ago. use negative values to move forward in time.
        //      note this value will be ignored if defaultDate is specified
        defaultDateOffsetMillis : null,

        // useCurrent: Boolean
        //      true if the current date should be used; false otherwise. overridden by defaultDate and defaultDateOffsetMillis
        useCurrent : false,

        label : null,

        ariaLabel : null,

        // focusOnShow: Boolean
        //      Fixes an issue where the keyboard on an Android device would pop up on click of the calendar and make the
        //      calendar flicker then disappear
        focusOnShow : true,

        dispatchInitialChange : true,

        // widgetParent: String
        //      default: "body"; the dome element that the dropdown for the calendar widget should be appended to
        widgetParent : "body",

        onTemplateNodesAttached: function (nodes) {
            if (this.width && this.attachPoints && this.attachPoints.dateTimePicker) {
                this.attachPoints.dateTimePicker.width(this.width);
            }

            if (!this.defaultDate && this[this.valueProp]) {
                this.defaultDate = this[this.valueProp];
            }
            if (!this.defaultDate) {
                if (String(this.useCurrent).toLowerCase() === "true" && this.defaultDateOffsetMillis === null) {
                    this.defaultDateOffsetMillis = 0;
                }
                if (this.defaultDateOffsetMillis !== null && this.defaultDateOffsetMillis !== undefined) {
                    this.defaultDate = this._getAdjustedDateMoment(new Date().getTime() - this.defaultDateOffsetMillis);
                }
                else if (!this.noDefault) {
                    this.defaultDate = this._getAdjustedDateMoment();
                }
            }
            else if (typeof this.defaultDate === "string") {
                this.defaultDate = this._getAdjustedDateMoment(this.defaultDate);
            }

            if (nodes) {
                if (nodes.dateTimePickerInput && this.name) {
                    nodes.dateTimePickerInput.attr("name", this.name);
                }
                if (nodes.dateTimePicker && !this.dateTimePicker) {
                    this.dateTimePicker = nodes.dateTimePicker.datetimepicker({
                        viewMode : this.dateViewMode,
                        format : this.dateFormat,
                        minDate : this.minDate,
                        maxDate : this.maxDate,
                        defaultDate : this.defaultDate,
                        disabledDates : this.disabledDates,
                        enabledDates : this.enabledDates,
                        focusOnShow : this.focusOnShow,
                        useCurrent : false,
                        ignoreReadonly : true,
                        widgetParent: this.widgetParent
                    });

                    if ((this.label !== undefined && this.label !== null) || (this.promptLabel !== undefined || this.promptLabel !== null)) {
                        this.setLabel(this.promptLabel || this.label);
                    }
                    this.connect(this.dateTimePicker, "dp.change", this._handleDateTimeChange.bind(this));
                    this.connect(this.dateTimePicker, "dp.show", this._handleDateTimeShow.bind(this));
                    this.connect(this.dateTimePicker, "dp.hide", this._handleDateTimeHide.bind(this));
                    this.connect(nodes.dateTimePickerInput, "click.time-picker-focus", this._handleDateTimeInputClick.bind(this));

                    if (this.dispatchInitialChange) {
                        this._handleDateTimeChange({date : this.defaultDate}, true);
                    }
                }
            }
        },

        _handleDateTimeShow : function (evt) {
            this.attachPoints.dateTimePickerInput.attr("readonly", true);

            var target = evt.target,
                datepicker = $(this.widgetParent).find('.bootstrap-datetimepicker-widget:last'),
                top, left;
            if (datepicker.hasClass('bottom')) {
                top = $(target).offset().top + $(target).outerHeight();
                left = $(target).offset().left;
                datepicker.css({
                    'top': top + 'px',
                    'bottom': 'auto',
                    'left': left + 'px'
                });
            }
            else if (datepicker.hasClass('top')) {
                top = $(target).offset().top - datepicker.outerHeight();
                left = $(target).offset().left;
                datepicker.css({
                    'top': top + 'px',
                    'bottom': 'auto',
                    'left': left + 'px'
                });
            }
        },

        _handleDateTimeHide : function () {
            this.attachPoints.dateTimePickerInput.attr("readonly", false);
            this.dateTimePicker.data("DateTimePicker").hide();
        },

        _handleDateTimeInputClick : function () {
            this._handleDateTimeHide();
            this.attachPoints.dateTimePickerInput.focus();
        },

        updateData: function (data) {
            if (data) {
                this.data = data;
                if (data.label !== null && data.label !== undefined) {
                    this.setLabel(data.label);
                }
                var opts = {},
                    hasValue = (data.defaultDate !== null && data.defaultDate !== undefined) || (data.value !== null && data.value !== undefined),
                    newValue = hasValue ? this._getAdjustedDateMoment(data.defaultDate || data.value) : null;
                if (data.minDate !== null && data.minDate !== undefined && data.minDate !== this.minDate) {
                    this.minDate = data.minDate;
                    opts.minDate = this._getAdjustedDateMoment(data.minDate);
                }
                if (data.maxDate !== null && data.maxDate !== undefined && data.maxDate !== this.maxDate) {
                    this.maxDate = data.maxDate;
                    opts.maxDate = this._getAdjustedDateMoment(data.maxDate);
                }
                if (this.dateTimePicker) {
                    try {
                        // if the existing value is outside of the range, update val
                        if (this.selectedValue && ((this.minDate && this.selectedValue.isBefore(this.minDate)) ||
                            (this.maxDate && this.selectedValue.isAfter(this.maxDate)))) {
                            opts.defaultDate = newValue || this.selectedValue;
                            opts.date = opts.defaultDate;
                        }
                        if (newValue) {
                            opts.defaultDate = newValue;
                        }
                        this.dateTimePicker.data("DateTimePicker").options(opts);
                        if (newValue) {
                            this.setValue(newValue);
                        }
                    }
                    catch (err) {
                        if (window.console && typeof window.console.error === "function") {
                            console.error("Error updating " + this._key + ": " + err);
                        }
                    }
                }
            }
        },

        reset : function() {
            if (this.defaultDate) {
                this.setDefaultDate(this.defaultDate);
            }
        },

        setDisabled : function(disabled) {
            if (disabled) {
                this.dateTimePicker.data("DateTimePicker").disable();
            }
            else {
                this.dateTimePicker.data("DateTimePicker").enable();
            }
        },

        _handleDateTimeChange : function(evt, init) {
            var newDate = this._adjustDateMoment(evt.date);
            if (!newDate) {
                // restore the previous value if missing
                if (this.selectedValue) {
                    this.setValue(this.selectedValue);
                }
            }
            else if (!this.selectedValue || (this.selectedValue && !this.selectedValue.isSame(newDate))) {
                this.selectedValue = newDate;
                this.dispatchEvent("change", this.getSelectedValue(), !init);
            }
        },

        _getAdjustedDateMoment : function(date) {
            return this._adjustDateMoment(moment(date));
        },

        _adjustDateMoment : function(date) {
            if (date) {
                if (this.endOf) {
                    date = date.endOf(this.endOf);
                }
                if (this.startOf) {
                    date = date.startOf(this.startOf);
                }
            }
            return date;
        },

        getTemplateData : function() {

            return {
                disabled : String(this.disabled).toLowerCase() === "true" ? " disabled=\"true\"" : "",
                ariaLabel : this.getAriaLabel()
            };
        },

        getAriaLabel() {
            //REF -> dateViewMode : ( 'decades','years','months','days' )
            return stringUtil.isValidString(this.ariaLabel) ? this.ariaLabel : (stringUtil.isValidString(this.label) ? this.label  : ("select " + this.dateViewMode.slice(0, -1)) );
        },


        getSelectedItem : function() {
            // implemented for api consistency with other input controls
            return this.getSelectedValue();
        },

        getSelectedValue : function() {
            if (this.selectedValue !== this._lastSelectedValue) {
                this._lastSelectedValue = this.selectedValue;
                // surface date and time (millis) with more user friendly property names
                this._selectedValueData = $.extend({}, this.selectedValue, {
                    date : this.selectedValue._d,
                    time : this.selectedValue._d ? this.selectedValue._d.getTime() : null
                }, true);
                this._selectedValueData[this.valueProp] = this.valueFormat === "" ? this.selectedValue.toString() :
                    (this.selectedValue.format ? this.selectedValue.format(this.valueFormat) : "");
            }
            return this._selectedValueData;
        },

        getValue : function () {
            var selectedValue = this.getSelectedValue();
            return selectedValue ? selectedValue[this.valueProp] : "";
        },

        setPromptLabel : function(label) {
          this.setLabel(label);
        },

        setLabel: function (label) {
            this.label = label || "";

            if (this.label && this.domNode) {
                if (!this.labelNode) {
                    this.labelNode = $("<span class='date-input-prompt'></span>");
                    this.domNode.prepend(this.labelNode);
                }
                this.labelNode.text(this.label + ":");
            }
        },

        setValue : function(value) {
            var isSame = this.selectedValue && this.selectedValue.isSame(value);
            this._updateDateTimePicker("date", value);
            if (isSame) {
                this.dispatchEvent("change", this.getSelectedValue());
            }
            else {
                this.selectedValue = value;
            }
        },

        setDefaultDate : function(defaultDate) {
            if (this.defaultDate !== defaultDate) {
                this.defaultDate = defaultDate;
                this._updateDateTimePicker("date", defaultDate);
            }
        },

        setMinDate: function (minDate) {
            if (this.minDate !== minDate) {
                this.minDate = minDate;
                this._updateDateTimePicker("minDate", minDate);
            }
        },

        setMaxDate: function (maxDate) {
            if (this.maxDate !== maxDate) {
                this.maxDate = maxDate;
                this._updateDateTimePicker("maxDate", maxDate);
            }
        },

        _updateDateTimePicker : function(prop, value) {
            if (this.dateTimePicker && prop) {
                try {
                    this.dateTimePicker.data("DateTimePicker")[prop](this._getAdjustedDateMoment(value));
                }
                catch (err) {
                    // TODO
                }
            }
        }
    });
});