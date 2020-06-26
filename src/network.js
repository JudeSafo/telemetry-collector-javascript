var dataLink = require('./dataLink')
var request = require('axios')

const GPS = 0x00
const MPPT = 0x01
const BMS = 0x02
const IMU = 0x03


/**
* Sends data to the backend to be logged
*
* Examples:
* ```JavaScript
* sendData("bms", {
*     "packSumVoltage": 20
* })
* ```
* 
* ```JavaScript
* sendData("gps", {
*     "longitude": 1,
*     "latitude": -1,
*     "speed": 5,
*     "heading": 40
* })
* ```
*
* @param {String} url    most sigificant byte
* @param {Object} data least significant byte
*/
function sendData(url, data)
{
    return request.post(`http://localhost:8080/api/${url}`, data)
}


/**
* Converts two 8 bit number to a 16 bit unsigned number 
* 
* @param {Number} top    most sigificant byte
* @param {Number} bottom least significant byte
*/
function getWord(top, bottom)
{
    return ((top << 8) | bottom)
}

/**
* Converts two 8 bit number to a 16 bit signed number 
* 
* @param {Number} top    most sigificant byte
* @param {Number} bottom least significant byte
*/
function signed16(top, bottom)
{
    var sign = top & (1 << 7);
    var x = (((top & 0xFF) << 8) | (bottom & 0xFF));
    if (sign)
        return 0xFFFF0000 | x;  // fill in most significant bits with 1's
    
    return x
}

/**
* Converts from Degrees Decimal Minutes (DDM) to Decimal Degree (DD) coordinates
* 
* @param {String} str DDM coordinates
*/
function DDMtoDD(str)
{
    //get degrees
    var degrees = parseFloat(str[0] + str[1] + ( str[0] == '-' ? str[3] : ''));
    var minStr = ""
    for (var index = ( str[0] == '-' ? 3 : 2); index < str.length; index++)
    {
        minStr += str[index]
    }

    return degrees + (parseFloat(minStr)/60*( str[0] == '-' ? -1 : 1))
}

/**
* Recieves a raw transmission from the data link layer and does needed calls
* 
* @param {String[]} data a single transmission
*/
function handleTransmission(data)
{
    var numMessages = data[0]
    var currentIndex = 1

    for (var message = 0; message < numMessages; message++)
    {
        var address = data[currentIndex++]
        var dataLen = data[currentIndex++]
        var dataBuffer = []
        for (var count = 0; count < dataLen; count++)
            dataBuffer.push(data[currentIndex++])
        
        if (address == BMS && dataBuffer[7] && dataBuffer[6])
        {
            //console.log(dataBuffer[7].toString(16), dataBuffer[6].toString(16))

            var packSumVoltage = getWord(dataBuffer[7], dataBuffer[6])/100
           
            sendData("bms", {
                "packSumVoltage": packSumVoltage
            })
        }

        else if (address == GPS)
        {
            var gpsString = ""
            for (var index = 0; index < dataBuffer.length; index++)
                gpsString += String.fromCharCode(dataBuffer[index])
            //var gpsString = dataBuffer.join('')
            var values = gpsString.split(',')
            console.log(gpsString)
            //north and east is positive
            var longitudeStr = values[1]
            var latitudeStr = values[0]

            
            var longitude = String(parseFloat(longitudeStr) * (longitudeStr[longitudeStr.length - 1] == "W" ? -1 : 1))
            var latitude = String(parseFloat(latitudeStr) * (latitudeStr[latitudeStr.length - 1] == "S" ? -1 : 1))
            var speed = parseFloat(values[2])
            var heading = parseFloat(values[3])
            console.log({
                "longitude": DDMtoDD(longitude),
                "latitude": DDMtoDD(latitude),
                "speed": speed,
                "heading": heading
            })
            sendData("gps", {
                "longitude": DDMtoDD(longitude),
                "latitude": DDMtoDD(latitude),
                "speed": speed,
                "heading": heading
            })
        }

        else if (address == IMU)
        {
            var accel = {
                x: signed16(dataBuffer[1], dataBuffer[0]),
                y: signed16(dataBuffer[3], dataBuffer[2]),
                z: signed16(dataBuffer[5], dataBuffer[4])
            }

            var gyro = {
                x: signed16(dataBuffer[7], dataBuffer[6]),
                y: signed16(dataBuffer[9], dataBuffer[8]),
                z: signed16(dataBuffer[11], dataBuffer[10])
            }
            var linear = {
                x: signed16(dataBuffer[13], dataBuffer[12]),
                y: signed16(dataBuffer[15], dataBuffer[14]),
                z: signed16(dataBuffer[17], dataBuffer[16])
            }
            var temp = signed16(dataBuffer[19], dataBuffer[18])

            // console.log("--------- PACKET START ---------")
            // console.log("accel : ", accel)
            // console.log("gyro : ", gyro)
            // console.log("linear : ", gyro)
            // console.log("temp : ", temp, "C")
            // console.log("--------- PACKET END ---------")
        }
    }
}

/**
* Reads a single byte in, sends it to the data link layer which trickles back up
* 
* @param {Number} byteIn a single byte from a transmission
*/
function read(byteIn)
{
    dataLink.read(byteIn, handleTransmission)
}

exports.read = read
