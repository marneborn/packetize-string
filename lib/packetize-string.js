'use strict';

/**
 * @fileOverview
 * @author <a href="mailto:mikael@arneborn.net">Mikael Arneborn</a>
 * @version 0.0.0
 */

module.exports = Packetizer;

//---------------------------------------------------------------------------
/**
 * @const
 * node.js's net talks with strings, each character is 16 bits.
 * use the first character to encode the header.
 *     9: 0 - the number of characters to expect after the header. (max = 2^10 = 1024 characters)
 *    15:10 - reserved for future enhancements, eg show the encoding.
 */
let LENGTH_LSB   = 0;
let LENGTH_MSB   = 9;
let MAX_CHARS    = Math.pow(2, LENGTH_MSB - LENGTH_LSB + 1);
let LENGTH_MASK  = MAX_CHARS - 1;

//---------------------------------------------------------------------------
/** 
 * Converts a string to a packetized version ready to be sent over TCP
 * @namespace
 * @constructor
 */
function Packetizer ( thing ) {
    this._header  = null;
    this._stream  = '';
}

/**
 * There is at least one complete packet as long as:<br>
 *   The full header could be created<br>
 *   The entire payload has been added.<br>
 *   The entire tail has been added.<br>
 * @memberOf Packetizer
 * @return {Boolean}
 */
Buffer.prototype.hasPacket = function () {

    if ( !this._header || this._header.payloadLength == null )
        return false;

    if ( this._stream.length < this._header.totalLength )
        return false;

    return true;
}

//---------------------------------------------------------------------------
/**
 * Read the next complete payload out of the stream.
 * @memberOf Packetizer
 * @return {null} There is no complete packet to read.
 * @return {String} The decoded payload
 */
Buffer.prototype.read = function () {

    if ( ! this.hasPacket() ) return null;

    // the header has already been decoded, so don't need to extract it.

    // the payload starts after the header and is payloadLength characters long
    let payload  = this._stream.substr(this._header.headerLength, this._header.payloadLength );

    // the tailer comes after the payload
    let tailStr  = this._stream.substr(this._header.headerLength + this._header.payloadLength, this._header.tailerLength );

    // remove this packet from the stream
    this._stream = this._stream.substr(this._header.totalLength);

    // reset the header and then use accumulate to see if there is another message behind this one.
    this._header = null;
    this.accumulate("");

    return mungeMsg(this._header, payload, tailStr);
}

//---------------------------------------------------------------------------
/**
 * No transformations have been defined yet, so just return the payload.
 * @private
 */
function mungeMsg ( headObj, payload, tailStr ) {
    return payload;
}

//===========================================================================
// Stuff for the Header class.
// Putting inline to make it easier to share constants.

//---------------------------------------------------------------------------
/**
 * The header of a packet. This constructor is not accessible outside of the Packtes Class.
 * @namespace
 * @protected
 * @constructor
 * @param {} Create an empty header
 * @param {String} Create the header from the string
 * @param {Packetizer} Create the header from the string
 * @property {Integer|null} headerLength The number of characters in the header.
 * @property {Integer|null} payloadLength The number of characters in the payload.
 * @property {Integer|null} tailerLength The number of characters in the tail.
 */
function Header ( ) {
    this.headerLength  = null;
    this.payloadLength = null;
    this.tailerLength  = null;
}

//---------------------------------------------------------------------------
/**
 * Read the next complete payload out of the stream.
 * @memberOf Header
 * @param {String} The string to use to create the header.
 * @returns {Boolean} If the string could be parsed
 */
Header.prototype.parse = function ( string ) {

    if ( typeof(string) !== "string" )
        return false;

    this.tailerLength  = 0;
    this.headerLength  = 1;
    this.messageLength = string.length;
    this.payloadLength = this.tailerLength + this.headerLength + this.payloadLength;

    return true;
};

//---------------------------------------------------------------------------
/**
 * Take a packetized string and decode the header info
 * @memberOf Header
 * @param {String} The stream string
 * @returns {Boolean} If the stream could be decoded
 */
Header.prototype.decode = function ( string ) {

    if ( string.length < 1 )
        return false;

    let number = string.charCodeAt(0);

    this.tailerLength  = 0;
    this.headerLength  = 1;
    this.messageLength = number & LENGTH_MASK;
    this.payloadLength = this.tailerLength + this.headerLength + this.payloadLength;

    return true;
};

//---------------------------------------------------------------------------
/**
 * Encode this header to ship with the packet
 * @memberOf Header
 * @returns {String} The encoded header, empty string if the header is undefined.
 */
Header.prototype.encode = function () {
    return (this.payloadLength === null)
        ? ''
        : String.fromCharCode(this.payloadLength);
};

//---------------------------------------------------------------------------
Header.prototype.toString = function ( indent ) {
    indent = indent || ""
    return indent+"---- Conversation.Header ----"
        +"\n"+indent+"headerLength : "+this.headerLength
        +"\n"+indent+"payloadLength: "+this.payloadLength;
        +"\n"+indent+"tailerLength : "+this.tailerLength
}
