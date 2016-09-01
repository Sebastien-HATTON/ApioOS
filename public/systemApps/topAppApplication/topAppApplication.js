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

var apioApplication = angular.module("ApioApplication");
apioApplication.directive("topappapplication", ["currentObject", "socket", "$http", "$timeout", "$rootScope", "$location", function (currentObject, socket, $http, $timeout, $rootScope, $location) {
    return {
        restrict: "E",
        replace: true,
        scope: {},
        templateUrl: "systemApps/topAppApplication/topAppApplication.html",
        link: function (scope, elem, attrs, controller) {
            scope.object = currentObject.get();
            currentObject.isRecording(false);
            scope.currentObject = currentObject;
            scope.showPublishButton = false;
            scope.showPublishButtonActive = false;
            scope.newStatusName = "";
            //scope.newEventName = "";
            scope.object = currentObject.get();
            scope.ip = $location.host();

            if (!window.navigator.standalone) {
                addToHomescreen({
                    displayPace: '0',
                    lifespan: '0',
                    modal: true
                });
            }

            var head = document.getElementsByTagName('head').item(0);

            var faviconOriginal = document.getElementById('favicon')
            var faviconOriginal1 = document.getElementById('favicon1');
            head.removeChild(faviconOriginal);
            head.removeChild(faviconOriginal1);
            document.getElementsByTagName('title').item(0).innerHTML = scope.object.name;
            var x = document.createElement("LINK");
            x.setAttribute('id', 'faviconApp')
            x.setAttribute('rel', 'apple-touch-icon');
            x.setAttribute('href', 'applications/' + scope.object.objectId + '/icon.png');
            head.appendChild(x)
            var s = document.createElement("LINK");
            s.setAttribute('id', 'faviconApp1')
            s.setAttribute('rel', 'apple-touch-icon-precomposed');
            s.setAttribute('href', 'applications/' + scope.object.objectId + '/icon.png');
            head.appendChild(s);

            function removeRecordingStatus() {
                scope.currentObject.resetRecord();
                scope.showPublishButton = false;
                currentObject.isRecording(false);
                scope.newStatusName = '';
                //scope.newEventName = '';
                scope.recStep = '';
                $timeout(function () {
                    if (document.getElementById("app"))
                        document.getElementById("app").style.display = "block";
                }, 0);
                currentObject.sync(function () {
                    currentObject.isRecording(false); //Esco dalla recording mode
                    scope.object = currentObject.get(); //risetto l'oggetto ai valori presi dal sync
                    scope.$parent.$broadcast('propertyUpdate');
                    scope.$apply(); //per riapplicare i bindings
                });
            }

            scope.addToHome = function () {
                window.open("http://www.apio.cloud/?ip=" + scope.ip + "&objectId=" + scope.object.objectId, "_blank", "toolbar=no, scrollbars=yes, resizable=no, location=no, menubar=no, status=no,  width=" + document.getElementById('ApioApplicationContainer').clientWidth + ", height=" + document.getElementById('ApioApplicationContainer').clientHeight)
            }

            scope.recStep = "";

            scope.goBackToHome = function () {
                document.getElementsByTagName('title').item(0).innerHTML = 'ApioOS';
                if (head) {
                    if (document.getElementById('faviconApp')) {
                        head.removeChild(document.getElementById('faviconApp'));
                    }

                    if (document.getElementById('faviconApp1')) {
                        head.removeChild(document.getElementById('faviconApp1'));
                    }
                    head.appendChild(faviconOriginal);
                    head.appendChild(faviconOriginal1);
                }

                Apio.newWidth = Apio.appWidth;
                // Rimetto le col delle app allo stato iniziale
                if (document.getElementById('ApioIconsContainer')) {
                    var l = document.getElementById('ApioIconsContainer').childNodes;
                    for (var s in l) {
	                    if (l.item(s).classList && l.item(s).classList.contains("ApioIconsContainer3")) {
	                        l.item(s).classList.remove("ApioIconsContainer3");
	                        l.item(s).classList.add("ApioIconsContainer2");
	                    }
	                    if (l.item(s).classList && l.item(s).classList.contains("ApioIconsContainer4")) {
                            l.item(s).classList.remove("ApioIconsContainer4");
                            l.item(s).classList.add("ApioIconsContainer2");
                        }
                        if (l.item(s).classList && l.item(s).classList.contains('ApioIconsContainer2') && l.item(s).classList.contains('col-md-3')) {
                            l.item(s).classList.remove('col-md-3');
                            l.item(s).classList.add('col-md-2');
                        }
                        if (l.item(s).classList && l.item(s).classList.contains('ApioIconsContainer2') && l.item(s).classList.contains('col-md-6')) {
                            l.item(s).classList.remove('col-md-6');
                            l.item(s).classList.add('col-md-2');
                        }
                    }
                }
                // END
                $("#ApioIconsContainer").css("width", "100%");
                $("#ApioApplicationContainer").css("width", Apio.appWidth + "px");
                /*if (window.innerWidth > 769) {
                 $("#ApioIconsContainer").css("width", "100%");
                 }*/
                document.getElementById("ApioApplicationContainer").classList.remove("fullscreen");

                if (document.getElementById("ApioIconsContainer")) {
                    //document.getElementById("ApioIconsContainer").style.display = "block";
                    /*if (window.innerWidth < 768) {
                    	document.getElementById("apioMenuMobile").style.display = "block";
                    } else {
						document.getElementById("apioMenu").style.display = "block";
                    }*/
                    if ($location.url().split("/")[1] === "home"){
						$location.path("/home");
					} else if ($location.url().split("/")[1] === "home2") {
						$location.path("/home2");
					}
                }


                $("#ApioApplicationContainer").hide("slide", {direction: 'right'}, 850, function () {
                    Apio.removeAngularScope(document.getElementById("subApplication"), true);
                    Apio.removeAngularScope(document.getElementById("ApioApplicationContainer"));

                    //$("#ApioApplicationContainer").children().each(function (index, value) {
                    //    if ($(value).attr("ng-app")) {
                    //        var children = angular.element(this).children();
                    //        for (var i in children) {
                    //            if (typeof children[i] === "object") {
                    //                console.log("children[i]: ", children[i]);
                    //                angular.element(children[i]).scope().$destroy();
                    //                angular.element(children[i]).remove();
                    //            }
                    //        }
                    //        angular.element(this).scope().$destroy();
                    //        angular.element(this).remove();
                    //    }
                    //});

                    //$("#subApplication").children().each(function (index, value) {
                    //    if ($(value).attr("ng-app")) {
                    //        var children = angular.element(this).children();
                    //        for (var i in children) {
                    //            if (typeof children[i] === "object") {
                    //                angular.element(children[i]).scope().$destroy();
                    //                angular.element(children[i]).remove();
                    //            }
                    //        }
                    //        angular.element(this).scope().$destroy();
                    //        angular.element(this).remove();
                    //    }
                    //});

                    //scope.$parent.$apply();
                });

                Apio.currentApplication = 0;
            };

            scope.saveModify = function () {
                var toDB = scope.currentObject.record();
                var _p = {};
                for (var k in toDB)
                    _p[k] = scope.$parent.object.properties[k];

                console.log("Le modifiche da applicare sono:")
                console.log(_p)
                var stateName = currentObject.recordingStateName();
                $http.put("/apio/state/" + stateName, {state: _p}).success(function () {
                    //document.getElementById("appApio").innerHTML = "";
                    document.getElementById("ApioApplicationContainer").innerHTML = "";
                    $("#ApioApplicationContainer").hide("slide", {
                        direction: 'right'
                    }, 500, function () {
                        document.getElementById('wallContainer').classList.remove('wall_open_edit_state');
                    });
                    scope.currentObject.resetRecord();
                    currentObject.isRecording(false);
                    currentObject.isModifying(false);
                    $rootScope.$emit('requestReloadStates');
                }).error(function () {
                    alert("Impossibile salvare");
                });
                $("#wallContainer").css("width", "");
            }

            scope.startRecording = function () {
                currentObject.isRecording(true);
                scope.showPublishButton = false;
            }

            scope.stopRecording = function () {
                if (currentObject.isModifying()) {
                    currentObject.isModifying(false);
                    //document.getElementById("appApio").innerHTML = "";
                    document.getElementById("ApioApplicationContainer").innerHTML = "";
                    $("#ApioApplicationContainer").hide("slide", {
                            direction: 'right'
                        }, 500,
                        function () {
                            document.getElementById('wallContainer').classList.remove('wall_open_edit_state');
                        });
                }
                else {
                    currentObject.isRecording(false);
                }
                $("#wallContainer").css("width", "");
                removeRecordingStatus();
            }

            scope.useRecording = function () {
                scope.showPublishButton = true;
                if (currentObject.isRecording() !== true || scope.currentObject.recordLength() < 1) {
                    return;
                }

                for (key in scope.currentObject.record())
                    scope.currentObject.record(key, scope.object.properties[key]);

                //scope.recStep = "EventOrWall";
                scope.recStep = "StatusNameChoice";
                $timeout(function () {
                    document.getElementById("app").style.display = "none";
                }, 0);
            }

            /*scope.eventRecording = function () {
             scope.recStep = "EventNameChoice";
             }

             scope.wallRecording = function () {
             scope.recStep = "StatusNameChoice";
             }*/

            scope.showPublish = function () {
                //if ((scope.recStep === "StatusNameChoice" && scope.newStatusName !== "") || (scope.recStep === "EventNameChoice" && scope.newStatusName !== "" && scope.newEventName !== "")) {
                if (scope.recStep === "StatusNameChoice" && scope.newStatusName !== "") {
                    scope.showPublishButtonActive = true;
                }
            }

            scope.publishRecording = function () {
                console.log("publishRecording() chiamato allo stato " + scope.recStep)
                //if (scope.recStep !== 'EventNameChoice' && scope.recStep !== 'StatusNameChoice')
                if (scope.recStep !== 'StatusNameChoice')
                    return;

                var o = {};
                o.sensors = [];
                $('#ApioApplicationContainer').find('.box_proprietaiPhone[issensor=\'true\']').each(function (index) {
                    if (currentObject.record().hasOwnProperty($(this).attr('id'))) {
                        o.sensors.push($(this).attr('id'))
                    }
                });
                o.active = false;
                o.name = scope.newStatusName;
                o.objectName = scope.object.name;
                o.objectId = scope.object.objectId;
                o.properties = scope.currentObject.record();
                var dao = {};
                dao.state = o;
                /*if (scope.newEventName !== '') {
                 var e = {};
                 e.name = scope.newEventName;
                 dao.event = e;
                 }*/

                //Ho impacchettato evento e stato dentro la variabile dao che invio al server
                //$http.post('/apio/state', dao).success(function (data) {
                //    if (data.error === 'STATE_NAME_EXISTS') {
                //        alert("Uno stato con questo nome è già presente in bacheca, si prega di sceglierne un altro")
                //    }
                //    if (data.error === 'STATE_PROPERTIES_EXIST') {
                //        alert("Lo stato di nome " + o.name + " non è stato pubblicato perchè lo stato " + data.state + " ha già le stesse proprietà");
                //        removeRecordingStatus();
                //    }
                //
                //    if (data.error === false) {
                //        $('#ApioApplicationContainer').find('.box_proprietaiPhone[issensor=\'true\']').each(function (index) {
                //            if (currentObject.record().hasOwnProperty($(this).attr('id'))) {
                //                var d = {
                //                    objectId: scope.object.objectId,
                //                    properties: {}
                //                };
                //
                //                d.properties[$(this).attr('id')] = $("#" + $(this).attr('id') + "sensor").val();
                //
                //
                //                $http.post('/apio/serial/send', {data: d}).success(function (data) {
                //                    console.log("Sensore notificato con successo");
                //                }).error(function (data) {
                //                    console.log("Impossibile notificare il sensore");
                //                });
                //
                //                var label = document.getElementById($(this).attr('id') + "label").innerHTML;
                //                var x = {
                //                    objectId: scope.object.objectId,
                //                    properties: {}
                //                };
                //                x.properties[$(this).attr('id')] = {};
                //                x.properties[$(this).attr('id')][d.properties[$(this).attr('id')]] = scope.object.name + ": " + label + " al valore " + d.properties[$(this).attr('id')];
                //
                //                $http.post("/apio/object/addNotification", {data: x}).success(function (data) {
                //                    console.log("Aggiunta notifica");
                //                }).error(function (error) {
                //                    console.log("Errore durante l'aggiunta della notifica");
                //                });
                //            }
                //        });
                //
                //        alert("Stato creato con successo");
                //        removeRecordingStatus();
                //    }
                //}).error(function () {
                //    alert("Si è verificato un errore di sistema");
                //})

                $http.get("/apio/user/getSession").success(function (user) {
                    //$http.get("/apio/getIP").success(function (ip) {
                    //    $http.get("/apio/getService/notification").success(function (service) {
                    //        $http.post("http://" + ip.split(" ")[0] + ":" + service.port + "/apio/notification/create",{
                    //            email: user,
                    //            notification: scope.newStatusName,
                    //            objectId: scope.object.objectId,
                    //            properties: scope.currentObject.record()
                    //        }).success(function (result) {
                    //            removeRecordingStatus();
                    //            alert("Notifica creata con successo!");
                    //            console.log("Notification successfully created, result: ", result);
                    //        }).error(function (err1) {
                    //            console.log("Unable to create notification: ", err1);
                    //        });
                    //    }).error(function (err_) {
                    //        console.log("Unable to get service notification, err_: ", err_);
                    //    });
                    //}).error(function (err) {
                    //    console.log("Unable to get IP, error: ", err);
                    //});

                    $http.post("/apio/service/notification/route/" + encodeURIComponent("/apio/notification/create") + "/data/" + encodeURIComponent(JSON.stringify({
                            email: user,
                            notification: scope.newStatusName,
                            objectId: scope.object.objectId,
                            properties: scope.currentObject.record()
                        }))
                    ).success(function (result) {
                        removeRecordingStatus();
                        alert("Notifica creata con successo!");
                        console.log("Notification successfully created, result: ", result);
                    }).error(function (error) {
                        if (error === "USER_ALREADY_IN") {
                            alert("Una notifica per questa proprietà è già stata registrata");
                        }
                        console.log("Unable to create notification: ", error);
                    });
                }).error(function (error) {
                    console.log("Unable to get session, error: ", error);
                });
            }
        }
    };
}]);
