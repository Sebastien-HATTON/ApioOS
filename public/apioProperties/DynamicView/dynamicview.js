// così si crea la dipendenza di un file esterno con un app già istanziata
var apioProperty = angular.module("apioProperty");
apioProperty.directive("dynamicview", ["currentObject", "socket", "$timeout", function(currentObject, socket, $timeout){
	return{
	    restrict: "E",
	    replace: true,
	    scope: {
	    	changeExpr: "@ngChange",
	    	model: "=propertyname"
	    },
	    templateUrl: "apioProperties/DynamicView/dynamicview.html",
	    link: function(scope, elem, attrs){
	    	scope.object = currentObject.get();
	    	scope.currentObject = currentObject;
	    	//Inizializzo la proprietà con i dati memorizzati nel DB
	    	scope.label = attrs["label"];
	    	scope.model = scope.object.properties[attrs["propertyname"]];
	    	scope.propertyname = attrs["propertyname"];
	    	scope.anchor = attrs.hasOwnProperty('anchor') ? attrs['anchor'] : '>';
	    	
            scope.$on('propertyUpdate',function() {
            	scope.object = currentObject.get();
			});
			
            var event = attrs["event"] ? attrs["event"] : "mousedown touchstart";
	    	elem.on(event, function(){
				if(!currentObject.isRecording()){
					//Carimento della subapp
					var uri = attrs["load"] ? attrs["load"] : "applications/"+scope.object.objectId+"/subapps/"+attrs["propertyname"]+".html";
					$.get(uri, function(data){
                        if(attrs["load"]){
                            var loadComponents = attrs["load"].split("/");
                            var app = loadComponents[loadComponents.length - 1];
                            var appComponents = app.split(".");
                            var application = appComponents[0];
                            var subapp = application.charAt(0).toUpperCase() + application.slice(1);
                        }
                        else{
                            var subapp = attrs["propertyname"].charAt(0).toUpperCase() + attrs["propertyname"].slice(1);
                        }

                        $("#ApioApplicationContainer").append($(data));
                        $("#ApioApplication"+subapp).css("height", ""+$("#ApioApplicationContainer").children().eq(1).css("height"));
                        $("#ApioApplication"+subapp).css("margin-top", "-"+$("#ApioApplicationContainer").children().eq(1).css("height"));
                        $("#ApioApplication"+subapp).show("slide", {
                            direction: 'right'
                        }, 500);
                    });
					//
					
					//Se è stata definita una correlazione da parte dell'utente la eseguo
					if(attrs["correlation"]){
						scope.$parent.$eval(attrs["correlation"]);
					}
					//
					
					//Esegue codice javascript contenuto nei tag angular
					scope.$apply();
					//
				}
			});
			

		}
	};
}]);