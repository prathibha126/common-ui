define([], function () {

    "use strict";

    return {
        /**
         * @param str
         * @returns {boolean}
         * Checks for -> null | undefined | empty | empty string
         */
        isValidString(str) {
            return str && str.trim().length > 0;
        },

        /**
         * @param str
         * @param indexes
         * @returns {boolean}
         * Returns TRUE on first match from the list
         * Eg: findAnyMatch("cat dog mouse" , ["cat","mouse"]) -> returns Boolean:true
         */
        findAnyMatch(str, indexes) {
            if( this.isValidString( str ) ){
                for (var i = 0; i < indexes.length; i++) {
                    if (str.toLowerCase().indexOf( indexes[i].toLowerCase() ) !== -1) {
                        return true;
                    }
                }
            }
            return false;
        }
    };
});