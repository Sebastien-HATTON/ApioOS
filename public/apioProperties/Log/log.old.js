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

angular.module("apioProperty").factory("logToShow", function () {
    return function (s) {
        if (s) {
            this.show = s;
        } else {
            return this.show;
        }
    }
}).directive("log", ["currentObject", "$http", "logToShow", function (currentObject, $http, logToShow) {
    return {
        restrict: "E",
        replace: true,
        scope: {
            //changeExpr: "@ngChange",
            //model: "=propertyname"
        },
        templateUrl: "apioProperties/Log/log.html",
        link: function (scope, elem, attrs) {
            scope.object = currentObject.get();
            $http.get("/apio/getPlatform").success(function (data) {
                if (data.type == "gateway") {
                    scope.object.apioId = data.apioId;
                }
            });

            scope.currentObject = currentObject;
            //Inizializzo la proprietà con i dati memorizzati nel DB
            scope.anchor = attrs.hasOwnProperty("anchor") ? attrs["anchor"] : ">";
            scope.label = attrs["label"];
            scope.isMobile = window.innerWidth < 768;
            logToShow(attrs.hasOwnProperty("show") ? attrs["show"].split(",") : "");
            scope.template = attrs.hasOwnProperty("template") ? attrs["template"] : "base";
            scope.$on("propertyUpdate", function () {
                scope.object = currentObject.get();
            });

            var event = attrs.hasOwnProperty("event") ? attrs["event"] : "mousedown touchstart";
            elem.on(event, function () {
                if (!currentObject.isRecording()) {
                    var width = attrs["width"];
                    //Carimento della subapp
                    var uri = "apioProperties/Log/template/" + scope.template + "/" + scope.template + ".html";
                    $.get(uri, function (data) {
                        if (scope.anchor === "<") {
                            Apio.newWidth -= Apio.appWidth;
                            $("#ApioApplicationContainer").css("width", Apio.appWidth + "px");
                            Apio.removeAngularScope(document.getElementById("subApplication"), true);
                            // Decomprime contenitore app + corregge col icone
                            if (document.getElementById('ApioIconsContainer')) {
                                $("#ApioIconsContainer").css("width", "66.4%");
                                var l = document.getElementById('ApioIconsContainer').childNodes;
                                for (var s in l) {
                                    if (l.item(s).classList && l.item(s).classList.contains('ApioIconsContainer2') && l.item(s).classList.contains('col-md-6')) {
                                        l.item(s).classList.remove('col-md-6');
                                        l.item(s).classList.add('col-md-3');
                                    }
                                }
                            }
                            //END
                            scope.anchor = ">";
                            scope.$apply();
                        } else {
                            if (window.innerWidth >= 992 && scope.anchor === ">") {
                                scope.anchor = "<";
                                scope.$apply();
                            }

                            var node = document.getElementById("ApioApplicationLog");

                            if (!node) {
                                if (typeof width !== "undefined" && width != "100%" && window.innerWidth > 992) {
                                    Apio.newWidth = parseInt(Apio.appWidth) + parseInt(width);
                                    $("#ApioApplicationContainer").css("width", Apio.newWidth + "px");
                                    $("#ApioApplication" + scope.object.objectId).css("width", Apio.appWidth + "px");
                                    $("#ApioApplication" + scope.object.objectId).css("float", "left");
                                } else {
                                    Apio.newWidth += Apio.appWidth;
                                    $("#ApioApplicationContainer").css("width", Apio.newWidth + "px");
                                    $("#ApioApplication" + scope.object.objectId).css("width", Apio.appWidth + "px");
                                    $("#ApioApplication" + scope.object.objectId).css("float", "left");
                                }
                                $("#ApioApplicationContainer").append('<div id="subApplication"></div>');

                                if (!document.getElementById("back")) {
                                    angular.element(document.getElementById("subApplication")).prepend('<div id="back" class="container-fluid"><div class="row"><div style="font-size: 25px; padding: 13px 0 5px 12px;"><span class="glyphicon glyphicon-chevron-left"></span></div></div></div>');
                                    document.getElementById("back").addEventListener("click", function () {
                                        $("#ApioApplicationLog").remove();
                                        Apio.newWidth -= Apio.appWidth;
                                        $("#ApioApplicationContainer").css("width", Apio.newWidth + "px");
                                        $("#ApioApplicationContainer").css("-webkit-transform", "");
                                        $("#ApioApplicationContainer").css("transform", "");
                                        // Decomprime contenitore app
                                        if (document.getElementById('ApioIconsContainer')) {
                                            $("#ApioIconsContainer").css("width", "100%");
                                        }
                                        // END
                                    })
                                }

                                $("#subApplication").append($(data));
                                //comprime contenitore app + cambia col alle app
                                if (document.getElementById('ApioIconsContainer')) {
                                    $("#ApioIconsContainer").css("width", "34%");
                                    var l = document.getElementById('ApioIconsContainer').childNodes;
                                    for (var s in l) {
                                        if (l.item(s).classList && l.item(s).classList.contains('ApioIconsContainer2') && l.item(s).classList.contains('col-md-3')) {
                                            l.item(s).classList.remove('col-md-3');
                                            l.item(s).classList.add('col-md-6');
                                        }
                                    }
                                }
                                // END

                                $("#ApioApplicationContainer").css("overflowX", "scroll");
                                $("#ApioApplicationContainer").css("webkitOverflowScrolling", "touch");
                                if (typeof width !== "undefined" && width != "100%" && window.innerWidth > 992) {
                                    $("subApplication").css("width", width + "px");
                                    $("#ApioApplicationLog").css("width", "100%");
                                } else if (typeof width == "undefined" && window.innerWidth > 992) {
                                    $("subApplication").css("width", Apio.appWidth + "px");
                                    $("#ApioApplicationLog").css("width", "100%");
                                }

                                $("#ApioApplicationLog").css("overflow-y", "scroll");
                                $("#ApioApplicationLog").css("height", "99%");
                                if (window.innerWidth < 992) {
                                    $("#ApioApplicationContainer").css("-webkit-transform", "translateX(" + (-Apio.appWidth) + "px)");
                                    $("#ApioApplicationContainer").css("transform", "translateX(" + (-Apio.appWidth) + "px)");
                                }
                            }
                        }
                    });
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