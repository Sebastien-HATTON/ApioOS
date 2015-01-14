angular.module('ApioApplication').controller('ApioWallController', ['$scope', '$http', 'socket', 'objectService', 'currentObject', '$rootScope',
    function($scope, $http, socket, objectService, currentObject, $rootScope) {
        document.getElementById("targetBody").style.position = "";
        $("#ApioApplicationContainer").hide(function(){
            $("#ApioApplicationContainer").html("");
        });
        $("#notificationsCenter").slideUp(500);

        //Reset handlers
        $("#ApioApplicationContainer").off("touchstart");
        $("#ApioApplicationContainer").off("touchend");
        $("#ApioApplicationContainer").off("mousedown");
        $("#ApioApplicationContainer").off("mouseup");

            $http.get('/apio/state')
            .success(function(data) {
                $scope.states = data;

            });

        $scope.tagState = function(state){
            alert("Coming soon...");
        }

        $scope.currentApplication = null;
        socket.on('apio_state_update', function(state) {

            console.log("Arrivata modifica di uno stato dal server, la applico")
            console.log(state);
            $scope.states.forEach(function(e, i, a) {
                if (e.name == state.name) {
                    e.properties = state.properties;
                    e.active = state.active;
                }
            })
        });


        socket.on('apio_state_delete', function(state) {
            var k = 0;
            $scope.states.forEach(function(e, i, a) {
                if (e.name == state.name) {
                    $scope.states.splice(k, 1);
                }
                k++;
            })
        })

        socket.on('apio_state_new', function(state) {
            alert("Nuovo stato!")
            $scope.states.push(state);
        })

        $scope.launchState = function(state, index) {
            if(state.active)
                document.getElementById("state-"+index).classList.add('active_on');
            else
                document.getElementById("state-"+index).classList.remove('active_on');
            state.active = !state.active;
            $http.post('/apio/state/apply', {
                state: state
            })
                .success(function() {
                    console.log("Stato applicato con successo")
                })
                .error(function() {
                    console.log("Errore nell'applicazione dello stato")
                })

        }

        $scope.deleteState = function(state) {
            $http.delete('/apio/state/' + encodeURIComponent(state.name))
                .success(function(s, status, header, config) {
                    console.log("Stato " + state.name + " eliminato con successo");
                })
                .error(function(s, status, header, config) {
                    console.log("Stato non eliminato");
                })
        };

        $scope.editState = function(state) {
            var id = state.objectId;
            currentObject.recordingStateName(state.name);
            //$("#appApio").css("width", Apio.appWidth + "px");
            //$("#appApio").addClass("proprieta");
            $("#ApioApplicationContainer").css("width", Apio.appWidth + "px");
            //$("#ApioApplicationContainer").addClass("proprieta");
            //document.getElementById("targetBody").style.position = "fixed";
            Apio.newWidth = Apio.appWidth;
            objectService.getById(id).then(function(d) {
                $scope.currentObject = d.data;
                // new thing!
                currentObject.set(d.data);

                $.get("applications/" + id + "/" + id + ".html", function(data) {
                    document.getElementById('wallContainer').classList.add('wall_open_edit_state');

                    $("#ApioApplicationContainer").html($(data));
                    $("#ApioApplicationContainer").find("h2").text($scope.currentObject.name);
                    setTimeout(function() {
                        for (key in state.properties) {
                            currentObject.record(key, state.properties[key]);
                            currentObject.get().properties[key] = state.properties[key];
                        }
                        currentObject.isModifying(true);
                        $("#registra_statoinput").trigger("click");
                        $("#registra_statoinput").trigger("tap");
                        $("#ApioApplicationContainer").show("slide", {
                            direction: 'right'
                        }, 500, function() {
                            $scope.$apply();
                        });
                    }, 300);
                    
                });

            });



        }

    }
]);