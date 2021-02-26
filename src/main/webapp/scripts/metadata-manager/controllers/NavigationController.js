define([
    "common-ui/controllers/_NavigationController",
    "metadata-manager/controllers/MetadataController",
    "metadata-manager/views/NavigationView"
], function(_NavigationController, MetadataController, NavigationView) {

    return _NavigationController.extend({

        viewConstructor : NavigationView,

        startup : function() {
            // create the initial root view controller
            this.metadataController = new MetadataController({
                parentViewController: this,
                moduleCode : this.appConfig ? this.appConfig.appModuleName : ""
            });
            this.pushViewController(this.metadataController);
        },

        setViewTitle : function(title) {
            if (title && title.toLowerCase().indexOf("metadata") >= 0) {
                this._super.apply(this, arguments);
            }
        },

        _getUserInfo : function() {
            // do nothing for now
        }
    });
});