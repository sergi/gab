/**
 * Example of a naïve FTP client using Gab
 */

var Net = require("net");
var Gab = require("../gab");

var Ftp = function (cfg) {
    Gab.apply(this, arguments);

    this.data = ""

    var port = cfg.port;
    var host = cfg.host;

    this.commands = [
        "QUIT",
        "PWD",
        "PASS xxxx", // Your password here
        "USER user", // Your user here
    ];

    this.terminator = "\n";

    this.connect(port, host);
}

Ftp.prototype = new Gab;
Ftp.prototype.constructor = Ftp;

Ftp.prototype.collectIncomingData = function(data) {
    this.data += data;
};

Ftp.prototype.foundTerminator = function() {
    var data = this.data;
    var command;

    if (data.charAt(data.length - 1) === "\r")
        data = data.substring(0, data.length - 2);

    this.data = "";

    console.log("S:", data);

    if (/\d\d\d/.test(data)) {
        if (this.commands.length) {
            command = this.commands.pop();
            console.log("C:", command)
            this.push(command + "\r\n");
        }
    }
};

var ftp = new Ftp({
    port: 21,
    host: "localhost"
});
