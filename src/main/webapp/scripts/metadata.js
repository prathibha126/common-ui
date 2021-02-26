require([
    "metadata-manager/controllers/NavigationController",
    "text!app.json"
], function(NavigationController, appConfig) {

    // intercept the project's app config to append the noAnalytics property (don't need analytics for metadata mgr)
    if (appConfig) {
        var MODULE_NAME = "\"appModuleName\"";
        if (appConfig.indexOf(MODULE_NAME) > 0) {
            appConfig = appConfig.replace(new RegExp(MODULE_NAME, "g"), "\"noAnalytics\":true," + MODULE_NAME);
        }
    }

    var app = new NavigationController({
        appConfig : appConfig,
        viewTitle : "Metadata Manager"
    });

});