var com = require("serialport");
var exec = require("child_process").exec;
var fs = require("fs");
var spawn = require("child_process").spawn;

var final = function () {
    exec("ps aux | grep wvdial | awk '{print $2}'", function (err_ps, stdout, stderr) {
        if (err_ps) {
            console.log("Error while getting running proccesses: ", err_ps);
        } else if (stdout) {
            stdout = stdout.trim().split("\n");
            //wvdial is NOT running
            if (stdout.length === 2) {
                com.list(function (err, ports) {
                    if (err) {
                        console.log("Error while scanning ports: ", err);
                    } else if (ports) {
                        var tty = undefined;
                        for (var p = 0; tty === undefined && p < ports.length; p++) {
                            if (ports[p].vendorId === "0x2001" && ports[p].productId === "0x7d02") {
                                tty = ports[p].comName;
                            }
                        }

                        if (tty) {
                            fs.readFile("/etc/wvdial.conf", "utf8", function (e_f, content) {
                                if (e_f) {
                                    console.log("Error while reading file /etc/wvdial.conf: ", e_f);
                                } else if (content) {
                                    content = content.split("\n");
                                    for (var index in content) {
                                        if (content[index].indexOf("Modem") > -1 && content[index].indexOf("Modem Type") === -1) {
                                            var oldTty = content[index].split("=")[1].trim();
                                            content[index] = content[index].replace(oldTty, tty);
                                        }
                                    }

                                    fs.writeFile("/etc/wvdial.conf", content.join("\n"), function (e_f_w) {
                                        if (e_f_w) {
                                            console.log("Error while writing file /etc/wvdial.conf: ", e_f_w);
                                        } else {
                                            console.log("New tty (" + tty + ") successfully saved on file /etc/wvdial.conf");

                                            var serial = new com.SerialPort(tty, {
                                                baudrate: "115200",
                                                parser: com.parsers.readline("\r\n")
                                            });

                                            serial.on("open", function () {
                                                setTimeout(function () {
                                                    serial.close(function (err) {
                                                        if (err) {
                                                            console.log("Error while closing serial port: ", err);
                                                        } else {
                                                            fs.readFile(__dirname + "/wvdial_flag.txt", "utf8", function (e_wv_f, attempts) {
                                                                if (e_wv_f) {
                                                                    console.log("Unable to read file " + __dirname + "/wvdial_flag.txt: ", e_wv_f);
                                                                } else {
                                                                    attempts = Number(attempts.trim());
                                                                    if (attempts < 3) {
                                                                        var wvdial = spawn("wvdial", {
                                                                            detached: true
                                                                        });

                                                                        attempts++;

                                                                        fs.writeFile(__dirname + "/wvdial_flag.txt", String(attempts), function (e_wv_f_w) {
                                                                            if (e_wv_f_w) {
                                                                                console.log("Unable to write file " + __dirname + "/wvdial_flag.txt: ", e_wv_f_w);
                                                                            } else {
                                                                                process.exit(0);
                                                                            }
                                                                        });
                                                                    } else {
                                                                        fs.writeFile(__dirname + "/wvdial_flag.txt", "0", function (e_wv_f_w) {
                                                                            if (e_wv_f_w) {
                                                                                console.log("Unable to write file " + __dirname + "/wvdial_flag.txt: ", e_wv_f_w);
                                                                            } else {
                                                                                exec("reboot");
                                                                            }
                                                                        });
                                                                    }
                                                                }
                                                            });
                                                        }
                                                    });
                                                }, 2000);
                                            });
                                        }
                                    });
                                } else {
                                    console.log("File /etc/wvdial.conf is empty");
                                }
                            });
                        } else {
                            console.log("No tty found, probably the dongle is unplugged");
                        }
                    } else {
                        console.log("No ports");
                    }
                });
            //wvdial is running
            } else {
                setTimeout(function () {
                    require("dns").resolve("www.google.com", function (err) {
                        if (err) {
                            exec("killall wvdial", function () {
                                console.log("Killing wvdial: no internet connection");
                            });
                        } else {
                            fs.writeFile(__dirname + "/wvdial_flag.txt", "0", function (e_wv_f) {
                                if (e_wv_f) {
                                    console.log("Unable to write file " + __dirname + "/wvdial_flag.txt: ", e_wv_f);
                                } else {
                                    console.log("Successfully connected to the internet, resetting " + __dirname + "/wvdial_flag.txt");
                                }
                            });
                        }
                    });
                }, 5000);
            }
        } else if (stderr) {
            console.log("Something from standard error: ", stderr);
        }
    });
};

fs.stat(__dirname + "/wvdial_flag.txt", function (err_st) {
    if (err_st) {
        console.log("File doesn't exist");
        fs.writeFile(__dirname + "/wvdial_flag.txt", "0", function (e_wv_f) {
            if (e_wv_f) {
                console.log("Unable to write file " + __dirname + "/wvdial_flag.txt: ", e_wv_f);
            } else {
                final();
            }
        });
    } else {
        final();
    }
});