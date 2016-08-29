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

var apioProperty = angular.module("apioProperty");
apioProperty.directive("ranking", ["currentObject", "socket", "$http", function (currentObject, socket, $http) {
    return {
        restrict: "E",
        transclude: true,
        scope: {},
        templateUrl: "apioProperties/Ranking/ranking.html",
        link: function (scope, elem, attrs, controller) {
            scope.object = currentObject.get();
            scope.propertyValue = Number(attrs['propertyvalue']);
            //scope.propertyRif = attrs['propertyValue'];
            scope.rankingTrue = attrs['rankingImageTrue'];
            scope.rankingFalse = attrs['rankingImageFalse'];
            scope.propertyname = attrs.propertyname;
            scope.displayStar = 0;
            //var inputElement = $(elem).find("[propertyinput]");
            $http.get("/apio/getPlatform").success(function (data) {
                if (data.type == "gateway") {
                    scope.object.apioId = data.apioId;
                }
            });

            scope.currentObject = currentObject;
            scope.isRecorded = function () {
                return scope.currentObject.record(scope.propertyname);
            };

            scope.addPropertyToRecording = function ($event) {
                $event.stopPropagation();
                //scope.currentObject.record(scope.propertyname, inputElement.val());
            };

            scope.removePropertyFromRecording = function ($event) {
                $event.stopPropagation();
                scope.currentObject.removeFromRecord(scope.propertyname);
            };

            scope.rankingDisplay = function () {
                if (Number(attrs['minStar1']) < Number(scope.propertyValue) && Number(scope.propertyValue) < Number(attrs['maxStar1'])) {
                    scope.displayStar = 1;
                } else if (Number(attrs['minStar2']) < Number(scope.propertyValue) && Number(scope.propertyValue) < Number(attrs['maxStar2'])) {
                    scope.displayStar = 2;
                } else if (Number(attrs['minStar3']) < Number(scope.propertyValue) && Number(scope.propertyValue) < Number(attrs['maxStar3'])) {
                    scope.displayStar = 3;
                } else if (Number(attrs['minStar4']) < Number(scope.propertyValue) && Number(scope.propertyValue) < Number(attrs['maxStar4'])) {
                    scope.displayStar = 4;
                } else if (Number(attrs['minStar5']) < Number(scope.propertyValue)) {
                    scope.displayStar = 5;
                }
                console.log('il valore di riferimento è: ', scope.propertyValue);
                console.log('displayStar vale: ', scope.displayStar);
            }

            attrs.$observe('propertyvalue', function (newVal, oldVal) {

                scope.rankingDisplay();
                scope.object.properties[scope.propertyname] = scope.displayStar;

                console.log('interviene il watch', scope.object.properties.ranking);
            });


        }
    };
}]);
