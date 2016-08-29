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
apioProperty.directive("asyncdisplay", ["currentObject", "socket", "$http", function (currentObject, socket, $http) {
    return {
        restrict: "E",
        replace: true,
        scope: {
            //model: "=propertyname"
        },
        templateUrl: "apioProperties/AsyncDisplay/asyncdisplay.html",
        link: function (scope, elem, attrs) {
            scope.object = currentObject.get();
            //Inizializzo la proprietà con i dati memorizzati nel DB
            scope.propertyname = attrs.propertyname;
            scope.label = attrs["label"];
            scope.model = scope.object.properties[scope.propertyname];
            //
            $http.get("/apio/getPlatform").success(function (data) {
                //console.log(data);
                //alert(data.apioId);
                //alert(data.apioId);


                if (data.type == "gateway") {
                    scope.object.apioId = data.apioId;
                    //return obj;

                    //scope.continueToCloud = true;
                    //$scope.currentUserEmail();
                }
                if (data.type == "cloud") {
                    //$scope.cloudShowBoard = true;
                    //$scope.currentUserEmail();
                }

            });
            scope.currentObject = currentObject;

            //Serve per il cloud: aggiorna in tempo reale il valore di una proprietà che è stata modificata da un"altro utente
            socket.on("apio_server_update", function (data) {
                //alert()
                //console.log("DATA ARRIVATO",data)
                if (data.apioId === scope.object.apioId && data.objectId === scope.object.objectId && !currentObject.isRecording()) {
                    if (data.properties.hasOwnProperty(scope.propertyname)) {
                        scope.$parent.object.properties[scope.propertyname] = data.properties[scope.propertyname];
                        scope.model = data.properties[scope.propertyname];
                        //In particolare questa parte aggiorna il cloud nel caso siano state definite delle correlazioni

                    }
                }
            });
            //

            scope.$on("propertyUpdate", function () {
                scope.object = currentObject.get();
            });

            scope.$watch("object.properties." + scope.propertyname, function () {
                scope.model = scope.object.properties[scope.propertyname];
            });

            var event = attrs["event"] ? attrs["event"] : "click touchend";
            elem.on(event, function () {
                if (!currentObject.isRecording()) {
                    //Aggiorna lo scope globale con il valore che è stato modificato nel template
                    scope.object.properties[scope.propertyname] = scope.model;
                    //

                    //Se è stato definito un listener da parte dell'utente lo eseguo altrimenti richiamo currentObject.update che invia i dati al DB e alla seriale
                    if (attrs["listener"]) {
                        scope.$parent.$eval(attrs["listener"]);
                    }
                    //

                    //Se è stata definita una correlazione da parte dell'utente la eseguo


                    //Esegue codice javascript contenuto nei tag angular
                    scope.$apply();
                    //
                }
            });


            //
        }
    };
}]);
