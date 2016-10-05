(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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


var Apio = require("../javascripts/apio.client.js");
var ApioDashboardApplication = angular.module("ApioDashboardApplication", ["ui.utils", "ui.ace", "hSweetAlert", "ui.router", "angularFileUpload", "ngImgCrop", "angular-terminal"]);

//Trova un modo migliore per iniettare le dipendenze
window.Apio = Apio;
window.$ = $;
Apio.Socket.init();

/**
 **  Lavora con il singleton creato con Apio.Socket.init()
 **/
ApioDashboardApplication.factory("socket", function ($rootScope) {
    return {
        on: function (eventName, callback) {
            Apio.socket.on(eventName, function () {
                var args = arguments;
                $rootScope.$apply(function () {
                    callback.apply(Apio.socket, args);
                });
            });
        },
        emit: function (eventName, data, callback) {
            Apio.socket.emit(eventName, data, function () {
                var args = arguments;
                $rootScope.$apply(function () {
                    if (callback) {
                        callback.apply(Apio.socket, args);
                    }
                });
            })
        }
    };
});

//implemets ajax request to the server and sync the objects in the interface with those in the db
ApioDashboardApplication.factory("objectService", ["$rootScope", "$http", function ($rootScope, $http) {
    return {
        list: function () {
            return $http.get("/apio/database/getObjects").then(function (response) {
                return response;
            });
        },
        getById: function (id) {
            return $http.get("/apio/database/getObject/" + id).then(function (response) {
                return response;
            });
        }
    }
}]);

ApioDashboardApplication.factory("userService", ["$rootScope", "$http", function ($rootScope, $http) {
    return {
        list: function () {
            return $http.get("/apio/user").then(function (response) {
                return response;
            });
        }
    }
}]);

ApioDashboardApplication.factory("logicService", ["$rootScope", "$http", function ($rootScope, $http) {
    return {
        list: function () {
            return $http.get("/apio/logic").then(function (response) {
                return response;
            });
        }
    }
}]);


ApioDashboardApplication.factory("boardsService", ["$rootScope", "$http", function ($rootScope, $http) {
    return {
        list: function () {
            return $http.get("/apio/boards").then(function (response) {
                return response;
            });
        }
    }
}]);

//object injector directive
ApioDashboardApplication.directive("wizardObject", function () {
    return {
        restrict: "E",
        templateUrl: "/dashboardApp/objects/objectsApp/new/wizard/wizard_object.html"
    };
});
//properties injector directive
ApioDashboardApplication.directive("wizardProperties", function () {
    return {
        restrict: "E",
        templateUrl: "/dashboardApp/objects/objectsApp/new/wizard/wizard_properties.html"
    };
});
//micro injector directive
ApioDashboardApplication.directive("wizardMicro", function () {
    return {
        restrict: "E",
        templateUrl: "/dashboardApp/objects/objectsApp/new/wizard/wizard_micro.html"
    };
});
//pins injector directive
ApioDashboardApplication.directive("wizardPins", function () {
    return {
        restrict: "E",
        templateUrl: "/dashboardApp/objects/objectsApp/new/wizard/wizard_pins.html"
    };
});
//protocol injector directive
ApioDashboardApplication.directive("wizardProtocol", function () {
    return {
        restrict: "E",
        templateUrl: "/dashboardApp/objects/objectsApp/new/wizard/wizard_protocol.html"
    };
});
//summary injector directive
ApioDashboardApplication.directive("wizardSummary", function () {
    return {
        restrict: "E",
        templateUrl: "/dashboardApp/objects/objectsApp/new/wizard/wizard_summary.html"
    };
});
//editor injector directive
ApioDashboardApplication.directive("wizardEditor", function () {
    return {
        restrict: "E",
        templateUrl: "/dashboardApp/objects/objectsApp/new/wizard/wizard_editor.html"
    };
});

/* Apio ui router declaration */
ApioDashboardApplication.config(function ($stateProvider, $urlRouterProvider) {
    $urlRouterProvider.otherwise("/");
    $stateProvider.state("home", {
        url: "/home",
        templateUrl: "/dashboardApp/home/dashboard_home.html",
        controller: "ApioDashboardHomeController"
    }).state("objects", {
        url: "/objects",
        templateUrl: "/dashboardApp/objects/dashboard_objects.html"
    }).state("objects.objectsLaunch", {
        url: "/launch",
        templateUrl: "/dashboardApp/objects/objectsApp/launch/launch.html",
        controller: "ApioDashboardLaunchController"
    }).state("objects.new", {
        url: "/new",
        templateUrl: "/dashboardApp/objects/objectsApp/new/new.html",
        controller: "ApioDashboardNewController"
    }).state("objects.import", {
        url: "/import",
        templateUrl: "/dashboardApp/objects/objectsApp/import/import.html",
        controller: "ApioDashboardImportController"
    }).state("events", {
        url: "/events",
        templateUrl: "/html/dashboard/dashboard_events.html",
        controller: "ApioDashboardEventsController"
    }).state("states", {
        url: "/states",
        templateUrl: "/html/dashboard/dashboard_states.html",
        controller: "ApioDashboardStatesController"
    }).state("user_settings", {
        url: "/settings",
        templateUrl: "/dashboardApp/settings/dashboard_usersettings.html",
        controller: "ApioDashboardUserSettingsController"
    }).state("dongle_settings", {
        url: "/dongle_settings",
        templateUrl: "/dashboardApp/settings/dashboard_donglesettings.html",
        controller: "ApioDashboardDongleSettingsController"
    }).state("network", {
        url: "/network",
        templateUrl: "/dashboardApp/settings/dashboard_networksettings.html",
        controller: "ApioDashboardNetworkSettingsController"
    }).state("system", {
        url: "/systems",
        templateUrl: "/dashboardApp/settings/dashboard_system.html",
        controller: "ApioDashboardSystemController"
    }).state("cloud", {
        url: "/cloud",
        templateUrl: "/dashboardApp/settings/dashboard_cloudsettings.html",
        controller: "ApioDashboardCloudSettingsController"
    }).state("documentation", {
        url: "/documentation",
        templateUrl: "/html/dashboard/dashboard_documentation.html"
    }).state("users", {
        url: "/users",
        templateUrl: "/dashboardApp/users/users.html",
        controller: "ApioDashboardUsersController"
    }).state("logic", {
        url: "/logic",
        templateUrl: "/dashboardApp/Logic/logic.html",
        controller: "ApioDashboardLogicController"
    }).state("boards", {
        url: "/boards",
        templateUrl: "/dashboardApp/boards/boards.html",
        controller: "ApioDashboardBoardsController"
    }).state("services", {
        url: "/services",
        templateUrl: "/dashboardApp/services/dashboard_services.html",
        controller: "ApioDashboardServicesController"
    }).state("services.sms", {
        url: "/sms",
        templateUrl: "/dashboardApp/services/servicesApp/sms/sms.html",
        controller: "ApioDashboardSMSController"
    }).state("services.report", {
        url: "/report",
        templateUrl: "/dashboardApp/services/servicesApp/report/report.html",
        controller: "ApioDashboardReportController"
    }).state("services.notification", {
        url: "/notification",
        templateUrl: "/dashboardApp/services/servicesApp/notification/notification.html",
        controller: "ApioDashboardNotificationController"
    }).state("services.mail", {
        url: "/mail",
        templateUrl: "/dashboardApp/services/servicesApp/mail/mail.html",
        controller: "ApioDashboardMailController"
    });
});

ApioDashboardApplication.controller("ApioDashboardGeneralController", ["$scope", "userService", "boardsService", "objectService", "$state", "$timeout", "$http", "sweet", "socket", "$window", "$rootScope", "$location", function ($scope, userService, boardsService, objectService, $state, $timeout, $http, sweet, socket, $window, $rootScope, $location) {
    $http.get("/apio/user/getSessionComplete").success(function (session) {
        $scope.session = session;
    });

    socket.on("apio_git_pull_msg", function (data) {
        if (data === $scope.session.apioId) {
            sweet.show({
                title: "Update successfully installed!",
                text: "A restart is required, wanna proceed?",
                type: "warning",
                cancelButtonText: "No",
                closeOnCancel: true,
                closeOnConfirm: true,
                confirmButtonText: "Yes",
                showCancelButton: true,
                showLoaderOnConfirm: true
            }, function (isConfirm) {
                if (isConfirm) {
                    $http.post("/apio/restartSystem").success();
                }
            });
        }
    });

    socket.on("apio_board_reboot", function (data) {
        if (data === $scope.session.apioId) {
            sweet.show({
                title: "Board is rebooting",
                text: "It will be on-line in a while, please wait",
                type: "success",
                closeOnConfirm: true,
                showCancelButton: false,
                showLoaderOnConfirm: true
            }, function (isConfirm) {
                if (isConfirm) {
                    $window.location = "/";
                }
            });
        }
    });

    socket.on("apio_system_restart", function (data) {
        if (data === $scope.session.apioId) {
            sweet.show({
                title: "System is restarting",
                text: "It will be on-line in a while, please wait",
                type: "success",
                closeOnConfirm: true,
                showCancelButton: false,
                showLoaderOnConfirm: true
            }, function (isConfirm) {
                if (isConfirm) {
                    $window.location = "/";
                }
            });
        }
    });

    socket.on("apio_board_shutdown", function (data) {
        if (data === $scope.session.apioId) {
            sweet.show({
                title: "Board is shutting down",
                text: "Please wait",
                type: "success",
                closeOnConfirm: true,
                showCancelButton: false,
                showLoaderOnConfirm: true
            }, function (isConfirm) {
                if (isConfirm) {
                    $window.location = "/";
                }
            });
        }
    });

    $scope.boardName = $scope.localIP = $scope.publicIP = $scope.remoteAddr = "non disponibile";
    $http.get("/apio/configuration/return").success(function (config) {
        $scope.config = config;
        if ($scope.config.type === "cloud") {
            $http.get("/apio/user/getSessionComplete").success(function (session) {
                //socket.emit("ask_board_ip", session.apioId);
                socket.emit("ask_board_ip", {who: session.apioId});
                socket.on("get_board_ip", function (data) {
                    if (data.apioId === session.apioId) {
                        var keys = Object.keys(data.local);
                        for (var i = 0; i < keys.length; i++) {
                            if (i === 0) {
                                $scope.localIP = data.local[keys[i]] + " (" + keys[i] + ")";
                            } else {
                                $scope.localIP += "; " + data.local[keys[i]] + " (" + keys[i] + ")";
                            }
                        }

                        $scope.publicIP = data.public;

                        $scope.remoteAddr = data.remote || "servizio non abilitato";

                        if (!$scope.$$phase) {
                            $scope.$apply();
                        }
                    }
                });

                $http.get("/apio/boards/getDetailsFor/" + session.apioId).success(function (boards) {
                    $scope.boardName = boards[0].name;
                });
            });

            setInterval(function () {
                $http.post("/apio/boards/getSocketConnection").success(function (connected) {
                    //connected = true if socket is connected
                    if (connected) {
                        if ($scope.systemOffline) {
                            $scope.systemOffline = false;
                            if (!$scope.$$phase) {
                                $scope.$apply();
                            }
                        }
                    } else {
                        if (!$scope.systemOffline) {
                            $scope.systemOffline = true;
                            if (!$scope.$$phase) {
                                $scope.$apply();
                            }
                        }
                    }
                });
            }, 500);
        } else if ($scope.config.type === "gateway") {
            $http.get("/apio/getIPComplete").success(function (ip) {
                var keys = Object.keys(ip.local);
                for (var i = 0; i < keys.length; i++) {
                    if (i === 0) {
                        $scope.localIP = ip.local[keys[i]] + " (" + keys[i] + ")";
                    } else {
                        $scope.localIP += "; " + ip.local[keys[i]] + " (" + keys[i] + ")";
                    }
                }

                $scope.publicIP = ip.public;

                $scope.remoteAddr = ip.remote || "servizio non abilitato";

                if (!$scope.$$phase) {
                    $scope.$apply();
                }
            });

            //Reconnection
            var lastOffline = undefined;
            setInterval(function () {
                if (Apio.socket.connected === false && Apio.socket.disconnected === true) {
                    if (!$scope.systemOffline) {
                        $scope.systemOffline = true;
                        if (!$scope.$$phase) {
                            $scope.$apply();
                        }

                        if (lastOffline === undefined) {
                            lastOffline = new Date();
                        }
                    }
                } else {
                    if ($scope.systemOffline) {
                        $scope.systemOffline = false;
                        if (!$scope.$$phase) {
                            $scope.$apply();
                        }

                        if (lastOffline && new Date() - lastOffline >= 5 * 60 * 1000) {
                            setTimeout(function () {
                                $window.location = "app#/home";
                            }, 500);
                        }

                        lastOffline = undefined;
                    }
                }
            }, 500);
        }
    });

    $scope.initApioDashboardUsersList = function () {
        //Carico gli oggetti
        userService.list().then(function (d) {
            $scope.users = d.data.users;
            console.log($scope.users);
        });
    };
    $scope.currentUserEmail = function () {
        $http.get("/apio/user/getSession").success(function (data) {
            console.log(data);
            var p = $http.post("/apio/user/getUser", {
                email: data
            });
            p.success(function (a) {
                console.log(a)
                $scope.currentUserActive = a.user;
                $scope.currentUserSurname = $scope.currentUserActive.email.split("@")[0];
                $scope.token = $scope.currentUserActive.token;
                console.log($scope.currentUserActive);
            })
            //$scope.currentUserActive = data;
        });
    };
    $scope.platform = {};
    $scope.cloud = false;
    $scope.gateway = false;
    $scope.getPlatform = function () {
        $http.get("/apio/getPlatform").success(function (data) {
            //console.log(data);
            //alert(data.type);
            //alert(data.apioId);
            $scope.platform = data;
            if (data.type == "cloud") $scope.cloud = true;
            else if (data.type == "gateway") $scope.gateway = true;
        });
    };
    $scope.getPlatform();


    //$scope.started = false;

    $scope.userEmail = "";
    $scope.mail = "";
    $scope.userPassword = "";
    $scope.initApioDashboardUsersList();
    $scope.currentUserEmail();

    $scope.switchToApioOS = function () {
        console.log("switchToApioOS")
        window.location = "/app";
    };

    $scope.logout = function () {
        sweet.show({
            title: "Are you sure?.",
            text: "User Logout",
            type: "warning",
            showCancelButton: true,
            confirmButtonClass: "btn-warning",
            cancelButtonClass: "btn-info",
            confirmButtonText: "Yes",
            cancelButtonText: "No",
            closeOnConfirm: false,
            closeOnCancel: true
        }, function (isConfirm) {
            if (isConfirm) {
                $http.get("/apio/user/logout").success(function (data, status, header) {
                    console.log("success()");
                    sweet.show({
                        title: "Done!",
                        text: "User logout",
                        type: "success",
                        showCancelButton: false,
                        confirmButtonClass: "btn-success",
                        confirmButtonText: "Ok",
                        closeOnConfirm: true
                    }, function () {
                        window.location = "/";
                    });
                }).error(function (data, status, header) {
                    console.log("failure()");
                });
            }
        });
    };

    $scope.pageHooks = {
        Events: function () {
            $http.get("/apio/event").success(function (data) {
                $scope.events = data;
            });
        },
        Objects: function () {
            objectService.list().then(function (d) {
                $scope.objects = d.data;
            })
        },
        States: function () {
            $http.get("/apio/state").success(function (data) {
                $scope.states = data;
            })
        },

        Users: function () {
            userService.list().then(function (d) {
                $scope.objects = d.data;
            })
        },

        Logic: function () {
            logicService.list().then(function (d) {
                $scope.logic = d.data;
            })
        },
        Boards: function () {
            boardsService.list().then(function (d) {
                $scope.boards = d.data;
            })
        }
    };
    $scope.currentPage = "";
    $scope.switchPage = function (pageName) {
        //$(".dashboardPage#"+$scope.currentPage).css("display","none");
        //$(".dashboardPage#"+pageName).css("display","block");

        $scope.currentPage = pageName;
        if ($scope.pageHooks.hasOwnProperty(pageName)) {
            console.log("has pageName: " + pageName);
            $scope.pageHooks[pageName]();
            if (pageName === "Objects") {
                if (pageName !== $scope.currentPage) {
                    //window.location = "dashboard#/objects/launch";
                    $state.go("objects.objectsLaunch");
                }
                else {
                    location.reload();
                }
            }
        } else {
            console.log("has no pageName");
        }
    };

    //--------------------- Function that change the name of the page in the nav ------------- |
    $scope.dashboard_location_title = "";
    $rootScope.$on("$locationChangeSuccess", function () {
        $scope.dashboard_location = $location.url().split("/")[1];
        //console.log("$scope.dashboard_location = ", $scope.dashboard_location);
        if ($scope.dashboard_location === 'home') {
            $scope.dashboard_location_title = "Dashboard home";
        }
        if ($scope.dashboard_location === 'users') {
            $scope.dashboard_location_title = "Users list";
        }
        if ($scope.dashboard_location === 'objects') {
            $scope.dashboard_location_title = "Apps manager";
        }
        if ($scope.dashboard_location === 'logic') {
            $scope.dashboard_location_title = "Rules manager";
        }
        if ($scope.dashboard_location === 'services') {
            $scope.dashboard_location_title = "Services";
        }
        if ($scope.dashboard_location === 'systems') {
            $scope.dashboard_location_title = "System settings";
        }
        if ($scope.dashboard_location === 'dongle_settings') {
            $scope.dashboard_location_title = "Dongle settings";
        }
        if ($scope.dashboard_location === 'network') {
            $scope.dashboard_location_title = "Network settings";
        }
        //console.log("$scope.dashboard_location_title = ", $scope.dashboard_location_title);
    });
}]);


$(function () {
    $(".launcherIcon").error(function () {
        console.log("Image " + $(this).attr("src") + " does not exist");
        $(this).attr("src", "/images/Apio_Logo.png");
    });
});


// ---------------------------------------------------------------------- start and stop system loading ---------| 
Apio.runApioLoading = function (element, scroll, border) {
    if (element) {
        var borderRadius;
        var offsetLeft;
        var offsetTop;
        if (typeof border === "undefined") {
            if (element && element.style && element.style.borderRadius) {
                borderRadius = "border-radius:" + element.style.borderRadius;
            } else if (element.firstChild && element.firstChild.style && element.firstChild.style.borderRadius) {
                borderRadius = "border-radius:" + element.firstChild.style.borderRadius;
            } else {
                borderRadius = "";
            }
        } else {
            borderRadius = "border-radius:" + border + "px";
        }
        if (scroll == true) {
            offsetLeft = "left:" + element.offsetLeft + "px;";
            offsetTop = "top:" + element.offsetTop + "px;";
        } else {
            offsetLeft = "";
            offsetTop = "";
        }
        var firstElement = document.createElement("DIV");
        firstElement.setAttribute("style", "position:absolute; " + offsetTop + " " + offsetLeft + "");
        firstElement.innerHTML = '<div id="loading" class="loading " style="width:' + element.offsetWidth + 'px !important; height:' + element.offsetHeight + 'px;' + borderRadius + '; margin: 0 auto;"><div id="loadingRoller" class=""><div class="loaderAnimation loadingRoller"></div></div></div>';
        element.insertBefore(firstElement, element.firstChild);
        setTimeout(function () {
            var loaderInPage = document.getElementsByClassName("loaderAnimation")
            for (var ld in loaderInPage) {
                if (loaderInPage.item(ld) && !loaderInPage.item(ld).classList.contains("loadingPlay")) {
                    loaderInPage.item(ld).classList.add("loadingPlay")
                }
            }
        }, 200);
    }
};

Apio.stopApioLoading = function () {
    //alert("rimuovo animazione")

    var loaderInPage = document.getElementsByClassName("loaderAnimation")
    for (var ld in loaderInPage) {
        if (loaderInPage.item(ld) && loaderInPage.item(ld).classList.contains("loadingPlay")) {
            if (loaderInPage.item(ld)) {
                loaderInPage.item(ld).classList.remove("loadingPlay")
            }
        }
    }

    setTimeout(function () {
        var loading = document.getElementsByClassName("loading")
        for (var ld in loading) {
            if (loaderInPage.item(ld) && loaderInPage.item(ld).parentNode) {
                loading.item(ld).parentNode.removeChild(document.getElementById("loading"));
            }
        }
    }, 200)
};


//Close the collapsed navbar in mobile and tablet view
$(document).on('click', '.navbar-collapse.in', function (e) {
    if (($(e.target).is('a') || $(e.target).is('span') || $(e.target).is('i')) && $(e.target).attr('class') != 'dropdown-toggle' && $(e.target).attr('class') != 'sub_menu') {
        $('#navbar-ex1-collapse').collapse('hide');
    }
});

},{"../javascripts/apio.client.js":2}],2:[function(require,module,exports){
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

(function () {
    "use strict";
    var Apio = {};

    //Dovrà essere nascosto o incapsulato. Il programmatore non deve aver accesso al socket.
    //Magari con un getSocket() o qualcosa che utilizzi solo chi sa cosa fa
    Apio.Socket = {};

    Apio.Socket.init = function () {
        //Apio.socket = io();

        //var xhttp = new XMLHttpRequest();
        //xhttp.onreadystatechange = function() {
        //    if (xhttp.readyState === 4 && xhttp.status === 200) {
        //        console.log("xhttp.responseText: ", xhttp.responseText);
        //        //var data = JSON.parse(xhttp.responseText);
        //        //Apio.socket = io({query: "apioId=" + data.apioId});
        //        Apio.socket = io({query: "associate=" + xhttp.responseText});
        //    }
        //};
        //xhttp.open("GET", "/apio/user/getSession", false);
        //xhttp.send();

        var xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function () {
            if (xhttp.readyState === 4 && xhttp.status === 200) {
                console.log("xhttp.responseText: ", xhttp.responseText);
                //var data = JSON.parse(xhttp.responseText);
                //Apio.socket = io({query: "apioId=" + data.apioId});
                var data = JSON.parse(xhttp.responseText);
                Apio.socket = io({query: "associate=" + data.email + "&token=" + data.token});
            }
        };
        xhttp.open("GET", "/apio/user/getSessionToken", false);
        xhttp.send();
    };


    Apio.Application = {};
    Apio.Application._applications = {};


    Apio.Application.load = function (appName, callback) {
        //Ignoro se già in cache
        if (!Apio.Application._applications.hasOwnProperty(appName))
            $.getScript("/javascripts/applications/" + appName + "/" + appName + ".js", callback);
        else
            callback();
    }
    Apio.Application.getCurrentApplication = function () {
        return Apio.Application.current;
    }
    /*
     *	@param name The application's name
     */
    Apio.Application.create = function (config) {


        var app_object = config;

        console.log("apio.client.js Creating the " + app_object.objectId + " application");

        $.getJSON('/apio/database/getObject/' + app_object.objectId, function (data) {
            console.log("Dentro il callback")
            for (var key in data.properties)
                app_object[key] = data.properties[key];

            Apio.Application.current = app_object;


            //caching applications
            Apio.Application._applications[app_object.objectId] = app_object;
            console.log("apio.client.js Ho registrato una applicazione di nome " + app_object.objectId)

            if (app_object.hasOwnProperty('init'))
                app_object.init();

            return app_object;

        });
        //Carico il file con la definizione dell'interfaccia
        //Disegno la view
        //Carico lo stato dell'oggetto dal database
        //Bindo il model al controller
        //Applico il model alla view
        //Bindo il controller alla view
        //Così nel controller se manipolo il model, si riflettono i cambiamenti sulla view


    };
    Apio.Application.launch = function (appName) {
        Apio.Application._applications[appName].init();
    }

    //Queste saranno funzioni di sistema non usate dal programmatore di app, anche se
    //comunque rilasciate come lib probabilmente.
    Apio.Property = {};

    Apio.Property.Object = function () {
        this.render = function () {
        };
    }
    Apio.Property.Slider = function (config) {
        //oggetto slider, con rendering ed eventi
        if (!config.hasOwnProperty('min') || !config.hasOwnProperty('max') || !config.hasOwnProperty('step'))
            throw new Error("Apio.Property.Slider(config) must specify min,max and step values");
    };
    Apio.Property.Trigger = function (config) {
        /*
         Valori richiesti
         off, on
         */
        if (!config.hasOwnProperty('off') || !config.hasOwnProperty('on'))
            throw new Error("Apio.Property.Trigger(config) must specify on and off values");
    }
    Apio.Property.Trigger.prototype.render = function () {
        var html = '<div class="onoffswitch" style="position:relative;width:90px;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;" >' +
            '<input type="checkbox" name="onoffswitch" class="onoffswitch-checkbox" id="myonoffswitch" checked style="display:none;" >' +
            '<label class="onoffswitch-label" for="myonoffswitch" style="display:block;overflow:hidden;cursor:pointer;border-width:2px;border-style:solid;border-color:#999999;border-radius:20px;" >' +
            '<span class="onoffswitch-inner" style="display:block;width:200%;margin-left:-100%;-moz-transition:margin 0.3s ease-in 0s;-webkit-transition:margin 0.3s ease-in 0s;-o-transition:margin 0.3s ease-in 0s;transition:margin 0.3s ease-in 0s;" ></span>' +
            '<span class="onoffswitch-switch" style="display:block;width:18px;margin-top:6px;margin-bottom:6px;margin-right:6px;margin-left:6px;background-color:#FFFFFF;background-image:none;background-repeat:repeat;background-position:top left;background-attachment:scroll;border-width:2px;border-style:solid;border-color:#999999;border-radius:20px;position:absolute;top:0;bottom:0;right:56px;-moz-transition:all 0.3s ease-in 0s;-webkit-transition:all 0.3s ease-in 0s;-o-transition:all 0.3s ease-in 0s;transition:all 0.3s ease-in 0s;" ></span>' +
            '</label></div>';

        return html;
    }

    function renderApplication(appName, domElement) {
        $.get("/apio/getApplicationXml" + appName, function (data) {
            //data is xml content
            //var obj = xml2json(data)
            //Scorro il dom dell'app
            // Faccio i miei succosi bindings
            //Attacco il dom dell'app al dom dell'applicazionemadre
            //profit
            //
        })
    }


    Apio.Util = {};

    Apio.Util.isSet = function (value) {
        if (value !== null && "undefined" !== typeof value)
            return true;
        return false;
    };

    Apio.Util.ApioToJSON = function (str) {
        //var regex = /(.[a-z0-9])*\:([a-z0-9]*\:[a-z0-9]*\-).*/gi;
        var regex = /([lz])?(\w+)\:(send|update|register+)?\:?([\w+\:\w+\-]+)/;
        var match = regex.exec(str);
        var obj = {};
        if (Apio.Util.isSet(match[1]))
            obj.protocol = match[1];
        obj.objectId = match[2];
        if (Apio.Util.isSet(match[3]))
            obj.command = match[3];
        var mess = match[4];
        obj.properties = {};
        mess = mess.split("-");
        mess.pop();
        mess.forEach(function (e) {
            var t = e.split(":");
            console.log(t);
            obj.properties[t[0]] = t[1];
        });


        return obj;
    };
    module.exports = Apio;
})();
},{}]},{},[1]);
