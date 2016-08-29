angular.module('ApioDashboardApplication').controller('ApioDashboardCloudSettingsController', ['$scope', 'sweet', 'userService', 'objectService', '$http', 'socket', '$location', function ($scope, sweet, userService, objectService, $http, socket, $location) {
    //var socketCloud;

    $scope.platform = {};
    $scope.settingsCloud = false;
    $scope.settingsGateway = false;
    $scope.getPlatform = function () {
        $http.get('/apio/getPlatform').success(function (data) {
            //console.log(data);
            //alert(data.type);
            //alert(data.apioId);
            $scope.platform = data;
            if (data.type == "cloud") $scope.settingsCloud = true;
            else if (data.type == "gateway") {
                $scope.settingsGateway = true;
                //$http.get('/apio/getService/cloud').success(function (data) {
                //    socketCloud = io.connect("http://" + $location.host() + ":" + data.port);
                //})
            }
        });
    };
    $scope.getPlatform();
    $scope.users = [];
    //BEGIN:CLOUD
    $scope.boards = [];
    //END:CLOUD
    $http.get('/apio/user')
        .success(function (data) {
            $scope.users = data.users;
        })
    $scope.enableUserOnTheCloud = function (user) {
        //Qui devo fare una chiamata alla board che fa una chiamata al cloud
        $http
            .post('/apio/user/setCloudAccess', {
                user: user,
                cloudAccess: true
            })
            .success(function (data) {
                if (data.status == true) {
                    user.enableCloud = true;
                } else {
                    alert("An error has occurred (status:false)")
                }
            })
            .error(function () {
                alert("An error has occurred")
            })
    }

    $scope.disableUserOnTheCloud = function (user) {
        $http
            .post('/apio/user/setCloudAccess', {
                user: user,
                cloudAccess: false
            })
            .success(function (data) {
                if (data.status == true) {
                    user.enableCloud = true;
                } else {
                    alert("An error has occurred (status:false)")
                }
            })
            .error(function () {
                alert("An error has occurred")
            })
    }
    $scope.syncCloud = function () {
        var o = {}
        //socketCloud.emit("syncRequest", o)
        socket.emit("send_to_service", {message: "syncRequest", data: o, service: "cloud"});
    };
    //BEGIN:CLOUD
    $http.get("/apio/boards").success(function (data) {
        $scope.boards = data;
    });
    $scope.disableBoardOnTheCloud = function (id) {
        $http.post("/apio/user/allowCloud", {
            boardId: id,
            permission: false
        }).success(function () {
            $http.get("/apio/boards").success(function (data) {
                $scope.boards = data;
            });
        }).error(function () {
            alert("An error occurred while enabling the board");
        });
    };
    $scope.enableBoardOnTheCloud = function (id) {
        $http.post("/apio/user/allowCloud", {
            boardId: id,
            permission: true
        }).success(function () {
            $http.get("/apio/boards").success(function (data) {
                $scope.boards = data;
            });
        }).error(function () {
            alert("An error occurred while enabling the board");
        });
    };
    $scope.isBoardEnabled = function (id) {
        for (var i in $scope.boards) {
            if ($scope.boards[i].apioId === id) {
                return true;
            }
        }
        return false;
    };
    //END:CLOUD	


}]);
