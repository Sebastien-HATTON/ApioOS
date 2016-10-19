var app = angular.module("ApioApplication13", ["apioProperty"]);
app.controller("defaultController", ["$scope", "currentObject", "$http", function ($scope, currentObject, $http) {
    $scope.object = currentObject.get();
    console.log("Sono il defaultController e l'oggetto è: ", $scope.object);
    $scope.reset = false;

    $scope.addNode = function () {
        $http.get("/apio/service/zwave/route/" + encodeURIComponent("/addNode")).success(function () {
        });
    };

    $scope.removeNode = function () {
        $http.get("/apio/service/zwave/route/" + encodeURIComponent("/removeNode")).success(function () {
        });
    };

    $scope.hardReset = function () {
        $scope.reset = true;
        $http.get("/apio/service/zwave/route/" + encodeURIComponent("/hardReset")).success(function () {
            $scope.reset = false;
        });
    };
}]);

setTimeout(function () {
    angular.bootstrap(document.getElementById("ApioApplication13"), ["ApioApplication13"]);
}, 10);