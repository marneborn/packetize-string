"use strict";

let DefinitionsByName = {};
let DefinitionsByID   = {};

//---------------------------------------------------------------------------
/**
 */
module.exports.register = function ( name, id, encodeFn, decodeFn, isPartailFn ) {

    if ( DefinitionsByName[name] )
        throw new Error("Can't register: name already exists: "+name);

    if ( DefinitionsByID[id] )
        throw new Error("Can't register: ID already exists: "+id);

    this._encode    = encodeFn;
    this._decode    = decodeFn;
    this._isPartial = isPartialFn;

    DefinitionsByName[name] = DefinitionsByID[id] = {
        name        : name,
        id          : id,
        encodeFn    : encodeFn,
        decodeFn    : decodeFn,
        isPartialFn : isPartialFn
    };

};

//---------------------------------------------------------------------------
/**
 */
module.exports.encode = function ( mode, string ) {

    if ( !DefinitionsByName[mode] )
        throw new Error("Can't encode, no such mode: "+mode);

    return Definitions[mode].encode(string);
};

//---------------------------------------------------------------------------
/**
 */
module.exports.decode = function ( header, packet ) {

    let id = header.getModeId();
    if ( !DefinitionsByID[id] )
        throw new Error("Can't decode, no such mode id: "+id);

    return DefinitionsByID[id].decode(string);
};

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
let LENGTH_MASK  = MAX_CHARS - 1; // 1024

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

    let payload, rest;

    if ( string.length >= MAX_CHARS ) {
        payload = string.substr(0, MAX_CHARS);
        rest    = string.substr(MAX_CHARS);
    }
    else {
        payload = string;
        rest    = null;
    }

    let header = new Header( config );
    header.parse(payload);

    if ( !header.isValid() )
        throw new Error("Couldn't create a header from: "+string);

    return {
        packet : header.encode() + payload + '';
        rest   : rest
    };
}

//---------------------------------------------------------------------------
/**
 * Take the header, and the 
 * @param {Header} [header] The decoded header, if not given then the header will be decoded from the string.
 * @param {string} packet The encoded packet
 * @returns {String}
 */
function decodePacket ( header, packet ) { 
    if ( typeof(header) === 'string' ) {
        packet = header;
        header.decode(packet);
    }

    return packet.substr(header.headerLength, header.payloadLength);
}

//---------------------------------------------------------------------------
function isPartialMessage ( header ) {
    return header.totalLength === MAX_CHARS;
}
