define([
    "jquery",
    "common-ui/views/_View",
    "common-ui/models/DataStore",
    "common-ui/widgets/ToggleBar",
    "common-ui/widgets/utils/metadataUtil",
    "metadata-manager/utils/metadataUtil",
    "metadata-manager/views/AddMetadataView",
    "text!metadata-manager/views/templates/MetadataView.html"
], function($, _View, DataStore, ToggleBar, metadataUtil, metadataManagerUtil, AddMetadataView, viewTemplate) {

    var VIEW_BASIC = "basic",
        VIEW_DATA = "data",
        VIEW_VIEWS = "views",
        VIEW_ADVANCED = "advanced",
        VIEW_FILTER_MENU = "filterMenu",
        VIEW_HELP = "help",
        WIDGETS_WITH_COLUMNS = {
            /*"ChartGrid" : true, TODO */
            "GridTable" : true
        },
        VIEW_CONTAINER_WIDGETS = {
            SelectionListContainer : true,
            SimpleContainer : true,
            ToggleBarContainer : true,
            WizardContainer : true,
            ProgrammaticContainer : true
        };

    return _View.extend({

        META_VIEWS : "views",
        META_NAVIGATION : "filters",
        META_BINDINGS : "bindings",
        META_MENU_OPTIONS : "menuOptions",
        META_REQUESTS : "requests",
        META_WIDGETS : "widgets",
        META_WIDGET_PROPS : "widgetProperties",
        META_DEFAULT_WIDGET_PROPS : "defaultWidgetProperties",
        META_COLS : "columns",
        META_COL_TYPES : "columnTypes",
        FIREBALL_META_ENV_PREFIX : "FIREBALL_MD_",

        viewTemplate : viewTemplate,
        widgetAttachPoint : "metadataContainer",

        onViewTemplateNodesAttached : function(nodes) {
            if (nodes.toggleBar) {
                this._toggleBar = new ToggleBar({
                    data : [
                        {label : "My Dashboard", value : VIEW_BASIC},
                        {label : "Data", value : VIEW_DATA},
                        {label : "App Menu Options, Filters &amp; Widgets", value : VIEW_FILTER_MENU},
                        {label : "Views", value : VIEW_VIEWS},
                        {label : "Advanced Configuration", value : VIEW_ADVANCED},
                        {label : "FAQ", value : VIEW_HELP}
                    ],
                    baseClass : "tab-bar-simple"
                }, nodes.toggleBar);
                this._toggleBar.on("toggle", this._handleToggleView.bind(this));
            }
            this.renderMetadataUI();
            this.renderMetadata();
            this._handleToggleView({
                value : VIEW_BASIC
            });
        },

        getViewTemplateData : function() {
            return {
                moduleCode : this.moduleCode
            };
        },

        showSetupMessage : function() {
            var module = this.FIREBALL_META_ENV_PREFIX + (this.moduleCode ? this.moduleCode.toUpperCase() : "");
            $(".meta").html("<div class='metadata-container'><h3>Almost there...</h3>" +
                "<p>You are not setup to use the metadata manager yet. Set the environment variable <b>" + module
                + "</b> to the path of your project's root directory " +
                "(contains 'src/main/webapp/WEB-INF/metadata/" + this.moduleCode + ".json'). For example, 'export "
                + module + "=~/workspace/my-project-folder' (no trailing slash).</p><p>You will likely have to "
                + "restart your server and perhaps even the terminal window you had open.</p></div>");
        },

        _handleToggleView : function(view) {
            if (this.viewAttachPoints) {
                if (((view && view.value && view.value !== this._selectedView) || !this._selectedView) && this.domNode) {
                    this._selectedView = view.value;
                    this.domNode.find(".mvc").hide();

                    this.hideNotification();

                    if (this.viewAttachPoints[view.value]) {
                        this.viewAttachPoints[view.value].show();
                        this._updateRawMetaEditorSize();
                    }
                }
            }
        },

        _updateRawMetaEditorSize : function() {
            if (this._selectedView === VIEW_ADVANCED && this.viewAttachPoints && this.viewAttachPoints.metadataContainer) {
                this._handleEditRawMetadata({
                    target : this.viewAttachPoints.metadataContainer.find("textarea")[0]
                });
            }
        },

        setMetadataRaw : function(metadataRaw) {
            this.metadataRaw = metadataRaw;
            if (this._createMetadataModal) {
                this._createMetadataModal.hide();
            }
            this.renderMetadataUI();
            this.renderMetadata();
            this._bindEvents();
        },

        setMetadata : function(metadata) {
            this.metadata = metadata;
            //this._handleToggleView();
        },

        renderMetadata : function() {
            if (this.viewAttachPoints && this.viewAttachPoints.metadataContainer && this.metadataRaw)  {
                var container = this.viewAttachPoints.metadataContainer;
                container.html("<div style='margin-right: 5px;'><textarea class='raw-editor'>" +
                    unescape(JSON.stringify(this.metadataRaw, null, '\t')) + "</textarea></div>");

                this._updateRawMetaEditorSize();
            }
        },

        renderMetadataUI : function() {
            this._renderUIProperties();
            this._renderMenuOptions();
            this._renderDataSets();

            this._views = this.metadataRaw ? metadataUtil.getSortedWidgetArray($.extend({}, this.metadataRaw[this.META_VIEWS] || {}), null, true) : {};
            this._renderUIViews();
            if (this._views && this._views.length > 0 && this._views[0]) {
                this._selectedViewTab = this._views[0]._key;
                this.renderUIView(this._views[0], true);
            }

            this._renderUINavigation();
        },

        _renderUIProperties : function() {
            if (this.viewAttachPoints && this.viewAttachPoints.rootPropertiesContainer && this.metadataRaw) {
                // app-level properties:
                var key, propDom = "", propPath;
                for (key in this.metadataRaw) {
                    if (key && key !== this.META_VIEWS && key !== this.META_NAVIGATION && key !== this.META_BINDINGS &&
                        key !== this.META_MENU_OPTIONS && key !== this.META_REQUESTS &&
                        key !== this.META_DEFAULT_WIDGET_PROPS && this.metadataRaw[key]) {
                        propPath = "data-p-path='" + key + "' data-p-type='rootProperty'";
                        propDom += "<span class='metadata-property card' " + propPath
                            + "><span class='metadata-property-title' " + propPath + ">" + key + "</span>"
                            + (this.metadataRaw[key] || "") + "</span>";
                    }
                }
                this.viewAttachPoints.rootPropertiesContainer.html(propDom);
            }
        },

        _renderMenuOptions : function() {
            if (this.viewAttachPoints && this.viewAttachPoints.menuOptionsContainer && this.metadataRaw && this.metadataRaw[this.META_MENU_OPTIONS]) {
                var menuOptions = this.metadataRaw[this.META_MENU_OPTIONS], key, dom = "", propPath;
                for (key in menuOptions) {
                    if (key && menuOptions[key]) {
                        propPath = "data-p-path='" + this.META_MENU_OPTIONS + "." + key + "' data-p-type='menuOption'";
                        dom += "<span class='metadata-property card menu-option' " + propPath
                            + "><span class='metadata-property-title' " + propPath + ">" + key + "</span>"
                            + (menuOptions[key].title ? menuOptions[key].title + ": " : "")
                            + (menuOptions[key].url || menuOptions[key].action || "") + "</span>";
                    }
                }
                this.viewAttachPoints.menuOptionsContainer.html(dom);
            }
        },

        _renderDataSets : function() {
            if (this.viewAttachPoints && this.viewAttachPoints.dataRequestContainer && this.metadataRaw && this.metadataRaw[this.META_REQUESTS]) {
                var vals = this.metadataRaw[this.META_REQUESTS], key, dom = "", propPath, ret;
                for (key in vals) {
                    if (key && vals[key]) {
                        propPath = "data-p-path='" + this.META_REQUESTS + "." + key + "' data-p-type='dataRequest'";
                        ret = vals[key].pojo || "Item";
                        if (vals[key].container) {
                            ret = vals[key].container + "&lt;" + ret + "&gt;";
                        }
                        dom += "<span class='metadata-property card data-request' " + propPath
                            + "><span class='metadata-property-title' " + propPath + ">" + key + "</span>"
                            + ret +
                        /*+ vals[key].query
                            + (vals[key].mapper ? ("<br>Mapper: " + vals[key].mapper) : "") +*/ "</span>";
                    }
                }
                this.viewAttachPoints.dataRequestContainer.html(dom);
            }
        },

        _renderUINavigation : function(container, filterOptions) {
            if (!container) {
                container = this.viewAttachPoints ? this.viewAttachPoints.navigationContainer : null;
            }
            if (container && this.metadataRaw && this.metadataRaw[this.META_NAVIGATION]) {
                // navigation/filters:
                var dom = "", i = 0, propPath, filter, props, data, filters = metadataUtil.getSortedWidgetArray($.extend({}, this.metadataRaw[this.META_NAVIGATION]), null, true);
                for (i; i < filters.length; i++) {
                    filter = filters[i];
                    if (filter && (!filterOptions || (filter._key && filterOptions && filterOptions[filter._key]))) {
                        props = filter.widgetProperties || {};
                        data = filter.widgetData || {};
                        propPath = "data-p-path='" + this.META_NAVIGATION + "." + filter._key + "' data-p-type='navFilter'";
                        dom += "<span class='metadata-property card nav-filter' " + propPath
                            + "><span class='metadata-property-title' " + propPath + ">" + filter._key + "</span>"
                            + (props.promptLabel || "") + "<br>"
                            + (data.request ? "<span class='metadata-property card data-request' data-p-path='"
                            + this.META_REQUESTS + "." + data.request + "' data-p-type='dataRequest'>" + data.request + "</span>"
                            : (data.serviceUrl ? "URL: " + data.serviceUrl : "<i class='no-bold'>(no data specified)</i>")) + "</span>";
                        delete filter._key;
                    }
                }
                container.html(dom);
            }
        },

        _renderViewNavigation : function(viewFilters, viewContainer) {
            // TODO not currently in use; renders actual filter widgets
            if (viewFilters && viewContainer && this.metadataRaw && this.metadataRaw[this.META_NAVIGATION]) {
                // navigation/filters:
                //if () {
                var i = 0, filterOptions = this.metadataRaw[this.META_NAVIGATION], key, container, filter, props, filters = [];
                for (key in viewFilters) {
                    if (key && viewFilters[key] && filterOptions[key]) {
                        filters.push(filterOptions[key]);
                    }
                }
                filters = metadataUtil.getSortedWidgetArray(filters, null, true);
                for (i; i < filters.length; i++) {
                    filter = filters[i];
                    if (filter) {
                        props = $.extend(filter.widgetProperties, {});
                        container = $("<div class='metadata-navigation-item " + filter._key + " " +
                            (props.hidden ? "metadata-navigation-item-hidden" : "") + "'></div>");
                        delete props.hidden;
                        viewContainer.append(container);

                        this._createWidget(filter, container);
                        delete filter._key;
                    }
                }
                //}
            }
        },

        _renderUIViews : function() {
            if (this.viewAttachPoints && this.viewAttachPoints.viewsContainer && this.metadataRaw) {
                this.viewAttachPoints.viewsContainer.empty();
                this._widgetMap = {};

                //if (this.metadataRaw[this.META_VIEWS]) {
                    var i = 0, tabs = [], view, views = this._views;
                    // add a hook to creating new views
                    views.push({title : "Add a New View", _key : "new"});
                    for (i; i < views.length; i++) {
                        view = views[i];
                        if (view && view._key) {
                            tabs.push({label : view._key, value : view._key});
                        }
                    }

                    // TODO this would be better as a selectionlist!
                    if (!this.viewTabBar) {
                        this.viewTabBar = new ToggleBar({
                            data : tabs,
                            baseClass : "tab-bar-simple",
                            selectedValue : this._selectedViewTab
                        }, this.viewAttachPoints.viewTabBar);
                        this.viewTabBar.on("toggle", this._handleToggleViewTab.bind(this));
                    }
                    else {
                        this.viewTabBar.selectedValue = this._selectedViewTab;
                        this.viewTabBar.updateData(tabs);
                    }

                //}
            }
        },

        renderUIView : function(view, skipBind) {
            if (this.viewAttachPoints && this.viewAttachPoints.viewsContainer && this.metadataRaw) {
                var filterKey, filterCount, container, widgetOuterContainer, widgetContainer, widgetInnerContainer, ppPath, hasColumns,
                    navContainer, viewPath;

                container = $("<div class='metadata-view-container metadata-view_" + view._key + "'></div>");
                //if (view.filters) {
                if (view._key !== "new") {
                    // all views must have the filters element
                    if (!view.filters) {
                        view.filters = {};
                    }

                    viewPath = this.META_VIEWS + "." + view._key;
                    container.append("<div class='metadata-navigation'><span class='metadata-add-button metadata-property' "
                        + "data-p-type='view' data-p-path='" + viewPath + "'>edit this view</span> "
                        + (!view.modal ?
                        "<span class='metadata-add-button metadata-property' "
                        + "data-p-type='viewFilter' data-p-path='" + viewPath + "." + this.META_NAVIGATION
                        + "'>select filters</span><span class='metadata-add-button metadata-property' "
                        + "data-p-type='viewMenuOption' data-p-path='" + viewPath + "." + this.META_MENU_OPTIONS
                        + "'>select menu options</span>" : "") + "</div>");
                    filterCount = 0;
                    for (filterKey in view.filters) {
                        if (filterKey && view.filters[filterKey]) {
                            filterCount++;
                        }
                    }
                    if (filterCount > 0 && !view.modal) {
                        navContainer = $("<div class='metadata-section metadata-navigation vertical-center'></div>");
                        container.append(navContainer);
                        this._renderUINavigation(navContainer, view.filters);
                    }
                }
                else {
                    viewPath = "";
                }

                //}
                if ((!this._selectedViewTab) || (this._selectedViewTab && view._key !== this._selectedViewTab)) {
                    container.hide();
                }
                widgetOuterContainer = $("<div class='metadata-container'><h3>" + (view.title || "<i>Title Not Specified</i>") + "</h3></div>");
                if (view.subTitle) {
                    widgetOuterContainer.append("<div class='sub-view-title'>" + view.subTitle + "</div>");
                }
                container.append(widgetOuterContainer);
                this.viewAttachPoints.viewsContainer.append(container);

                ppPath = "";
                if (view._key === "new") {
                    widgetOuterContainer.append("<p>Click the button below to create a new view.</p><br><span class='metadata-add-button metadata-property' data-p-type='view'>create new view</span>");
                }
                else {
                    ppPath = " data-pp-path='" + this.META_VIEWS + "." + view._key + "." + this.META_WIDGETS;
                    widgetOuterContainer.append("<br><span class='metadata-add-button metadata-property' data-p-type='widget'"
                        + ppPath + "'>add new widget</span>");
                }

                // create widgets within container
                var j = 0, widget, widgetData, propPath, containerWidget, cols, idx, widgets = metadataUtil.getSortedWidgetArray(view[this.META_WIDGETS], null, true);
                for (j; j < widgets.length; j++) {
                    widget = widgets[j];
                    if (widget) {
                        widgetData = widget.widgetData || {};
                        idx = widget.index !== undefined && widget.index !== null ? "<b>" + widget.index + "</b> " : "";
                        widgetContainer = $("<div class='metadata-property card view-widget' data-p-type='widget' " +
                            ppPath + "' data-p-path='" + (viewPath + "." + this.META_WIDGETS + "." + widget._key) + "'"
                            + "><span class='widget-type'>" + (widget.widgetType || "") + "</span><br>" + idx + (widget._key || "") + "<br>" +
                            (widgetData.request ? "<span class='metadata-property card data-request' data-p-path='"
                            + this.META_REQUESTS + "." + widgetData.request + "' data-p-type='dataRequest'>" + widgetData.request + "</span>"
                                : /*widgetData.serviceUrl ? "URL: " + widgetData.serviceUrl : */"") + "</div>");
                        if (widget.container) {
                            containerWidget = widgetOuterContainer.find("." + widget.container);
                            if (containerWidget && containerWidget.length > 0) {
                                containerWidget.append(widgetContainer);
                            }
                            else {
                                widgetOuterContainer.append(widgetContainer);
                            }
                        }
                        else {
                            widgetOuterContainer.append(widgetContainer);
                        }

                        widgetInnerContainer = $("<div class='widget-inner-container fireball-widget " + widget._key + "'></div>");
                        hasColumns = widget.widgetType && WIDGETS_WITH_COLUMNS[widget.widgetType];

                        propPath = ppPath + "." + widget._key + "." + this.META_WIDGET_PROPS;

                        // TODO widgetInnerContainer.append("<span class='metadata-add-button metadata-property' "
                        //    + propPath + "' data-p-type='widgetProperties'>customize</span>");
                        if (hasColumns) {
                            widgetInnerContainer.append("<span class='metadata-add-button metadata-property' "
                                + propPath + "' data-p-type='widgetColumns'>+ column</span>");
                        }
                        widgetContainer.append(widgetInnerContainer);
                        if (/*widgetData.fixtureUrl || */WIDGETS_WITH_COLUMNS[widget.widgetType]) {
                            this._createWidget(widgets[j], widgetInnerContainer);
                        }

                        delete widget._key;

                        // for widgets with columns, append an edit column button for each entry
                        if (hasColumns && widget[this.META_WIDGET_PROPS] && widget[this.META_WIDGET_PROPS][this.META_COLS]) {
                            cols = widget[this.META_WIDGET_PROPS] && widget[this.META_WIDGET_PROPS][this.META_COLS];

                            if (cols) {
                                var colKey, col, column;
                                for (colKey in cols) {
                                    if (colKey && cols[colKey]) {
                                        col = cols[colKey];
                                        // TODO this only supports GridTables
                                        column = widgetInnerContainer.find(".grid-table-header .grid-cell[data-col-key='" + colKey + "']");
                                        if (column) {
                                            column.append("<span class='metadata-add-button metadata-property' "
                                                + propPath + "' "
                                                + propPath.replace("data-pp-path", "data-p-path") + "." + this.META_COLS + "." + colKey
                                                + "' data-p-type='widgetColumns'>edit</span>");
                                        }
                                    }
                                }
                            }

                        }
                    }
                }
                delete view._key;
                if (!skipBind) {
                    this._bindEvents();
                }
            }
        },

        _renderUIWidgetOptions : function() {
            if (this.viewAttachPoints && this.viewAttachPoints.widgetOptionsContainer) {
                this.viewAttachPoints.widgetOptionsContainer.empty();
                var widgetOptions = metadataUtil.getWidgetConstructors(),
                    widgetConstructorName, widgetOptionContainer, widgetContainer;
                for (widgetConstructorName in widgetOptions) {
                    if (widgetConstructorName && widgetOptions[widgetConstructorName]) {
                        widgetOptionContainer = $("<div class='widget-option draggable-widget' draggable='true'><div>"
                            + widgetConstructorName + "</div></div>");
                        widgetContainer = $("<div data-widget-type='" + widgetConstructorName + "'></div>");
                        widgetOptionContainer.append(widgetContainer);
                        this.viewAttachPoints.widgetOptionsContainer.append(widgetOptionContainer);
                        /*this._createWidget({
                            widgetType : widgetConstructorName,
                            widgetProperties : {
                                append : true
                            }
                        }, widgetContainer);*/
                    }
                }
            }
        },

        _createWidget : function(widget, container, data) {
            if (widget) {
                if (widget.widgetClone && widget._key && this._widgetMap[widget.widgetClone]) {
                    var oldIndex = widget.index;
                    widget = this._widgetMap[widget.widgetClone] || {};
                    widget.index = oldIndex;
                }
                var Constructor = metadataUtil.getWidgetConstructorByName(widget.widgetType),
                    props = $.extend(true, {}, widget.widgetProperties);
                if (Constructor) {
                    props.append = true;
                    if ((widget.widgetData && widget.widgetData.type && widget.widgetData.data) || data) {
                        props.data = data || metadataUtil.extractWidgetData(widget.widgetData, widget.widgetData.data);
                    }
                    var widgetInstance = new Constructor(props, container);
                    if (!this._widgetMap[widget._key]) {
                        this._widgetMap[widget._key] = widget;
                    }

                    // TODO should we use the fixture data or would it be better to have dummy data that gets generated for each widget type?
                    /*if (widget.widgetData && widget.widgetData.fixtureUrl) {
                        var dataStore = new DataStore({
                            fixtures : true,
                            fixtureUrl : widget.widgetData.fixtureUrl
                        });
                        dataStore.loadData().then(this._getWidgetOnDataLoadedCallback(widgetInstance));
                    }*/
                }
                else {
                    container.html(widget._key + ": Invalid widget type (" + widget.widgetType + ")");
                }
            }
        },

        _getWidgetOnDataLoadedCallback : function(widget) {
            return function(data) {
                if (widget && widget.updateData) {
                    widget.updateData(data);

                    // TODO we may need this to be more flexible to handle data manip
                }
            };
        },

        _handleToggleViewTab : function(tab) {
            this._selectedViewTab = tab ? tab.value : "";
            this.viewAttachPoints.viewsContainer.find(".metadata-view-container").hide();

            // render new tab:
            var i = 0, view;
            for (i; i < this._views.length; i++) {
                view = this._views[i];
                if (view && view._key === tab.value) {
                    if (view._ref) {
                        this.notifyDelegate("shouldLoadViewRef", view);
                    }
                    else {
                        this.renderUIView(view);
                    }
                }
            }

            this.viewAttachPoints.viewsContainer.find(".metadata-view-container.metadata-view_" + tab.value).show();
        },

        _bindEvents : function() {
            if (this._eventBindings && this._eventBindings.length > 0) {
                var i = 0, curr;
                for (i; i < this._eventBindings.length; i++) {
                    curr = this._eventBindings[i];
                    if (curr && curr.off) {
                        curr.off();
                    }
                }
            }
            if (this.viewAttachPoints && this.viewAttachPoints.metadataContainer)  {
                this._eventBindings = [];

                // listen for raw metadata events
                var textarea = this.viewAttachPoints.metadataContainer.find("textarea");
                this._lastRawMetaVal = textarea.val();
                this._eventBindings.push(textarea.on("keydown", this._handleEditRawMetadata.bind(this)));
                this._eventBindings.push(textarea.on("blur", this._handleFinishEditRawMetadata.bind(this)));

                // listen for adding/editing of meta
                this._eventBindings.push(this.domNode.find(".metadata-property.metadata-add-button").on("click.addMetadata", this._handleClickEditMetaButton.bind(this)));
                this._eventBindings.push(this.domNode.find(".metadata-property.card").on("click.editMetadata", this._handleClickEditMetaButton.bind(this)));
            }
        },

        _handleClickEditMetaButton : function(evt) {
            var tgt = $(evt.target).closest("[data-p-type]"),
                pType = tgt.data("p-type"),
                pPath = tgt.data("p-path"),
                ppPath = tgt.data("pp-path"); // (parent property path)
            if (pType) {
                var callback = this["_" + pType + "MetadataEdit"];
                if (callback) {
                    var data = null, parentData, key = "";
                    // TODO functionalize
                    var ptr, parts, i, part;
                    if (pPath) {
                        ptr = this.metadataRaw;
                        parts = pPath.split(".");
                        for (i = 0; i < parts.length; i++) {
                            part = parts[i];
                            if (part && ptr[part]) {
                                ptr = ptr[part];
                            }
                        }
                        key = parts[parts.length - 1];
                        data = ptr;
                    }

                    if (ppPath) {
                        ptr = this.metadataRaw;
                        parts = ppPath.split(".");
                        for (i = 0; i < parts.length; i++) {
                            part = parts[i];
                            if (part && ptr[part]) {
                                ptr = ptr[part];
                            }
                        }
                        parentData = ptr;
                    }

                    callback.apply(this, [key, data, parentData]);
                }
            }
        },

        _handleEditRawMetadata : function(evt) {
            var key = evt.keyCode || evt.which, t = evt.target, tgt = $(evt.target);
            // enable tab key
            if (key === 9 && evt) {
                evt.preventDefault();

                var val = tgt.val() || "", start = t.selectionStart;
                tgt.val(unescape(val.substring(0, start) + "\t" + val.substring(t.selectionEnd)));
                t.selectionEnd = start + 1;
            }
            else if (!(key >= 37 && key <= 40) && !(key >= 16 && key <= 45) && !(key >= 91 && key <= 93) && evt.target) { // ignoring keys
                tgt.height(evt.target.scrollHeight - 20);
                tgt.height(evt.target.scrollHeight);
            }
        },

        _handleFinishEditRawMetadata : function(evt) {
            try {
                var val = $(evt.target).val(), newMeta = JSON.parse(val);
                if (newMeta) {
                    this.hideNotification();
                    if (this.viewAttachPoints.metadataContainer) {
                        this.viewAttachPoints.metadataContainer.removeClass("metadata-invalid");
                    }
                    if (val !== this._lastRawMetaVal) {
                        this._lastRawMetaVal = val;
                        this.notifyDelegate("shouldUpdateMetadata", newMeta);
                    }
                }
            }
            catch (e) {
                this.viewAttachPoints.metadataContainer.addClass("metadata-invalid");
                this.showNotification("Invalid metadata JSON: " + e.message, "error", true);
            }
        },

        _rootPropertyMetadataEdit : function(key, data) {
            var meta = this.metadataRaw;
            this.showEditMetadata((key ? "Edit" : "Add New") + " Application Property", [
                    {"prompt" : "Property Name (variable name)", "name" : "name", "value" : key},
                    {"prompt" : "Property Value", "name" : "value", value : data}
                ],
                function(values) {
                    if (meta && values && values.name) {
                       meta[values.name] = values.value;
                    }
                    else if (meta && meta[key] && values === null) {
                        delete meta[key];
                    }
                    return meta;
                }.bind(this), key);
        },

        _menuOptionMetadataEdit : function(key, data) {
            var meta = this.metadataRaw;
            if (!data) {
                data = {};
            }
            this.showEditMetadata((key ? "Edit" : "Add New") + " Navigation Menu Option", [
                    {"prompt" : "Menu Option Name (variable name)", "name" : "name", "value" : key},
                    {"prompt" : "Menu Option Title (shown in the menu)", "name" : "title", "value" : data.title},
                    {"prompt" : "Icon Class", "name" : "iconClass", "value" : data.iconClass},
                    {"prompt" : "View Index (display order)", "name" : "index", "value" : data.index, placeholder : "e.g. 1 or 1.5"},
                    {"prompt" : "URL (the link to open)", "name" : "url", "value" : data.url},
                    {"prompt" : "URL Target ('_blank' for new window)", "name" : "target", "value" : data.target},
                    {"prompt" : "Action (navigation controller callback function)", "name" : "action", "value" : data.action, type : "select", options : this._getMenuOptionActionOptions()},
                    {"prompt" : "Display as a standalone button (rather than within settings menu)?", "name" : "isButton", "value" : String(data.isButton).toLowerCase() === "true", type : "checkbox"}
                ],
                function(values) {
                    if (meta) {
                        if (!meta[this.META_MENU_OPTIONS]) {
                            meta[this.META_MENU_OPTIONS] = {};
                        }
                        if (values && values.name) {
                            var opt = {};
                            opt.title = values.title;
                            if (values.url) {
                                opt.url = values.url;
                            }
                            if (values.iconClass) {
                                opt.iconClass = values.iconClass;
                            }
                            else {
                                delete opt.iconClass;
                            }
                            if (values.target) {
                                opt.target = values.target;
                            }
                            if (values.action) {
                                opt.action = values.action;
                            }
                            if (!isNaN(values.index)) {
                                opt.index = Number(values.index);
                            }
                            else {
                                delete opt.index;
                            }
                            if (values.isButton && values.isButton === "on") {
                                opt.isButton = true;
                            }
                            else {
                                delete opt.isButton;
                            }
                            meta[this.META_MENU_OPTIONS][values.name] = opt;
                        }
                        else if (meta[this.META_MENU_OPTIONS][key] && values === null) {
                            delete meta[this.META_MENU_OPTIONS][key];
                        }
                    }
                    return meta;
                }.bind(this), key);
        },

        _dataRequestMetadataEdit : function(key, data) {
            var meta = this.metadataRaw;
            if (!data) {
                data = {};
            }
            this.showEditMetadata((key ? "Edit" : "Add New") + " Data Set", [
                    {"prompt" : "Data Set Name (variable name)", "name" : "name", "value" : key},
                    {"prompt" : "Query", "name" : "query", "value" : data.query, type : "textarea"},
                    {"prompt" : "Result POJO (maps result set entry)", "name" : "pojo", "value" : data.pojo, placeholder: "Omit package if com.premierinc.common_service.domain"},
                    {"prompt" : "Custom Mapper (implements RowMapper)", "name" : "mapper", "value" : data.mapper, placeholder: "Defaults to BeanPropertyRowMapper"},
                    {"prompt" : "Wrap results in a list?", "name" : "container", "value" : data.container === "List", type : "checkbox"}
                ],
                function(values) {
                    if (meta) {
                        if (!meta[this.META_REQUESTS]) {
                            meta[this.META_REQUESTS] = {};
                        }
                        if (values && values.name) {
                            var opt = {};
                            if (values.query) {
                                opt.query = values.query.replace(/\t/g, ' ').replace(/\r\n/g, " ").replace(/\n/g, " ");
                            }
                            if (values.pojo) {
                                opt.pojo = values.pojo;
                            }
                            if (values.mapper) {
                                opt.mapper = values.mapper;
                            }
                            if (values.container && values.container === "on") {
                                opt.container = values.container === "on" ? "List" : "";
                            }
                            // retain sortable cols
                            if (data.sortableColumns) {
                                opt.sortableColumns = data.sortableColumns;
                            }
                            meta[this.META_REQUESTS][values.name] = opt;
                        }
                        else if (meta[this.META_REQUESTS][key] && values === null) {
                            delete meta[this.META_REQUESTS][key];
                        }
                    }
                    return meta;
                }.bind(this), key, 450);
        },

        _navFilterMetadataEdit : function(key, data) {
            var meta = this.metadataRaw;
            if (!data) {
                data = {};
            }
            var wProps = data.widgetProperties || {}, wData = data.widgetData || {}, defaultWidgetType = "SelectionList";
            this.showEditMetadata((key ? "Edit" : "Add New") + " Navigation Filter", [
                    {"prompt" : "Filter Name (variable name)", "name" : "name", "value" : key},
                    {"prompt" : "Widget Type", "name" : "widgetType", "value" : (data.widgetType || defaultWidgetType), type : "select", options : this._getWidgetOptions()},
                    {"prompt" : "Prompt Label", "name" : "promptLabel", "value" : wProps.promptLabel},
                    {"prompt" : "View Index (display order)", "name" : "index", "value" : data.index, placeholder : "e.g. 1 or 1.5"},
                    {"prompt" : "Object Label Property (leave blank if 'label')", "name" : "labelProp", "value" : wProps.labelProp},
                    {"prompt" : "Object ID Property (leave blank if 'id')", "name" : "valueProp", "value" : wProps.valueProp},
                    {"prompt" : "Data Set (overrides service url)", "name" : "request", "value" : wData.request, type : "select", options : this._getDataSetOptions()},
                    {"prompt" : "Data Service URL", "name" : "serviceUrl", "value" : wData.serviceUrl, type : "textarea"},
                    /*{"prompt" : "Page Size for Pagination (optional)", "name" : "pageSize", "value" : wData.pageSize, placeholder : "e.g. 50"},*/
                    {"prompt" : "Data Fixture URL (test data)", "name" : "fixtureUrl", "value" : wData.fixtureUrl, placeholder : "scripts/"
                        + this.moduleCode + "/models/fixtures/" + (key || "&lt;filterName&gt;") + ".json"},
                    {"prompt" : "Fixtures enabled?", "name" : "fixtures", "value" : wData.fixtures && String(wData.fixtures).toLowerCase() === "true", type : "checkbox"}
                ],
                function(values) {
                    if (meta) {
                        if (!meta[this.META_NAVIGATION]) {
                            meta[this.META_NAVIGATION] = {};
                        }
                        if (values && values.name) {
                            // retain existing view structure
                            var opt;
                            if (key && data) {
                                opt = data || {};
                                if (!opt.widgetProperties) {
                                    opt.widgetProperties = {
                                        promptLabel : values.promptLabel || ""
                                    };
                                }
                                if (!opt.widgetData) {
                                    opt.widgetData = {};
                                }
                                opt.widgetType = values.widgetType || defaultWidgetType;
                            }
                            else {
                                opt = {
                                    widgetProperties : {
                                        promptLabel : values.promptLabel || ""
                                    },
                                    widgetData : {},
                                    widgetType : values.widgetType || defaultWidgetType
                                };
                            }

                            if (values.labelProp) {
                                opt.widgetProperties.labelProp = values.labelProp;
                            }
                            if (values.valueProp) {
                                opt.widgetProperties.valueProp = values.valueProp;
                            }
                            if (values.serviceUrl) {
                                opt.widgetData.serviceUrl = values.serviceUrl;
                            }
                            if (values.pageSize) {
                                opt.widgetData.pageSize = Number(values.pageSize);
                            }
                            else if (opt.widgetData) {
                                delete opt.widgetData.pageSize;
                            }
                            if (values.fixtureUrl) {
                                opt.widgetData.fixtureUrl = values.fixtureUrl;
                            }
                            if (values.fixtures && values.fixtures === "on") {
                                opt.widgetData.fixtures = true;
                            }
                            else {
                                delete opt.widgetData.fixtures;
                            }

                            if (!isNaN(values.index)) {
                                opt.index = Number(values.index);
                            }
                            else {
                                delete opt.index;
                            }
                            if (values.request) {
                                opt.widgetData.request = values.request;
                                var requestSvcUrl = "services/metadata/" + this.moduleCode + "/data/" + values.request;
                                if (!opt.widgetData.serviceUrl ||
                                    (opt.widgetData.serviceUrl && opt.widgetData.serviceUrl.indexOf(requestSvcUrl) === -1)) {
                                    opt.widgetData.serviceUrl = requestSvcUrl;
                                }
                            }
                            else if (opt.widgetData.request) {
                                delete opt.widgetData.request;
                            }
                            meta[this.META_NAVIGATION][values.name] = opt;
                        }
                        else if (meta[this.META_NAVIGATION][key] && values === null) {
                            delete meta[this.META_NAVIGATION][key];
                        }
                    }
                    return meta;
                }.bind(this), key, 725);
        },

        _viewMetadataEdit : function(key, data) {
            var meta = this.metadataRaw;
            if (!data) {
                data = {};
            }
            var prompts = [
                {"prompt" : "View Name (variable name, 'viewId' in JS Controller)", "name" : "name", "value" : key},
                {"prompt" : "View Title", "name" : "title", "value" : data.title},
                {"prompt" : "View Subtitle", "name" : "subTitle", "value" : data.subTitle},
                {"prompt" : "View Index (display order)", "name" : "index", "value" : data.index, placeholder : "e.g. 1 or 1.5"},
                {"prompt" : "Breadcrumb Title", "name" : "breadcrumbTitle", "value" : data.breadcrumbTitle},
                {"prompt" : "Display Trigger", "name" : "trigger", "value" : data.trigger, type : "select", options : this._getViewTriggerOptions(key)},
                {"prompt" : "Opens in a modal window?", "name" : "modal", "value" : data.modal && String(data.modal).toLowerCase() === "true", type : "checkbox"}
            ];
            if (!key) {
                prompts.push({"prompt" : "View Template (save time, use a template)", "name" : "template", type : "select", options : metadataManagerUtil.getViewTemplateOptions()});
            }
            this.showEditMetadata((key ? "Edit" : "Add New") + " View", prompts,
                function(values) {
                    if (meta) {
                        if (!meta[this.META_VIEWS]) {
                            meta[this.META_VIEWS] = {};
                        }
                        if (values && values.name) {
                            // retain existing view structure
                            var opt;
                            if (key) {
                                opt = meta[this.META_VIEWS][key] || {};
                            }
                            else {
                                opt = {};
                                // for new views, select its tab:
                                this._selectedViewTab = values.name;
                            }

                            if (values.title) {
                                opt.title = values.title;
                            }
                            else {
                                delete opt.title;
                            }
                            if (values.subTitle) {
                                opt.subTitle = values.subTitle;
                            }
                            else {
                                delete opt.subTitle;
                            }
                            if (!isNaN(values.index)) {
                                opt.index = Number(values.index);
                            }
                            else {
                                delete opt.index;
                            }
                            if (values.trigger) {
                                opt.trigger = values.trigger;
                            }
                            else {
                                delete opt.trigger;
                            }
                            if (values.breadcrumbTitle) {
                                opt.breadcrumbTitle = values.breadcrumbTitle;
                            }
                            else {
                                delete opt.breadcrumbTitle;
                            }
                            if (!opt[this.META_NAVIGATION]) {
                                opt[this.META_NAVIGATION] = {};
                            }
                            if (!opt[this.META_MENU_OPTIONS]) {
                                opt[this.META_MENU_OPTIONS] = {};
                            }
                            if (!opt[this.META_WIDGETS]) {
                                opt[this.META_WIDGETS] = {};
                            }
                            if (values.template) {
                                opt = metadataManagerUtil.generateViewTemplate(values.template, values.name, opt);
                            }
                            if (values.modal && values.modal === "on") {
                                opt.modal = values.modal === "on" ? "true" : "";
                            }
                            else {
                                delete opt.modal;
                            }
                            meta[this.META_VIEWS][values.name] = opt;
                        }
                        else if (meta[this.META_VIEWS][key] && values === null) {
                            delete meta[this.META_VIEWS][key];
                            delete this._selectedViewTab;
                        }
                    }
                    return meta;
                }.bind(this), key);
        },

        _viewFilterMetadataEdit : function(key, data) {
            var meta = this.metadataRaw;
            if (!data) {
                data = {};
            }
            this.showEditMetadata("Select View Navigation Filters", this._getNavFilterOptions(data),
                function(values) {
                    if (meta && meta[this.META_NAVIGATION]) {
                        // this cannot be deleted
                        if (values) {
                            var key;
                            if (data) {
                                for (key in data) {
                                    if (key) {
                                        delete data[key];
                                    }
                                }
                            }
                            // copy the values over into data
                            for (key in values) {
                                if (key && values[key]) {
                                    data[key] = values[key];
                                }
                            }
                            // nothing has to be updated since we are editing the reference to the filters data
                        }
                    }
                    return meta;
                }.bind(this));
        },

        _viewMenuOptionMetadataEdit : function(key, data) {
            var meta = this.metadataRaw;
            if (!data) {
                data = {};
            }
            this.showEditMetadata("Select View Menu Options", this._getNavMenuOptions(data),
                function(values) {
                    if (meta && meta[this.META_MENU_OPTIONS]) {
                        // this cannot be deleted
                        if (values) {
                            // TODO when we dont have menuOptions on the view, it deletes it from the meta
                            // TODO does the same happen with filters?
                            // TODO this also removes the ACL from the menu option when saving (same w/filters)
                            var key;
                            if (data) {
                                for (key in data) {
                                    if (key) {
                                        delete data[key];
                                    }
                                }
                            }
                            // copy the values over into data
                            for (key in values) {
                                if (key && values[key]) {
                                    data[key] = values[key];
                                }
                            }
                            // nothing has to be updated since we are editing the reference to the menu options data
                        }
                    }
                    return meta;
                }.bind(this));
        },

        _widgetMetadataEdit : function(key, data, parent) {
            var meta = this.metadataRaw;
            if (!data) {
                data = {};
            }
            var wProps = data.widgetProperties || {},
                wData = data.widgetData || {},
                eData = data.exportData || {},
                currView = $(".metadata-views .toggle-button-item.toggle-button-item-selected").data("toggle-value");
            this.showEditMetadata((key ? "Edit" : "Add New") + " View Widget", [
                    {"prompt" : "Widget Name (variable name)", "name" : "name", "value" : key},
                    {"prompt" : "Widget Type", "name" : "widgetType", "value" : data.widgetType, type : "select", options : this._getWidgetOptions()},
                    {"prompt" : "View Index (display order)", "name" : "index", "value" : data.index, placeholder : "e.g. 1 or 1.5"},
                    {"prompt" : "View Container (optional)", "name" : "container", "value" : data.container, type : "select", options : this._getViewContainerOptions(currView, key)},
                    {"prompt" : "Object ID Property (leave blank if 'id')", "name" : "valueProp", "value" : wData.valueProp},
                    {"prompt" : "Row Selection - Filter Binding (via Object ID property)", "name" : "filterBinding", "value" : wData.filterBinding, type : "select", options : this._getNavFilters()},
                    {"prompt" : "Data Set (overrides service url)", "name" : "request", "value" : wData.request, type : "select", options : this._getDataSetOptions()},
                    {"prompt" : "Data Service URL", "name" : "serviceUrl", "value" : wData.serviceUrl, type : "textarea"},
                    {"prompt" : "Page Size for Pagination (optional)", "name" : "pageSize", "value" : wData.pageSize, placeholder : "e.g. 50"},
                    {"prompt" : "Data Fixture URL (test data)", "name" : "fixtureUrl", "value" : wData.fixtureUrl},
                    {"prompt" : "Fixtures enabled?", "name" : "fixtures", "value" : wData.fixtures && String(wData.fixtures).toLowerCase() === "true", type : "checkbox"},
                    {"prompt" : "ExportableService Bean (only if NOT using a data set)", "name" : "serviceBean", type : "select", "value" : eData.serviceBean, options : this.exportableServiceBeans || []}
                    //{"prompt" : "Exclude from Excel Export? (valid widget types only)", "name" : "exclude", "value" : eData.exclude && String(eData.exclude).toLowerCase() === "true", type : "checkbox"}
                ],
                function(values) {
                    if (meta && meta[this.META_VIEWS]) {
                        if (values && values.name) {
                            var opt;
                            if (key && data) {
                                opt = data;
                                if (!opt.widgetProperties) {
                                    opt.widgetProperties = {};
                                }
                                if (!opt.widgetData) {
                                    opt.widgetData = {};
                                }
                                if (!opt.exportData) {
                                    opt.exportData = {};
                                }
                                opt.widgetType = values.widgetType;
                            }
                            else {
                                opt = {
                                    widgetProperties : {},
                                    widgetData : {},
                                    widgetType : values.widgetType
                                };
                            }
                            if (values.serviceUrl) {
                                opt.widgetData.serviceUrl = values.serviceUrl;
                            }
                            else {
                                delete opt.widgetData.serviceUrl;
                            }
                            if (values.container) {
                                opt.container = values.container;
                            }
                            else {
                                delete opt.container;
                            }
                            if (values.pageSize) {
                                opt.widgetData.pageSize = Number(values.pageSize);
                            }
                            else if (opt.widgetData) {
                                delete opt.widgetData.pageSize;
                            }
                            if (values.filterBinding) {
                                opt.widgetData.filterBinding = values.filterBinding;
                            }
                            else {
                                delete opt.widgetData.filterBinding;
                            }
                            if (values.valueProp) {
                                opt.widgetData.valueProp = values.valueProp;
                            }
                            else {
                                delete opt.widgetData.valueProp;
                            }
                            if (values.fixtureUrl) {
                                opt.widgetData.fixtureUrl = values.fixtureUrl;
                            }
                            else {
                                delete opt.widgetData.fixtureUrl;
                            }
                            if (values.fixtures && values.fixtures === "on") {
                                opt.widgetData.fixtures = true;
                            }
                            else {
                                delete opt.widgetData.fixtures;
                            }
                            if (!isNaN(values.index)) {
                                opt.index = Number(values.index);
                            }
                            else {
                                delete opt.index;
                            }
                            if (values.request) {
                                opt.widgetData.request = values.request;
                                var requestSvcUrl = "services/metadata/" + this.moduleCode + "/data/" + values.request;
                                if (!opt.widgetData.serviceUrl ||
                                    (opt.widgetData.serviceUrl && opt.widgetData.serviceUrl.indexOf(requestSvcUrl) === -1)) {
                                    opt.widgetData.serviceUrl = requestSvcUrl;
                                }
                            }
                            else if (opt.widgetData.request) {
                                delete opt.widgetData.request;
                            }
                            if (values.exclude && values.exclude === "on") {
                                opt.exportData.exclude = true;
                            }
                            else if (opt.exportData) {
                                delete opt.exportData.exclude;
                            }
                            if (values.serviceBean) {
                                opt.exportData.serviceBean = values.serviceBean;
                            }
                            else if (opt.exportData) {
                                delete opt.exportData.serviceBean;
                            }
                            if (!key && parent) {
                                parent[values.name] = opt;
                            }
                        }
                        else if (parent && parent[key] && values === null) {
                            delete parent[key];
                        }
                    }
                    return meta;
                }.bind(this), key, 850);
        },

        _widgetColumnsMetadataEdit : function(key, data, parent) {
            var meta = this.metadataRaw;
            if (!data) {
                data = {};
            }
            //console.log("TODO widget columns")
            var colFormat = data.columnFormat || {}, wData = data.widget || {};
            this.showEditMetadata((key ? "Edit" : "Add New") + " Grid Column", [
                    {"prompt" : "Column Name (variable name)", "name" : "name", "value" : key},
                    {"prompt" : "Column Header Title", "name" : "title", "value" : data.name},
                    {"prompt" : "Index (display order)", "name" : "index", "value" : data.index, placeholder : "e.g. 1 or 1.5"},
                    {"prompt" : "Data Format String (see <a href='http://numeraljs.com/' target='_blank'>Numeral.js</a>)", "name" : "formatString", "value" : data.formatString, placeholder : "e.g. 0.00"},
                    {"prompt" : "No Value Placeholder (what to show for nulls)", "name" : "noValuePlaceholder", "value" : data.noValuePlaceholder, placeholder : "e.g. N/A"},
                    {"prompt" : "Widget Type (specify only if column rendered as a widget)", "name" : "widgetType", "value" : wData.widgetType, type : "select", options : this._getWidgetOptions()},
                    {"prompt" : "Sortable?", "name" : "sortable", "value" : data.sortable && String(data.sortable).toLowerCase() === "true", type : "checkbox"},
                    {"prompt" : "Percent width (optional; don't include the % sign)", "name" : "percentWidth", "value" : colFormat.percentWidth, placeholder : "e.g. 20"},
                    {"prompt" : "Max width (optional)", "name" : "maxWidth", "value" : colFormat.maxWidth, placeholder : "e.g. 200px or 15%"},
                    {"prompt" : "Min width (optional)", "name" : "minWidth", "value" : colFormat.minWidth, placeholder : "e.g. 50px or 20%"}
                    /*        {"prompt" : "Is this a generic column type?", "name" : "type", "value" : data.type && String(data.type).toLowerCase() === "true", type : "checkbox"}
            TODO column options maybe achieved with a separate button/path */
                ],
                function(values) {
                    if (parent) {
                        if (values && values.name) {
                            var opt;
                            if (key && data) {
                                opt = data;
                            }
                            else {
                                opt = {};
                            }
                            opt.name = values.title || "";
                            if (!isNaN(values.index)) {
                                opt.index = Number(values.index);
                            }
                            else {
                                delete opt.index;
                            }

                            if (values.widgetType) {
                                if (!opt.widget) {
                                    opt.widget = {};
                                }
                                opt.widget.widgetType = values.widgetType;
                                if (!opt.widget.widgetProperties) {
                                    opt.widget.widgetProperties = {};
                                }
                            }
                            else {
                                delete opt.widget;
                            }

                            if (values.formatString) {
                                opt.formatString = values.formatString;
                            }
                            else {
                                delete opt.formatString;
                            }
                            if (values.noValuePlaceholder) {
                                opt.noValuePlaceholder = values.noValuePlaceholder;
                            }
                            if (values.sortable && values.sortable === "on") {
                                opt.sortable = values.sortable === "on" ? "true" : "";
                            }
                            else {
                                delete opt.sortable;
                            }

                            if (values.percentWidth || values.maxWidth || values.minWidth) {
                                if (!opt.columnFormat) {
                                    opt.columnFormat = {};
                                }
                                if (values.percentWidth) {
                                    opt.columnFormat.percentWidth = values.percentWidth;
                                }
                                else {
                                    delete opt.columnFormat.percentWidth;
                                }
                                if (values.maxWidth) {
                                    opt.columnFormat.maxWidth = values.maxWidth;
                                }
                                else {
                                    delete opt.columnFormat.maxWidth;
                                }
                                if (values.minWidth) {
                                    opt.columnFormat.minWidth = values.minWidth;
                                }
                                else {
                                    delete opt.columnFormat.minWidth;
                                }
                            }
                            else {
                                delete opt.columnFormat;
                            }

                            if (!key && parent) {
                                if (!parent[this.META_COLS]) {
                                    parent[this.META_COLS] = {};
                                }
                                parent[this.META_COLS][values.name] = opt;
                            }
                        }
                        else if (parent && parent[this.META_COLS] && parent[this.META_COLS][key] && values === null) {
                            delete parent[this.META_COLS][key];
                        }
                    }
                    return meta;
                }.bind(this), key);
        },

        _getDataSetOptions : function() {
            var options = [];
            if (this.metadataRaw && this.metadataRaw[this.META_REQUESTS])  {
                var key, requests = this.metadataRaw[this.META_REQUESTS];
                for (key in requests) {
                    if (key && requests[key]) {
                        options.push({value : key, name : key});
                    }
                }
            }
            return options;
        },

        _getMenuOptionActionOptions : function() {
            var options = [];
            options.push({value : "_action_", name : "Invoke callback on Navigation Controller"});
            options.push({value : "_back_", name : "Go back to the previous view"});
            if (this.metadataRaw && this.metadataRaw[this.META_VIEWS])  {
                var key, opts = this.metadataRaw[this.META_VIEWS], isModal;
                for (key in opts) {
                    if (key && opts[key]) {
                        isModal = opts[key].modal;
                        options.push({value : key, name : "Show " + key + " " + (isModal ? "Modal" : "View")});
                    }
                }
            }
            return options;
        },

        _getWidgetOptions : function() {
            var options = [], widgetTypeMap = metadataUtil.getWidgetConstructors();
            if (widgetTypeMap)  {
                var key;
                for (key in widgetTypeMap) {
                    if (key && widgetTypeMap[key]) {
                        options.push({value : key, name : key});
                    }
                }
            }
            options.sort(function(a, b) {
                return a && a.name && b && b.name && a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1;
            });
            return options;
        },

        _getViewTriggerOptions : function(view) {
            var options = [];
            options.push({value : "_startup_", name : "Application Startup"});
            if (this.metadataRaw && this.metadataRaw[this.META_VIEWS])  {
                var key, widget, widgets, opts = this.metadataRaw[this.META_VIEWS];
                for (key in opts) {
                    if (key && key !== view && opts[key] && opts[key][this.META_WIDGETS]) {
                        widgets = opts[key][this.META_WIDGETS];
                        for (widget in widgets) {
                            if (widget && widgets[widget]) {
                                options.push({value : widget + ".change", name : key + "." + widget + " (" + (widgets[widget].widgetType || "<i>Unknown widget type</i>") + ") : change"});
                            }
                        }
                    }
                }
            }
            return options;
        },

        _getViewContainerOptions : function(view, currWidget) {
            var options = [];
            if (this.metadataRaw && this.metadataRaw[this.META_VIEWS] && view)  {
                var widget, widgets, opts = this.metadataRaw[this.META_VIEWS];
                if (opts[view] && opts[view][this.META_WIDGETS]) {
                    widgets = opts[view][this.META_WIDGETS];
                    for (widget in widgets) {
                        if (widget && widgets[widget] && widget !== currWidget && VIEW_CONTAINER_WIDGETS[widgets[widget].widgetType]) {
                            options.push({value : widget, name : widget});
                        }
                    }
                }
            }
            return options;
        },

        _getNavFilters : function() {
            var options = [];
            if (this.metadataRaw && this.metadataRaw[this.META_NAVIGATION])  {
                var i = 0, opt, opts = metadataUtil.getSortedWidgetArray(this.metadataRaw[this.META_NAVIGATION]);
                for (i; i < opts.length; i++) {
                    opt = opts[i];
                    if (opt && opt._key) {
                        options.push({
                            name : (opt.widgetProperties && opt.widgetProperties.promptLabel ?
                                opt.widgetProperties.promptLabel || "" : "")
                                + " (" + opt._key + ")",
                            value : opt._key
                        });
                    }
                }
            }
            return options;
        },

        _getNavFilterOptions : function(currFilterOptionData) {
            var options = [];
            if (!currFilterOptionData) {
                currFilterOptionData = {};
            }
            if (this.metadataRaw && this.metadataRaw[this.META_NAVIGATION])  {
                var i = 0, opt, opts = metadataUtil.getSortedWidgetArray(this.metadataRaw[this.META_NAVIGATION]);
                for (i; i < opts.length; i++) {
                    opt = opts[i];
                    if (opt && opt._key) {
                        options.push({
                            name : opt._key,
                            prompt : (opt.widgetProperties && opt.widgetProperties.promptLabel ?
                                    opt.widgetProperties.promptLabel || "" : "")
                                + " (" + opt._key + ")",
                            value : currFilterOptionData[opt._key] ? true : false,
                            type : "checkbox"
                        });
                        delete opt._key;
                    }
                }
            }
            return options;
        },

        _getNavMenuOptions : function(currMenuOptionsData) {
            var options = [];
            if (!currMenuOptionsData) {
                currMenuOptionsData = {};
            }
            if (this.metadataRaw && this.metadataRaw[this.META_MENU_OPTIONS])  {
                var i = 0, opt, opts = metadataUtil.getSortedWidgetArray(this.metadataRaw[this.META_MENU_OPTIONS]);
                for (i; i < opts.length; i++) {
                    opt = opts[i];
                    if (opt && opt._key) {
                        options.push({
                            name : opt._key,
                            prompt : (opt.title || "") + " (" + opt._key + ")",
                            value : currMenuOptionsData[opt._key] ? true : false,
                            type : "checkbox"
                        });
                        delete opt._key;
                    }
                }
            }
            return options;
        },

        showEditMetadata : function(title, formElements, metadataMapper, editKey, height) {
            height = height || (formElements ? formElements.length * 52 + 140 : 160);
            if (!this._createMetadataModal) {
                this._createMetadataModal = new AddMetadataView({
                    delegate : this.delegate,
                    title : title,
                    data : formElements,
                    height : height,
                    metadataMapper : metadataMapper
                });
            }
            else {
                this._createMetadataModal.setTitle(title);
                this._createMetadataModal.setHeight(height);
                this._createMetadataModal.metadataMapper = metadataMapper;
                this._createMetadataModal.updateData(formElements);
            }
            if (editKey) {
                this._createMetadataModal.showDeleteButton();
            }
            else {
                this._createMetadataModal.hideDeleteButton();
            }
            this._createMetadataModal.show();
        }

    });
});
