/*
 * @package gab
 * @copyright Copyright(c) Sergi Mansilla <sergi.mansilla@gmail.com>
 * @author Sergi Mansilla <sergi.mansilla@gmail.com>
 * @license https://github.com/sergi/gab/blob/master/LICENSE MIT License
 *
 * Inspired by asynchat.py (http://svn.python.org/projects/python/branches/pep-0384/Lib/asynchat.py)
 */
var Net = require("net");

// This is an abstract class. You must derive from this class, and add
// the two methods collectIncomingData() and foundTerminator()
var Gab = module.exports = function Gab(cfg) {
    this.inBuffer = "";
    this.incoming = [];
    this.fifo = [];

    this.encoding = (cfg && cfg.encoding);
    this.terminator = (cfg && cfg.terminator) || "\r\n";
};

Gab.prototype = {
    connect: function(port, host) {
        this.socket = Net.createConnection(port, host);

        if (this.encoding)
            this.socket.setEncoding(this.encoding);

        var self = this;
        this.socket.on("connect", function(e) {
            self.handleConnect.call(self, e);
        });

        this.socket.on("data", function(data) {
            self.handleRead.call(self, data);
        });

        this.socket.on("error", function(e) {
            console.trace()
            self.handleError.call(self, e);
        });
    },

    handleConnect: function(e) {
        this.connected = true;
    },

    handleRead: function(data) {
        // Continue to search for self.terminator in self.ac_in_buffer,
        // while calling self.collect_incoming_data.  The while loop
        // is necessary because we might read several data+terminator
        // combos with a single recv(4096).

        this.inBuffer += data;

        while(this.inBuffer) {
            var dataLen = this.inBuffer.length;
            var terminator = this.terminator;

            if (!terminator) {
                // no terminator, collect it all
                this.collectIncomingData(this.inBuffer);
                this.inBuffer = "";
            }
            // The terminator can be a number, in which case we assume it is
            // refering to the number of bytes we want to get.
            else if (typeof terminator === "number") {
                var n = terminator;
                if (dataLen < n) {
                    this.collectIncomingData(this.inBuffer);
                    this.terminator -= dataLen
                    this.inBuffer = "";
                }
                else {
                    this.collectIncomingData(this.inBuffer.substring(0, n));
                    this.inBuffer = this.inBuffer.substring(n);
                    this.terminator = 0;
                    this.foundTerminator();
                }
            }
            else {
                // 3 cases:
                // 1) end of buffer matches terminator exactly:
                //    collect data, transition
                // 2) end of buffer matches some prefix:
                //    collect data to the prefix
                // 3) end of buffer does not match any prefix:
                //    collect data
                var terminatorLen = terminator.length;
                var index = this.inBuffer.indexOf(terminator);

                if (index !== -1) {
                    // we found the terminator
                    if (index > 0) {
                        // don't bother reporting the empty string (source of subtle bugs)
                        this.collectIncomingData (this.inBuffer.substring(0, index));
                    }
                    this.inBuffer = this.inBuffer.substring(index + terminatorLen);
                    // This does the Right Thing if the terminator is changed here.
                    this.foundTerminator();
                }
                else {
                    // check for a prefix of the terminator
                    index = findPrefixAtEnd(this.inBuffer, terminator);
                    if (index) {
                        if (index !== dataLen) {
                            // we found a prefix, collect up to the prefix
                            this.collectIncomingData(this.inBuffer.substring(0, index));
                            this.inBuffer = this.inBuffer.substring(index);
                        }
                        break;
                    }
                    else {
                        // no prefix, collect it all
                        this.collectIncomingData(this.inBuffer);
                        this.inBuffer = "";
                    }
                }
            }
        }
    },
    send: function(data) {
        var socket = this.socket;
        if (!socket || !socket.writable)
            this.handleError();

        if (!this.connected) {
            return socket.on("connect", function sendOnConnect() {
                socket.write(data);
                socket.removeListener("connect", sendOnConnect);
            });
        }
        return socket.write(data)
    },
    push: function(data) {
        this.fifo.push(data);
        return this.initiateSend();
    },
    initiateSend: function() {
        if (this.fifo.length) {
            var data = this.fifo.shift();
            this.send(data);
        }
    },
    handleError: function(e) {
        console.error("An error ocurred:", e);
        this.handleClose(e);
    },
    handleClose: function() {
        console.warn("Unhandled close event");
        this.socket.close();
    },
    close: function() {
        this.connected = false;

        try {
            this.socket.end()
        }
        catch (e) {
            // If not ENOTCONN or EBADF
            // if why.args[0] not in (ENOTCONN, EBADF):
                //raise
            throw e;
        }
    },
    collectIncomingData: function(data) {
        throw new NotImplementedError("must be implemented in subclass")
    },

    foundTerminator: function() {
        throw new NotImplementedError("must be implemented in subclass")
    }
};

var findPrefixAtEnd = function(haystack, needle) {
    var l = needle.length - 1;

    while (l && haystack.search(new RegExp(needle.substring(l) + "$")) !== -1)
        l -= 1;

    return l;
};

