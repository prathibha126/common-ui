define([
    "jquery",
    "common-ui/widgets/_TemplatedWidget"
], function($, _TemplatedWidget) {

    "use strict";

    return _TemplatedWidget.extend({

        // _Modal
        //      a base class for modal widgets
        //

        // target: String|DOM Node
        //      optional; the target dom node or dom node selector for placement; default is body
        target : null,

        append : true,

        autoPlace : false,

        init : function(opts, target) {
            this._super.apply(this, [opts, target || $(document.body)]);
        },

        show : function() {
            if (this.domNode) {
                this.reAttach();
                // TODO for some reason this gets hidden when detached
                this._super.apply(this, arguments);
            }
            else {
                this.place(this.container);
            }
        },

        hide : function() {
            this.detach();
        }

    });
});