//Copyright 2014-2015 Alex Benfaremo, Alessandro Chelli, Lorenzo Di Berardino, Matteo Di Sabatino

/********************************* LICENSE **********************************
 *                                                                          *
 * This file is part of ApioOS.                                             *
 *                                                                          *
 * ApioOS is free software released under the GPLv2 license: you can        *
 * redistribute it and/or modify it under the terms of the GNU General      *
 * Public License version 2 as published by the Free Software Foundation.   *
 *                                                                          *
 * ApioOS is distributed in the hope that it will be useful, but            *
 * WITHOUT ANY WARRANTY; without even the implied warranty of               *
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the             *
 * GNU General Public License version 2 for more details.                   *
 *                                                                          *
 * To read the license either open the file COPYING.txt or                  *
 * visit <http://www.gnu.org/licenses/gpl2.txt>                             *
 *                                                                          *
 ****************************************************************************/

angular.module("ApioApplication").controller("ApioNotificationController", ["$scope", "$http", "socket", "$timeout", function ($scope, $http, socket, $timeout) {
    socket.on("apio_notification", function (notification) {
        if (notification.user == $scope.loggedUser) {
            console.log("SOCKET apio_notification. notification: ", notification);
            var getCleanMessage = function (tempMsg) {
                console.log("tempMsg (1): ", tempMsg);
                if (tempMsg.indexOf(")") > -1) {
                    //tempMsg = tempMsg.split(")")[1].trim();
                    var msgComponents = tempMsg.split(")");
                    if (msgComponents[1]) {
                        tempMsg = msgComponents[1].trim();
                    } else {
                        for (var index = 2; index < msgComponents.length; index++) {
                            if (index === 2) {
                                tempMsg = msgComponents[index].trim();
                            } else if (msgComponents[index]) {
                                tempMsg += msgComponents[index];
                            } else {
                                tempMsg += ")";
                            }
                        }
                    }
                }
                console.log("tempMsg (2): ", tempMsg);

                return tempMsg;
            };

            var isInNotifications = function (n) {
                var tempMsg = getCleanMessage(n.message);
                var d1 = new Date(n.timestamp);
                var t1 = new Date(d1.getFullYear(), d1.getMonth(), d1.getDate(), d1.getHours(), d1.getMinutes(), d1.getSeconds(), 0).getTime();

                //console.log("tempMsg (1): ", tempMsg);
                //if (tempMsg.indexOf(")") > -1) {
                //    //tempMsg = tempMsg.split(")")[1].trim();
                //    var msgComponents = tempMsg.split(")");
                //    if (msgComponents[1]) {
                //        tempMsg = msgComponents[1].trim();
                //    } else {
                //        for (var index = 2; index < msgComponents.length; index++) {
                //            if (index === 2) {
                //                tempMsg = msgComponents[index].trim();
                //            } else if (msgComponents[index]) {
                //                tempMsg += msgComponents[index];
                //            } else {
                //                tempMsg += ")";
                //            }
                //        }
                //    }
                //}
                //console.log("tempMsg (2): ", tempMsg);

                for (var i in $scope.notifications) {
                    var d2 = new Date($scope.notifications[i].timestamp);
                    var t2 = new Date(d2.getFullYear(), d2.getMonth(), d2.getDate(), d2.getHours(), d2.getMinutes(), d2.getSeconds(), 0).getTime();
                    if (tempMsg === $scope.notifications[i].message && n.objectId === $scope.notifications[i].objectId && t1 === t2) {
                        return true;
                    }
                }

                return false;
            };

            if (!isInNotifications(notification)) {
                if (notification.message.indexOf(")") > -1) {
                    var json = JSON.parse(JSON.stringify(notification));
                    json.message = getCleanMessage(json.message);
                    $scope.notifications.push(json);
                } else {
                    $scope.notifications.push(notification);
                }

                $scope.notifications.sort(function (a, b) {
                    return b.timestamp - a.timestamp;
                });

                if (!$scope.$$phase) {
                    $scope.$apply();
                }
            }

            if (!("Notification" in window)) {
                alert("Apio Notification : " + notification.message);
            } else if (Notification.permission === "granted") {
                var notificationObject = new Notification("Apio Notification", {
                    body: notification.message,
                    icon: "/images/Apio_Logo.png"
                });
                notificationObject.onclick = function () {
                    $scope.markAsRead(notification)
                }
            } else if (Notification.permission !== "denied") {
                Notification.requestPermission(function (permission) {
                    // If the user is okay, let's create a notification
                    if (permission === "granted") {
                        var notificationObject = new Notification("Apio Notification", {
                            body: notification.message,
                            icon: "/images/Apio_Logo.png"
                        });
                        notificationObject.onclick = function () {
                            $scope.markAsRead(notification)
                        }
                    }
                });
            }
        }
    });

    var disabledNotificationsToLoad = [];
    var notificationCenterIsBlock = false;
    var unreadNotificationsToLoad = [];

    var loadNext = function (source, dest) {
        document.getElementById("apioWaitLoading").classList.remove("apioWaitLoadingOn");
        document.getElementById("apioWaitLoading").classList.add("apioWaitLoadingOff");
        if (source[0]) {
            var firstTimestamp = source[0].timestamp, firstDate = new Date(Number(firstTimestamp));
            var firstYear = firstDate.getFullYear(), firstMonth = firstDate.getMonth(), firstDay = firstDate.getDate();
            var midnightTimestamp = new Date(firstYear, firstMonth, firstDay, 0, 0, 0, 0).getTime();
            var dayAfterTimestamp = new Date(firstYear, firstMonth, firstDay + 1, 0, 0, 0, 0).getTime();

            while (source[0] && source[0].timestamp >= midnightTimestamp && source[0].timestamp < dayAfterTimestamp) {
                dest.push(source.splice(0, 1)[0]);
            }
        }
    };

    var observer = new MutationObserver(function (mutations) {
        for (var i = 0; i < mutations.length; i++) {
            if (notificationCenterIsBlock === false) {
                if (mutations[i].target.id === "notificationsCenter" && mutations[i].target.style.display === "block") {
                    notificationCenterIsBlock = true;

                    while (unreadNotificationsToLoad.length && (document.getElementById("unread_notifications").scrollHeight === document.getElementById("unread_notifications").offsetHeight || document.getElementById("unread_notifications").scrollHeight + 1 === document.getElementById("unread_notifications").offsetHeight)) {
                        loadNext(unreadNotificationsToLoad, $scope.notifications);

                        if (!$scope.$$phase) {
                            $scope.$apply();
                        }
                    }
                }
            } else if (notificationCenterIsBlock === true) {
                if (mutations[i].target.id === "notificationsCenter" && mutations[i].target.style.display === "none") {

                    notificationCenterIsBlock = false;
                }
            }
        }
    });

    observer.observe(document.getElementById("notificationsCenter"), {
        attributeFilter: ["style"],
        attributeOldValue: true,
        attributes: true,
        characterData: false,
        characterDataOldValue: false,
        childList: false,
        subtree: false
    });

    document.getElementById("disabled_notifications").onscroll = function (event) {
        if (unreadNotificationsToLoad.length && event.target.scrollTop === event.target.scrollHeight - event.target.offsetHeight) {
            $timeout(function () {
                document.getElementById("apioWaitLoading").classList.remove("apioWaitLoadingOff");
                document.getElementById("apioWaitLoading").classList.add("apioWaitLoadingOn");
                loadNext(disabledNotificationsToLoad, $scope.disabledNotifications);
            });
        }
    };

    document.getElementById("unread_notifications").onscroll = function (event) {
        if (unreadNotificationsToLoad.length && event.target.scrollTop === event.target.scrollHeight - event.target.offsetHeight) {
            $timeout(function () {
                document.getElementById("apioWaitLoading").classList.remove("apioWaitLoadingOff");
                document.getElementById("apioWaitLoading").classList.add("apioWaitLoadingOn");
                loadNext(unreadNotificationsToLoad, $scope.notifications);
            });
        }
    };

    $scope.disabledNotifications = [];
    $scope.loggedUser = "";
    $scope.mouseHold = false;
    $scope.notifications = [];
    $scope.showDisabled = false;

    $scope.$watch("showDisabled", function (newValue, oldValue) {
        if (newValue === true) {
            while (disabledNotificationsToLoad.length && (document.getElementById("disabled_notifications").scrollHeight === document.getElementById("disabled_notifications").offsetHeight || document.getElementById("disabled_notifications").scrollHeight + 1 === document.getElementById("disabled_notifications").offsetHeight)) {
                loadNext(disabledNotificationsToLoad, $scope.disabledNotifications);
            }
        }
    });

    socket.on("apio_notification_disabled", function (notification) {
        //if (getComputedStyle(document.getElementById("apioMenuMobile")).display === "none") {
        if (notification.user === $scope.loggedUser) {
            var isFirst = true, n = notification.notif;

            if (n.message.indexOf(")") > -1) {
                n.message = n.message.split(")")[1].trim();
            }

            for (var i = 0; i < $scope.notifications.length; i++) {
                if ($scope.notifications[i].objectId === n.objectId && $scope.notifications[i].message === n.message) {
                    delete $scope.notifications[i].$$hashKey;
                    var toPush = $scope.notifications.splice(i--, 1)[0];
                    if (isFirst) {
                        isFirst = false;
                        $scope.disabledNotifications.push(toPush);
                        $scope.disabledNotifications.sort(function (a, b) {
                            return b.timestamp - a.timestamp;
                        });
                    }
                    Apio.stopApioLoading();
                }
            }

            for (var i = 0; i < unreadNotificationsToLoad.length; i++) {
                if (unreadNotificationsToLoad[i].objectId === n.objectId && unreadNotificationsToLoad[i].message === n.message) {
                    unreadNotificationsToLoad.splice(i--, 1);
                }
            }
        }
        //}
    });

    socket.on("apio_notification_enabled", function (notification) {
        //if (getComputedStyle(document.getElementById("apioMenuMobile")).display === "none") {
        if (notification.user === $scope.loggedUser) {
            var n = notification.notif;

            if (n.message.indexOf(")") > -1) {
                n.message = n.message.split(")")[1].trim();
            }

            for (var i = 0; i < $scope.disabledNotifications.length; i++) {
                if ($scope.disabledNotifications[i].objectId === n.objectId && $scope.disabledNotifications[i].message === n.message) {
                    $scope.disabledNotifications.splice(i--, 1);
                    Apio.stopApioLoading();
                }
            }

            for (var i = 0; i < disabledNotificationsToLoad.length; i++) {
                if (disabledNotificationsToLoad[i].objectId === n.objectId && disabledNotificationsToLoad[i].message === n.message) {
                    disabledNotificationsToLoad.splice(i--, 1);
                }
            }
        }
        //}
    });

    socket.on("apio_notification_read", function (notification) {
        //if (getComputedStyle(document.getElementById("apioMenuMobile")).display === "none") {
        if (notification.user === $scope.loggedUser) {
            var n = notification.notif;
            var d1 = new Date(n.timestamp);
            var t1 = new Date(d1.getFullYear(), d1.getMonth(), d1.getDate(), d1.getHours(), d1.getMinutes(), d1.getSeconds(), 0).getTime();

            if (n.message.indexOf(")") > -1) {
                n.message = n.message.split(")")[1].trim();
            }

            for (var i = 0; i < $scope.notifications.length; i++) {
                var d2 = new Date($scope.notifications[i].timestamp);
                var t2 = new Date(d2.getFullYear(), d2.getMonth(), d2.getDate(), d2.getHours(), d2.getMinutes(), d2.getSeconds(), 0).getTime();
                if ($scope.notifications[i].message === n.message && $scope.notifications[i].objectId === n.objectId && t1 === t2) {
                    $scope.notifications.splice(i--, 1);
                }
            }
        }
        //}
    });

    socket.on("apio_notification_read_all", function (data) {
        console.log("apio_notification_read_all, data: ", data);
        //if (getComputedStyle(document.getElementById("apioMenuMobile")).display === "none") {
        if ($scope.loggedUser == data) {
            $scope.notifications = [];
            unreadNotificationsToLoad = [];
        }
        //}
    });

    socket.on("apio_notification_mail_toggled", function (notification) {
        if (notification.email === $scope.loggedUser) {
            for (var i in $scope.notifications) {
                if ($scope.notifications[i].objectId === notification.objectId) {
                    var msgArr = $scope.notifications[i].message.split(": ");
                    if (msgArr[1] === notification.notification) {
                        $scope.notifications[i].sendMail = notification.sendMail;
                    }
                }
            }

            for (var i in unreadNotificationsToLoad) {
                if (unreadNotificationsToLoad[i].objectId === notification.objectId) {
                    var msgArr = unreadNotificationsToLoad[i].message.split(": ");
                    if (msgArr[1] === notification.notification) {
                        unreadNotificationsToLoad[i].sendMail = notification.sendMail;
                    }
                }
            }

            for (var i in $scope.disabledNotifications) {
                if ($scope.disabledNotifications[i].objectId === notification.objectId) {
                    var msgArr = $scope.disabledNotifications[i].message.split(": ");
                    if (msgArr[1] === notification.notification) {
                        $scope.disabledNotifications[i].sendMail = notification.sendMail;
                    }
                }
            }

            for (var i in disabledNotificationsToLoad) {
                if (disabledNotificationsToLoad[i].objectId === notification.objectId) {
                    var msgArr = disabledNotificationsToLoad[i].message.split(": ");
                    if (msgArr[1] === notification.notification) {
                        disabledNotificationsToLoad[i].sendMail = notification.sendMail;
                    }
                }
            }
        }
    })
    ;
    socket.on("apio_notification_sms_toggled", function (notification) {
        if (notification.email === $scope.loggedUser) {
            for (var i in $scope.notifications) {
                if ($scope.notifications[i].objectId === notification.objectId) {
                    var msgArr = $scope.notifications[i].message.split(": ");
                    if (msgArr[1] === notification.notification) {
                        $scope.notifications[i].sendSMS = notification.sendSMS;
                    }
                }
            }

            for (var i in unreadNotificationsToLoad) {
                if (unreadNotificationsToLoad[i].objectId === notification.objectId) {
                    var msgArr = unreadNotificationsToLoad[i].message.split(": ");
                    if (msgArr[1] === notification.notification) {
                        unreadNotificationsToLoad[i].sendSMS = notification.sendSMS;
                    }
                }
            }

            for (var i in $scope.disabledNotifications) {
                if ($scope.disabledNotifications[i].objectId === notification.objectId) {
                    var msgArr = $scope.disabledNotifications[i].message.split(": ");
                    if (msgArr[1] === notification.notification) {
                        $scope.disabledNotifications[i].sendSMS = notification.sendSMS;
                    }
                }
            }

            for (var i in disabledNotificationsToLoad) {
                if (disabledNotificationsToLoad[i].objectId === notification.objectId) {
                    var msgArr = disabledNotificationsToLoad[i].message.split(": ");
                    if (msgArr[1] === notification.notification) {
                        disabledNotificationsToLoad[i].sendSMS = notification.sendSMS;
                    }
                }
            }
        }
    });

    $scope.disableNotify = function (n) {
        console.log("CHIAMO DISABLENOTIFY CON: ", n);
        var enabledNotify = document.getElementsByClassName('enabledNotify');
        for (var ntf in enabledNotify) {
            if (enabledNotify.item(ntf).getAttribute('data-message') === n.message && enabledNotify.item(ntf).getAttribute('data-objectId') === n.objectId) {
                Apio.runApioLoading(enabledNotify.item(ntf), false);
            }
        }

        $http.post("/apio/notifications/disable", {
            notification: n,
            username: $scope.loggedUser
        }).success(function () {
        }).error(function () {
            alert("ERRORE nella disabilitazione della notifica")
        });
    };

    $scope.enableNotify = function (n) {
        var disabledNotify = document.getElementsByClassName('disabledNotify');
        console.log("PRIMA DEL FOR");
        for (var ntf in disabledNotify) {
            if (disabledNotify.item(ntf).getAttribute('data-message') === n.message && disabledNotify.item(ntf).getAttribute('data-objectId') === n.objectId) {
                Apio.runApioLoading(disabledNotify.item(ntf), false);
            }
        }
        console.log("DOPO IL FOR");

        $http.post("/apio/notifications/enable", {
            notification: n,
            username: $scope.loggedUser
        }).success(function () {
        }).error(function () {
            alert("ERRORE nell'abilitazione della notifica");
        });
    };

    $scope.enableSendMail = function (n) {
        var notification = n.message.split(": ");
        var notificationText = notification[1];
        if (notification[2]) {
            for (var i = 2; i < notification.length; i++) {
                notificationText += ": " + notification[i];
            }
        }

        //$http.get("/apio/getIP").success(function (ip) {
        //    $http.get("/apio/getService/mail").success(function (service) {
        //        //MODIFICA CAUSA INTEGRAZIONE
        //        service.port = "8081";
        //        //FINE
        //        $http.post("http://" + ip.split(" ")[0] + ":" + service.port + "/apio/mail/toggleEnableAll", {
        //            email: $scope.loggedUser,
        //            notification: notificationText,
        //            objectId: n.objectId
        //        }).success(function (s) {
        //            console.log("Enable successfully changed");
        //            for (var ntf in $scope.notifications) {
        //                if ($scope.notifications[ntf].message === n.message) {
        //                    $scope.notifications[ntf].sendMail = !$scope.notifications[ntf].sendMail
        //                }
        //            }
        //            for (var ntfd in $scope.disabledNotifications) {
        //                if ($scope.disabledNotifications[ntfd].message === n.message) {
        //                    $scope.disabledNotifications[ntfd].sendMail = !$scope.disabledNotifications[ntfd].sendMail
        //                }
        //            }
        //        }).error(function (error1) {
        //            console.log("Error while setting enable: ", error1);
        //        });
        //    }).error(function (err) {
        //        console.log("Error while getting service: ", err);
        //    })
        //}).error(function (error) {
        //    console.log("Error while getting ip: ", error)
        //});

        $http.post("/apio/service/notification/route/" + encodeURIComponent("/apio/mail/toggleEnableAll") + "/data/" + encodeURIComponent(JSON.stringify({
                email: $scope.loggedUser,
                notification: notificationText,
                objectId: n.objectId,
                sendMail: !n.sendMail
            }))
        ).success(function (s) {
            console.log("Enable successfully changed");
            //for (var ntf in $scope.notifications) {
            //    if ($scope.notifications[ntf].message === n.message) {
            //        $scope.notifications[ntf].sendMail = !$scope.notifications[ntf].sendMail
            //    }
            //}
            //for (var ntfd in $scope.disabledNotifications) {
            //    if ($scope.disabledNotifications[ntfd].message === n.message) {
            //        $scope.disabledNotifications[ntfd].sendMail = !$scope.disabledNotifications[ntfd].sendMail
            //    }
            //}
        }).error(function (error) {
            console.log("Error while setting enable: ", error);
        });
    };

    $scope.enableSendSMS = function (n) {
        var notification = n.message.split(": ");
        var notificationText = notification[1];
        if (notification[2]) {
            for (var i = 2; i < notification.length; i++) {
                notificationText += ": " + notification[i];
            }
        }

        //$http.get("/apio/getIP").success(function (ip) {
        //    $http.get("/apio/getService/sms").success(function (service) {
        //        //MODIFICA CAUSA INTEGRAZIONE
        //        service.port = "8081";
        //        //FINE
        //        $http.post("http://" + ip.split(" ")[0] + ":" + service.port + "/apio/sms/toggleEnableAll", {
        //            email: $scope.loggedUser,
        //            notification: notificationText,
        //            objectId: n.objectId
        //        }).success(function (s) {
        //            console.log("Enable successfully changed");
        //            for (var ntf in $scope.notifications) {
        //                if ($scope.notifications[ntf].message === n.message) {
        //                    $scope.notifications[ntf].sendSMS = !$scope.notifications[ntf].sendSMS
        //                }
        //            }
        //            for (var ntfd in $scope.disabledNotifications) {
        //                if ($scope.disabledNotifications[ntfd].message === n.message) {
        //                    $scope.disabledNotifications[ntfd].sendSMS = !$scope.disabledNotifications[ntfd].sendSMS
        //                }
        //            }
        //        }).error(function (error1) {
        //            console.log("Error while setting enable: ", error1);
        //        });
        //    }).error(function (err) {
        //        console.log("Error while getting service: ", err);
        //    })
        //}).error(function (error) {
        //    console.log("Error while getting ip: ", error)
        //});

        $http.post("/apio/service/notification/route/" + encodeURIComponent("/apio/sms/toggleEnableAll") + "/data/" + encodeURIComponent(JSON.stringify({
                email: $scope.loggedUser,
                notification: notificationText,
                objectId: n.objectId,
                sendSMS: !n.sendSMS
            }))
        ).success(function (s) {
            console.log("Enable successfully changed");
            //for (var ntf in $scope.notifications) {
            //    if ($scope.notifications[ntf].message === n.message) {
            //        $scope.notifications[ntf].sendSMS = !$scope.notifications[ntf].sendSMS
            //    }
            //}
            //for (var ntfd in $scope.disabledNotifications) {
            //    if ($scope.disabledNotifications[ntfd].message === n.message) {
            //        $scope.disabledNotifications[ntfd].sendSMS = !$scope.disabledNotifications[ntfd].sendSMS
            //    }
            //}
        }).error(function (error) {
            console.log("Error while setting enable: ", error);
        });
    };

    $scope.exitNotificationCenter = function () {
        $("#notificationsCenter").toggle("slide", {direction: 'up'}, 500);
    };

    $scope.getTimeFromTimestamp = function (t) {
        var date = new Date(Number(t));
        var day = date.getDate() < 10 ? "0" + date.getDate() : date.getDate();
        var month = (date.getMonth() + 1) < 10 ? "0" + (date.getMonth() + 1) : (date.getMonth() + 1);
        var year = date.getFullYear() < 10 ? "0" + date.getFullYear() : date.getFullYear();
        var hours = date.getHours() < 10 ? "0" + date.getHours() : date.getHours();
        var minutes = date.getMinutes() < 10 ? "0" + date.getMinutes() : date.getMinutes();
        var seconds = date.getSeconds() < 10 ? "0" + date.getSeconds() : date.getSeconds();
        return day + "/" + month + "/" + year + "-" + hours + ":" + minutes + ":" + seconds;
    };

    $scope.loadNotifications = function () {
        $http.get("/apio/notifications/" + $scope.loggedUser).success(function (data) {
            console.log("Got notifications: ", data);

            data.sort(function (a, b) {
                return b.timestamp - a.timestamp;
            });

            unreadNotificationsToLoad = data;
        }).error(function () {
            console.log("Unable to download notifications");
        });

        $http.get("/apio/notifications/listDisabled/" + $scope.loggedUser).success(function (data) {
            console.log("Got notifications: ", data);

            data.sort(function (a, b) {
                return b.timestamp - a.timestamp;
            });

            disabledNotificationsToLoad = data;
        }).error(function () {
            console.log("Unable to download notifications");
        });
    };

    $scope.markAsRead = function (n, $event) {
        console.log("MARKASREAD");
        console.log("n: ", n);
        console.log("$event: ", $event);
        $scope.mouseHold = false;
        document.getElementById('notificationsCenter').style.cursor = "default";
        if (!$event || ($event.target.id !== "disable-notification" && $event.target.id !== "publish-notification")) {
            console.log("CHIAMO MARKASRID CON: ", n);
            $http.post("/apio/notifications/markAsRead", {
                notification: {
                    message: n.message,
                    objectId: n.objectId,
                    timestamp: n.timestamp
                },
                username: $scope.loggedUser
            }).success(function () {
                console.log("Notifica eliminata con successo");
            }).error(function () {
                console.log("ERRORE nell'eliminazione della notifica")
            });
        }
    };

    $scope.publishNotify = function (n) {
        var notification = n.message.split(": ");
        var notificationText = notification[1];
        if (notification[2]) {
            for (var i = 2; i < notification.length; i++) {
                notificationText += ": " + notification[i];
            }
        }

        console.log("notificationText: ", notificationText);

        $http.post("/apio/service/notification/route/" + encodeURIComponent("/apio/notification/deleteUser") + "/data/" + encodeURIComponent(JSON.stringify({
                email: $scope.loggedUser,
                notification: notificationText,
                objectId: n.objectId
            }))
        ).success(function (s) {
            console.log("Enable successfully changed");
            for (var ntf = 0; ntf < $scope.notifications.length; ntf++) {
                if ($scope.notifications[ntf].message === n.message) {
                    $scope.notifications.splice(ntf--, 1);
                }
            }

            for (var ntfd = 0; ntfd < $scope.disabledNotifications.length; ntfd++) {
                if ($scope.disabledNotifications[ntfd].message === n.message) {
                    $scope.disabledNotifications.splice(ntfd--, 1);
                }
            }

            for (var i = 0; i < disabledNotificationsToLoad; i++) {
                if (disabledNotificationsToLoad[i].message === n.message) {
                    disabledNotificationsToLoad.splice(i--, 1);
                }
            }

            for (var i = 0; i < unreadNotificationsToLoad; i++) {
                if (unreadNotificationsToLoad[i].message === n.message) {
                    unreadNotificationsToLoad.splice(i--, 1);
                }
            }

            $http.post("/apio/notifications/markAsRead", {
                notification: {
                    message: n.message,
                    objectId: n.objectId,
                    timestamp: n.timestamp
                },
                username: $scope.loggedUser
            }).success(function () {
                console.log("Notifica eliminata con successo");
            }).error(function () {
                console.log("ERRORE nell'eliminazione della notifica")
            });
        }).error(function (error) {
            console.log("Error while setting enable: ", error);
        });
    };

    $scope.readAll = function () {
        $scope.mouseHold = true;
        document.getElementById('notificationsCenter').style.cursor = "wait";
        setTimeout(function () {
            if ($scope.mouseHold) {
                document.getElementById('notificationsCenter').style.cursor = "default";
                $http.post("/apio/notifications/readAll", {username: $scope.loggedUser}).success(function () {
                    $scope.notifications = [];
                }).error(function () {
                    alert('errore nello svuotamento della variabile');
                });
            }
        }, 2000);
    };

    $scope.toggleShowDisabled = function () {
        $scope.showDisabled = !$scope.showDisabled;
    };

    $http.get("/apio/user/getSession").success(function (data) {
        $scope.loggedUser = data;
        $scope.loadNotifications();
    }).error(function (error) {
        console.log("Error while getting session: ", error);
    });
}]).controller("ApioNotificationControllerMobile", ["$scope", "$http", "socket", "$timeout", function ($scope, $http, socket, $timeout) {
    var disabledNotificationsToLoad = [];
    var notificationCenterIsBlock = false;
    var unreadNotificationsToLoad = [];

    $scope.disabledNotifications = [];
    $scope.loggedUser = "";
    $scope.mouseHold = false;
    $scope.notifications = [];
    $scope.showDisabled = false;

    var loadNext = function (source, dest) {

        document.getElementById("apioWaitLoading").classList.remove("apioWaitLoadingOn");
        document.getElementById("apioWaitLoading").classList.add("apioWaitLoadingOff");
        if (source[0]) {
            var firstTimestamp = source[0].timestamp, firstDate = new Date(Number(firstTimestamp));
            var firstYear = firstDate.getFullYear(), firstMonth = firstDate.getMonth(), firstDay = firstDate.getDate();
            var midnightTimestamp = new Date(firstYear, firstMonth, firstDay, 0, 0, 0, 0).getTime();
            var dayAfterTimestamp = new Date(firstYear, firstMonth, firstDay + 1, 0, 0, 0, 0).getTime();

            while (source[0] && source[0].timestamp >= midnightTimestamp && source[0].timestamp < dayAfterTimestamp) {
                //alert('while load next');
                console.log('while load next')
                dest.push(source.splice(0, 1)[0]);
            }
        }
    };
    var tempNotifyFixed = []
    var first = true;
    var observerMobile = new MutationObserver(function (mutations) {


        for (var i = 0; i < mutations.length; i++) {
            if (notificationCenterIsBlock === false) {
                if (mutations[i].target.id === "sottoMenuNotification" && !document.getElementById("sottoMenuNotification").classList.contains('displayNone')) {
                    notificationCenterIsBlock = true;
                    while (unreadNotificationsToLoad.length && (document.getElementById("unread_notificationsMobile").scrollHeight === document.getElementById("unread_notificationsMobile").offsetHeight || document.getElementById("unread_notificationsMobile").scrollHeight + 1 === document.getElementById("unread_notificationsMobile").offsetHeight)) {
                        loadNext(unreadNotificationsToLoad, $scope.notifications);
                        console.log("$scope.notifications: ", $scope.notifications);

                        if (!$scope.$$phase) {
                            $scope.$apply();
                        }
                        console.log('while');
                        console.log('scrollHeight', document.getElementById("unread_notificationsMobile").scrollHeight);
                        console.log('offsetHeight', document.getElementById("unread_notificationsMobile").offsetHeight);
                    }

                }
            } else if (notificationCenterIsBlock === true) {
                console.log('enoder case')
                if (mutations[i].target.id === "sottoMenuNotification" && document.getElementById("sottoMenuNotification").classList.contains('displayNone')) {

                    notificationCenterIsBlock = false;
                }
            }
        }

        console.log('++++++++++++++++++++++++++++++++', mutations);
        console.log('CONTAIN DISPLAY NONE', document.getElementById("sottoMenuNotification").classList.contains('displayNone'));


    });

    observerMobile.observe(document.getElementById("sottoMenuNotification"), {
        attributeFilter: ["class", "style"],
        attributeOldValue: true,
        attributes: true,
        characterData: false,
        characterDataOldValue: false,
        childList: false,
        subtree: false
    });


    document.getElementById("disabled_notificationsMobile").onscroll = function (event) {
        if (unreadNotificationsToLoad.length && event.target.scrollTop === event.target.scrollHeight - event.target.offsetHeight) {
            $timeout(function () {
                document.getElementById("apioWaitLoading").classList.remove("apioWaitLoadingOff");
                document.getElementById("apioWaitLoading").classList.add("apioWaitLoadingOn");
                loadNext(disabledNotificationsToLoad, $scope.disabledNotifications);
            });
        }
    };

    document.getElementById("unread_notificationsMobile").onscroll = function (event) {
        if (unreadNotificationsToLoad.length && event.target.scrollTop === event.target.scrollHeight - event.target.offsetHeight) {
            $timeout(function () {
                document.getElementById("apioWaitLoading").classList.remove("apioWaitLoadingOff");
                document.getElementById("apioWaitLoading").classList.add("apioWaitLoadingOn");
                loadNext(unreadNotificationsToLoad, $scope.notifications);
            });
        }
    };

    /*document.getElementById("scrollableNotificationsCenterMobile").onscroll = function (event) {

     };*/


    $scope.$watch("showDisabled", function (newValue, oldValue) {

        if (newValue === true) {
            //alert('');
            console.log('("disabled_notificationsMobile").scrollHeight', document.getElementById("scrollableNotificationsCenterMobile").scrollHeight)
            console.log('("disabled_notificationsMobile").offsetHeight', document.getElementById("scrollableNotificationsCenterMobile").offsetHeight)
            console.log('("disabled_notificationsMobile").scrollHeight+1', document.getElementById("scrollableNotificationsCenterMobile").scrollHeight)
            console.log('("disabled_notificationsMobile").offsetHeight', document.getElementById("scrollableNotificationsCenterMobile").offsetHeight)
            while (disabledNotificationsToLoad.length && (document.getElementById("disabled_notificationsMobile").scrollHeight === document.getElementById("disabled_notificationsMobile").offsetHeight || document.getElementById("disabled_notificationsMobile").scrollHeight + 1 === document.getElementById("disabled_notificationsMobile").offsetHeight)) {
                //alert('');
                /*var temp;
                 for(var l in $scope.disabledNotifications){
                 /*if(){

                 }*/
                /*
                 console.log('disabledNotifications',$scope.disabledNotifications[l]);
                 }
                 for(var c in disabledNotificationsToLoad){
                 console.log('disabledNotificationsToLoad',disabledNotificationsToLoad[c]);
                 }*/
                loadNext(disabledNotificationsToLoad, $scope.disabledNotifications);
            }
        }
    });

    socket.on("apio_notification", function (notification) {
        if (notification.user == $scope.loggedUser) {
            console.log("SOCKET apio_notification. notification: ", notification);
            var getCleanMessage = function (tempMsg) {
                console.log("tempMsg (1): ", tempMsg);
                if (tempMsg.indexOf(")") > -1) {
                    //tempMsg = tempMsg.split(")")[1].trim();
                    var msgComponents = tempMsg.split(")");
                    if (msgComponents[1]) {
                        tempMsg = msgComponents[1].trim();
                    } else {
                        for (var index = 2; index < msgComponents.length; index++) {
                            if (index === 2) {
                                tempMsg = msgComponents[index].trim();
                            } else if (msgComponents[index]) {
                                tempMsg += msgComponents[index];
                            } else {
                                tempMsg += ")";
                            }
                        }
                    }
                }
                console.log("tempMsg (2): ", tempMsg);

                return tempMsg;
            };

            var isInNotifications = function (n) {
                var tempMsg = getCleanMessage(n.message);
                var d1 = new Date(n.timestamp);
                var t1 = new Date(d1.getFullYear(), d1.getMonth(), d1.getDate(), d1.getHours(), d1.getMinutes(), d1.getSeconds(), 0).getTime();

                //console.log("tempMsg (1): ", tempMsg);
                //if (tempMsg.indexOf(")") > -1) {
                //    //tempMsg = tempMsg.split(")")[1].trim();
                //    var msgComponents = tempMsg.split(")");
                //    if (msgComponents[1]) {
                //        tempMsg = msgComponents[1].trim();
                //    } else {
                //        for (var index = 2; index < msgComponents.length; index++) {
                //            if (index === 2) {
                //                tempMsg = msgComponents[index].trim();
                //            } else if (msgComponents[index]) {
                //                tempMsg += msgComponents[index];
                //            } else {
                //                tempMsg += ")";
                //            }
                //        }
                //    }
                //}
                //console.log("tempMsg (2): ", tempMsg);

                for (var i in $scope.notifications) {
                    var d2 = new Date($scope.notifications[i].timestamp);
                    var t2 = new Date(d2.getFullYear(), d2.getMonth(), d2.getDate(), d2.getHours(), d2.getMinutes(), d2.getSeconds(), 0).getTime();
                    if (tempMsg === $scope.notifications[i].message && n.objectId === $scope.notifications[i].objectId && t1 === t2) {
                        return true;
                    }
                }

                return false;
            };

            if (!isInNotifications(notification)) {
                if (notification.message.indexOf(")") > -1) {
                    var json = JSON.parse(JSON.stringify(notification));
                    json.message = getCleanMessage(json.message);
                    $scope.notifications.push(json);
                } else {
                    $scope.notifications.push(notification);
                }

                $scope.notifications.sort(function (a, b) {
                    return b.timestamp - a.timestamp;
                });

                if (!$scope.$$phase) {
                    $scope.$apply();
                }
            }
        }
    });

    socket.on("apio_notification_disabled", function (notification) {
        //if (getComputedStyle(document.getElementById("apioMenuMobile")).display === "block") {
        if (notification.user === $scope.loggedUser) {
            var isFirst = true, n = notification.notif;

            if (n.message.indexOf(")") > -1) {
                n.message = n.message.split(")")[1].trim();
            }

            for (var i = 0; i < $scope.notifications.length; i++) {
                if ($scope.notifications[i].objectId === n.objectId && $scope.notifications[i].message === n.message) {
                    delete $scope.notifications[i].$$hashKey;
                    var toPush = $scope.notifications.splice(i--, 1)[0];
                    if (isFirst) {
                        isFirst = false;
                        $scope.disabledNotifications.push(toPush);
                        $scope.disabledNotifications.sort(function (a, b) {
                            return b.timestamp - a.timestamp;
                        });
                    }
                    Apio.stopApioLoading();
                }
            }

            for (var i = 0; i < unreadNotificationsToLoad.length; i++) {
                if (unreadNotificationsToLoad[i].objectId === n.objectId && unreadNotificationsToLoad[i].message === n.message) {
                    unreadNotificationsToLoad.splice(i--, 1);
                }
            }
        }
        //}
    });

    socket.on("apio_notification_enabled", function (notification) {
        //if (getComputedStyle(document.getElementById("apioMenuMobile")).display === "block") {
        if (notification.user === $scope.loggedUser) {
            var n = notification.notif;

            if (n.message.indexOf(")") > -1) {
                n.message = n.message.split(")")[1].trim();
            }

            for (var i = 0; i < $scope.disabledNotifications.length; i++) {
                if ($scope.disabledNotifications[i].objectId === n.objectId && $scope.disabledNotifications[i].message === n.message) {
                    $scope.disabledNotifications.splice(i--, 1);
                    Apio.stopApioLoading();
                }
            }

            for (var i = 0; i < disabledNotificationsToLoad.length; i++) {
                if (disabledNotificationsToLoad[i].objectId === n.objectId && disabledNotificationsToLoad[i].message === n.message) {
                    disabledNotificationsToLoad.splice(i--, 1);
                }
            }
        }
        //}
    });

    socket.on("apio_notification_read", function (notification) {
        //if (getComputedStyle(document.getElementById("apioMenuMobile")).display === "block") {
        console.log("notification: ", notification);
        if (notification.user === $scope.loggedUser) {
            var n = notification.notif;
            var d1 = new Date(n.timestamp);
            var t1 = new Date(d1.getFullYear(), d1.getMonth(), d1.getDate(), d1.getHours(), d1.getMinutes(), d1.getSeconds(), 0).getTime();

            if (n.message.indexOf(")") > -1) {
                n.message = n.message.split(")")[1].trim();
            }

            for (var i = 0; i < $scope.notifications.length; i++) {
                var d2 = new Date($scope.notifications[i].timestamp);
                var t2 = new Date(d2.getFullYear(), d2.getMonth(), d2.getDate(), d2.getHours(), d2.getMinutes(), d2.getSeconds(), 0).getTime();
                if ($scope.notifications[i].message === n.message && $scope.notifications[i].objectId === n.objectId && t1 === t2) {
                    $scope.notifications.splice(i--, 1);
                }
            }
        }
        //}
    });

    socket.on("apio_notification_read_all", function (data) {
        //if (getComputedStyle(document.getElementById("apioMenuMobile")).display === "block") {
        if ($scope.loggedUser == data) {
            $scope.notifications = [];
            unreadNotificationsToLoad = [];
        }
        //}
    });

    socket.on("apio_notification_mail_toggled", function (notification) {
        if (notification.email === $scope.loggedUser) {
            for (var i in $scope.notifications) {
                if ($scope.notifications[i].objectId === notification.objectId) {
                    var msgArr = $scope.notifications[i].message.split(": ");
                    if (msgArr[1] === notification.notification) {
                        $scope.notifications[i].sendMail = notification.sendMail;
                    }
                }
            }

            for (var i in unreadNotificationsToLoad) {
                if (unreadNotificationsToLoad[i].objectId === notification.objectId) {
                    var msgArr = unreadNotificationsToLoad[i].message.split(": ");
                    if (msgArr[1] === notification.notification) {
                        unreadNotificationsToLoad[i].sendMail = notification.sendMail;
                    }
                }
            }

            for (var i in $scope.disabledNotifications) {
                if ($scope.disabledNotifications[i].objectId === notification.objectId) {
                    var msgArr = $scope.disabledNotifications[i].message.split(": ");
                    if (msgArr[1] === notification.notification) {
                        $scope.disabledNotifications[i].sendMail = notification.sendMail;
                    }
                }
            }

            for (var i in disabledNotificationsToLoad) {
                if (disabledNotificationsToLoad[i].objectId === notification.objectId) {
                    var msgArr = disabledNotificationsToLoad[i].message.split(": ");
                    if (msgArr[1] === notification.notification) {
                        disabledNotificationsToLoad[i].sendMail = notification.sendMail;
                    }
                }
            }
        }
    });

    socket.on("apio_notification_sms_toggled", function (notification) {
        if (notification.email === $scope.loggedUser) {
            for (var i in $scope.notifications) {
                if ($scope.notifications[i].objectId === notification.objectId) {
                    var msgArr = $scope.notifications[i].message.split(": ");
                    if (msgArr[1] === notification.notification) {
                        $scope.notifications[i].sendSMS = notification.sendSMS;
                    }
                }
            }

            for (var i in unreadNotificationsToLoad) {
                if (unreadNotificationsToLoad[i].objectId === notification.objectId) {
                    var msgArr = unreadNotificationsToLoad[i].message.split(": ");
                    if (msgArr[1] === notification.notification) {
                        unreadNotificationsToLoad[i].sendSMS = notification.sendSMS;
                    }
                }
            }

            for (var i in $scope.disabledNotifications) {
                if ($scope.disabledNotifications[i].objectId === notification.objectId) {
                    var msgArr = $scope.disabledNotifications[i].message.split(": ");
                    if (msgArr[1] === notification.notification) {
                        $scope.disabledNotifications[i].sendSMS = notification.sendSMS;
                    }
                }
            }

            for (var i in disabledNotificationsToLoad) {
                if (disabledNotificationsToLoad[i].objectId === notification.objectId) {
                    var msgArr = disabledNotificationsToLoad[i].message.split(": ");
                    if (msgArr[1] === notification.notification) {
                        disabledNotificationsToLoad[i].sendSMS = notification.sendSMS;
                    }
                }
            }
        }
    });

    $scope.disableNotify = function (n) {
        console.log("CHIAMO DISABLENOTIFY CON: ", n);
        var enabledNotify = document.getElementsByClassName('enabledNotify');
        for (var ntf in enabledNotify) {
            if (enabledNotify.item(ntf).getAttribute('data-message') === n.message && enabledNotify.item(ntf).getAttribute('data-objectId') === n.objectId) {
                Apio.runApioLoading(enabledNotify.item(ntf), false);
            }
        }

        $http.post("/apio/notifications/disable", {
            notification: n,
            username: $scope.loggedUser
        }).success(function () {
        }).error(function () {
            alert("ERRORE nella disabilitazione della notifica")
        });
    };

    $scope.enableNotify = function (n) {
        var disabledNotify = document.getElementsByClassName('disabledNotify');
        for (var ntf in disabledNotify) {
            if (disabledNotify.item(ntf).getAttribute('data-message') === n.message && disabledNotify.item(ntf).getAttribute('data-objectId') === n.objectId) {
                Apio.runApioLoading(disabledNotify.item(ntf), false);
            }
        }

        $http.post("/apio/notifications/enable", {
            notification: n,
            username: $scope.loggedUser
        }).success(function () {
        }).error(function () {
            alert("ERRORE nell'abilitazione della notifica");
        });
    };

    $scope.enableSendMail = function (n) {
        var notification = n.message.split(": ");
        var notificationText = notification[1];
        if (notification[2]) {
            for (var i = 2; i < notification.length; i++) {
                notificationText += ": " + notification[i];
            }
        }

        //$http.get("/apio/getIP").success(function (ip) {
        //    $http.get("/apio/getService/mail").success(function (service) {
        //        //MODIFICA CAUSA INTEGRAZIONE
        //        service.port = "8081";
        //        //FINE
        //        $http.post("http://" + ip.split(" ")[0] + ":" + service.port + "/apio/mail/toggleEnableAll", {
        //            email: $scope.loggedUser,
        //            notification: notificationText,
        //            objectId: n.objectId
        //        }).success(function (s) {
        //            console.log("Enable successfully changed");
        //            for (var ntf in $scope.notifications) {
        //                if ($scope.notifications[ntf].message === n.message) {
        //                    $scope.notifications[ntf].sendMail = !$scope.notifications[ntf].sendMail
        //                }
        //            }
        //            for (var ntfd in $scope.disabledNotifications) {
        //                if ($scope.disabledNotifications[ntfd].message === n.message) {
        //                    $scope.disabledNotifications[ntfd].sendMail = !$scope.disabledNotifications[ntfd].sendMail
        //                }
        //            }
        //        }).error(function (error1) {
        //            console.log("Error while setting enable: ", error1);
        //        });
        //    }).error(function (err) {
        //        console.log("Error while getting service: ", err);
        //    })
        //}).error(function (error) {
        //    console.log("Error while getting ip: ", error)
        //});

        $http.post("/apio/service/notification/route/" + encodeURIComponent("/apio/mail/toggleEnableAll") + "/data/" + encodeURIComponent(JSON.stringify({
                email: $scope.loggedUser,
                notification: notificationText,
                objectId: n.objectId,
                sendMail: !n.sendMail
            }))
        ).success(function (s) {
            console.log("Enable successfully changed");
            //for (var ntf in $scope.notifications) {
            //    if ($scope.notifications[ntf].message === n.message) {
            //        $scope.notifications[ntf].sendMail = !$scope.notifications[ntf].sendMail
            //    }
            //}
            //for (var ntfd in $scope.disabledNotifications) {
            //    if ($scope.disabledNotifications[ntfd].message === n.message) {
            //        $scope.disabledNotifications[ntfd].sendMail = !$scope.disabledNotifications[ntfd].sendMail
            //    }
            //}
        }).error(function (error) {
            console.log("Error while setting enable: ", error);
        });
    };

    $scope.enableSendSMS = function (n) {
        var notification = n.message.split(": ");
        var notificationText = notification[1];
        if (notification[2]) {
            for (var i = 2; i < notification.length; i++) {
                notificationText += ": " + notification[i];
            }
        }

        //$http.get("/apio/getIP").success(function (ip) {
        //    $http.get("/apio/getService/sms").success(function (service) {
        //        //MODIFICA CAUSA INTEGRAZIONE
        //        service.port = "8081";
        //        //FINE
        //        $http.post("http://" + ip.split(" ")[0] + ":" + service.port + "/apio/sms/toggleEnableAll", {
        //            email: $scope.loggedUser,
        //            notification: notificationText,
        //            objectId: n.objectId
        //        }).success(function (s) {
        //            console.log("Enable successfully changed");
        //            for (var ntf in $scope.notifications) {
        //                if ($scope.notifications[ntf].message === n.message) {
        //                    $scope.notifications[ntf].sendSMS = !$scope.notifications[ntf].sendSMS
        //                }
        //            }
        //            for (var ntfd in $scope.disabledNotifications) {
        //                if ($scope.disabledNotifications[ntfd].message === n.message) {
        //                    $scope.disabledNotifications[ntfd].sendSMS = !$scope.disabledNotifications[ntfd].sendSMS
        //                }
        //            }
        //        }).error(function (error1) {
        //            console.log("Error while setting enable: ", error1);
        //        });
        //    }).error(function (err) {
        //        console.log("Error while getting service: ", err);
        //    })
        //}).error(function (error) {
        //    console.log("Error while getting ip: ", error)
        //});

        $http.post("/apio/service/notification/route/" + encodeURIComponent("/apio/sms/toggleEnableAll") + "/data/" + encodeURIComponent(JSON.stringify({
                email: $scope.loggedUser,
                notification: notificationText,
                objectId: n.objectId,
                sendSMS: !n.sendSMS
            }))
        ).success(function (s) {
            console.log("Enable successfully changed");
            //for (var ntf in $scope.notifications) {
            //    if ($scope.notifications[ntf].message === n.message) {
            //        $scope.notifications[ntf].sendSMS = !$scope.notifications[ntf].sendSMS
            //    }
            //}
            //for (var ntfd in $scope.disabledNotifications) {
            //    if ($scope.disabledNotifications[ntfd].message === n.message) {
            //        $scope.disabledNotifications[ntfd].sendSMS = !$scope.disabledNotifications[ntfd].sendSMS
            //    }
            //}
        }).error(function (error) {
            console.log("Error while setting enable: ", error);
        });
    };


    $scope.getTimeFromTimestamp = function (t) {
        var date = new Date(Number(t));
        var day = date.getDate() < 10 ? "0" + date.getDate() : date.getDate();
        var month = (date.getMonth() + 1) < 10 ? "0" + (date.getMonth() + 1) : (date.getMonth() + 1);
        var year = date.getFullYear() < 10 ? "0" + date.getFullYear() : date.getFullYear();
        var hours = date.getHours() < 10 ? "0" + date.getHours() : date.getHours();
        var minutes = date.getMinutes() < 10 ? "0" + date.getMinutes() : date.getMinutes();
        var seconds = date.getSeconds() < 10 ? "0" + date.getSeconds() : date.getSeconds();
        return day + "/" + month + "/" + year + "-" + hours + ":" + minutes + ":" + seconds;
    };

    $scope.loadNotifications = function () {
        $http.get("/apio/notifications/" + $scope.loggedUser).success(function (data) {
            console.log("Got notifications: ", data);

            data.sort(function (a, b) {
                return b.timestamp - a.timestamp;
            });

            unreadNotificationsToLoad = data;
        }).error(function () {
            console.log("Unable to download notifications");
        });

        $http.get("/apio/notifications/listDisabled/" + $scope.loggedUser).success(function (data) {
            console.log("Got notifications: ", data);

            data.sort(function (a, b) {
                return b.timestamp - a.timestamp;
            });

            disabledNotificationsToLoad = data;
        }).error(function () {
            console.log("Unable to download notifications");
        });
    };

    $scope.markAsRead = function (n, $event) {
        console.log("MARKASREAD");
        console.log("n: ", n);
        console.log("$event: ", $event);
        $scope.mouseHold = false;
        document.getElementById('notificationsCenterMobile').style.cursor = "default";
        if (!$event || ($event.target.id !== "disable-notification" && $event.target.id !== "publish-notification")) {
            console.log("CHIAMO MARKASRID CON: ", n);
            $http.post("/apio/notifications/markAsRead", {
                notification: {
                    message: n.message,
                    objectId: n.objectId,
                    timestamp: n.timestamp
                },
                username: $scope.loggedUser
            }).success(function () {
                console.log("Notifica eliminata con successo");
            }).error(function () {
                console.log("ERRORE nell'eliminazione della notifica")
            });
        }
    };

    $scope.publishNotify = function (n) {
        var notification = n.message.split(": ");
        var notificationText = notification[1];
        if (notification[2]) {
            for (var i = 2; i < notification.length; i++) {
                notificationText += ": " + notification[i];
            }
        }

        console.log("notificationText: ", notificationText);

        $http.post("/apio/service/notification/route/" + encodeURIComponent("/apio/notification/deleteUser") + "/data/" + encodeURIComponent(JSON.stringify({
                email: $scope.loggedUser,
                notification: notificationText,
                objectId: n.objectId
            }))
        ).success(function (s) {
            console.log("Enable successfully changed");
            for (var ntf = 0; ntf < $scope.notifications.length; ntf++) {
                if ($scope.notifications[ntf].message === n.message) {
                    $scope.notifications.splice(ntf--, 1);
                }
            }

            for (var ntfd = 0; ntfd < $scope.disabledNotifications.length; ntfd++) {
                if ($scope.disabledNotifications[ntfd].message === n.message) {
                    $scope.disabledNotifications.splice(ntfd--, 1);
                }
            }

            for (var i = 0; i < disabledNotificationsToLoad; i++) {
                if (disabledNotificationsToLoad[i].message === n.message) {
                    disabledNotificationsToLoad.splice(i--, 1);
                }
            }

            for (var i = 0; i < unreadNotificationsToLoad; i++) {
                if (unreadNotificationsToLoad[i].message === n.message) {
                    unreadNotificationsToLoad.splice(i--, 1);
                }
            }

            $http.post("/apio/notifications/markAsRead", {
                notification: {
                    message: n.message,
                    objectId: n.objectId,
                    timestamp: n.timestamp
                },
                username: $scope.loggedUser
            }).success(function () {
                console.log("Notifica eliminata con successo");
            }).error(function () {
                console.log("ERRORE nell'eliminazione della notifica")
            });
        }).error(function (error) {
            console.log("Error while setting enable: ", error);
        });
    };

    $scope.readAll = function () {
        $scope.mouseHold = true;
        document.getElementById('notificationsCenterMobile').style.cursor = "wait";
        setTimeout(function () {
            if ($scope.mouseHold) {
                document.getElementById('notificationsCenterMobile').style.cursor = "default";
                $http.post("/apio/notifications/readAll", {username: $scope.loggedUser}).success(function () {
                    $scope.notifications = [];
                }).error(function () {
                    alert('errore nello svuotamento della variabile');
                });
            }
        }, 2000);
    };

    $scope.toggleShowDisabled = function () {
        $scope.showDisabled = !$scope.showDisabled;
    };

    $http.get("/apio/user/getSession").success(function (data) {
        $scope.loggedUser = data;
        $scope.loadNotifications();
    }).error(function (error) {
        console.log("Error while getting session: ", error);
    });
}]);