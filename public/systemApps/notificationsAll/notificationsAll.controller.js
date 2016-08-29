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
 ***************************************************************************/


angular.module('ApioApplication').controller('ApioNotificationsAllController', ['$scope', '$http', 'socket', 'objectService', 'currentObject', "$timeout", function ($scope, $http, socket, objectService, currentObject, $timeout) {
    if (!document.getElementById("apioWaitLoadingSystemOperation").classList.contains("apioWaitLoadingSystemOperationOn")) {
        document.getElementById("apioWaitLoading").classList.remove("apioWaitLoadingOff");
        document.getElementById("apioWaitLoading").classList.add("apioWaitLoadingOn");
        $timeout(function () {
            document.getElementById("apioWaitLoading").classList.remove("apioWaitLoadingOn");
            document.getElementById("apioWaitLoading").classList.add("apioWaitLoadingOff");
        }, 1000);
    }

    document.getElementById("targetBody").style.position = "";
    $("#ApioApplicationContainer").hide(function () {
        $("#ApioApplicationContainer").html("");
    });
    $("#notificationsCenter").slideUp(500);
    if (document.getElementById('menuMobileContratto')) {
        document.getElementById('menuMobileContratto').classList.remove('in');
    }
    //Reset handlers
    $("#ApioApplicationContainer").off("touchstart");
    $("#ApioApplicationContainer").off("touchend");
    $("#ApioApplicationContainer").off("mousedown");
    $("#ApioApplicationContainer").off("mouseup");

    $http.get("/apio/user/getSession").success(function (session) {
        $scope.loggedUser = session;
        $http.post("/apio/user/getUser", {email: $scope.loggedUser}).success(function (data) {
            $http.get("/apio/database/getObjects").success(function (objects) {
                $http.get("/apio/notifications/" + $scope.loggedUser).success(function (notifications) {
                    $http.get("/apio/notifications/listDisabled/" + $scope.loggedUser).success(function (disabledNotifications) {
                        var lastLength = 0;

                        var numberPositionInString = function (str) {
                            for (var i in str) {
                                if (str[i] === "0" || str[i] === "1" || str[i] === "2" || str[i] === "3" || str[i] === "4" || str[i] === "5" || str[i] === "6" || str[i] === "7" || str[i] === "8" || str[i] === "9") {
                                    return i;
                                }
                            }

                            return -1;
                        };

                        var proceed = function (r, e, o) {
                            var ret = false;
                            if (r === "superAdmin") {
                                ret = true;
                            } else {
                                for (var i = 0; !ret && i < o.user.length; i++) {
                                    if (o.user[i].email === e) {
                                        ret = true;
                                    }
                                }
                            }

                            return ret;
                        };

                        $scope.notifications = [];
                        $scope.notificationsNames = [];

                        for (var i in objects) {
                            if (proceed(data.user.role, data.user.email, objects[i])) {
                                if (Object.keys(objects[i].notifications).length && !$scope.notificationsNames.hasOwnProperty(objects[i].name)) {
                                    lastLength = $scope.notificationsNames.push(objects[i].name);
                                }

                                for (var j in objects[i].notifications) {
                                    $scope.notifications[lastLength - 1] = [];
                                    for (var k in objects[i].notifications[j]) {
                                        if (typeof objects[i].notifications[j][k].message !== "undefined" && $scope.notifications[lastLength - 1].indexOf(objects[i].notifications[j][k].message) === -1) {
                                            $scope.notifications[lastLength - 1].push({
                                                name: objects[i].name + " is now online",
                                                objectName: objects[i].name,
                                                objectId: objects[i].objectId,
                                                properties: "online"
                                            });

                                            var p = {};
                                            p[j] = objects[i].notifications[j][k].value;
                                            $scope.notifications[lastLength - 1].push({
                                                name: objects[i].notifications[j][k].message,
                                                objectName: objects[i].name,
                                                objectId: objects[i].objectId,
                                                properties: p
                                            });
                                        }
                                    }
                                }
                            }
                        }

                        for (var i = 0; i < $scope.notificationsNames.length - 1; i++) {
                            for (var j = i + 1; j < $scope.notificationsNames.length; j++) {
                                var numberInA = numberPositionInString($scope.notificationsNames[i].toLowerCase());
                                var numberInB = numberPositionInString($scope.notificationsNames[j].toLowerCase());

                                if (numberInA > -1 && numberInB > -1 && numberInA === numberInB) {
                                    var preNumA = $scope.notificationsNames[i].toLowerCase().substring(0, numberInA);
                                    var numA = Number($scope.notificationsNames[i].toLowerCase().substring(numberInA));
                                    var preNumB = $scope.notificationsNames[j].toLowerCase().substring(0, numberInB);
                                    var numB = Number($scope.notificationsNames[j].toLowerCase().substring(numberInB));

                                    if (preNumA === preNumB) {
                                        if (numA > numB) {
                                            var name = $scope.notificationsNames[i];
                                            $scope.notificationsNames[i] = $scope.notificationsNames[j];
                                            $scope.notificationsNames[j] = name;
                                            var notif = $scope.notifications[i];
                                            $scope.notifications[i] = $scope.notifications[j];
                                            $scope.notifications[j] = notif;
                                        }
                                    } else {
                                        if (preNumA > preNumB) {
                                            var name = $scope.notificationsNames[i];
                                            $scope.notificationsNames[i] = $scope.notificationsNames[j];
                                            $scope.notificationsNames[j] = name;
                                            var notif = $scope.notifications[i];
                                            $scope.notifications[i] = $scope.notifications[j];
                                            $scope.notifications[j] = notif;
                                        }
                                    }
                                } else {
                                    if ($scope.notificationsNames[i] > $scope.notificationsNames[j]) {
                                        var name = $scope.notificationsNames[i];
                                        $scope.notificationsNames[i] = $scope.notificationsNames[j];
                                        $scope.notificationsNames[j] = name;
                                        var notif = $scope.notifications[i];
                                        $scope.notifications[i] = $scope.notifications[j];
                                        $scope.notifications[j] = notif;
                                    }
                                }
                            }
                        }

                        for (var i in $scope.notifications) {
                            for (var j in $scope.notifications[i]) {
                                $scope.notifications[i][j].sendMail = true;
                                $scope.notifications[i][j].sendSMS = true;
                                for (var k in notifications) {
                                    if ($scope.notifications[i][j].name === notifications[k].message) {
                                        $scope.notifications[i][j].sendMail = notifications[k].sendMail;
                                        $scope.notifications[i][j].sendSMS = notifications[k].sendSMS;
                                    }
                                }

                                for (var k in disabledNotifications) {
                                    if ($scope.notifications[i][j].name === disabledNotifications[k].message) {
                                        $scope.notifications[i][j].sendMail = disabledNotifications[k].sendMail;
                                        $scope.notifications[i][j].sendSMS = disabledNotifications[k].sendSMS;
                                    }
                                }
                            }
                        }

                        console.log("$scope.notificationsNames: ", $scope.notificationsNames);
                        console.log("$scope.notifications: ", $scope.notifications);
                    });
                });
            }).error(function (err_) {
                console.log("Error while getting objects: ", err_);
            });

            for (var i in $scope.notifications) {
                $scope.notifications[i].sort();
            }
        }).error(function (error) {
            console.log("Unable to get user with e-mail " + session + ", error: ", error);
        });
    }).error(function (error) {
        console.log("Error while getting session: ", error);
    });

    $scope.enableSendMail = function (n) {
        n.sendMail = !n.sendMail;
        $http.put("/apio/notifications/sendMail/" + $scope.loggedUser, {
            notification: {
                message: n.name,
                objectId: n.objectId
            },
            sendMail: n.sendMail
        }).success(function () {
            console.log("++++++++EMAIL ATTIVATA/DISATTIVATA CORRETTAMENTE++++++++");
        }).error(function () {
            console.log("++++++++ERRORE NELLA ATTIVAZIONE/DISATTIVAZIONE DELLA MAIL++++++++");
            n.sendMail = !n.sendMail;
        });
    };

    $scope.enableSendSMS = function (n) {
        n.sendSMS = !n.sendSMS;
        $http.put("/apio/notifications/sendSMS/" + $scope.loggedUser, {
            notification: {
                message: n.name,
                objectId: n.objectId
            },
            sendSMS: n.sendSMS
        }).success(function () {
            console.log("++++++++EMAIL ATTIVATA/DISATTIVATA CORRETTAMENTE++++++++");
            //$http.get("/apio/getIP").success(function (ip) {
            //    $http.post("http://" + ip.split(" ")[0] + ":8090/sms/setSend", {
            //        notificationText: n.name,
            //        send: n.sendSMS,
            //        user: $scope.loggedUser
            //    }).success(function () {
            //        console.log("Send successfully changed");
            //    }).error(function (error) {
            //        console.log("Error while setting send: ", error);
            //    });
            //}).error(function (err) {
            //    console.log("Error while getting IP: ", err);
            //});
            $http.post("/apio/service/notification/route/" + encodeURIComponent("/apio/sms/setSend") + "/data/" + encodeURIComponent(JSON.stringify({
                    notificationText: n.name,
                    send: n.sendSMS,
                    user: $scope.loggedUser
                }))).success(function () {
                console.log("Send successfully changed");
            }).error(function (error) {
                console.log("Error while setting send: ", error);
            });
        }).error(function () {
            console.log("++++++++ERRORE NELLA ATTIVAZIONE/DISATTIVAZIONE DELLA MAIL++++++++");
            n.sendSMS = !n.sendSMS;
        });
    };

    $scope.publishNotify = function (n, obj) {
        var s = {
            active: false,
            name: n.name,
            objectName: obj,
            objectId: n.objectId,
            properties: n.properties
        };

        var dao = {
            state: s
        };

        $http.post("/apio/state", dao).success(function (data) {
            if (data.error === "STATE_NAME_EXISTS") {
                alert("Uno stato con questo nome è già presente in bacheca, si prega di sceglierne un altro")
            } else if (data.error === "STATE_PROPERTIES_EXIST") {
                alert("Lo stato di nome " + s.name + " non è stato pubblicato perchè lo stato " + data.state + " ha già le stesse proprietà");
            } else if (data.error === false) {
                alert("Notifica pubblicata");
            }
        }).error(function () {
            alert("Si è verificato un errore di sistema");
        });
    };


    $scope.currentApplication = null;
    /*
     socket.on('apio_state_update', function (state) {
     console.log("Arrivata modifica di uno stato dal server, la applico", state);
     for(var i in $scope.groupedStates){
     for(var j in $scope.groupedStates[i]) {
     if ($scope.groupedStates[i][j].name === state.name) {
     $scope.groupedStates[i][j].properties = state.properties;
     $scope.groupedStates[i][j].active = state.active;
     }
     }
     }
     });

     socket.on('apio_state_delete', function (state) {
     for(var i in $scope.groupedStates){
     for(var j in $scope.groupedStates[i]) {
     if ($scope.groupedStates[i][j].name === state.name) {
     $scope.groupedStates[i].splice(j, 1);
     }
     }

     if (Object.keys($scope.groupedStates[i]).length === 0) {
     delete $scope.groupedStates[i];
     }
     }
     });

     socket.on('apio_state_new', function (state) {
     var n = state.objectName.slice(0);
     delete state.objectName;
     if(typeof $scope.groupedStates[n] === "undefined"){
     $scope.groupedStates[n] = [];
     }
     $scope.groupedStates[n].push(state);
     $scope.groupedStates = order($scope.groupedStates);
     });
     */

}]);
