angular.module("ApioApplication").controller('guideLoadingNewPlanimetry',['$scope','FileUploader','$window','$http','$mdDialog',function($scope, FileUploader,$window,$http,$mdDialog){
	
	
	
	// CALLBACKS
	/*
    uploader.onWhenAddingFileFailed = function(item , filter, options) {
        console.log('onWhenAddingFileFailed', item, filter, options);
    };
    uploader.onAfterAddingFile = function(fileItem) {
        console.log('onAfterAddingFile', fileItem);
        //interviene non appena viene selezionata e salvata una nuova immagine
    };
    uploader.onAfterAddingAll = function(addedFileItems) {
        console.log('onAfterAddingAll', addedFileItems);
    };
    uploader.onBeforeUploadItem = function(item) {
        console.log('onBeforeUploadItem', item);
        $scope.showProgressBarUploadImag = true;
    };
    uploader.onProgressItem = function(fileItem, progress) {
        console.info('onProgressItem', fileItem, progress);
        
    };
    uploader.onProgressAll = function(progress) {
        console.info('onProgressAll', progress);
        $scope.progressBarUploadImag = progress;
        if(progress === 100){
	        $scope.progressBarUploadImag = 110;
	        
        }
    };
    uploader.onSuccessItem = function(fileItem, response, status, headers) {
        console.info('onSuccessItem', fileItem, response, status, headers);
    };
    uploader.onErrorItem = function(fileItem, response, status, headers) {
        console.info('onErrorItem', fileItem, response, status, headers);
    };
    uploader.onCancelItem = function(fileItem, response, status, headers) {
        console.info('onCancelItem', fileItem, response, status, headers);
    };
    uploader.onCompleteItem = function(fileItem, response, status, headers) {
        console.info('onCompleteItem', fileItem, response, status, headers);
        originalImageProfile = $scope.img.userImage;
        $scope.img.userImage = $scope.user.email+'/tempImageProfile.png';
        $scope.editImage = false;
        $scope.showProgressBarUploadImag = false; 
    };
    uploader.onCompleteAll = function() {
        console.info('onCompleteAll');
        
    };
    */
		
}]);
	
	