define([], function () {

    "use strict";

    return {
        /**
         * @returns {boolean}
         * Checks for -> Android | webOS | iPhone | iPad | iPod | BlackBerry | Windows Phone
         */

        isMobileDevice() {
        if( window && window.navigator && window.navigator.userAgent &&
            (navigator.userAgent.match(/Android/i)
            || navigator.userAgent.match(/webOS/i)
            || navigator.userAgent.match(/iPhone/i)
            || navigator.userAgent.match(/iPad/i)
            || navigator.userAgent.match(/iPod/i)
            || navigator.userAgent.match(/BlackBerry/i)
            || navigator.userAgent.match(/Windows Phone/i) )){
            return true;
        }
        else {
            return false;
        }
    }
    };
});