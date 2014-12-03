(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function(){
	"use strict";
	var Apio = {};

	//Dovrà essere nascosto o incapsulato. Il programmatore non deve aver accesso al socket.
	//Magari con un getSocket() o qualcosa che utilizzi solo chi sa cosa fa
	Apio.Socket = {};

	Apio.Socket.init = function() {
		Apio.socket = io();

		Apio.socket.on('apio_server_update',function(event){
			//Se arriva un evento inerente ad una app aperta, la updato subito
			/*if (Apio.Application.hasOwnProperty('current') && Apio.Application.getCurrentApplication().objectId == event.objectId)
				Apio.Application.getApplicationById(event.objectId).update(event);
			else
				Apio.NotificationCenter.pushEvent(event);  //altrimenti lo faccio gestire dal centro notifiche
			*/
		});
	};



	Apio.Application = {};

	Apio.Application.load = function(appName,callback) {
		$.getScript("/javascripts/applications/"+appName+"/"+appName+".js",callback);
	}

	Apio.Application.getCurrentApplication = function() {
		return Apio.Application.current;
	}
	/*
	*	@param name The application's name
	*/
	Apio.Application.create = function(objectId,config) {
		
		console.log("Creating the "+objectId+" application");

		var app_object = config;
		app_object.objectId = objectId;

		$.getJSON('/apio/database/getObject/'+objectId,function(data){
			console.log("Ho caricato un oggetto");
			console.log(data);

			for (var key in data.properties)
				app_object[key] = data.properties[key];

			Apio.Application.current = app_object;

			if (app_object.hasOwnProperty('init'))
				app_object.init();
			else
				console.log("No Init()")

			return app_object;
		});
		//Carico il file con la definizione dell'interfaccia
		//Disegno la view
		//Carico lo stato dell'oggetto dal database
		//Bindo il model al controller
		//Applico il model alla view
		//Bindo il controller alla view
		//Così nel controller se manipolo il model, si riflettono i cambiamenti sulla view



	};


	//Queste saranno funzioni di sistema non usate dal programmatore di app, anche se
	//comunque rilasciate come lib probabilmente.
	Apio.Property = {};

	Apio.Property.Object = function() {
		this.render = function() {};
	}
	Apio.Property.Slider = function(config) {
		//oggetto slider, con rendering ed eventi
	};
	Apio.Property.Trigger = function(config) {

	}

	function renderApplication(appName,domElement) {
		$.get("/apio/getApplicationXml"+appName,function(data){
			//data is xml content
			//var obj = xml2json(data)
			//Scorro il dom dell'app
			// Faccio i miei succosi bindings
			//Attacco il dom dell'app al dom dell'applicazionemadre
			//profit
			//
		})
	}



Apio.Util = {};

Apio.Util.isSet = function(value) {
  if (value !== null && "undefined" !== typeof value)
    return true;
  return false;
};

Apio.Util.ApioToJSON = function(str) {
  //var regex = /(.[a-z0-9])*\:([a-z0-9]*\:[a-z0-9]*\-).*/gi;
  var regex = /([lz])?(\w+)\:(send|update|register+)?\:?([\w+\:\w+\-]+)/;
  var match = regex.exec(str);
  var obj = {};
  if (Apio.Util.isSet(match[1]))
    obj.protocol = match[1];
  obj.objectId = match[2];
  if (Apio.Util.isSet(match[3]))
    obj.command = match[3];
  var mess = match[4];
    obj.properties = {};
  mess = mess.split("-");
  mess.pop();
  mess.forEach(function(e){
    var t = e.split(":");
    console.log(t);
    obj.properties[t[0]] = t[1];
  });


  return obj;
};
		module.exports = Apio;
})();


},{}],2:[function(require,module,exports){
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



$(document).ready(function(){
  console.log("Dom is ready");
  $.ajax({
    url : '/apio/database/getObjects',
    method: 'GET',
    success : function(data) {
      
    }
  })
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





},{"./apio.client.js":1}]},{},[2]);
