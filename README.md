packetize-string
================

Utility for converting arbitrary strings (aka messages) into packets which can be shipped using, eg nodes net functionality then reassembling the packets into messages

## Installation
```bash
npm install --save packetize-string
```

## How it works (default mode)
The first character in a packet is the header.<br>
The first 5 bits of the header are reserved for the "mode" (future enhancements).<br>
The next 11 bits of the header are the number of characters in the packet.
Long messages are split into multiple packets by the sender and stitched together by the receiver.

## Usage
Messages can be packetizes with either the [packetize-string.send(<String>)](#sendFn) function or by using the [Sender object](#sendOO).<br>
Messages can be extracted with either the [listener on the Receiver object](#rcvLsnr) or the [promise returned by packetize-string.receive(socket)](#rcvPrms)

<a name="sendFn"></a>
### Sending a message - using the send function (recommended)
```javascript
"use strict";

var net = require("net");
var Packetizer = require("packetize-string");

var host   = "127.0.0.1";
var port   = 6116;
var client = new net.Socket();
client.connect(port, host, function() {
    client.write(Packetizer.send("Hello World"));
});
```

<a name="sendOO"></a>.
### Sending a message - using the object
```javascript
"use strict";

var net = require("net");
var Packetizer = require("packetize-string");

var host   = "127.0.0.1";
var port   = 6116;
var sender = new Packetizer.Sender();
var client = new net.Socket();
client.connect(port, host, function() {
    sender.packetize("Hello World");
    sender.packetize("How are you?");
    client.write(sender.packets());
});
```

<a name="rcvLsnr"></a>.
### Receive a message - using a listener (recommended)
If the sender sends multiple messages (like in the "Sending a message - using the object" example above", each message causes it's own event, so the 'on' will fire for each message.
```javascript
"use strict";

var net = require("net");
var Packetizer = require("packetize-string");

var host = "127.0.0.1";
var port = 6116;

var receiver = new Packetizer.Receiver()
        .on("message", function (msg) {
            console.log("Heard: "+msg);
        })
        .on("error", function (reason) {
            console.log("Got an error: "+reason);
        });

net.createServer(function (socket) {
    console.log("Talking to: " + socket.remoteAddress +":"+ socket.remotePort);
    socket.on("data", function (chunk) { receiver.accumulate(chunk); });
})
.listen(port, host);
```

<a name="rcvPrms"></a>.
### Receive a message - using a promise (in progress)
If the sender sends multiple messages (like in the "Sending a message - using the object" example above", only the first message is passed on to the success callback. Any other messages will be lost.

```javascript
"use strict";

var net = require("net");
var Packetizer = require("packetize-string");

var host = "127.0.0.1";
var port = 6116;

net.createServer(function (socket) {
    Packetizer.receive(socket)
        .then(
            function ( msg ) {
                console.log("Heard: "+msg);
            },
            function ( reason ) {
                console.log("Got an error: "+reason);
            }
        );
})
.listen(port, host);
```

## Modes (WIP)
<br>The default mode:
- The next 11 bits are the number of characters in the packet.
- If the length is 2047 (0x7F) then there is more of the message in the next packet.
- - If the message is exactly 2046 characters (+1 for header) then an empty packet is sent to end the message.

Some ideas for future modes:
- conditionally strip the 0x00 from the front of characters if all characters are utf-8
- Add MD5 as the tail to the packet


