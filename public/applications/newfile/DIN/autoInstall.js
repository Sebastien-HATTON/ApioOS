var app = angular.module("AutoInstallModule", ["apioProperty", "hSweetAlert"]);
app.controller("defaultController", ["$scope", "currentObject", "$http", "sweet", "socket", function ($scope, currentObject, $http, sweet, socket) {
    socket.on("hide_modal", function () {
        $("#autoInstallModal").modal("hide");
    });

    var d = new Date();
    var n = d.toDateString();
    $scope.date = n;
    $("#autoInstallModal").modal();
    $scope.apply = function () {
        $("#autoInstallModal").modal("hide");
        $http.post("/apio/service/autoInstall/route/" + encodeURIComponent("/installNew") + "/data/" + encodeURIComponent(JSON.stringify({
                appId: "DIN8",
                data: {}
            }))).success(function () {
            sweet.show("Installata!", "Nuova applicazione installata con successo", "success");
            socket.emit("send_to_client", {message: "hide_modal"});
        });
    }
}]);

setTimeout(function () {
    angular.bootstrap(document.getElementById("AutoInstallModule"), ["AutoInstallModule"]);
}, 10);