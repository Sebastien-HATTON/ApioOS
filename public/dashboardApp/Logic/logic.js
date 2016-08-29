//Copyright 2014-2015 Alex Benfaremo, Alessandro Chelli, Lorenzo Di Berardino, Matteo Di Sabatino

/********************************* LICENSE ***********************************
 *                                                                           *
 * This file is part of ApioOS.                                              *
 *                                                                           *
 * ApioOS is free software released under the GPLv2 license: you can         *
 * redistribute it and/or modify it under the terms of the GNU General       *
 * Public License version 2 as published by the Free Software Foundation.    *
 *                                                                           *
 * ApioOS is distributed in the hope that it will be useful, but             *
 * WITHOUT ANY WARRANTY; without even the implied warranty of                *
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the              *
 * GNU General Public License version 2 for more details.                    *
 *                                                                           *
 * To read the license either open the file COPYING.txt or                   *
 * visit <http://www.gnu.org/licenses/gpl2.txt>                              *
 *                                                                           *
 *****************************************************************************/

angular.module("ApioDashboardApplication").controller("ApioDashboardLogicController", ["$scope", "socket", "logicService", "objectService", "$http", "$rootScope", "$state", "sweet", "$sce", function ($scope, socket, logicService, objectService, $http, $rootScope, $state, sweet, $sce) {
    var addLog = function (log) {
        //$scope.console_text += "----------------------\n" + log + "----------------------\n";
        $scope.console_logs.push(log);
    };

    socket.on("apio_logic_delete", function (data) {
        $http.get("/apio/user/getSessionComplete").success(function (session) {
            if (data.apioId === session.apioId) {
                for (var i = 0; i < $scope.logics.length; i++) {
                    if (data.name === $scope.logics[i]) {
                        $scope.logics.splice(i--, 1);
                    }
                }

                if (!$scope.$$phase) {
                    $scope.$apply();
                }
            }
        });
    });

    socket.on("logic_log", function (data) {
        addLog({
            message: data,
            type: "warning"
        });

        if ($scope.showHelpDevelop !== "console") {
            $scope.openCloseConsole();
        }

        if (!$scope.$$phase) {
            $scope.$apply();
        }
    });

    socket.on("apio_logic_modify", function (data) {
        $http.get("/apio/user/getSessionComplete").success(function (session) {
            if (data.apioId === session.apioId) {
                for (var i = 0; i < $scope.logics.length; i++) {
                    if (data.name === $scope.logics[i]) {
                        $scope.logics[i] = data.newName;
                    }
                }

                if (!$scope.$$phase) {
                    $scope.$apply();
                }
            }
        });
    });

    socket.on("apio_logic_new", function (data) {
        $http.get("/apio/user/getSessionComplete").success(function (session) {
            if (data.apioId === session.apioId && $scope.logics.indexOf(data.newName) === -1) {
                $scope.logics.push(data.newName);
                $scope.logics.sort();

                if (!$scope.$$phase) {
                    $scope.$apply();
                }
            }
        });
    });

    $scope.objects;
    $scope.ip;
    $scope.selected = 1;
    $scope.newFile = 0;
    //$scope.console_text = "";
    $scope.console_logs = [];
    $scope.currentlogic;
    //var socket2 = {};

    $scope.clearConsole = function () {
        $scope.console_logs = [];
    };

    $scope.initApioDashboardLogicList = function () {
        //Carico gli oggetti
        //$http.get("/apio/getIP").success(function (ip) {
        //	$scope.ip = ip.split(" ")[0];
        //	 var socketLogic= io.connect("http://"+$scope.ip+":8099");
        //	 socketLogic.on("logic_update", function(data){
        //    	console.log("Arriva data", data)
        //    	$rootScope.$emit("terminal.logic.echo", data)
        //
        //
        //	});
        //	//$http.get("http://" + ip.split(" ")[0] + ":8099/apio/logic").success(function (data) {
        //	$http.get("http://" + ip.split(" ")[0] + ":8091/apio/logic").success(function (data) {
        //		console.log(data)
        //		$scope.logics = data;
        //
        //    //$scope.currentUserActive = data;
        //    });
        //});

        socket.on("logic_update", function (data) {
            console.log("Arriva data", data);
            $rootScope.$emit("terminal.logic.echo", data);
        });

        //$http.get("/apio/service/dongle/route/" + encodeURIComponent("/apio/logic")).success(function (data) {
        $http.get("/apio/service/logic/route/" + encodeURIComponent("/apio/logic")).success(function (data) {
            console.log(data);
            $scope.logics = data;
            $scope.logics.sort();
        });
    };

    $scope.currentUserEmail = function () {
        $http.get("/apio/user/getSession").success(function (data) {
            console.log(data);
            $http.post("/apio/user/getUser", {
                email: data
            }).success(function (a) {
                console.log(a);
                $scope.currentUserActive = a.user;
                var index = $scope.roles.indexOf($scope.currentUserActive.role);
                if (index > 0) {
                    $scope.roles.splice(0, index);
                }
                console.log($scope.currentUserActive);
            });
            //$scope.currentUserActive = data;
        });
    };

    $scope.launchSection = function (value) {
        $scope.selected = value;
    };

    $scope.dictionaryMethods = {
        listen: {
            modelLoop: "*chooseVariabelName*.set('objectId','propertyName',function(valore){/*insert here your code*/});",
            setup: "var *chooseVariabelName* = new logic.listenProperty();",
            wiki: {
                name: "Listener",
                //description: "<h2>Listener</h2><h3>logic.listenProperty <span style='font-size:10px;'>Sub-Object to Logic Object</span></h3><h4>Listen the object property value and call the Callback when it changes.</h4><div style='width: 100%;margin-top: 30px;height: 1px;background-color: #c2c2c2;'></div><h3>Methods</h3><p>.set()</p><h3>Usage</h3><table class='table'> <thead> <tr> <th>#</th> <th>Param</th> <th>Type</th> <th>Details</th> </tr> </thead> <tbody> <tr> <th scope='row'>1</th> <td>objectId</td> <td>String</td> <td>id dell'applicazione di cui tu vuoi essere notificato al cambiamento del valore della property al secondo parametro</td> </tr> <tr> <th scope='row'>2</th> <td>propertyName</td> <td>String</td> <td>il nome della proprietà, dell'oggetto assegnato al primo parametro, di cui tu vuoi essere notificato al cambiamento del suo valore</td> </tr> <tr> <th scope='row'>3</th> <td>Callback()</td> <td>String</td> <td>la funzione che vuoi che sia chiamata al cambiamento del valore</td> </tr> </tbody> </table> <h3>Example</h3><p><label>Out of the Loop</label></p><div>var listenerPIR = new logic.listenProperty();</div><div>var x;</div><p></p><p><label>Inner of the Loop</label></p><div>listenerPIR.set('15','onoff',function(valore){</div><div>x=valore;</div><div>})</div><div>console.log('the property onoff of the object 15 changed its value the actual value is: ',x)</div><p><span class='label label-default'>the property onoff of the object 15 changed its value the actual value is: 1</span></p>"
                description: "<h2>Listener</h2><h3>logic.listenProperty <span style='font-size:10px;'>Sub-Object to Logic Object</span></h3><h4>Listen the object property value and call the Callback when it changes.</h4><div style='width: 100%;margin-top: 30px;height: 1px;background-color: #c2c2c2;'></div><h3>Methods</h3><p>.set()</p><h3>Usage</h3><table class='table'> <thead> <tr> <th>#</th> <th>Param</th> <th>Type</th> <th>Details</th> </tr> </thead> <tbody> <tr> <th scope='row'>1</th> <td>objectId</td> <td>String</td> <td>id of the application in which there's the property you want to be notified if there's a value change</td> </tr> <tr> <th scope='row'>2</th> <td>propertyName</td> <td>String</td> <td>name of the property you want to notified if there's a value change</td> </tr> <tr> <th scope='row'>3</th> <td>Callback()</td> <td>String</td> <td>the function you want to call if there's a value change</td> </tr> </tbody> </table> <h3>Example</h3><p><label>Out of the Loop</label></p><div>var listenerPIR = new logic.listenProperty();</div><div>var x;</div><p></p><p><label>Inner of the Loop</label></p><div>listenerPIR.set('15','onoff',function(valore){</div><div>x=valore;</div><div>})</div><div>console.log('the property onoff of the object 15 changed its value the actual value is: ',x)</div><p><span class='label label-default'>the property onoff of the object 15 changed its value the actual value is: 1</span></p>"
            }
        },
        setProperty: {
            modelLoop: "logic.setProperty('objectId','propertyName','value');",
            wiki: {
                name: "Setter",
                //description: "<h2>Setter</h2><h3>logic.setProperty <span style='font-size:10px;'>method to Logic Object</span></h3><h4>Set the object property value to the wanted value.</h4><div style='width: 100%;margin-top: 30px;height: 1px;background-color: #c2c2c2;'></div><h3>Usage</h3><table class='table'> <thead> <tr> <th>#</th> <th>Param</th> <th>Type</th> <th>Details</th> </tr> </thead> <tbody> <tr> <th scope='row'>1</th> <td>objectId</td> <td>String</td> <td>id dell'applicazione di cui tu hai bisogno di settare il valore</td> </tr> <tr> <th scope='row'>2</th> <td>propertyName</td> <td>String</td> <td>il nome della proprietà, dell'oggetto assegnato al primo parametro, di cui tu hai bisogno settare il valore</td> </tr> <tr> <th scope='row'>3</th> <td>propertyValue</td> <td>String</td> <td>il valore da assegnare alla proprietà indicata nel secondo parametro</td> </tr> </tbody> </table> <h3>Example</h3><div>logic.setProperty('15','onoff',1)</div><div>var x = logic.getProperty('15','onoff')</div><div>console.log('property onoff of the object 15: ',x)</div><p><span class='label label-default'>property onoff of the object 15: 1</span></p>"
                description: "<h2>Setter</h2><h3>logic.setProperty <span style='font-size:10px;'>method to Logic Object</span></h3><h4>Set the object property value to the wanted value.</h4><div style='width: 100%;margin-top: 30px;height: 1px;background-color: #c2c2c2;'></div><h3>Usage</h3><table class='table'> <thead> <tr> <th>#</th> <th>Param</th> <th>Type</th> <th>Details</th> </tr> </thead> <tbody> <tr> <th scope='row'>1</th> <td>objectId</td> <td>String</td> <td>id of the application where you want to set the value of the property</td> </tr> <tr> <th scope='row'>2</th> <td>propertyName</td> <td>String</td> <td>name of the property you want to set the value</td> </tr> <tr> <th scope='row'>3</th> <td>propertyValue</td> <td>String</td> <td>the value you want to set</td> </tr> </tbody> </table> <h3>Example</h3><div>logic.setProperty('15','onoff',1)</div><div>var x = logic.getProperty('15','onoff')</div><div>console.log('property onoff of the object 15: ',x)</div><p><span class='label label-default'>property onoff of the object 15: 1</span></p>"
            }
        },
        getProperty: {
            modelLoop: "logic.getProperty('objectId','propertyName');",
            wiki: {
                name: "Getter",
                //description: "<h2>Getter</h2><h3>logic.getProperty <span style='font-size:10px;'>method to Logic Object</span></h3><h4>Return the object property value as a String. </h4><div style='width: 100%;margin-top: 30px;height: 1px;background-color: #c2c2c2;'></div><h3>Usage</h3><table class='table'> <thead> <tr> <th>#</th> <th>Param</th> <th>Type</th> <th>Details</th> </tr> </thead> <tbody> <tr> <th scope='row'>1</th> <td>objectId</td> <td>String</td> <td>id dell'applicazione di cui tu hai bisogno di conoscere il valore</td> </tr> <tr> <th scope='row'>2</th> <td>propertyName</td> <td>String</td> <td>il nome della proprietà, dell'oggetto passato come primo prametro, di cui tu hai bisogno di conoscere il valore</td> </tr></tbody> </table><h3>Example</h3><div>var x = logic.getProperty('15','onoff')</div><div>console.log('property onoff of the object 15: ',x)</div><p><span class='label label-default'>property onoff of the object 15: 1</span></p>"
                description: "<h2>Getter</h2><h3>logic.getProperty <span style='font-size:10px;'>method to Logic Object</span></h3><h4>Return the object property value as a String. </h4><div style='width: 100%;margin-top: 30px;height: 1px;background-color: #c2c2c2;'></div><h3>Usage</h3><table class='table'> <thead> <tr> <th>#</th> <th>Param</th> <th>Type</th> <th>Details</th> </tr> </thead> <tbody> <tr> <th scope='row'>1</th> <td>objectId</td> <td>String</td> <td>id of the application in which there's the property you want to know the value</td> </tr> <tr> <th scope='row'>2</th> <td>propertyName</td> <td>String</td> <td>name of the property you want to know the value</td> </tr></tbody> </table><h3>Example</h3><div>var x = logic.getProperty('15','onoff')</div><div>console.log('property onoff of the object 15: ',x)</div><p><span class='label label-default'>property onoff of the object 15: 1</span></p>"
            }
        },
        GettingStarted: {
            wiki: {
                name: "GettingStarted",
                //description: "<h3>Getting Started</h3><p>Di seguito realizzeremo una ApioRules che associa il valore della property 'allarme' dell'applicazione 'PIR' alla property 'onoff' dell'applicazione 'Sirena'</p><h4>Comeon!</h4><p><div style='padding:2%; background-color:black; color:white;'><div>module.exports = function(logic){</div><div>var i= 0;</div><div>var listenerAllarme = new logic.listenProperty();</div><div>var loop= function () {</div><div>listenerAllarme.set('15','allarme',function(valore){</div><div style='margin-left:1%;'>if(valore===1){</div><div style='margin-left:2%;'>logic.setProperty('11','onoff','1');</div><div style='margin-left:1%;'>} else if(valore===0) {</div><div style='margin-left:2%;'>logic.setProperty('11','onoff','0');</div><div style='margin-left:1%;'>}</div><div>}</div><div>return loop;</div><div>};</div></div></p><p></p><p>Tralascioando la struttura di base. Come prima cosa dichiaro una variabile <label>var listenerAllarme</label> alla quale viene assegnata l'istanza del metodo listenProperty dell'oggetto logic <label>var listenerAllarme = new logic.listenProperty();</label></p><p>L'istanza della funzione è un operazione da ripetere solo la prima volta al lancio della ApioRules, per tanto è un operazione fatta al di fuori del <label>var loop=function(){}</label>. In quest'ultimo invece chiamiamo il metodo 'set' dell'oggetto 'listenerAllarme' precedentemente istanziato:</p><div style='padding:2%; background-color:black; color:white;'><div>listenerAllarme.set('15','allarme',function(valore){</div><div style='margin-left:1%;'>if(valore===1){</div><div style='margin-left:2%;'>logic.setProperty('11','onoff','1');</div><div style='margin-left:1%;'>} else if(valore===0) {</div><div style='margin-left:2%;'>logic.setProperty('11','onoff','0');</div><div style='margin-left:1%;'>}</div><div>});</div></div><p>Questo metodo permette di mettersi in ascolto di una 'property' di un oggetto e essere avvisato ogni qualvolta il volore varia, in quel caso si può eseguire qualsiasi codice nella sua callBack(valore). Quest'ultima all'interno del suo namespace si riserva una varibile di nome 'valore' che contine il valore della 'property' aggiornato della variazione. Per ulteriori informazioni sull'oggetto <label>new logic.listenProperty()</label> vedi la sezzione 'Listener' del menu a sinistra. Nello specifico caso il listener è in ascolto della property 'allarme' dell'oggetto '15' (applicazione PIR)</p><p></p><p>Nella <label>callBack(valore)</label> dell'oggetto 'lestenerAllarme('15','allarme',<label>function(){}</label>)' troviamo il codice che imposta il valore della property 'onoff' dell'oggetto '11' (applicazione Sirena) a 1 se il valore della property 'allarme' dell'oggetto 15 (applicazione PIR) è pari ad 1, viceversa a 0.</p><p><div style='padding:2%; background-color:black; color:white;'><div style='margin-left:1%;'>if(valore===1){</div><div style='margin-left:2%;'>logic.setProperty('11','onoff','1');</div><div style='margin-left:1%;'>} else if(valore===0) {</div><div style='margin-left:2%;'>logic.setProperty('11','onoff','0');</div><div style='margin-left:1%;'>}</div></div></p><p>Nello specifico il metodo logic.setProperty vengono appunto utilizzati per impostare il valore di una property di un oggetto, quest'azione si ripercuote sull'oggetto Reale (in questo caso attiva il Relè che fa suonare la Sirena) come sul Cloud e su tutte le interfacce utenti connesse.</p><p></p><p>Questa è la potenza di Apio!</p>"
                description: "<h3>Getting Started</h3><p>Now we're gonna create an ApioRule that will associate the property 'allarme' of the application 'PIR' to the property 'onoff' of the application 'Sirena'</p><h4>Come on!</h4><p><div style='padding:2%; background-color:black; color:white;'><div>module.exports = function(logic){</div><div>var i= 0;</div><div>var listenerAllarme = new logic.listenProperty();</div><div>var loop= function () {</div><div>listenerAllarme.set('15','allarme',function(valore){</div><div style='margin-left:1%;'>if(valore===1){</div><div style='margin-left:2%;'>logic.setProperty('11','onoff','1');</div><div style='margin-left:1%;'>} else if(valore===0) {</div><div style='margin-left:2%;'>logic.setProperty('11','onoff','0');</div><div style='margin-left:1%;'>}</div><div>}</div><div>return loop;</div><div>};</div></div></p><p></p><p>Now we will examine the code, first of all there's the declaration of a variable: <label>var listenerAllarme</label> to which is assigned the instance of the method listenProperty of the object logic. <label>var listenerAllarme = new logic.listenProperty();</label></p><p>This instruction have to be repeated just once, when the ApioRule is launched, so have to be done out of the scope of <label>var loop=function(){}</label>. Inside it instead we call the method 'set' of the object 'listenerAllarme' instantiated before:</p><div style='padding:2%; background-color:black; color:white;'><div>listenerAllarme.set('15','allarme',function(valore){</div><div style='margin-left:1%;'>if(valore===1){</div><div style='margin-left:2%;'>logic.setProperty('11','onoff','1');</div><div style='margin-left:1%;'>} else if(valore===0) {</div><div style='margin-left:2%;'>logic.setProperty('11','onoff','0');</div><div style='margin-left:1%;'>}</div><div>});</div></div><p>As the sign suggests this method allows you to listen when a property of an object changes value, when this happen the callback will activate and the new value is passed in it (variable 'valore' of the callback); here you can write the necessary lines of code to execute when the value changes. For more information about the object <label>new logic.listenProperty()</label> click on the section 'Listener' on the left menu. In this specific case it is listen of the property 'allarme' of the object '15' (PIR application)</p><p></p><p>In the <label>callback</label> of the object 'listenerAllarme' we find the code the sets the value of the property 'onoff' of the object '11' (Sirena application) to 1 if the value of the property 'allarme' of the object 15 (PIR application) turns to 1, 0 vice versa.</p><p><div style='padding:2%; background-color:black; color:white;'><div style='margin-left:1%;'>if(valore===1){</div><div style='margin-left:2%;'>logic.setProperty('11','onoff','1');</div><div style='margin-left:1%;'>} else if(valore===0) {</div><div style='margin-left:2%;'>logic.setProperty('11','onoff','0');</div><div style='margin-left:1%;'>}</div></div></p><p>The method logic.setProperty is the one to use to set the property of an object, this action has effect also on the real object (this in specific case it actives the relay the siren) as in the cloud as in all interfaces the user connected to.</p><p></p><p>That's the power of Apio!</p>"
            }
        },
        ApioRules: {
            wiki: {
                name: "ApioRules",
                //description: "<h3>Introducing ApioRules</h3><p>Quando scrivi un applicazione Web puoi dare dinamicità ai tuoi contenuti, tuttavia l'applicazione cessa di funzionare nel momento in cui il tuo Browser viene chiuso... In un ambiente in cui le informazioni non provengono solo dagli utenti ma arrivano in modo autonomo anche dagli oggetti, è importante avere un mezzo per eseguire operazioni anche quando l'utente non sta visualizzando l'applicazione.</p><p>Creando una ApioRules la tua applicazione rimarrà aperta in uno speciale modo che gli permetterà di compiere azioni e logiche in back-ground. Tutto questo è possibile grazie ad ApioOS e il suo Cloud!</p><p>ApioRules ti permette di scrivere Applicazioni Server Side legate a View Web Client Side senza preoccuparti in alcun modo di struttura dati, chiamate al DB, implimentazioni real time e altro. Tutto questo viene mappato dall'oggetto Logic e dai suoi Metodi.</p><h4>Basic Structure</h4><p>Ogni nuova Rule di base presenta la seguente struttura:</p><div style='padding:2%; background-color:black; color:white;'><div>module.exports = function(logic){</div><div>var i= 0;</div><div>var loop= function () {</div><div>}</div><div>return loop;</div><div>};</div></div><p>Tutto quello che vuoi scrivere deve essere inserito all'interno della struttura: <span>module.exports = function(logic){};</span></p><p>Questa struttura importa l'oggetto Logic e proprone una struttura a Loop (tutti  metodi di questo oggetto sono illustrati nel dettaglio nel menu a sinistra). Per tutte quelle operazioni di inizializzazione o  che comunque hanno necessità di essere eseguite una sola volta, puoi scrivere all'esterno di Loop. Viceversa qualsiasi cosa scriverai all'interno di Loop verrà eseguita ad ogni ciclo.</p><p> Inoltre esistono alcuni metedodi dell'oggetto Logic che permettono di muoversi all'interno del Loop con un approccio ad Eventi (vedi la voce 'Listener' nel menu a sinistra) .</p><p>Ricordati che un ApioRules è a tutti gli effetti un applicazione Javascript Server Side (basata su NodeJS), quindi puoi importare ed utilizzare qualsiasi modulo Javascript all'intenro di un ApioRules...</p><h4>What can you do with ApioRules?</h4><h5>You can bind an application property with an other application property!</h5><p></p><h5>You can build an algorithm to study how users use an application / object!</h5><p></p><h5>You can build an Artifical Inteligence to realize services Domand Response based!</h5><p></p><h5>You can give Magic to Users and create Smart Experiences</h5>"
                description: "<h3>Introducing ApioRules</h3><p>Writing a Web app means give dynamism to your contents, but obviously all stops to work when the browser get closed... In an environment where the information come both from users and from objects, it's important to let these operations continue also when the user is not displaying the app.</p><p>An ApioRule will create a sort of always-running background process that will let your app to execute actions and logics. This is possbile with ApioOs and its Cloud!</p><p>ApioRules allow you to write server side applications binded to client side web views without worrying of data or real time algorithm or something else. This is mapped by the object logic e its methods.</p><h4>Basic Structure</h4><p>Every new Rule has got the following structure:</p><div style='padding:2%; background-color:black; color:white;'><div>module.exports = function(logic){</div><div>var i= 0;</div><div>var loop= function () {</div><div>}</div><div>return loop;</div><div>};</div></div><p>What you want to write have to inserted into the structure: <span>module.exports = function(logic){};</span></p><p>This structure automatically imports the object logic and propose a loop-based structure (a detail of all methods is shown on the left menu). The operations you have to execute always have to be in the scope of the function loop those who have to be executed once have to be out of this scope.</p><p>Moreover some methods of the object logic allows you to take advantage of the event-driven programming (more on the section 'Listener', click on the left menu).</p><p>Rember that each ApioRule is a javascript server-side application (based on Node.js), so you can import and use each Node.js module is installed in ApioOS in every ApioRule...</p><h4>What can you do with ApioRules?</h4><h5>You can bind an application property with another!</h5><p></p><h5>You can build an algorithm to study how users use an application / object!</h5><p></p><h5>You can build an Artificial Intelligence to create Demand Response services!</h5><p></p><h5>You can give Magic to Users and create Smart Experiences!</h5>"
            }
        }
    };

    var insertMethod = 0;
    $scope.aceLoadedHtml = function (_editor) {
        $scope.$parent.editorHtml = _editor;
        _editor.on("change", function (e) {
            console.log("CHANGE********************", e);
            console.log("insert", insertMethod);
            console.log("e.lines[0]", e.lines[0]);
            if (insertMethod === 1 && e.lines[0] == " ") {
                insertMethod = 0;
                console.log("insertPoi", insertMethod);


                if (typeof $scope.dictionaryMethods[$scope.selectMethods].setup !== "undefined") {
                    var cursorCurrentPosition = e.start
                    console.log("devo aggiungere qualcosa anche nel setup");
                    _editor.moveCursorTo(1, 1);
                    //_editor.insert("\n");
                    _editor.insert(String($scope.dictionaryMethods[$scope.selectMethods].setup) + "\n");
                    _editor.moveCursorTo(2, 0);
                    _editor.indent()
                    _editor.moveCursorTo(cursorCurrentPosition.row + 1, cursorCurrentPosition.column)


                }
                console.log("aggiungo il metodo", $scope.selectedObject);
                //_editor.moveLinesDown();
                if ($scope.selectedObject != "") {
                    var objectIdSelected = $scope.dictionaryMethods[$scope.selectMethods].modelLoop.replace("objectId", $scope.selectedObject)
                    if (typeof $scope.selectedProperty != "undefined" && $scope.selectedProperty !== "undefined" && $scope.selectedProperty != "") {
                        objectIdSelected = objectIdSelected.replace("propertyName", $scope.selectedProperty)
                    }
                    _editor.insert(String(objectIdSelected));
                } else {
                    _editor.insert(String($scope.dictionaryMethods[$scope.selectMethods].modelLoop));
                }


                document.getElementById("insertMethods").setAttribute("style", "");
            }
        });
        console.log("editor in ace html loaded: ");
        console.log(_editor);
        console.log("$scope.editor in ace html loaded: ");
        console.log($scope.$parent.editorHtml);
    };

    $scope.selectMethods;
    $scope.insert = function (e) {
        console.log("METHODS SELECTED", $scope.selectMethods);
        if (typeof $scope.selectMethods !== "undefined" && $scope.selectMethods != "") {
            insertMethod = 1;
            document.getElementById("insertMethods").setAttribute("style", "background-color: rgba(42, 235, 63, 0.92);");
        } else {
            document.getElementById("selectMethods").classList.add("selectAMethods");
            setTimeout(function () {
                document.getElementById("selectMethods").classList.remove("selectAMethods");
            }, 1000);
        }
        //$scope.$parent.editorHtml.getCursorPosition();
        //$scope.$parent.editorHtml.moveLinesDown();
    };

    //variabile di scope per ng-show sull'HelpDevelopPannel
    $scope.showHelpDevelop = "editor";

    //funzione che gestisce il click sul pulsante editor
    $scope.openCloseConsole = function () {
        if ($scope.showHelpDevelop == "console") {
            $scope.showHelpDevelop = "editor"
        } else {
            $scope.showHelpDevelop = "console"
        }
    };

    //funzione che gestisce il click sul pulsante wiki
    $scope.openCloseWiki = function () {
        if ($scope.showHelpDevelop == "wiki") {
            $scope.showHelpDevelop = "editor"
        } else {
            $scope.showHelpDevelop = "wiki"
        }
    };

    //inizializzo suggerimento pulsante aggiungi metodo
    $(function () {
        $('[data-toggle="addMethod"]').tooltip()
    });

    //funzione che si appoggia al modulo $sce angulare (incluso nelle dipendenze di questa App) che permette di intepretare un Json come HTML
    $scope.translateHtml = function (v) {
        return $sce.trustAsHtml(v);
    };

    //variabile che controlla la wikiDescription da visualizzare
    $scope.wikiView = "ApioRules";
    //funzione che gestisce la visualizzazione delle wikiDescription in base alle label wikiName selezionate
    $scope.showWikiDescription = function (e) {
        console.log("e vale", e.target);
        console.log("label is:", e.target.id);
        $scope.wikiView = e.target.id;
        console.log("wikiView vale:", $scope.wikiView);
    };

    $scope.logics = [];
    //$scope.started = false;
    $scope.initApioDashboardLogicList();

    $scope.logicFile = "";
    $scope.oldName = "";

    $scope.launchFile = function (file) {
        if (document.getElementById(file)) {
            Apio.runApioLoading(document.getElementById(file), true, "10");
        }
        console.log("Famo apri sta modal");
        $("#fileEditor").modal();
        //Return the real user
        $scope.currentlogic = file;
        $scope.oldName = file;
        console.log(file);
        //$http.post("http://" + $scope.ip.split(" ")[0] + ":8091/apio/logic/file", {
        //    //$http.post("http://"+$scope.ip.split(" ")[0]+":8099/apio/logic/file", {
        //    "file": file
        //}).success(function (data) {
        //    console.log(data);
        //    $scope.logicFile = data;
        //    //$scope.role = data.user.role;
        //    $("#fileEditor").modal();
        //    if (document.getElementById(file)) {
        //        Apio.stopApioLoading();
        //    }
        //});

        //$http.post("/apio/service/dongle/route/" + encodeURIComponent("/apio/logic/file") + "/data/" + encodeURIComponent(JSON.stringify({
        $http.post("/apio/service/logic/route/" + encodeURIComponent("/apio/logic/file") + "/data/" + encodeURIComponent(JSON.stringify({
                file: file
            }))).success(function (data) {
            console.log(data);
            $scope.logicFile = data;
            $("#fileEditor").modal();
            if (document.getElementById(file)) {
                Apio.stopApioLoading();
            }

        }).error(function (error) {
            //$scope.console_text = error;
            addLog({
                message: error,
                type: "danger"
            });

            if ($scope.showHelpDevelop !== "console") {
                $scope.openCloseConsole();
            }

            if (!$scope.$$phase) {
                $scope.$apply();
            }
        });
    };

    $scope.delete = function () {
        sweet.show({
            title: "Deleting Logic.",
            text: "Your will not be able to restore the logic",
            type: "warning",
            showCancelButton: true,
            confirmButtonClass: "btn-warning",
            cancelButtonClass: "btn-info",
            confirmButtonText: "Delete the Logic",
            cancelButtonText: "Keep it",
            closeOnConfirm: false,
            closeOnCancel: true
        }, function (isConfirm) {
            if (isConfirm) {
                //$http.post("/apio/service/dongle/route/" + encodeURIComponent("/apio/logic/delete") + "/data/" + encodeURIComponent(JSON.stringify({
                $http.post("/apio/service/logic/route/" + encodeURIComponent("/apio/logic/delete") + "/data/" + encodeURIComponent(JSON.stringify({
                        name: $scope.currentlogic
                    }))).success(function () {
                    for (var i = 0; i < $scope.logics.length; i++) {
                        console.log("Logics: ", $scope.logics[i]);
                        console.log("oldName: ", $scope.oldName);

                        if ($scope.logics[i] == $scope.oldName) {

                            $scope.logics.splice(i, 1);
                            console.log("logics", $scope.logics)
                            $("#fileEditor").modal("hide");
                            break

                        }
                    }

                    console.log("/apio/logic/delete success()");
                    //sweet.show("Done!", "Your wizard procedure is done. Proceed to The Apio editor", "success");
                    sweet.show({
                        title: "Done!",
                        text: "Logic is deleted",
                        type: "success",
                        showCancelButton: false,
                        confirmButtonClass: "btn-success",
                        confirmButtonText: "Ok",
                        closeOnConfirm: true
                    }, function () {


                    });
                }).error(function () {
                    console.log("/apio/logic/delete failure()");
                });
            }
        });
    };

    $scope.save = function () {
        console.log("SAVEEEEEEEE");
        console.log($scope.logicFile)
        if ($scope.newFile == 1) {
            //$http.post("http://" + $scope.ip.split(" ")[0] + ":8091/apio/logic/newFile", {
            //    //$http.post("http://"+$scope.ip.split(" ")[0]+":8099/apio/logic/newFile", {
            //    "file": $scope.logicFile,
            //    "name": $scope.oldName,
            //    "newName": $scope.currentlogic
            //}).success(function () {
            //    $scope.logicFile = "";
            //    $scope.logics.push($scope.currentlogic);
            //    $scope.currentlogic = "";
            //    $scope.newFile = 0;
            //
            //    //$scope.role = data.user.role;
            //    $("#fileEditor").modal("hide");
            //});

            //$http.post("/apio/service/dongle/route/" + encodeURIComponent("/apio/logic/newFile") + "/data/" + encodeURIComponent(JSON.stringify({
            $http.post("/apio/service/logic/route/" + encodeURIComponent("/apio/logic/newFile") + "/data/" + encodeURIComponent(JSON.stringify({
                    file: $scope.logicFile,
                    name: $scope.oldName,
                    newName: $scope.currentlogic
                }))).success(function () {
                $scope.logicFile = "";
                $scope.logics.push($scope.currentlogic);
                $scope.logics.sort();
                $scope.currentlogic = "";
                $scope.newFile = 0;

                //$scope.role = data.user.role;
                $("#fileEditor").modal("hide");
            }).error(function (error) {
                //$scope.console_text = error;
                addLog({
                    message: error,
                    type: "danger"
                });

                if ($scope.showHelpDevelop !== "console") {
                    $scope.openCloseConsole();
                }

                if (!$scope.$$phase) {
                    $scope.$apply();
                }
            });
        } else {
            //$http.post("http://" + $scope.ip.split(" ")[0] + ":8091/apio/logic/modifyFile", {
            //    //$http.post("http://"+$scope.ip.split(" ")[0]+":8099/apio/logic/modifyFile", {
            //    "file": $scope.logicFile,
            //    "name": $scope.oldName,
            //    "newName": $scope.currentlogic
            //}).success(function () {
            //    $scope.logicFile = "";
            //
            //    if ($scope.currentlogic != $scope.oldName) {
            //        for (i in $scope.logics) {
            //            console.log("Logics: ", $scope.logics[i]);
            //            console.log("oldName: ", $scope.oldName);
            //
            //            if ($scope.logics[i] == $scope.oldName) {
            //                //console.log("")
            //                $scope.logics[i] = $scope.currentlogic
            //                break
            //            }
            //        }
            //    }
            //    $scope.currentlogic = "";
            //    //$scope.role = data.user.role;
            //    $("#fileEditor").modal("hide");
            //});

            //$http.post("/apio/service/dongle/route/" + encodeURIComponent("/apio/logic/modifyFile") + "/data/" + encodeURIComponent(JSON.stringify({
            $http.post("/apio/service/logic/route/" + encodeURIComponent("/apio/logic/modifyFile") + "/data/" + encodeURIComponent(JSON.stringify({
                    file: $scope.logicFile,
                    name: $scope.oldName,
                    newName: $scope.currentlogic
                }))).success(function () {
                $scope.logicFile = "";

                if ($scope.currentlogic != $scope.oldName) {
                    for (var i in $scope.logics) {
                        console.log("Logics: ", $scope.logics[i]);
                        console.log("oldName: ", $scope.oldName);

                        if ($scope.logics[i] == $scope.oldName) {
                            //console.log("")
                            $scope.logics[i] = $scope.currentlogic;
                            break
                        }
                    }
                }
                $scope.currentlogic = "";
                //$scope.role = data.user.role;
                $("#fileEditor").modal("hide");
            }).error(function (error) {
                //$scope.console_text = error;
                addLog({
                    message: error,
                    type: "danger"
                });

                if ($scope.showHelpDevelop !== "console") {
                    $scope.openCloseConsole();
                }

                if (!$scope.$$phase) {
                    $scope.$apply();
                }
            });
        }
    };

    $scope.runner = function () {
        console.log("............RUNNER.............");
        //if ($scope.console_text) {
        if ($scope.console_logs.length) {
            //$scope.console_text = "";
            if ($scope.showHelpDevelop === "console") {
                $scope.openCloseConsole();
            }
        }

        if ($scope.newFile == 1) {
            //$http.post("http://" + $scope.ip.split(" ")[0] + ":8091/apio/logic/newFile", {
            //    //$http.post("http://"+$scope.ip.split(" ")[0]+":8099/apio/logic/newFile", {
            //    "file": $scope.logicFile,
            //    "name": $scope.oldName,
            //    "newName": $scope.currentlogic
            //}).success(function () {
            //    //$scope.logicFile = "";
            //    $scope.logics.push($scope.currentlogic);
            //    //$scope.currentlogic = "";
            //    $scope.newFile = 0;
            //
            //    //$scope.role = data.user.role;
            //    //$("#fileEditor").modal("hide");
            //});

            //$http.post("/apio/service/dongle/route/" + encodeURIComponent("/apio/logic/newFile") + "/data/" + encodeURIComponent(JSON.stringify({
            $http.post("/apio/service/logic/route/" + encodeURIComponent("/apio/logic/newFile") + "/data/" + encodeURIComponent(JSON.stringify({
                    file: $scope.logicFile,
                    name: $scope.oldName,
                    newName: $scope.currentlogic
                }))).success(function () {
                //$scope.logicFile = "";
                $scope.logics.push($scope.currentlogic);
                $scope.logics.sort();
                //$scope.currentlogic = "";
                $scope.newFile = 0;

                //$scope.role = data.user.role;
                //$("#fileEditor").modal("hide");

                //QUI
                //alert('ok')
                console.log(document.getElementById('save'))
                if (!document.getElementById('save').classList.contains('succesfullSave')) {
                    document.getElementById('save').classList.add('succesfullSave');
                    console.log('normale')
                } else {
                    document.getElementById('save').classList.remove('succesfullSave');
                    console.log('timeout')
                    setTimeout(function () {
                        document.getElementById('save').classList.add('succesfullSave');
                    }, 1000)
                }
            }).error(function (error) {
                //$scope.console_text = error;
                addLog({
                    message: error,
                    type: "danger"
                });

                if ($scope.showHelpDevelop !== "console") {
                    $scope.openCloseConsole();
                }

                if (!$scope.$$phase) {
                    $scope.$apply();
                }
            });
        } else {
            //$http.post("http://" + $scope.ip.split(" ")[0] + ":8091/apio/logic/modifyFile", {
            //    //$http.post("http://"+$scope.ip.split(" ")[0]+":8099/apio/logic/modifyFile", {
            //    "file": $scope.logicFile,
            //    "name": $scope.oldName,
            //    "newName": $scope.currentlogic
            //}).success(function () {
            //    //$scope.logicFile = "";
            //
            //    if ($scope.currentlogic != $scope.oldName) {
            //        for (i in $scope.logics) {
            //            console.log("Logics: ", $scope.logics[i]);
            //            console.log("oldName: ", $scope.oldName);
            //
            //            if ($scope.logics[i] == $scope.oldName) {
            //                //console.log("")
            //                $scope.logics[i] = $scope.currentlogic
            //                break
            //            }
            //        }
            //    }
            //    //$scope.currentlogic = "";
            //    //$scope.role = data.user.role;
            //    //$("#fileEditor").modal("hide");
            //});

            //$http.post("/apio/service/dongle/route/" + encodeURIComponent("/apio/logic/modifyFile") + "/data/" + encodeURIComponent(JSON.stringify({
            $http.post("/apio/service/logic/route/" + encodeURIComponent("/apio/logic/modifyFile") + "/data/" + encodeURIComponent(JSON.stringify({
                    file: $scope.logicFile,
                    name: $scope.oldName,
                    newName: $scope.currentlogic
                }))).success(function () {
                //$scope.logicFile = "";

                if ($scope.currentlogic != $scope.oldName) {
                    for (var i in $scope.logics) {
                        console.log("Logics: ", $scope.logics[i]);
                        console.log("oldName: ", $scope.oldName);

                        if ($scope.logics[i] == $scope.oldName) {
                            //console.log("")
                            $scope.logics[i] = $scope.currentlogic
                            break
                        }
                    }
                }
                //$scope.currentlogic = "";
                //$scope.role = data.user.role;
                //$("#fileEditor").modal("hide");

                //QUI
                console.log(document.getElementById('save'))
                if (!document.getElementById('save').classList.contains('succesfullSave')) {
                    document.getElementById('save').classList.add('succesfullSave');
                    console.log('normale')
                } else {
                    document.getElementById('save').classList.remove('succesfullSave');
                    console.log('timeout')
                    setTimeout(function () {
                        document.getElementById('save').classList.add('succesfullSave');
                    }, 1000)
                }
            }).error(function (error) {
                //$scope.console_text = error;
                addLog({
                    message: error,
                    type: "danger"
                });

                if ($scope.showHelpDevelop !== "console") {
                    $scope.openCloseConsole();
                }

                if (!$scope.$$phase) {
                    $scope.$apply();
                }
            });
        }
    };

    $scope.newLogicFile = function () {
        $scope.logicFile = "module.exports = function(logic){\n\tvar i= 0;\n\tvar loop= function () {\n\t}\n\treturn loop;\n};"
        $scope.currentlogic = "new.js";
        $scope.oldName = "new.js";
        $scope.newFile = 1;
        $("#fileEditor").modal();
    };

    objectService.list().then(function (d) {
        $scope.objects = d.data;
        var objectsById = {};
        for (var i in $scope.objects) {
            objectsById[$scope.objects[i].objectId] = $scope.objects[i];
        }

        $scope.objects = objectsById;

        if (!$scope.$$phase) {
            $scope.$apply();
        }

        console.log("$scope.objects: ", $scope.objects);

        $scope.selectedObject = "";
    });

    $scope.$watch("selectedObject", function (newValue, oldValue) {
        console.log("selectedObject: ", newValue, oldValue);
    });

}]).run(function ($rootScope) {
    $rootScope.$on("terminal.main", function (e, input, terminal) {
        $rootScope.$emit("terminal.main.echo", "input received: " + input)
    });
});