"use strict";

var net = require('net');
let Packetizer = require('../index.js');

var HOST = '127.0.0.1';
var PORT = 6969;

net.createServer(function (socket) {
    
    console.log('Talking to: ' + socket.remoteAddress +':'+ socket.remotePort);

    Packetizer.receive(socket).then(
        function ( msg ) {
            console.log("Heard: "+msg);
            socket.write(Packetizer.send('You said \"'+msg+'"'));
        }
    );

    socket.on('close', function(data) {
        console.log('CLOSED: ' + socket.remoteAddress +' '+ socket.remotePort);
    });
})
.listen(PORT, HOST);

console.log('Server listening on ' + HOST +':'+ PORT);

