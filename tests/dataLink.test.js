var { expect } = require('chai')
var dataLink = require('../src/dataLink')
var specialChars = dataLink.specialChars

/**
 * Puts dataIn through data lnk layer and sees if it's returned the same
 * 
 * @param {number[]} dataIn
 */
function sendDataEqual(dataIn)
{
    var data = [specialChars.start]
    for (var index = 0; index < dataIn.length; index++)
    {
        var dataByte = dataIn[index]
        if (dataByte == specialChars.start || dataByte == specialChars.end || dataByte == specialChars.escape)
            data.push(specialChars.escape)
        
        data.push(dataByte)
    }

    data.push(specialChars.end)

    let transmissionFinished = false
    for (var index = 0; index < data.length; index++)
        dataLink.read(data[index], (response) => {
            expect(response).to.be.eql(dataIn)
            transmissionFinished = true
        })
    
    if (!transmissionFinished) throw "The transmission didn't complete. Please check your transmission for completeness."
}

describe('Data Link Layer', function () {
    describe('normal transmission with no special characters', function () {
        it('should return the correct response', function () {
            return sendDataEqual([1,2,3,4,5,6,7])
        })
    })

    describe('transmission with start byte in data', function () {
        it('should return the correct response', function () {
            return sendDataEqual([1,2,3,4, specialChars.start, 5,6,7])
        })
    })

    describe('transmission with end byte in data', function () {
        it('should return the correct response', function () {
            return sendDataEqual([1,2,3,4, specialChars.end, 5,6,7])
        })
    })

    describe('transmission with escape byte in data', function () {
        it('should return the correct response', function () {
            return sendDataEqual([1,2,3,4, specialChars.escape, 5,6,7])
        })
    })
})
