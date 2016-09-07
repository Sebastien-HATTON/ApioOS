//Copyright 2014-2015 Alex Benfaremo, Alessandro Chelli, Lorenzo Di Berardino, Matteo Di Sabatino

/********************************** LICENSE *********************************
 *                                                                          *
 * This file is part of ApioOS.                                             *
 *                                                                          *
 * ApioOS is free software released under the GPLv2 license: you can        *
 * redistribute it and/or modify it under the terms of the GNU General      *
 * Public License version 2 as published by the Free Software Foundation.   *
 *                                                                          *
 * ApioOS is distributed in the hope that it will be useful, but            *
 * WITHOUT ANY WARRANTY; without even the implied warranty of               *
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the             *
 * GNU General Public License version 2 for more details.                   *
 *                                                                          *
 * To read the license either open the file COPYING.txt or                  *
 * visit <http://www.gnu.org/licenses/gpl2.txt>                             *
 *                                                                          *
 ****************************************************************************/

angular.module('ApioDashboardApplication').controller('WizardPanel', ['$scope', 'sweet', '$http', function ($scope, sweet, $http) {
    $scope.tab = 1;
    $scope.hide = false;
    this.progressBarValue = 0;
    $scope.activeForm = 1;

    this.saveFamily = function (family) {
        $scope.newObject.microFamily = family.family;
        if (family.family !== 'Apio')
            $scope.newObject.protocol = '';
        console.log('$scope.newObject.microFamily ' + $scope.newObject.microFamily);
    };
    this.saveType = function (type) {
        if (type.type === 'General')
            $scope.newObject.protocol = 'l';
        else
            $scope.newObject.protocol = '';

        $scope.newObject.microType = type.type;
        $scope.newObject.availablePins = type.pins
        console.log('pins:')
        console.log($scope.newObject.availablePins)
        console.log('$scope.newObject.microType ' + $scope.newObject.microType);
    };

    $scope.savePin = function (pin) {
        console.log('pin')
        console.log(pin)
        $scope.newPin.name = 'pin' + pin.number;
        $scope.newPin.number = pin.number;
    }

    $scope.selected = {};

    $scope.microData = [
        {
            "id": "0",
            "family": "Apio",
            "types": [
                {
                    "type": "General",
                    "pins": [
                        {
                            "number": "0",
                            "name": "D0"
                        },
                        {
                            "number": "1",
                            "name": "D1"
                        },
                        {
                            "number": "2",
                            "name": "D2"
                        },
                        {
                            "number": "3",
                            "name": "D3"
                        },
                        {
                            "number": "4",
                            "name": "D4"
                        },
                        {
                            "number": "5",
                            "name": "D5"
                        },
                        {
                            "number": "6",
                            "name": "D6"
                        },
                        {
                            "number": "7",
                            "name": "D7(PWM)"
                        },
                        {
                            "number": "8",
                            "name": "D8(PWM)"
                        },
                        {
                            "number": "9",
                            "name": "D9(PWM)"
                        },
                        {
                            "number": "A7",
                            "name": "A7"
                        },
                        {
                            "number": "A6",
                            "name": "A6"
                        },
                        {
                            "number": "A5",
                            "name": "A5"
                        },
                        {
                            "number": "A4",
                            "name": "A4"
                        },
                        {
                            "number": "A3",
                            "name": "A3"
                        },
                        {
                            "number": "A2",
                            "name": "A2"
                        },
                        {
                            "number": "A0",
                            "name": "A0"
                        },
                        {
                            "number": "20",
                            "name": "led1"
                        },
                        {
                            "number": "21",
                            "name": "led2"
                        }
                    ]
                }
            ]

        }, {
            "id": "1",
            "family": "Arduino",
            "types": [
                {
                    "type": "Uno",
                    "pins": [
                        {
                            "number": "0",
                            "name": "tx"
                        },
                        {
                            "number": "1",
                            "name": "rx"
                        }
                    ]
                },
                {"type": "Mega"},
                {"type": "Nano"}
            ]
        }, {
            "id": "2",
            "family": "ST",
            "types": [
                {"type": "Uno"},
                {"type": "Due"},
                {"type": "Tre"}
            ]
        }
    ];

    this.doneForm = function (isValid) {
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
            function (isConfirm) {
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
                        function () {
                            $scope.hideCreate = false;
                            $scope.hideCreateNew = true;
                            $scope.hideUpdate = true;
                            self.makeForm(isValid);
                        });

                }

            });
    };

    this.makeForm = function (isValid) {
        console.log('makeForm');
        this.nextForm(isValid);
        console.log('Apio Summary Object successfully created');
        console.log($scope.newObject);
        this.parserIno($scope.newObject);
        this.parserHtml($scope.newObject);
        this.parserJs($scope.newObject);
        this.parserMongo($scope.newObject);
        this.parserMakefile($scope.newObject);
        //$scope.icon=$scope.$parent.myCroppedImage;
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

    this.nextForm = function (isValid) {
        if (isValid) {
            console.log('nextForm')
            this.progressBarValue += 20;
            console.log('progressBarValue: ' + this.progressBarValue);
            console.log('previous activeForm : ' + $scope.activeForm);
            $scope.activeForm++;
            console.log('actual activeForm : ' + $scope.activeForm);

            this.selectTab($scope.activeForm);
        }
        ;
    };

    this.previousForm = function () {
        this.progressBarValue -= 20;
        console.log('progressBarValue: ' + this.progressBarValue);
        $scope.activeForm--;
        this.selectTab($scope.activeForm);
    };

    this.isDisabled = function (checkTab) {
        return checkTab !== $scope.activeForm;
    };

    this.selectTab = function (setTab) {
        if (setTab === $scope.activeForm)
            $scope.tab = setTab;
    };

    this.isSelected = function (checkTab) {
        return $scope.tab === checkTab;
    };

    this.parserTable = function (objectToParse) {

    };


    this.parserMakefile = function (objectToParse) {
        this.makefile = 'BOARD_TAG = ' + objectToParse.microType + '\n';
        this.makefile += 'ARDUINO_PORT = /dev/ttyACM0\n';
        this.makefile += 'ARDUINO_LIBS = \n';
        this.makefile += 'ARDUINO_DIR = /usr/share/arduino\n';
        this.makefile += 'include ../Arduino.mk';
    };

    this.parserMongo = function (objectToParse) {
        //VECCHIO
        //this.mongo =  '{\n';
        //this.mongo += '"name" : "'+objectToParse.objectName+'",\n';
        //this.mongo += '"type" : "object",\n';
        //this.mongo += '"objectId" : "'+objectToParse.objectId+'",\n';
        //this.mongo += '"protocol" : "'+objectToParse.protocol+'",\n';
        //this.mongo += '"address" : "'+objectToParse.address+'",\n';
        //this.mongo += '"properties": {\n';
        //for(key in objectToParse.properties){
        //    if(objectToParse.properties[key].type.toLowerCase()==='list'){
        //        this.mongo += '\t\t"'+objectToParse.properties[key].name+'" : ';
        //        for(keykey in objectToParse.properties[key].items){
        //            console.log('QUA '+keykey)
        //            console.log('QUI '+key)
        //            console.log('QUO '+objectToParse.properties[key].items[keykey])
        //            this.mongo += '"'+objectToParse.properties[key].items[keykey]+'",\n';
        //            break
        //        };
        //    }else{
        //        this.mongo += '\t\t"'+objectToParse.properties[key].name+'" : "'+objectToParse.properties[key].defaultValue+'",\n';
        //    }
        //
        //}
        //
        //var flagList = 0;
        //if((Object.keys(objectToParse.properties)).length!==0)
        //    this.mongo = this.mongo.slice(0,this.mongo.length-2);
        //this.mongo += '},\n';
        //this.mongo += '"notifications": {\n';
        //var indexPhy=0;
        //for(key in objectToParse.properties){
        //    if(objectToParse.properties[key].type.toLowerCase()==='physicalbutton'){
        //        this.mongo += '\t\t"'+objectToParse.properties[key].name+'" : {\n';
        //        this.mongo += '\t\t\t"'+objectToParse.properties[key].PhysicalButtonValue+'" : "Button '+objectToParse.properties[key].name+' of '+objectToParse.objectName+' pressed"\n';
        //        this.mongo += '\t\t},\n';
        //        indexPhy=indexPhy+1;
        //    }
        //}
        //if(indexPhy!=0)
        //    this.mongo = this.mongo.slice(0,this.mongo.length-2);
        //this.mongo += '},\n';
        //this.mongo += '"db" : {\n';
        //for(key in objectToParse.properties){
        //    if(objectToParse.properties[key].type.toLowerCase()==='list'){
        //        flagList = 1;
        //        this.mongo += '\t\t"'+objectToParse.properties[key].name+'" : {\n';
        //        for(keykey in objectToParse.properties[key].items){
        //            this.mongo += '\t\t"'+objectToParse.properties[key].items[keykey]+'" : "'+keykey+'",\n';
        //        }
        //        this.mongo = this.mongo.slice(0,(this.mongo.length-2));
        //        this.mongo += '\n\t\t},\n';
        //    }
        //}
        //if(flagList===1)
        //    this.mongo = this.mongo.slice(0,(this.mongo.length-2));
        //this.mongo += '\n\t}\n';
        //this.mongo += '}';


        //NUOVO CON STRUTTURA VECCHIA
        //this.mongo = {
        //    address: objectToParse.address,
        //    db: {},
        //    name: objectToParse.objectName,
        //    notifications: {},
        //    objectId: objectToParse.objectId,
        //    properties: {},
        //    protocol: objectToParse.protocol,
        //    type: "object"
        //};
        //
        //for (var i in objectToParse.properties) {
        //    if (objectToParse.properties[i].type.toLowerCase() === "list") {
        //        this.mongo.properties[objectToParse.properties[i].name] = objectToParse.properties[i].items[Object.keys(objectToParse.properties[i].items)[0]];
        //        this.mongo.db[objectToParse.properties[i].name] = {};
        //        for (var j in objectToParse.properties[i].items) {
        //            this.mongo.db[objectToParse.properties[i].name][objectToParse.properties[i].items[j]] = j;
        //        }
        //    } else {
        //        this.mongo.properties[objectToParse.properties[i].name] = objectToParse.properties[i].defaultValue;
        //    }
        //
        //    if (objectToParse.properties[i].type.toLowerCase() === "physicalbutton") {
        //        this.mongo.notifications[objectToParse.properties[i].name] = {};
        //        this.mongo.notifications[objectToParse.properties[i].name][objectToParse.properties[i].PhysicalButtonValue] = "Button " + objectToParse.properties[i].name + " of " + objectToParse.objectName + " pressed";
        //    }
        //}


        //NUOVO
        this.mongo = {
            address: objectToParse.address,
            db: {},
            name: objectToParse.objectName,
            notifications: {},
            objectId: objectToParse.objectId,
            properties: {},
            protocol: objectToParse.protocol,
            type: "object"
        };

        for (var i in objectToParse.properties) {
            if (objectToParse.properties[i].type.toLowerCase() === "list") {
                this.mongo.properties[objectToParse.properties[i].name] = {
                    label: objectToParse.properties[i].listLabel,
                    type: "list",
                    value: objectToParse.properties[i].items[Object.keys(objectToParse.properties[i].items)[0]]
                };

                this.mongo.db[objectToParse.properties[i].name] = {};
                for (var j in objectToParse.properties[i].items) {
                    this.mongo.db[objectToParse.properties[i].name][objectToParse.properties[i].items[j]] = j;
                }
            } else {
                this.mongo.properties[objectToParse.properties[i].name] = {
                    type: objectToParse.properties[i].type.toLowerCase(),
                    value: objectToParse.properties[i].defaultValue ? objectToParse.properties[i].defaultValue : "0"
                };

                if (objectToParse.properties[i].type.toLowerCase() === "button") {
                    this.mongo.properties[objectToParse.properties[i].name].innertext = objectToParse.properties[i].buttonInnerText;
                    this.mongo.properties[objectToParse.properties[i].name].label = objectToParse.properties[i].buttonLabel;
                } else if (objectToParse.properties[i].type.toLowerCase() === "number") {
                    this.mongo.properties[objectToParse.properties[i].name].label = objectToParse.properties[i].numberLabel;
                } else if (objectToParse.properties[i].type.toLowerCase() === "sensor") {
                    this.mongo.properties[objectToParse.properties[i].name].label = objectToParse.properties[i].sensorLabel;
                } else if (objectToParse.properties[i].type.toLowerCase() === "slider") {
                    this.mongo.properties[objectToParse.properties[i].name].label = objectToParse.properties[i].sliderLabel;
                    this.mongo.properties[objectToParse.properties[i].name].max = objectToParse.properties[i].max;
                    this.mongo.properties[objectToParse.properties[i].name].min = objectToParse.properties[i].min;
                    this.mongo.properties[objectToParse.properties[i].name].step = objectToParse.properties[i].step;
                } else if (objectToParse.properties[i].type.toLowerCase() === "text") {
                    this.mongo.properties[objectToParse.properties[i].name].label = objectToParse.properties[i].textBuilderLabel;
                } else if (objectToParse.properties[i].type.toLowerCase() === "trigger") {
                    this.mongo.properties[objectToParse.properties[i].name].labeloff = objectToParse.properties[i].offLabel;
                    this.mongo.properties[objectToParse.properties[i].name].labelon = objectToParse.properties[i].onLabel;
                    this.mongo.properties[objectToParse.properties[i].name].valueoff = objectToParse.properties[i].off;
                    this.mongo.properties[objectToParse.properties[i].name].valueon = objectToParse.properties[i].on;
                }

                if (objectToParse.properties[i].type.toLowerCase() === "physicalbutton") {
                    this.mongo.notifications[objectToParse.properties[i].name] = {};
                    this.mongo.notifications[objectToParse.properties[i].name]["0"] = {
                        message: "Button " + objectToParse.properties[i].name + " of " + objectToParse.objectName + " pressed",
                        relation: "eq",
                        value: objectToParse.properties[i].defaultValue
                    };
                }
            }
        }

        this.mongo = JSON.stringify(this.mongo);
    };

    /*
     the old parser used only for the DB part of the mongo.
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
     };*/

    this.parserHtml = function (objectToParse) {
        this.html = '<div id="ApioApplication';
        this.html += objectToParse.objectId + '" ng-app="ApioApplication' + objectToParse.objectId + '"  style="padding:10px;">\n';
        this.html += '\t<div ng-controller="defaultController">\n';
        this.html += '\t<topappapplication></topappapplication>\n';
        this.html += '\t<div id="app" style="display:block;">\n';
        var buttonEmpty;

        for (key in objectToParse.properties) {
            buttonEmpty = '';
            if (objectToParse.properties[key].type.toLowerCase() === 'button') {
                //only button has the "apio" string on the beginning
                buttonEmpty = 'apio';
            }


            if (objectToParse.properties[key].type.toLowerCase() === 'trigger') {
                this.html += '\t\t\t<' + buttonEmpty + objectToParse.properties[key].type.toLowerCase() + ' propertyname="' + objectToParse.properties[key].name + '" ';
                this.html += 'labelon="' + objectToParse.properties[key].onLabel + '" labeloff="' + objectToParse.properties[key].offLabel + '" valueon="' + objectToParse.properties[key].on + '" valueoff="' + objectToParse.properties[key].off + '">';
                this.html += '</' + buttonEmpty + objectToParse.properties[key].type.toLowerCase() + '>\n';
            } else if (objectToParse.properties[key].type.toLowerCase() === 'slider') {
                this.html += '\t\t\t<' + buttonEmpty + objectToParse.properties[key].type.toLowerCase() + ' propertyname="' + objectToParse.properties[key].name + '" ';
                this.html += 'label="' + objectToParse.properties[key].sliderLabel + '" min="' + objectToParse.properties[key].min + '" max="' + objectToParse.properties[key].max + '" step="' + objectToParse.properties[key].step + '">';
                this.html += '</' + buttonEmpty + objectToParse.properties[key].type.toLowerCase() + '>\n';
            } else if (objectToParse.properties[key].type.toLowerCase() === 'list') {
                this.html += '\t\t\t<' + buttonEmpty + objectToParse.properties[key].type.toLowerCase() + ' propertyname="' + objectToParse.properties[key].name + '" ';
                this.html += 'label="' + objectToParse.properties[key].listLabel + '" >';
                this.html += '</' + buttonEmpty + objectToParse.properties[key].type.toLowerCase() + '>\n';
            } else if (objectToParse.properties[key].type.toLowerCase() === 'button') {
                this.html += '\t\t\t<' + buttonEmpty + objectToParse.properties[key].type.toLowerCase() + ' propertyname="' + objectToParse.properties[key].name + '" ';
                this.html += 'label="' + objectToParse.properties[key].buttonLabel + '" innertext= "' + objectToParse.properties[key].buttonInnerText + '" value="' + objectToParse.properties[key].defaultValue + '">';
                this.html += '</' + buttonEmpty + objectToParse.properties[key].type.toLowerCase() + '>\n';
            } else if (objectToParse.properties[key].type.toLowerCase() === 'number') {
                this.html += '\t\t\t<' + buttonEmpty + objectToParse.properties[key].type.toLowerCase() + ' propertyname="' + objectToParse.properties[key].name + '" ';
                this.html += 'label="' + objectToParse.properties[key].numberLabel + '">';
                this.html += '</' + buttonEmpty + objectToParse.properties[key].type.toLowerCase() + '>\n';
            } else if (objectToParse.properties[key].type.toLowerCase() === 'text') {
                this.html += '\t\t\t<' + buttonEmpty + objectToParse.properties[key].type.toLowerCase() + ' propertyname="' + objectToParse.properties[key].name + '" ';
                this.html += 'label="' + objectToParse.properties[key].textBuilderLabel + '">';
                this.html += '</' + buttonEmpty + objectToParse.properties[key].type.toLowerCase() + '>\n';
            } else if (objectToParse.properties[key].type.toLowerCase() === 'sensor') {

                //this.html += '\t\t\t<' + buttonEmpty + objectToParse.properties[key].type.toLowerCase() + ' propertyname="' + objectToParse.properties[key].name + '" ';
                alert(objectToParse.properties[key].sensorType)
                this.html += '\t\t\t<' + buttonEmpty + 'unlimitedsensor' + ' propertyname="' + objectToParse.properties[key].name + '" ';
                this.html += 'label="' + objectToParse.properties[key].sensorLabel + '">';
                //this.html += '</' + buttonEmpty + objectToParse.properties[key].type.toLowerCase() + '>\n';
                this.html += '</' + buttonEmpty + 'unlimitedsensor' + '>\n';
            }


        }
        ;
        this.html += '\t</div>\n';
        this.html += '</div>\n';
        this.html += '</div>\n';
        this.html += '<script src="applications/' + objectToParse.objectId + '/' + objectToParse.objectId + '.js"></script>';
    };

    this.parserJs = function (objectToParse) {
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

    this.parserIno = function (objectToParse) {
        console.log('Parsing object ' + objectToParse + ' for .ino');
        this.ino = '';
        if (objectToParse.protocol == 'l') {
            //declare LWM libraries
            this.ino += '\n';
            this.ino += '#include "Apio.h"\n';
            this.ino += '#include "property.h"\n';

        } else if (objectToParse.protocol == 'z') {
            //declare XBee libraries
            this.ino += "#include <XBee.h>\n#include <ApioXbee.h>\n";
        }
        /*for(key in objectToParse.properties){
         if(objectToParse.properties[key].type=="Sensor"){
         this.ino +='#include "sensors.h"\n';
         break;
         }
         }

         */

        /*for(keyPin in objectToParse.pins){
         for(key in objectToParse.properties){
         if(objectToParse.pins[keyPin].propertyName == objectToParse.properties[key].name ){

         }
         //if(){}
         }*/
        var declaredDHT = {}
        for (key in objectToParse.properties) {
            if (objectToParse.properties[key].type == "Sensor") {
                if (objectToParse.properties[key].sensorType == "dht22") {
                    /*
                     #include <DHT.h>

                     #include <math.h>

                     #define DHTPIN 0     // what pin we're connected to
                     #define DHTTYPE DHT22   // DHT 22  (AM2302)
                     int sendV=0;
                     DHT dht(DHTPIN, DHTTYPE);
                     */
                    this.ino += '#include "DHT.h"\n';
                    this.ino += '#define DHTTYPE DHT22\n';
                    for (keyPin in objectToParse.pins) {
                        if (objectToParse.pins[keyPin].propertyName == objectToParse.properties[key].name) {
                            this.ino += '#define DHTPIN ' + objectToParse.pins[keyPin].number + '\n';
                            this.ino += 'DHT dht' + objectToParse.pins[keyPin].number + '(' + objectToParse.pins[keyPin].number + ', DHTTYPE);\n';
                            objectToParse.pins[keyPin].dht22 = 'dht' + objectToParse.pins[keyPin].number;
                            objectToParse.properties[key].dht22 = 'dht' + objectToParse.pins[keyPin].number;
                            this.ino += 'unsigned long ' + objectToParse.pins[keyPin].dht22 + 'pMillis = 0;\n'
                            this.ino += 'int ' + objectToParse.pins[keyPin].dht22 + 'Flag = 0;\n';
                            declaredDHT[objectToParse.pins[keyPin]] = true;


                        }
                    }


                }
            }
        }
        /*if(objectToParse.properties[key].type=="PhysicalButton"){
         this.ino+='int '+objectToParse.properties[key].name+'Val =0;\n\n';
         }

         }*/
        for (key in objectToParse.pins) {
            //declare Pins type name = value
            this.ino += "int " + objectToParse.pins[key].name + "=" + objectToParse.pins[key].number + ";\n";
            //for(a in objectTo)
            //if(objectToParse.pins[key].propertyName==)
        }
        this.ino += "void setup() {\n";
        if (objectToParse.protocol == 'l') {
            //initialize LWM
            this.ino += '\tApio.setup("' + objectToParse.objectName + '", "1,0", ' + objectToParse.address + ', 0x01);\n';


        } else if (objectToParse.protocol == 'z') {
            //initialize XBee
            this.ino += "\tSerial.begin(9600);\n";
        }

        for (key in objectToParse.pins) {
            //pinMode(name, type);
            if (objectToParse.pins[key].hasOwnProperty('dht22')) {
                this.ino += "\t" + objectToParse.pins[key].dht22 + ".begin();\n";
            } else {
                this.ino += "\tpinMode(" + objectToParse.pins[key].name + "," + objectToParse.pins[key].type + ");\n"
                if (objectToParse.pins[key].hasOwnProperty('initialState')) {
                    this.ino += "\tdigitalWrite(" + objectToParse.pins[key].name + "," + objectToParse.pins[key].initialState + ");\n";
                }
            }

        }

        this.ino += "}\n\n";
        this.ino += "void loop(){\n";
        if (objectToParse.protocol == 'l') {
            this.ino += "\tApio.loop();\n";
        }
        if (objectToParse.protocol == 'z') {
            this.ino += "\tapioLoop();\n";
        }
        for (key in objectToParse.properties) {

            if (objectToParse.properties[key].type == "Trigger") {
                for (keyPin in objectToParse.pins) {
                    if (objectToParse.pins[keyPin].propertyType === 'Trigger' && objectToParse.properties[key].name === objectToParse.pins[keyPin].propertyName) {
                        this.ino += '\tproperty.Trigger("' + objectToParse.properties[key].name + '",' + objectToParse.pins[keyPin].name + ' ,' + objectToParse.properties[key].on + ', ' + objectToParse.properties[key].off + ' );\n';
                    }

                }
            }
            else if (objectToParse.properties[key].type == "List") {
                this.ino += '\tif(property=="' + objectToParse.properties[key].name + '"){\n';
                for (keykey in objectToParse.properties[key].items) {
                    this.ino += '\t\tif(value=="' + objectToParse.properties[key].items[keykey] + '"){\n';
                    this.ino += '\t\t\t//Do Something\n\t\t}\n';
                }
                this.ino += '\t\t\tproperty=="";\n\t\t\n';
                this.ino += '\t}\n';
            }
            else if (objectToParse.properties[key].type == "Slider") {
                for (keyPin in objectToParse.pins) {
                    if (objectToParse.pins[keyPin].propertyType === 'Slider' && objectToParse.properties[key].name === objectToParse.pins[keyPin].propertyName) {
                        this.ino += '\tproperty.Slider("' + objectToParse.properties[key].name + '",' + objectToParse.pins[keyPin].name + ');\n';
                    }

                }
            }
            else if (objectToParse.properties[key].type == "Sensor") {
                alert(objectToParse.properties[key].sensorType);
                if (objectToParse.properties[key].sensorType == "dht22") {
                    /*
                     unsigned long currentMillis = millis();
                     if(currentMillis - previousMillis >= 5000){
                     previousMillis = currentMillis;
                     h = dht.readHumidity();
                     t = dht.readTemperature();
                     Serial.println(t);
                     Serial.println(h);
                     if(h && t){
                     float hum = t + (6.112 * pow(10, (7.5 * t)/(237.7 + t)) * h / 100 - 10) * 5 / 9;
                     if(sendV==0)
                     Apio.send("3069:update:temperature:"+String(t)+"-");
                     //SYS_TaskHandler();
                     if(sendV==1)
                     Apio.send("3069:update:humidity:"+String(h)+"-");
                     //SYS_TaskHandler();
                     if(sendV==2)
                     Apio.send("3069:update:humidex:"+String(hum)+"-");
                     //SYS_TaskHandler();
                     if(sendV<3){
                     sendV++;
                     }else {
                     sendV=0;
                     }
                     }
                     }
                     */
                    this.ino += '\tunsigned long ' + objectToParse.properties[key].dht22 + 'Millis = millis();\n';
                    this.ino += '\tif(' + objectToParse.properties[key].dht22 + 'Millis - ' + objectToParse.properties[key].dht22 + 'pMillis >= 5000){\n';
                    this.ino += '\t\t' + objectToParse.properties[key].dht22 + 'pMillis = ' + objectToParse.properties[key].dht22 + 'Millis;\n'
                    this.ino += '\t\tfloat h = ' + objectToParse.properties[key].dht22 + '.readHumidity();\n'
                    this.ino += '\t\tfloat ' + objectToParse.properties[key].name + ' = ' + objectToParse.properties[key].dht22 + '.readTemperature();\n'
                    /*this.ino += '\t\tif('+objectToParse.properties[key].dht22+'Flag==0){\n';
                     this.ino += '\t\t\tApio.send("'+objectToParse.address+':update:'+objectToParse.properties[key].name+':"+String(t)+"-");\n'
                     this.ino += '\t\t\t'+objectToParse.properties[key].dht22+'Flag = 1; \n';
                     //this.ino += '\t\t\tobjectToParse.address'
                     this.ino += '\t\t}else{\n'
                     this.ino += '\t\t\tApio.send("'+objectToParse.address+':update:'+objectToParse.properties[key].name+':"+String(h)+"-");\n'
                     this.ino += '\t\t\t'+objectToParse.properties[key].dht22+'Flag = 0; \n';
                     this.ino += '\t\t}\n';*/
                    this.ino += '\t\tif(' + objectToParse.properties[key].dht22 + 'Flag==0){\n';
                    this.ino += '\t\t\tApio.send("' + objectToParse.address + ':update:' + objectToParse.properties[key].name + ':"+String(' + objectToParse.properties[key].name + ')+"-");\n'
                    this.ino += '\t\t\t' + objectToParse.properties[key].dht22 + 'Flag = 0; \n';
                    //this.ino += '\t\t\tobjectToParse.address'
                    this.ino += '\t\t}\n';

                    this.ino += '\t}\n';

                }
                /*this.ino += '\t//Use the function for the read data from Sensor and save it in\n\t//' + objectToParse.properties[key].name + 'Val\n ';
                 for (keyPin in objectToParse.pins) {
                 if (objectToParse.pins[keyPin].propertyType === 'Sensor' && objectToParse.properties[key].name === objectToParse.pins[keyPin].propertyName) {
                 this.ino += '\t' + objectToParse.properties[key].name + 'Val = analogRead(' + objectToParse.pins[keyPin].name + ');\n'
                 }
                 }
                 this.ino += '\tif (lastValue' + objectToParse.properties[key].name + ' !=  String(' + objectToParse.properties[key].name + 'Val)) {\n\t\tlastValue' + objectToParse.properties[key].name + ' = String(' + objectToParse.properties[key].name + 'Val);\n';
                 this.ino += '\t\tif(exists(' + objectToParse.properties[key].name + ', "' + objectToParse.properties[key].name + '", String(' + objectToParse.properties[key].name + 'Val), 1)){\n';
                 this.ino += '\t\t\tapioSend("' + objectToParse.objectId + ':update:' + objectToParse.properties[key].name + ':"+String(' + objectToParse.properties[key].name + 'Val)+"-");\n\t\t}\n\t}\n';
                 this.ino += '\tif(property=="' + objectToParse.properties[key].name + '"){\n';
                 this.ino += '\t\tif(value=="/"){\n';
                 this.ino += '\t\t\tapioSend("' + objectToParse.objectId + ':update:' + objectToParse.properties[key].name + ':"+String(' + objectToParse.properties[key].name + 'Val)+"-");\n'
                 this.ino += '\t\t} else if(!exists(' + objectToParse.properties[key].name + ', property, value, 0)){\n';
                 this.ino += '\t\t\t\tinsert(&' + objectToParse.properties[key].name + ', property, value);\n';
                 this.ino += '\t\t}else{\n';
                 this.ino += '\t\t\tdeleteItem(&' + objectToParse.properties[key].name + ', property, value);\n';
                 this.ino += '\t\t\t}\n';
                 this.ino += '\t\tproperty="";\n\t\t\n';
                 this.ino += '\t}\n';*/
            }
            else if (objectToParse.properties[key].type == "PhysicalButton") {
                /*
                 while(digitalRead(pin5) == LOW)
                 {
                 SYS_TaskHandler();
                 if(flagEnter==0){
                 if(toggle==0)
                 {
                 apioSend("6:update:onoff5:0-");
                 toggle=1;
                 }
                 else
                 {
                 apioSend("6:update:onoff5:1-");
                 toggle=0;
                 }
                 delay(250);
                 flagEnter=1;
                 }
                 }
                 */
                for (keyPin in objectToParse.pins) {
                    if (objectToParse.pins[keyPin].propertyType === 'PhysicalButton' && objectToParse.properties[key].name === objectToParse.pins[keyPin].propertyName) {
                        this.ino += '\twhile(digitalRead(' + objectToParse.pins[keyPin].name + '==LOW){\n'
                    }
                }
                this.ino += '\tif(' + objectToParse.properties[key].name + 'Val == HIGH){\n';
                this.ino += '\t\tdelay(250);\n';
                this.ino += '\t\tif(' + objectToParse.properties[key].name + 'Val == HIGH){\n';
                this.ino += '\t\t\tapioSend("' + objectToParse.objectId + ':update:' + objectToParse.properties[key].name + ':' + objectToParse.properties[key].PhysicalButtonValue + '-");\n\t\t}\n\t}\n';
            }
            else {
                this.ino += '\tif(property=="' + objectToParse.properties[key].name + '"){\n';
                this.ino += '\t\t//Do Something\n\t';
                this.ino += '\t\t\tproperty=="";\n\t\t\n';
                this.ino += '\t}\n';
            }

        }
        this.ino += "}";
    };
}]);
