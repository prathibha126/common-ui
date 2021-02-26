define([
    "common-ui/widgets/form/Checkbox",
    "text!common-ui/widgets/form/templates/Switch.html"
], function (Checkbox, template) {

    "use strict";

    return Checkbox.extend({

        // Switch
        //      a checkbox that has been styled with css

        template: template,

        append: true,

        labelPosition: "left",

        checkboxClass: "switch",

        onTemplateNodesAttached: function (nodes) {
            if (nodes && nodes.switchToggle) {
                this.checkbox = nodes.switchToggle;
                this.connect(nodes.switchToggle, "change.switchToggle", this._handleClick.bind(this));
            }
        }
    });
});
