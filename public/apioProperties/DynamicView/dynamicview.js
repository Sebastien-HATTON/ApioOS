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
	    	//
	    	
            scope.$on('propertyUpdate',function() {
            	scope.object = currentObject.get();
			});
			
            var event = attrs["event"] ? attrs["event"] : "mousedown touchstart";
	    	elem.on(event, function(){
				if(!currentObject.isRecording()){
					//Carimento della subapp
					var uri = attrs["load"] ? attrs["load"] : "applications/"+scope.object.objectId+"/subapps/"+attrs["propertyname"]+".html";
					$.get(uri, function(data){
						var old_transformW = $("#appApio").css("-webkit-transform");
						var matrixW = new WebKitCSSMatrix(old_transformW);
						var old_translateW = matrixW.m41;
						
						var old_transform = $("#appApio").css("transform");
						var matrix = new WebKitCSSMatrix(old_transform);
						var old_translate = matrix.m41;
						
						var app = $(elem).parent().parent().parent();
						Apio.newWidth += Apio.appWidth;
						$("#appApio").css("width", Apio.newWidth+"px");
						$("#ApioApplication"+scope.object.objectId).css("width", Apio.appWidth+"px");
						$("#ApioApplication"+scope.object.objectId).css("float", "left");
				        app.css("overflowX", "auto");
						
						var subapp = attrs["propertyname"].charAt(0).toUpperCase() + attrs["propertyname"].slice(1);
					    $("#appApio").append($(data));
					    $("#ApioApplication"+subapp).css("width", Apio.appWidth+"px");
					    $("#ApioApplication"+subapp).css("float", "left");
					    var new_translate = -8*Apio.newWidth/15+453;
					    $("#appApio").css("-webkit-transform", "translateX("+new_translate+"%)");
					    $("#appApio").css("transform", "translateX("+new_translate+"%)");
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