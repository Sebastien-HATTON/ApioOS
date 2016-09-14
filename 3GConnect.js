var com = require("serialport");
var exec = require("child_process").exec;
var fs = require("fs");
var spawn = require("child_process").spawn;

var final = function () {
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

                                require("dns").resolve("www.google.com", function (err_ping) {
                                    if (err_ping) {
                                        fs.readFile(__dirname + "/wvdial_flag.txt", "utf8", function (e_wv_f, attempts) {
                                            if (e_wv_f) {
                                                console.log("Unable to read file " + __dirname + "/wvdial_flag.txt: ", e_wv_f);
                                            } else {
                                                attempts = Number(attempts);

                                                if (attempts < 2) {
                                                    fs.writeFile(__dirname + "/wvdial_flag.txt", String(attempts + 1), function (e_wv_f_w) {
                                                        if (e_wv_f_w) {
                                                            console.log("Unable to write file " + __dirname + "/wvdial_flag.txt: ", e_wv_f_w);
                                                        } else {
                                                            console.log("Unable to ping (1), increasing counter to " + String(attempts + 1) + " on " + __dirname + "/wvdial_flag.txt");
                                                        }
                                                    });
                                                } else if (attempts < 10) {
                                                    exec("echo 1-1 | tee /sys/bus/usb/drivers/usb/unbind && sleep 5 && echo 1-1 | tee /sys/bus/usb/drivers/usb/bind && sleep 10", function (err1) {
                                                        if (err1) {
                                                            console.log("Error while unbinding and/or binding the USB key: ", err1);
                                                        } else {
                                                            var wvdial = spawn("wvdial", {
                                                                detached: true
                                                            });

                                                            fs.writeFile(__dirname + "/wvdial_flag.txt", String(attempts + 1), function (e_wv_f_w) {
                                                                if (e_wv_f_w) {
                                                                    console.log("Unable to write file " + __dirname + "/wvdial_flag.txt: ", e_wv_f_w);
                                                                } else {
                                                                    console.log("Unable to ping (2), increasing counter to " + String(attempts + 1) + " on " + __dirname + "/wvdial_flag.txt");
                                                                    process.exit(0);
                                                                }
                                                            });
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
};

fs.stat(__dirname + "/wvdial_flag.txt", function (err_st) {
    if (err_st) {
        console.log(__dirname + "/wvdial_flag.txt doesn't exist");
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