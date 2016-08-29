angular.module("ApioApplication").controller('modifyUserProfile', ['$scope', 'FileUploader', '$window', '$http', '$mdDialog', function ($scope, FileUploader, $window, $http, $mdDialog) {

    var uploader = $scope.uploader = new FileUploader({
        url: '/apio/user/uploadImage',
        autoUpload: true,
        removeAfterUpload: true
    });

    var originalImageProfile;

    $scope.editImage = true;
    $scope.whatProfileEdit = 0;
    $scope.imageEdit = '';
    $scope.showProgressBarUploadImag = false;

    $scope.saveNewImage = function () {
        $scope.editImage = true;
        var random = Math.floor((Math.random() * 100) + 1)
        $http.post("/apio/user/saveLastUploadImage", {name: 'imageProfile' + String(random)}).success(function (data) {
            console.log("return data: ", data);
            //$scope.img.userImage = $scope.user.email+'/imageProfile'+String(random) + '.png';
            $scope.img.userImage = $scope.user.email + '/imageProfile' + String(random) + '.png';
            if (!$scope.$$phase) {
                $scope.$apply();
            }
            //alert();
        });

    }
    $scope.discardNewImage = function () {
        $scope.editImage = true;
        $scope.img.userImage = originalImageProfile;
    }

    $scope.editUserProfile = function ($event) {
        if ($event.target.id == "userMail") {
            $scope.whatProfileEdit = 1;
        } else if ($event.target.id == "userName") {
            $scope.whatProfileEdit = 2;
        }
    }
    $scope.discartEditProfile = function () {
        $scope.whatProfileEdit = 0;
    }
    $scope.saveEditProfile = function () {
        if ($scope.whatProfileEdit === 1) {
            var verify = document.getElementById('inputUserMail').value;
            if (verify !== '') {
                alert(verify);
            }
        } else if ($scope.whatProfileEdit === 2) {
            var verify = document.getElementById('inputUserName').value;
            if (verify !== '') {

                $http.post("/apio/user/modifyAdditionalInfo", {data: {userName: verify}}).success(function () {
                    $scope.user.additional_info.userName = verify;
                });
            }
        }
    }
    $scope.changeImmage = function () {

        $('#imageChange').trigger('click');

        //$scope.changedImage();
    }
    $scope.changedImage = function () {
        console.log('CHANGE***************')

    }
    /*angular.element(document).ready(function () {
     console.log('$scope.user.additional_info.userName ',$scope.user.additional_info.userName);
     });*/
    // CALLBACKS
    uploader.onWhenAddingFileFailed = function (item /*{File|FileLikeObject}*/, filter, options) {
        console.log('onWhenAddingFileFailed', item, filter, options);
    };
    uploader.onAfterAddingFile = function (fileItem) {
        console.log('onAfterAddingFile', fileItem);
        //interviene non appena viene selezionata e salvata una nuova immagine
    };
    uploader.onAfterAddingAll = function (addedFileItems) {
        console.log('onAfterAddingAll', addedFileItems);
    };
    uploader.onBeforeUploadItem = function (item) {
        console.log('onBeforeUploadItem', item);
        $scope.showProgressBarUploadImag = true;
    };
    uploader.onProgressItem = function (fileItem, progress) {
        console.info('onProgressItem', fileItem, progress);

    };
    uploader.onProgressAll = function (progress) {
        console.info('onProgressAll', progress);
        $scope.progressBarUploadImag = progress;
        if (progress === 100) {
            $scope.progressBarUploadImag = 110;

        }
    };
    uploader.onSuccessItem = function (fileItem, response, status, headers) {
        console.info('onSuccessItem', fileItem, response, status, headers);
    };
    uploader.onErrorItem = function (fileItem, response, status, headers) {
        console.info('onErrorItem', fileItem, response, status, headers);
    };
    uploader.onCancelItem = function (fileItem, response, status, headers) {
        console.info('onCancelItem', fileItem, response, status, headers);
    };
    uploader.onCompleteItem = function (fileItem, response, status, headers) {
        console.info('onCompleteItem', fileItem, response, status, headers);
        originalImageProfile = $scope.img.userImage;
        $scope.img.userImage = $scope.user.email + '/tempImageProfile.png';
        $scope.editImage = false;
        $scope.showProgressBarUploadImag = false;
    };
    uploader.onCompleteAll = function () {
        console.info('onCompleteAll');

    };

}]);