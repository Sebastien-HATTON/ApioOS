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

angular.module("ApioApplication").controller("ApioHomeController", ["$scope", "socket", "boardsService", "objectService", "currentObject", "$routeParams", "$location", "$timeout", "sharedProperties", "$http", "$window", "$rootScope", "sweet", "$mdDialog", "$window", function ($scope, socket, boardsService, objectService, currentObject, $routeParams, $location, $timeout, sharedProperties, $http, $window, $rootScope, sweet, $mdDialog, $window) {
    //If the key-pair clear: "true" is passed the page will be empty
    if ($location.search().hasOwnProperty("clear") && $location.search().clear === "true") {
        $window.location = "app#/home";
        document.body.innerHTML = "";
    }

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

    $scope.category = [];

    $scope.backToCategory = function () {
        $scope.categorySelected = false;
        $scope.categorySelect = "";
    };

    $scope.viewAll = function () {
        $scope.categorySelected = true;
        $scope.categorySelect = "all";
    };

    $scope.categorySelected = false;
    $scope.categorySelect = "";

    $scope.categoryView = function (id) {
        console.log("categoryView");
        console.log(id);
        $scope.categorySelect = String(id);
        $scope.categorySelected = true;
    };

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

    objectService.list().then(function (d) {
        $rootScope.objectId = d.data;
        //alert()
        console.log(d.data);
        $scope.objects = d.data;
        if ($scope.objects) {
            var groupExists = function (group) {
                for (var i = 0, found = false; !found && i < $scope.category.length; i++) {
                    if (group.name === $scope.category[i].name && group.path === $scope.category[i].path && group.id === $scope.category[i].id) {
                        found = true;
                    }
                }

                return found;
            };

            for (var s in $scope.objects) {
                //category
                if ($scope.objects[s].hasOwnProperty("group")) {
                    if ($scope.objects[s].group.hasOwnProperty("name") && $scope.objects[s].group.hasOwnProperty("path")) {
                        if ($scope.category.length === 0) {
                            var o = {
                                name: $scope.objects[s].group.name,
                                path: $scope.objects[s].group.path,
                                id: $scope.objects[s].group.id
                            };

                            if (!groupExists(o)) {
                                $scope.category.push(o);
                            }
                        } else {
                            for (var n in $scope.category) {
                                if ($scope.category[n].name == $scope.objects[s].group) {
                                    break;
                                } else if ($scope.category.length - 1 == n) {
                                    var o = {
                                        name: $scope.objects[s].group.name,
                                        path: $scope.objects[s].group.path,
                                        id: $scope.objects[s].group.id
                                    };

                                    if (!groupExists(o)) {
                                        $scope.category.push(o);
                                    }
                                }
                            }
                        }
                    } else {
                        if ($scope.category.length === 0) {
                            var o = {
                                name: $scope.objects[s].group,
                                path: "/images/elettricalpanel.png",
                                id: $scope.objects[s].group
                            };

                            if (!groupExists(o)) {
                                $scope.category.push(o);
                            }
                        } else {
                            for (var n in $scope.category) {
                                if ($scope.category[n].name == $scope.objects[s].group) {
                                    break;
                                } else if ($scope.category.length - 1 == n) {
                                    var o = {
                                        name: $scope.objects[s].group,
                                        path: "/images/elettricalpanel.png",
                                        id: $scope.objects[s].group
                                    };

                                    if (!groupExists(o)) {
                                        $scope.category.push(o);
                                    }
                                }
                            }
                        }
                    }
                }
                //tag
                if ($scope.objects[s].tag) {
                    var tagArray = $scope.objects[s].tag.split(" ");
                    for (var l in tagArray) {
                        if ($scope.allTag.indexOf(tagArray[l]) === -1) {
                            $scope.allTag.push(tagArray[l]);
                        }
                    }
                }
            }
        }

        console.log("$scope.category: ", $scope.category);

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
	
	
	/* Function that launch the selected App */
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

        if (document.getElementsByClassName("popover-content").item(0)) {
            $scope.hideAllPopover();
        }
        
        if (document.getElementById("subApplication")) {
            Apio.newWidth -= Apio.appWidth;
            $("#ApioApplicationContainer").css("width", Apio.appWidth + "px");
            Apio.removeAngularScope(document.getElementById("subApplication"), true);
            if (document.getElementById("ApioIconsContainer")) {
                $("#ApioIconsContainer").css("width", "69%");
                var l = document.getElementById("ApioIconsContainer").childNodes;
                for (var s in l) {
                    if (l.item(s).classList && l.item(s).classList.contains("ApioIconsContainer2")) {
                        l.item(s).classList.remove("ApioIconsContainer2");
                        l.item(s).classList.add("ApioIconsContainer3");
                    }
                    if (l.item(s).classList && l.item(s).classList.contains("ApioIconsContainer4")) {
                        l.item(s).classList.remove("ApioIconsContainer4");
                        l.item(s).classList.add("ApioIconsContainer3");
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
                            if (typeof properties[i].attributes[j] === "object" && properties[i].attributes[j].name !== "event" && properties[i].attributes[j].name !== "listener" && properties[i].attributes[j].name !== "propertyname" && properties[i].attributes[j].name !== "writetoserial") {
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

                            //if (!bindToPropertyObj.hasOwnProperty(propObj[i].protocolname)) {
                            //    bindToPropertyObj[propObj[i].protocolname] = {};
                            //}
                            //
                            //if (!bindToPropertyObj[propObj[i].protocolname].hasOwnProperty(propObj[i].protocoladdress)) {
                            //    bindToPropertyObj[propObj[i].protocolname][propObj[i].protocoladdress] = {};
                            //}
                            //
                            //if (!bindToPropertyObj[propObj[i].protocolname][propObj[i].protocoladdress].hasOwnProperty(propObj[i].protocolproperty)) {
                            //    bindToPropertyObj[propObj[i].protocolname][propObj[i].protocoladdress][propObj[i].protocolproperty] = {};
                            //}
                            //
                            //bindToPropertyObj[propObj[i].protocolname][propObj[i].protocoladdress][propObj[i].protocolproperty][$scope.currentObject.objectId] = i;
                        } else {
                            delete additionalInfo[i].protocol;
                            //var protocols = Object.keys(bindToPropertyObj);
                            //for (var p in protocols) {
                            //    var addresses = Object.keys(bindToPropertyObj[protocols[p]]);
                            //    for (var a in addresses) {
                            //        var types = Object.keys(bindToPropertyObj[protocols[p]][addresses[a]]);
                            //        for (var t in types) {
                            //            if (typeof bindToPropertyObj[protocols[p]][addresses[a]][types[t]] === "object") {
                            //                if (bindToPropertyObj[protocols[p]][addresses[a]][types[t]][$scope.currentObject.objectId] === i) {
                            //                    delete bindToPropertyObj[protocols[p]][addresses[a]][types[t]][$scope.currentObject.objectId];
                            //                }
                            //
                            //                //if (Object.keys(bindToPropertyObj[protocols[p]][addresses[a]][types[t]]).length === 0) {
                            //                //    delete bindToPropertyObj[protocols[p]][addresses[a]][types[t]];
                            //                //}
                            //            }
                            //        }
                            //
                            //        //if (Object.keys(bindToPropertyObj[protocols[p]][addresses[a]]).length === 0) {
                            //        //    delete bindToPropertyObj[protocols[p]][addresses[a]];
                            //        //}
                            //    }
                            //
                            //    //if (Object.keys(bindToPropertyObj[protocols[p]]).length === 0) {
                            //    //    delete bindToPropertyObj[protocols[p]];
                            //    //}
                            //}
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
                                if ((j !== "graph" && j !== "hi" && j !== "protocol" && j !== "value" && j !== "additional" && !propObj[i].hasOwnProperty(j)) || (j !== "protocol" && j.indexOf("protocol") > -1)) {
                                    delete additionalInfo[i][j];
                                    isDifferent = true;
                                }
                            }
                        }
                    }

                    //if (isDifferent) {
                    //    $http.put("/apio/modifyObject/" + d.data.objectId, {
                    //        object: {
                    //            properties: additionalInfo
                    //        }
                    //    }).success(function (data) {
                    //        console.log("Object with objectId " + d.data.objectId + " successfully modified: ", data);
                    //    }).error(function (error) {
                    //        console.log("Error while updating object with objectId " + d.data.objectId + ": ", error);
                    //    });
                    //}
                    //
                    //$http.post("/apio/communication/bindToProperty", bindToPropertyObj).success(function () {
                    //    console.log("bindToProperty communication successfully modified");
                    //}).error(function (error) {
                    //    console.log("Error while modifying bindToProperty communication: ", error);
                    //});

                    console.log("additionalInfo: ", additionalInfo);

                    $http.put("/apio/object/updateProperties/" + d.data.objectId, {
                        properties: additionalInfo
                    }).success(function (data) {
                        console.log("Object with objectId " + d.data.objectId + " successfully modified: ", data);
                    }).error(function (error) {
                        console.log("Error while updating object with objectId " + d.data.objectId + ": ", error);
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
                        $("#ApioApplicationContainer").show(1000, "swing", function () {

                            if (window.innerWidth > 769) {
                                // Decomprime contenitore app + corregge col icone
                                if (document.getElementById("ApioIconsContainer")) {
                                    $("#ApioIconsContainer").css("width", "69%");
                                    var l = document.getElementById("ApioIconsContainer").childNodes;
                                    for (var s in l) {
                                        if (l.item(s).classList && l.item(s).classList.contains("ApioIconsContainer2")) {
                                            l.item(s).classList.remove("ApioIconsContainer2");
                                            l.item(s).classList.add("ApioIconsContainer3");
                                        }
                                        if (l.item(s).classList && l.item(s).classList.contains("ApioIconsContainer4")) {
                                            l.item(s).classList.remove("ApioIconsContainer4");
                                            l.item(s).classList.add("ApioIconsContainer3");
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

    /*$scope.launchBoardSimple = function (id) {
     $http.post("/apio/boards/change", {"id": id}).success(function () {
     console.log("Returned");
     location.reload();
     });

     };*/

    $scope.launchMarketplace = function () {
        //Apio.currentApplication = Number(id);
        document.getElementById("apioWaitLoading").classList.remove("apioWaitLoadingOff");
        document.getElementById("apioWaitLoading").classList.add("apioWaitLoadingOn");
        $.get("systemApps/marketplace/app.marketplace.html", function (data) {
            if (window.innerWidth > 769) {
                $("#ApioIconsContainer").css("width", "65%");
            }
            $("#ApioApplicationContainer").html($(data));
            $("#ApioApplicationContainer").find("h2").text($scope.currentObject.name);
            Apio.newWidth = Apio.appWidth;
            $("#ApioApplicationContainer").css("width", Apio.appWidth + "px");
            if ($("#ApioApplicationContainer").css("display") == "none") {
                $("#ApioApplicationContainer").show(500, function () {
                    $timeout(function () {
                        document.getElementById("apioWaitLoading").classList.remove("apioWaitLoadingOn");
                        document.getElementById("apioWaitLoading").classList.add("apioWaitLoadingOff");
                    }, 1000);
                });
            } else {
                $timeout(function () {
                    document.getElementById("apioWaitLoading").classList.remove("apioWaitLoadingOn");
                    document.getElementById("apioWaitLoading").classList.add("apioWaitLoadingOff");
                }, 1000);
            }
        });

    };
    $scope.allTag = [];
    $scope.actualTag = [];

    $scope.insertNewTagInList = function () {
        //var tempTag;
        textTag = "";
        var tag = "<p><a onclick=\"angular.element(this).scope().setTagView(event)\">#tutti</a></p>";

        if ($scope.objects) {
            for (var s in $scope.objects) {
                if ($scope.objects[s].tag) {
                    var tagArray = $scope.objects[s].tag.split(" ");
                    for (var l in tagArray) {
                        if ($scope.actualTag.indexOf(tagArray[l]) === -1) {
                            $scope.actualTag.push(tagArray[l]);
                        }
                    }
                }
            }
        }
        console.log($scope.actualTag);
        for (var r in $scope.actualTag) {
            tag += "<p><a onclick=\"angular.element(this).scope().setTagView(event)\">" + $scope.actualTag[r] + "</a></p>"
        }
        //document.getElementById("homeButtonMenu").setAttribute("data-content", tag);
        document.getElementById("ulSottomenuMobile").innerHTML = tag;
        $scope.allTag = $scope.actualTag;
        $scope.actualTag = [];
    }


    var textTag = "";
    var countArrowKey = -1;
    var thisTag = "";
    var arrayThisTag = [];
    //var backSlashTag = [];

    $scope.press = function (id, $event) {

        if ($event.keyCode === 13) { //invio
            $event.preventDefault();

        }
        //console.log($event);


    }

    $scope.atualTag = function (id, $event) {
        document.getElementById("suggest" + id).innerHTML = "";
        var thisTag = "";
        arrayThisTag = [];
        thisTag = document.getElementById("tag" + id).value;
        arrayThisTag = thisTag.split(" ");
        console.log("arrayThisTag", arrayThisTag);
    }

    $scope.saveThisTags = function (id, $event) {
        console.log("controllo se devo salvare");
        textTag = "";
        countArrowKey = -1;
        var actualTag = document.getElementById("tag" + id).value;
        console.log("actual TAG in SAVE", actualTag)
        var temp = [];
        temp = actualTag.split(" ");
        var tmpCounter = 0;
        var correctyTag = "";
        for (var l in $scope.objects) {
            if ($scope.objects[l].objectId == id && $scope.objects[l].tag != actualTag) {
                for (var ni in temp) {
                    console.log("uno dei TAG da salvare è:", temp[ni])
                    console.log("controllo che sia un TAG valido!");
                    if (temp[ni][0] === "#") {
                        if (tmpCounter == 0) {
                            correctyTag = temp[ni];
                            tmpCounter = 1;
                        } else {
                            correctyTag += " " + temp[ni]
                        }
                        console.log("TAG VALIDO! Continuo con il controllo degli altri");
                    } else if (temp[ni][0] === "@") {

                    } else {
                        console.log("il TAG seguente non è valido per cui è stato eliminato: ", temp[ni]);
                    }
                }
                actualTag = correctyTag + " ";
                console.log("dopo la ripulitura actualTag vale: ", actualTag);
                $scope.objects[l].tag = actualTag;
                $rootScope.objectId[l] = $scope.objects[l];
                console.log($rootScope.objectId[l]);
                document.getElementById("tag" + id).value = actualTag;
                console.log("salvo");
                $scope.insertNewTagInList();
                $http.put("/apio/modifyObject/" + id, {object: {tag: actualTag}}).success(function () {
                        console.log("tag inserito correttamente");
                    }
                ).error(function () {
                        console.log("error tag inserito correttamente");
                    }
                );
            }
        }
        $scope.atualTag(id, $event);
    };


    $scope.find = function (id, $event) {

        var suggest = "";
        var counter = 0;
        console.log($event.keyCode);

        if ($event.keyCode === 32) {//spazio
            //thisTag = document.getElementById("tag"+id).value;
            console.log("SPAZIO");
            $scope.saveThisTags(id, $event);

        }
        else if ($event.keyCode === 8) {//back
            console.log("BACK");
            $scope.atualTag(id, $event)
            //console.log(textTag);
        }
        else if ($event.keyCode === 13) { //invio
            $event.preventDefault();
            $event.stopPropagation();
            console.log("posizione del suggerimento scelto", countArrowKey);
            if (countArrowKey != -1) {
                var newTag = "";
                var tempString = [];
                console.log(String(document.getElementById("tag" + id).value));
                tempString = document.getElementById("tag" + id).value.split(" ");
                console.log("RISULTATO DELLO SPLIT", tempString);

                console.log("SELECTED", document.getElementById("count" + countArrowKey).innerHTML)
                for (var c in tempString) {
                    console.log("tempString", tempString[c].length);
                    console.log("TEXTTAG", textTag);
                    if (tempString[c] == textTag) {
                        console.log("TROVATO", tempString[c]);
                        console.log("TROVATO1", textTag);
                        newTag += document.getElementById("count" + countArrowKey).innerHTML + " "
                        console.log("NEW TAG", newTag);
                    } else {
                        newTag += tempString[c] + " "
                    }
                    document.getElementById("tag" + id).value = newTag;
                }
                console.log("NUOVO TAG", newTag);
                //document.getElementById("tag"+id).value = newTag;
                document.getElementById("suggest" + id).innerHTML = "";
            }
            $scope.saveThisTags(id, $event);

            //alert();
        }
        /*else if(document.getElementById("tag"+id).value === 0 || document.getElementById("tag"+id).value === "" || document.getElementById("tag"+id).value === "undefined"){
         document.getElementById("suggest"+id).innerHTML = "";
         }*/
        else if ($event.keyCode !== 40 && $event.keyCode !== 38 && $event.keyCode !== 37 && $event.keyCode !== 39 && $event.keyCode !== 18) {
            //$event.stopPropagation();
            var thisValue = document.getElementById("tag" + id).value;
            //console.log("il contenuto dell'input TAG è: ",thisValue);
            var tempTag = [];
            tempTag = thisValue.split(" ");
            //console.log("che in array è: ",tempTag);
            //console.log("i tag Salvati per questo oggeto sono: ",arrayThisTag);

            for (var s in tempTag) {
                var findTheDifferent = 0;
                /*if(tempTag[s].substring(0, 1) !== "#" && tempTag[s].substring(0, 1) !== "@"){
                 console.log("devi iniziare una parola con # o @");
                 }*/
                console.log("analizzo l'elemento contenuto nell'input: ", tempTag[s]);
                for (var h in arrayThisTag) {
                    console.log("********* arrayThisTag:", arrayThisTag[h]);
                    console.log("********* tempTag:", tempTag[s])
                    if (arrayThisTag[h] === tempTag[s]) {
                        findTheDifferent = 1;
                        console.log("trovata una corrsipondenza");
                    }

                }
                if (findTheDifferent === 0) {
                    textTag = tempTag[s];
                    console.log("++++++++trovato il nuovo tag: ", textTag);
                    break;
                } else {
                    textTag = false;
                }

            }
            if (findTheDifferent === 0 && textTag.length >= 4 && textTag[0] === "#") {
                for (var n in $scope.allTag) {
                    if ($scope.allTag[n].indexOf(textTag) === 0) {
                        console.log("+++++++++++ trovato riferimento TAG ++++++++++++", $scope.allTag[n]);
                        suggest += "<p id=count" + counter + " class=\"suggestRow\">" + $scope.allTag[n] + "</p>"
                        counter++;
                    }
                    if (suggest !== "undefined" && suggest !== "") {
                        document.getElementById("suggest" + id).innerHTML = suggest;
                    }
                }
            } else if (findTheDifferent === 0 && textTag.length >= 4 && textTag[0] === "@") {
                alert("la possibilità di taggare un tuo amico sarà presto aggiunte su Apio! " + textTag);
            }

        }
        //Gestisce le frecce sopra e sotto della tastiera, per permettere di selezionare il suggerimento
        else if (document.getElementById("count0")) {
            var temp = 0;
            if ($event.keyCode === 40) { //key Down
                $event.stopPropagation();
                $event.preventDefault();
                if (countArrowKey < document.getElementById("suggest" + id).childNodes.length) {
                    if (countArrowKey == -1) {
                        countArrowKey++;
                        document.getElementById("count" + countArrowKey).classList.add("suggestRowActive")
                    } else if (countArrowKey + 1 < document.getElementById("suggest" + id).childNodes.length) {


                        document.getElementById("count" + countArrowKey).classList.remove("suggestRowActive")
                        countArrowKey++;
                        document.getElementById("count" + countArrowKey).classList.add("suggestRowActive")

                    }
                }

            } else if ($event.keyCode === 38) { //key Up
                $event.stopPropagation();
                $event.preventDefault();
                console.log(countArrowKey);
                if (countArrowKey > 0) {

                    document.getElementById("count" + countArrowKey).classList.remove("suggestRowActive")
                    countArrowKey--;
                    document.getElementById("count" + countArrowKey).classList.add("suggestRowActive")

                } else if (countArrowKey == 0) {
                    document.getElementById("count" + countArrowKey).classList.remove("suggestRowActive")
                    countArrowKey--
                }
                console.log(countArrowKey);
            }

        }
    }
    /*
     $scope.PopoverOpen = false;

     $scope.openTag = function ($event) {
     console.log($event);
     textTag = "";
     //$("#"+$event.target.id).popover({html:true});
     $event.preventDefault();
     $event.stopImmediatePropagation();
     $("#" + $event.target.id).popover("show");
     $scope.PopoverOpen = true;
     $scope.atualTag($event.target.getAttribute("data-objectId"), $event);


     };

     $scope.hideAllPopover = function () {
     textTag = "";
     if ($scope.PopoverOpen) {
     console.log("chiudo i popOverTag aperti");
     for (var conto in $scope.objects) {
     //console.log($scope.objects[conto])
     $("#imageId" + $scope.objects[conto].objectId).popover("hide");
     }
     $scope.PopoverOpen = false;
     }
     };

     $scope.scrolEventClosePopover = function () {
     document.getElementsByClassName("systemAppContainer").item(0).addEventListener("scroll", function () {
     $scope.hideAllPopover();
     })
     }

     $scope.clickEventOnTheApioMenuClosePopover = function () {
     document.getElementById("apioMenu").addEventListener("mousedown", function () {
     $scope.hideAllPopover();
     })
     }

     $scope.scrolEventClosePopover();
     $scope.clickEventOnTheApioMenuClosePopover();
     */

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
            if (window.innerWidth < 769) {
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
