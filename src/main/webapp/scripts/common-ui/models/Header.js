define([
    "jquery",
    "common-ui/models/_Model",
    "common-ui/widgets/utils/formUtil"
], function($, _Model, formUtil) {

    "use strict";

    return _Model.extend({

        baseUrl : "services/",

        getModuleMetadata : function(params) {
            var query = params.queryParams && !$.isEmptyObject(params.queryParams) ?
                formUtil.convertMapToQuery(params.queryParams, "?") : "";
            return this.ajax({
                disableFixtures : true,
                url : "metadata/" + params.moduleId + query
            });
        },
        
        getUserInfo : function() {
        	return this.ajax({
        		url : "user/info",
        		fixture : "scripts/common-ui/models/fixtures/userInfo.json"
        	});
        },

        getAppNotifications : function() {
            return this.ajax({
                skipShowLoading : true,
                url : "notifications",
                noExtendSession : true,
                fixture : "scripts/common-ui/models/fixtures/appNotifications.json"
            });
        },

        markNotificationRead : function(notification) {
            return this.ajax({
                url : "notifications/" + notification.id + "/read",
                data : JSON.stringify({read : true}),
                dataType: "json",
                method: "POST",
                contentType: "application/json;charset=UTF-8",
                fixture : "scripts/common-ui/models/fixtures/appNotifications.json"
            });
        },

        getNotificationSettings : function() {
            return this.ajax({
                url : "notifications/settings"
            });
        },

        updateNotificationSettings : function(settings) {
            return this.ajax({
                url : "notifications/settings",
                data : JSON.stringify(settings),
                dataType: "json",
                method: "POST",
                contentType: "application/json;charset=UTF-8"
            });
        }
    });
});