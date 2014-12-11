var apioApplication = angular.module("ApioApplication");
apioApplication.directive("topappapplication", ["currentObject", "socket", "$http", "$timeout","$rootScope", function(currentObject, socket, $http, $timeout,$rootScope){
	return{
	    restrict: "E",
	    replace: true,
	    scope: {},
	    templateUrl: "systemApps/topAppApplication/topAppApplication.html",
	    link: function(scope, elem, attrs, controller){
	    	scope.object = currentObject.get();
			currentObject.isRecording(false);
			scope.currentObject = currentObject;
			scope.showPublishButton = false;
			scope.showPublishButtonActive = false;
			scope.newStatusName = "";
			scope.newEventName = "";
			scope.object = currentObject.get();
			
			function removeRecordingStatus(){
				scope.currentObject.resetRecord();
				scope.showPublishButton = false;
				currentObject.isRecording(false);
				scope.newStatusName = '';
				scope.newEventName = '';
				scope.recStep = '';
				$timeout(function(){
					if (document.getElementById("app"))
						document.getElementById("app").style.display = "block";
				}, 0);
				currentObject.sync(function(){
					currentObject.isRecording(false); //Esco dalla recording mode
					scope.object = currentObject.get(); //risetto l'oggetto ai valori presi dal sync
					scope.$parent.$broadcast('propertyUpdate');
					scope.$apply(); //per riapplicare i bindings
				});
			}
			
			scope.recStep = "";
			
			scope.saveModify = function(){
				var toDB = scope.currentObject.record();
				var _p = {};
				for (var k in toDB)
					_p[k] = scope.$parent.object.properties[k];

				console.log("Le modifiche da applicare sono:")
				console.log(_p)
				var stateName = currentObject.recordingStateName();
				$http.put("/apio/state/"+stateName, {state : _p})
				.success(function(){
					//document.getElementById("appApio").innerHTML = "";
					document.getElementById("ApioApplicationContainer").innerHTML = "";
		            $("#ApioApplicationContainer").hide("slide", {
		                direction: 'right'
		            }, 500, function() {
						document.getElementById('wallContainer').classList.remove('wall_open_edit_state');
					});
					scope.currentObject.resetRecord();
					currentObject.isRecording(false);
					currentObject.isModifying(false);
					$rootScope.$emit('requestReloadStates');
				})
				.error(function(){
					alert("Impossibile salvare");
				});
				$("#wallContainer").css("width", "");
			}
	
			scope.startRecording = function(){
			    currentObject.isRecording(true);
			    scope.showPublishButton = false;
			}
			
			scope.stopRecording = function(){
				if(currentObject.isModifying()){
					currentObject.isModifying(false);
					//document.getElementById("appApio").innerHTML = "";
					document.getElementById("ApioApplicationContainer").innerHTML = "";
					$("#ApioApplicationContainer").hide("slide", {
		                direction: 'right'
		            }, 500, 
		            function() {
			           document.getElementById('wallContainer').classList.remove('wall_open_edit_state');	                
		            });
		        }
				else{
					currentObject.isRecording(false);
				}
				$("#wallContainer").css("width", "");
				removeRecordingStatus();
			}
			
			scope.useRecording = function(){
				scope.showPublishButton = true;
				if(currentObject.isRecording() !== true || scope.currentObject.recordLength() < 1){
					return;
				}
				
				for(key in scope.currentObject.record())
					scope.currentObject.record(key, scope.object.properties[key]);
		
				scope.recStep = "EventOrWall";
				$timeout(function(){
					document.getElementById("app").style.display = "none";
				}, 0);
			}
			
			scope.eventRecording = function(){
				scope.recStep = "EventNameChoice";
			}
			
			scope.wallRecording = function(){
				scope.recStep = "StatusNameChoice";
			}
			
			scope.showPublish = function(){
				if((scope.recStep === "StatusNameChoice" && scope.newStatusName !== "") || (scope.recStep === "EventNameChoice" && scope.newStatusName !== "" && scope.newEventName !== "")){
					scope.showPublishButtonActive = true;
				}
			}
			
			scope.publishRecording = function(){
				console.log("publishRecording() chiamato allo stato "+scope.recStep)
				if(scope.recStep !== 'EventNameChoice' && scope.recStep !== 'StatusNameChoice')
					return;
			
				var o = {};
				o.active = false;
				o.name = scope.newStatusName;
				o.objectName = scope.object.name;
				o.objectId = scope.object.objectId;
				o.properties = scope.currentObject.record();
				var dao = {};
				dao.state = o;
				if(scope.newEventName !== ''){
					var e = {};
					e.name = scope.newEventName;
					dao.event = e;
				}
			
				//Ho impacchettato evento e stato dentro la variabile dao che invio al server
				console.log("POST /apio/state");
				$http.post('/apio/state',dao)
				.success(function(data){
					if(data.error === 'STATE_NAME_EXISTS'){
						alert("Uno stato con questo nome è già presente in bacheca, si prega di sceglierne un altro")
					}
					if(data.error === 'STATE_PROPERTIES_EXIST'){
						alert("Lo stato di nome "+o.name+" non è stato pubblicato perchè lo stato "+data.state+" ha già le stesse proprietà");
						removeRecordingStatus();
					}
					if(data.error === 'EVENT_NAME_EXISTS'){
						alert('Esiste già un evento di nome '+e.name);
					}
					if(data.error === false){
						if(scope.newEventName !== '')
							alert("Stato ed evento creati con successo");
						else
							alert("Stato creato con successo");
						removeRecordingStatus();
			
						//$('#appApio').find('.box_proprietaiPhone[issensor=\'true\']').each(function(index){
						$('#ApioApplicationContainer').find('.box_proprietaiPhone[issensor=\'true\']').each(function(index){
							var d = {
								isSensor : true,
								message : $(this).attr('id')+':'+scope.object.properties[$(this).attr('id')],
								objectId : scope.object.objectId
							}
							var e = $(this);
							console.log("POST /apio/serial/send");
							$http.post('/apio/serial/send',d)
								.success(function(data){
									console.log("Sensore notificato con successo")
								})
								.error(function(data){
									console.log("Impossibile notificare il sensore")
								})
			
						})
					}
				})
				.error(function(){
					alert("Si è verificato un errore di sistema");
				})
			}
		}
	};
}]);
