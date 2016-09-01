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
apioProperty.directive("property", ["currentObject", "socket", "$http", function (currentObject, socket, $http) {
    return {
        restrict: "E",
        transclude: true,
        scope: {},
        templateUrl: "apioProperties/Property/property.html",
        link: function (scope, elem, attrs, controller) {
            scope.object = currentObject.get();
            var inputElement = $(elem).find("[propertyinput]");
            //Inizializzo la proprietà con i dati memorizzati nel DB
            scope.label = attrs["label"];
            scope.propertyname = attrs.propertyname;
            inputElement.val(scope.object.properties[scope.propertyname]);
            //

            attrs.$observe('label', function (newVal, oldVal) {
                //scope.$apply();
                scope.label = newVal;
                /*if (!scope.$$phase) {
                 scope.$apply();
                 }*/
            });

            $http.get('/apio/getPlatform').success(function (data) {
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
            scope.isRecorded = function () {
                return scope.currentObject.record(scope.propertyname);
            }
            scope.addPropertyToRecording = function ($event) {
                $event.stopPropagation();
                scope.currentObject.record(scope.propertyname, inputElement.val());
            }
            scope.removePropertyFromRecording = function ($event) {
                $event.stopPropagation();
                scope.currentObject.removeFromRecord(scope.propertyname);
            }
            //Serve per il cloud: aggiorna in tempo reale il valore di una proprietà che è stata modificata da un"altro utente
            socket.on("apio_server_update", function (data) {
                if (data.apioId === scope.object.apioId && data.objectId === scope.object.objectId && !currentObject.isRecording()) {
                    if (data.properties.hasOwnProperty(scope.propertyname)) {
                        scope.$parent.object.properties[scope.propertyname] = data.properties[scope.propertyname];
                        //Se è stata definita una funzione di push viene chiama questa altrimenti vengono fatti i settaggi predefiniti
                        if (attrs["push"]) {
                            scope.$parent.$eval(attrs["push"]);
                            var $property = {
                                name: scope.propertyname,
                                value: data.properties[scope.propertyname]
                            };
                            var fn = scope.$parent[attrs["push"]];
                            if (typeof fn === "function") {
                                var params = [$property];
                                fn.apply(scope.$parent, params);
                            }
                            else {
                                throw new Error("The Push attribute must be a function name present in scope")
                            }
                        }
                        else {
                            inputElement.val(data.properties[scope.propertyname]);
                        }
                        //

                        //In particolare questa parte aggiorna il cloud nel caso siano state definite delle correlazioni
                        /*if(attrs["correlation"]){
                         scope.$parent.$eval(attrs["correlation"]);
                         }*/
                        //
                    }
                }
            });

            socket.on("apio_server_update_", function (data) {
                if (data.objectId === scope.object.objectId && !scope.currentObject.isRecording()) {
                    inputElement.val(data.properties[scope.propertyname]);
                }
            });

            scope.$on('propertyUpdate', function () {
                scope.object = currentObject.get();
                inputElement.val(scope.object.properties[scope.propertyname]);
            });

            var event = attrs["event"] ? attrs["event"] : "click tap";
            elem.on(event, function () {
                //Aggiorna lo scope globale con il valore che è stato modificato nel template
                scope.object.properties[scope.propertyname] = inputElement.val();

                if (!currentObject.isRecording()) {
                    //Se è stato definito un listener da parte dell'utente lo eseguo altrimenti richiamo currentObject.update che invia i dati al DB e alla seriale
                    if (attrs["listener"]) {
                        scope.$parent.$eval(attrs["listener"]);
                    }
                    else {
                        var writeToSerial = true;
                        if (attrs.writetoserial === "false") {
                            writeToSerial = false;
                        }
                        currentObject.update(scope.propertyname, inputElement.val(), true, writeToSerial);
                        scope.$parent.object.properties[scope.propertyname] = inputElement.val();
                    }
                    //

                    //Se è stata definita una correlazione da parte dell'utente la eseguo
                    if (attrs["correlation"]) {
                        scope.$parent.$eval(attrs["correlation"]);
                    }
                    //
                }
                //Esegue codice javascript contenuto nei tag angular
                scope.$apply();
                //
            });
        }
    };
}]);
