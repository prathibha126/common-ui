define([
    "jquery",
    "Class",
    "common-ui/widgets/utils/topic"
], function($, Class, topic) {

    "use strict";

    var ANY_EVENT = "*";

    return Class.extend({
        on : function(evt, listener) {
            if (!this._evtMap) {
                this._evtMap = {};
            }
            if (this._evtMap[evt]) {
                this._evtMap[evt].push(listener);
            }
            else {
                this._evtMap[evt] = [listener];
            }
        },

        off : function(evt, listener) {
            if (this._evtMap && this._evtMap[evt] && listener) {
                var typeListeners = this._evtMap[evt], i = 0;
                if (typeListeners.length > 0) {
                    for (i; i < typeListeners.length; i++) {
                        if (typeListeners[i] === listener) {
                            typeListeners.splice(i, 1);
                            return;
                        }
                    }
                }
            }
            else if (this._evtMap && this._evtMap[evt] && !listener) {
                this._evtMap[evt] = null;
                delete this._evtMap[evt];
            }
        },

        dispatchEvent : function(evt, data, userInitiated) {
            if (this._silenceNextEvent && (this._silenceNextEvent === ANY_EVENT || evt === this._silenceNextEvent)) {
                delete this._silenceNextEvent;
                return;
            }
            var args = Array.prototype.slice.call(arguments, 1);
            if (evt && this._evtMap && this._evtMap[evt] && this._evtMap[evt].length > 0) {
                var typeListeners = this._evtMap[evt], i = 0, listener;
                for (i; i < typeListeners.length; i++) {
                    listener = typeListeners[i];
                    if (listener && listener.apply) {
                        listener.apply(this, args);
                    }
                }
            }

            // publish on the global topic pipeline if this is associated with a metadata-driven widget
            if (this._key && evt) {
                var keyParts = this._key.split("-");
                // TODO this can be noisy...should we find a way to only do this when needed?
                if (keyParts && keyParts.length > 1) {
                    topic.publish(keyParts[0] + "." + evt, args);
                }
                topic.publish(this._key + "." + evt, args);
                // TODO publish context-based widget name?
                /*if (keyParts > 0) {
                    topic.publish(this._key + "." + evt, args);
                }*/
            }
        },

        silenceNextEventOfType : function(type) {
            this._silenceNextEvent = type || ANY_EVENT;
        },

        remove : function() {
            if (this._evtMap) {
                var evt;
                for (evt in this._evtMap) {
                    if (evt && this._evtMap[evt]) {
                        this.off(evt);
                    }
                }
            }
        }
    });

});