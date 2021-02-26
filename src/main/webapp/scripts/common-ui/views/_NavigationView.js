define([
    "jquery",
    "common-ui/views/_MetadataDrivenView",
    "common-ui/widgets/Breadcrumbs",
    "common-ui/widgets/Button",
    "common-ui/widgets/DropDown",
    "common-ui/widgets/form/Form",
    "common-ui/widgets/grid/GridTable",
    "common-ui/widgets/Select",
    "common-ui/widgets/SelectionList",
    "common-ui/widgets/NotificationItem",
    "common-ui/widgets/utils/metadataUtil",
    "common-ui/widgets/utils/templateUtil",
    "common-ui/widgets/utils/topic",
    "common-ui/widgets/utils/url",
    "common-ui/widgets/utils/stringUtil",
    "common-ui/widgets/utils/accessibilityUtil",
    "moment",
    "text!common-ui/views/templates/_NavigationView.html"
], function($, _MetadataDrivenView, Breadcrumbs, Button, DropDown, Form, GridTable, Select, SelectionList, NotificationItem,
            metadataUtil, templateUtil, topic, url, stringUtil, accessibilityUtil, moment, template) {

    "use strict";

    return _MetadataDrivenView.extend({

        userInfo: "",
        logoUrl : url.PREMIER_CONNECT(),
        logoTooltip: "PremierConnect",
        logoutConfirmation: "Warning: Logging out of this application will log you out of all open Premier product applications. Do you wish to continue with logout?",
        viewClass: "",
        widgetAttachPoint: "navFilters",
        isNavigation: true,
        responsiveBreakpoint : 767,
        notificationDropdownPadding: 160,
        hasNotificationSettings : true,
        notificationPreviewDuration : 10000,
        _hasResizeListener : true,

        viewTitle : "",

        // override the default view template
        template: template,

        filterLabel : "Filters",
        helpLabel : "Help",

        profileItems : null,

        footerItems : [
            {"label" : "© Copyright " + (new Date().getFullYear()) + " Premier, Inc.", "cssClasses" : "copyright"},
            {"label" : "Terms and Conditions", "target" : "https://sso.premierinc.com/views/terms", "cssClasses" : "terms"},
            {"label" : "Privacy Policy", "target" : "https://sso.premierinc.com/views/privacy", "cssClasses" : "privacy"},
            {"label" : "Need Help? 800.805.4608", "cssClasses" : "support"}
        ],

        viewTemplate: "<div class='view-filters-inner-container'><div class='view-filters-inner' data-attach-point='navFilters'></div><span class='slide-in-menu-close' data-attach-point='filterClose'>&times;</span></div>",

        onInit: function () {
            topic.subscribe("showLoading", this.showLoading.bind(this));
            topic.subscribe("hideLoading", this.hideLoading.bind(this));
            this._handleHeaderResize();
        },

        onViewShown : function(viewId, view) {
            this._selectedViewId = viewId;
            this._selectedView = view;
            this._updateNavMenuOptionSelection();
        },

        updateSiteConfig: function (siteConfig) {
            this.siteConfig = siteConfig || {};
            this._renderBreadcrumbs();
            this._renderFooter();
            this._renderProfileMenu();
            this._updateLogoAttributes();
        },

        canUnload : function() {
            // override can unload to determine if the currently selected view can also unload
            var thisCanUnload = this._super.apply(this, arguments),
                selectedView = this.getSelectedView ? this.getSelectedView() : null;
            return thisCanUnload && (!selectedView || !selectedView.canUnload || selectedView.canUnload());
        },

        _updateLogoAttributes: function () {
            if (this.siteConfig) {
                //TODO possible refactor to accommodate different templates
                var logoEl = this.attachPoints ? this.attachPoints.brandingLogo : null;

                if (this.siteConfig.logoUrl) {
                    this.logoUrl = this.siteConfig.logoUrl;
                    if (logoEl) {
                        logoEl.attr("href", this.logoUrl);
                    }
                }
                if (this.siteConfig.logoTooltip) {
                    this.logoTooltip = this.siteConfig.logoTooltip;
                    if (logoEl) {
                        logoEl.prop("title", this.logoTooltip);
                    }
                }
            }
        },

        hideNavFilters: function () {
            if (this.attachPoints && this.attachPoints.filterContainer) {
                this.attachPoints.filterContainer.hide();
            }
        },

        setTitle : function(title) {
            this.title = title;
            if (this.attachPoints && this.attachPoints.title) {
                var titleText = templateUtil.htmlDecode(title, "text");
                if (this.siteConfig && this.siteConfig.titlesContainSafeMarkup === true) {
                    this.attachPoints.title.empty().append(titleText);
                }
                else {
                    this.attachPoints.title.text(titleText);
                }
            }
        },

        setViewTitle : function(viewTitle) {
            this.viewTitle = viewTitle;
            if (this.attachPoints) {
                var viewTitleText = templateUtil.htmlDecode(viewTitle, "text");
                if (this.attachPoints.viewTitle) {
                    if (this.siteConfig && this.siteConfig.titlesContainSafeMarkup === true) {
                        this.attachPoints.viewTitle.empty().append(viewTitleText);
                    }
                    else {
                        this.attachPoints.viewTitle.text(viewTitleText);
                    }
                }
                if ( this.attachPoints.viewTitleContainer ) {
                    if ( stringUtil.isValidString( viewTitle ) ) {
                        this.attachPoints.viewTitleContainer.removeClass("no-title");
                    }
                    else {
                        this.attachPoints.viewTitleContainer.addClass("no-title");
                        this.attachPoints.viewTitle.text("no title");
                    }
                }
            }
            this._handleHeaderResize();
        },

        showView : function(viewName) {
            this.notifyDelegate("showView", viewName);
        },

        openUrl : function(regUrl, target) {
            if (regUrl) {
                if (target === "_blank") {
                    window.open(regUrl, target);
                }
                else {
                    document.location = regUrl;
                }
            }
        },

        back : function() {
            this.notifyDelegate("shouldTakeMenuOptionAction", {action : "_back_"});
        },

        closeWindow : function() {
            window.close();
        },

        setSubTitle : function(subTitle) {
            this.subTitle = subTitle;
            var subTitleText = subTitle ? templateUtil.htmlDecode(subTitle, "text") : "";
            if (!this._subTitleContainer && this.attachPoints && this.attachPoints.viewTitleContainer) {
                this._subTitleContainer = $("<span class='sub-view-title'></span>");
                this.attachPoints.viewTitleSubtitle.append(this._subTitleContainer);
            }
            if (this._subTitleContainer) {
                if (this.siteConfig && this.siteConfig.titlesContainSafeMarkup === true) {
                    this._subTitleContainer.empty().append(subTitleText);
                }
                else {
                    this._subTitleContainer.text(subTitleText);
                }
                if (!subTitle) {
                    this._subTitleContainer.hide();
                }
                else {
                    this._subTitleContainer.show();
                }
            }

            this._handleHeaderResize();
        },

        setMenuOptions : function(menuOptions) {
            this._menuOptions = menuOptions || {};
        },

        disableMenuOptions : function(menuOption) {
            this.setMenuOptionsEnabled(menuOption, false);
        },

        enableMenuOptions : function(menuOption) {
            this.setMenuOptionsEnabled(menuOption, true);
        },

        setMenuOptionsEnabled : function(menuOption, enabled) {
            if (!this._disabledMenuOptions) {
                this._disabledMenuOptions = {};
            }

            if (menuOption) {
                // supports string array of option names or individual option names
                var menuOptions = $.isArray(menuOption) ? menuOption : [menuOption],
                    i = 0, optionName, optionEl;
                for (i; i < menuOptions.length; i++) {
                    optionName = menuOptions[i];
                    if (optionName) {
                        if (enabled) {
                            delete this._disabledMenuOptions[optionName];
                        }
                        else {
                            this._disabledMenuOptions[optionName] = true;
                        }
                        if (this._menuOptionNodes[optionName]) {
                            optionEl = this._menuOptionNodes[optionName];
                            if (optionEl) {
                                if (String(enabled).toLowerCase() === "true") {
                                    optionEl.show();
                                }
                                else {
                                    optionEl.hide();
                                }
                            }
                        }
                    }
                }
                if (this._menuResizeCallback) {
                    this._menuResizeCallback();
                }
            }
        },

        showNavFilters: function () {
            if (this.attachPoints && this.attachPoints.filterContainer) {
                // filters are hidden initially to prevent jank; show them only on command
                if (!this._shownFilters && this.attachPoints.filterContainer) {
                    this._shownFilters = true;
                    this.attachPoints.filterContainer.removeClass('hidden');
                }
                this.attachPoints.filterContainer.show();
            }
        },

        getFilterMap: function (values, encode) {
            var widgets = this._getFilterWidgets(),
                i = 0, curr, val, filterValues = {};
            if (widgets && widgets.length > 0) {
                for (i; i < widgets.length; i++) {
                    curr = widgets[i];
                    if (curr) {
                        val = values ? curr.getSelectedValue() : curr.getSelectedLabel();
                        filterValues[curr._key] = encode ? encodeURIComponent(val) : val;
                        if (values && !curr.dataStore && curr._getLabelProp && curr.getSelectedLabel) {
                            filterValues[curr._key + "." + curr._getLabelProp()] = encode ?
                                encodeURIComponent(curr.getSelectedLabel()) : curr.getSelectedLabel();
                        }
                    }
                }
            }
            return filterValues;
        },


        getFilterPromptsAndSelectedLabels : function (includeOnlyFilterMap) {
            var widgets = this._getFilterWidgets(),
                i = 0, curr, filterValues = [];
            if (widgets && widgets.length > 0) {
                for (i; i < widgets.length; i++) {
                    curr = widgets[i];
                    if (curr && (!includeOnlyFilterMap || (includeOnlyFilterMap && includeOnlyFilterMap[curr._key]))) {
                        filterValues.push(curr.promptLabel + ": " + templateUtil.htmlDecode(curr.getSelectedLabel(), 'text'));
                    }
                }
            }
            return filterValues;
        },

        _getFilterWidgets : function() {
            return this.getWidgetsByType("SelectionList").concat(this.getWidgetsByType("Select")).concat(this.getWidgetsByType("Slider"));
        },

        updateNavFilters: function (visibleFilterMap) {
            this._visibleFilterMap = visibleFilterMap || {};
            var filters = this.getWidgets(),
                i = 0, curr, hasVisibleFilter = false;
            // all filters must be hidden before showing new ones, hence 2 separate loops
            for (i; i < filters.length; i++) {
                curr = filters[i];
                if (curr && curr._key) {
                    // check to see if there are cached get data args for this filter now that it is visible
                    if (this._cachedGetDataArgs && this._cachedGetDataArgs[curr._key] && curr.dataStore && curr.dataStore.getData) {
                        curr.dataStore.getData.apply(curr.dataStore, this._cachedGetDataArgs[curr._key]);
                    }
                    // now hide the filter if it should not be visible
                    if (!(String(curr.global).toLowerCase() === "true" && visibleFilterMap && visibleFilterMap[curr._key])) {
                        if (curr.hide) {
                            curr.hide();
                        }
                        if (this.NAV_WIDGET_TYPES[curr._type] && !curr.customContainer) {
                            this._moveWidgetToSecondary(curr, this.viewAttachPoints.navFilters);
                        }
                    }
                    else if (!curr.customContainer) {
                        hasVisibleFilter = true;
                    }
                }
            }
            if (!hasVisibleFilter) {
                this.hideNavFilters();
            }
            if (this.attachPoints && this.viewAttachPoints) {
                var visibleFilters = [];
                for (i = 0; i < filters.length; i++) {
                    curr = filters[i];
                    if (curr && (String(curr.global).toLowerCase() === "true" || (visibleFilterMap && visibleFilterMap[curr._key]))) {
                        if (this.NAV_WIDGET_TYPES[curr._type] && !curr.customContainer) {
                            visibleFilters.push(curr);
                        }
                        else if (curr.show) {
                            curr.show();
                        }
                    }
                }
                if (visibleFilters.length > 0) {
                    this._filterResizeCallback = function() {
                        if (this._filterResizeCountdown) {
                            clearTimeout(this._filterResizeCountdown);
                        }
                        this._filterResizeCountdown = setTimeout(function() {
                            this._fitWidgetsInPrimaryThenSecondaryContainers(visibleFilters, this.attachPoints.primaryViewFilters,
                                this.viewAttachPoints.navFilters, this.attachPoints.filterToggle, true);
                        }.bind(this), 10);
                    }.bind(this);
                    this._filterResizeCallback();
                }
                else if (this._filterResizeCountdown) {
                    clearTimeout(this._filterResizeCountdown);
                    delete this._filterResizeCountdown;
                    delete this._filterResizeCallback;
                }
            }
            this._checkFilterDataVisibility();
        },

        _fitWidgetsInPrimaryThenSecondaryContainers : function(widgets, primaryContainer, secondaryContainer, secondaryContainerViewToggle, addWidgetsBeforeViewToggle, widgetCssClass, allOrNone) {
            primaryContainer.css({"white-space" : "nowrap", "overflow" : "hidden"});
            secondaryContainerViewToggle.addClass("hidden");
            var i, widget, widgetNode, primaryFull = false,
                availableWidth = primaryContainer.width(),
                currWidth = 0, currWidgetWidth, prevWidget, prevWidgetNode,
                secondaryContainerViewToggleVisible = false, secondaryWidgetCount = 0;
            if (!widgetCssClass) {
                widgetCssClass = "fireball-widget";
            }
            for (i = 0; i < widgets.length; i++) {
                widget = widgets[i];
                if (widget && widget.show) {
                    widget.show();
                    widgetNode = widget.domNode ? widget.domNode.parent() : widget;

                    if (window.Modernizr.printlayout || !primaryFull) {
                        this._moveWidgetToPrimary(widget, addWidgetsBeforeViewToggle
                            ? secondaryContainerViewToggle : primaryContainer, addWidgetsBeforeViewToggle);
                        currWidgetWidth = widgetNode.outerWidth(true);

                        if (currWidth + currWidgetWidth > availableWidth && widgets.length > 1) {
                            primaryFull = true;
                            if (allOrNone) {
                                break;
                            }
                            // TODO need to make sure we always move at minimum 2 widgets to the secondary container
                            //  so either ensure i < widgets.length - 1 here or just always move the last 2 once full
                            secondaryWidgetCount += 2;
                            // remove the previous widget's width too and move that to the secondary
                            if (prevWidget && prevWidgetNode) {
                                currWidth -= prevWidgetNode.outerWidth(true);
                                this._moveWidgetToSecondary(prevWidget, secondaryContainer, widgetCssClass);
                            }
                        }
                        else {
                            currWidth += currWidgetWidth;
                        }
                    }
                    else {
                        secondaryWidgetCount++;
                    }
                    prevWidget = widget;
                    prevWidgetNode = widgetNode;
                    if (secondaryWidgetCount > 0) {
                        this._moveWidgetToSecondary(widget, secondaryContainer, widgetCssClass);

                        // determine if the controls for showing the secondary view container should be visible
                        if (secondaryContainerViewToggle && secondaryWidgetCount > 0 && !secondaryContainerViewToggleVisible) {
                            secondaryContainerViewToggleVisible = true;
                            secondaryContainerViewToggle.removeClass("hidden");
                            availableWidth -= secondaryContainerViewToggle.outerWidth(true);
                        }
                    }
                }
            }
            var isResponsiveMenu = allOrNone && primaryFull;
            if (allOrNone && this.attachPoints && this.attachPoints.mastheadContainer) {
                this.attachPoints.mastheadContainer.toggleClass("main-menu-responsive", isResponsiveMenu);
            }
            if (isResponsiveMenu) {
                secondaryWidgetCount = widgets.length;
                secondaryContainerViewToggleVisible = true;
                secondaryContainerViewToggle.removeClass("hidden");
                for (i = 0; i < widgets.length; i++) {
                    widget = widgets[i];
                    if (widget) {
                        this._moveWidgetToSecondary(widget, secondaryContainer, widgetCssClass);
                    }
                }
            }
            else {
                var j = widgets.length - secondaryWidgetCount;
                while (availableWidth - currWidth < 0 && j > 0) {
                    prevWidget = widgets[j - 1];
                    if (prevWidget) {
                        prevWidgetNode = prevWidget.domNode ? prevWidget.domNode.parent() : prevWidget;
                        currWidth -= prevWidgetNode.outerWidth(true);
                    }
                    this._moveWidgetToSecondary(prevWidget, secondaryContainer, widgetCssClass);
                    j--;
                }
            }

            if (secondaryContainerViewToggle && !secondaryWidgetCount && secondaryContainerViewToggleVisible) {
                //availableWidth += secondaryContainerViewToggle.outerWidth(true);
                secondaryContainerViewToggle.addClass("hidden");
            }
            return secondaryWidgetCount > 0;
        },

        _moveWidgetToPrimary : function(item, widgetTarget, addBeforeTarget) {
            if (item && widgetTarget) {
                var itemNode = item.domNode ? item.domNode.parent() : item;

                if (addBeforeTarget) {
                    widgetTarget.before(itemNode);
                }
                else {
                    widgetTarget.append(itemNode);
                }
            }
        },

        _moveWidgetToSecondary : function(widget, secondaryContainer, widgetCssClass) {
            // NOTE requires data-index on each element
            if (widget && secondaryContainer) {
                var widgetNode = widget.domNode ? widget.domNode.parent() : widget;

                // make sure the widget isn't already in this container:
                if (!widgetNode.parent().is(secondaryContainer)) {
                    var widgetIdx = Number(widgetNode.attr("data-index")),
                        siblings = secondaryContainer.children("." + widgetCssClass),
                        widgetPlaced = false,
                        siblingIdx;
                    if (siblings) {
                        siblings.each(function(idx, sibling) {
                            if (sibling) {
                                sibling = $(sibling);
                                siblingIdx = Number(sibling.attr("data-index"));
                                if (widgetIdx < siblingIdx && !widgetPlaced) {
                                    widgetPlaced = true;
                                    widgetNode.insertBefore(sibling);
                                    return false;
                                }
                            }
                        });
                    }
                    if (!widgetPlaced) {
                        secondaryContainer.append(widgetNode);
                    }
                }
            }
        },

        updateNavMenuOptions : function(visibleMenuOptionMap) {
            if (JSON.stringify(visibleMenuOptionMap) !== JSON.stringify(this._lastVisibleMenuOptionMap)) {
                this._lastVisibleMenuOptionMap = visibleMenuOptionMap;
                if (this._navMenuItemClickListener) {
                    this.disconnect(this._navMenuItemClickListener);
                }
                if (this._mainMenuItemClickListener) {
                    this.disconnect(this._mainMenuItemClickListener);
                }
                if (this._menuOptions && this.attachPoints && this.attachPoints.navMenuOptions && this.attachPoints.mainMenu) {
                    var dropDownItems = [], key, menuOptionDom = "";
                    this.visibleMenuOptions = {};
                    this._menuOptionNodes = {};
                    if (visibleMenuOptionMap && !$.isEmptyObject(visibleMenuOptionMap)) {
                        var opt;
                        for (key in visibleMenuOptionMap) {
                            if (key && visibleMenuOptionMap[key] && this._menuOptions[key]) {
                                opt = this._menuOptions[key];
                                delete opt._children;
                                if (opt.parentMenuOption && this._menuOptions[opt.parentMenuOption]) {
                                    this._menuOptions[opt.parentMenuOption]._hasChildren = true;
                                }
                                this.visibleMenuOptions[key] = opt;
                            }
                        }
                        dropDownItems = templateUtil.getSortedWidgetArray(this.visibleMenuOptions);
                    }
                    if (dropDownItems && dropDownItems.length > 0) {
                        var i = 0, curr, elType, menuOptionEl, parentMenuOptionEl, attrs, parentMenuOption;
                        menuOptionDom = $();
                        for (i; i < dropDownItems.length; i++) {
                            curr = dropDownItems[i];
                            if (curr && !curr.separator) {
                                attrs = {
                                    "data-index": curr.index
                                };
                                if (curr.url) {
                                    attrs.href = curr.url;
                                    attrs.rel = "noopener";
                                    if (curr.target) {
                                        attrs.target = curr.target;
                                    }
                                    if (curr.confirm) {
                                        attrs.onClick = "return confirm(\"" + curr.confirm + "\");";
                                    }
                                }
                                else {
                                    attrs["data-option-key"] = curr._key;
                                    attrs["tabindex"] = 0;
                                    attrs["role"] = "button";
                                    attrs["aria-pressed"] = false;
                                }
                                elType = curr.url ? "a" : "div";
                                menuOptionEl = $("<" + elType + "/>")
                                    .addClass("toggle-button-item nav-menu-item "
                                        + (!curr.url && !curr.action ? "dropdown-option-static " : "")
                                        + (curr.separator ? " dropdown-option-separator" : "")
                                        + (curr._hasChildren ? " nav-menu-item-with-kids" : "")
                                        + (curr.iconClass ? " nav-menu-item-with-icon" : "") + " no-select")
                                    .attr(attrs);
                                if (curr.iconClass) {
                                    menuOptionEl.append($("<i/>").addClass("drop-down-icon " + curr.iconClass));
                                }
                                if (curr.title) {
                                    menuOptionEl.append($("<span/>").addClass("toggle-button-title-text").text(curr.title));
                                }
                                if (curr.action) {
                                    menuOptionEl.data("action", curr.action);
                                }
                                this._menuOptionNodes[curr._key] = menuOptionEl;
                                if (curr.parentMenuOption && this.visibleMenuOptions[curr.parentMenuOption]) {
                                    parentMenuOption = this.visibleMenuOptions[curr.parentMenuOption];
                                    if (!parentMenuOption._children) {
                                        parentMenuOption._children = [];
                                    }
                                    parentMenuOption._children.push(curr);
                                    parentMenuOptionEl = this._menuOptionNodes[curr.parentMenuOption];
                                    parentMenuOptionEl.append(menuOptionEl.clone(true).addClass("nav-menu-option-kid"));
                                }
                                else {
                                    menuOptionDom = menuOptionDom.add(menuOptionEl);
                                }
                            }
                        }
                    }

                    if (this.attachPoints.navMenuMore) {
                        this.attachPoints.navMenuMore.empty().append(menuOptionDom);
                    }
                    this.attachPoints.navMenuOptions.empty();
                    this._mainMenuItemClickListener = this.connect(this.attachPoints.mainMenu.find(".nav-menu-item"),
                        "click.mainMenuItem keypress.mainMenuItem", this._handleNavSettingsOptionClick.bind(this));
                    this._navMenuItemClickListener = this.connect(this.attachPoints.navMenuMore.find(".nav-menu-item"),
                        "click.navMenuItem keypress.navMenuItem", this._handleNavSettingsOptionClick.bind(this));
                    this.attachPoints.navMenuOptions.css("display", dropDownItems.length > 0 ? "inherit" : "none");

                    this._menuResizeCallback = function () {
                        if (this._menuResizeCountdown) {
                            clearTimeout(this._menuResizeCountdown);
                        }
                        this._menuResizeCountdown = setTimeout(function () {
                            var m = 0, current, dropdownElements = [];
                            for (m; m < dropDownItems.length; m++) {
                                current = dropDownItems[m];
                                if (current && !current.separator && !current.parentMenuOption && this._menuOptionNodes[current._key] &&
                                    (!this._disabledMenuOptions || !this._disabledMenuOptions[current._key])) {
                                    dropdownElements.push(this._menuOptionNodes[current._key]);
                                }
                            }
                            var responsiveMode = this._fitWidgetsInPrimaryThenSecondaryContainers(dropdownElements,
                                this.attachPoints.navMenuOptions, this.attachPoints.navMenuMore,
                                this.attachPoints.navMenuMoreToggle, false, "nav-menu-item", true);
                            if (!responsiveMode && this._navMenuVisible) {
                                this._navMenuVisible = false;
                                this._hideMenu(this.attachPoints.navMenuMoreContainer, null);
                            }
                            this._updateNavMenuOptionSelection();

                            if (this._childMenuResizeCallback) {
                                this._childMenuResizeCallback();
                            }
                        }.bind(this), 10);
                    }.bind(this);
                    this._menuResizeCallback();
                }
            }
        },

        _updateNavMenuOptionSelection : function() {
            if (this.attachPoints && this.attachPoints.navMenuOptions && this.attachPoints.navMenuMore) {
                var menuQuery = ".toggle-button-item.nav-menu-item[data-option-key]",
                    menuOptionsList = [this.attachPoints.navMenuOptions.find(menuQuery),
                        this.attachPoints.navMenuMore.find(menuQuery)],
                    i = 0,
                    j;
                for (i; i < menuOptionsList.length; i++) {
                    var menuOptions = menuOptionsList[i], menuOption;
                    if (menuOptions && menuOptions.length > 0 && this.visibleMenuOptions) {
                        var foundSelection = false;
                        for (j = 0; j < menuOptions.length; j++) {
                            menuOption = $(menuOptions[j]);
                            if (menuOption && menuOption.length > 0) {
                                menuOption = $(menuOption);
                                var action = menuOption.data("action"),
                                    key = menuOption.data("option-key"),
                                    option = this.visibleMenuOptions[key],
                                    isSelected = false;

                                if (option && this._selectedNavMenuOption && !foundSelection &&
                                    (this._selectedNavMenuOption.globalHighlight  ||
                                        (this._selectedViewId === this._selectedNavMenuOption.action))) {
                                    if (option === this._selectedNavMenuOption) {
                                        foundSelection = true;
                                        isSelected = true;
                                    }
                                }
                                else if (action === this._selectedViewId && !foundSelection) {
                                    foundSelection = true;
                                    this._selectedNavMenuOption = option;
                                    isSelected = true;
                                }

                                if (isSelected) {
                                    menuOption.addClass("nav-menu-item-selected");
                                }
                                else {
                                    menuOption.removeClass("nav-menu-item-selected");
                                }
                            }
                        }
                    }
                }
            }
        },

        updateNotifications : function(visibleNotificationsList, pollingInterval) {
            if (this.attachPoints && this.attachPoints.appNotifications && this.attachPoints.appNotificationsList) {
                var unreadNotificationCount = 0;
                this.notificationsList = [];

                if (Array.isArray(visibleNotificationsList)) {
                    var firstNotification = visibleNotificationsList.length === 1;
                    if (new Date().getTime() - this._startupTime > Math.max(pollingInterval - 2500, 2500)) {
                        if (((firstNotification && !this._previousFirstNotification) || (this._previousFirstNotification && visibleNotificationsList[0] && (this._previousFirstNotification.id !== visibleNotificationsList[0].id))) && String(visibleNotificationsList[0].read).toLowerCase() !== "true") {
                            this.createNotificationPreview(visibleNotificationsList[0]);
                        }
                    }

                    var i = 0;
                    for (i; i < visibleNotificationsList.length; i++) {
                        if (visibleNotificationsList[i] && String(visibleNotificationsList[i].read).toLowerCase() !== "true") {
                            unreadNotificationCount++;
                        }
                    }
                    this.notificationsList = visibleNotificationsList;
                }
                this._unreadNotificationCount = unreadNotificationCount;
                this._previousFirstNotification = this.notificationsList[0];

                if (!this.notificationIconCount) {
                    this.attachPoints.appNotifications.removeClass("hide");
                    this.notificationIconCount = $("<div class='notification-icon-count'></div>");
                    this.attachPoints.appNotifications.append(this.notificationIconCount);
                    this.connect(this.attachPoints.appNotifications, "click.notificationsIcon",
                        this._handleNotificationClick.bind(this));
                }

                if (this._notificationsGrid) {
                    this._notificationsGrid.updateData(this.notificationsList);
                }

                this._updateNotificationIcon();
            }
            else {
                this._lastVisibleNotificationList = visibleNotificationsList;
            }
        },

        _updateNotificationIcon : function() {
            if (this._unreadNotificationCount > 0) {
                this.attachPoints.appNotifications.addClass("on");
                this.attachPoints.appNotifications.removeClass("off");
            }
            else {
                this.attachPoints.appNotifications.addClass("off");
                this.attachPoints.appNotifications.removeClass("on");
            }
            if (this.notificationIconCount) {
                this.notificationIconCount.text(this._unreadNotificationCount > 0 ?
                    this._unreadNotificationCount >= 10 ? "9+" : this._unreadNotificationCount : "");
            }
        },

        _handleNotificationClick : function() {
            if (!this._notificationsContainer) {
                this._notificationsOverlay = $("<div class='overlay notifications-overlay'></div>");
                $("body").append(this._notificationsOverlay);
                this.connect(this._notificationsOverlay, "click.notificationsOverlay", this._hideNotifications.bind(this));

                this._notificationsContainer = $("<div class='notifications-dropdown tooltip-container'><h3 class='notifications-title'>Notifications</h3></div>");

                // wire up the settings
                if (this.hasNotificationSettings && this._notificationsContainer && !this._notificationSettingsContainer) {
                    this._notificationSettingsIcon = $("<div class='notification-settings-icon glyphicon glyphicon-cog'></div>");
                    this._notificationsContainer.append(this._notificationSettingsIcon);
                    this.connect(this._notificationSettingsIcon, "click.notificationSettings", this._handleNotificationSettingsClick.bind(this));

                    this._notificationSettingsContainer = $("<div class='notification-settings shady-container'></div>");
                    this._notificationSettingsContainer.hide();
                    this._notificationsContainer.append(this._notificationSettingsContainer);
                }

                this._notificationsGridContainer = $("<div class='notification-table-container'></div>");
                this._notificationsContainer.append(this._notificationsGridContainer);

                this.calcNotificationContainerHeight();

                this.attachPoints.appNotificationsList.append(this._notificationsContainer);
                this._notificationsGrid = this.addWidget(new GridTable({
                    baseClass: "",
                    headers: false,
                    valueProp: "id",
                    scrollContainer : this._notificationsGridContainer,
                    columns: {
                        _data_: {
                            index: 1,
                            widget: {
                                widgetType: "NotificationItem"
                            }
                        }
                    },
                    data: this.notificationsList
                }, this._notificationsGridContainer));

                this._notificationsGrid.on("change", this._handleNotificationRowClick.bind(this));
            }

            else {
                this.calcNotificationContainerHeight();
            }

            if (this._notificationsToggled) {
                this._hideNotifications();
            }
            else {
                $("body").addClass("menu-layer-visible");
                this._notificationsGrid.updateData(this.notificationsList);
                this._notificationsOverlay.show();
                this._notificationsContainer.show();
                this._notificationsToggled = true;
            }
        },

        createNotificationPreview : function(notification) {
            this._notificationPreviewContainer = $("<div class='notification-preview-container card'></div>");
            $("body").append(this._notificationPreviewContainer);


            this.addWidget(new NotificationItem({data: notification}, this._notificationPreviewContainer));

            setTimeout(function () {
                this._notificationPreviewContainer.addClass("slide-fade-in");
            }.bind(this), 100);

            this._notificationPreviewContainer.on("click", this._handleNotificationPreviewClick.bind(this));

            setTimeout(function() {
                this._notificationPreviewContainer.removeClass("slide-fade-in");
                setTimeout(function () {
                    this._notificationPreviewContainer.remove();
                }.bind(this), 1000);
            }.bind(this), this.notificationPreviewDuration);
        },

        _handleNotificationPreviewClick : function () {
            this._notificationPreviewContainer.remove();

            this._handleNotificationClick();
        },

        calcNotificationContainerHeight : function() {
            //header height + title height + 5px of padding
            var win = $(window),
                calculatedHeight = win.height() - this.notificationDropdownPadding + (win.width() <= this.responsiveBreakpoint ? 46 : 0);
            this._notificationsGridContainer.css("max-height", calculatedHeight);
        },

        _hideNotifications : function () {
            if (this._notificationsOverlay) {
                this.hideAppNotifications();
            }
            $("body").removeClass("menu-layer-visible");
        },

        _handleNotificationRowClick : function (notification) {
            if (notification && notification.read === false) {
                this._unreadNotificationCount--;
                this.notifyDelegate("shouldMarkNotificationRead", notification);
            }
            if (notification && notification.target) {
                this._hideNotifications();
                this.notifyDelegate("shouldTakeNotificationAction", notification.target);
            }
        },

        _handleNotificationSettingsClick : function() {
            if (this._notificationSettingsForm && !this._notificationSettingsForm.isHidden()) {
                this.hideNotificationSettings();
            }
            else {
                this.showNotificationSettings();
            }
        },

        showNotificationSettings : function() {
            if (this._notificationSettingsIcon) {
                this._notificationSettingsIcon.addClass("notification-settings-open");
            }
            if (!this._notificationSettingsForm) {
                this.notifyDelegate("shouldGetNotificationSettings");
            }
            else {
                this._notificationSettingsForm.show();
            }
        },

        hideNotificationSettings : function() {
            if (this._notificationSettingsIcon) {
                this._notificationSettingsIcon.removeClass("notification-settings-open");
            }
            if (this._notificationSettingsForm) {
                this._notificationSettingsForm.hide();
            }
        },

        updateNotificationSettings : function(settings) {
            if (!this._notificationSettingsForm && this._notificationSettingsContainer) {
                this._notificationSettingsForm = new Form({
                    baseClass : "simple-form",
                    enableSubmit : true,
                    resetOnSubmit : false,
                    data : settings,
                    valueProp : "id"
                }, this._notificationSettingsContainer);
                this._notificationSettingsContainer.show();
                this._notificationSettingsForm.on("submit", this._handleNotificationSettingsSubmit.bind(this));
            }
            else {
                this._notificationSettingsForm.updateData(settings);
            }
        },

        _handleNotificationSettingsSubmit : function(settings) {
            this.notifyDelegate("shouldUpdateNotificationSettings", settings);
        },

        updateNotificationRow : function (notification) {
            this._notificationsGrid.updateRow(notification);
            this._updateNotificationIcon();
        },

        hideAppNotifications : function () {
            this._notificationsOverlay.hide();
            this._notificationsContainer.hide();
            this._notificationsToggled = false;
        },

        getDefaultWidgetProperties : function(widgetType) {
            var defProps = this._super.apply(this, arguments) || {};
            if (this.NAV_WIDGET_TYPES[widgetType]) {
                defProps.hidden = true;
            }
            return defProps;
        },

        showAppView : function() {
            if (this.attachPoints && this.attachPoints.appViewContainer) {
                $(this.attachPoints.appViewContainer).show();
            }
        },

        hideAppView : function() {
            // TODO this currently causes issues with restoring some subviews due to the logic that maintains hidden in widget base
            if (this.attachPoints && this.attachPoints.appViewContainer) {
                $(this.attachPoints.appViewContainer).hide();
            }
        },

        togglePageCssClass : function (cssClass, addRemove) {
            var body =  $("body");
            if (addRemove !== null && addRemove !== undefined) {
                if (addRemove) {
                    body.addClass(cssClass);
                }
                else {
                    body.removeClass(cssClass);
                }
            }
            else {
                body.toggleClass(cssClass);
            }
        },

        getTemplateData : function() {
            var data = this._super.apply(this, arguments);
            if (!data) {
                data = {};
            }
            data.logoutConfirmation = this.logoutConfirmation;
            data.viewClass = this.viewClass;
            data.logoUrl = this.logoUrl;
            data.homeUrl = window.location.href.split('?')[0].split('#')[0];
            data.logoTooltip = this.logoTooltip;
            data.hasTitleValue = stringUtil.isValidString( this.viewTitle );
            return data;
        },

        _renderProfileMenu : function() {
            if (!this._profileMenuRendered && this.siteConfig &&
                (!this.siteConfig.profileMenu || !this.siteConfig.profileMenu.disabled) &&
                this.attachPoints && this.attachPoints.profileMenu) {

                if (this.attachPoints.mainMenuSlideInMenu && this.attachPoints.mainMenuButton) {
                    this.attachPoints.mainMenuButton.removeClass("hidden");
                    this.attachPoints.mainMenuSlideInMenu.removeClass("hidden");
                }

                this._profileMenuRendered = true;
                var profileItems = this.siteConfig.profileItems || this.profileItems || [];

                // help and logout are dynamically added to the profile menu:
                if (this.siteConfig.helpUrl) {
                    profileItems.push({
                        "label" : this.siteConfig.helpLabel || this.helpLabel,
                        "target" : this.siteConfig.helpUrl,
                        "iconClass" : this.siteConfig.helpIcon || "glyphicon glyphicon-question-sign"
                    });
                }

                // add a separator above logout if it is not the only item in the menu
                if (profileItems.length > 0) {
                    profileItems.push({
                        "separator" : true
                    });
                }

                profileItems.push({
                    "label" : this.siteConfig.logoutLabel || "Sign out",
                    "target" : this.siteConfig.logoutUrl || "/pkmslogout",
                    "iconClass" : this.siteConfig.logoutIcon || "glyphicon glyphicon-log-out",
                    "targetWindow" : "_self",
                    "confirm" : this.siteConfig.logoutConfirmation || this.logoutConfirmation
                });

                this._renderLinkItems(profileItems, this.attachPoints.profileMenu, "dropdown-option nav-menu-item", "profileAction");

                if (this.attachPoints.mainMenuButton) {
                    this.connect(this.attachPoints.mainMenuButton, "click.mainMenuButton keypress.mainMenuButton",
                        this._showMenu.bind(this, this.attachPoints.mainMenu, null));
                }
            }
        },

        _renderFooter : function() {
            if (!this._footerRendered && this.siteConfig && this.attachPoints && this.attachPoints.footer) {
                this._footerRendered = true;
                this._renderLinkItems(this.siteConfig.footerItems || this.footerItems, this.attachPoints.footer,
                    "footer-info", "footerAction");
            }
        },

        _renderLinkItems : function(items, container, itemClass, actionEventName) {
            var dom = $("<div/>"),
                domItem,
                item,
                attrs,
                label,
                itemLinkEl,
                iconEl,
                hasActionItem = false,
                i = 0,
                domEl = [],
                parentDomEl,
                parentIndex;

            for (i; i < items.length; i++) {
                item = items[i];
                if (item && (item.separator || (item.label !== null && item.label !== undefined) ||
                    (item.title !== null && item.title !== undefined))) {
                    label = item.label !== null && item.label !== undefined ? item.label : item.title;
                    if (item.separator) {
                        domItem = $("<div/>").addClass("menu-option-separator");
                    }
                    else {
                        domItem = $("<div/>").addClass(itemClass + (item.cssClasses ? " " + item.cssClasses : ""));
                        iconEl = item.iconClass ? $("<i/>").addClass(item.iconClass) : null;
                        if (item.target || item.action) {
                            if (item.action) {
                                hasActionItem = true;
                                attrs = {
                                    "data-action" : item.action,
                                    "href" : "#"
                                };
                            }
                            else {
                                attrs = {
                                    "rel" : "noopener",
                                    "target" : item.targetWindow || "_blank",
                                    "href" : item.target
                                };
                            }
                            if (item.confirm) {
                                attrs.onClick = "return confirm(\"" + item.confirm + "\");";
                            }
                            itemLinkEl = $("<a/>").attr(attrs).text(label);
                            if (iconEl) {
                                itemLinkEl.prepend(iconEl);
                            }
                            domItem.append(itemLinkEl);
                        }
                        else {
                            if (item.key !== null && typeof item.key !== "undefined") {
                                domItem.append($("<div/>").addClass("footer-label").text(label));
                            }
                            else {
                                domItem.text(label);
                            }
                            if (iconEl) {
                                domItem.prepend(iconEl);
                            }
                        }
                    }

                    if (item.key !== null && typeof item.key !== "undefined") {
                        if (!this._footerDomMap) {
                            this._footerDomMap = {};
                        }
                        this._footerDomMap[item.key] = {index: domEl.length, dom: ""};
                        domEl.push(domItem);
                    }
                    else if (this._footerDomMap && item.parentFooter && this._footerDomMap[item.parentFooter]) {
                        parentIndex = this._footerDomMap[item.parentFooter].index;
                        if (this._footerDomMap[item.parentFooter].dom === "") {
                            domEl[parentIndex].append($("<div/>").addClass("footer-kid-container"));
                            this._footerDomMap[item.parentFooter].dom = domEl[parentIndex];
                        }

                        parentDomEl = this._footerDomMap[item.parentFooter].dom;

                        parentDomEl.find(".footer-kid-container").append(domItem.clone(true).addClass("footer-kid"));
                        domEl[parentIndex] = parentDomEl;
                    }

                    else {
                        domEl.push(domItem);
                    }
                }
            }
            if (domEl.length) {
                dom.append(domEl);
            }
            container.empty().append(dom.children());
            // only bind an event listener if needed
            if (hasActionItem) {
                this.connect(container.find("." + itemClass + " a[data-action]"), "click.linkItemAction",
                    function(evt) {
                        evt.preventDefault();
                        var action = $(evt.target).attr("data-action");
                        if (action) {
                            this.dispatchEvent(actionEventName, action, true);
                        }
                    }.bind(this));
            }
        },

        pushBreadcrumb : function(breadcrumb) {
            if (this._breadcrumbs) {
                this._breadcrumbs.pushBreadcrumb(breadcrumb);
            }
            else {
                // keep a ref to any breadcrumbs pushed before the breadcrumbs are created
                if (!this._breadcrumbsToPush) {
                    this._breadcrumbsToPush = [];
                }
                this._breadcrumbsToPush.push(breadcrumb);
            }
        },

        popBreadcrumb : function() {
            if (this._breadcrumbs) {
                this._breadcrumbs.popBreadcrumb();
            }
        },

        replaceLastBreadcrumb : function(breadcrumb) {
            if (this._breadcrumbs) {
                this._breadcrumbs.replaceLastBreadcrumb(breadcrumb);
            }
        },

        updateLastBreadcrumbTitle : function(newTitle) {
            if (this._breadcrumbs) {
                this._breadcrumbs.updateLastBreadcrumbTitle(newTitle);
            }
        },

        onTemplateNodesAttached : function(nodes) {
            this._super.apply(this, arguments);
            // let the nav controller know when the app view container is ready
            if (nodes && nodes.appViewContainer) {
                this.notifyDelegate("appViewContainerReady", nodes.appViewContainer);
            }

            this._renderTitles();
            this._renderBreadcrumbs();
            this._renderProfileMenu();
            this._renderUserImage();
            this._renderFooter();
            this._bindFilterToggleEvents();
            this._bindMenuToggleEvents();

            if (this._lastVisibleNotificationList) {
                this.updateNotifications(this._lastVisibleNotificationList);
                delete this._lastVisibleNotificationList;
            }

            this._startupTime = new Date().getTime();
        },

        addWidget : function(widget) {
            // intecept widgets as they are added to see if we need to watch them for data visiblity
            if (widget && (widget instanceof SelectionList || widget instanceof Select)) {
                if (widget.minVisibleItems > 0) {
                    widget.on("toggleDataVisible", this._handleToggleFilterVisible.bind(this, widget._key));
                }
                // add a change event for all filters
                widget.on("change", this._handleFilterValueChange.bind(this, widget));
            }
            return this._super.apply(this, arguments);
        },

        createWidgetContainer : function(widgetKey, parentContainer, widgetProperties, index) {
            var container = this._super.apply(this, arguments);
            if (index !== null && index !== undefined) {
                container.attr("data-index", index);
            }
            return container;
        },

        _handleToggleFilterVisible : function(filter, visible) {
            if (!this._filterDataVisibleMap) {
                this._filterDataVisibleMap = {};
            }
            this._filterDataVisibleMap[filter] = visible;
            this._checkFilterDataVisibility();
        },

        _handleFilterValueChange : function(filter, newValue, userInitiated) {
            if (this._filterResizeCallback) {
                this._filterResizeCallback();
            }
        },

        _checkFilterDataVisibility : function() {
            if (this._visibleFilterMap) {
                var key, filterWidget;
                for (key in this._visibleFilterMap) {
                    if (key && this._visibleFilterMap[key] && (!this._filterDataVisibleMap ||
                        !this._filterDataVisibleMap.hasOwnProperty(key) || this._filterDataVisibleMap[key])) {
                        filterWidget = this.getWidget(key);
                        if (filterWidget && this.NAV_WIDGET_TYPES[filterWidget._type] && (!filterWidget.isDataVisible ||
                            filterWidget.isDataVisible())) {

                            this.showNavFilters();
                            // TODO this should just show/hide the button
                            return;
                        }
                    }
                }
            }
            this.hideNavFilters();
        },

        _renderTitles : function() {
            if (this.title) {
                this.setTitle(this.title);
            }
            if (this.viewTitle) {
                this.setViewTitle(this.viewTitle);
            }
            if (this.subTitle) {
                this.setSubTitle(this.subTitle);
            }
        },

        _bindFilterToggleEvents : function() {
            if (this.attachPoints && this.attachPoints.filterToggle && this.viewAttachPoints && this.viewAttachPoints.filterClose) {
                this.connect(this.attachPoints.filterToggle, "click.filterToggle keypress.filterToggle", function(evt) {
                    if (!accessibilityUtil.clicked(evt)) {
                        return;
                    }
                    if (this.attachPoints.primaryViewFilters) {
                        var heightOffset = this.attachPoints.primaryViewFilters.height();
                        this.attachPoints.viewContent.css({
                            "top" : heightOffset,
                            "max-height" : $(window).height() - (this.attachPoints.primaryViewFilters.offset().top + heightOffset + 20)
                        });
                    }
                    this._showMenu(this.attachPoints.viewContent, null);
                }.bind(this));
                this.connect(this.viewAttachPoints.filterClose, "click.filterClose keypress.filterClose", function(evt) {
                    if (!accessibilityUtil.clicked(evt)) {
                        return;
                    }
                    this._hideMenu(this.attachPoints.viewContent, null);
                }.bind(this));
            }
        },

        _bindMenuToggleEvents : function() {
            if (this.attachPoints && this.attachPoints.navMenuMoreToggle && this.attachPoints.navMenuMoreContainer) {
                this.connect(this.attachPoints.navMenuMoreToggle, "click.menuToggle keypress.menuToggle", function(evt) {
                    if (!accessibilityUtil.clicked(evt)) {
                        return;
                    }
                    var menuStateChangeCallback = function(visible) {
                        this._navMenuVisible = visible;
                    }.bind(this);
                    if (this.attachPoints.navMenuMoreContainer.hasClass("menu-visible")) {
                        this._hideMenu(this.attachPoints.navMenuMoreContainer, menuStateChangeCallback);
                    }
                    else {
                        this._showMenu(this.attachPoints.navMenuMoreContainer, menuStateChangeCallback);
                    }
                }.bind(this));
            }
        },

        _hideNavMenuMore : function() {
            if (this.attachPoints && this.attachPoints.navMenuMoreContainer && this.attachPoints.navMenuMoreToggle) {
                this.attachPoints.navMenuMoreContainer.removeClass("menu-visible");
            }
        },

        _showMenu : function(menuAttachPoint, menuStateChangeCallback) {
            if (menuAttachPoint) {
                menuAttachPoint.removeClass("hidden");
                this.attachPoints.menuLayer.css("opacity", 1);
                $("body").addClass("menu-layer-visible");
                // wait for the hidden class to be fully removed before showing
                setTimeout(function() {
                    menuAttachPoint.addClass("menu-visible");
                }, 1);

                var closeClickTargets = this.attachPoints.menuLayer.add(menuAttachPoint.find(".slide-in-menu-close"));

                if (menuStateChangeCallback && menuStateChangeCallback.apply) {
                    menuStateChangeCallback(true);
                }

                this._closeMenuListener = this.connect(closeClickTargets, "click.menuLayer keypress.menuLayer", function(evt) {
                    if (!accessibilityUtil.clicked(evt)) {
                        return;
                    }
                    this._hideMenu(menuAttachPoint, menuStateChangeCallback);
                }.bind(this));

            }
        },

        _hideMenu : function(menuAttachPoint, menuStateChangeCallback) {
            if (menuAttachPoint) {
                this.attachPoints.menuLayer.css("opacity", 0);
                setTimeout(function() {
                    $("body").removeClass("menu-layer-visible");
                    menuAttachPoint.addClass("hidden");
                }, 250);
                menuAttachPoint.removeClass("menu-visible");
                if (menuStateChangeCallback && menuStateChangeCallback.apply) {
                    menuStateChangeCallback(false);
                }
            }
            if (this._closeMenuListener) {
                this.disconnect(this._closeMenuListener);
                delete this._closeMenuListener;
            }
        },

        _connectWidgetEvents : function(widget, widgetData) {
            // called from base class when creating widgets
            // override when a widget data species just in time loading to wait for the widget to be needed
            // TODO this may become the default in the future
            if (widget) {
                if (widgetData && widgetData.justInTimeLoading) {
                    this._overrideFilterWidgetGetData(widget, widget.dataStore);
                }
            }
            this._super.apply(this, arguments);
        },

        _overrideFilterWidgetGetData : function(widget, dataStore) {
            // override the default get data method for the filter widgets to delay doing so until
            // a view is shown that requires it
            if (widget && dataStore && dataStore.getData) {
                var oldGetData = dataStore.getData;

                dataStore.getData = function() {
                    // determine if this filter is used in any view on the stack; if so we can now get its data
                    var filters = this.delegate && this.delegate._getBoundPropertiesOnStack ?
                        this.delegate._getBoundPropertiesOnStack() : {};
                    filters = $.extend({}, this._visibleFilterMap, filters);

                    if (filters && filters[widget._key]) {
                        oldGetData.apply(dataStore, arguments);
                        if (this._cachedGetDataArgs) {
                            delete this._cachedGetDataArgs[widget._key];
                        }
                    }
                    else {
                        // otherwise cache the data until later
                        if (!this._cachedGetDataArgs) {
                            this._cachedGetDataArgs = {};
                        }
                        this._cachedGetDataArgs[widget._key] = arguments;
                    }
                }.bind(this);
            }
        },

        updateUserInfo : function(user) {
            this.userName = user.formattedName || user.userName || "";
            this.userLogin = user.userName || "";
            this.userEmail = user.email || "";
            this.userInfo = (user.lastLogin ? "Last Login: " + moment(user.lastLogin).format("llll") : "");

            if (this.setUserEmail) {
                this.setUserEmail(this.userEmail);
            }
            if (this.setUserName) {
                this.setUserName(this.userName);
            }
            if (this.setUserInfo) {
                this.setUserInfo(this.userInfo);
            }
            this._renderUserImage();
            if (this._menuResizeCallback) {
                this._menuResizeCallback();
            }
        },

        _renderUserImage : function() {
            // note user image is not included in print layout to avoid potential errors with this API and bc it is not shown
            if (this.userLogin && this.attachPoints && this.attachPoints.userImage && !window.Modernizr.printlayout && !this.userImage) {
                this.userImage = this.attachPoints.userImage.attr("src", url.PREMIER_CONNECT_PROFILE_API() + this.userLogin);
            }
        },

        _handleNavSettingsOptionClick : function(evt) {
            // only continue for click style events from the keyboard
            if (!accessibilityUtil.clicked(evt)) {
                return;
            }
            var target = $(evt.target).closest(".nav-menu-item"),
                key = target.data("option-key"),
                hasChildren = false;
            evt.stopPropagation();
            if (key && this.visibleMenuOptions && this.visibleMenuOptions[key]) {
                var option = this.visibleMenuOptions[key];
                if (option) {
                    this._selectedNavMenuOption = option;
                    if (option.action && option.action !== true) {
                        this.notifyDelegate("shouldTakeMenuOptionAction", option);
                        this.dispatchEvent("menuOptionSelected", option, true);
                    }
                    else if (option._children) {
                        hasChildren = true;
                        this._toggleNavSettingsOptionChildrenMenu(option, target, !this._menuOptionChildMenuVisible);
                    }
                    if (!hasChildren) {
                        this._updateNavMenuOptionSelection();
                    }
                }
            }

            if (!hasChildren) {
                if (this.attachPoints && this.attachPoints.mainMenu) {
                    this._hideMenu(this.attachPoints.mainMenu, null);
                }
                this._hideNavMenuMore();
            }
        },

        _toggleNavSettingsOptionChildrenMenu : function(option, target, show) {
            if (option && option._key && option._children && this._menuOptionNodes[option._key]) {
                if (target && $.contains(this.attachPoints.navMenuMore[0], target[0])) {
                    if (!target.hasClass("nav-menu-option-kid")) {
                        target.toggleClass("nav-menu-option-child-menu-visible");
                    }
                    return;
                }

                this._menuOptionChildMenuVisible = show;

                if (this._menuOptionChildMenuVisible) {
                    if (target) {
                        if (this._lastNavSettingsOptionChildMenuParentTarget) {
                            this._lastNavSettingsOptionChildMenuParentTarget.removeClass("nav-menu-option-child-menu-visible");
                        }
                        this._lastNavSettingsOptionChildMenuParentTarget = target;
                        target.toggleClass("nav-menu-option-child-menu-visible");
                    }
                    var childMenuParentNode = target.closest(".nav-menu-parent-container");
                    if (!this._menuOptionChildMenu) {
                        this._menuOptionChildMenu = $("<div/>").addClass("nav-menu-option-child-menu be-gone");
                        childMenuParentNode.append(this._menuOptionChildMenu);
                    }
                    else {
                        this._menuOptionChildMenu.addClass("hidden").empty();
                    }

                    var i = 0, child;
                    for (i; i < option._children.length; i++) {
                        child = option._children[i];
                        if (child && child._key && this._menuOptionNodes[child._key]) {
                            this._menuOptionChildMenu.append(this._menuOptionNodes[child._key]);
                        }
                    }
                    var parentNode = this._menuOptionNodes[option._key];

                    this._childMenuResizeCallback = function() {
                        if (this.attachPoints && target && $.contains(this.attachPoints.navMenuOptions[0], target[0])) {
                            var position = parentNode.position();
                            this._menuOptionChildMenu.css({
                                "top" : Math.round(parentNode.outerHeight()),
                                "left" : Math.round(position.left),
                                "min-width" : target && target.outerWidth ? Math.round(target.outerWidth()) : 0
                            });
                        }
                        else {
                            this._toggleNavSettingsOptionChildrenMenu(option, target, false);
                        }
                    }.bind(this);
                    this._childMenuResizeCallback();
                    this._menuOptionChildMenu.removeClass("hidden");

                    // bind the click event listener to the items in the menu
                    this._navMenuItemChildClickListener = this.connect(this._menuOptionChildMenu.find(".nav-menu-item"),
                        "click.navMenuItem.child keypress.navMenuItem.child", this._handleNavSettingsOptionClick.bind(this));

                    // listen for clicks anywhere to hide this menu if it is open
                    setTimeout(function() {
                        this._menuOptionChildMenu.removeClass("be-gone");

                        if (!this._menuOptionChildMenuVisibleClickHandler) {
                            this._menuOptionChildMenuVisibleClickHandler = function(evt) {
                                var regTarget = $(evt.target).closest(".nav-menu-item");
                                if (regTarget && regTarget.length > 0) {
                                    this._handleNavSettingsOptionClick(evt);
                                }

                                if (this._menuOptionChildMenuVisibleClickHandler) {
                                    document.removeEventListener("click", this._menuOptionChildMenuVisibleClickHandler, true);
                                    delete this._menuOptionChildMenuVisibleClickHandler;
                                }
                                this._hideNavSettingsOptionChildrenMenu();
                            }.bind(this);
                            document.addEventListener("click", this._menuOptionChildMenuVisibleClickHandler, true);
                        }
                    }.bind(this), 1);
                }
            }
        },

        _hideNavSettingsOptionChildrenMenu : function() {
            this._menuOptionChildMenuVisible = false;
            if (this._lastNavSettingsOptionChildMenuParentTarget) {
                this._lastNavSettingsOptionChildMenuParentTarget.removeClass("nav-menu-option-child-menu-visible");
                delete this._lastNavSettingsOptionChildMenuParentTarget;
            }
            delete this._childMenuResizeCallback;
            this._menuOptionChildMenu.addClass("be-gone");
            setTimeout(function() {
                this._menuOptionChildMenu.addClass("hidden").empty();
            }.bind(this), 250);
            if (this._navMenuItemChildClickListener) {
                this.disconnect(this._navMenuItemChildClickListener);
                delete this._navMenuItemChildClickListener;
            }
            if (this._menuOptionChildMenuVisibleClickHandler) {
                this.disconnect(this._menuOptionChildMenuVisibleClickHandler);
                delete this._menuOptionChildMenuVisibleClickHandler;
            }
        },

        _renderBreadcrumbs : function() {
            if (this.siteConfig && this.attachPoints && this.attachPoints.breadcrumbContainer && !this._breadcrumbs) {
                var data = [{
                    title : this.logoTooltip,
                    url : url.PREMIER_CONNECT()
                }];
                if (this._breadcrumbsToPush && this._breadcrumbsToPush.length > 0) {
                    data = data.concat(this._breadcrumbsToPush);
                }
                delete this._breadcrumbsToPush;
                this._breadcrumbs = this.addWidget(new Breadcrumbs({
                    data : data
                }, this.attachPoints.breadcrumbContainer));
                this._breadcrumbs.on("breadcrumbClick", this._handleBreadcrumbClick.bind(this));
            }
        },

        _handleBreadcrumbClick : function(data) {
            this.notifyDelegate("onBreadcrumbClick", data);
        },

        getDeepLinkParams : function() {
            // returns the deep link params for the currently visible view
            var view = this._selectedView;
            if (view && view.getDeepLinkParams) {
                return view.getDeepLinkParams();
            }
            return {};
        },

        onWindowResize : function(winSize) {
            this._handleHeaderResize();
            this.dispatchEvent("windowResize", winSize, true);
        },

        _handleHeaderResize : function() {
            // batch resizes by using a countdown
            /*if (this._headerResizeCountdown) {
             clearTimeout(this._headerResizeCountdown);

             }
             this._headerResizeCountdown = setTimeout(function() {
             */
            if (this._filterResizeCallback) {
                this._filterResizeCallback();
            }
            if (this._menuResizeCallback) {
                this._menuResizeCallback();
            }
            //}.bind(this), 10);
        }

    });
});