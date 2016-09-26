//Copyright 2014-2015 Alex Benfaremo, Alessandro Chelli, Lorenzo Di Berardino, Matteo Di Sabatino

/********************************* LICENSE **********************************
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
 * GNU General Public License version 2 for more details.s                  *
 *                                                                          *
 * To read the license either open the file COPYING.txt or                  *
 * visit <http://www.gnu.org/licenses/gpl2.txt>                             *
 *                                                                          *
 ****************************************************************************/

var MongoClient = require("mongodb").MongoClient;
var bodyParser = require("body-parser");
var express = require("express");
var app = express();
var http = require("http").Server(app);
// var configuration = require("../configuration/default.js");
var enocean = require("node-enocean")();
var chipIdWait = 0;
var com = require("serialport");
var fs = require("fs");
var enoceanFound = 0;
var preEnoceanFound = 0;
var comCallback = 1;
var Port = 8092;
var enoceanApplianceOnOnce = 0;
// var Apio = require("../apio.js")(configuration);
var Apio = require("../apio.js")(false);
var socket = require("socket.io-client")("http://localhost:" + Apio.Configuration.http.port, {query: "associate=enocean&token=" + Apio.Token.getFromText("enocean", fs.readFileSync("../" + Apio.Configuration.type + "_key.apio", "utf8"))});
var socketServer = require("socket.io")(http);
// var objects = [];
var objects = {};
var disconnect = 0;
if (process.argv.indexOf("--http-port") > -1) {
    Port = Number(process.argv[process.argv.indexOf("--http-port") + 1]);
}
var trigger = 0;
var trigger1 = 0;
// app.use(function (req, res, next) {
//     res.header("Accept", "*");
//     res.header("Access-Control-Allow-Origin", "*");
//     res.header("Access-Control-Allow-Methods", "GET, POST");
//     res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
//     next();
// });
app.use(bodyParser.json({
    limit: "50mb"
}));
app.use(bodyParser.urlencoded({
    extended: true,
    limit: "50mb"
}));

MongoClient.connect("mongodb://" + Apio.Configuration.database.hostname + ":" + Apio.Configuration.database.port + "/" + Apio.Configuration.database.database, function (error, db) {
    if (error) {
        console.log("Unable to get database");
    } else if (db) {
        db.collection("Services").findOne({name: "enocean"}, function (err, service) {
            if (err) {
                console.log("Error while getting service EnOcean: ", err);
                console.log("Service EnOcean DOESN'T Exists, creating....");
                db.collection("Services").insert({
                    name: "enocean",
                    show: "EnOcean",
                    url: "https://github.com/ApioLab/Apio-Services",
                    username: "",
                    password: "",
                    port: String(Port)
                }, function (err) {
                    if (err) {
                        console.log("Error while creating service EnOcean on DB: ", err);
                    } else {
                        console.log("Service EnOcean successfully created");
                    }
                });
            } else if (service) {
                console.log("Service EnOcean exists");
            } else {
                console.log("Unable to find service EnOcean");
                console.log("Service EnOcean DOESN'T Exists, creating....");
                db.collection("Services").insert({
                    name: "enocean",
                    show: "EnOcean",
                    url: "https://github.com/ApioLab/Apio-Services",
                    username: "",
                    password: "",
                    port: String(Port)
                }, function (err) {
                    if (err) {
                        console.log("Error while creating service EnOcean on DB: ", err);
                    } else {
                        console.log("Service EnOcean successfully created");
                    }
                });
            }
        });
        console.log("Database correctly initialized");
    }
});

//Write your code
i = 0;
trigger = 0;
trigger1 = 0;
//var

var communication = {};
var bindToProperty = {};
Apio.Database.connect(function () {
    Apio.Object.list("admin", function (err, oBjects) {
            if (err) {

            } else {
                console.log('OBJECTS IS: ', oBjects);
                // objects = oBjects;

                for (var i in oBjects) {
                    // objects[parseInt(oBjects[i].objectId)] = oBjects[i];
                    objects[oBjects[i].objectId] = oBjects[i];
                }
            }
        }
    )
    Apio.Database.db.collection("Communication").findOne({'name': 'integratedCommunication'}, function (err, doc) {
        if (err) {
            ////console.log("Error while trying to retrieve the serial address. Aborting Serial.send");
        } else if (doc) {

            communication = doc;
            console.log('la collection communication contiene: ', communication)
        }
    })
    Apio.Database.db.collection("Communication").findOne({'name': 'addressBindToProperty'}, function (err, doc) {
        if (err) {
            ////console.log("Error while trying to retrieve the serial address. Aborting Serial.send");
        } else if (doc) {

            bindToProperty = doc;
            console.log('la collection communication contiene: ', communication)
        }
    })


});

/*var enoceanTrigger1 = {
 "70":{
 propertyName:"onoff",
 value:"1",
 type:"trigger"
 },
 "50":{
 propertyName:"onoff1",
 value:"1",
 type:"trigger"
 }
 }*/

var getEnoceanRSSI = function (data, rsi) {
    var index = data.rawByte.indexOf(data.senderId);
    if (index === -1) {
        return "-1";
    } else if (rsi === 'RSSI' || rsi === 'rssi') {
        var hex = data.rawByte.substr(index + 8 + 2 + 2 + 8, 2);
        return '-	' + String(parseInt(hex, 16));
    } else if (rsi === 'db' || rsi === 'DB' || rsi === 'dB') {
        var hex = data.rawByte.substr(index + 8 + 2 + 2 + 8, 2);
        return String(parseInt(hex, 16));
    }
}

var enoceanVerifyInstall = function (data) {

    return data;
}

var enoceanInstallApp = function (data) {

}

var enoceanLearnAndInstall = function (data) {
    var found = false;

    if (data.learnBit === 0 || data.choice == "f6") {
        for (var s in objects) {
            if (typeof objects[s].enocean !== 'undefined') {
                console.log('SENDERID------- ', objects[s].enocean.senderId);
                if (objects[s].enocean.senderId === data.senderId) {
                    found = true;
                }
            }
        }
        if (!found) {
            console.log('LEARNING AND INSTALLATION START', data);
            var o = {}
            o.name = "apio_install_new_object"
            o.data = data.eep;
            socket.emit("socket_service", o);
            //console.log('All List Objects is: ',oBjects);
        }
    }
}


var enoceanAppliance = function (data) {
    if (chipIdWait) {
        if (data.hasOwnProperty('packetType') && data.packetType == 2) {
            enocean.base = data.raw.toString('hex').substring(18, 26)
            console.log(enocean.base)
            chipIdWait = 0;
        }
    } else {
        enoceanApplianceOnOnce = 1;
        i++;
        console.log("--------RICEVUTO UN NUOVO MESSAGGIO ENOCEAN--------");
        console.log();
        console.log('+++++++++++ RSSI', getEnoceanRSSI(data, 'RSSI'));
        console.log();
        console.log("enocean on data: 	", data);
        if (communication.hasOwnProperty('enocean') && bindToProperty.hasOwnProperty('enocean')) {
            if (data.learnBit != '0' && data.choice != 'd4' && bindToProperty.hasOwnProperty('enocean') && bindToProperty.enocean.hasOwnProperty(data.senderId)) {
                //manca di ricavare la fun dal data row
                console.log("VERIFICO SE L'OGGETTO é NEL SISTEMA....");
                var s = communication['enocean']
                var type = '';
                if (bindToProperty.hasOwnProperty('enocean') && bindToProperty.enocean.hasOwnProperty(data.senderId)) {
                    type = bindToProperty.enocean[data.senderId].type
                    console.log('OGGETTO TROVATO NEL SISTEMA ACCETTO IL MESSAGGIO');
                    console.log();
                }
                if (s.hasOwnProperty(type) && s[type].hasOwnProperty('recive')) {

                    /*function(dataObject,enocean){   var property = {  temperature : '' };  var temperature = parseInt(dataObject.raw.substring(4, 6)); console.log('temperature hex: ', temperature); temperature = ((temperature-255)*(40/-255)).toFixed(2); console.log('temperature converted int: ', temperature); property.temperature = String(temperature);return property; }*/

                    //var fun = data.rawByte.slice(14, 14+2);
                    var fun = '01';
                    console.log('fun ', fun);
                    s = s[type].recive[fun]
                    //data.enoceanBase = enocean.base;

                    //console.log('la funzione da eseguire è: ',s);
                    //console.log('il dato che gli verrà passato è: ',data);
                    console.log("Chiamo la receive");
                    console.log("oggetto in DB:",objects[bindToProperty.enocean[data.senderId].objectId].properties);
                    var x = eval.call(null, s);
                    //la call back deve restituire

                    console.log();
                    var receive = {
                        RSSI: ''
                    };

                    if (x) {

                        if (typeof x(data, enocean,objects[bindToProperty.enocean[data.senderId].objectId].properties) === 'object') {
                            
                            console.log("CHIAMO LA RECEIVE")
                            console.log("oggetto in DB:",objects[bindToProperty.enocean[data.senderId].objectId].properties);
                            receive = x(data, enocean, objects[bindToProperty.enocean[data.senderId].objectId].properties);
                        }
                        //Dalla fnzone nel caso in cui era un rocker mi torneranno anche i trigger cmabiati quindi devo
                        //aggiornare i valori delle variabili globali
                        console.log("+++++++++++++++++++ Receive+++", receive)
                        
                        //
                        receive.RSSI = getEnoceanRSSI(data)
                        //x(data,enocean);
                        var dataForEmit = {
                            objectId: bindToProperty.enocean[data.senderId].objectId,
                            properties: {},
                            writeToDatabase: true,
                            writeToSerial: false
                        }
                        dataForEmit.properties = receive;
                        for(var h in receive){
	                        if(objects[bindToProperty.enocean[data.senderId].objectId].properties.hasOwnProperty(h)){
	                        	objects[bindToProperty.enocean[data.senderId].objectId].properties[h].value = receive[h];
	                        	console.log("objects[bindToProperty.enocean[data.senderId].objectId].properties[h].value",objects[bindToProperty.enocean[data.senderId].objectId].properties[h].value);
	                        } else {
		                        console.log("ATTENZIONE! verificare, proprietà in callback non esistente nel DB", h);
	                        }
                        }
                        
                        console.log('ricevuto data lancio emit', dataForEmit);
                        console.log();
                        socket.emit("apio_client_update", dataForEmit);
                        //console.log('data ',data);

                        //console.log('funzione lanciata: ',receive);

                        if (bindToProperty.enocean[data.senderId].hasOwnProperty('sleep')) {
                            console.log('QUESTO OGGETTO ERA IN SLEEP: ', data.senderId);
                            console.log('CERCO LA SUA FUNZIONE DI SLEEP');
                            Apio.Database.db.collection("Objects").findOne({'address': data.senderId}, function (err, doc) {
                                if (err) {
                                    ////console.log("Error while trying to retrieve the serial address. Aborting Serial.send");
                                } else if (doc) {
                                    var addInfo = doc.properties;
                                    var needDataToSend = {
                                        protocol: {
                                            name: 'enocean',
                                            type: bindToProperty.enocean[data.senderId].type,
                                            fun: '01',
                                            address: data.senderId,
                                            property: ''
                                        },
                                        enoceanBase: enocean.base
                                    }
                                    console.log('TROVATA! Lancio la funzione di SLEEP: ');
                                    enoceanSendToDevice(needDataToSend, enocean, addInfo);
                                }
                            })

                        }

                    }


                }

            }
            else if (data.learnBit == '0') {
                if (data.packetTypeString == '4BS') {
                    //Devo fare teach-in con 4BS
                    console.log('TEACH IN 4BS');
                    var eep = [];
                    var dataToSend = '';
                    if (data.hasOwnProperty('eep')) {

                        dataToSend = data.eep[3] + data.eep[4] + data.eep[6] + data.eep[7]
                        console.log('DATA TO SENDO IS COMPONING: ', dataToSend);
                        if (data.manufacturer != null) {
                            if (data.manufacturer.length == 1) {
                                data.manufacturer = '0' + data.manufacturer;
                            }
                        } else {
                            data.manufacturer = "02";
                        }
                        dataToSend = dataToSend + data.manufacturer + 'f0'
                        console.log('LA RISPOSTA è: ', dataToSend);
                        console.log('ACCETTO IL NUOVO OGGETTO');
                        enoceanSend('4bs', '01', dataToSend, data.senderId);


                        // smart ack
                        //enoceanSend('','01','01010000000000')
                        //enoceanSend('','01','02')
                        if (communication.enocean.hasOwnProperty(data.eep) && communication.enocean[data.eep].send.hasOwnProperty('setup')) {
                            console.log();
                            console.log('il dispositivo prevede una funzione di setup...');
                            var dataObject = {
                                protocol: {
                                    address: data.senderId,
                                    fun: 'setup',
                                    type: data.eep
                                }
                            }

                            setTimeout(function () {
                                console.log('Lancio la funzione di SETUP...');
                                enoceanSendToDevice(dataObject, enocean, {});
                            }, 3000)
                        }
                    }

                }
                if (!bindToProperty.enocean.hasOwnProperty(data.senderId)) {
                    var eepCalculated
                    if (data.hasOwnProperty('eep')) {
                        eepCalculated = data.eep
                        console.log('run autoInstall: ', {
                            service: 'autoInstall',
                            message: 'apio_install_new_object',
                            data: {protocol: 'enocean', eep: data.eep, address: data.senderId}
                        });
                        socket.emit('send_to_service', {
                            service: 'autoInstall',
                            message: 'apio_install_new_object',
                            data: {
                                protocol: 'enocean',
                                eep: eepCalculated,
                                address: data.senderId
                            }
                        });
                    } 
                    else {
                        if (data.hasOwnProperty('packetTypeString')) {
                            if (data.packetTypeString == '1BS') {
                                console.log('run autoInstall: ', {
                                    service: 'autoInstall',
                                    message: 'apio_install_new_object',
                                    data: {protocol: 'enocean', eep: data.choice, address: data.senderId}
                                });
                                socket.emit('send_to_service', {
                                    service: 'autoInstall',
                                    message: 'apio_install_new_object',
                                    data: {
                                        protocol: 'enocean',
                                        eep: data.choice + '-XX',
                                        address: data.senderId
                                    }
                                });

                            }
                        }
                    }
                }

            }
            else if(data.choice == 'f6'){
	            console.log('run autoInstall: ', {
                    service: 'autoInstall',
                    message: 'apio_install_new_object',
                    data: {protocol: 'enocean', eep: 'f6', address: data.senderId}
                });
                socket.emit('send_to_service', {
                    service: 'autoInstall',
                    message: 'apio_install_new_object',
                    data: {
                        protocol: 'enocean',
                        eep: 'f6',
                        address: data.senderId
                    }
                });
            }
            else if (data.choice == 'd4') {
                //Devo fare l'UTE
                //Questo è il comando per la smartplug, si può astrarre bisogna prendere il data
                //mettere 91 al posto del primo byte, si può anche fare la dissociazione volendo
                console.log("un oggetto ha richiesto l'accoppiamento tramite UTE, OGGETTO: ", data);
                enoceanSend('d4', '01', data.rawByte, data.senderId, '91');

                var eepCalculated0 = ''
                if (data.hasOwnProperty('eep')) {
                    eepCalculated0 = data.eep
                } else {
                    eepCalculated0 = data.rawByte[26] + data.rawByte[27] + '-' + data.rawByte[24] + data.rawByte[25] + '-' + data.rawByte[22] + data.rawByte[23]
                }

                if (communication.enocean.hasOwnProperty(eepCalculated0) && communication.enocean[eepCalculated0].send.hasOwnProperty('setup')) {
                    console.log();
                    console.log('il dispositivo prevede una funzione di setup...');
                    var dataObject = {
                        protocol: {
                            address: data.senderId,
                            fun: 'setup',
                            type: eepCalculated0
                        }
                    }

                    setTimeout(function () {
                        console.log('Lancio la funzione di SETUP...');
                        enoceanSendToDevice(dataObject, enocean, {});
                    }, 3000)
                }

                if (!bindToProperty.enocean.hasOwnProperty(data.senderId)) {
                    var eepCalculated = ''
                    if (data.hasOwnProperty('eep')) {
                        eepCalculated = data.eep
                    } else {
                        eepCalculated = data.rawByte[26] + data.rawByte[27] + '-' + data.rawByte[24] + data.rawByte[25] + '-' + data.rawByte[22] + data.rawByte[23]
                    }
                    console.log('run autoInstall: ', {
                        service: 'autoInstall',
                        message: 'apio_install_new_object',
                        data: {protocol: 'enocean', eep: eepCalculated, address: data.senderId}
                    });
                    socket.emit('send_to_service', {
                        service: 'autoInstall',
                        message: 'apio_install_new_object',
                        data: {
                            protocol: 'enocean',
                            eep: eepCalculated,
                            address: data.senderId
                        }
                    });

                }
            }
        }

    }
}

var enoceanSend = function (enROR, enPacketType, enData, enDestinationId, enLearn) {
    if (enROR == 'd2' || enROR == 'D2') {
        if (enPacketType == '01') {
            //header setting
            var optionalLenght = 'calculate'
            var packetType = '01';
            var dataLenght = 'calculate'
            //data
            var choise = 'd2';
            var row = enData;

            //var senderId = enocean.base;
            //di seguito l'id del dongle enocean prelevato con il comando 05, poi si dovrà studiare come aggiornare l'enocean base commentsato di sopra. Attualmete quindi se vuoi fare le prove devi utilizzare il dongle enocea che è collegato sulla 0.4 che ha il chipId: 01 9e 66 d0
            var senderId = '019e66d0';
            var status = '00'

            //optional data
            var subTelNum = '03'
            var destinationId = enDestinationId;
            var securityLevel = '00'
            var dBm = 'ff'

            var optionalData = subTelNum + destinationId + dBm + securityLevel

            //data for checksum
            var data = choise + row + senderId + status
            //di seguito clacolo il datalenght
            dataLenght = data;
            console.log('data lenght', (dataLenght.length) / 2);
            dataLenght = ((dataLenght.length) / 2).toString(16);
            if (dataLenght.length === 1) {//se il dataLenght è inferiore a 4 cifre aggiungo tanti zeri quanti sono necessari per arrivare a 4, il protoccolo preve 2byte quindi 4 cifre
                dataLenght = "000" + dataLenght;
            } else if (dataLenght.length === 2) {
                dataLenght = "00" + dataLenght;
            } else if (dataLenght.length === 3) {
                dataLenght = "0" + dataLenght;
            }

            //di seguito calcolo l'optionalDataLenght
            optionalLenght = optionalData;
            console.log('optionalLenght lenght in decimale', (optionalLenght.length) / 2);
            optionalLenght = ((optionalLenght.length) / 2).toString(16);
            if (optionalLenght.length === 1) { //se l'optionalLenght è solo una cifra aggiungo uno 0 davanti, deve essere due cifre da protocollo
                optionalLenght = "0" + optionalLenght;
            }
            console.log("optionalLenght length hex", optionalLenght);
            //aggiungo a data il Subtelegram
            data += optionalData

            //compongo l'header
            var header = dataLenght + optionalLenght + packetType;
            //calcolo il CRC alto, quello legato all'header
            var crc8H = enocean.pad(enocean.crc(new Buffer(header, "hex")).toString(16), 2)
            console.log('crc8h ', crc8H);


            header = "55" + header + crc8H;
            console.log('CRC ', enocean.pad(enocean.crc(new Buffer(header, "hex")).toString(16), 2));
            //calcolo il CRC basso, quello legato al pacchetto
            var crc8D = enocean.pad(enocean.crc(new Buffer(data, "hex")).toString(16), 2)
            data += crc8D
            console.log('crc8D ', crc8D);

            console.log('sto inviando questo: ', header + data);
            enocean.send(header + data)
            console.log('++++++++INVIATO++++++++');
        }
    }
    else if (enROR == '00') {
        if (enPacketType == '05') {
            var optionalLenght = '00'
            var packetType = '05';
            var dataLenght = 'calculate'
            //data
            var commandCode = enData
            //data for checksum
            var data = commandCode
            //di seguito clacolo il datalenght
            dataLenght = data;
            console.log('data lenght', (dataLenght.length) / 2);
            dataLenght = ((dataLenght.length) / 2).toString(16);
            if (dataLenght.length === 1) {//se il dataLenght è inferiore a 4 cifre aggiungo tanti zeri quanti sono necessari per arrivare a 4, il protoccolo preve 2byte quindi 4 cifre
                dataLenght = "000" + dataLenght;
            } else if (dataLenght.length === 2) {
                dataLenght = "00" + dataLenght;
            } else if (dataLenght.length === 3) {
                dataLenght = "0" + dataLenght;
            }
            //compongo l'header
            var header = dataLenght + optionalLenght + packetType;
            //calcolo il CRC alto, quello legato all'header
            var crc8H = enocean.pad(enocean.crc(new Buffer(header, "hex")).toString(16), 2)
            console.log('crc8h ', crc8H);
            header = "55" + header + crc8H;
            //calcolo il CRC basso, quello legato al pacchetto
            var crc8D = enocean.pad(enocean.crc(new Buffer(data, "hex")).toString(16), 2)
            data += crc8D
            console.log('crc8D ', crc8D);

            console.log('sto inviando questo: ', header + data);
            enocean.send(header + data)
            console.log('++++++++INVIATO++++++++');
        }
    }
    //teach-in UTA
    else if (enROR == 'd4' || enROR == 'D4') {
        if (enPacketType == '01') {
            //header setting
            var optionalLenght = '07'
            var packetType = '01';
            var dataLenght = 'calculate'
            //data
            var choise = 'd4';
            enData = enData.substring(16, 28)
            console.log('enData ', enData)
            var row = enLearn + enData;
            console.log("la risposta per l'accoppiamento è: ", row);
            var senderId = enocean.base;
            var status = '00'
            //optional data
            var subTelNum = '03'
            var destinationId = enDestinationId;
            var securityLevel = '00'
            var dBm = 'ff'

            var optionalData = subTelNum + destinationId + dBm + securityLevel
            //data for checksum
            var data = choise + row + senderId + status
            //di seguito clacolo il datalenght
            dataLenght = data;
            console.log('data lenght', (dataLenght.length) / 2);
            dataLenght = ((dataLenght.length) / 2).toString(16);
            if (dataLenght.length === 1) {//se il dataLenght è inferiore a 4 cifre aggiungo tanti zeri quanti sono necessari per arrivare a 4, il protoccolo preve 2byte quindi 4 cifre
                dataLenght = "000" + dataLenght;
            } else if (dataLenght.length === 2) {
                dataLenght = "00" + dataLenght;
            } else if (dataLenght.length === 3) {
                dataLenght = "0" + dataLenght;
            }
            console.log("optionalLenght length hex", optionalLenght);
            //aggiungo a data il Subtelegram
            data += optionalData
            //compongo l'header
            var header = dataLenght + optionalLenght + packetType;
            //calcolo il CRC alto, quello legato all'header
            var crc8H = enocean.pad(enocean.crc(new Buffer(header, "hex")).toString(16), 2)
            console.log('crc8h ', crc8H);
            header = "55" + header + crc8H;
            console.log('CRC ', enocean.pad(enocean.crc(new Buffer(header, "hex")).toString(16), 2));
            //calcolo il CRC basso, quello legato al pacchetto
            var crc8D = enocean.pad(enocean.crc(new Buffer(data, "hex")).toString(16), 2)
            data += crc8D
            console.log('crc8D ', crc8D);
            console.log('sto inviando questo: ', header + data);
            enocean.send(header + data)
            console.log('++++++++INVIATO++++++++');
        }
    }
    //teach-in 4BS
    else if (enROR == '4bs' || enROR == '4BS') {
        //header setting
        var optionalLenght = '07'
        var packetType = '01';
        var dataLenght = 'calculate'
        //data
        var choise = 'a5';
        //enData = enData.substring(16,28)
        console.log('enData ', enData)
        var row = enData;
        console.log("la risposta per l'accoppiamento è: ", row);
        var senderId = enocean.base;
        var status = '00'

        var subTelNum = '03'
        var destinationId = enDestinationId;
        var securityLevel = '00'
        var dBm = 'ff'

        var optionalData = subTelNum + destinationId + dBm + securityLevel

        //data for checksum
        var data = choise + row + senderId + status
        //di seguito clacolo il datalenght
        dataLenght = data;
        console.log('data lenght', (dataLenght.length) / 2);
        dataLenght = ((dataLenght.length) / 2).toString(16);
        if (dataLenght.length === 1) {//se il dataLenght è inferiore a 4 cifre aggiungo tanti zeri quanti sono necessari per arrivare a 4, il protoccolo preve 2byte quindi 4 cifre
            dataLenght = "000" + dataLenght;
        } else if (dataLenght.length === 2) {
            dataLenght = "00" + dataLenght;
        } else if (dataLenght.length === 3) {
            dataLenght = "0" + dataLenght;
        }
        console.log("optionalLenght length hex", optionalLenght);
        //aggiungo a data il Subtelegram
        data += optionalData

        //aggiungo a data il Subtelegram
        //compongo l'header
        var header = dataLenght + optionalLenght + packetType;
        //calcolo il CRC alto, quello legato all'header
        var crc8H = enocean.pad(enocean.crc(new Buffer(header, "hex")).toString(16), 2)
        console.log('crc8h ', crc8H);
        header = "55" + header + crc8H;
        console.log('CRC ', enocean.pad(enocean.crc(new Buffer(header, "hex")).toString(16), 2));
        //calcolo il CRC basso, quello legato al pacchetto
        var crc8D = enocean.pad(enocean.crc(new Buffer(data, "hex")).toString(16), 2)
        data += crc8D
        console.log('crc8D ', crc8D);
        console.log('sto inviando questo: ', header + data);
        enocean.send(header + data)
        console.log('++++++++INVIATO++++++++');
    }
    //teach-in SMART ACK
    else if (enROR == '' || enROR == '') {
        if (enPacketType == '01') {
            //header setting
            var optionalLenght = '00'
            var packetType = '06';
            var dataLenght = 'calculate'
            //data
            //enData = enData.substring(16,28)
            console.log('enData ', enData)
            var row = enData;
            console.log("la risposta per l'accoppiamento è: ", row);
            var senderId = enocean.base;
            var status = '00'
            //data for checksum
            var data = row
            //di seguito clacolo il datalenght
            dataLenght = data;
            console.log('data lenght', (dataLenght.length) / 2);
            dataLenght = ((dataLenght.length) / 2).toString(16);
            if (dataLenght.length === 1) {//se il dataLenght è inferiore a 4 cifre aggiungo tanti zeri quanti sono necessari per arrivare a 4, il protoccolo preve 2byte quindi 4 cifre
                dataLenght = "000" + dataLenght;
            } else if (dataLenght.length === 2) {
                dataLenght = "00" + dataLenght;
            } else if (dataLenght.length === 3) {
                dataLenght = "0" + dataLenght;
            }
            console.log("optionalLenght length hex", optionalLenght);
            var header = dataLenght + optionalLenght + packetType;
            //calcolo il CRC alto, quello legato all'header
            var crc8H = enocean.pad(enocean.crc(new Buffer(header, "hex")).toString(16), 2)
            console.log('crc8h ', crc8H);
            header = "55" + header + crc8H;
            console.log('CRC ', enocean.pad(enocean.crc(new Buffer(header, "hex")).toString(16), 2));
            //calcolo il CRC basso, quello legato al pacchetto
            var crc8D = enocean.pad(enocean.crc(new Buffer(data, "hex")).toString(16), 2)
            data += crc8D
            console.log('crc8D ', crc8D);
            console.log('sto inviando questo: ', header + data);
            enocean.send(header + data)
            console.log('++++++++INVIATO++++++++');
        }
    }
}

var enoceanSendToDevice = function (data, enocean, addInfo) {
    console.log();
    console.log('ENOCEAN SEND TO DEVICE: ');
    console.log(data);
    console.log();
    var s = communication['enocean']
    //console.log('******S1********', s);
    //controlli sulla sotto-collection protocol
    if (data.hasOwnProperty('protocol') && data.protocol.hasOwnProperty('type')) {
        s = s[data.protocol.type].send
    } else {
        var type = bindToProperty.enocean[data.address].type
        s = s[type].send
    }
    //console.log('******S2********', s);
    if (data.hasOwnProperty('protocol') && data.protocol.hasOwnProperty('fun')) {
        s = s[data.protocol.fun]
    } else {
        s = s['01']
    }


    data.enoceanBase = enocean.base;
    //console.log('la funzione da eseguire è: ',s);
    //console.log('il dato che gli verrà passato è: ',data);
    var x = eval.call(null, s);
    var send = {}

    //console.log('******X********', x);
    //console.log('******S3********', s);
    send = x(data, enocean, addInfo);
    var crc8H = enocean.pad(enocean.crc(new Buffer(send.header, 'hex')).toString(16), 2);
    //console.log('crc8h ', crc8H);
    send.header = '55' + send.header + crc8H;
    var crc8D = enocean.pad(enocean.crc(new Buffer(send.data, 'hex')).toString(16), 2);
    send.data += crc8D;
    //console.log('crc8D ', crc8D);
    console.log('sto inviando questo: ', send.header + send.data);
    enocean.send(send.header + send.data);
}

socket.on("apio_enocean_send", function (data) {
    console.log("**************************apio_enocean_send**************************");
    console.log('il dato è', data);

    console.log("id ", data.address);
    console.log("base ", enocean.base);

    console.log("°°°°°°°°°°°°°°°°°°°°°°°°°°°°SCORRO OBJECTS°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°");
    console.log("parseInt(data.objectId): ", parseInt(data.objectId));
    for (var xx in objects) {
        console.log("xx: ", xx);
    }

    // if (objects.hasOwnProperty(parseInt(data.objectId))) {
    if (objects.hasOwnProperty(data.objectId)) {
        // console.log("objects[parseInt(data.objectId)].properties: ", objects[parseInt(data.objectId)].properties);
        console.log("objects[data.objectId].properties: ", objects[data.objectId].properties);
        console.log("data.message.property: ", data.message.property);
    }

    // if (objects.hasOwnProperty(parseInt(data.objectId)) && objects[parseInt(data.objectId)].properties.hasOwnProperty(data.message.property)) {
    if (objects.hasOwnProperty(data.objectId) && objects[data.objectId].properties.hasOwnProperty(data.message.property)) {
        // objects[parseInt(data.objectId)].properties[data.message.property].value = data.message.value;
        objects[data.objectId].properties[data.message.property].value = data.message.value;
        // console.log('objects[data.objectId].properties[data.message.property] ', objects[parseInt(data.objectId)].properties[data.message.property]);
        console.log('objects[data.objectId].properties[data.message.property] ', objects[data.objectId].properties[data.message.property]);
        //PRIMA ERA FUORI
        //enoceanSendToDevice(data, enocean, data.allProperties);
    }
    //il comando di seguito serve per richiedere al dongle il suo indirizzo
    //enoceanSend('00' ,'05', '03','');

    //il comando di seguito invia un telegramma di tipo vld con il comando 01 con playload 011e64 all'oggetto con Id 019275d1
    //enoceanSend('d2', '01', '011e64', '019275d1');

    //prove calcolo CRC8 L e H
    /*var provaCRC8H = enocean.pad( enocean.crc( new Buffer('00070701',"hex") ).toString( 16 ) , 2 )
     console.log('provaCRC8L ',provaCRC8H);

     var provaCRC8L = enocean.pad( enocean.crc( new Buffer('f60000298b822001ffffffff3600',"hex") ).toString( 16 ) , 2 )
     console.log('provaCRC8L ',provaCRC8L);*/

    //ADESSO MESSO DENTRO L'IF
    enoceanSendToDevice(data, enocean, data.allProperties);
    console.log('++++++++INVIATO++++++++');
});

var first = 0;
var enoceanInit = function (port) {
    clearInterval(search)
    enocean.listen(port.comName);

    console.log("Enocean Object Istanziato sulla porta ", port.comName);
    setTimeout(function () {
        console.log("Cerco di capire il nuovo chipID:")
        enoceanSend('00', '05', '03', 'ffffffff');
        chipIdWait = 1;

    }, 5000)

    if (first == 0) {
        first = 1;
        enocean.on("data", function (data) {
            console.log("Arriva questo: ")
            console.log(data)
            enoceanApplianceOnOnce = 1;
            //enoceanLearnAndInstall(data);
            enoceanAppliance(data);


        });

        enocean.on("disconnect", function () {
            console.log("DISCONNECT ENOCEAN*********")
            disconnect = 1;
            openDongle = 0;
            enoceanSearch()
        });
    }
    return;
}

//all'evvio del service controllo se c'è il dongle è in caso affermativo istanzio la seriale e tutto il resto
/*com.list(function (err, ports) {
 if (err) {
 console.log("Unable to get serial ports, error: ", err);
 } else {
 ports.forEach(function (port) {
 //console.log(port);
 if (String(port.manufacturer) === "EnOcean_GmbH" || String(port.manufacturer) === "EnOcean_GmbH") {
 preEnoceanFound = 1;
 enoceanInit(port);
 }
 });
 }
 });*/


//permette di instanziare una nuova seriale sul dongle nel caso in cui viene disconnesso il dongle successivamente alla fase di avvio, o di istanziare il necessario nel caso in cui il sistema inizialmente parte senza dongle e viene connesso successivamente
var portFound;
var openDongle = 0;
var search
var enoceanSearch = function () {
    search = setInterval(function () {
        com.list(function (err, ports) {
            if (err) {
                console.log("Unable to get serial ports, error: ", err);
            } else {
                disconnect = 1;
                var usb = {}
                ports.forEach(function (port) {
                    if (String(port.manufacturer) === "EnOcean_GmbH" || String(port.manufacturer) === "EnOcean_GmbH") {
                        disconnect = 0;
                        if (openDongle == 0) openDongle = 1;
                        usb = port;
                    }
                })
                if (disconnect) {
                    console.log("Search for a Dongle Enocean")
                    if (usb && usb.hasOwnProperty('comName')) {
                        console.log(usb)
                        enoceanInit(usb);
                    } else {
                        openDongle = 0;
                    }

                } else {
                    if (openDongle == 2) {
                        console.log("Dongle started!");
                    } else if (openDongle == 1) {
                        console.log("Dongle Inserted but not started")
                        if (usb && usb.hasOwnProperty('comName')) {
                            console.log(usb)
                            enoceanInit(usb);
                            openDongle = 2;
                        }
                    } else if (openDongle == 0) {
                        console.log("Dongle Not Inserted")
                    }

                }
            }
        })

    }, 5000);
}

enoceanSearch();

socketServer.on("connection", function (Socket) {
    Socket.on("update_collections", function () {
        Apio.Object.list("admin", function (err, oBjects) {
            if (err) {

            } else {
                console.log('OBJECTS IS: ', oBjects);
                // objects = oBjects;
                objects = {};

                for (var i in oBjects) {
                    objects[oBjects[i].objectId] = oBjects[i];
                }
            }
        });
        Apio.Database.db.collection("Communication").findOne({'name': 'integratedCommunication'}, function (err, doc) {
            if (err) {
                ////console.log("Error while trying to retrieve the serial address. Aborting Serial.send");
            } else if (doc) {

                communication = doc;
                console.log('la collection communication contiene: ', communication)
            }
        });

        Apio.Database.db.collection("Communication").findOne({'name': 'addressBindToProperty'}, function (err, doc) {
            if (err) {
                ////console.log("Error while trying to retrieve the serial address. Aborting Serial.send");
            } else if (doc) {

                bindToProperty = doc;
                console.log('la collection communication contiene: ', communication)
            }
        });
    });
});

http.listen(Port, "localhost", function () {
// http.listen(Port, function () {
    console.log("APIO Enocean Services on " + Port);

    var gc = require("./garbage_collector.js");
    gc();
});