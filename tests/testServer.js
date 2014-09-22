"use strict";

var net = require('net');
let Packetizer = require('../index.js');

var HOST = '127.0.0.1';
var PORT = 6969;

net.createServer(function (socket) {
    
    console.log('Talking to: ' + socket.remoteAddress +':'+ socket.remotePort);

    let receiver = new Packetizer.Receiver();

    receiver.on('message', function (msg) {
        console.log("Heard: "+msg);
        socket.write(""+new Packetizer.Sender('You said \"'+msg+'"'));
    });

    socket.on('data', function (chunk) { receiver.accumulate(chunk); });

    socket.on('close', function(data) {
        console.log('CLOSED: ' + socket.remoteAddress +' '+ socket.remotePort);
    });
    
    socket.on('error', function (e) { console.log("-E- "+e); });
})
.listen(PORT, HOST);

console.log('Server listening on ' + HOST +':'+ PORT);

