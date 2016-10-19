angular.module("ApioDashboardApplication").controller("ApioDashboardDongleSettingsController", ["$rootScope", "$scope", "sweet", "userService", "objectService", "$http", "socket", "$window", function ($rootScope, $scope, sweet, userService, objectService, $http, socket, $window) {
    // socket.on("dongle_update", function (data) {
    //     $rootScope.$emit("terminal.dongle.echo", data)
    // });

    $window.onbeforeunload = function () {
        var xhttp = new XMLHttpRequest();
        xhttp.open("POST", "/apio/service/dongle/route/" + encodeURIComponent("/apio/dongle/triggerConsole") + "/data/" + encodeURIComponent(JSON.stringify({
                data: false
            })), false);
        xhttp.send();
    };

    $http.get("/apio/user/getSessionComplete").success(function (session) {
        $scope.session = session;
    });

    socket.on("dongle_onoff_update", function (data) {
        if ($scope.session.apioId === data.apioId) {
            $scope.active = data.value;
        }
    });

    socket.on("dongle_settings_changed", function (data) {
        if ($scope.session.apioId === data.apioId) {
            $scope.currentFirmwareVersion = data.value.firmwareVersion;
            $scope.currentPanId = data.value.panId;
            $scope.currentDataRate = data.value.dataRate;
        }
    });

    socket.on("dongle_settings", function (data) {
        $scope.currentPanId = data.panId;
    });

    $scope.selected = 1;
    $scope.first = true;
    // $scope.active = true;
    $scope.currentDataRate = "3";
    $scope.launchSection = function (value) {
        $scope.selected = value;
    };

    $scope.DataRateValue = [
        {
            id: 0,
            name: "250kb/s"
        },
        {
            id: 1,
            name: "500kb/s"
        },
        {
            id: 2,
            name: "1000kb/s"
        },
        {
            id: 3,
            name: "2000kb/s"
        }
    ];

    $scope.powers = [
        {id: 0, name: "3.5 dBm"},
        {id: 1, name: "3.3 dBm"},
        {id: 2, name: "2.8 dBm"},
        {id: 3, name: "2.3 dBm"},
        {id: 4, name: "1.8 dBm"},
        {id: 5, name: "1.2 dBm"},
        {id: 6, name: "0.5 dBm"},
        {id: 7, name: "-0.5 dBm"},
        {id: 8, name: "-1.5 dBm"},
        {id: 9, name: "-2.5 dBm"},
        {id: 10, name: "-3.5 dBm"},
        {id: 11, name: "-4.5 dBm"},
        {id: 12, name: "-6.5 dBm"},
        {id: 13, name: "-8.5 dBm"},
        {id: 14, name: "-11.5 dBm"},
        {id: 15, name: "-16.5 dBm"}
    ];

    $http.get("/apio/service/dongle/route/" + encodeURIComponent("/apio/dongle/getOpening")).success(function (data) {
        $scope.active = data;
        if (!$scope.$$phase) {
            $scope.$apply();
        }
    });

    $scope.dongleSettings = function () {
        $http.get("/apio/service/dongle/route/" + encodeURIComponent("/apio/dongle/getSettings")).success(function (data) {
            $scope.currentPanId = data.panId;
        });
    };

    $scope.changeDongleSettings = function () {
        $http.post("/apio/service/dongle/route/" + encodeURIComponent("/apio/dongle/changeSettings") + "/data/" + encodeURIComponent(JSON.stringify({
                firmwareVersion: $scope.currentFirmwareVersion,
                panId: $scope.newPanId,
                dataRate: $scope.currentDataRate
            }))).success(function (data) {
        }).error(function (data) {
        });
    };

    $scope.dongleSettings();

    $scope.activateDongle = function (flag) {
        if (flag == true) {
            $scope.active = true;
            $http.post("/apio/service/dongle/route/" + encodeURIComponent("/apio/dongle/onoff") + "/data/" + encodeURIComponent(JSON.stringify({
                    onoff: true
                }))).success(function (data) {
                if (data.error) {
                } else {
                }
            }).error(function (data) {
            });
        } else {
            $scope.active = false;
            $http.post("/apio/service/dongle/route/" + encodeURIComponent("/apio/dongle/onoff") + "/data/" + encodeURIComponent(JSON.stringify({
                    onoff: false
                }))).success(function (data) {
                if (data.error) {
                } else {
                }
            }).error(function (data) {
            });
        }
    };

    $scope.updateDongleFirmware = function () {
        $http.post("/apio/service/dongle/route/" + encodeURIComponent("/apio/dongle/onoff") + "/data/" + encodeURIComponent(JSON.stringify({
                onoff: false
            }))).success(function (data) {
            if (data.error) {
            } else {
                $http.get("/apio/service/dongle/route/" + encodeURIComponent("/apio/dongle/updateDongle")).success(function (data) {
                    alert("Aggiornato!");
                    $scope.active = true;
                });
            }
        }).error(function (data) {
        });
    };

    $scope.currentUserEmail = function () {
        $http.get("/apio/user/getSession").success(function (data) {
            console.log(data);
            $http.post("/apio/user/getUser", {
                email: data
            }).success(function (a) {
                console.log(a);
                $scope.currentUserActive = a.user;
                console.log($scope.currentUserActive);
            });
        });
    };

    $scope.currentUserEmail();

    $scope.confirmChange = function () {
        console.log($scope.userEmail + " " + $scope.userPassword);
        $http.post("/apio/user/changePassword", {
            email: $scope.currentUserActive.email,
            password: $scope.exPassword,
            newPassword: $scope.newPassword
        }).success(function (data) {
            if (data.error) {
                console.log("data.error");
                $scope.$signupError = true;
                sweet.show({
                    title: "Error!",
                    text: "The current password is wrong",
                    type: "error",
                    showCancelButton: false,
                    confirmButtonClass: "btn-error",
                    confirmButtonText: "Ok",
                    closeOnConfirm: true
                }, function () {
                });
            } else {
                sweet.show({
                    title: "Done!",
                    text: "Password correctly changed",
                    type: "success",
                    showCancelButton: false,
                    confirmButtonClass: "btn-success",
                    confirmButtonText: "Ok",
                    closeOnConfirm: true
                }, function () {
                    location.reload();
                });
            }
        }).error(function (data) {
            $scope.$signupError = true;
            sweet.show({
                title: "Error!",
                text: "The password cannot be changed at this moment",
                type: "error",
                showCancelButton: false,
                confirmButtonClass: "btn-error",
                confirmButtonText: "Ok",
                closeOnConfirm: true
            }, function () {
                location.reload();
            });
        });
    };

    $scope.$watch("selected", function (newValue) {
        if (newValue === 1 && !$scope.first) {
            socket.off("dongle_update");
            $http.post("/apio/service/dongle/route/" + encodeURIComponent("/apio/dongle/triggerConsole") + "/data/" + encodeURIComponent(JSON.stringify({
                    data: false
                }))).success(function (data) {
            }).error(function (data) {
            });
        } else if (newValue === 2) {
            $http.post("/apio/service/dongle/route/" + encodeURIComponent("/apio/dongle/triggerConsole") + "/data/" + encodeURIComponent(JSON.stringify({
                    data: true
                }))).success(function (data) {
            }).error(function (data) {
            });
            socket.on("dongle_update", function (data) {
                $rootScope.$emit("terminal.dongle.echo", data);
            });
        }

        if ($scope.first) {
            $scope.first = false;
        }
    });
}]);