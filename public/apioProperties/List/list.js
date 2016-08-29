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
apioProperty.directive("list", ["currentObject", "socket", "$http", function (currentObject, socket, $http) {
    return {
        restrict: "E",
        replace: true,
        scope: {
            //model: "=propertyname"
        },
        templateUrl: "apioProperties/List/list.html",
        link: function (scope, elem, attrs) {
            scope.object = currentObject.get();
            //Inizializzo la proprietà con i dati memorizzati nel DB
            scope.propertyname = attrs.propertyname;
            if (attrs.hasOwnProperty("arraylist")) {
                scope.arr = currentObject.JSONToArray(scope.object.db[scope.propertyname]);
                scope.isValid = function (x) {
                    return typeof x !== "undefined";
                };
            } else {
                scope.arr = scope.object.db[scope.propertyname];
            }
            scope.isArray = scope.arr instanceof Array;
            scope.label = attrs["label"];
            scope.model = scope.isArray ? parseInt(scope.object.properties[scope.propertyname]) : scope.object.properties[scope.propertyname];
            //
            $http.get("/apio/getPlatform").success(function (data) {
                if (data.type === "gateway") {
                    scope.object.apioId = data.apioId;
                }
            });
            scope.currentObject = currentObject;
            scope.isRecorded = function () {
                return scope.currentObject.record(scope.propertyname);
            };
            scope.addPropertyToRecording = function () {
                scope.currentObject.record(scope.propertyname, scope.model.toString());
            };
            scope.removePropertyFromRecording = function () {
                scope.currentObject.removeFromRecord(scope.propertyname);
            };
            //Serve per il cloud: aggiorna in tempo reale il valore di una proprietà che è stata modificata da un"altro utente
            socket.on("apio_server_update", function (data) {
                if (data.apioId === scope.object.apioId && data.objectId === scope.object.objectId && !currentObject.isRecording()) {
                    if (data.properties.hasOwnProperty(scope.propertyname)) {
                        scope.$parent.object.properties[scope.propertyname] = data.properties[scope.propertyname];
                        //Se è stata definita una funzione di push viene chiama questa altrimenti vengono fatti i settaggi predefiniti
                        if (attrs["push"]) {
                            scope.$parent.$eval(attrs["push"]);
                            $property = {
                                name: scope.propertyname,
                                value: data.properties[scope.propertyname]
                            };
                            var fn = scope.$parent[attrs["push"]];
                            if (typeof fn === "function") {
                                var params = [$property];
                                fn.apply(scope.$parent, params);
                            } else {
                                throw new Error("The Push attribute must be a function name present in scope")
                            }
                        } else {
                            scope.model = scope.isArray ? parseInt(data.properties[scope.propertyname]) : data.properties[scope.propertyname];
                        }
                        //
                    }
                }
            });
            //
            socket.on("apio_server_update_", function (data) {
                if (data.objectId === scope.object.objectId && !scope.currentObject.isRecording()) {
                    scope.model = scope.isArray ? parseInt(data.properties[scope.propertyname]) : data.properties[scope.propertyname];
                }
            });

            socket.on("list_updated", function (data) {
                scope.object.db = data;
                scope.object.db[scope.propertyname]["-1"] = "";
                scope.object.properties[scope.propertyname] = "-1";
                if (attrs.hasOwnProperty("arraylist")) {
                    scope.arr = currentObject.JSONToArray(scope.object.db[scope.propertyname]);
                } else {
                    scope.arr = scope.object.db[scope.propertyname];
                }
                alert("List " + attrs["label"] + " successfully updated");
            });

            //Se il controller modifica l'oggetto allora modifico il model;
            scope.$watch("object.properties." + scope.propertyname, function () {
                scope.model = scope.isArray ? parseInt(scope.object.properties[scope.propertyname]) : scope.object.properties[scope.propertyname];
            });
            //

            scope.$on("propertyUpdate", function () {
                scope.object = currentObject.get();
            });

            var event = attrs["event"] ? attrs["event"] : "change";
            elem.on(event, function () {
                //Aggiorna lo scope globale con il valore che è stato modificato nel template
                scope.object.properties[scope.propertyname] = scope.model.toString();
                if (!currentObject.isRecording()) {
                    //Se è stato definito un listener da parte dell'utente lo eseguo altrimenti richiamo currentObject.update che invia i dati al DB e alla seriale
                    if (attrs["listener"]) {
                        scope.$parent.$eval(attrs["listener"]);
                    } else {
                        var writeToSerial = true;
                        if (attrs.writetoserial === "false") {
                            writeToSerial = false;
                        }
                        currentObject.update(scope.propertyname, scope.model.toString(), true, writeToSerial);
                        scope.$parent.object.properties[scope.propertyname] = scope.model.toString();
                    }
                    //

                    //Se è stata definita una correlazione da parte dell'utente la eseguo
                    if (attrs["correlation"]) {
                        scope.$parent.$eval(attrs["correlation"]);
                    }
                    //

                    //Esegue codice javascript contenuto nei tag angular
                    scope.$apply();
                    //
                }
            });
        }
    };
}]);