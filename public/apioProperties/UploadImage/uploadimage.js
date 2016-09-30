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
apioProperty.directive("uploadimage", ["currentObject", "socket", "$http", "FileUploader", function (currentObject, socket, $http, FileUploader) {
    return {
        restrict: "E",
        replace: true,
        scope: {
            //model: "=propertyname"
        },
        templateUrl: "apioProperties/UploadImage/uploadimage.html",
        compile: function () {
            return {
                pre: function (scope, elem, attrs) {
                    scope.showProgressBarUploadImag = false;
                    scope.progressBarUploadImag = 0;

                    var uploader = scope.uploader = new FileUploader({
                        url: "/apio/manage/file",
                        autoUpload: true,
                        removeAfterUpload: true
                    });
                },
                // link
                post: function (scope, elem, attrs) {
                    scope.changeImmage = function () {
                        $("#" + scope.propertyname + "imageChange").trigger("click");
                    };

                    scope.deleteImmage = function () {
                        scope.object.properties[scope.propertyname] = "0";
                        scope.model = "0";
                        console.log("scope.model: ", scope.model);
                        currentObject.update(scope.propertyname, scope.model, true, false);
                    };

                    scope.object = currentObject.get();
                    //Inizializzo la proprietà con i dati memorizzati nel DB
                    scope.propertyname = attrs.propertyname;
                    scope.label = attrs["label"];

                    if (scope.object.properties[scope.propertyname]) {
                        scope.model = scope.object.properties[scope.propertyname].replace(",", ".");
                    }

                    $http.get("/apio/getPlatform").success(function (data) {
                        if (data.type == "gateway") {
                            scope.object.apioId = data.apioId;
                        }
                    });
                    scope.currentObject = currentObject;

                    scope.uploader.onAfterAddingFile = function (item) {
                        scope.path = "boards/" + scope.object.apioId + "/" + scope.object.objectId + "/filesUpload";
                        console.log("onAfterAddingFile", item);
                        item.formData.push({uploadPath: String(scope.path), imageName: scope.propertyname});
                        var tempType = item.file.type.split("/");
                        scope.path = scope.path + "/" + scope.propertyname + "." + tempType[1];
                        console.log("onBeforeUploadItem", item);
                        scope.showProgressBarUploadImag = true;
                    };

                    scope.uploader.onProgressAll = function (progress) {
                        console.info("onProgressAll", progress);
                        scope.progressBarUploadImag = progress;
                        if (progress === 100) {
                            scope.progressBarUploadImag = 110;
                        }
                    };

                    scope.uploader.onCompleteItem = function (fileItem, response, status, headers) {
                        console.info("onCompleteItem", fileItem, response, status, headers);
                        scope.showProgressBarUploadImag = false;
                        scope.object.properties[scope.propertyname] = scope.path;
                        scope.model = scope.path + "?decache=" + Math.random();
                        if (!scope.$$phase) {
                            scope.$apply();
                        }
                        console.log("scope.model: ", scope.model);
                        currentObject.update(scope.propertyname, scope.model, true, false);
                    };

                    scope.isRecorded = function () {
                        return scope.currentObject.record(scope.propertyname);
                    };

                    scope.addPropertyToRecording = function () {
                        scope.currentObject.record(scope.propertyname, scope.model);
                    };

                    scope.removePropertyFromRecording = function () {
                        scope.currentObject.removeFromRecord(scope.propertyname);
                    };

                    //Serve per il cloud: aggiorna in tempo reale il valore di una proprietà che è stata modificata da un"altro utente
                    socket.on("apio_server_update", function (data) {
                        if (data.apioId === scope.object.apioId && data.objectId === scope.object.objectId && currentObject.isRecording() == false) {
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
                                    scope.model = data.properties[scope.propertyname].replace(",", ".");
                                }
                            }
                        }
                    });
                    //

                    socket.on("apio_server_update_", function (data) {
                        if (data.objectId === scope.object.objectId && !scope.currentObject.isRecording()) {
                            scope.model = data.properties[scope.propertyname].replace(",", ".");
                        }
                    });

                    scope.$on("propertyUpdate", function () {
                        scope.object = currentObject.get();
                    });
                    //

                    var event = attrs["event"] ? attrs["event"] : "mouseup touchend";
                    elem.on(event, function () {
                        //Aggiorna lo scope globale con il valore che è stato modificato nel template
                        scope.object.properties[scope.propertyname] = scope.model;
                        //
                        if (!currentObject.isRecording()) {
                            //Se è stato definito un listener da parte dell'utente lo eseguo altrimenti richiamo currentObject.update che invia i dati al DB e alla seriale
                            if (attrs["listener"]) {
                                scope.$parent.$eval(attrs["listener"]);
                            } else {
                                currentObject.update(scope.propertyname, scope.model, true, false);
                                scope.$parent.object.properties[scope.propertyname] = scope.model;
                            }
                            //

                            //Se è stata definita una correlazione da parte dell'utente la eseguo
                            if (attrs["correlation"]) {
                                scope.$parent.$eval(attrs["correlation"]);
                            }
                        }
                    });
                    //
                }
            };
        }
    };
}]);