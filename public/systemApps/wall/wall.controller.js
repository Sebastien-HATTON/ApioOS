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
 ***************************************************************************/


angular.module('ApioApplication').controller('ApioWallController', ['$scope', '$http', 'socket', 'objectService', 'currentObject', "$timeout", function ($scope, $http, socket, objectService, currentObject, $timeout) {
    if(!document.getElementById("apioWaitLoadingSystemOperation").classList.contains("apioWaitLoadingSystemOperationOn")){
        document.getElementById("apioWaitLoading").classList.remove("apioWaitLoadingOff");
        document.getElementById("apioWaitLoading").classList.add("apioWaitLoadingOn");
        $timeout(function () {
            document.getElementById("apioWaitLoading").classList.remove("apioWaitLoadingOn");
            document.getElementById("apioWaitLoading").classList.add("apioWaitLoadingOff");
        }, 1000);
    }

    document.getElementById("targetBody").style.position = "";
    $("#ApioApplicationContainer").hide(function () {
        $("#ApioApplicationContainer").html("");
    });
    $("#notificationsCenter").slideUp(500);
    if (document.getElementById('menuMobileContratto')) {
        document.getElementById('menuMobileContratto').classList.remove('in');
    }
    //Reset handlers
    $("#ApioApplicationContainer").off("touchstart");
    $("#ApioApplicationContainer").off("touchend");
    $("#ApioApplicationContainer").off("mousedown");
    $("#ApioApplicationContainer").off("mouseup");

    var order = function(arr){
        for(var i in arr){
            arr[i].sort(function(a, b){
                return a.name.toLowerCase() > b.name.toLowerCase();
            });
        }

        var arrKeys = Object.keys(arr).sort();
        var obj = {};
        for(var i in arrKeys){
            obj[arrKeys[i]] = arr[arrKeys[i]];
        }

        return obj;
    };

    $http.get('/apio/state').success(function (data) {
        $scope.groupedStates = {};
        for(var i in data){
            var n = data[i].objectName.slice(0);
            delete data[i].objectName;
            if(typeof $scope.groupedStates[n] === "undefined"){
                $scope.groupedStates[n] = [];
            }
            $scope.groupedStates[n].push(data[i]);
        }

        $scope.groupedStates = order($scope.groupedStates);
    });

    $scope.tagState = function (state) {
        alert("Coming soon...");
    }

    $scope.currentApplication = null;
    socket.on('apio_state_update', function (state) {
        console.log("Arrivata modifica di uno stato dal server, la applico", state);
        for(var i in $scope.groupedStates){
            for(var j in $scope.groupedStates[i]) {
                if ($scope.groupedStates[i][j].name === state.name) {
                    $scope.groupedStates[i][j].properties = state.properties;
                    $scope.groupedStates[i][j].active = state.active;
                }
            }
        }
    });

    socket.on('apio_state_delete', function (state) {
        for(var i in $scope.groupedStates){
            for(var j in $scope.groupedStates[i]) {
                if ($scope.groupedStates[i][j].name === state.name) {
                    $scope.groupedStates[i].splice(j, 1);
                }
            }

            if (Object.keys($scope.groupedStates[i]).length === 0) {
                delete $scope.groupedStates[i];
            }
        }
    });

    socket.on('apio_state_new', function (state) {
        var n = state.objectName.slice(0);
        delete state.objectName;
        if(typeof $scope.groupedStates[n] === "undefined"){
            $scope.groupedStates[n] = [];
        }
        $scope.groupedStates[n].push(state);
        $scope.groupedStates = order($scope.groupedStates);
    });

    $scope.launchState = function (state) {
        state.active = !state.active;
        $http.post('/apio/state/apply', {state: state}).success(function () {
            console.log("Stato applicato con successo")
        }).error(function () {
            console.log("Errore nell'applicazione dello stato")
        });
    };

    $scope.deleteState = function (state) {
        $http.delete('/apio/state/' + state.name).success(function (s, status, header, config) {
            console.log("Stato " + state.name + " eliminato con successo");
        }).error(function (s, status, header, config) {
            console.log("Stato non eliminato");
        });
    };
	$scope.explaynStates = function($event){
		var target = $event.target;
		console.log(target);
		if(target.id == "wallContainer"){
			if(document.getElementsByClassName('mobileLayoutStateContainer').item(0).classList.contains('openStateRow')){
				$(".mobileLayoutStateContainer").removeClass("openStateRow");	
			} else {
				$(".mobileLayoutStateContainer").addClass("openStateRow");
			}
		}
	}
	$scope.explainSingleState = function($event){
		var target = $event.target;
		var rowState = target.parentNode.parentNode;
		if(rowState.classList.contains("openStateRow") && target.classList.contains("nameApplicationState")){
			$event.target.parentNode.parentNode.classList.remove("openStateRow");
		} else {
			$event.target.parentNode.parentNode.classList.add("openStateRow");
		}
	}
    $scope.editState = function (state) {
        var id = state.objectId;
        currentObject.recordingStateName(state.name);
        //$("#appApio").css("width", Apio.appWidth + "px");
        //$("#appApio").addClass("proprieta");
        $("#ApioApplicationContainer").css("width", Apio.appWidth + "px");
        //$("#ApioApplicationContainer").addClass("proprieta");
        //document.getElementById("targetBody").style.position = "fixed";
        Apio.newWidth = Apio.appWidth;
        objectService.getById(id).then(function (d) {
            $scope.currentObject = d.data;
            // new thing!
            currentObject.set(d.data);

            $.get("applications/" + id + "/" + id + ".html", function (data) {
                document.getElementById("wallContainer").classList.add("wall_open_edit_state");

                $("#ApioApplicationContainer").html($(data));
                $("#ApioApplicationContainer").find("h2").text($scope.currentObject.name);
                for (var key in state.properties) {
                    currentObject.record(key, state.properties[key]);
                    currentObject.get().properties[key] = state.properties[key];
                }
                currentObject.isModifying(true);
                var interval = setInterval(function () {
                    if ($("#registra_statoinput").trigger("click")[0]) {
                        clearInterval(interval);
                        $("#registra_statoinput").trigger("tap");
                        $("#ApioApplicationContainer").show("slide", {direction: "right"}, 500, function () {
                            $scope.$apply();
                        });
                    }
                }, 50);
            });
        });
    }
}]);
