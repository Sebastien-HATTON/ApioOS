//Copyright 2014-2015 Alex Benfaremo, Alessandro Chelli, Lorenzo Di Berardino, Matteo Di Sabatino

/********************************** LICENSE *********************************
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

angular.module("ApioDashboardApplication").controller("ApioDashboardHomeController", ["$scope", "userService", "objectService", "$http", function ($scope, userService, objectService, $http) {
    $scope.mail = "";
    $scope.userEmail = "";
    $scope.userPassword = "";
    $scope.writeToDatabase = false;
    $scope.writeToSerial = false;

    $scope.currentUserEmail = function () {
        $http.get("/apio/user/getSession").success(function (data) {
            console.log(data);
            $http.post("/apio/user/getUser", {
                email: data
            }).success(function (a) {
                console.log(a);
                $scope.currentUserActive = a.user;
                $scope.currentUserSurname = $scope.currentUserActive.email.split("@")[1];
                console.log("$scope.currentUserSurname = ", $scope.currentUserSurname);
                console.log($scope.currentUserActive);
            });
        });
    };

    $scope.initApioDashboardObjectList = function () {
        objectService.list().then(function (d) {
            $scope.objects = d.data;
            console.log($scope.objects);
        });
    };

    $scope.initApioDashboardUsersList = function () {
        userService.list().then(function (d) {
            $scope.users = d.data.users;
            console.log($scope.users.length);
        });
    };

    $http.get("/apio/database/getObjects").success(function (objects) {
        $scope.objects = objects;
        if (!$scope.$$phase) {
            $scope.$apply();
        }
        $http.get("/apio/user").success(function (users) {
            $scope.users = users.users;
            if (!$scope.$$phase) {
                $scope.$apply();
            }
            $http.get("/apio/user/getSession").success(function (data) {
                $http.post("/apio/user/getUser", {
                    email: data
                }).success(function (a) {
                    $scope.currentUserActive = a.user;
                    $scope.currentUserSurname = $scope.currentUserActive.email.split("@")[0];
                    //console.log("$scope.currentUserSurname = ", $scope.currentUserSurname);
                    if (!$scope.currentUserActive.hasOwnProperty("role")) {
                        $http.get("/apio/user/getSessionComplete").success(function (s) {
                            $scope.currentUserActive.role = s.priviligies;
                            if (!$scope.$$phase) {
                                $scope.$apply();
                            }
                        });
                    }

                    //$http.get("/apio/service/dongle/route/" + encodeURIComponent("/apio/logic")).success(function (data) {
                    $http.get("/apio/service/logic/route/" + encodeURIComponent("/apio/logic")).success(function (data) {
                        $scope.logics = data;
                        if (!$scope.$$phase) {
                            $scope.$apply();
                        }

                        $http.get("/apio/getServices").success(function (data) {
                            var services = data;
                            $http.get("/apio/getFiles/" + encodeURIComponent("dashboardApp/services/servicesApp")).success(function (files) {
                                for (var i = 0; i < services.length; i++) {
                                    var found = false;
                                    for (var j = 0; !found && j < files.length; j++) {
                                        if (services[i].name === files[j]) {
                                            found = true;
                                        }
                                    }

                                    if (!found) {
                                        services.splice(i--, 1);
                                    }
                                }

                                $scope.services = services;
                                if (!$scope.$$phase) {
                                    $scope.$apply();
                                }
                            }).error(function (error) {
                                console.log("Error while getting files of folder public/dashboardApp/services/servicesApp: ", error);
                                $scope.services = [];
                            })
                        }).error(function (error) {
                            console.log("Error while getting services: ", error);
                            $scope.services = [];
                        });
                    }).error(function (error) {
                        $scope.logics = [];
                    });
                });
            });
        }).error(function (err) {
            console.log("Error while getting users: ", err);
        });
    }).error(function (error) {
        console.log("Error while getting objects: ", error);
    });

    $scope.sendEncodedString = function () {
        var o = Apio.Util.ApioToJSON($scope.encodedString);
        o.writeToDatabase = $scope.writeToDatabase;
        o.writeToSerial = $scope.writeToSerial;
        Apio.socket.emit("apio_client_update", o);
    }
}]);
