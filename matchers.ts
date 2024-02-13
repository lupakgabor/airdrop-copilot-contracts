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

        const date = new Date(timestamp * 1000)

        date.setDate(date.getDate() + expectedExtraDays);

        new Assertion(subscriber).to.equal(BigInt(date.getTime() / 1000));
    });
});