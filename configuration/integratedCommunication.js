module.exports = {
    "name": "integratedCommunication",
    "zwave": {
        "FGWPE": {
            "send": {},
            "recive": {
                "00": "(function(data){console.log('switch');var properties = {'switch':''}; properties.switch=String(Number(data.value)); return properties;})",
                "01": "(function(data){console.log('power');var properties = {'power':''}; properties.power=String(Number(data.value)); return properties;})"
            }
        }
    },
    "apio": {
        "EstronSDM220": {
            "send": {},
            "recive": {
                "energy": "(function(data) { console.log('*******data******', data); var properties = { dati: { 'frequency': '', 'voltage': ' ', 'current': '', 'power': '', 'energy': '', 'appPower': '', 'reaPower': '', 'impEnergy': '', 'expEnergy': '', 'impLagAppEnergy': '', 'expLagAppEnergy': '', 'impLagReaEnergy': '', 'expLagReaEnergy': '' } }; var property = Object.keys(data.properties)[0]; if (property == 'EstronSDM220') { var value = data.properties.EstronSDM220.split('|'); var n = Number(value[0]); for (var h = 1; h < value.length - 1; h++) { console.log('primo valore: ',value[h][0]); if(value[h][0] == 'n'){ console.log('valore negativo'); value[h] = value[h].substring(0, 0) + '-' + value[h].substring(0+1); } properties.dati[Object.keys(properties.dati)[n]] = value[h]; console.log('n: ', n); console.log('h: ', h); console.log('this property: ', properties.dati[Object.keys(properties.dati)[n]]); n++; } console.log('******properties: ', properties.dati); } var key = Object.keys(properties.dati); for(var x in key){ if(properties.dati[key[x]] == ''){ delete properties.dati[key[x]]; } } return properties.dati; })",
                "update": "(function(data){console.log('switch');var properties = {'switch':''}; properties.switch=String(Number(data.value)); return properties;})"
            }
        },
        "Selco200to400": {
            "send": {},
            "recive": {
                "inverter": "(function(data) { console.log('*******data******', data); var properties = { dati : { 'ACVoltage1': '', 'ACVoltage2': ' ', 'ACVoltage3': '', 'ACCurrent1': '', 'ACCurrent2': '', 'ACCurrent3': '', 'DCVoltage1': ' ', 'DCVoltage2': '', 'DCCurrent1': '', 'DCCurrent2': '', 'Allarm': '', 'TotalEnergy': ' ', 'Status': '' } }; var property = Object.keys(data.properties)[0]; if (property == 'Selco200to400') { var value = data.properties.Selco200to400.split('|'); var n = Number(value[0]); for (var h = 1; h < value.length - 1; h++) { console.log('primo valore: ',value[h][0]); if(value[h][0] == 'n'){ console.log('valore negativo'); value[h] = value[h].substring(0, 0) + '-' + value[h].substring(0+1); } properties.dati[Object.keys(properties.dati)[n]] = value[h]; console.log('n: ', n); console.log('h: ', h); console.log('this property: ', properties.dati[Object.keys(properties.dati)[n]]); n++; } console.log('******properties: ', properties.dati); } var key = Object.keys(properties.dati); for(var x in key){ if(properties.dati[key[x]] == ''){ delete properties.dati[key[x]]; } } return properties.dati; })",
                "update": "(function(data){console.log('switch');var properties = {'switch':''}; properties.switch=String(Number(data.value)); return properties;})"
            }
        },
        "SenecaS500": {
            "send": {},
            "recive": {
                "energy": "(function(data) { console.log('*******data******', data); var properties = { dati: { 'frequency': '', 'voltage': ' ', 'current': '', 'power': '', 'energy': '', 'impEnergy': '', 'expEnergy': '', 'impLagAppEnergy': '', 'expLagAppEnergy': '', 'impLagReaEnergy': '', 'expLagReaEnergy': '', 'appPower': '', 'reaPower': '' } }; var property = Object.keys(data.properties)[0]; if (property == 'SenecaS500') { var value = data.properties.SenecaS500.split('|'); var n = Number(value[0]); for (var h = 1; h < value.length - 1; h++) { console.log('primo valore: ',value[h][0]); if(value[h][0] == 'n'){ console.log('valore negativo'); value[h] = value[h].substring(0, 0) + '-' + value[h].substring(0+1); } properties.dati[Object.keys(properties.dati)[n]] = value[h]; console.log('n: ', n); console.log('h: ', h); console.log('this property: ', properties.dati[Object.keys(properties.dati)[n]]); n++; } console.log('******properties: ', properties.dati); } var key = Object.keys(properties.dati); for(var x in key){ if(properties.dati[key[x]] == ''){ delete properties.dati[key[x]]; } } return properties.dati; })",
                "update": "(function(data){console.log('switch');var properties = {'switch':''}; properties.switch=String(Number(data.value)); return properties;})"
            }
        },
        "SenecaMonS604": {
            "send": {},
            "recive": {
                "energy": "(function(data) { console.log('*******data******', data); var properties = { dati: { 'frequency': '', 'voltage': ' ', 'current': '', 'power': '', 'energy': '', 'impEnergy': '', 'expEnergy': '', 'impLagAppEnergy': '', 'expLagAppEnergy': '' } }; var property = Object.keys(data.properties)[0]; if (property == 'SenecaMonS604') { var value = data.properties.SenecaMonS604.split('|'); var n = Number(value[0]); for (var h = 1; h < value.length - 1; h++) { if(value[h][0] == 'n'){ console.log('valore negativo'); value[h] = value[h].substring(0, 0) + '-' + value[h].substring(0+1); } properties.dati[Object.keys(properties.dati)[n]] = value[h]; console.log('n: ', n); console.log('h: ', h); console.log('this property: ', properties.dati[Object.keys(properties.dati)[n]]); n++; } console.log('******properties: ', properties.dati); } var key = Object.keys(properties.dati); for(var x in key){ if(properties.dati[key[x]] == ''){ delete properties.dati[key[x]]; } } return properties.dati; })",
                "update": "(function(data){console.log('switch');var properties = {'switch':''}; properties.switch=String(Number(data.value)); return properties;})"
            }
        },
        "SenecaTriS604": {
            "send": {},
            "recive": {
                "energy": "(function(data) { console.log('*******data******', data); var properties = { dati: { 'frequency': '', 'voltage1': '', 'voltage2': '', 'voltage3': '', 'voltage': '', 'current1': '', 'current2': '', 'current3': '', 'current': '', 'power1': '', 'power2': '', 'power3': '', 'power': '', 'apparentPower1': '', 'apparentPower2': '', 'apparentPower3': '', 'apparentPower': '', 'reactivePower1': '', 'reactivePower2': '', 'reactivePower3': '', 'reactivePower': '', 'impEnergy': '', 'expEnergy': '', 'impLagAppEnergy': '', 'expLagAppEnergy': '' } }; var property = Object.keys(data.properties)[0]; if (property == 'SenecaTriS604') { var value = data.properties.SenecaTriS604.split('|'); var n = Number(value[0]); for (var h = 1; h < value.length - 1; h++) { console.log('primo valore: ',value[h][0]); if(value[h][0] == 'n'){ console.log('valore negativo'); value[h] = value[h].substring(0, 0) + '-' + value[h].substring(0+1); } properties.dati[Object.keys(properties.dati)[n]] = value[h]; console.log('n: ', n); console.log('h: ', h); console.log('this property: ', properties.dati[Object.keys(properties.dati)[n]]); n++; } console.log('******properties: ', properties.dati); } var key = Object.keys(properties.dati); for(var x in key){ if(properties.dati[key[x]] == ''){ delete properties.dati[key[x]]; } } return properties.dati; })"
            }
        },
        "SenecaS504C": {
            "send": {},
            "recive": {
                "energy": "(function(data) { console.log('*******data******', data); var properties = { dati: { 'frequency': '', 'voltage1': '', 'voltage2': '', 'voltage3': '', 'voltage': '', 'current1': '', 'current2': '', 'current3': '', 'current': '', 'power1': '', 'power2': '', 'power3': '', 'power': '', 'apparentPower1': '', 'apparentPower2': '', 'apparentPower3': '', 'apparentPower': '', 'reactivePower1': '', 'reactivePower2': '', 'reactivePower3': '', 'reactivePower': '', 'impEnergy': '', 'expEnergy': '', 'impLagAppEnergy': '', 'expLagAppEnergy': '' } }; var property = Object.keys(data.properties)[0]; if (property == 'SenecaS504C') { var value = data.properties.SenecaS504C.split('|'); var n = Number(value[0]); for (var h = 1; h < value.length - 1; h++) { console.log('primo valore: ',value[h][0]); if(value[h][0] == 'n'){ console.log('valore negativo'); value[h] = value[h].substring(0, 0) + '-' + value[h].substring(0+1); } properties.dati[Object.keys(properties.dati)[n]] = value[h]; console.log('n: ', n); console.log('h: ', h); console.log('this property: ', properties.dati[Object.keys(properties.dati)[n]]); n++; } console.log('******properties: ', properties.dati); } var key = Object.keys(properties.dati); for(var x in key){ if(properties.dati[key[x]] == ''){ delete properties.dati[key[x]]; } } return properties.dati; })"
            }
        },
        "DIN8": {
            "send": {
                "update": "(function(data,allProperties){var propertyname=Object.keys(data.properties)[0];var propertyvalue=data.properties[propertyname];return data.sendProtocol+data.address+':'+propertyname+':'+propertyvalue+'-';})",
                "hi": ""
            },
            "recive": {
                "update": "(function(data,allProperties){return data.properties;})",
                "hi": "(function(data,allProperties,Apio){console.log('DATA***',data,allProperties); var codifyHiDIN = [[], [], []]; var codifedHiDIN = []; for (var i in allProperties) { if (!allProperties[i].hasOwnProperty('hi') || allProperties[i].hi === true) { if (i.indexOf('rel') > -1) { codifyHiDIN[0][Number(i[3]) - 1] = allProperties[i].value; } else if (i.indexOf('dig') > -1) { codifyHiDIN[1][Number(i[3]) - 1] = allProperties[i].value; } else if (i.indexOf('dac') > -1) { codifyHiDIN[2][Number(i[3]) - 1] = allProperties[i].value; } } } for (var a in codifyHiDIN) { for (var b in codifyHiDIN[a]) { if (a != 2) { if (b == 0) { codifedHiDIN[a] = String(codifyHiDIN[a][b]); } else { codifedHiDIN[a] = codifedHiDIN[a] + String(codifyHiDIN[a][b]); } } else { if (String(codifyHiDIN[a][b]) !== '-') { if (b == 0) { if (String(Number(codifyHiDIN[a][b]).toString(16)).length < 4) { if (String(Number(codifyHiDIN[a][b]).toString(16)).length == 1) { codifedHiDIN[a] = '0'; } for (var i = 1; i < (4 - (String(Number(codifyHiDIN[a][b]).toString(16)))); i++) { codifedHiDIN[a] += '0'; } if (String(Number(codifyHiDIN[a][b]).toString(16)).length != 1) { codifedHiDIN[a] += String(Number(codifyHiDIN[a][b]).toString(16)); } } else { codifedHiDIN[a] = String(Number(codifyHiDIN[a][b]).toString(16)); } } else { if (String(Number(codifyHiDIN[a][b]).toString(16)).length < 4) { for (var i = 0; i < (4 - (String(Number(codifyHiDIN[a][b]).toString(16)))); i++) { codifedHiDIN[a] += '0'; } if (String(Number(codifyHiDIN[a][b]).toString(16)).length != 1) { codifedHiDIN[a] += String(Number(codifyHiDIN[a][b]).toString(16)); } } else { codifedHiDIN[a] += String(Number(codifyHiDIN[a][b]).toString(16)); } } } else { if (b == 0) { codifedHiDIN[a] = '0000'; } else { codifedHiDIN[a] = codifedHiDIN[a] + '0000'; } } } } if (a == 0) { codifedHiDIN[a] = codifedHiDIN[a] + '00'; } } for (var s in codifedHiDIN) { if (s != 2) { codifedHiDIN[s] = parseInt(codifedHiDIN[s], 2).toString(16); if (String(codifedHiDIN[s]).length == 1) { codifedHiDIN[s] = '0' + String(codifedHiDIN[s]); } } } console.log('RETURN: ',data.sendProtocol+data.address+':s:' + codifedHiDIN[0] + codifedHiDIN[1] + codifedHiDIN[2] + '-'); var toSend = data.address+':s:' + codifedHiDIN[0] + codifedHiDIN[1] + codifedHiDIN[2] + '-';return {send: toSend}; })"
            }
        },
        "DIN": {
            "send": {
                "update": "(function(data,allProperties){var propertyname=Object.keys(data.properties)[0];var propertyvalue=data.properties[propertyname];return data.sendProtocol+data.address+':'+propertyname+':'+propertyvalue+'-';})",
                "hi": ""
            },
            "recive": {
                "update": "(function(data,allProperties){return data.properties;})",
                "hi": "(function(data,allProperties,Apio){console.log('DATA***',data,allProperties); var codifyHiDIN = [[], [], []]; var codifedHiDIN = []; for (var i in allProperties) { if (!allProperties[i].hasOwnProperty('hi') || allProperties[i].hi === true) { if (i.indexOf('rel') > -1) { codifyHiDIN[0][Number(i[3]) - 1] = allProperties[i].value; } else if (i.indexOf('dig') > -1) { codifyHiDIN[1][Number(i[3]) - 1] = allProperties[i].value; } else if (i.indexOf('dac') > -1) { codifyHiDIN[2][Number(i[3]) - 1] = allProperties[i].value; } } } for (var a in codifyHiDIN) { for (var b in codifyHiDIN[a]) { if (a != 2) { if (b == 0) { codifedHiDIN[a] = String(codifyHiDIN[a][b]); } else { codifedHiDIN[a] = codifedHiDIN[a] + String(codifyHiDIN[a][b]); } } else { if (String(codifyHiDIN[a][b]) !== '-') { if (b == 0) { if (String(Number(codifyHiDIN[a][b]).toString(16)).length < 4) { if (String(Number(codifyHiDIN[a][b]).toString(16)).length == 1) { codifedHiDIN[a] = '0'; } for (var i = 1; i < (4 - (String(Number(codifyHiDIN[a][b]).toString(16)))); i++) { codifedHiDIN[a] += '0'; } if (String(Number(codifyHiDIN[a][b]).toString(16)).length != 1) { codifedHiDIN[a] += String(Number(codifyHiDIN[a][b]).toString(16)); } } else { codifedHiDIN[a] = String(Number(codifyHiDIN[a][b]).toString(16)); } } else { if (String(Number(codifyHiDIN[a][b]).toString(16)).length < 4) { for (var i = 0; i < (4 - (String(Number(codifyHiDIN[a][b]).toString(16)))); i++) { codifedHiDIN[a] += '0'; } if (String(Number(codifyHiDIN[a][b]).toString(16)).length != 1) { codifedHiDIN[a] += String(Number(codifyHiDIN[a][b]).toString(16)); } } else { codifedHiDIN[a] += String(Number(codifyHiDIN[a][b]).toString(16)); } } } else { if (b == 0) { codifedHiDIN[a] = '0000'; } else { codifedHiDIN[a] = codifedHiDIN[a] + '0000'; } } } } if (a == 0) { codifedHiDIN[a] = codifedHiDIN[a] + '00'; } } for (var s in codifedHiDIN) { if (s != 2) { codifedHiDIN[s] = parseInt(codifedHiDIN[s], 2).toString(16); if (String(codifedHiDIN[s]).length == 1) { codifedHiDIN[s] = '0' + String(codifedHiDIN[s]); } } } console.log('RETURN: ',data.sendProtocol+data.address+':s:' + codifedHiDIN[0] + codifedHiDIN[1] + codifedHiDIN[2] + '-'); var toSend = data.address+':s:' + codifedHiDIN[0] + codifedHiDIN[1] + codifedHiDIN[2] + '-';return {send: toSend}; })"
            }
        },
        "generic": {
            "send": {
                "update": "(function(data, allProperties) {for (var p in data.properties) {if (p !== 'date') {var propertyname = p;var propertyvalue = data.properties[propertyname];return data.sendProtocol + data.address + ':' + propertyname + ':' + propertyvalue + '-';}}})",
                "hi": "function(){console.log('RECIVE A HI')}"
            },
            "recive": {
                "update": "(function(data,allProperties){return data.properties;})",
                "hi": "function(){console.log('RECIVE A HI')}"
            }
        }
    },
    "enocean": {
        "d2-01-0b": {
            "send": {
                "01": "(function(data,enocean){ var optionalLenght = 'calculate'; var packetType = '01';  var dataLenght = 'calculate';  var choise = 'd2';var row = ''; if(data.message.value == '0'){ row = '011e00'; } else if(data.message.value == '1'){ row = '011e64'; } var senderId = enocean.base;  var status = '00';  var subTelNum = '03';  var destinationId = data.protocol.address;  var securityLevel = '00';  var dBm = 'ff';  var optionalData = subTelNum + destinationId + dBm + securityLevel;  var data = choise + row + senderId + status;  dataLenght = data;  console.log('data lenght', (dataLenght.length) / 2);  dataLenght = ((dataLenght.length) / 2).toString(16);  if (dataLenght.length === 1) { dataLenght = '000' + dataLenght;  } else if (dataLenght.length === 2) { dataLenght = '00' + dataLenght;  } else if (dataLenght.length === 3) { dataLenght = '0' + dataLenght;  }  optionalLenght = optionalData;  console.log('optionalLenght lenght in decimale', (optionalLenght.length) / 2);  optionalLenght = ((optionalLenght.length) / 2).toString(16);  if (optionalLenght.length === 1) { optionalLenght = '0' + optionalLenght;  }  console.log('optionalLenght length hex', optionalLenght);  data += optionalData;  var header = dataLenght + optionalLenght + packetType;  return { header : header, data : data } })",
                "02": "function(){console.log('SET LOCAL')}",
                "setup": "(function(dataObject,enocean,addInfo){   var property = {  plug1 : '',  energy1 : '',  power1 : '',  mesureMode : '' };  console.log('dataObject: ',dataObject);  if(addInfo !== undefined && addInfo.hasOwnProperty('mesureMode')){ property.mesureMode = addInfo.mesureMode; } else { property.mesureMode = '1'; } var DB_0 = '01'; var DB_1 = '01'; var DB_2 = '00'; var DB_3 = '03'; var DB_4 = parseInt('10' + property.mesureMode + '11110',2).toString(16); var DB_5 = '05'; var optionalLenght = 'calculate';   var packetType = '01';    var dataLenght = 'calculate';    var choise = 'd2';  var row = DB_5 + DB_4 + DB_3 + DB_2 + DB_1 + DB_0;   console.log('row: ',row);  var senderId = enocean.base;    var status = '00';    var subTelNum = '03';    var destinationId = dataObject.protocol.address;    var securityLevel = '00';    var dBm = 'ff';    var optionalData = subTelNum + destinationId + dBm + securityLevel;    var data = choise + row + senderId + status;  dataLenght = data;    console.log('data lenght', (dataLenght.length) / 2);    dataLenght = ((dataLenght.length) / 2).toString(16);    if (dataLenght.length === 1) {   dataLenght = '000' + dataLenght;    } else if (dataLenght.length === 2) {   dataLenght = '00' + dataLenght;    } else if (dataLenght.length === 3) {   dataLenght = '0' + dataLenght;   }    optionalLenght = optionalData;    console.log('optionalLenght lenght in decimale', (optionalLenght.length) / 2);    optionalLenght = ((optionalLenght.length) / 2).toString(16);    if (optionalLenght.length === 1) {   optionalLenght = '0' + optionalLenght;    }    console.log('optionalLenght length hex', optionalLenght);    data += optionalData;    var header = dataLenght + optionalLenght + packetType;    return { header : header, data : data } })"
            },
            "recive": {
                "01": "(function(dataObject,enocean){   var property = {  energy1 : '',  power1 : '' };  dataObject = dataObject.rawByte; console.log('dataObject: ',dataObject);  var dataLenght = parseInt(dataObject.substring(2, 6),16); var fun = dataObject.substring(14, 16); var dataRow = dataObject.substring(14, 14 + dataLenght + 1); console.log('dataRow: ', dataRow); console.log('FUN: ',fun); if(fun == '07'){ var mesureUnit = parseInt(dataRow.substring(2, 4)).toString(2); console.log('mesureUnit', mesureUnit); var mesure = dataRow.substring(4, 13); console.log('mesure: ',mesure); console.log('mesureUnit.length: ',mesureUnit.length); if(mesureUnit.length < 8){ console.log('mesureUnit, ha meno zeri del previsto, aggiungo gli zeri: ', mesureUnit); var addToZero = 8 - mesureUnit.length; for(var s = 2; s <= addToZero; s++){ mesureUnit = '0' + mesureUnit; } console.log('mesureUnit corretta: ',mesureUnit); } mesureUnit = mesureUnit[0] + mesureUnit[1] + mesureUnit[2]; mesureUnit = parseInt(mesureUnit,2).toString(16); console.log('unità di misura: ', mesureUnit); if(mesureUnit == '3'){ mesure = parseInt(mesure,16); property.power1 = ((mesure*3000*100000)/4294967295).toFixed(2); } } return property; })"
            }
        },
        "a5-06-01": {
            "send": {
                "01": "",
                "02": "function(){console.log('SET LOCAL')}"
            },
            "recive": {
                "01": "(function(data,enocean){ var convertData = []; convertData[0] = data.raw[0] + data.raw[1]; convertData[1] = data.raw[2] + data.raw[3]; convertData[2] = data.raw[4] + data.raw[5]; convertData[3] = data.raw[6] + data.raw[7]; var data = { supplyVoltage : '', lux : '' }; console.log('CONVERTDATA ', convertData); console.log('CONVERTDATA1 ', convertData[1]); console.log('CONVERTDATA2 ', convertData[2]); var rangeSelect = parseInt(convertData[3],16).toString(2); console.log('RANGE SELECTED ',rangeSelect); if(rangeSelect[3] == 1){ data.lux = String((parseInt(convertData[1],16)*(30000/255)+(300-(parseInt(convertData[1],16)*300/255))).toFixed( 2 )); } else if(rangeSelect[3] == 0){ data.lux = String((parseInt(convertData[1],16)*(60000/255)+(600-(parseInt(convertData[1],16)*600/255))).toFixed( 2 )); } data.supplyVoltage = String((parseInt(convertData[0],16)*5.1/255).toFixed( 2 )); console.log('return***** ',data); return data; })"
            }
        },
        "a5-07-01": {
            "send": {
                "01": "",
                "02": "function(){console.log('SET LOCAL')}"
            },
            "recive": {
                "01": "(function(data, enocean) {console.log('PIR');var convertData = []; convertData[0] = data.raw[0] + data.raw[1]; convertData[1] = data.raw[2] + data.raw[3]; convertData[2] = data.raw[4] + data.raw[5]; convertData[3] = data.raw[6] + data.raw[7]; var data = { presenza: '' }; console.log('CONVERTDATA ', convertData); console.log('CONVERTDATA1 ', convertData[1]); console.log('CONVERTDATA2 ', convertData[2]); var presenza = parseInt(convertData[2], 16); console.log('Presenza ', presenza); if (presenza > 127) { data.presenza = '1'; } else { data.presenza = '0'; } console.log('return***** ', data); return data; })"
            }
        },
        "a5-02-05": {
            "send": {
                "01": "(function(){})"
            },
            "recive": {
                "01": "(function(dataObject, enocean) { var property = { temperature: '' }; var temperature = parseInt(dataObject.raw.substring(4, 6),16); console.log('temperature hex: ', temperature); temperature = ((temperature - 255) * (40 / -255)).toFixed(2); console.log('temperature converted int: ', temperature); property.temperature = String(temperature); return property; })"
            }
        },
        "f6": {
            "send": {
                "01": "(function(){})"
            },
            "recive": {
                "01": "(function(data, enocean,proprieta) {if (data.raw === '50') { if (proprieta.onoff.value === '0') { console.log(1); var properties = { onoff: '1' }; return properties; } else { var properties = { onoff: '0' }; return properties; } } else if (data.raw === '70') { if (proprieta.onoff1.value === '0') { var properties = { onoff1: '1' }; return properties } else { var properties = { onoff1: '0' }; return properties; } } else if (data.raw === '30') { if (proprieta.onoff2.value === '0') { var properties = { onoff2: '1' }; return properties } else { var properties = { onoff2: '0' }; return properties; } } else if (data.raw === '10') { if (proprieta.onoff3.value === '0') { var properties = { onoff3: '1' }; return properties } else { var properties = { onoff3: '0' }; return properties; } } else if (data.raw === '37') { if (proprieta.onoff4.value === '0') { var properties = { onoff4: '1' }; return properties } else { var properties = { onoff4: '0' }; return properties; } } else if (data.raw === '15') { if (proprieta.onoff5.value === '0') { var properties = { onoff5: '1' }; return properties } else { var properties = { onoff5: '0' }; return properties; } } })"
            }
        },
        "d5-00-01": {
            "send": {
                "01": "(function(){})"
            },
            "recive": {
                "01": "(function(data,enocean){var contact;if(data.raw == '08'){contact = '1';} else if(data.raw == '09'){contact = '0';}console.log(data.raw);var properties = {door: contact};return properties;})"
            }
        },
        "d5-00-02": {
            "send": {
                "01": "(function(){})"
            },
            "recive": {
                "01": "(function(data,enocean){var contact;if(data.raw == '08'){contact = '1';} else if(data.raw == '09'){contact = '0';}console.log(data.raw);var properties = {window: contact};return properties;})"
            }
        },
        "a5-20-01": {
            "send": {
                "01": "(function(dataObject,enocean,addInfo){   var property = {  temperature : '',  actuatorObstructed : '',  energySufficent : '',  setPoint : '',  setPointSelection : '',  valveOpenClose : '',  valvePosition : ''  };  console.log('dataObject: ',dataObject);  if(addInfo !== undefined){ console.log('original valvePosition: ', addInfo.setPoint.value); console.log('origina temperature: ', addInfo.temperature.value); property.valvePosition = parseInt((parseInt(addInfo.setPoint.value)*255/40)).toString(16); property.temperature = parseInt(255-(parseInt(addInfo.temperature.value)*255/40)).toString(16); } else { property.valvePosition = parseInt((parseInt(dataObject.message.value)*255/40)).toString(16); property.temperature = 'AC'; } console.log('valvePosition ',property.valvePosition);  if(property.valvePosition.length == 1){  property.valvePosition = '0' + property.valvePosition;  }  if(property.temperature.length == 1){ property.temperature = '0' + property.temperature;  } var optionalLenght = 'calculate';   var packetType = '01';    var dataLenght = 'calculate';    var choise = 'a5';  var row = property.valvePosition + property.temperature + '81' + '08';   console.log('row: ',row);  var senderId = enocean.base;    var status = '00';    var subTelNum = '03';    var destinationId = dataObject.protocol.address;    var securityLevel = '00';    var dBm = 'ff';    var optionalData = subTelNum + destinationId + dBm + securityLevel;    var data = choise + row + senderId + status;  dataLenght = data;    console.log('data lenght', (dataLenght.length) / 2);    dataLenght = ((dataLenght.length) / 2).toString(16);    if (dataLenght.length === 1) {   dataLenght = '000' + dataLenght;    } else if (dataLenght.length === 2) {   dataLenght = '00' + dataLenght;    } else if (dataLenght.length === 3) {   dataLenght = '0' + dataLenght;   }    optionalLenght = optionalData;    console.log('optionalLenght lenght in decimale', (optionalLenght.length) / 2);    optionalLenght = ((optionalLenght.length) / 2).toString(16);    if (optionalLenght.length === 1) {   optionalLenght = '0' + optionalLenght;    }    console.log('optionalLenght length hex', optionalLenght);    data += optionalData;    var header = dataLenght + optionalLenght + packetType;    return { header : header, data : data } })"
            },
            "recive": {
                "01": "(function(data, enocean) { var property = { temperature: '', actuatorObstructed: '', energySufficent: '', valveOpenClose: '' }; property.temperature = String((parseInt(data.raw.substring(4, 6), 16) * 40 / 255).toFixed(2)); property.actuatorObstructed = parseInt(data.raw.substring(2, 4), 16).toString(2)[7]; property.valveOpenClose = String(parseInt(data.raw.substring(0, 3), 16)); if(property.valveOpenClose != '64'){ property.valveOpenClose = '1'; } else { property.valveOpenClose = '0'; } if (property.actuatorObstructed === undefined) { property.actuatorObstructed = '0'; } property.energySufficent = parseInt(data.raw.substring(2, 4), 16).toString(2)[3]; property.valveOpenClose = parseInt(data.raw.substring(2, 4), 16).toString(2)[4]; console.log('return***** ', property); return property; })"
            }
        }
    }
}