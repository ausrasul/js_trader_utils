//var readlineSync = require('readline-sync')
var readlineSync = jest.genMockFromModule('readline-sync')

var i = 0
readlineSync.question = jest.fn().mockImplementation(()=>{
	i += 1
	return i
})

module.exports = readlineSync
