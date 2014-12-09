angular.module('ApioDashboardApplication')
.controller('ApioDashboardStatesController', ['$scope', '$http', function($scope,$http){
	
	$scope.states = [];
    
    $scope.newState = {
      properties : []
    };

    $scope.newTriggeredState = '';

    $scope.initApioDashboardState = function() {
	    //Carico gli stati
	    $http.get('/apio/state')
	      .success(function(data){
	          $scope.states = data;
	    })
	};

	$scope.initApioDashboardState();

	$scope.saveState = function() {

	}

	$scope.applyState = function(state) {

      socket.emit('apio_client_state',state)
      /*
      $http.get('/apio/state/apply',{
        params: {
          stateName : name
        }
      })
      .success(function(data,status,header){
        alert("Stato applicato con successo");
      })
      .error(function(data,status,header){
        alert("Errore nell'applicazione")
      })
	*/
    }
}]);