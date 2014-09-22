"use strict";

var net = require('net');
let Packetizer = require('../index.js');

var HOST = '127.0.0.1';
var PORT = 6969;

let sender   = new Packetizer.Sender();
let receiver = new Packetizer.Receiver();

net.createServer(function (socket) {
    
    console.log('Talking to: ' + socket.remoteAddress +':'+ socket.remotePort);

    sock.on('data', receiver.accumulate);

    setInterval( function () {
        if ( !receiver.hasMessage() )
            return;

        let data = receiver.next();
        console.log('DATA ' + sock.remoteAddress + ': ' + data);
        // Write the data back to the socket, the client will receive it as data from the server
        sock.write('You said "' + data + '"');
        
    });
    
    // Add a 'close' event handler to this instance of socket
    sock.on('close', function(data) {
        console.log('CLOSED: ' + sock.remoteAddress +' '+ sock.remotePort);
    });
    
}).listen(PORT, HOST);

console.log('Server listening on ' + HOST +':'+ PORT);

