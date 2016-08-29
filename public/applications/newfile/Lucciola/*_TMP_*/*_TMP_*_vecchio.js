var app = angular.module("ApioApplication*_TMP_*", ["apioProperty"]);
app.controller("defaultController", ["$scope", "currentObject", "socket", "$http", function ($scope, currentObject, socket, $http) {
    console.log("Sono il defaultController e l'oggetto è");
    console.log(currentObject.get());
    $scope.object = currentObject.get();

    $scope.listener = function (property) {
        currentObject.update(property, $scope.object.properties[property]);
        $http.post("/apio/object/updateLog", {
            object: {
                data: {
                    onoff: $scope.object.properties.onoff,
                    onoff1: $scope.object.properties.onoff1,
                    x: $scope.object.properties.x,
                    y: $scope.object.properties.y,
                    buzzer: $scope.object.properties.buzzer
                },
                objectId: $scope.object.objectId
            }
        }).success(function (data) {
            console.log("Logs successfully updated", data);
        }).error(function (error) {
            console.log("Unable to update log: ", error);
        });
    };
}]);

setTimeout(function () {
    angular.bootstrap(document.getElementById("ApioApplication*_TMP_*"), ["ApioApplication*_TMP_*"]);
}, 10);
