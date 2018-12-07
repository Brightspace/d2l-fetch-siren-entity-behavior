import '@polymer/polymer/polymer-legacy.js';
import 'd2l-fetch/d2l-fetch.js';
import { IronMeta } from '@polymer/iron-meta/iron-meta.js';
import SirenParse from 'siren-parser';

window.D2L = window.D2L || {};
window.D2L.PolymerBehaviors = window.D2L.PolymerBehaviors || {};

/*
* Behavior for basic siren entity fetching which parses output on return.
* @polymerBehavior
*/
D2L.PolymerBehaviors.FetchSirenEntityBehavior = {

	properties: {
		_clientTimeSkew: Number
	},

	registered: function() {
		window.D2L.PolymerBehaviors.FetchSirenEntityBehaviorMeta = window.D2L.PolymerBehaviors.FetchSirenEntityBehaviorMeta
			|| new IronMeta(
				{
					key: 'whitelistedDomains',
					value: [
						'api.proddev.d2l',
						'api.dev.brightspace.com',
						'api.brightspace.com',
						'us-east-1.discovery.bff.dev.brightspace.com'
					]
				}
			);
	},

	_fetchEntity: function(url) {
		var request = new Request(url, {
			headers: new Headers({ Accept: 'application/vnd.siren+json' })
		});
		return this._makeRequest(request);
	},

	_fetchEntityWithToken: function(url, getToken, userUrl) {

		if (!url || !this._isWhitelisted(url)) {
			return Promise.reject(new Error('Invalid request url; must be a valid whitelisted domain.'));
		}

		var tokenUrl = userUrl || url;
		if (url && typeof getToken === 'function' && tokenUrl) {
			return getToken(tokenUrl)
				.then(function(token) {
					if (typeof token === 'string') {
						var request = new Request(url, {
							headers: new Headers({
								Accept: 'application/vnd.siren+json',
								Authorization: 'Bearer ' + token
							})
						});
						return this._makeRequest(request);
					} else {
						throw new Error('token expected to be a string');
					}
				}.bind(this));
		}
		return Promise.reject(new Error('Invalid inputs'));
	},

	_makeRequest: function(request) {
		var self = this;
		return window.d2lfetch
			.fetch(request)
			.then(function(response) {
				if (response.ok) {
					var serverTimeUtc = new Date(response.headers.get('Date'));
					self._clientTimeSkew = serverTimeUtc - self._getCurrentTime();
					return response.json();
				}
				return Promise.reject(response.status);
			})
			.then(SirenParse);
	},

	// this function is purely for mocking out while testing
	_getCurrentTime: function() {
		return new Date();
	},

	_addDomains: function(domains) {
		if (domains && domains instanceof Array) {
			new IronMeta({ key: 'whitelistedDomains'}).value = this.__mergeAndDedupe(
				this._getWhitelist(),
				domains
			);
		}
	},

	__mergeAndDedupe: function(array1, array2) {
		var result = [];
		var observed = {};
		var all = array1.concat(array2);

		all.forEach(function(item) {
			if (!observed[item]) {
				result.push(item);
				observed[item] = true;
			}
		});

		return result;
	},

	_getWhitelist: function() {
		return window.D2L.PolymerBehaviors.FetchSirenEntityBehaviorMeta.byKey('whitelistedDomains');
	},

	_isWhitelisted: function(url) {
		/* expression taken from URI spec parsing section: https://tools.ietf.org/html/rfc3986#appendix-B
		   useful groups:
			 protocol  = $2
			 host	  = $4
			 path	  = $5
			 query	 = $6
			 fragment  = $7
		*/
		var uriExpression = /^(([^:\/?#]+):)?(\/\/([^\/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?/; //eslint-disable-line no-useless-escape
		var match_protocol  = 2;
		var match_host	  = 4;

		var matches = url.match(uriExpression);
		if (matches[match_protocol] !== 'https') {
			return false;
		}
		var host = matches[match_host];
		if (!host) {
			return false;
		}
		return 0 <= this._getWhitelist()
			.findIndex(function(domain) {
				if (domain === host) {
					return true;
				}
				return host.endsWith('.' + domain);
			});
	}

};
