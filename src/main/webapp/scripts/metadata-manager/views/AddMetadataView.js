define([
    "common-ui/views/_ModalView",
    "common-ui/widgets/SelectionList",
    "text!metadata-manager/views/templates/AddMetadataView.html"
], function(_ModalView, SelectionList, viewTemplate) {

    var ELEMENT_TYPE_SELECT = "select",
        ELEMENT_TYPE_TEXTAREA = "textarea",
        ELEMENT_TYPE_CHECKBOX = "checkbox";

    return _ModalView.extend({

        viewTemplate : viewTemplate,
        buttonOkLabel : "Save",
        title : "",

        metadataMapper : null,

        height : 275,
        width : 430,

        updateData : function(data) {
            this.data = data;
            this.renderForm();
        },

        onTemplateNodesAttached : function(nodes) {
            this._super.apply(this, arguments);
            if (nodes && nodes.modalFooter) {
                this._deleteButton = $("<button class='modal-action-button delete-button'>Delete</button>");
                nodes.modalFooter.append(this._deleteButton);
                if (this._deleteButtonHidden) {
                    this.hideDeleteButton();
                }
                this.connect(this._deleteButton, "click", this._handleDeleteButtonClick.bind(this));
            }
        },

        hideDeleteButton : function() {
            this._deleteButtonHidden = true;
            if (this._deleteButton) {
                this._deleteButton.hide();
            }
        },

        showDeleteButton : function() {
            this._deleteButtonHidden = false;
            if (this._deleteButton) {
                this._deleteButton.show();
            }
        },

        onViewTemplateNodesAttached : function(nodes) {
            this.renderForm();
        },

        _handleKeypress : function(evt) {
            if (evt.keyCode === 13) {
                this.onOkClick();
            }
        },

        onOkClick : function() {
            if (this.viewAttachPoints) {
                var data = this.viewAttachPoints.addMetaForm.serializeArray();
                if (data) {
                    var i = 0, curr, obj = {};
                    for (i; i < data.length; i++) {
                        curr = data[i];
                        if (curr && curr.name) {
                            obj[curr.name] = curr.value ? unescape(curr.value.replace(/\r?\n/g, "")) : curr.value;
                        }
                    }
                    if (this.metadataMapper && this.metadataMapper.apply) {
                        obj = this.metadataMapper(obj);
                    }
                    this.notifyDelegate("shouldUpdateMetadata", obj);
                }
            }
        },

        _handleDeleteButtonClick : function() {
            if (confirm("Are you sure?") && this.metadataMapper && this.metadataMapper.apply) {
                this.notifyDelegate("shouldUpdateMetadata", this.metadataMapper(null));
            }
        },

        renderForm : function() {
            // TODO add support for required values
            var data = this.data, dom = "";
            if (data && data.length > 0) {
                var i = 0, curr, j, option, val;
                for (i; i < data.length; i++) {
                    curr = data[i];
                    if (curr) {
                        dom += "<div class='metadata-creation-input-row'><span class='selection-list-prompt'>" + curr.prompt + "</span>";
                        if (curr.type === ELEMENT_TYPE_SELECT) {
                            dom += "<span class='selection-list'><select aria-label='Select' name='" + curr.name + "'><option></option>";
                            // options
                            if (curr.options && curr.options.length > 0) {
                                for (j = 0; j < curr.options.length; j++) {
                                    option = curr.options[j];
                                    if (option.name) {
                                        val = curr.value === option.value ? " selected='selected'" : "";
                                        dom += "<option value=\"" + option.value + "\"" + val + ">" + option.name + "</option>";
                                    }
                                }
                            }
                            dom += "</select></span>";
                        }
                        else if (curr.type === ELEMENT_TYPE_TEXTAREA) {
                            dom += "<textarea name='" + curr.name + "'>" + (curr.value || "") + "</textarea>";
                        }
                        else if (curr.type === ELEMENT_TYPE_CHECKBOX) {
                            val = curr.value && curr.value.toString().toLowerCase() === "true" ? " checked" : "";
                            dom += "<input type='checkbox' name='" + curr.name + "'" + val + ">";
                        }
                        else {
                            val = curr.value ? " value=\"" + curr.value + "\"" : "";
                            dom += "<input type='text' maxlength='250' name='" + curr.name + "'" + val
                                + (curr.placeholder ? " placeholder=\"" + curr.placeholder + "\"" : "") + ">";
                        }
                        dom += "</div>";
                    }
                }
            }
            this._dom = dom;

            if (this.viewAttachPoints) {
                this.viewAttachPoints.addMetaForm.empty();

                this.viewAttachPoints.addMetaForm.html(this._dom || "");

                var inputs = this.viewAttachPoints.addMetaForm.find("input");
                if (this._keypressListeners) {
                    this._keypressListeners.off();
                }
                this._keypressListeners = inputs.on("keypress.enter", this._handleKeypress.bind(this));

                setTimeout(function() {
                    if (inputs && inputs.length > 0 && inputs[0] && inputs[0].focus) {
                        inputs[0].focus();
                    }
                }.bind(this), 500);
            }
        }

    });
});
