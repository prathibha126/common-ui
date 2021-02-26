define([
    "common-ui/models/_Model"
], function(_Model) {

    return _Model.extend({

        baseUrl : "services/",

        getMetadata : function(params) {
            return this.ajax({
                url: "metadata/" + params.moduleCode + "/raw",
                disableFixtures : true
            });
        },

        getExportableServiceBeans : function(params) {
            return this.ajax({
                url: "export/" + params.moduleCode + "/exportableServiceBeans",
                disableFixtures : true
            });
        },

        updateMetadata : function(params) {
            return this.ajax({
                method : "POST",
                data : unescape(JSON.stringify(params.metadata)),
                url: "metadata/" + params.moduleId + "/update",
                disableFixtures : true,
                headers : {
                    "Content-Type" : "application/json; charset=utf-8"
                }
            });
        }
        	
    });
});