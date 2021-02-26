define([
    "jquery",
    "common-ui/views/_MetadataDrivenView",
    "common-ui/widgets/utils/accessibilityUtil",
    "text!common-ui/views/templates/_ModalView.html"
], function($, _MetadataDrivenView, accessibilityUtil, template) {

    "use strict";

    return _MetadataDrivenView.extend({

        // Modal
        //      a modal overlay for view content
        //

        template : template,

        widgetAttachPoint : "widgets",

        hasFooter : true,
        hasCancelButton : false,
        hasOkButton : true,
        hasCloseButton : true,

        buttonCancelLabel : "Cancel",
        buttonOkLabel : "Ok",

        hideOnOkClick : false,
        hideOnBlur : true,
        preventBackgroundScroll : true,

        height : undefined,
        width : undefined,

        isModal : true,

        init : function(opts, target) {
            this._super.apply(this, [opts, target || $(document.body)]);
        },

        show : function() {
            this.place(this.container);
            this._super.apply(this, arguments);

            if (!this._scrollListener && this.preventBackgroundScroll) {
                var scrollContainer = this.getScrollContainer();
                if (scrollContainer) {
                    this._scrollListener = this.connect(window,
                        "touchmove.modal-overlay wheel.modal-overlay mousewheel.modal-overlay",
                        this._handleScroll.bind(this, scrollContainer, 1));
                }
            }

            // TODO @deprecated; show will be removed soon and is maintained currently for backwards compatibility
            this.dispatchEvent("show");
            this.dispatchEvent("shown");
            if (this._modalShown) {
                this.dispatchEvent("shownAgain");
            }
            else {
                this._modalShown = true;
            }
        },

        _handleScroll : function(scrollContainer, num, evt) {
            var scrollTop = scrollContainer.scrollTop(),
                scrolledHeight = scrollTop + scrollContainer.innerHeight(),
                scrollHeight = scrollContainer[0].scrollHeight,
                scrollDelta = evt.originalEvent ? evt.originalEvent.deltaY : 0;

            if ($(evt.target).is(this.domNode) || (scrollDelta <= 0 && scrollTop <= 0) ||
                (scrollDelta > 0 && scrolledHeight >= scrollHeight)) {
                evt.preventDefault();
            }
        },

        hide : function() {
            if (this._scrollListener) {
                this.disconnect(this._scrollListener);
                delete this._scrollListener;
            }

            if (this.domNode && !this.isIE()) {
                var superHide = this._super.bind(this, arguments);
                this.domNode.fadeOut(function () {
                    superHide();
                });
            }
            else {
                this._super.apply(this, arguments);
            }
            this.dispatchEvent("hide");
        },

        getScrollContainer : function() {
            return this.attachPoints && this.attachPoints.modalContainer ? this.attachPoints.modalContainer :
                this._super.apply(this, arguments);
        },

        onPlaced : function() {
            if (this.domNode && this.hideOnBlur && !this._attachedCloseListeners) {
                this._attachedCloseListeners = true;
                this.connect(this.domNode, "click.modal-overlay", function(evt) {
                    var tgt = $(evt.target);
                    if (tgt.is(this.domNode)) {
                        this.hide();
                        /*setTimeout(function() {
                            this.remove();
                        }.bind(this), 500);*/
                    }
                }.bind(this));
                // keep eddie happy; listen for esc key press
                this.connect(this.domNode, "keyup.modal-overlay", function(evt) {
                    if (evt.keyCode === 27) {
                        this.hide();
                    }
                }.bind(this));
            }
        },

        onTemplateNodesAttached : function(nodes) {
            if (!this.hasFooter && nodes.modalFooter) {
                nodes.modalFooter.remove();
                if (nodes.modalContainer) {
                    nodes.modalContainer.addClass("no-footer");
                }
            }
            else if (nodes.modalFooter) {
                this.connect(nodes.modalFooter.find(".modal-action-button"), "click.modalFooter", this._handleModalActionClick.bind(this));
            }
            if (nodes.modalContainer) {
                if (this.height !== null && this.height !== undefined) {
                    nodes.modalContainer.css("height", this.height);
                }
                if (this.width !== null && this.width !== undefined) {
                    nodes.modalContainer.css("width", this.width);
                }
            }
            if (nodes.closeButton) {
                this.connect(nodes.closeButton, "click.modalClose keypress.modalClose", this._handleModalCloseClick.bind(this));
                nodes.closeButton.focus();
            }
            else if (nodes.widgets && nodes.widgets.focus) {
                nodes.widgets.focus();
            }
            this._super.apply(this, arguments);
        },

        setHeight : function(h) {
            this.height = h;
            if (this.attachPoints && this.attachPoints.modalContainer) {
                this.attachPoints.modalContainer.css("height", h);
            }
        },

        setWidth : function(w) {
            this.width = w;
            if (this.attachPoints && this.attachPoints.modalContainer) {
                this.attachPoints.modalContainer.css("width", w);
            }
        },

        _handleModalActionClick : function(evt) {
            evt.stopPropagation();
            var tgt = $(evt.target),
                action = tgt.data("action");

            if (action === "cancel") {
                this.hide();
            }
            else {
                if (action === "ok" && this.hideOnOkClick) {
                    this.hide();
                }
                this.onOkClick();
            }
        },

        _handleModalCloseClick : function(evt) {
            if (!accessibilityUtil.clicked(evt)) {
                return;
            }
            this.hide();
        },

        onOkClick : function() {
            // attach point
        },

        getTemplateData : function() {
            var superData = this._super.apply(this, arguments);
            return $.extend(superData, {
                buttonCancelLabel : this.buttonCancelLabel,
                buttonOkLabel : this.buttonOkLabel,
                okClass : this.hasOkButton ? "" : "hidden",
                closeClass : this.hasCloseButton ? "" : "hidden"
            });
        }

    });
});