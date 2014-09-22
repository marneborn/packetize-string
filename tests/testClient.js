"use strict";

var net = require('net');
var Packetizer = require('../index.js');

var host   = '127.0.0.1';
var port   = 6116;
var sender = new Packetizer.Sender();
var client = new net.Socket();
client.connect(port, host, function() {
    client.write(Packetizer.send("Hello World"));
});
