define([
    "jquery"
], function($) {

    "use strict";

    var pubsub = $("<span/>");

    return {

        publish : function(evt, args) {
            setTimeout(function() {
                pubsub.trigger(evt, args);
            }, 0);
        },

        subscribe : function(evt, callback) {
            var handler = function(evtActual) {
                // intercept published events to ensure the namespace is honored if provided
                var dotIdx = evt ? evt.indexOf(".") : -1;
                if (dotIdx > 0 && evt.length > dotIdx + 1) {
                    var ns = evt.substr(dotIdx + 1),
                        actualNs = evtActual.namespace;
                    // for some reason the namespace can be reversed...
                    if (actualNs !== ns && actualNs.split(".").reverse().join(".") !== ns) {
                        return;
                    }
                }
                callback.apply(callback, arguments);
            };
            pubsub.on(evt, handler);
            return {
                evt : evt,
                handler : handler
            };
        },

        unsubscribe : function(eventScope) {
            if (eventScope && eventScope.evt && eventScope.handler) {
                pubsub.off(eventScope.evt, eventScope.handler);
            }
        }
    };

});