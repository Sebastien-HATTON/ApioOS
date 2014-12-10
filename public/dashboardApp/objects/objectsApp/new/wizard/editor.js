angular.module('ApioDashboardApplication')
.controller('EditorPanel', ['$scope','$http','sweet','objectService','$state','$rootScope', function($scope,$http,sweet,objectService,$state,$rootScope){

  this.tabb = 1;

  this.selectTab = function(setTab){
      this.tabb = setTab;
  };

  this.isSelected = function(checkTab){
    return this.tabb === checkTab;
  };

  $scope.aceLoadedIno = function(_editor){
    $scope.$parent.editorIno=_editor;
    
    /*console.log('editor in ace ino loaded: ');
    console.log(_editor);
    console.log('$scope.editor in ace ino loaded: ');
    console.log($scope.$parent.editorIno);*/
  }

  $scope.aceLoadedHtml = function(_editor){
    $scope.$parent.editorHtml=_editor;
    
    /*console.log('editor in ace html loaded: ');
    console.log(_editor);
    console.log('$scope.editor in ace html loaded: ');
    console.log($scope.$parent.editorHtml);*/
  }

  $scope.aceLoadedJs = function(_editor){
    $scope.$parent.editorJs=_editor;
    
    /*console.log('editor in ace js loaded: ');
    console.log(_editor);
    console.log('$scope.editor in js ino loaded: ');
    console.log($scope.$parent.editorJs);*/
  }

  $scope.aceLoadedMongo = function(_editor){
    $scope.$parent.editorMongo=_editor;
    
    /*console.log('editor in ace mongo loaded: ');
    console.log(_editor);
    console.log('$scope.editor in ace mongo loaded: ');
    console.log($scope.$parent.editorMongo);*/
  }

  this.updateApioApp = function(){
    console.log('updating object: '+ $rootScope.currentApplication.objectId);
    $http.post('/apio/database/updateApioApp',
        {
          objectId : $rootScope.currentApplication.objectId,
          ino   : $rootScope.ino,
          html  : $rootScope.html,
          js    : $rootScope.js,
          mongo : $rootScope.mongo
        })
      .success(function(){
        // $scope.switchPage('Objects');
        //$('#objectIdTrigger').trigger('click'); //simulate the click to refresh the object list      
        $('#static').modal('hide');
        //sweet.show('Done!', 'Your Apio object is now updated in the home!', 'success');
        sweet.show({
                      title: "Done!",
                      text: "Your Apio object is now updated in the home!",
                      type: "success",
                      showCancelButton: false,
                      confirmButtonClass: "btn-success",
                      confirmButtonText: "Ok",
                      closeOnConfirm: true
                    },
                    function(){
                        $state.go('objects.objectsLaunch');
                    });

      })
      .error(function(){
        alert("An error has occurred while updating the object" + $rootScope.currentApplication.objectId);
    });
  };

  this.createNewApioAppFromEditor = function(){
    var self = this;
    $scope.makefile ='';
    var dao = {}; //dataAccessObject
    dao = JSON.parse($scope.mongo);
    console.log("Trying to create the new object from new editor");
    console.log(dao);

    $http.post('/apio/database/createNewApioAppFromEditor',{object : dao, ino : $scope.ino, html : $scope.html, js : $scope.js, mongo : $scope.mongo, makefile : $scope.makefile})
      .success(function(){
        //$scope.switchPage('Objects');
        //$('#objectIdTrigger').trigger('click');        
        //sweet.show('Done!', 'Your Apio object is now available in the home!', 'success');
        sweet.show({
                      title: "Done!",
                      text: "Your Apio object is now available in the home!",
                      type: "success",
                      showCancelButton: false,
                      confirmButtonClass: "btn-success",
                      confirmButtonText: "Ok",
                      closeOnConfirm: true
                    },
                    function(){
                        $state.go('objects.objectsLaunch');
                    });

      })
      .error(function(){
        alert("An error has occurred while saving the object" + dao.objectName);
      });
  };

  this.sendFilesToServer = function(){
    var self = this;
    var dao = {}; //dataAccessObject
    dao = angular.copy($scope.newObject);
    console.log("Trying to create the new object")
    console.log(dao);
    $http.post('/apio/database/createNewApioApp',{object : dao, ino : $scope.ino, html : $scope.html, js : $scope.js, mongo : $scope.mongo, makefile : $scope.makefile})
      .success(function(){
        //$scope.switchPage('Objects');
        //$('#objectIdTrigger').trigger('click');        
        //$state.go('objects.objectsLaunch');
        //sweet.show('Done!', 'Your Apio object is now available in the home!', 'success');
        sweet.show({
                      title: "Done!",
                      text: "Your Apio object is now available in the home!",
                      type: "success",
                      showCancelButton: false,
                      confirmButtonClass: "btn-success",
                      confirmButtonText: "Ok",
                      closeOnConfirm: true
                    },
                    function(){
                      window.open('/apio/app/exportIno?id='+dao.objectId);
                      $state.go('objects.objectsLaunch');
                    });

        $scope.$parent.newObject = {};
        $scope.$parent.newObject.properties = {};
        $scope.$parent.newObject.pins = {};
        $scope.$parent.hide=false;
        $scope.$parent.tab = 1;
        
        $scope.$parent.progressBarValue = 0;
        $scope.$parent.activeForm = 1; 
        console.log('self.tabb before' + self.tabb);
        self.tabb = 1;
        console.log('self.tabb after' + self.tabb);
        //$scope.$apply();
      })
      .error(function(){
        alert("An error has occurred while saving the object" + $scope.newObject.objectName);
      });
  };

}]);