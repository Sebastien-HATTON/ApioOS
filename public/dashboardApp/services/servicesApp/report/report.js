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

angular.module("ApioDashboardApplication").controller("ApioDashboardReportController", ["$scope", "$http", function ($scope, $http) {
    $scope.$watch("isTextDefault", function (newValue) {
        if (newValue === true) {
            var updt = {};
            $scope.newTextValue = "";
            for (var i in $scope.serviceData) {
                $scope.serviceData[i].text = $scope.newTextValue;
            }
            updt[$scope.currentObject.objectId] = $scope.serviceData;

            $http.post("http://apiogreen.cloudapp.net:8090/apio/report/modifyPost", {
                data: updt
            }).success(function (data) {
                console.log("Service Report successfully updated");
            }).error(function (error) {
                console.log("Error while sending request to http://apiogreen.cloudapp.net:8090/apio/report/modifyPost: ", error);
            });
        }
    });

    $scope.$watchCollection("allow", function (newValue, oldValue) {
        if (newValue && oldValue) {
            for (var i in newValue) {
                if (newValue[i] !== oldValue[i]) {
                    $http.post("http://apiogreen.cloudapp.net:8090/apio/report/sendReport", {
                        email: $scope.loggedUser,
                        objectId: i,
                        sendReport: newValue[i]
                    }).success(function (data) {
                        console.log("Status changed succefully: ", data);
                    }).error(function (err) {
                        console.log("Error while changing the status: ", err);
                    });

                    break;
                }
            }
        }
    });

    $scope.newText = function () {
        var updt = {};
        for (var i in $scope.serviceData) {
            $scope.serviceData[i].text = $scope.newTextValue;
        }
        updt[$scope.currentObject.objectId] = $scope.serviceData;

        $http.post("http://apiogreen.cloudapp.net:8090/apio/report/modifyPost", {
            data: updt
        }).success(function (data) {
            console.log("Service Report successfully updated");
        }).error(function (error) {
            console.log("Error while sending request to http://apiogreen.cloudapp.net:8090/apio/report/modifyPost: ", error);
        });
    };

    $scope.showNotification = function (n) {
        $scope.currentObject = n;

        $http.get("http://apiogreen.cloudapp.net:8090/apio/report/getService").success(function (service) {
            $scope.serviceData = service.data[n.objectId];
            var flag = true;
            for (var i = 0; flag && i < $scope.serviceData.length; i++) {
                if ($scope.serviceData[i].user === $scope.loggedUser) {
                    $scope.newTextValue = $scope.serviceData[i].text;
                    $scope.isTextDefault = $scope.newTextValue === "";
                }
            }

            $("#notifModal").modal();
        }).error(function (error) {
            console.log("Error while sending request to http://apiogreen.cloudapp.net:8090/apio/report/getService: ", error);
        });
    };

    $http.get("/apio/user/getSession").success(function (session) {
        $scope.loggedUser = session;
        $http.get("/apio/database/getObjects").success(function (objects) {
            for (var i in objects) {
                if (objects[i].type !== "object") {
                    objects.splice(i, 1);
                }
            }

            $scope.objects = objects.sort(function (a, b) {
                return a.name < b.name ? -1 : a.name > b.name ? 1 : Number(a.objectId) - Number(b.objectId);
            });

            $scope.allow = {};
            for (var i in $scope.objects) {
                for (var j in $scope.objects[i].user) {
                    if ($scope.objects[i].user[j].email === $scope.loggedUser) {
                        $scope.allow[$scope.objects[i].objectId] = $scope.objects[i].user[j].sendReport ? $scope.objects[i].user[j].sendReport : true;
                    }
                }
            }
        }).error(function (err_) {
            console.log("Error while getting users: ", err_);
        });
    }).error(function (err) {
        console.log("Unable to get session, error: ", err);
    });
}]);