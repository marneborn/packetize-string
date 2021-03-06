'use strict';

var extend = require('node.extend'),
    Q      = require('q'),
    modes  = require('./modeDefinitions'),
    util   = require('util'),
    EventEmitter = require('events').EventEmitter;

/**
 * @fileOverview
 * @author <a href="mailto:mikael@arneborn.net">Mikael Arneborn</a>
 * @version 0.0.0
 */

module.exports = {
    Sender       : Sender,
    Receiver     : Receiver,
    registerMode : modes.register,
    send         : makeAndSend,
    receive      : receivePromise,
};

//===========================================================================
//---------------------------------------------------------------------------
/** 
 * Takes a string, splits it into packets, adds the header, and adds the tailer
 * @name Packetizer.Sender
 * @constructor
 * @param {String|undefined} Take this string and packetize it.
 */
function Sender ( string, config ) {

    if ( config === undefined && typeof(string) !== 'string' ) {
        config = string;
        string = undefined;
    }

    this._packets = [];
    this._info    = {};
    this._config  = extend({}, config);
    this.clearInfo();

    if ( string !== undefined )
        this.packetize(string);
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

    var packets = modes.encode(this._config, string);

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
 * @return {String}
 */
Sender.prototype.packets = function () {
    var str = this.toString();
    this._packets = [];
    return str;
};

//---------------------------------------------------------------------------
/**
 * There is at least one packet that can be sent out.
 * @return {String}
 */
Sender.prototype.toString = function () {
    var str = this._packets.join('');
    return str;
};

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
    this.ID = 0;

    this._config    = extend({}, config);
    this._packet    = ''; // accumulate partial packet here
    this._message   = ''; // accumulate partial message here
    this._clearInfo();
}

//---------------------------------------------------------------------------
// extend the Receiver to be an EventEmitter.
util.inherits(Receiver, EventEmitter);

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
 * More than one message can arrive in the same chunk.
 * Need to split them up into individual messages and space out the
 * 'message' emits.
 */
Receiver.prototype._emitMsg = function () {
    if ( this == undefined )
        return;

    if ( this._messages.length === 0 )
        return;

    /**
     * @event Receiver#message
     * @type {String} messagePart The part of the message tbat was just decoded
     */
    this.emit('message', this._messages.shift());
    var self = this;
    if ( this._messages.length > 0 ) {
        self.ID = 2;
        process.nextTick( self._emitMsg );
       //process.nextTick( function () { self._emitMsg() });
    }
}


//---------------------------------------------------------------------------
/**
 * Accumulate chunks of encoded packets
 * @memberOf Receiver
 * @param  {String} Chunk of an encoded packet.
 * @fires Receiver#chunk
 * @fires Receiver#partial
 * @fires Receiver#message
 */
Receiver.prototype.accumulate = function ( chunk ) {

    this._packet += chunk;
    /**
     * @event Receiver#chunk
     * @type {String} chunk The chunk that was received.
     */
    this.emit('chunk', chunk);

    while ( true ) {

        if ( this._packet === '' )
            break;

        // default is that this is a complete message.
        // the decode function needs to set this to be true to stich a complete
        // message together.
        this._packetInfo.partialMessage = false;

        var was = this._packet.length;

        // need to pass the packet buffer in inside an object so that the
        // decoded packet can be removed.
        var obj = { string : this._packet };
        var message = modes.decode(this._packetInfo, obj);
        this._packet = obj.string;

        if ( message === null )
            break;

        if ( this._packet.length === was )
            throw new Error("The decode function created a message, but didn't remove anything from the packet buffer");

        // decode the packet and accumulate partial messages into the full message.
        this._message += message;

        // this is only part of the full message if the length is the limit.
        if ( !this._packetInfo.partialMessage ) {
            this.emit('message', this._message);
            this._message = '';
        }
        else {
            /**
             * @event Receiver#partial
             * @type {String} messagePart The part of the message tbat was just decoded
             */
            this.emit('partial', message);
        }

        // and decode the next header (if enough is available).
        this._clearInfo();
    }

    return;
};

//---------------------------------------------------------------------------
/**
 */
Receiver.prototype.leftOvers = function () {
    if ( this._message === '' && this._packet === '' )
        return null;
    return [this._message, this._packet];
};

/////////////////////////////////////////////////////////////////////////////
// Sugar functions

//---------------------------------------------------------------------------
/**
 */
function makeAndSend ( string, config ) {
    var obj = new Sender(string,config);
    return obj.toString();
}

//---------------------------------------------------------------------------0
/**
 */
function receivePromise ( socket ) {
    var defer = Q.defer();
    var rcv   = new Receiver();

    socket
        .on('data', function ( chunk ) {
            rcv.accumulate(chunk);
        } )
        .on('error', function ( err ) {
            rcv.emit('error', err);
        });

    var errFn  = function ( err ) {
        defer.reject(err);
    };

    var dataFn =  function ( msg ) {
        var leftOvers = rcv.leftOvers();
        defer.resolve(msg);
    };

    rcv
        .on('error', errFn)
        .on('message', dataFn);

    function removePromises ( ) {
        rcv.removeListener('error', errFn);
        rcv.removeListener('data',  dataFn);
    };
    return defer.promise.then(
        function ( val ) {
            removePromises();
            return Q.resolve(val);
        },
        function ( reason ) {
            removePromises();
            return Q.reject(reason);
        }
    );
}
