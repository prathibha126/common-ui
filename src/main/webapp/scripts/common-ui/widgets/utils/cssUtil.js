define([
], function() {

    "use strict";

    var loadedStylesheets = {};

    return {

        loadStylesheet : function (name) {
            if (name && !loadedStylesheets[name]) {
                loadedStylesheets[name] = true;
                
                var head = document.getElementsByTagName('head')[0],
                    link = document.createElement('link');
                link.id = name;
                link.rel = 'stylesheet';
                link.type = 'text/css';
                link.href = 'css/' + name + ".css" + (window.v && window.v !== "${vh}" ? "?_=" + window.v : "");
                link.media = 'all';
                head.appendChild(link);
            }
        }
    };
});