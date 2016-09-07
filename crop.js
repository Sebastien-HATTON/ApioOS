var easyimg = require("easyimage");
var fs = require("fs");
var imageSize = require('image-size');

var path = "public/applications";
var folders = fs.readdirSync(path);
for (var i = 0; i < folders.length; i++) {
    if (!fs.statSync(path + "/" + folders[i]).isDirectory() || isNaN(folders[i])) {
        folders.splice(i--, 1);
    }
}

var next = true;
var interval = setInterval(function () {
    if (next) {
        if (folders[0]) {
            next = false;
            var app = folders.shift();
            if (fs.existsSync(path + "/" + app + "/icon.png")) {
                var dimensions = imageSize(path + "/" + app + "/icon.png");
                easyimg.exec("convert " + path + "/" + app + "/icon.png -resize " + dimensions.width + "x" + dimensions.height + "^  -gravity center -crop " + dimensions.width + "x" + dimensions.height + "+0+0 +repage " + path + "/" + app + "/cropped.png").then(function (file) {
                    easyimg.exec("convert " + path + "/" + app + "/cropped.png \\( -size " + dimensions.width + "x" + dimensions.height + " xc:none -fill white -draw \"circle " + (dimensions.width / 2) + "," + (dimensions.height / 2) + " " + (Math.max(dimensions.width, dimensions.height) / 2) + ",0\" \\) -compose copy_opacity -composite " + path + "/" + app + "/cropped.png").then(function (file) {
                        next = true;
                        console.log("Image " + path + "/" + app + "/icon.png cropped");
                    }, function (err) {
                        next = true;
                        console.log(err);
                    });
                }, function (err) {
                    next = true;
                    console.log(err);
                });
            } else {
                next = true;
            }
        } else {
            clearInterval(interval);
        }
    }
}, 0);