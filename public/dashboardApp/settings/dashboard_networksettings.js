angular.module("ApioDashboardApplication").controller("ApioDashboardNetworkSettingsController", ["$scope", "$http", "$window", "sweet", function ($scope, $http, $window, sweet) {
    $scope.apn = "";
    $scope.change_hotspot_name = true;
    $scope.clientNextReboot = false;
    $scope.currentSsid = "";
    $scope.hide_change_button = false;
    $scope.hotspotNameSaved = false;
    $scope.number = "";
    $scope.originalStatus = "";
    $scope.password = "";
    $scope.password3g = "";
    $scope.ssid = "";
    $scope.status = "";
    $scope.status3g = "";
    $scope.update_setting_success = false;
    $scope.username = "";
    $scope.wifiSSIDs = [];
    $scope.wifiStatuses = ["client", "hotspot"];

    $scope.backHotspotName = function () {
        $scope.change_hotspot_name = true;
        $scope.hide_change_button = false;
        $scope.hotspotNameSaved = false;
        $scope.hotspot_name = $scope.last_hotspot_name;
    };

    $scope.change3gSettings = function () {
        $http.post("/apio/service/networking/route/" + encodeURIComponent("/apio/3g/data") + "/data/" + encodeURIComponent(JSON.stringify({
                apn: $scope.apn,
                number: $scope.number,
                username: $scope.username,
                password: $scope.password3g
            }))).success(function () {
            console.log("$scope.status3g: ", $scope.status3g);
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

    $scope.changeHotspotName = function () {
        $scope.hide_change_button = true;
        $scope.change_hotspot_name = false;
    };

    $scope.enable3g = function () {
        $http.post("/apio/service/networking/route/" + encodeURIComponent("/apio/3g/status") + "/data/" + encodeURIComponent(JSON.stringify({}))).success(function () {
            if ($scope.status3g === "disabled") {
                $scope.status3g = "enabled";
            } else if ($scope.status3g === "enabled") {
                $scope.status3g = "disabled";
            }

            if (!$scope.$$phase) {
                $scope.$apply();
            }

            sweet.show({
                title: "Your 3G has been " + $scope.status3g + "!",
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
                    $http.post("/apio/rebootBoard").success();
                    $window.location = "app#/home?clear=true";
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

    $scope.restart3g = function () {
        $http.post("/apio/service/networking/route/" + encodeURIComponent("/apio/3g/restart") + "/data/" + encodeURIComponent(JSON.stringify({}))).success(function () {
            sweet.show({
                title: "Service 3g has been restarted!",
                type: "success",
                closeOnCancel: true,
                closeOnConfirm: true,
                showCancelButton: false,
                showLoaderOnConfirm: true
            });
        }).error(function (e) {
            sweet.show({
                title: "An error occurred while restarting the hotspot name",
                text: e,
                type: "error",
                closeOnConfirm: true,
                showCancelButton: false,
                showLoaderOnConfirm: true
            });
        });
    };

    $scope.runstop3g = function () {
        $http.post("/apio/service/networking/route/" + encodeURIComponent("/apio/3g/run") + "/data/" + encodeURIComponent(JSON.stringify({
                start: $scope.is3gRunning === "dead"
            }))).success(function () {
            $scope.is3gRunning = $scope.is3gRunning === "dead" ? "active" : "dead";
            if (!$scope.$$phase) {
                $scope.$apply();
            }

            sweet.show({
                title: "Service 3g has been " + ($scope.is3gRunning === "active" ? "started" : "stopped") + "!",
                type: "success",
                closeOnCancel: true,
                closeOnConfirm: true,
                showCancelButton: false,
                showLoaderOnConfirm: true
            });
        }).error(function (e) {
            sweet.show({
                title: "An error occurred while " + ($scope.is3gRunning === "dead" ? "starting" : "stopping") + " the hotspot name",
                text: e,
                type: "error",
                closeOnConfirm: true,
                showCancelButton: false,
                showLoaderOnConfirm: true
            });
        });
    };

    $scope.saveHotspotName = function () {
        $http.post("/apio/service/networking/route/" + encodeURIComponent("/apio/hotspot/name") + "/data/" + encodeURIComponent(JSON.stringify({
                hotspot: $scope.hotspot_name
            }))).success(function () {
            $scope.change_hotspot_name = true;
            $scope.hide_change_button = false;
            $scope.hotspotNameSaved = false;
            $scope.last_hotspot_name = $scope.hotspot_name;
            $scope.hotspotNameSaved = true;
            setTimeout(function () {
                $scope.hotspotNameSaved = false;
                if (!$scope.$$phase) {
                    $scope.$apply();
                }
            }, 1900);

            sweet.show({
                title: "The name of the Hotspot has been changed!",
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
                    $http.post("/apio/rebootBoard").success();
                    $window.location = "app#/home?clear=true";
                }
            });
        }).error(function (e) {
            sweet.show({
                title: "An error occurred while setting the hotspot name",
                text: e,
                type: "error",
                closeOnConfirm: true,
                showCancelButton: false,
                showLoaderOnConfirm: true
            });
        });
    };

    $scope.setAsClient = function () {
        $http.post("/apio/service/networking/route/" + encodeURIComponent("/apio/wifi/switchStatus") + "/data/" + encodeURIComponent(JSON.stringify({
                status: $scope.status,
                ssid: $scope.ssid,
                password: $scope.password
            }))).success(function () {
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
                    $http.post("/apio/rebootBoard").success();
                    $window.location = "app#/home?clear=true";
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
            $http.get("/apio/service/networking/route/" + encodeURIComponent("/apio/wifi/ssids")).success(function (ssids) {
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
        } else if ($scope.status !== $scope.originalStatus && $scope.status === "hotspot") {
            $http.post("/apio/service/networking/route/" + encodeURIComponent("/apio/wifi/switchStatus") + "/data/" + encodeURIComponent(JSON.stringify({status: $scope.status}))).success(function () {
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
                        $http.post("/apio/rebootBoard").success();
                        $window.location = "app#/home?clear=true";
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

    $http.get("/apio/service/networking/route/" + encodeURIComponent("/apio/wifi/status")).success(function (status) {
        $scope.originalStatus = $scope.status = status;
        if (!$scope.$$phase) {
            $scope.$apply();
        }

        if ($scope.status === "client") {
            $http.get("/apio/service/networking/route/" + encodeURIComponent("/apio/wifi/ssids")).success(function (ssids) {
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

            $http.get("/apio/service/networking/route/" + encodeURIComponent("/apio/wifi/currentSsid")).success(function (ssid) {
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

    // $http.get("/apio/service/networking/route/" + encodeURIComponent("/apio/3g/status")).success(function (status) {
    //     $scope.status3g = status;
    //     if (!$scope.$$phase) {
    //         $scope.$apply();
    //     }
    // }).error(function (error) {
    //     sweet.show({
    //         title: "Error while getting 3G status",
    //         text: error,
    //         type: "error",
    //         closeOnConfirm: true,
    //         showCancelButton: false,
    //         showLoaderOnConfirm: true
    //     });
    // });

    $http.get("/apio/service/networking/route/" + encodeURIComponent("/apio/3g/data")).success(function (data) {
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

    $http.get("/apio/service/networking/route/" + encodeURIComponent("/apio/hotspot/name")).success(function (data) {
        $scope.last_hotspot_name = $scope.hotspot_name = data;
        if (!$scope.$$phase) {
            $scope.$apply();
        }
    }).error(function (error) {
        sweet.show({
            title: "Error while getting Hotspot name",
            text: error,
            type: "error",
            closeOnConfirm: true,
            showCancelButton: false,
            showLoaderOnConfirm: true
        });
    });

    // $http.get("/apio/service/networking/route/" + encodeURIComponent("/apio/3g/run")).success(function (data) {
    //     $scope.is3gRunning = data;
    //     if (!$scope.$$phase) {
    //         $scope.$apply();
    //     }
    // }).error(function (error) {
    //     sweet.show({
    //         title: "Error while getting if 3g is running or not",
    //         text: error,
    //         type: "error",
    //         closeOnConfirm: true,
    //         showCancelButton: false,
    //         showLoaderOnConfirm: true
    //     });
    // });
}]);