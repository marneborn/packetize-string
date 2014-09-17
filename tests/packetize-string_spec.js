'use strict';

let Packetizer = require('../index.js');

describe("Testing the packetize-string Class", function () {

    it ('should be able to add and read a string', function () {

        let packetizer = new Packetizer();
        expect(packetizer.hasPacket()).toBeFalsy();

        /*
         let message = "Hello World";
        buffer.write(message);
        expect(buffer.header().headerLength).toBe(1);
        expect(buffer.header().messageLength).toBe(11);
        expect(buffer.hasMessage()).toBeTruthy();

        let extracted = buffer.read();
        expect(extracted).toEqual(message);
        expect(buffer.hasMessage()).toBeFalsy();
*/
    });

    xit ( 'should be only get the first message even if two are added', function () {

        let buffer  = new Buffer();
        expect(buffer.hasMessage()).toBeFalsy();

        let message1 = "Hello World";
        buffer.write(message1);
        expect(buffer.header().headerLength).toBe(1);
        expect(buffer.header().messageLength).toBe(11);
        expect(buffer.hasMessage()).toBeTruthy();

        let message2 = "How are you?";
        buffer.write(message2);
        
        // Should still be the first message here
        expect(buffer.header().headerLength).toBe(1);
        expect(buffer.header().messageLength).toBe(11);
        expect(buffer.hasMessage()).toBeTruthy();

        let extracted1 = buffer.read()
        expect(extracted1).toEqual(message1);
        expect(buffer.hasMessage()).toBeTruthy();

        // Should now reflect the second.
        expect(buffer.header().headerLength).toBe(1);
        expect(buffer.header().messageLength).toBe(12);
        expect(buffer.hasMessage()).toBeTruthy();

        let extracted2 = buffer.read();
        expect(extracted2).toEqual(message2);
        expect(buffer.hasMessage()).toBeFalsy();
    });

    xit ( 'should be possible to manually add a message to the buffer in chunks and extract it', function () {
        return;
        let buffer  = new Buffer();
        expect(buffer.hasMessage()).toBeFalsy();

        let message = "Hello World";
        buffer.write(message1);
        expect(buffer.header().headerLength).toBe(1);
        expect(buffer.header().messageLength).toBe(11);
        expect(buffer.hasMessage()).toBeTruthy();

        let extracted = buffer.read();
        expect(extracted).toEqual(message);
    });

});
