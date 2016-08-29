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
apioProperty.directive("note", ["currentObject", "socket", "$http", function (currentObject, socket, $http) {
    return {
        restrict: "E",
        replace: true,
        scope: {
            //model: "=propertyname"
        },
        templateUrl: "apioProperties/Note/note.html",
        link: function (scope, elem, attrs) {
            scope.object = currentObject.get();
            scope.label = attrs["label"];
            scope.propertyname = attrs.propertyname;
            scope.model = scope.object.properties[scope.propertyname];
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
            scope.addPropertyToRecording = function () {
                scope.currentObject.record(scope.propertyname, scope.model);
            }
            scope.removePropertyFromRecording = function () {
                scope.currentObject.removeFromRecord(scope.propertyname);
            }
            //Serve per il cloud: aggiorna in tempo reale il valore di una proprietà che è stata modificata da un"altro utente
            socket.on("apio_server_update", function (self) {
                if (self.apioId === scope.object.apioId && self.objectId === scope.object.objectId && !currentObject.isRecording()) {
                    if (self.properties.hasOwnProperty(scope.propertyname)) {
                        scope.$parent.object.properties[scope.propertyname] = self.properties[scope.propertyname];
                        //Se è stata definita una funzione di push viene chiama questa altrimenti vengono fatti i settaggi predefiniti
                        if (attrs["push"]) {
                            scope.$parent.$eval(attrs["push"]);
                            $property = {
                                name: scope.propertyname,
                                value: self.properties[scope.propertyname]
                            }
                            var fn = scope.$parent[attrs["push"]];
                            if (typeof fn === "function") {
                                var params = [$property];
                                fn.apply(scope.$parent, params);
                            }
                            else {
                                throw new Error("The Push attribute must be a function name present in scope")
                            }
                        }
                        else if (scope.model !== self.properties[scope.propertyname]) {
                            scope.model = self.properties[scope.propertyname];
                        }
                        //

                        /*if(attrs["correlation"]){
                         scope.$parent.$eval(attrs["correlation"]);
                         }*/
                    }
                }
            });
            socket.on("apio_server_update_", function (data) {
                if (data.objectId === scope.object.objectId && !scope.currentObject.isRecording()) {
                    scope.model = data.properties[scope.propertyname];
                }
            });

            //Se il controller modifica l'oggetto allora modifico il model;
            scope.$watch("object.properties." + scope.propertyname, function () {
                if (scope.model !== scope.object.properties[scope.propertyname]) {
                    scope.model = scope.object.properties[scope.propertyname];
                }
            });
            //

            scope.$on('propertyUpdate', function () {
                scope.object = currentObject.get();
            });

            /*var event = attrs["event"] ? attrs["event"] : "keyup";
             elem.on(event, function(){
             scope.object.properties[scope.propertyname] = scope.model;
             if (!currentObject.isRecording()) {


             //Se è stato definito un listener da parte dell'utente lo eseguo altrimenti richiamo currentObject.update che invia i dati al DB e alla seriale
             if(attrs["listener"]){
             scope.$parent.$eval(attrs["listener"]);
             }
             else{
             currentObject.update(scope.propertyname, scope.model);
             scope.$parent.object.properties[scope.propertyname] = scope.model;
             }
             //

             //Se è stata definita una correlazione da parte dell'utente la eseguo
             if(attrs["correlation"]){
             scope.$parent.$eval(attrs["correlation"]);
             }
             //

             scope.$apply();
             }
             });*/
            var event = attrs["event"] ? attrs["event"] : "blur";
            if (event === "blur") {
                $(elem).find("textarea").on("blur", function () {
                    scope.object.properties[scope.propertyname] = scope.model;
                    if (!currentObject.isRecording()) {
                        //Se è stato definito un listener da parte dell'utente lo eseguo altrimenti richiamo currentObject.update che invia i dati al DB e alla seriale
                        if (attrs["listener"]) {
                            scope.$parent.$eval(attrs["listener"]);
                        }
                        else {
                            currentObject.update(scope.propertyname, scope.model);
                            scope.$parent.object.properties[scope.propertyname] = scope.model;
                        }
                        //

                        //Se è stata definita una correlazione da parte dell'utente la eseguo
                        if (attrs["correlation"]) {
                            scope.$parent.$eval(attrs["correlation"]);
                        }
                        //

                        scope.$apply();
                    }
                });
            } else {
                elem.on(event, function () {
                    scope.object.properties[scope.propertyname] = scope.model;
                    if (!currentObject.isRecording()) {
                        //Se è stato definito un listener da parte dell'utente lo eseguo altrimenti richiamo currentObject.update che invia i dati al DB e alla seriale
                        if (attrs["listener"]) {
                            scope.$parent.$eval(attrs["listener"]);
                        }
                        else {
                            currentObject.update(scope.propertyname, scope.model);
                            scope.$parent.object.properties[scope.propertyname] = scope.model;
                        }
                        //

                        //Se è stata definita una correlazione da parte dell'utente la eseguo
                        if (attrs["correlation"]) {
                            scope.$parent.$eval(attrs["correlation"]);
                        }
                        //

                        scope.$apply();
                    }
                });
            }

            //Esegue i listener dopo che il browser ha fatto il render

            //
        }
    };
}]);
