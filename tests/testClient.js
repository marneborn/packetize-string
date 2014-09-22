"use strict";

var net = require('net');

let Packetizer = require('../index.js');

var HOST = '127.0.0.1';
var PORT = 6969;

let sender   = new Packetizer.Sender();
let receiver = new Packetizer.Receiver();

receiver.on('message', function (msg) { console.log("Got back: "+msg) });
sender.packetize("I am Chuck Norris!");

var client = new net.Socket();
client.connect(PORT, HOST, function() {

    console.log('CONNECTED TO: ' + HOST + ':' + PORT);
    // Write a message to the socket as soon as the client is connected, the server will receive it as message from the client 
    client.write(sender.packets());

});

// Add a 'data' event handler for the client socket
// data is what the server sent to this socket
client.on('data', function (chunk) { receiver.accumulate(chunk); });
//client.on('data', receiver.accumulate.bind(receiver));

// Add a 'close' event handler for the client socket
client.on('close', function() {
    console.log('Connection closed');
});
