var Apio = require ('./apio.client.js');
//var q = require("./bower_components/q");
//Trova un modo migliore per iniettare le dipendenze 
window.Apio = Apio;
window.$ = $;
Apio.Socket.init();
//Fixare questo scempio con la dependency injection
Apio.appWidth = parseInt($("#appApio").css('width'),10);
Apio.newWidth = parseInt($("#appApio").css('width'),10);
Apio.currentApplication = {};
Apio.currentApplication.subapps = {};


var ApioApplication = angular.module('ApioApplication',['ui.bootstrap','ngRoute']);




ApioApplication.config(['$routeProvider',
  function($routeProvider) {
    $routeProvider.
      when('/',{
        templateUrl : 'systemApps/home/app.home.html',
        controller : 'ApioHomeController'
      }).
      when('/wall',{
        templateUrl : 'systemApps/wall/app.wall.html',
        controller : 'ApioWallController'
      }).
      when('/events',{
        templateUrl : 'systemApps/events/app.events.html',
        controller : 'ApioEventsController'
      }).
      otherwise({
        redirectTo: '/'
      });
  }]);




ApioApplication.factory('socket', function ($rootScope) {
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

ApioApplication.factory('objectService', ['$rootScope','$http',function($rootScope,$http){
  return {
    list : function() {
      var promise = $http.get('/apio/database/getObjects').then(function(response){
        return response;
      })
      return promise;
    },
    getById : function(id) {
      var promise = $http.get('/apio/database/getObject/'+id).then(function(response){
        return response;
      })
      return promise;      
    }
  }
}])
	
ApioApplication.directive('ngTouchEnd', function() {
    return function(scope, element, attrs) {
      var tapping;
      element.bind('touchend', function(e) {
        element.removeClass('active');
          scope.$apply(attrs['ngouchEnd'], element);
      });
    };
  });

ApioApplication.factory('DataSource', ['$http',function($http){
       return {
           get: function(url,callback){
                $http.get(
                    url,
                    {transformResponse:function(data) {
                      // convert the data to JSON and provide
                      // it to the success function below
                        var x2js = new X2JS();
                        var json = x2js.xml_str2json( data );
                        console.log("CIAO");
                        console.log(json);
                        return json;
                        }
                    }
                ).
                success(function(data, status) {
                    // send the converted data back
                    // to the callback function
                    callback(data);
                })
           }
       }
    }]);


ApioApplication.controller('ApioNotificationController',['$scope','$http','socket',function($scope,$http,socket){
        socket.on('apio_notification', function(notification) {

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

    
var apioProperty = angular.module('apioProperty', ['ApioApplication']);

  ApioApplication.service('currentObject', ['$rootScope','$window','socket','objectService','$http',function($rootScope, $window,socket,objectService,$http){
  	var modifying = false;
    var obj = {};
    var recording = false;
    var recordingObject = {};
    var _recordingObjectName = "";
    $window.rootScopes = $window.rootScopes || [];
    $window.rootScopes.push($rootScope);

    if (!!$window.sharedService){
      return $window.sharedService;
    }

    $window.sharedService = {
      set: function(newObj){
        obj = newObj;
        angular.forEach($window.rootScopes, function(scope) {
          if(!scope.$$phase) {
              scope.$apply();
          }
        });
      },
      get: function(){
        return obj;
      },
      isModifying : function(val) {
        if ('undefined' == typeof val)
          return modifying;
        else
          modifying = val;
      },
      isRecording : function(val) {
        if ('undefined' == typeof val)
          return recording;
        else
          recording = val;
      },
      recordingStateName : function(name) {
        if ('undefined' === typeof name)
          return _recordingObjectName;
        else
          _recordingObjectName = name;
      },
      update : function(prop,value,writeDb,writeSerial) {
        if ('undefined' == typeof writeDb)
          writeDb = true;
        if ('undefined' == typeof writeSerial)
          writeSerial = true;
        obj.properties[prop] = value;
        var o = {
          objectId : obj.objectId,
          properties : {

          },
          writeToDatabase : writeDb,
          writeToSerial : writeSerial
        }
        o.properties[prop] = value;
        socket.emit('apio_client_update', o);
  

      },
      updateMultiple : function(update,writeDb,writeSerial) {
        if ('undefined' == typeof writeDb)
          writeDb = true;
        if ('undefined' == typeof writeSerial)
          writeSerial = true;
        var o = {}
        o.objectId = obj.objectId;
        o.properties = update;
        o.writeToDatabase = writeDb;
        o.writeToSerial = writeSerial;
        socket.emit('apio_client_update',o);
      },
      record : function(key,value) {
        if ('undefined' === typeof key && 'undefined' === typeof value)
          return recordingObject
        else if ('undefined' !== typeof key && 'undefined' === typeof value)
          return recordingObject[key];
        else
          recordingObject[key] = value;
      },
      removeFromRecord: function(key) {
        if (recordingObject.hasOwnProperty(key))
          delete recordingObject[key];
      },
      recordLength : function() {
        return Object.keys(recordingObject).length;
      },
      resetRecord : function() {
        recordingObject = {};
        console.log("resetRecord()");
        console.log(recordingObject)
      },
      sync : function(c) {
        var self = this;
          objectService.getById(obj.objectId).then(function(d){
            self.set(d.data);
            if ('function' == typeof c)
              c()
          })
        
      }
    }

    return $window.sharedService;
  }]);




    


