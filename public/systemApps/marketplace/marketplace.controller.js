var app = angular.module('marketplace', ['apioProperty', 'hSweetAlert'])
app.controller('defaultController',['$scope', '$http', 'currentObject', '$location', '$window', 'sweet', '$timeout', function($scope, $http, currentObject, $location, $window, sweet, $timeout){
	$scope.MarketplaceServer = 'http://apio.cloudapp.net:8085';
	console.log("Sono il defaultController e l'oggetto è");
	console.log(currentObject.get());
	$scope.objects = {};
  $scope.promise = $http.get($scope.MarketplaceServer+'/marketplace/database/getApplications/gateway').then(function(response){
    $scope.objects = response.data;
    console.log($scope.objects);
    return response;
  });


  document.getElementById("ApioApplicationContainer").classList.add("fullscreen");
	/**
	* [myCustomListener description]
	* @return {[type]} [description]
	*/
	$scope.myCustomListener = function() {



	}

	$scope.returnBack = function() {
		document.getElementById("apioWaitLoading").classList.remove("apioWaitLoadingOff");
		document.getElementById("apioWaitLoading").classList.add("apioWaitLoadingOn");
		//$("#ApioApplicationContainer").hide("slide", {direction: 'right'}, 500, function () {
		$("#ApioApplicationContainer").hide(500, function () {
				Apio.newWidth = Apio.appWidth;
				$("#ApioApplicationContainer").css("width", Apio.appWidth + "px");
				if (window.innerWidth > 769) {
						$("#ApioIconsContainer").css("width", "100%");
				}
				document.getElementById("ApioApplicationContainer").classList.remove("fullscreen");

				document.getElementById("ApioIconsContainer").style.display = "block";
				if(window.innerWidth < 768){
						document.getElementById("apioMenuMobile").style.display = "block";
				} else {
						document.getElementById("apioMenu").style.display = "block";
				}
				Apio.currentApplication = 0;

				$timeout(function(){
					document.getElementById("apioWaitLoading").classList.remove("apioWaitLoadingOn");
					document.getElementById("apioWaitLoading").classList.add("apioWaitLoadingOff");
				}, 250);

				$location.path("/home");
				$scope.$parent.$apply();
		});
	};

  $scope.downloadApp = function(name) {
    //POST con il JSON
		document.getElementById("apioWaitLoading").classList.remove("apioWaitLoadingOff");
		document.getElementById("apioWaitLoading").classList.add("apioWaitLoadingOn");
		$scope.flag = true;
    $scope.promise = $http.get('/marketplace/applications/download/'+name)
		console.log("Ciao ho mandato la richiesta");

		$scope.promise.then(function(response){
			document.getElementById("apioWaitLoading").classList.remove("apioWaitLoadingOn");
			document.getElementById("apioWaitLoading").classList.add("apioWaitLoadingOff");


			console.log("La richiesta s'è morta");
			$scope.flag = false;
      sweet.show({
  	        title: "Installed!.",
  	        text: "Your new app is available!",
  	        type: "success",
  	        showCancelButton: true,
  	        confirmButtonClass: "btn-warning",
  	        cancelButtonClass: "btn-info",
  	        confirmButtonText: "Go to Home",
  	        cancelButtonText: "Stay on Marketplace",
  	        closeOnConfirm: true,
  	        closeOnCancel: true
  	      }, function(isConfirm) {
            if(isConfirm){
              $("#ApioApplicationContainer").hide("slide", {direction: 'right'}, 500, function () {
                  Apio.newWidth = Apio.appWidth;
                  $("#ApioApplicationContainer").css("width", Apio.appWidth + "px");
                  if (window.innerWidth > 769) {
                      $("#ApioIconsContainer").css("width", "100%");
                  }
                  document.getElementById("ApioApplicationContainer").classList.remove("fullscreen");

                  document.getElementById("ApioIconsContainer").style.display = "block";
                  if(window.innerWidth < 768){
                      document.getElementById("apioMenuMobile").style.display = "block";
                  } else {
                      document.getElementById("apioMenu").style.display = "block";
                  }
                  Apio.currentApplication = 0;
                  $location.path("/home");
                  $scope.$parent.$apply();
              });

            }

          });
      //return response;
    });
    //$location.path("/home");
  }

}]);

	setTimeout(function(){
		angular.bootstrap(document.getElementById('marketplace'), ['marketplace']);
	},10);
