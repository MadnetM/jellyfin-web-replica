﻿(function ($, document, Dashboard, LibraryBrowser) {

    function notifications() {

        var self = this;

        self.getNotificationsSummaryPromise = null;

        self.total = 0;

        self.getNotificationsSummary = function () {

            var apiClient = window.ApiClient;

            if (!apiClient) {
                return;
            }

            self.getNotificationsSummaryPromise = self.getNotificationsSummaryPromise || apiClient.getNotificationSummary(Dashboard.getCurrentUserId());

            return self.getNotificationsSummaryPromise;
        };

        self.updateNotificationCount = function () {

            if (!Dashboard.getCurrentUserId()) {
                return;
            }

            if (!window.ApiClient) {
                return;
            }

            var promise = self.getNotificationsSummary();

            if (!promise) {
                return;
            }

            promise.done(function (summary) {

                var item = $('.btnNotificationsInner').removeClass('levelNormal').removeClass('levelWarning').removeClass('levelError').html(summary.UnreadCount);

                if (summary.UnreadCount) {
                    item.addClass('level' + summary.MaxUnreadNotificationLevel);
                }
            });
        };

        self.markNotificationsRead = function (ids, callback) {

            ApiClient.markNotificationsRead(Dashboard.getCurrentUserId(), ids, true).done(function () {

                self.getNotificationsSummaryPromise = null;

                self.updateNotificationCount();

                if (callback) {
                    callback();
                }

            });

        };

        self.showNotificationsList = function (startIndex, limit, elem) {

            refreshNotifications(startIndex, limit, elem, true);

        };
    }

    function refreshNotifications(startIndex, limit, elem, showPaging) {

        var apiClient = window.ApiClient;

        if (apiClient) {
            return apiClient.getNotifications(Dashboard.getCurrentUserId(), { StartIndex: startIndex, Limit: limit }).done(function (result) {

                listUnreadNotifications(result.Notifications, result.TotalRecordCount, startIndex, limit, elem, showPaging);

            });
        }
    }

    function listUnreadNotifications(list, totalRecordCount, startIndex, limit, elem, showPaging) {

        if (!totalRecordCount) {
            elem.html('<p style="padding:.5em 1em;">' + Globalize.translate('LabelNoUnreadNotifications') + '</p>');

            return;
        }

        Notifications.total = totalRecordCount;

        var html = '';

        if (totalRecordCount > limit && showPaging === true) {

            var query = { StartIndex: startIndex, Limit: limit };

            html += LibraryBrowser.getQueryPagingHtml({
                startIndex: query.StartIndex,
                limit: query.Limit,
                totalRecordCount: totalRecordCount,
                showLimit: false,
                updatePageSizeSetting: false
            });
        }

        for (var i = 0, length = list.length; i < length; i++) {

            var notification = list[i];

            html += getNotificationHtml(notification);

        }

        elem.html(html).trigger('create');
    }

    function getNotificationHtml(notification) {

        var itemHtml = '';

        if (notification.Url) {
            itemHtml += '<a class="clearLink" href="' + notification.Url + '" target="_blank">';
        }

        itemHtml += '<paper-icon-item>';

        itemHtml += '<paper-fab class="listAvatar blue" icon="dvr" item-icon></paper-fab>';

        itemHtml += '<paper-item-body three-line>';

        itemHtml += '<div>';
        itemHtml += notification.Name;
        itemHtml += '</div>';

        itemHtml += '<div secondary>';
        itemHtml += humane_date(notification.Date);
        itemHtml += '</div>';

        if (notification.Description) {
            itemHtml += '<div secondary>';
            itemHtml += notification.Description;
            itemHtml += '</div>';
        }

        itemHtml += '</paper-item-body>';

        itemHtml += '</paper-icon-item>';

        if (notification.Url) {
            itemHtml += '</a>';
        }

        return itemHtml;
    }

    window.Notifications = new notifications();
    var needsRefresh = true;

    function onWebSocketMessage(e, msg) {
        if (msg.MessageType === "NotificationUpdated" || msg.MessageType === "NotificationAdded" || msg.MessageType === "NotificationsMarkedRead") {

            Notifications.getNotificationsSummaryPromise = null;

            Notifications.updateNotificationCount();
        }
    }

    function initializeApiClient(apiClient) {
        $(apiClient).off("websocketmessage", onWebSocketMessage).on("websocketmessage", onWebSocketMessage);
    }

    $(document).on('headercreated', function (e, apiClient) {
        $('.btnNotifications').on('click', function () {
            Dashboard.navigate('notificationlist.html');
        });
    });

    Dashboard.ready(function () {

        if (window.ApiClient) {
            initializeApiClient(window.ApiClient);
        }

        $(ConnectionManager).on('apiclientcreated', function (e, apiClient) {
            initializeApiClient(apiClient);
        });

        Events.on(ConnectionManager, 'localusersignedin', function () {
            needsRefresh = true;
        });

        Events.on(ConnectionManager, 'localusersignedout', function () {
            needsRefresh = true;
        });
    });

    pageClassOn('pageshow', "type-interior", function () {

        var page = $(this);

        if (needsRefresh) {
            Notifications.updateNotificationCount();
        }

    });

})(jQuery, document, Dashboard, LibraryBrowser);