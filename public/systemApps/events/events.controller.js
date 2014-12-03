angular.module('ApioApplication')
    .controller('ApioEventsController', ['$scope', '$http', 'socket', 'objectService', "DataSource", "$modal",
        function($scope, $http, socket, objectService, DataSource, $modal) {
            document.getElementById("targetBody").style.position = "";
                $("#ApioApplicationContainer").hide(function(){
                    $("#ApioApplicationContainer").html("");
                })
            $scope.loadRunModifier = function(){
	            $.get("systemApps/events/app.events.activator.modify.html", function(data){
					var app = $("#editEventPanel");
					Apio.newWidth += Apio.appWidth;
					app.css("width", Apio.newWidth+"px");
					$("#ApioApplicationEditEvent").css("width", Apio.appWidth+"px");
					$("#ApioApplicationEditEvent").css("float", "left");
			        app.css("overflowX", "auto");
					
				    app.append($(data));
				    $("#editEventRunModify").css("width", Apio.appWidth+"px");
				    $("#editEventRunModify").css("float", "left");
				});
            }
            
            $scope.convertCron = function(cronDate){
	            function addZero(arg){
		            for(var i in arg){
			            if(arg[i].length == 1 && arg[i] != "*"){
				            arg[i] = "0"+arg[i];
			            }
			        }
		        }
		        if ('undefined' == typeof cronDate)
                    return;

	            var date = "";
	            var cronComponents = cronDate.split(" ");
	            if(cronComponents[1] == "*"){
		            date = "Ogni minuto";
	            }
	            else if(cronComponents[2] == "*"){
		            addZero(cronComponents);
		            date = "Ogni ora al minuto "+cronComponents[1];
	            }
	            else if(cronComponents[3] == "*"){
		            addZero(cronComponents);
		            date = "Ogni giorno alle "+cronComponents[2]+":"+cronComponents[1];
	            }
	            else if(cronComponents[4] == "*"){
		            addZero(cronComponents);
		            date = "Ogni mese il giorno "+cronComponents[3]+" alle "+cronComponents[2]+":"+cronComponents[1];
	            }
	            else if(cronComponents[5] == "*"){
		            addZero(cronComponents);
		            date = "Il "+cronComponents[3]+"/"+cronComponents[4]+" alle "+cronComponents[2]+":"+cronComponents[1];
	            }
	            else if(cronComponents[3] == "*" && cronComponents[4] == "*" && cronComponents[5] != "*"){
		            addZero(cronComponents);
		            switch(cronComponents[5]){
			            case "0" : case "7" : var day = "Domenica"; break;
			            case "1" : var day = "Lunedì"; break;
			            case "2" : var day = "Martedì"; break;
			            case "3" : var day = "Mercoledì"; break;
			            case "4" : var day = "Giovedì"; break;
			            case "5" : var day = "Vernedì"; break;
			            case "6" : var day = "Sabato"; break;
		            }
		            date = "Ogni settimana di "+day+" alle "+cronComponents[2]+":"+cronComponents[1];
	            }
	            
	            return date;
            }
            
            $scope.showGuests = false;

            $scope.editEventFormStep = 'mostraInvitati';
            $scope.goToEditEventFormStep = function(step) {
                $scope.editEventFormStep = step;
                if($scope.editEventFormStep == "sceltaTipo"){
					$('#editEventRunPanel').show('slide',
                        {
                            direction : 'right'
                        },500);
                } else if ($scope.editEventFormStep == 'selezioneData'){
                    resetCronModifica();
                }
            }
            $scope.toggleShowGuests = function() {
                $scope.showGuests = !$scope.showGuests;
                if ($scope.showGuests === false)
                    $scope.editEventFormStep = 'sceltaInvitati';
                else
                    $scope.editEventFormStep = 'mostraInvitati';
            }
            $scope.currentEvent = {
                triggeredStates: []
            };
            $scope.statesToAddToEvent = [];
            $scope.toggleNewStateInEvent = function(state) {
                if ($scope.statesToAddToEvent.indexOf(state) > -1)
                    $scope.statesToAddToEvent.splice($scope.statesToAddToEvent.indexOf(state),1);
                else
                    $scope.statesToAddToEvent.push(state)
            }
            $scope.saveCurrentEvent = function() {
                $.merge($scope.currentEvent.triggeredStates,$scope.statesToAddToEvent);
                alert("Mando la request")
                _saveEvent()
            }

            function _saveEvent() {
                
                $http.put('/apio/event/'+$scope.currentEvent.name,{eventUpdate : $scope.currentEvent})
                .success(function(data){
                    alert("Event successfully updates");
                    if ($scope.showGuests == false)
                    $scope.toggleShowGuests();
                    $scope.statesToAddToEvent = [];
                    $("input.addNewGuest:checked").removeAttr("checked")
                })
                .error(function(){
                    alert("An error has occurred while updating the event")
                })
            }

            $scope.editEventFlag = false;

            $http.get('/apio/state')
                .success(function(data) {
                    console.log(data);
                    $scope.states = data;
                });
            $scope.deleteGuest = function(guest) {
                var i = $scope.currentEvent.triggeredStates.indexOf(guest);
                if (i > -1) {
                    $scope.currentEvent.triggeredStates.splice(i, 1);
                    _saveEvent();
                }

            };
            $scope.stateInList = function(item) {
                
                if ($scope.currentEvent.triggeredStates.indexOf(item.name) > -1)
                    return false;
                else
                    return true;
            }
            $scope.editEvent = function(event) {
                console.log("Mi accingo a modificare il seguente evento")
                console.log(event)
                $scope.currentEvent = event;
                $scope.editEventFlag = true;
                $scope.showGuests = true;

                document.getElementById('ApioEventsContainer').classList.add('openAppIconStyle');

                if (window.innerWidth > 769)
                    $("#ApioEventsContainer").css("width", "77%");
                $("#editEventPanel").show("slide", {
                    direction: 'right'
                }, 500, function() {
                	document.getElementById("editEventPanel").style.opacity = "1";
                    $scope.$apply();
                });




            }

            $scope.showBack = false;
            $scope.currentFormStep = '';
            $scope.newEvent = {
                triggeredStates: {}
            };



            socket.on('apio_event_delete', function(data) {
                $scope.loadEvents();
            });
            socket.on('apio_event_new', function(data) {
                $scope.loadEvents();
            });

            $scope.loadEvents = function() {
                $http.get('/apio/event')
                    .success(function(data) {
                        console.log(data)
                        $scope.events = data;
                    }).error(function() {
                        console.log("Errore nel caricare gli eventi dal server");
                    });
            }

            $scope.loadEvents();



            function resetCron() {
                $("#selezioneDataNuovoEvento").html("");
                $("#selezioneDataNuovoEvento").cron({
                    onChange: function() {
                        if ($scope.newEvent.hasOwnProperty('type') && $scope.newEvent.type == 'timeTriggered') {
                            $scope.newEvent.triggerTimer = $(this).cron("value");
                            $scope.$apply();

                        } else {
                            console.log("Sto cambiando la data ma non ho settato il tipo, si sono coglione")
                        }

                    }
                });
            }
            function resetCronModifica() {
                $("#selezioneDataModificaEvento").html("");
                $("#selezioneDataModificaEvento").cron({
                    onChange: function() {
                        if ($scope.currentEvent.hasOwnProperty('type') && $scope.currentEvent.type == 'timeTriggered') {
                            $scope.currentEvent.triggerTimer = $(this).cron("value");
                            

                        }

                    }
                });
            }

            resetCron();

            $scope.eventNameIsValid = function() {
                console.log("newEventName " + $scope.newEvent.name)
                if (typeof $scope.newEvent.name !== "undefined" && $scope.newEvent.name !== "")
                    return true;
                else
                    return false;
            }

            $scope.reset = function() {
                $scope.newEvent = {};
                $scope.newEvent.triggeredStates = {};
                resetCron();

                if ($scope.currentFormStep == 'sceltaTipo') {
                    $scope.showNewEventForm = false;
                    $scope.currentFormStep = "";
                } else if ($scope.currentFormStep == '') {
                    $scope.showNewEventForm = true;
                    $scope.currentFormStep = "sceltaTipo";
                } else {
                    $scope.showNewEventForm = true;
                    $scope.currentFormStep = "sceltaTipo";
                }


            }
            $scope.showBack = function() {
                if ($scope.currentFormStep == 'sceltaTipo')
                    return false;
                else
                    return true;
            }
            $scope.goForward = function() {
                switch ($scope.currentFormStep) {
                    case "selezioneData":
                        $scope.goToFormStep('selezioneStatiScatenati');
                        break;
                    case "selezioneStatoScatenante":
                        $scope.goToFormStep('selezioneStatiScatenati');
                        break;
                    case "selezioneStatiScatenati":
                        $scope.goToFormStep('selezioneNomeEvento');

                        break;
                    default:
                        alert("Si è verificato un errore, tipo di evento non riconosciuto.")
                        $scope.goToFormStep('');
                        $scope.reset();
                        break
                }

            }
            $scope.goBack = function() {
                switch ($scope.currentFormStep) {
                    case "sceltaTipo":
                        break;
                    case "selezioneData":
                        $scope.goToFormStep('sceltaTipo');
                        break;
                    case "selezioneStatoScatenante":
                        $scope.goToFormStep('sceltaTipo');
                        break;
                    case "selezioneStatiScatenati":
                        if ($scope.newEvent.type == 'stateTriggered')
                            $scope.goToFormStep('selezioneStatoScatenante');
                        else if ($scope.newEvent.type == 'timeTriggered')
                            $scope.goToFormStep('selezioneData');
                        else {
                            alert("Si è verificato un errore, tipo di evento non riconosciuto.")
                            $scope.goToFormStep('');
                            $scope.reset();
                        }

                        break;
                    case "selezioneNomeEvento":
                        $scope.goToFormStep('selezioneStatiScatenati');
                        break;
                    default:
                        alert("Si è verificato un errore, tipo di evento non riconosciuto.")
                        $scope.goToFormStep('');
                        $scope.reset();
                        break
                }
            }
            $scope.saveEvent = function() {

                console.log("Mi accingo a salvare il seguente evento");

                //Pre-processing degli stati da scatenare
                var _a = [];
                for (var k in $scope.newEvent.triggeredStates) {
                    if (true == $scope.newEvent.triggeredStates[k])
                        _a.push(k);
                }
                $scope.newEvent.triggeredStates = _a;
                //Pre processing dell'orario
                if ($scope.newEvent.hasOwnProperty('triggerTimer')) {
                    $scope.newEvent.triggerTimer = '0 ' + $scope.newEvent.triggerTimer;
                }

                console.log($scope.newEvent)
                $http.post('/apio/event', {
                    event: $scope.newEvent
                })
                    .success(function(data) {
                        alert("Evento salvato con successo");
                        $scope.newEvent = {};
                        $scope.newEvent.triggeredStates = {};
                        $scope.showNewEventForm = false;
                        $scope.loadEvents();
                        $scope.currentFormStep = "";



                    })
                    .error("An error has occurred while saving the event")
            }
            $scope.launchEvent = function(event) {

            }
            $scope.deleteEvent = function(event) {
                $http.delete('/apio/event/' + event.name)
                    .success(function(data) {
                        alert("Evento eliminato con successo");
                    }).error(function() {
                        alert("Errore nell'eliminazione dell'evento");
                    });

            }

            function haAlmenoUnoStatoScatenato() {
                for (var k in $scope.newEvent.triggeredStates) {
                    if ($scope.newEvent.triggeredStates[k])
                        return true;
                }
                return false;
            }
            $scope.showForward = function() {
                console.log("TriggerTimer " + $scope.newEvent.triggerTimer)
                switch ($scope.currentFormStep) {
                    case "selezioneStatoScatenante":
                        if ($scope.newEvent.hasOwnProperty('triggerState')) {
                            return true;
                        } else {
                            return false;
                        }
                        break;
                    case "selezioneStatiScatenati":

                        if ($scope.newEvent.hasOwnProperty('triggeredStates') && haAlmenoUnoStatoScatenato())
                            return true;
                        else
                            return false;
                        break;
                    case "selezioneData":
                        if ($scope.newEvent.hasOwnProperty('triggerTimer'))
                            return true;
                        else
                            return false;
                        break;


                }
            }
            $scope.goToFormStep = function(step) {
                $scope.currentFormStep = step;
                if (step == 'selezioneData')
                    $scope.newEvent.type = "timeTriggered";

                if (step == 'selezioneStatoScatenante') {
                    $scope.newEvent.type = 'stateTriggered';
                    $http.get('/apio/state')
                        .success(function(data) {

                        })
                        .error(function(data) {

                        });
                }
            }

        }
    ])