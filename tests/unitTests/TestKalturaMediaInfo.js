/**
 * This is a unit test to validate proper functionality of the KalturaMediaInfo class
 */
const chai = require('chai');
const expect = chai.expect;
const KalturaMediaInfo = require('../../lib/utils/KalturaMediaInfo');
const KalturaMediaInfoResponse = require('../../lib/utils/KalturaMediaInfoResponse');

require('../../lib/utils/KalturaConfig');
require('../../lib/utils/KalturaLogger');
const resourcesPath = KalturaConfig.config.testing.resourcesPath;

const testsDirName = __dirname;
const info = new KalturaMediaInfo('ffprobe');
const badInfo = new KalturaMediaInfo('ffrobb');

function removeWhiteSpaces(text){
	return text.replace(/ /g,'');
}

function isEmpty(object)
{
	for (var key in object)
	{
		if (object.hasOwnProperty(key))
		{
			return false;
		}
	}
	return true;
}


describe('test KalturaMediaInfo class', function () {
	it('test KalturaMediaInfo - get media info for a file that exist', function () {
		return info.mediaInfoExec(resourcesPath + '/adSample').then(function (data) {
			expect(data).to.be.an.instanceof(KalturaMediaInfoResponse);
			expect(removeWhiteSpaces(data.jsonInfo).substring(0, 20)).to.equal('{"programs":[],"stre');
		}, function (err) {
			expect(err).to.be.null;
		});
	});

	it('test KalturaMediaInfo - file doesn\'t exist', function () {
		const fileName = resourcesPath + '/12345';
		return info.mediaInfoExec(fileName).then(function (data) {
			expect(data).to.be.null;
		}, function (err) {
			expect(err).to.equal(`File [${fileName}] doesn't exists on the file system`);
		});
	});

	it('test KalturaMediaInfo - command line error', function () {
		return badInfo.mediaInfoExec(resourcesPath + '/adSample').then(function (data) {
			expect(data).to.be.null;
		}, function (err) {
			expect(err).to.be.an('error');
		});
	});

	it('test KalturaMediaInfo - emptyFile', function () {
		return info.mediaInfoExec(resourcesPath + '/emptyFile').then(function (data) {
			const parsedResult = JSON.parse(data.jsonInfo);
			expect(isEmpty(parsedResult)).to.be.true;
		}, function (err) {
			expect(err).to.not.be.null;
			expect(err.message.substring(0, 25)).to.equal('Command failed: ffprobe -');
		});
	});
});
