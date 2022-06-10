//var utils = require('../src/utils')

const RealDate = Date

function mockDate (isoDate) {
	global.Date = class extends RealDate {
		constructor(...theArgs) {
			if (theArgs.length) {
				return new RealDate(...theArgs)
			}
			return new RealDate(isoDate)
		}
		static now() {
			return new RealDate().getTime()
		}
	}
}
function obj2arr(obj){
	var result = Object.keys(obj).map((key)=>{
		return [key, obj[key]]
	})
	return result
}
function arr2obj(arr){
	var obj = {}
	arr.forEach(v => {
		obj[v[0]] = v[1]
	})
	return obj
}

describe('Utils functionality', () => {
	var utils
	var fs
	var child_process
	var readlineSync
	var Logger

	beforeEach(()=>{
		utils = require('../lib/index')
		fs = require('fs')
		child_process = require('child_process')
		readlineSync = require('readline-sync')
		Logger = require('tracer')
		jest.mock('readline-sync')
		jest.mock('fs')
		jest.mock('child_process')
		jest.mock('tracer')
		jest.spyOn(global.console, 'log').mockImplementation(() => jest.fn())
	})
	afterEach(() => {
		jest.resetModules()
		global.console.log.mockRestore()
		global.Date = RealDate
	})
	const config = '{\
		"accountId": "123456",\
		"betsize": "auto",\
		"minInstPrice": 100,\
		"indexId": "19002",\
		"loginTime": 855,\
		"logoutTime": 1740,\
		"tcpPort": 9838,\
		"tcpIp": "127.0.0.1",\
		"marketDaysFile": "./src/marketDays.json",\
		"instrumentsFile": "./src/instruments.json",\
		"halfDayEnd": 1255,\
		"fullDayEnd": 1723,\
		"dayStart" : 900,\
		"logoutGraceTime": 5,\
		"mmMinVolume": 9000,\
		"accountsString": "_123,234,345,456",\
		"clearing": "9552"\
	}'
	const instruments = {
		short: [
			{id: '861484', type: 'WARRANT', finance_level: 1606.473},
			{id: '854287', type: 'WARRANT', finance_level: 1629.119},
			{id: '853354', type: 'WARRANT', finance_level: 1653.524},
			{id: '680968', type: 'WARRANT', finance_level: 1670.348},
			{id: '741893', type: 'WARRANT', finance_level: 1687.55},
			{id: '567512', type: 'WARRANT', finance_level: 1694.24},
			{id: '680969', type: 'WARRANT', finance_level: 1694.454},
			{id: '782941', type: 'WARRANT', finance_level: 1706.892},
			{id: '687568', type: 'WARRANT', finance_level: 1723.071},
			{id: '564096', type: 'WARRANT', finance_level: 1736.25}
		],
		long: [
			{id: '860133', type: 'WARRANT', finance_level: 1520.621},
			{id: '861804', type: 'WARRANT', finance_level: 1519.737},
			{id: '844488', type: 'WARRANT', finance_level: 1492.337},
			{id: '843921', type: 'WARRANT', finance_level: 1467.947},
			{id: '850050', type: 'WARRANT', finance_level: 1449.955},
			{id: '710682', type: 'WARRANT', finance_level: 1435.628},
			{id: '707041', type: 'WARRANT', finance_level: 1412.43},
			{id: '819692', type: 'WARRANT', finance_level: 1400.242},
			{id: '703738', type: 'WARRANT', finance_level: 1387.559}
		]
	}
	test('get user credentials', () => {
		expect.assertions(3)
		jest.clearAllMocks()
		expect(utils.getCredentials()).toEqual({username: 1, password: 2, totpSecret: 3})
		expect(utils.getCredentials()).toEqual({username: 4, password: 5, totpSecret: 6})
		expect(readlineSync.question).toHaveBeenCalledTimes(6)
	})
	test('get serialnumber', ()=>{
		expect.assertions(100)
		for (let i=1; i<101; i++){
			expect(utils.getSerial()).toBe(i)
		}
	})
	test('number padding', ()=>{
		expect(utils.padding(1)).toBe('01')
		expect(utils.padding(10)).toBe('10')
		expect(utils.padding(100)).toBe('100')
		expect(utils.padding(0)).toBe('00')
	})
	test('is weekend', ()=>{
		mockDate('2018-07-27T09:00:00+01:00')
		expect(utils.isWeekend()).toBe(false)
		mockDate('2018-07-28T09:00:00+01:00')
		expect(utils.isWeekend()).toBe(true)
		mockDate('2018-07-29T09:00:00+01:00')
		expect(utils.isWeekend()).toBe(true)
		mockDate('2018-07-30T09:00:00+01:00')
		expect(utils.isWeekend()).toBe(false)
	})
	test('today date', ()=>{
		mockDate('2018-07-30T09:00:00+01:00')
		expect(utils.todayDate()).toBe('2018-07-30')
		mockDate('2018-10-30T09:00:00+01:00')
		expect(utils.todayDate()).toBe('2018-10-30')
		mockDate('2018-07-01T09:00:00+01:00')
		expect(utils.todayDate()).toBe('2018-07-01')
	})
	it('gets time bucket with a time length in seconds', ()=>{
		mockDate('2018-01-01T10:05:01+01:00')
		let bucket = utils.getTimeBucket(60)
		mockDate('2018-01-01T10:05:30+01:00')
		expect(utils.getTimeBucket(60)).toBe(bucket)
		mockDate('2018-01-01T10:05:59+01:00')
		expect(utils.getTimeBucket(60)).toBe(bucket)
		mockDate('2018-01-01T10:06:30+01:00')
		expect(utils.getTimeBucket(60)).toBe(bucket + 1)
		mockDate('2018-01-01T10:07:30+01:00')
		expect(utils.getTimeBucket(60)).toBe(bucket + 2)
		mockDate('2018-01-01T11:05:30+01:00')
		expect(utils.getTimeBucket(60)).toBe(bucket + 60)

		mockDate('2018-01-01T10:05:01+01:00')
		bucket = utils.getTimeBucket(5)
		mockDate('2018-01-01T10:05:31+01:00')
		expect(utils.getTimeBucket(5)).toBe(bucket + 6)
		mockDate('2018-01-01T10:06:31+01:00')
		expect(utils.getTimeBucket(5)).toBe(bucket + 18)

		mockDate('2018-01-01T10:05:01+01:00')
		bucket = utils.getTimeBucket(300)
		mockDate('2018-01-01T10:07:30+01:00')
		expect(utils.getTimeBucket(300)).toBe(bucket)
		mockDate('2018-01-01T11:05:30+01:00')
		expect(utils.getTimeBucket(300)).toBe(bucket + 12)
	})
	it('gets timebucket with custom Date class', ()=>{
		const d = new Date('2018-01-01T10:00:00+01:00')
		mockDate('2018-01-01T10:05:01+01:00')
		let bucket = utils.getTimeBucket(60)
		mockDate('2018-01-01T10:05:59+01:00')
		expect(utils.getTimeBucket(60)).toBe(bucket)
		mockDate('2018-01-01T10:05:59+01:00')
		expect(utils.getTimeBucket(60, d)).toBe(bucket - 5)
	})
	test('get time as integer', ()=>{
		mockDate('2018-01-01T09:01:30+01:00')
		expect(utils.getTime()).toBe(901)
		mockDate('2018-01-01T10:01:30+01:00')
		expect(utils.getTime()).toBe(1001)
		mockDate('2018-01-01T09:11:30+01:00')
		expect(utils.getTime()).toBe(911)
		mockDate('2018-01-01T22:10:30+01:00')
		expect(utils.getTime()).toBe(2210)
		mockDate('2018-01-01T22:01:30+01:00')
		expect(utils.getTime()).toBe(2201)
		mockDate('2018-01-01T00:01:30+01:00')
		expect(utils.getTime()).toBe(1)
	})
	it('getTime with custom Date class', ()=>{
		mockDate('2018-01-01T09:01:30+01:00')
		expect(utils.getTime()).toBe(901)
		const d = new Date('2018-01-01T10:00:00+01:00')
		expect(utils.getTime(d)).toBe(1000)
	})
	test('get time in seconds as integer', ()=>{
		mockDate('2018-01-01T09:01:30+01:00')
		expect(utils.getSecond()).toBe(90130)
		mockDate('2018-01-01T10:01:31+01:00')
		expect(utils.getSecond()).toBe(100131)
		mockDate('2018-01-01T09:11:05+01:00')
		expect(utils.getSecond()).toBe(91105)
		mockDate('2018-01-01T22:10:01+01:00')
		expect(utils.getSecond()).toBe(221001)
		mockDate('2018-01-01T22:01:59+01:00')
		expect(utils.getSecond()).toBe(220159)
		mockDate('2018-01-01T00:01:30+01:00')
		expect(utils.getSecond()).toBe(130)
	})
	it('getSecond with custom Date class', ()=>{
		mockDate('2018-01-01T09:01:30+01:00')
		expect(utils.getSecond()).toBe(90130)
		const d = new Date('2018-01-01T10:00:01+01:00')
		expect(utils.getSecond(d)).toBe(100001)
	})
	test('shift time back', ()=>{
		expect(utils.shiftTimeBack(2210, 10)).toBe(2200)
		expect(utils.shiftTimeBack(905, 6)).toBe(859)
		expect(utils.shiftTimeBack(5, 10)).toBe(2355)
		expect(utils.shiftTimeBack(855, 5)).toBe(850)
	})
	test('read config file', ()=>{
		var content = config
		fs.readFileSync = jest.fn().mockReturnValue(content)
		var expectedConf = JSON.parse(content)
		expect(utils.readConf('file1')).toEqual(expectedConf)
		expect(fs.readFileSync).toHaveBeenCalledWith('file1')
	})
	test('Logout must be after login', ()=>{
		const realProcess = process
		const exitMock = jest.fn()
		global.process = { ...realProcess, exit: exitMock }
		var content = JSON.parse(config)
		content.loginTime = 1700
		content.logoutTime = 1600
		content = JSON.stringify(content)
		fs.readFileSync = jest.fn().mockReturnValue(content)
		exitMock.mockClear()
		utils.readConf('file1')
		expect(exitMock).toHaveBeenCalledTimes(1)
	})
	test('read wrong config file', ()=>{
		const realProcess = process
		const exitMock = jest.fn()
		global.process = { ...realProcess, exit: exitMock }
		var content = JSON.parse(config)
		var contArr = obj2arr(content)
		var contLen = contArr.length
		expect.assertions(contLen)
		for (var i = 0; i < contLen; i++){
			var arrClone = contArr.slice()
			arrClone.splice(i,1)
			var newCont = arr2obj(arrClone)
			var newContStr = JSON.stringify(newCont)
			fs.readFileSync = jest.fn().mockReturnValue(newContStr)
			exitMock.mockClear()
			utils.readConf('file1')
			expect(exitMock).toHaveBeenCalledTimes(1)
		}
		global.process = realProcess
	})
	test('read instrument file', ()=>{
		var content = '{\
			"long": [\
				{"id": "123", "type": "WARRANT", "finance_level": 1234.34},\
				{"id": "1234", "type": "WARRANT", "finance_level": 12.34}\
			],\
			"short": [\
				{"id": "2123", "type": "WARRANT", "finance_level": 1234.34},\
				{"id": "21234", "type": "WARRANT", "finance_level": 12.34}\
			]\
		}'
		fs.readFileSync = jest.fn().mockReturnValue(content)
		var expectedConf = {
			long: [
				{id: '123', type: 'WARRANT', finance_level: 1234.34},
				{id: '1234', type: 'WARRANT', finance_level: 12.34}
			],
			short: [
				{id: '2123', type: 'WARRANT', finance_level: 1234.34},
				{id: '21234', type: 'WARRANT', finance_level: 12.34}
			]
		}
		expect(utils.readInstruments('file1')).toEqual(expectedConf)
		expect(fs.readFileSync).toHaveBeenCalledWith('file1')
	})
	test('read wrong instrument file', ()=>{
		expect.assertions(1)
		const realProcess = process
		const exitMock = jest.fn()
		global.process = { ...realProcess, exit: exitMock }
		var content = `{
			"long": [
			],
			"short": [
				{"id": "2123", "type": "WARRANT", "finance_level": 1234.34},
				{"id": "21234", "type": "WARRANT", "finance_level": 12.34}
			]
		}`
		fs.readFileSync = jest.fn().mockReturnValue(content)
		utils.readInstruments('file1')
		expect(exitMock).toHaveBeenCalled()
		global.process = realProcess
	})
	test('get market day half or closed', ()=>{
		var content = `{
			"2018-01-01":"C",
			"2018-01-05":"H"
		}`
		fs.readFileSync = jest.fn().mockReturnValue(content)
		const filename = 'file1'
		mockDate('2018-01-01T09:01:30+01:00')
		expect(utils.getMarketDay(filename)).toEqual('C')
		mockDate('2018-01-02T09:01:30+01:00')
		expect(utils.getMarketDay(filename)).toEqual('N')
		mockDate('2018-01-05T09:01:30+01:00')
		expect(utils.getMarketDay(filename)).toEqual('H')
		mockDate('2018-07-29T09:01:30+01:00')
		expect(utils.getMarketDay(filename)).toEqual('C')
		expect(fs.readFileSync).toHaveBeenCalledWith(filename)
	})
	test('get wrong market day half or closed', ()=>{
		var content = `{
			"2018-01-01":"C",
			"2018-01-05":"H",
			"2018-01-02":"Wrong"
		}`
		const realProcess = process
		const exitMock = jest.fn()
		global.process = { ...realProcess, exit: exitMock }

		fs.readFileSync = jest.fn().mockReturnValue(content)
		mockDate('2018-01-02T09:01:30+01:00')
		utils.getMarketDay('filename')
		expect(exitMock).toHaveBeenCalled()
		global.process = realProcess
	})
	test('send push notification', ()=>{
		expect.assertions(1)
		const msg = `abc
def`
		const expectedCommand = './push.sh -1 "abc\ndef"'
		utils.alertMobile(-1, msg)
		expect(child_process.exec).toHaveBeenCalledWith(expectedCommand)
	})
	test('logging', ()=>{
		Logger.dailyfile = jest.fn()
		const instanceName = 'test1'
		const expected = {
			root:'./output/',
			allLogsFileName: instanceName,
			level: 'log',
			maxLogFiles: 1000,
			format: [ '{{timestamp}} <{{title}}> {{file}}:{{line}}: {{message}}' ],
			dateformat: 'mmm dd HH:MM:ss.l'
		}
		utils.logger(instanceName)
		expect(Logger.dailyfile).toHaveBeenCalledWith(expected)
	})
	test('get long instrument by minInstPrice', ()=>{
		var minInstPrice = 100
		var indexPrice = 1600
		const direction = 'long'
		expect(utils.getInstrumentByExpectedPrice(instruments, indexPrice, minInstPrice, direction)).toEqual({id: '844488', type: 'WARRANT', finance_level: 1492.337})
		minInstPrice = 140
		expect(utils.getInstrumentByExpectedPrice(instruments, indexPrice, minInstPrice, direction)).toEqual({id: '850050', type: 'WARRANT', finance_level: 1449.955})
		minInstPrice = 0
		expect(utils.getInstrumentByExpectedPrice(instruments, indexPrice, minInstPrice, direction)).toEqual({id: '860133', type: 'WARRANT', finance_level: 1520.621})
	})
	test('get short instrument by minInstPrice', ()=>{
		var minInstPrice = 100
		var indexPrice = 1600
		const direction = 'short'
		expect(utils.getInstrumentByExpectedPrice(instruments, indexPrice, minInstPrice, direction)).toEqual({id: '782941', type: 'WARRANT', finance_level: 1706.892})
		minInstPrice = 0
		expect(utils.getInstrumentByExpectedPrice(instruments, indexPrice, minInstPrice, direction)).toEqual({id: '861484', type: 'WARRANT', finance_level: 1606.473})
	})
	test('get instrument by minInstPrice throw exception if no direction provided', ()=>{
		var minInstPrice = 100
		var indexPrice = 1600
		const direction = 'invalid_direction'
		expect(()=>{utils.getInstrumentByExpectedPrice(instruments, indexPrice, minInstPrice, direction)}).toThrow('Direction')
		expect(()=>{utils.getInstrumentByExpectedPrice(instruments, indexPrice, minInstPrice)}).toThrow('Direction')
	})
	test('get instrument by minInstPrice throw exception if too high instPrice provided', ()=>{
		var minInstPrice = 400
		var indexPrice = 1600
		let direction = 'long'
		expect(()=>{utils.getInstrumentByExpectedPrice(instruments, indexPrice, minInstPrice, direction)}).toThrow('instrument satisfy')
		direction = 'short'
		expect(()=>{utils.getInstrumentByExpectedPrice(instruments, indexPrice, minInstPrice, direction)}).toThrow('instrument satisfy')
	})
	it('Checks if instruments array has an instrument Id', ()=>{
		const instArr = [
			{instrumentId: '2', instrumentType: 'WARRANT'},
			{instrumentId: '22222', instrumentType: 'WARRANT'}
		]
		expect(utils.instrumentsHasId(instArr, '2')).toBe(true)
		expect(utils.instrumentsHasId(instArr, '22222')).toBe(true)
		expect(utils.instrumentsHasId(instArr, '333')).toBe(false)
	})
	describe('has OHLC class', ()=>{
		it('Has ohlc class', ()=>{
			const ohlc = new utils.OHLC(1, 1)
			expect(ohlc).toBeInstanceOf(utils.OHLC)
		})
		it('Initiate the ohlc instance with constructor', ()=>{
			const agg = 10
			const len = 5
			const ohlc = new utils.OHLC(agg, len)
			expect(ohlc.agg).toBe(agg)
			expect(ohlc.len).toBe(len)
			expect(ohlc.buffer).toEqual({bucket: null, prices:[]})
			expect(ohlc.candles).toEqual([])
		})
		it('Cannot create an ohlc without aggregation time or retention number', ()=>{
			expect(() => new utils.OHLC()).toThrow()
			expect(() => new utils.OHLC(1)).toThrow()
			expect(() => new utils.OHLC(undefined, 1)).toThrow()
		})
		it('Cannot create an ohlc with non-integer args', ()=>{
			expect(() => new utils.OHLC('1', 1)).toThrow()
			expect(() => new utils.OHLC(1, '1')).toThrow()
			expect(() => new utils.OHLC('1', '1')).toThrow()
		})
		it('It has helper function to get the current timebucket according to aggregation', ()=>{
			jest.spyOn(utils, 'getTimeBucket')
			const ohlc = new utils.OHLC(1,1)
			expect(utils.getTimeBucket).not.toHaveBeenCalled()
			const a = ohlc.bucket()
			expect(a).toBe(utils.getTimeBucket(ohlc.agg))
			expect(utils.getTimeBucket).toHaveBeenCalledWith(ohlc.agg)
		})
		it('Create ohlc with bucket length in seconds', ()=>{
			jest.spyOn(utils, 'getTimeBucket')
			const ohlc = new utils.OHLC(8, 20)
			const prices = [1,2,3,4,5,6,7,8, 9, 10]
			utils.getTimeBucket.mockReturnValue(1)
			prices.forEach((p, i) => {
				if (i > 7) utils.getTimeBucket.mockReturnValue(2)
				ohlc.push(p)
			})
			expect(ohlc.get()).toEqual({o: 1, h: 8, l:1, c:8})
		})
		it('Move buffer to ohlc candles if current timestamp is newer than latest bucket.',()=>{
			const ohlc = new utils.OHLC(5, 20)
			jest.spyOn(ohlc, 'bucket')
			ohlc.bucket.mockReturnValue(1)
			ohlc.push(10)
			expect(ohlc.buffer.bucket).toBe(1)
			ohlc.push(11)
			expect(ohlc.buffer).toEqual({bucket: 1, prices:[10, 11]})
			expect(ohlc.candles.length).toBe(0)

			ohlc.bucket.mockReturnValue(2)
			ohlc.push(12)
			expect(ohlc.buffer.bucket).toBe(2)
			ohlc.push(13)
			expect(ohlc.buffer).toEqual({bucket: 2, prices:[12, 13]})
			expect(ohlc.candles.length).toBe(1)
			expect(ohlc.candles[0]).toEqual({bucket:1, prices:[10,11]})
		})
		it('Only calculates entries within the aggregation time span', ()=>{
			const ohlc = new utils.OHLC(5, 10)
			const priceTime = [
				[1, '2018-07-29T09:01:30+01:00'],
				[2, '2018-07-29T09:01:31+01:00'],
				[3, '2018-07-29T09:01:32+01:00'],
				[4, '2018-07-29T09:01:33+01:00'],
				[5, '2018-07-29T09:01:34+01:00'],
				[6, '2018-07-29T09:01:35+01:00'],
				[7, '2018-07-29T09:01:36+01:00'],
				[8, '2018-07-29T09:01:37+01:00'],
				[9, '2018-07-29T09:01:38+01:00'],
				[10, '2018-07-29T09:01:39+01:00'],
				[11, '2018-07-29T09:01:40+01:00'],
				[12, '2018-07-29T09:01:41+01:00'],
				[13, '2018-07-29T09:01:42+01:00'],
				[14, '2018-07-29T09:01:43+01:00'],
				[15, '2018-07-29T09:01:44+01:00'],
			]
			priceTime.forEach((p) => {
				mockDate(p[1])
				ohlc.push(p[0])
			})
			expect(ohlc.get()).toEqual({o: 6, h: 10, l:6, c:10})
		})
		it('Get buffer ohlc', ()=>{
			const ohlc = new utils.OHLC(5, 10)
			const priceTime = [
				[1, '2018-07-29T09:01:30+01:00'],
				[2, '2018-07-29T09:01:31+01:00'],
				[3, '2018-07-29T09:01:32+01:00'],
				[4, '2018-07-29T09:01:33+01:00'],
				[5, '2018-07-29T09:01:34+01:00'],
				[6, '2018-07-29T09:01:35+01:00'],
				[7, '2018-07-29T09:01:36+01:00'],
				[8, '2018-07-29T09:01:37+01:00'],
				[9, '2018-07-29T09:01:38+01:00'],
				[10, '2018-07-29T09:01:39+01:00'],
				[11, '2018-07-29T09:01:40+01:00'],
				[12, '2018-07-29T09:01:41+01:00'],
				[13, '2018-07-29T09:01:42+01:00'],
				[14, '2018-07-29T09:01:43+01:00'],
				[15, '2018-07-29T09:01:44+01:00'],
			]
			priceTime.forEach((p) => {
				mockDate(p[1])
				ohlc.push(p[0])
			})
			expect(ohlc.getCurrent()).toEqual({o: 11, h: 15, l:11, c:15})
		})
		it('Get buffer returns false if old', ()=>{
			const ohlc = new utils.OHLC(5, 10)
			const priceTime = [
				[1, '2018-07-29T09:01:30+01:00'],
				[2, '2018-07-29T09:01:31+01:00'],
				[3, '2018-07-29T09:01:32+01:00'],
				[4, '2018-07-29T09:01:33+01:00'],
				[5, '2018-07-29T09:01:34+01:00'],
				[6, '2018-07-29T09:01:35+01:00'],
				[7, '2018-07-29T09:01:36+01:00'],
				[8, '2018-07-29T09:01:37+01:00'],
				[9, '2018-07-29T09:01:38+01:00'],
				[10, '2018-07-29T09:01:39+01:00'],
				[11, '2018-07-29T09:01:40+01:00'],
				[12, '2018-07-29T09:01:41+01:00'],
				[13, '2018-07-29T09:01:42+01:00'],
				[14, '2018-07-29T09:01:43+01:00'],
				[15, '2018-07-29T09:01:44+01:00'],
			]
			priceTime.forEach((p) => {
				mockDate(p[1])
				ohlc.push(p[0])
			})
			mockDate('2018-07-29T09:01:45+01:00')
			expect(ohlc.getCurrent()).toBe(false)
		})
		it('calculates prices that comes in same timestamp', ()=>{
			const ohlc = new utils.OHLC(5, 10)
			const priceTime = [
				[1, '2018-07-29T09:01:30+01:00'],
				[2, '2018-07-29T09:01:30+01:00'],
				[3, '2018-07-29T09:01:31+01:00'],
				[4, '2018-07-29T09:01:31+01:00'],
				[5, '2018-07-29T09:01:32+01:00'],
				[6, '2018-07-29T09:01:32+01:00'],
				[7, '2018-07-29T09:01:33+01:00'],
				[8, '2018-07-29T09:01:33+01:00'],
				[9, '2018-07-29T09:01:34+01:00'],
				[10, '2018-07-29T09:01:34+01:00'],
				[11, '2018-07-29T09:01:35+01:00'],
				[12, '2018-07-29T09:01:35+01:00'],
				[13, '2018-07-29T09:01:36+01:00'],
				[14, '2018-07-29T09:01:36+01:00'],
				[15, '2018-07-29T09:01:37+01:00'],
			]
			priceTime.forEach((p) => {
				mockDate(p[1])
				ohlc.push(p[0])
			})
			expect(ohlc.get()).toEqual({o: 1, h: 10, l:1, c:10})
		})
		it('Get ohlc with offset, default is 0', ()=>{
			const ohlc = new utils.OHLC(5, 10)
			const priceTime = [
				[1, '2018-07-29T09:01:30+01:00'],
				[2, '2018-07-29T09:01:31+01:00'],
				[3, '2018-07-29T09:01:35+01:00'],
				[4, '2018-07-29T09:01:36+01:00'],
				[5, '2018-07-29T09:01:40+01:00'],
				[6, '2018-07-29T09:01:41+01:00'],
				[7, '2018-07-29T09:01:45+01:00'],
				[8, '2018-07-29T09:01:46+01:00'],
				[9, '2018-07-29T09:01:50+01:00'],
				[10, '2018-07-29T09:01:51+01:00'],
				[11, '2018-07-29T09:01:55+01:00'],
				[12, '2018-07-29T09:01:56+01:00'],
				[13, '2018-07-29T09:02:00+01:00'],
				[14, '2018-07-29T09:02:01+01:00'],
				[15, '2018-07-29T09:02:05+01:00'],
			]
			priceTime.forEach((p) => {
				mockDate(p[1])
				ohlc.push(p[0])
			})
			expect(ohlc.get()).toEqual({o: 13, h: 14, l:13, c:14})
			expect(ohlc.get(0)).toEqual({o: 13, h: 14, l:13, c:14})
			expect(ohlc.get(1)).toEqual({o: 11, h: 12, l:11, c:12})
			expect(ohlc.get(2)).toEqual({o: 9, h: 10, l:9, c:10})
		})
		it('gets false if offset too large or no data or invalid number', ()=>{
			const ohlc = new utils.OHLC(5, 10)
			const priceTime = [
				[1, '2018-07-29T09:01:30+01:00'],
				[2, '2018-07-29T09:01:31+01:00'],
				[3, '2018-07-29T09:01:35+01:00'],
				[4, '2018-07-29T09:01:36+01:00'],
				[5, '2018-07-29T09:01:40+01:00'],
				[6, '2018-07-29T09:01:41+01:00'],
				[7, '2018-07-29T09:01:45+01:00'],
				[8, '2018-07-29T09:01:46+01:00'],
				[9, '2018-07-29T09:01:50+01:00'],
				[10, '2018-07-29T09:01:51+01:00'],
				[11, '2018-07-29T09:01:55+01:00'],
				[12, '2018-07-29T09:01:56+01:00'],
				[13, '2018-07-29T09:02:00+01:00'],
				[14, '2018-07-29T09:02:01+01:00'],
				[15, '2018-07-29T09:02:05+01:00'],
			]
			priceTime.forEach((p) => {
				mockDate(p[1])
				ohlc.push(p[0])
			})
			expect(ohlc.get('1')).toEqual(false)
			expect(ohlc.get('a')).toEqual(false)
			expect(ohlc.get(-1)).toEqual(false)
			expect(ohlc.get(11)).toEqual(false)
			expect(ohlc.get(7)).toEqual(false)
		})
		it('gets false if offset has no candle (data gap)', ()=>{
			const ohlc = new utils.OHLC(5, 10)
			const priceTime = [
				[1, '2018-07-29T09:01:30+01:00'],
				[2, '2018-07-29T09:01:31+01:00'],
				[3, '2018-07-29T09:01:35+01:00'],
				[4, '2018-07-29T09:01:36+01:00'],
				[5, '2018-07-29T09:01:40+01:00'],
				[6, '2018-07-29T09:01:41+01:00'],
				[7, '2018-07-29T09:01:45+01:00'],
				[8, '2018-07-29T09:01:46+01:00'],
				[9, '2018-07-29T09:01:50+01:00'],
				[10, '2018-07-29T09:01:51+01:00'],
				//[11, '2018-07-29T09:01:55+01:00'], data gap
				//[12, '2018-07-29T09:01:56+01:00'], data gap
				[13, '2018-07-29T09:02:00+01:00'],
				[14, '2018-07-29T09:02:01+01:00'],
				[15, '2018-07-29T09:02:05+01:00'],
			]
			priceTime.forEach((p) => {
				mockDate(p[1])
				ohlc.push(p[0])
			})
			expect(ohlc.get(1)).toBe(false)
			mockDate('2018-07-29T09:02:10+01:00')
			expect(ohlc.get()).toBe(false)
		})
		it('deletes candles that are outside the retention bucket number', ()=>{
			const ohlc = new utils.OHLC(5, 2)
			const priceTime = [
				[1, '2018-07-29T09:01:30+01:00'],
				[2, '2018-07-29T09:01:31+01:00'],
				[3, '2018-07-29T09:01:35+01:00'],
				[4, '2018-07-29T09:01:36+01:00'],
				[5, '2018-07-29T09:01:40+01:00'],
				[6, '2018-07-29T09:01:41+01:00'],
				[7, '2018-07-29T09:01:45+01:00'],
				[8, '2018-07-29T09:01:46+01:00'],
				[9, '2018-07-29T09:01:50+01:00'],
				[10, '2018-07-29T09:01:51+01:00'],
				[11, '2018-07-29T09:01:55+01:00'],
				[12, '2018-07-29T09:01:56+01:00'],
				[13, '2018-07-29T09:02:00+01:00'],
				[14, '2018-07-29T09:02:01+01:00'],
				[15, '2018-07-29T09:02:05+01:00'],
			]
			priceTime.forEach((p) => {
				mockDate(p[1])
				ohlc.push(p[0])
			})
			expect(ohlc.candles.length).toBe(2)
		})
		it('returns false if ohlc not yet established', ()=>{
			const ohlc = new utils.OHLC(5, 2)
			const priceTime = [
				[1, '2018-07-29T09:01:30+01:00'],
				[2, '2018-07-29T09:01:31+01:00'],
				[3, '2018-07-29T09:01:32+01:00'],
				[4, '2018-07-29T09:01:33+01:00'],
				[5, '2018-07-29T09:01:34+01:00'],
			]
			priceTime.forEach((p) => {
				mockDate(p[1])
				ohlc.push(p[0])
			})
			expect(ohlc.get()).toBe(false)
		})
		it('doesnt calculate prices that are not numbers', ()=>{
			const ohlc = new utils.OHLC(10, 1)
			const priceTime = [
				[null,      '2018-07-29T09:01:30+01:00'],
				[{data: 1}, '2018-07-29T09:01:31+01:00'],
				[8,         '2018-07-29T09:01:32+01:00'],
				[7,         '2018-07-29T09:01:33+01:00'],
				['4',       '2018-07-29T09:01:34+01:00'],
				[5,         '2018-07-29T09:01:35+01:00'],
				[9,         '2018-07-29T09:01:36+01:00'],
				[undefined, '2018-07-29T09:01:37+01:00'],
				[1,         '2018-07-29T09:01:40+01:00'],
			]
			priceTime.forEach((p) => {
				mockDate(p[1])
				ohlc.push(p[0])
			})
			expect(ohlc.get()).toEqual({o: 8, h: 9, l: 5, c: 9})
		})
	})

	describe('has MovingOHLC class', ()=>{
		it('Has movingOhlc class', ()=>{
			const mohlc = new utils.MovingOHLC(1, 1)
			expect(mohlc).toBeInstanceOf(utils.MovingOHLC)
		})
		it('Initiate the mohlc instance with constructor', ()=>{
			const agg = 10
			const len = 5
			const ohlc = new utils.MovingOHLC(agg, len)
			expect(ohlc.agg).toBe(agg)
			expect(ohlc.len).toBe(len)
			expect(ohlc.ticks).toEqual([])
		})
		it('Cannot create an mohlc without aggregation time or retention number', ()=>{
			expect(() => new utils.MovingOHLC()).toThrow()
			expect(() => new utils.MovingOHLC(1)).toThrow()
			expect(() => new utils.MovingOHLC(undefined, 1)).toThrow()
		})
		it('Cannot create a mohlc with non-integer args', ()=>{
			expect(() => new utils.MovingOHLC('1', 1)).toThrow()
			expect(() => new utils.MovingOHLC(1, '1')).toThrow()
			expect(() => new utils.MovingOHLC('1', '1')).toThrow()
		})
		it('Create mohlc with length in seconds', ()=>{
			jest.spyOn(utils, 'getSecond')
			const ohlc = new utils.MovingOHLC(5, 3)
			const prices = [1,2,3,4,5,6,7,8, 9, 10]
			prices.forEach((p, i) => {
				utils.getSecond.mockReturnValue(i)
				ohlc.push(p)
			})
			expect(ohlc.ticks.length).toBe(prices.length)
			expect(ohlc.ticks[0]).toEqual([0, 1])
			//expect(ohlc.get()).toEqual({o: 1, h: 8, l:1, c:8})
		})
		it('Deletes old ticks that are behind the allowed retention period',()=>{
			jest.spyOn(utils, 'getSecond')
			const agg = 3
			const len = 3
			const ohlc = new utils.MovingOHLC(agg, len)
			const prices = [1,2,3,4,5,6,7,8, 9, 10, 11, 12]
			prices.forEach((p, i) => {
				utils.getSecond.mockReturnValue(i)
				ohlc.push(p)
			})
			expect(ohlc.ticks.length).toBe(len * agg)
			expect(ohlc.ticks[0]).toEqual([3, 4])
		})
		it('Calculates prices that came with same timestamp',()=>{
			jest.spyOn(utils, 'getSecond')
			const agg = 3
			const len = 3
			const ohlc = new utils.MovingOHLC(agg, len)
			const prices = [1,2,3,4,5,6,7,8, 9, 10, 11, 12]
			prices.forEach((p, i) => {
				utils.getSecond.mockReturnValue(Math.floor(i/2))
				ohlc.push(p)
			})
			expect(ohlc.ticks.length).toBe(prices.length)
			expect(ohlc.ticks[0]).toEqual([0, 1])
			expect(ohlc.ticks[1]).toEqual([0, 2])
		})
		it('Gets moving ohlc with default offset of 0 and with custom offsets', ()=>{
			jest.spyOn(utils, 'getSecond')
			const agg = 3
			const len = 3
			const ohlc = new utils.MovingOHLC(agg, len)
			const prices = [1,9,3,4,11,6,7,8, 12, 10, 11, 5]
			prices.forEach((p, i) => {
				utils.getSecond.mockReturnValue(i)
				ohlc.push(p)
			})
			expect(ohlc.get()).toEqual({o:10 , h:11, l:5, c:5})
			expect(ohlc.get(0)).toEqual({o:10 , h:11, l:5, c:5})
			expect(ohlc.get(1)).toEqual({o:7 , h:12, l:7, c:12})
			expect(ohlc.get(2)).toEqual({o:4 , h:11, l:4, c:6})
		})
		it('Gets moving ohlc with offset with respect to data gaps', ()=>{
			jest.spyOn(utils, 'getSecond')
			const agg = 3
			const len = 3
			const ohlc = new utils.MovingOHLC(agg, len)
			const prices = [1,9,3,4,11,6,7,8, 12, 10, 11, 5]
			prices.forEach((p, i) => {
				utils.getSecond.mockReturnValue(i)
				if (i !== 8){
					ohlc.push(p)
				}

			})
			expect(ohlc.get()).toEqual({o:10 , h:11, l:5, c:5})
			expect(ohlc.get(1)).toEqual({o:7 , h:8, l:7, c:8})
		})
		it('gets false if offset too large or no data or invalid number', ()=>{
			jest.spyOn(utils, 'getSecond')
			const agg = 3
			const len = 3
			const ohlc = new utils.MovingOHLC(agg, len)
			const prices = [7,8, 12, 10, 11, 5]
			prices.forEach((p, i) => {
				utils.getSecond.mockReturnValue(i)
				ohlc.push(p)
			})
			expect(ohlc.get('1')).toEqual(false)
			expect(ohlc.get('a')).toEqual(false)
			expect(ohlc.get(-1)).toEqual(false)
			expect(ohlc.get(11)).toEqual(false)
			expect(ohlc.get(2)).toEqual(false)
		})
		it('gets false if offset has no candle (data gap)', ()=>{
			jest.spyOn(utils, 'getSecond')
			const agg = 3
			const len = 3
			const ohlc = new utils.MovingOHLC(agg, len)
			const prices = [7,8, 12, 10, 11, 5]
			prices.forEach((p, i) => {
				utils.getSecond.mockReturnValue(i)
				if (i > 2) utils.getSecond.mockReturnValue(i + agg)
				ohlc.push(p)
			})
			expect(ohlc.get()).toEqual({o:10,h:11,l:5,c:5})
			expect(ohlc.get(1)).toEqual(false)
			expect(ohlc.get(2)).toEqual({o:7,h:12,l:7,c:12})
		})
		it('returns false if ohlc not yet established', ()=>{
			jest.spyOn(utils, 'getSecond')
			const agg = 3
			const len = 3
			const ohlc = new utils.MovingOHLC(agg, len)
			const prices = []
			prices.forEach((p, i) => {
				utils.getSecond.mockReturnValue(i)
				ohlc.push(p)
			})
			expect(ohlc.get()).toBe(false)
		})
		it('doesnt calculate prices that are not numbers', ()=>{
			jest.spyOn(utils, 'getSecond')
			const agg = 3
			const len = 6
			const ohlc = new utils.MovingOHLC(agg, len)
			const prices = [
				{a:1},8, 12,
				10, 11, '1',
				null, 23, 34,
				234, 22, undefined,
				10, 34, 2
			]
			prices.forEach((p, i) => {
				utils.getSecond.mockReturnValue(i)
				ohlc.push(p)
			})
			expect(ohlc.get()).toEqual({o:10, h:34, l:2, c:2})
			expect(ohlc.get(1)).toEqual({o: 234, h:234, l:22, c:22})
			expect(ohlc.get(2)).toEqual({o:23, h:34, l:23, c:34})
			expect(ohlc.get(3)).toEqual({o:10, h:11, l:10, c:11})
			expect(ohlc.get(4)).toEqual({o:8, h:12, l:8, c:12})
		})
	})

	describe('MarketWindow', ()=>{
		it('Has MarketWindow class', ()=>{
			const mw = new utils.MarketWindow(1000, 1400)
			expect(mw).toBeInstanceOf(utils.MarketWindow)
		})
		it('Initiate the MarketWindow instance with constructor', ()=>{
			const startTime = 900 // sma buckets
			const endTime = 1000 // buckets
			const mw = new utils.MarketWindow(startTime, endTime)
			expect(mw.sTime).toBe(startTime)
			expect(mw.eTime).toBe(endTime)
		})
		it('Cannot create an MarketWindow with missing parameters', ()=>{
			expect(() => new utils.MarketWindow(undefined, 1300)).toThrow()
			expect(() => new utils.MarketWindow(1100, undefined)).toThrow()
			expect(() => new utils.MarketWindow(undefined, undefined)).toThrow()
		})
		it('Cannot create an MarketWindow with non-integer args', ()=>{
			const param = [60, '60', 'sixty', {sixty: 60}, true]
			param.forEach((p1, i1) => {
				param.forEach((p2, i2) => {
					if ((i1 + i2) > 0){
						expect(() => new utils.MarketWindow(p1, p2)).toThrow()
					}
				})
			})
		})
		it('Cannot create an marketWindow with value less than 0 or larger than 2359', ()=>{
			expect(() => new utils.MarketWindow(0, 1000)).toBeTruthy()
			expect(() => new utils.MarketWindow(-1, 1000)).toThrow()
			expect(() => new utils.MarketWindow(2359, 1000)).toBeTruthy()
			expect(() => new utils.MarketWindow(2400, 1000)).toThrow()
			expect(() => new utils.MarketWindow(1000, 0)).toBeTruthy()
			expect(() => new utils.MarketWindow(1000, -1)).toThrow()
			expect(() => new utils.MarketWindow(1000, 2359)).toBeTruthy()
			expect(() => new utils.MarketWindow(1000, 2400)).toThrow()
		})
		it('returns false if current time is before or after market window', ()=> {
			const mw = new utils.MarketWindow(1100, 1200)
			jest.spyOn(utils,'getTime')
			for (let i = 0; i < 1100; i++){
				utils.getTime.mockReturnValue(i)
				expect(mw.get()).toBe(false)
			}
			for (let i = 1100; i <= 1200; i++){
				utils.getTime.mockReturnValue(i)
				expect(mw.get()).toBe(true)
			}
			for (let i = 1201; i <= 2359; i++){
				utils.getTime.mockReturnValue(i)
				expect(mw.get()).toBe(false)
			}
		})
	})

	describe('Ticker class tells if this tick falls in a new bucket, like is_new_minute', ()=>{
		it('Has Ticker class', ()=>{
			const tc = new utils.Ticker(60)
			expect(tc).toBeInstanceOf(utils.Ticker)
		})
		it('Initiate the Ticker instance with constructor', ()=>{
			const bucket_sz = 60
			const tc = new utils.Ticker(bucket_sz)
			expect(tc.bucket_sz).toBe(bucket_sz)
		})
		it('Cannot create an Ticker with missing parameters', ()=>{
			expect(() => new utils.Ticker(undefined)).toThrow()
		})
		it('Cannot create an Ticker with non-integer args', ()=>{
			const param = ['60', 'sixty', {sixty: 60}, true]
			param.forEach((p1) => {
				expect(() => new utils.Ticker(p1)).toThrow()
			})
		})
		it('Cannot create an Ticker with value less than 1', ()=>{
			expect(() => new utils.Ticker(1)).toBeTruthy()
			expect(() => new utils.Ticker(0)).toThrow()
			expect(() => new utils.Ticker(-1)).toThrow()
			expect(() => new utils.Ticker(-60)).toThrow()
		})
		it('It has helper function to get the current timebucket according to bucket size', ()=>{
			jest.spyOn(utils, 'getTimeBucket')
			const tc = new utils.Ticker(60)
			expect(utils.getTimeBucket).not.toHaveBeenCalled()
			const a = tc.bucket()
			expect(a).toBe(utils.getTimeBucket(tc.bucket_sz))
			expect(utils.getTimeBucket).toHaveBeenCalledWith(tc.bucket_sz)
		})
		it('returns true if this is a new bucket', ()=>{
			const tc = new utils.Ticker(60)
			const time = [
				[true, '2018-07-29T09:01:30+01:00'],
				[false, '2018-07-29T09:01:59+01:00'],
				[true, '2018-07-29T09:02:00+01:00'],
				[false, '2018-07-29T09:02:36+01:00'],
				[false, '2018-07-29T09:02:39+01:00'],
				[true, '2018-07-29T09:03:40+01:00'],
				[false, '2018-07-29T09:03:44+01:00'],
			]
			time.forEach((t) => {
				mockDate(t[1])
				expect(tc.isNewBucket()).toBe(t[0])
			})
		})
	})

	describe('SMA', ()=>{
		it('Has sma class', ()=>{
			const sma = new utils.SMA(3,6, 60)
			expect(sma).toBeInstanceOf(utils.SMA)
		})
		it('Initiate the sma instance with constructor', ()=>{
			const len = 3 // sma buckets
			const retention = 6 // buckets
			const bucket_sz = 60 // seconds
			const sma = new utils.SMA(len, retention, bucket_sz)
			expect(sma.len).toBe(len)
			expect(sma.ret).toBe(retention)
			expect(sma.bucket_sz).toBe(bucket_sz)
			expect(sma.buckets).toEqual([])
			expect(sma.buffer).toEqual({bucket: null, prices: []})
		})
		it('Cannot create an sma with missing parameters', ()=>{
			expect(() => new utils.SMA(undefined, undefined, undefined)).toThrow()
			expect(() => new utils.SMA(undefined, undefined, 60)).toThrow()
			expect(() => new utils.SMA(undefined, 10, undefined)).toThrow()
			expect(() => new utils.SMA(undefined, 10, 60)).toThrow()
			expect(() => new utils.SMA(10, undefined, undefined)).toThrow()
			expect(() => new utils.SMA(10, undefined, 60)).toThrow()
			expect(() => new utils.SMA(10, 10, undefined)).toThrow()
		})
		it('Cannot create an sma with non-integer args', ()=>{
			const param = [60, '60', 'sixty', {sixty: 60}, true]
			param.forEach((p1, i1) => {
				param.forEach((p2, i2) => {
					param.forEach((p3, i3) => {
						if ((i1 + i2 + i3) > 0){
							expect(() => new utils.SMA(p1, p2, p3)).toThrow()
						}
					})
				})
			})
		})
		it('Cannot create an sma with length or retention less than 2', ()=>{
			expect(() => new utils.SMA(1, 10, 60)).toThrow()
			expect(() => new utils.SMA(10, 1, 60)).toThrow()
			expect(() => new utils.SMA(1, 1, 60)).toThrow()
		})
		it('Create an sma with length smaller than retention', ()=>{
			for (let i = 0; i < 10; i++){
				let len = Math.floor(Math.random() * 100) + 2
				let ret = Math.floor(Math.random() * 100) + len
				let sma = new utils.SMA(len, ret, 60)
				expect(sma.len).toBe(len)
				expect(sma.ret).toBe(ret)
				expect(sma).toBeInstanceOf(utils.SMA)
			}
		})
		it('Cannot create an sma with length larger than retention', ()=>{
			for (let i = 0; i < 10; i++){
				let len = Math.floor(Math.random() * 100) + 2
				let ret = len - 1
				expect(() => new utils.SMA(len, ret, 60)).toThrow()
			}
		})
		it('Create an sma with retention 0, means infinity', ()=>{
			for (let i = 0; i < 10; i++){
				let len = Math.floor(Math.random() * 100) + 2
				let ret = 0
				let sma = new utils.SMA(len, ret, 60)
				expect(sma.len).toBe(len)
				expect(sma.ret).toBe(ret)
				expect(sma).toBeInstanceOf(utils.SMA)
			}
		})
		it('It has helper function to get the current timebucket according to bucket size', ()=>{
			jest.spyOn(utils, 'getTimeBucket')
			const sma = new utils.SMA(2, 2, 60)
			expect(utils.getTimeBucket).not.toHaveBeenCalled()
			const a = sma.bucket()
			expect(a).toBe(utils.getTimeBucket(sma.bucket_sz))
			expect(utils.getTimeBucket).toHaveBeenCalledWith(sma.bucket_sz)
		})
		it('Move buffer to buckets if current timestamp is newer than latest bucket.',()=>{
			const sma = new utils.SMA(2, 20, 5)
			jest.spyOn(sma, 'bucket')
			sma.bucket.mockReturnValue(1)
			sma.push(10)
			expect(sma.buffer.bucket).toBe(1)
			sma.push(11)
			expect(sma.buffer).toEqual({bucket: 1, prices:[10, 11]})
			expect(sma.buckets.length).toBe(0)

			sma.bucket.mockReturnValue(2)
			sma.push(12)
			expect(sma.buffer.bucket).toBe(2)
			sma.push(13)
			expect(sma.buffer).toEqual({bucket: 2, prices:[12, 13]})
			expect(sma.buckets.length).toBe(1)
			expect(sma.buckets[0]).toEqual({bucket:1, prices:[10,11]})
		})
		it('Only calculates entries within the bucket size (create buckets)', ()=>{
			const sma = new utils.SMA(2, 10, 5)
			const priceTime = [
				[1, '2018-07-29T09:01:30+01:00'],
				[2, '2018-07-29T09:01:31+01:00'],
				[3, '2018-07-29T09:01:32+01:00'],
				[4, '2018-07-29T09:01:33+01:00'],
				[5, '2018-07-29T09:01:34+01:00'],

				[6, '2018-07-29T09:01:35+01:00'],
				[7, '2018-07-29T09:01:36+01:00'],
				[8, '2018-07-29T09:01:37+01:00'],
				[9, '2018-07-29T09:01:38+01:00'],
				[10, '2018-07-29T09:01:39+01:00'],

				[11, '2018-07-29T09:01:40+01:00'],
				[12, '2018-07-29T09:01:41+01:00'],
				[13, '2018-07-29T09:01:42+01:00'],
				[14, '2018-07-29T09:01:43+01:00'],
				[15, '2018-07-29T09:01:44+01:00'],
			]
			priceTime.forEach((p) => {
				mockDate(p[1])
				sma.push(p[0])
			})
			expect(sma.buckets).toEqual([
				{bucket:expect.anything(), prices: [1,2,3,4,5]},
				{bucket:expect.anything(), prices: [6,7,8,9,10]}
			])
			expect(sma.get()).toBeCloseTo(7.5, 5)
		})
		it('calculates prices that comes in same timestamp', ()=>{
			const sma = new utils.SMA(2, 0, 5)
			const priceTime = [
				[1, '2018-07-29T09:01:30+01:00'],
				[2, '2018-07-29T09:01:30+01:00'],
				[3, '2018-07-29T09:01:31+01:00'],
				[4, '2018-07-29T09:01:31+01:00'],
				[5, '2018-07-29T09:01:32+01:00'],
				[6, '2018-07-29T09:01:32+01:00'],
				[7, '2018-07-29T09:01:33+01:00'],
				[8, '2018-07-29T09:01:33+01:00'],
				[9, '2018-07-29T09:01:34+01:00'],
				[10, '2018-07-29T09:01:34+01:00'],
				[11, '2018-07-29T09:01:35+01:00'],
				[12, '2018-07-29T09:01:35+01:00'],
				[13, '2018-07-29T09:01:36+01:00'],
				[14, '2018-07-29T09:01:36+01:00'],
				[15, '2018-07-29T09:01:37+01:00'],
				[15, '2018-07-29T09:01:38+01:00'],
				[15, '2018-07-29T09:01:39+01:00'],
				[15, '2018-07-29T09:01:40+01:00'],
			]
			priceTime.forEach((p) => {
				mockDate(p[1])
				sma.push(p[0])
			})
			expect(sma.buckets).toEqual([
				{bucket:expect.anything(), prices: [1,2,3,4,5,6,7,8,9,10]},
				{bucket:expect.anything(), prices: [11,12,13,14,15,15,15]}
			])
			expect(sma.get()).toBeCloseTo(12.5,5)
		})
		it('Get sma with offset, default is 0', ()=>{
			const sma = new utils.SMA(2, 0, 5)
			const priceTime = [
				[1, '2018-07-29T09:01:30+01:00'],
				[2, '2018-07-29T09:01:31+01:00'],

				[3, '2018-07-29T09:01:35+01:00'],
				[4, '2018-07-29T09:01:36+01:00'],

				[5, '2018-07-29T09:01:40+01:00'],
				[6, '2018-07-29T09:01:41+01:00'],

				[7, '2018-07-29T09:01:45+01:00'],
				[8, '2018-07-29T09:01:46+01:00'],

				[9, '2018-07-29T09:01:50+01:00'],
				[10, '2018-07-29T09:01:51+01:00'],

				[11, '2018-07-29T09:01:55+01:00'],
				[12, '2018-07-29T09:01:56+01:00'],

				[13, '2018-07-29T09:02:00+01:00'],
				[14, '2018-07-29T09:02:01+01:00'],

				[15, '2018-07-29T09:02:05+01:00'],
			]
			priceTime.forEach((p) => {
				mockDate(p[1])
				sma.push(p[0])
			})
			expect(sma.get() ).toBeCloseTo(13, 5)
			expect(sma.get(0)).toBeCloseTo(13, 5)
			expect(sma.get(1)).toBeCloseTo(11, 5)
			expect(sma.get(2)).toBeCloseTo(9, 5)
		})
		it('gets false if offset too large or no data or invalid number', ()=>{
			const sma = new utils.SMA(3, 0, 5)
			const priceTime = [
				[1, '2018-07-29T09:01:30+01:00'],
				[2, '2018-07-29T09:01:31+01:00'],

				[3, '2018-07-29T09:01:35+01:00'],
				[4, '2018-07-29T09:01:36+01:00'],

				[5, '2018-07-29T09:01:40+01:00'],
				[6, '2018-07-29T09:01:41+01:00'],

				[7, '2018-07-29T09:01:45+01:00'],
				[8, '2018-07-29T09:01:46+01:00'],

				[9, '2018-07-29T09:01:50+01:00'],
				[10, '2018-07-29T09:01:51+01:00'],

				[11, '2018-07-29T09:01:55+01:00'],
				[12, '2018-07-29T09:01:56+01:00'],

				[13, '2018-07-29T09:02:00+01:00'],
				[14, '2018-07-29T09:02:01+01:00'],

				[15, '2018-07-29T09:02:05+01:00'],
			]
			priceTime.forEach((p) => {
				mockDate(p[1])
				sma.push(p[0])
			})
			expect(sma.get('1')).toBe(false)
			expect(sma.get('a')).toBe(false)
			expect(sma.get(-1) ).toBe(false)
			expect(sma.get(11) ).toBe(false)
			expect(sma.get(8)  ).toBe(false)
		})
		it('gets false if offset has no sma (data gap)', ()=>{
			const sma = new utils.SMA(3, 0, 5)
			const priceTime = [
				[1, '2018-07-29T09:01:30+01:00'],
				[2, '2018-07-29T09:01:31+01:00'],
				[3, '2018-07-29T09:01:35+01:00'],
				[4, '2018-07-29T09:01:36+01:00'],
				[5, '2018-07-29T09:01:40+01:00'],
				[6, '2018-07-29T09:01:41+01:00'],
				//[7, '2018-07-29T09:01:45+01:00'], data gap
				//[8, '2018-07-29T09:01:46+01:00'], data gap
				//[9, '2018-07-29T09:01:50+01:00'], data gap
				//[10, '2018-07-29T09:01:51+01:00'], data gap
				//[11, '2018-07-29T09:01:55+01:00'], data gap
				//[12, '2018-07-29T09:01:56+01:00'], data gap
				[13, '2018-07-29T09:02:00+01:00'],
				[14, '2018-07-29T09:02:01+01:00'],
				[15, '2018-07-29T09:02:05+01:00'],
			]
			priceTime.forEach((p) => {
				mockDate(p[1])
				sma.push(p[0])
			})
			expect(sma.get(1)).toBe(false)
		})
		it('calculate sma dispite missing buckets', ()=>{
			const sma = new utils.SMA(3, 0, 5)
			const priceTime = [
				[1, '2018-07-29T09:01:30+01:00'],
				[2, '2018-07-29T09:01:31+01:00'],
				[3, '2018-07-29T09:01:35+01:00'],
				[4, '2018-07-29T09:01:36+01:00'],
				[5, '2018-07-29T09:01:40+01:00'],
				[6, '2018-07-29T09:01:41+01:00'],
				//[7, '2018-07-29T09:01:45+01:00'], data gap
				//[8, '2018-07-29T09:01:46+01:00'], data gap
				//[9, '2018-07-29T09:01:50+01:00'], data gap
				//[10, '2018-07-29T09:01:51+01:00'], data gap
				//[11, '2018-07-29T09:01:55+01:00'], data gap
				//[12, '2018-07-29T09:01:56+01:00'], data gap
				[13, '2018-07-29T09:02:00+01:00'],
				[14, '2018-07-29T09:02:01+01:00'],
				[15, '2018-07-29T09:02:05+01:00'],
			]
			priceTime.forEach((p) => {
				mockDate(p[1])
				sma.push(p[0])
			})
			expect(sma.get()).toBeCloseTo(14, 5)
			expect(sma.get(2)).toBeCloseTo(6, 5)
			expect(sma.get(3)).toBeCloseTo(5, 5)
		})
		it('Retain buckets indefinitly if retention is 0', ()=>{
			const sma = new utils.SMA(2, 0, 60)
			jest.spyOn(sma, 'bucket')
			for (let i = 0; i < 10; i++){
				sma.bucket.mockReturnValue(i)
				sma.push(i + 10)
			}
			expect(sma.buckets.length).toBe(9)
		})
		it('calculate sma even if not yet established', ()=>{
			const sma = new utils.SMA(3, 0, 5)
			const priceTime = [
				[1, '2018-07-29T09:01:30+01:00'],
				[2, '2018-07-29T09:01:31+01:00'],
				[3, '2018-07-29T09:01:35+01:00'],
			]
			priceTime.forEach((p) => {
				mockDate(p[1])
				sma.push(p[0])
			})
			expect(sma.get(0)).toBeCloseTo(2, 5)
		})
		it('deletes buckets that are outside the retention bucket number', ()=>{
			const sma = new utils.SMA(2, 2, 5)
			const priceTime = [
				[1, '2018-07-29T09:01:30+01:00'],
				[2, '2018-07-29T09:01:31+01:00'],
				[3, '2018-07-29T09:01:35+01:00'],
				[4, '2018-07-29T09:01:36+01:00'],
				[5, '2018-07-29T09:01:40+01:00'],
				[6, '2018-07-29T09:01:41+01:00'],
				[7, '2018-07-29T09:01:45+01:00'],
				[8, '2018-07-29T09:01:46+01:00'],
				[9, '2018-07-29T09:01:50+01:00'],
				[10, '2018-07-29T09:01:51+01:00'],
				[11, '2018-07-29T09:01:55+01:00'],
				[12, '2018-07-29T09:01:56+01:00'],
				[13, '2018-07-29T09:02:00+01:00'],
				[14, '2018-07-29T09:02:01+01:00'],
				[15, '2018-07-29T09:02:05+01:00'],
			]
			priceTime.forEach((p) => {
				mockDate(p[1])
				sma.push(p[0])
			})
			expect(sma.buckets.length).toBe(2)
		})
		it('returns false if no buckets yet', ()=>{
			const sma = new utils.SMA(2, 0, 5)
			const priceTime = [
				[1, '2018-07-29T09:01:30+01:00'],
				[2, '2018-07-29T09:01:31+01:00'],
				[3, '2018-07-29T09:01:32+01:00'],
				[4, '2018-07-29T09:01:33+01:00'],
				[5, '2018-07-29T09:01:34+01:00'],
			]
			priceTime.forEach((p) => {
				mockDate(p[1])
				sma.push(p[0])
			})
			expect(sma.get()).toBe(false)
		})
		it('doesnt calculate prices that are not numbers', ()=>{
			const sma = new utils.SMA(3, 0, 5)
			const priceTime = [
				[null,      '2018-07-29T09:01:30+01:00'],
				[{data: 1}, '2018-07-29T09:01:31+01:00'],
				[8,         '2018-07-29T09:01:32+01:00'],
				[7,         '2018-07-29T09:01:33+01:00'],
				['4',       '2018-07-29T09:01:34+01:00'],

				[5,         '2018-07-29T09:01:35+01:00'],
				[9,         '2018-07-29T09:01:36+01:00'],
				[undefined, '2018-07-29T09:01:37+01:00'],

				[1,         '2018-07-29T09:01:40+01:00'],
			]
			priceTime.forEach((p) => {
				mockDate(p[1])
				sma.push(p[0])
			})
			expect(sma.get()).toBeCloseTo(8, 5)
		})
	})

	describe('EMA', ()=>{
		it('Has ema class', ()=>{
			const ema = new utils.EMA(3,60)
			expect(ema).toBeInstanceOf(utils.EMA)
		})
		it('Initiate the ema instance with constructor', ()=>{
			const len = 3 // ema buckets
			const bucket_sz = 60 // seconds
			const ema = new utils.EMA(len, bucket_sz)
			expect(ema.len).toBe(len)
			expect(ema.bucket_sz).toBe(bucket_sz)
			expect(ema.buckets).toEqual([])
			expect(ema.buffer).toEqual({bucket: null, prices: []})
		})
		it('Cannot create an ema with missing parameters', ()=>{
			expect(() => new utils.EMA(undefined, undefined)).toThrow()
			expect(() => new utils.EMA(undefined, 60)).toThrow()
			expect(() => new utils.EMA(10, undefined)).toThrow()
		})
		it('Cannot create an ema with non-integer args', ()=>{
			const param = [60, '60', 'sixty', {sixty: 60}, true]
			param.forEach((p1, i1) => {
				param.forEach((p2, i2) => {
					if ((i1 + i2) > 0){
						expect(() => new utils.EMA(p1, p2)).toThrow()
					}
				})
			})
		})
		it('Cannot create an ema with length less than 2', ()=>{
			expect(() => new utils.SMA(1, 60)).toThrow()
			expect(() => new utils.SMA(0, 60)).toThrow()
		})
		it('It has helper function to get the current timebucket according to bucket size', ()=>{
			jest.spyOn(utils, 'getTimeBucket')
			const ema = new utils.EMA(2, 60)
			expect(utils.getTimeBucket).not.toHaveBeenCalled()
			const a = ema.bucket()
			expect(a).toBe(utils.getTimeBucket(ema.bucket_sz))
			expect(utils.getTimeBucket).toHaveBeenCalledWith(ema.bucket_sz)
		})
		it('has a ema formula function', ()=>{
			const vals1 = [
				[2, 2],
				[4, 3],
				[6, 4.5],
				[8, 6.25],
				[10, 8.125],
				[12, 10.0625],
				[14, 12.03125],
				[8, 10.015625],
				[9, 9.5078125],
				[10, 9.75390625],
				[11, 10.376953125],
				[12, 11.1884765625],
				[13, 12.09423828125],
				[14, 13.047119140625],
				[15, 14.0235595703125],
				[16, 15.0117797851563],
				[17, 16.0058898925781]
			]
			const vals2 = [
				[2, 2],
				[4, 2.8],
				[6, 4.08],
				[8, 5.648],
				[10, 7.3888],
				[12, 9.23328],
				[14, 11.139968],
				[8, 9.8839808],
				[9, 9.53038848],
				[10, 9.718233088],
				[11, 10.2309398528],
				[12, 10.93856391168],
				[13, 11.763138347008],
				[14, 12.6578830082048],
				[15, 13.5947298049229],
				[16, 14.5568378829537],
				[17, 15.5341027297722],
			]
			let emaLen = 3
			let ema = new utils.EMA(emaLen, 60)
			for (let i = 1; i < vals1.length; i++){
				let price = vals1[i][0]
				let prevEma = vals1[i-1][1]
				let expectedEma = vals1[i][1]
				expect(ema.calcEma(price, prevEma, emaLen)).toBeCloseTo(expectedEma)
			}
			emaLen = 4
			ema = new utils.EMA(emaLen, 60)
			for (let i = 1; i < vals2.length; i++){
				let price = vals2[i][0]
				let prevEma = vals2[i-1][1]
				let expectedEma = vals2[i][1]
				expect(ema.calcEma(price, prevEma, emaLen)).toBeCloseTo(expectedEma)
			}
		})
		it('Move buffer to buckets if current timestamp is newer than latest bucket.',()=>{
			const ema = new utils.EMA(2, 5)
			jest.spyOn(ema, 'bucket')
			ema.bucket.mockReturnValue(1)
			ema.push(10)
			expect(ema.buffer.bucket).toBe(1)
			ema.push(11)
			expect(ema.buffer).toEqual({bucket: 1, prices:[10, 11]})
			expect(ema.buckets.length).toBe(0)

			ema.bucket.mockReturnValue(2)
			ema.push(12)
			expect(ema.buffer.bucket).toBe(2)
			ema.push(13)
			expect(ema.buffer).toEqual({bucket: 2, prices:[12, 13]})
			expect(ema.buckets.length).toBe(1)
			expect(ema.buckets[0]).toEqual({bucket:1, prices:[10,11], ema: expect.anything()})
		})
		it('Calculates ema of each bucket when it is processed from buffer', ()=>{
			const ema = new utils.EMA(2, 5)
			jest.spyOn(ema, 'bucket')
			ema.bucket.mockReturnValue(1)
			ema.push(10)
			expect(ema.buffer.bucket).toBe(1)
			ema.push(11)
			expect(ema.buffer).toEqual({bucket: 1, prices:[10, 11]})
			expect(ema.buckets.length).toBe(0)

			ema.bucket.mockReturnValue(2)
			ema.push(12)
			expect(ema.buffer.bucket).toBe(2)
			ema.push(13)
			expect(ema.buffer).toEqual({bucket: 2, prices:[12, 13]})
			expect(ema.buckets.length).toBe(1)
			expect(ema.buckets[0].bucket).toBe(1)
			expect(ema.buckets[0].prices).toEqual([10,11])
			expect(ema.buckets[0].ema).toBeCloseTo(11, 5)
		})
		it('Only calculates entries within the bucket size (create buckets)', ()=>{
			const ema = new utils.EMA(2, 5)
			const priceTime = [
				[1, '2018-07-29T09:01:30+01:00'],
				[2, '2018-07-29T09:01:31+01:00'],
				[3, '2018-07-29T09:01:32+01:00'],
				[4, '2018-07-29T09:01:33+01:00'],
				[5, '2018-07-29T09:01:34+01:00'],

				[6, '2018-07-29T09:01:35+01:00'],
				[7, '2018-07-29T09:01:36+01:00'],
				[8, '2018-07-29T09:01:37+01:00'],
				[9, '2018-07-29T09:01:38+01:00'],
				[10, '2018-07-29T09:01:39+01:00'],

				[11, '2018-07-29T09:01:40+01:00'],
				[12, '2018-07-29T09:01:41+01:00'],
				[13, '2018-07-29T09:01:42+01:00'],
				[14, '2018-07-29T09:01:43+01:00'],
				[15, '2018-07-29T09:01:44+01:00'],
			]
			priceTime.forEach((p) => {
				mockDate(p[1])
				ema.push(p[0])
			})
			expect(ema.buckets).toEqual([
				{bucket:expect.anything(), prices: [1,2,3,4,5], ema: expect.anything()},
				{bucket:expect.anything(), prices: [6,7,8,9,10], ema: expect.anything()}
			])
			expect(ema.get()).toBeCloseTo(8.33333, 5)
		})
		it('calculates prices that comes in same timestamp', ()=>{
			const ema = new utils.EMA(2, 5)
			const priceTime = [
				[1, '2018-07-29T09:01:30+01:00'],
				[2, '2018-07-29T09:01:30+01:00'],
				[3, '2018-07-29T09:01:31+01:00'],
				[4, '2018-07-29T09:01:31+01:00'],
				[5, '2018-07-29T09:01:32+01:00'],
				[6, '2018-07-29T09:01:32+01:00'],
				[7, '2018-07-29T09:01:33+01:00'],
				[8, '2018-07-29T09:01:33+01:00'],
				[9, '2018-07-29T09:01:34+01:00'],
				[10, '2018-07-29T09:01:34+01:00'],
				[11, '2018-07-29T09:01:35+01:00'],
				[12, '2018-07-29T09:01:35+01:00'],
				[13, '2018-07-29T09:01:36+01:00'],
				[14, '2018-07-29T09:01:36+01:00'],
				[15, '2018-07-29T09:01:37+01:00'],
				[15, '2018-07-29T09:01:38+01:00'],
				[15, '2018-07-29T09:01:39+01:00'],
				[15, '2018-07-29T09:01:40+01:00'],
			]
			priceTime.forEach((p) => {
				mockDate(p[1])
				ema.push(p[0])
			})
			expect(ema.buckets).toEqual([
				{bucket:expect.anything(), prices: [1,2,3,4,5,6,7,8,9,10], ema: expect.anything()},
				{bucket:expect.anything(), prices: [11,12,13,14,15,15,15], ema: expect.anything()}
			])
			expect(ema.get()).toBeCloseTo(13.33333,5)
		})
		it('Get ema with offset, default is 0', ()=>{
			const ema = new utils.EMA(2, 5)
			const priceTime = [
				[1, '2018-07-29T09:01:30+01:00'],
				[2, '2018-07-29T09:01:31+01:00'],

				[3, '2018-07-29T09:01:35+01:00'],
				[4, '2018-07-29T09:01:36+01:00'],

				[5, '2018-07-29T09:01:40+01:00'],
				[6, '2018-07-29T09:01:41+01:00'],

				[7, '2018-07-29T09:01:45+01:00'],
				[8, '2018-07-29T09:01:46+01:00'],

				[9, '2018-07-29T09:01:50+01:00'],
				[10, '2018-07-29T09:01:51+01:00'],

				[11, '2018-07-29T09:01:55+01:00'],
				[12, '2018-07-29T09:01:56+01:00'],

				[13, '2018-07-29T09:02:00+01:00'],
				[14, '2018-07-29T09:02:01+01:00'],

				[15, '2018-07-29T09:02:05+01:00'],
			]
			priceTime.forEach((p) => {
				mockDate(p[1])
				ema.push(p[0])
			})
			expect(ema.get() ).toBeCloseTo(13.00137, 5)
			expect(ema.get(0)).toBeCloseTo(13.00137, 5)
			expect(ema.get(1)).toBeCloseTo(11.004115, 5)
			expect(ema.get(2)).toBeCloseTo(9.012345, 5)
		})
		it('gets false if offset too large or no data or invalid number', ()=>{
			const ema = new utils.EMA(3, 5)
			const priceTime = [
				[1, '2018-07-29T09:01:30+01:00'],
				[2, '2018-07-29T09:01:31+01:00'],

				[3, '2018-07-29T09:01:35+01:00'],
				[4, '2018-07-29T09:01:36+01:00'],

				[5, '2018-07-29T09:01:40+01:00'],
				[6, '2018-07-29T09:01:41+01:00'],

				[7, '2018-07-29T09:01:45+01:00'],
				[8, '2018-07-29T09:01:46+01:00'],

				[9, '2018-07-29T09:01:50+01:00'],
				[10, '2018-07-29T09:01:51+01:00'],

				[11, '2018-07-29T09:01:55+01:00'],
				[12, '2018-07-29T09:01:56+01:00'],

				[13, '2018-07-29T09:02:00+01:00'],
				[14, '2018-07-29T09:02:01+01:00'],

				[15, '2018-07-29T09:02:05+01:00'],
			]
			priceTime.forEach((p) => {
				mockDate(p[1])
				ema.push(p[0])
			})
			expect(ema.get('1')).toBe(false)
			expect(ema.get('a')).toBe(false)
			expect(ema.get(-1) ).toBe(false)
			expect(ema.get(11) ).toBe(false)
			expect(ema.get(8)  ).toBe(false)
		})
		it('gets false if offset has no ema (data gap)', ()=>{
			const ema = new utils.EMA(3, 5)
			const priceTime = [
				[1, '2018-07-29T09:01:30+01:00'],
				[2, '2018-07-29T09:01:31+01:00'],
				[3, '2018-07-29T09:01:35+01:00'],
				[4, '2018-07-29T09:01:36+01:00'],
				[5, '2018-07-29T09:01:40+01:00'],
				[6, '2018-07-29T09:01:41+01:00'],
				//[7, '2018-07-29T09:01:45+01:00'], data gap
				//[8, '2018-07-29T09:01:46+01:00'], data gap
				//[9, '2018-07-29T09:01:50+01:00'], data gap
				//[10, '2018-07-29T09:01:51+01:00'], data gap
				//[11, '2018-07-29T09:01:55+01:00'], data gap
				//[12, '2018-07-29T09:01:56+01:00'], data gap
				[13, '2018-07-29T09:02:00+01:00'],
				[14, '2018-07-29T09:02:01+01:00'],
				[15, '2018-07-29T09:02:05+01:00'],
			]
			priceTime.forEach((p) => {
				mockDate(p[1])
				ema.push(p[0])
			})
			expect(ema.get(1)).toBe(false)
		})
		it('calculate ema dispite missing buckets', ()=>{
			const ema = new utils.EMA(3, 5)
			const priceTime = [
				[1, '2018-07-29T09:01:30+01:00'],
				[2, '2018-07-29T09:01:31+01:00'],
				[3, '2018-07-29T09:01:35+01:00'],
				[4, '2018-07-29T09:01:36+01:00'],
				[5, '2018-07-29T09:01:40+01:00'],
				[6, '2018-07-29T09:01:41+01:00'],
				//[7, '2018-07-29T09:01:45+01:00'], data gap
				//[8, '2018-07-29T09:01:46+01:00'], data gap
				//[9, '2018-07-29T09:01:50+01:00'], data gap
				//[10, '2018-07-29T09:01:51+01:00'], data gap
				//[11, '2018-07-29T09:01:55+01:00'], data gap
				//[12, '2018-07-29T09:01:56+01:00'], data gap
				[13, '2018-07-29T09:02:00+01:00'],
				[14, '2018-07-29T09:02:01+01:00'],
				[15, '2018-07-29T09:02:05+01:00'],
			]
			priceTime.forEach((p) => {
				mockDate(p[1])
				ema.push(p[0])
			})
			expect(ema.get()).toBeCloseTo(9.25, 5)
			expect(ema.get(2)).toBeCloseTo(4.5, 5)
			expect(ema.get(3)).toBeCloseTo(4.5, 5)
		})
		it('Retain buckets indefinitly', ()=>{
			const ema = new utils.EMA(2, 60)
			jest.spyOn(ema, 'bucket')
			for (let i = 0; i < 100; i++){
				ema.bucket.mockReturnValue(i)
				ema.push(i + 10)
			}
			expect(ema.buckets.length).toBe(99)
		})
		it('calculate ema even if not yet established', ()=>{
			const ema = new utils.EMA(3, 5)
			const priceTime = [
				[1, '2018-07-29T09:01:30+01:00'],
				[2, '2018-07-29T09:01:31+01:00'],
				[3, '2018-07-29T09:01:35+01:00'],
			]
			priceTime.forEach((p) => {
				mockDate(p[1])
				ema.push(p[0])
			})
			expect(ema.get(0)).toBeCloseTo(2, 5)
		})
		it('returns false if no buckets yet', ()=>{
			const ema = new utils.EMA(2, 5)
			const priceTime = [
				[1, '2018-07-29T09:01:30+01:00'],
				[2, '2018-07-29T09:01:31+01:00'],
				[3, '2018-07-29T09:01:32+01:00'],
				[4, '2018-07-29T09:01:33+01:00'],
				[5, '2018-07-29T09:01:34+01:00'],
			]
			priceTime.forEach((p) => {
				mockDate(p[1])
				ema.push(p[0])
			})
			expect(ema.get()).toBe(false)
		})
		it('doesnt calculate prices that are not numbers', ()=>{
			const ema = new utils.EMA(3, 5)
			const priceTime = [
				[null,      '2018-07-29T09:01:30+01:00'],
				[{data: 1}, '2018-07-29T09:01:31+01:00'],
				[8,         '2018-07-29T09:01:32+01:00'],
				[7,         '2018-07-29T09:01:33+01:00'],
				['4',       '2018-07-29T09:01:34+01:00'],

				[5,         '2018-07-29T09:01:35+01:00'],
				[9,         '2018-07-29T09:01:36+01:00'],
				[undefined, '2018-07-29T09:01:37+01:00'],

				[1,         '2018-07-29T09:01:40+01:00'],
			]
			priceTime.forEach((p) => {
				mockDate(p[1])
				ema.push(p[0])
			})
			expect(ema.get()).toBeCloseTo(8, 5)
		})
	})
	describe('Dynamic extremes', ()=>{
		it('Has DynamicExtremes class', ()=>{
			const de = new utils.DynamicExtremes()
			expect(de).toBeInstanceOf(utils.DynamicExtremes)
		})
		it('Initiate the DynamicExtremes instance with constructor', ()=>{
			const de = new utils.DynamicExtremes()
			expect(de.max).toBeNull()
			expect(de.min).toBeNull()
		})
		it('updates the min and max properties when new value is pushed', ()=>{
			const de = new utils.DynamicExtremes()
			de.push(1)
			expect(de.max).toBe(1)
			expect(de.min).toBe(1)
			de.push(2)
			expect(de.max).toBe(2)
			expect(de.min).toBe(1)
			de.push(0)
			expect(de.max).toBe(2)
			expect(de.min).toBe(0)
			const a = [4,5,63,2,5,7,4,33,55,2,3,4,6,7,4,3]
			a.forEach(aa => de.push(aa))
			expect(de.max).toBe(63)
			expect(de.min).toBe(0)
		})
		it('resets min and max if reset is called', ()=> {
			const de = new utils.DynamicExtremes()
			de.min = 10
			de.max = 100
			de.reset()
			expect(de.min).toBe(null)
			expect(de.max).toBe(null)
		})
		it('returns min and max if get is called', ()=>{
			const de = new utils.DynamicExtremes()
			de.min = 10
			de.max = 100
			expect(de.get()).toEqual({min: 10, max: 100})
			de.min = null
			de.max = null
			expect(de.get()).toEqual({min: null, max: null})
			de.min = 1
			de.max = null
			de.push(2)
			expect(de.get()).toEqual({min: 1, max: 2})
			de.min = null
			de.max = 2
			de.push(1)
			expect(de.get()).toEqual({min: 1, max: 2})
		})
		it('ignores push values that are not numbers', ()=>{
			const de = new utils.DynamicExtremes()
			const a = [10, null, 'a', {a:1}, '1', true, false, undefined]
			a.forEach(aa => de.push(aa))
			expect(de.get()).toEqual({min: 10, max: 10})
		})
	})
	describe('AVG', ()=>{
		it('Has avg class', ()=>{
			const avg = new utils.Avg()
			expect(avg).toBeInstanceOf(utils.Avg)
		})
		it('Initiate the avg instance with constructor', ()=>{
			const avg = new utils.Avg()
			expect(avg.samples).toEqual([])
			expect(avg.avg).toBe(false)
		})
		it('pushes new values to samples', ()=>{
			const avg = new utils.Avg()
			const values = [1,3,5,6,7]
			values.forEach(v => avg.push(v))
			expect(avg.samples).toEqual(values)
		})
		it('calculates average on each push', () => {
			const avg = new utils.Avg()
			const values = [
				[1, 1],
				[3, 2],
				[5, 3],
				[6, 3.75],
				[7, 4.4]
			]
			values.forEach(v => {
				avg.push(v[0])
				expect(avg.avg).toBeCloseTo(v[1],3)
			})
		})
		it('has get method to get the average', () => {
			const avg = new utils.Avg()
			const values = [
				[1, 1],
				[3, 2],
				[5, 3],
				[6, 3.75],
				[7, 4.4]
			]
			values.forEach(v => {
				avg.push(v[0])
				expect(avg.get()).toBeCloseTo(v[1],3)
			})
		})
		it('has reset method to reset the samples', () => {
			const avg = new utils.Avg()
			const values = [
				[1, 1],
				[3, 2],
				[5, 3],
				[6, 3.75],
				[7, 4.4]
			]
			values.forEach(v => {
				avg.push(v[0])
			})
			avg.reset()
			expect(avg.get()).toBe(false)
			expect(avg.avg).toBe(false)
			expect(avg.samples).toEqual([])
		})
		it('get returns false if no samples', () => {
			const avg = new utils.Avg()
			expect(avg.get()).toBe(false)
		})
		it('doesnt take values that are not numbers', ()=>{
			const avg = new utils.Avg()
			const values = [
				[1, 1],
				[null, 1],
				[3, 2],
				[undefined, 2],
				[5, 3],
				[{a:1}, 3],
				[6, 3.75],
				['7', 3.75],
				[7, 4.4],
				['a', 4.4]
			]
			values.forEach(v => {
				avg.push(v[0])
				expect(avg.get()).toBeCloseTo(v[1],3)
			})
		})
	})

	it('Creates an ohlc instance', ()=>{
		const ohlc = utils.makeOhlc()
		expect(ohlc).toBeInstanceOf(utils.OHLC_deprecated)
	})
	it('Creates an ohlc object of a series of entries', ()=>{
		const ohlc = utils.makeOhlc()
		const i = [10,12,13,9,8,7,17,16,15]
		i.forEach(i_ => ohlc.push(i_))
		expect(ohlc.o).toBe(10)
		expect(ohlc.h).toBe(17)
		expect(ohlc.l).toBe(7)
		expect(ohlc.c).toBe(15)
	})
	it('Does not change ohlc if entry is invalid', ()=>{
		const ohlc = utils.makeOhlc()
		const i = [10,12,13,9,8,'abc',17,16,'abc']
		i.forEach(i_ => ohlc.push(i_))
		expect(ohlc.o).toBe(10)
		expect(ohlc.h).toBe(17)
		expect(ohlc.l).toBe(8)
		expect(ohlc.c).toBe(16)
	})
	it('Can merge flat objects setState', () => {
		let obj = {a: 1, b: 2, c: 3}
		const mod1 = {c: 4}
		const res1 =  {a: 1, b: 2, c: 4}
		utils.setState(obj, mod1)
		expect(obj).toEqual(res1)
		const mod2 = {c: 5, d: 6}
		const res2 = {a: 1, b: 2, c: 5}
		utils.setState(obj, mod2)
		expect(obj).toEqual(res2)
	})
})
