'use strict';


var Packetizer = require('../index.js'),
    EventEmitter = require('events').EventEmitter;

describe("Testing the packetize-string classes", function () {

    var packetSize = 2047;
    var headerSize =    1;

    describe("Making sure that the Sender class works", function () {

        var sender;

        beforeEach(function () {
            sender = new Packetizer.Sender();
        });

        it ('should be empty on creation', function () {
            expect(sender.hasPacket()).toBeFalsy();
            expect(sender.numPackets()).toBe(0);
        });

        it ('should be able to use Sender to create a packet', function () {
                       
            var inMsg = "Hello World";
            sender.packetize(inMsg);
            expect(sender.hasPacket()).toBeTruthy();
            expect(sender.numPackets()).toBe(1);
            
            var packet = String.fromCharCode(inMsg.length + headerSize)+inMsg;
            var outMsg = sender.next();
            expect(outMsg).toEqual(packet);
            expect(sender.hasPacket()).toBeFalsy();
            expect(sender.numPackets()).toBe(0);
        });
        
        it ( 'should be able to break a long string into multiple packet', function () {
            
            var strSize    = 10000;
            var numPackets = Math.ceil(strSize/(packetSize-headerSize));
            var lastSize   = strSize - (numPackets-1) * (packetSize);
            
            // create a string that is 10,000 x's
            var inMsg      = Array(strSize+1).join('x');
            
            var packet1    = String.fromCharCode(packetSize)+Array(packetSize).join('x');
            var packetLast = String.fromCharCode(lastSize+1)+Array(lastSize).join('x');
            var packetRest = Array(numPackets-1).join(packet1)+packetLast; // string after 'getting' first packet.

            sender.packetize(inMsg);
            expect(sender.hasPacket()).toBeTruthy();
            expect(sender.numPackets()).toBe(numPackets);

            var outMsg = sender.next();
            expect(outMsg.length).toBe(packetSize);
            expect(outMsg.charCodeAt(0)).toEqual(packetSize);
            expect(sender.hasPacket()).toBeTruthy();
            expect(sender.numPackets()).toBe(numPackets-1);
            
            var restMsg  = sender.packets();
            var restSize = strSize - (packetSize-headerSize) + (numPackets-1)*headerSize;
            expect(restMsg.length).toBe(restSize);
            expect(restMsg.charCodeAt( 2047*0 )).toEqual( packetSize );
            expect(restMsg.charCodeAt( 2047*1 )).toEqual( packetSize );
            expect(restMsg.charCodeAt( 2047*2 )).toEqual( packetSize );
            expect(restMsg.charCodeAt( 2047*3 )).toEqual( strSize - (packetSize-headerSize)*(numPackets-1) + 1 );

            expect(sender.hasPacket()).toBeFalsy();
            expect(sender.numPackets()).toBe(0);
        });

        it ( 'should send a second packet with zero lengthed payload if the message is 1 less than the limit', function () {
            
            var inMsg  = Array(packetSize-1+1).join('x');

            sender.packetize(inMsg);
            expect(sender.hasPacket()).toBeTruthy();
            expect(sender.numPackets()).toBe(2);
            
            var outMsg1 = sender.next();
            expect(outMsg1.length).toEqual(packetSize);
            expect(sender.hasPacket()).toBeTruthy();
            expect(sender.numPackets()).toBe(1);
            
            var outMsg2 = sender.next();
            expect(outMsg2.length).toEqual(1);

            expect(sender.hasPacket()).toBeFalsy();
            expect(sender.numPackets()).toBe(0);
        });

        it ( 'should only send 1 packet if the message is 2 smaller than the limit', function () {
            
            var inMsg  = Array(packetSize-2+1).join('x');
            
            sender.packetize(inMsg);
            expect(sender.hasPacket()).toBeTruthy();
            expect(sender.numPackets()).toBe(1);
            
            var outMsg = sender.next();
            expect(outMsg.length).toEqual(packetSize-2+headerSize);

            expect(sender.hasPacket()).toBeFalsy();
            expect(sender.numPackets()).toBe(0);
        });

    });

    describe("Making sure that the Reader class works", function () {

        var receiver, messageSpy, chunkSpy, partialSpy;

        beforeEach(function () {
            messageSpy  = jasmine.createSpy('messageSpy');
            chunkSpy    = jasmine.createSpy('chunkSpy');
            partialSpy  = jasmine.createSpy('partialSpy');
            receiver    = new Packetizer.Receiver ()
                .on('chunk'  , chunkSpy)
                .on('partial', partialSpy)
                .on('message', messageSpy);
        });

        it ('should be able to use Reader to receive a packet and conver it to a message', function () {

            var inMsg       = "Hello World";
            var packet      = String.fromCharCode(inMsg.length+headerSize)+inMsg;
            receiver.accumulate(packet);

            // should see a chunk coming in
            expect(chunkSpy).toHaveBeenCalledWith(packet);
            // but not a partial.
            expect(partialSpy).not.toHaveBeenCalled();
            // go directly to a full message
            expect(messageSpy).toHaveBeenCalledWith(inMsg);
        });
        
        it ('should be space out emits if there is more than one message in a chunk', function () {

            var inMsgs      = [
                "Hello World",
                "How are you?"
            ];

            var expectMsgs   = [];
            var toSend      = '';
            for (var i=0; i<inMsgs.length; i++) {
                toSend += String.fromCharCode(inMsgs[i].length+headerSize)+inMsgs[i];
                expectMsgs.push([inMsgs[i]]);
            }

            receiver.accumulate(toSend);

            // should see 1 chunk coming in with both messages
            expect(chunkSpy.calls.count()).toEqual(1);
            expect(chunkSpy.calls.allArgs()).toEqual([[toSend]]);

            // but not a partial.
            expect(partialSpy).not.toHaveBeenCalled();

            // go directly to a full message
            expect(messageSpy.calls.allArgs()).toEqual(expectMsgs);

        });
        
    });

    describe("Making sure that the Senders and Receivers work together.", function () {

        var sender, receiver, messageSpy, chunkSpy, partialSpy;

        beforeEach(function () {
            sender      = new Packetizer.Sender();
            messageSpy  = jasmine.createSpy('messageSpy');
            chunkSpy    = jasmine.createSpy('chunkSpy');
            partialSpy  = jasmine.createSpy('partialSpy');
            receiver    = new Packetizer.Receiver ()
                .on('chunk'  , chunkSpy)
                .on('partial', partialSpy)
                .on('message', messageSpy);
        });

        it ("should be able to packetize a message with a Sender and use a Receiver to extract the message", function () {

            var inMsg = "Bacon ipsum dolor sit amet leberkas jerky pig sirloin andouille. Prosciutto salami ham hock ground round, ribeye pork chop strip steak fatback filet mignon ham beef ribs t-bone shank. Ball tip venison kielbasa pork chop tail turkey, salami swine chicken. Fatback spare ribs salami jowl landjaeger biltong shankle chuck chicken turducken. Kevin short ribs andouille tenderloin filet mignon. Jowl meatball chicken tenderloin pork biltong hamburger flank meatloaf pork chop porchetta chuck. Beef ribs capicola leberkas ham hock, pig corned beef brisket sirloin rump.Tongue leberkas pancetta tenderloin short ribs. Jerky ham hock spare ribs ball tip strip steak bacon chicken salami pork meatloaf. Tri-tip doner cow fatback drumstick, meatloaf t-bone shank pork. Hamburger tenderloin t-bone, bacon beef ham hock pork belly short loin turducken. Boudin pork belly ground round pork loin t-bone. Venison ball tip jowl tongue brisket short ribs turkey ham porchetta.Cow filet mignon strip steak bacon short loin, kielbasa pig tri-tip capicola venison tenderloin. Boudin meatball chuck kielbasa corned beef cow sausage. Biltong boudin tenderloin hamburger, kielbasa shank ham bresaola ham hock beef ribs chuck flank. Andouille tenderloin short ribs, bresaola beef ribs turkey chuck spare ribs short loin swine boudin porchetta sausage ball tip. Capicola sausage flank pastrami rump doner ribeye beef ribs pork loin meatloaf strip steak salami ball tip. Andouille pork belly shoulder boudin meatloaf pastrami doner flank.Filet mignon short ribs spare ribs bresaola, t-bone corned beef drumstick pig rump pork cow tenderloin bacon. Leberkas jerky short ribs sausage doner frankfurter. Bacon shank hamburger flank bresaola t-bone shoulder shankle fatback short ribs kielbasa tongue brisket. Tenderloin ground round meatball pancetta swine bacon doner porchetta landjaeger tail turkey prosciutto. Biltong flank frankfurter, brisket t-bone pork loin kielbasa. Brisket ham pork pastrami. Ham hock chuck prosciutto doner meatball pork sirloin.Ground round venison leberkas corned beef, andouille brisket pancetta. Venison turkey hamburger ball tip brisket salami flank, filet mignon ground round leberkas shankle rump tri-tip. Pancetta jowl meatloaf tenderloin flank. Ham swine beef, ribeye turkey ham hock boudin porchetta bresaola turducken jowl sirloin tongue leberkas capicola. Sirloin pastrami pig prosciutto short ribs doner porchetta leberkas pork loin.Pork fatback corned beef pastrami t-bone. Drumstick tenderloin ribeye, capicola pancetta hamburger meatloaf fatback bresaola sausage spare ribs ground round prosciutto shoulder short ribs. Jerky tenderloin jowl frankfurter, turducken short ribs drumstick corned beef tri-tip. Chuck ham drumstick, ham hock boudin doner swine chicken turducken. Shoulder ball tip pork loin, tenderloin kielbasa ground round ham hock salami bresaola cow tail pork belly tri-tip beef ribs. Capicola shoulder kielbasa ham hock ball tip, drumstick beef ribs pastrami pig.Capicola short loin swine shank spare ribs jowl meatloaf. Rump cow fatback strip steak ham hock beef ribs filet mignon biltong ball tip capicola tenderloin. Cow porchetta tenderloin frankfurter meatloaf ground round beef, spare ribs short loin tail ham hock hamburger. Boudin capicola short loin sirloin swine venison pig prosciutto.Strip steak pork loin meatloaf pork belly turducken, rump fatback pancetta ground round tongue filet mignon. Filet mignon beef ribs tongue tail. Flank pork hamburger capicola jowl bacon salami kielbasa porchetta chuck. Kielbasa jowl sausage, t-bone rump corned beef porchetta leberkas tongue brisket jerky sirloin cow kevin. Pig sirloin jerky hamburger strip steak, capicola corned beef bresaola. Turkey fatback pig drumstick corned beef pork loin, chicken doner spare ribs kevin sausage rump prosciutto sirloin pork.Salami frankfurter ribeye t-bone kielbasa. Doner chuck beef ribs, ball tip t-bone hamburger turducken ham jowl filet mignon shank turkey tongue. Corned beef kevin strip steak pastrami tongue short ribs tail. Ribeye turducken kielbasa shank ground round.Venison frankfurter rump spare ribs pork loin pork t-bone pork chop pork belly cow tenderloin capicola flank jowl. Venison tri-tip t-bone swine pork. Porchetta short loin kevin corned beef filet mignon pork belly salami ground round meatball landjaeger ham hock frankfurter. Pancetta salami kielbasa, jowl beef ribs pork chop jerky porchetta filet mignon cow ball tip venison pastrami. Short ribs bresaola corned beef, hamburger tenderloin drumstick flank chuck. Capicola sausage meatloaf corned beef hamburger andouille leberkas ball tip pork belly swine ham hock.Kielbasa rump turducken tri-tip ham jowl bresaola landjaeger meatball. Frankfurter biltong sausage spare ribs. Hamburger turkey swine t-bone tri-tip pork belly jowl tail. Brisket pork chop cow short loin ham spare ribs. Ham bresaola beef porchetta pancetta. Turkey pork loin boudin hamburger strip steak, landjaeger tenderloin short ribs pork chop. Kielbasa tri-tip drumstick swine rump sausage chicken hamburger ham salami bacon biltong.Sirloin corned beef filet mignon ball tip chuck kielbasa pancetta venison chicken tail frankfurter short loin biltong t-bone. Salami short ribs pancetta chicken jowl shankle kielbasa swine hamburger shoulder spare ribs. Sirloin ham ball tip, corned beef turkey biltong jowl bacon tail shankle t-bone strip steak. Andouille cow pork loin boudin sirloin strip steak porchetta ham beef ribeye pig turducken. Strip steak leberkas jowl tail brisket pork belly doner, ribeye flank.Turkey pancetta shank turducken andouille tri-tip. Ham hock short loin flank pig strip steak. Pig tenderloin pork, beef pancetta kevin drumstick hamburger ground round. Bresaola corned beef jowl, ball tip chicken pancetta hamburger beef rump pork belly.Rump short loin brisket shank, pig tri-tip pork. Beef ribs venison short ribs chuck jowl sirloin hamburger boudin rump pig strip steak pancetta. Chicken landjaeger pork porchetta corned beef fatback beef brisket cow. Porchetta jerky turducken, bacon brisket t-bone hamburger strip steak short loin kevin chicken jowl. Shank chuck leberkas biltong doner shankle ham hock corned beef meatball pig meatloaf pork chop.Turducken shank leberkas tail chuck, sausage beef ribs. Shankle andouille salami, beef ribs rump sausage swine meatloaf kielbasa fatback brisket sirloin strip steak tri-tip prosciutto. Ham bresaola salami t-bone turkey hamburger, shank turducken short loin beef meatloaf. Hamburger tri-tip kevin meatball. Kielbasa salami bacon, porchetta sirloin ribeye beef ribs. Meatball drumstick strip steak pork belly. Short ribs andouille cow tongue venison pork loin salami ball tip swine meatloaf ham sirloin jerky.Pork loin fatback leberkas frankfurter kielbasa. Pancetta prosciutto sausage capicola, jerky shoulder turducken pork loin pork chop sirloin. Pastrami kevin ribeye, tri-tip biltong tenderloin drumstick ham hock. Pastrami pancetta sirloin ball tip, venison meatball jerky pork ham hock capicola prosciutto. Pig meatloaf flank turducken landjaeger t-bone strip steak leberkas doner. Filet mignon boudin capicola beef short ribs. Pork loin turducken salami sausage shankle fatback tenderloin ball tip swine tail beef ribs jowl doner shank.Bacon venison sirloin swine. Turducken brisket drumstick pancetta boudin pastrami. Tri-tip capicola beef ribs frankfurter turkey bresaola. Ball tip turducken ham hock bresaola. Pancetta drumstick short loin short ribs frankfurter andouille ribeye ham hock pig bresaola jowl chicken flank sausage. Shankle flank filet mignon, capicola brisket meatball shank turkey cow. Ball tip leberkas pork chop, pork belly turkey meatloaf pork tri-tip pork loin meatball turducken fatback.Sausage shoulder strip steak salami shankle capicola leberkas rump shank tail tenderloin pastrami meatloaf prosciutto. Pastrami short loin venison rump pancetta chuck. Bacon drumstick shoulder tongue kevin beef beef ribs venison capicola corned beef turducken andouille bresaola tri-tip pastrami. Ham kevin boudin capicola, landjaeger corned beef short loin salami ribeye pork loin pork. Turkey pancetta sirloin ham hock frankfurter, flank tongue meatloaf tail spare ribs andouille doner strip steak short loin chuck.Pork sausage shankle tail, pastrami doner prosciutto capicola spare ribs pig. Hamburger cow biltong, strip steak landjaeger pork belly tail bresaola tenderloin short loin t-bone drumstick. Cow salami ham hock t-bone bresaola. Rump shank chuck, boudin meatball ham flank doner fatback capicola tenderloin beef ribs turducken prosciutto biltong.Pork loin bacon beef ribs shankle prosciutto sausage pork chop drumstick. Biltong sausage ribeye, salami beef ribs meatball porchetta rump jerky landjaeger. Tail shankle leberkas doner jerky, t-bone turkey ham hock jowl bresaola porchetta cow pig. Bacon jerky jowl ham hock frankfurter sirloin andouille pastrami. Bacon ball tip sausage, chicken tenderloin pastrami shankle turducken bresaola turkey swine sirloin shank flank. Drumstick capicola andouille flank swine turkey short ribs sirloin bacon.Short ribs shank ham hock fatback meatball pancetta. Shoulder spare ribs pig bacon strip steak turducken boudin. Sirloin salami tenderloin, bacon hamburger pastrami tongue cow prosciutto landjaeger chicken shank. Spare ribs capicola pork chop, ham hock pig bresaola jowl tenderloin pork loin tail t-bone kielbasa. Kevin short ribs ham hock flank tail fatback brisket ham salami bacon. Capicola tri-tip short loin chuck jowl. Pastrami brisket pancetta short loin shank pork loin pork chuck spare ribs ball tip doner t-bone meatball.Brisket tri-tip tongue shankle tail pig. Kevin t-bone tongue boudin strip steak pork loin. Short ribs kielbasa pig meatball, bacon shankle tenderloin corned beef biltong. Shank pork chop short ribs, biltong leberkas beef short loin. Kevin leberkas andouille frankfurter pig short ribs ham hock tri-tip strip steak landjaeger ground round.Ham beef kielbasa flank beef ribs tenderloin ham hock meatloaf short loin ball tip pork. Fatback pastrami meatball swine ball tip tongue capicola strip steak landjaeger short ribs pork chop. Cow pork chop pastrami prosciutto frankfurter boudin bresaola brisket drumstick ribeye pork. Venison drumstick tri-tip ground round tongue. Shank ribeye rump chicken, prosciutto flank pastrami venison jowl sausage ball tip ham hock meatball. Rump pig flank, chuck t-bone frankfurter porchetta.Turkey ground round andouille doner, flank sausage pork belly bresaola cow jerky shoulder strip steak rump filet mignon. Chicken jerky ham boudin. Sausage ham shoulder, biltong ribeye corned beef chicken spare ribs. Kevin leberkas t-bone brisket ham tenderloin salami shankle porchetta beef ribs frankfurter pork.Doner jowl ball tip, turducken pork belly porchetta short ribs shoulder corned beef swine beef ribs. Corned beef pork brisket drumstick chicken t-bone short loin shankle tail chuck capicola beef bresaola rump ribeye. Tail tri-tip beef ribs shoulder. Beef ribs sausage meatloaf, chicken strip steak landjaeger swine tri-tip doner turducken jowl biltong leberkas frankfurter ground round. Turducken turkey ham drumstick, short loin ball tip tail cow pork loin kevin capicola.Sirloin shankle brisket bacon pork chop. Kielbasa pig kevin, pork loin landjaeger jerky beef swine meatball. Fatback beef turducken corned beef prosciutto. Tail bresaola tongue, meatball short ribs pork loin brisket salami prosciutto landjaeger jowl.Prosciutto beef ribs doner andouille rump ball tip tri-tip sirloin. Pancetta cow ribeye, meatball tenderloin chicken tongue turducken strip steak pastrami t-bone beef short ribs doner fatback. Pork loin tenderloin turducken, kielbasa tongue prosciutto biltong. Jerky pork belly tenderloin jowl frankfurter porchetta pancetta kevin. Biltong shankle jowl spare ribs boudin turducken pork loin bacon frankfurter pork chop. Ball tip pork ground round corned beef leberkas tri-tip venison pork loin turducken. Leberkas frankfurter filet mignon venison porchetta, beef ball tip kielbasa rump shank short loin.Jerky brisket pork belly prosciutto frankfurter, tri-tip flank pork chop. Capicola pastrami beef jerky shoulder ribeye cow boudin shank ham meatloaf kielbasa biltong turducken ham hock. Rump pig tri-tip meatball landjaeger, turducken meatloaf tongue. Turducken tri-tip filet mignon pastrami sirloin chicken meatball. Strip steak venison pastrami corned beef pig capicola tenderloin filet mignon t-bone leberkas chuck brisket tongue biltong shoulder.Landjaeger andouille rump short ribs, strip steak ribeye ball tip venison fatback. Pork frankfurter sausage tri-tip pig. Ball tip jowl pork filet mignon venison. Venison shank kielbasa pork, tenderloin leberkas turducken ground round meatloaf cow fatback t-bone hamburger sausage. Pig chicken tail rump, sirloin short loin beef ribs. Tongue andouille meatloaf sausage tail pig.Cow beef ribs strip steak turkey ground round kielbasa. Frankfurter corned beef sirloin spare ribs, short loin leberkas shankle kielbasa short ribs drumstick tongue. Salami ham hock shoulder kielbasa, turducken swine venison short ribs shankle jerky pork pork belly. Turducken cow filet mignon shankle, pork loin pig chuck biltong tail shoulder pastrami tenderloin shank.";

            sender.packetize(inMsg);

            // Should have been broken into 7 packets.
            expect(sender.hasPacket()).toBeTruthy();
            expect(sender.numPackets()).toBe( Math.ceil(inMsg.length/(packetSize-headerSize)) ); // 7

            var packet = sender.packets();
            expect(sender.hasPacket()).toBeFalsy();

            var chunks = 0;
            var size = Math.floor(packetSize/2);
            while ( packet.length > 0 ) {
                chunks++;
                receiver.accumulate( packet.substr(0, size) );
                packet  = packet.substr(size);
                size    = Math.floor(1.5*packetSize);
            }

            // should see 1 chunk coming in with both messages
            expect(chunkSpy.calls.count()).toEqual(chunks);

            // but not a partial.
            expect(partialSpy.calls.count()).toEqual(chunks);

            // The message listener should see the whole message.
            expect(messageSpy.calls.allArgs()).toEqual([[inMsg]]);

        });

        it("Should be able to packetize two separate long messages, accumulate random sized chunks, and get the same message out", function () {

            var longMsg1 = "Bacon ipsum dolor sit amet leberkas jerky pig sirloin andouille. Prosciutto salami ham hock ground round, ribeye pork chop strip steak fatback filet mignon ham beef ribs t-bone shank. Ball tip venison kielbasa pork chop tail turkey, salami swine chicken. Fatback spare ribs salami jowl landjaeger biltong shankle chuck chicken turducken. Kevin short ribs andouille tenderloin filet mignon. Jowl meatball chicken tenderloin pork biltong hamburger flank meatloaf pork chop porchetta chuck. Beef ribs capicola leberkas ham hock, pig corned beef brisket sirloin rump.Tongue leberkas pancetta tenderloin short ribs. Jerky ham hock spare ribs ball tip strip steak bacon chicken salami pork meatloaf. Tri-tip doner cow fatback drumstick, meatloaf t-bone shank pork. Hamburger tenderloin t-bone, bacon beef ham hock pork belly short loin turducken. Boudin pork belly ground round pork loin t-bone. Venison ball tip jowl tongue brisket short ribs turkey ham porchetta.Cow filet mignon strip steak bacon short loin, kielbasa pig tri-tip capicola venison tenderloin. Boudin meatball chuck kielbasa corned beef cow sausage. Biltong boudin tenderloin hamburger, kielbasa shank ham bresaola ham hock beef ribs chuck flank. Andouille tenderloin short ribs, bresaola beef ribs turkey chuck spare ribs short loin swine boudin porchetta sausage ball tip. Capicola sausage flank pastrami rump doner ribeye beef ribs pork loin meatloaf strip steak salami ball tip. Andouille pork belly shoulder boudin meatloaf pastrami doner flank.Filet mignon short ribs spare ribs bresaola, t-bone corned beef drumstick pig rump pork cow tenderloin bacon. Leberkas jerky short ribs sausage doner frankfurter. Bacon shank hamburger flank bresaola t-bone shoulder shankle fatback short ribs kielbasa tongue brisket. Tenderloin ground round meatball pancetta swine bacon doner porchetta landjaeger tail turkey prosciutto. Biltong flank frankfurter, brisket t-bone pork loin kielbasa. Brisket ham pork pastrami. Ham hock chuck prosciutto doner meatball pork sirloin.Ground round venison leberkas corned beef, andouille brisket pancetta. Venison turkey hamburger ball tip brisket salami flank, filet mignon ground round leberkas shankle rump tri-tip. Pancetta jowl meatloaf tenderloin flank. Ham swine beef, ribeye turkey ham hock boudin porchetta bresaola turducken jowl sirloin tongue leberkas capicola. Sirloin pastrami pig prosciutto short ribs doner porchetta leberkas pork loin.Pork fatback corned beef pastrami t-bone. Drumstick tenderloin ribeye, capicola pancetta hamburger meatloaf fatback bresaola sausage spare ribs ground round prosciutto shoulder short ribs. Jerky tenderloin jowl frankfurter, turducken short ribs drumstick corned beef tri-tip. Chuck ham drumstick, ham hock boudin doner swine chicken turducken. Shoulder ball tip pork loin, tenderloin kielbasa ground round ham hock salami bresaola cow tail pork belly tri-tip beef ribs. Capicola shoulder kielbasa ham hock ball tip, drumstick beef ribs pastrami pig.Capicola short loin swine shank spare ribs jowl meatloaf. Rump cow fatback strip steak ham hock beef ribs filet mignon biltong ball tip capicola tenderloin. Cow porchetta tenderloin frankfurter meatloaf ground round beef, spare ribs short loin tail ham hock hamburger. Boudin capicola short loin sirloin swine venison pig prosciutto.Strip steak pork loin meatloaf pork belly turducken, rump fatback pancetta ground round tongue filet mignon. Filet mignon beef ribs tongue tail. Flank pork hamburger capicola jowl bacon salami kielbasa porchetta chuck. Kielbasa jowl sausage, t-bone rump corned beef porchetta leberkas tongue brisket jerky sirloin cow kevin. Pig sirloin jerky hamburger strip steak, capicola corned beef bresaola. Turkey fatback pig drumstick corned beef pork loin, chicken doner spare ribs kevin sausage rump prosciutto sirloin pork.Salami frankfurter ribeye t-bone kielbasa. Doner chuck beef ribs, ball tip t-bone hamburger turducken ham jowl filet mignon shank turkey tongue. Corned beef kevin strip steak pastrami tongue short ribs tail. Ribeye turducken kielbasa shank ground round.Venison frankfurter rump spare ribs pork loin pork t-bone pork chop pork belly cow tenderloin capicola flank jowl. Venison tri-tip t-bone swine pork. Porchetta short loin kevin corned beef filet mignon pork belly salami ground round meatball landjaeger ham hock frankfurter. Pancetta salami kielbasa, jowl beef ribs pork chop jerky porchetta filet mignon cow ball tip venison pastrami. Short ribs bresaola corned beef, hamburger tenderloin drumstick flank chuck. Capicola sausage meatloaf corned beef hamburger andouille leberkas ball tip pork belly swine ham hock.Kielbasa rump turducken tri-tip ham jowl bresaola landjaeger meatball. Frankfurter biltong sausage spare ribs. Hamburger turkey swine t-bone tri-tip pork belly jowl tail. Brisket pork chop cow short loin ham spare ribs. Ham bresaola beef porchetta pancetta. Turkey pork loin boudin hamburger strip steak, landjaeger tenderloin short ribs pork chop. Kielbasa tri-tip drumstick swine rump sausage chicken hamburger ham salami bacon biltong.Sirloin corned beef filet mignon ball tip chuck kielbasa pancetta venison chicken tail frankfurter short loin biltong t-bone. Salami short ribs pancetta chicken jowl shankle kielbasa swine hamburger shoulder spare ribs. Sirloin ham ball tip, corned beef turkey biltong jowl bacon tail shankle t-bone strip steak. Andouille cow pork loin boudin sirloin strip steak porchetta ham beef ribeye pig turducken. Strip steak leberkas jowl tail brisket pork belly doner, ribeye flank.Turkey pancetta shank turducken andouille tri-tip. Ham hock short loin flank pig strip steak. Pig tenderloin pork, beef pancetta kevin drumstick hamburger ground round. Bresaola corned beef jowl, ball tip chicken pancetta hamburger beef rump pork belly.Rump short loin brisket shank, pig tri-tip pork. Beef ribs venison short ribs chuck jowl sirloin hamburger boudin rump pig strip steak pancetta. Chicken landjaeger pork porchetta corned beef fatback beef brisket cow. Porchetta jerky turducken, bacon brisket t-bone hamburger strip steak short loin kevin chicken jowl. Shank chuck leberkas biltong doner shankle ham hock corned beef meatball pig meatloaf pork chop.Turducken shank leberkas tail chuck, sausage beef ribs. Shankle andouille salami, beef ribs rump sausage swine meatloaf kielbasa fatback brisket sirloin strip steak tri-tip prosciutto. Ham bresaola salami t-bone turkey hamburger, shank turducken short loin beef meatloaf. Hamburger tri-tip kevin meatball. Kielbasa salami bacon, porchetta sirloin ribeye beef ribs. Meatball drumstick strip steak pork belly. Short ribs andouille cow tongue venison pork loin salami ball tip swine meatloaf ham sirloin jerky.Pork loin fatback leberkas frankfurter kielbasa. Pancetta prosciutto sausage capicola, jerky shoulder turducken pork loin pork chop sirloin. Pastrami kevin ribeye, tri-tip biltong tenderloin drumstick ham hock. Pastrami pancetta sirloin ball tip, venison meatball jerky pork ham hock capicola prosciutto. Pig meatloaf flank turducken landjaeger t-bone strip steak leberkas doner. Filet mignon boudin capicola beef short ribs. Pork loin turducken salami sausage shankle fatback tenderloin ball tip swine tail beef ribs jowl doner shank.Bacon venison sirloin swine. Turducken brisket drumstick pancetta boudin pastrami. Tri-tip capicola beef ribs frankfurter turkey bresaola. Ball tip turducken ham hock bresaola. Pancetta drumstick short loin short ribs frankfurter andouille ribeye ham hock pig bresaola jowl chicken flank sausage. Shankle flank filet mignon, capicola brisket meatball shank turkey cow. Ball tip leberkas pork chop, pork belly turkey meatloaf pork tri-tip pork loin meatball turducken fatback.Sausage shoulder strip steak salami shankle capicola leberkas rump shank tail tenderloin pastrami meatloaf prosciutto. Pastrami short loin venison rump pancetta chuck. Bacon drumstick shoulder tongue kevin beef beef ribs venison capicola corned beef turducken andouille bresaola tri-tip pastrami. Ham kevin boudin capicola, landjaeger corned beef short loin salami ribeye pork loin pork. Turkey pancetta sirloin ham hock frankfurter, flank tongue meatloaf tail spare ribs andouille doner strip steak short loin chuck.Pork sausage shankle tail, pastrami doner prosciutto capicola spare ribs pig. Hamburger cow biltong, strip steak landjaeger pork belly tail bresaola tenderloin short loin t-bone drumstick. Cow salami ham hock t-bone bresaola. Rump shank chuck, boudin meatball ham flank doner fatback capicola tenderloin beef ribs turducken prosciutto biltong.Pork loin bacon beef ribs shankle prosciutto sausage pork chop drumstick. Biltong sausage ribeye, salami beef ribs meatball porchetta rump jerky landjaeger. Tail shankle leberkas doner jerky, t-bone turkey ham hock jowl bresaola porchetta cow pig. Bacon jerky jowl ham hock frankfurter sirloin andouille pastrami. Bacon ball tip sausage, chicken tenderloin pastrami shankle turducken bresaola turkey swine sirloin shank flank. Drumstick capicola andouille flank swine turkey short ribs sirloin bacon.Short ribs shank ham hock fatback meatball pancetta. Shoulder spare ribs pig bacon strip steak turducken boudin. Sirloin salami tenderloin, bacon hamburger pastrami tongue cow prosciutto landjaeger chicken shank. Spare ribs capicola pork chop, ham hock pig bresaola jowl tenderloin pork loin tail t-bone kielbasa. Kevin short ribs ham hock flank tail fatback brisket ham salami bacon. Capicola tri-tip short loin chuck jowl. Pastrami brisket pancetta short loin shank pork loin pork chuck spare ribs ball tip doner t-bone meatball.Brisket tri-tip tongue shankle tail pig. Kevin t-bone tongue boudin strip steak pork loin. Short ribs kielbasa pig meatball, bacon shankle tenderloin corned beef biltong. Shank pork chop short ribs, biltong leberkas beef short loin. Kevin leberkas andouille frankfurter pig short ribs ham hock tri-tip strip steak landjaeger ground round.Ham beef kielbasa flank beef ribs tenderloin ham hock meatloaf short loin ball tip pork. Fatback pastrami meatball swine ball tip tongue capicola strip steak landjaeger short ribs pork chop. Cow pork chop pastrami prosciutto frankfurter boudin bresaola brisket drumstick ribeye pork. Venison drumstick tri-tip ground round tongue. Shank ribeye rump chicken, prosciutto flank pastrami venison jowl sausage ball tip ham hock meatball. Rump pig flank, chuck t-bone frankfurter porchetta.Turkey ground round andouille doner, flank sausage pork belly bresaola cow jerky shoulder strip steak rump filet mignon. Chicken jerky ham boudin. Sausage ham shoulder, biltong ribeye corned beef chicken spare ribs. Kevin leberkas t-bone brisket ham tenderloin salami shankle porchetta beef ribs frankfurter pork.Doner jowl ball tip, turducken pork belly porchetta short ribs shoulder corned beef swine beef ribs. Corned beef pork brisket drumstick chicken t-bone short loin shankle tail chuck capicola beef bresaola rump ribeye. Tail tri-tip beef ribs shoulder. Beef ribs sausage meatloaf, chicken strip steak landjaeger swine tri-tip doner turducken jowl biltong leberkas frankfurter ground round. Turducken turkey ham drumstick, short loin ball tip tail cow pork loin kevin capicola.Sirloin shankle brisket bacon pork chop. Kielbasa pig kevin, pork loin landjaeger jerky beef swine meatball. Fatback beef turducken corned beef prosciutto. Tail bresaola tongue, meatball short ribs pork loin brisket salami prosciutto landjaeger jowl.Prosciutto beef ribs doner andouille rump ball tip tri-tip sirloin. Pancetta cow ribeye, meatball tenderloin chicken tongue turducken strip steak pastrami t-bone beef short ribs doner fatback. Pork loin tenderloin turducken, kielbasa tongue prosciutto biltong. Jerky pork belly tenderloin jowl frankfurter porchetta pancetta kevin. Biltong shankle jowl spare ribs boudin turducken pork loin bacon frankfurter pork chop. Ball tip pork ground round corned beef leberkas tri-tip venison pork loin turducken. Leberkas frankfurter filet mignon venison porchetta, beef ball tip kielbasa rump shank short loin.Jerky brisket pork belly prosciutto frankfurter, tri-tip flank pork chop. Capicola pastrami beef jerky shoulder ribeye cow boudin shank ham meatloaf kielbasa biltong turducken ham hock. Rump pig tri-tip meatball landjaeger, turducken meatloaf tongue. Turducken tri-tip filet mignon pastrami sirloin chicken meatball. Strip steak venison pastrami corned beef pig capicola tenderloin filet mignon t-bone leberkas chuck brisket tongue biltong shoulder.Landjaeger andouille rump short ribs, strip steak ribeye ball tip venison fatback. Pork frankfurter sausage tri-tip pig. Ball tip jowl pork filet mignon venison. Venison shank kielbasa pork, tenderloin leberkas turducken ground round meatloaf cow fatback t-bone hamburger sausage. Pig chicken tail rump, sirloin short loin beef ribs. Tongue andouille meatloaf sausage tail pig.Cow beef ribs strip steak turkey ground round kielbasa. Frankfurter corned beef sirloin spare ribs, short loin leberkas shankle kielbasa short ribs drumstick tongue. Salami ham hock shoulder kielbasa, turducken swine venison short ribs shankle jerky pork pork belly. Turducken cow filet mignon shankle, pork loin pig chuck biltong tail shoulder pastrami tenderloin shank.";
            var longMsg2 = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Phasellus ac magna non augue porttitor scelerisque ac id diam. Mauris elit velit, lobortis sed interdum at, vestibulum vitae libero. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Quisque iaculis ligula ut ipsum mattis viverra. Nulla a libero metus. Integer gravida tempor metus eget condimentum. Integer eget iaculis tortor. Nunc sed ligula sed augue rutrum ultrices eget nec odio. Morbi rhoncus, sem laoreet tempus pulvinar, leo diam varius nisi, sed accumsan ligula urna sed felis. Mauris molestie augue sed nunc adipiscing et pharetra ligula suscipit. In euismod lectus ac sapien fringilla ut eleifend lacus venenatis. ";

            sender.packetize(longMsg1);
            sender.packetize(longMsg2);

            var packets = [];
            packets.push(sender.next());
            packets.push(sender.next());
            packets.push(sender.next());
            packets.push(sender.packets());

            var chunks = 0;
            for ( var i=0; i<packets.length; i++ ) {
                var packet = packets[i];
                while ( packet !== "" ) {
                    var spot = Math.ceil(Math.random()*packet.length);
                    chunks++;
                    receiver.accumulate(packet.substr(0, spot));
                    packet = packet.substr(spot);
                }
            }

            // should see 1 chunk coming in with both messages
            expect(chunkSpy.calls.count()).toEqual(chunks);

            // There will be partials, how many depends on how the packtes are split...
            // so can't really test for the real number.
            expect(partialSpy).toHaveBeenCalled();

            // go directly to a full message
            expect(messageSpy.calls.allArgs()).toEqual([[longMsg1], [longMsg2]]);


        });
    });

    describe("Testing sugar function", function () {

        describe("Success", function () {
            var inMsg, callback, errback;
            beforeEach(function (done) {
                callback    = jasmine.createSpy('callback');
                errback     = jasmine.createSpy('errback');
                inMsg       = "Hello World!";
                var socket  = new EventEmitter();
                var promise = Packetizer.receive(socket)
                        .then( callback, errback )
                        .finally(done);
                socket.emit('data', Packetizer.send(inMsg));
            });

            it ('should be able to use Packetizer.send to create a message and Packetizer.receive to get a promise for the message.', function () {
                expect(callback).toHaveBeenCalledWith(inMsg);
                expect(errback).not.toHaveBeenCalled();
            });
        });

        describe("Error", function () {
            var inMsg, callback, errback;
            beforeEach(function (done) {
                callback    = jasmine.createSpy('callback');
                errback     = jasmine.createSpy('errback');
                inMsg       = "Something went wrong";
                var socket  = new EventEmitter();
                var promise = Packetizer.receive(socket)
                        .then( callback, errback )
                        .finally(done);
                socket.emit('error', "Something went wrong");
            });

            it ('should be able to use Packetizer.send to create a message and Packetizer.receive to get a promise for the message.', function () {
                expect(callback).not.toHaveBeenCalled();
                expect(errback).toHaveBeenCalledWith(inMsg);
            });
        });

    });

});

