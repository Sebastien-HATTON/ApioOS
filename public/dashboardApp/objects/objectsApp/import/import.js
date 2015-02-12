angular.module('ApioDashboardApplication')
.controller('ApioDashboardImportController', ['$scope','$http','FileUploader','$state', function($scope,$http,FileUploader,$state){
	var uploader = $scope.uploader = new FileUploader({
            url: '/apio/app/upload',
            queueLimit : 1,
            onSuccessItem : function(item, response, status, headers) {
            	$state.go('objects.objectsLaunch',{'reload':true});
            	console.log('response: ')
            	console.log(response)
            	alert('Application successfully uploaded! Keep in mind to deactivate the popup block to enable the firmware automatic download.')
            	window.open('/apio/app/exportIno?id='+response.id);            	
            }
        });	
      $scope.gitImport = function(path){
            console.log("git path: "+path);
            $('#modalGitClone').modal('show');
            $http.post('/apio/app/gitCloneApp',{gitPath: path})
              .success(function(data,status,headers){
                $('#modalGitClone').modal('hide');
                $state.go('objects.objectsLaunch',{'reload':true});
                  console.log('response: ')
                  console.log(data)
                  alert('Application successfully uploaded! Keep in mind to deactivate the popup block to enable the firmware automatic download.')
                  window.open('/apio/app/exportIno?id='+data.id);
              })
              .error(function(){
                  $('#modalGitClone').modal('hide');
                  console.log("An error has occurred while cloning the repo")
              });
      }
}]);