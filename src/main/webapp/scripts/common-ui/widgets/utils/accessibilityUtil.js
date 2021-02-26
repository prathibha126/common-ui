define([], function () {

    "use strict";

    return {
        /**
         * @returns {boolean}
         * Checks for keyboard click from an event
         */

        clicked(evt) {
            if (evt) {
                if (evt.type === "click") {
                    return true;
                }
                else if (evt.type === "keypress") {
                    let code = evt ? (evt.keyCode || evt.which) : null;
                    return (code === 13 || code === 32);
                }
            }
            return false;
        }
    };
});