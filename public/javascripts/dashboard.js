//

$(function(){
	$(".launcherIcon").error(function(){
	console.log("Image "+$(this).attr("src")+" does not exist");
	$(this).attr("src","/images/Apio_Logo.png");



})
})
var Apio = require ('./apio.client.js');

//Trova un modo migliore per iniettare le dipendenze 
window.Apio = Apio;
window.$ = $;
Apio.Socket.init();




 var ApioDeveloperConsole = angular.module('ApioDashboardApplication',['ui.utils','ui.ace','hSweetAlert']);


/**
**  Lavora con il singleton creato con Apio.Socket.init()
**/
ApioDeveloperConsole.factory('socket', function ($rootScope) {
  return {
    on: function (eventName, callback) {
      Apio.socket.on(eventName, function () {  
        var args = arguments;
        $rootScope.$apply(function () {
          callback.apply(Apio.socket, args);
        });
      });
    },
    emit: function (eventName, data, callback) {
      Apio.socket.emit(eventName, data, function () {
        var args = arguments;
        $rootScope.$apply(function () {
          if (callback) {
            callback.apply(Apio.socket, args);
          }
        });
      })
    }
  };
});

ApioDeveloperConsole.factory('objectService', ['$rootScope','$http',function($rootScope,$http){
  return {
    list : function() {
      var promise = $http.get('/apio/database/getObjects').then(function(response){
        return response;
      })
      return promise;
    },
    getById : function(id) {
      var promise = $http.get('/apio/database/getObjectById/'+id).then(function(response){
        return response;
      })
      return promise;      
    }
  }
}])



ApioDeveloperConsole.controller('ApioObjectsController',['$scope','$http','socket','objectService',function($scope,$http,socket,objectService){
  

}])

ApioDeveloperConsole.controller('ApioEventsController',['$scope','$http','socket','objectService',function($scope,$http,socket,objectService){

}])

ApioDeveloperConsole.controller('ApioStatesController',['$scope','$http','socket','objectService',function($scope,$http,socket,objectService){

}])

//object injector directive
ApioDeveloperConsole.directive('wizardObject', function(){
  return{
    restrict : 'E',
    templateUrl : '../html/wizard/wizard_object.html' 
  };
});
//properties injector directive
ApioDeveloperConsole.directive('wizardProperties', function(){
  return{
    restrict : 'E',
    templateUrl : '../html/wizard/wizard_properties.html'
  };
});
//micro injector directive
ApioDeveloperConsole.directive('wizardMicro', function(){
  return{
    restrict : 'E',
    templateUrl : '../html/wizard/wizard_micro.html'
  };
});
//pins injector directive
ApioDeveloperConsole.directive('wizardPins', function(){
  return{
    restrict : 'E',
    templateUrl : '../html/wizard/wizard_pins.html'
  };
});
//protocol injector directive
ApioDeveloperConsole.directive('wizardProtocol', function(){
  return{
    restrict : 'E',
    templateUrl : '../html/wizard/wizard_protocol.html'
  };
});
//summary injector directive
ApioDeveloperConsole.directive('wizardSummary', function(){
  return{
    restrict : 'E',
    templateUrl : '../html/wizard/wizard_summary.html'
  };
});
//editor injector directive
ApioDeveloperConsole.directive('wizardEditor', function(){
  return{
    restrict : 'E',
    templateUrl : '../html/wizard/wizard_editor.html'
  };
});

//controller Editor
ApioDeveloperConsole.controller('EditorPanel', ['$scope','$http', 'sweet', function($scope,$http,sweet){
  this.tabb = 1;

  this.selectTab = function(setTab){
      this.tabb = setTab;
  };

  this.isSelected = function(checkTab){
    return this.tabb === checkTab;
  };

  $scope.aceLoadedIno = function(_editor){
    $scope.$parent.editorIno=_editor;
    
    console.log('editor in ace ino loaded: ');
    console.log(_editor);
    console.log('$scope.editor in ace ino loaded: ');
    console.log($scope.$parent.editorIno);
  }

  $scope.aceLoadedHtml = function(_editor){
    $scope.$parent.editorHtml=_editor;
    
    console.log('editor in ace html loaded: ');
    console.log(_editor);
    console.log('$scope.editor in ace html loaded: ');
    console.log($scope.$parent.editorHtml);
  }

  $scope.aceLoadedJs = function(_editor){
    $scope.$parent.editorJs=_editor;
    
    console.log('editor in ace js loaded: ');
    console.log(_editor);
    console.log('$scope.editor in js ino loaded: ');
    console.log($scope.$parent.editorJs);
  }

  $scope.aceLoadedMongo = function(_editor){
    $scope.$parent.editorMongo=_editor;
    
    console.log('editor in ace mongo loaded: ');
    console.log(_editor);
    console.log('$scope.editor in ace mongo loaded: ');
    console.log($scope.$parent.editorMongo);
  }

  this.updateApioApp = function(){
    console.log('updating object: '+$scope.$parent.currentApplication.objectId);
    $http.post('/apio/database/updateApioApp',
        {
          objectId : $scope.$parent.currentApplication.objectId,
          ino   : $scope.ino,
          html  : $scope.html,
          js    : $scope.js,
          mongo : $scope.mongo
        })
      .success(function(){
        $scope.switchPage('Objects');
        $('#objectIdTrigger').trigger('click'); //simulate the click to refresh the object list      
        $('#static').modal('hide');
        sweet.show('Done!', 'Your Apio object is now updated in the home!', 'success');
      })
      .error(function(){
        alert("An error has occurred while updating the object" + $scope.$parent.currentApplication.objectId);
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
        $scope.switchPage('Objects');
        $('#objectIdTrigger').trigger('click');        
        sweet.show('Done!', 'Your Apio object is now available in the home!', 'success');
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
        $scope.switchPage('Objects');
        $('#objectIdTrigger').trigger('click');        
        sweet.show('Done!', 'Your Apio object is now available in the home!', 'success');
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

//controller Wizard
ApioDeveloperConsole.controller('WizardPanel', ['$scope','sweet', function($scope, sweet){

  $scope.tab = 1;
  $scope.hide = false;
  $scope.progressBarValue = 0;
  $scope.activeForm = 1;  

  this.saveFamily = function(family){
    $scope.newObject.microFamily=family.family;
    console.log('$scope.newObject.microFamily '+$scope.newObject.microFamily);
  };
  this.saveType = function(type){
    $scope.newObject.microType=type.type;
    console.log('$scope.newObject.microType '+$scope.newObject.microType);
  };
  $scope.selected = {};

  $scope.microData = [
      {
          "id" : "0",
          "family" : "Arduino",
          "types" : [
              { "type" : "Uno" },
              { "type" : "Mega" },
              { "type" : "Nano" }
          ]
      },{
          "id" : "1",
          "family" : "ST",
          "types" : [
              { "type" : "BOH" },
              { "type" : "Alex" },
              { "type" : "Mattia" }
          ]
      }
  ];


  this.doneForm = function(isValid){
    var self = this;
    sweet.show({
        title: "Apio Wizard completed.",
        text: "Your will not be able to change those information unless you use the Apio Editor them if you proceed!",
        type: "warning",
        showCancelButton: true,
        confirmButtonClass: "btn-warning",
        cancelButtonClass: "btn-info",
        confirmButtonText: "Proceed to Apio Editor",
        cancelButtonText: "Stay on the Wizard",
        closeOnConfirm: false,
        closeOnCancel: true 
      }, 
      function(isConfirm){   
         if (isConfirm) { 
          
          //sweet.show("Done!", "Your wizard procedure is done. Proceed to The Apio editor", "success");   
          sweet.show({
                      title: "Done!",
                      text: "Your wizard procedure is done. Proceed to The Apio editor",
                      type: "success",
                      showCancelButton: false,
                      confirmButtonClass: "btn-success",
                      confirmButtonText: "Ok",
                      closeOnConfirm: true
                    },
                    function(){
                        $scope.hideCreate=false;
                        $scope.hideCreateNew=true;
                        $scope.hideUpdate=true;
                        self.makeForm(isValid);
                    });

        }
       
      });
  }; 



  this.makeForm = function(isValid){
    console.log('makeForm');
    this.nextForm(isValid);
    console.log('Apio Summary Object successfully created');
    console.log($scope.newObject);
    this.parserIno($scope.newObject);
    this.parserHtml($scope.newObject);
    this.parserJs($scope.newObject);
    this.parserMongo($scope.newObject);
    this.parserMakefile($scope.newObject);
    $scope.ino = this.ino;
    $scope.html = this.html;
    $scope.js = this.js;
    $scope.mongo = this.mongo;
    $scope.makefile = this.makefile;
    console.log($scope.makefile);
    console.log('hide in makeForm before : ' + $scope.hide);
    $scope.hide = true;
    $scope.$apply();
    console.log('hide in makeForm after : ' + $scope.hide);
  }

  this.nextForm = function(isValid){
    if(isValid){
      console.log('nextForm')
      $scope.progressBarValue += 20;
      console.log('previous activeForm : ' +$scope.activeForm);
      $scope.activeForm ++;
      console.log('actual activeForm : ' +$scope.activeForm);

      this.selectTab($scope.activeForm);
    };
  };
  
  this.previousForm = function(){
    $scope.progressBarValue -= 20;
    $scope.activeForm --;
    this.selectTab($scope.activeForm);
  };

  this.isDisabled = function(checkTab){
    return checkTab !== $scope.activeForm;
  };

  this.selectTab = function(setTab){
    if(setTab===$scope.activeForm)
      $scope.tab = setTab;
  };

  this.isSelected = function(checkTab){
    return $scope.tab === checkTab;
  };

  this.parserTable = function(objectToParse){

  };

  this.parserMakefile = function(objectToParse){
    this.makefile = 'BOARD_TAG = ' + objectToParse.microType +'\n';
    this.makefile += 'ARDUINO_PORT = /dev/ttyACM0\n';
    this.makefile += 'ARDUINO_LIBS = \n';
    this.makefile += 'ARDUINO_DIR = /usr/share/arduino\n';
    this.makefile += 'include ../Arduino.mk';
  };

  this.parserMongo = function(objectToParse){
    this.mongo = '"db" : {\n';
    for(key in objectToParse.properties){
      if(objectToParse.properties[key].type.toLowerCase()==='list'){
        this.mongo += '\t"' + objectToParse.properties[key].name + '" : {\n';
        for(keykey in objectToParse.properties[key].items){
          this.mongo += '\t\t"' + objectToParse.properties[key].items[keykey] + '" : "' + keykey  + '",\n';
        };
        this.mongo = this.mongo.slice(0,(this.mongo.length-2));
        this.mongo += '\n\t\t}\n';
      };
    };
    this.mongo += '\t}';
  };

  this.parserHtml = function(objectToParse){
     this.html='<div id="ApioApplication';
     this.html+=objectToParse.objectId +'" ng-app="ApioApplication' + objectToParse.objectId + '"  style="padding:10px;">\n';
     this.html+='\t<div ng-controller="defaultController">\n';
     this.html+='\t\t<h2 style="text-align:center;">' + objectToParse.objectName + '</h2>\n';
     
     for(key in objectToParse.properties){
      
      this.html+='\t\t\t<' + objectToParse.properties[key].type.toLowerCase() +' propertyname="' + objectToParse.properties[key].name + '" ';
      
      if(objectToParse.properties[key].type.toLowerCase()==='trigger'){
        this.html+='labelon="'+ objectToParse.properties[key].onLabel +'" labeloff="'+ objectToParse.properties[key].offLabel +'">';
      }else if(objectToParse.properties[key].type.toLowerCase()==='slider'){
        this.html+='min="' + objectToParse.properties[key].min + '" max="' + objectToParse.properties[key].max + '" step="' + objectToParse.properties[key].step + '">';
      }else if(objectToParse.properties[key].type.toLowerCase()==='list'){
        this.html+='label=" " >';
      }else if(objectToParse.properties[key].type.toLowerCase()==='button'){
        this.html+='label=" " innertext= " ">';
      }else if(objectToParse.properties[key].type.toLowerCase()==='number'){
        this.html+='label=" ">';
      }else if(objectToParse.properties[key].type.toLowerCase()==='text'){
        this.html+='label=" ">';
      }

      this.html+='</' + objectToParse.properties[key].type.toLowerCase() + '>\n';

     };
     this.html+='\t</div>\n';
     this.html+='</div>\n';
     this.html+='<script src="applications/' + objectToParse.objectId + '/' + objectToParse.objectId + '.js"></script>';
  };

  this.parserJs = function(objectToParse){
    this.js = 'var app = angular.module(\'ApioApplication' + objectToParse.objectId + '\', [\'apioProperty\'])\n';
    this.js += 'app.controller(\'defaultController\',[\'$scope\', \'currentObject\', function($scope, currentObject){\n';
    this.js += '\tconsole.log("Sono il defaultController e l\'oggetto è")\n';
    this.js += '\tconsole.log(currentObject.get());\n';
    this.js += '\t$scope.object = currentObject.get();\n';
    this.js += '\t/**\n';
    this.js += '\t* [myCustomListener description]\n';
    this.js += '\t* @return {[type]} [description]\n';
    this.js += '\t*/\n';
    this.js += '\t$scope.myCustomListener = function() {';
    this.js += '\t\n';
    this.js += '\t}\n';
    this.js += '}]);\n\n';
    this.js += '\tsetTimeout(function(){\n';
    this.js += '\t\tangular.bootstrap(document.getElementById(\'ApioApplication' + objectToParse.objectId + '\'), [\'ApioApplication' + objectToParse.objectId + '\']);\n';
    this.js += '\t},10);\n';
  };

  this.parserIno = function(objectToParse){
    console.log('Parsing object ' + objectToParse + ' for .ino');
     this.ino='';
     if(objectToParse.protocol=='l'){
       //declare LWM libraries
       this.ino += '#include <Arduino.h>\n'
       this.ino += 'extern "C"{\n';
       this.ino += '#include <atmegarfr2.h>\n';
       this.ino += '#include <commands.h>\n';
       this.ino += '#include <config.h>\n';
       this.ino += '#include <hal.h>\n';
       this.ino += '#include <halBoard.h>\n';
       this.ino += '#include <halGpio.h>\n';
       this.ino += '#include <halLed.h>\n';
       this.ino += '#include <halSleep.h>\n';
       this.ino += '#include <halTimer.h>\n';
       this.ino += '#include <nwk.h>\n';
       this.ino += '#include <nwkCommand.h>\n';
       this.ino += '#include <nwkDataReq.h>\n';
       this.ino += '#include <nwkFrame.h>\n';
       this.ino += '#include <nwkGroup.h>\n';
       this.ino += '#include <nwkRoute.h>\n';
       this.ino += '#include <nwkRouteDiscovery.h>\n';
       this.ino += '#include <nwkRx.h>\n';
       this.ino += '#include <nwkSecurity.h>\n';
       this.ino += '#include <nwkTx.h>\n';
       this.ino += '#include <phy.h>\n';
       this.ino += '#include <sys.h>\n';
       this.ino += '#include <sysConfig.h>\n';
       this.ino += '#include <sysEncrypt.h>\n';
       this.ino += '#include <sysTimer.h>\n';
       this.ino += '#include <sysTypes.h>\n';
       this.ino += '}\n';
       this.ino += '#include <ApioLwm.h>\n';

     } else if(objectToParse.protocol=='z'){
       //declare XBee libraries
       this.ino +="#include <XBee.h>\n#include <ApioXbee.h>\n";
     }

     for(key in objectToParse.pins){
       //declare Pins type name = value
       this.ino += "int "+objectToParse.pins[key].name+"="+objectToParse.pins[key].number+";\n";  
     }
     this.ino += "void setup() {\n";
     if(objectToParse.protocol=='l')
     {
       //initialize LWM

     }else if(objectToParse.protocol=='z'){
       //initialize XBee
        this.ino +="\tSerial.begin(9600);\n";
     }

     for(key in objectToParse.pins){
       //pinMode(name, type);
       this.ino += "\tpinMode("+objectToParse.pins[key].name+","+objectToParse.pins[key].type+");\n"
     }

     this.ino += "}\n\n";
     this.ino += "void loop(){\n";
     if(objectToParse.protocol=='z'){
       this.ino+="\tApioReceive();\n";
     }
     for(key in objectToParse.properties)
     {
       this.ino += '\tif(property=="'+objectToParse.properties[key].name+'"){\n';
       if(objectToParse.properties[key].type=="Trigger")
       {
        console.log(objectToParse.properties[key]);
         this.ino +='\t\tif(value=="'+objectToParse.properties[key].on+'"){\n';
         this.ino += '\t\t\t//Do Something\n\t\t}\n';
         this.ino +='\t\tif(value=="'+objectToParse.properties[key].off+'"){\n';
         this.ino += '\t\t\t//Do Something\n\t\t}\n';
       }
       else if(objectToParse.properties[key].type=="List")
       {
         for(keykey in objectToParse.properties[key].items)
         {
           this.ino +='\t\tif(value=="'+objectToParse.properties[key].items[keykey]+'"){\n';
           this.ino +='\t\t\t//Do Something\n\t\t}\n';
         }
       }
       else
       {
         this.ino += '\t\t//Do Something\n\t';
       }
       this.ino += '}\n';       
     }
     this.ino +="}";
    };
}]);


ApioDeveloperConsole.controller('ApioDashboardController',['$scope','$http','socket','objectService',function($scope,$http,socket,objectService){

 	$scope.currentPage = 'Home';
 	$scope.currentApplication = {};
  

  $scope.hideWizard=true;
  $scope.hideNewEditor=true;
  $scope.newEditorDisabled=false;
  $scope.wizardDisabled=false;

  $scope.showWizard = function(){
    $scope.hideWizard=false;
    $scope.hideNewEditor=true;
    $scope.newEditorDisabled=false;
    $scope.wizardDisabled=true;
  };

  $scope.showNewEditor = function(){
    $scope.hideNewEditor=false;
    $scope.hideWizard=true;
    $scope.hideUpdate=true;
    $scope.newEditorDisabled=true;
    $scope.wizardDisabled=false;
    $scope.hideCreate=true;
    $scope.hideCreateNew=false;
    $scope.hideUpdate=true;

    var emptyIno = '#include <INSERT_LIBRARY_NAME.h>\n';
    emptyIno += 'void setup() {\n}\n';
    emptyIno += 'void loop(){\n}\n';

    var emptyHtml = '<div id="ApioApplicationINSERT_ID_APPLICATION" ng-app="ApioApplicationINSERT_ID_APPLICATION"  style="padding:10px;">\n';
    emptyHtml += '\t<div ng-controller="defaultController">\n';
    emptyHtml += '\t<h2 style="text-align:center;">INSERT_NAME_OBJECT</h2>\n';
    emptyHtml += '\t<!--INSERT_OBJECT_PROPIERTIES-->\n';
    emptyHtml += '\t</div>\n';
    emptyHtml += '</div>\n';
    emptyHtml += '<script src="applications/INSERT_ID_APPLICATION/INSERT_ID_APPLICATION.js"></script>';

    var emptyJs = 'var app = angular.module(\'ApioApplicationINSERT_ID_APPLICATION\', [\'apioProperty\'])\n';
    emptyJs += 'app.controller(\'defaultController\',[\'$scope\', \'currentObject\', function($scope, currentObject){\n';
    emptyJs += '\tconsole.log("Sono il defaultController e l\'oggetto è")\n';
    emptyJs += '\tconsole.log(currentObject.get());\n';
    emptyJs += '\t$scope.object = currentObject.get();\n';
    emptyJs += '\t$scope.myCustomListener = function() {\n';
    emptyJs += '\t\t/*INSERT_CUSTOM_LISTENER*/\n';
    emptyJs += '\t}\n';
    emptyJs += '}]);\n';
    emptyJs += 'setTimeout(function(){\n';
    emptyJs += '\tangular.bootstrap(document.getElementById(\'ApioApplicationINSERT_ID_APPLICATION\'), [\'ApioApplicationINSERT_ID_APPLICATION\']);\n';
    emptyJs += '},10);';

    var editorMongo = '{\n';
    editorMongo += '\t"properties" : {\n';
    editorMongo += '\t\t"INSERT_NAME1_PROPERTY" : "INSERT_VALUE1_PROPERTY",\n';
    editorMongo += '\t\t"INSERT_NAME2_PROPERTY" : "INSERT_VALUE2_PROPERTY"\n';
    editorMongo += '\t},\n';
    editorMongo += '\t"name" : "INSERT_NAME_OBJECT",\n';
    editorMongo += '\t"objectId" : "INSERT_ID_OBJECT",\n';
    editorMongo += '\t"protocol" : "INSERT_PROTOCOL_OBJECT",\n';
    editorMongo += '\t"address" : "INSERT_ADDRESS_OBJECT",\n';
    editorMongo += '\t"db" : {\n\t}\n';
    editorMongo += '}';

    $scope.editorIno.setValue(emptyIno);
    $scope.editorIno.clearSelection();  
    $scope.editorHtml.setValue(emptyHtml);  
    $scope.editorHtml.clearSelection();
    $scope.editorJs.setValue(emptyJs); 
    $scope.editorJs.clearSelection();
    $scope.editorMongo.setValue(editorMongo);  
    $scope.editorMongo.clearSelection(); 
    //devo settare anche i valori nello scope perchè altrimenti se viene
    //premuto update prima che sia stato dato il focus all'editor 
    //i relativi ng-model rimangono vuoti
    $scope.ino = emptyIno;
    $scope.html = emptyHtml;
    $scope.js = emptyJs;
    $scope.mongo = editorMongo;
  };
  


    $scope.event = {
    	triggeredStates : []
    };

    $scope.$watch('event.timer',function(){
      var p = new Date($scope.event.timer);
      console.log("Ho modificato il timer con successo ora vale "+$scope.event.timer)
    })
    $scope.$watch('event.type',function(){
      if ($scope.event.type == 'timeTriggered'){
        $("#timerContainer").cron({
          onChange : function() {
            $scope.event.timer = $(this).cron("value");
            $scope.event.scheduled = true;
          }
        });
      }
      
    })
    $scope.events = [];

    $scope.newObject = {};
    $scope.newObject.properties = {};
    $scope.newObject.pins = {};
    $scope.newObject.functions = {};
    $scope.newObject.variables = {};

    $scope.newProperty = {
      name : null,
      type : null
    };
    
    $scope.newPin = {
      name : null,
      number : null,
      type : null
    };
    
    $scope.states = [];
    $scope.newState = {
      properties : []
    };

    $scope.addNewProperty = function() {
      var t = $scope.newProperty;
      $scope.newObject.properties[$scope.newProperty.name] = t;
      $scope.newProperty = {};
    }
  
    $scope.addNewPin = function() {
      var t = $scope.newPin;
      $scope.newObject.pins[$scope.newPin.name] = t;
      $scope.newPin = {};
    }

    $scope.addNewFunction = function() {
      var t = $scope.newFunction;
      $scope.newObject.functions[$scope.newFunction.text] = t;
      $scope.newFunction = {};
    }
    
    $scope.addNewVariable = function() {
      var t = $scope.newVariable;
      $scope.newObject.variables[$scope.newVariable.name] = t;
      $scope.newVariable = {};
    }
    
    

    $scope.sync = function($event) {
          $($event.target).addClass("fa-spin");
          $http.get('/apio/event')
          .success(function(data){
            $scope.events = data;
          });

          objectService.list().then(function(d){
              $scope.objects = d.data;
          })


      $http.get('/apio/state')
      .success(function(data){
          $scope.states = data;
      })
    
  }

    socket.on('apio_server_update',function(e) {
    	
    	console.log("Evento dal server apio");
    	console.log(e);

    	if ($scope.currentApplication.objectId == e.objectId) {
    		
    		for (var h in e.properties)
    			$scope.currentApplication.properties[h] = e.properties[h];
    		
    	}

    });
    $scope.newListItem = {
      name : "",
      value : ""
    };



    $scope.addListItemToListProperty = function() {
      console.log($scope);
        if (!$scope.newProperty.hasOwnProperty("items"))
          $scope.newProperty.items = {};
        //l'ho dovuta cambiare per adattarsi alla struttura di matteo 
        //$scope.newProperty.items[$scope.newListItem.name] = $scope.newListItem.value;
        $scope.newProperty.items[$scope.newListItem.value] = $scope.newListItem.name;
        console.log($scope.newProperty.items);
        $scope.newListItem.name = '';
        $scope.newListItem.value = '';
        
      }

    $scope.newTriggeredState = '';

    $scope.writeToDatabase = false;
  	$scope.writeToSerial = false;



  	$scope.removeKeyValue = function(key) {
  			console.log("removeKeyValue() "+key)
  	}

    $scope.generateObjectViewFile = function() {
      var html = '<application objectId="'+$scope.newObject.objectId+'">';
      
      
      for (var k in $scope.newObject.properties) {
        var e = $scope.newObject.properties[k];
        html += "<"+e.type+' model="'+e.name+'" />';
      }
      html += '</application>';
      $scope.view = html;


    }

  	$scope.createNewObject = function() {

  			var keys = ["name","objectId","address","pins","functions","variables","properties","virtual","protocol"];
  			var dao = {};
        dao = angular.copy($scope.newObject);

        console.log("Mi accingo a salvare questo oggetto")
        console.log(dao);
  			$http.post('/apio/database/createNewObject',{object : dao})
		      .success(function(){
		        alert("Virtual Object successfullyCreated");
            $scope.newObject = {};
		        $scope.newObject.properties = {};
		        $scope.newObject.pins = {};
		        $scope.newObject.functions = {};
		        $scope.newObject.variables = {};
		      })
		      .error(function(){
		      	alert("An error has occurred while saving the object")
		      });
  	}
  	


  	$scope.handleDoubleClickOnProperty = function($event) {
  		var old_value = $($event.target).text();
  		
  		$($event.target).attr("contenteditable",true);
  		$($event.target).css("border","1px solid #333");
  	}

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
  	}


 	$scope.switchPage = function(pageName) {	
 		$('.dashboardPage#'+$scope.currentPage).css('display','none');
 		$('.dashboardPage#'+pageName).css('display','block');
 		$scope.currentPage = pageName;
    if ($scope.pageHooks.hasOwnProperty(pageName))
      $scope.pageHooks[pageName]();
 	}

  $scope.pageHooks = {
    Events : function() {
          $http.get('/apio/event')
          .success(function(data){
            $scope.events = data;
          });
    },
    Objects : function() {
          objectService.list().then(function(d){
              $scope.objects = d.data;
          })
    },
    States : function() {

      $http.get('/apio/state')
      .success(function(data){
          $scope.states = data;
      })
    }
  };

  $scope.initApioDashboard = function() {
    //Carico gli oggetto
    objectService.list().then(function(d){
              $scope.objects = d.data;
    });
    //Carico gli eventi
    $http.get('/apio/event')
          .success(function(data){
            $scope.events = data;
    });
    //Carico gli stati
    $http.get('/apio/state')
      .success(function(data){
          $scope.states = data;
    })

  }
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
      $scope.pageHooks.Objects();
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
    console.log('scope.editor : ');
    console.log($scope.editor);

    $http({
      method : 'POST',
      url : '/apio/app/modify',
      data : {id : $scope.currentApplication.objectId}
    })
    .success(function(data){

      console.log('/apio/app/modify success()');
      
      $('#appModal').modal('hide');
      //console.log(data);

      $scope.hideCreate=true;
      $scope.hideCreateNew=true;
      $scope.hideUpdate=false;
      
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
      alert("Launching the updater editor");
      
    })
    .error(function(data,status,header){
      console.log('/apio/app/modify failure()');
    });

  };

 	$scope.launchApplication = function(object) {
 		
 		 $scope.currentApplication = object;	   
      $.getScript("/javascripts/applications/"+object.objectId+"/"+object.objectId+".js")
	      .done(function( script, textStatus ) {
	        console.log( "dashboard.js : done()" );
	      })
	      .fail(function( jqxhr, settings, exception ) {
	        console.log("dashboard.js : failed to load "+object.objectId+".js application, using default application.")
	        //FIXME questo serve per il testing, per evitare di creare le cartelle
	        

        //App di default
	       Apio.Application.create({
	        	objectId : object.objectId,
	        	init : function() {
	        		
	        		
	        		
	        		this.render();
	        	},
	        	render : function() {
	        		$("#appModal").modal();

	        	}
	        });
	        

	      });
        


  	}
  	 $scope.sendEncodedString = function() {
	    var o = Apio.Util.ApioToJSON($scope.encodedString);
	    o.writeToDatabase = $scope.writeToDatabase;
	    o.writeToSerial = $scope.writeToSerial;
	    Apio.socket.emit('apio_client_update',o);
	  }

	  $scope.addTriggeredState = function() {
	  	console.log("Aggiungo "+$scope.newTriggeredState)
	  	$scope.event.triggeredStates.push($scope.newTriggeredState);
	  	$scope.newTriggeredState = '';
	  }

	  $scope.saveEvent = function() {
	  	var event_data = $scope.event;
	  	$http({
	  		method : 'POST',
	  		url : '/apio/event',
	  		data : {event : event_data}
	  	})
	  	.success(function(data,status,header){
	  		console.log('/apio/event/state success()');
	  		$scope.event = {};
	  		alert("Event saved")
	  	})
	  	.error(function(data,status,header){
	  		console.log('/apio/event/state success()');
	  	})

	  }

	  $scope.saveState = function() {

	  }

    $scope.applyState = function(state) {

      socket.emit('apio_client_state',state)
      /*
      $http.get('/apio/state/apply',{
        params: {
          stateName : name
        }
      })
      .success(function(data,status,header){
        alert("Stato applicato con successo");
      })
      .error(function(data,status,header){
        alert("Errore nell'applicazione")
      })
*/
    }

    $scope.launchEvent = function(e) {
      console.log(e);
      $http.get('/apio/event/launch',{
        params : {
          eventName : e.name
        }
      })
      .success(function(data,status,header){
        alert("Evento lanciato correttamente")
      })
      .error(function(data,status,header){
        alert("Evento non lanciato")
      })
    }

 }]);