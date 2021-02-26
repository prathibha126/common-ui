define([
], function() {

    "use strict";

    var PINC = "premierinc",
        PREMIERCONNECT = "premierconnect.premierinc.com",
        PREMIERCONNECT_DEMO = "demo.premierinc.com",
        URL_LOCAL = "https://localhost:8443",
        URL_PREMIERCONNECT = "https://" + PREMIERCONNECT,
        URL_PREMIERCONNECT_NONPROD = "https://premierconnectdevi.premierinc.com",
        URL_PDF = "https://pdf.premierinc.com",
        URL_PDF_NONPROD = "https://pdfnp.premierinc.com",
        PREMIERCONNECT_PROFILE_API = "/profile/api/picture/uid/",
        HOST = function() {
            return window.location.hostname;
        },
        IS_PROD = false;
    
    return {

        setIsProd : function(isProd) {
            IS_PROD = isProd;
        },

        isNonProd : function() {
            return !IS_PROD && (HOST().indexOf(PINC) === -1 || ((HOST().indexOf(PREMIERCONNECT) === -1 && HOST().indexOf(PREMIERCONNECT_DEMO) === -1)));
        },

        EXPORT_PDF : function() {
            return HOST().indexOf(PINC) === -1 ? URL_LOCAL :
                    ((HOST().indexOf(PREMIERCONNECT) === -1 && HOST().indexOf(PREMIERCONNECT_DEMO) === -1)
                        ? URL_PDF_NONPROD : URL_PDF);
        },

        PREMIER_CONNECT : function() {
            return this.isNonProd() ? URL_PREMIERCONNECT_NONPROD : URL_PREMIERCONNECT;
        },
        
        PREMIER_CONNECT_PROFILE_API : function() {
            return this.PREMIER_CONNECT() + PREMIERCONNECT_PROFILE_API;
        }

    };

});