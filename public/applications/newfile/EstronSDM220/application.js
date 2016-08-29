var app = angular.module("ApioApplication_TMP_", ["apioProperty"]);
app.controller("defaultController", ["$scope", "currentObject", "socket", "$http", "$location", "$timeout", function ($scope, currentObject, socket, $http, $location, $timeout) {
    console.log("Sono il defaultController e l'oggetto è");
    console.log(currentObject.get());
    $scope.object = currentObject.get();

    $scope.$on("$destroy", function () {
        console.log("ENERGY METER DESTROY");
    });

    var d = new Date(), day = 10, month = 11, year = 2015, graphicsData = [], timestampArr = [];
   
}]);

setTimeout(function () {
    angular.bootstrap(document.getElementById("ApioApplication_TMP_"), ["ApioApplication_TMP_"]);
}, 10);