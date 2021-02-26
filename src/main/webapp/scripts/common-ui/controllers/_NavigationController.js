define([
    "jquery",
    "common-ui/controllers/_Controller",
    "common-ui/views/_NavigationView",
    "common-ui/views/_ModalView",
    "common-ui/models/Header",
    "common-ui/widgets/utils/analytics",
    "common-ui/widgets/utils/templateUtil",
    "common-ui/widgets/SessionTimer",
    "common-ui/models/utils/widgetDataUtil",
    "common-ui/widgets/utils/metadataUtil",
    "common-ui/widgets/utils/notificationUtil",
    "common-ui/widgets/utils/formUtil",
    "common-ui/widgets/utils/topic",
    "common-ui/widgets/utils/browserDetectUtil",
    "common-ui/widgets/utils/url"
], function($, _Controller, NavigationView, _ModalView, HeaderModel, analytics, templateUtil, SessionTimer,
            widgetDataUtil, metadataUtil, notificationUtil, formUtil, topic, browserDetectUtil, url) {

    "use strict";

    var METADATA_DEFAULT_WIDGET_PROPERTIES = "defaultWidgetProperties",
        METADATA_MENU_OPTIONS = "menuOptions",
        METADATA_NAVIGATION = "filters",
        METADATA_BINDINGS = "widgetBindings",
        METADATA_TARGET_VALUES = "targetValues",
        METADATA_VIEWS = "views",
        METADATA_IS_PROD = "isProd",
        METADATA_INITIAL_PATH = "initialPath",
        METADATA_ENABLE_GET_REDIRECT = "enableGetRedirect",
        METADATA_CONTROLLER_STARTUP = "_startup_",
        METADATA_URL_HELP = "help_url",
        METADATA_URL_LOGOUT = "logout_url",
        METADATA_URL_LOGOUT_LABEL = "logout_label",
        METADATA_URL_PC = "premierconnect_url",
        METADATA_URL_TOOLTIP = "logo_tooltip",
        METADATA_URL_CONFIRM_MESSAGE = "logout_confirmation",
        METADATA_APP_TITLE = "app_title",
        METADATA_APP_TITLE_MARKUP = "app_title_markup",
        METADATA_GLOBAL_FIXTURES = "fixtures",
        METADATA_ERROR_MESSAGE_GENERIC = "errorMessageGeneric",
        METADATA_ERROR_MESSAGE_NO_ACCESS = "errorMessageNoAccess",
        METADATA_SITE_CONFIG = "siteConfig",
        METADATA_TITLES_CONTAIN_SAFE_MARKUP = "titlesContainSafeMarkup",
        METADATA_HAS_NOTIFICATION_SETTINGS = "hasNotificationSettings",
        METADATA_PDF_DEFAULT_NO_COVER_PAGE = "pdfDefaultNoCoverPage",
        LOGOUT_URL_DEFAULT = "/pkmslogout",
        MENU_OPTION_ACTION_NOTIFY = "_action_",
        MENU_OPTION_BACK = "_back_",
        EXPORT_EXCEL_BASE_URL = "services/export/",
        EXPORT_PDF_CONTEXT = "/",
        STARTUP_PARAM_HASH = "__hash__";

    return _Controller.extend({

        viewConstructor : NavigationView,
        sessionTimerConfig : null,
        // navSettings: Array
        //      an array of objects containing settings options
        navSettings : null,

        // controllers: Object
        //      a map of controller constructors to be used rather than the default;
        //      specify this if you want to provide your own implementation for dynamically instantiated views
        //      e.g. {myControllerId : MyController}
        controllers : null,

        // customWidgetConstructors: Object
        //      a map of widget constructors to be used for substitutions or custom use cases
        //      e.g. {CoolWidget : MyCoolWidget}
        customWidgetConstructors : null,

        // serviceMappers: Object
        //      a map of service mappers used to transform widget data before being set on a widget
        //      e.g. {myMapper : myMapper} where myMapper is a require'd module with a mapObject method or a function
        serviceMappers : null,

        // serviceRequestFilters: Object
        //      a map of service request filters used to transform a request before a service request is sent
        //      e.g. {myRequestFilter : myRequestFilter} where myRequestFilter is a require'd module with a filterRequest method or a function
        serviceRequestFilters : null,

        // modals: Object
        //      a map of modal constructors to be used rather than the default;
        //      specify this if you want to provide your own implementation for dynamically instantiated modals
        //      e.g. {myModalId : MyModal}
        modals : null,

        // startupViewParamName: String
        //      the prefix for the startup view used for deep linking (e.g. ?v=viewName)
        startupViewParamName : "v",

        defaultNotificationsPollingInterval: 300000,
        initialNotificationLoadDelay : 500,

        _baseUrl : "",

        // validResponseCodes: Array of Number
        //      response codes that will not be treated as failure (in addition to 200)
        validResponseCodes : null,

        hideLoadingIndicator : false,

        singleNotificationVisible : false,

        headerModel : new HeaderModel(),

        init : function(options) {
            this._parseAppConfig(options ? options.appConfig : null);

            this._viewControllers = [];

            var _super = this._super,
                args = arguments;

            // delay bootstrapping until the dom is ready
            $(document).ready(function() {

                //To update viewport meta tag based on the device type
                if( browserDetectUtil.isMobileDevice() ) {
                    $('#viewportmeta').attr("content","user-scalable=no, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, width=device-width");
                }

                // nav controllers always start up on the app node
                this.containerNode = $("#app");

                var cwc = options && options.customWidgetConstructors ?
                    options.customWidgetConstructors : this.customWidgetConstructors;
                if (cwc) {
                    metadataUtil.setCustomWidgetConstructors(cwc);
                }
                var sm = options && options.serviceMappers ?
                    options.serviceMappers : this.serviceMappers;
                if (sm) {
                    widgetDataUtil.setServiceMappers(sm);
                }

                if (window.metadata && window.metadata[METADATA_IS_PROD]) {
                    url.setIsProd(String(window.metadata[METADATA_IS_PROD]).toLowerCase() === "true");
                }
                delete options.appConfig;

                _super.apply(this, args);
                if (this.viewTitle) {
                    this.setViewTitle(this.viewTitle);
                }
                // bootstrapping:
                this._startup();
            }.bind(this));
        },

        setViewTitle : function(title) {
            if (title) {
                this.viewTitle = title;
                this._super.apply(this, arguments);
                // set the view title
                if (title) {
                    var docTitle = templateUtil.htmlDecode(title);
                    document.title = docTitle;
                    // store as a data val on the doc in case needed later
                    $(document).data("title", docTitle);
                }
            }
        },

        _startup : function() {
            this._startRouter();
            this._modernize();
            this._interceptAjaxRequests();
            this._startSessionTimer();
            this._startAnalyticsTracking();

            this._baseUrl = this.appConfig.baseUrl || "";
            var globalFixtures = String(this.appConfig.fixtures).toLowerCase() === "true";
            if (this.view && globalFixtures) {
                this.view.setGlobalFixtures(globalFixtures);
            }

            if (this.headerModel) {
                // mixin the static model props used by all models
                this.headerModel.setConfig({
                    fixtures : globalFixtures,
                    baseHostname : this.appConfig.projectContext,
                    validResponseCodes : this.appConfig.validResponseCodes || this.validResponseCodes,
                    baseUrl : this._baseUrl,
                    startupParams : this._startupParams,
                    hideLoadingIndicator : this.hideLoadingIndicator,
                    serviceRequestFilters : this.serviceRequestFilters
                });

                // get the user info and metadata
                this._getUserInfo();
                this._getMetadata();
                if (String(this.appConfig.appNotifications).toLowerCase() === "true" && !window.Modernizr.printlayout) {
                    this._handleAppNotifications([]);
                    this._getAppNotifications();

                    setInterval(this._getAppNotifications.bind(this), this.defaultNotificationsPollingInterval);
                }
            }

            else {
                if (window.console && typeof window.console.error === "function") {
                    console.error("There must be a headerModel defined in the NavigationController!");
                }
            }

            $(document).bind("hideNotification", function(evt, notification) {
                if (this.view && this.view.hideNotification && notification && notification.data && notification.data.message) {
                    this.view.hideNotification(notification.data.message, notification.data.type, notification.dismissable);
                }
            }.bind(this));
            $(document).bind("showNotification", function(evt, notification) {
                if (this.view && this.view.showNotification && notification && notification.data && notification.data.message) {
                    this.view.showNotification(notification.data.message, notification.data.type, notification.dismissable, null, notification.ephemeral);
                }
            }.bind(this));
            $(document).bind("showErrorNotification", function() {
                if (this.view && this.view.showNotification) {
                    this.view.showNotification(notificationUtil.getErrorMessageGeneric());
                }
            }.bind(this));

            if (!this.started) {
                this.started = true;
                this._tryStartup();
                if (this.view) {
                    this.view.dispatchEvent("appStartup");
                }
            }
        },

        _isDeepLinkEnabled : function() {
            return this._isPrintLayout() || (this._startupParams && this._startupParams._deepLink);
        },

        _isPrintLayout : function() {
            return this._startupParams && String(this._startupParams.printLayout).toLowerCase() === "true";
        },

        _isPrintLayoutLandscape : function() {
            return this._isPrintLayout() && this._startupParams && String(this._startupParams.landscape).toLowerCase() === "true";
        },

        _isPrintLayoutNoCoverPage : function() {
            return this._isPrintLayout() && this._startupParams && String(this._startupParams.coverpage).toLowerCase() === "false";
        },

        _startRouter : function() {
            this._startupParams = formUtil.getQueryStringParams();
            if (!$.isEmptyObject(this._startupParams)) {
                this._startupParams._deepLink = true;
            }

            // if a query param of ?v=viewName is detected (where v is the value of startupViewParamName), this enables deep-linking
            if (this._startupParams[this.startupViewParamName]) {
                this._startupParams[STARTUP_PARAM_HASH] = this._startupParams[this.startupViewParamName];
                this._startupParams._deepLink = true;
            }

            // convert the startup widget data into a map used for deep linking if applicable
            var startupWidgetData = this._isDeepLinkEnabled() && this._startupParams
                ? $.extend({}, this._startupParams) : null;
            if (startupWidgetData) {
                // remove unnecessary params from the startup widget data
                delete startupWidgetData[this.startupViewParamName];
                delete startupWidgetData[STARTUP_PARAM_HASH];
                delete startupWidgetData._deepLink;
                delete startupWidgetData.printLayout;
                // convert the map to a query so we can convert it back using a better util
                var startupWidgetDataQuery = templateUtil.decodeParam(formUtil.convertMapToQuery(startupWidgetData), true);
                this._deepLinkStartupWidgetData = formUtil.convertQueryToMap(startupWidgetDataQuery, true, true);
            }


            setTimeout(function() {
                $(window).on("popstate.router", function(evt) {
                    if (evt && evt.originalEvent && evt.originalEvent.state) {
                        this._routerStateChanged(evt.originalEvent.state);
                    }
                }.bind(this));
            }.bind(this), 250);
        },

        _modernize : function() {
            // modernize
            window.Modernizr.addTest('printlayout', function () {
                // TODO should this be a cookie or user agent instead of a query string param?
                return this._isPrintLayout();//!!navigator.userAgent.match(/PrintLayout/i);
            }.bind(this));
            window.Modernizr.addTest('printlayout-landscape', function () {
                // TODO should this be a cookie or user agent instead of a query string param?
                return this._isPrintLayoutLandscape();
            }.bind(this));
            window.Modernizr.addTest('printlayout-nocoverpage', function () {
                // TODO should this be a cookie or user agent instead of a query string param?
                return this._isPrintLayoutNoCoverPage();
            }.bind(this));
            window.Modernizr.addTest('is-ie', function () {
                return !window.Modernizr || !window.Modernizr.canvas;
            });
            window.Modernizr.addTest("advanced-upload", function() {
                var div = document.createElement('div');
                return ((div.draggable !== undefined) || (div.ondragstart !== undefined && div.ondrop !== undefined))
                    && window.FormData !== undefined && window.FileReader !== undefined;
            });
            window.Modernizr.load({
                test: window.Modernizr.printlayout,
                yep : 'css/print.css',
                complete : function() {
                    if (window.Modernizr.printlayout) {
                        this._printModernizd = true;
                        this._tryStartup();
                    }
                }.bind(this)
            });
        },

        _interceptAjaxRequests : function() {
            // intercept ajax requests to show/hide loading indicator as needed
            this._activeAjaxRequests = 0;
            this._loadingVisible = false;

            $(document)
                .bind("ajaxRequest.start delayedRender.start", this._handleAsyncRequestStart.bind(this))
                .bind("ajaxRequestComplete.finish delayedRenderComplete.finish", this._handleAsyncRequestComplete.bind(this));
        },

        _handleAsyncRequestStart : function(evt, reqUrl, skipShowLoading) {
            if (!skipShowLoading) {
                window.statusLoadingComplete = false;

                this._activeAjaxRequests++;
                if (this.view && !this._loadingVisible) {
                    this._loadingVisible = true;
                    this.view.showLoading();
                }
            }
        },

        _handleAsyncRequestComplete : function(evt, reqUrl, skipShowLoading) {
            // wait to ensure another request isn't coming right behind this one
            var delay = 50;
            if (!skipShowLoading) {
                this._activeAjaxRequests--;
            }
            setTimeout(function() {
                if (this._activeAjaxRequests <= 0) {
                    this._activeAjaxRequests = 0;

                    if (this.view && this._loadingVisible) {
                        this.view.hideLoading();
                        this._loadingVisible = false;
                    }

                    window.statusLoadingComplete = true;

                    if (this._lastAnalyticsEventInfo && this._lastAnalyticsEventInfo.handler) {
                        this._lastAnalyticsEventInfo.handler(this._getAnalyticsFilters(this._lastAnalyticsEventInfo.excludeFilter),
                            this._lastAnalyticsEventInfo.startTime, Date.now() - delay);
                        this._lastAnalyticsEventInfo = null;
                    }
                }
            }.bind(this), delay);
        },

        _startSessionTimer : function() {
            var sessionTimerConfig = this.sessionTimerConfig || {};
            // disable session timer for localhost
            if (window.location.hostname.indexOf("localhost") >= 0) {
                sessionTimerConfig.disabled = true;
            }
            this.sessionTimer = new SessionTimer(sessionTimerConfig);
            $(document).bind("sessionTimeout", this.shouldLogout.bind(this));
        },

        _startAnalyticsTracking : function() {
            // start analytics tracking
            if (!window.Modernizr.printlayout && !this.appConfig.noAnalytics && this.appConfig.projectName && this.appConfig.projectContext) {
                analytics.init(this.appConfig.projectName, this.appConfig.projectContext);
            }
        },

        _parseAppConfig : function(appConfig) {
            this.appConfig = appConfig && appConfig !== null && typeof appConfig !== "undefined"
                ? (typeof appConfig === "object" ? appConfig : ($.parseJSON(appConfig) || {})) : {};
            this.viewId = this.appConfig.appModuleName;
        },

        _getUserInfo : function() {
            if (window.userInfo && !$.isEmptyObject(window.userInfo)) {
                this._handleUserInfo(window.userInfo);
            }
            else {
                this.headerModel.getUserInfo()
                    .done(this._handleUserInfo.bind(this))
                    .fail(function() {
                        // TODO can this fail silently? right now we just show their name
                    });
            }
        },

        _getAppNotifications : function() {
            setTimeout(function() {
                this.headerModel.getAppNotifications()
                    .done(this._handleAppNotifications.bind(this))
                    .fail(function () {
                        // TODO can this fail silently? right now we just show their name
                    });
            }.bind(this), this.initialNotificationLoadDelay);
        },

        _getMetadata : function(startupCallback) {
            if (window.metadata && !$.isEmptyObject(window.metadata)) {
                this._handleMetadata(window.metadata);
            }
            else {
                this.headerModel.getModuleMetadata({
                    moduleId: this.appConfig.appModuleName,
                    queryParams: this._startupParams
                })
                    .done(this._handleMetadata.bind(this))
                    .fail(function () {
                        this.handleDataLoadError(notificationUtil.getErrorMessageGeneric());
                    }.bind(this));
            }
        },

        _handleUserInfo : function(data) {
            if (data && this.view) {
                this.view.updateUserInfo(data);
            }
        },

        _handleAppNotifications : function(data) {
            if (data && this.view) {
                this.view.updateNotifications(data, this.defaultNotificationsPollingInterval);
            }
        },

        _handleMetadata : function(data) {
            this._metadata = data || {};
            if (this._metadata[METADATA_IS_PROD]) {
                url.setIsProd(String(this._metadata[METADATA_IS_PROD]).toLowerCase() === "true");
            }
            if (this.view) {
                var siteConfig = {
                    logoTooltip : this._metadata[METADATA_URL_TOOLTIP],
                    logoUrl : this._metadata[METADATA_URL_PC],
                    helpUrl : this._metadata[METADATA_URL_HELP],
                    logoutLabel : this._metadata[METADATA_URL_LOGOUT_LABEL],
                    logoutUrl : this._metadata[METADATA_URL_LOGOUT],
                    logoutConfirmation : this._metadata[METADATA_URL_CONFIRM_MESSAGE],
                    titlesContainSafeMarkup : this._metadata[METADATA_TITLES_CONTAIN_SAFE_MARKUP]
                };
                // overlay siteConfig section which takes priority
                if (this._metadata[METADATA_SITE_CONFIG]) {
                    siteConfig = $.extend(siteConfig, this._metadata[METADATA_SITE_CONFIG]);
                    if (siteConfig[METADATA_ERROR_MESSAGE_GENERIC]) {
                        notificationUtil.setErrorMessageGeneric(siteConfig[METADATA_ERROR_MESSAGE_GENERIC]);
                        delete siteConfig[METADATA_ERROR_MESSAGE_GENERIC];
                    }
                    if (siteConfig[METADATA_ERROR_MESSAGE_NO_ACCESS]) {
                        notificationUtil.setErrorMessageNoAccess(siteConfig[METADATA_ERROR_MESSAGE_NO_ACCESS]);
                        delete siteConfig[METADATA_ERROR_MESSAGE_NO_ACCESS];
                    }
                }
                this.view.updateSiteConfig(siteConfig);

                if (this._metadata[METADATA_GLOBAL_FIXTURES] &&
                    String(this._metadata[METADATA_GLOBAL_FIXTURES]).toLowerCase() === "true" && this.headerModel) {
                    this.headerModel.addConfig(METADATA_GLOBAL_FIXTURES, true);
                    if (this.view) {
                        this.view.setGlobalFixtures(true);
                    }
                }
                if (this._metadata[METADATA_ENABLE_GET_REDIRECT] &&
                    String(this._metadata[METADATA_ENABLE_GET_REDIRECT]).toLowerCase() === "true" && this.headerModel) {
                    this.headerModel.addConfig(METADATA_ENABLE_GET_REDIRECT, true);
                }

                if (this._metadata[METADATA_APP_TITLE]) {
                    var title = this._metadata[METADATA_APP_TITLE],
                        viewTitle = this._metadata[METADATA_TITLES_CONTAIN_SAFE_MARKUP] === true ?
                            (this._metadata[METADATA_APP_TITLE_MARKUP] || title) : title;
                    this.setViewTitle(title);
                    this.view.setTitle(viewTitle);
                }
                if (this._metadata[METADATA_MENU_OPTIONS]) {
                    this.view.setMenuOptions(this._metadata[METADATA_MENU_OPTIONS]);
                }
                if (this._metadata[METADATA_DEFAULT_WIDGET_PROPERTIES]) {
                    this.view.setDefaultWidgetProperties(this._metadata[METADATA_DEFAULT_WIDGET_PROPERTIES]);
                }
                if (this._metadata.singleNotificationVisible) {
                    this.view.singleNotificationVisible = true;
                    this.singleNotificationVisible = true;
                }
                if (this._metadata.hasOwnProperty(METADATA_HAS_NOTIFICATION_SETTINGS)) {
                    this.view.hasNotificationSettings = !!this._metadata[METADATA_HAS_NOTIFICATION_SETTINGS];
                }
            }
            this._setMetadata(this._metadata, this._startupParams);
            this.onMetadataSet();
            this.notifyControllers("onMetadataSet");

            this._updateNavFiltersAndMenuOptions();

            this._metadataLoaded = true;
            this._tryStartup();
        },

        getViewMetadata : function() {
            // override to return the navigation view metadata
            var meta = this.getMetadataCache();
            if (meta) {
                return {
                    widgets : meta[METADATA_NAVIGATION] || {},
                    widgetBindings : meta[METADATA_BINDINGS] || null,
                    targetValues : meta[METADATA_TARGET_VALUES] || null,
                    viewContext : meta.viewContext || null,
                    viewContextIdentifierPath : meta.viewContextIdentifierPath || "",
                    hideLoadingIndicator : meta.hideLoadingIndicator
                };
            }
        },

        notifyControllers : function(methodName, data) {
            if (this._viewControllers && this._viewControllers.length > 0) {
                var i = 0, curr;
                for (i; i < this._viewControllers.length; i++) {
                    curr = this._viewControllers[i];
                    if (curr && curr[methodName] && curr[methodName].apply) {
                        curr[methodName].apply(curr);
                    }
                }
            }
        },

        pushViewController : function(viewController, hash, replaceCurrent) {
            if (viewController) {
                // take some ownership; #mine
                viewController.parentViewController = this;

                var currTVC = this.getTopViewController(),
                    prevTVC = null;
                
                if (!currTVC || !currTVC.canUnload || (currTVC.canUnload && currTVC.canUnload())) {
                    if (viewController.topLevel) {
                        while (this._viewControllers && this._viewControllers.length > 1) {
                            this.popViewController(true);
                        }
                        replaceCurrent = true;
                    }
                    if (replaceCurrent) {
                        this.popViewController(true, replaceCurrent);
                    }
                    else {
                        prevTVC = currTVC;
                        if (prevTVC) {
                            prevTVC._lastScrollTop = $(window).scrollTop();
                        }
                        if (prevTVC && prevTVC.onPlacedInBackground) {
                            prevTVC.onPlacedInBackground();
                        }
                    }

                    var isInitialView = this._viewControllers.length === 0;
                    this._viewControllers.push(viewController);

                    var newHash = "";
                    if (prevTVC || hash) {
                        viewController.__hash = viewController.viewId || hash;

                        // only get the state date if enabled
                        var routerStateData;
                        if (this._isPrintLayout() ||
                            (this._metadata[METADATA_SITE_CONFIG] && this._metadata[METADATA_SITE_CONFIG].deepLinkEnabled)) {
                            routerStateData = viewController.getViewStateMap ? viewController.getViewStateMap() : {};
                        }
                        newHash = formUtil.updateRouterState(viewController.__hash, !this._pushedFirstViewController, false,
                            routerStateData);
                        this._pushedFirstViewController = true;
                    }
                    this._setTopViewControllerContainerNode(isInitialView);
                    $(window).scrollTop(0);
                    if (this.view) {
                        var bc = viewController.breadcrumbTitle || viewController.viewTitle || "",
                            bcData = {title : bc, url : newHash || ""};
                        this.view.pushBreadcrumb(bcData);
                        // TODO need to know if this view was shown via an option.global and should reset the breadcrumbs
                        // if () { resetToBreadcrumb(bcData); }
                    }

                    setTimeout(function() {
                        // wait for the app to load for the first time
                        this._notMyFirstRodeo = true;
                        // analytics tracking
                        var analyticsViewChange = analytics.viewChange.bind(analytics, viewController.breadcrumbTitle);
                        if (!this._activeAjaxRequests) {
                            analyticsViewChange(this._getAnalyticsFilters());
                        }
                        else {
                            // cache it for later until all ajax requests are done so we know how long it took
                            this._lastAnalyticsEventInfo = {
                                handler : analyticsViewChange,
                                startTime : Date.now()
                            };
                        }
                    }.bind(this), this._notMyFirstRodeo ? 0 : 50);
                }
            }
        },

        popViewController : function(intermediate, replaceCurrent) {
            // only pop if there is more than 1
            if (this._viewControllers && ((replaceCurrent && this._viewControllers.length > 0) || this._viewControllers.length > 1)) {

                var prev = this.getTopViewController();

                if (prev && (!prev.canUnload || (prev.canUnload && prev.canUnload()))) {
                    prev = this._viewControllers.pop();
                    var newTVC = this.getTopViewController();

                    //TODO prev.setContainerNode($("<div></div>"), true);
                    if (prev.view) {
                        prev.view.detach();
                    }
                    if (prev.onPopped) {
                        prev.onPopped();
                    }
                    if (!intermediate) {
                        this._setTopViewControllerContainerNode();
                        var routerStateData;
                        if (this._isPrintLayout() ||
                            (this._metadata[METADATA_SITE_CONFIG] && this._metadata[METADATA_SITE_CONFIG].deepLinkEnabled)) {
                            routerStateData = newTVC.getViewStateMap ? newTVC.getViewStateMap() : {};
                        }
                        formUtil.updateRouterState(newTVC.__hash, replaceCurrent, false, routerStateData);
                    }
                    if (this.view) {
                        this.view.popBreadcrumb();
                    }
                    if (prev.destroyOnPop) {
                        prev.destroy();
                    }

                    if (!intermediate) {
                        setTimeout(function () {
                            if (newTVC && newTVC._lastScrollTop >= 0) {
                                // return to the previous scroll position
                                $(window).scrollTop(newTVC._lastScrollTop);
                                delete newTVC._lastScrollTop;
                            }
                            $(window).trigger("resize", {_forceUpdate: true});
                        }, 10);

                        // analytics tracking
                        analytics.viewChange(this._getCurrentViewTitle(), this._getAnalyticsFilters());
                    }
                    return true;
                }
            }
            return false;
        },

        didChangeFilter : function(filterName, newValue) {
            this.onFilterChange(filterName, newValue);

            var delay = 5;
            // used for analytics tracking of filter changes
            setTimeout(function() {
                if (this.view) {
                    var analyticsFilterChange = analytics.filterChange.bind(analytics, this._getCurrentViewTitle(), filterName, newValue);
                    if (!this._activeAjaxRequests) {
                        analyticsFilterChange(this._getAnalyticsFilters(filterName));
                    }
                    else {
                        // cache it for later until all ajax requests are done so we know how long it took
                        this._lastAnalyticsEventInfo = {
                            handler : analyticsFilterChange,
                            excludeFilter : filterName,
                            startTime : Date.now() - delay
                        };
                    }
                }
            }.bind(this), delay);

        },

        _getCurrentViewTitle : function() {
            var tc = this.getTopViewController();
            return tc ? tc.breadcrumbTitle : "";
        },

        appViewContainerReady : function(container) {
            this.appViewContainer = container;
            this._setTopViewControllerContainerNode(true);
        },

        getViewOptions : function() {
            return {
                viewClass : this.appConfig.appModuleName,
                getSelectedView : function() {
                    var tvc = this.getTopViewController();
                    return tvc ? tvc.view : null;
                }.bind(this)
            };
        },

        getTopViewController : function() {
            return this._viewControllers && this._viewControllers.length > 0 ?
                this._viewControllers[this._viewControllers.length - 1] : null;
        },

        getControllersOnStack : function() {
            return this._viewControllers || [];
        },

        _getAnalyticsFilters : function(exclude) {
            var filters = this._getFiltersOnStack();
            if (filters && exclude && filters[exclude]) {
                delete filters[exclude];
            }
            return filters;
        },

        _getBoundPropertiesOnStack : function() {
            var boundWidgetPlaceholdersOnStackMap = {},
                controllers = this.getControllersOnStack(),
                i = 0, curr;

            if (controllers && controllers.length > 0) {
                for (i; i < controllers.length; i++) {
                    curr = controllers[i];
                    if (curr && curr.view && curr.view.getBoundWidgetPlaceholderMap) {
                        $.extend(boundWidgetPlaceholdersOnStackMap, (curr.view.getBoundWidgetPlaceholderMap() || {}));
                    }
                }
            }
            return boundWidgetPlaceholdersOnStackMap;
        },

        _getFiltersOnStack : function(values, encode) {
            // returns all filters for controllers currently on the stack
            var allFiltersValueMap = this.view ? this.view.getFilterMap(values, encode) || {} : {},
                filterStackMap = {},
                controllers = this.getControllersOnStack(),
                i = 0, curr;

            if (controllers && controllers.length > 0) {
                for (i; i < controllers.length; i++) {
                    curr = controllers[i];
                    if (curr && curr.getMetadataFilters) {
                        $.extend(filterStackMap, (curr.getMetadataFilters() || {}));
                    }
                }
            }
            // filterStackMap now has an entry for only the filters in the map; get the values for each from the value map:
            var key;
            for (key in filterStackMap) {
                if (key && filterStackMap.hasOwnProperty(key)) {
                    filterStackMap[key] = allFiltersValueMap[key] !== null && allFiltersValueMap[key] !== undefined ?
                        allFiltersValueMap[key] : "";
                }
            }

            var keyVals;
            for (key in allFiltersValueMap) {
                if (key && allFiltersValueMap.hasOwnProperty(key)) {
                    keyVals = key.split(".");
                    if (keyVals && keyVals.length > 1 && filterStackMap.hasOwnProperty(keyVals[0])) {
                        filterStackMap[key] = allFiltersValueMap[key];
                    }
                }
            }
            return filterStackMap;
        },

        _setTopViewControllerContainerNode : function(isInitialView) {
            var topViewController = this.getTopViewController();
            if (topViewController && this.appViewContainer) {
                // hide notifications when changing views
                if (this.view && !isInitialView) {
                    this.view.hideNotification();
                }

                this.shouldSetViewTitle(topViewController.getViewTitle());
                this.shouldSetSubTitle(topViewController.getSubTitle());

                if (topViewController && topViewController.getViewDomNode()) {
                    if (this.view && !this.view.isIE()) {
                        topViewController.getViewDomNode().hide();
                    }
                    this.appViewContainer.append(topViewController.getViewDomNode());
                    if (this.view && !this.view.isIE()) {
                        topViewController.getViewDomNode().fadeIn();
                    }
                }
                else {
                    if (this.view && !this.view.isIE()) {
                        this.appViewContainer.hide();
                    }
                    topViewController.setContainerNode(this.appViewContainer);
                    if (this.view && !this.view.isIE()) {
                        this.appViewContainer.fadeIn();
                    }
                }

                if (this._viewControllers.length > 1) {
                    var prev = this._viewControllers[this._viewControllers.length - 2];
                    // TODO prev.setContainerNode($("<div></div>"), true);
                    if (prev && prev.view) {
                        prev.view.detach();
                    }
                }
                // update filters:
                this._updateNavFiltersAndMenuOptions();

                if (topViewController.onShown) {
                    topViewController.onShown();
                }
                if (topViewController.viewId) {
                    if (this._lastViewClass) {
                        $("body").removeClass(this._lastViewClass).addClass(topViewController.viewId);
                    }
                    else {
                        $("body").addClass(topViewController.viewId);
                    }
                    this._lastViewClass = topViewController.viewId;

                    if (this.view) {
                        if (this.view.onViewShown) {
                            this.view.onViewShown(topViewController.viewId, topViewController.getView ?
                                topViewController.getView() : null);
                        }
                        this.view.dispatchEvent("showView", {view : topViewController.viewId});
                    }
                    $(document).trigger("showView." + topViewController.viewId);
                }
            }
        },

        _updateNavFiltersAndMenuOptions : function() {
            var tvc = this.getTopViewController();
            if (this.view && tvc) {
                this.view.updateNavFilters(tvc.getMetadataFilters());
                this.view.updateNavMenuOptions(tvc.getMetadataMenuOptions());
            }
        },

        shouldExcelExport : function(widgetName) {
            this._export(EXPORT_EXCEL_BASE_URL, widgetName);
        },

        shouldPdfExportAll : function() {
            // shortcut to generate a pdf for all detail view filter options
            this.shouldPdfExport(null, true, false);
        },

        shouldPdfExportAllViews : function() {
            // shortcut to generate a pdf for all view container children (e.g. all tabs, not just the currently selected)
            this.shouldPdfExport(null, false, true);
        },

        shouldPdfExportAllValuesAndViews : function() {
            // shortcut to generate a pdf for all detail view filter options AND all view container children (e.g. all tabs)
            this.shouldPdfExport(null, true, true);
        },

        shouldPdfExport : function(evt, allValues, allContainerViews) {
            var tvc = this.getTopViewController(),
                tvcTitle = tvc ? tvc.viewTitle : "",
                hash = window.location.hash,
                viewId;

            if (hash && hash.indexOf("#") === 0) {
                hash = hash.replace("#", "");
                var hashPieces = hash.split("/");
                viewId = hashPieces[hashPieces.length - 1];
            }
            if (!viewId && tvc) {
                viewId = tvc.viewId;
            }

            var landscape =
                    tvc.getViewWidgetExportLandscape && tvc.getViewWidgetExportLandscape(allValues, allContainerViews) ? true : false,
                filterValueMap = this._getFilterValueMap(allValues, allContainerViews, true),
                optionWidgets = filterValueMap.widgets,
                optionFormInputs = [],
                additionalFormBindingArgs = "",
                additionalFormBindingArgsWithVals = "";

            if ((allValues || allContainerViews) && optionWidgets && !$.isEmptyObject(optionWidgets)) {
                var sortedOptionWidgets = templateUtil.getSortedWidgetArray(optionWidgets),
                    i = 0, optionWidget, isMultiple, val;

                if (sortedOptionWidgets && sortedOptionWidgets.length > 0) {
                    for (i; i < sortedOptionWidgets.length; i++) {
                        optionWidget = sortedOptionWidgets[i];
                        if (optionWidget) {
                            isMultiple = optionWidget.isViewContainer ? allContainerViews : allValues;
                            val = isMultiple ? optionWidget.value.split(",") : optionWidget.value;
                            optionFormInputs.push({
                                type : "select",
                                multiple : isMultiple,
                                name : optionWidget._key,
                                options : optionWidget.data,
                                label : optionWidget.label,
                                value : val,
                                required : true
                            });
                            additionalFormBindingArgs += "&" + optionWidget._key + "=${" + optionWidget._key + "}";
                            additionalFormBindingArgsWithVals += "&" + optionWidget._key + "=" + val;
                        }
                    }
                }
            }

            // remove the widget option data from the map before converting to a query
            delete filterValueMap.widgets;
            var filterValueQueryString = filterValueMap !== null ? formUtil.convertMapToQuery(filterValueMap) : "",
                pdfConfigurationQuery = "printLayout=true&landscape=${landscape}&coverpage=${coverpage}&v="
                    + viewId + "&" + filterValueQueryString + additionalFormBindingArgs,
                noCoverPageDefault = (this._metadata[METADATA_PDF_DEFAULT_NO_COVER_PAGE] &&
                    String(this._metadata[METADATA_PDF_DEFAULT_NO_COVER_PAGE]).toLowerCase() === "true") ||
                    (this._metadata[METADATA_SITE_CONFIG] && this._metadata[METADATA_SITE_CONFIG][METADATA_PDF_DEFAULT_NO_COVER_PAGE] &&
                    String(this._metadata[METADATA_SITE_CONFIG][METADATA_PDF_DEFAULT_NO_COVER_PAGE]).toLowerCase() === "true"),
                formInputs = [
                    {type : "hidden", name : "windowStatus", value : true},
                    {type : "hidden", name : "title", value : tvcTitle || this.viewTitle},
                    {type : "hidden", name : "query", value : "printLayout=true&landscape=" + landscape + "&coverpage="
                        + (!noCoverPageDefault) + "&v=" + viewId + "&" + filterValueQueryString + additionalFormBindingArgsWithVals},
                    {type : "radio", name : "landscape", label : "Orientation", required : true,
                        options : [
                            {value : false, label : "Portrait", selected : !landscape},
                            {value : true, label : "Landscape", selected : landscape}
                        ]},
                    {type : "checkbox", name : "coverpage", "selected" : !noCoverPageDefault, label : "Cover Page"}
                ].concat(optionFormInputs);

            if (!this._metadata[METADATA_VIEWS].pdfConfiguration) {
                this._pdfConfigurationFormBindingArgs = ["query", pdfConfigurationQuery];

                this._metadata[METADATA_VIEWS].pdfConfiguration = this._getPdfConfigurationViewMetadata(formInputs);
            }
            else if (this._pdfConfigurationForm) {
                // retain the reference to the form binding args and update the value each time based on the inputs
                if (this._pdfConfigurationFormBindingArgs && this._pdfConfigurationFormBindingArgs.length > 1) {
                    this._pdfConfigurationFormBindingArgs[1] = pdfConfigurationQuery;
                }
                this._pdfConfigurationForm.updateData({inputs : formInputs});
            }

            // show the view and cache a reference to it for future re-use
            this._instantiateAndShowView(this._metadata[METADATA_VIEWS].pdfConfiguration, "pdfConfiguration", null, null,
                function(newView) {
                    if (!this._pdfConfigurationForm && newView && newView.getWidget) {
                        this._pdfConfigurationForm = newView.getWidget("fireballPdfConfigurationForm");

                        // only send analytics event on submit
                        if (this._pdfConfigurationForm && this._pdfConfigurationForm.on) {
                            this._pdfConfigurationForm.on("submit", function() {
                                analytics.exportData(tvc.breadcrumbTitle, tvcTitle, "pdf");
                            }.bind(this));
                        }
                    }
            }.bind(this));
        },

        _getPdfConfigurationViewMetadata : function(formInputs) {
            return {
                title : "PDF Configuration",
                modal : true,
                hasFooter : false,
                width : 500,
                _key : "pdfConfiguration",
                widgetBindings : {
                    "fireballPdfConfigurationForm" : {
                        event : "submit",
                        action : "hide"
                    }
                },
                widgets : {
                    fireballPdfConfigurationForm : {
                        _key : "fireballPdfConfigurationForm",
                        index : 1,
                        widgetType : "Form",
                        widgetBindings : {
                            "this" : {
                                event : "formChange",
                                query : "changedInputName!=query&changedInputName!=title&changedInputName!=windowStatus",
                                action : "setInputValue",
                                args : this._pdfConfigurationFormBindingArgs
                            }
                        },
                        widgetProperties : {
                            enableSubmit : true,
                            baseClass : "simple-form short-form",
                            resetOnSubmit : false,
                            submitLabel : "Generate PDF",
                            submitRedirectUrl : url.EXPORT_PDF() + EXPORT_PDF_CONTEXT + this.appConfig.projectContext + "/",
                            submitRedirectTarget : "_blank",
                            inputs : formInputs
                        }
                    }
                }
            };
        },

        _getFilterValueMap : function(allValues, allContainerViews, includeFilters) {
            if (this.view) {
                var encode = true,
                    filterValues = this._getFiltersOnStack(true, encode),
                    tvc = this.getTopViewController();
                if (tvc && tvc.getWidgetValueMap) {
                    $.extend(filterValues, tvc.getWidgetValueMap(allValues, allContainerViews, encode, includeFilters));
                }
                return filterValues;
            }
            return null;
        },

        _export : function(baseUrl, widgetName) {
            var tvc = this.getTopViewController();
            if (this.view && this.headerModel && tvc && tvc.viewId) {
                var data = tvc.getViewExportConfig(this.view.getFilterMap());

                data.view = tvc.viewId;
                data.hash = window.location.hash;

                // TODO model this after file upload
                data.params = tvc.getViewWidgetExportMap(widgetName);
                // TODO if we only want to include current visible filters, use tvc.getMetadataFilters() below
                data.filters = this.view.getFilterPromptsAndSelectedLabels(this._getFiltersOnStack() || {});
                formUtil.submitForm(this._getExportUrl(baseUrl, tvc.viewId), "exportData", data);
                analytics.exportData(tvc.breadcrumbTitle, data.title);
            }
        },

        _getExportUrl : function(baseUrl, viewId) {
            var moduleId = "";
            if (this.appConfig) {
                moduleId = this.appConfig.appModuleName;
            }
            return this._baseUrl + baseUrl + moduleId + "/" + viewId;
        },

        shouldLogout : function() {
            var regUrl = this._metadata ? this._metadata[METADATA_URL_LOGOUT] || false : false;
            if (regUrl) {
                window.location.href = regUrl || LOGOUT_URL_DEFAULT;
            }
        },

        _routerStateChanged : function(newState) {
            // NOTE this should only be called when going back/fwd in history
            if (newState) {
                var newRoute = newState.route,
                    newStateData = newState.stateData;

                // ensure we are going to allow the user to navigate forward
                var currTvc = this.getTopViewController();
                if (currTvc && currTvc.canUnload && !currTvc.canUnload()) {
                    formUtil.updateRouterState(newRoute, false, true);
                    return;
                }

                formUtil.skipNextRouterStateUpdate();

                var view = this._getMetadataViewByName(newRoute);
                // determine here if we are going back or forward. if back just pop till we land on the right one
                if (view) {
                    this._instantiateAndShowView(view, newRoute, null, false);
                }

                if (newStateData && !$.isEmptyObject(newStateData)) {
                    var key, combinedQuery = "", widgetStateData;
                    // collapse the state data into a string that we can then use to convert into a consolidated map
                    for (key in newStateData) {
                        if (key && newStateData[key] !== undefined) {
                            combinedQuery += (combinedQuery ? "&" : "") + key + "=" + newStateData[key];
                        }
                    }
                    widgetStateData = formUtil.convertQueryToMap(combinedQuery, false, true);
                    for (key in widgetStateData) {
                        if (key && widgetStateData[key] !== undefined) {
                            if (key.indexOf("@") === 0) {
                                if (this.view && this.view.setTargetValueProp) {
                                    this.view.setTargetValueProp(key, widgetStateData[key], false, false);
                                }
                            }
                            // TODO otherwise update the corresponding widget's data or selected value
                            //else {
                            //}
                        }
                    }
                }


                // get a map of what query string params changed and try to update them
                var changedQueryStringParams = formUtil.hashChanged();
                if (changedQueryStringParams && this.view) {
                    var widgetKey, widget;
                    for (widgetKey in changedQueryStringParams) {
                        if (widgetKey && changedQueryStringParams[widgetKey]) {
                            widget = this.view.getWidget(widgetKey);
                            if (widget && widget.setSelectedIdentifier) {
                                widget.setSelectedIdentifier(changedQueryStringParams[widgetKey]);
                            }
                        }
                    }
                }
                this.onHashChange(newRoute);

            }
        },

        _getMetadataViewByName : function(viewName) {
            return viewName && this._metadata && this._metadata[METADATA_VIEWS] ?
                this._metadata[METADATA_VIEWS][viewName] : undefined;
        },

        onHashChange : function() {
            // attach point for when the hash changes
        },

        onBreadcrumbClick : function(data) {
            if (data) {
                if (data.levelDelta > 0) {
                    formUtil.navigateToViewDelta(data.levelDelta * -1);
                }

                analytics.track({
                    event_category : "breadcrumb",
                    event_action : "click",
                    viewName : data.title || "",
                    levels : data.levelDelta
                });
            }
        },

        onFilterChange : function(filterName, newValue) {
            // attach point for when any filter changes
        },

        _tryStartup : function() {
            if (this._metadataLoaded && this.started && (!window.Modernizr.printlayout ||
                (window.Modernizr.printlayout && this._printModernizd))) {
                this.startup(this._startupParams || {});
            }
        },

        startup : function(startupParams) {
            // override to implement custom startup logic
            if (this._metadata && this._metadata[METADATA_VIEWS] && !this._didStartup) {
                this._didStartup = true;
                var ctx = this.view ? this.view.getViewContextPostfix() : null,
                    views = templateUtil.getSortedWidgetArray(this._metadata[METADATA_VIEWS], "index", false, ctx),
                    triggerMap = {};
                if (views && views.length > 0) {
                    var i = 0, j, view,
                        startupView = this._isDeepLinkEnabled() ? startupParams[STARTUP_PARAM_HASH] : null,
                        startupFound = false;

                    // see if an initial path is provided; if so deepLinkEnabled must be set in the site config
                    if (!startupView && this._metadata[METADATA_INITIAL_PATH] && (this._isPrintLayout() ||
                        (this._metadata[METADATA_SITE_CONFIG] && this._metadata[METADATA_SITE_CONFIG].deepLinkEnabled))) {
                        startupView = this._metadata[METADATA_INITIAL_PATH];
                    }

                    if (startupView) {
                        if (this._metadata[METADATA_VIEWS][startupView]) {
                            startupFound = this._processViewTrigger(this._metadata[METADATA_VIEWS][startupView],
                                METADATA_CONTROLLER_STARTUP, false, triggerMap);
                        }
                        else {
                            startupView = null;
                        }
                    }

                    for (i; i < views.length; i++) {
                        view = views[i];
                        if (view && view._key) {
                            if (view.trigger) {
                                startupFound = this._processViewTrigger(view, view.trigger, startupFound, triggerMap);
                            }
                            else if (view.triggers && view.triggers.length > 0) {
                                for (j = 0; j < view.triggers.length; j++) {
                                    startupFound = this._processViewTrigger(view, view.triggers[j], startupFound, triggerMap);
                                }
                            }

                        }
                    }
                }
            }
        },

        _processViewTrigger : function(view, trigger, startupFound, triggerMap) {
            if (trigger) {
                if ((!startupFound && trigger === METADATA_CONTROLLER_STARTUP)) {
                    startupFound = true;

                    this._instantiateAndShowView(view, view._key, null, false, null, this._deepLinkStartupWidgetData);
                }
                else {
                    // keep a map of the triggers to ensure we do not map more than one view to the same EXACT trigger (and same params)
                    if (!triggerMap[trigger]) {
                        triggerMap[trigger] = view._key;

                        var triggerDataParamIndex = trigger.indexOf("?"), dataParams = [];
                        if (triggerDataParamIndex > 0 && trigger.length > triggerDataParamIndex + 1) {
                            dataParams = formUtil.extractQueryParams(trigger.substr(triggerDataParamIndex + 1));
                            trigger = trigger.substr(0, triggerDataParamIndex);
                        }
                        topic.subscribe(trigger, this._getViewTriggerHandler(view, dataParams, trigger));
                    }
                }
            }
            return startupFound;
        },

        _getViewTriggerHandler : function(view, dataParams, trigger) {
            return function(evt, data, userInitiated) {
                if (userInitiated) {
                    if (formUtil.doesDataMatchQueryParams(data, dataParams)) {
                        var replaceCurrent = view.viewProperties && view.viewProperties.replaceCurrent;
                        this._instantiateAndShowView(view, view._key, data, replaceCurrent, function(newView){
                            // check to see if any widgets within this view have the trigger as a widget binding,
                            // which would not have been fired on startup bc the trigger just instantiated this view)
                            if (newView && view.widgets) {
                                var widgetKey, widget, widgetBindingKey, widgetBinding, newWidget, cb;
                                for (widgetKey in view.widgets) {
                                    if (widgetKey) {
                                        widget = view.widgets[widgetKey];
                                        if (widget && widget.widgetBindings) {
                                            for (widgetBindingKey in widget.widgetBindings) {
                                                if (widgetBindingKey) {
                                                    widgetBinding = widget.widgetBindings[widgetBindingKey];
                                                    if (widgetBinding && (widgetBindingKey + "." + widgetBinding.event === trigger)
                                                        && widgetBinding.action && newView._getWidgetBindingCallback) {
                                                        newWidget = newView.getWidget(widgetKey);
                                                        if (newWidget) {
                                                            cb = newView._getWidgetBindingCallback(newWidget, widgetBinding.action, widgetBinding.args);
                                                            if (cb && cb.apply) {
                                                                cb(widgetKey, data);
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        });
                    }
                }
            }.bind(this);
        },

        shouldMarkNotificationRead : function (notification) {
            if (notification && notification.id !== undefined && notification.id !== null) {
                this.headerModel.markNotificationRead(notification)
                    .done(function() {
                        notification.read = true;
                        if (this.view) {
                            this.view.updateNotificationRow(notification);
                        }
                    }.bind(this))
                    .fail(function () {
                        // TODO can this fail silently? right now we just show their name
                    });
            }
        },

        shouldGetNotificationSettings : function() {
            this.headerModel.getNotificationSettings()
                .done(function(settings) {
                    if (this.view) {
                        this.view.updateNotificationSettings(settings);
                    }
                }.bind(this))
                .fail(function () {
                    if (this.view) {
                        this.view.showNotification("Sorry, there was an error retrieving your notification settings.");
                    }

                }.bind(this));
        },

        shouldUpdateNotificationSettings : function(settings) {
            this.headerModel.updateNotificationSettings(settings)
                .done(function() {
                    if (this.view) {
                        this.view.hideNotificationSettings();
                    }
                }.bind(this))
                .fail(function () {
                    if (this.view) {
                        this.view.showNotification("Sorry, there was an error updating your notification settings.");
                    }
                }.bind(this));
        },

        shouldTakeNotificationAction : function(target) {
            if (target !== null && target !== undefined) {
                var targetPieces = target.split("?"),
                    actionView = targetPieces[0],
                    view = this._getMetadataViewByName(actionView);

                if (view) {
                    var decodedAction = templateUtil.decodeHTMLEntities(targetPieces[1]),
                        notificationWidgetData = (targetPieces.length === 2) ?
                            formUtil.convertQueryToMap(decodedAction, true, true) : null;
                    var replaceCurrent = view.viewProperties && view.viewProperties.replaceCurrent;
                    this._instantiateAndShowView(view, actionView, null, replaceCurrent, null, notificationWidgetData);
                } else if (target.indexOf("../") !== -1 || target.indexOf("://") !== -1){
                    window.open(
                        target,
                        '_blank' // <- This is what makes it open in a new window.
                    );
                }
            }
        },

        shouldTakeMenuOptionAction : function(option) {
            if (option && option.action === MENU_OPTION_ACTION_NOTIFY) {
                if (option._key) {
                    // invoke "should[Action]"
                    var callback = "should" + (option._key.charAt(0).toUpperCase() + option._key.substr(1));
                    if (this[callback] && this[callback].apply) {
                        this[callback].apply(this, [option]);
                    }
                }
            }
            else if (option && option.action === MENU_OPTION_BACK) {
                formUtil.navigateToPreviousView();
            }
            else {
                var view = this._getMetadataViewByName(option.action);
                if (view) {
                    var replaceCurrent = (view.viewProperties && view.viewProperties.replaceCurrent);
                    this._instantiateAndShowView(view, option.action, option.context, replaceCurrent || option.global, null, null, option.global);
                }
            }
        },

        showView : function(viewName, context) {
            this.shouldShowView(viewName, context);
        },

        shouldShowView : function(viewName, context) {
            this.shouldTakeMenuOptionAction({
                action : viewName,
                context : context
            });
        },

        shouldSetViewTitle : function(title) {
            this.viewTitle = title;
            if (this.view) {
                this.view.setViewTitle(!templateUtil.hasPlaceholders(title) ? title || "" : "");
            }
        },

        shouldSetSubTitle : function(subTitle) {
            if (this.view) {
                this.view.setSubTitle(!templateUtil.hasPlaceholders(subTitle) ? subTitle || "" : "");
            }
        },

        shouldSetTopViewControllerTitle : function(controller) {
            if (controller && this.getTopViewController() === controller) {
                this.shouldSetViewTitle(controller.viewTitle);
            }
        },

        shouldSetTopViewControllerSubTitle : function(controller) {
            if (controller && this.getTopViewController() === controller) {
                this.shouldSetSubTitle(controller.subTitle);
            }
        },

        _instantiateAndShowView : function(view, hash, context, replaceCurrent, callback, startupWidgetData, forceSingleInstance) {
            if (view && view._key) {
                var showView = function() {
                    var newView,
                        contextString = "";

                    if (view.viewContextIdentifierPath && context && typeof context === "object") {
                        contextString = templateUtil.getPropertyValue(view.viewContextIdentifierPath, context);
                    }
                    else if (context && typeof context === "string") {
                        // if the incoming data is a string, wrap it in a "data" object to prevent it from being misconstrued as a parsed context
                        context = {data : context};
                    }
                    var isModal = String(view.modal).toLowerCase() === "true",
                        namePostfix = contextString ? contextString.toUpperCase() : "",
                        viewContext = contextString || context,
                        ControllerConstructor,
                        opts = {
                            viewId : view._key,
                            viewContext : viewContext,
                            parentViewController : this,
                            titlesContainSafeMarkup : this._metadata && this._metadata[METADATA_TITLES_CONTAIN_SAFE_MARKUP] === true
                        };

                    if (view.viewProperties) {
                        $.extend(opts, view.viewProperties);
                    }
                    if (this.singleNotificationVisible) {
                        opts.singleNotificationVisible = this.singleNotificationVisible;
                    }
                    if (startupWidgetData) {
                        opts.startupWidgetData = startupWidgetData;
                    }

                    if (!isModal) {
                        var controllerName = view._key + namePostfix + "Controller";

                        // if there can only be a single instance of this controller and it is already on the stack, go back to it
                        if (this[controllerName] && (this[controllerName].singleInstance || forceSingleInstance)) {
                            var controllersOnStack = this.getControllersOnStack(),
                                existingControllerIndex = controllersOnStack.indexOf(this[controllerName]);
                            if (existingControllerIndex >= 0 && existingControllerIndex < controllersOnStack.length) {
                                var idx = controllersOnStack.length - 1;
                                for (idx; idx > existingControllerIndex; idx--) {
                                    if (!this.popViewController(idx > existingControllerIndex + 1, false)) {
                                        return false;
                                    }
                                }
                                this._setStartupWidgetData(this[controllerName], startupWidgetData);
                                return;
                            }
                        }

                        if (!this[controllerName]) {
                            // instantiate the predefined controller the user has provided
                            if (this.controllers && this.controllers[view._key]) {
                                ControllerConstructor = this.controllers[view._key];
                            }
                            // otherwise use the base implementations
                            else {
                                ControllerConstructor = _Controller;
                                opts.destroyOnPop = false;
                            }
                            if (view.title) {
                                opts.title = view.title;
                            }
                            // we need a breadcrumb title so just keep trying till something is set
                            //opts.breadcrumbTitle = view.breadcrumbTitle || view.title || (this.appConfig ? this.appConfig.appModuleName : view._key);

                            this[controllerName] = newView = new ControllerConstructor(opts);
                        }
                        else {
                            this._setStartupWidgetData(this[controllerName], startupWidgetData);
                        }

                        if (viewContext && this[controllerName].setContext) {
                            this[controllerName].setContext(viewContext);
                        }
                        if (this[controllerName].destroyOnPop || this.getTopViewController() !== this[controllerName]) {
                            this.pushViewController(this[controllerName], hash, replaceCurrent);
                        }
                    }
                    else {
                        var modalName = view._key + namePostfix + "Modal", modal = this[modalName], ModalConstructor;
                        if (!modal) {
                            if (this.modals && this.modals[view._key]) {
                                ModalConstructor = this.modals[view._key];
                            }
                            else {
                                ModalConstructor = _ModalView;
                            }
                            this._mixinPropertyValues(["title", "height", "width", "hasFooter", "hasCancelButton",
                                "hasOkButton", "hideOnOkClick", "buttonCancelLabel", "buttonOkLabel", "startupWidgetData"], view, opts);
                            this[modalName] = modal = new ModalConstructor(opts);
                            this.addSubview(modal, view._key);
                        }
                        else {
                            if (viewContext) {
                                modal.viewContext = viewContext;
                            }
                            if (modal.setTitle) {
                                var title = contextString && view["title-" + contextString] ?
                                    view["title-" + contextString] : view.title;
                                if (title) {
                                    modal.setTitle(title);
                                }
                            }
                            this._setStartupWidgetData(modal, startupWidgetData);
                        }
                        modal.show();
                        newView = modal;
                    }
                    if (callback && callback.apply) {
                        callback(newView);
                    }
                }.bind(this);

                if (view._ref) {
                    this.headerModel.getModuleMetadata({
                        moduleId : view._ref === true
                            ? this.appConfig.appModuleName + "-" + view._key : view._ref,
                        queryParams : this._startupParams
                    })
                        .done(function(viewMeta) {
                            delete view._ref;
                            $.extend(true, view, viewMeta);
                            showView();
                        })
                        .fail(this.handleDataLoadError.bind(this, notificationUtil.getErrorMessageGeneric()));
                }
                else {
                    showView();
                }
            }
        },

        _setStartupWidgetData : function(target, startupWidgetData) {
            if (startupWidgetData && target.setStartupWidgetData) {
                target.setStartupWidgetData(startupWidgetData);
            }
        },

        _mixinPropertyValues : function(propNames, source, target) {
            if (propNames && propNames.length > 0) {
                var i = 0, propName;
                for (i; i < propNames.length; i++) {
                    propName = propNames[i];
                    if (propName && source && source[propName] !== undefined && source[propName] !== null) {
                        if (!target) {
                            target = {};
                        }
                        target[propName] = source[propName];
                    }
                }
            }

        }

    });
});