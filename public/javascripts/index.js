    //var socket = io();
    /*
    var ventilatore = {
      objectId : "987532",
      address : '40B3C263',
      protocol : "z", 
      correlations : [],
      properties : []
    };

    var lampadina = {
      objectId : "12",
      address : "2",
      protocol : "l"
    }
//Invio dati alla apio board
    $('#987532').on('change',function(evt) {
      //<nome_oggetto>:<nome_proprierà>:<valore>:
      var data = {
        //keyValue : "z"+ventilatore.address+":onoff:"+$('#987532').val()+":",
        keyValues : {
          onoff : $('#987532').val()
        },
        objectId : ventilatore.objectId,
        protocol : ventilatore.protocol,
        address : ventilatore.address,
        writeToSerial : true,
        writeToDatabase : true
      };
      console.log("Invio evento alla board:");
      console.log(data);

      Apio.socket.emit('apio_client_update',data);
    });

//Invio dati alla apio board
    $('#12').on('change',function(evt) {
      //<nome_oggetto>:<nome_proprierà>:<valore>:
      var data = {
        //keyValue : lampadina.protocol+lampadina.address+":onoff:"+$('#12').val()+":",
        objectId : lampadina.objectId,
        address : lampadina.address,
        protocol : 'l',
        writeToSerial : true,
        writeToDatabase : true,
        keyValues : {
          onoff : $('#12').val()
        }
      };
      console.log("Invio evento alla board: ");
      console.log(data);

      Apio.socket.emit('apio_client_update',data);
    });

*/

var Apio = require ('./apio.client.js');
window.Apio = Apio;
window.$ = $;
Apio.Socket.init();
//Ricezione dati da apio_board
Apio.socket.on('apio_server_update',function(e) {
    		console.log("E' arrivato un evento dal server APIO;");
    		console.log(e);

        for (var key in e.properties)
        {
                  
                  var objectId = e.objectId;
                  var value = e.properties[key];
                  $("#"+objectId+' option:contains("'+value+'")').prop('selected',true);
        }

        
    		//Aggiorno la view in base agli aggiornamenti degli altri utenti
    		//Apio.updateView();
})



 var ApioDeveloperConsole = angular.module('ApioDeveloperConsole',[]);
 ApioDeveloperConsole.controller('ConsoleController',['$scope','$http',function($scope,$http){
  $http.get('/apio/database/getObjects')
    .success(function(data){
      $scope.objects = data;
      console.log(data);
    });
  $scope.writeToDatabase = false;
  $scope.writeToSerial = false;
  $scope.unique = false;
  $scope.event = false;
  $scope.programmed = false;

  $scope.encodedString = "";
  $scope.properties = {};
  $scope.virtualObjects = [
    {
      description : "This is a test virtual object",
      name : "TestInstance2" 
    },
    {
      name : "TestI.2",
      description : "This is  another test instance"
    }
  ]

  $scope.launchApplication = function(appName) {
    console.log("Lancio l'applicazione "+appName);
    $.getScript("/javascripts/applications/"+appName+"/"+appName+".js")
      .done(function( script, textStatus ) {
        console.log( "done()" );
      })
      .fail(function( jqxhr, settings, exception ) {
        console.log("fail()")
        console.log(exception);
      });


  }

  $scope.startVirtualObject = function(obj) {

  }
  $scope.stopVirtualObject = function(obj) {

  }

  $scope.sendEncodedString = function() {
    var o = Apio.Util.ApioToJSON($scope.encodedString);
    o.writeToDatabase = $scope.writeToDatabase;
    o.writeToSerial = $scope.writeToSerial;
    Apio.socket.emit('apio_client_update',o);
  }

  $scope.addNewKeyValue = function() {
    //$scope.properties.push($scope.keyvalue);
    var tmp =[];
    tmp=$scope.keyvalue.split(":");
    console.log(tmp);
    $scope.properties[tmp[0]]=tmp[1];
    $scope.keyvalue="";
    console.log($scope.properties);
  }
  $scope.removeKeyValue = function(keytobedeleted) {
    delete $scope.properties[keytobedeleted];
    //$scope.properties.splice($scope.properties.indexOf(keytobedeleted));
  }
  $scope.createNewObject = function(){
    newObject={};
    newObject.objectId=$scope.objectId;
    newObject.name=$scope.name;
    newObject.address=$scope.address;
    newObject.protocol=$scope.protocol;
    newObject.event=$scope.event;
    newObject.unique=$scope.unique;
    newObject.programmed=$scope.programmed;
    newObject.properties=$scope.properties;

    console.log(newObject);
    $http.post('/apio/database/createNewObject',{data : newObject})
      .success(function(){
        console.log("SALVATO");
      })

    
    //console.log("ObjectId: "+$scope.objectId+" Name: "+$scope.name+" Address: "+$scope.address+" Protocol: "+$scope.protocol+" Event: "+$scope.event);
    //console.log($scope.properties);
  }
 }]);




