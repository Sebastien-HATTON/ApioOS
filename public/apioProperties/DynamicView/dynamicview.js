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
apioProperty.directive("dynamicview", ["currentObject", "$http", function (currentObject, $http) {
    return {
        restrict: "E",
        replace: true,
        scope: {
            //changeExpr: "@ngChange",
            //model: "=propertyname"
        },
        templateUrl: "apioProperties/DynamicView/dynamicview.html",
        link: function (scope, elem, attrs) {
            scope.object = currentObject.get();
            //Inizializzo la proprietà con i dati memorizzati nel DB
            scope.propertyname = attrs.propertyname;
            scope.label = attrs["label"];
            scope.model = scope.object.properties[scope.propertyname];
            scope.anchor = attrs.hasOwnProperty('anchor') ? attrs['anchor'] : '>';
            scope.isMobile = window.innerWidth < 768;
            //

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

            scope.$on('propertyUpdate', function () {
                scope.object = currentObject.get();
            });


            var event = attrs["event"] ? attrs["event"] : "mousedown touchstart";
            elem.on(event, function () {
                if (!currentObject.isRecording()) {
                    var width = attrs["width"];
                    //Carimento della subapp
                    var uri = attrs["load"] ? attrs["load"] : "applications/" + scope.object.objectId + "/subapps/" + scope.propertyname + ".html";
                    $.get(uri, function (data) {
                        if (attrs["load"]) {
                            var loadComponents = attrs["load"].split("/");
                            var app = loadComponents[loadComponents.length - 1];
                            var appComponents = app.split(".");
                            var application = appComponents[0];
                            var subapp = application.charAt(0).toUpperCase() + application.slice(1);

                        }
                        else {
                            var subapp = scope.propertyname.charAt(0).toUpperCase() + scope.propertyname.slice(1);
                        }

                        if (scope.anchor === "<") {
                            Apio.newWidth -= Apio.appWidth;
                            $("#ApioApplicationContainer").css("width", Apio.appWidth + "px");
                            $("#ApioApplication" + subapp).remove();
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
                            // END
                            scope.anchor = ">";
                            scope.$apply();
                        }
                        else {
                            if (window.innerWidth >= 992 && scope.anchor === ">") {
                                scope.anchor = "<";
                                scope.$apply();
                            }

                            subapp = scope.propertyname.charAt(0).toUpperCase() + scope.propertyname.slice(1);
                            var node = document.getElementById("ApioApplication" + subapp);

                            if (!node) {
                                /*$("#ApioApplicationContainer").append($(data));
                                 $("#ApioApplication"+subapp).css("height", ""+$("#ApioApplicationContainer").children().eq(1).css("height"));
                                 $("#ApioApplication"+subapp).css("margin-top", "-"+$("#ApioApplicationContainer").children().eq(1).css("height"));
                                 $("#ApioApplication"+subapp).show("slide", {
                                 direction: 'right'
                                 }, 500);*/
                                if (typeof width !== 'undefined' && width != '100%' && window.innerWidth > 992) {
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
                                //var app_ = $(elem).parent().parent().parent();
                                //app_.css("overflowX", "auto");
                                //subapp = scope.propertyname.charAt(0).toUpperCase() + scope.propertyname.slice(1);


                                $("#ApioApplicationContainer").append('<div id="subApplication"></div>');

                                if (!document.getElementById('back')) {
                                    angular.element(document.getElementById("subApplication")).prepend('<div id="back" class="container-fluid"><div class="row"><div style="font-size: 25px; padding: 13px 0 5px 12px;"><span class="glyphicon glyphicon-chevron-left"></span></div></div></div>');
                                    document.getElementById('back').addEventListener('click', function () {
                                        var subapp;
                                        if (attrs["load"]) {
                                            subapp = application.charAt(0).toUpperCase() + application.slice(1);
                                        } else {
                                            subapp = scope.propertyname.charAt(0).toUpperCase() + scope.propertyname.slice(1);
                                        }
                                        $("#ApioApplication" + subapp).remove();
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
                                if (typeof width !== 'undefined' && width != '100%' && window.innerWidth > 992) {
                                    $("subApplication").css("width", width + "px");
                                    $("#ApioApplication" + subapp).css("width", "100%");
                                } else if (typeof width == 'undefined' && window.innerWidth > 992) {
                                    $("subApplication").css("width", Apio.appWidth + "px");
                                    $("#ApioApplication" + subapp).css("width", "100%");
                                }


                                $("#ApioApplication" + subapp).css("overflow-y", "scroll");
                                $("#ApioApplication" + subapp).css("height", "95%");
                                /*
                                 $("#ApioApplication" + subapp).css("overflow-y", "scroll");
                                 $("#ApioApplication" + subapp).css("float", "left");
                                 $("#ApioApplication" + subapp).css("height", "100%");
                                 */
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
