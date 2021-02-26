define([
    "common-ui/views/_NavigationView",
    "text!metadata-manager/views/templates/NavigationView.html"
], function(_NavigationView, viewTemplate) {

    return _NavigationView.extend({

        viewTemplate : viewTemplate,

        onViewTemplateNodesAttached : function() {

        }

    });
});