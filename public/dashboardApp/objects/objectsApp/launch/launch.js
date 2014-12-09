angular.module('ApioDashboardApplication')
.controller('ApioDashboardLaunchController', ['$scope','socket','objectService','$http','$rootScope', function($scope,socket,objectService,$http,$rootScope){

	socket.on('apio_server_update',function(e) {
    	
    	console.log("Evento dal server apio");
    	console.log(e);

    	if ($scope.currentApplication.objectId == e.objectId) {
    		
    		for (var h in e.properties)
    			$scope.currentApplication.properties[h] = e.properties[h];	
    	}

    });

	$scope.initApioDashboardObjectList = function() {
	    //Carico gli oggetti
	    objectService.list().then(function(d){
	        $scope.objects = d.data;
	        console.log($scope.objects);
	    });
	};

	$scope.initApioDashboardObjectList();
		
	$scope.launchApplication = function(object) {
		console.log('object.id: '+object.objectId);

		$rootScope.currentApplication = object;

		$scope.currentApplication = object;	   
		Apio.Application.create({
			objectId : object.objectId,
			init : function() {
				this.render();
			},
			render : function() {
				$("#appModal").modal();
			}
		});
	};

	$scope.handleDoubleClickOnProperty = function($event) {
  		var old_value = $($event.target).text();
  		
  		$($event.target).attr("contenteditable",true);
  		$($event.target).css("border","1px solid #333");
  	};

  	$scope.handleEnterKeyOnProperty = function(pr, ev) {
		$scope.currentApplication.properties[pr] = $(ev.target).text();

		var o = {};
		o.objectId = $scope.currentApplication.objectId;
		o.writeToDatabase = true;
		o.writeToSerial = true;
		o.properties = {};
		o.properties[pr] = $scope.currentApplication.properties[pr];

		socket.emit('apio_client_update',o);
		$(ev.target).css("border","0px");
		$(ev.target).attr("contenteditable",false);
	};

	/*Apio Export application binder*/
	  $scope.exportApioApplication = function(){
	    console.log('exporting the application '+$scope.currentApplication.objectId);
	    //TO BE FIXED
	    //The file cannot be downloaded with this method.
	    /*$http({
	      method : 'GET',
	      url : '/apio/app/export',
	      params : {id : $scope.currentApplication.objectId}
	    })
	    .success(function(data,status,header){
	      console.log('/apio/app/export success()');
	      alert("App Exported")
	    })
	    .error(function(data,status,header){
	      console.log('/apio/app/export failure()');
	    });*/
	    window.open('/apio/app/export?id='+$scope.currentApplication.objectId);
	  };
	  
	  $scope.deleteApioApplication = function(){
	    console.log('deleting the application '+$scope.currentApplication.objectId);
	    $http.post('/apio/app/delete',{id : $scope.currentApplication.objectId})
	    .success(function(data,status,header){
	      console.log('/apio/app/delete success()');
	      $('#appModal').modal('hide');
	      $scope.switchPage('Objects');
	      alert("App Deleted")
	    })
	    .error(function(data,status,header){
	      console.log('/apio/app/delete failure()');
	    });
	  };

	  $scope.importApioApplication = function(){
	    console.log('importing the application to the object target '+$scope.currentApplication.objectId);
	  };

	  $scope.modifyApioApplication = function(){
	    console.log('Modifying the application '+$scope.currentApplication.objectId);
	    $scope.ino = '';
	    $scope.mongo = '';
	    $scope.html = '';
	    $scope.js = '';
	    //console.log('scope.editor : ');
	    //console.log($scope.editor);

	    $http({
	      method : 'POST',
	      url : '/apio/app/modify',
	      data : {id : $scope.currentApplication.objectId}
	    })
	    .success(function(data){

	      console.log('/apio/app/modify success()');
	      
	      $('#appModal').modal('hide');
	      //console.log(data);

	      $scope.$parent.hideCreate=true;
	      $scope.$parent.hideCreateNew=true;
	      $scope.$parent.hideUpdate=false;
	      
	      $("#static").modal();
	      $scope.editorIno.setValue(data.ino);
	      $scope.editorIno.clearSelection();  
	      $scope.editorHtml.setValue(data.html);  
	      $scope.editorHtml.clearSelection();
	      $scope.editorJs.setValue(data.js); 
	      $scope.editorJs.clearSelection();
	      $scope.editorMongo.setValue(data.mongo);  
	      $scope.editorMongo.clearSelection(); 
	      //devo settare anche i valori nello scope perchè altrimenti se viene
	      //premuto update prima che sia stato dato il focus all'editor 
	      //i relativi ng-model rimangono vuoti
	      $scope.ino = data.ino;
	      $scope.html = data.html;
	      $scope.js = data.js;
	      $scope.mongo = data.mongo;

	      $rootScope.ino = data.ino;
	      $rootScope.html = data.html;
	      $rootScope.js = data.js;
	      $rootScope.mongo = data.mongo;
	      console.log("Launching the updater editor");
	      
	    })
	    .error(function(data,status,header){
	      console.log('/apio/app/modify failure()');
	    });

	  };

}]);