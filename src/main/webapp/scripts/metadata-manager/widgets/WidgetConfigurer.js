define([
    "jquery",
    "moment",
    "common-ui/widgets/_TemplatedWidget",
    "common-ui/widgets/_EventDispatcher",
    "common-ui/widgets/_Widget",
    "common-ui/widgets/container/_ViewContainer",
    "common-ui/widgets/grid/_MetadataDrivenGrid",
    "common-ui/widgets/charting/_D3Chart",
    "common-ui/widgets/Select",
    "common-ui/widgets/ToggleBar",
    "common-ui/widgets/grid/GridTable",
    "common-ui/widgets/form/Form",
    "common-ui/widgets/utils/formatter",
    "common-ui/widgets/utils/metadataUtil",
    "common-ui/widgets/utils/notificationUtil",
    "text!metadata-manager/models/fixtures/widgetEvents.json",
    "text!metadata-manager/models/fixtures/widgetConfigurations.json",
    "text!metadata-manager/widgets/templates/WidgetConfigurer.html"
], function($, moment, _TemplatedWidget, _EventDispatcher, _Widget, _ViewContainer,
            _MetadataDrivenGrid, _D3Chart, Select, ToggleBar, GridTable, Form,
            formatter, metadataUtil, notificationUtil, widgetEventsJson, widgetConfigurationsJson, template) {

    "use strict";

    var sortCompareByName = function(a, b) {
            var aName = a.name.toLowerCase(),
                bName = b.name.toLowerCase();
            if (aName < bName) {
                return -1;
            }
            else if (aName > bName) {
                return 1;
            }
            return 0;
        },
        sortCompareInheritedName = function(a, b) {
            if (a === b) {
                return 0;
            }
            if (!a.inherited && b.inherited) {
                return -1;
            }
            else if (a.inherited && !b.inherited) {
                return 1;
            }
            else {
                return sortCompareByName(a, b);
            }
        },
        INHERITED_WIDGET_TYPES = {
            _MetadataDrivenGrid : _MetadataDrivenGrid,
            _TemplatedWidget : _TemplatedWidget,
            _Widget : _Widget,
            _ViewContainer : _ViewContainer,
            _D3Chart : _D3Chart
        },
        EXCLUDED_WIDGET_TYPES = {
            ChartLegend : true,
            D3BarChart : true,
            D3BubbleChart : true,
            D3HorizontalBarChart : true,
            D3LineChart : true,
            D3MeasureTrendChart : true,
            D3ScatterPlot : true,
            D3SparkLineChart : true,
            DataSet : true,
            DomainItemOverview : true,
            InteractiveLegend : true,
            Legend : true,
            NotificationItem : true,
            PieChart : true,
            SelectionList : true,
            SummaryBar : true,
            TileGrid : true,
            TimeSlider : true,
            Tooltip : true,
            WidgetConfigurer : true,
            WizardContainer : true
        },
        ALL_WIDGETS = $.extend(metadataUtil.getWidgetConstructors(), INHERITED_WIDGET_TYPES),
        WIDGET_EVENTS,
        WIDGET_CONFIGURATIONS,
        EXCLUDED_WIDGET_FUNCTIONS = {
            additionalClickEvents : true,
            addGridFilterButton : true,
            addIconClass : true,
            addImageOnDot : true,
            addInput : true,
            addPointDot : true,
            addPrecision : true,
            addShowHideFiltersButton : true,
            addWidget : true,
            addWidgetToControls : true,
            adjustMinAndMax : true,
            append : true,
            appendLabels : true,
            appendTo : true,
            bindableProperties : true,
            bindTooltipEvents : true,
            calcChartHeight : true,
            calcMarginLeft : true,
            calcMinOrMax : true,
            calcTooltipValues : true,
            calculateRadiusScale : true,
            calcXAxisDomain : true,
            canLoadData : true,
            canUnload : true,
            changeView : true,
            checkDuplicateAxisTicks : true,
            checkIfFormValid : true,
            collide : true,
            connect : true,
            convertDashArrayToBackgroundGradient : true,
            createChart : true,
            createControls : true,
            createSVG : true,
            createTooltip : true,
            deselect : true,
            deselectSlice : true,
            detach : true,
            disconnect : true,
            dispatchEvent : true,
            doSetSelectedWidget : true,
            drawChartLine : true,
            drawPolarAreaOuter : true,
            extractChartData : true,
            extractRowData : true,
            findFollowing : true,
            findNeighborArc : true,
            findPreceding : true,
            generateCellDom : true,
            generateHeaderDom : true,
            generateRowDom : true,
            getAnimationDelay : true,
            getAnimationDuration : true,
            getChartHeight : true,
            getChartWidth : true,
            getColor : true,
            getDomNode : true,
            getHeight : true,
            getHTML : true,
            getMargin : true,
            getMax : true,
            getMin : true,
            getPropertyValue : true,
            getSeriesDasharray : true,
            getSeriesStroke : true,
            getSeriesWithPointDots : true,
            getSeriesYValue : true,
            getTemplate : true,
            getTemplateData : true,
            getTrendData : true,
            getViewContainer : true,
            getWidget : true,
            getWidgets : true,
            getWidth : true,
            gravity : true,
            hasWidget : true,
            highlightSelected : true,
            highlightSelectedSlice : true,
            init : true,
            initializeData : true,
            isAFilterValue : true,
            isHidden : true,
            isIE : true,
            isSingleWidgetVisible : true,
            key : true,
            lastChild : true,
            mapExclusions : true,
            off : true,
            on : true,
            options : true,
            place : true,
            prepend : true,
            reAttach : true,
            recalcChartWidth : true,
            recalcMouseLayer : true,
            redrawChart : true,
            remove : true,
            removeAxisTicks : true,
            removeWidget : true,
            renderAxisColorLegend : true,
            renderGridRow : true,
            renderGridRowCell : true,
            renderHeader : true,
            renderLegend : true,
            renderOverview : true,
            reset : true,
            resetWidthOfYAxis : true,
            resize : true,
            resizeChart : true,
            rotateLabels : true,
            setBulletSegmentsMarkup : true,
            setLoading : true,
            setMargin : true,
            setMax : true,
            setMin : true,
            setMinandMax : true,
            setSelectedWidget : true,
            setThresholdsMarkup : true,
            setTickMarkup : true,
            shouldExcludeSeries : true,
            silenceNextEventOfType : true,
            sortCompareColumnDataValues : true,
            starMarkup : true,
            styleLine : true,
            tick : true,
            tickFormatFunction : true,
            toggleElementVisible : true,
            updateBars : true,
            updateChartData : true,
            updateDataVisibility : true,
            updateDots : true,
            updateLines : true,
            updateRadiusScale : true,
            updateTemplate : true,
            updateXAxis : true,
            updateYAxis : true,
            updateYAxisLabels : true,
            widgets : true
        },
        EXCLUDED_WIDGET_PROPERTIES = {
            affix : true,
            antiqueBrowserMaxRowRenderBatch : true,
            append : true,
            attachPointLoaded : true,
            attachPointLoading : true,
            attachPoints : true,
            autoPlace : true,
            bulletSegmentsMarkup : true,
            changeDispatchingColumnWidgets : true,
            chartConstructors : true,
            clickable : true,
            clickableStopsPropagation : true,
            collapsed : true,
            collapsedHeight : true,
            collapsible : true,
            container : true,
            data : true,
            dataMap : true,
            dateFormatString : true,
            delayRenderingColumnWidgets : true,
            delayRenderingDuration : true,
            delayRenderingOffsetPixels : true,
            domNode : true,
            filters : true,
            gridData : true,
            hasWidgetContainer : true,
            hiddenMaxRenderRows : true,
            html : true,
            inputs : true,
            mobileBreakpoint : true,
            nullValueAsc : true,
            nullValueDesc : true,
            pdfLayoutLandscapeAll : true,
            placeAsync : true,
            polarArea : true,
            prepend : true,
            printLayoutBatchDelay : true,
            printLayoutMaxRenderBatch : true,
            printOffscreenRendering : true,
            template : true,
            templateValuesSafeToDecode : true,
            thresholdsMarkup : true,
            tickMarkup : true,
            widget : true,
            widgets : true,
            widgetRegistryIndex : true,
            widthOfFirstXAxisLabel : true
        };

    try {
        WIDGET_EVENTS = JSON.parse(widgetEventsJson) || [];
    }
    catch (ex) {
        WIDGET_EVENTS = [];
    }
    try {
        WIDGET_CONFIGURATIONS = JSON.parse(widgetConfigurationsJson) || [];
    }
    catch (exc) {
        WIDGET_CONFIGURATIONS = [];
    }

    return _TemplatedWidget.extend({

        // WidgetConfigurer
        //      a mechanism for previewing widget properties and configuring it - NOT FOR PRODUCTION USE
        //      this should only be used for the metadata manager or documentation site

        template : template,
        widgetDescription : "",
        continueLabel : "Continue",
        fixtureUrlBasePath : "metadata-manager/models/fixtures/widgetData/",

        init : function() {
            this._super.apply(this, arguments);
            if (this.data && this.data.widgetType) {
                this.setWidgetType(this.data.widgetType);
            }
        },

        onTemplateNodesAttached : function() {
            if (this.attachPoints) {
                this._createToggleBar();
                if (this.widgetType) {
                    this.setWidgetType(this.widgetType);
                }
                if (this.attachPoints.continueButton) {
                    this.connect(this.attachPoints.continueButton, "click.continue", this._handleContinueClick.bind(this));
                }
                if (this.attachPoints && this.attachPoints.widgetDataConfig) {
                    this.connect(this.attachPoints.widgetDataConfig, "change.widgetData", this._handleUpdateWidgetConfigClick.bind(this));
                }
            }
        },

        _handleContinueClick : function() {
            this.dispatchEvent("change", {
                id : this.widgetType,
                widgetProperties : this._currentWidgetProps || {},
                widgetData : this._currentWidgetData || {},
                sampleWidgetData : this._sampleWidgetData || null
            }, true);
        },

        _handleUpdateWidgetConfigClick : function() {
            if (this.attachPoints && this.attachPoints.widgetDataConfig) {
                var newData = this.attachPoints.widgetDataConfig.val(),
                    newDataJson;
                try {
                    newDataJson = JSON.parse(newData);
                }
                catch (err) {
                    this.attachPoints.widgetDataConfig.addClass("error");
                    notificationUtil.showWidgetNotification({
                        message : "Invalid JSON: " + err,
                        type : "error",
                        closeable : true
                    }, this._key);
                    return;
                }
                notificationUtil.hideWidgetNotification(this._key);
                this.attachPoints.widgetDataConfig.removeClass("error");
                this._handleLoadWidgetConfigData(newDataJson);
            }
        },

        setWidgetType : function(widgetType, skipUpdateSelect) {
            if (this.widgetType !== widgetType) {
                this.widgetType = widgetType;
                this._widgetTypeConfig = this._getWidgetConfiguration(this.widgetType);

                if (!this._widgetSelect) {
                    this._createSelect();
                    this._createWidget();
                }
                else if (this._widgetSelect && !skipUpdateSelect) {
                    this._widgetSelect.setSelectedIdentifier(this.widgetType);
                }
                this._createWidget();
            }
        },

        _createToggleBar : function() {
            if (!this._toggleBar) {
                var tabs = [],
                    tabEls = this.attachPoints.tabs.children("[data-tab-id]");
                tabEls.each(function(idx, el) {
                    el = $(el);
                    tabs.push({
                        id : el.data("tab-id"),
                        label : el.data("tab-name"),
                        selected : idx === 0,
                        iconClass : "glyphicon " + el.data("tab-icon")
                    });
                });
                this._toggleBar = this.addWidget(new ToggleBar({
                    baseClass : "tab-bar",
                    data : tabs,
                    valueProp : "id"
                }, this.attachPoints.tabBar));
                this._toggleBar.on("change", function(tab) {
                    tabEls.each(function(idx, el) {
                        el = $(el);
                        if (el.data("tab-id") === tab.id) {
                            el.removeClass("hidden");
                        }
                        else {
                            el.addClass("hidden");
                        }
                    });
                }.bind(this));
            }  
        },

        _createSelect : function() {
            if (this.widgetType && this.attachPoints && this.attachPoints.widgetSelect && !this._widgetSelect) {
                var widgetType,
                    widgetTypes = [];
                for (widgetType in ALL_WIDGETS) {
                    if (widgetType && !EXCLUDED_WIDGET_TYPES[widgetType] && !INHERITED_WIDGET_TYPES[widgetType]) {
                        widgetTypes.push({
                            id : widgetType,
                            name : widgetType,
                            selected : widgetType === this.widgetType
                        });
                    }
                }
                widgetTypes = widgetTypes.sort(sortCompareByName);

                this._widgetSelect = this.addWidget(new Select({
                    promptLabel : "Widget Type",
                    data : widgetTypes,
                    labelProp : "name"
                }, this.attachPoints.widgetSelect));
                this._widgetSelect.on("change", this._handleSelectWidgetType.bind(this));
            }
        },

        _handleSelectWidgetType : function(widgetType) {
            if (widgetType && widgetType.id) {
                this.setWidgetType(widgetType.id, true);
            }
        },

        _createWidget : function() {
            if (this.widgetType && this.attachPoints && this.attachPoints.widget) {
                this._currentWidgetProps = {};
                this._currentWidgetData = {};

                this._WidgetConstructor = metadataUtil.getWidgetConstructorByName(this.widgetType);
                if (this._WidgetConstructor) {
                    this._updateWidgetConfigurations();
                }
            }
        },

        _updateWidgetConfig : function(clearEventLog) {
            if (this._widgetInstance) {
                // remove any existing widget before creating/updating
                this.removeWidget(this._widgetInstance);
            }
            this.setWidgetPropertyConfig(formatter.formatCode("{\n  \"index\" : 1, \n  \"widgetData\" : "
                + JSON.stringify(this._currentWidgetData, null, "   ") + ",\n  \"widgetProperties\" : "
                + JSON.stringify(this._currentWidgetProps, null, "   ") + ",\n  \"widgetType\" : \""
                + this.widgetType + "\"\n}"));

            if (this.attachPoints && this.attachPoints.widgetDataConfig) {
                this.attachPoints.widgetDataConfig.val(JSON.stringify(this._sampleWidgetData, null, "   "));
            }

            this._widgetInstance = this.addWidget(new this._WidgetConstructor(
                $.extend({data : this._sampleWidgetData}, this._currentWidgetProps), this.attachPoints.widget));

            // event log
            this._configureWidgetEventLog();

            // only update the props and event log when we have a new widget type
            if (!this._lastWidgetConfigType || this._lastWidgetConfigType !== this.widgetType) {
                this._lastWidgetConfigType = this.widgetType;
                // extract properties and methods
                this._extractWidgetPropertiesAndFunctions();
            }
        },

        _configureWidgetEventLog : function() {
            if (!this._widgetEventLogGrid) {
                this._widgetEventLogGrid = this.addWidget(new GridTable({
                    allColumnsSortable : true,
                    noDataMessage : "No events have been dispatched by the current widget yet...",
                    columns : {
                        eventTime : {
                            index : 1,
                            name : "Time",
                            sortInd : -1
                        },
                        type : {
                            index : 2,
                            name : "Event Type"
                        },
                        userInitiated : {
                            index : 3,
                            name : "User Initiated"
                        },
                        data : {
                            index : 4,
                            name : "Event Data",
                            columnClass : "code"
                        }
                    }
                }, this.attachPoints.widgetEventLog));
            }
            else {
                this._clearWidgetEventLog();
            }
            // override dispatch event so we can capture them here first
            if (this._widgetInstance.dispatchEvent) {
                this._widgetInstance.dispatchEvent = this._handleWidgetDispatchEvent.bind(this,
                    this._widgetInstance.dispatchEvent.bind(this._widgetInstance));
            }
        },

        _clearWidgetEventLog : function() {
            if (this._widgetEventLogGrid) {
                this._widgetEventLogGrid.updateData([]);
            }
        },

        _handleWidgetDispatchEvent : function(oldDispatchEvent, evt, data, userInitiated) {
            //this._dispatchEventLog.push({evt : evt, data : data, userInitiated : userInitiated, time : new Date()});
            if (this._widgetEventLogGrid) {
                var evtData = data instanceof $ ? "[jQuery object]" :
                        (data instanceof _EventDispatcher ? "[widget reference]" : JSON.stringify(data, null, " "));
                this._widgetEventLogGrid.prependRow({
                    data : evtData,
                    eventTime : moment().format("HH:mm:ss"),
                    userInitiated : userInitiated,
                    type : evt
                });
            }
            if (oldDispatchEvent) {
                return oldDispatchEvent(evt, data, userInitiated);
            }
        },

        _getWidgetConfiguration : function(widgetType) {
            if (WIDGET_CONFIGURATIONS && WIDGET_CONFIGURATIONS.length > 0) {
                var i = 0, widgetConfig;
                for (i; i < WIDGET_CONFIGURATIONS.length; i++) {
                    widgetConfig = WIDGET_CONFIGURATIONS[i];

                    if (widgetConfig && widgetConfig.widgetType === widgetType) {
                        return widgetConfig;
                    }
                }
            }
            return null;
        },

        _extractWidgetPropertiesAndFunctions : function() {
            if (this._widgetInstance) {
                this._widgetPropertyMap = {};
                this._widgetFunctionMap = {};

                var prop, propVal, propValType, propValInputType, propInputs = [], propFunctions = [], inherited, funcName, argLen, i, propDesc, step, j;

                for (prop in this._widgetInstance) {
                    propVal = this._widgetInstance[prop];

                    // exclude "private" props prefixed with _
                    if (prop && prop.indexOf("_") !== 0 && !(propVal instanceof $) && !(propVal instanceof _EventDispatcher)) {
                        inherited = !this._widgetInstance.hasOwnProperty(prop);
                        if (typeof propVal === "function") {
                            if (!EXCLUDED_WIDGET_FUNCTIONS[prop] && prop.indexOf("on") !== 0) {
                                funcName = prop + " (";
                                argLen = propVal.length;
                                if (argLen > 0) {
                                    for (i = 0; i < argLen; i++) {
                                        if (i > 0) {
                                            funcName += ", ";
                                        }
                                        funcName += " arg" + (i + 1);
                                    }
                                }
                                funcName += " )";
                                this._widgetFunctionMap[prop] = {
                                    name: funcName,
                                    inherited: inherited
                                };
                                propFunctions.push(this._widgetFunctionMap[prop]);
                            }
                        }
                        else {
                            if (!EXCLUDED_WIDGET_PROPERTIES[prop]) {
                                propValType = typeof propVal;
                                propDesc = this._widgetTypeConfig && this._widgetTypeConfig.widgetProperties &&
                                    this._widgetTypeConfig.widgetProperties[prop]
                                        ? this._widgetTypeConfig.widgetProperties[prop] : "";
                                propValInputType = propValType === "number" ? propValType :
                                    (propValType === "boolean" ? "checkbox" :
                                        (propValType === "string" ? "text" : "textarea"));
                                step = null;
                                if (propValInputType === "number") {
                                    //Set the step for number inputs
                                    var stringPropVal = propVal.toString().split(".");
                                    if (stringPropVal && stringPropVal.length > 1) {
                                        if (stringPropVal[1] && stringPropVal[1].length) {
                                            step = "0.";
                                            for (j = 1; j < stringPropVal[1].length; j++) {
                                                step += "0";
                                            }
                                            step = Number(step + "1");
                                        }
                                    }
                                }
                                if (propValInputType === "textarea") {
                                    propVal = JSON.stringify(propVal);
                                }
                                this._widgetPropertyMap[prop] = {
                                    name: prop,
                                    inherited: inherited,
                                    defaultValue: propVal,
                                    step: step !== null && step !== undefined ? step : null,
                                    type : propValType,
                                    inputType : propValInputType,
                                    desc : propDesc
                                };
                                propInputs.push({
                                    name: prop,
                                    inherited: inherited,
                                    value: propVal,
                                    step: step !== null && step !== undefined ? step : null,
                                    type: propValInputType,
                                    label : prop + (propDesc && propDesc.type ? (" [" + propDesc.type.trim() + "]") : ""),
                                    subLabel : (propDesc.desc || "").trim(),
                                    inputClass: inherited ? "prop-inherited" : "prop"
                                });
                            }
                        }
                    }
                }
                this._updateWidgetFunctions(propFunctions);
                this._updateWidgetPropertyForm(propInputs);
                this._updateWidgetEvents();
            }
        },

        _updateWidgetConfigurations : function() {
            var widgetConfigs = [], j, widgetConfig = this._widgetTypeConfig, config;
            if (widgetConfig) {
                // extract the widget description
                // extract description from config
                var desc = (widgetConfig.description || "").trim();
                if (this.setWidgetDescription) {
                    this.setWidgetDescription(desc);
                }
                else {
                    this.widgetDescription = desc;
                }

                // extract the available configs for this widget type
                if (widgetConfig.config && widgetConfig.config.length > 0) {
                    for (j = 0; j < widgetConfig.config.length; j++) {
                        config = widgetConfig.config[j];
                        if (config) {
                            config.label = "Example " + (j + 1);
                            config.id = this.widgetType + "-" + (j + 1);
                            widgetConfigs.push(config);
                        }
                    }
                }
            }
            widgetConfigs.push({
                label : "Default",
                id : (this.widgetType) + "-0"
            });
            if (!this._widgetConfigSelect) {
                this._widgetConfigSelect = this.addWidget(new Select({
                    data : widgetConfigs,
                    promptLabel : "Select Widget Configuration"
                }, this.attachPoints.widgetConfigSelect));
                this._widgetConfigSelect.on("change", this._handleSelectWidgetConfig.bind(this));
            }
            else {
                this._widgetConfigSelect.updateData(widgetConfigs);
            }
        },

        _handleSelectWidgetConfig : function(config) {
            if (config && config.id !== this._selectedWidgetConfigId) {
                this._selectedWidgetConfigId = config.id;

                var hasFixture = config && config.fixture;
                this._currentWidgetData = hasFixture ? {
                    fixtureUrl : this.fixtureUrlBasePath + config.fixture,
                    fixtures : true,
                    serviceUrl : "services/your/service/here"
                } : {};
                this._currentWidgetProps = $.extend(true, {}, (config.widgetProperties || {}));
                if (hasFixture) {
                    $.getJSON(this._currentWidgetData.fixtureUrl)
                        .done(this._handleLoadWidgetConfigData.bind(this))
                        .fail(this._handleLoadWidgetConfigData.bind(this, undefined));
                }
                else {
                    this._handleLoadWidgetConfigData();
                }
            }
        },

        _handleLoadWidgetConfigData : function(data) {
            this._sampleWidgetData = data !== undefined ? data : undefined;
            this._updateWidgetConfig(true);
        },

        _updateWidgetEvents : function() {
            var widgetEvents = [], i = 0, evt, currWidgetTypeConstructor;
            if (WIDGET_EVENTS && WIDGET_EVENTS.length > 0) {
                for (i; i < WIDGET_EVENTS.length; i++) {
                    evt = WIDGET_EVENTS[i];
                    if (evt && evt.widgetType) {
                        if (evt.widgetType === this.widgetType) {
                            widgetEvents.push(evt);
                        }
                        else {
                            // see if the widget is a descendant of this type
                            currWidgetTypeConstructor = ALL_WIDGETS[evt.widgetType];
                            if (currWidgetTypeConstructor && this._widgetInstance instanceof currWidgetTypeConstructor) {
                                widgetEvents.push(evt);
                            }
                        }
                    }
                }
            }
            if (!this._widgetEventsGrid) {
                this._widgetEventsGrid = this.addWidget(new GridTable({
                    data : widgetEvents,
                    allColumnsSortable : true,
                    columns : {
                        event : {
                            index : 1,
                            name : "Event",
                            sortInd : 1
                        },
                        desc : {
                            index : 2,
                            name : "Description"
                        },
                        payloadDesc : {
                            index : 3,
                            name : "Payload"
                        }
                    }
                }, this.attachPoints.widgetEvents));
            }
            else {
                this._widgetEventsGrid.updateData(widgetEvents);
            }
        },

        _updateWidgetFunctions : function(propFunctions) {
            propFunctions = propFunctions.sort(sortCompareInheritedName);
            if (!this._widgetFunctionGrid) {
                this._widgetFunctionGrid = this.addWidget(new GridTable({
                    data : propFunctions,
                    headers : false,
                    allColumnsSortable : true,
                    columns : {
                        name : {
                            index : 1,
                            name : "Function",
                            sortInd : 1
                        }
                    }
                }, this.attachPoints.widgetFunctions));
            }
            else {
                this._widgetFunctionGrid.updateData(propFunctions);
            }
        },

        _updateWidgetPropertyForm : function(propInputs) {
            propInputs = propInputs.sort(sortCompareInheritedName);

            if (!this._widgetPropertyForm) {
                this._widgetPropertyForm = this.addWidget(new Form({
                    textMaxLength : 5000,
                    inputs : propInputs
                }, this.attachPoints.widgetProperties));
                this._widgetPropertyForm.on("inputChange", this._handleWidgetPropertyValueChange.bind(this));
            }
            else {
                this._widgetPropertyForm.updateData({
                    inputs : propInputs
                });
            }
        },

        _handleWidgetPropertyValueChange : function(propValue) {
            if (propValue && propValue.name) {
                var propInfo = this._widgetPropertyMap[propValue.name],
                    newPropValue = propValue.value;

                if (propInfo && propInfo.defaultValue === newPropValue) {
                    delete this._currentWidgetProps[propValue.name];
                }
                else {
                    if (propInfo.inputType === "textarea") {
                        try {
                            newPropValue = JSON.parse(newPropValue);
                        }
                        catch (ex) {
                            newPropValue = propValue.value;
                        }
                    }
                    this._currentWidgetProps[propValue.name] = newPropValue;
                }
                this._updateWidgetConfig(false);
            }
        },

        getTemplateData : function() {
            return {
                showWidgetSelect : this.showWidgetSelect ? "" : "hidden"
            };
        }

    });
});