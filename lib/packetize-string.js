'use strict';

let extend = require('node.extend');
let modes  = require('./modeDefinitions');
let util   = require('util');

/**
 * @fileOverview
 * @author <a href="mailto:mikael@arneborn.net">Mikael Arneborn</a>
 * @version 0.0.0
 */

module.exports = {
    Sender       : Sender,
    Receiver     : Receiver,
    registerMode : modes.register,
};

//===========================================================================
//---------------------------------------------------------------------------
/** 
 * Takes a string, splits it into packets, adds the header, and adds the tailer
 * @name Packetizer.Sender
 * @constructor
 * @param {String|undefined} Take this string and packetize it.
 */
function Sender ( config ) {
    this._packets = [];
    this._info    = {};
    this._config  = extend({}, config);
    this.clearInfo();
}

//---------------------------------------------------------------------------
/**
 */
Sender.prototype.clearInfo = function () {
    this._packetInfo = extend({}, this._config, { mode: null, extra : null });
};

//---------------------------------------------------------------------------
/**
 * Take a string, packetize it, and add to the list of packets
 * @memberOf Packetizer
 * @param  {String} The string to packetize
 * @return {Integer} The number of packets
 */
Sender.prototype.packetize = function ( string ) {

    let packets = modes.encode(this._config, string);

    if ( util.isArray(packets) ) {
        for ( var i=0; i<packets.length; i++ )
            this._packets.push(packets[i]);
        return packets.length;
    }

    this._packets.push(packets);
    return 1;
};

//---------------------------------------------------------------------------
/**
 * There is at least one packet that can be sent out.
 * @return {Boolean}
 */
Sender.prototype.hasPacket = function () {
    return this._packets.length > 0;
};

//---------------------------------------------------------------------------
/**
 * Get the number of packets stored for shipping.
 * @return {Integer}
 */
Sender.prototype.numPackets = function () {
    return this._packets.length;
};

//---------------------------------------------------------------------------
/**
 * There is at least one packet that can be sent out.
 * @return {Boolean}
 */
Sender.prototype.next = function () {
    if ( !this.hasPacket )
        return null;
    return this._packets.shift();
}

//---------------------------------------------------------------------------
/**
 * There is at least one packet that can be sent out.
 * @return {Boolean}
 */
Sender.prototype.all = function () {
    let str = this._packets.join('');
    this._packets = [];
    return str;
}

////////////////////////////////////////////////////////////
//===========================================================================
//---------------------------------------------------------------------------
/** 
 * Accumulates chunks until a whole packet has arrived.
 * Converts the packet to a partial message
 * If the length of this partial message is < the limit, then the message is complete
 * If the length of this partial message is the limit, then accumulate until the whole
 * message has arrived.
 * @name Packetizer.Sender
 * @constructor
 */
function Receiver ( config ) {

    this._config    = extend({}, config);
    this._packet    = ''; // accumulate partial packet here
    this._message   = ''; // accumulate partial message here
    this._messages  = [];
    this._clearInfo();
}

//---------------------------------------------------------------------------
/**
 */
Receiver.prototype._clearInfo = function () {
    this._packetInfo = extend({},
                              this._config,
                              { mode: null, extra : null, partialMessage : false }
                             );
};

//---------------------------------------------------------------------------
/**
 * There is at least one packet that can be sent out.
 * @return {Boolean}
 */
Receiver.prototype.hasMessage = function () {
    return this._messages.length > 0;
};

//---------------------------------------------------------------------------
/**
 * Get the number of packets stored for shipping.
 * @return {Integer}
 */
Receiver.prototype.numMessages = function () {
    return this._messages.length;
};

//---------------------------------------------------------------------------
/**
 * Accumulate chunks of encoded packets
 * @memberOf Receiver
 * @param  {String} Chunk of an encoded packet.
 */
Receiver.prototype.accumulate = function ( chunk ) {

    this._packet += chunk;

    while ( true ) {

        if ( this._packet === '' )
            break;

        let decoded = modes.decode(this._packetInfo, this._packet);

        if ( decoded === null )
            break;

        // decode the packet and accumulate partial messages into the full message.
        this._message += decoded.message;

        // this is only part of the full message if the length is the limit.
        if ( !this._packetInfo.partialMessage ) {
            this._messages.push(this._message);
            this._message = '';
        }

        // remove the packet from the packet accumulator, clear the header
        // and decode the next header (if enough is available).
        this._packet = decoded.rest || "";
        this._clearInfo();
    }

    return;
};

//---------------------------------------------------------------------------
/**
 * Get the next complete payload out of the stream.
 * @memberOf Receiver
 * @return {null} There is no complete packet to read.
 * @return {String} The decoded payload
 */
Receiver.prototype.next = function () {
    
    if ( !this.hasMessage() )
        return null;

    return this._messages.shift();
};



