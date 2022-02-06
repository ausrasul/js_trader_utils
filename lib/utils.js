process.env.TZ = 'Europe/Stockholm'

/*****************
Initialization
*****************/
var child_process = require('child_process')
var fs = require('fs')
var readlineSync = require('readline-sync')
var Logger = require('tracer')
var serialNumber = 0

function padding(num) {
	return num.toString().padStart(2, '0')
}
function isWeekend(){
	var d = new Date()
	if (d.getDay() === 6 || d.getDay() === 0) return true
	return false
}
function todayDate() {
	var date = new Date()
	return date.getFullYear() + '-' + padding(date.getMonth() + 1) + '-' + padding(date.getDate())
}
function logger(instanceName){
	var L = Logger.dailyfile({
		root:'./output/',
		allLogsFileName: instanceName,
		level: 'log',
		maxLogFiles: 1000,
		format: [ '{{timestamp}} <{{title}}> {{file}}:{{line}}: {{message}}' ],
		dateformat: 'mmm dd HH:MM:ss.l'
		//dateformat: 'mmm dd HH:MM:ss.l HHMMssl'
	})
	return L
}
function getTime(d){
	if (d === undefined){
		d = new Date()
	}
	var time = (d.getHours() * 100) + d.getMinutes()
	return time
}
function getSecond(d){
	if (d === undefined){
		d = new Date()
	}
	var time = (d.getHours() * 10000) + (d.getMinutes() * 100) + d.getSeconds()
	return time
}
function getTimeBucket(length_sec, d){
	if (d === undefined){
		d = new Date()
	}
	return Math.floor((d.getTime()/1000)/length_sec)
}

class OHLC {
	constructor(aggregation_sec, candles_to_retain){
		if (!Number.isInteger(aggregation_sec) || !Number.isInteger(candles_to_retain)){
			throw 'Invalid arguments to OHLC'
		}
		this.buffer = {bucket: null, prices:[]}
		this.candles = []
		this.agg = aggregation_sec
		this.len = candles_to_retain
	}
	bucket(){
		return f.getTimeBucket(this.agg)
	}
	push(item){
		if (typeof(item) !== 'number') return
		const b = this.bucket()
		if (this.buffer.bucket === null) this.buffer.bucket = b
		if (this.buffer.bucket === b){
			this.buffer.prices.push(item)
		} else {
			this.candles.push(this.buffer)
			this.buffer = {bucket: b, prices: [item]}
		}
		while (
			this.candles.length > 0 &&
			this.candles[0].bucket < (this.bucket() - this.len)
		) this.candles.splice(0,1)
	}
	getCurrent(){
		const requiredBucket = this.bucket()
		if (this.buffer.bucket !== requiredBucket) return false
		const ohlc = {
			o: this.buffer.prices[0],
			c: this.buffer.prices[this.buffer.prices.length - 1],
			h: Math.max(...this.buffer.prices),
			l: Math.min(...this.buffer.prices)
		}
		return ohlc
	}
	get(offset){
		if (offset === undefined) offset = 0
		if (!Number.isInteger(offset) || offset < 0 || offset >= this.len) return false
		const requiredBucket = this.bucket() - offset - 1
		const candle = this.candles.find((c) => c.bucket === requiredBucket)
		if (candle === undefined) return false
		const ohlc = {
			o: candle.prices[0],
			c: candle.prices[candle.prices.length - 1],
			h: Math.max(...candle.prices),
			l: Math.min(...candle.prices)
		}
		return ohlc
	}
}

class SMA {
	constructor(sma_len, retention_buckets, bucket_sz){
		if (
			!Number.isInteger(sma_len) ||
			!Number.isInteger(retention_buckets) ||
			!Number.isInteger(bucket_sz) ||
			sma_len < 2 ||
			(retention_buckets > 0 && retention_buckets < sma_len)
		){
			throw 'Invalid arguments to SMA'
		}
		this.buffer = {bucket: null, prices:[]}
		this.buckets = []
		this.bucket_sz = bucket_sz // seconds
		this.ret = retention_buckets
		this.len = sma_len
	}
	bucket(){
		return f.getTimeBucket(this.bucket_sz)
	}
	push(item){
		if (typeof(item) !== 'number') return
		const b = this.bucket()
		if (this.buffer.bucket === null) this.buffer.bucket = b
		if (this.buffer.bucket === b){
			this.buffer.prices.push(item)
		} else {
			this.buckets.push(this.buffer)
			this.buffer = {bucket: b, prices: [item]}
		}
		while (
			this.ret > 0 &&
			this.buckets.length > 0 &&
			this.buckets[0].bucket < (this.bucket() - this.ret)
		) this.buckets.splice(0,1)
	}
	get(offset){
		if (offset === undefined) offset = 0
		if (!Number.isInteger(offset) || offset < 0) return false
		const eBucket = this.bucket() - offset - 1
		const sBucket = eBucket - this.len + 1
		const prices = []
		this.buckets.forEach(b => {
			if (b.bucket >= sBucket && b.bucket <= eBucket){
				prices.push(b.prices[b.prices.length - 1])
			}
		})
		if (prices.length === 0) return false
		return prices.reduce((p,acc)=> p + acc) / prices.length
	}
}

class EMA {
	constructor(ema_len, bucket_sz){
		if (
			!Number.isInteger(ema_len) ||
			!Number.isInteger(bucket_sz) //||
			//sma_len < 2 ||
		){
			throw 'Invalid arguments to EMA'
		}
		this.buffer = {bucket: null, prices:[]}
		this.buckets = []
		this.bucket_sz = bucket_sz // seconds
		this.len = ema_len
	}
	bucket(){
		return f.getTimeBucket(this.bucket_sz)
	}
	calcEma(price, prevEma, emaNum){
		return ((price - prevEma) * (2/(emaNum + 1)))+ prevEma
	}
	push(item){
		if (typeof(item) !== 'number') return
		const b = this.bucket()
		if (this.buffer.bucket === null) this.buffer.bucket = b
		if (this.buffer.bucket === b){
			this.buffer.prices.push(item)
		} else {
			let price = this.buffer.prices[this.buffer.prices.length - 1]
			if (this.buckets.length > 0){
				let prevEma = this.buckets[this.buckets.length - 1].ema
				this.buffer.ema = this.calcEma(price, prevEma, this.len)
			} else {
				this.buffer.ema = price
			}
			this.buckets.push(this.buffer)
			this.buffer = {bucket: b, prices: [item]}
		}
	}
	get(offset){
		if (offset === undefined) offset = 0
		if (!Number.isInteger(offset) || offset < 0) return false
		const eBucket = this.bucket() - offset - 1
		const sBucket = eBucket - this.len + 1
		let found = {ema: null, bucket: null}
		let i = this.buckets.length - 1

		while (
			this.buckets[i] &&
			(
				this.buckets[i].bucket >= eBucket ||
				(found.bucket > eBucket && this.buckets[i].bucket >= sBucket)
			)
		){
			found = {ema: this.buckets[i].ema, bucket: this.buckets[i].bucket}
			i -= 1
		}
		if (found.bucket > eBucket || found.bucket < sBucket){
			return false
		}
		return found.ema
	}
}

class MovingOHLC {
	constructor(aggregation_sec, candles_to_retain){
		this.ticks = []
		if (!Number.isInteger(aggregation_sec) || !Number.isInteger(candles_to_retain)){
			throw 'Invalid arguments to OHLC'
		}
		this.agg = aggregation_sec
		this.len = candles_to_retain
	}
	push(item){
		if (typeof(item) !== 'number') return
		const t = f.getSecond()
		this.ticks.push([t, item])
		while (
			this.ticks.length > 0 &&
			this.ticks[0][0] < (t - (this.len * this.agg) + 1)
		) this.ticks.splice(0,1)
	}
	get(offset){
		if (offset === undefined) offset = 0
		if (!Number.isInteger(offset) || offset < 0) return false
		const minTs = f.getSecond() - ((offset + 1) * this.agg) + 1
		const maxTs = minTs + this.agg - 1
		const prices = []
		this.ticks.forEach(tick => {
			if (tick[0] >= minTs && tick[0] <= maxTs){
				prices.push(tick[1])
			}
		})
		if (prices.length === 0) return false
		const ohlc = {
			o: prices[0],
			c: prices[prices.length - 1],
			h: Math.max(...prices),
			l: Math.min(...prices)
		}
		return ohlc
	}
}
class MarketWindow {
	constructor(sTime, eTime){
		if (
			!Number.isInteger(sTime) ||
			!Number.isInteger(eTime) ||
			sTime < 0 || sTime > 2359 ||
			eTime < 0 || eTime > 2359
		) {
			throw 'Invalid input'
		}
		this.sTime = sTime
		this.eTime = eTime
	}
	get(){
		const t = f.getTime()
		let ok = false
		if (t >= this.sTime && t <= this.eTime) ok = true
		return ok
	}
}

class Ticker {
	constructor(bucket_sz){
		if (
			!Number.isInteger(bucket_sz) ||
			bucket_sz < 1
		){
			throw 'Invalid arguments to Ticker'
		}
		this.bucket_sz = bucket_sz
		this.previousBucket = null
	}
	bucket(){
		return f.getTimeBucket(this.bucket_sz)
	}
	isNewBucket(){
		const b = this.bucket(this.bucket_sz)
		if (b !== this.previousBucket){
			this.previousBucket = b
			return true
		}
		return false
	}
}
class DynamicExtremes {
	constructor(){
		this.min = null
		this.max = null
	}
	push(val){
		if (typeof(val) !== 'number') return
		if (val < this.min || this.min === null) this.min = val
		if (val > this.max || this.max === null) this.max = val
	}
	get(){
		return {min: this.min, max: this.max}
	}
	reset(){
		this.min = null
		this.max = null
	}
}

class Avg{
	constructor(){
		this.samples = []
		this.avg = false
	}
	push(v){
		if (typeof(v) !== 'number') return
		this.samples.push(v)
		const sum = this.samples.reduce((acc, val)=> acc + val)
		this.avg = sum / this.samples.length
	}
	get(){
		return this.avg
	}
	reset(){
		this.samples = []
		this.avg = false
	}
}
class OHLC_deprecated {
	constructor(){
		this.o = null
		this.h = null
		this.l = null
		this.c = null
	}
	push(item){
		if (typeof(item) !== 'number') return
		if (this.o === null){
			this.o = item
			this.h = item
			this.l = item
		} else if (item > this.h){
			this.h = item
		} else if (item < this.l){
			this.l = item
		}
		this.c = item
	}
}
// modify the input object directly
function setState(obj, mod){
	Object.keys(mod).forEach(k => {
		if (obj[k] !== undefined) obj[k] = mod[k]
	})
}
const f = {
	setState: setState,
	OHLC: OHLC,
	MovingOHLC: MovingOHLC,
	SMA: SMA,
	EMA: EMA,
	DynamicExtremes: DynamicExtremes,
	MarketWindow: MarketWindow,
	Ticker: Ticker,
	Avg: Avg,
	OHLC_deprecated: OHLC_deprecated,
	makeOhlc: ()=>{ return new OHLC_deprecated()},
	padding: padding,
	isWeekend: isWeekend,
	todayDate: todayDate,
	getTime: getTime,
	getSecond: getSecond,
	logger: logger,
	getTimeBucket: getTimeBucket,
	getMarketDay: (configFile) => {
		// return  N=normal, C=closed, H=half
		if (isWeekend()){
			return 'C'
		}
		var days = JSON.parse(fs.readFileSync(configFile))
		switch ( days[todayDate()] ) {
		case undefined:
			return 'N'
		case 'H':
			return 'H'
		case 'C':
			return 'C'
		default:
			process.exit(1)
		}
	},
	alertMobile: (prio, msg) => {
		child_process.exec('./push.sh ' + prio + ' "' + msg + '"')
	},
	shiftTimeBack: (hhmm, minutes) =>{
		var hh = Math.floor(hhmm / 100)
		var mm = hhmm - (hh * 100)
		var d = new Date()
		d.setHours(hh)
		d.setMinutes(mm)
		d.setMinutes(d.getMinutes() - minutes)
		return getTime(d)
	},
	getSerial: ()=>{
		serialNumber += 1
		return serialNumber
	},
	getCredentials: () => {
		var username = readlineSync.question('username: ')
		var password = readlineSync.question('password: ', {  hideEchoBack: true })
		var totpSecret = readlineSync.question('2fa activation code: ', { hideEchoBack: true })
		return {username: username, password: password, totpSecret: totpSecret}
	},
	readConf: (confFile) => {
		var str = fs.readFileSync(confFile)
		var c = JSON.parse(str)
		if (c.accountId == undefined || c.indexId == undefined){
			global.console.log('Invalid account id')
			process.exit()
			return
		}
		if (!Number.isInteger(c.minInstPrice) || c.minInstPrice < 40) {
			global.console.log('Invalid minInstPrice, expected a value > 40')
			process.exit()
			return
		}
		if (c.betsize !== 'auto' && parseInt(c.betsize) !== c.betsize) {
			global.console.log('Invalid betsize, expected "auto" or integer')
			process.exit()
			return
		}
		if (!c.loginTime  || typeof(c.loginTime) !== 'number'){
			global.console.log('Invalid login time, expected integer')
			process.exit()
			return
		}
		if (!c.logoutTime  || typeof(c.logoutTime) !== 'number'){
			global.console.log('Invalid logout time, expected integer')
			process.exit()
			return
		}
		if (c.loginTime > c.logoutTime){
			global.console.log('Login time should be before logout time')
			process.exit()
			return
		}
		if (!c.tcpIp  || typeof(c.tcpIp) !== 'string'){
			global.console.log('Invalid Ip, expected string')
			process.exit()
			return
		}
		if (!c.tcpPort  || typeof(c.tcpPort) !== 'number'){
			global.console.log('Invalid tcp port, expected integer')
			process.exit()
			return
		}
		if (!c.marketDaysFile  || typeof(c.marketDaysFile) !== 'string'){
			global.console.log('Invalid marketDaysFile, expected string')
			process.exit()
			return
		}
		if (!c.instrumentsFile  || typeof(c.instrumentsFile) !== 'string'){
			global.console.log('Invalid instrumentsFile, expected string')
			process.exit()
			return
		}
		if (!c.halfDayEnd  || typeof(c.halfDayEnd) !== 'number'){
			global.console.log('Invalid halfDayEnd, expected integer')
			process.exit()
			return
		}
		if (!c.fullDayEnd  || typeof(c.fullDayEnd) !== 'number'){
			global.console.log('Invalid fullDayEnd, expected integer')
			process.exit()
			return
		}
		if (!c.dayStart  || typeof(c.dayStart) !== 'number'){
			global.console.log('Invalid dayStart, expected integer')
			process.exit()
			return
		}
		if (!c.logoutGraceTime || typeof(c.logoutGraceTime) !== 'number'){
			global.console.log('Invalid logoutGraceTime, expected integer')
			process.exit()
			return
		}
		if (!c.mmMinVolume || typeof(c.mmMinVolume) !== 'number'){
			global.console.log('Invalid mmMinVolume, expected integer')
			process.exit()
			return
		}
		if (!c.accountsString  || typeof(c.accountsString) !== 'string'){
			global.console.log('Invalid accountsString, expected string')
			process.exit()
			return
		}
		if (!c.clearing  || typeof(c.clearing) !== 'string'){
			global.console.log('Invalid clearing number, expected string')
			process.exit()
			return
		}
		return c
	},
	readInstruments: (confFile) => {
		var c = JSON.parse(fs.readFileSync(confFile))
		if (c.long === undefined ||
		(c.long && c.long.length < 1) ||
		c.short === undefined ||
		(c.short && c.short.length < 1)){
			process.exit('Invalid instrument file, it should have a short and long arrays that are not empty')
		}
		return c
	},
	getInstrumentByExpectedPrice: (allInstruments, indexPrice, minInstPrice, direction) => {
		if (direction !== 'long' && direction !== 'short'){
			throw 'Direction must be either long or short'
		}
		var instruments = JSON.parse(JSON.stringify(allInstruments[direction]))
		instruments.map((inst)=>{
			inst.expectedPrice = Math.abs(inst.finance_level - indexPrice)
		})
		instruments.sort((a,b) => {return a.expectedPrice - b.expectedPrice})
		var instrument = instruments.find((inst) => {return inst.expectedPrice >= minInstPrice})
		if (!instrument) {
			throw `No ${direction} instrument satisfy minPrice ${minInstPrice} for index ${indexPrice}`
		}
		delete(instrument.expectedPrice)
		return instrument
	},
	instrumentsHasId: (instArr, instId)=>{
		const findFunc = (inst)=>{
			return inst.instrumentId === instId
		}
		if(instArr.find(findFunc) !== undefined) return true
		return false
	}
}
module.exports = f
