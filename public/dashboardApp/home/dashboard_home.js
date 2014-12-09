angular.module('ApioDashboardApplication')
.controller('ApioDashboardHomeController', ['$scope','socket', function($scope,$socket){
	$scope.writeToDatabase = false;
  	$scope.writeToSerial = false;
	$scope.sendEncodedString = function() {
		var o = Apio.Util.ApioToJSON($scope.encodedString);
		o.writeToDatabase = $scope.writeToDatabase;
		o.writeToSerial = $scope.writeToSerial;
		Apio.socket.emit('apio_client_update',o);
	}
}]);