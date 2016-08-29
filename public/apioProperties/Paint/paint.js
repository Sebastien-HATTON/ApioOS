//Copyright 2014-2015 Alex Benfaremo, Alessandro Chelli, Lorenzo Di Berardino, Matteo Di Sabatino

/********************************** LICENSE **********************************
 *                                                                           *
 * This file is part of ApioOS.                                              *
 *                                                                           *
 * ApioOS is free software released under the GPLv2 license: you can         *
 * redistribute it and/or modify it under the terms of the GNU General       *
 * Public License version 2 as published by the Free Software Foundation.    *
 *                                                                           *
 * ApioOS is distributed in the hope that it will be useful, but             *
 * WITHOUT ANY WARRANTY; without even the implied warranty of                *
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the              *
 * GNU General Public License version 2 for more details.                    *
 *                                                                           *
 * To read the license either open the file COPYING.txt or                   *
 * visit <http://www.gnu.org/licenses/gpl2.txt>                              *
 *                                                                           *
 *****************************************************************************/

angular.module("apioProperty").directive("paint", ["currentObject", function (currentObject) {
    return {
        restrict: "E",
        replace: true,
        scope: {
            //model: "=propertyname"
        },
        templateUrl: "apioProperties/Paint/paint.html",
        transclude: true,
        link: function (scope, elem, attrs) {
            scope.draw = [];
            scope.classes = attrs.ngClass;
            scope.currentObject = currentObject;
            scope.grid = attrs.grid;
            scope.model = {};
            scope.object = scope.currentObject.get();
            scope.propertyname = attrs.propertyname;
            scope.transclude = attrs.hasOwnProperty("transclude") && attrs.transclude === "true";
            scope.type = attrs.type;
            for (var prop in scope.object.propertiesAdditionalInfo) {
                if (scope.object.propertiesAdditionalInfo[prop].hasOwnProperty("protocol") && scope.object.propertiesAdditionalInfo[prop].protocol.property === scope.propertyname && scope.object.propertiesAdditionalInfo[prop].protocol.type === scope.type/* && scope.object.propertiesAdditionalInfo[prop].protocol.draw === true*/) {
                    scope.draw.push(prop);
                    scope.model[prop] = scope.object.properties[prop];
                }
            }

            scope.createNewBind = function () {

            };
        }
    };
}]);