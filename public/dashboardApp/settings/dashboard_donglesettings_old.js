angular.module('ApioDashboardApplication')
    .controller('ApioDashboardDongleSettingsController', ['$rootScope','$scope','sweet','userService','objectService', '$http','socket', function($rootScope,$scope,sweet,userService,objectService,$http,$socket){
        var socket2;
        $http.get("/apio/getIP").success(function (ip) {
            $scope.ip = ip.split(" ")[0];
            socketDongle = io.connect('http://'+$scope.ip+':8091');
            socketDongle.on("dongle_update", function(data){
                $rootScope.$emit('terminal.dongle.echo', data)


            });
            //$scope.currentUserActive = data;
        });

//var socket2 = io.connect('http://192.168.1.3:8091');

        /* DA ELIMINARE
         $scope.runClick = function(){
         $('.play-button').toggleClass("paused");
         }
         FINE ELIMINAZIONE */

        $scope.selected = 1;
        $scope.active = true;
        $scope.currentFirmwareVersion;
        $scope.currentPanId;
        $scope.currentDataRate="3";
        $scope.currentRadioPower;
        $scope.launchSection = function(value){
            $scope.selected = value;

        }

        $scope.DataRateValue=[
            {
                id: 0,
                name: "250kb/s"
            },
            {
                id: 1,
                name: "500kb/s"
            },
            {
                id:2,
                name : "1000kb/s"
            },
            {
                id:3,
                name : "2000kb/s"
            }
            /*0   250 kb/s  | -100 dBm
             1   500 kb/s  |  -96 dBm
             2   1000 kb/s |  -94 dBm
             3   2000 kb/s |  -86 dBm*/

        ];

        $scope.powers = [
            {id:0,   name:"3.5 dBm"},
            {id:1,   name:"3.3 dBm"},
            {id:2,   name:"2.8 dBm"},
            {id:3,   name:"2.3 dBm"},
            {id:4,   name:"1.8 dBm"},
            {id:5,   name:"1.2 dBm"},
            {id:6,   name:"0.5 dBm"},
            {id:7,   name:"-0.5 dBm"},
            {id:8,   name:"-1.5 dBm"},
            {id:9,   name:"-2.5 dBm"},
            {id:10,   name:"-3.5 dBm"},
            {id:11,   name:"-4.5 dBm"},
            {id:12,   name:"-6.5 dBm"},
            {id:13,   name:"-8.5 dBm"},
            {id:14,   name:"-11.5 dBm"},
            {id:15,   name:"-16.5 dBm"}
        ]


        $scope.dongleSettings = function(){
            $http.get('/apio/dongle/getSettings').success(function(data){
                console.log(data);
                $scope.currentFirmwareVersion=data.firmwareVersion;
                $scope.currentPanId=data.panId;
                $scope.currentDataRate=data.dataRate;
                $scope.currentRadioPower=data.radioPower;
            });

        }
        $scope.changeDongleSettings = function(){
            $http.post('/apio/dongle/changeSettings', {
                "firmwareVersion" : $scope.currentFirmwareVersion,
                "panId" : $scope.newPanId,
                "dataRate" : $scope.currentDataRate,
                "radioPower" : $scope.currentRadioPower
            }).success(function(data){

            });

        }
        $scope.dongleSettings();



        $scope.activateDongle = function(flag){
            if(flag==true){
                $scope.active = true;
                var p = $http.post('/apio/dongle/onoff', {
                    'onoff': true
                });
                p.success(function(data){
                    if(data.error){

                    } else {

                    }
                })
                p.error(function(data){

                })


            } else {
                $scope.active = false;
                var p = $http.post('/apio/dongle/onoff', {
                    'onoff': false
                });
                p.success(function(data){
                    if(data.error){

                    } else {

                    }
                })
                p.error(function(data){

                })

            }
        }

        $scope.updateDongleFirmware = function(){
            $scope.active = false;
            var q = $http.post('/apio/dongle/onoff', {
                'onoff': false
            });
            q.success(function(data){
                if(data.error){

                } else {
                    var p = $http.post('/marketplace/hex/installHex/', {
                        "name" : "Coordinator"
                    });
                    p.success(function(){
                        sweet.show({
                                title: "Done!",
                                text: "Firmware uploaded",
                                type: "success",
                                showCancelButton: false,
                                confirmButtonClass: "btn-success",
                                confirmButtonText: "Ok",
                                closeOnConfirm: true
                            },
                            function(){
                                $scope.activateDongle(true);
                            });
                    });
                    p.error(function(){

                    })



                }
            })
            q.error(function(data){

            })


        }

        $scope.currentUserEmail = function() {
            $http.get('/apio/user/getSession').success(function(data){
                console.log(data);
                var p = $http.post('/apio/user/getUser', {
                    'email': data
                });
                p.success(function(a) {
                    console.log(a)
                    $scope.currentUserActive = a.user;
                    console.log($scope.currentUserActive);
                })
                //$scope.currentUserActive = data;
            });
        };

        $scope.currentUserEmail();

        $scope.confirmChange = function() {
            console.log($scope.userEmail + " " + $scope.userPassword);
            //$('#addUser').modal('hide');
            var p = $http.post('/apio/user/changePassword', {
                'email': $scope.currentUserActive.email,
                'password': $scope.exPassword,
                'newPassword': $scope.newPassword
            });
            p.success(function(data) {
                if (data.error) {
                    console.log("data.error")
                    $scope.$signupError = true;
                    sweet.show({
                            title: "Error!",
                            text: "The current password is wrong",
                            type: "error",
                            showCancelButton: false,
                            confirmButtonClass: "btn-error",
                            confirmButtonText: "Ok",
                            closeOnConfirm: true
                        },
                        function(){
                            //$('#addUser').modal('hide');
                            //$scope.switchPage('Objects');
                            //$state.go('objects.objectsLaunch');
                            //location.reload();
                        })

                } else {
                    sweet.show({
                            title: "Done!",
                            text: "Password correctly changed",
                            type: "success",
                            showCancelButton: false,
                            confirmButtonClass: "btn-success",
                            confirmButtonText: "Ok",
                            closeOnConfirm: true
                        },
                        function(){
                            //$('#addUser').modal('hide');
                            //$scope.switchPage('Objects');
                            //$state.go('objects.objectsLaunch');
                            location.reload();
                        })
                }
            })
            p.error(function(data) {
                $scope.$signupError = true;
                sweet.show({
                        title: "Error!",
                        text: "The password cannot be changed at this moment",
                        type: "error",
                        showCancelButton: false,
                        confirmButtonClass: "btn-error",
                        confirmButtonText: "Ok",
                        closeOnConfirm: true
                    },
                    function(){
                        //$('#addUser').modal('hide');
                        location.reload();
                    })
            })
        };


    }]);
