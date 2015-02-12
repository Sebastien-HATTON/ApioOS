angular.module('ApioDashboardApplication')
.controller('ApioDashboardEventsController', ['$scope', '$http', function($scope,$http){
	 $scope.events = [];

	 $scope.initApioDashboardEvents = function() {
	    //Carico gli eventi
	    $http.get('/apio/event')
	          .success(function(data){
	            $scope.events = data;
	    });
	};

	$scope.initApioDashboardEvents();

	$scope.addTriggeredState = function() {
	  	console.log("Aggiungo "+$scope.newTriggeredState)
	  	$scope.event.triggeredStates.push($scope.newTriggeredState);
	  	$scope.newTriggeredState = '';
	};

	$scope.saveEvent = function() {
	  	var event_data = $scope.event;
	  	$http({
	  		method : 'POST',
	  		url : '/apio/event',
	  		data : {event : event_data}
	  	})
	  	.success(function(data,status,header){
	  		console.log('/apio/event/state success()');
	  		$scope.event = {};
	  		alert("Event saved")
	  	})
	  	.error(function(data,status,header){
	  		console.log('/apio/event/state success()');
	  	})

	};

	$scope.launchEvent = function(e) {
      console.log(e);
      $http.get('/apio/event/launch',{
        params : {
          eventName : e.name
        }
      })
      .success(function(data,status,header){
        alert("Evento lanciato correttamente")
      })
      .error(function(data,status,header){
        alert("Evento non lanciato")
      })
    };
}]);