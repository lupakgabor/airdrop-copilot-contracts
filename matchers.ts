import "@nomicfoundation/hardhat-toolbox";
import {default as chai} from "chai";
import {time} from "@nomicfoundation/hardhat-toolbox/network-helpers";

chai.use(function (chai, utils) {
    var Assertion = chai.Assertion;

    Assertion.addMethod('extraDays', async function (expectedExtraDays) {
        const subscriber: BigInt = this._obj;
        new Assertion(subscriber).to.be.a('bigint');
        new Assertion(expectedExtraDays).to.be.a('number');

        const timestamp = await time.latest();
        const expectedUnixTime = timestamp + expectedExtraDays * 24 * 60 * 60

        // +/- 2 sec is acceptable because of transaction time
        new Assertion(subscriber).to.lessThanOrEqual(expectedUnixTime+2);
        new Assertion(subscriber).to.greaterThanOrEqual(expectedUnixTime-2);
    });
});