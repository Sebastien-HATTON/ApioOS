var apioProperty = angular.module("apioProperty");
apioProperty.directive("property", ["currentObject", "socket", function(currentObject, socket){
	return{
	    restrict: "E",
	    transclude: true,
	    scope: {},
	    templateUrl: "apioProperties/Property/property.html",
	    link: function(scope, elem, attrs, controller){
		    var inputElement = $(elem).find("[propertyinput]");
	    	scope.object = currentObject.get();
	    	scope.currentObject = currentObject;
	    	scope.isRecorded = function() {
	    		return scope.currentObject.record(attrs['propertyname']);
	    	}
	    	scope.addPropertyToRecording = function($event) {
	    		$event.stopPropagation();
	    		scope.currentObject.record(attrs['propertyname'], inputElement.val());
	    	}
	    	scope.removePropertyFromRecording = function($event) {
	    		$event.stopPropagation();
	    		scope.currentObject.removeFromRecord(attrs['propertyname']);
	    	}	    	
	    	//Serve per il cloud: aggiorna in tempo reale il valore di una proprietà che è stata modificata da un"altro utente
	    	socket.on("apio_server_update", function(data){
				if(data.objectId === scope.object.objectId && !currentObject.isRecording()){
					if(data.properties.hasOwnProperty(attrs["propertyname"])){
						//Se è stata definita una funzione di push viene chiama questa altrimenti vengono fatti i settaggi predefiniti
						if(attrs["push"]){
							scope.$parent.$eval(attrs["push"]);
							$property = {
								name : attrs["propertyname"],
								value : data.properties[attrs["propertyname"]]
							}
							var fn = scope.$parent[attrs["push"]];
							if(typeof fn === "function"){
								var params = [$property];
								fn.apply(scope.$parent,params);
							}
							else {
								throw new Error("The Push attribute must be a function name present in scope")
							}
						}
						//

						//In particolare questa parte aggiorna il cloud nel caso siano state definite delle correlazioni
						if(attrs["correlation"]){
							scope.$parent.$eval(attrs["correlation"]);
						}
						//
					}
				}
			});
			
			socket.on("apio_server_update_", function(data){
				if(data.objectId === scope.object.objectId  && !scope.currentObject.isRecording()){
					scope.model = data.properties[attrs["propertyname"]];
				}
			});
			
			scope.$on('propertyUpdate',function(){
				scope.object = currentObject.get();
				inputElement.val(scope.object.properties[attrs["propertyname"]]);
			});
			
	    	//Inizializzo la proprietà con i dati memorizzati nel DB
	    	scope.label = attrs["label"];
	    	inputElement.val(scope.object.properties[attrs["propertyname"]]);
	    	scope.propertyname = attrs["propertyname"];
	    	//
	    	
            var event = attrs["event"] ? attrs["event"] : "click tap";
	    	elem.on(event, function(){
				//Aggiorna lo scope globale con il valore che è stato modificato nel template
				scope.object.properties[attrs["propertyname"]] = inputElement.val();
				
				if(!currentObject.isRecording()){
					//Se è stato definito un listener da parte dell'utente lo eseguo altrimenti richiamo currentObject.update che invia i dati al DB e alla seriale
					if(attrs["listener"]){
						scope.$parent.$eval(attrs["listener"]);
					}
					//
					
					//Se è stata definita una correlazione da parte dell'utente la eseguo
					if(attrs["correlation"]){
						scope.$parent.$eval(attrs["correlation"]);
					}
					//
				}
				//Esegue codice javascript contenuto nei tag angular
				scope.$apply();
				//
			});
		}
	};
}]);
