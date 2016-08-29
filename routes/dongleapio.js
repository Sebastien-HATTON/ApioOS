var fs = require("fs");

module.exports = function (Apio) {
    return {
        getSettings: function (req, res) {
            console.log("getSession routes");
            console.log(Apio.Configuration);
            if (Apio.hasOwnProperty("Configuration")) {
                if (Apio.Configuration.hasOwnProperty("dongle")) {
                    res.send(Apio.Configuration.dongle);
                } else {
                    res.status(500).send("Errore");
                }
            }
        },
        changeSettings: function (req, res) {
            Apio.Configuration.dongle.panId = req.body.panId;
            //Apio.Configuration.dongle.dataRate = req.body.dataRate;
            //Apio.Configuration.dongle.radioPower = req.body.radioPower;
            var a = "module.exports = ";
            a += JSON.stringify(Apio.Configuration.dongle);
            a += "";
            console.log(a);
            //Apio.Serial.send("0:panId:" + req.body.panId + ":dataRate:" + req.body.dataRate + ":radioPower:" + req.body.radioPower + "-");
            Apio.Serial.send("l0:panId:" + req.body.panId + "-");

            fs.writeFileSync('configuration/dongle.js', a);

            res.status(200);
        },
        onoff: function (req, res) {
            console.log("Chiamata la rotta onoff di DongleApio");
            console.log(req.body.onoff);
            if (req.body.onoff) {
                Apio.Serial.interval();
                res.status(200).send();

            } else {
                Apio.Serial.close();
                clearInterval(Apio.Serial.dongleInterval);

                res.status(200).send();
            }
        }
    };
};