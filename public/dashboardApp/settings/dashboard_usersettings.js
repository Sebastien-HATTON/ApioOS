angular.module('ApioDashboardApplication').controller('ApioDashboardUserSettingsController', ['$scope', 'userService', 'objectService', '$http', 'socket', function ($scope, userService, objectService, $http, $socket) {


    $scope.currentUserEmail = function () {
        $http.get('/apio/user/getSession').success(function (data) {
            console.log(data);
            var p = $http.post('/apio/user/getUser', {
                'email': data
            });
            p.success(function (a) {
                console.log(a)
                $scope.currentUserActive = a.user;
                console.log($scope.currentUserActive);
            })
            //$scope.currentUserActive = data;
        });
    };

    $scope.currentUserEmail();

    $scope.confirmChange = function () {
        console.log($scope.userEmail + " " + $scope.userPassword);
        //$('#addUser').modal('hide');
        var p = $http.post('/apio/user/changePassword', {
            'email': $scope.currentUserActive.email,
            'password': $scope.exPassword,
            'newPassword': $scope.newPassword
        });
        p.success(function (data) {
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
                    function () {
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
                    function () {
                        //$('#addUser').modal('hide');
                        //$scope.switchPage('Objects');
                        //$state.go('objects.objectsLaunch');
                        location.reload();
                    })
            }
        })
        p.error(function (data) {
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
                function () {
                    //$('#addUser').modal('hide');
                    location.reload();
                })
        })
    };


}]);
