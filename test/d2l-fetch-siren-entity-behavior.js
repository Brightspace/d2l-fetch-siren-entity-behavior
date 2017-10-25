/* global describe, it, expect, fixture, beforeEach, afterEach, sinon */

'use strict';

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
			return component._fetchEntityWithToken('url', getToken, null)
				.then(function() {
					expect(component._makeRequest.called).to.be.true;
				});
		});

		it('should make request when getToken, url and userUrl are provided', function() {
			return component._fetchEntityWithToken('url', getToken, 'userUrl')
				.then(function() {
					expect(component._makeRequest.called).to.be.true;
				});
		});

		it('should make request when getToken is previous set and url is provided', function() {
			return component._fetchEntityWithToken('url', getToken, null)
				.then(function() {
					expect(component._makeRequest.called).to.be.true;
				});
		});

		it('should not make request when getToken rejects', function() {
			return component._fetchEntityWithToken('url', getRejected, null)
				.then(function() {
					expect(component._makeRequest.called).to.be.false;
				}, function() {
					expect(component._makeRequest.called).to.be.false;
				});
		});

		it('should not make request when token is not a string', function() {
			return component._fetchEntityWithToken('url', getNoken, null)
				.then(function() {
					expect(component._makeRequest.called).to.be.false;
				}, function() {
					expect(component._makeRequest.called).to.be.false;
				});
		});
	});

	describe('_makeRequest', function() {

		var goodResponse,
			badResponse,
			cls = 'some-class',
			name = 'some-name',
			dateString = '2017-10-24',
			errorStatus = 500,
			sirenEntityJson = '{ "class": ["' + cls + '"], "properties": { "name": "' + name + '"} }';

		beforeEach(function() {
			sandbox.stub(window.d2lfetch, 'fetch');
			var headers = new Headers();
			headers.append('Date', dateString);
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

		it('should set _timeSkew to the difference between now and server time when the fetch response is ok', function() {
			window.d2lfetch.fetch.returns(Promise.resolve(goodResponse));
			component._convertDateToUTC = sandbox.stub().returns(new Date());
			return component._makeRequest(new Request('some-url'))
				.then(function() {
					expect(component._timeSkew).to.equal(0);
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
