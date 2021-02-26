/*
 Created by IntelliJ IDEA.
 User: atack
 Date: 7/13/17
 Time: 2:25 PM
 */

define([
    "jquery",
    "common-ui/widgets/_TemplatedWidget",
    "text!common-ui/widgets/form/templates/FileUploadInput.html",
    "common-ui/widgets/utils/stringUtil"
], function ($, _TemplatedWidget, template , stringUtil ) {

    "use strict";

    return _TemplatedWidget.extend({

        // FileUploadInput
        //      a file upload input that supports drag and drop intended for use as a Form input

        template: template,

        // acceptPattern: String
        //      a comma-separated list of allowed file extensions; please note this is easily bypassed and only provided to encourage
        //      users selecting the correct type of file. Your application services should always validate file types and process
        //      user-submitted files with extreme caution due to the risk of malicious submissions
        acceptPattern : ".txt,.xls,.xlsx",

        // prompt: String
        //      the prompt displayed that is hyperlinked and when clicked will allow users to browse for a file
        prompt : "Browse to upload.",

        // promptDragDrop: String
        //      the prompt displayed when drag and drop is available (in addition to the prompt; promptDragDrop is shown first)
        promptDragDrop : "Drop file to attach, or",

        // name: String
        //      the input name
        name : "file",

        // valueProp: String
        //      the name of the value prop used when dispatching change events (e.g. {value : FILE}
        valueProp : "value",

        _file : null,

        ariaLabel : null,

        disabled : false,

        onTemplateNodesAttached: function () {
            if (this.domNode) {
                // advanced file upload support is required for drag and drop uploading
                if (this.domNode && window.Modernizr && window.Modernizr["advanced-upload"]) {
                    // prevent default drag and drop behavior on this dom node
                    this.connect(this.domNode, "drag.fileupload.no dragstart.fileupload.no dragend.fileupload.no dragover.fileupload.no dragenter.fileupload.no dragleave.fileupload.no drop.fileupload.no", function(evt) {
                        evt.preventDefault();
                        evt.stopPropagation();
                    });

                    // toggle a css class when dragging over this dom node
                    this.connect(this.domNode, "dragover.fileupload dragenter.fileupload", function() {
                       this.domNode.addClass("drag-active");
                    }.bind(this));
                    this.connect(this.domNode, "dragleave.fileupload dragend.fileupload drop.fileupload", function() {
                        this.domNode.removeClass("drag-active");
                    }.bind(this));

                    // listen for files to be dropped on the dom node
                    this.connect(this.domNode, "drop.fileupload.file", function(evt) {
                        if (evt && evt.originalEvent && evt.originalEvent.dataTransfer && evt.originalEvent.dataTransfer.files) {
                            this._handleSelectFile(evt.originalEvent.dataTransfer.files);
                        }
                    }.bind(this));
                }

                // listen for standard file selection via the input change event
                if (this.attachPoints && this.attachPoints.file) {
                    this.connect(this.attachPoints.file, "change.select.file", function(evt) {
                        this._handleSelectFile(evt.target.files);
                    }.bind(this));
                }

                if (this.disabled) {
                    this.setDisabled(this.disabled);
                }
            }
        },

        setDisabled : function(disabled) {
            this.disabled = disabled;
            if (this.attachPoints && this.attachPoints.file && this.attachPoints.file.prop) {
                this.attachPoints.file.prop("disabled", disabled);
            }
            if (this.domNode) {
                this.domNode.toggleClass("disabled", this.disabled);
            }
        },

        _handleSelectFile : function(files) {
            if (files && files.length > 0 && files[0]) {
                this._file = files[0];
                this.dispatchEvent("change", this.getSelectedItem(), true);
                if (this.attachPoints && this.attachPoints.selectedFileLabel && this._file) {
                    // show and set the name of the selected file
                    this.attachPoints.selectedFileLabel.removeClass("hidden");
                    if (this.setSelectedFileLabel) {
                        this.setSelectedFileLabel(this._file.name || "");
                    }
                    else {
                        this.selectedFileLabel = this._file.name || "";
                    }
                }
            }
        },

        getSelectedItem : function() {
            var selection = {};
            selection[this.valueProp] = this._file;
            return selection;
        },

        reset : function() {
            this._file = null;
            if (this.attachPoints) {
                if (this.attachPoints.selectedFileLabel) {
                    this.attachPoints.selectedFileLabel.addClass("hidden");
                }
                // the file input needs to be removed and recreated
                if (this.attachPoints.file) {
                    this.attachPoints.file.replaceWith(this.attachPoints.file.val("").clone(true));
                }
            }
            // clear the value of the selected file name
            if (this.setSelectedFileLabel) {
                this.setSelectedFileLabel("");
            }
            else {
                this.selectedFileLabel = "";
            }
        },

        _getAriaLabel() {
            return stringUtil.isValidString( this.ariaLabel ) ? this.ariaLabel : "click to browse file";
        },

        getTemplateData : function() {
            return {
                acceptPattern : this.acceptPattern,
                name : this.name,
                prompt : this.prompt,
                promptDragDrop : this.promptDragDrop,
                ariaLabel : this._getAriaLabel()
            };
        }
    });
});
