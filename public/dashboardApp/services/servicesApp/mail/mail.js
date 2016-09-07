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

angular.module("ApioDashboardApplication").controller("ApioDashboardMailController", ["$scope", "$http", function ($scope, $http) {
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
        } else if (o.hasOwnProperty("user")) {
            for (var i = 0; !ret && i < o.user.length; i++) {
                if (o.user[i].email === e) {
                    ret = true;
                }
            }
        }

        return ret;
    };

    $scope.defaultNumber = "none";
    $scope.loggedUser = "";
    $scope.newNumberModel = "";
    $scope.notifications = [];
    $scope.notificationsIds = {};
    $scope.notificationsNames = [];
    $scope.sms = [];

    $scope.addNewNumber = function () {
        if ($scope.newNumberModel) {
            var isIn = false;
            for (var i = 0; i < $scope.sms.length; i++) {
                if ($scope.sms[i].number === $scope.newNumberModel) {
                    isIn = true;
                }
            }

            if (isIn) {
                alert("This number is already present");
            } else {
                $scope.sms.push({
                    number: $scope.newNumberModel,
                    default: false
                });

                for (var i in $scope.service.data) {
                    for (var j in $scope.service.data[i].properties) {
                        for (var k in $scope.service.data[i].properties[j]) {
                            for (var l in $scope.service.data[i].properties[j][k].users) {
                                if ($scope.loggedUser.email === $scope.service.data[i].properties[j][k].users[l].email) {
                                    $scope.service.data[i].properties[j][k].users[l].sendTo.push({
                                        contact: $scope.newNumberModel,
                                        enabled: true
                                    });
                                }
                            }
                        }
                    }
                }

                $http.post("/apio/user/modifyAdditionalInfo", {
                    data: {
                        mail: $scope.sms
                    },
                    email: $scope.loggedUser.email
                }).success(function () {
                    $http.post("/apio/service/notification/route/" + encodeURIComponent("/apio/mail/addContact") + "/data/" + encodeURIComponent(JSON.stringify({
                            contact: $scope.newNumberModel,
                            email: $scope.loggedUser.email
                        }))).success(function () {
                        console.log("Data of service mail successfully modified");
                        $scope.newNumberModel = "";
                    }).error(function (error) {
                        console.log("Error while sending request to /apio/mail/addContact: ", error);
                    });
                }).error(function (err) {
                    $scope.newNumberModel = "";
                    console.log("Error while updating addition_info, error: ", err);
                });

                console.log("$scope.service.data: ", $scope.service.data);
            }
        } else {
            alert("Please insert a number before");
        }
    };

    $scope.changeDefault = function (s) {
        $scope.defaultNumber = s.number;
        for (var i in $scope.sms) {
            $scope.sms[i].default = false;
        }
        s.default = true;

        $http.post("/apio/user/modifyAdditionalInfo", {
            data: {
                mail: $scope.sms
            },
            email: $scope.loggedUser.email
        }).success(function () {
        }).error(function (err) {
            console.log("Error while updating addition_info, error: ", err);
        });
    };

    $scope.newText = function () {
        for (var i in $scope.service.data[$scope.objectId].properties) {
            for (var j in $scope.service.data[$scope.objectId].properties[i]) {
                for (var k in $scope.service.data[$scope.objectId].properties[i][j].users) {
                    if ($scope.loggedUser.email === $scope.service.data[$scope.objectId].properties[i][j].users[k].email && $scope.currentNotification === $scope.service.data[$scope.objectId].properties[i][j].users[k].message) {
                        for (var ii in $scope.notificationsIds) {
                            if ($scope.notificationsIds[ii] === $scope.objectId) {
                                var index = $scope.notificationsNames.indexOf(ii);
                                for (var jj in $scope.notifications[index]) {
                                    if ($scope.notifications[index][jj] === $scope.service.data[$scope.objectId].properties[i][j].users[k].message) {
                                        $scope.notifications[index][jj] = $scope.newTextValue;
                                    }
                                }
                            }
                        }

                        if (!$scope.$$phase) {
                            $scope.$apply();
                        }

                        $scope.service.data[$scope.objectId].properties[i][j].users[k].message = $scope.newTextValue;
                        for (var x in $scope.service.data[$scope.objectId].properties[i][j].users[k].sendTo) {
                            delete $scope.service.data[$scope.objectId].properties[i][j].users[k].sendTo[x].$$hashKey;
                        }
                        console.log("$scope.service.data[$scope.objectId]:", $scope.service.data[$scope.objectId]);
                        $http.post("/apio/service/notification/route/" + encodeURIComponent("/apio/mail/newText") + "/data/" + encodeURIComponent(JSON.stringify({
                                email: $scope.loggedUser.email,
                                newMessage: $scope.newTextValue,
                                objectId: $scope.objectId,
                                oldMessage: $scope.currentNotification
                            }))).success(function () {
                            console.log("Success");
                        }).error(function (error) {
                            console.log("Error while sending request to /apio/mail/newText: ", error);
                        });
                    }
                }
            }
        }
    };

    $scope.removeNumber = function (s) {
        var found = false;
        for (var i = 0; !found && i < $scope.sms.length; i++) {
            if ($scope.sms[i].number === s.number) {
                found = true;
                $scope.sms.splice(i, 1);
            }
        }

        if ($scope.sms[0] && s.default === true) {
            $scope.sms[0].default = true;
            $scope.defaultNumber = $scope.sms[0].number;
        }

        for (var i in $scope.service.data) {
            for (var j in $scope.service.data[i].properties) {
                for (var k in $scope.service.data[i].properties[j]) {
                    for (var l in $scope.service.data[i].properties[j][k].users) {
                        if ($scope.loggedUser.email === $scope.service.data[i].properties[j][k].users[l].email) {
                            for (var x in $scope.service.data[i].properties[j][k].users[l].sendTo) {
                                if ($scope.service.data[i].properties[j][k].users[l].sendTo[x].contact === s.number) {
                                    $scope.service.data[i].properties[j][k].users[l].sendTo.splice(x, 1);
                                }
                            }
                        }
                    }
                }
            }
        }

        $http.post("/apio/user/modifyAdditionalInfo", {
            data: {
                mail: $scope.sms
            },
            email: $scope.loggedUser.email
        }).success(function () {
            $http.post("/apio/service/notification/route/" + encodeURIComponent("/apio/mail/removeContact") + "/data/" + encodeURIComponent(JSON.stringify({
                    contact: s.number,
                    email: $scope.loggedUser.email
                }))).success(function () {
                console.log("Data of service mail successfully modified");
            }).error(function (error) {
                console.log("Error while sending request to /apio/mail/removeContact: ", error);
            });
        }).error(function (err) {
            console.log("Error while updating addition_info, error: ", err);
        });
    };

    $scope.showNumberManagement = function () {
        $("#mailsModal").modal();
    };

    $scope.showNotification = function (objectId, n) {
        if (document.getElementById(n)) {
            Apio.runApioLoading(document.getElementById(n), true, "10");
        }
        $scope.currentNotification = n;
        $scope.objectId = objectId;
        console.log("$scope.currentNotification: ", $scope.currentNotification);

        for (var i in $scope.service.data[$scope.objectId].properties) {
            for (var j in $scope.service.data[$scope.objectId].properties[i]) {
                for (var k in $scope.service.data[$scope.objectId].properties[i][j].users) {
                    if ($scope.loggedUser.email === $scope.service.data[$scope.objectId].properties[i][j].users[k].email && $scope.currentNotification === $scope.service.data[$scope.objectId].properties[i][j].users[k].message) {
                        $scope.numbersData = $scope.service.data[$scope.objectId].properties[i][j].users[k].sendTo;
                        $scope.newTextValue = $scope.service.data[$scope.objectId].properties[i][j].users[k].message;
                        $("#notifModal").modal();
                        if (document.getElementById(n)) {
                            Apio.stopApioLoading();
                        }
                        break;
                    }
                }
            }
        }
    };

    $scope.toggleSend = function (dataNumber) {
        if ($scope.service && $scope.service.data) {
            delete dataNumber.$$hashKey;
            dataNumber.enabled = !dataNumber.enabled;
            $http.post("/apio/service/notification/route/" + encodeURIComponent("/apio/mail/toggleEnable") + "/data/" + encodeURIComponent(JSON.stringify({
                    email: $scope.loggedUser.email,
                    contact: dataNumber.contact,
                    notification: $scope.currentNotification,
                    objectId: $scope.objectId
                }))).success(function () {
                console.log("Data of service mail successfully modified");
            }).error(function (error) {
                console.log("Error while sending request to /apio/mail/toggleEnable: ", error);
            });
        }
    };

    $scope.mail_ready = false;
    $http.get("/apio/user/getSessionComplete").success(function (session) {
        $scope.loggedUser = session;
        $http.post("/apio/user/getUser", {email: $scope.loggedUser.email}).success(function (data) {
            $scope.sms = [{number: $scope.loggedUser.email, default: true}];
            if ($scope.loggedUser.hasOwnProperty("apioId") && !data.user.hasOwnProperty("role")) {
                for (var i = 0, found = false; !found && i < data.user.apioId.length; i++) {
                    if (data.user.apioId[i].code === $scope.loggedUser.apioId) {
                        data.user.role = data.user.apioId[i].role;
                        found = true;
                    }
                }
            }

            if (data.hasOwnProperty("user") && data.user.hasOwnProperty("additional_info") && data.user.additional_info.hasOwnProperty("mail")) {
                for (var i in data.user.additional_info.mail) {
                    var walk = true;
                    for (var j in $scope.sms) {
                        if (data.user.additional_info.mail[i].number === $scope.sms[j].number) {
                            walk = false;
                        }
                    }

                    if (walk) {
                        $scope.sms.push(data.user.additional_info.mail[i]);
                    }
                }

                for (var i = 0; $scope.defaultNumber === "none" && i < $scope.sms.length; i++) {
                    if ($scope.sms[i].default === true) {
                        $scope.defaultNumber = $scope.sms[i].number;
                        $scope.sms[0].default = false;
                    }
                }
            }
            $http.get("/apio/database/getObjects").success(function (objects) {
                $http.get("/apio/service/notification/route/" + encodeURIComponent("/apio/mail/getService?user=" + $scope.loggedUser.email)).success(function (service) {
                    $scope.service = service;
                    $scope.service.port = "8081";
                    console.log("$scope.service: ", $scope.service);
                    var lastLength = 0;

                    for (var i in objects) {
                        if (proceed(data.user.role, data.user.email, objects[i])) {
                            if ($scope.service.data.hasOwnProperty(objects[i].objectId) && Object.keys($scope.service.data[objects[i].objectId]).length) {
                                lastLength = $scope.notificationsNames.push(objects[i].name);
                                $scope.notifications[lastLength - 1] = [];
                                $scope.notificationsIds[objects[i].name] = objects[i].objectId;

                                for (var j in $scope.service.data[objects[i].objectId].properties) {
                                    for (var k in $scope.service.data[objects[i].objectId].properties[j]) {
                                        for (var l in $scope.service.data[objects[i].objectId].properties[j][k].users) {
                                            if ($scope.loggedUser.email === $scope.service.data[objects[i].objectId].properties[j][k].users[l].email) {
                                                $scope.notifications[lastLength - 1].push($scope.service.data[objects[i].objectId].properties[j][k].users[l].message);
                                            }
                                        }
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

                    console.log("$scope.notificationsNames: ", $scope.notificationsNames);
                    console.log("$scope.notificationsIds: ", $scope.notificationsIds);
                    console.log("$scope.notifications: ", $scope.notifications);

                    for (var i in $scope.notifications) {
                        $scope.notifications[i].sort();
                    }

                    $scope.mail_ready = true;
                }).error(function (error) {
                    console.log("Error while getting service notification: ", error);
                });
            }).error(function (err_) {
                console.log("Error while getting objects: ", err_);
            });
        }).error(function (error) {
            console.log("Unable to get user with e-mail " + $scope.loggedUser.email + ", error: ", error);
        });
    }).error(function (err) {
        console.log("Unable to get session, error: ", err);
    });
}]);