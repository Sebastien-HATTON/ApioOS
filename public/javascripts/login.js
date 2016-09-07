var app = angular.module("ApioLoginApplication", []);
app.controller("LoginController", ["$rootScope", "$scope", "$http", "$location", function ($rootScope, $scope, $http, $location) {
    $scope.email = "";
    $scope.password = "";
    $scope.showSignupForm = false;
    var host = $location.host();
    var company = host.split(".")[0];

    //EMPTY BACKGROUND
    document.body.style.backgroundImage = "url('" + $scope.background + "')";

    $http.get("template/" + company + "/logo.png").success(function () {
        $scope.logo = "template/" + company + "/logo.png";
        console.log("LOGO C'È");
        if (!$scope.$$phase) {
            $scope.$apply();
        }
    }).error(function () {
        $scope.logo = "images/Apio_Logo.png";
        if (!$scope.$$phase) {
            $scope.$apply();
        }
    });

    $http.get("template/" + company + "/background.jpg").success(function () {
        $scope.background = "template/" + company + "/background.jpg";
        console.log("SFONDO C'È");
        if (!$scope.$$phase) {
            $scope.$apply();
        }

        document.body.style.backgroundImage = "url('" + $scope.background + "')";
    }).error(function () {
        $scope.background = "images/sfondo.jpg";
        if (!$scope.$$phase) {
            $scope.$apply();
        }

        document.body.style.backgroundImage = "url('" + $scope.background + "')";
    });

    $scope.clearError = function () {
        $scope.$invalid = false;
    };

    $scope.login = function () {
        runApioLoading(document.getElementById("singIn"));
        var rememberMe = document.getElementById("rememberMe");
        console.log(rememberMe.checked);
        if (rememberMe.checked == true) {
            rememberMe = 1;
        } else {
            rememberMe = 0;
        }

        /*$http.post("http://apio.cloudapp.net:8085/apio/user/authenticate", {
         email: $scope.email,
         password: $scope.password
         }).success(function (data) {
         if (data.status == true) {
         $http.post("/apio/user", {
         email: $scope.email,
         password: $scope.password
         }).success(function () {
         $http.post("/apio/user/authenticate", {
         email: $scope.email,
         password: $scope.password,
         rememberMe: rememberMe
         }).success(function () {
         stopApioLoading();
         window.location = "/app";
         }).error(function (error) {
         stopApioLoading();
         console.log("Error while authenticating: ", error);
         });
         }).error(function () {
         stopApioLoading();
         $scope.$invalid = true;
         });
         } else {
         $http.post("/apio/user/authenticate", {
         email: $scope.email,
         password: $scope.password,
         rememberMe: rememberMe
         }).success(function (data) {
         if (data.status == true) {
         $http.post("http://apio.cloudapp.net:8085/apio/user", {
         email: $scope.email,
         password: $scope.password
         }).success(function () {
         stopApioLoading();
         window.location = "/app";
         });
         } else {
         stopApioLoading();
         $scope.$invalid = true;
         }
         }).error(function () {
         stopApioLoading();
         $scope.$invalid = true;
         });
         }
         }).error(function () {*/
        $http.post("/apio/user/authenticate", {
            email: $scope.email,
            password: $scope.password,
            rememberMe: rememberMe
        }).success(function (data) {
            stopApioLoading();
            if (data.status == true) {
                window.location = "/app";
            } else {
                $scope.$invalid = true;
            }
        }).error(function () {
            stopApioLoading();
            $scope.$invalid = true;
        });
        //});
    };

    $scope.signup = function () {
        // if ($scope.signupEmail == "admin") {
            $http.post("/apio/user", {
                email: $scope.signupEmail,
                password: $scope.signupPassword
            }).success(function (data) {
                if (data.error) {
                    console.log("data.error");
                    $scope.$signupError = true;
                } else {
                    window.location = "/";
                }
            }).error(function () {
                $scope.$signupError = true;
            });
        // } else {
        //     $http.post("http://apio.cloudapp.net:8085/apio/user", {
        //         email: $scope.signupEmail,
        //         password: $scope.signupPassword
        //     }).success(function (data) {
        //         if (data.error) {
        //             console.log("data.error");
        //             $scope.$signupError = true;
        //         } else {
        //             $http.post("/apio/user", {
        //                 email: $scope.signupEmail,
        //                 password: $scope.signupPassword
        //             }).success(function (data) {
        //                 if (data.error) {
        //                     console.log("data.error");
        //                     $scope.$signupError = true;
        //                 } else {
        //                     window.location = "/";
        //                 }
        //             }).error(function () {
        //                 $scope.$signupError = true;
        //             });
        //         }
        //     }).error(function (data) {
        //         $http.post("/apio/user", {
        //             email: $scope.signupEmail,
        //             password: $scope.signupPassword
        //         }).success(function (data) {
        //             if (data.error) {
        //                 console.log("data.error");
        //                 $scope.$signupError = true;
        //             } else {
        //                 window.location = "/";
        //             }
        //         }).error(function () {
        //             $scope.$signupError = true;
        //         });
        //     });
        // }
    };

    $scope.switchToSignup = function () {
        $scope.showSignupForm = true;
    };
}]);

runApioLoading = function (element, scroll, border) {
    if (element) {
        var borderRadius;
        var offsetLeft;
        var offsetTop;
        if (typeof border === "undefined") {
            if (element && element.style && element.style.borderRadius) {
                borderRadius = 'border-radius:' + element.style.borderRadius;
            } else if (element.firstChild && element.firstChild.style && element.firstChild.style.borderRadius) {
                borderRadius = 'border-radius:' + element.firstChild.style.borderRadius;
            } else {
                borderRadius = '';
            }
        } else {
            borderRadius = 'border-radius:' + border + 'px';
        }
        if (scroll == true) {
            offsetLeft = 'left:' + element.offsetLeft + 'px;';
            offsetTop = 'top:' + element.offsetTop + 'px;';
        } else {
            offsetLeft = '';
            offsetTop = '';
        }
        var firstElement = document.createElement("DIV");
        firstElement.setAttribute("style", 'position:absolute; ' + offsetTop + ' ' + offsetLeft + '');
        firstElement.innerHTML = '<div id="loading" class="loading " style="width:' + element.offsetWidth + 'px !important; height:' + element.offsetHeight + 'px;' + borderRadius + '; margin: 0 auto;"><div id="loadingRoller" class=""><div class="loaderAnimation loadingRoller"></div></div></div>';
        element.insertBefore(firstElement, element.firstChild);
        setTimeout(function () {
            var loaderInPage = document.getElementsByClassName('loaderAnimation')
            for (var ld in loaderInPage) {
                if (loaderInPage.item(ld) && !loaderInPage.item(ld).classList.contains('loadingPlay')) {
                    loaderInPage.item(ld).classList.add('loadingPlay')
                }
            }
        }, 200);
    }
};

stopApioLoading = function () {
    //alert('rimuovo animazione')

    var loaderInPage = document.getElementsByClassName('loaderAnimation')
    for (var ld in loaderInPage) {
        if (loaderInPage.item(ld).classList.contains('loadingPlay')) {
            if (loaderInPage.item(ld)) {
                loaderInPage.item(ld).classList.remove('loadingPlay')
            }
        }
    }

    setTimeout(function () {
        var loading = document.getElementsByClassName('loading')
        for (var ld in loading) {
            if (loaderInPage.item(ld) && loaderInPage.item(ld).parentNode) {
                loading.item(ld).parentNode.removeChild(document.getElementById('loading'));
            }
        }
    }, 200)
};