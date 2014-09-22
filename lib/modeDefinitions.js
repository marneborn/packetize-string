"use strict";

var DefinitionsLookup = {};
var ID2Name           = {};

// FIXME - constants...
var DEFAULT_MODE    = "_default_";
var DEFAULT_ID      = 0;
var ID_MSB          = 15;
var ID_LSB          = 11;
var ID_MASK         = parseInt("F800", 16);
var EXTRA_MASK      = parseInt("07FF", 16);

//---------------------------------------------------------------------------
/**
 */
module.exports.register = registerMode;
function registerMode ( name, id, encodeFn, decodeFn ) {

    if ( DefinitionsLookup[name] )
        throw new Error("Can't register: name already exists: "+name);

    if ( ID2Name[id] )
        throw new Error("Can't register: ID already exists: "+id);

    ID2Name[id] = name;

    DefinitionsLookup[name] = {
        name      : name,
        id        : id,
        encode    : encodeFn,
        decode    : decodeFn,
    };

};

//---------------------------------------------------------------------------
/**
 */
module.exports.encode = function ( info, string ) {

    var mode = (info.mode != null) ? info.mode : DEFAULT_MODE;

    if ( !DefinitionsLookup[mode] ) {
        throw new Error("Can't encode, no such mode: "+mode);
    }

    return DefinitionsLookup[mode].encode(string);
};

//---------------------------------------------------------------------------
/**
 */
module.exports.decode = function ( info, buffer ) {

    // If the header hasn't gotten an ID yet.
    if ( info.mode === null ) {

        // If there is no header, yet, look at the first character in the packet
        // and extract the ID and the value.
        if ( buffer.string.length < 1 )
            return null;

        var header = buffer.string.charCodeAt(0);
        var id     = header >>> ID_MSB;

        if ( !ID2Name[id] )
            throw new Error("Can't decode, no mode with this ID: "+id);

        info.extra = header & EXTRA_MASK;
        info.mode  = ID2Name[id];
    }

    if ( !DefinitionsLookup[info.mode] )
        throw new Error("Can't decode, no such mode: "+info.mode);

    return DefinitionsLookup[info.mode].decode(info, buffer);
};

//===========================================================================
// Create and register the default encoding/decoding

//---------------------------------------------------------------------------
/**
 * @const
 */
// Want the total length to be 2047, but need one for the header...
var MAX_CHARS    = Math.pow(2, ID_LSB) - 2;
registerMode(DEFAULT_MODE, DEFAULT_ID, defaultEncode, defaultDecode);

//---------------------------------------------------------------------------
/**
 * Take the string and make the header, payload, and tailer.
 * For now there is only one encoding ('none') which simply makes
 * the header be the encoded length, then the payload and an empty trailer
 * @returns {Object} encoded
 * @returns {String} encoded.packet The encoded packet (header+payload+tailer)
 * @returns {String} encoded.rest   The remaining part of the string.
 *       This returns "" if the packet.payload is exactly the size MAX size
 *       which will cause an extra packet to go out. This is intentional
 * @throws Will throw an error if an unsupported encoding is requested.
 * @throws Will throw an error if a header can't be extracted from the string.
 */
function defaultEncode ( string ) {

    if ( string == null )
        return null;

    var packets = [];

    while ( string != null ) {
        var payload, rest;

        if ( string.length >= MAX_CHARS ) {
            payload = string.substr(0, MAX_CHARS);
            string  = string.substr(MAX_CHARS);
        }

        else {
            payload = string;
            string  = null;
        }

        var packet = String.fromCharCode( (DEFAULT_ID << ID_MSB) + payload.length + 1 ) + payload;
        packets.push(packet);
    }
    return packets;
}

//---------------------------------------------------------------------------
/**
 * @returns {Object} info
 * @returns {String} info.message The decoded message
 * @returns {String} info.rest The stuff in the buffer
 */
function defaultDecode ( info, buffer ) { 

    var length  = info.extra;

    if ( buffer.string.length < length )
        return null;
    
    if ( length === MAX_CHARS + 1 )
        info.partialMessage = true;

    var msg = buffer.string.substr(1, length-1);
    buffer.string = buffer.string.substr(length);
    return msg;
}

