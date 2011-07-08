var Net = require("net");
var Gab = require("../gab");

var FTP_PORT = 21;

var Ftp = function (cfg) {
    Gab.apply(this, arguments);

    this.data = "";

    var port = cfg.port || FTP_PORT;
    var host = cfg.host;
    var user = this.user = cfg.user;
    var pass = this.pass = cfg.pass;

    this.commands = [
        "QUIT",
        "PWD",
    ];

    this.response = [];
    this.handler  = this.ftpHandleConnect;

    this.setTerminator("\n");
    this.setEncoding("utf8");

    this.connect(port, host);
};

Ftp.prototype = new Gab;
Ftp.prototype.constructor = Ftp;

Ftp.handleResponse = {
    "USER": function(res) {
        var code = res.substring(0, 3); // get response code
        if (code === "230") {
            return; // user accepted
        }
        else if (code === "331" || code === "332") {
            this.push("PASS " + this.pass + "\r\n");
            this.handler = Ftp.handleResponse["PASS"];
        }
        else {
            throw new Error("ftp login failed: user name not accepted");
        }
    },
    "PASS": function(res) {
        var code = res.substring(0, 3); // get response code
        if (code === "230") {
            return; // user and password accepted
        }
        else {
            throw new Error("ftp login failed: user/password not accepted");
        }
    }
};

Ftp.prototype.collectIncomingData = function(data) {
    this.data += data;
};

Ftp.prototype.foundTerminator = function() {
    var data = this.data;

    if (data.charAt(data.length - 1) === "\r")
        data = data.substring(0, data.length - 2);

    this.data = "";
    this.response.push(data);

    if (!/\d\d\d/.test(data))
        return;

    var response = this.response;
    this.response = [];


    response.forEach(function(line) {
        console.log("S:", line);
    });

    // process response
    if (this.handler) {
        // call the response handler
        handler = this.handler;
        this.handler = null;

        handler.call(this, response[response.length - 1]);

        if (this.handler)
            return; // follow-up command in progress
    }

    var command;
    if (this.commands.length) {
        command = this.commands.pop();
        console.log("C:", command);
        this.push(command + "\r\n");
    }
};

Ftp.prototype.ftpHandleConnect = function(res) {
    var code = res.substring(0, 3); // get response code
    if (code === "220") {
        this.push("USER " + this.user + "\r\n");
        this.handler = Ftp.handleResponse["USER"];
    }
    else {
        throw new Exception("ftp login failed");
    }
};

// Fire it up. For test purposes only!
var ftp = new Ftp({
    port: 2021,
    host: "localhost",
    user: "sergi",
    pass: "2x8hebsndr9"
});

