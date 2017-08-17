/**
 * This is a unit test to validate proper functionality of the TranscodeingEngine class
 */

const chai = require('chai');
const expect = chai.expect;
const TranscodingEngineResponse = require('../../lib/infra/TranscodingEngineResponse');
const KalturaTempFileHandler = require('../../lib/utils/KalturaTempFileHandler');
const TranscodingEngine = require('../../lib/infra/TranscodingEngine');
const path = require('path');
const testDirName = __dirname;

require('../../lib/utils/KalturaConfig');
const fileName = KalturaConfig.config.testing.resourcesPath + '/adSample';
const outputPath = KalturaConfig.config.testing.outputPath + '/adSample_output.mp4';
const tempOutputPath = KalturaTempFileHandler._getTempFilePath(outputPath);
const flavorId = '0_123456';
require('../../lib/utils/KalturaLogger');

const engine = new TranscodingEngine('ffmpeg');
const commandLine = ` -i ${fileName} -f mp4 -y ${tempOutputPath}`;
const continuationLocalStorage = require('continuation-local-storage');
const namespace = continuationLocalStorage.getNamespace('play-server');
if (!namespace)
	continuationLocalStorage.createNamespace('play-server');

describe('test TranscodeingEngine class', function () {
	this.timeout(0);
	it('test TranscodeingEngine - validate files path exists', function () {
		return TranscodingEngine.validateFilePaths(fileName, outputPath).then(function (data) {
			expect(data).to.be.true;
		}, function (err) {
			expect(err).to.be.null;
		});
	});

	it('test TranscodeingEngine - transcode file using ffmpeg and save output', function () {
		return engine.transcodeFile(commandLine, flavorId, outputPath).then(function (data) {
			expect(data).to.be.an.instanceof(TranscodingEngineResponse);
			expect(data.pathToLogFile).to.equal(`${KalturaConfig.config.logger.convertLogDir}/${flavorId}_adSample_output.mp4.log`);
			expect(data.pathToAdFile).to.equal(outputPath);
		}, function (err) {
			expect(err).to.be.null;
		});
	});

	it('test TranscodeingEngine - source file doest exist', function () {
		const badfileName = `${testDirName}/resources/12345`;
		return TranscodingEngine.validateFilePaths(badfileName, outputPath).then(function (data) {
			expect(data).to.be.null;
		}, function (err) {
			expect(err).to.equal(`File [${badfileName}] doesn't exists on the file system`);
		});
	});

	it('test TranscodeingEngine - library doest exist in save path', function () {
		const badoutputPath = `${testDirName}/resources/test/adSample_output.mpg`;
		return TranscodingEngine.validateFilePaths(fileName, badoutputPath).then(function (data) {
			expect(data).to.be.null;
		}, function (err) {
			expect(err).to.equal(`[${path.dirname(badoutputPath)}] doesn't exists on the file system`);
		});
	});

	it('test TranscodingEngine - command line error', function() {
		const badengine = new TranscodingEngine('ffmpegg');
		return badengine.transcodeFile(commandLine, flavorId, outputPath).then(function (data) {
			expect(data).to.be.null;
		}, function (err) {
			expect(err).to.be.an('error');
		});
	});
});
