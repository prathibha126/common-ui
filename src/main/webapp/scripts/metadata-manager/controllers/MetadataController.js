define([
    "jquery",
    "common-ui/controllers/_Controller",
    "metadata-manager/models/Metadata",
    "metadata-manager/views/MetadataView",
    "common-ui/widgets/utils/metadataUtil",
    "common-ui/widgets/utils/templateUtil"
], function($, _Controller, MetadataModel, MetadataView, metadataUtil, templateUtil) {

    var viewRefMetaCache = {};

    return _Controller.extend({

        viewConstructor : MetadataView,
        breadcrumbTitle : "metadata manager",
        viewId : "metadataManager",
        viewTitle : "Metadata Manager",
        moduleCode : "",

        init : function() {
            this._super.apply(this, arguments);
            this.metadataModel = new MetadataModel();

            if (this.view) {
                this.view.moduleCode = this.moduleCode;
            }
            this.getMetadata();
            this.getExportableServiceBeans();
        },

        onMetadataSet : function() {
            this._super.apply(this, arguments);

            if (this.view) {
                this.view.setMetadata(this.getMetadataCache());
            }
        },

        getMetadata : function() {
            this.getData(this.metadataModel, "getMetadata", {moduleCode : this.moduleCode})
                .done(this.handleMetadata.bind(this))
                .fail(function() {
                    if (this.view) {
                        this.view.showSetupMessage();
                    }
                }.bind(this));
        },

        getExportableServiceBeans : function() {
            this.getData(this.metadataModel, "getExportableServiceBeans", {moduleCode : this.moduleCode})
                .done(function(results) {
                    var beans = [], i = 0;
                    if (results && results.length > 0) {
                        for (i; i < results.length; i++) {
                            beans.push({value : results[i], name : results[i]});
                        }
                    }
                    if (this.view) {
                        this.view.exportableServiceBeans = beans;
                    }
                }.bind(this));
        },

        handleMetadata : function(data) {
            // intercept the data to un escape all html entities to prevent saving of escaped vals
            if (data) {
                data = JSON.parse(templateUtil.htmlDecode(unescape(JSON.stringify(data).replace(/&quot;/g, "\\&quot;"))));
            }
            // massage data
            this._rawMetadata = data;

            if (this.view) {
                this.view.setMetadataRaw(this._rawMetadata);
                this.view.hideLoading();
            }
        },

        shouldUpdateMetadata : function(newMeta) {
            this._doModifyMetadata("update", {
                metadata : newMeta,
                moduleId : this.moduleCode
            }, this._handleMetadataUpdated.bind(this));
        },

        shouldLoadViewRef : function(view) {
            var key = view._ref === true ? this.moduleCode + metadataUtil.MODULE_VIEW_SEPARATOR + view._key : view._ref;
            if (viewRefMetaCache[key]) {
                this._handleViewRefMetadata(viewRefMetaCache[key]);
            }
            else {
                this.getData(this.metadataModel, "getMetadata", {moduleCode : key})
                    .done(function(viewMeta) {
                        viewRefMetaCache[key] = $.extend(viewMeta || {}, view);
                        this._handleViewRefMetadata(viewRefMetaCache[key]);
                    }.bind(this))
                    .fail(this._handleViewRefMetadataFail.bind(this, view, key));
            }
        },

        _handleViewRefMetadata : function(view) {
            if (this.view) {
                this.view.renderUIView(view);
            }
        },

        _handleViewRefMetadataFail : function(view, key, err) {
            if (this.view) {
                this.view.showNotification("Unable to load metadata view _ref for " + view._key + " at " + key + ".json");
                this.view.renderUIView(view);
            }
        },

        _handleMetadataUpdated : function(success, data) {
            if (this.view) {
                if (success) {
                    this.view.showNotification("Metadata updated!", "success", true);
                    this.view.setMetadataRaw(data.metadata);
                }
                else {
                    this.view.showNotification("Error saving changes!", "error", true);
                }
            }
        },

        _doModifyMetadata : function(action, propInfo, callback) {
            this.getData(this.metadataModel, action + "Metadata", propInfo)
                .done(function(data) {
                    if (this.view) {
                        this.view.hideLoading();
                        if (callback && callback.apply) {
                            callback(data, propInfo);
                        }
                    }
                }.bind(this))
                .fail(function() {
                    this.handleDataLoadError(this.ERROR_MESSAGE_GENERIC);
                }.bind(this));
        }
        
    });
});