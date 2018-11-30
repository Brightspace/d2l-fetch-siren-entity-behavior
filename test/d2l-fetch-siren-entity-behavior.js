/* global describe, it, expect, fixture, beforeEach, afterEach, sinon */

import { IronMeta } from '../../@polymer/iron-meta/iron-meta.js';
'use strict';

var validUrls = [
	'https://api.brightspace.com',
	'https://api.dev.brightspace.com',
	'https://api.proddev.d2l',
	'https://www.api.brightspace.com',
	'https://some-tenant-id.api.brightspace.com',
	'https://some-tenant-id.activities.api.dev.brightspace.com',
	'https://some-tenant-id.activities.api.dev.brightspace.com/activities/6606_2000_11/usages/123060/users/20218/feedback',
	'https://some-tenant-id.grades.api.dev.brightspace.com/something?take=1'
];

var invalidUrls = [
	'http://api.dev.brightspace.com',
	'httpss://api.dev.brightspace.com',
	'https//api.dev.brightspace.com',
	'api.dev.brightspace.com',
	'ftp://api.dev.brightspace.com',
	'https://api.rightspace.com',
	'https://api-brightspace.com',
	'http://api.dev-brightspace.com',
	'https://www.example.com',
	'ftp://api.example.com',
	'https://api.brightspace.com:44444',
	'https://some-tenant-id.activities.api.dev.brightspace.com:44444',
	'https://some-tenant-id.activities.api.dv.brightspace.com/activities/6606_2000_11/usages/123060/users/20218/feedback'
];

describe('d2l-fetch-siren-entity-behavior', function() {
	var component,
		sandbox,
		getToken;

	beforeEach(function() {
		component = fixture('default-fixture');
		sandbox = sinon.sandbox.create();
		getToken = sandbox.stub().returns(Promise.resolve('iamatoken'));
	});

	afterEach(function() {
		window.D2L.PolymerBehaviors.FetchSirenEntityBehaviorMeta = new IronMeta(
			{
				key: 'whitelistedDomains',
				value: [
					'api.proddev.d2l',
					'api.dev.brightspace.com',
					'api.brightspace.com'
				]
			}
		);
		sandbox.restore();
	});

	it('should be properly imported by a consumer', function() {
		expect(component._fetchEntity).to.be.an.instanceof(Function);
		expect(component._fetchEntityWithToken).to.be.an.instanceof(Function);
	});

	describe('_fetchEntity', function() {
		beforeEach(function() {
			component._makeRequest = sandbox.stub().returns(Promise.resolve());
		});

		it('should call _makeRequest with an appropriate request object', function() {
			var url = '/some-url';

			return component._fetchEntity(url)
				.then(function() {
					expect(component._makeRequest).to.be.called;

					var requestArg = component._makeRequest.getCall(0).args[0];
					expect(requestArg.url.endsWith(url)).to.be.true;
					expect(requestArg.headers.get('Accept')).to.equal('application/vnd.siren+json');
				});
		});
	});

	describe('_fetchEntityWithToken', function() {
		var getRejected, getNoken;

		beforeEach(function() {
			component._makeRequest = sandbox.stub().returns(Promise.resolve());
			getRejected = function() {
				return Promise.reject(new Error('Rejected rejected denied'));
			};
			getNoken = function() {
				return Promise.resolve(null);
			};
		});

		[
			{ parm1: 'url', parm2: null, parm3: null },
			{ parm1: null, parm2: getToken, parm3: null },
			{ parm1: null, parm2: null, parm3: 'url'}
		].forEach(function(testcase) {
			it('should not make request if getToken or url is not provided', function() {
				component._fetchEntityWithToken(testcase.parm1, testcase.parm2, testcase.parm3);
				expect(component._makeRequest.called).to.be.false;
			});
		});

		it('should make request when getToken and url are provided', function() {
			return component._fetchEntityWithToken('https://url.api.brightspace.com', getToken, null)
				.then(function() {
					expect(component._makeRequest.called).to.be.true;
				});
		});

		it('should make request when getToken, url and userUrl are provided', function() {
			return component._fetchEntityWithToken('https://url.api.brightspace.com', getToken, 'userUrl')
				.then(function() {
					expect(component._makeRequest.called).to.be.true;
				});
		});

		it('should make request when getToken is previous set and url is provided', function() {
			return component._fetchEntityWithToken('https://url.api.brightspace.com', getToken, null)
				.then(function() {
					expect(component._makeRequest.called).to.be.true;
				});
		});

		it('should not make request when getToken rejects', function() {
			return component._fetchEntityWithToken('https://url.api.brightspace.com', getRejected, null)
				.then(function() {
					expect(component._makeRequest.called).to.be.false;
				}, function() {
					expect(component._makeRequest.called).to.be.false;
				});
		});

		it('should not make request when token is not a string', function() {
			return component._fetchEntityWithToken('https://url.api.brightspace.com', getNoken, null)
				.then(function() {
					expect(component._makeRequest.called).to.be.false;
				}, function() {
					expect(component._makeRequest.called).to.be.false;
				});
		});

		invalidUrls.forEach(function(url) {
			it('should throw an error if the request is from a non-whitelisted domain', function() {
				return component._fetchEntityWithToken(url, getToken, null)
					.then((function() { expect.fail(); }), function(err) { expect(err instanceof Error).to.equal(true); });
			});
		});

		validUrls.forEach(function(url) {
			it('should make request if the request is whitelisted', function() {
				return component._fetchEntityWithToken(url, getToken, null)
					.then(function() {
						expect(component._makeRequest.called).to.be.true;
					});
			});
		});

		it('should accept additional whitelisted domains through _addDomains', function() {
			component._addDomains(['totally.invalid.domain', 'api.brightspace.com']);
			return component._fetchEntityWithToken('https://some.totally.invalid.domain/url', getToken, null)
				.then(function() {
					expect(component._makeRequest.called).to.be.true;
				});
		});

		it('_addDomains should dedupe duplicate entries', function() {
			var baseDomainCount = component._getWhitelist().length;
			// add 2 of the same and 1 pre-existing domain, so total 1 net new domain
			component._addDomains(['totally.invalid.domain', 'api.brightspace.com', 'totally.invalid.domain']);

			expect(component._getWhitelist().length).to.equal(baseDomainCount + 1);
		});

	});

	describe('_makeRequest', function() {

		var goodResponse,
			badResponse,
			cls = 'some-class',
			name = 'some-name',
			dateHeader = 'Date: Tue, 24 Oct 2017 16:00:00 GMT',
			errorStatus = 500,
			sirenEntityJson = '{ "class": ["' + cls + '"], "properties": { "name": "' + name + '"} }';

		beforeEach(function() {
			sandbox.stub(window.d2lfetch, 'fetch');
			var headers = new Headers();
			headers.append('Date', dateHeader);
			goodResponse = new Response(sirenEntityJson, {
				status: 200,
				headers: headers
			}),
			badResponse = new Response(null, { status: errorStatus});
		});

		it('should call fetch on the global d2lfetch object', function() {
			window.d2lfetch.fetch.returns(Promise.resolve(goodResponse));

			return component._makeRequest(new Request('some-url'))
				.then(function() {
					expect(window.d2lfetch.fetch).to.be.called;
				});
		});

		it('should return a parsed siren entity when the fetch response is ok', function() {
			window.d2lfetch.fetch.returns(Promise.resolve(goodResponse));

			return component._makeRequest(new Request('some-url'))
				.then(function(entity) {
					expect(entity.hasClass(cls)).to.be.true;
					expect(entity.properties.name).to.equal(name);
				});
		});

		it('should set _clientTimeSkew to the difference between now and server time when the fetch response is ok', function() {
			window.d2lfetch.fetch.returns(Promise.resolve(goodResponse));
			component._getCurrentTime = sandbox.stub().returns(new Date('2017-10-24T16:00:00.000Z'));
			return component._makeRequest(new Request('some-url'))
				.then(function() {
					expect(component._clientTimeSkew).to.equal(0);
				});
		});

		it('should set _clientTimeSkew to 60000 when the client is ahead of the server by one minute', function() {
			window.d2lfetch.fetch.returns(Promise.resolve(goodResponse));
			component._getCurrentTime = sandbox.stub().returns(new Date('2017-10-24T15:59:00.000Z'));
			return component._makeRequest(new Request('some-url'))
				.then(function() {
					expect(component._clientTimeSkew).to.equal(60000);
				});
		});

		it('should set _clientTimeSkew to -60000 when the server is ahead of the client by one minute', function() {
			window.d2lfetch.fetch.returns(Promise.resolve(goodResponse));
			component._getCurrentTime = sandbox.stub().returns(new Date('2017-10-24T16:01:00.000Z'));
			return component._makeRequest(new Request('some-url'))
				.then(function() {
					expect(component._clientTimeSkew).to.equal(-60000);
				});
		});

		it('should reject with the status if the fetch response is not ok', function() {
			window.d2lfetch.fetch.returns(Promise.resolve(badResponse));

			return component._makeRequest(new Request('some-url'))
				.catch(function(err) {
					expect(err).to.equal(errorStatus);
				});
		});
	});
});
