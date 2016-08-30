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
},{}],2:[function(require,module,exports){
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

var Apio = require('./apio.client.js');
//var q = require("./bower_components/q");
//Trova un modo migliore per iniettare le dipendenze
window.Apio = Apio;
window.$ = $;
Apio.Socket.init();
//Apio.socket = io();
//Fixare questo scempio con la dependency injection
Apio.appWidth = parseInt($("#ApioApplicationContainer").css('width'), 10);
Apio.newWidth = parseInt($("#ApioApplicationContainer").css('width'), 10);
Apio.currentApplication = 0;

Apio.removeAngularScope = function (DOMElement, deleteDOMElement) {
    if (DOMElement) {
        var children = DOMElement.childNodes;
        for (var i in children) {
            if (children[i] instanceof Element && angular.element(children[i]).length) {
                Apio.removeAngularScope(children[i]);
                if (angular.element(children[i]).scope()) {
                    angular.element(children[i]).scope().$destroy();
                }
                angular.element(children[i]).remove();
            }
        }

        if (angular.element(DOMElement).scope()) {
            angular.element(DOMElement).scope().$destroy();
        }

        if (deleteDOMElement === true) {
            DOMElement.parentNode.removeChild(DOMElement);
        } else {
            DOMElement.innerHTML = "";
        }
    }
};

$("#notificationTrigger").on('click', function () {
    $("#notificationsCenter").toggle("slide", {direction: 'up'}, 500);
});

/*$("#notificationTrigger_mobile").on('click tap', function () {
 $("#notificationsCenter").toggle("slide", {direction: 'up'}, 500);
 });*/

var ApioApplication = angular.module('ApioApplication', ['ui.bootstrap', 'ngRoute', 'hSweetAlert', 'angularFileUpload', 'fileSaver', 'ngFileReader', "ngMaterial"]);

window.swipe = function (target, callback) {
    var startX, startY;
    //Touch event
    $("#" + target).on("touchstart", function (event) {
        startX = event.originalEvent.changedTouches[0].pageX;
        startY = event.originalEvent.changedTouches[0].pageY;
    });
    $("#" + target).on("touchend", function (event) {
        var distX = event.originalEvent.changedTouches[0].pageX - startX;
        var distY = event.originalEvent.changedTouches[0].pageY - startY;
        if (!$(event.target).is("input") && distX > parseFloat($("#" + target).css("width")) / 3 && ((distY >= 0 && distY <= 40) || (distY >= -40 && distY <= 0))) {
            $("#" + target).hide("slide", {
                direction: 'right'
            }, 700, callback());
        }
    });

    //Mouse event
    $("#" + target).on("mousedown", function (event) {
        startX = event.pageX;
        startY = event.pageY;
    });
    $("#" + target).on("mouseup", function (event) {
        var distX = event.pageX - startX;
        var distY = event.pageY - startY;
        if (!$(event.target).is("input") && distX > parseFloat($("#" + target).css("width")) / 3 && ((distY >= 0 && distY <= 40) || (distY >= -40 && distY <= 0))) {
            $("#" + target).hide("slide", {
                direction: 'right'
            }, 700, callback());
        }
    });
}
window.affix = function (targetScoll, target, top, bottom, callback, callback1) {
    var startY;
    var scroll;
    var ex_top = document.getElementById(targetScoll).style.marginTop;
    if (!ex_top) {
        ex_top = 0;
    }
    var touch = 1;
    var firstInteract = 1;
    var interact = 0;
    $("#" + targetScoll).on("touchstart", function (event) {
        //alert('');
        touch = 0;
        if (firstInteract == 1) {
            firstInteract = 0;
            if (top === null) {
                top = {};
                top.top = $('#' + target).offset().top;
            }
        }
    });
    $("#" + targetScoll).on("scroll", function (event) {
        //alert('');
        touch = 0;
        if (firstInteract == 1) {
            firstInteract = 0;
            if (top === null) {
                top = {};
                top.top = $('#' + target).offset().top;
            }
        }
    });
    var interval_ = setInterval(function () {
        if (!document.getElementById(targetScoll)) {
            clearInterval(interval_);
        }
        else {
            scroll = document.getElementById(targetScoll).scrollTop;
            if (touch == 0) {
                //console.log(scroll+' '+top.top);
                if (scroll >= top.top && interact == 0) {
                    interact = 1;
                    //document.getElementById(targetScoll).classList.add('webkitOverflowScrollingOn');
                    //document.getElementById(targetScoll).classList.remove('webkitOverflowScrollingOff');
                    document.getElementById(target).style.marginTop = '-' + (top.top) + 'px';
                    callback();
                    //alert('maggiore')
                } else if (scroll <= top.top) {
                    interact = 0;
                    //document.getElementById(targetScoll).classList.remove('webkitOverflowScrollingOn');
                    //document.getElementById(targetScoll).classList.add('webkitOverflowScrollingOff');
                    document.getElementById(target).style.marginTop = ex_top + 'px'
                    callback1();
                    //alert('minore')
                }
            }
        }
    }, 100);

}


ApioApplication.config(["$routeProvider", function ($routeProvider) {
    $routeProvider.when("/home", {
        templateUrl: "systemApps/home/app.home.html",
        controller: "ApioHomeController"
    }).when("/home/:application", {
        templateUrl: "systemApps/home/app.home.html",
        controller: "ApioHomeController"
    }).when("/home/:application/:objectId", {
        templateUrl: "systemApps/home/app.home.html",
        controller: "ApioHomeController"
    }).when("/home_scada", {
        templateUrl: "systemApps/home_scada/app.home.html",
        controller: "ApioHomeScadaController"
    }).when("/notificationsAll", {
        templateUrl: "systemApps/notificationsAll/app.notificationsAll.html",
        controller: "ApioNotificationsAllController"
    }).when("/events", {
        templateUrl: "systemApps/events/app.events.html",
        controller: "ApioEventsController"
    }).when("/maps", {
        templateUrl: "systemApps/maps/app.maps.html",
        controller: "ApioMapsController"
    }).when("/dashboard", {
        templateUrl: "systemApps/dashboardApp/dashboard.html",
        controller: "ApioDashboardGeneralController"
    }).when("/newHome", {
        templateUrl: "systemApps/newHome/app.home.html",
        controller: "ApioHomeController"
    }).when("/home2", {
        templateUrl: "systemApps/home2/app.home_2.html",
        controller: "ApioHome2Controller"
    }).otherwise({
        redirectTo: "/home"
    });
}]);

var p = {};
ApioApplication.service("sharedProperties", function () {
    return {
        get: function (k) {
            return p[k];
        },
        getAll: function () {
            return p;
        },
        set: function (k, v) {
            p[k] = v
        }
    };
});


ApioApplication.factory('socket', function ($rootScope) {
    return {
        emit: function (eventName, data, callback) {
            Apio.socket.emit(eventName, data, function () {
                var args = arguments;
                $rootScope.$apply(function () {
                    if (callback) {
                        callback.apply(Apio.socket, args);
                    }
                });
            })
        },
        off: function (eventName, callback) {
            //Apio.socket.off(eventName, function () {
            //    var args = arguments;
            //    $rootScope.$apply(function () {
            //        if (callback) {
            //            callback.apply(Apio.socket, args);
            //        }
            //    });
            //});
            Apio.socket.off(eventName);
        },
        on: function (eventName, callback) {
            Apio.socket.on(eventName, function () {
                var args = arguments;
                $rootScope.$apply(function () {
                    callback.apply(Apio.socket, args);
                });
            });
        }
    };
});

ApioApplication.factory('objectService', ['$rootScope', '$http', function ($rootScope, $http) {
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
    };
}]);

ApioApplication.factory('boardsService', ['$rootScope', '$http', function ($rootScope, $http) {
    return {
        list: function () {
            return $http.get('/apio/boards').then(function (response) {
                return response;
            });
        }
    }
}]);

ApioApplication.factory('planimetryService', ['$rootScope', '$http', function ($rootScope, $http) {
    return {
        list: function () {
            return $http.get('/apio/database/getPlanimetry').then(function (response) {
                return response;
            });
        }
    }
}]);

ApioApplication.factory('userService', ['$rootScope', '$http', function ($rootScope, $http) {
    return {
        list: function () {
            return $http.get('/apio/user').then(function (response) {
                return response;
            });
        }
    }
}]);

ApioApplication.directive('ngTouchEnd', function () {
    return function (scope, element, attrs) {
        element.bind('touchend', function (e) {
            element.removeClass('active');
            scope.$apply(attrs['ngouchEnd'], element);
        });
    };
});


ApioApplication.factory('DataSource', ['$http', function ($http) {
    return {
        get: function (url, callback) {
            $http.get(url, {
                transformResponse: function (data) {
                    // convert the data to JSON and provide
                    // it to the success function below
                    var x2js = new X2JS();
                    var json = x2js.xml_str2json(data);

                    console.log(json);
                    return json;
                }
            }).success(function (data, status) {
                // send the converted data back
                // to the callback function
                callback(data);
            });
        }
    }
}]);

/*

 ApioApplication.controller('ApioNotificationController',['$scope','$http','socket',function($scope,$http,socket){
 socket.on('apio_notification', function(notification) {
 console.log(notification)
 if (!("Notification" in window)) {
 alert("Apio Notification : " + notification.message);
 }
 // Let's check if the user is okay to get some notification
 else if (Notification.permission === "granted") {
 // If it's okay let's create a notification
 var notification = new Notification("Apio Notification", {
 body: notification.message,
 icon : '/images/Apio_Logo.png'
 });

 }

 // Otherwise, we need to ask the user for permission
 // Note, Chrome does not implement the permission static property
 // So we have to check for NOT 'denied' instead of 'default'
 else if (Notification.permission !== 'denied') {
 Notification.requestPermission(function(permission) {
 // If the user is okay, let's create a notification
 if (permission === "granted") {
 var notification = new Notification("Apio Notification", {
 body: notification.message,
 icon : '/images/Apio_Logo.png'
 });
 }
 });
 }


 });
 }])
 */


ApioApplication.filter('removeUndefinedFilter', function () {
    return function (items) {
        var filtered = [];
        items.forEach(function (x) {
            if ('undefined' !== typeof x)
                filtered.push(x);
        });

        return filtered;
    }
});

var apioProperty = angular.module('apioProperty', ['ApioApplication', 'ngMaterial']);

ApioApplication.service('currentObject', ['$rootScope', '$window', 'socket', 'userService', 'boardsService', 'objectService', '$http', "$location", function ($rootScope, $window, socket, userService, boardsService, objectService, $http, $location) {
    var modifying = false;
    var obj = {};
    var recording = false;
    var recordingObject = {};
    var _recordingObjectName = "";
    $window.rootScopes = $window.rootScopes || [];
    $window.rootScopes.push($rootScope);

    if (!!$window.sharedService) {
        return $window.sharedService;
    }

    $window.sharedService = {
        set: function (newObj) {
            obj = newObj;
            angular.forEach($window.rootScopes, function (scope) {
                if (!scope.$$phase) {
                    scope.$apply();
                }
            });
        },
        get: function () {
            return obj;
        },
        isModifying: function (val) {
            if ('undefined' == typeof val)
                return modifying;
            else
                modifying = val;
        },
        isRecording: function (val) {
            if ('undefined' == typeof val)
                return recording;
            else
                recording = val;
        },
        recordingStateName: function (name) {
            if ('undefined' === typeof name)
                return _recordingObjectName;
            else
                _recordingObjectName = name;
        },
        stream: function (prop, value) {
            var packet = {
                objectId: obj.objectId,
                properties: {}
            };
            packet.properties[prop] = value;
            socket.emit('apio_client_stream', packet);
        },
        update: function (prop, value, writeDb, writeSerial) {
            if ('undefined' == typeof writeDb)
                writeDb = true;
            if ('undefined' == typeof writeSerial)
                writeSerial = true;
            obj.properties[prop] = value;
            console.log(obj.apioId);
            console.log('currentObject.update DATA OBJ ', obj);
            var o = {
                address: obj.address,
                apioId: obj.apioId,
                objectId: obj.objectId,
                properties: {},
                protocol: {},
                writeToDatabase: writeDb,
                writeToSerial: writeSerial
            };
            if (obj.hasOwnProperty('propertiesAdditionalInfo') && typeof obj.propertiesAdditionalInfo[prop] !== "undefined" && typeof obj.propertiesAdditionalInfo[prop].protocol !== "undefined") {
                o.protocol = obj.propertiesAdditionalInfo[prop].protocol;
            }
            o.properties[prop] = value;
            socket.emit('apio_client_update', o);
        },
        updateMultiple: function (update, writeDb, writeSerial) {
            if ('undefined' == typeof writeDb)
                writeDb = true;
            if ('undefined' == typeof writeSerial)
                writeSerial = true;
            var o = {}
            o.apioId = obj.apioId;
            o.objectId = obj.objectId;
            o.properties = update;
            o.writeToDatabase = writeDb;
            o.writeToSerial = writeSerial;
            socket.emit('apio_client_update', o);
        },
        record: function (key, value) {
            if (typeof key === "undefined" && typeof value === "undefined") {
                return recordingObject;
            } else if (typeof key !== "undefined" && typeof value === "undefined") {
                return recordingObject[key];
            } else {
                recordingObject = {};
                recordingObject[key] = value;
            }
        },
        removeFromRecord: function (key) {
            if (recordingObject.hasOwnProperty(key)) {
                delete recordingObject[key];
            }
        },
        recordLength: function () {
            return Object.keys(recordingObject).length;
        },
        resetRecord: function () {
            recordingObject = {};
            console.log("resetRecord()");
            console.log(recordingObject)
        },
        sync: function (c) {
            var self = this;
            objectService.getById(obj.objectId).then(function (d) {
                self.set(d.data);
                if ('function' == typeof c)
                    c()
            })

        },
        JSONToArray: function (obj) {
            var arr = [];
            for (var i in obj) {
                if (isNaN(i)) {
                    throw new Error("All indexes of JSON must be numbers");
                }
                else {
                    arr[parseInt(i)] = obj[i];
                }
            }
            console.log(arr)
            return arr;
        }
    }

    return $window.sharedService;
}]);

//Apio.tagged = '';

// Close the drawer menu when click on a link 
ApioApplication.directive('menuClose', function () {
    return {
        restrict: 'AC',
        link: function ($scope, $element) {
            $element.bind('click', function () {
                var drawer = angular.element(document.querySelector('.mdl-layout__drawer'));
                if (drawer) {
                    drawer.toggleClass('is-visible');
                }
                var drawer = angular.element(document.querySelector('.mdl-layout__obfuscator'));
                if (drawer) {
                    drawer.toggleClass('is-visible');
                }
            });
        }
    };
});

var actualUser = {};

ApioApplication.controller("ApioMainController", ["$scope", "$http", "socket", "sweet", "$window", "$timeout", "$rootScope", "$location", "$mdDialog", function ($scope, $http, socket, sweet, $window, $timeout, $rootScope, $location, $mdDialog) {
    var configuration;
    /* Definizione CloudShowBoard e Funzione che modifica bottone log-out/indietro */
    $scope.platform = {};
    $scope.continueToCloud = false;
    $scope.cloudShowBoard = false;
    //$scope.systemUpdated = false;

    // setTimeout(function () {
    //     // document.getElementById("apio-os-offline").style.display = "block";
    //     $scope.systemOffline = true;
    //     if (!$scope.$$phase) {
    //         $scope.$apply();
    //     }
    // }, 5000);

    socket.on("auto_install_modal", function (data) {
        console.log("RICEVUTA RICHIESTA DI AUTO-INSTALLAZIONE!", data);
        var s = $scope.$new();
        s.modalData = data;
        if (data.protocol === "enocean" && data.hasOwnProperty("eep")) {
            $mdDialog.show({
                templateUrl: "/applications/newfile/" + data.eep + "/template_modal.html",
                controller: "modal" + data.eep,
                clickOutsideToClose: false,
                bindToController: true,
                scope: s
            });
        } else if (data.protocol === "apio" && data.hasOwnProperty("eep")) {
            console.log("OGGETTO APIO");
            $mdDialog.show({
                templateUrl: "/applications/newfile/" + data.eep + "/template_modal.html",
                controller: "modal" + data.eep,
                clickOutsideToClose: false,
                bindToController: true,
                scope: s
            });
        } else if (data.protocol === "z" && data.hasOwnProperty("eep")) {
            console.log("OGGETTO ZWAVE");
            $mdDialog.show({
                templateUrl: "/applications/newfile/" + data.eep + "/template_modal.html",
                controller: "modal" + data.eep,
                clickOutsideToClose: false,
                bindToController: true,
                scope: s
            });
        }
    });

    $rootScope.$on("$locationChangeSuccess", function () {
        //$scope.nav_active_link = $location.url().split("/")[1];
        $scope.drawer_active_link = $location.url().split("/")[1];
    });

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

    $scope.getPlatform = function () {
        $http.get('/apio/getPlatform').success(function (data) {
            //console.log(data);
            //alert(data.type);
            //alert(data.apioId);
            $scope.platform = data;

            if (data.apioId == "Continue to Cloud") {
                $scope.continueToCloud = true;
                //$scope.currentUserEmail();
            }
            if (data.apioId != "Continue to Cloud" && data.type == "cloud") {
                $scope.cloudShowBoard = true;
                //$scope.currentUserEmail();
            }
        });
    };

    var exBottonMenuId = '';
    $scope.clickToMenu = function ($event) {
        console.log('CLICCKED');
        if ($event.target.id === 'homeButton') {

            if (document.getElementById('sottoMenuTag').classList.contains('displayNone')) {
                document.getElementById('sottoMenuTag').classList.remove('displayNone')

            }
            if (!document.getElementById('sottoMenuNotification').classList.contains('displayNone')) {
                document.getElementById('sottoMenuNotification').classList.add('displayNone')
            }
            //$scope.showDisabled = false;
        }
        else if ($event.target.id === 'notificationTrigger_mobile') {
            if (!document.getElementById('sottoMenuTag').classList.contains('displayNone')) {
                document.getElementById('sottoMenuTag').classList.add('displayNone')
            }
            if (document.getElementById('sottoMenuNotification').classList.contains('displayNone')) {
                document.getElementById('sottoMenuNotification').classList.remove('displayNone')
            }

        }
        if (document.getElementById('menuMobileContratto').getAttribute('aria-expanded') === 'false' && ($event.target.id === 'notificationTrigger_mobile' || $event.target.id === 'homeButton')) {
            console.log('primo if');
            $('#menuMobileContratto').collapse('show');
            exBottonMenuId = $event.target.id;
        } else if ($event.target.id === exBottonMenuId) {
            console.log('secondo if');
            $('#menuMobileContratto').collapse('hide');
            document.getElementById('sottoMenuNotification').classList.add('displayNone')
            exBottonMenuId = '';
        } else if (exBottonMenuId === '' && ($event.target.id === 'notificationTrigger_mobile' || $event.target.id === 'homeButton')) {
            console.log('terzo if');
            $('#menuMobileContratto').collapse('show');
            exBottonMenuId = $event.target.id;
        } else {
            console.log('quarto if');
            exBottonMenuId = $event.target.id;
        }


    }
    /*
     $scope.closePopOver = function ($event) {
     //$('#homeButtonMenu').popover('toggle');
     if (document.getElementById('appHomeContainer') || document.getElementById('homeButtonMenu').getAttribute('aria-describedby')) {
     $('#homeButtonMenu').popover('hide');
     }
     }
     $scope.openHover = function () {
     if (document.getElementById('appHomeContainer') && !document.getElementById('homeButtonMenu').getAttribute('aria-describedby')) {
     var heightPopOver = document.documentElement.clientHeight;
     //alert(heightPopOver)
     $('#homeButtonMenu').popover('show');
     var element = '';
     var id = document.getElementById('homeButtonMenu').getAttribute('aria-describedby');
     var nodeInThisId = document.getElementById(id).childNodes
     for (var s in nodeInThisId) {
     if (nodeInThisId[s].classList.contains('popover-content')) {
     element = nodeInThisId[s];
     break;
     }
     }
     element.style.maxHeight = (heightPopOver) + 'px';
     element.style.overflowY = 'scroll';
     }
     }
     */
    $scope.getPlatform();
    $scope.launchBoardSimple = function (id) {
        if (typeof id === "string") {
            $http.post("/apio/boards/change", {id: id}).success(function () {
                console.log("Returned");
                location.reload();
            });
        } else if (typeof id === "object") {
            if (id.hasOwnProperty("isSyncing") && id.isSyncing === true) {
                alert("La board è in sincronizzazione");
            } else {
                $http.post("/apio/boards/change", {id: id.apioId}).success(function () {
                    console.log("Returned");
                    location.reload();
                });
            }
        }
    };
    /* Fine */
    $http.get('/apio/configuration/return').success(function (data, status) {
        console.log(data);
        configuration = data;

        if (configuration.type === "gateway") {
            setInterval(function () {
                if (Apio.socket.connected === false && Apio.socket.disconnected === true) {
                    if (!$scope.systemOffline) {
                        $scope.systemOffline = true;
                        if (!$scope.$$phase) {
                            $scope.$apply();
                        }
                    }
                } else {
                    if ($scope.systemOffline) {
                        $scope.systemOffline = false;
                        if (!$scope.$$phase) {
                            $scope.$apply();
                        }

                        setTimeout(function () {
                            $window.location = "/";
                        }, 500);
                    }
                }
            }, 500);
        }
    })
    $timeout(function () {
        if (document.getElementById("apioWaitLoadingSystemOperation")) {
            document.getElementById("apioWaitLoadingSystemOperation").classList.remove("apioWaitLoadingSystemOperationOn");
            document.getElementById("apioWaitLoadingSystemOperation").classList.add("apioWaitLoadingSystemOperationOff");
        }
    }, 3000);

    socket.on("new_apio_system", function (data) {
        if (configuration.type == "cloud") {
            $http.get("/apio/user/getSession").success(function (session) {
                $scope.session = session;
                if (session == "info@apio.cc") {
                    var d = new Date();

                    $scope.newIncomingApioId = data;
                    $scope.newIncomingDate = (d.getDate() < 10 ? "0" + d.getDate() : d.getDate()) + "-" + ((d.getMonth() + 1) < 10 ? "0" + (d.getMonth() + 1) : d.getMonth() + 1) + "-" + d.getFullYear();
                    $scope.newIncomingTime = (d.getHours() < 10 ? "0" + d.getHours() : d.getHours()) + ":" + (d.getMinutes() < 10 ? "0" + d.getMinutes() : d.getMinutes());
                    $scope.cancel = function () {
                        $("#incomingNewBoard").modal("hide");
                    };

                    $scope.confirm = function () {
                        var o = {
                            apioId: data,
                            name: document.querySelector("#board-name-div .board-name-input").value
                        };
                        socket.emit("new_apio_system", o);

                        $("#incomingNewBoard").modal("hide");
                    };

                    $("#incomingNewBoard").modal();
                }
            });
        }
    });
    
    $http.get('/apio/update').success(function (data, status) {
	    if(data){
		    //alert("aggiornamento necessario")
		    sweet.show({
                title: 'Conferma',
                text: 'È disponibile un nuovo aggiornamento, vuoi installarlo?',
                imageUrl: 'images/new-icon.png',
                showCancelButton: true,
                confirmButtonColor: '#177537',
                confirmButtonText: 'Yes!',
                closeOnConfirm: true,
                closeOnCancel: false,
                showLoaderOnConfirm: false
            }, function (isConfirm) {
                if (isConfirm) {
                    //console.log(configuration.autoinstall.default);
                    socket.emit("git_pull", "");
                    alert('Scaricamento in background, verrai avvisato al termine');
                    

                } else {
                    sweet.show('Annullato', 'Aggiornamento non scaricato, puoi sempre installare dalla dashboard', 'error');
                }
            });
	    } else {
		    //alert("Il sistema è aggiornato")
		    $scope.systemUpdated = true;
		    if (!$scope.$$phase) {
                $scope.$apply();
            }
		    setTimeout(function(){
		    	$scope.systemUpdated = false;
		    	if (!$scope.$$phase) {
                    $scope.$apply();
                }
		    }, 5000)
	    }
    })

    socket.on("update_system", function (data) {
        //var host = $location.host();
        if (data.type == "request") {
            sweet.show({
                title: 'Conferma',
                text: 'È disponibile un nuovo aggiornamento, vuoi installarlo?',
                imageUrl: 'images/new-icon.png',
                showCancelButton: true,
                confirmButtonColor: '#177537',
                confirmButtonText: 'Yes!',
                closeOnConfirm: false,
                closeOnCancel: false,
                showLoaderOnConfirm: true
            }, function (isConfirm) {
                if (isConfirm) {
                    //console.log(configuration.autoinstall.default);
                    socket.emit("git_pull", "");
                    sweet.show('Scaricamento in corso!', 'Scaricamento in background, verrai avvisato al termine', 'success');

                } else {
                    sweet.show('Annullato', 'Aggiornamento non scaricato, puoi sempre installare dalla dashboard', 'error');
                }
            });

        }
        if (data.type == "done") {
            sweet.show({
                title: 'Conferma',
                text: 'Aggiornamento scaricato, vuoi riavviare il sistema?',
                imageUrl: 'images/new-icon.png',
                showCancelButton: true,
                confirmButtonColor: '#177537',
                confirmButtonText: 'Yes!',
                closeOnConfirm: false,
                closeOnCancel: false,
                showLoaderOnConfirm: true
            }, function (isConfirm) {
                if (isConfirm) {
                    //console.log(configuration.autoinstall.default);
                    //$http.get("/apio/getService/githubUpdate").success(function (service) {
                    //$http.get("http://" + host + ":" + service.port + "/restartApp", {
                    //
                    //    }).success(function(){
                    //   	sweet.show('OK!', 'Il sistema verrà riavviato e sarà disponibile a breve.', 'success');
                    //   });
                    //});
                    $http.post("/apio/rebootBoard").success(function () {
                        sweet.show('OK!', 'Il sistema verrà riavviato e sarà disponibile a breve.', 'success');
                    });

                } else {
                    sweet.show('Annullato', 'Il nuovo sistema sarà disponibile al prossimo riavvio', 'error');
                }
            });

        }

    });

    socket.on("apio_new_object", function (data) {
        //alert(data);
        var d = new Date();
        var n = d.toDateString();
        //var host = $location.host();
        if (data.hasOwnProperty("protocol")) {
            if (data.protocol === "enocean" && data.hasOwnProperty("eep")) {
                //DOPO
            }
        } else if (data.autoInstall == "false") {
            sweet.show({
                title: 'Conferma',
                text: 'Connesso ' + data.appId + ',\nData: ' + n + ',\n vuoi installare?',
                imageUrl: 'images/new-icon.png',
                showCancelButton: true,
                confirmButtonColor: '#177537',
                confirmButtonText: 'Yes!',
                closeOnConfirm: false,
                closeOnCancel: false,
                showLoaderOnConfirm: true
            }, function (isConfirm) {
                if (isConfirm) {
                    console.log(configuration.autoinstall.default);
                    if (configuration.type == "gateway") {
                        //$http.get("/apio/getIP").success(function (ip) {
                        //	$http.get("/apio/getService/autoInstall").success(function (service) {
                        //   	$http.post("http://" + host + ":" + service.port + "/installNew", {
                        //       	appId : data.appId
                        //       }).success(function(){
                        //       	sweet.show('Installata!', data.appId + ' installed', 'success');
                        //       });
                        //   });
                        //});
                        $http.post("/apio/service/autoInstall/route/" + encodeURIComponent("/installNew") + "/data/" + encodeURIComponent(JSON.stringify({
                                appId: data.appId,
                                data: data
                            }))).success(function () {
                            sweet.show('Installata!', data.appId + ' installed', 'success');
                        });
                    } else {
                        socket.emit("apio.remote.autoinstall", data.appId);
                        sweet.show('Installata!', data.appId + ' installed', 'success');
                    }
                } else {
                    sweet.show('Annullato', data.appId + ' not installed', 'error');
                }
            });
        } else {
            console.log(data.autoInstall)
            //var x = document.getElementById("autoInstall");
            $("#autoInstall").html($(data.autoInstall));

        }


    });

    $scope.img = {};
    $scope.img.userImage = 'default.png';

    $http.get("/apio/user/getSession").success(function (session) {
        $http.post("/apio/user/getUser", {
            email: session
        }).success(function (user) {
            console.log('USER******* ', user);
            actualUser = user;
            $scope.user = user.user;
            if (user.user.additional_info.profileImage) {
                $scope.img.userImage = $scope.user.email + '/' + user.user.additional_info.profileImage + '.png'
                //$scope.$apply();
            }

            $scope.role = user.user.role;
        });
    });

    $scope.launchDashboard = function () {
        $window.location = "dashboard#/home";
    };

    $scope.shutdown = function () {
        $http.get("/apio/shutdown").success();
    };

    $scope.userDetails = function () {
        $http.get("/apio/user/logout").success(function () {
            $window.location.reload();
        });
    };

    $scope.actualTag = [];


    $scope.$watchCollection('objectId', function (n, o) {
        //var tempTag;

        var tag = "<p><a onclick='angular.element(this).scope().setTagView(event)'>#tutti</a></p>";

        if ($rootScope.objectId) {
            for (var s in $rootScope.objectId) {
                if ($rootScope.objectId[s].tag) {
                    var tagArray = $rootScope.objectId[s].tag.split(" ");
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
            tag += "<p><a onclick='angular.element(this).scope().setTagView(event)'>" + $scope.actualTag[r] + "</a></p>"
        }
        //document.getElementById('homeButtonMenu').setAttribute('data-content', tag);
        //document.getElementById('sottoMenuTag').innerHTML = tag;
        $scope.actualTag = [];
    });


    $scope.checkTag = function (a, b) {
        console.log('+++++++++++++++++++++++++++++', a);
        console.log(b);
        var l = [];
        l = a.split(" ");
        for (var s in l) {
            if (l[s] === b) {
                console.log(l[s])
                return true;
            }
        }
        return false;
    }

    $scope.setTagView = function ($event) {
        //$scope.tagged = $event.target.innerHTML;
        for (var s in $rootScope.objectId) {
            //console.log($rootScope.objectId[s]);
            if (($rootScope.objectId[s] && $rootScope.objectId[s].tag && $scope.checkTag($rootScope.objectId[s].tag, $event.target.innerHTML) === true) || $event.target.innerHTML === '#tutti') {
                if (document.getElementById($rootScope.objectId[s].objectId).classList.contains('displayNone')) {
                    document.getElementById($rootScope.objectId[s].objectId).classList.remove('displayNone');
                }
            } else {
                if (!document.getElementById($rootScope.objectId[s].objectId).classList.contains('displayNone')) {
                    document.getElementById($rootScope.objectId[s].objectId).classList.add('displayNone');
                }
            }
        }
        //Apio.tag = $event.target.innerHTML;
        //document.getElementById('homeButtonMenu').setAttribute('data-content','<p>l#</p><p>#s</p><p>#p</p>');
    };

    console.log('$scope.user ******** ', $scope.user);

    $scope.dataProfileToSave = {};

    $scope.saveProfile = function () {
        console.log('il dato passato è ***** ', data);
    }

    $scope.openUserProfile = function () {

        $scope.user = actualUser.user;
        //var alert = $mdDialog.alert()
        //.title('Ciao, ' + $scope.user.additional_info.userName)
        //.textContent('This is an example of how easy dialogs can be!')
        //.ok('Close');
        //$mdDialog.show(alert);

        $mdDialog.show({
            templateUrl: '/dialog/appModifyUserProfile/index.html',
            controller: 'modifyUserProfile',
            clickOutsideToClose: true,
            bindToController: true,
            scope: $scope,
            preserveScope: true


        });

    }

    /*$scope.$watch('userImage',function(n){
     //alert();
     console.log("editImage ",n);
     $scope.img.userImage = n;
     });*/
}]);


Apio.runApioLoading = function (element, scroll, border) {
    if (element) {
        var borderRadius;
        var offsetLeft;
        var offsetTop;
        if (typeof border === "undefined") {
            if (element && element.style && element.style.borderRadius) {
                borderRadius = 'border-radius:' + element.style.borderRadius;
            } else if (element.firstChild && element.firstChild.style && element.firstChild.style.borderRadius) {
                borderRadius = 'border-radius:' + element.firstChild.style.borderRadius;
            } else {
                borderRadius = '';
            }
        } else {
            borderRadius = 'border-radius:' + border + 'px';
        }
        if (scroll == true) {
            offsetLeft = 'left:' + element.offsetLeft + 'px;';
            offsetTop = 'top:' + element.offsetTop + 'px;';
        } else {
            offsetLeft = '';
            offsetTop = '';
        }
        var firstElement = document.createElement("DIV");
        firstElement.setAttribute("style", 'position:absolute; ' + offsetTop + ' ' + offsetLeft + '');
        firstElement.innerHTML = '<div id="loading" class="loading " style="width:' + element.offsetWidth + 'px !important; height:' + element.offsetHeight + 'px;' + borderRadius + '; margin: 0 auto;"><div id="loadingRoller" class=""><div class="loaderAnimation loadingRoller"></div></div></div>';
        element.insertBefore(firstElement, element.firstChild);
        setTimeout(function () {
            var loaderInPage = document.getElementsByClassName('loaderAnimation')
            for (var ld in loaderInPage) {
                if (loaderInPage.item(ld) && !loaderInPage.item(ld).classList.contains('loadingPlay')) {
                    loaderInPage.item(ld).classList.add('loadingPlay')
                }
            }
        }, 200);
    }
};

Apio.stopApioLoading = function () {
    //alert('rimuovo animazione')

    var loaderInPage = document.getElementsByClassName('loaderAnimation')
    for (var ld in loaderInPage) {
        if (loaderInPage.item(ld) && loaderInPage.item(ld).classList && loaderInPage.item(ld).classList.contains('loadingPlay')) {
            loaderInPage.item(ld).classList.remove('loadingPlay');
        }
    }

    setTimeout(function () {
        var loading = document.getElementsByClassName('loading')
        for (var ld in loading) {
            if (loaderInPage.item(ld) && loaderInPage.item(ld).parentNode) {
                loading.item(ld).parentNode.removeChild(document.getElementById('loading'));
            }
        }
    }, 200);
};
},{"./apio.client.js":1}]},{},[2]);
