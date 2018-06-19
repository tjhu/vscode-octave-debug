import * as assert from 'assert';
import * as RH from '../ResponseHelper';

const lines0 = ["ans =  7", "octave:5> "];
const lines1 = ["ans =  7", "debug:> "];

suite("isCompleteResponse", function () {
    test("#isCompleteResponse 1", function() {
        assert.equal(RH.isCompleteResponse(lines0), true);
        assert.equal(RH.isCompleteResponse(lines0, true), false);
        assert.equal(RH.isCompleteResponse(lines0, false), true);

        assert.equal(RH.isCompleteResponse(lines1), true);
        assert.equal(RH.isCompleteResponse(lines1, true), true);
        assert.equal(RH.isCompleteResponse(lines1, false), false);
    });

    test("#isCompletePromptResponse 1", function() {    
        assert.equal(RH.isCompletePromptResponse(lines0), true);
        assert.equal(RH.isCompletePromptResponse(lines1), false);
    });

    test("#isCompleteDebugResponse 1", function() {    
        assert.equal(RH.isCompleteDebugResponse(lines0), false);
        assert.equal(RH.isCompleteDebugResponse(lines1), true);
    });

});

suite("getAnswers", function () {
    test("get single answer", function() {
        assert.deepStrictEqual(RH.getAnswers(lines0), [['7']]);
        assert.deepStrictEqual(RH.getAnswers(lines1), [['7']]);
    });
});