var comName="";
if (process.argv.indexOf("--serial-port") > -1) {
    comName = process.argv[process.argv.indexOf("--serial-port") + 1];
}

var request = require("request");
var fs = require("fs");
var uri = "http://apio.cc/images/simplefilemanager/56b8ac1e36d118.53616707/firmware.cpp.hex"
var path = "file.cpp.hex"
request({uri: uri})
.pipe(fs.createWriteStream(path))
.on('close', function() {
	console.log("Downloaded Hex file");
	//Apio.Configuration.serial.autoUpdate.enabled = false;
	var sys = require('sys');
	var exec = require('child_process').exec;
	var child = exec("sudo node  ../apioHexInstaller.js --serial "+String(comName)+" --name "+path, function(error, stdout, stderr) {	
		console.log("Installato in teoria");
		//Apio.Serial.init();
		var sys = require('sys');
		var exec = require('child_process').exec;
		var child = exec("sudo rm file.cpp.hex",function(error,stdout,stderr){});
	})
})