angular.module("ApioDashboardApplication").controller("ApioDashboardSystemController", ["$scope", "sweet", "$http", "$window", function ($scope, sweet, $http, $window) {
    var showMsg = function (data) {
        if (data.type === 0) {
            sweet.show(data.msg, "", "info");
        } else if (data.type === 1) {
            sweet.show({
                title: "Update successfully installed!",
                text: data.msg,
                type: "warning",
                cancelButtonText: "No",
                closeOnCancel: true,
                closeOnConfirm: true,
                confirmButtonText: "Yes",
                showCancelButton: true,
                showLoaderOnConfirm: true
            }, function (isConfirm) {
                if (isConfirm) {
                    $scope.restartSystem();
                }
            });
        }
    };

    $scope.cloudStatus = "";

    $scope.gitParams = {
        pwd: "",
        user: ""
    };

    $scope.isPrivate = false;

    $scope.enableRemoteAccess = function () {
        sweet.show({
            title: "Are you sure?",
            text: "Once installed this service could not be removed, wanna proceed?",
            type: "warning",
            cancelButtonText: "No",
            closeOnCancel: true,
            closeOnConfirm: true,
            confirmButtonText: "Yes",
            showCancelButton: true,
            showLoaderOnConfirm: true
        }, function (isConfirm) {
            if (isConfirm) {
                $http.post("/apio/ngrok/install").success(function (address) {
                    $scope.$parent.remoteAddr = address;

                    if (!$scope.$$phase) {
                        $scope.$apply();
                    }
                }).error(function (error) {
                    console.log("Error while installing ngrok: ", error);
                });
            }
        });
    };

    $scope.rebootBoard = function () {
        if ($scope.config.type === "gateway") {
            sweet.show({
                title: "Board is rebooting",
                text: "It will be on-line in a while, please wait",
                type: "success",
                closeOnConfirm: true,
                showCancelButton: false,
                showLoaderOnConfirm: true
            }, function (isConfirm) {
                if (isConfirm) {
                    $http.post("/apio/rebootBoard").success();
                    $window.location = "app#/home?clear=true";
                }
            });
        } else if ($scope.config.type === "cloud") {
            sweet.show({
                title: "Board is rebooting",
                text: "You'll be redirect to the home screen",
                type: "success",
                closeOnConfirm: true,
                showCancelButton: false,
                showLoaderOnConfirm: true
            }, function (isConfirm) {
                if (isConfirm) {
                    $http.post("/apio/rebootBoard").success();
                    $window.location = "app#/home";
                }
            });
        }
    };

    $scope.restartSystem = function () {
        if ($scope.config.type === "gateway") {
            sweet.show({
                title: "System is restarting",
                text: "It will be on-line in a while, please wait",
                type: "success",
                closeOnConfirm: true,
                showCancelButton: false,
                showLoaderOnConfirm: true
            }, function (isConfirm) {
                if (isConfirm) {
                    $http.post("/apio/restartSystem").success();
                    $window.location = "app#/home?clear=true";
                }
            });
        } else if ($scope.config.type === "cloud") {
            sweet.show({
                title: "System is restarting",
                text: "You'll be redirect to the home screen",
                type: "success",
                closeOnConfirm: true,
                showCancelButton: false,
                showLoaderOnConfirm: true
            }, function (isConfirm) {
                if (isConfirm) {
                    $http.post("/apio/restartSystem").success();
                    $window.location = "app#/home";
                }
            });
        }
    };

    $scope.shutdownBoard = function () {
        if ($scope.config.type === "gateway") {
            sweet.show({
                title: "Board is shutting down",
                text: "Please wait",
                type: "success",
                closeOnConfirm: true,
                showCancelButton: false,
                showLoaderOnConfirm: true
            }, function (isConfirm) {
                if (isConfirm) {
                    $http.post("/apio/shutdownBoard").success();
                    $window.location = "app#/home?clear=true";
                }
            });
        } else if ($scope.config.type === "cloud") {
            sweet.show({
                title: "Board is shutting down",
                text: "You'll be redirect to the home screen",
                type: "success",
                closeOnConfirm: true,
                showCancelButton: false,
                showLoaderOnConfirm: true
            }, function (isConfirm) {
                if (isConfirm) {
                    $http.post("/apio/shutdownBoard").success();
                    $window.location = "app#/home";
                }
            });
        }
    };

    $scope.toggleEnableCloud = function () {
        $http.post("/apio/configuration/toggleEnableCloud").success(function () {
            $scope.cloudStatus = $scope.cloudStatus === "Disable" ? "Enable" : "Disable";
        }).error(function (error) {
            console.log("Error while toggling cloud access: ", error);
        });
    };

    $scope.updateSystem = function () {
        if ($scope.isPrivate) {
            $http.post("/apio/service/githubUpdate/route/" + encodeURIComponent("/apio/git/update") + "/data/" + encodeURIComponent(JSON.stringify({
                    pwd: $scope.gitParams.pwd,
                    user: $scope.gitParams.user
                }))).success(function (data) {
                showMsg(data);
            }).error(function (err) {
                sweet.show("An error occured", "", "error");
            });
        } else {
            $http.post("/apio/service/githubUpdate/route/" + encodeURIComponent("/apio/git/update") + "/data/" + encodeURIComponent(JSON.stringify({}))).success(function (data) {
                showMsg(data);
            }).error(function (err) {
                sweet.show("An error occured", "", "error");
            });
        }
    };

    $http.get("/apio/configuration/return").success(function (config) {
        $scope.config = config;
    });

    $http.get("/apio/user/getSessionComplete").success(function (session) {
        $scope.session = session;

        if ($scope.session.priviligies === "superAdmin") {
            $http.get("/apio/user").success(function (users) {
                users = users.users;
                var superAdminFound = false;
                for (var i = 0; i < users.length; i++) {
                    if (users[i] && users[i].email && validator.isEmail(users[i].email) && users[i].role === "superAdmin") {
                        superAdminFound = true;
                    }
                }

                if (superAdminFound) {
                    $http.get("/apio/configuration/return").success(function (config) {
                        if (config.remote.enabled === true) {
                            $scope.cloudStatus = "Disable";
                        } else if (config.remote.enabled === false) {
                            $scope.cloudStatus = "Enable";
                        }

                        if (config.remoteAccess === true) {
                            $scope.remoteAccessAlreadyEnabled = true;
                        }
                    });
                }
            });
        }
    });
}]);