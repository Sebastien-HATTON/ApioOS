angular.module("ApioDashboardApplication").controller("ApioDashboardNetworkSettingsController", ["$scope", "$http", "$window", "sweet", function ($scope, $http, $window, sweet) {
    $scope.apn = "";
    $scope.currentSsid = "";
    $scope.number = "";
    $scope.originalStatus = "";
    $scope.password = "";
    $scope.password3g = "";
    $scope.ssid = "";
    $scope.status = "";
    $scope.status3g = "";
    $scope.username = "";
    $scope.wifiSSIDs = [];
    $scope.wifiStatuses = ["client", "hotspot"];

    $scope.change3gSettings = function () {
        $http.post("/apio/3g/data", {
            apn: $scope.apn,
            number: $scope.number,
            username: $scope.username,
            password: $scope.password3g
        }).success(function () {
            if ($scope.status3g === "disabled") {
                sweet.show({
                    title: "Your 3G configuration data has been changed!",
                    text: "Wanna enable the service?",
                    type: "success",
                    cancelButtonText: "No",
                    closeOnCancel: true,
                    closeOnConfirm: false,
                    confirmButtonText: "Yes",
                    showCancelButton: true,
                    showLoaderOnConfirm: true
                }, function (isConfirm) {
                    if (isConfirm) {
                        $scope.enable3g();
                    }
                });
            }
        }).error(function (e) {
            sweet.show({
                title: "An error occurred while change your 3G configuration data",
                text: e,
                type: "error",
                closeOnConfirm: true,
                showCancelButton: false,
                showLoaderOnConfirm: true
            });
        });
    };

    $scope.enable3g = function () {
        $http.post("/apio/3g/status").success(function () {
            if ($scope.status3g === "disabled") {
                $scope.status3g = "enabled";
            } else if ($scope.status3g === "enabled") {
                $scope.status3g = "disabled";
            }

            if (!$scope.$$phase) {
                $scope.$apply();
            }

            sweet.show({
                title: "Your 3G has been enabled!",
                text: "A reboot is required, wanna proceed?",
                type: "success",
                cancelButtonText: "No",
                closeOnCancel: true,
                closeOnConfirm: true,
                confirmButtonText: "Yes",
                showCancelButton: true,
                showLoaderOnConfirm: true
            }, function (isConfirm) {
                if (isConfirm) {
                    setTimeout(function () {
                        $window.location = "/";
                    }, 50);
                    $http.post("/apio/rebootBoard").success();
                }
            });
        }).error(function (e) {
            sweet.show({
                title: "An error occurred while enabling 3G",
                text: e,
                type: "error",
                closeOnConfirm: true,
                showCancelButton: false,
                showLoaderOnConfirm: true
            });
        });
    };

    $scope.setAsClient = function () {
        $http.post("/apio/wifi/switchStatus", {
            status: $scope.status,
            ssid: $scope.ssid,
            password: $scope.password
        }).success(function () {
            sweet.show({
                title: "Your Wi-Fi has been set as client!",
                text: "A reboot is required, wanna proceed?",
                type: "success",
                cancelButtonText: "No",
                closeOnCancel: true,
                closeOnConfirm: true,
                confirmButtonText: "Yes",
                showCancelButton: true,
                showLoaderOnConfirm: true
            }, function (isConfirm) {
                if (isConfirm) {
                    setTimeout(function () {
                        $window.location = "/";
                    }, 50);
                    $http.post("/apio/rebootBoard").success();
                }
            });
        }).error(function (e) {
            sweet.show({
                title: "An error occurred while setting your Wi-Fi as client",
                text: e,
                type: "error",
                closeOnConfirm: true,
                showCancelButton: false,
                showLoaderOnConfirm: true
            });
        });
    };

    $scope.statusHasChanged = function () {
        if ($scope.status === "client") {
            $http.get("/apio/wifi/ssids").success(function (ssids) {
                $scope.wifiSSIDs = ssids;
                if (!$scope.$$phase) {
                    $scope.$apply();
                }
            }).error(function (error) {
                sweet.show({
                    title: "An error occurred while getting Wi-Fi SSIDs",
                    text: error,
                    type: "error",
                    closeOnConfirm: true,
                    showCancelButton: false,
                    showLoaderOnConfirm: true
                });
            });
            //} else if ($scope.status === "hotspot") {
        } else if ($scope.status !== $scope.originalStatus && $scope.status === "hotspot") {
            $http.post("/apio/wifi/switchStatus", {status: $scope.status}).success(function () {
                sweet.show({
                    title: "Your Wi-Fi has been set as hotspot!",
                    text: "A reboot is required, wanna proceed?",
                    type: "success",
                    cancelButtonText: "No",
                    closeOnCancel: true,
                    closeOnConfirm: true,
                    confirmButtonText: "Yes",
                    showCancelButton: true,
                    showLoaderOnConfirm: true
                }, function (isConfirm) {
                    if (isConfirm) {
                        setTimeout(function () {
                            $window.location = "/";
                        }, 50);
                        $http.post("/apio/rebootBoard").success();
                    }
                });
            }).error(function (e) {
                sweet.show({
                    title: "An error occurred while setting your Wi-Fi as hotspot",
                    text: e,
                    type: "error",
                    closeOnConfirm: true,
                    showCancelButton: false,
                    showLoaderOnConfirm: true
                });
            });
        }
    };

    $http.get("/apio/wifi/status").success(function (status) {
        $scope.originalStatus = $scope.status = status;
        if (!$scope.$$phase) {
            $scope.$apply();
        }

        if ($scope.status === "client") {
            $http.get("/apio/wifi/ssids").success(function (ssids) {
                $scope.wifiSSIDs = ssids;
                if (!$scope.$$phase) {
                    $scope.$apply();
                }
            }).error(function (error) {
                sweet.show({
                    title: "An error occurred while getting Wi-Fi SSIDs",
                    text: error,
                    type: "error",
                    closeOnConfirm: true,
                    showCancelButton: false,
                    showLoaderOnConfirm: true
                });
            });

            $http.get("/apio/wifi/currentSsid").success(function (ssid) {
                $scope.currentSsid = ssid;
                if (!$scope.$$phase) {
                    $scope.$apply();
                }
            }).error(function (error) {
                sweet.show({
                    title: "An error occurred while getting current Wi-Fi SSID",
                    text: error,
                    type: "error",
                    closeOnConfirm: true,
                    showCancelButton: false,
                    showLoaderOnConfirm: true
                });
            });
        }
    }).error(function (error) {
        sweet.show({
            title: "Error while getting Wi-Fi status",
            text: error,
            type: "error",
            closeOnConfirm: true,
            showCancelButton: false,
            showLoaderOnConfirm: true
        });
    });

    $http.get("/apio/3g/status").success(function (status) {
        $scope.status3g = status;
        if (!$scope.$$phase) {
            $scope.$apply();
        }
    }).error(function (error) {
        sweet.show({
            title: "Error while getting 3G status",
            text: error,
            type: "error",
            closeOnConfirm: true,
            showCancelButton: false,
            showLoaderOnConfirm: true
        });
    });

    $http.get("/apio/3g/data").success(function (data) {
        $scope.apn = data.apn;
        $scope.number = data.number;
        $scope.password3g = data.password;
        $scope.username = data.username;
        if (!$scope.$$phase) {
            $scope.$apply();
        }
    }).error(function (error) {
        sweet.show({
            title: "Error while getting 3G data",
            text: error,
            type: "error",
            closeOnConfirm: true,
            showCancelButton: false,
            showLoaderOnConfirm: true
        });
    });
}]);