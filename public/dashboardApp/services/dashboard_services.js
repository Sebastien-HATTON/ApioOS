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

angular.module("ApioDashboardApplication").controller("ApioDashboardServicesController", ["$scope", "$http", "$location", function ($scope, $http, $location) {
    $http.get("/apio/getServices").success(function (data) {
        //$scope.services = data.sort(function (a, b) {
        //    return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : a.name.toLowerCase() > b.name.toLowerCase() ? 1 : Number(a.objectId) - Number(b.objectId);
        //});
        var services = data.sort(function (a, b) {
            return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : a.name.toLowerCase() > b.name.toLowerCase() ? 1 : Number(a.objectId) - Number(b.objectId);
        });
        $http.get("/apio/getFiles/" + encodeURIComponent("dashboardApp/services/servicesApp")).success(function (files) {
            //for (var i = 0; i < $scope.services.length; i++) {
            //    var found = false;
            //    for (var j = 0; !found && j < files.length; j++) {
            //        if ($scope.services[i].name === files[j]) {
            //            found = true;
            //        }
            //    }
            //
            //    if (!found) {
            //        $scope.services.splice(i--, 1);
            //    }
            //}
            //
            //$location.path("/services/" + $scope.services[0].name);

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

            $location.path("/services/" + $scope.services[0].name);
        }).error(function (error) {
            console.log("Error while getting files of folder public/dashboardApp/services/servicesApp: ", error);
        })
    }).error(function (error) {
        console.log("Error while getting services: ", error);
    });
}]);