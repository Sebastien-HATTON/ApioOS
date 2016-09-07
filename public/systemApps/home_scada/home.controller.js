//Copyright 2014-2015 Alex Benfaremo, Alessandro Chelli, Lorenzo Di Berardino, Matteo Di Sabatino

/********************************* LICENSE **********************************
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

angular.module("ApioApplication").controller("ApioHomeScadaController", ["$scope", "socket", "boardsService", "objectService", "currentObject", "$routeParams", "$location", "$timeout", "sharedProperties", "$http", "$window", "$rootScope", "sweet", "$mdDialog", function ($scope, socket, boardsService, objectService, currentObject, $routeParams, $location, $timeout, sharedProperties, $http, $window, $rootScope, sweet, $mdDialog) {
    socket.on("apio_shutdown", function () {
        var time = 30;
        sweet.show({
            title: "Il sistema si spegnerà tra 30 secondi",
            text: "Questo messaggio si chiuderà automaticamente",
            type: "warning",
            timer: 30000,
            showCancelButton: false,
            confirmButtonClass: "btn-success",
            closeOnConfirm: false
        });
        var nodes = document.getElementsByClassName("sweet-alert").item(0).childNodes;
        for (var i in nodes) {
            if (nodes[i].nodeName === "H2") {
                var titleNode = nodes[i];
                titleNode.parentNode.removeChild(titleNode.nextSibling.nextSibling);
                break;
            }
        }
        var countdown = setInterval(function () {
            time--;
            if (time === 0) {
                clearInterval(countdown);
                document.body.innerHTML = "";
            } else if (time === 1) {
                titleNode.innerHTML = "Il sistema si spegnerà tra " + time + " secondo";
            } else {
                titleNode.innerHTML = "Il sistema si spegnerà tra " + time + " secondi";
            }
        }, 1000);
    });

    $http.get("/apio/user/getSession").success(function (data) {
        $scope.loggedUser = data;
    }).error(function (error) {
        console.log("Error while getting session: ", error);
    });

    document.getElementById("ApioApplicationContainer").classList.remove("fullscreen");
    if (!document.getElementById("apioWaitLoadingSystemOperation").classList.contains("apioWaitLoadingSystemOperationOn")) {
        document.getElementById("apioWaitLoading").classList.remove("apioWaitLoadingOff");
        document.getElementById("apioWaitLoading").classList.add("apioWaitLoadingOn");
        $timeout(function () {
            document.getElementById("apioWaitLoading").classList.remove("apioWaitLoadingOn");
            document.getElementById("apioWaitLoading").classList.add("apioWaitLoadingOff");
        });
    }

    document.getElementById("targetBody").style.position = "";

    $scope.currentApplication = null;
    $("#ApioApplicationContainer").hide(function () {
        $("#ApioApplicationContainer").html("");
    });

    $("#notificationsCenter").slideUp(500);

    if (document.getElementById("menuMobileContratto")) {
        document.getElementById("menuMobileContratto").classList.remove("in");
    }

    socket.on("apio_object_change_settings", function (data) {
        for (var i = 0, found = false; !found && i < $scope.objects.length; i++) {
            if ($scope.objects[i].objectId === data.objectId) {
                $scope.objects[i].address = data.address;
                $scope.objects[i].name = data.name;
                $scope.objects[i].services = data.services;
                $scope.objects[i].sleepTime = data.sleepTime;
                $scope.objects[i].tag = data.tag;
                found = true;
            }
        }
    });

    socket.on("apio_object_online", function (data) {
        var found = false;
        for (var i = 0; !found && i < $scope.objects.length; i++) {
            if ($scope.objects[i].objectId === data.objectId) {
                $scope.objects[i].status = data.status;
                found = true;
            }
        }
    });

    socket.on("apio_server_delete", function (data) {
        if ($("#ApioApplicationContainer").find("#ApioApplication" + data).length) {
            angular.element(document.getElementsByClassName("topAppApplication")[0]).scope().goBackToHome();
        }

        var imageDimensionsNodes = document.getElementsByClassName("image-dimensions");
        var nodeFound = false;
        for (var i = 0; !nodeFound && i < imageDimensionsNodes.length; i++) {
            if (imageDimensionsNodes.item(i).style.backgroundImage.indexOf("/" + data + "/") > -1) {
                var nodeToDelete = imageDimensionsNodes.item(i).parentNode.parentNode.parentNode;
                if (nodeToDelete.parentNode.removeChild(nodeToDelete)) {
                    nodeFound = true;

                    var objectsFound = false;
                    for (var j = 0; !objectsFound && j < $scope.objects.length; j++) {
                        if ($scope.objects[j].objectId === data) {
                            $scope.objects.splice(j, 1);
                            objectsFound = true;
                        }
                    }
                }
            }
        }
    });

    socket.on("apio_server_new", function (data) {
        $http.get("/apio/communication/bindToProperty").success(function (data) {
            bindToPropertyObj = data;
            console.log("bindToPropertyObj: ", bindToPropertyObj);
        }).error(function (error) {
            console.log("Error while getting bindToProperty communication: ", error);
        });

        var isIn = function (id) {
            for (var i in $scope.objects) {
                if (id === $scope.objects[i].objectId) {
                    return true;
                }
            }

            return false;
        };

        if (!isIn(data)) {
            $http.get("/apio/user/getSessionComplete", {email: $scope.loggedUser}).success(function (session) {
                objectService.getById(data).then(function (object) {
                    if (session.priviligies === "superAdmin") {
                        $scope.objects.push(object.data);
                        //AGGIORNARE LA VARIABILE D'ORDINAMENTO E SCRIVERE SU FILE
                        $scope.objects.sort(function (a, b) {
                            if (a.type === "object") {
                                if (b.type === "object") {
                                    var numberInA = numberPositionInString(a.name.toLowerCase());
                                    var numberInB = numberPositionInString(b.name.toLowerCase());
                                    if (numberInA > -1 && numberInB > -1 && numberInA === numberInB) {
                                        var preNumA = a.name.toLowerCase().substring(0, numberInA);
                                        var numA = Number(a.name.toLowerCase().substring(numberInA));
                                        var preNumB = b.name.toLowerCase().substring(0, numberInB);
                                        var numB = Number(b.name.toLowerCase().substring(numberInB));
                                        if (preNumA === preNumB) {
                                            return numA - numB;
                                        } else {
                                            return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : a.name.toLowerCase() > b.name.toLowerCase() ? 1 : Number(a.objectId) - Number(b.objectId);
                                        }
                                    } else {
                                        return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : a.name.toLowerCase() > b.name.toLowerCase() ? 1 : Number(a.objectId) - Number(b.objectId);
                                    }
                                } else if (b.type === "service") {
                                    return 1;
                                }
                            } else if (a.type === "service") {
                                if (b.type === "object") {
                                    return -1;
                                } else if (b.type === "service") {
                                    var numberInA = numberPositionInString(a.name.toLowerCase());
                                    var numberInB = numberPositionInString(b.name.toLowerCase());
                                    if (numberInA > -1 && numberInB > -1 && numberInA === numberInB) {
                                        var preNumA = a.name.toLowerCase().substring(0, numberInA);
                                        var numA = Number(a.name.toLowerCase().substring(numberInA));
                                        var preNumB = b.name.toLowerCase().substring(0, numberInB);
                                        var numB = Number(b.name.toLowerCase().substring(numberInB));
                                        if (preNumA === preNumB) {
                                            return numA - numB;
                                        } else {
                                            return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : a.name.toLowerCase() > b.name.toLowerCase() ? 1 : Number(a.objectId) - Number(b.objectId);
                                        }
                                    } else {
                                        return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : a.name.toLowerCase() > b.name.toLowerCase() ? 1 : Number(a.objectId) - Number(b.objectId);
                                    }
                                }
                            }
                            //ORDINE PER OBJECTID
                            //return Number(a.objectId) - Number(b.objectId);
                            //ORDINE ALFABETICO (NON CONSIDERA IL TIPO DI OGGETTO)
                            //return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : a.name.toLowerCase() > b.name.toLowerCase() ? 1 : Number(a.objectId) - Number(b.objectId);
                        });
                    } else if (object.data.hasOwnProperty("user")) {
                        var isOwner = false;
                        for (var i = 0; !isOwner && i < object.data.user.length; i++) {
                            if (object.data.user[i].email === $scope.loggedUser) {
                                isOwner = true;
                            }
                        }

                        if (isOwner) {
                            $scope.objects.push(object.data);
                            //AGGIORNARE LA VARIABILE D'ORDINAMENTO E SCRIVERE SU FILE
                            $scope.objects.sort(function (a, b) {
                                if (a.type === "object") {
                                    if (b.type === "object") {
                                        var numberInA = numberPositionInString(a.name.toLowerCase());
                                        var numberInB = numberPositionInString(b.name.toLowerCase());
                                        if (numberInA > -1 && numberInB > -1 && numberInA === numberInB) {
                                            var preNumA = a.name.toLowerCase().substring(0, numberInA);
                                            var numA = Number(a.name.toLowerCase().substring(numberInA));
                                            var preNumB = b.name.toLowerCase().substring(0, numberInB);
                                            var numB = Number(b.name.toLowerCase().substring(numberInB));
                                            if (preNumA === preNumB) {
                                                return numA - numB;
                                            } else {
                                                return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : a.name.toLowerCase() > b.name.toLowerCase() ? 1 : Number(a.objectId) - Number(b.objectId);
                                            }
                                        } else {
                                            return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : a.name.toLowerCase() > b.name.toLowerCase() ? 1 : Number(a.objectId) - Number(b.objectId);
                                        }
                                    } else if (b.type === "service") {
                                        return 1;
                                    }
                                } else if (a.type === "service") {
                                    if (b.type === "object") {
                                        return -1;
                                    } else if (b.type === "service") {
                                        var numberInA = numberPositionInString(a.name.toLowerCase());
                                        var numberInB = numberPositionInString(b.name.toLowerCase());
                                        if (numberInA > -1 && numberInB > -1 && numberInA === numberInB) {
                                            var preNumA = a.name.toLowerCase().substring(0, numberInA);
                                            var numA = Number(a.name.toLowerCase().substring(numberInA));
                                            var preNumB = b.name.toLowerCase().substring(0, numberInB);
                                            var numB = Number(b.name.toLowerCase().substring(numberInB));
                                            if (preNumA === preNumB) {
                                                return numA - numB;
                                            } else {
                                                return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : a.name.toLowerCase() > b.name.toLowerCase() ? 1 : Number(a.objectId) - Number(b.objectId);
                                            }
                                        } else {
                                            return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : a.name.toLowerCase() > b.name.toLowerCase() ? 1 : Number(a.objectId) - Number(b.objectId);
                                        }
                                    }
                                }
                                //ORDINE PER OBJECTID
                                //return Number(a.objectId) - Number(b.objectId);
                                //ORDINE ALFABETICO (NON CONSIDERA IL TIPO DI OGGETTO)
                                //return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : a.name.toLowerCase() > b.name.toLowerCase() ? 1 : Number(a.objectId) - Number(b.objectId);
                            });
                        }
                    }

                    if (!$scope.$$phase) {
                        $scope.$apply();
                    }

                    var firstId = $scope.objects[0].objectId;
                    var className = document.getElementById(firstId).className;
                    var interval = setInterval(function () {
                        if (document.getElementById(object.data.objectId)) {
                            clearInterval(interval);
                            document.getElementById(object.data.objectId).className = className;
                        }
                    }, 0);
                });
            });
        }
    });

    socket.on("apio_server_refresh", function (data) {
        objectService.getById(data.objectId).then(function (object) {
            var found = false;
            for (var i = 0; !found && i < $scope.objects.length; i++) {
                if ($scope.objects[i].objectId === data.objectId) {
                    $scope.objects[i].name = object.data.name;
                    found = true;
                }
            }

            $scope.objects.sort(function (a, b) {
                if (a.type === "object") {
                    if (b.type === "object") {
                        var numberInA = numberPositionInString(a.name.toLowerCase());
                        var numberInB = numberPositionInString(b.name.toLowerCase());
                        if (numberInA > -1 && numberInB > -1 && numberInA === numberInB) {
                            var preNumA = a.name.toLowerCase().substring(0, numberInA);
                            var numA = Number(a.name.toLowerCase().substring(numberInA));
                            var preNumB = b.name.toLowerCase().substring(0, numberInB);
                            var numB = Number(b.name.toLowerCase().substring(numberInB));
                            if (preNumA === preNumB) {
                                return numA - numB;
                            } else {
                                return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : a.name.toLowerCase() > b.name.toLowerCase() ? 1 : Number(a.objectId) - Number(b.objectId);
                            }
                        } else {
                            return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : a.name.toLowerCase() > b.name.toLowerCase() ? 1 : Number(a.objectId) - Number(b.objectId);
                        }
                    } else if (b.type === "service") {
                        return 1;
                    }
                } else if (a.type === "service") {
                    if (b.type === "object") {
                        return -1;
                    } else if (b.type === "service") {
                        var numberInA = numberPositionInString(a.name.toLowerCase());
                        var numberInB = numberPositionInString(b.name.toLowerCase());
                        if (numberInA > -1 && numberInB > -1 && numberInA === numberInB) {
                            var preNumA = a.name.toLowerCase().substring(0, numberInA);
                            var numA = Number(a.name.toLowerCase().substring(numberInA));
                            var preNumB = b.name.toLowerCase().substring(0, numberInB);
                            var numB = Number(b.name.toLowerCase().substring(numberInB));
                            if (preNumA === preNumB) {
                                return numA - numB;
                            } else {
                                return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : a.name.toLowerCase() > b.name.toLowerCase() ? 1 : Number(a.objectId) - Number(b.objectId);
                            }
                        } else {
                            return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : a.name.toLowerCase() > b.name.toLowerCase() ? 1 : Number(a.objectId) - Number(b.objectId);
                        }
                    }
                }
                //ORDINE PER OBJECTID
                //return Number(a.objectId) - Number(b.objectId);
                //ORDINE ALFABETICO (NON CONSIDERA IL TIPO DI OGGETTO)
                //return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : a.name.toLowerCase() > b.name.toLowerCase() ? 1 : Number(a.objectId) - Number(b.objectId);
            });
        });
    });

    socket.on("apio.remote.sync.request", function (data) {
        if ($scope.platform && $scope.platform.type === "cloud") {
            if ($scope.currentUserActive.role === "superAdmin") {
                $http.get("/apio/boards/getDetailsFor/" + data.apioId).success(function (boardsDetails) {
                    boardsDetails[0].isSyncing = true;
                    $scope.currentUserActive.platform.push(boardsDetails[0]);
                });
            } else {
                $http.get("/apio/user/getSession").success(function (data) {
                    $http.post("/apio/user/getUser", {email: data}).success(function (a) {
                        $scope.currentUserActive = a.user;
                        for (var i = 0, found = false; !found && i < $scope.currentUserActive.apioId.length; i++) {
                            if ($scope.currentUserActive.apioId[i].code === data.apioId) {
                                found = true;
                                $http.get("/apio/boards/getDetailsFor/" + data.apioId).success(function (boardsDetails) {
                                    boardsDetails[0].isSyncing = true;
                                    $scope.currentUserActive.platform.push(boardsDetails[0]);
                                });
                            }
                        }
                    });
                });
            }
        }
    });

    socket.on("apio.cloud.sync.end", function (data) {
        if ($scope.platform && $scope.platform.type === "cloud") {
            for (var i = 0, found = false; !found && i < $scope.currentUserActive.platform.length; i++) {
                if ($scope.currentUserActive.platform[i].apioId === data) {
                    found = true;
                    delete $scope.currentUserActive.platform[i].isSyncing;
                }
            }
        }
    });

    $scope.$on("$routeChangeStart", function (scope, next, current) {
        Apio.currentApplication = 0;
    });

    //Riferimento a tutti gli oggetti scaricati dal db
    $scope.objects = [];
    //Riferimento all'oggetto correntemente aperto
    currentObject.isModifying(false);
    currentObject.isRecording(false);
    currentObject.resetRecord();
    $scope.currentObject = {};
    $scope.currentView = {};
    $scope.currentUserActive = {}
    /* START copy in app.apio.js */
    $scope.platform = {}
    $scope.continueToCloud = false;
    //$scope.cloudShowBoard = false;
    $scope.getPlatform = function () {
        $http.get("/apio/getPlatform").success(function (data) {
            $scope.platform = data;

            if (data.apioId === "Continue to Cloud") {
                $scope.continueToCloud = true;
                $scope.currentUserEmail();
            }
        });
    };
    $scope.getPlatform();

    $scope.currentUserEmail = function () {
        $http.get("/apio/user/getSession").success(function (data) {
            console.log("session, data: ", data);
            if ($scope.platform.type === "cloud") {
                if (data === "info@apio.cc") {
                    $http.get("/apio/boards").success(function (a) {
                        $scope.currentUserActive.role = "superAdmin";
                        $scope.currentUserActive.platform = a;
                        console.log("$scope.currentUserActive.platform: ", $scope.currentUserActive.platform);

                        $scope.currentUserActive.platform.sort(function (a, b) {
                            var aName = a.name ? a.name : a.apioId;
                            var bName = b.name ? b.name : b.apioId;
                            var numberInA = numberPositionInString(aName.toLowerCase());
                            var numberInB = numberPositionInString(bName.toLowerCase());
                            if (numberInA > -1 && numberInB > -1 && numberInA === numberInB) {
                                var preNumA = aName.toLowerCase().substring(0, numberInA);
                                var numA = Number(aName.toLowerCase().substring(numberInA));
                                var preNumB = bName.toLowerCase().substring(0, numberInB);
                                var numB = Number(bName.toLowerCase().substring(numberInB));
                                if (preNumA === preNumB) {
                                    return numA - numB;
                                } else {
                                    return aName.toLowerCase() < bName.toLowerCase() ? -1 : aName.toLowerCase() > bName.toLowerCase() ? 1 : Number(a.apioId) - Number(b.apioId);
                                }
                            } else {
                                return aName.toLowerCase() < bName.toLowerCase() ? -1 : aName.toLowerCase() > bName.toLowerCase() ? 1 : Number(a.apioId) - Number(b.apioId);
                            }
                        });
                    });
                } else {
                    $http.post("/apio/user/getUser", {email: data}).success(function (a) {
                        $scope.currentUserActive = a.user;
                        console.log("$scope.currentUserActive: ", $scope.currentUserActive);
                        var apioId = [];
                        for (var i in a.user.apioId) {
                            apioId.push(a.user.apioId[i].code);
                        }
                        //$http.get("/apio/boards/getDetailsFor/" + a.user.apioId).success(function (boardsDetails) {
                        $http.get("/apio/boards/getDetailsFor/" + apioId).success(function (boardsDetails) {
                            $scope.currentUserActive.platform = boardsDetails;

                            $scope.currentUserActive.platform.sort(function (a, b) {
                                var aName = a.name ? a.name : a.apioId;
                                var bName = b.name ? b.name : b.apioId;
                                var numberInA = numberPositionInString(aName.toLowerCase());
                                var numberInB = numberPositionInString(bName.toLowerCase());
                                if (numberInA > -1 && numberInB > -1 && numberInA === numberInB) {
                                    var preNumA = aName.toLowerCase().substring(0, numberInA);
                                    var numA = Number(aName.toLowerCase().substring(numberInA));
                                    var preNumB = bName.toLowerCase().substring(0, numberInB);
                                    var numB = Number(bName.toLowerCase().substring(numberInB));
                                    if (preNumA === preNumB) {
                                        return numA - numB;
                                    } else {
                                        return aName.toLowerCase() < bName.toLowerCase() ? -1 : aName.toLowerCase() > bName.toLowerCase() ? 1 : Number(a.apioId) - Number(b.apioId);
                                    }
                                } else {
                                    return aName.toLowerCase() < bName.toLowerCase() ? -1 : aName.toLowerCase() > bName.toLowerCase() ? 1 : Number(a.apioId) - Number(b.apioId);
                                }
                            });
                        });
                    });
                }
            } else {
                $http.post("/apio/user/getUser", {email: data}).success(function (a) {
                    $scope.currentUserActive = a.user;
                });
            }
        });
    };

    var numberPositionInString = function (str) {
        for (var i in str) {
            if (str[i] === "0" || str[i] === "1" || str[i] === "2" || str[i] === "3" || str[i] === "4" || str[i] === "5" || str[i] === "6" || str[i] === "7" || str[i] === "8" || str[i] === "9") {
                return i;
            }
        }

        return -1;
    };

    var existsAddress = function (addr) {
        for (var i in $scope.objects) {
            if ($scope.objects[i].address instanceof Array && $scope.objects[i].address.indexOf(addr) > -1) {
                return true;
            } else if (typeof $scope.objects[i].address === "string" && $scope.objects[i].address === addr) {
                return true;
            }
        }

        return false;
    };

    $scope.launchApplicationSimple = function (id) {
        var head = document.getElementsByTagName("head").item(0);

        if (document.getElementById("faviconApp")) {
            head.removeChild(document.getElementById("faviconApp"));
            head.removeChild(document.getElementById("faviconApp1"));

            var x = document.createElement("LINK");
            x.setAttribute("id", "favicon")
            x.setAttribute("rel", "apple-touch-icon");
            x.setAttribute("href", "html/apple-touch-icon.png");
            head.appendChild(x)
            var s = document.createElement("LINK");
            s.setAttribute("id", "favicon1")
            s.setAttribute("rel", "apple-touch-icon-precomposed");
            s.setAttribute("href", "html/apple-touch-icon.png");
            head.appendChild(s);
        }


        if (document.getElementById("subApplication")) {
            Apio.newWidth -= Apio.appWidth;
            $("#ApioApplicationContainer").css("width", Apio.appWidth + "px");
            Apio.removeAngularScope(document.getElementById("subApplication"), true);
            if (document.getElementById("ApioIconsContainer")) {
                $("#ApioIconsContainer").css("width", "66.4%");
                var l = document.getElementById("ApioIconsContainer").childNodes;
                for (var s in l) {
                    if (l.item(s).classList && l.item(s).classList.contains("ApioIconsContainer2") && l.item(s).classList.contains("col-md-6")) {
                        l.item(s).classList.remove("col-md-6");
                        l.item(s).classList.add("col-md-3");
                    }
                }
            }
        }

        if (Apio.currentApplication !== Number(id) && !document.getElementsByClassName("popover-content").item(0)) {
            Apio.currentApplication = Number(id);
            if (document.getElementById("imageId" + id)) {
                Apio.runApioLoading(document.getElementById("imageId" + id).parentNode, false, "145");
            }

            objectService.getById(id).then(function (d) {
                $scope.currentObject = d.data;
                var route = "applications/" + id + "/" + id;
                currentObject.set(d.data);
                //alert(d.data.type)
                if (d.data.type === "object" || d.data.type === "service") {
                    route = "applications/" + id + "/" + id;
                } else {
                    route = "products/" + d.data.appId + "/" + d.data.appId;
                }

                $.get(route + ".html", function (data) {
                    //BEGIN: Check is to properties is been added or delete something
                    var additionalInfo = JSON.parse(JSON.stringify(d.data.propertiesAdditionalInfo));
                    var isDifferent = false;
                    var parser = new DOMParser();
                    var parsed = parser.parseFromString(data, "text/html");
                    var properties = parsed.querySelectorAll("[propertyname]");
                    var propObj = {};

                    var getPropertyname = function (elem) {
                        for (var i in elem) {
                            if (elem[i].name === "propertyname") {
                                return elem[i].value;
                            }
                        }
                    };

                    for (var i in properties) {
                        for (var j in properties[i].attributes) {
                            if (typeof properties[i].attributes[j] === "object" && properties[i].attributes[j].name !== "event" && properties[i].attributes[j].name !== "listener" && properties[i].attributes[j].name !== "propertyname") {
                                var propertyname = getPropertyname(properties[i].attributes);
                                if (!propObj.hasOwnProperty(propertyname)) {
                                    propObj[propertyname] = {
                                        type: properties[i].tagName.toLowerCase()
                                    }
                                }

                                propObj[propertyname][properties[i].attributes[j].name] = properties[i].attributes[j].value;
                            }
                        }
                    }

                    for (var i in propObj) {
                        if (!additionalInfo.hasOwnProperty(i)) {
                            additionalInfo[i] = propObj[i];
                            additionalInfo[i].value = "0";
                            isDifferent = true;
                        } else {
                            for (var j in propObj[i]) {
                                if (!additionalInfo[i].hasOwnProperty(j)) {
                                    if (propObj[i][j] === "false") {
                                        additionalInfo[i][j] = false;
                                    } else if (propObj[i][j] === "true") {
                                        additionalInfo[i][j] = true;
                                    } else {
                                        additionalInfo[i][j] = propObj[i][j];
                                    }
                                    isDifferent = true;
                                }
                            }
                        }

                        if (existsAddress(propObj[i].protocoladdress) && propObj[i].hasOwnProperty("protocolname") && propObj[i].hasOwnProperty("protocolfun") && propObj[i].hasOwnProperty("protocoladdress") && propObj[i].hasOwnProperty("protocoltype") && propObj[i].hasOwnProperty("protocolproperty") && propObj[i].hasOwnProperty("protocolbindtoproperty")) {
                            additionalInfo[i].protocol = {
                                name: propObj[i].protocolname,
                                type: propObj[i].protocoltype,
                                fun: propObj[i].protocolfun,
                                address: propObj[i].protocoladdress,
                                property: propObj[i].protocolproperty
                            };

                            if (!bindToPropertyObj.hasOwnProperty(propObj[i].protocolname)) {
                                bindToPropertyObj[propObj[i].protocolname] = {};
                            }

                            if (!bindToPropertyObj[propObj[i].protocolname].hasOwnProperty(propObj[i].protocoladdress)) {
                                bindToPropertyObj[propObj[i].protocolname][propObj[i].protocoladdress] = {};
                            }

                            if (!bindToPropertyObj[propObj[i].protocolname][propObj[i].protocoladdress].hasOwnProperty(propObj[i].protocolproperty)) {
                                bindToPropertyObj[propObj[i].protocolname][propObj[i].protocoladdress][propObj[i].protocolproperty] = {};
                            }

                            bindToPropertyObj[propObj[i].protocolname][propObj[i].protocoladdress][propObj[i].protocolproperty][$scope.currentObject.objectId] = i;
                        } else {
                            var protocols = Object.keys(bindToPropertyObj);
                            for (var p in protocols) {
                                var addresses = Object.keys(bindToPropertyObj[protocols[p]]);
                                for (var a in addresses) {
                                    var types = Object.keys(bindToPropertyObj[protocols[p]][addresses[a]]);
                                    for (var t in types) {
                                        if (typeof bindToPropertyObj[protocols[p]][addresses[a]][types[t]] === "object") {
                                            if (bindToPropertyObj[protocols[p]][addresses[a]][types[t]][$scope.currentObject.objectId] === i) {
                                                delete bindToPropertyObj[protocols[p]][addresses[a]][types[t]][$scope.currentObject.objectId];
                                            }

                                            //if (Object.keys(bindToPropertyObj[protocols[p]][addresses[a]][types[t]]).length === 0) {
                                            //    delete bindToPropertyObj[protocols[p]][addresses[a]][types[t]];
                                            //}
                                        }
                                    }

                                    //if (Object.keys(bindToPropertyObj[protocols[p]][addresses[a]]).length === 0) {
                                    //    delete bindToPropertyObj[protocols[p]][addresses[a]];
                                    //}
                                }

                                //if (Object.keys(bindToPropertyObj[protocols[p]]).length === 0) {
                                //    delete bindToPropertyObj[protocols[p]];
                                //}
                            }
                        }
                    }

                    for (var i in d.data.properties) {
                        additionalInfo[i].value = d.data.properties[i];
                    }

                    for (var i in additionalInfo) {
                        if (!propObj.hasOwnProperty(i)) {
                            delete additionalInfo[i];
                            isDifferent = true;
                        } else {
                            for (var j in additionalInfo[i]) {
                                if ((j !== "graph" && j !== "hi" && j !== "protocol" && j !== "value" && !propObj[i].hasOwnProperty(j)) || (j !== "protocol" && j.indexOf("protocol") > -1)) {
                                    delete additionalInfo[i][j];
                                    isDifferent = true;
                                }
                            }
                        }
                    }

                    if (isDifferent) {
                        $http.put("/apio/modifyObject/" + d.data.objectId, {
                            object: {
                                properties: additionalInfo
                            }
                        }).success(function (data) {
                            console.log("Object with objectId " + d.data.objectId + " successfully modified: ", data);
                        }).error(function (error) {
                            console.log("Error while updating object with objectId " + d.data.objectId + ": ", error);
                        });
                    }

                    $http.post("/apio/communication/bindToProperty", bindToPropertyObj).success(function () {
                        console.log("bindToProperty communication successfully modified");
                    }).error(function (error) {
                        console.log("Error while modifying bindToProperty communication: ", error);
                    });

                    //END: Check is to properties is been added or delete something

                    $("#ApioApplicationContainer").html($(data));
                    var appId = "ApioApplication" + id;
                    if (d.data.type == "products") {
                        appId = "ApioApplication" + d.data.appId;
                    } else {
                        appId = "ApioApplication" + id;
                    }

                    document.getElementById(appId).classList.add("configurationDefaultContainerApp");
                    document.getElementById(appId).childNodes[1].style.height = "93%";
                    document.getElementById("app").style.width = "100%";
                    document.getElementById("app").style.height = "100%";
                    document.getElementById("app").style.overflowY = "scroll";
                    document.getElementById("app").style.overflowX = "hidden";

                    $("#ApioApplicationContainer").find("h2").text($scope.currentObject.name);
                    Apio.newWidth = Apio.appWidth;

                    // La funzione è commentata perché il width ora è dato dalla classe "dynamicPanel"
                    //$("#ApioApplicationContainer").css("width", Apio.appWidth + "px");
                    if ($("#ApioApplicationContainer").css("display") == "none") {
                        $("#ApioApplicationContainer").show(500, function () {

                            if (window.innerWidth > 768) {
                                // Decomprime contenitore app + corregge col icone
                                if (document.getElementById("ApioIconsContainer")) {
                                    $("#ApioIconsContainer").css("width", "66.4%");
                                    var l = document.getElementById("ApioIconsContainer").childNodes;
                                    for (var s in l) {
                                        if (l.item(s).classList && l.item(s).classList.contains("ApioIconsContainer2") && l.item(s).classList.contains("col-md-2")) {
                                            l.item(s).classList.remove("col-md-2");
                                            l.item(s).classList.add("col-md-3");
                                        }
                                    }
                                }
                                //END
                            }

                            $timeout(function () {
                                if (document.getElementById("imageId" + id)) {
                                    Apio.stopApioLoading();
                                }
                            });
                        });
                    } else {
                        $timeout(function () {
                            if (document.getElementById("imageId" + id)) {
                                Apio.stopApioLoading();
                            }
                        });
                    }
                });
            });
        }

    };


    objectService.list().then(function (d) {
        $rootScope.objectId = d.data;
        //alert()
        console.log(d.data)
        $scope.objects = d.data;

        $http.get("systemApps/home/order.json").success(function (order) {
            console.log("order: ", order);
            //SALVARE L'ORDINAMENTO IN UNA VARIABILE ACCESSIBILE SOLO NEL CONTROLLER
            $scope.objects.sort(function (a, b) {

                if (a.type === "object") {
                    if (b.type === "object") {
                        var numberInA = numberPositionInString(a.name.toLowerCase());
                        var numberInB = numberPositionInString(b.name.toLowerCase());
                        if (numberInA > -1 && numberInB > -1 && numberInA === numberInB) {
                            var preNumA = a.name.toLowerCase().substring(0, numberInA);
                            var numA = Number(a.name.toLowerCase().substring(numberInA));
                            var preNumB = b.name.toLowerCase().substring(0, numberInB);
                            var numB = Number(b.name.toLowerCase().substring(numberInB));
                            if (preNumA === preNumB) {
                                return numA - numB;
                            } else {
                                return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : a.name.toLowerCase() > b.name.toLowerCase() ? 1 : Number(a.objectId) - Number(b.objectId);
                            }
                        } else {
                            return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : a.name.toLowerCase() > b.name.toLowerCase() ? 1 : Number(a.objectId) - Number(b.objectId);
                        }
                    } else if (b.type === "service") {
                        return 1;
                    }
                } else if (a.type === "service") {
                    if (b.type === "object") {
                        return -1;
                    } else if (b.type === "service") {
                        var numberInA = numberPositionInString(a.name.toLowerCase());
                        var numberInB = numberPositionInString(b.name.toLowerCase());
                        if (numberInA > -1 && numberInB > -1 && numberInA === numberInB) {
                            var preNumA = a.name.toLowerCase().substring(0, numberInA);
                            var numA = Number(a.name.toLowerCase().substring(numberInA));
                            var preNumB = b.name.toLowerCase().substring(0, numberInB);
                            var numB = Number(b.name.toLowerCase().substring(numberInB));
                            if (preNumA === preNumB) {
                                return numA - numB;
                            } else {
                                return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : a.name.toLowerCase() > b.name.toLowerCase() ? 1 : Number(a.objectId) - Number(b.objectId);
                            }
                        } else {
                            return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : a.name.toLowerCase() > b.name.toLowerCase() ? 1 : Number(a.objectId) - Number(b.objectId);
                        }
                    }
                }
                //ORDINE PER OBJECTID
                //return Number(a.objectId) - Number(b.objectId);
                //ORDINE ALFABETICO (NON CONSIDERA IL TIPO DI OGGETTO)
                //return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : a.name.toLowerCase() > b.name.toLowerCase() ? 1 : Number(a.objectId) - Number(b.objectId);
            });
            console.log("OBJECTS ORDER IS: ", $scope.objects)
            var s = Snap("#apps");
            var app = {};

            var widthScreen = window.innerWidth;
            var distanceBetweenApps = widthScreen / 7;

            var rows = 0;
            var y = 0;
            var x = 0;
            for (var img in $scope.objects) {
                console.log('FOR ', img);
                //app[$scope.objects[img].objectId] = s.paper.image("/applications/" + $scope.objects[img].objectId + "/icon.png",img*distanceBetweenApps,0,103,103);
                if (!$scope.objects.hasOwnProperty('position')) {
                    if (Number(img) && Number(img) % 7 === 0) {
                        rows++;
                        y += distanceBetweenApps;
                    }
                    x = (Number(img) - rows * 7) * distanceBetweenApps;

                    app[$scope.objects[img].objectId] = {
                        image: '',
                        title: '',
                        groups: '',
                        circle: ''
                    }
                    app[$scope.objects[img].objectId].image = s.image("/applications/" + $scope.objects[img].objectId + "/icon.png", x, y, 103, 103).attr({id: $scope.objects[img].objectId});

                    app[$scope.objects[img].objectId].title = s.text(x + 51.5, y + 120, $scope.objects[img].name).attr({
                        textAnchor: 'middle'
                    });
                    app[$scope.objects[img].objectId].circle = s.circle(x + 51.6, y + 51.6, 52);
                    app[$scope.objects[img].objectId].groups = s.paper.g(app[$scope.objects[img].objectId].circle, app[$scope.objects[img].objectId].image, app[$scope.objects[img].objectId].title);
                    //launchApplicationSimple($scope.objects[img].objectId)
                    app[$scope.objects[img].objectId].groups.attr({
                        groupId: $scope.objects[img].objectId,
                        toggle: '0',
                        width: '150px'
                    })

                    console.log('GROUPS: ', app[$scope.objects[img].objectId].groups);

                    app[$scope.objects[img].objectId].groups.click(function (event) {
                        console.log('Clicked: ', event);
                        $scope.launchApplicationSimple(event.target.id)
                    })
                    app[$scope.objects[img].objectId].groups.drag('', '', function (event) {
                        console.log('DragEnd: ', event);
                    })
                    app[$scope.objects[img].objectId].groups.dblclick(function (event) {
                        console.log('Double Clicked: ', event);
                        if (app[event.target.id].groups.attr('toggle') == '0') {
                            app[event.target.id].groups.attr({
                                toggle: '1'
                            })
                            app[event.target.id].circle.attr({
                                stroke: "#ff9800",
                                strokeWidth: 5
                            })
                            app[event.target.id].groups.drag();
                        } else {
                            app[event.target.id].groups.attr({
                                toggle: '0'
                            })
                            app[event.target.id].circle.attr({
                                stroke: "#ff9800",
                                strokeWidth: 0
                            })
                            app[event.target.id].groups.undrag();
                        }
                    })

                    console.log('APP ', $scope.objects[img].objectId, app[$scope.objects[img].objectId]);
                }
            }

        }).error(function (error) {
            console.log("Error while getting systemApps/home/order.json objects will be ordered alphabetically, error: ", error);
            $scope.objects.sort(function (a, b) {
                if (a.type === "object") {
                    if (b.type === "object") {
                        var numberInA = numberPositionInString(a.name.toLowerCase());
                        var numberInB = numberPositionInString(b.name.toLowerCase());
                        if (numberInA > -1 && numberInB > -1 && numberInA === numberInB) {
                            var preNumA = a.name.toLowerCase().substring(0, numberInA);
                            var numA = Number(a.name.toLowerCase().substring(numberInA));
                            var preNumB = b.name.toLowerCase().substring(0, numberInB);
                            var numB = Number(b.name.toLowerCase().substring(numberInB));
                            if (preNumA === preNumB) {
                                return numA - numB;
                            } else {
                                return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : a.name.toLowerCase() > b.name.toLowerCase() ? 1 : Number(a.objectId) - Number(b.objectId);
                            }
                        } else {
                            return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : a.name.toLowerCase() > b.name.toLowerCase() ? 1 : Number(a.objectId) - Number(b.objectId);
                        }
                    } else if (b.type === "service") {
                        return 1;
                    }
                } else if (a.type === "service") {
                    if (b.type === "object") {
                        return -1;
                    } else if (b.type === "service") {
                        var numberInA = numberPositionInString(a.name.toLowerCase());
                        var numberInB = numberPositionInString(b.name.toLowerCase());
                        if (numberInA > -1 && numberInB > -1 && numberInA === numberInB) {
                            var preNumA = a.name.toLowerCase().substring(0, numberInA);
                            var numA = Number(a.name.toLowerCase().substring(numberInA));
                            var preNumB = b.name.toLowerCase().substring(0, numberInB);
                            var numB = Number(b.name.toLowerCase().substring(numberInB));
                            if (preNumA === preNumB) {
                                return numA - numB;
                            } else {
                                return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : a.name.toLowerCase() > b.name.toLowerCase() ? 1 : Number(a.objectId) - Number(b.objectId);
                            }
                        } else {
                            return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : a.name.toLowerCase() > b.name.toLowerCase() ? 1 : Number(a.objectId) - Number(b.objectId);
                        }
                    }
                }
                //ORDINE PER OBJECTID
                //return Number(a.objectId) - Number(b.objectId);
                //ORDINE ALFABETICO (NON CONSIDERA IL TIPO DI OGGETTO)
                //return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : a.name.toLowerCase() > b.name.toLowerCase() ? 1 : Number(a.objectId) - Number(b.objectId);
            });

            var s = Snap("#apps");
            var bigCircle = s.circle(150, 150, 100);
            bigCircle.drag();

        });
    });

    $scope.updateProperty = function (prop_name, prop_value) {
        if ("undefined" != typeof prop_value) {
            $scope.currentObject.properties[prop_name] = prop_value;
        }

        var o = {
            properties: {},
            objectId: $scope.currentObject.objectId,
            writeToDatabase: true,
            writeToSerial: true
        };
        o.properties[prop_name] = $scope.currentObject.properties[prop_name];

        socket.emit("apio_client_update", o);
    };


    $scope.goToApplication = function (id) {
        //history.pushState({},"#/home/"+id,"#/home/"+id)
        $location.path("/home/" + id);
    };

    var bindToPropertyObj = {};
    var integratedObj = {};

    $http.get("/apio/communication/bindToProperty").success(function (data) {
        bindToPropertyObj = data;
        console.log("bindToPropertyObj: ", bindToPropertyObj);
    }).error(function (error) {
        console.log("Error while getting bindToProperty communication: ", error);
    });

    $http.get("/apio/communication/integrated").success(function (data) {
        integratedObj = data;
    }).error(function (error) {
        console.log("Error while getting integrated communication: ", error);
    });


    if ($routeParams.hasOwnProperty("application")) {
        Apio.currentApplication = 0;
        console.log("Launching application " + $routeParams.application);
        if ($routeParams.hasOwnProperty("objectId")) {
            sharedProperties.set("objectId", $routeParams.objectId);
            console.log("sharedProperties: ", sharedProperties.getAll());
        }

        setTimeout(function () {
            $scope.launchApplicationSimple($routeParams.application);
            document.getElementById("ApioIconsContainer").style.display = "none";
            if (window.innerWidth < 768) {
                document.getElementById("apioMenuMobile").style.display = "none";
            } else {
                document.getElementById("apioMenu").style.display = "none";
            }
        }, 500);
    }
    /*
     $(function () {
     $("[data-toggle=\"popover\"]").popover({html: true})
     })
     */
}]);
