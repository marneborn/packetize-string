packetize-string
================

Utility for converting arbitrary strings (aka messages) into packets which can be shipped using, eg nodes net functionality then reassembling the packets into messages

## Installation
```bash
npm install --save packetize-string
```

## Usage
Messages can be packetizes with either the [packetize-string.send(<String>)](#sendFn) function or by using the [Sender object](#sendOO).<br>
Messages can be extracted with either the [listener on the Receiver object](rcvLsnr) or the [promise returned by packetize-string.receive(socket)].

### Sending a message - using the send function (recommended)
<a name="sendFn"></a>
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

### Sending a message - using the object
<a name="sendOO"></a>.
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

### Receive a message - using a listener (recommended)
<a name="rcvLsnr"></a>.
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

### Receive a message - using a promise (in progress)
<a name="rcvPrms"></a>.
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



