define([
    "jquery"
], function($) {

    "use strict";

    var activeNotifications = {},
        ERROR_MESSAGE_GENERIC = "Sorry, we are unable to retrieve your information. Please try again later or call the Support Desk at 800.805.4608 if the problem persists.",
        ERROR_MESSAGE_NO_ACCESS = "Sorry, there appears to be an issue with your access. Please call the Support Desk at 800.805.4608.";

    return {

        getErrorMessageGeneric : function() {
            return ERROR_MESSAGE_GENERIC;
        },

        getErrorMessageNoAccess : function() {
            return ERROR_MESSAGE_NO_ACCESS;
        },

        setErrorMessageGeneric : function(errorMessageGeneric) {
            ERROR_MESSAGE_GENERIC = errorMessageGeneric;
        },

        setErrorMessageNoAccess : function(errorMessageNoAccess) {
            ERROR_MESSAGE_NO_ACCESS = errorMessageNoAccess;
        },

        extractHideAndShowNotification : function(notifications, widgetId, hideNotificationCallback, showNotificationCallback) {
            this.hideWidgetNotification(widgetId, hideNotificationCallback);
            return this.showWidgetNotification(notifications, widgetId, showNotificationCallback);
        },

        hideWidgetNotification : function(widgetId, hideNotificationCallback) {
            if (widgetId && activeNotifications[widgetId]) {
                var note = activeNotifications[widgetId];
                delete activeNotifications[widgetId];

                if (hideNotificationCallback && note && note.data) {
                    hideNotificationCallback(note.data.message, note.data.type, note.dismissable);
                }
                else {
                    // trigger one at the global level
                    $(document).trigger("hideNotification", note);
                }
            }
        },
        
        showWidgetNotification : function(notifications, widgetId, showNotificationCallback) {
            var notification = null;
            if (notifications) {
                notification = this.extractNotifications(notifications);
                if (notification && notification.data) {
                    if (widgetId) {
                        if (activeNotifications[widgetId]) {
                            this.hideWidgetNotification(widgetId);
                        }
                        activeNotifications[widgetId] = notification;
                    }
                    if (showNotificationCallback) {
                        showNotificationCallback(notification.data.message, notification.data.type, notification.dismissable, widgetId);
                    }
                    else {
                        // trigger one at the global level
                        $(document).trigger("showNotification", notification);
                    }
                }
            }
            return notification;
        },
        
        extractNotifications : function(notificationData) {
            // handle single notification or mutiple
            var notifications = notificationData && $.isArray(notificationData) ? notificationData : [notificationData];
            if (notifications && notifications.length > 0) {
                var i = 0, j, notification, message, subMessage, subMessages;
                for (i; i < notifications.length; i++) {
                    notification = notifications[i];
                    if (notification) {
                        message = notification.message || "";
                        subMessages = "";
                        if (notification.subMessages && notification.subMessages.length > 0) {
                            for (j = 0; j < notification.subMessages.length; j++) {
                                subMessage = notification.subMessages[j];
                                if (subMessage) {
                                    subMessages += "<li>" + subMessage + "</li>";
                                }
                            }
                            if (subMessages) {
                                message += "<div class='notification-submessages'>" + subMessages + "</div>";
                            }
                        }
                        // TODO for now returning first notification data to be used with this.view.showNotification
                        // TODO refactor!
                        return {
                            data : {
                                message : message,
                                type : notification.type
                            },
                            dismissable : String(notification.closeable).toLowerCase() === "true",
                            ephemeral : String(notification.ephemeral).toLowerCase() === "true"
                        };
                        // TODO just returning the first notification for now!
                        /*return new Notification({
                            data : {
                                message : message,
                                type : notification.type
                            },
                            dismissable : String(notification.closeable) === "true"
                        });*/
                    }
                }

            }
        }

    };
});